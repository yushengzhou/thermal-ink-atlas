// cpkit: what the pen draws for block 8 (school campus playground) only:
// the ground colours of its surfaces, the track lanes, the pitch, court and
// playground markings, the shade sails on their posts, the play equipment
// (slide, climbing frames, swings), and the block's canvas overlays: the
// contact-burn hatching and the sprinklers over the watered pitch. kit.js
// reaches the drawing through world.draw (set by campus.js prepWorld); the
// overlays are the renderer's R.overlay (set by cpui.js).
import { hexRgb, scaleRgb, iso, rgbCss, clamp } from './core.js';
import { HAND_FONT, labelX } from './render.js';
import { GROUND_RGB, box, jitter } from './kit.js';

// the block's ground colours (kit.js GROUND_RGB is keyed by material id)
Object.assign(GROUND_RGB, {
  turf: hexRgb('#6f9a4f'),
  track: hexRgb('#b0574a'),
  acrylic: hexRgb('#5d7f9c'),
  rubber: hexRgb('#7d6a5c'),
});
const PAINT = hexRgb('#f1ebdc');
const STEEL = hexRgb('#9aa3a8');

/** The stadium outline (as the scene's polygon) at radius r, as world points. */
function stadium(T, r, n = 24) {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const a = -Math.PI / 2 + (k / n) * Math.PI;
    out.push([T.cx + T.half + r * Math.cos(a), T.cy + r * Math.sin(a)]);
  }
  for (let k = 0; k <= n; k++) {
    const a = Math.PI / 2 + (k / n) * Math.PI;
    out.push([T.cx - T.half + r * Math.cos(a), T.cy + r * Math.sin(a)]);
  }
  out.push(out[0]);
  return out;
}

const rectLine = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

/** kit.js drawDecor hook: lane lines, pitch, courts, playground edging and the equipment. */
function decor(pen, world) {
  const sc = world.scene;
  const T = sc.track;
  pen.tag = 'gm';
  // lane lines: 8 lanes of 1.22 m from the kerb
  for (let k = 1; k < 8; k++) pen.line(stadium(T, T.rIn + k * 1.22), { lw: 0.35, stroke: PAINT, a: 0.75, over: 0, smooth: true });
  // pitch: touchlines, halfway line, centre circle, penalty areas, goals
  const [x0, y0, x1, y1] = sc.pitch;
  const xm = (x0 + x1) / 2;
  const ym = (y0 + y1) / 2;
  pen.line(rectLine(x0, y0, x1, y1), { lw: 0.6, stroke: PAINT, a: 0.85, over: 0.1 });
  pen.line([[xm, y0], [xm, y1]], { lw: 0.6, stroke: PAINT, a: 0.85, over: 0.1 });
  const circ = Array.from({ length: 25 }, (_, k) => [xm + 9.15 * Math.cos((k / 24) * 2 * Math.PI), ym + 9.15 * Math.sin((k / 24) * 2 * Math.PI)]);
  pen.line(circ, { lw: 0.55, stroke: PAINT, a: 0.85, smooth: true });
  for (const [a, s] of [[x0, 1], [x1, -1]]) {
    pen.line([[a, ym - 20.15], [a + s * 16.5, ym - 20.15], [a + s * 16.5, ym + 20.15], [a, ym + 20.15]], { lw: 0.55, stroke: PAINT, a: 0.85, over: 0.1 });
    box(pen, a - s * 1.2, ym - 3.66, a, ym + 3.66, 0, 2.44, hexRgb('#e9e4d8'), { t: 'o', lw: 0.45 });
  }
  // stripes mown into the turf look
  const stripes = [];
  for (let x = x0 + 10; x < x1; x += 20) stripes.push([[x, y0 + 0.5, 0], [x, y1 - 0.5, 0]]);
  pen.lines(stripes, { lw: 2.2, stroke: scaleRgb(GROUND_RGB.turf, 1.08), a: 0.35, over: 0, t: 'gm' });
  // basketball courts: outline, centre line, keys, hoops
  pen.tag = 'gm';
  const [, cy0, , cy1] = sc.courts;
  const cym = (cy0 + cy1) / 2;
  for (const cx of sc.courtX) {
    const a = cx;
    const b = cx + 15;
    const top = cym - 14;
    const bot = cym + 14;
    pen.line(rectLine(a, top, b, bot), { lw: 0.5, stroke: PAINT, a: 0.85, over: 0.1 });
    pen.line([[a, cym], [b, cym]], { lw: 0.45, stroke: PAINT, a: 0.85 });
    for (const [y, s] of [[top, 1], [bot, -1]]) {
      pen.line([[cx + 5.05, y], [cx + 5.05, y + s * 5.8], [cx + 9.95, y + s * 5.8], [cx + 9.95, y]], { lw: 0.45, stroke: PAINT, a: 0.85 });
      pen.tag = 'o';
      pen.line([[cx + 7.5, y - s * 0.6, 0], [cx + 7.5, y - s * 0.6, 3.05]], { lw: 0.8, stroke: STEEL, a: 0.9, t: 'o' });
      box(pen, cx + 6.6, y + s * 0.6 - 0.05, cx + 8.4, y + s * 0.6 + 0.05, 2.9, 3.95, hexRgb('#f4f1ea'), { t: 'o', lw: 0.4 });
      pen.tag = 'gm';
    }
  }
  // playground edging (a timber kerb)
  const [px0, py0, px1, py1] = sc.play;
  pen.line(rectLine(px0, py0, px1, py1), { lw: 0.9, stroke: hexRgb('#7a5c42'), a: 0.7 });
  for (const E of sc.equipment ?? []) equipment(pen, E);
}

/** The play equipment (drawn only, not modelled): a metal slide on a platform, climbing frames, a swing set. */
export function equipment(pen, E) {
  pen.tag = 'o';
  const { x, y } = E;
  if (E.kind === 'slide') {
    box(pen, x - 1.5, y - 1.5, x + 1.5, y + 1.5, 1.6, 1.8, hexRgb('#c9563f'), { t: 'o', lw: 0.5 });
    for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) pen.line([[x + a, y + b, 0], [x + a, y + b, 1.6]], { lw: 0.6, stroke: STEEL, a: 0.9, t: 'o' });
    // the chute: stainless steel from the deck down to the south-east
    pen.shape([[x + 1.5, y - 0.45, 1.75], [x + 1.5, y + 0.45, 1.75], [x + 5.2, y + 0.45, 0.25], [x + 5.2, y - 0.45, 0.25]], STEEL, { lw: 0.55, t: 'o' });
    pen.line([[x - 1.5, y + 1.5, 0], [x - 3.2, y + 1.5, 0], [x - 1.5, y + 1.5, 1.7]], { lw: 0.55, t: 'o' });
  } else if (E.kind === 'frame') {
    const segs = [];
    for (const a of [-2, 0, 2]) for (const b of [-2, 2]) segs.push([[x + a, y + b, 0], [x + a, y + b, 2.4]]);
    for (const z of [0.8, 1.6, 2.4]) {
      segs.push([[x - 2, y - 2, z], [x + 2, y - 2, z]], [[x - 2, y + 2, z], [x + 2, y + 2, z]]);
      segs.push([[x - 2, y - 2, z], [x - 2, y + 2, z]], [[x + 2, y - 2, z], [x + 2, y + 2, z]]);
    }
    pen.lines(segs, { lw: 0.55, stroke: hexRgb('#3f6e8a'), a: 0.95, over: 0.05, t: 'o' });
  } else if (E.kind === 'swings') {
    pen.lines([[[x - 4, y - 1, 0], [x - 4, y, 2.6]], [[x - 4, y + 1, 0], [x - 4, y, 2.6]], [[x + 4, y - 1, 0], [x + 4, y, 2.6]], [[x + 4, y + 1, 0], [x + 4, y, 2.6]], [[x - 4, y, 2.6], [x + 4, y, 2.6]]], { lw: 0.7, stroke: STEEL, a: 0.95, t: 'o' });
    for (const s of [-2, 2]) {
      pen.lines([[[x + s - 0.4, y, 2.6], [x + s - 0.4, y, 0.5]], [[x + s + 0.4, y, 2.6], [x + s + 0.4, y, 0.5]]], { lw: 0.35, a: 0.8, t: 'o' });
      pen.line([[x + s - 0.5, y, 0.5], [x + s + 0.5, y, 0.5]], { lw: 1.2, stroke: hexRgb('#2b2b2e'), t: 'o' });
    }
  }
}

/** A shade sail on its posts: knitted cloth, slightly hung, half see-through (children play beneath it), tagged as a crown so the heat wash shows through it. */
export function sail(pen, P, i) {
  const { x0, y0, x1, y1, z } = P;
  pen.tag = 'trunk';
  const posts = [[x0, y0, z + 0.6], [x1, y0, z - 0.2], [x1, y1, z + 0.6], [x0, y1, z - 0.2]];
  pen.lines(posts.map(([x, y, zz]) => [[x, y, 0], [x, y, zz]]), { lw: 0.8, stroke: STEEL, a: 0.95, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape(posts, jitter(hexRgb(i % 2 ? '#e3c565' : '#e9e2cf'), i * 17, 0.04), { lw: 0.9, t: 'tree', a: 0.55 });
  const weave = [];
  for (let k = 1; k < 6; k++) {
    const u = k / 6;
    weave.push([[x0 + (x1 - x0) * u, y0, z + 0.6 - 0.8 * u], [x0 + (x1 - x0) * u, y1, z - 0.2 + 0.8 * u]]);
  }
  pen.lines(weave, { lw: 0.3, a: 0.35, over: 0, t: 'treeTick' });
}

/** kit.js drawWorld hook: draw a block-8 object; true if it was one. */
function objects(pen, ob) {
  if (ob.kind === 'p' && ob.o.kind === 'shadeSail') sail(pen, ob.o, ob.i);
  else return false;
  return true;
}

/** The block-8 drawing hooks for kit.js (world.draw). */
export const CP_DRAW = { objects, decor };

// ---- the canvas overlays -----------------------------------------------------------
const BURN = hexRgb('#8a2f22');
const WATER = hexRgb('#3d7fa6');
const VIEW = [1, 1, 1 / 0.95];

/** True if a ground point is hidden from the viewer by a building box (ray toward the viewer). */
export function hiddenGround(world, x, y) {
  for (const B of world.buildings) {
    const dIn = Math.max(B.x0 - x, B.y0 - y, 0);
    const dOut = Math.min(B.x1 - x, B.y1 - y);
    if (dOut > dIn && B.h > dIn * VIEW[2]) return true;
  }
  return false;
}

/** A bottom label box (as the other blocks' overlay labels). */
function label(R, ctx, text, ink, W, H, row = 0) {
  const d = R.dpr;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const by = H - (84 + row * 26) * d;
  const bx = labelX(R, w, W, by);
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(ink, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(ink);
  ctx.fillText(text, bx, by);
}

/**
 * Block 8: the contact-burn overlay. Every ground cell above its material's
 * 1-min burn threshold at this hour (R.campus.burn(hq): cell indices) gets
 * diagonal ink hatching inside its 5 m square; cells hidden behind a
 * building are left out. Cached per hour, model and camera in an
 * off-screen layer; a label gives the thresholds and the count.
 */
export function drawBurn(R, ctx, cam, W, H, alpha, hq) {
  const E = R.campus;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  const view = `${cam.z}|${cam.cx}|${cam.cy}|${W}|${H}|${d}`;
  const key = `${hq}|${E.modelKey()}|${view}`;
  // while a slider-drag frame is still a preview (tiles pending), keep the layer of the last hour drawn;
  // it is rebuilt on the first frame whose tiles are exact, so the settled frame is exact
  const stale = E.layer && E.layer.key !== key && R.scrub && R.stats.preview && E.layer.view === view;
  if (!stale && (!E.layer || E.layer.key !== key)) {
    const c = E.layer?.c && E.layer.c.width === W && E.layer.c.height === H ? E.layer.c : (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }));
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    const cells = E.burn(hq);
    const { n, cell } = R.world;
    let drawn = 0;
    g.beginPath();
    for (const i of cells) {
      const x0 = (i % n) * cell;
      const y0 = Math.floor(i / n) * cell;
      if (hiddenGround(R.world, x0 + cell / 2, y0 + cell / 2)) continue;
      const P = (x, y) => {
        const p = iso(x, y, 0);
        return [ox + p[0] * Z, oy + p[1] * Z];
      };
      const [cx, cy] = P(x0 + cell / 2, y0 + cell / 2);
      if (cx < -40 || cx > W + 40 || cy < -40 || cy > H + 40) continue;
      // three strokes across the square, parallel to its x-y diagonal
      for (const t of [0.2, 0.5, 0.8]) {
        const a = P(x0 + t * cell, y0);
        const b = P(x0, y0 + t * cell);
        const a2 = P(x0 + cell, y0 + t * cell);
        const b2 = P(x0 + t * cell, y0 + cell);
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        if (t !== 0.5) {
          g.moveTo(a2[0], a2[1]);
          g.lineTo(b2[0], b2[1]);
        } else {
          const e = P(x0 + cell, y0);
          const f = P(x0, y0 + cell);
          g.moveTo(e[0], e[1]);
          g.lineTo(f[0], f[1]);
        }
      }
      drawn++;
    }
    g.strokeStyle = rgbCss(BURN, 0.85);
    g.lineWidth = Math.max(1.1 * d, 0.32 * Z);
    g.lineCap = 'round';
    g.stroke();
    E.layer = { key, view, c, n: cells.length, drawn };
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(E.layer.c, 0, 0);
  R.stats.burnCells = E.layer.n;
  R.stats.burnDrawn = E.layer.drawn;
  const text = `Hatched: hot enough to burn bare skin in a minute: plastics above ${E.limits.plastic} °C · concrete, asphalt above ${E.limits.stone} °C · metal above ${E.limits.metal} °C · ${E.layer.n} patches`;
  label(R, ctx, text, BURN, W, H, 1);
  R.stats.burnLabel = text;
  ctx.restore();
}

/**
 * Block 8: the sprinklers on the watered pitch (irrigation on): arcs of
 * spray from heads along the touchlines while the water is on (the first
 * 30 min after the watering hour), drifting with the frame number, and a
 * label at any hour. Pure function of frame, camera and hour.
 */
export function drawWater(R, ctx, f, cam, W, H, alpha, hq) {
  const E = R.campus;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the context's line state is left over from the frame before (people use round caps): set it
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let n = 0;
  if (hq >= E.hour && hq < E.hour + 0.5) {
    ctx.strokeStyle = rgbCss(WATER);
    ctx.globalAlpha = alpha * 0.95;
    ctx.lineWidth = Math.max(1.6 * d, 0.5 * Z);
    ctx.setLineDash([3 * d, 3 * d]);
    ctx.lineDashOffset = -f * 0.6 * d;
    ctx.beginPath();
    for (const [hx, hy] of E.heads) {
      const base = iso(hx, hy, 0);
      const X = ox + base[0] * Z;
      const Y = oy + base[1] * Z;
      if (X < -60 || X > W + 60 || Y < -60 || Y > H + 60) continue;
      for (let k = 0; k < 6; k++) {
        const a = ((k + (f / 90) % 1) / 6) * 2 * Math.PI;
        const R0 = 14;
        ctx.moveTo(X, Y);
        for (let s = 1; s <= 8; s++) {
          const u = s / 8;
          const p = iso(hx + Math.cos(a) * R0 * u, hy + Math.sin(a) * R0 * u, 3.5 * u * (1 - u) * 4 * 0.6);
          ctx.lineTo(ox + p[0] * Z, oy + p[1] * Z);
        }
        n++;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  R.stats.spray = n;
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'miter';
  const text = E.waterLabel(hq);
  label(R, ctx, text, WATER, W, H, 0);
  R.stats.waterLabel = text;
  ctx.restore();
}

/** Renderer overlay hook (render.js R.overlay): the burn hatching and the sprinklers, when shown. */
export function cpOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  R.stats.burnCells = 0;
  R.stats.burnDrawn = 0;
  R.stats.spray = 0;
  if (!R.campus) return;
  if (look.burn) drawBurn(R, ctx, cam, W, H, alpha, hq);
  if (look.irrigate) drawWater(R, ctx, f, cam, W, H, alpha, hq);
}
