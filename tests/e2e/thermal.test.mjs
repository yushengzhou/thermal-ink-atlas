// Thermal view pixels: read each probe region's colour back to a temperature
// through the palette and check the physics order at 15:00 and the night lag
// at 23:00 on what is actually drawn.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open, median } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

/** Median palette temperature of a 7x7 px patch around each probe. */
async function regionTemps(hour) {
  const { page, context } = await open(browser, `thermal&hour=${hour}&notes=0&f=400&cam=2.5,230,250`);
  const res = await page.evaluate(() => {
    const A = window.atlas;
    const lut = A.palette();
    const c = document.getElementById('atlas');
    const g = c.getContext('2d');
    const probes = A.probes();
    const out = {};
    for (const [k, v] of Object.entries(probes)) {
      if (k === 'air') continue;
      const [x, y] = A.project(...v.at);
      const d = g.getImageData(Math.round(x) - 3, Math.round(y) - 3, 7, 7).data;
      const temps = [];
      for (let i = 0; i < d.length; i += 4) {
        let best = 0;
        let bd = Infinity;
        // match allowing a small brightness scale (paper grain, pigment pooling)
        for (const [t, col] of lut) {
          const dot = d[i] * col[0] + d[i + 1] * col[1] + d[i + 2] * col[2];
          const cc = col[0] * col[0] + col[1] * col[1] + col[2] * col[2];
          const k = Math.min(1.04, Math.max(0.86, dot / cc));
          const e = (d[i] - k * col[0]) ** 2 + (d[i + 1] - k * col[1]) ** 2 + (d[i + 2] - k * col[2]) ** 2;
          if (e < bd) [bd, best] = [e, t];
        }
        temps.push(best);
      }
      out[k] = { temps, model: v.ts, inView: x > 0 && y > 0 && x < c.width && y < c.height };
    }
    return { out, air: probes.air };
  });
  await context.close();
  const px = {};
  for (const [k, v] of Object.entries(res.out)) {
    assert.ok(v.inView, `${k} outside the view`);
    px[k] = median(v.temps);
  }
  return { px, model: Object.fromEntries(Object.entries(res.out).map(([k, v]) => [k, v.model])), air: res.air };
}

test('15:00 region pixel means follow the physics order', async () => {
  const { px, model } = await regionTemps(15);
  console.log('15:00 pixels (C via palette):', px);
  console.log('15:00 model (C):', Object.fromEntries(Object.entries(model).map(([k, v]) => [k, +v.toFixed(1)])));
  assert.ok(Math.max(px.treeShade, px.water) < Math.min(px.grass, px.coolRoof), 'tree shade / water < grass / cool roof');
  assert.ok(Math.max(px.grass, px.coolRoof) < px.shadedPaving, 'grass / cool roof < shaded paving');
  assert.ok(px.shadedPaving < Math.min(px.asphalt, px.darkRoof), 'shaded paving < sunlit asphalt / dark roof');
  // pixels read back close to the model; the wash bleeds a little across
  // one-cell (5 m) strips such as a pavement beside a hot street
  for (const k of Object.keys(px)) assert.ok(Math.abs(px[k] - model[k]) < 3, `${k}: pixel ${px[k]} vs model ${model[k].toFixed(1)}`);
});

test('23:00 pixels: asphalt and concrete warmer than the lawn, lawn below air', async () => {
  const { px, air } = await regionTemps(23);
  console.log('23:00 pixels (C via palette):', px, 'air', air.toFixed(1));
  assert.ok(px.asphalt > px.grass, 'asphalt > lawn');
  assert.ok(px.concrete > px.grass, 'concrete > lawn');
  assert.ok(px.grass < air, 'lawn below air');
});
