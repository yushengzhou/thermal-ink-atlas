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
import { launch, open } from './helpers.mjs';
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
  const res = await page.evaluate(
    ([spec, band, inkRes]) => {
      const A = window.atlas;
      const c = document.getElementById('atlas');
      const Wd = c.width;
      const Hd = c.height;
      const img = c.getContext('2d').getImageData(0, 0, Wd, Hd).data;
      const lut = A.palette();
      const boxes = A.boxes();
      const hull = (pts) => {
        const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [];
        for (const q of p) {
          while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
          lo.push(q);
        }
        const up = [];
        for (let i = p.length - 1; i >= 0; i--) {
          while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop();
          up.push(p[i]);
        }
        return lo.slice(0, -1).concat(up.slice(0, -1));
      };
      const sil = boxes.map(({ box: [x0, y0, x1, y1, z0, z1] }) => {
        const pts = [];
        for (const z of [z0, z1]) for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) pts.push(A.project(x, y, z));
        return hull(pts);
      });
      const poly = (g, pts) => {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
        g.closePath();
        g.fill();
      };
      const cellPoly = (q) => [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1]].map(([x, y]) => A.project(x, y, q.z));
      const mask = new OffscreenCanvas(Wd, Hd);
      const g = mask.getContext('2d');
      const tmp = new OffscreenCanvas(Wd, Hd);
      const t = tmp.getContext('2d');
      const out = {};
      for (const [key, cells] of Object.entries(spec)) {
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, Wd, Hd);
        g.fillStyle = '#000';
        // group by building (-1 = ground)
        const groups = new Map();
        for (const q of cells) {
          if (!groups.has(q.b)) groups.set(q.b, []);
          groups.get(q.b).push(q);
        }
        for (const [b, qs] of groups) {
          t.globalCompositeOperation = 'source-over';
          t.clearRect(0, 0, Wd, Hd);
          t.fillStyle = '#000';
          for (const q of qs) poly(t, cellPoly(q));
          // cut out everything drawn in front: for ground, every occluder
          // (a box never covers ground in front of it); for a roof, the boxes
          // drawn after its building
          const after = b < 0 ? 0 : boxes.findIndex((x) => x.kind === 'b' && x.b === b) + 1;
          t.globalCompositeOperation = 'destination-out';
          for (let k = after; k < boxes.length; k++) {
            if (b >= 0 && boxes[k].kind === 'a') continue; // own-street awnings sit below roof level
            poly(t, sil[k]);
          }
          g.drawImage(tmp, 0, 0);
        }
        const a = g.getImageData(0, 0, Wd, Hd).data;
        let m = new Uint8Array(Wd * Hd);
        for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 127 ? 1 : 0;
        // erode by band (separable square min filter)
        for (const dir of [1, Wd]) {
          const e = new Uint8Array(m.length);
          for (let i = 0; i < m.length; i++) {
            if (!m[i]) continue;
            let ok = 1;
            for (let d = -band; d <= band && ok; d++) {
              const j = i + d * dir;
              if (j < 0 || j >= m.length || (dir === 1 && Math.floor(j / Wd) !== Math.floor(i / Wd)) || !m[j]) ok = 0;
            }
            e[i] = ok;
          }
          m = e;
        }
        let sum = 0;
        let n = 0;
        let ink = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          const r = img[i * 4];
          const gg = img[i * 4 + 1];
          const bb = img[i * 4 + 2];
          let best = 0;
          let be = Infinity;
          for (const [tt, col] of lut) {
            const dot = r * col[0] + gg * col[1] + bb * col[2];
            const cc = col[0] * col[0] + col[1] * col[1] + col[2] * col[2];
            const k = Math.min(1.04, Math.max(0.86, dot / cc));
            const e = (r - k * col[0]) ** 2 + (gg - k * col[1]) ** 2 + (bb - k * col[2]) ** 2;
            if (e < be) [be, best] = [e, tt];
          }
          if (Math.sqrt(be / 3) > inkRes) {
            ink++;
            continue;
          }
          sum += best;
          n++;
        }
        out[key] = { n, mean: n ? sum / n : NaN, inkShare: ink / Math.max(1, n + ink) };
      }
      return out;
    },
    [spec, EDGE_BAND, INK_RESIDUAL],
  );
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
