// Force-restore model on the asphalt-park scene: 15:00 ordering, 23:00 night
// lag, spin-up convergence, and the model-vs-literature table.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENE } from '../../cities/asphalt-park/scene.js';
import { runModel, heatRgb, paletteLut } from '../../engine/thermal.js';
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
