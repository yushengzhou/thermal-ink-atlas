// retrofit: Before / After states of a scene, days-since-rain decay of the
// wetted materials, and the shared model run.
//
// A retrofit scene lists each parcel once, with its Before material (`mat`,
// `roof`) and, if the retrofit changes it, its After material (`after`).
// Trees marked `after: true` are planted by the retrofit.
//
// Wetted materials fade from wet to dry with days since rain d:
//   X(d) = X_dry + (X_wet - X_dry) exp(-d / tau)
// for the evaporative fraction (efWet -> ef) and, for the green roof, the
// substrate admittance (muWet -> mu). d = 0 is a clear day after overnight
// rain. Irrigated lawn does not decay (it is watered).
//
// Two aliases pick the aged or new variant of a material: `coolroofR`
// (coolroofAged / coolroofNew) and `coolPave` (coolPaveAged / coolPaveNew).
import { MATERIALS } from './materials.js';
import { runModel, sunSlots, cellMat, STORE, Thermal } from './thermal.js';

export const ALIASES = {
  coolroofR: { aged: 'coolroofAged', new: 'coolroofNew' },
  coolPave: { aged: 'coolPaveAged', new: 'coolPaveNew' },
};
export const D_MAX = 7;
export const D_DEFAULT = 3;

/** Wet-to-dry decay: dry + (wet - dry) exp(-d / tau). */
export const decay = (dry, wet, tau, d) => dry + (wet - dry) * Math.exp(-d / tau);

/** Concrete material id behind an alias for the aged / new choice. */
export const resolveId = (id, aged = true) => (ALIASES[id] ? ALIASES[id][aged ? 'aged' : 'new'] : id);

/**
 * Material table for days since rain d and the aged / new choice. Decaying
 * values are replaced by their value at d (the cited wet / dry values stay on
 * the material as efWet / ef-dry for the cards).
 */
export function stateMaterials(d = D_DEFAULT, aged = true, base = MATERIALS) {
  const out = {};
  for (const [id, m] of Object.entries(base)) {
    if (!m.efWet && !m.muWet) {
      out[id] = m;
      continue;
    }
    const r = { ...m, dry: { ef: m.ef, mu: m.mu } };
    if (m.efWet) r.ef = { ...m.ef, value: decay(m.ef.value, m.efWet.value, m.tau.value, d), atD: d };
    if (m.muWet) r.mu = { ...m.mu, value: decay(m.mu.value, m.muWet.value, m.tau.value, d), atD: d };
    out[id] = r;
  }
  for (const id of Object.keys(ALIASES)) out[id] = out[resolveId(id, aged)];
  return out;
}

/** Plain (block-1 style) scene for one state: 'before' or 'after'. */
export function sceneState(scene, which) {
  const after = which === 'after';
  return {
    ...scene,
    state: which,
    ground: scene.ground.map((g) => ({ ...g, mat: after && g.after ? g.after : g.mat })),
    buildings: scene.buildings.map((b) => ({ ...b, roof: after && b.after ? b.after : b.roof })),
    trees: scene.trees.filter((t) => after || !t.after),
  };
}

/** True if the scene has Before / After states. */
export const isRetrofit = (scene) => !!scene.retrofit;

/**
 * Cells of world B whose model inputs differ from world A (material
 * parameters, sky view factor, or sunlit share in any 10-min slot).
 */
export function changedCells(wA, slotsA, matsA, wB, slotsB, matsB) {
  const N = wA.n * wA.n;
  const out = [];
  const keys = ['alpha', 'eps', 'mu', 'thinC', 'ef'];
  const val = (m, k) => (m[k] ? m[k].value : undefined);
  for (let i = 0; i < N; i++) {
    const ia = cellMat(wA, i);
    const ib = cellMat(wB, i);
    const a = matsA[ia];
    const b = matsB[ib];
    let diff = (ia === 'water') !== (ib === 'water') || keys.some((k) => val(a, k) !== val(b, k));
    if (!diff && wA.svf[i] !== wB.svf[i]) diff = true;
    for (let k = 0; !diff && k < slotsA.fields.length; k++) if (slotsA.fields[k][i] !== slotsB.fields[k][i]) diff = true;
    if (diff) out.push(i);
  }
  return Int32Array.from(out);
}

/**
 * Model for world B (After) that reuses a reference run on world A (Before)
 * for every cell whose inputs are identical, and runs only the changed cells.
 * Always derived from the same reference, so the result does not depend on
 * which d or aged/new choices were visited before.
 */
export function runShared(ref, wB, slotsB, matsB) {
  const cells = changedCells(ref.world, ref.slots, ref.model.info.mats, wB, slotsB, matsB);
  const sub = runModel(wB, { slots: slotsB, materials: matsB, cells });
  const store = new Float32Array(ref.model.store);
  for (const i of cells) store.set(sub.store.subarray(i * STORE, (i + 1) * STORE), i * STORE);
  const info = { ...sub.info, days: ref.model.info.days, maxDelta: ref.model.info.maxDelta, subDays: sub.info.days, subMaxDelta: sub.info.maxDelta, changed: cells.length };
  return new Thermal(wB, store, slotsB, info);
}

// ---- measures ------------------------------------------------------------------
// Each retrofit measure is compared cell by cell, Before vs After, on the same
// cells: those with the measure's After material that are in full sun (> 95%)
// in both states at the hour (roofs: all sunlit roof cells; young trees:
// ground cells the new crowns shade at that hour). Tmrt is for a person
// standing on those cells (not on roofs).
export const MEASURES = [
  {
    id: 'coolRoof',
    mat: 'coolroofR',
    roof: true,
    name: 'Cool roofs',
    line: 'A white coating on the dark membrane roof reflects most of the sun, so the roof skin runs far cooler. Nobody stands on the roof, so the street-level Tmrt here does not change in this model.',
    lit: 'Literature: white (0.80) vs grey (0.20) roof about −28 K at summer peak; −28 to −33 K in the EPA compendium. Aged roofs often sit below their rating.',
    sources: ['lbnlRoof', 'chicago', 'santamouris'],
  },
  {
    id: 'greenRoof',
    mat: 'greenroof',
    roof: true,
    name: 'Green roofs',
    line: 'Much cooler than the dark roof it replaces, but by mid-afternoon warmer than a white roof: plants absorb about twice the sunshine a white coating does, and a thin substrate dries out within days. Only right after rain, or if it is watered, does it come close.',
    leadMore: 'still warmer than an aged white roof at the same hour',
    lit: 'Literature: up to −18.4 K vs a black roof (Javits Center, NYC); EPA up to −31 K.',
    expert: 'The roof is one surface here: no plant canopy, no leaf temperature, no irrigation. Its dry evaporative fraction 0.25 (Bowen ratio 3) sits at the dry edge of the Bowen ratios Heusinger & Weber measured (about < 1 to 2); sensitivity runs (dry 0.33 / wet 0.67, a watered roof) are in the docs.',
    sources: ['heusinger', 'noaaGreen', 'epa'],
  },
  {
    id: 'pavers',
    mat: 'pavers',
    name: 'Permeable pavers',
    line: 'Rain soaks into the joints and evaporates over the next day or so. Wet pavers are much cooler than asphalt; once dry, only their lighter colour helps.',
    lit: 'Literature: wetted permeable pavement −15 to −35 K early afternoon; −2 to −7 K about 25 h later (Li et al. 2013).',
    sources: ['li2013'],
  },
  {
    id: 'porous',
    mat: 'porousAsphalt',
    name: 'Porous asphalt (car park)',
    line: 'Drains rain like the pavers and is cooler while wet, but dry porous asphalt is darker and lighter-weight than dense asphalt, so it runs hotter.',
    lit: 'Literature: dry porous asphalt about +5 K vs dense asphalt (Li et al. 2013).',
    sources: ['li2013'],
  },
  {
    id: 'coating',
    mat: 'coolPave',
    name: 'Cool pavement coating',
    tradeoff: true,
    line: 'A light coating on Canal Street: the road is a little cooler, but it reflects more sun onto people walking on it.',
    lit: 'Literature (Los Angeles): road −4 to −6 K, pedestrian Tmrt +4 K at midday (Middel et al. 2020); coating albedo 0.26 -> 0.18 in a year (Ko et al. 2022).',
    sources: ['middel2020', 'ko2022'],
  },
  {
    id: 'rainGarden',
    mat: 'raingarden',
    name: 'Rain gardens',
    line: 'Planted hollows along Willow Lane take the street runoff; their soil stays damp for days and cools by evaporation.',
    lit: 'No measured cooling figure for rain gardens in the brief; the values here are engine assumptions.',
    sources: ['engine', 'mccoll'],
  },
  {
    id: 'trees',
    young: true,
    name: 'Young street trees',
    line: 'New trees along Canal Street, Willow Lane, Market Road, Bridge Road and on the square. Their crowns are small and thin for now (about half the sun gets through), but walkers already use the patchy shade.',
    lesson: 'Here, only the trees lower what walkers feel. In this model the drop in sweating walkers After comes entirely from these young trees: the roofs do not touch pedestrians, and the sponge measures and reflective paving alone leave walkers as hot or slightly hotter (the lighter pavers make the square feel about 3.7 degrees hotter at noon).',
    lit: 'Literature: modelled −7 K Tmrt under trees in Phoenix; block cooling grows strongly above about 40% canopy cover.',
    sources: ['middel2021', 'brief2'],
  },
];

const SUN_FULL = 0.95;

/** Cells compared for a measure at hour h (see MEASURES). */
export function measureCells(m, wB, tB, wA, tA, h) {
  const out = [];
  const N = wA.n * wA.n;
  for (let i = 0; i < N; i++) {
    if (m.young) {
      if (wA.bld[i] < 0 && cellMat(wA, i) !== 'water' && tA.sunlit(i, h) < tB.sunlit(i, h) - 0.25) out.push(i);
    } else if (cellMat(wA, i) === m.mat && (wA.bld[i] >= 0) === !!m.roof && tA.sunlit(i, h) > SUN_FULL && tB.sunlit(i, h) > SUN_FULL) out.push(i);
  }
  return out;
}

/**
 * Before / After means for a measure at 12:00 and 15:00:
 * {h12: {n, before, after, dTs, tmrtBefore, tmrtAfter, dTmrt}, h15: {...}}.
 */
export function measureStats(m, wB, tB, wA, tA, hours = [12, 15]) {
  const out = {};
  for (const h of hours) {
    const cells = measureCells(m, wB, tB, wA, tA, h);
    const mean = (f) => cells.reduce((s, i) => s + f(i), 0) / Math.max(1, cells.length);
    const r = { n: cells.length, before: mean((i) => tB.ts(i, h)), after: mean((i) => tA.ts(i, h)) };
    r.dTs = r.after - r.before;
    if (!m.roof) {
      r.tmrtBefore = mean((i) => tB.tmrt(i, h));
      r.tmrtAfter = mean((i) => tA.tmrt(i, h));
      r.dTmrt = r.tmrtAfter - r.tmrtBefore;
    }
    out[`h${h}`] = r;
  }
  return out;
}

/**
 * Water budget per wetted material: daily evaporated depth (mm) at each d,
 * mean and max over its cells, against the storage it holds after rain.
 * evap(d) is the After model at d. Returns
 * {mat: {storage, days: [{d, mean, max}], total}} with total = sum over d.
 */
export function waterBudget(wA, evapModels, mats = MATERIALS) {
  const out = {};
  for (const [id, m] of Object.entries(mats)) {
    if (!m.storage) continue;
    const cells = [];
    for (let i = 0; i < wA.n * wA.n; i++) if (resolveId(cellMat(wA, i)) === id) cells.push(i);
    if (!cells.length) continue;
    const days = evapModels.map(({ d, model }) => {
      const e = cells.map((i) => model.evaporation(i));
      return { d, mean: e.reduce((a, b) => a + b, 0) / e.length, max: Math.max(...e) };
    });
    out[id] = { storage: m.storage.value, days, total: days.reduce((s, x) => s + x.max, 0) };
  }
  return out;
}
