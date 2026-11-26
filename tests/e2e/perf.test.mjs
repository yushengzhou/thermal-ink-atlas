// Frame pacing in headless Chromium after the intro, at the default camera.
// Spec target (maintainer's Mac): mean >= 60 fps and p95 frame time <= 33 ms.
// On shared CI runners the thresholds are relaxed (set PERF_STRICT=1 to enforce).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open, pct } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15']]) {
  test(`frame pacing, ${name} view`, async () => {
    const { page, context } = await open(browser, query);
    // warm up: bake visible tiles, then measure 300 frames
    await page.evaluate(() => window.atlas.perf(30));
    const { gaps, draws } = await page.evaluate(() => window.atlas.perf(300));
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const fps = 1000 / meanGap;
    const p95 = pct(gaps, 95);
    const drawMean = draws.reduce((a, b) => a + b, 0) / draws.length;
    console.log(`${name}: mean ${fps.toFixed(1)} fps, p95 frame ${p95.toFixed(1)} ms, draw mean ${drawMean.toFixed(2)} ms, draw p95 ${pct(draws, 95).toFixed(2)} ms (${strict ? 'strict' : 'relaxed'})`);
    if (strict) {
      // rAF in headless Chromium is paced at 60 Hz; allow 1% timer jitter
      assert.ok(fps >= 59.4, `mean fps ${fps}`);
      assert.ok(p95 <= 33, `p95 ${p95}`);
    } else {
      assert.ok(fps >= 30, `mean fps ${fps}`);
      assert.ok(pct(draws, 95) <= 33, `draw p95 ${pct(draws, 95)}`);
    }
    await context.close();
  });
}
