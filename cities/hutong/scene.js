// Scene: "Hutong lanes and courtyards". An invented 400 m x 400 m block in the
// manner of old Beijing: six bands of single-storey courtyard houses
// (siheyuan), two rows to a band, back to back, between east-west lanes
// (hutong) 5 m wide, a 10 m main lane (Pagoda Tree Hutong) and one north-south
// lane (Bell Lane). Every house is a 4 m grey-brick box with a grey tile roof;
// each courtyard has a jujube, pomegranate or pagoda tree, some a vine
// pergola, a few the summer mat awning (tianpeng) over the whole yard. Small
// Well Square sits where Bell Lane meets Well Lane.
// Units: metres, x east, y south. Edges sit on the 5 m model grid. Plot widths
// (25-35 m), house depth (5 m), eave height (4 m) and lane widths are
// assumptions in the brief's range (hutong dimensions unverified).
// Lanes: 5 m lanes with 4 m walls (H/W 0.8); the 10 m main lane H/W 0.4.

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];
const H = 4; // eave height of every house, m
const BANDS = [5, 70, 140, 205, 270, 335]; // top edge of each 60 m band
const WEST = [25, 30, 25, 35, 25, 30, 25]; // plot widths, x 0-195
const EAST = [30, 25, 35, 25, 30, 25, 30]; // plot widths, x 200-400
const HALVES = [[0, 195, WEST], [200, 400, EAST]];
const SQUARE = [200, 240, 230, 265]; // Well Square (replaces one row-B plot of band 4)

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const rot = (a, k) => a.map((_, i) => a[(i + k) % a.length]);

const WALL = ['#9a9a93', '#a3a29a', '#93938d', '#a8a69d'];
const buildings = [];
const trees = [];
const screens = [];
const courts = []; // {x0, y0, x1, y1, k, row}
const house = (id, name, x0, y0, x1, y1, gable, extra = {}) =>
  buildings.push({ id, name, x0, y0, x1, y1, h: H, roof: 'greyTile', wall: WALL[buildings.length % 4], style: 'hutong', gable, ...extra });

BANDS.forEach((y0, bi) => {
  HALVES.forEach(([hx0, hx1, widths], hi) => {
    const ws = rot(widths, bi * 2 + hi);
    const bnd = [hx0];
    for (const w of ws) bnd.push(bnd[bnd.length - 1] + w);
    // back-to-back houses in the middle of the band (row A south houses + row B main houses)
    house(`m${bi}${hi}`, 'Back-to-back houses', hx0, y0 + 25, hx1, y0 + 35, 'x', { ridges: 2, court: 'NS' });
    for (const row of [0, 1]) {
      const wy0 = row === 0 ? y0 : y0 + 35;
      const wy1 = row === 0 ? y0 + 25 : y0 + 60;
      bnd.forEach((b, k) => {
        if (row === 1 && bi === 3 && hi === 1 && k === 0) return; // Well Square
        const x0 = k === 0 ? b : b - 5;
        const x1 = k === bnd.length - 1 ? b : b + 5;
        house(`w${bi}${hi}${row}${k}`, 'Side houses (厢房)', x0, wy0, x1, wy1, 'y', { court: k === 0 ? 'E' : k === bnd.length - 1 ? 'W' : 'EW' });
      });
      for (let p = 0; p < ws.length; p++) {
        const px0 = bnd[p];
        const px1 = bnd[p + 1];
        const k = bi * 100 + hi * 50 + row * 20 + p;
        if (row === 1 && bi === 3 && hi === 1 && p === 0) continue; // Well Square
        if (row === 0) house(`n${k}`, 'Main house (正房), on the lane', px0 + 10, y0, px1 - 5, y0 + 5, 'x', { court: 'S', gate: [px0 + 5, px0 + 10] });
        else house(`s${k}`, 'Gate house (倒座房), on the lane', px0 + 5, y0 + 55, px1 - 10, y0 + 60, 'x', { court: 'N', gate: [px1 - 10, px1 - 5] });
        const c = row === 0 ? { x0: px0 + 5, y0: y0 + 5, x1: px1 - 5, y1: y0 + 25 } : { x0: px0 + 5, y0: y0 + 35, x1: px1 - 5, y1: y0 + 55 };
        courts.push({ ...c, k, row });
      }
    }
  });
});

// courtyard planting: the summer awning (with its pomegranate), or a tree or two, and some pergolas
courts.forEach((c) => {
  // about two households in five splash their courtyard in the evening (an assumption)
  c.splash = rnd(c.k, 15) < 0.4;
  const r = rnd(c.k, 11);
  const w = c.x1 - c.x0;
  const cx = (c.x0 + c.x1) / 2;
  const cy = (c.y0 + c.y1) / 2;
  if (r < 0.1) {
    c.awning = true;
    screens.push({ kind: 'awning', x0: c.x0 + 0.5, y0: c.y0 + 0.5, x1: c.x1 - 0.5, y1: c.y1 - 0.5, z: 6.5 });
    trees.push({ x: cx - 3, y: cy + 3, r: 1.7, zc: 2.4, species: 'pomegranate' });
    return;
  }
  const s = rnd(c.k, 12);
  if (s < 0.38) trees.push({ x: cx - w / 4, y: cy - 2, r: 3, zc: 4.6, species: 'jujube' });
  else if (s < 0.66) {
    // a pair of pomegranates in front of the main house
    trees.push({ x: cx - 4, y: c.y0 + 4.5, r: 1.7, zc: 2.4, species: 'pomegranate' });
    trees.push({ x: cx + 4, y: c.y0 + 4.5, r: 1.7, zc: 2.4, species: 'pomegranate' });
  } else trees.push({ x: cx + w / 5, y: cy, r: 4.5, zc: 7, species: 'pagodaTree' });
  if (w >= 20 && rnd(c.k, 13) < 0.5) trees.push({ x: c.x1 - 3.5, y: c.y1 - 4, r: 2.6, zc: 4.2, species: 'jujube' });
  if (rnd(c.k, 14) < 0.22) {
    c.pergola = true;
    screens.push({ kind: 'pergola', x0: c.x0 + 1, y0: c.y1 - 6, x1: c.x0 + 9, y1: c.y1 - 1, z: 2.4 });
  }
});

// pagoda trees along the east half of the main lane, and in Well Square
for (let x = 215; x < 400; x += 24) trees.push({ x, y: 132.5, r: 4.5, zc: 7, species: 'pagodaTree' });
trees.push({ x: 212, y: 250, r: 5, zc: 7.5, species: 'pagodaTree' });

const LANES = [
  { id: 'north', name: 'North Lane', y0: 0, y1: 5 },
  { id: 'jujube', name: 'Jujube Lane', y0: 65, y1: 70, splash: true },
  { id: 'main', name: 'Pagoda Tree Hutong', y0: 130, y1: 140, mat: 'asphalt' },
  { id: 'lantern', name: 'Lantern Lane', y0: 200, y1: 205, splash: true },
  { id: 'well', name: 'Well Lane', y0: 265, y1: 270 },
  { id: 'brick', name: 'Brick Lane', y0: 330, y1: 335 },
  { id: 'south', name: 'South Lane', y0: 395, y1: 400 },
];

export const SCENE = {
  id: 'hutong',
  title: 'Hutong lanes and courtyards',
  size: 400,
  seed: 5150,
  hutongBlock: true,
  shadeSamples: 4,
  svfDirs: 32,
  svfExact: true,
  pooling: false, // no pigment pooling on the many small washes (bake time)
  cullShadows: true, // draw only the shadow polygons that reach a tile (bake time)
  site: {
    lat: 39.9,
    lon: 116.4,
    tz: 8,
    year: 2026,
    month: 6,
    day: 21,
    taMin: 25,
    taMax: 35,
    wind: 1,
    vapourHpa: 25,
    note: 'Assumed heat-wave day: 39.9° N, 21 June (the solstice), air 25–35 °C, vapour pressure 25 hPa, light wind 1 m/s. Air temperature is fixed: the courtyards’ cooler air is quoted, not simulated.',
  },
  // Ground parcels, painted in order (later wins). The base is courtyard brick.
  ground: [
    { id: 'yard', name: 'Courtyard paving', mat: 'greyBrick', poly: rect(0, 0, 400, 400) },
    ...LANES.map((l) => ({ id: l.id, name: l.name, mat: l.mat ?? 'greyBrick', poly: rect(0, l.y0, 400, l.y1), street: 'ew', ...(l.splash ? { splash: true } : {}) })),
    { id: 'bell', name: 'Bell Lane', mat: 'greyBrick', poly: rect(195, 0, 200, 400), street: 'ns' },
    { id: 'square', name: 'Well Square', mat: 'greyBrick', poly: rect(...SQUARE), outline: true },
  ],
  buildings,
  trees,
  screens,
  courts,
  lanes: LANES,
  // splashed in the evening: lanes with splash: true and these courtyards
  splashCourts: courts.filter((c) => c.splash).map((c) => [c.x0, c.y0, c.x1, c.y1]),
  benches: [
    { x: 206, y: 258, a: 0 },
    { x: 222, y: 244, a: 1 },
  ],
  cars: [],
  decor: {
    sheds: [],
    lamps: [[20, 130.8], [80, 130.8], [140, 130.8], [190, 139.2], [250, 139.2], [310, 139.2], [370, 139.2], [226, 238]],
    brick: [...courts.map((c) => [c.x0, c.y0, c.x1, c.y1]), ...LANES.filter((l) => !l.mat).map((l) => [0, l.y0, 400, l.y1]), [195, 0, 200, 400], SQUARE],
    well: [222, 255],
    bowls: courts.filter((c) => c.awning).map((c) => [(c.x0 + c.x1) / 2 + 3, (c.y0 + c.y1) / 2 + 2]),
  },
  // Walker routes: two variants each (the two sides of the lane).
  routes: [
    ...LANES.map((l) => ({ id: l.id, n: l.id === 'main' ? 16 : l.y0 === 0 || l.y1 === 400 ? 6 : 10, variants: l.y1 - l.y0 > 5 ? [[0, l.y0 + 1.5, 400, l.y0 + 1.5], [0, l.y1 - 1.5, 400, l.y1 - 1.5]] : [[0, l.y0 + 1.2, 400, l.y0 + 1.2], [0, l.y1 - 1.2, 400, l.y1 - 1.2]] })),
    { id: 'bell', n: 12, variants: [[196.2, 0, 196.2, 400], [198.8, 0, 198.8, 400]] },
  ],
  // Dwell spots: in shaded and sunny courtyards and in Well Square.
  spots: [
    ...courts.filter((c, i) => c.awning || i % 9 === 0).slice(0, 16).map((c) => ({ x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2, cap: 2 })),
    { x: 206, y: 258, cap: 2 },
    { x: 216, y: 248, cap: 2 },
  ],
  dwellers: 16,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    jujubeLane: [82.5, 67.5, 0], // 5 m lane, splashed, walls both sides
    lanternLane: [227.5, 202.5, 0], // 5 m lane, splashed
    brickLane: [57.5, 332.5, 0], // 5 m lane, dry
    mainLane: [97.5, 132.5, 0], // 10 m asphalt lane, north half
    bellLane: [197.5, 160, 0], // north-south lane
    awningYard: [122.5, 250, 0], // courtyard under a mat awning (splashed)
    openYard: [107.5, 47.5, 0], // sunny open courtyard
    roof: [300, 100, 4],
    square: [215, 252, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [82.5, 67.5, 0], dx: 150, dy: -60, key: 'lane' },
    { at: [300, 100, 5.8], dx: 30, dy: 200, key: 'roofs' },
    { at: [122.5, 250, 6.5], dx: -40, dy: 100, key: 'awning' },
    { at: [227.5, 202.5, 0], dx: 140, dy: 70, key: 'splash' },
    { at: [239, 132.5, 9], dx: 60, dy: -110, key: 'tree' },
  ],
  startCam: { z: 2, cx: 205, cy: 205 },
};
