// Scene: "Desert courtyard neighbourhood". An invented 400 m x 400 m block in
// the manner of a hot-arid city like Phoenix (33.4° N) on a clear mid-July
// day: one- and two-storey houses of light stucco built around small
// courtyards, gravel (xeriscape) yards with mesquite and palo verde trees, a
// gravel plaza with shade sails, a ramada and desert trees, a row of shops
// with an arcade along Main Street, a café patio under a misted roof, one
// irrigated lawn park, and Main Street with a light reflective coating.
// Units: metres, x east, y south. Every courtyard house is four wings around
// a 10 m courtyard, on a 30 m plot aligned to the 5 m model grid; plot sizes,
// storeys, roofs, sails, trees and the layout are design choices, set before
// the first model run of the bands (docs/sources.md, Block 11).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const WALLS = ['#eadcc3', '#e4d2b4', '#efe3cf', '#e0cba8', '#e8d8bd', '#ead3bb'];
const buildings = [];
const courts = [];
const trees = [];

/** A courtyard house on the 30 m plot at (x0, y0): four wings 10 m deep around a 10 m courtyard. */
function house(id, x0, y0) {
  const r = rnd(x0, y0, 1);
  const storeys = r < 0.65 ? 1 : 2;
  const h = storeys === 1 ? 4.5 : 7.5;
  const roof = rnd(x0, y0, 2) < 0.7 ? 'coolroofAged' : 'membrane';
  const wall = WALLS[Math.floor(rnd(x0, y0, 3) * WALLS.length)];
  const name = `Courtyard house, ${storeys === 1 ? 'one storey' : 'two storeys'}, light stucco`;
  const common = { name, h, roof, wall, style: 'court', storeys, house: id };
  buildings.push(
    { id: `${id}n`, x0, y0, x1: x0 + 30, y1: y0 + 10, ...common, wing: 'n' },
    { id: `${id}s`, x0, y0: y0 + 20, x1: x0 + 30, y1: y0 + 30, ...common, wing: 's' },
    { id: `${id}w`, x0, y0: y0 + 10, x1: x0 + 10, y1: y0 + 20, ...common, wing: 'w' },
    { id: `${id}e`, x0: x0 + 20, y0: y0 + 10, x1: x0 + 30, y1: y0 + 20, ...common, wing: 'e' },
  );
  courts.push({ id: `court_${id}`, name: 'Courtyard (gravel)', mat: 'gravel', poly: rect(x0 + 10, y0 + 10, x0 + 20, y0 + 20), court: id });
  // half the courtyards have a small palo verde
  if (rnd(x0, y0, 4) < 0.5) trees.push({ x: x0 + 15, y: y0 + 15, r: 3, zc: 3.6, species: 'paloVerde' });
}

// north-west: four rows of five houses; south-west: five rows; south-east below the park: one row
const XS = [10, 45, 80, 115, 150];
for (const y0 of [10, 45, 95, 130]) XS.forEach((x0, k) => house(`nw${y0}_${k}`, x0, y0));
for (const y0 of [210, 245, 295, 330, 365]) XS.forEach((x0, k) => house(`sw${y0}_${k}`, x0, y0));
for (const [k, x0] of [225, 260, 295, 330, 365].entries()) house(`se_${k}`, x0, 340);

// the shops along Main Street, with the arcade on their south face
buildings.push({ id: 'shops', name: 'Shops, two storeys, with an arcade along Main Street', x0: 225, y0: 140, x1: 390, y1: 165, h: 7.5, roof: 'coolroofAged', wall: '#e6d5bb', style: 'shops' });

// Flat screens: shade sails (4 m), the ramada (3.2 m), the arcade roof (3.5 m), the café patio roof (3 m, misted)
const screens = [
  { id: 'sail1', name: 'Shade sail over the plaza', kind: 'desertSail', x0: 230, y0: 20, x1: 250, y1: 40, z: 4 },
  { id: 'sail2', name: 'Shade sail over the plaza', kind: 'desertSail', x0: 255, y0: 20, x1: 275, y1: 40, z: 4 },
  { id: 'sail3', name: 'Shade sail over the plaza', kind: 'desertSail', x0: 230, y0: 50, x1: 250, y1: 70, z: 4 },
  { id: 'ramada', name: 'Ramada (shade roof on posts)', kind: 'ramada', x0: 285, y0: 20, x1: 305, y1: 40, z: 3.2 },
  { id: 'arcade', name: 'Arcade along the shops', kind: 'arcadeRoof', x0: 225, y0: 165, x1: 390, y1: 170, z: 3.5 },
  { id: 'patio', name: 'Café patio roof, with misters', kind: 'ramada', x0: 350, y0: 125, x1: 380, y1: 135, z: 3, patio: true },
];

// mesquites in the plaza's east, palo verdes along its south, mesquites along the park's north path and in the yards
for (const x of [325, 342, 359, 376]) for (const y of [27, 48]) trees.push({ x, y, r: 4.5, zc: 4, species: 'mesquite' });
for (const x of [330, 347, 364, 381]) trees.push({ x, y: 95, r: 3.5, zc: 3.6, species: 'paloVerde' });
for (const x of [232, 254, 276, 298, 320, 342, 364, 386]) trees.push({ x, y: 205, r: 4.5, zc: 4, species: 'mesquite' });
for (const x of [27, 97, 167]) trees.push({ x, y: 92.5, r: 4, zc: 4, species: 'mesquite' });
for (const x of [62, 132]) trees.push({ x, y: 292.5, r: 4, zc: 4, species: 'mesquite' });

const ground = [
  { id: 'yards', name: 'Gravel yards and paths (xeriscape)', mat: 'gravel', poly: rect(0, 0, 400, 400) },
  { id: 'resN', name: 'Residential street (asphalt)', mat: 'asphalt', poly: rect(0, 80, 195, 90), street: 'ew' },
  { id: 'resS', name: 'Residential street (asphalt)', mat: 'asphalt', poly: rect(0, 280, 195, 290), street: 'ew' },
  { id: 'walkN', name: 'Sidewalk (concrete)', mat: 'concrete', poly: rect(0, 170, 400, 180) },
  { id: 'walkS', name: 'Sidewalk (concrete)', mat: 'concrete', poly: rect(0, 195, 400, 200) },
  { id: 'main', name: 'Main Street, with a light reflective coating', mat: 'coolCoat', poly: rect(0, 180, 400, 195), street: 'ew' },
  { id: 'walkW', name: 'Sidewalk (concrete)', mat: 'concrete', poly: rect(195, 0, 200, 400) },
  { id: 'walkE', name: 'Sidewalk (concrete)', mat: 'concrete', poly: rect(212, 0, 217, 400) },
  { id: 'cross', name: 'Cross Street (asphalt, uncoated)', mat: 'asphalt', poly: rect(200, 0, 212, 400), street: 'ns' },
  { id: 'plaza', name: 'Shade Plaza (decomposed granite)', mat: 'gravel', poly: rect(222, 8, 392, 132), outline: true },
  { id: 'arcadeWalk', name: 'Walkway under the arcade (concrete)', mat: 'concrete', poly: rect(222, 165, 392, 170) },
  { id: 'patio', name: 'Café patio (concrete, misted)', mat: 'concrete', poly: rect(350, 125, 380, 135) },
  { id: 'lawn', name: 'Lawn Park (irrigated bermudagrass)', mat: 'desertLawn', poly: rect(222, 212, 392, 322), outline: true },
  ...courts,
];

export const SCENE = {
  id: 'desert',
  title: 'Desert courtyard neighbourhood',
  size: 400,
  seed: 11170,
  desertBlock: true,
  shadeSamples: 4, // shade every 1.25 m (block 5's): courtyards, arcade and sail edges
  svfExact: true, // block 5's grid traversal: the courtyard walls at their true distance
  pooling: false,
  cullShadows: true,
  site: {
    lat: 33.43,
    lon: -112.0,
    tz: -7,
    year: 2026,
    month: 7,
    day: 15,
    taMin: 30,
    taMax: 43,
    tmaxHour: 16.5,
    wind: 1.5,
    vapourHpa: 12,
    plain: 'A clear, very dry summer day in a desert city like Phoenix: the air goes from 30 °C at dawn to 43 °C in the late afternoon.',
    note: 'A clear mid-July day in a hot desert city like Phoenix (33.4° N, no daylight saving): air 30–43 °C, warmest at 4:30 pm, very dry (vapour pressure 12 hPa), light wind 1.5 m/s. Made-up block, calculated temperatures; the air temperature is fixed: misters and the lawn do not cool it here.',
  },
  ground,
  buildings,
  screens,
  trees,
  cars: [],
  benches: [{ x: 240, y: 30, a: 0 }, { x: 262, y: 32, a: 0 }, { x: 295, y: 30, a: 0 }, { x: 340, y: 38, a: 0 }, { x: 300, y: 168, a: 0 }, { x: 250, y: 205, a: 0 }],
  decor: {
    sheds: [],
    lamps: [[30, 176], [110, 176], [190, 176], [250, 176], [330, 176], [30, 198], [130, 198], [270, 198], [370, 198], [198, 40], [198, 120], [214, 260], [214, 340]],
    dashes: [[0, 400, 187.5, 'x'], [0, 400, 206, 'y']],
  },
  // Walker routes: two variants each, of equal length (a sunnier and a shadier way).
  routes: [
    { id: 'plaza', n: 8, variants: [[225, 88, 392, 88], [225, 32, 392, 32]] },
    { id: 'arcade', n: 8, variants: [[222, 177, 392, 177], [222, 167.5, 392, 167.5]] },
    { id: 'main', n: 6, variants: [[0, 197.5, 195, 197.5], [0, 175, 195, 175]] },
    { id: 'cross', n: 6, variants: [[214.5, 0, 214.5, 400], [197.5, 0, 197.5, 400]] },
    { id: 'park', n: 6, variants: [[225, 260, 392, 260], [225, 206, 392, 206]] },
    { id: 'houses', n: 6, variants: [[0, 85, 195, 85], [0, 42.5, 195, 42.5]] },
  ],
  // Dwell spots: under the sails, the ramada, the mesquites, the arcade, on the patio, in the open plaza and on the lawn.
  spots: [
    { x: 240, y: 30, cap: 2 },
    { x: 265, y: 30, cap: 2 },
    { x: 240, y: 60, cap: 2 },
    { x: 295, y: 30, cap: 3 },
    { x: 342, y: 30, cap: 2 },
    { x: 365, y: 52, cap: 2 },
    { x: 270, y: 167.5, cap: 2 },
    { x: 330, y: 167.5, cap: 2 },
    { x: 362, y: 130, cap: 3 },
    { x: 280, y: 100, cap: 2 },
    { x: 300, y: 260, cap: 2 },
    { x: 254, y: 207, cap: 2 },
    { x: 340, y: 206, cap: 2 },
  ],
  dwellers: 14,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    plaza: [280, 95, 0],
    sail: [242.5, 32.5, 0],
    ramada: [297.5, 27.5, 0],
    mesquite: [345, 30, 0],
    arcade: [300, 167.5, 0],
    lawn: [305, 270, 0],
    main: [100, 187.5, 0],
    cross: [206, 120, 0],
    court: [92.5, 107.5, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [242.5, 30, 4], dx: -50, dy: -190, key: 'sail' },
    { at: [300, 167.5, 0], dx: 120, dy: -150, key: 'arcade' },
    { at: [305, 265, 0], dx: 140, dy: 70, key: 'lawn' },
    { at: [120, 187.5, 0], dx: 40, dy: 150, key: 'street' },
    { at: [280, 95, 0], dx: 20, dy: -215, key: 'plaza' },
  ],
  startCam: { z: 2, cx: 230, cy: 180 },
};
