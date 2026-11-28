// vgkit: what the pen draws for block 10 (urban village) only: the village
// houses built plot to plot with their windows, shopfronts on Market Lane,
// water tanks and rooftop rooms under metal sheeting; the older village
// houses; the single-storey rooms of the low-rise edge under iron,
// galvanised, asbestos-cement, tarpaulin or white-painted roofs; and the
// "under the roof" overlay. kit.js reaches the drawing through world.draw
// (set by village.js prepWorld); the overlay is the renderer's R.overlay
// (set by vgui.js vgApp), so the other pages do not carry this code.
import { hash3, hexRgb, scaleRgb, iso, rgbCss, clamp } from './core.js';
import { box, jitter, WIN } from './kit.js';
import { HAND_FONT, labelX } from './render.js';

/** Roof colours by material (day view). */
export const VG_ROOF = {
  slabRoof: hexRgb('#a7a299'),
  rustTin: hexRgb('#97603f'),
  galvTin: hexRgb('#a9b1b4'),
  asbestosRoof: hexRgb('#b5b1a7'),
  tarpRoof: hexRgb('#4f7fa6'),
  whiteTinAged: hexRgb('#e1dccf'),
  whiteTin: hexRgb('#f4f0e7'),
};
const SHUTTER = hexRgb('#8c8a84');
const DOOR = hexRgb('#6b4e3a');
const AC = hexRgb('#e4e0d6');
const TANK = hexRgb('#c9c4b8');

/**
 * Fill colours of the roofs that the residents' white-roof toggle repaints:
 * one rgb array per roof shape, kept by building index, so vgui.js can
 * change them in place (the display list holds the same arrays).
 */
function paintable(world, B, rgb) {
  if (!B.paint) return rgb;
  const c = rgb.slice();
  const m = world.vgFills ?? (world.vgFills = new Map());
  if (!m.has(B.index)) m.set(B.index, { bare: rgb.slice(), fills: [] });
  m.get(B.index).fills.push(c);
  return c;
}

/** Shade hatching on the south and east faces (one item per face, drawn only when the face is turned from the sun). */
function hatch(pen, x0, y0, x1, y1, h, step = 1.6) {
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
    const segs = [];
    for (let t = 1.2; t < len + h; t += step) {
      const a = Math.max(0, t - h);
      const b = Math.min(len, t);
      if (b - a >= 0.5) segs.push([P(a, t - a), P(b, t - b)]);
    }
    if (segs.length) pen.lines(segs, { lw: 0.4, a: 0.28, over: 0.1, t: face === 'S' ? 'hatchS' : 'hatchE' });
  }
}

/** A corrugated sheet roof over (x0, y0)-(x1, y1) at height h, ridges along y (one shape and one lines item). */
function sheet(pen, world, B, x0, y0, x1, y1, h, kind) {
  const rgb = paintable(world, B, jitter(VG_ROOF[kind], B.index * 5, 0.07));
  pen.tag = 'r';
  pen.shape([[x0 - 0.2, y0 - 0.2, h], [x1 + 0.2, y0 - 0.2, h], [x1 + 0.2, y1 + 0.2, h], [x0 - 0.2, y1 + 0.2, h]], rgb, { lw: 0.8, t: 'r' });
  pen.tag = 'rd';
  const segs = [];
  if (kind === 'tarpRoof') {
    // a tarpaulin sags between its frame: a few slack lines across, a rope at the edge
    for (let y = y0 + 1.5; y < y1 - 0.5; y += 2.5) segs.push([[x0, y, h], [(x0 + x1) / 2, y + 0.4, h], [x1, y, h]]);
  } else {
    const step = kind === 'asbestosRoof' ? 0.9 : 0.6;
    for (let x = x0 + step / 2; x < x1; x += step) segs.push([[x, y0, h], [x, y1, h]]);
  }
  pen.lines(segs, { lw: 0.32, a: kind === 'whiteTinAged' || kind === 'whiteTin' ? 0.25 : 0.38, over: 0, t: 'rd' });
}

/**
 * A village house (block 10): one plot, six to eight storeys of rented
 * rooms and flats, windows in a regular grid with a few air-conditioner
 * boxes, a door or (on Market Lane) shop shutters, a flat concrete roof with
 * a parapet, sometimes a water tank, and its rooftop room if it has one.
 */
export function villageHouse(pen, B, world, rooms) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.05);
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 1.05, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 1.05, t: 'w' });
  hatch(pen, x0, y0, x1, y1, h, 2.2);
  const storeys = B.storeys ?? Math.round(h / 3);
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
    const cols = Math.max(2, Math.floor(len / 4.2));
    const pitch = len / cols;
    const panes = [];
    const acs = [];
    const shop = B.shopFace === face;
    for (let st = shop ? 1 : 0; st < storeys; st++) {
      const zb = st * 3 + 1;
      for (let c = 0; c < cols; c++) {
        const a = c * pitch + (pitch - 1.3) / 2;
        panes.push([P(a, zb), P(a + 1.3, zb), P(a + 1.3, zb + 1.4), P(a, zb + 1.4)]);
        if (st > 0 && hash3(B.index, st * 7 + c, face === 'S' ? 31 : 32) < 0.18) acs.push([P(a + 1.4, zb - 0.1), P(a + 2.1, zb - 0.1), P(a + 2.1, zb + 0.45), P(a + 1.4, zb + 0.45)]);
      }
    }
    pen.tag = 'win';
    pen.shapes(panes, { k: 'win', h: hash3(B.index * 7 + (face === 'S' ? 0 : 1), 3), c: WIN }, { lw: 0.45, over: 0.3, t: 'win' });
    if (acs.length) pen.shapes(acs, AC, { lw: 0.4, over: 0.2, t: 'o' });
    if (shop) {
      const sh = [];
      for (let c = 0; c < cols; c++) sh.push([P(c * pitch + 0.4, 0), P((c + 1) * pitch - 0.4, 0), P((c + 1) * pitch - 0.4, 2.5), P(c * pitch + 0.4, 2.5)]);
      pen.shapes(sh, { k: 'win', h: hash3(B.index, face === 'S' ? 41 : 42), c: scaleRgb(SHUTTER, 1.1), shop: true }, { lw: 0.5, t: 'win' });
    } else if (face === 'S' || hash3(B.index, 43) < 0.5) {
      const s = len * (0.25 + 0.5 * hash3(B.index, face === 'S' ? 44 : 45));
      pen.shape([P(s, 0), P(s + 1.1, 0), P(s + 1.1, 2.2), P(s, 2.2)], DOOR, { lw: 0.55, t: 'win' });
    }
  }
  // roof: parapet top, the deck inset below it, a water tank on some
  pen.tag = 'r';
  const p = 0.5;
  const slab = jitter(VG_ROOF.slabRoof, B.index * 5, 0.06);
  pen.shape([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], scaleRgb(slab, 1.1), { lw: 1, t: 'r' });
  pen.shape([[x0 + p, y0 + p, h - 0.1], [x1 - p, y0 + p, h - 0.1], [x1 - p, y1 - p, h - 0.1], [x0 + p, y1 - p, h - 0.1]], slab, { lw: 0.45, a: 0.7, t: 'r' });
  if (hash3(B.index, 46) < 0.45) {
    const tx = x0 + 1.5 + (x1 - x0 - 5) * hash3(B.index, 47);
    const ty = y0 + 1.5 + (y1 - y0 - 5) * hash3(B.index, 48);
    if (!rooms.some((R) => tx < R.x1 && tx + 2 > R.x0 && ty < R.y1 && ty + 2 > R.y0)) box(pen, tx, ty, tx + 2, ty + 2, h, h + 1.6, TANK, { t: 'rd', lw: 0.5 });
  }
  pen.b = -1;
  for (const R of rooms) roofRoom(pen, R, world, h);
}

/** A rooftop room: walls from its house's roof (z0) up to its own roof, a corrugated sheet roof, a door. */
function roofRoom(pen, R, world, z0) {
  pen.b = R.index;
  const { x0, y0, x1, y1, h } = R;
  const wall = jitter(hexRgb(R.wall), R.index * 3, 0.06);
  pen.tag = 'w';
  pen.shape([[x0, y1, z0], [x1, y1, z0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 0.8, t: 'w' });
  pen.shape([[x1, y1, z0], [x1, y0, z0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 0.8, t: 'w' });
  pen.tag = 'win';
  pen.shape([[x0 + 1.2, y1, z0], [x0 + 2.1, y1, z0], [x0 + 2.1, y1, z0 + 2], [x0 + 1.2, y1, z0 + 2]], DOOR, { lw: 0.5, t: 'win' });
  sheet(pen, world, R, x0, y0, x1, y1, h, R.roof);
  pen.b = -1;
}

/** An older village house (block 10): three or four storeys, a flat roof. */
function oldHouse(pen, B, world) {
  villageHouse(pen, B, world, []);
}

/** A run of single-storey rooms under one sheet roof (block 10's low-rise edge): low walls, a door and a small window per room. */
export function edgeRooms(pen, B, world) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.07);
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 0.9, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 0.9, t: 'w' });
  hatch(pen, x0, y0, x1, y1, h, 1.8);
  const rooms = Math.max(1, Math.round((x1 - x0) / 3.6));
  const w = (x1 - x0) / rooms;
  const doors = [];
  const panes = [];
  const lines = [];
  for (let k = 0; k < rooms; k++) {
    const a = x0 + k * w;
    doors.push([[a + 0.5, y1, 0], [a + 1.4, y1, 0], [a + 1.4, y1, 1.95], [a + 0.5, y1, 1.95]]);
    if (w > 2.8) panes.push([[a + 1.9, y1, 1.1], [a + 2.7, y1, 1.1], [a + 2.7, y1, 1.8], [a + 1.9, y1, 1.8]]);
    if (k) lines.push([[a, y1, 0], [a, y1, h]]);
  }
  pen.tag = 'win';
  pen.shapes(doors, DOOR, { lw: 0.45, t: 'win' });
  if (panes.length) pen.shapes(panes, { k: 'win', h: hash3(B.index, 51), c: WIN }, { lw: 0.4, over: 0.2, t: 'win' });
  if (lines.length) pen.lines(lines, { lw: 0.35, a: 0.4, over: 0, t: 'w' });
  sheet(pen, world, B, x0, y0, x1, y1, h, B.roof);
  pen.b = -1;
}

/** Rooftop rooms by the id of their house (built once per world). */
function roomsByHouse(world) {
  if (!world.vgRooms) {
    world.vgRooms = new Map();
    for (const B of world.buildings) if (B.on) (world.vgRooms.get(B.on) ?? world.vgRooms.set(B.on, []).get(B.on)).push(B);
  }
  return world.vgRooms;
}

/** kit.js object hook: the block's houses and rooms (the ancestral hall and the trees are kit.js's own). */
function objects(pen, ob, world) {
  if (ob.kind !== 'b') return false;
  const B = ob.o;
  if (B.style === 'roofRoom') return true; // drawn with its house, after it
  if (B.style === 'village') villageHouse(pen, B, world, roomsByHouse(world).get(B.id) ?? []);
  else if (B.style === 'old') oldHouse(pen, B, world);
  else if (B.style === 'room') edgeRooms(pen, B, world);
  else return false;
  return true;
}

/** Ground marks: the market lane's stall line and the alleys' drain covers. */
function decor(pen, world) {
  pen.tag = 'gm';
  const ink = hexRgb('#8f8676');
  const segs = [];
  for (const L of world.scene.lanes) {
    if (L.zone !== 'edge') continue;
    for (let s = L.a0 + 3; s < L.a1 - 1; s += 6) segs.push(L.axis === 'x' ? [[s, L.c, 0], [s + 1.2, L.c, 0]] : [[L.c, s, 0], [L.c, s + 1.2, 0]]);
  }
  if (segs.length) pen.lines(segs, { lw: 0.4, stroke: ink, a: 0.5, over: 0, t: 'gm' });
}

/** The block-10 drawing hooks for kit.js (world.draw). */
export const VG_DRAW = { objects, decor };

// ---- the "under the roof" overlay -------------------------------------------------------

const INK_RGB = hexRgb('#3a2f28');

/** A bottom label box (as the other blocks' overlay labels). */
function label(R, ctx, text, W, H) {
  const d = R.dpr;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const by = H - 84 * d;
  const bx = labelX(R, w, W, by);
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(INK_RGB, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(INK_RGB);
  ctx.fillText(text, bx, by);
}

/**
 * Block 10 (look.under): every sheet roof washed in the heat palette by the
 * indoor radiant proxy of the room beneath it at this hour, with a label.
 * Pure function of camera and hour (R.village.under(hq) is cached per hour).
 */
export function drawUnder(R, ctx, cam, W, H, alpha, hq) {
  const E = R.village;
  const [ox, oy, Z] = R.origin(cam, W, H);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha * 0.9;
  ctx.lineWidth = Math.max(0.8 * R.dpr, 0.1 * Z);
  ctx.strokeStyle = rgbCss(INK_RGB, 0.8);
  let n = 0;
  const P = (x, y, z) => {
    const q = iso(x, y, z);
    return [ox + q[0] * Z, oy + q[1] * Z];
  };
  for (const u of E.under(hq).rows) {
    const B = E.buildings[u.b];
    const c = P((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.h);
    if (c[0] < -200 || c[0] > W + 200 || c[1] < -200 || c[1] > H + 200) continue;
    ctx.beginPath();
    [[B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1], [B.x0, B.y1]].forEach(([x, y], k) => {
      const [X, Y] = P(x, y, B.h + 0.05);
      if (k) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = rgbCss(R.heatOf(u.radiant, hq));
    ctx.fill();
    ctx.stroke();
    n++;
  }
  ctx.globalAlpha = alpha;
  const s = E.under(hq).summary;
  const text = `Under the roof (O): the warmth the room's ceiling and walls give off under the sheet roofs at ${E.hm(hq)}, an estimate · bare rusty iron ${s.rust} °C · white-painted ${s.white} °C · outdoor air ${s.air} °C`;
  label(R, ctx, text, W, H);
  R.stats.under = n;
  R.stats.underLabel = text;
  ctx.restore();
}

/** Renderer overlay hook (render.js R.overlay): the under-the-roof wash when shown. */
export function vgOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  R.stats.under = 0;
  if (R.village && look.under) drawUnder(R, ctx, cam, W, H, alpha, hq);
}
