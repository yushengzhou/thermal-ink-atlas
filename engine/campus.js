// campus: block 8 (school campus playground) set-up and numbers: the dry
// model, the irrigation run (the pitch watered at 14:00: the turf cells run
// again with an evaporative-fraction pulse, EF(t) = EF_res + (0.8 - EF_res)
// exp(-t / tau), through the per-minute path of the block-5 water store), the
// cell classes behind the bands (turf, grass, track, courts, rubber in sun,
// under the sails and under the trees), the contact-burn thresholds (ISO
// 13732-1, 1 min of contact) per material class, and the children who come
// out at play times and look for shade. The air is fixed: no warm layer
// over the turf.
import { runModel, sunSlots, cellMat, Thermal, STORE } from './thermal.js';
import { canopyShadow, boxShadow } from './sun.js';
import { inPoly, hash3 } from './core.js';
import { shadeWeights, shadeAt } from './life.js';
import { CP_DRAW } from './cpkit.js';

/** True if a scene is the campus block. */
export const isCampus = (scene) => !!scene.campusBlock;

// a parameter: value, source key (materials.js SOURCES), basis (materials.js BASIS), verified;
// the notes for docs/sources.md are in scripts/campus.mjs (CP_NOTES), not on the page
const v = (value, source, basis, verified = false) => ({ value, source, basis, verified });

/** Block-8 parameters (each with a source key, a basis tag and a verified flag). */
export const CP = {
  irrigateHour: v(14, 'engine', 'engine'),
  efPeak: v(0.8, 'brief8', 'cited'),
  efRes: v(0.05, 'brief8', 'range'),
  irrigateTau: v(15, 'brief8', 'range'),
  sailHeight: v(3.5, 'engine', 'engine'),
  burnMetal: v(51, 'iso13732', 'cited'),
  burnStone: v(56, 'iso13732', 'cited'),
  burnPlastic: v(60, 'iso13732', 'cited'),
  burn10min: v(48, 'iso13732', 'cited'),
  asphaltClass: v('ceramics, glass and stone', 'iso13732', 'interp'),
  playTimes: v('10:00-10:30, 12:00-13:00, 15:00-15:30', 'engine', 'engine'),
  kidSize: v(0.7, 'engine', 'engine'),
};

/** Contact-burn class of a material id (ISO 13732-1 groups), or null (no burn limit shown: grass, water, leaves). */
export const BURN_CLASS = { turf: 'plastic', track: 'plastic', acrylic: 'plastic', rubber: 'plastic', concrete: 'stone', stone: 'stone', greyBrick: 'stone', asphalt: 'stone', metal: 'metal', rustShed: 'metal' };
/** The 1-min contact-burn threshold (deg C) of a material id, or null. */
export function burnLimit(id) {
  const c = BURN_CLASS[id];
  return c === 'plastic' ? CP.burnPlastic.value : c === 'stone' ? CP.burnStone.value : c === 'metal' ? CP.burnMetal.value : null;
}

/** Ground cells above their 1-min burn threshold at hour h: [{i, id, limit, ts}]. */
export function burnCells(world, T, h) {
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0) continue;
    const id = cellMat(world, i);
    const lim = burnLimit(id);
    if (lim === null) continue;
    const ts = T.ts(i, h);
    if (ts > lim) out.push({ i, id, limit: lim, ts });
  }
  return out;
}

/** The irrigation pulse for runModel (opts.splash, efOnly): EF(t) from the hour on, tau in minutes. */
export const irrigation = () => ({ hour: CP.irrigateHour.value, efOnly: true, w0: 0, beta: 0, wc: 1, pulse: { ef0: CP.efPeak.value, res: CP.efRes.value, tau: CP.irrigateTau.value } });
/** EF of the watered turf t minutes after watering. */
export const efAt = (t) => (t < 0 ? 0 : CP.efRes.value + (CP.efPeak.value - CP.efRes.value) * Math.exp(-t / CP.irrigateTau.value));

const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

/**
 * Cell classes (ground cells, picked by material and geometry before any
 * result): turf (the pitch), grass (the grass field, no crown), track (no
 * crown), courts (acrylic, no crown), rubber (the playground), sail (rubber
 * cells whose centre is under a sail), open rubber (no crown, not under a sail).
 */
export function cellClasses(world) {
  const sc = world.scene;
  const out = { turf: [], grass: [], track: [], courts: [], rubber: [], sail: [], openRubber: [] };
  const field = sc.ground.findIndex((g) => g.id === 'field');
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0) continue;
    const m = cellMat(world, i);
    const [x, y] = centre(world, i);
    const crown = world.canopy[i] > 0;
    if (m === 'turf') out.turf.push(i);
    else if (m === 'grass' && world.parcel[i] === field && !crown) out.grass.push(i);
    else if (m === 'track' && !crown) out.track.push(i);
    else if (m === 'acrylic' && !crown) out.courts.push(i);
    else if (m === 'rubber') {
      out.rubber.push(i);
      const under = sc.screens.some((P) => x > P.x0 && x < P.x1 && y > P.y0 && y < P.y1);
      if (under) out.sail.push(i);
      else if (!crown) out.openRubber.push(i);
    }
  }
  return out;
}

/**
 * Rubber cells by what shades their centre at a sun position: in the sun
 * (sunlit > 0.95), in a sail's shadow only, or in a tree crown's shadow only
 * (shadow polygons; the share of sun the cell gets is the model's own).
 */
export function shadeSplit(world, T, h) {
  const sun = T.sun(h);
  const out = { sun: [], sail: [], tree: [] };
  if (sun.alt <= 0) return out;
  const sails = world.screens.map((P) => boxShadow(P.x0, P.y0, P.x1, P.y1, P.z, sun, P.z - 0.1));
  const crowns = world.trees.map((t) => canopyShadow(t.x, t.y, t.zc, t.r, sun));
  for (const i of world.campus.C.rubber) {
    const [x, y] = centre(world, i);
    const inSail = sails.some((p) => p && inPoly(p, x, y));
    const inTree = crowns.some((p) => p && inPoly(p, x, y));
    const sl = T.sunlit(i, h);
    if (!inSail && !inTree && sl > 0.95) out.sun.push(i);
    else if (inSail && !inTree && sl < 0.35) out.sail.push(i);
    else if (inTree && !inSail && sl < 0.35) out.tree.push(i);
  }
  return out;
}

/** Mean Ts / Tmrt of cells at hour h. */
export const tsMean = (T, cells, h) => mean(cells.map((i) => T.ts(i, h)));
export const tmrtMean = (T, cells, h) => mean(cells.map((i) => T.tmrt(i, h)));

/** Dry model with the turf cells taken from the irrigation run. */
export function mergeTurf(world, base, wet, cells) {
  const store = Float32Array.from(base.store);
  for (const i of cells) store.set(wet.store.subarray(i * STORE, (i + 1) * STORE), i * STORE);
  return new Thermal(world, store, base.slots, { ...base.info, irrigated: { hour: CP.irrigateHour.value, days: wet.info.days, maxDelta: wet.info.maxDelta } });
}

/** Block-8 changes to a built world (once): its drawing hooks and its cell classes. */
export function prepWorld(world) {
  if (world.campus) return world;
  world.draw = CP_DRAW; // the block's own drawing (cpkit.js)
  world.campus = { C: cellClasses(world) };
  return world;
}

/**
 * The block's models: the dry model over every cell, and the irrigated one
 * (the dry model with the turf cells from a run of just those cells with the
 * irrigation pulse; no lateral coupling in this model, so the other cells are
 * unchanged), computed when first asked for.
 */
export function campusSetup(world) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const t0 = now();
  prepWorld(world);
  const slots = sunSlots(world);
  const t1 = now();
  const base = runModel(world, { slots });
  const t2 = now();
  const cells = world.campus.C.turf;
  let wet = null;
  let merged = null;
  const wetRun = () => (wet ??= runModel(world, { slots, cells, splash: { cells, ...irrigation() } }));
  const irrigated = () => (merged ??= mergeTurf(world, base, wetRun(), cells));
  return { slots, base, irrigated, wetRun, cells, model: (on) => (on ? irrigated() : base), cached: () => ['dry', merged ? 'irrigated' : null].filter(Boolean), timing: { slotsMs: t1 - t0, runMs: t2 - t1 } };
}

// ---- irrigation numbers ---------------------------------------------------------

/**
 * The watered pitch against the dry one (turf cell means), every 15 min from
 * the watering hour for 3 h: {rows: [{h, dry, wet, d, air}], min (the row
 * after watering where the watered pitch is furthest below the dry one), recovered share 30 min later, residual 3 h on}.
 */
export function irrigationStats(dry, wet, cells) {
  const h0 = CP.irrigateHour.value;
  const rows = [];
  for (let k = 0; k <= 12; k++) {
    const h = h0 + k / 4;
    const a = tsMean(dry, cells, h);
    const b = tsMean(wet, cells, h);
    rows.push({ h, dry: a, wet: b, d: b - a, air: dry.air(h) });
  }
  const after = rows.slice(1);
  const min = after.reduce((a, r) => (r.d < a.d ? r : a));
  const later = rows.find((r) => Math.abs(r.h - (min.h + 0.5)) < 1e-9) ?? rows[rows.length - 1];
  const end = rows[rows.length - 1];
  return { rows, min, before: rows[0], later, recovered: 1 - later.d / min.d, residual: -end.d, end };
}

// ---- children at play times -------------------------------------------------------

/** True if hour h falls in a play time of the scene ([from, to) pairs). */
export const playTime = (scene, h) => scene.kids.times.some(([a, b]) => h >= a - 1e-9 && h < b - 1e-9);

const KID_SHIRTS = ['#d9573f', '#3f7fbf', '#f0c43a', '#5aa05a', '#e07fa8', '#ffffff', '#7a5cc0', '#f08a3a'];
const kidRgb = KID_SHIRTS.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

/**
 * Where the children play at a quantised hour hq (cached per hour by the
 * caller): each child takes the cheapest play spot with room left, the cost
 * being the shade weight of the spot (life.js: sun 1, building shade 0.84,
 * tree or sail shade 0.92 at full heat, scaled by the air) with a small
 * per-child jitter; when it is not hot (air <= 28 C) or at night, sun is
 * mildly preferred, as for the dwellers of the other blocks. Returns
 * [{spot, slot}] per child, or [] outside the play times.
 */
export function kidPlan(scene, shade, air, hq, seed) {
  if (!playTime(scene, hq)) return [];
  const K = scene.kids;
  const hot = air > 28 && !shade.night;
  const w = shadeWeights(air);
  const cost = K.spots.map((s) => {
    const c = shade.night ? 0 : shadeAt(shade, s.x, s.y);
    return hot ? w[c === 1 ? 1 : c === 0 ? 0 : 2] : c === 0 ? 0.95 : 1;
  });
  const used = new Array(K.spots.length).fill(0);
  const out = [];
  for (let d = 0; d < K.n; d++) {
    let best = -1;
    let bc = Infinity;
    for (let s = 0; s < K.spots.length; s++) {
      if (used[s] >= K.spots[s].cap) continue;
      const c = cost[s] * (1 + (hash3(d, s, seed + 5) - 0.5) * 0.06);
      if (c < bc) {
        bc = c;
        best = s;
      }
    }
    out.push({ spot: best, slot: used[best]++ });
  }
  return out;
}

/** Children at time t (s) for a plan: running small loops round their spot (pure function of the plan and t). */
export function kidsAt(scene, plan, t) {
  return plan.map(({ spot, slot }, d) => {
    const s = scene.kids.spots[spot];
    const r = 1.2 + 0.5 * (slot % 3) + hash3(d, 3) * 0.6;
    const dir = hash3(d, 4) < 0.5 ? 1 : -1;
    const a = dir * (t * (0.9 + 0.4 * hash3(d, 5))) / r + hash3(d, 6) * 6.283;
    const hx = -Math.sin(a) * dir;
    const hy = Math.cos(a) * dir;
    return { x: s.x + Math.cos(a) * r, y: s.y + Math.sin(a) * r, hx, hy, walk: (t * 2.2 + d) % 2, shirt: kidRgb[d % kidRgb.length], k: 700000 + d, sit: false, child: true };
  });
}

// ---- statistics ---------------------------------------------------------------------

/**
 * The block's numbers (notes, cards, docs, bands) from the dry model T:
 * per class the mean Ts at 05, 12, 14, 15 and 23 h and Tmrt at 12 and 15 h;
 * the rubber split by shade at 12:00 and 15:00 (sun / sail / tree: n, Ts,
 * Tmrt); the burn cells at 15:00 by class; the air.
 */
export function campusStats(world, T) {
  const C = world.campus.C;
  const H = [5, 12, 14, 15, 23];
  const table = Object.fromEntries(Object.entries(C).map(([k, cells]) => [k, { n: cells.length, ts: Object.fromEntries(H.map((h) => [h, tsMean(T, cells, h)])), tmrt: { 12: tmrtMean(T, cells, 12), 15: tmrtMean(T, cells, 15) }, svf: mean(cells.map((i) => world.svf[i])) }]));
  const split = {};
  for (const h of [12, 15]) {
    const s = shadeSplit(world, T, h);
    split[h] = Object.fromEntries(Object.entries(s).map(([k, cells]) => [k, { n: cells.length, ts: tsMean(T, cells, h), tmrt: tmrtMean(T, cells, h), sunlit: mean(cells.map((i) => T.sunlit(i, h))) }]));
  }
  const burn15 = burnCells(world, T, 15);
  const byMat = {};
  for (const b of burn15) byMat[b.id] = (byMat[b.id] ?? 0) + 1;
  const turfMax = Math.max(...[14, 14.25, 14.5, 14.75, 15].map((h) => tsMean(T, C.turf, h)));
  const turfPeak = [...Array(96).keys()].map((k) => ({ h: k / 4, t: tsMean(T, C.turf, k / 4) })).reduce((a, b) => (b.t > a.t ? b : a));
  return { C, table, split, burn15: { n: burn15.length, byMat }, air: Object.fromEntries([5, 12, 14, 15, 23].map((h) => [h, T.air(h)])), turfMax, turfPeak };
}

/**
 * Which of the brief's afternoon bands (15:00, the air's peak) this model
 * misses, from campusStats: the sails (surface Ta + 0-8 K, and 25 K or more
 * below the sunlit rubber), the trees (Ta + 0-5 K), the courts (Ta + 15-25 K)
 * and the track (Ta + 15-30 K, below the turf). The cards that state these
 * numbers say so when a band is missed.
 */
export function campusMisses(st, air15) {
  const s = st.split[15];
  const t = st.table;
  const out = (v, lo, hi) => v < lo || v > hi;
  return {
    sailMiss: out(s.sail.ts - air15, 0, 8) || s.sun.ts - s.sail.ts < 25,
    treeMiss: out(s.tree.ts - air15, 0, 5),
    courtMiss: out(t.courts.ts[15] - air15, 15, 25),
    trackMiss: out(t.track.ts[15] - air15, 15, 30) || t.track.ts[15] >= t.turf.ts[15],
  };
}
