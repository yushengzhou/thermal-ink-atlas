// village: block 10 (urban village and informal edge) set-up and numbers.
// The lanes between the village houses are 1.5-3 m wide, narrower than a
// 5 m grid cell: each lane keeps one row (or column) of cells, and the sky
// view and the direct sun of those cells come from the lane's own width W
// and wall heights H1, H2 (an endless canyon), not from the 5 m raster:
//   sky view of the floor (crossed strings, the floor's mean)
//     F = (sqrt(W^2 + H1^2) + sqrt(W^2 + H2^2) - H1 - H2) / (2 W),
//   sunlit share of the floor
//     s = clamp(1 - H_s |d| / (W tan(beta)), 0, 1),
// with H_s the wall on the sun's side and d the across-lane part of the unit
// vector toward the sun. A cell where two lanes cross is taken as the
// east-west lane with the mean heights of its corner houses. Everything else
// (roofs, roads, the square, the yard) runs on the grid as in every block.
// Sheet roofs are thin layers; every thin layer here has C >= 2 kJ m-2 K-1
// (checkThin), the floor below which the explicit 60 s step is not stable.
// Under the sheet roofs, two proxies of the room (not a simulation of it):
//   radiant: T_mrt,in^4 = F_r T_roof^4 + (1 - F_r) T_w^4, T_w = Ta + 2 K;
//   air (illustrative): dT = h_ci (T_roof - Ta) / (h_ci + rho c_p n h / 3600),
//   n calibrated (as the brief says) so the bare rusty-iron rooms peak at +3 K,
//   never shown beyond +-5 K.
// The residents' white roofs (R) repaint the marked bare sheets (paint: true)
// and run those roof cells again. The air temperature is fixed.
import { runModel, Thermal, sunSlots, cellMat, STORE, SIGMA, coarseStability } from './thermal.js';
import { DEG, clamp } from './core.js';
import { MATERIALS } from './materials.js';
import { VG_DRAW } from './vgkit.js';

/** True if a scene is the urban village block. */
export const isVillage = (scene) => !!scene.villageBlock;

// a parameter: value, source key (materials.js SOURCES), basis (materials.js BASIS), verified;
// the notes for docs/sources.md are in scripts/village.mjs (VG_NOTES), not on the page
const v = (value, source, basis, verified = false) => ({ value, source, basis, verified });

/** Block-10 parameters (each with a source key, a basis tag and a verified flag). */
export const VG = {
  storey: v(3, 'engine', 'engine'),
  storeys: v('6-8', 'brief10', 'range'),
  laneW: v(2, 'brief10', 'range'),
  roomRise: v(2.6, 'engine', 'engine'),
  thinFloor: v(2000, 'brief10', 'cited'),
  warm: v(6, 'engine', 'engine'),
  noon: v(12, 'engine', 'engine'),
  night: v(22, 'brief10', 'cited'),
  fr: v(0.4, 'brief10', 'range'),
  wallUp: v(2, 'brief10', 'range'),
  hci: v(1.25, 'brief10', 'range'),
  roomH: v(2.5, 'engine', 'engine'),
  rhoCp: v(1206, 'engine', 'engine'),
  airTarget: v(3, 'brief10', 'range'),
  airCap: v(5, 'brief10', 'cited'),
  paint: v('whiteTin', 'brief10', 'cited'),
};

const K0 = 273.15;
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];

// ---- the lanes -------------------------------------------------------------------

/** Sky view of the floor of an endless canyon, walls H1 and H2 (m), width W (m): its mean over the floor (crossed strings). */
export const laneSvf = (H1, H2, W) => (Math.hypot(W, H1) + Math.hypot(W, H2) - H1 - H2) / (2 * W);

/** The brief's centre-line form, cos(atan(2H / W)) (equal walls). */
export const centreSvf = (H, W) => Math.cos(Math.atan((2 * H) / W));

/**
 * Sunlit share of a lane floor: L {axis 'x' (east-west) or 'y' (north-south),
 * W, H1 (north or west wall), H2 (south or east wall)}; sun {alt, az} in deg.
 */
export function laneSun(L, sun) {
  if (sun.alt <= 0) return 0;
  const a = sun.az * DEG;
  const d = L.axis === 'x' ? -Math.cos(a) : Math.sin(a); // toward the sun, across the lane (+ south / + east)
  const Hs = d > 0 ? L.H2 : L.H1;
  return clamp(1 - (Hs * Math.abs(d)) / (L.W * Math.tan(sun.alt * DEG)), 0, 1);
}

/** Wall height of a building cell for the lanes: a rooftop room stands back from the lane, so its house's height. */
function wallH(world, k) {
  const b = world.bld[k];
  if (b < 0) return null;
  const B = world.buildings[b];
  return B.on ? world.vgParent.get(B.on).h : B.h;
}

/**
 * The lane cells: for each scene lane, the cells on its centre line with a
 * house on both sides across it ('lane'), and the cells where it crosses
 * another lane, with houses on all four corners ('cross', taken as the
 * east-west lane). [{i, lane, axis, W, H1, H2, kind, zone}].
 */
export function laneCells(world) {
  const { n, cell } = world;
  const at = (i, j) => (i < 0 || j < 0 || i >= n || j >= n ? null : wallH(world, j * n + i));
  const out = [];
  const seen = new Map();
  for (const L of world.scene.lanes) {
    const c = Math.floor(L.c / cell);
    for (let s = 0; s < n; s++) {
      const along = (s + 0.5) * cell;
      if (along < L.a0 || along > L.a1) continue;
      const [i, j] = L.axis === 'x' ? [s, c] : [c, s];
      const k = j * n + i;
      if (world.bld[k] >= 0) continue;
      const [a, b] = L.axis === 'x' ? [at(i, j - 1), at(i, j + 1)] : [at(i - 1, j), at(i + 1, j)];
      if (a !== null && b !== null) {
        out.push({ i: k, lane: L.id, axis: L.axis, W: L.W, H1: a, H2: b, kind: 'lane', zone: L.zone });
        continue;
      }
      if (a !== null || b !== null || L.axis !== 'x') continue;
      const nw = at(i - 1, j - 1);
      const ne = at(i + 1, j - 1);
      const sw = at(i - 1, j + 1);
      const se = at(i + 1, j + 1);
      if (nw === null || ne === null || sw === null || se === null || seen.has(k)) continue;
      seen.set(k, 1);
      out.push({ i: k, lane: L.id, axis: 'x', W: L.W, H1: (nw + ne) / 2, H2: (sw + se) / 2, kind: 'cross', zone: L.zone });
    }
  }
  return out;
}

/** Every thin layer the scene uses must hold at least the floor C (the explicit 60 s step); returns the materials checked. */
export function checkThin(world, mats = MATERIALS, floor = VG.thinFloor.value) {
  const ids = [...new Set(world.buildings.map((B) => B.roof).concat(VG.paint.value))].filter((id) => mats[id] && mats[id].thinC);
  for (const id of ids) if (mats[id].thinC.value < floor) throw new Error(`${id}: thin layer C ${mats[id].thinC.value} J m-2 K-1 is below the ${floor} floor of the 60 s step`);
  return ids;
}

/** Block-10 changes to a built world (once): drawing hooks, the lane cells and their analytic sky view. */
export function prepWorld(world) {
  if (world.vg) return world;
  world.draw = VG_DRAW; // the block's own drawing (vgkit.js)
  world.vgParent = new Map(world.buildings.map((B) => [B.id, B]));
  const lanes = laneCells(world);
  const svfGrid = Float32Array.from(world.svf);
  for (const c of lanes) {
    const s = laneSvf(c.H1, c.H2, c.W);
    world.svfOpen[c.i] = s;
    world.svf[c.i] = s * (1 - 0.75 * world.canopy[c.i]);
  }
  world.vg = { lanes, svfGrid, byCell: new Map(lanes.map((c) => [c.i, c])) };
  return world;
}

/** The lane cells' direct sun in every 10-min slot, from the canyon formula (replaces the raster's). */
export function patchSlots(world, slots) {
  for (let k = 0; k < slots.suns.length; k++) {
    const f = slots.fields[k];
    const s = slots.suns[k];
    for (const c of world.vg.lanes) f[c.i] = laneSun(c, s);
  }
  return slots;
}

/** A model made of several runs over disjoint cells (no lateral coupling, so each cell is its own run's). */
function merged(world, slots, runs, info) {
  const store = new Float32Array(world.n * world.n * STORE);
  for (const [T, cells] of runs) for (const i of cells) store.set(T.store.subarray(i * STORE, (i + 1) * STORE), i * STORE);
  return new Thermal(world, store, slots, info);
}

/** Cells by run: thin roofs (sheet), the rest (mass), and the roof cells of the marked bare sheets (paint). */
export function cellSets(world) {
  const thin = [];
  const mass = [];
  const paint = [];
  for (let i = 0; i < world.n * world.n; i++) {
    const m = MATERIALS[cellMat(world, i)];
    (m && m.thinC ? thin : mass).push(i);
    if (world.bld[i] >= 0 && world.buildings[world.bld[i]].paint) paint.push(i);
  }
  return { thin, mass, paint };
}

/**
 * The block's models: sun slots with the lanes' canyon sun, the grid model
 * (the heavy cells with block 3's coarse warm-up days, the thin roofs from a
 * cold start; both converge as in runModel), the air-proxy calibration and,
 * when first asked for, the residents' white roofs.
 */
export function villageSetup(world) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const t0 = now();
  prepWorld(world);
  checkThin(world);
  const slots = patchSlots(world, sunSlots(world));
  const t1 = now();
  const sets = cellSets(world);
  const Tm = runModel(world, { slots, warm: VG.warm.value, cells: sets.mass });
  const Tt = runModel(world, { slots, cells: sets.thin });
  const base = merged(world, slots, [[Tm, sets.mass], [Tt, sets.thin]], { ...Tm.info, cells: null, thinDays: Tt.info.days, warmThin: Tt.info.warm });
  const t2 = now();
  const n = calibrate(world, base);
  let cool = null;
  const coolModel = () => {
    if (!cool) {
      const w2 = { ...world, buildings: world.buildings.map((B) => (B.paint ? { ...B, roof: VG.paint.value } : B)) };
      const Tp = runModel(w2, { slots, cells: sets.paint });
      const all = new Set(sets.paint);
      cool = merged(world, slots, [[base, base.info.cells ?? [...Array(world.n * world.n).keys()].filter((i) => !all.has(i))], [Tp, sets.paint]], { ...base.info, painted: sets.paint.length });
    }
    return cool;
  };
  return { base, slots, sets, n, model: (on) => (on ? coolModel() : base), cached: () => [cool ? 'cool' : null].filter(Boolean), timing: { slotsMs: t1 - t0, runMs: t2 - t1 } };
}

// ---- under the roof ------------------------------------------------------------------

/** Indoor radiant proxy, deg C: (F_r T_roof^4 + (1 - F_r) (Ta + 2 K)^4)^(1/4). */
export function radiantIn(tRoof, ta) {
  const fr = VG.fr.value;
  return Math.pow(fr * (tRoof + K0) ** 4 + (1 - fr) * (ta + VG.wallUp.value + K0) ** 4, 0.25) - K0;
}

/** Share of (T_roof - Ta) that reaches the room air in the illustrative air proxy, for n air changes per hour. */
export const airShare = (n) => VG.hci.value / (VG.hci.value + (VG.rhoCp.value * n * VG.roomH.value) / 3600);

/** The illustrative air proxy, K above the outdoor air (raw, uncapped). */
export const airIn = (tRoof, ta, n) => airShare(n) * (tRoof - ta);

/** What a card may show of the air proxy: capped at +-5 K, with a flag when the cap applies. */
export function airShown(dT) {
  const cap = VG.airCap.value;
  return { value: clamp(dT, -cap, cap), capped: Math.abs(dT) > cap };
}

/** Air changes per hour that make a room whose roof peaks P K above the air peak at the target (the brief's calibration). */
export const nFor = (P) => (3600 * VG.hci.value * (P / VG.airTarget.value - 1)) / (VG.rhoCp.value * VG.roomH.value);

export const HOURS = Array.from({ length: 96 }, (_, k) => k / 4);

/** Roof cells of a building. */
export const cellsOf = (world, b) => {
  const out = [];
  for (let i = 0; i < world.bld.length; i++) if (world.bld[i] === b) out.push(i);
  return out;
};

/** A roof's surface temperature (mean of its cells) at hour h. */
export const roofTs = (T, cells, h) => mean(cells.map((i) => T.ts(i, h)));

/** The ground-level rooms of the edge with a bare rusty-iron roof (the calibration set), as built. */
export const bareRust = (world) => world.buildings.filter((B) => B.style === 'room' && B.roof === 'rustTin');

/** n from the model: the mean over the bare rusty-iron rooms of each roof's daily peak of T_roof - Ta. */
export function calibrate(world, T) {
  const peaks = bareRust(world).map((B) => {
    const c = cellsOf(world, B.index);
    return Math.max(...HOURS.map((h) => roofTs(T, c, h) - T.air(h)));
  });
  return nFor(mean(peaks));
}

/** Under one sheet roof at hour h: roof, radiant proxy and air proxy (raw and shown). null for a slab or tile roof. */
export function underRoof(world, T, b, h, n, cells = cellsOf(world, b)) {
  const B = world.buildings[b];
  const m = MATERIALS[B.roof];
  if (!m || !m.thinC) return null;
  const tr = roofTs(T, cells, h);
  const ta = T.air(h);
  const air = airIn(tr, ta, n);
  return { b, roof: B.roof, ts: tr, air: ta, radiant: radiantIn(tr, ta), airRaw: air, ...airShown(air) };
}

// ---- statistics for the cards, notes, bands and docs ----------------------------------

/** Open square reference cells: ground of the square, open sky (SVF >= 0.85), no crown, not water. */
export function squareCells(world) {
  const k = world.scene.ground.findIndex((g) => g.id === 'square');
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && world.parcel[i] === k && world.canopy[i] === 0 && world.svf[i] >= 0.85) out.push(i);
  return out;
}

/** Lane cells by group: the village's 1.5-3 m lanes (interior, the bands' set), the market lane, crossings, the edge's alleys. */
export function laneGroups(world) {
  const L = world.vg.lanes;
  return {
    village: L.filter((c) => c.zone === 'village' && c.kind === 'lane' && c.W <= 3),
    market: L.filter((c) => c.lane === 'market' && c.kind === 'lane'),
    cross: L.filter((c) => c.kind === 'cross' && c.zone === 'village'),
    edge: L.filter((c) => c.zone === 'edge' && c.kind === 'lane'),
  };
}

/**
 * Numbers behind the cards, notes, bands and docs (pure functions of the
 * model): lanes (sky view analytic / raster / centre line, Tmrt and floor at
 * the hours), the open square, roofs by material (ground-level rooms and
 * rooftop rooms), the proxies, and with the cool model the painted roofs.
 */
export function villageStats(world, T, n, cool = null) {
  const G = laneGroups(world);
  const sq = squareCells(world);
  const hours = [VG.noon.value, 15, VG.night.value, 3];
  const tm = (cells, h, M = T) => mean(cells.map((i) => M.tmrt(i, h)));
  const tsm = (cells, h, M = T) => mean(cells.map((i) => M.ts(i, h)));
  const air = Object.fromEntries(hours.map((h) => [h, T.air(h)]));
  const sun = (cells, h) => mean(cells.map((i) => T.sunlit(i, h)));
  const lane = (cs) => {
    const cells = cs.map((c) => c.i);
    const H = mean(cs.map((c) => (c.H1 + c.H2) / 2));
    return {
      n: cs.length,
      W: mean(cs.map((c) => c.W)),
      H,
      svf: mean(cs.map((c) => world.svf[c.i])),
      svfMin: Math.min(...cs.map((c) => world.svf[c.i])),
      svfMax: Math.max(...cs.map((c) => world.svf[c.i])),
      svfGrid: mean(cells.map((i) => world.vg.svfGrid[i])),
      svfCentre: mean(cs.map((c) => centreSvf((c.H1 + c.H2) / 2, c.W))),
      tmrt: Object.fromEntries(hours.map((h) => [h, tm(cells, h)])),
      ts: Object.fromEntries(hours.map((h) => [h, tsm(cells, h)])),
      sun: Object.fromEntries(hours.map((h) => [h, sun(cells, h)])),
    };
  };
  const byW = [1.5, 2, 3].map((W) => ({ W, ...lane(G.village.filter((c) => c.W === W)) }));
  const open = (h) => sq.filter((i) => T.sunlit(i, h) > 0.95);
  const square = {
    n: sq.length,
    svf: mean(sq.map((i) => world.svf[i])),
    tmrt: Object.fromEntries(hours.map((h) => [h, tm(h >= 6 && h <= 18 ? open(h) : sq, h)])),
    nSun: Object.fromEntries(hours.map((h) => [h, open(h).length])),
    ts: Object.fromEntries(hours.map((h) => [h, tsm(sq, h)])),
  };
  // roofs: each building with a sheet roof, its cells, peak and the proxies
  const roofs = [];
  for (const B of world.buildings) {
    const m = MATERIALS[B.roof];
    if (!m || !m.thinC) continue;
    const cells = cellsOf(world, B.index);
    if (!cells.length) continue;
    const series = HOURS.map((h) => roofTs(T, cells, h));
    const k = series.indexOf(Math.max(...series));
    roofs.push({ b: B.index, roof: B.roof, style: B.style, paint: !!B.paint, cells, ts15: roofTs(T, cells, 15), ts03: roofTs(T, cells, 3), peak: series[k], peakAt: HOURS[k], u15: underRoof(world, T, B.index, 15, n, cells), u03: underRoof(world, T, B.index, 3, n, cells), airPeak: Math.max(...HOURS.map((h) => airIn(series[h * 4], T.air(h), n))) });
  }
  const byMat = (style) => Object.fromEntries(['rustTin', 'galvTin', 'asbestosRoof', 'tarpRoof', 'whiteTinAged'].map((id) => {
    const r = roofs.filter((x) => x.roof === id && x.style === style);
    return [id, r.length ? { n: r.length, ts15: mean(r.map((x) => x.ts15)), ts03: mean(r.map((x) => x.ts03)), peak: mean(r.map((x) => x.peak)), radiant15: mean(r.map((x) => x.u15.radiant)), radiant03: mean(r.map((x) => x.u03.radiant)), airPeak: mean(r.map((x) => x.airPeak)) } : null];
  }));
  const slab = [];
  for (const B of world.buildings) if (B.roof === 'slabRoof' && B.style === 'village') slab.push(...cellsOf(world, B.index));
  const out = {
    n,
    share: airShare(n),
    air,
    lanes: { village: lane(G.village), market: lane(G.market), cross: lane(G.cross), edge: lane(G.edge), byW },
    square,
    roofs,
    edge: byMat('room'),
    rooftop: byMat('roofRoom'),
    slab: { n: slab.length, ts15: tsm(slab, 15), ts22: tsm(slab, VG.night.value), ts03: tsm(slab, 3) },
    calib: { n: bareRust(world).length },
  };
  if (cool) out.cool = coolStats(world, T, cool, n, roofs);
  return out;
}

/** The painted roofs, bare against newly white: surface at 15:00, daily peaks, the proxies; and the weathered white roofs as built against bare rusty iron. */
export function coolStats(world, T, C, n, roofs) {
  const P = roofs.filter((r) => r.paint);
  const one = (r) => {
    const sb = HOURS.map((h) => roofTs(T, r.cells, h));
    const sw = HOURS.map((h) => roofTs(C, r.cells, h));
    const ab = HOURS.map((h, k) => airIn(sb[k], T.air(h), n));
    const aw = HOURS.map((h, k) => airIn(sw[k], T.air(h), n));
    return { roof: r.roof, style: r.style, ts15: sb[60], cool15: sw[60], d15: sw[60] - sb[60], peakBare: Math.max(...sb), peakWhite: Math.max(...sw), rad15: radiantIn(sb[60], T.air(15)), radW15: radiantIn(sw[60], T.air(15)), airPeakBare: Math.max(...ab), airPeakWhite: Math.max(...aw), dAirPeak: Math.max(...aw) - Math.max(...ab) };
  };
  const rows = P.map(one);
  const grp = (f) => {
    const r = rows.filter(f);
    return r.length ? { n: r.length, ts15: mean(r.map((x) => x.ts15)), cool15: mean(r.map((x) => x.cool15)), d15: mean(r.map((x) => x.d15)), dRad15: mean(r.map((x) => x.radW15 - x.rad15)), rad15: mean(r.map((x) => x.rad15)), radW15: mean(r.map((x) => x.radW15)), airPeakBare: mean(r.map((x) => x.airPeakBare)), airPeakWhite: mean(r.map((x) => x.airPeakWhite)), dAirPeak: mean(r.map((x) => x.dAirPeak)) } : null;
  };
  return { n: rows.length, all: grp(() => true), rust: grp((x) => x.roof === 'rustTin'), galv: grp((x) => x.roof === 'galvTin'), rustRooms: grp((x) => x.roof === 'rustTin' && x.style === 'room') };
}

/** The thin-layer step's stability factor for a material at 340 K and the site's h_c (60 s step): < 1 smooth, > 2 diverges. */
export function thinFactor(m, hc, dt = 60) {
  return coarseStability({ NN: 1, water: [0], cap: [1 / m.thinC.value], eps: [m.eps.value], hc, hcA: null, restore: [0] }, dt);
}

/** Longwave a lane floor gets from its walls at night with the shared warm-wall term (for the docs). */
export const wallLw = (ta) => SIGMA * (ta + 2 + K0) ** 4;

/** Lane cell at a world point, or null. */
export const laneAt = (world, x, y) => world.vg.byCell.get(world.cellIndex(x, y)) ?? null;

