// Analysis helpers for the waterfront block (block 4), shared by the tests and
// scripts/sources.mjs (not shipped in the page): the world and its models per
// wind preset, an isolated-building wind-factor check, the acceptance bands
// and the walkers.
import { SCENE } from '../cities/waterfront/scene.js';
import { buildWorld } from '../engine/world.js';
import { sunSlots } from '../engine/thermal.js';
import { shelterAt, F_MIN, windVector, REACH } from '../engine/wind.js';
import { waterfrontSetup, windStats, hcStats, asphaltContrast, openAsphalt, tmrtWindChange, waterStats, overlayStats, lineStats, comfortShade, walkerWind, promenadeShade } from '../engine/waterfront.js';
import { Life } from '../engine/life.js';

let cache = null;
/** World, slots and models (memoised). */
export function base4() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const slots = sunSlots(world);
    const setup = waterfrontSetup(world, slots);
    cache = { scene: SCENE, world, slots, setup };
  }
  return cache;
}

/**
 * Isolated building (H = 20 m, 40 m wide) in the open, wind from the north:
 * f_w (= S here, no street) upwind, along the centre line 0-1 H downwind of
 * the leeward face, and at 5-6 H.
 */
export function isolatedBuilding(H = 20) {
  const B = { x0: 180, y0: 100, x1: 220, y1: 120, h: H };
  const w = windVector(0);
  const at = (d) => shelterAt([B], 200, B.y1 + d, w);
  const lee = [];
  for (let d = 0.25; d <= H; d += 0.5) lee.push(at(d));
  const far = [];
  for (let d = 5 * H; d <= 6 * H; d += 0.5) far.push(at(d));
  return {
    H,
    upwind: shelterAt([B], 200, B.y0 - 10, w),
    side: shelterAt([B], B.x1 + 5, B.y1 + 5, w),
    leeMean: lee.reduce((a, b) => a + b, 0) / lee.length,
    leeMax: Math.max(...lee),
    leeAtWall: at(0),
    farMin: Math.min(...far),
    reach: REACH,
    fmin: F_MIN,
  };
}

/** Walkers at hour h: f_w at walking walkers vs walkable ground, and the stroll route's choice. */
export function walkers4(u = SCENE.wind.default, hour = 15) {
  const { world, setup } = base4();
  const T = setup.model(u);
  const cs = comfortShade(world, () => T);
  const life = new Life(SCENE, cs.shadeFor, (h) => T.air(h));
  const plan = life.plan(hour);
  let n = 0;
  let s = 0;
  const f = world.fine;
  for (let j = 0; j < f.n; j++) {
    for (let i = 0; i < f.n; i++) {
      if (!f.walk[j * f.n + i]) continue;
      s += world.fw[world.cellIndex((i + 0.5) * f.cell, (j + 0.5) * f.cell)];
      n++;
    }
  }
  const frames = [400, 1600, 2800, 4000, 5200];
  const at = frames.map((fr) => walkerWind(world, life.at(fr / 60, hour), plan.shade));
  const ri = SCENE.routes.findIndex((r) => r.id === 'stroll');
  const stroll = plan.choice.filter((c, k) => life.walkers[k].route === ri);
  // the same walkers with wind ignored (plain Melnikov weights): f_w at their positions
  const plain = new Life(SCENE, (hq) => {
    const sh = cs.shadeFor(hq);
    return { ...sh, wf: null };
  }, (h) => T.air(h));
  const atPlain = frames.map((fr) => walkerWind(world, plain.at(fr / 60, hour), plan.shade));
  const m = (a) => a.reduce((x, y) => x + y.fw, 0) / a.length;
  return {
    walkerFw: m(at),
    plainFw: m(atPlain),
    groundFw: s / n,
    strollRiverside: stroll.filter((c) => c === 0).length / stroll.length,
    strollN: stroll.length,
    costs: plan.costs[ri],
    atGap: plan.shade.atGap,
  };
}

/** Block 4 acceptance bands (spec #9). Rows: {label, value, lo, hi, unit, src, inside}. */
export function bands4() {
  const { scene, world, setup } = base4();
  const rows = [];
  // tol: comparison tolerance (h_c rows: f_w is stored as float32, so f_max = 1.2 reads as 1.2000000477)
  const add = (label, value, lo, hi, src, unit = '', tol = 1e-9) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, inside: (lo === null || value >= lo - tol) && (hi === null || value <= hi + tol) });
  const T3 = setup.model(3);
  const T1 = setup.model(1);
  const st = windStats(world);
  const iso = isolatedBuilding();
  add('Isolated building, open ground upwind: f_w', iso.upwind, 0.99, 1.01, 'brief4');
  add(`Isolated building (H ${iso.H} m), 0–1 H leeward on the centre line: mean f_w`, iso.leeMean, null, 0.4, 'brief4');
  add(`Isolated building, 0–1 H leeward: largest f_w (at 1 H: f_min + (1 − f_min)/5)`, iso.leeMax, null, 0.4, 'brief4');
  add('Isolated building, 5–6 H leeward: smallest f_w', iso.farMin, 0.95, null, 'brief4');
  add(`Over the river: smallest f_w (n ${st.river.n})`, st.river.min, 0.99, 1.01, 'brief4');
  add('Over the river: largest f_w', st.river.max, 0.99, 1.01, 'brief4');
  add(`${st.lee01.b} (H ${st.lee01.h} m), ground 0–1 H leeward: mean f_w (n ${st.lee01.n})`, st.lee01.mean, null, 0.4, 'brief4');
  add(`${st.lee01.b}, ground 0–1 H leeward: largest f_w (cell centres 2.5–${(st.lee01.h - 2.5).toFixed(1)} m behind the wall)`, st.lee01.max, null, 0.4, 'brief4');
  add(`${st.far5.b} (H ${st.far5.h} m), ground 5–6.5 H straight downwind: smallest f_w (n ${st.far5.n})`, st.far5.min, 0.95, null, 'brief4');
  add(`Streets along the wind (${st.aligned.ids.join(', ')}): mean f_w`, st.aligned.mean, 1.0, null, 'brief4');
  add(`Along minus across the wind (${st.across.ids.join(', ')}, mean ${st.across.mean.toFixed(3)})`, st.aligned.mean - st.across.mean, 0.3, null, 'brief4');
  for (const [u, T] of [[3, T3], [1, T1]]) {
    const h = hcStats(world, T);
    add(`h_c at ${u} m/s, ground: smallest (bound 5.7 + 3.8 u f_min = ${h.boundLo.toFixed(2)})`, h.lo, h.boundLo, null, 'brief4', 'W m⁻² K⁻¹', 1e-5);
    add(`h_c at ${u} m/s, ground: largest (bound 5.7 + 3.8 u f_max = ${h.boundHi.toFixed(2)})`, h.hi, null, h.boundHi, 'brief4', 'W m⁻² K⁻¹', 1e-5);
    add(`h_c at ${u} m/s, roofs minus 5.7 + 3.8 u = ${h.open.toFixed(2)} (f_w = 1)`, h.roofHi - h.open, -1e-5, 1e-5, 'brief4', 'W m⁻² K⁻¹', 1e-5);
  }
  const ac = asphaltContrast(world, T3, 15);
  add(`Sunlit asphalt at 15:00, 3 m/s: sheltered (f_w ≤ 0.45, n ${ac.sheltered.n}, SVF ${ac.sheltered.svf.toFixed(2)}) minus exposed (f_w ≥ 0.95, n ${ac.exposed.n}, SVF ${ac.exposed.svf.toFixed(2)})`, ac.diff, 2, 8, 'engine', 'K');
  const ac1 = asphaltContrast(world, T1, 15);
  add('The same at 1 m/s (calm), read against the same band', ac1.diff, 2, 8, 'engine', 'K');
  const open = openAsphalt(scene, 3, ac.sheltered.fw).ts(0, 15) - openAsphalt(scene, 3, ac.exposed.fw).ts(0, 15);
  add(`Open asphalt (SVF 1, no walls) at f_w ${ac.sheltered.fw.toFixed(2)} minus f_w ${ac.exposed.fw.toFixed(2)}, 15:00, 3 m/s: the wind alone`, open, 2, 8, 'engine', 'K');
  const tm = tmrtWindChange(world, T1, T3, 15);
  add('Tmrt at 15:00, 1 m/s minus 3 m/s: largest change over ground cells', tm.max, null, 2, 'brief4', 'K');
  add('Tmrt at 15:00, 1 m/s minus 3 m/s: mean over sunlit ground', tm.meanSun, null, 2, 'brief4', 'K');
  const w = waterStats(world, T3);
  add('River: daily range', w.river.range, null, 1.5, 'brief4', 'K');
  add('Pond: daily range', w.pond.range, 3, 5, 'brief4', 'K');
  add('River minus air at 15:00', w.river.t15 - w.river.a15, null, -1e-6, 'brief4', 'K');
  add('Pond minus air at 15:00', w.pond.t15 - w.pond.a15, null, -1e-6, 'brief4', 'K');
  add('Pond minus air at 04:00', w.pond.t04 - w.pond.a04, 1e-6, null, 'solcerova2019', 'K');
  const lines = setup.lines();
  const o = overlayStats(world, lines);
  add(`Air overlay by day: size of ΔTa at the bank, first drawn vertex over land (${o.nBank} lines)`, o.bank, 0.5, 1.5, 'brief4', 'K');
  add('Air overlay by day: largest size of ΔTa more than 80 m from the water, outside streets along the wind', o.beyond80, null, 0.2 - 1e-6, 'brief4', 'K');
  add('Air overlay by day: largest size of ΔTa more than 150 m from the water, in streets along the wind', o.beyond150, null, 0.2 - 1e-6, 'brief4', 'K');
  add('Air overlay at night: smallest ΔTa', o.nightMin, 0, null, 'brief4', 'K');
  const ls = lineStats(world, lines);
  add(`Wind lines (${ls.n} lines, ${ls.verts} vertices): vertices inside a building`, ls.inside, null, 0, 'brief4');
  const wk = walkers4();
  add(`Walkers at 15:00: share of the stroll route (n ${wk.strollN}) on the tree-shaded, breezy riverside rather than sunny, sheltered Rope Walk`, wk.strollRiverside, 0.5, null, 'melnikov');
  add(`Walkers at 15:00: mean f_w where people walk minus the same walkers with wind ignored`, wk.walkerFw - wk.plainFw, 0, null, 'melnikov');
  return rows;
}

/** Riverside shade numbers (docs). */
export const shade4 = (u = 3) => promenadeShade(base4().world, base4().setup.model(u), 15);

export { windStats, hcStats, asphaltContrast, waterStats, overlayStats, lineStats, tmrtWindChange };
