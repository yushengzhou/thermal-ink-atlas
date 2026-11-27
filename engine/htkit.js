// htkit: what the pen draws for block 5 (hutong) only: the courtyard houses,
// species trees, pergolas and mat awnings, fish bowls, brick courses and the
// well. kit.js reaches them through world.draw (set by hutong.js hutongSetup),
// so the other pages do not carry this code.
import { hash3, hexRgb, scaleRgb } from './core.js';
import { box, jitter, ROOF_RGB, LEAF, WIN, groundEllipse } from './kit.js';

const PILLAR = hexRgb('#8e3b2c');
const LATTICE = hexRgb('#5b4636');

/**
 * A single-storey courtyard house (block 5): grey brick walls, one or two
 * gabled grey tile roofs (ridge along x for B.gable 'x', along y for 'y'),
 * tile rows and the ridge in one stroke item each; courtyard-facing walls
 * (B.court) get red pillars and lattice windows, lane-facing walls stay
 * blank but for small high windows. The roof rise is drawing only: the model
 * treats the house as a box at eave height.
 */
export function hutongHouse(pen, B, world) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.05);
  const roof = jitter(ROOF_RGB.greyTile, B.index * 5, 0.06);
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 1.05, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 1.05, t: 'w' });
  // shade hatching, one item per face (drawn only when the face is turned from the sun)
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
    const segs = [];
    for (let t = 1.2; t < len + h; t += 1.6) {
      const a = Math.max(0, t - h);
      const b = Math.min(len, t);
      if (b - a >= 0.5) segs.push([P(a, t - a), P(b, t - b)]);
    }
    if (segs.length) pen.lines(segs, { lw: 0.4, a: 0.28, over: 0.1, t: face === 'S' ? 'hatchS' : 'hatchE' });
  }
  // façades: courtyard sides get pillars and lattice; lane sides small high windows
  const court = B.court ?? '';
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
    const toCourt = face === 'S' ? court.includes('S') || court === 'NS' : court.includes('E');
    pen.tag = 'win';
    if (toCourt) {
      // the panes and the doors of a façade are one item each (Pen.shapes); lit together at night
      const bays = Math.max(1, Math.round(len / 3.3));
      const w = len / bays;
      const pil = [];
      const lat = [];
      const panes = [];
      const doors = [];
      for (let k = 0; k <= bays; k++) pil.push([P(k * w, 0), P(k * w, h - 0.3)]);
      for (let k = 0; k < bays; k++) {
        const a = k * w + 0.45;
        const b = (k + 1) * w - 0.45;
        if (hash3(B.index, k, 17) < 0.25) {
          doors.push([P(a + 0.4, 0), P(b - 0.4, 0), P(b - 0.4, 2.5), P(a + 0.4, 2.5)]);
          continue;
        }
        panes.push([P(a, 1), P(b, 1), P(b, h - 0.6), P(a, h - 0.6)]);
        for (let u = a + 0.8; u < b - 0.3; u += 0.8) lat.push([P(u, 1), P(u, h - 0.6)]);
        lat.push([P(a, 2.2), P(b, 2.2)]);
      }
      if (panes.length) pen.shapes(panes, { k: 'win', h: hash3(B.index * 7 + (face === 'S' ? 0 : 1), 3), c: scaleRgb(WIN, 0.95) }, { lw: 0.45, over: 0.3, t: 'win' });
      if (doors.length) pen.shapes(doors, hexRgb('#6b4e3a'), { lw: 0.5, t: 'win' });
      if (lat.length) pen.lines(lat, { lw: 0.3, stroke: LATTICE, a: 0.55, over: 0, t: 'win' });
      pen.lines(pil, { lw: 0.9, stroke: PILLAR, a: 0.85, over: 0, t: 'win' });
    } else {
      const panes = [];
      for (let u = 3 + 3 * hash3(B.index, face === 'S' ? 1 : 2, 19); u < len - 1.5; u += 6.5) panes.push([P(u, 2.6), P(u + 0.9, 2.6), P(u + 0.9, 3.3), P(u, 3.3)]);
      if (panes.length) pen.shapes(panes, { k: 'win', h: hash3(B.index, face === 'S' ? 1 : 2, 5), c: WIN }, { lw: 0.4, over: 0.2, t: 'win' });
    }
  }
  // eave line
  pen.tag = 'w';
  pen.line([[x0, y1, h - 0.25], [x1, y1, h - 0.25], [x1, y0, h - 0.25]], { lw: 0.45, a: 0.55, t: 'w' });
  // roofs: back (north / west) parts first
  pen.tag = 'r';
  const alongX = B.gable !== 'y';
  const depth = alongX ? y1 - y0 : x1 - x0;
  const nr = B.ridges ?? Math.max(1, Math.round(depth / 5));
  for (let r = 0; r < nr; r++) {
    const a = (alongX ? y0 : x0) + (depth * r) / nr;
    const b = (alongX ? y0 : x0) + (depth * (r + 1)) / nr;
    const m = (a + b) / 2;
    const rise = Math.min(1.8, (b - a) * 0.36);
    const z = h + rise;
    const tiles0 = [];
    const tiles1 = [];
    if (alongX) {
      pen.shape([[x0, a, h], [x1, a, h], [x1, m, z], [x0, m, z]], scaleRgb(roof, 0.84), { lw: 0.9, t: 'r' });
      pen.shape([[x0, m, z], [x1, m, z], [x1, b, h], [x0, b, h]], roof, { lw: 0.9, t: 'r' });
      pen.shape([[x1, b, h], [x1, a, h], [x1, m, z]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 0.9, t: 'w' });
      for (let x = x0 + 0.8; x < x1 - 0.3; x += 1.6) {
        tiles0.push([[x, a + 0.15, h], [x, m, z]]);
        tiles1.push([[x, m, z], [x, b - 0.15, h]]);
      }
      pen.tag = 'rd';
      pen.lines(tiles0.concat(tiles1), { lw: 0.33, a: 0.38, over: 0, t: 'rd' });
      pen.line([[x0, m, z + 0.12], [x1, m, z + 0.12]], { lw: 1.5, a: 0.9, over: 0.2, t: 'rd' });
    } else {
      pen.shape([[a, y0, h], [m, y0, z], [m, y1, z], [a, y1, h]], roof, { lw: 0.9, t: 'r' });
      pen.shape([[m, y0, z], [b, y0, h], [b, y1, h], [m, y1, z]], scaleRgb(roof, 0.84), { lw: 0.9, t: 'r' });
      pen.shape([[a, y1, h], [b, y1, h], [m, y1, z]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 0.9, t: 'w' });
      for (let y = y0 + 0.8; y < y1 - 0.3; y += 1.6) {
        tiles0.push([[a + 0.15, y, h], [m, y, z]]);
        tiles1.push([[m, y, z], [b - 0.15, y, h]]);
      }
      pen.tag = 'rd';
      pen.lines(tiles0.concat(tiles1), { lw: 0.33, a: 0.38, over: 0, t: 'rd' });
      pen.line([[m, y0, z + 0.12], [m, y1, z + 0.12]], { lw: 1.5, a: 0.9, over: 0.2, t: 'rd' });
    }
    pen.tag = 'r';
  }
  pen.b = -1;
}

/** Species look (block 5): leaf colours, crown blobs and alpha; pomegranates carry red fruit. */
const SPECIES = {
  pagodaTree: { leaf: [hexRgb('#4f6e3f'), hexRgb('#5c7c47'), hexRgb('#6d8c52'), hexRgb('#82a05e')], blobs: 7, a: undefined },
  jujube: { leaf: [hexRgb('#6c8a4c'), hexRgb('#7b9a57'), hexRgb('#8eac63'), hexRgb('#a3bd74')], blobs: 4, a: 0.82 },
  pomegranate: { leaf: [hexRgb('#4c6b3a'), hexRgb('#587a42'), hexRgb('#678a4b'), hexRgb('#7a9a56')], blobs: 3, a: undefined, fruit: hexRgb('#b8402f') },
};

function speciesTree(pen, T, i) {
  const { x, y, r, zc } = T;
  const sp = SPECIES[T.species];
  pen.tag = 'trunk';
  const trunkTop = zc - r * 0.2;
  const tw = T.species === 'pagodaTree' ? 0.4 : 0.22;
  pen.shape([[x - tw, y + tw, 0], [x + tw, y - tw, 0], [x + tw * 0.8, y - tw * 0.8, trunkTop], [x - tw * 0.8, y + tw * 0.8, trunkTop]], hexRgb('#5e4a3b'), { lw: 0.7, t: 'trunk' });
  pen.tag = 'tree';
  const blobs = [];
  const n = sp.blobs + Math.floor(hash3(i, 41) * 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash3(i, k) * 0.8;
    const d = r * (0.35 + 0.15 * hash3(i, k, 2));
    blobs.push([Math.cos(a) * d, Math.sin(a) * d, (hash3(i, k, 3) - 0.6) * r * 0.5, r * (0.55 + 0.12 * hash3(i, k, 4))]);
  }
  blobs.push([0, 0, r * 0.35, r * 0.66]);
  blobs.sort((p, q) => p[0] + p[1] + p[2] * 0.6 - (q[0] + q[1] + q[2] * 0.6));
  blobs.forEach(([dx, dy, dz, rr], k) => {
    const lit = (dz / r + 0.6 - (dx + dy) / (3 * r)) * 1.4;
    const c = sp.leaf[Math.max(0, Math.min(3, Math.round(lit + 1)))];
    pen.blob([x + dx, y + dy, zc + dz], rr, jitter(c, i * 31 + k, 0.08), { lw: 0.7, t: 'tree', lumpy: 0.05, a: sp.a });
  });
  pen.tag = 'gm';
  const ticks = [];
  for (let k = 0; k < (sp.fruit ? 7 : 4); k++) {
    const dx = (hash3(i, k, 7) - 0.5) * r;
    const dy = (hash3(i, k, 8) - 0.5) * r;
    const z = zc + r * 0.1 + hash3(i, k, 9) * r * 0.45;
    ticks.push([[x + dx, y + dy, z], [x + dx + (sp.fruit ? 0.18 : 0.4), y + dy - (sp.fruit ? 0.18 : 0.4), z + (sp.fruit ? 0.12 : 0.3)]]);
  }
  pen.lines(ticks, sp.fruit ? { lw: 1.4, stroke: sp.fruit, a: 0.9, over: 0, t: 'treeTick' } : { lw: 0.5, a: 0.6, over: 0.1, t: 'treeTick' });
}

/**
 * A flat screen (block 5): a vine pergola (posts, a lattice and leaves at
 * z 2.4) or the summer mat awning, tianpeng (poles and a reed-mat top above
 * the eaves, its side mats rolled up under the edge). Tops are tagged as
 * crowns, so the heat wash shows through them in the thermal view.
 */
export function screen(pen, P, i) {
  const { x0, y0, x1, y1, z } = P;
  pen.tag = 'trunk';
  const posts = [];
  const step = P.kind === 'awning' ? 5 : 4;
  for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.max(1, Math.round((x1 - x0) / step))) for (const y of [y0, y1]) posts.push([[x, y, 0], [x, y, z]]);
  for (let y = y0; y <= y1 + 0.01; y += (y1 - y0) / Math.max(1, Math.round((y1 - y0) / step))) for (const x of [x0, x1]) posts.push([[x, y, 0], [x, y, z]]);
  pen.lines(posts, { lw: P.kind === 'awning' ? 0.6 : 0.7, stroke: hexRgb('#7a5c42'), a: 0.85, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  if (P.kind === 'awning') {
    pen.shape([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], jitter(hexRgb('#d9c79c'), i * 13, 0.05), { lw: 1.0, t: 'tree', a: 0.92 });
    const mats = [];
    for (let x = x0 + 1; x < x1; x += 1) mats.push([[x, y0 + 0.2, z], [x, y1 - 0.2, z]]);
    pen.lines(mats, { lw: 0.3, stroke: hexRgb('#9b8660'), a: 0.5, over: 0, t: 'treeTick' });
    // rolled side mats under the south and east edges
    pen.line([[x0, y1, z - 0.35], [x1, y1, z - 0.35], [x1, y0, z - 0.35]], { lw: 2.2, stroke: hexRgb('#b6a277'), a: 0.9, over: 0, t: 'trunk' });
  } else {
    pen.shape([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], jitter(hexRgb('#6f8c4e'), i * 13, 0.06), { lw: 0.6, t: 'tree', a: 0.72 });
    const lat = [];
    for (let x = x0 + 1; x < x1; x += 1) lat.push([[x, y0, z + 0.05], [x, y1, z + 0.05]]);
    pen.lines(lat, { lw: 0.35, stroke: hexRgb('#7a5c42'), a: 0.6, over: 0, t: 'treeTick' });
    for (let k = 0; k < 4; k++) {
      const bx = x0 + (x1 - x0) * (0.15 + 0.7 * hash3(i, k, 31));
      const by = y0 + (y1 - y0) * (0.2 + 0.6 * hash3(i, k, 32));
      pen.blob([bx, by, z + 0.3], 0.9 + 0.4 * hash3(i, k, 33), jitter(LEAF[1 + (k % 2)], i * 7 + k, 0.08), { lw: 0.5, t: 'tree', lumpy: 0.08, a: 0.85 });
    }
  }
}

/** A glazed fish bowl under the awning (block 5). */
export function bowl(pen, x, y) {
  pen.tag = 'o';
  const pts = (z, r) => Array.from({ length: 12 }, (_, k) => [x + Math.cos((k / 12) * Math.PI * 2) * r, y + Math.sin((k / 12) * Math.PI * 2) * r, z]);
  box(pen, x - 0.55, y - 0.55, x + 0.55, y + 0.55, 0, 0.75, hexRgb('#5e6f7a'), { t: 'o', lw: 0.5, top: hexRgb('#6f8f96') });
  pen.shape(pts(0.76, 0.5), hexRgb('#7ea3ab'), { lw: 0.4, t: 'o' });
}

// ---- trees, cars, furniture -----------------------------------------------------


/** Grey brick paving (block 5): courses every 2 m along the long side of the rect, one item. */
function brickCourses(pen, x0, y0, x1, y1) {
  pen.tag = 'gm';
  const segs = [];
  if (x1 - x0 >= y1 - y0) for (let y = y0 + 2; y < y1 - 0.5; y += 2) segs.push([[x0 + 0.3, y], [x1 - 0.3, y]]);
  else for (let x = x0 + 2; x < x1 - 0.5; x += 2) segs.push([[x, y0 + 0.3], [x, y1 - 0.3]]);
  if (segs.length) pen.lines(segs, { lw: 0.35, stroke: hexRgb('#8f897d'), a: 0.4, over: 0.1 });
}


/** The old well of Well Square (block 5): a stone curb, dark water and a windlass. */
function well(pen, x, y) {
  pen.tag = 'gm';
  groundEllipse(pen, x, y, 1.5, 1.5, hexRgb('#a29a8a'), { lw: 0.8, n: 16, t: 'gm' });
  groundEllipse(pen, x, y, 0.85, 0.85, hexRgb('#46555b'), { lw: 0.5, n: 12, t: 'gm' });
}

/** kit.js drawWorld hook: draw a block-5 object; true if it was one. */
function objects(pen, ob, world) {
  if (ob.kind === 'b' && ob.o.style === 'hutong') hutongHouse(pen, ob.o, world);
  else if (ob.kind === 'p') screen(pen, ob.o, ob.i);
  else if (ob.kind === 'f') bowl(pen, ...ob.o);
  else if (ob.kind === 't' && ob.o.species) speciesTree(pen, ob.o, ob.i);
  else return false;
  return true;
}

/** kit.js drawDecor hook: brick courses in lanes and courtyards, and the well. */
function decor(pen, world, D) {
  for (const r of D.brick ?? []) brickCourses(pen, ...r);
  if (D.well) well(pen, ...D.well);
}

/** The block-5 drawing hooks for kit.js (world.draw). */
export const HT_DRAW = { objects, decor };
