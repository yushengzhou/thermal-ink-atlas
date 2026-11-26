// core: isometric projection, seeded hash RNG, colour helpers.
// World units are metres: x east, y south, z up. Projected ("P") units are
// metres on the drawing plane; screen pixels = P * zoom + offset.
// Determinism: nothing here reads Math.random or the clock.

export const ISO_C = 0.8660254; // cos 30
export const ISO_S = 0.5; // sin 30
export const ISO_Z = 0.95; // vertical scale

/** Project a world point to the drawing plane. */
export function iso(x, y, z = 0) {
  return [(x - y) * ISO_C, (x + y) * ISO_S - z * ISO_Z];
}

/** Inverse projection of a drawing-plane point onto the plane at height z. */
export function unIso(px, py, z = 0) {
  const a = px / ISO_C; // x - y
  const b = (py + z * ISO_Z) / ISO_S; // x + y
  return [(a + b) / 2, (b - a) / 2];
}

// ---- hashing -------------------------------------------------------------

/** 32-bit integer hash of up to three integers, returns float in [0, 1). */
export function hash3(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Small sequential generator seeded by an integer (xorshift-multiply). */
export function makeRng(seed) {
  let s = (seed | 0) ^ 0x5bd1e995;
  return function next() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1-D value noise in [-1, 1]. */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash3(i, seed) * 2 - 1;
  const b = hash3(i + 1, seed) * 2 - 1;
  return a + (b - a) * u;
}

/** Smooth 2-D value noise in [0, 1]. */
export function noise2(x, y, seed = 0) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash3(i, j, seed);
  const b = hash3(i + 1, j, seed);
  const c = hash3(i, j + 1, seed);
  const d = hash3(i + 1, j + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// ---- maths ---------------------------------------------------------------

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};
export const DEG = Math.PI / 180;

/** Point-in-polygon (flat [x0,y0,x1,y1,...] array). */
export function inPoly(pts, x, y) {
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
    const xi = pts[i];
    const yi = pts[i + 1];
    const xj = pts[j];
    const yj = pts[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Convex hull (monotone chain) of [[x,y],...]; returns [[x,y],...] CCW. */
export function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// ---- colour --------------------------------------------------------------

export function hexRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function rgbCss(c, a = 1) {
  const r = Math.round(clamp(c[0], 0, 255));
  const g = Math.round(clamp(c[1], 0, 255));
  const b = Math.round(clamp(c[2], 0, 255));
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export function mixRgb(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Multiply brightness by k (k < 1 darkens). */
export function scaleRgb(c, k) {
  return [c[0] * k, c[1] * k, c[2] * k];
}

export const PAPER = [243, 236, 221];
export const INK = [43, 38, 33];
