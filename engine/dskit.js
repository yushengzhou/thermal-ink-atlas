// dskit: what the pen draws for block 11 (desert courtyard neighbourhood)
// only: the stucco courtyard houses (four wings around a courtyard, flat
// roofs with a parapet and a rain spout), the shops and their arcade, the
// shade sails on masts, the ramada, the café patio with its misters, the
// mesquite and palo verde trees, the gravel and lawn marks and the coated
// street; and the "water used" overlay. kit.js reaches the drawing through
// world.draw (set by desert.js prepWorld); the overlay is the renderer's
// R.overlay (set by dsui.js dsApp), so the other pages do not carry this code.
import { hash3, hexRgb, scaleRgb, mixRgb, iso, rgbCss, clamp, makeRng } from './core.js';
import { box, jitter, WIN, ROOF_RGB } from './kit.js';
import { HAND_FONT } from './render.js';

const DOOR = hexRgb('#7a5638');
const STEEL = hexRgb('#5e6166');
const WOOD = hexRgb('#8a6a4a');
const SAIL = ['#efe8d8', '#e7d9b8', '#e9e2d0'].map(hexRgb);
const MESQ = [hexRgb('#6b7d4a'), hexRgb('#7d8f55'), hexRgb('#93a465'), hexRgb('#a7b577')];
const PALO = [hexRgb('#94a35a'), hexRgb('#a5b264'), hexRgb('#b6c072'), hexRgb('#c4cc86')];
const GREEN_BARK = hexRgb('#8a9a55');
/** Colours of the coated and the bare street (the coating toggle repaints the layer in place). */
export const DS_STREET = { coated: hexRgb('#b9b5ad'), bare: hexRgb('#8d8882') };

/** Shade hatching on the south and east faces (one item per face). */
function hatch(pen, x0, y0, x1, y1, z0, h, step = 1.6) {
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z0 + z] : [x1, y1 - u, z0 + z]);
    const segs = [];
    for (let t = 1.2; t < len + h; t += step) {
      const a = Math.max(0, t - h);
      const b = Math.min(len, t);
      if (b - a >= 0.5) segs.push([P(a, t - a), P(b, t - b)]);
    }
    if (segs.length) pen.lines(segs, { lw: 0.4, a: 0.22, over: 0.1, t: face === 'S' ? 'hatchS' : 'hatchE' });
  }
}

/** One wing of a courtyard house: stucco walls (S and E faces), small deep windows, a door on the street side, a flat roof with a parapet and a spout. */
function wing(pen, B) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.04);
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 1, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 1, t: 'w' });
  hatch(pen, x0, y0, x1, y1, 0, h, 2.2);
  const panes = [];
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
    const cols = Math.max(1, Math.floor(len / 6));
    for (let st = 0; st < (B.storeys ?? 1); st++) {
      for (let c = 0; c < cols; c++) {
        if (hash3(B.index, st * 5 + c, face === 'S' ? 61 : 62) < 0.35) continue;
        const a = ((c + 0.5) * len) / cols - 0.5;
        const zb = st * 3 + 1.3;
        panes.push([P(a, zb), P(a + 1, zb), P(a + 1, zb + 1.1), P(a, zb + 1.1)]);
      }
    }
    if ((B.wing === 's' && face === 'S') || (B.wing === 'e' && face === 'E')) {
      const s = len * 0.45;
      pen.tag = 'win';
      pen.shape([P(s, 0), P(s + 1.4, 0), P(s + 1.4, 2.3), P(s, 2.3)], DOOR, { lw: 0.55, t: 'win' });
    }
  }
  pen.tag = 'win';
  if (panes.length) pen.shapes(panes, { k: 'win', h: hash3(B.index, 63), c: WIN }, { lw: 0.45, over: 0.2, t: 'win' });
  roof(pen, B, 0.4);
  pen.b = -1;
}

/** A flat roof with a parapet: the parapet top and the deck inset below it, and a rain spout. */
function roof(pen, B, p) {
  const { x0, y0, x1, y1, h } = B;
  pen.tag = 'r';
  const deck = jitter(ROOF_RGB[B.roof] ?? ROOF_RGB.coolroofAged, B.index * 5, 0.05);
  pen.shape([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], scaleRgb(deck, 1.04), { lw: 0.95, t: 'r' });
  pen.shape([[x0 + p, y0 + p, h - 0.1], [x1 - p, y0 + p, h - 0.1], [x1 - p, y1 - p, h - 0.1], [x0 + p, y1 - p, h - 0.1]], deck, { lw: 0.4, a: 0.6, t: 'r' });
  pen.tag = 'rd';
  const sx = x0 + (x1 - x0) * (0.3 + 0.4 * hash3(B.index, 64));
  pen.line([[sx, y1, h - 0.4], [sx, y1 + 0.7, h - 0.5]], { lw: 0.9, stroke: WOOD, a: 0.9, over: 0.05, t: 'rd' });
}

/** The shops: two storeys of shopfronts behind the arcade, a parapet roof. */
function shops(pen, B) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.04);
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 1.05, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 1.05, t: 'w' });
  hatch(pen, x0, y0, x1, y1, 0, h, 2);
  const fronts = [];
  const upper = [];
  for (let x = x0 + 1; x < x1 - 5; x += 7) {
    fronts.push([[x + 0.6, y1, 0], [x + 5.4, y1, 0], [x + 5.4, y1, 2.7], [x + 0.6, y1, 2.7]]);
    upper.push([[x + 1.5, y1, 4.4], [x + 4.5, y1, 4.4], [x + 4.5, y1, 5.8], [x + 1.5, y1, 5.8]]);
  }
  pen.tag = 'win';
  pen.shapes(fronts, { k: 'win', h: hash3(B.index, 65), c: scaleRgb(WIN, 1.12), shop: true }, { lw: 0.5, t: 'win' });
  pen.shapes(upper, { k: 'win', h: hash3(B.index, 66), c: WIN }, { lw: 0.45, over: 0.2, t: 'win' });
  roof(pen, B, 0.5);
  pen.b = -1;
}

/** A shade sail on four masts: pale cloth, two corners high and two low, seams across. */
function sail(pen, P, i) {
  const { x0, y0, x1, y1, z } = P;
  const posts = [[x0, y0, z + 0.8], [x1, y0, z - 0.4], [x1, y1, z + 0.8], [x0, y1, z - 0.4]];
  pen.tag = 'trunk';
  pen.lines(posts.map(([x, y, zz]) => [[x, y, 0], [x, y, zz + 0.3]]), { lw: 0.9, stroke: STEEL, a: 0.95, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape(posts, jitter(SAIL[i % SAIL.length], i * 17, 0.03), { lw: 0.9, t: 'tree', a: 0.7 });
  const seams = [];
  for (let k = 1; k < 5; k++) {
    const u = k / 5;
    seams.push([[x0 + (x1 - x0) * u, y0, z + 0.8 - 1.2 * u], [x0 + (x1 - x0) * u, y1, z - 0.4 + 1.2 * u]]);
  }
  pen.lines(seams, { lw: 0.3, a: 0.3, over: 0, t: 'treeTick' });
}

/** A flat roof on posts (the ramada, the arcade, the café patio): posts every few metres, a fascia, a roof deck. */
function roofOnPosts(pen, P, i, step, deck) {
  const { x0, y0, x1, y1, z } = P;
  const posts = [];
  const lineY = P.kind === 'arcadeRoof' ? [y1] : [y0, y1];
  for (const y of lineY) for (let x = x0 + 0.4; x <= x1 - 0.3; x += step) posts.push([[x, y, 0], [x, y, z]]);
  if (P.kind !== 'arcadeRoof') for (const x of [x0 + 0.4, x1 - 0.4]) for (let y = y0 + step; y < y1 - 1; y += step) posts.push([[x, y, 0], [x, y, z]]);
  pen.tag = 'trunk';
  pen.lines(posts, { lw: P.kind === 'arcadeRoof' ? 1.3 : 0.9, stroke: P.kind === 'arcadeRoof' ? scaleRgb(hexRgb('#e6d5bb'), 0.8) : WOOD, a: 0.95, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], jitter(deck, i * 13, 0.04), { lw: 0.95, t: 'tree', a: 0.85 });
  pen.shape([[x0, y1, z], [x1, y1, z], [x1, y1, z - 0.35], [x0, y1, z - 0.35]], scaleRgb(deck, 0.82), { lw: 0.6, t: 'tree', a: 0.9 });
  if (P.kind === 'ramada' && !P.patio) {
    const slats = [];
    for (let x = x0 + 1; x < x1; x += 1.2) slats.push([[x, y0, z + 0.02], [x, y1, z + 0.02]]);
    pen.lines(slats, { lw: 0.3, a: 0.35, over: 0, t: 'treeTick' });
  }
  if (P.patio) {
    // café tables and the mister line under the roof edge (drawn, not modelled)
    pen.tag = 'o';
    for (let x = x0 + 3; x < x1 - 2; x += 6) box(pen, x - 0.5, y0 + 4.5, x + 0.5, y0 + 5.5, 0.7, 0.75, hexRgb('#c9c3b5'), { t: 'o', lw: 0.4 });
    pen.tag = 'gm';
    const mist = [];
    for (let x = x0 + 1; x < x1; x += 2) mist.push([[x, y1 - 0.3, z - 0.5], [x - 0.3, y1 + 0.2, z - 1.4]], [[x, y1 - 0.3, z - 0.5], [x + 0.4, y1 + 0.2, z - 1.5]]);
    pen.lines(mist, { lw: 0.35, stroke: hexRgb('#8fb3bf'), a: 0.6, over: 0, t: 'treeTick' });
  }
}

/** A desert tree: mesquite (several leaning trunks, a wide, low, airy crown) or palo verde (a green trunk, a thin yellow-green crown). */
function desertTree(pen, T, i) {
  const { x, y, r, zc } = T;
  const palo = T.species === 'paloVerde';
  pen.tag = 'trunk';
  const trunks = [];
  const nt = palo ? 2 : 3;
  for (let k = 0; k < nt; k++) {
    const a = (k / nt) * Math.PI * 2 + hash3(i, k, 71);
    trunks.push([[x, y, 0], [x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35, zc - r * 0.15]]);
  }
  pen.lines(trunks, { lw: palo ? 1 : 1.2, stroke: palo ? GREEN_BARK : hexRgb('#5f4a3a'), a: 0.95, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  const L = palo ? PALO : MESQ;
  const blobs = [];
  const n = 7 + Math.floor(hash3(i, 72) * 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash3(i, k, 73) * 0.7;
    const d = r * (0.5 + 0.2 * hash3(i, k, 74));
    blobs.push([Math.cos(a) * d, Math.sin(a) * d, (hash3(i, k, 75) - 0.5) * r * 0.25, r * (0.36 + 0.1 * hash3(i, k, 76))]);
  }
  blobs.push([0, 0, r * 0.15, r * 0.5]);
  blobs.sort((p, q) => p[0] + p[1] + p[2] * 0.6 - (q[0] + q[1] + q[2] * 0.6));
  blobs.forEach(([dx, dy, dz, rr], k) => {
    const lit = (dz / r + 0.6 - (dx + dy) / (3 * r)) * 1.4;
    const c = L[Math.max(0, Math.min(3, Math.round(lit + 1)))];
    pen.blob([x + dx, y + dy, zc + dz], rr, jitter(c, i * 29 + k, 0.08), { lw: 0.6, t: 'tree', lumpy: 0.12, a: palo ? 0.8 : 0.88 });
  });
  pen.tag = 'gm';
  const ticks = [];
  for (let k = 0; k < 5; k++) {
    const dx = (hash3(i, k, 77) - 0.5) * r * 1.2;
    const dy = (hash3(i, k, 78) - 0.5) * r * 1.2;
    const z = zc + r * 0.1 + hash3(i, k, 79) * r * 0.3;
    ticks.push([[x + dx, y + dy, z], [x + dx + 0.3, y + dy - 0.3, z + 0.2]]);
  }
  pen.lines(ticks, { lw: 0.45, a: 0.55, over: 0.1, t: 'treeTick' });
}

/** kit.js object hook: the block's houses, shops, screens and trees. */
function objects(pen, ob, world) {
  if (ob.kind === 'b') {
    if (ob.o.style === 'court') wing(pen, ob.o);
    else if (ob.o.style === 'shops') shops(pen, ob.o);
    else return false;
    return true;
  }
  if (ob.kind === 'p') {
    const P = ob.o;
    if (P.kind === 'desertSail') sail(pen, P, ob.i);
    else if (P.kind === 'arcadeRoof') roofOnPosts(pen, P, ob.i, 5.5, hexRgb('#e2d3b9'));
    else if (P.kind === 'ramada') roofOnPosts(pen, P, ob.i, P.patio ? 7.5 : 5, P.patio ? hexRgb('#c8a37a') : hexRgb('#b08b63'));
    else return false;
    return true;
  }
  if (ob.kind === 't' && ob.o.species) {
    desertTree(pen, ob.o, ob.i);
    return true;
  }
  return false;
}

/** Many short ink ticks in one item (gravel grit or grass blades), inside the parcels of a material. */
function ticks(pen, world, mat, count, seed, ink, shape) {
  const r = makeRng(seed);
  const segs = [];
  for (let k = 0; k < count; k++) {
    const x = r() * world.size;
    const y = r() * world.size;
    const f = world.fine.mat[Math.floor(y / 2) * world.fine.n + Math.floor(x / 2)];
    if (world.matIds[f] !== mat || world.buildingAt(x, y) >= 0) continue;
    segs.push(shape(x, y, r));
  }
  pen.tag = 'gm';
  if (segs.length) pen.lines(segs, { lw: 0.45, stroke: ink, a: 0.5, over: 0, t: 'gm' });
}

/**
 * Ground marks: gravel grit, lawn blades, the coating layer on Main Street
 * (one shape whose colour array the coating toggle changes in place:
 * world.dsCoat), its lane marks, and the courtyards' stone edges.
 */
function decor(pen, world) {
  ticks(pen, world, 'gravel', 2600, 1101, hexRgb('#9b8466'), (x, y, r) => [[x, y], [x + 0.25 + r() * 0.3, y + (r() - 0.5) * 0.25]]);
  ticks(pen, world, 'desertLawn', 900, 1102, hexRgb('#55683a'), (x, y) => [[x - 0.35, y + 0.2], [x, y - 0.15], [x + 0.3, y + 0.25]]);
  const g = world.scene.ground.find((p) => p.id === 'main');
  const x = world.scene.ground.find((p) => p.id === 'cross');
  if (g) {
    // one colour array for both halves (either side of the cross street), changed in place by the toggle
    const c = DS_STREET.coated.slice();
    world.dsCoat = c;
    pen.tag = 'g';
    const [y0, y1] = [g.poly[1] + 0.6, g.poly[5] - 0.6];
    for (const [a, b] of x ? [[g.poly[0], x.poly[0]], [x.poly[2], g.poly[2]]] : [[g.poly[0], g.poly[2]]]) pen.shape([[a, y0, 0], [b, y0, 0], [b, y1, 0], [a, y1, 0]], c, { stroke: null, t: 'g' });
  }
  pen.tag = 'gm';
  const edge = [];
  for (const p of world.scene.ground) {
    if (!p.court) continue;
    const [x0, y0, , , x1, y1] = p.poly;
    edge.push([[x0 + 0.6, y0 + 0.6], [x1 - 0.6, y0 + 0.6], [x1 - 0.6, y1 - 0.6], [x0 + 0.6, y1 - 0.6], [x0 + 0.6, y0 + 0.6]]);
  }
  if (edge.length) pen.lines(edge, { lw: 0.4, a: 0.4, over: 0, t: 'gm' });
}

/** The block-11 drawing hooks for kit.js (world.draw). */
export const DS_DRAW = { objects, decor };

// ---- the "water used" overlay ---------------------------------------------------------

const INK_RGB = hexRgb('#2f4a5a');
const WATER_LO = hexRgb('#dfe9ea');
const WATER_HI = hexRgb('#2f6f8f');
/** Colour of a daily water use, L per m2 a day (0 to 8 on a blue ramp). */
export const waterRgb = (L) => mixRgb(WATER_LO, WATER_HI, clamp(L / 8, 0, 1));

/** A bottom label box (as the other blocks' overlay labels). */
function label(R, ctx, text, W, H) {
  const d = R.dpr;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const bx = clamp(W / 2 - w / 2, 8 * d, W - w - 8 * d);
  const by = H - 84 * d;
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(INK_RGB, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(INK_RGB);
  ctx.fillText(text, bx, by);
}

/**
 * Block 11 (look.water): the daily water each kind of ground uses, as a
 * blue wash: the lawn (the model's evaporation), the desert trees' crowns
 * (watering guidance, the middle of its range), the café patio's misters
 * (per hour of misting, shown as one hour), gravel and the sails none.
 * Pure function of the camera (R.desert.water holds the fixed numbers).
 */
export function drawWater(R, ctx, cam, W, H, alpha) {
  const E = R.desert;
  const [ox, oy, Z] = R.origin(cam, W, H);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha * 0.85;
  ctx.lineWidth = Math.max(0.8 * R.dpr, 0.08 * Z);
  ctx.strokeStyle = rgbCss(INK_RGB, 0.8);
  const P = (x, y) => {
    const q = iso(x, y, 0);
    return [ox + q[0] * Z, oy + q[1] * Z];
  };
  let n = 0;
  const poly = (pts, L) => {
    ctx.beginPath();
    pts.forEach(([x, y], k) => {
      const [X, Y] = P(x, y);
      if (k) ctx.lineTo(X, Y);
      else ctx.moveTo(X, Y);
    });
    ctx.closePath();
    ctx.fillStyle = rgbCss(waterRgb(L));
    ctx.fill();
    ctx.stroke();
    n++;
  };
  const w = E.water;
  for (const g of E.lawns) poly([[g[0], g[1]], [g[2], g[1]], [g[2], g[3]], [g[0], g[3]]], w.lawn);
  const tw = (w.trees[0] + w.trees[1]) / 2;
  for (const t of E.trees) {
    const pts = [];
    for (let k = 0; k < 14; k++) pts.push([t.x + Math.cos((k / 14) * 2 * Math.PI) * t.r, t.y + Math.sin((k / 14) * 2 * Math.PI) * t.r]);
    poly(pts, tw);
  }
  for (const p of E.patios) poly([[p.x0, p.y0], [p.x1, p.y0], [p.x1, p.y1], [p.x0, p.y1]], (w.misters[0] + w.misters[1]) / 2);
  ctx.globalAlpha = alpha;
  const text = `Water (L), litres per m² a day: lawn ${w.lawn.toFixed(1)} (calculated) · desert trees ${w.trees[0]}–${w.trees[1]} · misters ${w.misters[0]}–${w.misters[1]} per hour on · gravel, sails 0`;
  label(R, ctx, text, W, H);
  R.stats.water = n;
  R.stats.waterLabel = text;
  ctx.restore();
}

/** Renderer overlay hook (render.js R.overlay): the water wash when shown. */
export function dsOverlay(R, ctx, f, cam, W, H, alpha, look) {
  R.stats.water = 0;
  if (R.desert && look.water) drawWater(R, ctx, cam, W, H, alpha);
}
