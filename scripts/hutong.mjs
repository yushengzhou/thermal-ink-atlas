// Analysis helpers for the hutong block (block 5), shared by the tests and
// scripts/sources.mjs (not shipped in the page): the world and its models,
// the splash statistics, beta_wet sensitivity, the old EF path, and the
// acceptance bands.
import { SCENE } from '../cities/hutong/scene.js';
import { buildWorld } from '../engine/world.js';
import { sunSlots } from '../engine/thermal.js';
import { hutongSetup, lanesOf, solarNoon, splashStats, efPathRun, efPathStats, splashSensitivity, roofStats, shadedLanes, courtyardStats, treeStats, dwellShade, hutongGlossary } from '../engine/hutong.js';
import { Life, shadeDensity } from '../engine/life.js';
import { shadeClassField, runModel } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';

let cache = null;
/** World, slots, models and the statistics behind bands and docs (memoised). */
export function base5() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const slots = sunSlots(world);
    const setup = hutongSetup(world, slots);
    const dry = setup.base();
    const wet = setup.splash();
    const noon = solarNoon(SCENE.site);
    const lanes = lanesOf(world, noon);
    const band = lanes.filter((l) => l.splash).flatMap((l) => l.cells);
    cache = { scene: SCENE, world, slots, setup, dry, wet, noon, lanes, band, s: splashStats(world, dry, wet, band, setup.cells) };
  }
  return cache;
}

let extra = null;
/** The slower extras: beta_wet sensitivity and the old EF path alone, on the splashed lanes. */
export function extras5() {
  if (!extra) {
    const { world, slots, dry, band } = base5();
    const ef = efPathRun(world, slots, band);
    extra = { sens: splashSensitivity(world, slots, dry, band, [0.3, 1]), ef: efPathStats(dry, ef, band), efModel: ef };
  }
  return extra;
}

/** 15:00 numbers on the splash model (the page's default). */
export function afternoon5(T = base5().wet) {
  const { world } = base5();
  return { roof: roofStats(world, T, 15), shaded: shadedLanes(world, T, 15), court: courtyardStats(world, T, 15), trees: treeStats(world, T, 15) };
}

/** Grey tile roof at 15:00 with other albedos in its cited range (one roof cell; all roofs are alike). */
export function roofSensitivity5(alphas = [0.12, 0.25]) {
  const { world, slots } = base5();
  let i = 0;
  while (world.bld[i] < 0) i++;
  return alphas.map((a) => {
    const m = MATERIALS.greyTile;
    const mats = { ...MATERIALS, greyTile: { ...m, alpha: { ...m.alpha, value: a } } };
    return { alpha: a, ts: runModel(world, { slots, warm: 6, cells: [i], materials: mats }).ts(i, 15) };
  });
}

/** Lane floor cells shaded at 13:00, 14:00 and 15:00 (sunlit share <= 0.3 at each): Ts at 15:00. */
export function longShade5(T = base5().wet) {
  const { world } = base5();
  const ids = new Set(world.scene.ground.map((g, k) => (g.street ? k : -1)).filter((k) => k >= 0));
  const c = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && ids.has(world.parcel[i]) && [13, 14, 15].every((h) => T.sunlit(i, h) <= 0.3)) c.push(i);
  return { n: c.length, mean: c.reduce((a, i) => a + T.ts(i, 15), 0) / Math.max(1, c.length), air: T.air(15) };
}

/** Walkers at hour h on the page's default (splash) model: dwellers by shade class, and walkers' shade density. */
export function walkers5(hour = 15) {
  const { world, wet } = base5();
  const cacheShade = new Map();
  const shadeFor = (hq) => {
    if (!cacheShade.has(hq)) cacheShade.set(hq, shadeClassField(world, wet.sun(hq)));
    return cacheShade.get(hq);
  };
  const life = new Life(SCENE, shadeFor, (h) => wet.air(h));
  const d = dwellShade(life, shadeFor(hour), hour);
  const frames = [400, 1600, 2800, 4000];
  const dens = frames.map((f) => shadeDensity(world, life.at(f / 60, hour), shadeFor(hour)));
  return { ...d, shadeShare: (d.building + d.canopy) / d.n, ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length };
}

/** Glossary numbers for block 5, computed as on the page (app.js, splash on). */
export function htGlossaryStats() {
  const b = base5();
  return hutongGlossary(b.world, b.wet, { ...b, ...afternoon5(b.wet) });
}

/** Block 5 acceptance bands (spec #10). Rows: {label, value, lo, hi, unit, src, inside}. */
export function bands5() {
  const { lanes, s, wet, setup } = base5();
  const ex = extras5();
  const pm = afternoon5(wet);
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', tol = 1e-9) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, inside: (lo === null || value >= lo - tol) && (hi === null || value <= hi + tol) });
  add(`Splashed lanes (n ${s.n}, SVF ${s.svf.toFixed(2)}), W0 ${s.w0} mm: largest ΔTs within 1 h of the splash (at ${s.peakAt.toFixed(2)} h)`, s.peak, -8, -3, 'brief5', 'K');
  add('Splashed lanes: ΔTs at 23:00', s.d23, -6, -1, 'brief5', 'K');
  add('Splashed lanes: |ΔTs| the next afternoon (15:00 of the repeated day)', Math.abs(s.next15), null, 1.5, 'brief5', 'K');
  add(`Water evaporated from one splash before the next, largest over the wet-able cells (n ${setup.cells.length}), minus W0`, s.perSplash - s.w0, null, 0, 'brief5', 'mm');
  add('Water store: mass balance error, |evaporated − (start − before the splash + W0 − end)|, largest cell', s.balanceErr, null, 1e-9, 'engine', 'mm');
  add('Water store: smallest W over the day (never negative)', s.wMin, 0, null, 'engine', 'mm');
  add('Wet paving minus the wet-bulb temperature of the air, smallest at any model minute (last model day) while water is left', s.margin, 0, null, 'brief5', 'K');
  add('The old evaporation term alone (EF := 1 from 19:00, no water store): largest |ΔTs| on the splashed lanes, 19:00–24:00', ex.ef.max, null, 0.5 - 1e-9, 'brief5', 'K');
  add('Splashed lanes: ΔTmrt at 20:00', s.tmrt20, -3.5, -0.5, 'brief5', 'K');
  add('Splashed lanes: ΔTmrt at 21:00', s.tmrt21, -3.5, -0.5, 'brief5', 'K');
  for (const l of lanes.filter((x) => x.noon && x.n)) add(`${l.name} (W ${l.W} m, H ${l.H} m, n ${l.n}): noon sunlit share minus 1 − (H/tan β)/W = ${l.noon.analytic.toFixed(3)}`, l.noon.sunlit - l.noon.analytic, -0.05, 0.05, 'brief5');
  for (const l of lanes.filter((x) => x.n)) add(`${l.name}: sky view (model ${l.svf.toFixed(3)}) minus the endless canyon at the same cell centres`, l.svf - l.svfCells, -0.05, 0.05, 'brief5');
  for (const l of lanes.filter((x) => x.n && x.W > 5)) add(`${l.name}: sky view (model, cells 2.5 m off the centre line) minus cos(atan(2H/W)) = ${l.svfCentre.toFixed(3)} on the centre line`, l.svf - l.svfCentre, -0.05, 0.05, 'brief5');
  add(`Grey tile roofs at 15:00 (n ${pm.roof.n})`, pm.roof.mean, 50, 62, 'brief5', '°C');
  add(`Lane floor in shade at 15:00 (sunlit share ≤ 0.3, n ${pm.shaded.n}) minus the air`, pm.shaded.mean - pm.shaded.air, 0, 8, 'brief5', 'K');
  const ls = longShade5(wet);
  add(`Lane floor in shade at 13:00, 14:00 and 15:00 (n ${ls.n}) minus the air at 15:00`, ls.mean - ls.air, 0, 8, 'brief5', 'K');
  const wk = walkers5(15);
  add(`Dwellers at 15:00 resting in shade (walls, crowns, pergolas, awnings), n ${wk.n}`, wk.shadeShare, 0.5, null, 'melnikov');
  return rows;
}

export { lanesOf, solarNoon, splashStats, roofStats, shadedLanes, courtyardStats, treeStats };
