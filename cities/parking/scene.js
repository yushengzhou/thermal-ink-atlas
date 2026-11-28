// Scene: "Car park and brownfield". An invented 400 m x 400 m block on the
// edge of an industrial town: a big open-air car park of thick asphalt (rows
// of parked cars; an open section, a section with trees planted on the
// footpaths between the bays, and a section under solar (PV) canopies), a
// concrete loading yard, rusty corrugated-steel sheds, two rail sidings on
// ballast, a small irrigated office lawn, and a brownfield of bare compacted
// soil and scrubby dry vegetation around an old floor slab.
// Units: metres, x east, y south. Parcel edges sit on the 5 m model grid,
// except the 2 m footpaths between the bays (drawn, and walkable on the 2 m
// grid; the 5 m model sees the asphalt around them).
// The lot: 20 m modules from y = m (aisle 7.2 m shared with the module
// above, bay row m+7.6 to m+12.6, footpath m+12.6 to m+15.4, bay row m+15.4
// to m+20.4), bays 2.5 m wide, cars 4.4 x 1.8 m, about 85% of the bays taken
// (deterministic). The footpaths miss the 5 m cell centres (m+12.5, m+17.5),
// so the model sees asphalt there. Dimensions are assumptions (no source).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

const LOT_X1 = 150; // the lot spans x 0-150
const CROSS = [70, 80]; // north-south cross aisle, no bays
const OCCUPANCY = 0.85;
/** Module top edges (y) by section. */
const OPEN = [10, 30, 50, 70];
const TREES = [90, 110];
const PV = [130, 150, 170];
const MODULES = [...OPEN, ...TREES, ...PV];
const PV_Z = 4.2;
const COLOURS = ['#2b2b2e', '#b8bcc0', '#e8e6e0', '#a8463a', '#4a5f80', '#7f8589', '#45594a', '#c9b48a', '#2b2b2e', '#b8bcc0'];

const cars = [];
MODULES.forEach((m, mi) => {
  for (const [row, yc] of [[0, m + 10.1], [1, m + 17.9]]) {
    for (let k = 0; k < LOT_X1 / 2.5; k++) {
      const x = 1.25 + 2.5 * k;
      if (x > CROSS[0] && x < CROSS[1]) continue;
      if (rnd(mi * 7 + row, k, 61) >= OCCUPANCY) continue;
      cars.push([x, yc + (rnd(mi, k, row + 62) - 0.5) * 0.4, 'y', COLOURS[Math.floor(rnd(mi, k, row + 63) * COLOURS.length)]]);
    }
  }
});

// trees on the footpaths of the tree section, every 8 m
const trees = [];
TREES.forEach((m) => {
  for (let x = 4; x < LOT_X1; x += 8) if (x < CROSS[0] - 2 || x > CROSS[1] + 2) trees.push({ x, y: m + 14, r: 4.2, zc: 5.8 });
});
// a few self-sown trees on the brownfield
for (const [x, y] of [[232, 302], [352, 386], [206, 362], [384, 296]]) trees.push({ x, y, r: 3, zc: 4.4 });

// PV canopies over both bay rows of the PV modules, either side of the cross aisle
const screens = PV.flatMap((m) => [[0, CROSS[0]], [CROSS[1], LOT_X1]].map(([x0, x1]) => ({ kind: 'pvCanopy', x0, y0: m + 7.6, x1, y1: m + 20.4, z: PV_Z })));

const SHED = (id, name, x0, y0, x1, y1, h, wall) => ({ id, name, x0, y0, x1, y1, h, roof: 'rustShed', wall });

export const SCENE = {
  id: 'parking',
  title: 'Car park and old rail yard',
  size: 400,
  seed: 6110,
  parkingBlock: true,
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
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, light wind 1.5 m/s (as block 1). Air temperature is fixed: the heat the lot gives the air at night is quoted, not simulated.',
  },
  // Ground parcels, painted in order (later wins). The base is bare compacted soil.
  ground: [
    { id: 'soil', name: 'Bare compacted soil (disused land)', mat: 'drySoil', poly: rect(0, 0, 400, 400) },
    { id: 'depot', name: 'Depot Road', mat: 'asphalt', poly: rect(0, 0, 400, 10), street: 'ew' },
    { id: 'lot', name: 'Car park (thick asphalt)', mat: 'asphalt', poly: rect(0, 10, 150, 200), outline: true },
    ...MODULES.map((m, k) => ({ id: `path${k}`, name: 'Footpath between the bays', mat: 'concrete', poly: rect(0, m + 12.6, LOT_X1, m + 15.4) })),
    { id: 'yardlane', name: 'Yard Lane', mat: 'asphalt', poly: rect(150, 10, 160, 210), street: 'ns' },
    { id: 'siding', name: 'Siding Road', mat: 'asphalt', poly: rect(0, 200, 400, 210), street: 'ew' },
    { id: 'yard', name: 'Loading yard (concrete slab)', mat: 'concrete', poly: rect(160, 10, 400, 120), outline: true },
    { id: 'lawn', name: 'Office lawn (irrigated)', mat: 'grass', poly: rect(165, 130, 255, 195), outline: true },
    { id: 'apron', name: 'Shed apron (concrete)', mat: 'concrete', poly: rect(260, 120, 400, 200), outline: true },
    { id: 'rail1', name: 'Rail siding (track gravel)', mat: 'ballast', poly: rect(0, 225, 400, 240), outline: true },
    { id: 'rail2', name: 'Rail siding (track gravel)', mat: 'ballast', poly: rect(0, 250, 400, 265), outline: true },
    { id: 'scrub', name: 'Scrubby dry vegetation', mat: 'scrub', poly: rect(180, 280, 400, 400) },
    { id: 'slab', name: 'Old floor slab (demolished works)', mat: 'concrete', poly: rect(50, 300, 130, 355), outline: true },
  ],
  buildings: [
    SHED('shedYard', 'Rusty steel shed (loading yard)', 300, 30, 360, 70, 8, '#8e7c6a'),
    SHED('shedA', 'Rusty steel shed', 275, 135, 315, 165, 6, '#94806b'),
    SHED('shedB', 'Rusty steel shed', 335, 130, 390, 170, 7, '#8a7866'),
    SHED('shedOld', 'Derelict steel shed (disused land)', 290, 320, 330, 350, 5, '#86735f'),
  ],
  trees,
  screens,
  cars,
  benches: [
    { x: 172, y: 128, a: 0 },
    { x: 250, y: 128, a: 0 },
  ],
  decor: {
    sheds: [],
    lamps: [[75, 20], [75, 60], [75, 100], [75, 140], [75, 180], [155, 40], [155, 120], [155, 190], [200, 205], [300, 205]],
    stripes: MODULES.flatMap((m) => [[0, LOT_X1, m + 7.8, m + 12.6, 2.5], [0, LOT_X1, m + 15.4, m + 20.2, 2.5]]),
    rails: [[232.5, 0, 400], [257.5, 0, 400]],
    tufts: [[180, 280, 400, 400, 900, 61], [0, 268, 180, 400, 160, 62], [0, 212, 400, 224, 120, 63]],
    soil: [[0, 268, 180, 400, 500, 64], [0, 212, 400, 224, 200, 65]],
    cracks: [[52, 302, 128, 353, 30, 66], [162, 12, 398, 118, 40, 67]],
    joints: [[160, 10, 400, 120, 'x'], [260, 120, 400, 200, 'x']],
  },
  // Walker routes: two variants each, of equal length. The lot crossings pair
  // a footpath in the open rows with one under the trees or the PV canopy.
  routes: [
    { id: 'depot', n: 10, variants: [[0, 2.5, 400, 2.5], [0, 7.5, 400, 7.5]] },
    { id: 'siding', n: 8, variants: [[0, 202.5, 400, 202.5], [0, 207.5, 400, 207.5]] },
    { id: 'yardlane', n: 8, variants: [[152, 0, 152, 210], [158, 0, 158, 210]] },
    { id: 'acrossTrees', n: 10, variants: [[0, 84, 150, 84], [0, 104, 150, 104]] },
    { id: 'acrossPv', n: 10, variants: [[0, 64, 150, 64], [0, 144, 150, 144]] },
    { id: 'acrossPv2', n: 8, variants: [[0, 44, 150, 44], [0, 164, 150, 164]] },
    { id: 'cross', n: 6, variants: [[73, 10, 73, 200], [77, 10, 77, 200]] },
    { id: 'yard', n: 6, variants: [[160, 100, 400, 100], [160, 114, 400, 114]] },
  ],
  // Dwell spots: under the PV canopy and the lot trees, on the lawn, in the yard, by the sheds, on the old slab.
  spots: [
    { x: 35, y: 144, cap: 2 },
    { x: 112, y: 164, cap: 2 },
    { x: 45, y: 184, cap: 2 },
    { x: 20, y: 104, cap: 2 },
    { x: 100, y: 124, cap: 2 },
    { x: 210, y: 160, cap: 2 },
    { x: 200, y: 60, cap: 2 },
    { x: 240, y: 95, cap: 2 },
    { x: 320, y: 175, cap: 2 },
    { x: 90, y: 330, cap: 2 },
  ],
  dwellers: 12,
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    openAisle: [37.5, 72.5, 0], // open section, aisle (no cars)
    openBay: [37.5, 82.5, 0], // open section, bay row (cars)
    treeBay: [37.5, 107.5, 0], // under the lot trees
    pvBay: [37.5, 147.5, 0], // under the PV canopy
    yard: [222.5, 62.5, 0], // open concrete slab
    shedRoof: [297.5, 152.5, 6], // rusty shed roof
    lawn: [212.5, 162.5, 0],
    ballast: [102.5, 232.5, 0],
    soil: [27.5, 382.5, 0],
    scrub: [262.5, 342.5, 0],
    slab: [92.5, 327.5, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [127.5, 72.5, 0], dx: -250, dy: -95, key: 'asphalt' },
    { at: [297.5, 152.5, 6], dx: 60, dy: -120, key: 'shed' },
    { at: [37.5, 147.5, 4.2], dx: -160, dy: 40, key: 'pv' },
    { at: [157.5, 302.5, 0], dx: -60, dy: 90, key: 'soil' },
    { at: [222.5, 62.5, 0], dx: 70, dy: -110, key: 'yard' },
  ],
  startCam: { z: 2, cx: 200, cy: 200 },
};
