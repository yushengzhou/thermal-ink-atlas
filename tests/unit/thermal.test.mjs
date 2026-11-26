// Force-restore model on the asphalt-park scene: 15:00 ordering and 23:00 night lag.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { SCENE } from '../../cities/asphalt-park/scene.js';
import { buildWorld } from '../../engine/world.js';
import { runModel, airTemp, daylight, heatRgb, paletteLut } from '../../engine/thermal.js';

let W;
let T;
before(() => {
  W = buildWorld(SCENE);
  T = runModel(W);
});

/** Mean surface temperature over cells matching a predicate, at hour h. */
function regionMean(pred, h) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < W.n * W.n; i++) {
    if (pred(i)) {
      s += T.ts(i, h);
      c++;
    }
  }
  assert.ok(c > 0, 'empty region');
  return s / c;
}
const mat = (i) => (W.bld[i] >= 0 ? W.buildings[W.bld[i]].roof : W.matIds[W.mat[i]]);
const ground = (i) => W.bld[i] < 0;
const sun15 = (i) => T.sunlit(i, 15);

const REGIONS = {
  treeShade: (i) => ground(i) && mat(i) === 'grass' && sun15(i) > 0.05 && sun15(i) < 0.3,
  water: (i) => mat(i) === 'water',
  grass: (i) => ground(i) && mat(i) === 'grass' && sun15(i) > 0.95 && W.canopy[i] === 0,
  coolRoof: (i) => mat(i) === 'coolroof' && sun15(i) > 0.95,
  shadedPaving: (i) => ground(i) && (mat(i) === 'concrete' || mat(i) === 'stone') && sun15(i) < 0.05 && W.canopy[i] === 0,
  asphalt: (i) => ground(i) && mat(i) === 'asphalt' && sun15(i) > 0.95,
  darkRoof: (i) => (mat(i) === 'membrane' || mat(i) === 'metal') && sun15(i) > 0.95,
};

test('15:00 order: tree shade / water < grass / cool roof < shaded paving < sunlit asphalt / dark roof', () => {
  const m = Object.fromEntries(Object.entries(REGIONS).map(([k, f]) => [k, regionMean(f, 15)]));
  console.log('15:00 region means (C):', Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +v.toFixed(1)])));
  assert.ok(Math.max(m.treeShade, m.water) < Math.min(m.grass, m.coolRoof), 'tier 1 < tier 2');
  assert.ok(Math.max(m.grass, m.coolRoof) < m.shadedPaving, 'tier 2 < shaded paving');
  assert.ok(m.shadedPaving < Math.min(m.asphalt, m.darkRoof), 'shaded paving < tier 4');
});

test('15:00 order also holds at the scene probes', () => {
  const p = Object.fromEntries(Object.entries(SCENE.probes).map(([k, [x, y]]) => [k, T.tsAt(x, y, 15)]));
  assert.ok(Math.max(p.treeShade, p.water) < Math.min(p.grass, p.coolRoof));
  assert.ok(Math.max(p.grass, p.coolRoof) < p.shadedPaving);
  assert.ok(p.shadedPaving < Math.min(p.asphalt, p.darkRoof));
});

test('23:00 night lag: asphalt and concrete warmer than the lawn; lawn below air', () => {
  const lawn = regionMean((i) => ground(i) && mat(i) === 'grass' && W.canopy[i] === 0 && W.svf[i] > 0.8, 23);
  const asphalt = regionMean((i) => ground(i) && mat(i) === 'asphalt', 23);
  const concrete = regionMean((i) => ground(i) && mat(i) === 'concrete', 23);
  const air = airTemp(SCENE.site, 23, daylight(SCENE.site).rise);
  console.log(`23:00 asphalt ${asphalt.toFixed(1)} concrete ${concrete.toFixed(1)} lawn ${lawn.toFixed(1)} air ${air.toFixed(1)}`);
  assert.ok(asphalt > lawn && concrete > lawn);
  assert.ok(lawn < air);
});

test('peak temperatures fall in the research brief ranges', () => {
  const peak = (k) => regionMean(REGIONS[k], 15);
  const inRange = (v, lo, hi, k) => assert.ok(v >= lo && v <= hi, `${k} ${v.toFixed(1)} not in ${lo}-${hi}`);
  inRange(peak('asphalt'), 55, 68, 'aged asphalt');
  inRange(peak('darkRoof'), 55, 80, 'dark roof');
  inRange(peak('coolRoof'), 33, 45, 'cool roof');
  inRange(peak('grass'), 30, 40, 'irrigated grass');
  inRange(peak('water'), 26, 30.5, 'water');
});

test('model is deterministic', () => {
  const T2 = runModel(W);
  for (let i = 0; i < W.n * W.n; i += 97) assert.equal(T2.ts(i, 15), T.ts(i, 15));
});

test('palette is low saturation and invertible', () => {
  const lut = paletteLut();
  for (const [, c] of lut) {
    const max = Math.max(...c);
    const min = Math.min(...c);
    assert.ok((max - min) / max < 0.62, `saturation too high ${c}`);
  }
  // invertible: every palette colour's nearest neighbour is itself (+-0.5 C),
  // so pixel colours can be read back as temperatures by the e2e checks
  for (const [t, c] of lut) {
    let best = null;
    let bd = Infinity;
    for (const [u, d] of lut) {
      const e = (c[0] - d[0]) ** 2 + (c[1] - d[1]) ** 2 + (c[2] - d[2]) ** 2;
      if (e < bd) [bd, best] = [e, u];
    }
    assert.ok(Math.abs(best - t) <= 0.5, `palette not invertible at ${t}`);
  }
  assert.deepEqual(heatRgb(-50), heatRgb(0));
});
