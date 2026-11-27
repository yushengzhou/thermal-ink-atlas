// Hour-slider drag pacing in headless Chromium (issue #3). Each animation
// frame moves the slider one 15-minute step and fires `input`, the way a fast
// drag does, sweeping 00:00 -> 23:45 and back. Spec target: p95 frame time
// <= 33 ms. On shared CI runners the rAF-gap check is replaced by the
// main-thread draw cost of a frame, p95 <= 25 ms (as for blocks 2 and 3) (set PERF_STRICT=1 to
// enforce gaps there too).
// After release the view must refine to exactly the pixels seek() gives.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open, pct } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

/** In-page: drag the slider across the day, one step per frame. */
function dragDay(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const s = document.getElementById('hour');
        const steps = [];
        for (let k = 0; k < 96; k++) steps.push(k * 0.25);
        for (let k = 95; k >= 0; k--) steps.push(k * 0.25);
        const gaps = [];
        const work = [];
        let previews = 0;
        let prev = null;
        let k = 0;
        s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        const step = (t) => {
          if (prev !== null) {
            gaps.push(t - prev);
            const st = window.atlas.stats(); // the frame drawn since the last step
            work.push(st.frameMs);
            if (st.preview) previews++;
          }
          prev = t;
          if (k === steps.length) {
            s.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
            s.dispatchEvent(new Event('change', { bubbles: true }));
            resolve({ gaps, work, previews });
            return;
          }
          s.value = String(steps[k++]);
          s.dispatchEvent(new Event('input', { bubbles: true }));
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15']]) {
  test(`hour slider drag pacing, ${name} view`, async () => {
    const { page, context, errors } = await open(browser, query);
    await page.evaluate(() => window.atlas.perf(30)); // settle the current hour
    const { gaps, work, previews } = await dragDay(page);
    const p95 = pct(gaps, 95);
    const wp95 = pct(work, 95);
    console.log(
      `${name} drag: frame mean ${mean(gaps).toFixed(1)} / p95 ${p95.toFixed(1)} / max ${Math.max(...gaps).toFixed(1)} ms; ` +
        `draw mean ${mean(work).toFixed(1)} / p95 ${wp95.toFixed(1)} / max ${Math.max(...work).toFixed(1)} ms; ${previews}/${work.length} preview frames (${strict ? 'strict' : 'relaxed'})`,
    );
    if (strict) assert.ok(p95 <= 33, `drag p95 frame ${p95.toFixed(1)} ms`);
    assert.ok(wp95 <= (strict ? 33 : 25), `drag p95 draw ${wp95.toFixed(1)} ms`);
    assert.ok(previews > 0, 'the drag never used the preview path');

    // released at 00:00: once refined, the frame on screen is exact, i.e. the
    // same pixels as a fresh ?f=N page (read in one task, between frames)
    await page.waitForFunction(() => window.atlas.settled(), null, { timeout: 5000 });
    const st = await page.evaluate(() => ({ ...window.atlas.state(), hash: window.atlas.hash(), preview: window.atlas.stats().preview }));
    assert.equal(st.hour, 0);
    assert.equal(st.preview, false);
    const fresh = await open(browser, `${query.replace('hour=15', 'hour=0')}&f=${st.frame}`);
    const ref = await fresh.page.evaluate(() => window.atlas.hash());
    assert.equal(st.hash, ref, 'refined frame after drag differs from ?f=N');
    assert.deepEqual(errors, []);
    await fresh.context.close();
    await context.close();
  });
}

// Large HiDPI views have more visible tiles than the tile cache cap; the
// preview's pending and shown hours are pinned so a drag still settles.
for (const [w, h] of [[2560, 1440], [3008, 1692]]) {
  test(`drag settles on a large HiDPI view (${w}x${h} @2, z=4)`, async () => {
    const { page, context, errors } = await open(browser, 'hour=15&cam=4,40,40', { viewport: { width: w, height: h }, dpr: 2 });
    const n = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const s = document.getElementById('hour');
          s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          let k = 0;
          const step = () => {
            if (k < 96) {
              s.value = String((15 + k++ * 0.25) % 24);
              s.dispatchEvent(new Event('input', { bubbles: true }));
              requestAnimationFrame(step);
            } else {
              s.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
              s.dispatchEvent(new Event('change', { bubbles: true }));
              resolve(k);
            }
          };
          requestAnimationFrame(step);
        }),
    );
    assert.equal(n, 96);
    const t0 = Date.now();
    await page.waitForFunction(() => window.atlas.settled(), null, { timeout: 10000 });
    console.log(`${w}x${h}@2: settled ${Date.now() - t0} ms after release`);
    const st = await page.evaluate(() => ({ hour: window.atlas.state().hour, preview: window.atlas.stats().preview }));
    assert.deepEqual(st, { hour: 14.75, preview: false });
    // pins are dropped on release: the cache is back under its cap within two frames
    const cache = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(window.atlas.cache())))));
    assert.ok(cache.size <= cache.cap, `tile cache ${cache.size} > cap ${cache.cap} after release`);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
