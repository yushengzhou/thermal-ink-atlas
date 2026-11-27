// Thermal view pixels: true region pixel means. For each material region (the
// same 5 m cell masks as the unit test, scripts/regions.mjs) every cell is
// projected to the screen and filled into a mask. Then:
//  - occluders drawn in front (buildings, awnings, cars, sheds, benches) are
//    cut out of the mask;
//  - the mask is eroded by EDGE_BAND px so the wash's bleed across region
//    borders and anti-aliased edges are excluded;
//  - each remaining pixel is read back to a temperature through the palette
//    (allowing a small brightness scale for paper grain); pixels that do not
//    look like the wash (ink lines, outlines; RMS residual > INK_RESIDUAL) are
//    dropped and counted.
// The mean over the remaining pixels is the region pixel mean.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open, regionPixelMeans } from './helpers.mjs';
import { base, regions, cellsOf, regionMean, TIERS, orderFlips } from '../../scripts/regions.mjs';

const EDGE_BAND = 2; // px at z 2.5, about 1 m on the ground
const INK_RESIDUAL = 14; // RMS per channel, 0-255
const CAM = '2.5,230,250';

let browser;
let W;
let M;
before(async () => {
  browser = await launch();
  ({ world: W, model: M } = base());
});
after(() => browser.close());

/** Cell polygons for a region: [{x0, y0, x1, y1, z, b}]; gable roofs are skipped (not flat). */
function cellsFor(pred) {
  return cellsOf(W, pred)
    .map((i) => {
      const b = W.bld[i];
      if (b >= 0 && W.buildings[b].gable) return null;
      const x0 = (i % W.n) * W.cell;
      const y0 = Math.floor(i / W.n) * W.cell;
      return { x0, y0, x1: x0 + W.cell, y1: y0 + W.cell, z: b >= 0 ? W.buildings[b].h : 0, b };
    })
    .filter(Boolean);
}

async function pixelMeans(hour, keys) {
  const R = regions(W, M);
  const spec = Object.fromEntries(keys.map((k) => [k, cellsFor(R[k])]));
  const { page, context } = await open(browser, `thermal&hour=${hour}&notes=0&people=0&f=400&cam=${CAM}`);
  const res = await regionPixelMeans(page, spec, EDGE_BAND, INK_RESIDUAL);
  await context.close();
  const model = Object.fromEntries(keys.map((k) => [k, regionMean(W, M, R[k], hour)]));
  console.log(`${hour}:00 region pixel means vs model (C):`);
  for (const k of keys) {
    const r = res[k];
    console.log(`  ${k.padEnd(13)} pixels ${r.mean.toFixed(2)}  model ${model[k].toFixed(2)}  n=${r.n} px  ink dropped ${(r.inkShare * 100).toFixed(1)}%`);
  }
  for (const k of keys) {
    assert.ok(res[k].n >= 150, `${k}: only ${res[k].n} usable pixels in view`);
    assert.ok(res[k].inkShare < 0.25, `${k}: ${(res[k].inkShare * 100).toFixed(0)}% of pixels are not wash`);
  }
  return { px: Object.fromEntries(keys.map((k) => [k, res[k].mean])), model };
}

test('15:00 region pixel means follow the physics order', async () => {
  const keys = TIERS.flat();
  const { px, model } = await pixelMeans(15, keys);
  assert.deepEqual(orderFlips(px), [], 'tier order on pixel means');
  // the wash reads back close to the model (a 5 m pavement strip bleeds a little)
  for (const k of keys) assert.ok(Math.abs(px[k] - model[k]) < 3, `${k}: pixels ${px[k].toFixed(1)} vs model ${model[k].toFixed(1)}`);
});

test('23:00 region pixel means: asphalt and concrete warmer than the lawn, lawn below air', async () => {
  const { px } = await pixelMeans(23, ['allAsphalt', 'allConcrete', 'openLawn']);
  const air = M.air(23);
  console.log(`  air ${air.toFixed(1)}`);
  assert.ok(px.allAsphalt > px.openLawn, 'asphalt > lawn');
  assert.ok(px.allConcrete > px.openLawn, 'concrete > lawn');
  assert.ok(px.openLawn < air, 'lawn below air');
});
