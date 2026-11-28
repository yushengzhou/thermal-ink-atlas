// Retrofit block (block 2): days-since-rain decay, water budget, the spec's
// acceptance bands (reported honestly: rows outside are pinned and disclosed),
// Before vs After ordering, and the shared After run.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATERIALS, MODEL } from '../../engine/materials.js';
import { decay, stateMaterials, resolveId, sceneState, ALIASES, D_MAX, MEASURES } from '../../engine/retrofit.js';
import { runModel, cellMat } from '../../engine/thermal.js';
import { base2, bandRows, water, stats, diagnostics } from '../../scripts/retrofit.mjs';
import { bandsMarkdown } from '../../scripts/sources.mjs';
import { SCENE } from '../../cities/sponge-retrofit/scene.js';

let B;
before(() => {
  B = base2();
});

test('EF(d) and mu(d) decay from wet to dry with tau', () => {
  assert.equal(decay(0.02, 0.5, 1, 0), 0.5);
  assert.ok(Math.abs(decay(0.02, 0.5, 1, 1) - (0.02 + 0.48 / Math.E)) < 1e-12);
  assert.ok(Math.abs(decay(0.02, 0.5, 1, 50) - 0.02) < 1e-12);
  for (const d of [0, 1, 3, D_MAX]) {
    const m = stateMaterials(d, true);
    for (const [id, base] of Object.entries(MATERIALS)) {
      if (!base.efWet) {
        assert.equal(m[id].ef.value, base.ef.value, `${id} does not decay`);
        continue;
      }
      const want = base.ef.value + (base.efWet.value - base.ef.value) * Math.exp(-d / base.tau.value);
      assert.ok(Math.abs(m[id].ef.value - want) < 1e-12, `${id} EF at d=${d}`);
      if (base.muWet) assert.ok(Math.abs(m[id].mu.value - (base.mu.value + (base.muWet.value - base.mu.value) * Math.exp(-d / base.tau.value))) < 1e-9);
    }
    assert.equal(m.grass.ef.value, MATERIALS.grass.ef.value, 'irrigated lawn: no decay');
  }
  // monotonic: every wetted material dries with d
  for (const id of ['pavers', 'porousAsphalt', 'greenroof', 'raingarden']) {
    let prev = Infinity;
    for (let d = 0; d <= D_MAX; d++) {
      const v = stateMaterials(d, true)[id].ef.value;
      assert.ok(v < prev, `${id} EF falls with d`);
      prev = v;
    }
  }
  // tau values from the brief
  assert.deepEqual([MATERIALS.pavers.tau.value, MATERIALS.raingarden.tau.value, MATERIALS.greenroof.tau.value], [1, 3, 4]);
});

test('aged / new aliases pick the right material', () => {
  assert.equal(resolveId('coolroofR', true), 'coolroofAged');
  assert.equal(resolveId('coolroofR', false), 'coolroofNew');
  assert.equal(resolveId('coolPave', true), 'coolPaveAged');
  assert.equal(resolveId('coolPave', false), 'coolPaveNew');
  assert.equal(resolveId('asphalt', false), 'asphalt');
  assert.equal(stateMaterials(3, true).coolroofR.alpha.value, 0.6);
  assert.equal(stateMaterials(3, false).coolroofR.alpha.value, 0.8);
  assert.equal(stateMaterials(3, true).coolPave.alpha.value, 0.18);
  assert.equal(stateMaterials(3, false).coolPave.alpha.value, 0.25);
  for (const k of Object.keys(ALIASES)) assert.ok(!(k in MATERIALS), `${k} is an alias only`);
});

test('every block-2 value has a basis tag; unverified ones are flagged', () => {
  const ids = ['coolroofAged', 'coolroofNew', 'greenroof', 'pavers', 'porousAsphalt', 'coolPaveAged', 'coolPaveNew', 'raingarden', 'youngCanopy'];
  for (const id of ids) {
    const m = MATERIALS[id];
    assert.ok(m, id);
    for (const k of ['alpha', 'eps', 'mu', 'muWet', 'ef', 'efWet', 'tau', 'storage']) {
      if (!m[k]) continue;
      assert.ok(m[k].basis && typeof m[k].verified === 'boolean', `${id}.${k}`);
    }
  }
  // the brief marks these unverified
  assert.equal(MATERIALS.coolroofAged.alpha.verified, false);
  assert.equal(MATERIALS.greenroof.alpha.verified, false);
  assert.equal(MATERIALS.greenroof.mu.verified, false);
  assert.equal(MATERIALS.greenroof.tau.verified, false);
  assert.equal(MODEL.youngTreeTransmission.verified, false);
  // and these as checked
  assert.equal(MATERIALS.pavers.alpha.verified, true);
  assert.equal(MATERIALS.porousAsphalt.alpha.verified, true);
});

test('scene: Before and After share geometry; After plants young trees and swaps materials', () => {
  const sB = sceneState(SCENE, 'before');
  const sA = sceneState(SCENE, 'after');
  assert.equal(sB.buildings.length, sA.buildings.length);
  assert.ok(sA.trees.length > sB.trees.length);
  assert.ok(sB.trees.every((t) => !t.young));
  assert.ok(sB.buildings.every((b) => ['membrane', 'metal'].includes(b.roof)), 'Before: dark roofs only');
  assert.ok(sB.ground.every((g) => ['asphalt', 'concrete', 'grass', 'stone', 'water'].includes(g.mat)), 'Before: no retrofit materials');
  const after = new Set([...sA.buildings.map((b) => b.roof), ...sA.ground.map((g) => g.mat)]);
  for (const m of ['coolroofR', 'greenroof', 'pavers', 'porousAsphalt', 'coolPave', 'raingarden']) assert.ok(after.has(m), m);
  assert.ok(SCENE.notes.length <= 5);
});

test('water budget: daily evaporated depth never exceeds the stated storage', () => {
  const w = water();
  for (const [id, v] of Object.entries(w)) {
    console.log(`${id.padEnd(14)} storage ${v.storage} mm; daily max ${v.days.map((x) => x.max.toFixed(2)).join(' ')}; week ${v.total.toFixed(1)}`);
    for (const x of v.days) assert.ok(x.max <= v.storage, `${id} d=${x.d}: ${x.max.toFixed(2)} mm > ${v.storage} mm`);
    assert.ok(v.days[0].max > v.days[v.days.length - 1].max, `${id}: evaporation falls as it dries`);
  }
  // order of magnitude from the brief: about 3 mm/day at EF 0.5
  assert.ok(w.pavers.days[0].max > 2 && w.pavers.days[0].max < 5);
});

// Acceptance bands. Rows outside a band are known deviations: they are pinned
// here (same rows, within 0.1 K of the pinned distance, either way) and disclosed in
// docs/sources.md. Never tune an input outside its cited range to pass.
// Re-pinned in #8 (diffuse wall reflection engine-wide): new coating ΔTmrt
// 0.4 -> 0.1 K short of Middel's band (moved toward it, still outside).
const PINNED_OUTSIDE = {
  'Cool pavement coating, new (α 0.25), pedestrian ΔTmrt at 12:00': 0.1,
  'Cool pavement coating, 1 year (α 0.18), ΔTs at 12:00': 2.0,
  'Cool pavement coating, 1 year (α 0.18), pedestrian ΔTmrt at 12:00': 1.9,
  'Permeable pavers vs dense asphalt, ΔTs at 15:00, d = 0': 0.4,
  'Permeable pavers vs dense asphalt, ΔTs at 15:00, d = 1': 0.5,
};

test('acceptance bands: values, pinned deviations, docs table in sync', () => {
  const rows = bandRows();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const dist = (r) => (r.lo !== null && r.value < r.lo ? r.lo - r.value : r.hi !== null && r.value > r.hi ? r.value - r.hi : 0);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [r.label, +dist(r).toFixed(2)]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, d] of Object.entries(outside)) assert.ok(Math.abs(d - PINNED_OUTSIDE[k]) <= 0.1 + 1e-9, `${k}: ${d} K beyond (pinned ${PINNED_OUTSIDE[k]} ± 0.1); a deliberate change must update the pin and the docs`);
  const by = (s) => rows.find((r) => r.label.startsWith(s));
  // the bands that hold
  assert.ok(by('Cool roof, aged').inside, 'aged cool roof within -15..-30 K');
  assert.ok(by('Cool pavement coating, new (α 0.25), ΔTs').inside, 'coating surface -4..-6 K at noon');
  assert.ok(by('Dry porous asphalt').value > 0, 'dry porous asphalt warmer than dense asphalt');
  const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');
  assert.ok(md.includes(bandsMarkdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const k of Object.keys(PINNED_OUTSIDE)) assert.ok(md.includes(k), `deviation not disclosed: ${k}`);
});

test('ordering Before vs After: each measure cools its surface, except dry porous asphalt; coating warms people', () => {
  const a = B.after(3, true);
  for (const id of ['coolRoof', 'greenRoof', 'pavers', 'rainGarden', 'trees', 'coating']) {
    const st = stats(id, a);
    console.log(`${id.padEnd(10)} 12:00 ΔTs ${st.h12.dTs.toFixed(1)} ΔTmrt ${st.h12.dTmrt?.toFixed(1) ?? '-'}; 15:00 ΔTs ${st.h15.dTs.toFixed(1)} ΔTmrt ${st.h15.dTmrt?.toFixed(1) ?? '-'} (n ${st.h15.n})`);
    assert.ok(st.h15.n > 0 && st.h12.n > 0, `${id} has cells`);
    assert.ok(st.h15.dTs < 0 && st.h12.dTs < 0, `${id} cooler After`);
  }
  assert.ok(stats('coating', a).h12.dTmrt > 0, 'reflective coating raises pedestrian Tmrt at noon');
  assert.ok(stats('trees', a).h15.dTmrt < 0, 'young trees lower Tmrt');
  assert.ok(stats('porous', B.after(7, true)).h15.dTs > 0, 'dry porous asphalt warmer');
  assert.ok(stats('porous', B.after(0, true)).h15.dTs < 0, 'wet porous asphalt cooler');
  // wetter is cooler, for every wetted measure
  for (const id of ['pavers', 'greenRoof', 'rainGarden']) {
    assert.ok(stats(id, B.after(0, true)).h15.dTs < stats(id, B.after(3, true)).h15.dTs, `${id}: d = 0 cooler than d = 3`);
  }
  // new materials cool more than aged
  assert.ok(stats('coolRoof', B.after(3, false)).h15.dTs < stats('coolRoof', a).h15.dTs);
  // untouched cells are identical in both states
  const { wA, wB, before: tB } = B;
  let same = 0;
  for (let i = 0; i < wA.n * wA.n; i++) {
    if (cellMat(wA, i) === 'membrane' && cellMat(wB, i) === 'membrane' && a.ts(i, 15) === tB.ts(i, 15)) same++;
  }
  assert.ok(same > 100, 'membrane roofs left alone keep their Before temperatures');
  for (const m of MEASURES) assert.ok(m.sources.length && m.lit && m.line, m.id);
});

test('shared After run matches a full After run and does not depend on the order of states', () => {
  const { wA, slA } = B;
  const shared = B.after(3, true);
  const full = runModel(wA, { slots: slA, materials: stateMaterials(3, true) });
  let max = 0;
  for (let i = 0; i < wA.n * wA.n; i++) for (const h of [3, 12, 15, 23]) max = Math.max(max, Math.abs(shared.ts(i, h) - full.ts(i, h)));
  console.log(`shared vs full After run: max |ΔTs| ${max.toFixed(3)} K over all cells (convergence tolerance 0.05 K)`);
  assert.ok(max < 0.15, `shared run differs by ${max} K`);
  // recomputing from scratch gives bit-identical results
  const again = base2().after(3, true, stateMaterials(3, true), 'fresh-3-aged');
  for (let i = 0; i < wA.n * wA.n; i += 13) assert.equal(again.ts(i, 15), shared.ts(i, 15));
});

test('the walkers\' relief comes from the young trees (disclosed on the card and in the docs)', () => {
  const D = diagnostics();
  console.log(`route points with Tmrt >= 65 C at 15:00: Before ${D.walk.before.share.toFixed(3)}, After ${D.walk.after.share.toFixed(3)}, After without young trees ${D.walk.afterNoTrees.share.toFixed(3)}`);
  assert.ok(D.walk.after.share < D.walk.before.share);
  assert.ok(D.walk.afterNoTrees.share >= D.walk.before.share - 0.005, 'without the trees the retrofit does not cool walkers');
  const trees = MEASURES.find((m) => m.id === 'trees');
  assert.match(trees.lesson, /Here, only the trees lower what walkers feel/);
  // the card quotes the pavers' noon Tmrt rise; keep it in step with the model
  assert.equal(`${D.paversNoonTmrt.toFixed(1)} degrees`, trees.lesson.match(/\d\.\d degrees/)[0]);
  // the coating's structural limit stated in the docs
  assert.ok(D.ratio < 0.7 && D.coat030.dTmrt >= 3 && D.coat030.dTs < -6);
  const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');
  for (const s of ['comes entirely from the young trees', 'No single coating albedo meets both Middel bands', 'τ ≈ 0.8 d', 'read as 5 mm']) assert.ok(md.includes(s), s);
});
