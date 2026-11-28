// bskit: what the pen draws for block 9 (bus stops and footbridges) only:
// the shelters (posts, roofs of metal, clear or opal polycarbonate or glass,
// back and side panels, glass walls, benches, the stop poles), the
// footbridges (piers, steel deck, parapet rails, stairs, the cover), bus-bay
// markings, and the block's canvas overlays: the buses at the stops, the
// waiting places (head in sun or shade, from the point model) and the
// contact-burn flags. kit.js reaches the drawing through world.draw (set by
// busstop.js prepWorld); the overlays are the renderer's R.overlay (set by
// bsui.js).
import { hexRgb, scaleRgb, iso, rgbCss, clamp } from './core.js';
import { HAND_FONT } from './render.js';
import { box, jitter } from './kit.js';

const STEEL = hexRgb('#8f989d');
const DARK = hexRgb('#59616a');
const ROOF = { roofMetal: hexRgb('#6f777e'), polyClear: hexRgb('#d5e5ea'), polyOpal: hexRgb('#ece7da'), glassBox: hexRgb('#cfe2e8') };
const ROOF_A = { roofMetal: 0.95, polyClear: 0.35, polyOpal: 0.8, glassBox: 0.32 };
const PANEL = { adPanel: hexRgb('#c9553f'), glassBox: hexRgb('#bcd8e0') };
const PAINT = hexRgb('#efe8d6');

/** A bench seat on two legs (metal slats or a concrete block), seat at 0.45 m. */
function benchSeat(pen, B) {
  pen.tag = 'o';
  if (B.mat === 'concrete') box(pen, B.x0, B.y0, B.x1, B.y1, 0, 0.45, hexRgb('#bdb6a8'), { t: 'o', lw: 0.5 });
  else {
    const legs = [];
    for (const [x, y] of [[B.x0 + 0.2, B.y0 + 0.2], [B.x1 - 0.2, B.y1 - 0.2], [B.x0 + 0.2, B.y1 - 0.2], [B.x1 - 0.2, B.y0 + 0.2]]) legs.push([[x, y, 0], [x, y, 0.42]]);
    pen.lines(legs, { lw: 0.5, stroke: DARK, a: 0.9, t: 'o' });
    box(pen, B.x0, B.y0, B.x1, B.y1, 0.4, 0.45, STEEL, { t: 'o', lw: 0.45 });
  }
}

/** A bus-stop pole with its sign, at (x, y). */
function pole(pen, x, y) {
  pen.tag = 'o';
  pen.line([[x, y, 0], [x, y, 2.9]], { lw: 0.6, stroke: DARK, a: 0.95, t: 'o' });
  box(pen, x - 0.05, y - 0.35, x + 0.05, y + 0.35, 2.4, 3.0, hexRgb('#2f6f8f'), { t: 'o', lw: 0.4 });
}

/**
 * A shelter: four posts, its panels (opaque ad panels or glass walls), the
 * bench, then the roof, tagged as a crown (as the block-5 and block-6
 * screens) so the heat wash shows through a see-through roof.
 */
export function shelter(pen, S) {
  const r = S.roof;
  const z = r.z;
  pen.tag = 'trunk';
  const posts = [[r.x0 + 0.1, r.y0 + 0.1], [r.x1 - 0.1, r.y0 + 0.1], [r.x0 + 0.1, r.y1 - 0.1], [r.x1 - 0.1, r.y1 - 0.1]].map(([x, y]) => [[x, y, 0], [x, y, z]]);
  pen.lines(posts, { lw: 0.7, stroke: DARK, a: 0.95, over: 0.05, t: 'trunk' });
  benchSeat(pen, S.bench);
  for (const P of S.panels) {
    const q = P.x0 === P.x1 ? [[P.x0, P.y0, P.z0], [P.x0, P.y1, P.z0], [P.x0, P.y1, P.z1], [P.x0, P.y0, P.z1]] : [[P.x0, P.y0, P.z0], [P.x1, P.y0, P.z0], [P.x1, P.y0, P.z1], [P.x0, P.y0, P.z1]];
    const glass = P.kind === 'glassBox';
    pen.tag = glass ? 'tree' : 'o';
    pen.shape(q, glass ? PANEL.glassBox : jitter(P.west ? hexRgb('#3f6e6a') : PANEL.adPanel, P.z1 * 10, 0.04), { lw: glass ? 0.5 : 0.6, a: glass ? 0.3 : 0.95, t: glass ? 'tree' : 'o' });
  }
  pen.tag = 'tree';
  pen.shape([[r.x0, r.y0, z], [r.x1, r.y0, z], [r.x1, r.y1, z], [r.x0, r.y1, z]], ROOF[r.kind], { lw: 0.8, a: ROOF_A[r.kind], t: 'tree' });
  // the roof's edge profile and, for the sheets, the twinwall ribs
  const ribs = [];
  if (r.kind !== 'roofMetal') {
    const along = r.x1 - r.x0 > r.y1 - r.y0;
    for (let u = 0.5; u < (along ? r.x1 - r.x0 : r.y1 - r.y0); u += 0.5) ribs.push(along ? [[r.x0 + u, r.y0, z], [r.x0 + u, r.y1, z]] : [[r.x0, r.y0 + u, z], [r.x1, r.y0 + u, z]]);
  }
  if (ribs.length) pen.lines(ribs, { lw: 0.25, a: 0.3, over: 0, t: 'treeTick' });
}

/** The stairs at one end of a footbridge: a flight of steps from (x, ya) at the ground to (x, yb) at the deck. */
function stairs(pen, x0, x1, ya, yb, z) {
  pen.tag = 'o';
  const n = 20;
  const steps = [];
  for (let k = 0; k <= n; k++) {
    const y = ya + ((yb - ya) * k) / n;
    steps.push([[x0, y, (z * k) / n], [x1, y, (z * k) / n]]);
  }
  pen.shape([[x0, ya, 0], [x1, ya, 0], [x1, yb, z], [x0, yb, z]], hexRgb('#a9a49a'), { lw: 0.6, a: 0.95, t: 'o' });
  pen.lines(steps, { lw: 0.3, a: 0.45, over: 0, t: 'o' });
  pen.lines([[[x0, ya, 1.1], [x0, yb, z + 1.1]], [[x1, ya, 1.1], [x1, yb, z + 1.1]]], { lw: 0.5, stroke: STEEL, a: 0.9, t: 'o' });
}

/** A footbridge: two piers, the steel deck as a thin box, parapet rails and posts, the stairs at both ends. */
export function bridge(pen, b) {
  const { x0, y0, x1, y1, z } = b;
  pen.tag = 'o';
  for (const x of [172, 228]) box(pen, x - 0.4, y0 + 0.8, x + 0.4, y1 - 0.8, 0, z - 0.6, hexRgb('#b3aca0'), { t: 'o', lw: 0.55 });
  stairs(pen, x0 - 3.6, x0 - 0.6, y1 + 12, y1, z);
  stairs(pen, x1 + 0.6, x1 + 3.6, y1 + 12, y1, z);
  box(pen, x0 - 3.6, y0, x1 + 3.6, y1, z - 0.6, z, jitter(hexRgb('#6d7479'), b.z * 7, 0.04), { t: 'o', lw: 0.8 });
  const rails = [];
  for (const y of [y0 + 0.05, y1 - 0.05]) {
    rails.push([[x0 - 3.6, y, z + 1.1], [x1 + 3.6, y, z + 1.1]], [[x0 - 3.6, y, z + 0.5], [x1 + 3.6, y, z + 0.5]]);
    for (let x = x0 - 3.6; x <= x1 + 3.6; x += 2.4) rails.push([[x, y, z], [x, y, z + 1.1]]);
  }
  pen.lines(rails, { lw: 0.45, stroke: STEEL, a: 0.9, t: 'o' });
}

/** The cover over a footbridge: posts every 6 m along both edges and a flat opaque roof. */
export function cover(pen, P) {
  const { x0, y0, x1, y1, z } = P;
  pen.tag = 'trunk';
  const posts = [];
  for (let x = x0 - 3.4; x <= x1 + 3.4; x += 6) for (const y of [y0 + 0.1, y1 - 0.1]) posts.push([[x, y, z - 2.65], [x, y, z]]);
  pen.lines(posts, { lw: 0.6, stroke: DARK, a: 0.9, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape([[x0 - 3.6, y0 - 0.2, z], [x1 + 3.6, y0 - 0.2, z], [x1 + 3.6, y1 + 0.2, z], [x0 - 3.6, y1 + 0.2, z]], ROOF.roofMetal, { lw: 0.8, a: 0.95, t: 'tree' });
}

/** kit.js drawWorld hook: draw a block-9 object; true if it was one. */
function objects(pen, ob, world) {
  if (ob.kind !== 'p') return false;
  const sc = world.scene;
  const id = ob.o.id;
  if (id.startsWith('roof')) shelter(pen, sc.stops.find((s) => `roof${s.id}` === id));
  else if (id.startsWith('deck-')) bridge(pen, sc.bridges.find((b) => `deck-${b.id}` === id));
  else if (id.startsWith('cover-')) cover(pen, ob.o);
  else return false;
  return true;
}

/** kit.js drawDecor hook: bus bays (painted boxes in the kerb lane), the stop poles, stop D's bench. */
function decor(pen, world) {
  pen.tag = 'gm';
  for (const s of world.scene.stops) {
    const b = s.bus;
    const [hx, hy] = b.axis === 'x' ? [7, 1.6] : [1.6, 7];
    pen.line([[b.x - hx, b.y - hy], [b.x + hx, b.y - hy], [b.x + hx, b.y + hy], [b.x - hx, b.y + hy], [b.x - hx, b.y - hy]], { lw: 0.7, stroke: hexRgb('#e3c565'), a: 0.85, over: 0.1 });
    pen.line(b.axis === 'x' ? [[b.x - 3, b.y], [b.x + 3, b.y]] : [[b.x, b.y - 3], [b.x, b.y + 3]], { lw: 1.2, stroke: PAINT, a: 0.6, over: 0.1 });
  }
  for (const s of world.scene.stops) {
    pole(pen, ...s.pole);
    if (!s.roof) benchSeat(pen, s.bench);
  }
}

/** The block-9 drawing hooks for kit.js (world.draw). */
export const BS_DRAW = { objects, decor };

// ---- the canvas overlays -----------------------------------------------------------
const BUS = hexRgb('#c4473a');
const RING = hexRgb('#8a2f22');
const SHADE = hexRgb('#2f5f8a');

/** A bottom label box (as the other blocks' overlay labels). */
function label(R, ctx, text, ink, W, H, row = 0) {
  const d = R.dpr;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const bx = clamp(W / 2 - w / 2, 8 * d, W - w - 8 * d);
  const by = H - (84 + row * 26) * d;
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(ink, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(ink);
  ctx.fillText(text, bx, by);
}

/**
 * Where a stop's bus is at clock minute c (minutes): null, or {u (offset along
 * its lane from the bay, m; 0 in the bay), dwell}. A bus comes in over the
 * last 0.6 min before it is due, stands 0.5 min (the riders board at its
 * arrival), and pulls out over 0.6 min.
 */
export function busAt(buses, c) {
  for (const b of buses) {
    const d = c - b;
    if (d < -0.6 || d > 1.1) continue;
    if (d < 0) return { u: -80 * (d / 0.6) ** 2, dwell: false, b };
    if (d < 0.5) return { u: 0, dwell: true, b };
    const e = (d - 0.5) / 0.6;
    return { u: 80 * e * e, dwell: false, b };
  }
  return null;
}

/** An isometric bus (12 x 2.5 x 3 m), as a box with a window band, centred at (x, y). */
function drawBus(ctx, P, x, y, axis) {
  const [hx, hy] = axis === 'x' ? [6, 1.25] : [1.25, 6];
  const x0 = x - hx;
  const x1 = x + hx;
  const y0 = y - hy;
  const y1 = y + hy;
  const face = (pts, fill) => {
    ctx.beginPath();
    pts.forEach(([a, b, z], k) => {
      const [X, Y] = P(a, b, z);
      if (k) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  face([[x0, y1, 0.3], [x1, y1, 0.3], [x1, y1, 3], [x0, y1, 3]], rgbCss(BUS));
  face([[x1, y1, 0.3], [x1, y0, 0.3], [x1, y0, 3], [x1, y1, 3]], rgbCss(scaleRgb(BUS, 0.82)));
  face([[x0, y0, 3], [x1, y0, 3], [x1, y1, 3], [x0, y1, 3]], rgbCss(hexRgb('#e8e2d4')));
  face([[x0 + 0.4, y1, 1.6], [x1 - 0.4, y1, 1.6], [x1 - 0.4, y1, 2.5], [x0 + 0.4, y1, 2.5]], rgbCss(hexRgb('#3b4a55')));
  face([[x1, y1 - 0.3, 1.6], [x1, y0 + 0.3, 1.6], [x1, y0 + 0.3, 2.5], [x1, y1 - 0.3, 2.5]], rgbCss(hexRgb('#3b4a55')));
}

/**
 * Block 9: the buses coming in to, standing at and leaving the stops at
 * the bus clock (R.bus.clock(f, hq)), drawn under the people. Pure function
 * of frame, camera and hour.
 */
export function drawBuses(R, ctx, f, cam, W, H, alpha, hq) {
  const E = R.bus;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const c = E.clock(f, hq);
  const P = (x, y, z) => {
    const p = iso(x, y, z);
    return [ox + p[0] * Z, oy + p[1] * Z];
  };
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgbCss(hexRgb('#2b2621'), 0.85);
  ctx.lineWidth = Math.max(0.8 * R.dpr, 0.12 * Z);
  let n = 0;
  E.stops.forEach((s, si) => {
    const at = busAt(E.buses(si), c);
    if (!at) return;
    const b = s.bus;
    const x = b.axis === 'x' ? b.x + b.dir * at.u : b.x;
    const y = b.axis === 'y' ? b.y + b.dir * at.u : b.y;
    const [X, Y] = P(x, y, 0);
    if (X < -200 || X > W + 200 || Y < -200 || Y > H + 200) return;
    drawBus(ctx, P, x, y, b.axis);
    n++;
  });
  ctx.restore();
  R.stats.buses = n;
}

/**
 * Block 9: the waiting places (look.spots): a ring on the ground at every
 * place, filled red where the head is in direct sun (more than half of it
 * gets through, point model) at this hour, blue-grey where it is shaded,
 * with a label. Pure function of camera and hour.
 */
export function drawSpots(R, ctx, cam, W, H, alpha, hq) {
  const E = R.bus;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1 * d, 0.14 * Z);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  let lit = 0;
  let n = 0;
  for (const p of E.places()) {
    const q = iso(p.x, p.y, 0);
    const X = ox + q[0] * Z;
    const Y = oy + q[1] * Z;
    if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
    const sun = E.headSun(p.i, hq) >= 0.5;
    ctx.beginPath();
    ctx.ellipse(X, Y, Math.max(3 * d, 0.45 * Z), Math.max(1.7 * d, 0.26 * Z), 0, 0, Math.PI * 2);
    ctx.fillStyle = rgbCss(sun ? RING : SHADE, sun ? 0.75 : 0.25);
    ctx.fill();
    ctx.strokeStyle = rgbCss(sun ? RING : SHADE);
    ctx.stroke();
    n++;
    if (sun) lit++;
  }
  const text = `Waiting places: red = head in direct sun, blue = in shade at ${E.hm(hq)} (point model, adult head height) · ${lit} of ${n} in sun`;
  label(R, ctx, text, RING, W, H, 0);
  R.stats.spots = n;
  R.stats.spotsLit = lit;
  R.stats.spotsLabel = text;
  ctx.restore();
}

/**
 * Block 9: the contact-burn flags (look.burn): a flag on every bench seat,
 * handrail and deck point above its 1-min limit at this hour, with "1 s"
 * added where metal is above about 65 °C (unverified), and a label. Display
 * only.
 */
export function drawFlags(R, ctx, cam, W, H, alpha, hq) {
  const E = R.bus;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.font = `${Math.round(11 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  let n = 0;
  let n1 = 0;
  for (const p of E.flags(hq)) {
    if (!p.min1) continue;
    const q = iso(p.x, p.y, p.z);
    const X = ox + q[0] * Z;
    const Y = oy + q[1] * Z;
    n++;
    if (p.s1) n1++;
    if (X < -40 || X > W + 40 || Y < -40 || Y > H + 40) continue;
    const t = `${Math.round(p.ts)} °C${p.s1 ? ' · 1 s' : ''}`;
    ctx.strokeStyle = rgbCss(RING);
    ctx.lineWidth = 1.2 * d;
    ctx.beginPath();
    ctx.moveTo(X, Y);
    ctx.lineTo(X, Y - 16 * d);
    ctx.stroke();
    const w = ctx.measureText(t).width;
    ctx.fillStyle = rgbCss(RING);
    ctx.fillRect(X, Y - 16 * d, w + 6 * d, 13 * d);
    ctx.fillStyle = 'rgba(250,246,236,1)';
    ctx.fillText(t, X + 3 * d, Y - 4 * d);
  }
  const text = `Flags: hot enough to burn bare skin in a minute: metal above ${E.limits.metal} °C · concrete above ${E.limits.stone} °C; "1 s": bare metal above about ${E.limits.s1} °C · ${n} flagged`;
  label(R, ctx, text, RING, W, H, 1);
  R.stats.flags = n;
  R.stats.flags1s = n1;
  R.stats.flagsLabel = text;
  ctx.restore();
}

/** Renderer overlay hook (render.js R.overlay): the buses, and the waiting places and the burn flags when shown. */
export function bsOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  R.stats.buses = 0;
  R.stats.spots = 0;
  R.stats.flags = 0;
  if (!R.bus) return;
  drawBuses(R, ctx, f, cam, W, H, alpha, hq);
  if (look.spots) drawSpots(R, ctx, cam, W, H, alpha, hq);
  if (look.burn) drawFlags(R, ctx, cam, W, H, alpha, hq);
}
