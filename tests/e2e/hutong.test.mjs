// Block 5 (hutong) in the running page: the splash toggle (P, button,
// ?splash=), determinism in every mode, thermal pixel means (splashed vs dry
// paving at 21:00, awning vs open courtyard at 15:00), the cards (including
// the bilingual tianpeng card), heat cards with water and species rows,
// glossary, walkers, the references link on every block page, size / offline
// / load time, frame pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base5 } from '../../scripts/hutong.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';
import { courtCells } from '../../engine/hutong.js';
import { cities } from '../../scripts/references.mjs';

const CITY = { city: 'hutong' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base5();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/** Cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800), not hidden behind a house (ridge included), with nothing overhead. */
function visibleCells(cells, cam) {
  const [z, cx, cy] = cam.split(',').map(Number);
  const C = 0.8660254;
  const ox = Math.round(640 - (cx - cy) * C * z);
  const oy = Math.round(400 - (cx + cy) * 0.5 * z);
  return cells.filter((i) => {
    const x = ((i % B.world.n) + 0.5) * B.world.cell;
    const y = (Math.floor(i / B.world.n) + 0.5) * B.world.cell;
    const X = ox + (x - y) * C * z;
    const Y = oy + (x + y) * 0.5 * z;
    if (X < 20 || X > 1260 || Y < 20 || Y > 620) return false;
    if (B.world.canopy[i] > 0) return false;
    for (const b of B.world.buildings) {
      const lo = Math.max(b.x0 - x, b.y0 - y, 0);
      const hi = Math.min(b.x1 - x, b.y1 - y, 0.95 * (b.h + 2.5));
      if (lo < hi) return false;
    }
    return true;
  });
}

test('splash toggle: default on, ?splash=0|1, P and the button; notes follow', async () => {
  for (const [q, want] of [['', true], ['splash=0', false], ['splash=1', true]]) {
    const { page, context, errors } = await go(`hour=21&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.hutong.state(), pressed: document.querySelector('#hutong [data-splash]').getAttribute('aria-pressed'), body: document.body.dataset.splash }));
    assert.equal(st.splash, want, q);
    assert.equal(st.pressed, String(want));
    assert.equal(st.body, want ? '1' : '0');
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=21&f=400');
  await page.keyboard.press('p');
  assert.equal((await page.evaluate(() => window.atlas.hutong.state())).splash, false, 'P turns it off');
  await page.keyboard.press('P');
  assert.equal((await page.evaluate(() => window.atlas.hutong.state())).splash, true);
  await page.click('#hutong [data-splash]');
  assert.equal((await page.evaluate(() => window.atlas.hutong.state())).splash, false, 'the button');
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  assert.ok(notes.some((n) => n.key === 'splash' && n.text.join(' ').includes('19:00')));
  assert.deepEqual(errors, []);
  await context.close();
});

const CAM_A = { z: 2, cx: 205, cy: 205 };
const CAM_B = { z: 5.5, cx: 125, cy: 240 };
// [frame, cam, thermal, hour, splash]
const FRAMES = [
  [400, CAM_A, 0, 15, true],
  [401, CAM_A, 0, 15, true],
  [400, CAM_A, 1, 15, true],
  [400, CAM_A, 1, 21, true],
  [400, CAM_A, 1, 21, false],
  [777, CAM_B, 1, 20, true],
  [777, CAM_B, 0, 12.25, false],
  [90, CAM_A, 0, 15, true],
  [1500, CAM_B, 1, 23, false],
  [3601, CAM_A, 0, 19, true],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, splash] = frames[i];
      window.atlas.hutong.set({ splash });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode: same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 11) / 11, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('splash=0');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 4, 6, 8]) {
    const [f, cam, thermal, hour, splash] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&splash=${splash ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('switching the splash off and on returns the exact frame of a fresh page', async () => {
  const { page, context } = await go('thermal&hour=21&f=400');
  const h = await page.evaluate(() => {
    window.atlas.hutong.set({ splash: false });
    window.atlas.seek(400);
    window.atlas.hutong.set({ splash: true });
    window.atlas.seek(400);
    return window.atlas.hash();
  });
  await context.close();
  const f = await go('thermal&hour=21&f=400&splash=1');
  assert.equal(await f.page.evaluate(() => window.atlas.hash()), h);
  await f.context.close();
});

test('thermal 21:00: splashed paving reads cooler than with no splash, close to the model; dry courtyards unchanged', async () => {
  const cam = '3,120,240';
  const c = courtCells(B.world);
  const wetSet = new Set(B.setup.cells);
  const wetOpen = visibleCells(c.open.filter((i) => wetSet.has(i)), cam);
  const dryOpen = visibleCells(c.open.filter((i) => !wetSet.has(i)), cam);
  const res = {};
  for (const sp of [1, 0]) {
    const { page, context } = await go(`thermal&hour=21&notes=0&people=0&f=400&cam=${cam}&splash=${sp}`);
    res[sp] = await regionPixelMeans(page, { wet: boxes(wetOpen), dry: boxes(dryOpen) }, 2, 14);
    await context.close();
  }
  for (const [sp, T] of [[1, B.wet], [0, B.dry]]) {
    for (const k of ['wet', 'dry']) {
      const cells = k === 'wet' ? wetOpen : dryOpen;
      const model = cells.reduce((s, i) => s + T.ts(i, 21), 0) / cells.length;
      console.log(`  splash ${sp} ${k.padEnd(3)} pixels ${res[sp][k].mean.toFixed(1)} (n ${res[sp][k].n}) model ${model.toFixed(1)} (${cells.length} cells)`);
      assert.ok(res[sp][k].n >= 150, `${k}: only ${res[sp][k].n} px`);
      assert.ok(Math.abs(res[sp][k].mean - model) < 2, `${k}: pixels vs model`);
    }
  }
  assert.ok(res[1].wet.mean < res[0].wet.mean - 3, `splashed courtyards: ${res[1].wet.mean} vs ${res[0].wet.mean}`);
  assert.ok(Math.abs(res[1].dry.mean - res[0].dry.mean) < 0.5, 'dry courtyards do not change');
});

test('thermal 15:00: paving under the mat awnings reads far cooler than sunlit open courtyards', async () => {
  const cam = '5.5,122.5,250';
  const c = courtCells(B.world);
  const sun = visibleCells(c.open.filter((i) => B.wet.sunlit(i, 15) > 0.95), cam);
  // under an awning the crown factor marks the cells (canopy 1); visibility ignoring the awning itself (unfilled in the thermal view)
  const aw = c.awning.filter((i) => {
    B.world.canopy[i] = 0;
    const ok = visibleCells([i], cam).length === 1;
    B.world.canopy[i] = 1;
    return ok;
  });
  const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${cam}`);
  const r = await regionPixelMeans(page, { sun: boxes(sun), aw: boxes(aw) }, 2, 14);
  await context.close();
  console.log(`  awning ${r.aw.mean.toFixed(1)} (n ${r.aw.n}), open sun ${r.sun.mean.toFixed(1)} (n ${r.sun.n})`);
  assert.ok(r.aw.n >= 100 && r.sun.n >= 150, `pixels: awning ${r.aw.n}, sun ${r.sun.n}`);
  assert.ok(r.aw.mean < r.sun.mean - 10);
});

test('cards: lanes, courtyards, the bilingual tianpeng card, splash, trees; heat cards show water and species', async () => {
  const { page, context, errors } = await go('hour=21&f=400');
  for (const id of ['lanes', 'courtyard', 'tianpeng', 'splash', 'trees']) {
    await page.click(`#hutong [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t) && /°C|K/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
  }
  const html = await page.evaluate(() => ({ l: window.atlas.hutong.html('lanes'), c: window.atlas.hutong.html('courtyard'), t: window.atlas.hutong.html('tianpeng'), s: window.atlas.hutong.html('splash'), tr: window.atlas.hutong.html('trees') }));
  assert.ok(html.t.includes('天棚') && html.t.includes('天棚鱼缸石榴树') && html.t.includes('lang="zh-Hans"') && html.t.includes('lang="en"') && html.t.includes('tianpeng'), 'Chinese and English');
  assert.ok(html.t.includes('未核实') && html.t.includes('unverified'), 'the splashing custom is flagged unverified in both languages');
  assert.ok(html.s.includes('Hendel') && html.s.includes('Takebayashi') && html.s.includes('β_wet 0.3') && html.s.includes('β_wet 1'));
  assert.ok(html.c.includes('quoted, not simulated') && html.c.includes('Córdoba') && html.c.includes('Harbin'));
  assert.ok(html.l.includes('Fez') && html.l.includes('1 − (H/tan β)/W'));
  assert.ok(html.tr.includes('Pagoda tree') && html.tr.includes('abstract only'));
  const d = await page.evaluate(() => [window.atlas.card('ground', 82.5, 67.5), window.atlas.card('ground', 57.5, 332.5)]);
  assert.ok(d[0].water && d[0].water.now > 0.1, 'Jujube Lane holds water at 21:00');
  assert.equal(d[1].water, null, 'Brick Lane is not splashed');
  await page.keyboard.press('Escape');
  // click a splashed courtyard cell that is in view (the 5 m east-west lanes hide behind their southern row)
  const wetSet = new Set(B.setup.cells);
  const i = visibleCells(courtCells(B.world).open.filter((k) => wetSet.has(k)), '2,205,205')[0];
  const [x, y] = await page.evaluate(([x, y]) => window.atlas.project(x, y, 0), [((i % B.world.n) + 0.5) * B.world.cell, (Math.floor(i / B.world.n) + 0.5) * B.world.cell]);
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/water on the paving now/.test(t) && /splashed at 19:00/.test(t), t);
  // a species tree's heat card: its name and crown transmission
  const k = B.world.trees.findIndex((t) => t.species === 'pagodaTree');
  const tc = await page.evaluate((k) => window.atlas.card('tree', k), k);
  assert.equal(tc.title, 'Pagoda tree (国槐)');
  assert.equal(tc.params.tr.value, 0.17);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-5 glossary terms open their footnotes; notes carry their terms', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('hutong');
  for (const k of ['siheyuan', 'tianpeng', 'waterStore', 'wetBulb', 'canyon']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('windFactor') && !keys.includes('curtainWall'));
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('walkers at 15:00 rest in shaded courtyards', async () => {
  const { page, context } = await go('hour=15&f=400');
  const d = await page.evaluate(() => window.atlas.hutong.dwell(400, 15));
  console.log(`  dwellers: ${d.canopy} under crowns or screens, ${d.building} in wall shade, ${d.sun} in sun`);
  assert.ok((d.canopy + d.building) / d.n >= 0.5);
  const s = await page.evaluate(() => window.atlas.shadeStats(400, 15));
  assert.ok(s.ratio > 1, `shade density ratio ${s.ratio}`);
  await context.close();
});

test('every block page links to references.html from its terms panel; the link resolves to the generated page', async () => {
  for (const c of cities()) {
    const { page, context, errors } = await open(browser, 'hour=15&f=400', { city: c });
    await page.click('#termsBtn');
    const a = page.locator('#terms a#refsLink');
    assert.ok(await a.isVisible(), `${c}: link visible in the terms panel`);
    assert.equal(await a.getAttribute('href'), '../../references.html', c);
    const target = await a.evaluate((el) => el.href);
    assert.ok(existsSync(fileURLToPath(target)), `${c}: ${target}`);
    await Promise.all([page.waitForURL(/references\.html$/), a.click()]);
    assert.equal(await page.locator('h1').textContent(), 'References');
    assert.deepEqual(errors, [], c);
    await context.close();
  }
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/hutong/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, sun slots ${info.slotsMs.toFixed(0)} ms, dry model ${info.runMs.toFixed(0)} ms, splash run ${info.splashMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('p');
  await page.click('#hutong [data-card="splash"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15']]) {
  test(`frame pacing, ${name} view`, async () => {
    const { page, context } = await go(query);
    await page.evaluate(() => window.atlas.perf(30));
    const { gaps, draws } = await page.evaluate(() => window.atlas.perf(300));
    const fps = 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length);
    console.log(`${name}: mean ${fps.toFixed(1)} fps, p95 frame ${pct(gaps, 95).toFixed(1)} ms, draw p95 ${pct(draws, 95).toFixed(2)} ms (${strict ? 'strict' : 'relaxed'})`);
    if (strict) {
      assert.ok(fps >= 59.4, `mean fps ${fps}`);
      assert.ok(pct(gaps, 95) <= 33);
    } else {
      assert.ok(fps >= 30);
      assert.ok(pct(draws, 95) <= 33);
    }
    await context.close();
  });
}

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15']]) {
  test(`hour slider drag, ${name} view: p95 frame time and exact frame after release`, async () => {
    const { page, context, errors } = await go(query);
    await page.evaluate(() => window.atlas.perf(30));
    const { gaps, work, previews } = await page.evaluate(
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
              const st = window.atlas.stats();
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
    console.log(`${name} drag: frame p95 ${pct(gaps, 95).toFixed(1)} ms, draw p95 ${pct(work, 95).toFixed(1)} ms, ${previews}/${work.length} preview frames (${strict ? 'strict' : 'relaxed'})`);
    if (strict) assert.ok(pct(gaps, 95) <= 33, `drag p95 frame ${pct(gaps, 95)}`);
    assert.ok(pct(work, 95) <= (strict ? 33 : 25), `drag p95 draw ${pct(work, 95)}`);
    await page.waitForFunction(() => window.atlas.settled(), null, { timeout: 8000 });
    const st = await page.evaluate(() => ({ ...window.atlas.state(), hash: window.atlas.hash() }));
    const fresh = await go(`${query.replace('hour=15', 'hour=0')}&f=${st.frame}`);
    assert.equal(st.hash, await fresh.page.evaluate(() => window.atlas.hash()), 'refined frame after drag differs from ?f=N');
    await fresh.context.close();
    assert.deepEqual(errors, []);
    await context.close();
  });
}
