// Scene: "School campus playground". An invented 400 m x 400 m school campus
// at 35° N on a summer day-camp day: a 400 m running track (PU / EPDM on
// asphalt) around an artificial-turf football pitch, three acrylic
// basketball courts, a natural grass field, a playground on poured rubber
// with a slide, climbing frames, two shade sails and shade trees, the
// teaching block and the gym on the north road, a staff car park and trees
// along the edges. Units: metres, x east, y south. Straight parcel and
// building edges sit on the 5 m model grid; the track is a stadium shape
// (straights and half-circles), drawn as a polygon the 5 m grid rasterises.
// Dimensions are assumptions (no source) except the track's, which follow
// the standard 400 m track (36.5 m radius, 84.39 m straights).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

/** A stadium (two straights joined by half-circles) centred at (cx, cy): straights 2 * half long along x, radius r. */
const stadium = (cx, cy, half, r, n = 18) => {
  const out = [];
  for (let k = 0; k <= n; k++) {
    const a = -Math.PI / 2 + (k / n) * Math.PI;
    out.push(cx + half + r * Math.cos(a), cy + r * Math.sin(a));
  }
  for (let k = 0; k <= n; k++) {
    const a = Math.PI / 2 + (k / n) * Math.PI;
    out.push(cx - half + r * Math.cos(a), cy + r * Math.sin(a));
  }
  return out.map((v) => Math.round(v * 100) / 100);
};

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** The track: centre, half the straight (84.39 / 2 m), radius of lane 1's kerb and the outer edge (8 lanes of 1.22 m, rounded up to 10 m). */
const TRACK = { cx: 155, cy: 125, half: 42.2, rIn: 36.5, rOut: 46.5 };
/** The pitch on the turf (105 x 68 m is a full pitch; this one is 100 x 64 m). */
const PITCH = [105, 93, 205, 157];
/** The courts slab and its three basketball courts (28 x 15 m, long axis north-south). */
const COURTS = [265, 70, 390, 130];
const COURT_X = [272.5, 312.5, 352.5];
/** The playground (poured rubber) and its two shade sails, 3.5 m up. */
const PLAY = [275, 165, 385, 255];
const SAILS = [
  { id: 'sailA', x0: 285, y0: 175, x1: 315, y1: 200, z: 3.5, kind: 'shadeSail' },
  { id: 'sailB', x0: 330, y0: 215, x1: 365, y1: 240, z: 3.5, kind: 'shadeSail' },
];

const ground = [
  { id: 'paving', name: 'School paving (concrete)', mat: 'concrete', poly: rect(0, 0, 400, 400) },
  { id: 'northRoad', name: 'School Road', mat: 'asphalt', poly: rect(0, 0, 400, 10), street: 'ew' },
  { id: 'southRoad', name: 'Back Lane', mat: 'asphalt', poly: rect(0, 390, 400, 400), street: 'ew' },
  { id: 'carpark', name: 'Staff car park (asphalt)', mat: 'asphalt', poly: rect(280, 320, 385, 375), outline: true },
  { id: 'field', name: 'Grass field (natural grass, watered)', mat: 'grass', poly: rect(20, 205, 240, 300), outline: true },
  { id: 'belt', name: 'Tree belt (lawn)', mat: 'grass', poly: rect(20, 320, 260, 380), outline: true },
  { id: 'courts', name: 'Basketball courts (acrylic on asphalt)', mat: 'acrylic', poly: rect(...COURTS), outline: true },
  { id: 'play', name: 'Playground (poured rubber)', mat: 'rubber', poly: rect(...PLAY), outline: true },
  { id: 'track', name: 'Running track (PU / EPDM on asphalt)', mat: 'track', poly: stadium(TRACK.cx, TRACK.cy, TRACK.half, TRACK.rOut), outline: true },
  { id: 'pitch', name: 'Football pitch (artificial turf, crumb-rubber infill)', mat: 'turf', poly: stadium(TRACK.cx, TRACK.cy, TRACK.half, TRACK.rIn), outline: true },
];

const buildings = [
  { id: 'teaching', name: 'Teaching block (4 floors)', x0: 30, y0: 20, x1: 230, y1: 40, h: 16, roof: 'membrane', wall: '#d8c8ad', kind: 'school', floors: 4 },
  { id: 'gym', name: 'Gym (dark metal roof)', x0: 250, y0: 20, x1: 330, y1: 55, h: 11, roof: 'metal', wall: '#c6b9a3', kind: 'gym', floors: 1 },
  { id: 'kiosk', name: 'Changing rooms and kiosk', x0: 345, y0: 20, x1: 385, y1: 40, h: 4, roof: 'membrane', wall: '#bfa98d', kind: 'school', floors: 1 },
];

// trees: plane trees along the roads and the field, broad shade trees on the playground's west side
const trees = [];
for (let x = 20; x < 395; x += 25) trees.push({ x, y: 14, r: 4, zc: 6.5 });
for (let y = 60; y < 385; y += 14) trees.push({ x: 8, y, r: 4.5, zc: 7 });
for (let y = 140; y < 385; y += 16) trees.push({ x: 393, y, r: 4.5, zc: 7 });
for (let x = 70; x < 245; x += 20) trees.push({ x, y: 190, r: 4.5, zc: 7 });
for (let x = 28; x < 240; x += 18) trees.push({ x, y: 310, r: 4.5, zc: 7 });
for (let x = 35; x < 255; x += 30) for (const y of [335, 362]) trees.push({ x: x + Math.round(rnd(x, y) * 8), y, r: 5, zc: 7.5 });
// playground shade trees (crowns over the west part of the rubber)
for (const [x, y] of [[282, 222], [282, 240], [296, 250], [312, 250], [368, 172]]) trees.push({ x, y, r: 6, zc: 7 });

// parked cars in the staff car park (deterministic, about half the bays)
const COLOURS = ['#2b2b2e', '#b8bcc0', '#e8e6e0', '#a8463a', '#4a5f80', '#7f8589'];
const cars = [];
for (const [row, yc] of [[0, 327.5], [1, 367.5]]) {
  for (let x = 286.25; x < 380; x += 2.5) {
    if (rnd(row, Math.round(x * 4), 81) >= 0.5) continue;
    cars.push([x, yc, 'y', COLOURS[Math.floor(rnd(row, Math.round(x * 4), 82) * COLOURS.length)]]);
  }
}

export const SCENE = {
  id: 'campus',
  title: 'School campus playground',
  size: 400,
  seed: 8120,
  campusBlock: true,
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
    note: 'Assumed heat-wave day: 35° N, 20 July (a summer day camp in the school holidays), air 25–35 °C, light wind 1.5 m/s (as block 1). Air temperature is fixed: no air layer over the hot turf.',
  },
  track: TRACK,
  pitch: PITCH,
  courts: COURTS,
  courtX: COURT_X,
  play: PLAY,
  ground,
  buildings,
  trees,
  screens: SAILS,
  cars,
  benches: [
    { x: 75, y: 195, a: 0 },
    { x: 155, y: 195, a: 0 },
    { x: 235, y: 195, a: 0 },
    { x: 290, y: 232, a: 0 },
    { x: 100, y: 330, a: 0 },
  ],
  decor: {
    sheds: [],
    lamps: [[60, 60], [250, 70], [60, 200], [250, 200], [260, 300], [60, 315]],
  },
  // the playground's equipment, drawn only (not in the model): the slide (metal), climbing frames, swings
  equipment: [
    { kind: 'slide', x: 300, y: 187, a: 0 },
    { kind: 'frame', x: 345, y: 227 },
    { kind: 'frame', x: 360, y: 185 },
    { kind: 'swings', x: 330, y: 175 },
  ],
  // Walker routes (staff, parents, older children): two variants each, of equal length.
  routes: [
    { id: 'front', n: 6, variants: [[10, 47.5, 390, 47.5], [10, 72.5, 390, 72.5]] },
    { id: 'west', n: 5, variants: [[17.5, 60, 17.5, 385], [52.5, 60, 52.5, 385]] },
    { id: 'east', n: 6, variants: [[252.5, 60, 252.5, 385], [262.5, 60, 262.5, 385]] },
    { id: 'middle', n: 6, variants: [[10, 197.5, 390, 197.5], [10, 182.5, 390, 182.5]] },
    { id: 'south', n: 5, variants: [[10, 312.5, 390, 312.5], [10, 302.5, 390, 302.5]] },
  ],
  // Dwell spots: benches and shade along the track and the field (grown-ups waiting).
  spots: [
    { x: 75, y: 193, cap: 2 },
    { x: 155, y: 193, cap: 2 },
    { x: 235, y: 193, cap: 2 },
    { x: 100, y: 330, cap: 2 },
    { x: 255, y: 150, cap: 2 },
    { x: 260, y: 240, cap: 2 },
    { x: 60, y: 60, cap: 2 },
  ],
  dwellers: 8,
  // Children at play times (the block's own figures, engine/cpui.js): play spots
  // on the playground, the courts and the pitch edge, each for up to `cap` children.
  kids: {
    n: 26,
    times: [[10, 10.5], [12, 13], [15, 15.5]],
    spots: [
      { x: 300, y: 187, cap: 5 },
      { x: 348, y: 228, cap: 5 },
      { x: 288, y: 232, cap: 4 },
      { x: 304, y: 247, cap: 4 },
      { x: 360, y: 185, cap: 4 },
      { x: 330, y: 175, cap: 4 },
      { x: 375, y: 245, cap: 4 },
      { x: 330, y: 205, cap: 4 },
      { x: 155, y: 125, cap: 6 },
      { x: 120, y: 110, cap: 4 },
      { x: 312, y: 100, cap: 4 },
      { x: 352, y: 100, cap: 4 },
    ],
  },
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    turf: [155, 125, 0],
    grass: [130, 252.5, 0],
    track: [155, 82.5, 0],
    acrylic: [332.5, 102.5, 0],
    rubber: [372.5, 207.5, 0],
    sail: [302.5, 187.5, 0],
    paving: [250, 62.5, 0],
    roof: [290, 37.5, 11],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [170, 140, 0], dx: -150, dy: -110, key: 'turf' },
    { at: [302, 190, 3.5], dx: 120, dy: -120, key: 'sail' },
    { at: [372, 207, 0], dx: 120, dy: -60, key: 'burn' },
    { at: [120, 110, 0], dx: -160, dy: 70, key: 'water' },
    { at: [348, 228, 0], dx: 150, dy: 40, key: 'kids' },
  ],
  startCam: { z: 1.75, cx: 210, cy: 170 },
};
