// Pedestrians in the running page: at 15:00 people per m2 in shade >= 2x in sun.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

test('shade density at 15:00 is at least twice the sun density', async () => {
  const { page, context } = await open(browser, 'hour=15');
  const r = await page.evaluate(() => {
    const out = [];
    for (let f = 300; f < 300 + 60 * 60 * 2; f += 600) out.push(window.atlas.shadeStats(f, 15));
    return out;
  });
  const ratios = r.map((s) => s.ratio);
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  console.log(`15:00 density ratio shade/sun: mean ${mean.toFixed(2)} min ${Math.min(...ratios).toFixed(2)}; e.g. ${r[0].nShade} people on ${Math.round(r[0].aShade)} m2 shade vs ${r[0].nSun} on ${Math.round(r[0].aSun)} m2 sun`);
  assert.ok(Math.min(...ratios) >= 2);
  // the preference follows the heat: weaker in the cool early morning
  const morning = await page.evaluate(() => {
    const out = [];
    for (let f = 300; f < 300 + 60 * 60 * 2; f += 600) out.push(window.atlas.shadeStats(f, 7).ratio);
    return out;
  });
  const mMean = morning.reduce((a, b) => a + b, 0) / morning.length;
  console.log(`07:00 density ratio mean ${mMean.toFixed(2)}`);
  assert.ok(mMean < mean);
  await context.close();
});
