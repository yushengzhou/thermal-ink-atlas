// Scene: "Glass towers and street canyons". An invented 400 m x 400 m CBD
// block: glass curtain-wall towers along Meridian Avenue, a small plaza in
// front of the Plaza Tower, and a narrow stone lane (Silk Lane) between
// stone-clad mid-rise blocks. Units: metres, x east, y south. Buildings with
// `glass` have glass curtain walls on those faces (true = all four); the glass
// type (clear / low-e / mirror) is chosen on the page. Edges sit on the 5 m
// model grid. Canyon aspect ratios (mean wall height / wall-to-wall width):
// Exchange Street between the Guild Building and the Exchange Tower about 2.6
// (60 and 120 m, 35 m apart), Silk Lane about 2.3 (30 and 26 m stone walls,
// 12 m apart). The rows south and east of the plaza are kept low so the
// avenue and the plaza stay in view.

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

function ellipse(cx, cy, rx, ry, n = 20) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  }
  return p;
}

export const SCENE = {
  id: 'glass-cbd',
  title: 'Glass towers and street canyons',
  size: 400,
  seed: 3107,
  glassBlock: true,
  // a finer horizon scan for the deep canyons (blocks 1 and 2 use 16)
  svfDirs: 32,
  site: {
    lat: 35,
    lon: 120,
    tz: 8,
    year: 2026,
    month: 7,
    day: 20,
    taMin: 25,
    taMax: 35,
    wind: 1.5,
    vapourHpa: 20,
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, light wind 1.5 m/s. Air temperature is fixed: no canyon air heating or AC waste heat is modelled.',
  },
  // Ground parcels, painted in order (later wins). Base is concrete pavement.
  ground: [
    { id: 'base', name: 'Pavement', mat: 'concrete', poly: rect(0, 0, 400, 400) },
    { id: 'meridian', name: 'Meridian Avenue', mat: 'asphalt', poly: rect(0, 176, 400, 194), street: 'ew' },
    { id: 'exchange', name: 'Exchange Street', mat: 'asphalt', poly: rect(145, 0, 155, 400), street: 'ns' },
    { id: 'harbour', name: 'Harbour Street', mat: 'asphalt', poly: rect(283, 0, 292, 400), street: 'ns' },
    { id: 'plaza', name: 'Meridian Plaza', mat: 'stone', poly: rect(160, 200, 280, 260), outline: true },
    { id: 'silk', name: 'Silk Lane', mat: 'stone', poly: rect(0, 300, 400, 312), lane: true },
    { id: 'pool', name: 'Plaza pool', mat: 'water', poly: ellipse(250, 222, 9, 5) },
  ],
  // Buildings: footprint, height (m), roof, wall colour (frames and stone),
  // glass faces. Opaque stone walls reflect diffusely (wall albedo); glass
  // reflects the sun specularly.
  buildings: [
    // back row
    { id: 'b1', name: 'Harbour Exchange (stone)', x0: 15, y0: 15, x1: 125, y1: 95, h: 45, roof: 'coolroof', wall: '#c9b9a0' },
    { id: 'b2', name: 'North Tower', x0: 170, y0: 20, x1: 265, y1: 95, h: 75, roof: 'membrane', wall: '#8f9aa3', glass: true },
    { id: 'b3', name: 'Customs House (stone)', x0: 300, y0: 20, x1: 385, y1: 100, h: 40, roof: 'membrane', wall: '#d2c3a6' },
    // Meridian Avenue, north side: the glass towers
    { id: 't1', name: 'Meridian One', x0: 15, y0: 120, x1: 60, y1: 170, h: 90, roof: 'coolroof', wall: '#7f8c96', glass: true },
    { id: 't2', name: 'Guild Building (stone)', x0: 70, y0: 125, x1: 130, y1: 170, h: 60, roof: 'membrane', wall: '#cdbb9b' },
    { id: 't3', name: 'Exchange Tower', x0: 165, y0: 115, x1: 225, y1: 170, h: 120, roof: 'membrane', wall: '#76838d', glass: true },
    { id: 't4', name: 'Pearl Tower', x0: 240, y0: 125, x1: 275, y1: 170, h: 70, roof: 'coolroof', wall: '#8b979f', glass: true },
    { id: 't5', name: 'Harbour Tower', x0: 300, y0: 120, x1: 365, y1: 170, h: 85, roof: 'membrane', wall: '#7c8a93', glass: true },
    // middle row: the Plaza Tower stands on the plaza
    { id: 'p1', name: 'Plaza Tower', x0: 170, y0: 205, x1: 205, y1: 235, h: 80, roof: 'coolroof', wall: '#808d97', glass: true },
    { id: 'm1', name: 'Bank Hall (stone)', x0: 165, y0: 272, x1: 275, y1: 300, h: 30, roof: 'membrane', wall: '#d7c7a8' },
    { id: 'm2', name: 'Lantern House', x0: 15, y0: 210, x1: 60, y1: 295, h: 40, roof: 'membrane', wall: '#86939c', glass: true },
    { id: 'm3', name: 'Mint Building (stone)', x0: 75, y0: 215, x1: 130, y1: 295, h: 30, roof: 'coolroof', wall: '#c4b394' },
    { id: 'm4', name: 'Quay House', x0: 310, y0: 215, x1: 385, y1: 295, h: 30, roof: 'membrane', wall: '#83909a', glass: true },
    // Silk Lane, south side: stone-clad mid-rise
    { id: 's1', name: 'Silk Lane chambers (stone)', x0: 15, y0: 312, x1: 130, y1: 385, h: 24, roof: 'membrane', wall: '#cbb999' },
    { id: 's2', name: 'Silk Lane offices (stone)', x0: 165, y0: 312, x1: 275, y1: 385, h: 26, roof: 'coolroof', wall: '#d5c4a3' },
    { id: 's3', name: 'Silk Lane court (stone)', x0: 305, y0: 312, x1: 385, y1: 385, h: 24, roof: 'membrane', wall: '#c8b696' },
  ],
  // Trees: a few plaza trees in planters, and street trees on the avenue's south pavement.
  trees: [
    { x: 228, y: 240, r: 3.6, zc: 5.5 },
    { x: 244, y: 248, r: 3.6, zc: 5.5 },
    { x: 262, y: 240, r: 3.6, zc: 5.5 },
    { x: 196, y: 248, r: 3.6, zc: 5.5 },
    { x: 178, y: 252, r: 3.6, zc: 5.5 },
    ...[20, 44, 92, 116, 320, 344, 368].map((x) => ({ x, y: 197.5, r: 3, zc: 5 })),
  ],
  benches: [
    { x: 228, y: 244, a: 0 },
    { x: 244, y: 252, a: 0 },
    { x: 262, y: 244, a: 0 },
    { x: 196, y: 252, a: 0 },
    { x: 222, y: 256, a: 0 },
    { x: 266, y: 214, a: 1 },
  ],
  cars: [
    [30, 180, 'x', '#7f8f99'],
    [120, 190, 'x', '#b5633f'],
    [210, 180, 'x', '#5d6b5a'],
    [330, 190, 'x', '#a33b2c'],
    [150, 60, 'y', '#43566b'],
    [150, 340, 'y', '#c9b48a'],
    [287.5, 120, 'y', '#d5cfc2'],
    [287.5, 250, 'y', '#7f8f99'],
  ],
  decor: {
    dashes: [[0, 140, 185, 'x'], [160, 280, 185, 'x'], [296, 400, 185, 'x'], [0, 170, 150, 'y'], [200, 400, 150, 'y'], [0, 170, 287.5, 'y'], [200, 400, 287.5, 'y']],
    crossings: [[145.5, 170.5, 154.5, 174.5, 'y'], [139, 177, 143, 193, 'x'], [283.5, 195.5, 291.5, 199.5, 'y'], [296.5, 177, 300.5, 193, 'x']],
    joints: [
      [0, 170, 140, 176, 'x'], [160, 170, 280, 176, 'x'], [295, 170, 400, 176, 'x'],
      [0, 194, 140, 200, 'x'], [295, 194, 400, 200, 'x'],
      [140, 0, 145, 400, 'y'], [155, 0, 160, 400, 'y'], [280, 0, 283, 400, 'y'], [292, 0, 295, 400, 'y'],
    ],
    paving: [[160, 200, 280, 260], [0, 300, 400, 312]],
    manholes: [[60, 185], [230, 182], [350, 188], [150, 250], [287, 60]],
    lamps: [[30, 176.2], [80, 176.2], [180, 176.2], [230, 176.2], [320, 176.2], [370, 176.2], [30, 193.8], [80, 193.8], [320, 193.8], [370, 193.8]],
    sheds: [],
    pond: [250, 222, 9, 5],
  },
  // Walker routes: two equal-length variants each (opposite pavements).
  routes: [
    { id: 'meridian', n: 28, variants: [[0, 173, 400, 173], [0, 197, 400, 197]] },
    { id: 'exchange', n: 18, variants: [[142.5, 0, 142.5, 400], [157.5, 0, 157.5, 400]] },
    { id: 'harbour', n: 16, variants: [[281.5, 0, 281.5, 400], [293.5, 0, 293.5, 400]] },
    { id: 'silk', n: 14, variants: [[0, 302.5, 400, 302.5], [0, 309.5, 400, 309.5]] },
    { id: 'plaza', n: 12, variants: [[218, 203, 276, 203, 276, 257], [218, 203, 218, 257, 276, 257]] },
  ],
  spots: [
    { x: 228, y: 244, cap: 2 },
    { x: 244, y: 252, cap: 2 },
    { x: 262, y: 244, cap: 2 },
    { x: 196, y: 252, cap: 2 },
    { x: 222, y: 257, cap: 3 },
    { x: 266, y: 214, cap: 2 },
    { x: 205, y: 258, cap: 2 },
  ],
  dwellers: 10,
  // Canyon segments for the cards and checks: floor box, floor material, mean
  // wall height h and wall-to-wall width w (H/W = h / w).
  canyons: {
    lane: { name: 'Silk Lane', x0: 165, y0: 300, x1: 275, y1: 312, mat: 'stone', h: 28, w: 12 },
    deep: { name: 'Exchange Street', x0: 140, y0: 120, x1: 160, y1: 170, mat: 'asphalt', h: 90, w: 35 },
  },
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    spotStreet: [147.5, 217.5, 0], // Exchange Street beside the plaza: shaded at 3 pm, lit by the Plaza Tower's west face
    spotAvenue: [237.5, 177.5, 0], // Meridian Avenue under the Exchange Tower's south face
    plaza: [262.5, 252.5, 0],
    lane: [222.5, 307.5, 0],
    asphalt: [92.5, 187.5, 0],
    concrete: [262.5, 197.5, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [147.5, 217.5, 0], dx: -40, dy: 95, key: 'spot' },
    { at: [210, 170, 70], dx: 110, dy: -70, key: 'glass' },
    { at: [222.5, 306, 0], dx: 40, dy: 75, key: 'lane' },
    { at: [262.5, 252.5, 0], dx: 90, dy: 30, key: 'plaza' },
  ],
  startCam: { z: 2, cx: 235, cy: 225 },
};
