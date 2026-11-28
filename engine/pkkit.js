// pkkit: what the pen draws for block 6 (car park and brownfield) only: the
// lot cars, the PV canopies, rails, tufts, soil speckle and bay stripes.
// kit.js reaches them through world.draw (set by parking.js prepWorld), so
// the other pages do not carry this code.
import { hash3, hexRgb, scaleRgb, mixRgb, makeRng, iso, rgbCss, clamp } from './core.js';
import { HAND_FONT } from './render.js';
import { jitter, speckle } from './kit.js';

/**
 * A solar (PV) canopy (block 6): steel posts every 8 m along its long edges
 * and a row of dark panels at z, gridded into modules; tagged as crowns
 * (as block 5 screens), so the heat wash of the bays shows through it.
 */
export function pvCanopy(pen, P, i) {
  const { x0, y0, x1, y1, z } = P;
  pen.tag = 'trunk';
  const posts = [];
  for (let x = x0 + 2; x <= x1 - 1.9; x += 8) for (const y of [y0 + 1, y1 - 1]) posts.push([[x, y, 0], [x, y, z - 0.2]]);
  pen.lines(posts, { lw: 0.8, stroke: hexRgb('#6f7378'), a: 0.9, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape([[x0, y0, z], [x1, y0, z], [x1, y1, z - 0.6], [x0, y1, z - 0.6]], jitter(hexRgb('#40506a'), i * 17, 0.05), { lw: 0.9, t: 'tree', a: 0.94 });
  const grid = [];
  for (let x = x0 + 2; x < x1 - 0.5; x += 2) grid.push([[x, y0, z], [x, y1, z - 0.6]]);
  const mid = (y0 + y1) / 2;
  grid.push([[x0, mid, z - 0.3], [x1, mid, z - 0.3]]);
  pen.lines(grid, { lw: 0.3, stroke: hexRgb('#9fb1c4'), a: 0.5, over: 0, t: 'treeTick' });
}


/**
 * A parked car of the block 6 lot, in three items (body sides, body top,
 * cabin) instead of block 1's six; tagged 'car', so the thermal view draws
 * only its outline over the heat wash (the car itself is not modelled).
 */
export function lotCar(pen, x, y, axis, colour, i) {
  const L = 4.4;
  const W = 1.8;
  const c = hexRgb(colour);
  const [hx, hy] = axis === 'x' ? [L / 2, W / 2] : [W / 2, L / 2];
  const sides = (x0, y0, x1, y1, z0, z1) => [[[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]]];
  const top = (x0, y0, x1, y1, z) => [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]];
  pen.tag = 'car';
  pen.shapes(sides(x - hx, y - hy, x + hx, y + hy, 0.25, 1.0), { k: 'wall', c, n: [0, 1] }, { lw: 0.5, t: 'car' });
  pen.shape(top(x - hx, y - hy, x + hx, y + hy, 1.0), scaleRgb(c, 1.08), { lw: 0.5, t: 'car' });
  const [cx, cy] = axis === 'x' ? [L * 0.27, W * 0.42] : [W * 0.42, L * 0.27];
  const off = (hash3(i, 3) - 0.5) * 0.6;
  const ox = axis === 'x' ? off : 0;
  const oy = axis === 'y' ? off : 0;
  const g = mixRgb(c, hexRgb('#c9d3d6'), 0.45);
  pen.shapes([...sides(x - cx + ox, y - cy + oy, x + cx + ox, y + cy + oy, 1.0, 1.5), top(x - cx + ox, y - cy + oy, x + cx + ox, y + cy + oy, 1.5)], g, { lw: 0.45, t: 'car' });
}


/** A rail siding (block 6): two rails 1.435 m apart along x at y, sleepers every 0.8 m, as two items. */
function rails(pen, y, x0, x1) {
  pen.tag = 'gm';
  const sl = [];
  for (let x = x0 + 0.4; x < x1; x += 0.8) sl.push([[x, y - 1.25], [x, y + 1.25]]);
  pen.lines(sl, { lw: 0.55, stroke: hexRgb('#6b5443'), a: 0.6, over: 0 });
  pen.lines([[[x0, y - 0.72], [x1, y - 0.72]], [[x0, y + 0.72], [x1, y + 0.72]]], { lw: 0.9, stroke: hexRgb('#4a4744'), a: 0.85, over: 0.1 });
}

/** Dry tufts on the brownfield (block 6): n small three-blade strokes, one item. */
function tufts(pen, x0, y0, x1, y1, n, seed) {
  const r = makeRng(seed);
  pen.tag = 'gm';
  const segs = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const h = 0.5 + r() * 0.7;
    for (let k = -1; k <= 1; k++) segs.push([[x, y, 0], [x + k * 0.3, y - 0.1, h]]);
  }
  pen.lines(segs, { lw: 0.45, stroke: hexRgb('#6d6a3a'), a: 0.7, over: 0 });
}

/** kit.js drawWorld hook: draw a block-6 object; true if it was one. */
function objects(pen, ob) {
  if (ob.kind === 'p' && ob.o.kind === 'pvCanopy') pvCanopy(pen, ob.o, ob.i);
  else if (ob.kind === 'c') lotCar(pen, ...ob.o, ob.i);
  else return false;
  return true;
}

/** kit.js drawDecor hook: rails on the ballast, brownfield tufts and speckle, faded bay stripes. */
function decor(pen, world, D) {
  for (const r of D.rails ?? []) rails(pen, ...r);
  for (const [x0, y0, x1, y1, n, seed] of D.tufts ?? []) tufts(pen, x0, y0, x1, y1, n, seed);
  for (const [x0, y0, x1, y1, n, seed] of D.soil ?? []) speckle(pen, x0, y0, x1, y1, n, seed, hexRgb('#9a8463'));
  for (const [xa, xb, ya, yb, step] of D.stripes ?? []) {
    const segs = [];
    for (let x = xa; x <= xb + 1e-9; x += step) segs.push([[x, ya], [x, yb]]);
    pen.tag = 'gm';
    pen.lines(segs, { lw: 0.6, stroke: hexRgb('#efe8d6'), a: 0.6, over: 0.1 });
  }
}

/** The block-6 drawing hooks for kit.js (world.draw). */
export const PK_DRAW = { objects, decor };

// ---- the night-release overlay in the canvas (moved from render.js; the same drawing) ----
// the night-release strokes (heat out of the ground) and the uptake ticks
const FLUX_UP = hexRgb('#a2452f');
const FLUX_DOWN = hexRgb('#3b6573');

/**
 * Block 6: the night-release overlay. On a 10 m grid of samples, where the
 * ground gives stored heat back (G < 0) soft warm strokes rise from the
 * surface, longer and stronger for more W m-2; where it takes heat in
 * (G > 0) short cool ticks point down; the share of samples drawn grows
 * with |G| (all of them from 120 W m-2). The strokes drift upward with the
 * frame number (a pure function of frame, camera and hour), and a label
 * says what they show.
 */
export function drawFlux(R, ctx, f, cam, W, H, alpha, hq) {
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  const samples = R.flux(hq);
  const B = 5;
  const up = Array.from({ length: B }, () => []);
  const down = Array.from({ length: B }, () => []);
  const unit = Math.max(10 * d, 4.2 * Z); // stroke length at 100 W m-2
  for (let k = 0; k < samples.length; k++) {
    const s = samples[k];
    const a = Math.abs(s.g);
    // stroke density follows |G| too: every sample at 120 W m-2 or more, fewer below
    if (a < 15 || hash3(k, 9, 91) >= a / 120) continue;
    const p = iso(s.x, s.y, s.z);
    const X = ox + p[0] * Z;
    const Y = oy + p[1] * Z;
    if (X < -20 || X > W + 20 || Y < -unit * 2 || Y > H + 20) continue;
    if (R.clip && (X < R.clip[0] || X > R.clip[1])) continue;
    const b = Math.min(B - 1, Math.floor((a / 175) * B));
    (s.g < 0 ? up : down)[b].push(X, Y, a, k);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.1 * d, 0.45 * Z);
  const t = f / 60;
  ctx.strokeStyle = rgbCss(FLUX_UP);
  for (let b = 0; b < B; b++) {
    const P = up[b];
    if (!P.length) continue;
    ctx.globalAlpha = alpha * (0.25 + 0.6 * ((b + 0.5) / B));
    ctx.beginPath();
    for (let q = 0; q < P.length; q += 4) {
      const L = (unit * Math.min(1.75, P[q + 2] / 100));
      const k = P[q + 3];
      // rise: the stroke slides up by up to half its length and starts again (period 2.5 s)
      const ph = (t / 2.5 + hash3(k, 7, 91)) % 1;
      const y0 = P[q + 1] - ph * L * 0.5;
      const x0 = P[q] + (hash3(k, 8, 91) - 0.5) * 3 * d;
      ctx.moveTo(x0, y0);
      for (let i = 1; i <= 4; i++) ctx.lineTo(x0 + Math.sin(i * 1.7 + k + t * 1.3) * 1.4 * d, y0 - (L * i) / 4);
    }
    ctx.stroke();
    R.stats.fluxUp += P.length / 4;
  }
  ctx.strokeStyle = rgbCss(FLUX_DOWN);
  for (let b = 0; b < B; b++) {
    const P = down[b];
    if (!P.length) continue;
    ctx.globalAlpha = alpha * (0.15 + 0.35 * ((b + 0.5) / B));
    ctx.beginPath();
    for (let q = 0; q < P.length; q += 4) {
      const L = unit * 0.45 * Math.min(1.75, P[q + 2] / 100);
      const x0 = P[q] + (hash3(P[q + 3], 8, 91) - 0.5) * 3 * d;
      const y0 = P[q + 1] - L - 2 * d;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0, y0 + L);
      ctx.moveTo(x0 - 1.6 * d, y0 + L - 2 * d);
      ctx.lineTo(x0, y0 + L);
      ctx.lineTo(x0 + 1.6 * d, y0 + L - 2 * d);
    }
    ctx.stroke();
    R.stats.fluxDown += P.length / 4;
  }
  const night = R.stats.fluxUp >= R.stats.fluxDown;
  const text = `Heat into and out of the ground (calculated): ${night ? 'rising strokes = stored heat coming back out' : 'ticks down = heat going into the ground; rising strokes = heat coming back out'} · more and longer strokes = more heat`;
  ctx.globalAlpha = alpha;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const bx = clamp(W / 2 - w / 2, 8 * d, W - w - 8 * d);
  const by = H - 84 * d;
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(FLUX_UP, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(FLUX_UP);
  ctx.fillText(text, bx, by);
  ctx.restore();
  R.stats.fluxLabel = text;
}

/** Renderer overlay hook (render.js R.overlay): the night-release strokes, when shown. */
export function pkOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  if (look.flux && R.flux) drawFlux(R, ctx, f, cam, W, H, alpha, hq);
}
