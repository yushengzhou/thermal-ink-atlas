// Force-restore model on the asphalt-park scene: 15:00 ordering, 23:00 night
// lag, spin-up convergence, and the model-vs-literature table.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENE } from '../../cities/asphalt-park/scene.js';
import { runModel, heatRgb, paletteLut, dtRgb, DT_STOPS } from '../../engine/thermal.js';
import { PAPER } from '../../engine/core.js';
import { base, regions, regionMean, orderFlips, TIERS, TARGETS, targetRows } from '../../scripts/regions.mjs';
import { targetsMarkdown } from '../../scripts/sources.mjs';

let W;
let T;
let R;
before(() => {
  ({ world: W, model: T } = base());
  R = regions(W, T);
});

test('15:00 order (region means): tree shade / water < grass / cool roof < shaded paving < sunlit asphalt / dark roof', () => {
  const m = Object.fromEntries(TIERS.flat().map((k) => [k, regionMean(W, T, R[k], 15)]));
  console.log('15:00 region means (C):', Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +v.toFixed(1)])));
  assert.deepEqual(orderFlips(m), []);
});

test('15:00 order also holds at the scene probes', () => {
  const p = Object.fromEntries(Object.entries(SCENE.probes).map(([k, [x, y]]) => [k, T.tsAt(x, y, 15)]));
  assert.deepEqual(orderFlips(p), []);
});

test('23:00 night lag: asphalt and concrete warmer than the lawn; lawn below air', () => {
  const lawn = regionMean(W, T, R.openLawn, 23);
  const asphalt = regionMean(W, T, R.allAsphalt, 23);
  const concrete = regionMean(W, T, R.allConcrete, 23);
  const air = T.air(23);
  console.log(`23:00 asphalt ${asphalt.toFixed(1)} concrete ${concrete.toFixed(1)} lawn ${lawn.toFixed(1)} air ${air.toFixed(1)}`);
  assert.ok(asphalt > lawn && concrete > lawn);
  assert.ok(lawn < air);
});

test('spin-up runs until the deep temperature converges (max |dTd| < 0.05 K)', () => {
  console.log(`spin-up: ${T.info.days} days, final max |dTd| ${T.info.maxDelta.toFixed(3)} K`);
  assert.ok(T.info.days >= 3 && T.info.maxDelta < 0.05);
});

test('model vs literature: exact brief ranges, table in docs/sources.md is in sync', () => {
  const rows = targetRows(W, T);
  // every row is judged against the brief's exact range, no widened bounds
  for (const r of rows) {
    const t = TARGETS.find((x) => x.label === r.label);
    const range = r.h === 15 ? t.h15 : t.h23;
    assert.deepEqual([r.lo, r.hi], range);
    assert.equal(r.inside, r.value >= range[0] && r.value <= range[1]);
  }
  const outside = rows.filter((r) => !r.inside).map((r) => `${r.label} ${r.h}:00 ${r.value}`);
  console.log(`outside the brief (documented deviations): ${outside.length}/${rows.length}\n  ${outside.join('\n  ')}`);
  const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');
  assert.ok(md.includes(targetsMarkdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
});

// Regression guard for the documented deviations: the set of rows outside the
// brief is pinned, and each may sit at most PIN_SLACK beyond its distance when
// pinned. Changing this list is a deliberate, reviewed act (update the docs too).
// Re-pinned in #8 after diffuse wall reflection was added engine-wide: asphalt
// at 15:00 1.7 -> 2.1 K and shaded paving 0.6 -> 1.6 K beyond their ranges
// (same rows outside; disclosed in CHANGELOG and docs/sources.md).
const PINNED_OUTSIDE = {
  'Aged asphalt (sunlit at 15:00) @15': 2.1,
  'Aged asphalt (sunlit at 15:00) @23': 0.6,
  'Shaded paving @15': 1.6,
  'Cool roof @23': 1.2,
  'Irrigated grass (sunlit at 15:00) @23': 3.9,
  'Open water @23': 0.5,
  'Ground in tree shade @23': 1.6,
};
const PIN_SLACK = 0.5;

test('deviations from the brief are pinned: same rows outside, no further than pinned + 0.5 K', () => {
  const rows = targetRows(W, T);
  const dist = (r) => (r.value < r.lo ? r.lo - r.value : r.value - r.hi);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [`${r.label} @${r.h}`, +dist(r).toFixed(2)]));
  console.log('outside the brief (K beyond range):', outside);
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside the brief changed');
  for (const [k, d] of Object.entries(outside)) assert.ok(d <= PINNED_OUTSIDE[k] + PIN_SLACK, `${k}: ${d} K beyond range (pinned ${PINNED_OUTSIDE[k]})`);
});

test('model is deterministic', () => {
  const T2 = runModel(W, { slots: base().slots });
  for (let i = 0; i < W.n * W.n; i += 97) assert.equal(T2.ts(i, 15), T.ts(i, 15));
});

test('a material without mu or thinC is rejected', () => {
  const bad = { ...T.info.mats, grass: { ...T.info.mats.grass, mu: { value: 0 } } };
  assert.throws(() => runModel(W, { slots: base().slots, materials: bad, maxDays: 1, minDays: 1 }), /neither mu/);
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

// ---- heat view as surface minus air (#36) ----------------------------------------
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
/** CIELAB (D65) of an sRGB colour. */
const lab = (rgb) => {
  const [r, g, b] = rgb.map(lin);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const Y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const Z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));
// Machado, Oliveira & Fernandes (2009), severity 1.0, on linear RGB
const CVD = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const sim = (rgb, m) => {
  const l = rgb.map(lin);
  return m.map((r) => gam(Math.min(1, Math.max(0, r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))));
};

test('ΔT palette: limits -8 / +40 K, paper-neutral at 0 within a narrow band, blue below and warm above, low saturation and invertible', () => {
  assert.deepEqual([DT_STOPS[0][0], DT_STOPS.at(-1)[0]], [-8, 40]);
  assert.ok(dE(dtRgb(0), PAPER) < 8, `0 K is paper-toned: dE ${dE(dtRgb(0), PAPER).toFixed(1)}`);
  // narrow neutral band: within ±1 K the colour stays pale (L* > 80) and low in chroma
  for (const d of [-1, -0.5, 0.5, 1]) {
    const [L, a, b] = lab(dtRgb(d));
    assert.ok(L > 80 && Math.hypot(a, b) < 16, `${d} K: L* ${L.toFixed(0)}, chroma ${Math.hypot(a, b).toFixed(0)}`);
  }
  // outside it the colour has left the paper: cool side bluer than red, warm side redder than blue
  for (let d = -8; d <= -1; d += 0.25) assert.ok(dtRgb(d)[2] > dtRgb(d)[0], `${d} K on the cool side`);
  for (let d = 0.25; d <= 40; d += 0.25) assert.ok(dtRgb(d)[0] > dtRgb(d)[2], `${d} K on the warm side`);
  assert.deepEqual(dtRgb(-50), dtRgb(-8));
  assert.deepEqual(dtRgb(90), dtRgb(40));
  const lut = paletteLut(30);
  assert.equal(lut[0][0], 22);
  assert.equal(lut.at(-1)[0], 70);
  for (const [, c] of lut) assert.ok((Math.max(...c) - Math.min(...c)) / Math.max(...c) < 0.62, `saturation too high ${c}`);
  for (const [t, c] of lut) {
    let best = null;
    let bd = Infinity;
    for (const [u, d] of lut) {
      const e = (c[0] - d[0]) ** 2 + (c[1] - d[1]) ** 2 + (c[2] - d[2]) ** 2;
      if (e < bd) [bd, best] = [e, u];
    }
    assert.ok(Math.abs(best - t) <= 0.5, `ΔT palette not invertible at ${t}`);
  }
});

test('ΔT palette is ordered by lightness (lightest at 0 K, darker both ways), also for deuteranopia, protanopia and tritanopia; the block 1 contrasts survive', () => {
  for (const [name, m] of [['normal', null], ...Object.entries(CVD)]) {
    const f = (d) => (m ? sim(dtRgb(d), m) : dtRgb(d));
    let prev = -Infinity;
    for (let d = -8; d <= 0; d += 0.5) {
      const L = lab(f(d))[0];
      assert.ok(L > prev, `${name}: L* not rising towards 0 at ${d} K`);
      prev = L;
    }
    prev = Infinity;
    for (let d = 0; d <= 40; d += 0.5) {
      const L = lab(f(d))[0];
      assert.ok(L < prev, `${name}: L* not falling above 0 at ${d} K`);
      prev = L;
    }
    // block 1 region means (model ΔT, K): 15:00 water -5.0, tree shade 0.0, lawn +3.4, asphalt +29.1; 23:00 lawn -1.1, asphalt +2.6
    for (const [a, b, min] of [[-5, 29.1, 25], [0, 29.1, 40], [3.4, 29.1, 35], [-1.1, 2.6, 15]]) {
      const e = dE(f(a), f(b));
      assert.ok(e >= min, `${name}: ${a} vs ${b} K only dE ${e.toFixed(1)}`);
    }
  }
});
