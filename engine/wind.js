// wind: block 4 (waterfront) per-cell wind factor, wind lines, the water's
// illustrative air overlay and a simple comfort index for the walkers.
//
// Wind factor (research brief docs/research/waterfront-brief.md):
//   f_w(i) = clamp(S(i) C(i), f_min, f_max)
//   S(i) = min over upwind obstacles b within 5 H_b of f_min + (1 - f_min) d_b / (5 H_b)
//          (1 if none), d_b the distance from the cell upwind to b's footprint
//   C(i) = 1 + c_ch max(0, cos 3 delta) in a street (carriageway and pavements,
//          wall to wall) whose axis is within 30 deg of the wind and whose
//          H/W > 0.4, else 1
// The local wind u_i = u_site f_w sets h_c = 5.7 + 3.8 u_i (thermal.js) and the
// wind a walker feels. Roofs keep f_w = 1. Blocks without a declared wind
// direction have no f_w at all (thermal.js keeps its scalar h_c).
//
// This is a geometric heuristic, not a flow solution: no vortices, corner
// jets, downdraughts, sea or river breezes, and one wind direction and speed.
import { MODEL } from './materials.js';
import { hash3, clamp, DEG } from './core.js';
import { isWater, cellMat, WATER_KIND } from './thermal.js';

export const F_MIN = MODEL.windFmin.value;
export const F_MAX = MODEL.windFmax.value;
export const C_CH = MODEL.channelC.value;
export const REACH = 5; // shelter reach, building heights
export const ALIGN = 30; // deg, channelling cut-off
export const HW_MIN = MODEL.channelHw.value;
export const STEP = 2.5; // wind-line step, m
export const SEED_GAP = 20; // m between wind-line seeds (across the wind)
export const MARGIN = 1.5; // m kept between a wind line and a wall
export const JOIN = 1.5; // m: grid on which a line that meets an earlier line is ended
export const SPEEDS = [1, 3]; // calm / breezy presets, m/s
export const DASH_PER_U = 4; // dash period (m) per m/s of local wind
export const DRAW_SPEED = 4; // dashes move at DRAW_SPEED x u_i (drawn faster than life)
export const FACE = 15; // m: a wall faces a street if it stands within this distance of the kerb

/** True if a scene declares a wind direction (block 4). */
export const isWindBlock = (scene) => !!(scene.windBlock && scene.wind);

/** Unit vector the wind blows toward (x east, y south) for a direction it blows from (deg, clockwise from north). */
export function windVector(fromDeg) {
  const a = (fromDeg + 180) * DEG;
  const x = Math.sin(a);
  const y = -Math.cos(a);
  return [Math.abs(x) < 1e-12 ? 0 : x, Math.abs(y) < 1e-12 ? 0 : y];
}

/** Distance along a ray from (x, y) in direction (dx, dy) to box B {x0, y0, x1, y1}, or Infinity (0 if inside). */
export function rayBox(B, x, y, dx, dy) {
  let t0 = 0;
  let t1 = Infinity;
  for (const [p, d, lo, hi] of [[x, dx, B.x0, B.x1], [y, dy, B.y0, B.y1]]) {
    if (Math.abs(d) < 1e-12) {
      if (p < lo || p > hi) return Infinity;
    } else {
      let a = (lo - p) / d;
      let b = (hi - p) / d;
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, b);
      if (t0 > t1) return Infinity;
    }
  }
  return t0;
}

/** Shelter factor S at a ground point for wind toward w: min over upwind buildings within 5 H. */
export function shelterAt(buildings, x, y, w) {
  let S = 1;
  for (const B of buildings) {
    const d = rayBox(B, x, y, -w[0], -w[1]);
    const reach = REACH * B.h;
    if (d < reach) S = Math.min(S, F_MIN + ((1 - F_MIN) * d) / reach);
  }
  return S;
}

/** Channelling factor C for a street of axis angle delta (deg from the wind) and aspect ratio hw. */
export function channelFactor(deltaDeg, hw) {
  if (!(deltaDeg <= ALIGN) || !(hw > HW_MIN)) return 1;
  return 1 + C_CH * Math.max(0, Math.cos(3 * deltaDeg * DEG));
}

/** Bounding box of a flat polygon. */
const bbox = (p) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < p.length; i += 2) {
    x0 = Math.min(x0, p[i]);
    x1 = Math.max(x1, p[i]);
    y0 = Math.min(y0, p[i + 1]);
    y1 = Math.max(y1, p[i + 1]);
  }
  return [x0, y0, x1, y1];
};

/**
 * Street geometry for the channelling term: for every street parcel (ns / ew)
 * the mean height H of the buildings facing it and the mean wall-to-wall
 * width W, sampled every 5 m along the street where buildings face it on both
 * sides (a wall faces the street if it stands within FACE m of the kerb); delta is the angle between the street axis and the wind (0-90 deg).
 */
export function streetInfo(scene, buildings, w) {
  const out = [];
  scene.ground.forEach((g, k) => {
    if (g.street !== 'ns' && g.street !== 'ew') return;
    const [x0, y0, x1, y1] = bbox(g.poly);
    const ns = g.street === 'ns';
    const axis = ns ? [0, 1] : [1, 0];
    const delta = Math.acos(Math.min(1, Math.abs(axis[0] * w[0] + axis[1] * w[1]))) / DEG;
    const hs = [];
    const ws = [];
    const a0 = ns ? y0 : x0;
    const a1 = ns ? y1 : x1;
    for (let s = a0 + 2.5; s < a1; s += 5) {
      let lo = null;
      let hi = null;
      for (const B of buildings) {
        const [b0, b1, c0, c1] = ns ? [B.y0, B.y1, B.x0, B.x1] : [B.x0, B.x1, B.y0, B.y1];
        if (s < b0 || s >= b1) continue;
        const e0 = ns ? x0 : y0;
        const e1 = ns ? x1 : y1;
        // only walls that face the street across its pavement (within FACE m of the kerb)
        if (c1 <= e0 + 1e-6 && c1 >= e0 - FACE && (!lo || c1 > lo.edge)) lo = { edge: c1, h: B.h };
        if (c0 >= e1 - 1e-6 && c0 <= e1 + FACE && (!hi || c0 < hi.edge)) hi = { edge: c0, h: B.h };
      }
      if (lo && hi) {
        hs.push((lo.h + hi.h) / 2);
        ws.push(hi.edge - lo.edge);
      }
    }
    const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    const H = mean(hs);
    const W = mean(ws);
    const hw = W > 0 ? H / W : 0;
    // the canyon: the street plus its pavements, out to the facing walls
    const pave = W > 0 ? Math.max(0, (W - (ns ? x1 - x0 : y1 - y0)) / 2) : 0;
    const canyon = ns ? [x0 - pave, y0, x1 + pave, y1] : [x0, y0 - pave, x1, y1 + pave];
    out.push({ k, id: g.id, name: g.name, axis: g.street, box: [x0, y0, x1, y1], canyon, delta, h: H, w: W, hw, samples: hs.length, C: channelFactor(delta, hw) });
  });
  return out;
}

/**
 * Per-cell wind factor for a world whose scene declares a wind direction.
 * Returns {w, fw, S, C, streets, aligned (1 in streets with C > 1)}.
 */
export function windField(world, fromDeg = world.scene.wind.from) {
  const w = windVector(fromDeg);
  const { n, cell } = world;
  const N = n * n;
  const fw = new Float32Array(N);
  const S = new Float32Array(N);
  const C = new Float32Array(N).fill(1);
  const aligned = new Uint8Array(N);
  const streets = streetInfo(world.scene, world.buildings, w);
  const byParcel = new Map(streets.map((s) => [s.k, s]));
  /** Street whose canyon (street and pavements, wall to wall) holds a ground cell: its own parcel first. */
  const streetOf = (i, x, y) => {
    if (byParcel.has(world.parcel[i])) return byParcel.get(world.parcel[i]);
    if (isWater(cellMat(world, i))) return null;
    let best = null;
    for (const st of streets) {
      const [a0, b0, a1, b1] = st.canyon;
      if (x > a0 && x < a1 && y > b0 && y < b1 && (!best || st.C > best.C)) best = st;
    }
    return best;
  };
  for (let i = 0; i < N; i++) {
    if (world.bld[i] >= 0) {
      fw[i] = 1; // roofs: above the street-level shelter (engine assumption)
      S[i] = 1;
      continue;
    }
    const x = ((i % n) + 0.5) * cell;
    const y = (Math.floor(i / n) + 0.5) * cell;
    S[i] = shelterAt(world.buildings, x, y, w);
    const st = streetOf(i, x, y);
    if (st) {
      C[i] = st.C;
      if (st.C > 1) aligned[i] = 1;
    }
    fw[i] = clamp(S[i] * C[i], F_MIN, F_MAX);
  }
  return { from: fromDeg, w, fw, S, C, streets, aligned };
}

// ---- wind lines -------------------------------------------------------------------

/** Boxes of the buildings grown by the wall margin. */
const grown = (buildings, m) => buildings.map((B) => ({ x0: B.x0 - m, y0: B.y0 - m, x1: B.x1 + m, y1: B.y1 + m, cx: (B.x0 + B.x1) / 2, cy: (B.y0 + B.y1) / 2 }));
const inside = (G, x, y) => x > G.x0 && x < G.x1 && y > G.y0 && y < G.y1;

/**
 * Direction at p: the wind, or, where one step along the wind would enter a
 * (grown) building, the wall's tangent. The side is the one the wind leans
 * toward; head-on, the side of the wall's centre the point is on (the sign of
 * the cross product (p - c) x w).
 */
function dirAt(boxes, w, x, y) {
  for (const G of boxes) {
    const ax = x + w[0] * STEP;
    const ay = y + w[1] * STEP;
    if (!inside(G, ax, ay) && !inside(G, x, y)) continue;
    // nearest face the wind blows into
    let best = null;
    for (const [nx, ny, dist] of [[-1, 0, Math.abs(x - G.x0)], [1, 0, Math.abs(x - G.x1)], [0, -1, Math.abs(y - G.y0)], [0, 1, Math.abs(y - G.y1)]]) {
      if (nx * w[0] + ny * w[1] >= 0) continue;
      if (!best || dist < best[2]) best = [nx, ny, dist];
    }
    if (!best) continue;
    const t = [-best[1], best[0]];
    const tw = t[0] * w[0] + t[1] * w[1];
    // head-on: slide away from the wall's centre, i.e. to the side given by
    // the sign of the cross product (p - c) x w
    const s = Math.abs(tw) > 1e-9 ? Math.sign(tw) : Math.sign((x - G.cx) * t[0] + (y - G.cy) * t[1]) || 1;
    return [t[0] * s, t[1] * s];
  }
  return w;
}

/** Push a point out of any grown box it ended up in (onto the nearest face). */
function pushOut(boxes, p) {
  for (const G of boxes) {
    if (!inside(G, p[0], p[1])) continue;
    const d = [[p[0] - G.x0, 0], [G.x1 - p[0], 1], [p[1] - G.y0, 2], [G.y1 - p[1], 3]].sort((a, b) => a[0] - b[0])[0][1];
    if (d === 0) p[0] = G.x0;
    else if (d === 1) p[0] = G.x1;
    else if (d === 2) p[1] = G.y0;
    else p[1] = G.y1;
  }
  return p;
}

/** Seed points on the upwind edge of the block: every 20 m across the wind, with seeded jitter. */
export function seeds(size, w, seed) {
  const nrm = [-w[1], w[0]];
  const cs = [[0, 0], [size, 0], [size, size], [0, size]].map(([x, y]) => x * nrm[0] + y * nrm[1]);
  const c0 = Math.min(...cs);
  const c1 = Math.max(...cs);
  const out = [];
  const box = { x0: 0, y0: 0, x1: size, y1: size };
  let k = 0;
  for (let c = c0 + SEED_GAP / 2; c < c1; c += SEED_GAP, k++) {
    const cj = c + (hash3(k, seed, 81) - 0.5) * 0.3 * SEED_GAP;
    const cc = (size / 2) * (nrm[0] + nrm[1]); // cross-wind coordinate of the centre
    const ox = size / 2 + (cj - cc) * nrm[0] - w[0] * 2 * size;
    const oy = size / 2 + (cj - cc) * nrm[1] - w[1] * 2 * size;
    const t = rayBox(box, ox, oy, w[0], w[1]);
    if (!Number.isFinite(t)) continue;
    out.push([ox + w[0] * (t + 0.01), oy + w[1] * (t + 0.01), k]);
  }
  return out;
}

/**
 * Trace one wind line from p0: RK2 steps of 2.5 m along dirAt (wind, or
 * sliding along walls), stopping at the block edge. Vertices never fall
 * inside a building (they are pushed out to the 1.5 m margin).
 */
export function traceLine(world, boxes, w, p0, maxSteps = 600) {
  const size = world.size;
  const pts = [p0[0], p0[1]];
  let x = p0[0];
  let y = p0[1];
  for (let s = 0; s < maxSteps; s++) {
    const d1 = dirAt(boxes, w, x, y);
    const mx = x + 0.5 * STEP * d1[0];
    const my = y + 0.5 * STEP * d1[1];
    const d2 = dirAt(boxes, w, mx, my);
    const q = pushOut(boxes, [x + STEP * d2[0], y + STEP * d2[1]]);
    if (Math.hypot(q[0] - x, q[1] - y) < 0.05) break; // stuck in a corner
    x = q[0];
    y = q[1];
    if (x < 0 || y < 0 || x > size || y > size) {
      pts.push(clamp(x, 0, size), clamp(y, 0, size));
      break;
    }
    pts.push(x, y);
  }
  return Float64Array.from(pts);
}

/**
 * Air overlay along a line (information only, not simulated): distance x
 * travelled since leaving water, as lambda = integral of ds / L(s) with L the
 * decay length (longer in streets aligned with the wind), and the last water
 * kind left. Day: dTa = -dT0 exp(-lambda); night: +dTn exp(-lambda); the pond
 * uses the river's numbers x (dT0_pond / dT0_river).
 */
export const OVERLAY = {
  day: MODEL.airDay.value,
  night: MODEL.airNight.value,
  L: MODEL.airL.value,
  Laligned: MODEL.airLaligned.value,
  pond: MODEL.airPond.value / MODEL.airDay.value,
};

/** Overlay strength at a vertex: dTa (K) for a day weight wd in [0, 1] (1 = full day, 0 = night). */
export const overlayDT = (lambda, kind, wd) => (kind ? Math.exp(-lambda) * (kind === 3 ? OVERLAY.pond : 1) * (-OVERLAY.day * wd + OVERLAY.night * (1 - wd)) : 0);

/** Day weight from the sun altitude: 1 above 10 deg, 0 below 0 deg, linear between. */
export const dayWeight = (altDeg) => clamp(altDeg / 10, 0, 1);

/**
 * All wind lines of a world with a wind field: vertices, local f_w, distance
 * since water (m), lambda and the water kind left (wet: the vertex is over
 * the river or the pond itself), the dash phase coordinate
 * phi = integral of ds / (DASH_PER_U u_i) per unit of u_site (multiply by
 * 1 / u_site), and whether each vertex is hidden behind a building (isometric
 * view from the south-east).
 */
export function windLines(world, wf) {
  const boxes = grown(world.buildings, MARGIN);
  const fine = world.fine;
  const kindAt = (x, y) => {
    const i = clamp(Math.floor(x / fine.cell), 0, fine.n - 1);
    const j = clamp(Math.floor(y / fine.cell), 0, fine.n - 1);
    return WATER_KIND[world.matIds[fine.mat[j * fine.n + i]]] ?? 0;
  };
  const lines = [];
  // a line ends where it runs into an earlier one (e.g. two lines sliding
  // round the same corner), so paths are never drawn twice
  const taken = new Set();
  const key = (x, y) => `${Math.floor(x / JOIN)},${Math.floor(y / JOIN)}`;
  for (const [sx, sy, k] of seeds(world.size, wf.w, world.scene.seed)) {
    let p = traceLine(world, boxes, wf.w, [sx, sy]);
    let m = p.length / 2;
    for (let v = 1; v < m; v++) {
      const gx = Math.floor(p[v * 2] / JOIN);
      const gy = Math.floor(p[v * 2 + 1] / JOIN);
      let hit = false;
      for (let dx = -1; dx <= 1 && !hit; dx++) for (let dy = -1; dy <= 1 && !hit; dy++) hit = taken.has(`${gx + dx},${gy + dy}`);
      if (hit) {
        m = v + 1;
        p = p.slice(0, m * 2);
        break;
      }
    }
    for (let v = 0; v < m; v++) taken.add(key(p[v * 2], p[v * 2 + 1]));
    const fw = new Float32Array(m);
    const dist = new Float32Array(m);
    const lam = new Float32Array(m);
    const kind = new Uint8Array(m);
    const phi = new Float32Array(m);
    const hid = new Uint8Array(m);
    const wet = new Uint8Array(m);
    let last = 0;
    let d = Infinity;
    let l = Infinity;
    for (let v = 0; v < m; v++) {
      const x = p[v * 2];
      const y = p[v * 2 + 1];
      const c = world.cellIndex(x, y);
      fw[v] = wf.fw[c];
      const ds = v ? Math.hypot(x - p[v * 2 - 2], y - p[v * 2 - 1]) : 0;
      const wk = kindAt(x, y);
      if (wk > 1) {
        wet[v] = 1;
        last = wk;
        d = 0;
        l = 0;
      } else if (last) {
        d += ds;
        l += ds / (wf.aligned[c] ? OVERLAY.Laligned : OVERLAY.L);
      }
      dist[v] = d;
      lam[v] = l;
      kind[v] = last;
      phi[v] = v ? phi[v - 1] + ds / (DASH_PER_U * 0.5 * (fw[v] + fw[v - 1])) : 0;
      hid[v] = hiddenAt(world.buildings, x, y, 0.3) ? 1 : 0;
    }
    lines.push({ k, p, fw, dist, lam, kind, phi, hid, wet });
  }
  return lines;
}

/** True if a ground-level point at height z is hidden behind a building (view from the south-east). */
export function hiddenAt(buildings, x, y, z = 0) {
  for (const B of buildings) {
    const dIn = Math.max(B.x0 - x, B.y0 - y, 0);
    const dOut = Math.min(B.x1 - x, B.y1 - y);
    if (dOut <= dIn) continue;
    if (B.h > z + dIn / 0.95) return true;
  }
  return false;
}

/** FNV-1a hash (hex) over the line vertices as float32, for the determinism checks. */
export function linesHash(lines) {
  let h = 0x811c9dc5;
  for (const L of lines) {
    const u = new Uint32Array(Float32Array.from(L.p).buffer);
    for (let i = 0; i < u.length; i++) {
      h ^= u[i];
      h = Math.imul(h, 0x01000193);
    }
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Pen-drawn geometry for the lines: each line projected once (z = 0.3 m) with
 * a slow seeded wobble along it, through the pen recorder (pen.stream), so
 * the drawing is the same on every load.
 */
export function penLines(pen, lines) {
  return lines.map((L) => pen.stream(L.p, { z: 0.3, amp: 0.35, k: L.k }));
}

// ---- comfort (walkers) -------------------------------------------------------

/**
 * Apparent temperature with radiation (Steadman 1994; coefficients checked
 * against the Australian Bureau of Meteorology's thermal-stress page): AT = Ta + 0.348 e - 0.70 ws + 0.70 Q /
 * (ws + 10) - 4.25, with e the vapour pressure (hPa), ws the 10 m wind (m/s,
 * here u_10 f_w clamped to 0.5-17 m/s) and Q the extra radiation a person
 * absorbs, linearised as 6.1 W m-2 K-1 x (Tmrt - Ta). A simpler stand-in for
 * UTCI (not implemented).
 */
export function apparentTemp(ta, eHpa, ws, tmrt) {
  const v = clamp(ws, 0.5, 17);
  const Q = 6.1 * (tmrt - ta);
  return ta + 0.348 * eHpa - 0.7 * v + (0.7 * Q) / (v + 10) - 4.25;
}

/** Ground cell index of a material id test (water excluded) - helper for stats. */
export const groundCells = (world, test) => {
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && !isWater(cellMat(world, i)) && test(i)) out.push(i);
  return out;
};
