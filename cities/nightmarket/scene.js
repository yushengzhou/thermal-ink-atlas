// Scene: "Night market street". An invented 400 m x 400 m block in the manner
// of a subtropical city like Taipei (25.1° N) on a hot, humid July evening:
// Lantern Street, a 20 m pedestrian shopping street paved in granite, with
// three- and four-storey shophouses and their awnings on the north side and
// low one- and two-storey shops on the south side, turns into a night market
// from 16:00 to midnight: a row of food stalls down the street (charcoal
// grills, wok stalls, gas griddles and drinks), string lights, and a food
// court of stalls on Temple Square, which opens off the street to the north.
// Two narrow paved alleys (5 m between three-storey walls) lead off the
// street; ordinary asphalt streets run behind the blocks.
// Units: metres, x east, y south. Buildings, awnings and parcels are on the
// 5 m model grid; stalls are drawn (and carry heat sources), not modelled as
// shade or sky view. Plot sizes, storeys, the stall row and the layout are
// design choices, set before the first model run of the bands (docs/sources.md, Block 12).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const WALLS = ['#d9cdb8', '#cfc3ae', '#e0d2ba', '#c8b9a1', '#d6c6b0', '#cdbfa9', '#e2d6c2'];
const wall = (x, y) => WALLS[Math.floor(rnd(x, y, 3) * WALLS.length)];
const roofOf = (x, y) => (rnd(x, y, 2) < 0.6 ? 'greyTile' : rnd(x, y, 5) < 0.5 ? 'membrane' : 'coolroofAged');
const H3 = 10.5; // three storeys (the alley walls)
const buildings = [];
const add = (id, x0, y0, x1, y1, h, o = {}) => buildings.push({ id, name: o.name ?? `${Math.round(h / 3.4)}-storey building`, x0, y0, x1, y1, h, roof: o.roof ?? roofOf(x0, y0), wall: o.wall ?? wall(x0, y0), ...o.extra });

// north row: shophouses fronting Lantern Street (y 160-185), three or four storeys, an awning over each shopfront
const NORTH = [[0, 10], [10, 20], [20, 35], [35, 45], [45, 60], [60, 70], [70, 85], [85, 100], [105, 115], [115, 130], [130, 140], [140, 150], [150, 160], [240, 250], [250, 265], [265, 275], [275, 290], [290, 300], [300, 315], [315, 325], [325, 340], [340, 350], [350, 365], [365, 375], [375, 390], [390, 400]];
for (const [x0, x1] of NORTH) {
  const alley = x1 === 100 || x0 === 105;
  const h = alley || rnd(x0, 160, 1) < 0.55 ? H3 : 13.8;
  add(`n${x0}`, x0, 160, x1, 185, h, { name: `Shophouse, ${h === H3 ? 'three' : 'four'} storeys, shop on the ground floor`, roof: 'greyTile', extra: { style: 'front' } });
}
// south row: low shops fronting the street (y 205-230), one or two storeys
const SOUTH = [[0, 15], [15, 25], [25, 40], [40, 50], [50, 65], [65, 75], [75, 90], [90, 100], [100, 115], [115, 125], [125, 140], [140, 150], [150, 165], [165, 175], [175, 190], [190, 200], [200, 215], [215, 225], [225, 240], [240, 250], [250, 265], [265, 275], [275, 290], [290, 300], [305, 320], [320, 330], [330, 345], [345, 355], [355, 370], [370, 380], [380, 390], [390, 400]];
for (const [x0, x1] of SOUTH) {
  const h = rnd(x0, 205, 1) < 0.5 ? 4.5 : 7.5;
  add(`s${x0}`, x0, 205, x1, 230, h, { name: `Shop, ${h === 4.5 ? 'one storey' : 'two storeys'}`, roof: h === 4.5 ? 'metal' : 'greyTile', extra: { style: 'low' } });
}
// behind the north row: blocks of flats (y 75-155), three storeys next to the alley, four to six elsewhere
for (const [x0, x1] of [[0, 25], [25, 50], [50, 75], [75, 100], [105, 130], [130, 160], [240, 270], [270, 300], [300, 330], [330, 365], [365, 400]]) {
  for (const [y0, y1] of [[75, 115], [115, 155]]) {
    const alley = x1 === 100 || x0 === 105;
    const h = alley ? H3 : [13.8, 17.1, 20.4][Math.floor(rnd(x0, y0, 1) * 3)];
    add(`f${x0}_${y0}`, x0, y0, x1, y1, h, { name: `Block of flats, ${Math.round((h - 0.6) / 3.3)} storeys` });
  }
}
// behind the south row: blocks (y 235-325), three storeys next to the south alley
for (const [x0, x1] of [[0, 30], [30, 60], [60, 95], [95, 130], [130, 165], [165, 200], [200, 235], [235, 270], [270, 300], [305, 335], [335, 370], [370, 400]]) {
  for (const [y0, y1] of [[235, 280], [280, 325]]) {
    const alley = x1 === 300 || x0 === 305;
    const h = alley ? H3 : [10.5, 13.8, 17.1][Math.floor(rnd(x0, y0, 1) * 3)];
    add(`b${x0}_${y0}`, x0, y0, x1, y1, h, { name: `Block of flats, ${Math.round((h - 0.6) / 3.3)} storeys` });
  }
}
// the outer blocks across the back streets
for (const [x0, x1] of [[0, 40], [40, 85], [85, 130], [130, 170], [170, 215], [215, 260], [260, 300], [300, 345], [345, 400]]) {
  add(`o${x0}`, x0, 5, x1, 60, [13.8, 17.1, 20.4, 23.7][Math.floor(rnd(x0, 5, 1) * 4)]);
  add(`p${x0}`, x0, 340, x1, 395, [13.8, 17.1, 20.4][Math.floor(rnd(x0, 340, 1) * 3)]);
}
// the temple on the north side of Temple Square
add('temple', 180, 80, 220, 100, 8, { name: 'Temple hall, one tall storey with a tiled roof', roof: 'greyTile', wall: '#c4573f', extra: { gable: 'x', style: 'temple' } });

// awnings over the north row's shopfronts (y 185-190, 3.2 m up), one per shophouse
const screens = NORTH.map(([x0, x1]) => ({ id: `aw${x0}`, name: 'Shop awning (canvas)', kind: 'marketAwning', x0, y0: 185, x1, y1: 190, z: 3.2 }));

// the stalls: a row down Lantern Street (y 192.5, every 6.5 m) and the food court on Temple Square (two rows)
// type cycle (drawn and as heat sources): lpg griddle or steamer, drinks, charcoal grill, lpg, wok, lpg, drinks
const CYCLE = ['lpg', 'drinks', 'grill', 'lpg', 'wok', 'lpg', 'drinks'];
const stalls = [];
for (let x = 5, k = 0; x < 397; x += 6.5, k++) stalls.push({ id: `st${k}`, x: Math.round(x * 10) / 10, y: 192.5, type: CYCLE[k % CYCLE.length], face: 'S' });
for (const [y, s] of [[155, 0], [170, 3]]) for (let x = 172, k = 0; x < 232; x += 8.5, k++) stalls.push({ id: `sq${y}_${k}`, x, y, type: CYCLE[(k + s) % CYCLE.length], face: 'S' });

const ground = [
  { id: 'yards', name: 'Service lanes and yards (concrete)', mat: 'concrete', poly: rect(0, 0, 400, 400) },
  { id: 'backSt', name: 'Back Street (asphalt)', mat: 'asphalt', poly: rect(0, 62.5, 400, 72.5), street: 'ew' },
  { id: 'canalRd', name: 'Canal Road (asphalt)', mat: 'asphalt', poly: rect(0, 327.5, 400, 337.5), street: 'ew' },
  { id: 'lantern', name: 'Lantern Street (granite paving)', mat: 'stone', poly: rect(0, 185, 400, 205) },
  { id: 'square', name: 'Temple Square (granite paving)', mat: 'stone', poly: rect(160, 75, 240, 185), outline: true },
  { id: 'alleyN', name: 'Well Alley (granite paving, 5 m wide)', mat: 'stone', poly: rect(100, 75, 105, 185) },
  { id: 'alleyS', name: 'Lamp Alley (granite paving, 5 m wide)', mat: 'stone', poly: rect(300, 205, 305, 327.5) },
];

export const SCENE = {
  id: 'nightmarket',
  title: 'Night market street',
  size: 400,
  seed: 12150,
  marketBlock: true,
  startHour: 21, // the page opens in the evening, with the market running
  shadeSamples: 4,
  svfExact: true, // block 5's grid traversal: the alleys' walls at their true distance
  pooling: false,
  cullShadows: true,
  site: {
    lat: 25.09,
    lon: 121.52,
    tz: 8,
    year: 2026,
    month: 7,
    day: 15,
    taMin: 27,
    taMax: 34,
    wind: 1,
    vapourHpa: 30,
    plain: 'A hot, humid summer day and evening in a city like Taipei: the air goes from 27 °C to 34 °C.',
    note: 'A hot, humid July day and evening in a subtropical city like Taipei (25° N): air 27–34 °C, humid (vapour pressure 30 hPa), light wind 1 m/s. Made-up block, calculated temperatures; the air temperature is fixed: the crowd, the stalls and the lights do not warm it here.',
  },
  ground,
  buildings,
  screens,
  trees: [],
  cars: [],
  stalls,
  // the stalls go into the drawing's depth order as bench-sized objects (nmkit.js draws them); real benches on the square
  benches: [...stalls.map((s, i) => ({ x: s.x, y: s.y, a: 0, stall: i })), { x: 168, y: 118, a: 0 }, { x: 232, y: 118, a: 0 }, { x: 168, y: 132, a: 0 }, { x: 232, y: 132, a: 0 }],
  decor: {
    sheds: [],
    lamps: [[20, 204], [80, 204], [140, 204], [260, 204], [320, 204], [380, 204], [163, 105], [237, 105], [163, 145], [237, 145], [40, 74], [160, 74], [280, 74], [40, 326], [200, 326], [360, 326]],
    dashes: [[0, 400, 67.5, 'x'], [0, 400, 332.5, 'x']],
    paving: [[0, 185, 400, 205], [160, 100, 240, 185], [100, 75, 105, 185], [300, 205, 305, 327.5]],
  },
  // Walker routes (by day and evening): two variants each, of equal length.
  routes: [
    { id: 'lantern', n: 10, variants: [[0, 187.5, 400, 187.5], [0, 200, 400, 200]] },
    { id: 'back', n: 6, variants: [[0, 63.5, 400, 63.5], [0, 71.5, 400, 71.5]] },
    { id: 'canal', n: 6, variants: [[0, 328.5, 400, 328.5], [0, 336.5, 400, 336.5]] },
    { id: 'alleyN', n: 4, variants: [[101.2, 73, 101.2, 185], [103.8, 73, 103.8, 185]] },
    { id: 'alleyS', n: 4, variants: [[301.2, 205, 301.2, 327], [303.8, 205, 303.8, 327]] },
    { id: 'square', n: 6, variants: [[165, 112, 235, 112], [165, 140, 235, 140]] },
    { id: 'laneN', n: 3, variants: [[0, 156.5, 160, 156.5], [0, 158.5, 160, 158.5]] },
  ],
  // Dwell spots: the square's benches, under the awnings, the temple steps.
  spots: [
    { x: 168, y: 118, cap: 2 },
    { x: 232, y: 118, cap: 2 },
    { x: 168, y: 132, cap: 2 },
    { x: 232, y: 132, cap: 2 },
    { x: 200, y: 102, cap: 3 },
    { x: 40, y: 187.5, cap: 2 },
    { x: 125, y: 187.5, cap: 2 },
    { x: 300, y: 187.5, cap: 2 },
    { x: 360, y: 187.5, cap: 2 },
  ],
  dwellers: 12,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    square: [200, 125, 0],
    street: [62.5, 197.5, 0],
    awning: [62.5, 187.5, 0],
    stallRow: [62.5, 192.5, 0],
    alley: [102.5, 132.5, 0],
    alleyS: [302.5, 280, 0],
    backSt: [200, 67.5, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [80, 200, 0], dx: 40, dy: 150, key: 'stone' },
    { at: [200, 125, 0], dx: 60, dy: -235, key: 'square' },
    { at: [125, 187.5, 3], dx: 30, dy: -145, key: 'awning' },
    { at: [245.5, 192.5, 1], dx: 130, dy: 120, key: 'grill' },
    { at: [330, 197.5, 0], dx: 30, dy: -205, key: 'crowd' },
  ],
  startCam: { z: 2.5, cx: 205, cy: 175 },
};
