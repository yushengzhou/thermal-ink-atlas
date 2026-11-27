// Analysis helpers for the retrofit block (block 2), shared by the tests and
// scripts/sources.mjs (not shipped in the page): Before / After worlds and
// models, the acceptance bands from the spec and research brief, the water
// budget and the sensitivity runs.
import { SCENE } from '../cities/sponge-retrofit/scene.js';
import { buildWorld } from '../engine/world.js';
import { runModel, sunSlots } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';
import { sceneState, stateMaterials, runShared, MEASURES, measureStats, measureCells, waterBudget, D_MAX } from '../engine/retrofit.js';

let cache = null;
/** Before / After worlds, slots, the Before model and a memoised After(d, aged). */
export function base2() {
  if (!cache) {
    const sB = sceneState(SCENE, 'before');
    const sA = sceneState(SCENE, 'after');
    const wB = buildWorld(sB);
    const wA = buildWorld(sA, { svfFrom: wB });
    const slB = sunSlots(wB, { keepMasks: true });
    const slA = sunSlots(wA, { masksFrom: slB });
    const ref = { world: wB, slots: slB, model: runModel(wB, { slots: slB, materials: stateMaterials(3, true) }) };
    const runs = new Map();
    const after = (d = 3, aged = true, mats = null, key = null) => {
      const k = key ?? `${d}|${aged}`;
      if (!runs.has(k)) runs.set(k, runShared(ref, wA, slA, mats ?? stateMaterials(d, aged)));
      return runs.get(k);
    };
    cache = { scene: SCENE, sB, sA, wB, wA, slB, slA, before: ref.model, ref, after };
  }
  return cache;
}

export const measure = (id) => MEASURES.find((m) => m.id === id);

/** Measure stats (Before vs After) for an After model. */
export function stats(id, after, hours = [12, 15]) {
  const { wB, before, wA } = base2();
  return measureStats(measure(id), wB, before, wA, after, hours);
}

/**
 * Acceptance bands (spec #5, from the research brief). value: model number;
 * lo / hi: band (null = open); kind: 'spec' (acceptance criterion) or 'lit'
 * (literature comparison only).
 */
export function bandRows() {
  const { after } = base2();
  const rows = [];
  const add = (label, value, lo, hi, kind, src) => rows.push({ label, value: Math.round(value * 10) / 10, lo, hi, kind, src, inside: (lo === null || value >= lo) && (hi === null || value <= hi) });
  add('Cool roof, aged (α 0.60) vs dark membrane, ΔTs at 15:00', stats('coolRoof', after(3, true)).h15.dTs, -30, -15, 'spec', 'brief2 target');
  add('Cool roof, new (α 0.80) vs dark membrane, ΔTs at 15:00', stats('coolRoof', after(3, false)).h15.dTs, -33, -28, 'lit', 'lbnlRoof (white 0.80 vs grey 0.20 −28 K; EPA −28 to −33 K)');
  const coatN = stats('coating', after(3, false)).h12;
  const coatA = stats('coating', after(3, true)).h12;
  add('Cool pavement coating, new (α 0.25), ΔTs at 12:00', coatN.dTs, -6, -4, 'spec', 'middel2020');
  add('Cool pavement coating, new (α 0.25), pedestrian ΔTmrt at 12:00', coatN.dTmrt, 3, 5, 'spec', 'middel2020');
  add('Cool pavement coating, 1 year (α 0.18), ΔTs at 12:00', coatA.dTs, -6, -4, 'lit', 'middel2020 band for a fresh coating; ko2022 ageing');
  add('Cool pavement coating, 1 year (α 0.18), pedestrian ΔTmrt at 12:00', coatA.dTmrt, 3, 5, 'lit', 'middel2020 band for a fresh coating');
  add('Permeable pavers vs dense asphalt, ΔTs at 15:00, d = 0', stats('pavers', after(0, true)).h15.dTs, -35, -15, 'spec', 'li2013');
  add('Permeable pavers vs dense asphalt, ΔTs at 15:00, d = 1', stats('pavers', after(1, true)).h15.dTs, -7, -2, 'spec', 'li2013');
  add('Dry porous asphalt (d = 7) vs dense asphalt, ΔTs at 15:00 (> 0)', stats('porous', after(7, true)).h15.dTs, 0, null, 'spec', 'li2013 (about +5 K)');
  add('Green roof vs dark membrane, ΔTs at 15:00, d = 3', stats('greenRoof', after(3, true)).h15.dTs, -18.4, 0, 'lit', 'noaaGreen (up to −18.4 K)');
  return rows;
}

/** Water budget for d = 0..D_MAX (aged materials). */
export function water() {
  const { wA, after } = base2();
  const ds = [];
  for (let d = 0; d <= D_MAX; d++) ds.push({ d, model: after(d, true) });
  return waterBudget(wA, ds);
}

/** One-at-a-time changes within the cited ranges (block 2). */
export const SENSITIVITY2 = [
  { label: 'aged cool roof α 0.50 (bottom of aged range)', mat: 'coolroofAged', key: 'alpha', value: 0.5, measure: 'coolRoof', h: 15, d: 3 },
  { label: 'aged cool roof α 0.70 (top of aged range)', mat: 'coolroofAged', key: 'alpha', value: 0.7, measure: 'coolRoof', h: 15, d: 3 },
  { label: 'green roof α 0.15', mat: 'greenroof', key: 'alpha', value: 0.15, measure: 'greenRoof', h: 15, d: 3 },
  { label: 'green roof α 0.25', mat: 'greenroof', key: 'alpha', value: 0.25, measure: 'greenRoof', h: 15, d: 3 },
  { label: 'pavers μ 1200 (as asphalt; μ is an engine assumption)', mat: 'pavers', key: 'mu', value: 1200, measure: 'pavers', h: 15, d: 0 },
  { label: 'pavers μ 1200, d = 1', mat: 'pavers', key: 'mu', value: 1200, measure: 'pavers', h: 15, d: 1 },
  { label: 'young-tree transmission 0.37 (LAI 2)', tr: 0.37, measure: 'trees', h: 15, d: 3 },
  { label: 'young-tree transmission 0.61 (LAI 1)', tr: 0.61, measure: 'trees', h: 15, d: 3 },
];

/** Run each sensitivity case: [{label, base, value}] (ΔTs, K). */
export function sensitivity2() {
  const { after, wA, slB, wB, ref } = base2();
  return SENSITIVITY2.map((c) => {
    const baseV = stats(c.measure, after(c.d, true), [c.h])[`h${c.h}`].dTs;
    let model;
    if (c.tr) {
      const sA = { ...wA.scene, trees: wA.scene.trees.map((t) => (t.young ? { ...t, tr: c.tr } : t)) };
      const w2 = buildWorld(sA, { svfFrom: wB });
      const sl2 = sunSlots(w2, { masksFrom: slB });
      model = runShared(ref, w2, sl2, stateMaterials(c.d, true));
      // same cells as the base case (those the shipped crowns shade at that hour)
      const cells = measureCells(measure(c.measure), wB, base2().before, wA, after(c.d, true), c.h);
      const value = cells.reduce((s, i) => s + model.ts(i, c.h) - base2().before.ts(i, c.h), 0) / cells.length;
      return { ...c, base: baseV, value };
    }
    const mats = { ...MATERIALS, [c.mat]: { ...MATERIALS[c.mat], [c.key]: { ...MATERIALS[c.mat][c.key], value: c.value } } };
    model = after(c.d, true, stateMaterials(c.d, true, mats), c.label);
    return { ...c, base: baseV, value: stats(c.measure, model, [c.h])[`h${c.h}`].dTs };
  });
}
