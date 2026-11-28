// Scene: "Bus stops and footbridges". An invented 400 m x 400 m stretch of
// a north-south arterial (Station Avenue, 40 m of asphalt between 12 m
// sidewalks) crossed by an east-west street (Market Street) at 35° N on the
// design day. Five bus stops of different designs wait for buses:
//   A  opaque metal roof, Market Street (back panel to the south);
//   B  clear polycarbonate roof, west kerb (opaque back panel to the west);
//   C  opal polycarbonate roof with a west end screen, Market Street;
//   D  no shelter: a pole and a bench under street trees, west kerb;
//   E  an enclosed glass box with a glass roof, Market Street.
// Two steel footbridges cross the avenue 6 m up, one covered, one open.
// A pocket park, shops and flats line the streets. Units: metres, x east,
// y south. Street and parcel edges sit on the 5 m model grid; the shelters
// (2 m deep) do not: their shade and heat at the waiting spots come from the
// block's point model (engine/busstop.js). Dimensions are the brief's
// central values (shelter 2.65 m high, 2 m deep, 7 m long; deck 6 m up)
// or assumptions (layout, buildings).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Shelter height, depth and length (the brief's central values: 2.5-2.8, 1.5-2.5, 4-10 m). */
const H = 2.65;
/** Footbridge deck height (brief 5.5-6.5 m) and width; the cover is H above the deck. */
const DECK = 6;
const DECK_W = 3;

// Stops. roof: the flat roof (a screen); panels: vertical panels (x0 = x1: a
// panel facing east-west; y0 = y1: facing north-south), z0-z1 m, opaque
// (adPanel) or glass (glassBox); bench: the seat (metal or concrete, 0.45 m
// up); slots: waiting places [x, y, seated (1) or standing (0), cap]; open:
// a reference point in the open nearby; pole: the stop sign; bus: where the
// bus stops (centre of the bay, axis, direction of travel).
const stops = [
  {
    id: 'A',
    name: 'Stop A: opaque metal roof (Market Street, back panel to the south)',
    roof: { x0: 300, y0: 212, x1: 307, y1: 214, z: H, kind: 'roofMetal' },
    panels: [{ x0: 300, y0: 214, x1: 307, y1: 214, z0: 0.3, z1: 2.3, kind: 'adPanel' }],
    bench: { x0: 300.5, y0: 213.3, x1: 306, y1: 213.9, mat: 'metal' },
    slots: [[301, 213.5, 1, 1], [302.5, 213.5, 1, 1], [304, 213.5, 1, 1], [305.5, 213.5, 1, 1], [301.5, 212.6, 0, 1], [304, 212.6, 0, 1], [306.5, 212.6, 0, 1], [299, 210.8, 0, 2], [302.5, 210.8, 0, 2], [306, 210.8, 0, 2], [309, 211.6, 0, 2]],
    open: [303.5, 210.7],
    pole: [312, 210.8],
    bus: { x: 316, y: 206.5, axis: 'x', dir: 1 },
  },
  {
    id: 'B',
    name: 'Stop B: clear polycarbonate roof (west kerb, back panel to the west)',
    roof: { x0: 175, y0: 300, x1: 177, y1: 307, z: H, kind: 'polyClear' },
    panels: [{ x0: 175, y0: 300, x1: 175, y1: 307, z0: 0.3, z1: 2.3, kind: 'adPanel' }],
    bench: { x0: 175.1, y0: 300.5, x1: 175.7, y1: 306 },
    slots: [[175.5, 301.5, 1, 1], [175.5, 303, 1, 1], [175.5, 304.5, 1, 1], [175.5, 306, 1, 1], [176.4, 301, 0, 1], [176.4, 303.5, 0, 1], [176.4, 306, 0, 1], [178.4, 299, 0, 2], [178.4, 302.5, 0, 2], [178.4, 306, 0, 2], [176.8, 309.5, 0, 2]],
    open: [178.5, 303.5],
    pole: [179.2, 312],
    bus: { x: 183.5, y: 316, axis: 'y', dir: 1 },
  },
  {
    id: 'C',
    name: 'Stop C: opal polycarbonate roof with a west screen (Market Street)',
    roof: { x0: 262, y0: 186, x1: 269, y1: 188, z: H, kind: 'polyOpal' },
    panels: [
      { x0: 262, y0: 186, x1: 269, y1: 186, z0: 0.3, z1: 2.3, kind: 'adPanel' },
      { x0: 262, y0: 186, x1: 262, y1: 188, z0: 0.1, z1: 2.2, kind: 'adPanel', west: true },
    ],
    bench: { x0: 262.5, y0: 186.1, x1: 268, y1: 186.7 },
    slots: [[263, 186.5, 1, 1], [264.5, 186.5, 1, 1], [266, 186.5, 1, 1], [267.5, 186.5, 1, 1], [263.5, 187.4, 0, 1], [266, 187.4, 0, 1], [268.5, 187.4, 0, 1], [260.5, 189.3, 0, 2], [264, 189.3, 0, 2], [267.5, 189.3, 0, 2], [271, 188.5, 0, 2]],
    open: [264.5, 189.4],
    pole: [258, 189.2],
    bus: { x: 253, y: 193.5, axis: 'x', dir: -1 },
  },
  {
    id: 'D',
    name: 'Stop D: no shelter, a bench under street trees (west kerb)',
    roof: null,
    panels: [],
    bench: { x0: 173.2, y0: 61.5, x1: 173.8, y1: 65, mat: 'concrete' },
    slots: [[173.5, 62.5, 1, 1], [173.5, 64, 1, 1], [175, 58, 0, 1], [175, 61, 0, 1], [175, 66, 0, 1], [175, 69, 0, 1], [177.6, 60, 0, 2], [177.6, 64, 0, 2], [177.6, 68, 0, 2], [176, 72.5, 0, 2]],
    open: [177.8, 76],
    pole: [179.2, 75],
    bus: { x: 183.5, y: 79, axis: 'y', dir: 1 },
  },
  {
    id: 'E',
    name: 'Stop E: enclosed glass box with a glass roof (Market Street)',
    roof: { x0: 120, y0: 186, x1: 127, y1: 188.4, z: H, kind: 'glassBox' },
    panels: [
      { x0: 120, y0: 186, x1: 127, y1: 186, z0: 0, z1: H, kind: 'glassBox' },
      { x0: 120, y0: 186, x1: 120, y1: 188.4, z0: 0, z1: H, kind: 'glassBox' },
      { x0: 127, y0: 186, x1: 127, y1: 188.4, z0: 0, z1: H, kind: 'glassBox' },
      { x0: 120, y0: 188.4, x1: 125, y1: 188.4, z0: 0, z1: H, kind: 'glassBox' },
    ],
    bench: { x0: 120.5, y0: 186.1, x1: 126.5, y1: 186.7, mat: 'metal' },
    slots: [[121.5, 186.5, 1, 1], [123, 186.5, 1, 1], [124.5, 186.5, 1, 1], [121, 187.6, 0, 1], [123.5, 187.6, 0, 1], [126, 187.6, 0, 1], [119, 189.3, 0, 2], [122, 189.3, 0, 2], [125, 189.3, 0, 2], [128.5, 189.3, 0, 2]],
    open: [123.5, 189.4],
    pole: [116, 189.2],
    bus: { x: 111, y: 193.5, axis: 'x', dir: -1 },
  },
];

/** Footbridges: deck (x0-x1 across the avenue, y0-y1), 6 m up; covered or open; stairs down at both ends (drawn only). */
const bridges = [
  { id: 'covered', name: 'Covered footbridge (steel deck under an opaque cover)', x0: 166, y0: 120, x1: 234, y1: 120 + DECK_W, z: DECK, cover: true },
  { id: 'open', name: 'Open footbridge (steel deck in the sun)', x0: 166, y0: 260, x1: 234, y1: 260 + DECK_W, z: DECK, cover: false },
];

// screens of the grid model: the shelter roofs, the decks and the cover
const screens = [
  ...stops.filter((s) => s.roof).map((s) => ({ id: `roof${s.id}`, ...s.roof })),
  ...bridges.map((b) => ({ id: `deck-${b.id}`, kind: 'bridgeDeck', x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, z: b.z })),
  ...bridges.filter((b) => b.cover).map((b) => ({ id: `cover-${b.id}`, kind: 'bridgeRoof', x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, z: b.z + H })),
];

const ground = [
  { id: 'paving', name: 'Sidewalks and forecourts (concrete)', mat: 'concrete', poly: rect(0, 0, 400, 400) },
  { id: 'park', name: 'Pocket park (lawn)', mat: 'grass', poly: rect(95, 20, 160, 170), outline: true },
  { id: 'yard', name: 'Market hall yard (asphalt)', mat: 'asphalt', poly: rect(240, 240, 330, 300), outline: true },
  { id: 'avenue', name: 'Station Avenue (asphalt)', mat: 'asphalt', poly: rect(180, 0, 220, 400), street: 'ns' },
  { id: 'market', name: 'Market Street (asphalt)', mat: 'asphalt', poly: rect(0, 190, 400, 210), street: 'ew' },
];

const buildings = [
  // north-west: flats behind the park
  { id: 'nw1', name: 'Flats (7 floors)', x0: 15, y0: 20, x1: 80, y1: 75, h: 21, roof: 'membrane', wall: '#d6c7ab' },
  { id: 'nw2', name: 'Flats (6 floors)', x0: 15, y0: 95, x1: 80, y1: 170, h: 18, roof: 'membrane', wall: '#cdbb9d' },
  // north-east: shops with flats over them, set back from the avenue
  { id: 'ne1', name: 'Shops and flats (4 floors)', x0: 240, y0: 20, x1: 300, y1: 80, h: 13, roof: 'membrane', wall: '#d8c3a5', shops: true },
  { id: 'ne2', name: 'Shops and flats (5 floors)', x0: 240, y0: 95, x1: 300, y1: 170, h: 16, roof: 'membrane', wall: '#c9b596', shops: true },
  { id: 'ne3', name: 'Offices (8 floors)', x0: 315, y0: 20, x1: 390, y1: 170, h: 26, roof: 'membrane', wall: '#bfb3a0' },
  // south-west: a low market hall and a school
  { id: 'sw1', name: 'Covered market (metal roof)', x0: 40, y0: 230, x1: 150, y1: 300, h: 7, roof: 'metal', wall: '#c4b49a' },
  { id: 'sw2', name: 'Flats (6 floors)', x0: 40, y0: 320, x1: 150, y1: 385, h: 18, roof: 'membrane', wall: '#d2c1a3' },
  // south-east: a depot and flats
  { id: 'se1', name: 'Bus depot office (2 floors)', x0: 340, y0: 235, x1: 390, y1: 300, h: 7, roof: 'metal', wall: '#bdae95' },
  { id: 'se2', name: 'Flats (6 floors)', x0: 245, y0: 320, x1: 390, y1: 385, h: 18, roof: 'membrane', wall: '#cbb89a' },
];

// trees: street trees on the sidewalks (none over the shelters, the bridges or the junction), the park, the tree stop
const trees = [];
const clear = (v, gaps) => gaps.every(([a, b]) => v < a || v > b);
for (let y = 10; y < 395; y += 18) {
  if (clear(y, [[48, 82], [108, 138], [170, 230], [248, 278], [290, 322]])) trees.push({ x: 170, y, r: 4, zc: 6.5 });
  if (clear(y, [[108, 138], [170, 230], [248, 278]])) trees.push({ x: 230, y, r: 4, zc: 6.5 });
}
for (let x = 10; x < 395; x += 18) {
  if (clear(x, [[100, 140], [160, 240], [245, 285]])) trees.push({ x, y: 180, r: 4, zc: 6.5 });
  if (clear(x, [[160, 240], [288, 326]])) trees.push({ x, y: 220, r: 4, zc: 6.5 });
}
// the park: a few rows of plane trees
for (let y = 35; y < 165; y += 22) for (let x = 108; x < 158; x += 20) trees.push({ x: x + Math.round(rnd(x, y) * 4), y, r: 5, zc: 7 });
// stop D: three broad street trees at the back of the sidewalk
for (const y of [57, 64, 71]) trees.push({ x: 169, y, r: 5, zc: 7.5 });

// parked cars in the market yard (deterministic, about half the bays)
const COLOURS = ['#2b2b2e', '#b8bcc0', '#e8e6e0', '#a8463a', '#4a5f80', '#7f8589'];
const cars = [];
for (const [row, yc] of [[0, 247.5], [1, 292.5]]) {
  for (let x = 246.25; x < 326; x += 2.5) {
    if (rnd(row, Math.round(x * 4), 91) >= 0.5) continue;
    cars.push([x, yc, 'y', COLOURS[Math.floor(rnd(row, Math.round(x * 4), 92) * COLOURS.length)]]);
  }
}

export const SCENE = {
  id: 'busstop',
  title: 'Bus stops and footbridges',
  size: 400,
  seed: 9140,
  busBlock: true,
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
    plain: 'A hot summer day: the air goes from 25 °C at dawn to 35 °C in the afternoon.',
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, light wind 1.5 m/s (as block 1). Air temperature is fixed: no warm air trapped in the glass shelter, no bus exhaust.',
  },
  shelterH: H,
  deck: DECK,
  stops,
  bridges,
  ground,
  buildings,
  trees,
  screens,
  cars,
  benches: [],
  decor: {
    sheds: [],
    lamps: [[172, 40], [228, 100], [172, 150], [228, 240], [172, 350], [228, 330], [60, 182], [300, 218], [340, 182]],
    dashes: [[0, 400, 200, 'y'], [0, 180, 200, 'x'], [220, 400, 200, 'x']],
    crossings: [[182, 182, 218, 188, 'x'], [182, 212, 218, 218, 'x'], [172, 192, 178, 208, 'y'], [222, 192, 228, 208, 'y']],
  },
  // Walker routes (two variants each, of equal length, on opposite sidewalks).
  routes: [
    { id: 'avenueKerb', n: 7, variants: [[178.5, 5, 178.5, 395], [221.5, 5, 221.5, 395]] },
    { id: 'avenueBack', n: 6, variants: [[171.5, 5, 171.5, 395], [230.5, 5, 230.5, 395]] },
    { id: 'market', n: 6, variants: [[5, 183, 395, 183], [5, 217, 395, 217]] },
    { id: 'marketKerb', n: 5, variants: [[5, 188.8, 395, 188.8], [5, 211.5, 395, 211.5]] },
  ],
  spots: [],
  dwellers: 0,
  // Buses and riders (engine/busstop.js): headway, its spread, rider arrivals; the bus clock runs 12 times faster than the animation.
  // Riders who cross the footbridges (engine/bsui.js).
  crossers: 5,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    stopA: [303.5, 213, 0],
    open: [303.5, 210.7, 0],
    deckOpen: [200, 261.5, DECK],
    deckCovered: [200, 121.5, DECK],
    road: [200, 150, 0],
    park: [130, 100, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [262, 187, 2.2], dx: 130, dy: -120, key: 'screen' },
    { at: [303.5, 213, 2.65], dx: 120, dy: 60, key: 'stopA' },
    { at: [123.5, 187, 2.65], dx: -170, dy: -90, key: 'glass' },
    { at: [200, 261.5, 6], dx: 150, dy: 70, key: 'deck' },
    { at: [173.5, 64, 1], dx: -170, dy: -40, key: 'trees' },
  ],
  startCam: { z: 1.75, cx: 200, cy: 180 },
};
