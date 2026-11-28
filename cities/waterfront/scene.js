// Scene: "Waterfront and wind corridors". An invented 400 m x 400 m block on
// the south bank of a river: a stone promenade with a row of riverside
// trees, two wide streets running south from the river along the prevailing
// north wind (Quay Street and Willow Street, the ventilation corridors), two
// narrower streets across the wind (Rope Walk and Tannery Lane, sheltered by
// the building rows upwind of them), and a small garden with a still pond.
// Units: metres, x east, y south; the river is the north edge. Edges sit on
// the 5 m model grid. The wind blows from the north (from the river), at the
// calm (1 m/s) or breezy (3 m/s, default) preset; its direction and speeds
// are assumptions, easy to change.
// Corridor aspect ratios (mean facing wall height / wall-to-wall width, from
// wind.js streetInfo): Quay Street about 0.6, Willow Street about 0.6 (both
// above the 0.4 channelling threshold); Rope Walk about 0.9 (across the wind).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

function ellipse(cx, cy, rx, ry, n = 24) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  }
  return p;
}

const promenadeTrees = [];
for (let x = 8; x < 400; x += 12) promenadeTrees.push({ x, y: 55, r: 4, zc: 5.8 });

export const SCENE = {
  id: 'waterfront',
  title: 'Waterfront and wind corridors',
  size: 400,
  seed: 4409,
  windBlock: true,
  // prevailing wind: from the north (off the river), deg clockwise from north;
  // speed presets in m/s (calm / breezy), default breezy
  wind: { from: 0, speeds: [1, 3], default: 3 },
  site: {
    lat: 35,
    lon: 120,
    tz: 8,
    year: 2026,
    month: 7,
    day: 20,
    taMin: 25,
    taMax: 35,
    wind: 3,
    vapourHpa: 20,
    plain: 'A hot summer day with a breeze off the river: the air goes from 25 °C at dawn to 35 °C in the afternoon.',
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, wind from the river (north) at 3 m/s (breezy) or 1 m/s (calm). Air temperature is fixed: the air effect of the water is an illustrative overlay only.',
  },
  // Ground parcels, painted in order (later wins). Base is concrete pavement.
  ground: [
    { id: 'base', name: 'Pavement', mat: 'concrete', poly: rect(0, 0, 400, 400) },
    { id: 'river', name: 'The river', mat: 'river', poly: rect(0, 0, 400, 45) },
    { id: 'promenade', name: 'Riverside promenade', mat: 'stone', poly: rect(0, 45, 400, 62), outline: true },
    { id: 'quay', name: 'Quay Street', mat: 'asphalt', poly: rect(120, 62, 140, 400), street: 'ns' },
    { id: 'willow', name: 'Willow Street', mat: 'asphalt', poly: rect(260, 62, 280, 400), street: 'ns' },
    { id: 'rope', name: 'Rope Walk', mat: 'asphalt', poly: rect(0, 150, 120, 162), street: 'ew' },
    { id: 'rope2', name: 'Rope Walk', mat: 'asphalt', poly: rect(140, 150, 260, 162), street: 'ew' },
    { id: 'rope3', name: 'Rope Walk', mat: 'asphalt', poly: rect(280, 150, 400, 162), street: 'ew' },
    { id: 'tannery', name: 'Tannery Lane', mat: 'asphalt', poly: rect(0, 262, 120, 272), street: 'ew' },
    { id: 'tannery2', name: 'Tannery Lane', mat: 'asphalt', poly: rect(140, 262, 260, 272), street: 'ew' },
    { id: 'tannery3', name: 'Tannery Lane', mat: 'asphalt', poly: rect(280, 262, 400, 272), street: 'ew' },
    { id: 'garden', name: 'Willow Garden', mat: 'grass', poly: rect(145, 167, 255, 257), outline: true },
    { id: 'pond', name: 'Lily Pond', mat: 'pond', poly: ellipse(200, 212, 20, 12) },
  ],
  // Buildings: footprint, height (m), roof, wall colour.
  buildings: [
    // row 1, behind the promenade (kept low so the river stays in view)
    { id: 'a1', name: 'Wharf Warehouses', x0: 10, y0: 70, x1: 115, y1: 145, h: 16, roof: 'membrane', wall: '#b9a58a' },
    { id: 'a2', name: 'Customs Terrace', x0: 145, y0: 70, x1: 255, y1: 145, h: 20, roof: 'coolroof', wall: '#cdbd9f' },
    { id: 'a3', name: 'Ropery Lofts', x0: 285, y0: 70, x1: 390, y1: 145, h: 18, roof: 'membrane', wall: '#a8957c' },
    // row 2, either side of the garden
    { id: 'b1', name: 'Tannery Court', x0: 10, y0: 167, x1: 115, y1: 257, h: 22, roof: 'membrane', wall: '#c2ae90' },
    { id: 'b3', name: 'Granary Flats', x0: 285, y0: 167, x1: 390, y1: 257, h: 26, roof: 'coolroof', wall: '#b5a184' },
    // row 3
    { id: 'c1', name: 'Net Loft', x0: 10, y0: 277, x1: 55, y1: 392, h: 14, roof: 'membrane', wall: '#c6b294' },
    { id: 'c2', name: 'Chandlers Row', x0: 70, y0: 277, x1: 115, y1: 392, h: 16, roof: 'coolroof', wall: '#bba78b' },
    { id: 'c3', name: 'Boatyard Offices', x0: 145, y0: 277, x1: 195, y1: 392, h: 18, roof: 'membrane', wall: '#cfc0a3' },
    { id: 'c4', name: 'Sail Works', x0: 205, y0: 277, x1: 255, y1: 392, h: 14, roof: 'membrane', wall: '#b09c80' },
    { id: 'c5', name: 'Mill House', x0: 285, y0: 277, x1: 390, y1: 392, h: 16, roof: 'coolroof', wall: '#c4b08f' },
  ],
  // Trees: the riverside row on the promenade, and the garden around the pond.
  trees: [
    ...promenadeTrees,
    { x: 160, y: 182, r: 4.2, zc: 6 },
    { x: 178, y: 240, r: 4.2, zc: 6 },
    { x: 232, y: 186, r: 4.2, zc: 6 },
    { x: 240, y: 238, r: 4.2, zc: 6 },
    { x: 160, y: 228, r: 3.6, zc: 5.5 },
    { x: 214, y: 246, r: 3.6, zc: 5.5 },
  ],
  benches: [
    ...[50, 110, 170, 230, 290, 350].map((x) => ({ x, y: 58, a: 0 })),
    { x: 200, y: 229, a: 0 },
    { x: 176, y: 196, a: 1 },
  ],
  cars: [
    [130, 95, 'y', '#7f8f99'],
    [125, 300, 'y', '#b5633f'],
    [270, 120, 'y', '#5d6b5a'],
    [275, 330, 'y', '#a33b2c'],
    [60, 156, 'x', '#43566b'],
    [330, 156, 'x', '#c9b48a'],
    [80, 267, 'x', '#d5cfc2'],
  ],
  decor: {
    river: [0, 45],
    dashes: [[62, 150, 130, 'y'], [162, 262, 130, 'y'], [272, 400, 130, 'y'], [62, 150, 270, 'y'], [162, 262, 270, 'y'], [272, 400, 270, 'y']],
    crossings: [[120.5, 145.5, 139.5, 149, 'y'], [260.5, 145.5, 279.5, 149, 'y'], [115.5, 150.5, 119, 161.5, 'x'], [281, 150.5, 284.5, 161.5, 'x']],
    joints: [
      [0, 62, 400, 70, 'x'],
      [0, 145, 400, 150, 'x'], [0, 162, 400, 167, 'x'], [0, 257, 400, 262, 'x'], [0, 272, 400, 277, 'x'],
      [115, 62, 120, 400, 'y'], [140, 62, 145, 400, 'y'], [255, 62, 260, 400, 'y'], [280, 62, 285, 400, 'y'],
    ],
    paving: [[0, 45, 400, 62]],
    manholes: [[130, 210], [270, 200], [60, 156], [330, 267]],
    lamps: [[30, 46.5], [94, 46.5], [158, 46.5], [222, 46.5], [286, 46.5], [350, 46.5], [117.5, 100], [142.5, 220], [257.5, 120], [282.5, 330]],
    lawn: [[145, 167, 255, 257, 380]],
    sheds: [],
    pond: [200, 212, 20, 12],
  },
  // Walker routes: two variants each (opposite pavements, or promenade edge vs tree row).
  routes: [
    { id: 'promenade', n: 22, variants: [[0, 47.5, 400, 47.5], [0, 53, 400, 53]] },
    { id: 'quay', n: 16, variants: [[117.5, 62, 117.5, 400], [142.5, 62, 142.5, 400]] },
    { id: 'willow', n: 14, variants: [[257.5, 62, 257.5, 400], [282.5, 62, 282.5, 400]] },
    { id: 'rope', n: 16, variants: [[0, 147.5, 400, 147.5], [0, 164.5, 400, 164.5]] },
    { id: 'tannery', n: 12, variants: [[0, 259.5, 400, 259.5], [0, 274.5, 400, 274.5]] },
    // a cross-town stroll: the tree-shaded, breezy riverside or sunny, sheltered Rope Walk
    { id: 'stroll', n: 14, variants: [[0, 53, 400, 53], [0, 147.5, 400, 147.5]] },
  ],
  spots: [
    ...[50, 110, 170, 230, 290, 350].map((x) => ({ x, y: 57.5, cap: 2 })),
    { x: 200, y: 230, cap: 3 },
    { x: 176, y: 196, cap: 2 },
  ],
  dwellers: 12,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    river: [200, 22.5, 0],
    pond: [200, 212, 0],
    lawn: [235, 205, 0],
    promenadeShade: [204, 54, 0],
    promenadeSun: [204, 47.5, 0],
    sheltered: [62.5, 157.5, 0], // Rope Walk behind the Wharf Warehouses
    corridor: [132.5, 312.5, 0], // Quay Street between the row-3 blocks
  },
  // Street segments for the cards and checks.
  segments: {
    corridor: { name: 'Quay Street', street: 'quay' },
    sheltered: { name: 'Rope Walk', street: 'rope', lee: 'a1' },
  },
  // Margin notes (at most 5).
  notes: [
    { at: [200, 22.5, 0], dx: 70, dy: -70, key: 'river' },
    { at: [200, 212, 0], dx: 120, dy: 60, key: 'pond' },
    { at: [132.5, 312.5, 0], dx: 150, dy: 95, key: 'corridor' },
    { at: [62.5, 157.5, 0], dx: -40, dy: 110, key: 'sheltered' },
    { at: [300, 54, 0], dx: -20, dy: -95, key: 'shade' },
  ],
  startCam: { z: 2, cx: 205, cy: 205 },
};
