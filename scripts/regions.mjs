// Analysis helpers shared by the tests and scripts/sources.mjs (not shipped in
// the page): material regions on the 5 m grid, the research brief's target
// ranges, the 15:00 order check and the sensitivity runs.
import { SCENE } from '../cities/asphalt-park/scene.js';
import { buildWorld } from '../engine/world.js';
import { runModel, sunSlots, cellMat } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';

let cache = null;
/** World + base model (memoised). */
export function base() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const slots = sunSlots(world);
    cache = { world, slots, model: runModel(world, { slots }) };
  }
  return cache;
}

/**
 * Region masks (predicates on cell index), classified by the 15:00 sun.
 * The same masks drive the unit test, the e2e pixel means and the docs.
 */
export function regions(world, model) {
  const mat = (i) => cellMat(world, i);
  const ground = (i) => world.bld[i] < 0;
  const sun = (i) => model.sunlit(i, 15);
  return {
    treeShade: (i) => ground(i) && mat(i) === 'grass' && sun(i) > 0.05 && sun(i) < 0.3,
    water: (i) => mat(i) === 'water',
    grass: (i) => ground(i) && mat(i) === 'grass' && sun(i) > 0.95 && world.canopy[i] === 0,
    coolRoof: (i) => mat(i) === 'coolroof' && sun(i) > 0.95,
    shadedPaving: (i) => ground(i) && (mat(i) === 'concrete' || mat(i) === 'stone') && sun(i) < 0.05 && world.canopy[i] === 0,
    asphalt: (i) => ground(i) && mat(i) === 'asphalt' && sun(i) > 0.95,
    darkRoof: (i) => (mat(i) === 'membrane' || mat(i) === 'metal') && sun(i) > 0.95,
    // extra classes for the literature comparison and the night check
    membrane: (i) => mat(i) === 'membrane' && sun(i) > 0.95,
    metal: (i) => mat(i) === 'metal' && sun(i) > 0.95,
    concrete: (i) => ground(i) && mat(i) === 'concrete' && sun(i) > 0.95 && world.canopy[i] === 0,
    openLawn: (i) => ground(i) && mat(i) === 'grass' && world.canopy[i] === 0 && world.svf[i] > 0.8,
    allAsphalt: (i) => ground(i) && mat(i) === 'asphalt',
    allConcrete: (i) => ground(i) && mat(i) === 'concrete',
  };
}

export function cellsOf(world, pred) {
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) if (pred(i)) out.push(i);
  return out;
}

export function regionMean(world, model, pred, h) {
  const cells = cellsOf(world, pred);
  if (!cells.length) throw new Error('empty region');
  return cells.reduce((s, i) => s + model.ts(i, h), 0) / cells.length;
}

/** The spec's 15:00 tiers, coolest first. */
export const TIERS = [['treeShade', 'water'], ['grass', 'coolRoof'], ['shadedPaving'], ['asphalt', 'darkRoof']];

/** Pairs that break the tier order: [cooler-tier member, warmer-tier member]. */
export function orderFlips(means) {
  const flips = [];
  for (let a = 0; a < TIERS.length; a++) {
    for (let b = a + 1; b < TIERS.length; b++) {
      for (const x of TIERS[a]) for (const y of TIERS[b]) if (!(means[x] < means[y])) flips.push([x, y]);
    }
  }
  return flips;
}

/**
 * Literature targets from the research brief (exact ranges, deg C). `rel`
 * targets are relative to air temperature at that hour.
 */
export const TARGETS = [
  { label: 'Aged asphalt (sunlit at 15:00)', region: 'asphalt', h15: [55, 62], h23: [32, 37] },
  { label: 'Concrete paving (sunlit at 15:00)', region: 'concrete', h15: [45, 60], h23: [31, 36] },
  { label: 'Shaded paving', region: 'shadedPaving', h15: [34, 40] },
  { label: 'Dark membrane roof', region: 'membrane', h15: [60, 75], h23: [24, 28] },
  { label: 'Dark metal roof', region: 'metal', h15: [65, 80], h23: [22, 26] },
  { label: 'Cool roof', region: 'coolRoof', h15: [38, 45], h23: [22, 25] },
  { label: 'Irrigated grass (sunlit at 15:00)', region: 'grass', h15: [30, 40], h23: [18, 24] },
  { label: 'Open water', region: 'water', h15: [26, 30], h23: [25, 28] },
  { label: 'Ground in tree shade', region: 'treeShade', h15: [0, 5], h23: [1, 2], rel: true },
  { label: 'Tree canopy leaves ("about air" read as ±0.5 K)', region: 'canopy', h15: [0, 3], h23: [-0.5, 0.5], rel: true },
];

/** Model vs literature rows: [{label, h, value, lo, hi, inside}]. */
export function targetRows(world, model) {
  const R = regions(world, model);
  const rows = [];
  for (const t of TARGETS) {
    for (const [h, range] of [[15, t.h15], [23, t.h23]]) {
      if (!range) continue;
      let value = t.region === 'canopy' ? model.canopyTemp(h) : regionMean(world, model, R[t.region], h);
      if (t.rel) value -= model.air(h);
      const v = Math.round(value * 10) / 10;
      rows.push({ label: t.label, h, value: v, lo: range[0], hi: range[1], inside: v >= range[0] && v <= range[1], rel: !!t.rel });
    }
  }
  return rows;
}

/** Sensitivity cases from review round 1 (one parameter changed at a time). */
export const SENSITIVITY = [
  { label: 'grass EF 0.7 (mid cited range)', mat: 'grass', key: 'ef', value: 0.7 },
  { label: 'grass EF 0.6 (bottom of cited range)', mat: 'grass', key: 'ef', value: 0.6 },
  { label: 'cool roof albedo 0.70', mat: 'coolroof', key: 'alpha', value: 0.7 },
  { label: 'cool roof albedo 0.65 (cited minimum, new)', mat: 'coolroof', key: 'alpha', value: 0.65 },
  { label: 'grass mu 600 (bottom of cited soil range)', mat: 'grass', key: 'mu', value: 600 },
];

/** Run each case; returns [{label, means, flips}] with the base case first. */
export function sensitivity() {
  const { world, slots, model } = base();
  const keys = ['treeShade', 'water', 'grass', 'coolRoof', 'shadedPaving', 'asphalt', 'darkRoof'];
  const summarise = (label, m) => {
    const R = regions(world, m);
    const means = Object.fromEntries(keys.map((k) => [k, regionMean(world, m, R[k], 15)]));
    return { label, means, flips: orderFlips(means) };
  };
  const out = [summarise('as shipped', model)];
  for (const c of SENSITIVITY) {
    const materials = { ...MATERIALS, [c.mat]: { ...MATERIALS[c.mat], [c.key]: { ...MATERIALS[c.mat][c.key], value: c.value } } };
    out.push(summarise(c.label, runModel(world, { slots, materials })));
  }
  return out;
}
