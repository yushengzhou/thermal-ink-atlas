// reflect: glass optics and the specular single bounce of the direct beam off
// vertical glass façades (block 3).
//
// Fresnel reflectance of uncoated float glass (n = 1.52, two surfaces,
// non-absorbing, multiple reflections between the surfaces): each
// polarisation reflects r at one surface and 2r / (1 + r) for the pane;
// unpolarised sunlight takes the mean. That gives 0.082 at normal incidence and
// 0.41 at 75° (research brief). A product with normal-incidence reflectance
// rho0 keeps the Fresnel angular shape, scaled so that rho(0) = rho0 and
// rho(90°) = 1:
//   rho(theta) = rho0 + (1 - rho0) g(theta),  g = (R(theta) - R(0)) / (1 - R(0)).
//
// Specular bounce (brief): the mirrored sun vector s' = s - 2 (s.n) n has the
// sun's altitude and a mirrored azimuth. A ground point p is lit by façade f if
// the ray from p along s' first hits f's glass at a point that is itself in
// sun. It then receives rho(theta) I sin(beta) on the ground, and a person
// there an extra beam rho(theta) I from the mirrored direction. Second bounces
// (rho^2) are ignored. Every façade here is flat and vertical, so nothing is
// focused: no point can receive more than the sum of rho I sin(beta) over the
// façades that face it.
//
// Fields are stored as two numbers per cell so the glass type can be changed
// without redoing the geometry: A = sum of hit fractions, B = sum of hit
// fraction x g(theta). For a glass with rho0 the reflected fraction of the
// beam on the ground is r = rho0 A + (1 - rho0) B.
import { DEG } from './core.js';
import { sunVector, rasterise } from './sun.js';
import { MODEL } from './materials.js';

export const N_GLASS = 1.52;

/** Fresnel reflectance of a clear float-glass pane (two surfaces) at incidence theta (deg). */
export function fresnelPane(thetaDeg, n = N_GLASS) {
  if (thetaDeg >= 90) return 1;
  const ci = Math.cos(thetaDeg * DEG);
  const si = Math.sin(thetaDeg * DEG);
  const ct = Math.sqrt(1 - (si / n) ** 2);
  const rs = ((ci - n * ct) / (ci + n * ct)) ** 2;
  const rp = ((n * ci - ct) / (n * ci + ct)) ** 2;
  const pane = (r) => (2 * r) / (1 + r);
  return (pane(rs) + pane(rp)) / 2;
}

const R0 = fresnelPane(0);
/** Normalised Fresnel shape: 0 at normal incidence, 1 at grazing. */
export const fresnelShape = (thetaDeg) => (fresnelPane(thetaDeg) - R0) / (1 - R0);
/** Reflectance of a glass with normal-incidence reflectance rho0 at incidence theta (deg). */
export const glassRho = (rho0, thetaDeg) => rho0 + (1 - rho0) * fresnelShape(thetaDeg);

/** Outward normals of the four façades of a box (x east, y south). */
export const FACE_N = { S: [0, 1], N: [0, -1], E: [1, 0], W: [-1, 0] };
export const FACES = ['S', 'N', 'E', 'W'];

/** Glass façades of a world: {b, face, n, c0 (plane offset along n), u: [lo, hi] along the face, z: [lo, hi]}. */
export function glassFacades(world) {
  const out = [];
  for (const B of world.buildings) {
    if (!B.glass) continue;
    const faces = B.glass === true ? FACES : B.glass;
    for (const face of faces) {
      const n = FACE_N[face];
      const c0 = face === 'S' ? B.y1 : face === 'N' ? -B.y0 : face === 'E' ? B.x1 : -B.x0;
      const u = face === 'S' || face === 'N' ? [B.x0, B.x1] : [B.y0, B.y1];
      out.push({ b: B.index, face, n, c0, u, z: [B.glassFrom ?? 0, B.h] });
    }
  }
  return out;
}

/** Ray o + t d against an axis-aligned box: entry t in (tmin, tmax), or Infinity. */
function rayBox(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1, tmin, tmax) {
  let lo = tmin;
  let hi = tmax;
  if (Math.abs(dx) < 1e-12) {
    if (ox < x0 || ox > x1) return Infinity;
  } else {
    let a = (x0 - ox) / dx;
    let b = (x1 - ox) / dx;
    if (a > b) [a, b] = [b, a];
    if (a > lo) lo = a;
    if (b < hi) hi = b;
    if (lo > hi) return Infinity;
  }
  if (Math.abs(dy) < 1e-12) {
    if (oy < y0 || oy > y1) return Infinity;
  } else {
    let a = (y0 - oy) / dy;
    let b = (y1 - oy) / dy;
    if (a > b) [a, b] = [b, a];
    if (a > lo) lo = a;
    if (b < hi) hi = b;
    if (lo > hi) return Infinity;
  }
  if (Math.abs(dz) < 1e-12) {
    if (oz < z0 || oz > z1) return Infinity;
  } else {
    let a = (z0 - oz) / dz;
    let b = (z1 - oz) / dz;
    if (a > b) [a, b] = [b, a];
    if (a > lo) lo = a;
    if (b < hi) hi = b;
    if (lo > hi) return Infinity;
  }
  return lo;
}

/** Transmission of a ray segment through tree crowns (spheres), at most three deep. */
function crownTransmission(trees, ox, oy, oz, dx, dy, dz, tmax) {
  let tr = 1;
  let deep = 0;
  for (const T of trees) {
    const cx = T.x - ox;
    const cy = T.y - oy;
    const cz = T.zc - oz;
    const t = cx * dx + cy * dy + cz * dz;
    if (t < 0 || t > tmax + T.r) continue;
    const d2 = cx * cx + cy * cy + cz * cz - t * t;
    if (d2 < T.r * T.r && deep < 3) {
      tr *= T.tr ?? MODEL.canopyTransmission.value;
      deep++;
    }
  }
  return tr;
}

/**
 * Specular reflection field for one sun position.
 * grid: {n, cell, S} (S x S samples per cell); ground(i): true for cells that
 * can receive reflections (ground cells; roofs are not included).
 * Returns {A, B} (Float32Array n*n, see the header) or null if the sun is down
 * or no glass faces it. With opts.facades a subset of façades is used; with
 * opts.trace every lit sample is reported to trace(i, x, y, facade, rhoShape).
 */
export function reflectField(world, sun, grid, ground, opts = {}) {
  if (sun.alt <= 0.5) return null;
  const facades = opts.facades ?? world.glassFacades ?? glassFacades(world);
  if (!facades.length) return null;
  const { n, cell } = grid;
  const S = grid.S ?? 2;
  const sv = sunVector(sun.alt, sun.az);
  const tanb = Math.tan(sun.alt * DEG);
  let A = null;
  let Bf = null;
  const w = 1 / (S * S);
  for (const f of facades) {
    const [nx, ny] = f.n;
    const cosT = sv[0] * nx + sv[1] * ny; // cos(theta) = cos(beta) cos(delta az)
    if (cosT <= 1e-4) continue;
    const theta = Math.acos(Math.min(1, cosT)) / DEG;
    const g = fresnelShape(theta);
    // mirrored sun vector (same altitude)
    const rx = sv[0] - 2 * cosT * nx;
    const ry = sv[1] - 2 * cosT * ny;
    const rz = sv[2];
    // façade corners -> ground along -s' (the reflected beam's travel)
    const along = f.face === 'S' || f.face === 'N';
    const corner = (u, z) => {
      const px = along ? u : f.face === 'E' ? f.c0 : -f.c0;
      const py = along ? (f.face === 'S' ? f.c0 : -f.c0) : u;
      return [px - (z / rz) * rx, py - (z / rz) * ry];
    };
    const pts = [];
    for (const u of f.u) for (const z of f.z) pts.push(...corner(u, z));
    // blockers: other buildings, clipped to the half-space in front of the
    // façade (both the sun ray to the glass and the reflected ray from it lie there)
    const blk = [];
    for (const B of world.buildings) {
      if (B.index === f.b) continue;
      let { x0, y0, x1, y1 } = B;
      if (f.face === 'S') y0 = Math.max(y0, f.c0);
      else if (f.face === 'N') y1 = Math.min(y1, -f.c0);
      else if (f.face === 'E') x0 = Math.max(x0, f.c0);
      else x1 = Math.min(x1, -f.c0);
      if (x1 > x0 && y1 > y0) blk.push([x0, y0, 0, x1, y1, B.h]);
    }
    const front = (x, y) => x * nx + y * ny > f.c0;
    const trees = world.trees.filter((T) => front(T.x, T.y));
    // Coverage across the façade normal is clipped analytically: the
    // reflected strip covers plane distances [z0 q, z1 q] in front of the
    // façade (q = -(s'.n) / s'_z); a sample stands for a square of side a, so
    // it is lit over the overlap of its extent [d - a/2, d + a/2] with the
    // strip, and the ray tests are made at the middle of that overlap. A strip
    // thinner than a sample (grazing incidence) is then counted with its true
    // area instead of whole samples. The polygon is widened by a/2 along the
    // normal so samples whose centre lies just outside the strip are visited.
    const a = cell / S;
    const sn = rx * nx + ry * ny; // < 0
    const q = -sn / rz;
    const d0 = f.z[0] * q;
    const d1 = f.z[1] * q;
    const wide = [];
    for (let k = 0; k < pts.length; k += 2) wide.push(pts[k] + (nx * a) / 2, pts[k + 1] + (ny * a) / 2, pts[k] - (nx * a) / 2, pts[k + 1] - (ny * a) / 2);
    const polys = [hullFlat(wide)];
    rasterise(polys, { nx: n, ny: n, cell }, (i, p, s) => {
      if (!ground(i)) return;
      const xc = ((i % n) + ((s % S) + 0.5) / S) * cell;
      const yc = (Math.floor(i / n) + (Math.floor(s / S) + 0.5) / S) * cell;
      const dc = xc * nx + yc * ny - f.c0; // distance in front of the façade
      const lo = Math.max(dc - a / 2, d0);
      const hi = Math.min(dc + a / 2, d1);
      if (!(hi > lo)) return;
      const cover = (hi - lo) / a;
      const shift = (lo + hi) / 2 - dc;
      const x = xc + shift * nx;
      const y = yc + shift * ny;
      // distance along s' to the façade plane
      const t = (f.c0 - (x * nx + y * ny)) / sn;
      if (!(t > 0)) return;
      const hx = x + t * rx;
      const hy = y + t * ry;
      const hz = t * rz;
      const hu = along ? hx : hy;
      if (hu < f.u[0] || hu > f.u[1]) return;
      // reflected path p -> glass, then glass -> sun
      for (const b of blk) if (rayBox(x, y, 0, rx, ry, rz, b[0], b[1], b[2], b[3], b[4], b[5], 1e-6, t - 1e-6) < Infinity) return;
      for (const b of blk) if (rayBox(hx, hy, hz, sv[0], sv[1], sv[2], b[0], b[1], b[2], b[3], b[4], b[5], 1e-6, 1e5) < Infinity) return;
      const tr = trees.length ? crownTransmission(trees, x, y, 0, rx, ry, rz, t) : 1;
      if (!A) {
        A = new Float32Array(n * n);
        Bf = new Float32Array(n * n);
      }
      A[i] += w * tr * cover;
      Bf[i] += w * tr * cover * g;
      if (opts.trace) opts.trace(i, x, y, f, g, tr, cover);
    }, S);
  }
  return A ? { A, B: Bf } : null;
}

/** Flat polygon of the convex hull of a flat point list. */
function hullFlat(flat) {
  const p = [];
  for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]);
  p.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = p.length - 1; i >= 0; i--) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop();
    up.push(p[i]);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1)).flat();
}

/** Ground cells of the model grid (reflections land on ground only). */
export const groundCells = (world) => (i) => world.bld[i] < 0;

/**
 * Reflection fields for every 10-min sun slot of a world (model grid, 2 x 2
 * samples). Slots where no glass is sunlit are null; the pass only visits the
 * ground under each sunlit façade's reflected beam.
 */
export function reflectSlots(world, slots) {
  const grid = { n: world.n, cell: world.cell, S: 2 };
  const ground = groundCells(world);
  const A = [];
  const B = [];
  let any = false;
  for (let k = 0; k < slots.suns.length; k++) {
    const r = reflectField(world, slots.suns[k], grid, ground);
    A.push(r ? r.A : null);
    B.push(r ? r.B : null);
    if (r) any = true;
  }
  return any ? { A, B } : null;
}

/** Per-slot reflected beam fraction r = rho0 A + (1 - rho0) B for a glass (rho0), or null. */
export function reflectFor(rs, rho0) {
  if (!rs) return null;
  return rs.A.map((a, k) => {
    if (!a) return null;
    const b = rs.B[k];
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = rho0 * a[i] + (1 - rho0) * b[i];
    return out;
  });
}

/**
 * Glass outer-surface temperature (deg C) for one façade orientation:
 * Tg = Ta + a_g I_f / (h_o + h_i), I_f = I max(0, cos theta) + 0.5 D
 * (the brief's equation; an assumption, no measurement found; the whole
 * façade is taken as sunlit when it faces the sun).
 */
export function glassTemp(ta, beam, diffuse, cosT, absorb) {
  const If = beam * Math.max(0, cosT) + 0.5 * diffuse;
  return ta + (absorb * If) / (MODEL.glassHo.value + MODEL.glassHi.value);
}
