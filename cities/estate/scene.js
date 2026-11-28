// Scene: "Older high-rise estate". An invented 400 m x 400 m residential
// estate at 35° N of the kind built in older city districts: four rows of
// east-west slab blocks (18 floors, three slabs per row), spaced by the
// winter sunlight rule (大寒日 >= 2 h at every ground-floor sill), two
// 30-floor point towers at the north edge (lobbies and shops on their ground
// floors), a strip of two-storey shops on the estate road, worn lawns,
// surface parking between the rows, plane and pagoda trees along the roads
// and on the margins, and air-conditioning condensers stacked on the façades.
// Units: metres, x east, y south. Parcel and building edges sit on the 5 m
// model grid. Dimensions are assumptions (no source) except the floor height
// (2.9 m) and the row spacing, which follow the research brief.

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const FLOOR = 2.9; // m per storey (brief)
const SLAB_FLOORS = 18;
const TOWER_FLOORS = 30;
const DEPTH = 15; // slab depth, m
const GAP = 80; // clear spacing between rows (north face of a row to the south face of the row north of it), m
/** South faces of the four slab rows, north to south. */
const ROWS = [75, 75 + DEPTH + GAP, 75 + 2 * (DEPTH + GAP), 75 + 3 * (DEPTH + GAP)];
/** The three slab columns (x extents). */
const COLS = [[20, 120], [150, 250], [280, 380]];
const WALLS = ['#d9cbb4', '#cfc4b0', '#d6c2a8', '#c9c2b6'];

const buildings = [];
ROWS.forEach((s, r) => COLS.forEach(([x0, x1], c) => buildings.push({
  id: `slab${r + 1}${'abc'[c]}`,
  name: `Slab ${r + 1}${'ABC'[c]} (18 floors, older tiled façade)`,
  x0, y0: s - DEPTH, x1, y1: s,
  h: SLAB_FLOORS * FLOOR,
  roof: 'membrane',
  wall: WALLS[(r + c) % WALLS.length],
  kind: 'slab',
  floors: SLAB_FLOORS,
  flats: 8, // flats per floor: four stair cores, two flats each
  row: r,
})));
for (const [id, x0] of [['towerW', 25], ['towerE', 350]]) {
  buildings.push({ id, name: `Point tower ${id === 'towerW' ? 'West' : 'East'} (30 floors; lobby and shops on the ground floor)`, x0, y0: 15, x1: x0 + 25, y1: 40, h: TOWER_FLOORS * FLOOR, roof: 'membrane', wall: '#cdbfa8', kind: 'tower', floors: TOWER_FLOORS, flats: 6, lobby: true });
}
for (const [k, x0, x1] of [[1, 70, 150], [2, 160, 240], [3, 250, 330]]) {
  buildings.push({ id: `shops${k}`, name: 'Two-storey shops on the estate road', x0, y0: 15, x1, y1: 30, h: 7, roof: 'membrane', wall: '#b9a48a', kind: 'shops' });
}

const ground = [
  { id: 'paving', name: 'Estate paving (concrete)', mat: 'concrete', poly: rect(0, 0, 400, 400) },
  { id: 'northRoad', name: 'Estate Road', mat: 'asphalt', poly: rect(0, 0, 400, 10), street: 'ew' },
  { id: 'southRoad', name: 'Back Road', mat: 'asphalt', poly: rect(0, 390, 400, 400), street: 'ew' },
  { id: 'gapW', name: 'Estate lane (asphalt)', mat: 'asphalt', poly: rect(130, 40, 140, 390), street: 'ns' },
  { id: 'gapE', name: 'Estate lane (asphalt)', mat: 'asphalt', poly: rect(260, 40, 270, 390), street: 'ns' },
  { id: 'beltW', name: 'Tree belt (lawn)', mat: 'grass', poly: rect(0, 50, 15, 385), outline: true },
  { id: 'beltE', name: 'Tree belt (lawn)', mat: 'grass', poly: rect(385, 50, 400, 385), outline: true },
];
// courtyards between the rows: paving at the sills, a worn lawn, a path, surface parking, the access road
ROWS.slice(0, 3).forEach((s, k) => COLS.forEach(([x0, x1], c) => {
  ground.push({ id: `lawn${k}${c}`, name: 'Worn lawn', mat: 'grass', poly: rect(x0 + 5, s + 10, x1 - 5, s + 40), outline: true });
  // trampled patches: bare compacted soil
  ground.push({ id: `worn${k}${c}a`, name: 'Worn patch (bare soil)', mat: 'drySoil', poly: rect(x0 + 25, s + 20, x0 + 40, s + 30) });
  ground.push({ id: `worn${k}${c}b`, name: 'Worn patch (bare soil)', mat: 'drySoil', poly: rect(x1 - 35, s + 30, x1 - 15, s + 35) });
  ground.push({ id: `park${k}${c}`, name: 'Surface parking (asphalt)', mat: 'asphalt', poly: rect(x0, s + 45, x1, s + 60), outline: true });
}));
// south strip: a lawn between the last row and the back road
COLS.forEach(([x0, x1], c) => ground.push({ id: `lawnS${c}`, name: 'Worn lawn', mat: 'grass', poly: rect(x0 + 5, ROWS[3] + 10, x1 - 5, ROWS[3] + 25), outline: true }));

// parked cars: two rows of bays in each parking strip, about 60% taken (deterministic)
const COLOURS = ['#2b2b2e', '#b8bcc0', '#e8e6e0', '#a8463a', '#4a5f80', '#7f8589', '#45594a', '#b8bcc0'];
const cars = [];
ROWS.slice(0, 3).forEach((s, k) => COLS.forEach(([x0, x1], c) => {
  for (const [row, yc] of [[0, s + 47.6], [1, s + 57.4]]) {
    for (let x = x0 + 6.25; x < x1 - 5; x += 2.5) {
      if (rnd(k * 9 + c * 3 + row, Math.round(x * 4), 71) >= 0.6) continue;
      cars.push([x, yc + (rnd(k, Math.round(x * 4), row + 72) - 0.5) * 0.3, 'y', COLOURS[Math.floor(rnd(c, Math.round(x * 4), row + 73) * COLOURS.length)]]);
    }
  }
}));

// trees: plane trees along the two lanes and in the tree belts, pagoda trees (国槐) on the lawns and the plaza
const trees = [];
for (const x of [125, 145, 255, 275]) for (let y = 52; y < 385; y += 12) if (!ROWS.some((s) => y > s - DEPTH - 5 && y < s + 5)) trees.push({ x, y, r: 4.5, zc: 7.5 });
for (const x of [7.5, 392.5]) for (let y = 56; y < 382; y += 10) trees.push({ x, y, r: 5, zc: 8 });
ROWS.slice(0, 3).forEach((s, k) => COLS.forEach(([x0], c) => {
  for (let t = 0; t < 3; t++) trees.push({ x: x0 + 18 + t * 32 + Math.round(rnd(k, c, t) * 6), y: s + 14 + Math.round(rnd(c, k, t + 5) * 20), r: 3.5, zc: 6, species: 'pagodaTree' });
}));
for (const x of [75, 115, 185, 225, 290, 320]) trees.push({ x, y: 44, r: 4, zc: 6.5, species: 'pagodaTree' });

export const SCENE = {
  id: 'estate',
  title: 'Older high-rise estate',
  size: 400,
  seed: 7130,
  estateBlock: true,
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
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, light wind 1.5 m/s (as block 1). Air temperature is fixed: the heat of the condensers is shown, not felt by the air.',
  },
  floor: FLOOR,
  rows: ROWS,
  cols: COLS,
  gap: GAP,
  ground,
  buildings,
  trees,
  cars,
  benches: [
    { x: 60, y: 152, a: 0 },
    { x: 200, y: 247, a: 0 },
    { x: 330, y: 342, a: 0 },
    { x: 150, y: 46, a: 0 },
  ],
  decor: {
    sheds: [],
    lamps: [[135, 60], [135, 150], [135, 240], [135, 330], [265, 60], [265, 150], [265, 240], [265, 330], [60, 46], [340, 46]],
  },
  // Walker routes: two variants each, of equal length. The courtyard routes
  // pair the path along a slab's north face (in its shadow at midday) with
  // the path through the middle of the courtyard (in the sun).
  routes: [
    ...ROWS.slice(0, 3).map((s, k) => ({ id: `court${k + 1}`, n: 10, variants: [[0, s + 77.5, 400, s + 77.5], [0, s + 42.5, 400, s + 42.5]] })),
    { id: 'laneW', n: 8, variants: [[127.5, 10, 127.5, 390], [137.5, 10, 137.5, 390]] },
    { id: 'laneE', n: 8, variants: [[272.5, 10, 272.5, 390], [262.5, 10, 262.5, 390]] },
    { id: 'shops', n: 8, variants: [[0, 32.5, 400, 32.5], [0, 47.5, 400, 47.5]] },
    { id: 'back', n: 6, variants: [[0, 387.5, 400, 387.5], [0, 362.5, 400, 362.5]] },
  ],
  // Dwell spots: on the north-face paths, under the lawn and lane trees, on the plaza.
  spots: [
    { x: 60, y: 152, cap: 2 },
    { x: 200, y: 247, cap: 2 },
    { x: 330, y: 342, cap: 2 },
    { x: 125, y: 100, cap: 2 },
    { x: 275, y: 196, cap: 2 },
    { x: 150, y: 46, cap: 2 },
    { x: 240, y: 92, cap: 2 },
    { x: 7.5, y: 216, cap: 2 },
    { x: 392.5, y: 116, cap: 2 },
  ],
  dwellers: 12,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    sill: [70, 170.5, 0], // in front of slab 2A's south face
    courtyard: [72.5, 132.5, 0], // the middle of the courtyard north of slab 2A (paving between lawn and parking)
    northPath: [72.5, 152.5, 0], // the path along slab 2A's north face
    lawn: [72.5, 102.5, 0],
    parking: [72.5, 127.5, 0],
    roof: [70, 162.5, 52.2],
    plaza: [200, 42.5, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [330, 190, 0], dx: 110, dy: -90, key: 'courtyard' },
    { at: [70, 360, 1], dx: 40, dy: 105, key: 'sill' },
    { at: [200, 265, 30], dx: -110, dy: -120, key: 'ac' },
    { at: [37.5, 40, 87], dx: 90, dy: 20, key: 'tower' },
    { at: [330, 285, 0], dx: 150, dy: 30, key: 'lawn' },
  ],
  startCam: { z: 1.75, cx: 165, cy: 165 },
};
