// busstop: block 9 (bus stops and footbridges) set-up and numbers. The 5 m
// grid model runs as everywhere else, with the shelter roofs and the
// footbridge decks as flat screens and the opaque shelter panels as thin
// opaque boxes (world.awnings) for the ground shade. Shelters are only 2 m
// deep, so the people waiting are computed at points (the waiting-point
// model): at each waiting place the direct sun reaching the ground, the
// body (0.35, 0.65 and 1.0 of the head height) and the head is traced
// through the buildings, the crowns, the roofs (transmission tau) and the
// vertical panels; the ground under the place runs the same force-restore
// model as a grid cell (a one-point "world" with the point's own sun share
// and sky view), and Tmrt is the engine's six-direction sum with the body's
// sun share and the sky view at mid-body under the roof. Buses arrive on a
// headway schedule with a spread, riders arrive at random and wait for the
// next bus; each rider's heat dose is the engine's definition on the
// apparent temperature. Footbridge decks, handrails and bench seats are the
// shared thin metal layer (metal), at points too. The air is fixed.
import { runModel, Thermal, svfAt, SLOTS } from './thermal.js';
import { solarPosition } from './sun.js';
import { hash3, DEG, clamp } from './core.js';
import { MATERIALS, MODEL } from './materials.js';
import { BS_DRAW } from './bskit.js';

/** True if a scene is the bus stop block. */
export const isBus = (scene) => !!scene.busBlock;

// a parameter: value, source key (materials.js SOURCES), basis (materials.js BASIS), verified;
// the notes for docs/sources.md are in scripts/busstop.mjs (BS_NOTES), not on the page
const v = (value, source, basis, verified = false) => ({ value, source, basis, verified });

/** Block-9 parameters (each with a source key, a basis tag and a verified flag). */
export const BS = {
  shelterH: v(2.65, 'brief9', 'engine'),
  shelterDepth: v(2, 'brief9', 'engine'),
  shelterLength: v(7, 'brief9', 'engine'),
  deckH: v(6, 'brief9', 'range'),
  headStand: v(1.7, 'brief9', 'cited'),
  headSeat: v(1.2, 'brief9', 'cited'),
  bodySamples: v('0.35, 0.65 and 1.0 of the head height', 'engine', 'engine'),
  skyAt: v('0.65 of the head height', 'engine', 'engine'),
  westScreen: v(2.2, 'brief9', 'cited'),
  biggerRoof: v(1, 'engine', 'engine'),
  headway: v(10, 'brief9', 'engine'),
  cv: v(0.4, 'brief9', 'range'),
  riders: v(0.4, 'engine', 'engine'),
  service: v('06:00-23:00', 'engine', 'engine'),
  clock: v(12, 'engine', 'engine'),
  doseBase: v(32, 'brief9', 'interp'),
  burnMetal: v(51, 'iso13732', 'cited'),
  burnStone: v(56, 'iso13732', 'cited'),
  burnPlastic: v(60, 'iso13732', 'cited'),
  burn1s: v(65, 'brief9', 'edge'),
  benchZ: v(0.45, 'engine', 'engine'),
  railZ: v(1.1, 'engine', 'engine'),
};

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const FR = [0.35, 0.65, 1];

// ---- geometry -------------------------------------------------------------------

/**
 * What the sun passes on its way to a point (block geometry): the buildings,
 * the trees (each crown its own transmission, at most three deep), the flat
 * roofs above the point (world.screens and the stop roofs: rect at z, tr) and
 * the vertical panels (x0 = x1 or y0 = y1, z0-z1, tr). variant: optional
 * {roofs, panels} for a stop (the headline comparison).
 */
export function geometry(world, variant = null) {
  const sc = world.scene;
  const panels = sc.stops.flatMap((s) => s.panels.map((P) => ({ ...P, stop: s.id, tr: MATERIALS[P.kind].tr.value })));
  const roofs = world.screens.map((P) => ({ ...P }));
  const G = { buildings: world.buildings, trees: world.trees, roofs, panels, canopyTr: MODEL.canopyTransmission.value };
  if (variant) {
    G.roofs = roofs.filter((P) => P.id !== `roof${variant.stop}`).concat(variant.roofs ?? []);
    G.panels = panels.filter((P) => P.stop !== variant.stop).concat(variant.panels ?? []);
  }
  return G;
}

/**
 * Share of the direct sun reaching the point (x, y, z) (1 = full sun): 0
 * behind a building, the crowns' transmission, times tr of every roof above
 * whose plane the sun ray crosses inside its footprint and of every vertical
 * panel it crosses. No sun below 0.5 deg (as the cast shadows).
 */
export function transmit(G, x, y, z, sun) {
  if (sun.alt <= 0.5) return 0;
  const t = Math.tan(sun.alt * DEG);
  const b = sun.az * DEG;
  const sx = Math.sin(b);
  const sy = -Math.cos(b);
  for (const B of G.buildings) {
    if (B.h <= z) continue;
    // the ray's horizontal run while it is below the roof, clipped to the footprint (slabs)
    let s0 = 0;
    let s1 = (B.h - z) / t;
    for (const [p, d, lo, hi] of [[x, sx, B.x0, B.x1], [y, sy, B.y0, B.y1]]) {
      if (Math.abs(d) < 1e-12) {
        if (p < lo || p > hi) s1 = -1;
        continue;
      }
      const a = (lo - p) / d;
      const c = (hi - p) / d;
      s0 = Math.max(s0, Math.min(a, c));
      s1 = Math.min(s1, Math.max(a, c));
    }
    if (s0 <= s1) return 0;
  }
  let f = 1;
  let deep = 0;
  const sb = Math.sin(sun.alt * DEG);
  for (const T of G.trees) {
    if (T.zc <= z || deep >= 3) continue;
    // inside the crown's ground shadow (canopyShadow's ellipse, from the point's height)
    const L = (T.zc - z) / t;
    const ex = x - T.x + sx * L;
    const ey = y - T.y + sy * L;
    const u = (ex * sx + ey * sy) * sb;
    const w = ex * sy - ey * sx;
    if (u * u + w * w < T.r * T.r) {
      f *= T.tr ?? G.canopyTr;
      deep++;
    }
  }
  for (const P of G.roofs) {
    if (P.z <= z) continue;
    const d = (P.z - z) / t;
    const hx = x + sx * d;
    const hy = y + sy * d;
    if (hx > P.x0 && hx < P.x1 && hy > P.y0 && hy < P.y1) f *= P.tr;
  }
  for (const Q of G.panels) {
    const ew = Q.x0 === Q.x1; // a panel in a plane x = const
    const ds = ew ? sx : sy;
    if (Math.abs(ds) < 1e-9) continue;
    const s = ((ew ? Q.x0 : Q.y0) - (ew ? x : y)) / ds;
    if (s <= 0) continue;
    const u = ew ? y + sy * s : x + sx * s;
    const hz = z + t * s;
    if (u > (ew ? Q.y0 : Q.x0) && u < (ew ? Q.y1 : Q.x1) && hz > Q.z0 && hz < Q.z1) f *= Q.tr;
  }
  return f;
}

/** View factor from an upward-facing point element to a horizontal rectangle c above it (corner sums, signed). */
export function viewRect(x0, y0, x1, y1, c, x, y) {
  const g = (a, b) => {
    const A = a / c;
    const B = b / c;
    const p = Math.sqrt(1 + A * A);
    const q = Math.sqrt(1 + B * B);
    return ((A / p) * Math.atan(B / p) + (B / q) * Math.atan(A / q)) / (2 * Math.PI);
  };
  return g(x1 - x, y1 - y) - g(x0 - x, y1 - y) - g(x1 - x, y0 - y) + g(x0 - x, y0 - y);
}

/** Sky view at a point: the buildings' horizon (svfAt from z), the crowns above (as the grid: 1 - 0.75 cover) and the roofs above (their view factor, all counted as cover). */
export function pointSky(world, G, x, y, z) {
  const open = svfAt(world.heightAt, x, y, z + 0.01, 16, 160, 2.5);
  let cover = 0;
  for (const T of G.trees) {
    if (T.zc <= z) continue;
    const d = Math.hypot(T.x - x, T.y - y);
    if (d < T.r) cover = Math.max(cover, 1 - (d / T.r) ** 2 * 0.5);
  }
  let F = 0;
  for (const P of G.roofs) if (P.z > z) F += viewRect(P.x0, P.y0, P.x1, P.y1, P.z - z, x, y);
  F = clamp(F, 0, 1);
  return { open, cover, F, svf: open * (1 - 0.75 * cover) * (1 - F) };
}

// ---- the waiting-point model --------------------------------------------------------

const POINT_MATS = ['concrete', 'metal', 'asphalt', 'grass'];

/**
 * Run the force-restore model at points: pts [{x, y, z (surface), mat, head
 * (person's head above the surface, 0: a surface only)}]. Each point is a
 * cell of a one-row "world" with its own sun share (at the surface) and sky
 * view; the person's Tmrt takes the body's sun share and the sky view at
 * mid-body. mats, extra: other materials and runModel options (docs sensitivity
 * runs only). Returns {pts, T (surface), TB (person), ts, tmrt, body, head, sky}.
 */
export function pointModel(world, G, pts, slots0 = null, mats = null, extra = null) {
  const NP = pts.length;
  const n = Math.max(1, Math.ceil(Math.sqrt(NP)));
  const N = n * n;
  const site = world.scene.site;
  const suns = slots0 ? slots0.suns : Array.from({ length: SLOTS }, (_, k) => solarPosition(site, (k * 24) / SLOTS));
  const ground = [];
  const body = [];
  const head = [];
  for (let k = 0; k < SLOTS; k++) {
    const s = suns[k];
    const g = new Float32Array(N);
    const bd = new Float32Array(N);
    const hd = new Float32Array(N);
    pts.forEach((p, i) => {
      g[i] = transmit(G, p.x, p.y, p.z + 0.01, s);
      if (p.head) {
        bd[i] = mean(FR.map((fr) => transmit(G, p.x, p.y, p.z + fr * p.head, s)));
        hd[i] = transmit(G, p.x, p.y, p.z + p.head, s);
      }
    });
    ground.push(g);
    body.push(bd);
    head.push(hd);
  }
  const sky = pts.map((p) => pointSky(world, G, p.x, p.y, p.z));
  const skyB = pts.map((p) => (p.head ? pointSky(world, G, p.x, p.y, p.z + 0.65 * p.head) : null));
  const F32 = (f) => Float32Array.from({ length: N }, (_, i) => (i < NP ? f(i) : 1));
  const pw = {
    scene: world.scene,
    size: n,
    cell: 1,
    n,
    mat: Uint8Array.from({ length: N }, (_, i) => (i < NP ? POINT_MATS.indexOf(pts[i].mat) : 0)),
    matIds: POINT_MATS,
    bld: new Int16Array(N).fill(-1),
    canopy: F32((i) => sky[i].cover),
    svf: F32((i) => sky[i].svf),
    svfOpen: F32((i) => sky[i].open),
    gview: null,
    buildings: [],
  };
  const slots = { suns, fields: ground };
  const T = runModel(pw, { slots, cells: [...Array(NP).keys()], ...(mats ? { materials: mats } : {}), ...extra });
  const TB = new Thermal({ ...pw, svf: F32((i) => (skyB[i] ? skyB[i].svf : sky[i].svf)) }, T.store, T.slots, T.info);
  const lerpSlot = (arr, i, h) => {
    const x = ((((h % 24) + 24) % 24) * SLOTS) / 24;
    const k = Math.floor(x) % SLOTS;
    const f = x - Math.floor(x);
    return arr[k][i] + (arr[(k + 1) % SLOTS][i] - arr[k][i]) * f;
  };
  const bodyAt = (i, h) => lerpSlot(body, i, h);
  return {
    pts,
    T,
    TB,
    sky,
    skyB,
    ts: (i, h) => T.ts(i, h),
    body: bodyAt,
    head: (i, h) => lerpSlot(head, i, h),
    ground: (i, h) => lerpSlot(ground, i, h),
    tmrt: (i, h) => TB.tmrt(i, h, bodyAt(i, h)),
    air: (h) => T.air(h),
  };
}

/** The points of the block: every waiting place, each stop's centre (standing) and open reference, bench seats, deck samples and handrails. */
export function blockPoints(scene) {
  const out = [];
  const add = (p) => out.push({ ...p, k: out.length });
  const Hs = BS.headStand.value;
  scene.stops.forEach((s) => {
    s.slots.forEach(([x, y, seated, cap], j) => add({ kind: 'slot', stop: s.id, j, x, y, z: 0, mat: 'concrete', head: seated ? BS.headSeat.value : Hs, seated: !!seated, cap }));
    if (s.roof) add({ kind: 'centre', stop: s.id, x: (s.roof.x0 + s.roof.x1) / 2, y: (s.roof.y0 + s.roof.y1) / 2, z: 0, mat: 'concrete', head: Hs });
    add({ kind: 'open', stop: s.id, x: s.open[0], y: s.open[1], z: 0, mat: 'concrete', head: Hs });
    const B = s.bench;
    add({ kind: 'bench', stop: s.id, x: (B.x0 + B.x1) / 2, y: (B.y0 + B.y1) / 2, z: BS.benchZ.value, mat: B.mat ?? 'metal', head: 0 });
  });
  scene.bridges.forEach((b) => {
    const yc = (b.y0 + b.y1) / 2;
    for (let x = b.x0 + 4; x < b.x1; x += 10) add({ kind: 'deck', bridge: b.id, x, y: yc, z: b.z, mat: 'metal', head: Hs });
    add({ kind: 'rail', bridge: b.id, x: (b.x0 + b.x1) / 2, y: b.y1 - 0.05, z: b.z + BS.railZ.value, mat: 'metal', head: 0 });
  });
  return out;
}

/** Block-9 changes to a built world (once): its drawing hooks and the opaque panels as thin boxes for the grid's ground shade. */
export function prepWorld(world) {
  if (world.bus) return world;
  world.draw = BS_DRAW; // the block's own drawing (bskit.js)
  for (const s of world.scene.stops) {
    for (const P of s.panels) {
      if (MATERIALS[P.kind].tr.value > 0) continue; // glass walls: at the points only
      const e = 0.05;
      world.awnings.push({ x0: P.x0 - (P.x0 === P.x1 ? e : 0), y0: P.y0 - (P.y0 === P.y1 ? e : 0), x1: P.x1 + (P.x0 === P.x1 ? e : 0), y1: P.y1 + (P.y0 === P.y1 ? e : 0), z0: P.z0, z1: P.z1, b: -1 });
    }
  }
  world.bus = { pts: blockPoints(world.scene) };
  return world;
}

/**
 * The block's models: the grid model and the waiting-point model of every
 * point of the block (blockPoints), at load.
 */
export function busSetup(world) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const t0 = now();
  prepWorld(world);
  const t1 = now();
  const base = runModel(world);
  const t2 = now();
  const G = geometry(world);
  const P = pointModel(world, G, world.bus.pts, { suns: base.slots.suns });
  const t3 = now();
  return { base, G, P, model: () => base, timing: { slotsMs: t1 - t0, runMs: t2 - t1, pointMs: t3 - t2 } };
}

// ---- buses and riders -----------------------------------------------------------------

/** Mean wait for random arrivals (the brief): E[W] = (h / 2)(1 + cv^2), minutes. */
export const meanWait = (h = BS.headway.value, cv = BS.cv.value) => (h / 2) * (1 + cv * cv);

/**
 * One stop's day (minutes): bus arrivals from 06:00 with headway h times
 * (1 + a (2u - 1)), u uniform, a = cv sqrt(3) (so the gaps have the
 * coefficient of variation cv), until 23:00; riders arriving at random
 * (exponential gaps, rate riders per minute) until the last bus, each with
 * the bus they board. Pure function of the seed and the stop index.
 */
export function daySchedule(seed, si, o = {}) {
  const h = o.headway ?? BS.headway.value;
  const cv = o.cv ?? BS.cv.value;
  const rate = o.riders ?? BS.riders.value;
  const a = cv * Math.sqrt(3);
  const buses = [];
  let t = 360 + h * hash3(si, seed, 1);
  for (let k = 0; t < 1380; k++) {
    buses.push(t);
    t += h * (1 + a * (2 * hash3(k, si, seed + 2) - 1));
  }
  const riders = [];
  let r = 360;
  let bi = 0;
  for (let k = 0; ; k++) {
    r += -Math.log(1 - hash3(k, si, seed + 3) * 0.999999) / rate;
    while (bi < buses.length && buses[bi] < r) bi++;
    if (bi >= buses.length) break;
    riders.push({ id: k, a: r, bus: bi, b: buses[bi] });
  }
  return { buses, riders };
}

/** Index of the last element of a sorted array <= x (or -1). */
function lastLE(arr, x, get = (e) => e) {
  let lo = 0;
  let hi = arr.length - 1;
  let out = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (get(arr[m]) <= x) {
      out = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return out;
}

/**
 * The riders of one bus at one stop take waiting places in the order they
 * arrive: when it is hot (air above 28 C, by day) the free place with the
 * lowest Tmrt at that time (point model, with a small per-rider jitter), else
 * the first free place (the bench first). places: [{i (point index), cap}];
 * tmrtAt(i, h). Returns [{rider, place, n (how many before it at that place)}].
 */
export function seatRiders(riders, places, tmrtAt, airAt, sunUp, seed) {
  const used = places.map(() => 0);
  return riders.map((r) => {
    const h = r.a / 60;
    const hot = airAt(h) > 28 && sunUp(h);
    let best = -1;
    let bc = Infinity;
    places.forEach((p, k) => {
      if (used[k] >= p.cap) return;
      const c = hot ? tmrtAt(p.i, h) + (hash3(r.id, k, seed + 4) - 0.5) * 0.5 : k;
      if (c < bc) {
        bc = c;
        best = k;
      }
    });
    if (best < 0) best = places.length - 1; // everything taken: crowd the last open place
    return { rider: r, place: best, n: used[best]++ };
  });
}

/** The apparent temperature with radiation (Steadman 1994, the BoM formula, as block 4): Q = 6.1 (Tmrt - Ta). */
export function apparentTemp(ta, eHpa, ws, tmrt) {
  const u = clamp(ws, 0.5, 17);
  return ta + 0.348 * eHpa - 0.7 * u + (0.7 * 6.1 * (tmrt - ta)) / (u + 10) - 4.25;
}

/** Heat dose of a wait (engine definition, on the apparent temperature): D = sum max(0, AT - 32) dt, K min, 1-min steps. */
export function waitDose(P, i, a, b, site) {
  let D = 0;
  let tm = 0;
  let w = 0;
  for (let t = a; t < b - 1e-9; t += 1) {
    const dt = Math.min(1, b - t);
    const h = (t + dt / 2) / 60;
    const T = P.tmrt(i, h);
    const at = apparentTemp(P.air(h), site.vapourHpa, site.wind, T);
    D += Math.max(0, at - BS.doseBase.value) * dt;
    tm += T * dt;
    w += dt;
  }
  return { D, tmrt: w ? tm / w : NaN };
}

/**
 * The bus stops' riders (lazy, cached per bus): schedules, waiting places,
 * who waits where at a clock minute, the buses, the waiting statistics.
 */
export function riderBook(world, P) {
  const sc = world.scene;
  const pts = world.bus.pts;
  const days = sc.stops.map((s, si) => daySchedule(sc.seed, si));
  const places = sc.stops.map((s) => pts.filter((p) => p.kind === 'slot' && p.stop === s.id).map((p) => ({ i: p.k, cap: p.cap, x: p.x, y: p.y, seated: p.seated })));
  const sunUp = (h) => P.T.sun(h).alt > 0;
  const plans = sc.stops.map(() => new Map());
  const plan = (si, bi) => {
    const m = plans[si];
    if (!m.has(bi)) {
      const rs = days[si].riders.filter((r) => r.bus === bi);
      m.set(bi, seatRiders(rs, places[si], P.tmrt, P.air, sunUp, sc.seed));
    }
    return m.get(bi);
  };
  /** Riders waiting at stop si at clock minute c: [{rider, place, n}]. */
  const waiting = (si, c) => {
    const d = days[si];
    const bi = lastLE(d.buses, c) + 1; // the next bus (the one arriving after c)
    if (bi >= d.buses.length) return [];
    return plan(si, bi).filter((x) => x.rider.a <= c);
  };
  /** Riders arriving in [h0, h1) at stop si, with their wait, Tmrt while waiting and dose. */
  const stats = (si, h0, h1) => {
    const rs = days[si].riders.filter((r) => r.a >= h0 * 60 && r.a < h1 * 60);
    const rows = rs.map((r) => {
      const seat = plan(si, r.bus).find((x) => x.rider.id === r.id);
      const p = places[si][seat.place];
      const d = waitDose(P, p.i, r.a, r.b, sc.site);
      return { wait: r.b - r.a, tmrt: d.tmrt, D: d.D, head: P.head(p.i, r.a / 60), seated: p.seated };
    });
    return { n: rows.length, wait: mean(rows.map((x) => x.wait)), tmrt: mean(rows.map((x) => x.tmrt)), D: mean(rows.map((x) => x.D)), headSun: mean(rows.map((x) => (x.head >= 0.5 ? 1 : 0))), rows };
  };
  return { days, places, plan, waiting, stats };
}

/** The bus clock (minutes) at animation time t (s) and quantised hour hq: hq, then a 15-min window run 12 times faster, looping. */
export const clockAt = (t, hq) => hq * 60 + ((t * BS.clock.value) / 60) % 15;

// ---- contact burns -------------------------------------------------------------

/** The 1-min contact-burn limit of a surface material (ISO 13732-1 groups): metal, stone and concrete, plastics. */
export const burnLimit = (mat) => (mat === 'metal' ? BS.burnMetal.value : mat === 'concrete' || mat === 'asphalt' ? BS.burnStone.value : BS.burnPlastic.value);

/** The contact flags of a surface point at hour h: {ts, limit, min1 (above its 1-min limit), s1 (metal above about 65 C: the 1-s flag, unverified)}. */
export function contactFlags(P, i, h) {
  const p = P.pts[i];
  const ts = P.ts(i, h);
  const limit = burnLimit(p.mat);
  return { ts, limit, min1: ts > limit, s1: p.mat === 'metal' && ts > BS.burn1s.value };
}

// ---- statistics ------------------------------------------------------------------

/** Point index of the first point matching a test. */
export const ptIndex = (pts, test) => pts.findIndex(test);

/**
 * The headline comparison at stop C (its four bench places, seated heads):
 * the roof as built with the west screen, the same roof without the screen,
 * and a roof bigger by 1 m on every side without the screen. For each, at
 * 14-17 h: the mean share of the direct sun on the heads and the share of
 * heads in more than half sun, and Tmrt (point model).
 */
export function screenCompare(world, base, hours = [14, 15, 16, 17]) {
  const sc = world.scene;
  const C = sc.stops.find((s) => s.id === 'C');
  const r = C.roof;
  const e = BS.biggerRoof.value;
  const west = C.panels.filter((P) => P.west);
  const keep = C.panels.filter((P) => !P.west).map((P) => ({ ...P, stop: 'C', tr: MATERIALS[P.kind].tr.value }));
  const roof = (o) => ({ id: 'roofC', ...r, ...o, tr: MATERIALS[r.kind].tr.value });
  const variants = {
    built: { stop: 'C', roofs: [roof({})], panels: [...keep, ...west.map((P) => ({ ...P, stop: 'C', tr: MATERIALS[P.kind].tr.value }))] },
    noScreen: { stop: 'C', roofs: [roof({})], panels: keep },
    bigRoof: { stop: 'C', roofs: [roof({ x0: r.x0 - e, y0: r.y0 - e, x1: r.x1 + e, y1: r.y1 + e })], panels: keep },
  };
  const seats = C.slots.filter((s) => s[2]).map(([x, y]) => ({ x, y, z: 0, mat: 'concrete', head: BS.headSeat.value }));
  const out = {};
  for (const [k, V] of Object.entries(variants)) {
    const P = pointModel(world, geometry(world, V), seats, { suns: base.slots.suns });
    out[k] = Object.fromEntries(hours.map((h) => [h, {
      head: mean(seats.map((_, i) => P.head(i, h))),
      lit: mean(seats.map((_, i) => (P.head(i, h) >= 0.5 ? 1 : 0))),
      tmrt: mean(seats.map((_, i) => P.tmrt(i, h))),
    }]));
  }
  return { hours, seats, variants: out, screen: west[0], roof: r, bigger: e };
}

/**
 * The same shelter as stop A with another roof (band 2): Tmrt at its centre
 * (standing) and at its open reference, for roof kinds; benefit = Tmrt(open) -
 * Tmrt(centre) at hour h.
 */
export function roofSwap(world, base, kinds, h = 15) {
  const A = world.scene.stops.find((s) => s.id === 'A');
  const pts = [{ x: (A.roof.x0 + A.roof.x1) / 2, y: (A.roof.y0 + A.roof.y1) / 2, z: 0, mat: 'concrete', head: BS.headStand.value }, { x: A.open[0], y: A.open[1], z: 0, mat: 'concrete', head: BS.headStand.value }];
  const panels = A.panels.map((P) => ({ ...P, stop: 'A', tr: MATERIALS[P.kind].tr.value }));
  return Object.fromEntries(kinds.map((kind) => {
    const tr = typeof kind === 'number' ? kind : MATERIALS[kind].tr.value;
    const P = pointModel(world, geometry(world, { stop: 'A', roofs: [{ id: 'roofA', ...A.roof, tr }], panels }), pts, { suns: base.slots.suns });
    return [kind, { centre: P.tmrt(0, h), open: P.tmrt(1, h), benefit: P.tmrt(1, h) - P.tmrt(0, h), ts: P.ts(0, h), tsOpen: P.ts(1, h), head: P.head(0, h) }];
  }));
}

/**
 * The block's numbers from the models (cards, notes, docs, bands): per stop
 * at 15:00 the centre and open Tmrt, the ground under the centre and in the
 * open, the bench, the waiting statistics of riders arriving 15:00-16:00;
 * the footbridge decks (Tmrt at 15:00, deck and rail temperatures, peaks).
 */
export function busStats(world, setup, book) {
  const { P } = setup;
  const pts = world.bus.pts;
  const at = (test) => ptIndex(pts, test);
  const H = [12, 14, 15, 16, 17];
  const stops = world.scene.stops.map((s, si) => {
    const c = at((p) => p.kind === 'centre' && p.stop === s.id);
    const o = at((p) => p.kind === 'open' && p.stop === s.id);
    const bn = at((p) => p.kind === 'bench' && p.stop === s.id);
    const seat = at((p) => p.kind === 'slot' && p.stop === s.id && p.seated);
    const row = (i) => (i < 0 ? null : Object.fromEntries(H.map((h) => [h, { tmrt: pts[i].head ? P.tmrt(i, h) : null, ts: P.ts(i, h), head: pts[i].head ? P.head(i, h) : null, body: pts[i].head ? P.body(i, h) : null }])));
    return { id: s.id, name: s.name, centre: row(c), open: row(o), bench: row(bn), seat: row(seat), benchMat: pts[bn].mat, benchPeak: Math.max(...[...Array(96).keys()].map((k) => P.ts(bn, k / 4))), wait15: book.stats(si, 15, 16), wait12: book.stats(si, 12, 13), svf: { centre: c < 0 ? null : P.sky[c].svf, open: P.sky[o].svf } };
  });
  const bridges = world.scene.bridges.map((b) => {
    const decks = pts.filter((p) => p.kind === 'deck' && p.bridge === b.id).map((p) => p.k);
    const mid = decks[Math.floor(decks.length / 2)];
    const rail = at((p) => p.kind === 'rail' && p.bridge === b.id);
    return {
      id: b.id,
      cover: b.cover,
      tmrt: Object.fromEntries(H.map((h) => [h, mean(decks.map((i) => P.tmrt(i, h)))])),
      tmrtMid: Object.fromEntries(H.map((h) => [h, P.tmrt(mid, h)])),
      deck: Object.fromEntries(H.map((h) => [h, mean(decks.map((i) => P.ts(i, h)))])),
      deckPeak: Math.max(...[...Array(96).keys()].map((k) => mean(decks.map((i) => P.ts(i, k / 4))))),
      rail: Object.fromEntries(H.map((h) => [h, P.ts(rail, h)])),
      railPeak: Math.max(...[...Array(96).keys()].map((k) => P.ts(rail, k / 4))),
      n: decks.length,
    };
  });
  return { stops, bridges, air: Object.fromEntries(H.map((h) => [h, P.air(h)])) };
}

/**
 * Which kerb (the brief: on a north-south street the west-kerb stop's back
 * blocks the afternoon sun, the east-kerb stop's open front takes it): stop
 * B's shelter with an opaque roof as built on the west kerb (back panel to
 * the west), and mirrored across the avenue onto the east kerb (open front
 * to the west). Mean Tmrt of its bench (seated) and its places under the
 * roof (standing), point model, at the hours given.
 */
export function kerbCompare(world, base, hours = [12, 14, 15, 16, 17]) {
  const B = world.scene.stops.find((s) => s.id === 'B');
  const r = B.roof;
  const tr = MATERIALS.roofMetal.tr.value;
  const mx = (x) => 2 * 200 - x; // the avenue's centre line, x = 200
  const panel = (P, m) => ({ ...P, x0: m ? mx(P.x1) : P.x0, x1: m ? mx(P.x0) : P.x1, stop: 'B', tr: MATERIALS[P.kind].tr.value });
  const out = {};
  for (const [k, m] of [['west', false], ['east', true]]) {
    const V = { stop: 'B', roofs: [{ id: 'roofB', ...r, x0: m ? mx(r.x1) : r.x0, x1: m ? mx(r.x0) : r.x1, tr }], panels: B.panels.map((P) => panel(P, m)) };
    const pts = B.slots.filter(([x]) => x >= r.x0 && x <= r.x1).map(([x, y, seated]) => ({ x: m ? mx(x) : x, y, z: 0, mat: 'concrete', head: seated ? BS.headSeat.value : BS.headStand.value, seated: !!seated }));
    const o = pts.length; // an open reference, standing, 6 m north of the shelter on its line (clear of its shadow)
    const xo = (r.x0 + r.x1) / 2;
    pts.push({ x: m ? mx(xo) : xo, y: r.y0 - 6, z: 0, mat: 'concrete', head: BS.headStand.value, seated: null });
    const P = pointModel(world, geometry(world, V), pts, { suns: base.slots.suns });
    const avg = (h, s) => mean(pts.map((p, i) => [p, i]).filter(([p]) => p.seated === s).map(([, i]) => P.tmrt(i, h)));
    out[k] = Object.fromEntries(hours.map((h) => [h, { seated: avg(h, true), standing: avg(h, false), open: P.tmrt(o, h), lit: mean(pts.slice(0, o).map((_, i) => (P.head(i, h) >= 0.5 ? 1 : 0))) }]));
  }
  return { hours, ...out };
}
