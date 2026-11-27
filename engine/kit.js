// kit: things the pen knows how to draw (ground, buildings, roofs, trees,
// cars, benches, lamps). Everything is in world metres; variation comes from
// hash3() keyed by object index, so the drawing is the same every load.
import { hash3, hexRgb, mixRgb, scaleRgb, makeRng } from './core.js';
import { depthOrder, shopSegments } from './world.js';
import { Pen } from './pen.js';

export const GROUND_RGB = {
  concrete: hexRgb('#dcd4c3'),
  asphalt: hexRgb('#8d8882'),
  stone: hexRgb('#e3d7bb'),
  grass: hexRgb('#a9b97a'),
  water: hexRgb('#87adb2'),
  pavers: hexRgb('#c9b9a0'),
  porousAsphalt: hexRgb('#77726d'),
  coolPaveAged: hexRgb('#aaa59c'),
  coolPaveNew: hexRgb('#bdb8ae'),
  raingarden: hexRgb('#8fa56a'),
};
export const ROOF_RGB = {
  membrane: hexRgb('#5c5e66'),
  metal: hexRgb('#6c5f5a'),
  coolroof: hexRgb('#f3efe6'),
  coolroofNew: hexRgb('#f3efe6'),
  coolroofAged: hexRgb('#ddd8cc'),
  greenroof: hexRgb('#93a865'),
};
const SOIL = hexRgb('#b49a77');
const WIN = hexRgb('#5f7480');
const AWNINGS = ['#b5533c', '#3f6e6a', '#c9973f', '#5b6b8c', '#8e4b5e'].map(hexRgb);

const jitter = (c, k, amt = 0.06) => scaleRgb(c, 1 + (hash3(k, 77) - 0.5) * amt);

// ---- ground -----------------------------------------------------------------

function sidewalkJoints(pen, x0, y0, x1, y1, along, step = 3) {
  pen.tag = 'gm';
  if (along === 'x') {
    for (let x = x0 + step; x < x1; x += step) pen.line([[x, y0], [x, y1]], { lw: 0.45, a: 0.35, over: 0.3 });
  } else {
    for (let y = y0 + step; y < y1; y += step) pen.line([[x0, y], [x1, y]], { lw: 0.45, a: 0.35, over: 0.3 });
  }
}

function cracks(pen, x0, y0, x1, y1, count, seed) {
  const r = makeRng(seed);
  pen.tag = 'gm';
  for (let i = 0; i < count; i++) {
    let x = x0 + r() * (x1 - x0);
    let y = y0 + r() * (y1 - y0);
    const pts = [[x, y]];
    const a0 = r() * Math.PI * 2;
    for (let s = 0; s < 4; s++) {
      const a = a0 + (r() - 0.5) * 1.6;
      x += Math.cos(a) * (0.8 + r() * 1.6);
      y += Math.sin(a) * (0.8 + r() * 1.6);
      pts.push([Math.min(x1, Math.max(x0, x)), Math.min(y1, Math.max(y0, y))]);
    }
    pen.line(pts, { lw: 0.5, a: 0.55, over: 0.2 });
  }
}

function patches(pen, x0, y0, x1, y1, count, seed) {
  const r = makeRng(seed);
  pen.tag = 'gm';
  for (let i = 0; i < count; i++) {
    const w = 2 + r() * 5;
    const h = 1.5 + r() * 3;
    const x = x0 + r() * (x1 - x0 - w);
    const y = y0 + r() * (y1 - y0 - h);
    const c = scaleRgb(GROUND_RGB.asphalt, 0.82 + r() * 0.08);
    pen.shape([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c, { lw: 0.4, a: 0.5, t: 'gm' });
  }
}

function centreDashes(pen, a, b, fixed, along) {
  pen.tag = 'gm';
  for (let s = a + 2; s + 3 < b; s += 7) {
    const p = along === 'x' ? [[s, fixed], [s + 3, fixed]] : [[fixed, s], [fixed, s + 3]];
    pen.line(p, { lw: 1.3, stroke: hexRgb('#efe8d6'), a: 0.7, over: 0.1 });
  }
}

function crossing(pen, x0, y0, x1, y1, along) {
  // zebra stripes: along = direction the stripes run
  pen.tag = 'gm';
  const paint = hexRgb('#eee7d5');
  if (along === 'y') {
    for (let x = x0; x + 0.6 < x1; x += 1.4) pen.shape([[x, y0], [x + 0.7, y0], [x + 0.7, y1], [x, y1]], paint, { stroke: null, a: 0.8 });
  } else {
    for (let y = y0; y + 0.6 < y1; y += 1.4) pen.shape([[x0, y], [x1, y], [x1, y + 0.7], [x0, y + 0.7]], paint, { stroke: null, a: 0.8 });
  }
}

function groundEllipse(pen, cx, cy, rx, ry, fill, opts = {}) {
  const pts = [];
  const n = opts.n ?? 24;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, opts.z ?? 0]);
  }
  return pen.shape(pts, fill, opts);
}

export function drawGround(pen, world) {
  const S = world.size;
  pen.layer = 0;
  pen.b = -1;
  // diorama slab: the cut edges of the block
  pen.tag = 'slab';
  pen.shape([[0, S, 0], [S, S, 0], [S, S, -7], [0, S, -7]], scaleRgb(SOIL, 0.92), { lw: 1.2 });
  pen.shape([[S, S, 0], [S, 0, 0], [S, 0, -7], [S, S, -7]], scaleRgb(SOIL, 0.8), { lw: 1.2 });
  pen.tag = 'gm';
  pen.line([[0, S, -2.4], [S, S, -2.6], [S, 0, -2.4]], { lw: 0.5, a: 0.5 });
  pen.line([[0, S, -4.8], [S, S, -4.6], [S, 0, -4.9]], { lw: 0.5, a: 0.4 });

  for (const g of world.scene.ground) {
    pen.tag = 'g';
    const pts = [];
    for (let i = 0; i < g.poly.length; i += 2) pts.push([g.poly[i], g.poly[i + 1], 0]);
    const fill = jitter(GROUND_RGB[colourId(world, g.mat)], g.id.length * 13 + pts.length, 0.04);
    let opts = { stroke: null };
    if (g.street) {
      // ink the two curbs only
      opts = g.street === 'ew' ? { edges: [true, false, true, false], lw: 1.1 } : { edges: [false, true, false, true], lw: 1.1 };
    } else if (g.id === 'park' || g.id === 'gardens' || g.id === 'carpark' || g.outline) opts = { lw: 1 };
    else if (g.mat === 'raingarden') opts = { lw: 0.7, a: 0.7 };
    else if (g.mat === 'water') opts = { lw: 1.3 };
    else if (g.mat === 'stone') opts = { lw: 0.5, a: 0.45 };
    else if (g.id === 'yards') opts = { lw: 1.4 };
    pen.shape(pts, fill, { ...opts, t: 'g' });
  }

  if (world.scene.decor) drawDecor(pen, world, world.scene.decor);
  else asphaltParkDecor(pen, world);
}

/** Material id used for colours (aliases such as coolPave resolve per state). */
const colourId = (world, id) => (world.colours && world.colours[id]) || id;

/** Block 1 (asphalt-park) street character, lawn texture, pond and plaza. */
function asphaltParkDecor(pen, world) {
  // street character: old Kiln Street gets patches and cracks
  patches(pen, 4, 151, 396, 169, 16, 11);
  cracks(pen, 2, 151, 398, 169, 38, 12);
  cracks(pen, 2, 291, 398, 299, 10, 13);
  cracks(pen, 126, 2, 139, 398, 12, 14);
  cracks(pen, 276, 2, 289, 398, 12, 15);
  centreDashes(pen, 0, 120, 160, 'x');
  centreDashes(pen, 145, 270, 160, 'x');
  centreDashes(pen, 295, 400, 160, 'x');
  centreDashes(pen, 0, 145, 132.5, 'y');
  centreDashes(pen, 175, 285, 132.5, 'y');
  centreDashes(pen, 305, 400, 132.5, 'y');
  centreDashes(pen, 0, 145, 282.5, 'y');
  centreDashes(pen, 175, 285, 282.5, 'y');
  centreDashes(pen, 305, 400, 282.5, 'y');
  crossing(pen, 126, 146, 139, 149.5, 'y');
  crossing(pen, 120.5, 151, 124, 169, 'x');
  crossing(pen, 276, 170.5, 289, 174, 'y');
  crossing(pen, 290.5, 151, 294, 169, 'x');
  crossing(pen, 145.5, 291, 149, 299, 'x');

  // sidewalks
  for (const [x0, x1] of [[0, 120], [145, 270], [295, 400]]) {
    sidewalkJoints(pen, x0, 145, x1, 150, 'x');
    sidewalkJoints(pen, x0, 170, x1, 175, 'x');
    sidewalkJoints(pen, x0, 285, x1, 290, 'x');
    if (x0 !== 145) sidewalkJoints(pen, x0, 300, x1, 305, 'x');
  }
  for (const [y0, y1] of [[0, 145], [175, 285], [305, 400]]) {
    for (const [x0, x1] of [[120, 125], [140, 145], [270, 275], [290, 295]]) sidewalkJoints(pen, x0, y0, x1, y1, 'y');
  }
  // manholes
  pen.tag = 'gm';
  for (const [x, y] of [[60, 158], [210, 162], [340, 157], [132, 60], [282, 220], [100, 295]]) {
    groundEllipse(pen, x, y, 0.8, 0.8, scaleRgb(GROUND_RGB.asphalt, 0.75), { lw: 0.6, n: 12, t: 'gm' });
  }
  // car park bays
  for (let x = 154; x <= 262; x += 6) {
    pen.line([[x, 207.5], [x, 213]], { lw: 0.8, stroke: hexRgb('#efe8d6'), a: 0.7 });
    pen.line([[x, 239], [x, 244.5]], { lw: 0.8, stroke: hexRgb('#efe8d6'), a: 0.7 });
  }

  // back yards: speckle, bins and small sheds so the concrete reads as used ground
  const ry = makeRng(33);
  const yards = [[8, 62, 118, 102], [148, 64, 268, 102], [298, 64, 395, 108], [8, 203, 118, 232], [298, 208, 395, 242], [122, 306, 0, 0]];
  pen.tag = 'gm';
  for (const [x0, y0, x1, y1] of yards) {
    if (x1 <= x0) continue;
    for (let i = 0; i < 70; i++) {
      const x = x0 + ry() * (x1 - x0);
      const y = y0 + ry() * (y1 - y0);
      pen.line([[x, y], [x + 0.25 + ry() * 0.4, y + (ry() - 0.5) * 0.3]], { lw: 0.5, a: 0.35, over: 0 });
    }
  }

  // lawn texture
  const r = makeRng(21);
  pen.tag = 'gm';
  const grassInk = hexRgb('#55683a');
  for (let i = 0; i < 520; i++) {
    const inPark = i < 430;
    const x = inPark ? 146 + r() * 123 : 9 + r() * 105;
    const y = inPark ? 306 + r() * 93 : 353 + r() * 41;
    const k = world.fine.mat[Math.floor(y / 2) * world.fine.n + Math.floor(x / 2)];
    if (world.matIds[k] !== 'grass') continue;
    pen.line([[x - 0.35, y + 0.2], [x, y - 0.15], [x + 0.3, y + 0.25]], { lw: 0.5, stroke: grassInk, a: 0.55, over: 0.1 });
  }

  // pond: stone rim, ripples, reeds
  groundEllipse(pen, 232, 360, 17.8, 11.8, null, { lw: 0.7, a: 0.6, t: 'gm' });
  for (const [x, y, w] of [[226, 357, 3], [236, 363, 4], [240, 356, 2.5], [228, 365, 2.5]]) {
    pen.line([[x - w / 2, y], [x, y - 0.25], [x + w / 2, y]], { lw: 0.6, stroke: hexRgb('#e9f0ec'), a: 0.8, over: 0.2 });
  }
  for (const [x, y] of [[217, 356], [218, 363], [246, 366], [244, 352]]) {
    for (let k = 0; k < 4; k++) pen.line([[x + k * 0.5, y, 0], [x + k * 0.6 - 0.3, y, 1.4 + (k % 2) * 0.5]], { lw: 0.5, stroke: hexRgb('#3d5230'), a: 0.8, over: 0.1 });
  }
  // plaza: drinking fountain basin
  groundEllipse(pen, 180, 372, 2.2, 2.2, hexRgb('#cfc2a4'), { lw: 0.8, n: 16, t: 'gm' });
  groundEllipse(pen, 180, 372, 1.2, 1.2, GROUND_RGB.water, { lw: 0.5, n: 12, t: 'gm' });
}

/**
 * Scene-driven ground marks (block 2 on): cracks, patches, centre dashes,
 * crossings, pavement joints, car-park bays, manholes, lawn ticks and a pond
 * rim, plus surface textures for the retrofit materials of the parcels.
 */
export function drawDecor(pen, world, D) {
  const S = world.scene;
  for (const g of S.ground) {
    const m = g.mat;
    const [x0, y0, x1, y1] = bboxOf(g.poly);
    if (m === 'asphalt' && g.street) cracks(pen, x0 + 1, y0 + 1, x1 - 1, y1 - 1, Math.round(((x1 - x0) * (y1 - y0)) / 220), g.id.length * 7 + 3);
    else if (m === 'pavers') paverJoints(pen, x0, y0, x1, y1);
    else if (m === 'porousAsphalt') speckle(pen, x0, y0, x1, y1, Math.round(((x1 - x0) * (y1 - y0)) / 9), 41, hexRgb('#4f4a45'));
    else if (m === 'coolPave') speckle(pen, x0, y0, x1, y1, Math.round(((x1 - x0) * (y1 - y0)) / 16), 43, hexRgb('#e9e4d8'));
    else if (m === 'raingarden') plants(pen, x0, y0, x1, y1, g.id.length * 5 + 1);
  }
  for (const [x0, y0, x1, y1] of D.paving ?? []) stonePaving(pen, x0, y0, x1, y1);
  for (const c of D.cracks ?? []) cracks(pen, ...c);
  for (const p of D.patches ?? []) patches(pen, ...p);
  for (const d of D.dashes ?? []) centreDashes(pen, ...d);
  for (const c of D.crossings ?? []) crossing(pen, ...c);
  for (const [x0, y0, x1, y1, along] of D.joints ?? []) sidewalkJoints(pen, x0, y0, x1, y1, along);
  pen.tag = 'gm';
  for (const [x, y] of D.manholes ?? []) groundEllipse(pen, x, y, 0.8, 0.8, scaleRgb(GROUND_RGB.asphalt, 0.75), { lw: 0.6, n: 12, t: 'gm' });
  for (const [xa, xb, ya, yb] of D.bays ?? []) {
    for (let x = xa; x <= xb; x += 6) pen.line([[x, ya], [x, yb]], { lw: 0.8, stroke: hexRgb('#efe8d6'), a: 0.7 });
  }
  const r = makeRng(S.seed + 21);
  const grassInk = hexRgb('#55683a');
  pen.tag = 'gm';
  for (const [x0, y0, x1, y1, count] of D.lawn ?? []) {
    for (let i = 0; i < count; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = y0 + r() * (y1 - y0);
      const k = world.fine.mat[Math.floor(y / 2) * world.fine.n + Math.floor(x / 2)];
      if (world.matIds[k] !== 'grass') continue;
      pen.line([[x - 0.35, y + 0.2], [x, y - 0.15], [x + 0.3, y + 0.25]], { lw: 0.5, stroke: grassInk, a: 0.55, over: 0.1 });
    }
  }
  if (D.pond) {
    const [cx, cy, rx, ry] = D.pond;
    groundEllipse(pen, cx, cy, rx + 0.8, ry + 0.8, null, { lw: 0.7, a: 0.6, t: 'gm' });
    for (const [dx, dy, w] of [[-6, -3, 3], [4, 3, 4], [8, -4, 2.5]]) {
      pen.line([[cx + dx - w / 2, cy + dy], [cx + dx, cy + dy - 0.25], [cx + dx + w / 2, cy + dy]], { lw: 0.6, stroke: hexRgb('#e9f0ec'), a: 0.8, over: 0.2 });
    }
  }
}

function bboxOf(p) {
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
}

/** Large stone flags: a 3 m grid of joints, offset every other row. */
function stonePaving(pen, x0, y0, x1, y1) {
  pen.tag = 'gm';
  const ink = hexRgb('#9d8f76');
  for (let y = y0 + 3; y < y1; y += 3) pen.line([[x0, y], [x1, y]], { lw: 0.35, stroke: ink, a: 0.35, over: 0 });
  for (let y = y0, row = 0; y < y1; y += 3, row++) {
    for (let x = x0 + (row % 2 ? 1.5 : 3); x < x1; x += 3) pen.line([[x, y], [x, Math.min(y1, y + 3)]], { lw: 0.35, stroke: ink, a: 0.3, over: 0 });
  }
}

/** Permeable pavers: a running-bond grid of joints (gravel-filled, drawn light). */
function paverJoints(pen, x0, y0, x1, y1) {
  pen.tag = 'gm';
  const ink = hexRgb('#8f7f66');
  for (let y = y0 + 2; y < y1; y += 2) pen.line([[x0, y], [x1, y]], { lw: 0.35, stroke: ink, a: 0.4, over: 0 });
  for (let y = y0, row = 0; y < y1; y += 2, row++) {
    for (let x = x0 + (row % 2 ? 2 : 4); x < x1; x += 4) pen.line([[x, y], [x, Math.min(y1, y + 2)]], { lw: 0.35, stroke: ink, a: 0.35, over: 0 });
  }
}

function speckle(pen, x0, y0, x1, y1, count, seed, ink) {
  const r = makeRng(seed);
  pen.tag = 'gm';
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    pen.line([[x, y], [x + 0.3 + r() * 0.3, y + (r() - 0.5) * 0.3]], { lw: 0.5, stroke: ink, a: 0.45, over: 0 });
  }
}

/** Rain garden planting: tufts of grasses and a pebble edge. */
function plants(pen, x0, y0, x1, y1, seed) {
  const r = makeRng(seed);
  pen.tag = 'gm';
  const ink = hexRgb('#46602f');
  for (let x = x0 + 0.8; x < x1; x += 1.6 + r() * 1.2) {
    const y = y0 + 0.8 + r() * (y1 - y0 - 1.6);
    for (let k = -1; k <= 1; k++) pen.line([[x, y, 0], [x + k * 0.35, y - 0.1, 0.9 + r() * 0.5]], { lw: 0.45, stroke: ink, a: 0.75, over: 0 });
  }
}

// ---- boxes, buildings --------------------------------------------------------

/** Generic box: top, south and east faces (the visible ones). */
export function box(pen, x0, y0, x1, y1, z0, z1, rgb, opts = {}) {
  const t = opts.t ?? 'o';
  const lw = opts.lw ?? 0.8;
  pen.shape([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], { k: 'wall', c: rgb, n: [0, 1] }, { lw, t });
  pen.shape([[x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1]], { k: 'wall', c: rgb, n: [1, 0] }, { lw, t });
  pen.shape([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], opts.top ?? scaleRgb(rgb, 1.08), { lw, t: opts.ttop ?? t });
}

function windowsOnFace(pen, B, face, k0) {
  const along = face === 'S' ? B.x1 - B.x0 : B.y1 - B.y0;
  const storeys = Math.max(1, Math.floor((B.h - 0.6) / 3.3));
  const shopFloor = B.shops && face === 'S';
  const pitch = 3.6;
  const n = Math.max(1, Math.floor((along - 1.6) / pitch));
  const margin = (along - n * pitch) / 2;
  const pt = (s, z) => (face === 'S' ? [B.x0 + s, B.y1, z] : [B.x1, B.y1 - s, z]);
  pen.tag = 'win';
  for (let st = shopFloor ? 1 : 0; st < storeys; st++) {
    const zb = st * 3.3 + 1.0;
    for (let i = 0; i < n; i++) {
      const s = margin + i * pitch + (pitch - 1.4) / 2;
      const k = k0 * 1000 + st * 50 + i;
      pen.shape([pt(s, zb), pt(s + 1.4, zb), pt(s + 1.4, zb + 1.7), pt(s, zb + 1.7)], { k: 'win', h: hash3(k, 3), c: WIN }, { lw: 0.55, over: 0.4, t: 'win' });
    }
  }
  if (B.shops && face === 'S') {
    // shopfronts and striped awnings on the ground floor
    shopSegments(B, face).forEach(([a, b], i) => {
      const k = k0 * 1000 + 900 + i;
      pen.shape([pt(a + 0.3, 0.1), pt(b - 0.3, 0.1), pt(b - 0.3, 2.4), pt(a + 0.3, 2.4)], { k: 'win', h: hash3(k, 3), c: scaleRgb(WIN, 1.12), shop: true }, { lw: 0.6, t: 'win' });
      pen.tag = 'o';
      const aw = AWNINGS[Math.floor(hash3(k, 9) * AWNINGS.length)];
      const x0 = B.x0 + a;
      const x1 = B.x0 + b;
      pen.shape([[x0, B.y1, 3.2], [x1, B.y1, 3.2], [x1, B.y1 + 1.6, 2.6], [x0, B.y1 + 1.6, 2.6]], { k: 'wall', c: aw, n: [0, 1] }, { lw: 0.6, t: 'o' });
      pen.shape([[x0, B.y1 + 1.6, 2.6], [x1, B.y1 + 1.6, 2.6], [x1, B.y1 + 1.6, 2.3], [x0, B.y1 + 1.6, 2.3]], { k: 'wall', c: scaleRgb(aw, 0.85), n: [0, 1] }, { lw: 0.5, t: 'o' });
      for (let x = x0 + 0.5; x < x1; x += 1) pen.line([[x, B.y1, 3.2], [x, B.y1 + 1.6, 2.6]], { lw: 0.9, stroke: hexRgb('#efe6d2'), a: 0.55, over: 0, t: 'o' });
      pen.tag = 'win';
    });
  } else {
    // a door on the south face
    const s = along * (0.3 + 0.4 * hash3(k0, 5));
    pen.shape([pt(s, 0), pt(s + 1.3, 0), pt(s + 1.3, 2.3), pt(s, 2.3)], scaleRgb(hexRgb('#6b4e3a'), 1), { lw: 0.6, t: 'win' });
  }
}

/** True if face ('S', 'N', 'E', 'W') of building B is a glass curtain wall. */
export const isGlassFace = (B, face) => !!B.glass && (B.glass === true || B.glass.includes(face));

/**
 * Glass curtain wall: mullions every 3 m, a floor band every 4 m, and a few
 * pale sky streaks; the pane colour depends on the glass type and is resolved
 * when the face is painted (render.js fillOf, fill kind 'glass').
 */
function curtainWall(pen, B, face, k0) {
  const along = face === 'S' ? B.x1 - B.x0 : B.y1 - B.y0;
  const pt = (s, z) => (face === 'S' ? [B.x0 + s, B.y1, z] : [B.x1, B.y1 - s, z]);
  pen.tag = 'mull';
  const nm = Math.max(1, Math.round(along / 3));
  for (let i = 1; i < nm; i++) pen.line([pt((i * along) / nm, 0), pt((i * along) / nm, B.h - 0.6)], { lw: i % 4 === 0 ? 0.5 : 0.3, a: i % 4 === 0 ? 0.55 : 0.32, over: 0.05, t: 'mull' });
  for (let z = 4; z < B.h - 1; z += 4) pen.line([pt(0, z), pt(along, z)], { lw: 0.35, a: 0.4, over: 0.05, t: 'mull' });
  // sky streaks: short diagonal highlights on the panes
  for (let k = 0; k < Math.round(along / 9); k++) {
    const s = along * hash3(k0, k, 21);
    const z = (B.h - 8) * hash3(k0, k, 22) + 3;
    const l = 2 + 4 * hash3(k0, k, 23);
    if (s + l > along) continue;
    pen.line([pt(s, z), pt(s + l, z + l * 0.8)], { lw: 0.8, stroke: hexRgb('#f4f7f6'), a: 0.45, over: 0, t: 'glint' });
  }
  // lobby doors at street level on the south face
  if (face === 'S') {
    const s = along * (0.35 + 0.3 * hash3(k0, 5));
    pen.shape([pt(s, 0), pt(s + 3, 0), pt(s + 3, 3.2), pt(s, 3.2)], scaleRgb(hexRgb('#4e5a61'), 1), { lw: 0.6, t: 'win' });
  }
}

export function building(pen, B, world = null) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.05);
  const roof = jitter(ROOF_RGB[world ? colourId(world, B.roof) : B.roof], B.index * 5, 0.06);
  const gS = isGlassFace(B, 'S');
  const gE = isGlassFace(B, 'E');
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], gS ? { k: 'glass', c: wall, n: [0, 1] } : { k: 'wall', c: wall, n: [0, 1] }, { lw: 1.15, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], gE ? { k: 'glass', c: wall, n: [1, 0] } : { k: 'wall', c: wall, n: [1, 0] }, { lw: 1.15, t: 'w' });
  // shade hatching, drawn only when the face is turned from the sun
  pen.tag = 'hatch';
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const step = h > 45 ? 3.2 : 1.6; // tall towers: sparser hatching
    for (let s = 1.2; s < len + h; s += step) {
      const a = Math.max(0, s - h);
      const b = Math.min(len, s);
      if (b - a < 0.5) continue;
      const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
      pen.line([P(a, s - a), P(b, s - b)], { lw: 0.4, a: 0.28, over: 0.1, t: face === 'S' ? 'hatchS' : 'hatchE' });
    }
  }
  if (gS) curtainWall(pen, B, 'S', B.index * 2);
  else windowsOnFace(pen, B, 'S', B.index * 2);
  if (gE) curtainWall(pen, B, 'E', B.index * 2 + 1);
  else windowsOnFace(pen, B, 'E', B.index * 2 + 1);
  // cornice line
  pen.tag = 'w';
  pen.line([[x0, y1, h - 0.6], [x1, y1, h - 0.6], [x1, y0, h - 0.6]], { lw: 0.5, a: 0.6, t: 'w' });

  pen.tag = 'r';
  if (B.gable) {
    const rise = Math.min(4, (B.gable === 'x' ? y1 - y0 : x1 - x0) * 0.18);
    if (B.gable === 'x') {
      const ym = (y0 + y1) / 2;
      pen.shape([[x0, y0, h], [x1, y0, h], [x1, ym, h + rise], [x0, ym, h + rise]], scaleRgb(roof, 0.85), { lw: 1.1, t: 'r' });
      pen.shape([[x0, ym, h + rise], [x1, ym, h + rise], [x1, y1, h], [x0, y1, h]], roof, { lw: 1.1, t: 'r' });
      pen.shape([[x1, y1, h], [x1, y0, h], [x1, ym, h + rise]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 1.1, t: 'w' });
      pen.tag = 'rd';
      for (let x = x0 + 1.2; x < x1; x += 1.4) pen.line([[x, ym, h + rise], [x, y1, h]], { lw: 0.4, a: 0.4, over: 0.1, t: 'rd' });
    } else {
      const xm = (x0 + x1) / 2;
      pen.shape([[x0, y0, h], [xm, y0, h + rise], [xm, y1, h + rise], [x0, y1, h]], roof, { lw: 1.1, t: 'r' });
      pen.shape([[xm, y0, h + rise], [x1, y0, h], [x1, y1, h], [xm, y1, h + rise]], scaleRgb(roof, 0.82), { lw: 1.1, t: 'r' });
      pen.shape([[x0, y1, h], [x1, y1, h], [xm, y1, h + rise]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 1.1, t: 'w' });
      pen.tag = 'rd';
      for (let y = y0 + 1.2; y < y1; y += 1.4) {
        pen.line([[x0, y, h], [xm, y, h + rise]], { lw: 0.4, a: 0.35, over: 0.1, t: 'rd' });
        pen.line([[xm, y, h + rise], [x1, y, h]], { lw: 0.4, a: 0.35, over: 0.1, t: 'rd' });
      }
    }
  } else {
    // parapet top, then the roof deck inset below it
    const p = 0.7;
    pen.shape([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], scaleRgb(roof, 1.12), { lw: 1.1, t: 'r' });
    pen.shape([[x0 + p, y0 + p, h - 0.1], [x1 - p, y0 + p, h - 0.1], [x1 - p, y1 - p, h - 0.1], [x0 + p, y1 - p, h - 0.1]], roof, { lw: 0.5, a: 0.7, t: 'r' });
    pen.tag = 'rd';
    const rng = makeRng(B.index * 101 + 7);
    if (B.roof === 'metal') {
      for (let x = x0 + 1.5; x < x1 - 1; x += 1.5) pen.line([[x, y0 + p, h], [x, y1 - p, h]], { lw: 0.4, a: 0.35, over: 0.1, t: 'rd' });
    } else if (B.roof === 'greenroof') {
      // sedum tufts in loose rows, and a gravel margin inside the parapet
      const ink = hexRgb('#4f6a34');
      for (let y = y0 + 2; y < y1 - 1.5; y += 2.2) {
        for (let x = x0 + 1.5 + rng() * 1.5; x < x1 - 1.2; x += 2 + rng() * 1.6) {
          pen.line([[x - 0.4, y + 0.2, h], [x, y - 0.2, h + 0.15], [x + 0.4, y + 0.2, h]], { lw: 0.4, stroke: ink, a: 0.6, over: 0, t: 'rd' });
        }
      }
      pen.line([[x0 + 1.4, y0 + 1.4, h], [x1 - 1.4, y0 + 1.4, h], [x1 - 1.4, y1 - 1.4, h], [x0 + 1.4, y1 - 1.4, h], [x0 + 1.4, y0 + 1.4, h]], { lw: 0.35, a: 0.35, over: 0, t: 'rd' });
    } else {
      for (let y = y0 + 4; y < y1 - 1; y += 4) pen.line([[x0 + p, y, h], [x1 - p, y, h]], { lw: 0.35, a: 0.25, over: 0.1, t: 'rd' });
      const units = 1 + Math.floor(((x1 - x0) * (y1 - y0)) / 600);
      for (let u = 0; u < Math.min(units, 5); u++) {
        const ux = x0 + 2 + rng() * (x1 - x0 - 6);
        const uy = y0 + 2 + rng() * (y1 - y0 - 5);
        box(pen, ux, uy, ux + 2.6, uy + 2, h, h + 1.3, B.roof === 'coolroof' || B.roof === 'coolroofR' ? hexRgb('#d9d4c8') : hexRgb('#a7a39c'), { t: 'rd', lw: 0.55 });
      }
      if (B.h > 15) {
        const tx = x0 + (x1 - x0) * 0.7;
        const ty = y0 + (y1 - y0) * 0.3;
        box(pen, tx, ty, tx + 3, ty + 3, h, h + 2.4, hexRgb('#8a7764'), { t: 'rd', lw: 0.6 });
      }
    }
  }
  if (B.chimney) {
    const [cx, cy, ch] = B.chimney;
    box(pen, cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6, h, ch, hexRgb('#a65a43'), { t: 'w', lw: 0.9, top: hexRgb('#3a302b') });
    pen.tag = 'gm';
    for (let z = h + 2; z < ch - 1; z += 1.2) pen.line([[cx - 1.6, cy + 1.6, z], [cx + 1.6, cy + 1.6, z]], { lw: 0.35, a: 0.35, over: 0.1, t: 'rd' });
  }
  pen.b = -1;
}

// ---- trees, cars, furniture -----------------------------------------------------

const LEAF = [hexRgb('#5f7d48'), hexRgb('#6f8c52'), hexRgb('#85a05f'), hexRgb('#9bb46c')];

export function tree(pen, T, i) {
  const { x, y, r, zc } = T;
  if (T.young) {
    // tree guard: two stakes and a tie, then a small, airy crown
    pen.tag = 'trunk';
    pen.line([[x - 0.7, y + 0.2, 0], [x - 0.7, y + 0.2, 1.9]], { lw: 0.55, stroke: hexRgb('#8a6a4d'), over: 0.1, t: 'trunk' });
    pen.line([[x + 0.7, y - 0.2, 0], [x + 0.7, y - 0.2, 1.9]], { lw: 0.55, stroke: hexRgb('#8a6a4d'), over: 0.1, t: 'trunk' });
    pen.line([[x - 0.7, y + 0.2, 1.6], [x + 0.7, y - 0.2, 1.6]], { lw: 0.45, a: 0.8, over: 0, t: 'trunk' });
  }
  pen.tag = 'trunk';
  const trunkTop = zc - r * 0.2;
  pen.shape([[x - 0.25, y + 0.25, 0], [x + 0.25, y - 0.25, 0], [x + 0.2, y - 0.2, trunkTop], [x - 0.2, y + 0.2, trunkTop]], hexRgb('#6b5443'), { lw: 0.7, t: 'trunk' });
  pen.tag = 'tree';
  const blobs = [];
  const n = 6 + Math.floor(hash3(i, 41) * 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash3(i, k) * 0.8;
    const d = r * (0.35 + 0.15 * hash3(i, k, 2));
    blobs.push([Math.cos(a) * d, Math.sin(a) * d, (hash3(i, k, 3) - 0.6) * r * 0.5, r * (0.5 + 0.12 * hash3(i, k, 4))]);
  }
  blobs.push([0, 0, r * 0.35, r * 0.62]);
  blobs.sort((p, q) => p[0] + p[1] + p[2] * 0.6 - (q[0] + q[1] + q[2] * 0.6));
  blobs.forEach(([dx, dy, dz, rr], k) => {
    const lit = (dz / r + 0.6 - (dx + dy) / (3 * r)) * 1.4;
    const c = LEAF[Math.max(0, Math.min(3, Math.round(lit + 1)))];
    pen.blob([x + dx, y + dy, zc + dz], rr, jitter(T.young ? mixRgb(c, LEAF[3], 0.45) : c, i * 31 + k, 0.08), { lw: T.young ? 0.6 : 0.8, t: 'tree', lumpy: 0.05, a: T.young ? 0.85 : undefined });
  });
  // a few leaf ticks
  pen.tag = 'gm';
  for (let k = 0; k < 4; k++) {
    const dx = (hash3(i, k, 7) - 0.5) * r;
    const dy = (hash3(i, k, 8) - 0.5) * r;
    const z = zc + r * 0.2 + hash3(i, k, 9) * r * 0.4;
    pen.line([[x + dx, y + dy, z], [x + dx + 0.4, y + dy - 0.4, z + 0.3]], { lw: 0.5, a: 0.6, over: 0.1, t: 'treeTick' });
  }
}

export function car(pen, x, y, axis, colour, i) {
  const L = 4.4;
  const W = 1.8;
  const c = hexRgb(colour);
  const [hx, hy] = axis === 'x' ? [L / 2, W / 2] : [W / 2, L / 2];
  box(pen, x - hx, y - hy, x + hx, y + hy, 0.25, 1.0, c, { t: 'o', lw: 0.6 });
  const [cx, cy] = axis === 'x' ? [L * 0.27, W * 0.42] : [W * 0.42, L * 0.27];
  const off = (hash3(i, 3) - 0.5) * 0.6;
  box(pen, x - cx + (axis === 'x' ? off : 0), y - cy + (axis === 'y' ? off : 0), x + cx + (axis === 'x' ? off : 0), y + cy + (axis === 'y' ? off : 0), 1.0, 1.55, mixRgb(c, hexRgb('#c9d3d6'), 0.45), { t: 'o', lw: 0.55 });
}

export function bench(pen, x, y, a) {
  const [hx, hy] = a ? [0.35, 0.9] : [0.9, 0.35];
  box(pen, x - hx, y - hy, x + hx, y + hy, 0.35, 0.5, hexRgb('#8a6a4d'), { t: 'o', lw: 0.5 });
  if (a) box(pen, x - hx - 0.1, y - hy, x - hx + 0.05, y + hy, 0.5, 1.0, hexRgb('#8a6a4d'), { t: 'o', lw: 0.5 });
  else box(pen, x - hx, y - hy - 0.1, x + hx, y - hy + 0.05, 0.5, 1.0, hexRgb('#8a6a4d'), { t: 'o', lw: 0.5 });
}

export function lamp(pen, x, y) {
  pen.tag = 'o';
  pen.line([[x, y, 0], [x, y, 5.2], [x + 0.9, y - 0.9, 5.4]], { lw: 0.7, t: 'o' });
  pen.blob([x + 0.9, y - 0.9, 5.25], 0.32, hexRgb('#f0dfa8'), { lw: 0.5, t: 'o' });
}

/** Record the whole block. Returns {items, groundCount}. */
export function drawWorld(world, seed = 1) {
  const pen = new Pen(seed);
  drawGround(pen, world);
  const groundCount = pen.items.length;
  pen.layer = 1;
  const objs = [];
  for (const B of world.buildings) objs.push({ kind: 'b', o: B, x0: B.x0, y0: B.y0, x1: B.x1, y1: B.y1 + (B.shops ? 1.6 : 0) });
  world.trees.forEach((T, i) => objs.push({ kind: 't', o: T, i, x0: T.x - 0.6, y0: T.y - 0.6, x1: T.x + 0.6, y1: T.y + 0.6 }));
  world.scene.cars.forEach(([x, y, ax, c], i) => {
    const [hx, hy] = ax === 'x' ? [2.2, 0.9] : [0.9, 2.2];
    objs.push({ kind: 'c', o: [x, y, ax, c], i, x0: x - hx, y0: y - hy, x1: x + hx, y1: y + hy });
  });
  world.scene.benches.forEach((b, i) => objs.push({ kind: 'n', o: b, i, x0: b.x - 0.9, y0: b.y - 0.9, x1: b.x + 0.9, y1: b.y + 0.9 }));
  const D = world.scene.decor;
  let lamps = D?.lamps;
  if (!lamps) {
    lamps = [];
    for (let x = 12; x < 400; x += 26) if (x < 118 || (x > 147 && x < 268) || x > 297) lamps.push([x, 145.8], [x + 13, 174.2]);
    for (let x = 20; x < 400; x += 30) if (x < 118 || x > 297) lamps.push([x, 285.8]);
  }
  lamps.forEach(([x, y], i) => objs.push({ kind: 'l', o: [x, y], i, x0: x - 0.2, y0: y - 0.2, x1: x + 0.2, y1: y + 0.2 }));
  // small yard sheds (drawn as plain boxes; not part of the thermal model)
  (D?.sheds ?? [[60, 70, 'x'], [205, 66, 'y'], [350, 70, 'x'], [60, 205, 'x'], [345, 210, 'y']]).forEach(([x, y, ax], i) => {
    const [w, d] = ax === 'x' ? [6, 4] : [4, 6];
    objs.push({ kind: 's', o: [x, y, x + w, y + d], i, x0: x, y0: y, x1: x + w, y1: y + d });
  });
  const order = depthOrder(objs);
  order.forEach((k, gi) => {
    const ob = objs[k];
    pen.group = gi + 1;
    if (ob.kind === 'b') building(pen, ob.o, world);
    else if (ob.kind === 't') tree(pen, ob.o, ob.i);
    else if (ob.kind === 'c') car(pen, ...ob.o, ob.i);
    else if (ob.kind === 'n') bench(pen, ob.o.x, ob.o.y, ob.o.a);
    else if (ob.kind === 's') box(pen, ...ob.o, 0, 2.6, hexRgb(['#9b8f7c', '#7f8f99', '#a9b89a'][ob.i % 3]), { t: 'o', lw: 0.7, top: hexRgb('#6c5f5a') });
    else lamp(pen, ...ob.o);
  });
  return { items: pen.items, groundCount, objects: order.map((k) => objs[k]) };
}

