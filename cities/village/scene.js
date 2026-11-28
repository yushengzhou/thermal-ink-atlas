// Scene: "Urban village and informal edge". An invented 400 m x 400 m block
// in the manner of a South China urban village (城中村) at 22.5° N: a dense
// grid of six- to eight-storey village houses built plot to plot, the
// "handshake buildings" (握手楼), with lanes 1.5-3 m wide between them and a
// 6 m market lane; flat concrete roofs, some with a rooftop room under metal
// sheeting. East of the village road stand the older village centre (an
// ancestral hall, its square, a pond and three banyans); south of the bus
// road a low-rise edge of single-storey rooms in rows, roofed with
// corrugated iron, galvanised sheet, asbestos-cement sheet or tarpaulin, some
// painted white by the residents, between 2 m alleys.
// Units: metres, x east, y south. Lanes are narrower than the 5 m model
// grid: each lane is centred on a row (or column) of cell centres, so it
// keeps one 5 m cell, whose sky view and direct sun come from the lane's own
// width and wall heights (engine/village.js, canyon formulas), not from the
// raster. Plots (13 m with 2 m lanes), storeys (6-8, 3 m each), lane widths
// and the room rows are assumptions inside the brief's ranges (layout).

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

// deterministic 0..1 from integers (the engine's hash3 is not importable here)
const rnd = (a, b, c = 0) => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

/** Storey height, m, and the rise of a rooftop room above its roof. */
const STOREY = 3;
const RISE = 2.6;

// Village lanes: centre lines on cell centres (5k + 2.5), 15 m apart; widths in m (default 2).
const YL = Array.from({ length: 18 }, (_, j) => 15 * j + 7.5); // 7.5 ... 262.5 (edges: j = 0, 17)
const XL = Array.from({ length: 17 }, (_, i) => 15 * i + 7.5); // 7.5 ... 247.5 (edges: i = 0, 16)
const WY = { 4: 3, 9: 6, 12: 1.5, 14: 3 }; // E-W lane widths that are not 2 m (j = 9: Market Lane)
const WX = { 4: 3, 8: 1.5, 11: 3 }; // N-S lane widths that are not 2 m
const wy = (j) => WY[j] ?? 2;
const wx = (i) => WX[i] ?? 2;
// the village's outer edges are paths, not lanes: rows start 1 m in from the edge line
const rowY = (k) => [k === 0 ? 8.5 : YL[k] + wy(k) / 2, k === 16 ? 261.5 : YL[k + 1] - wy(k + 1) / 2];
const colX = (k) => [k === 0 ? 8.5 : XL[k] + wx(k) / 2, k === 15 ? 246.5 : XL[k + 1] - wx(k + 1) / 2];

const WALLS = ['#d9cfbd', '#cfc3ad', '#e2d9c6', '#c9bea8', '#d4c6aa', '#dcd3c2'];
const buildings = [];
const roofRooms = []; // rooftop rooms: listed first, so a cell under one belongs to it
const shopRows = new Set([8, 9]); // the rows on Market Lane have shops on the ground floor

const ROOF_KINDS = (r) => (r < 0.45 ? 'rustTin' : r < 0.7 ? 'galvTin' : r < 0.82 ? 'whiteTinAged' : r < 0.9 ? 'tarpRoof' : 'asbestosRoof');
for (let row = 0; row < 17; row++) {
  for (let col = 0; col < 16; col++) {
    const [x0, x1] = colX(col);
    const [y0, y1] = rowY(row);
    const r = rnd(col, row, 1);
    const storeys = r < 0.3 ? 6 : r < 0.7 ? 7 : 8;
    const id = `v${row}_${col}`;
    const h = storeys * STOREY;
    buildings.push({ id, name: `Village house, ${storeys} storeys (握手楼, handshake building)`, x0, y0, x1, y1, h, roof: 'slabRoof', wall: WALLS[Math.floor(rnd(col, row, 5) * WALLS.length)], style: 'village', storeys, ...(shopRows.has(row) ? { shopFace: row === 8 ? 'S' : 'N' } : {}) });
    if (rnd(col, row, 2) < 0.22) {
      // a rooftop room over one of the plot's four cells (4 x 4 m, inside the plot)
      const q = Math.floor(rnd(col, row, 6) * 4);
      const cx = (Math.ceil((x0 - 2.5) / 5) + (q % 2)) * 5 + 2.5;
      const cy = (Math.ceil((y0 - 2.5) / 5) + Math.floor(q / 2)) * 5 + 2.5;
      const roof = ROOF_KINDS(rnd(col, row, 3));
      const bare = roof === 'rustTin' || roof === 'galvTin';
      roofRooms.push({ id: `r${row}_${col}`, name: 'Rooftop room under metal sheeting', x0: cx - 2, y0: cy - 2, x1: cx + 2, y1: cy + 2, h: h + RISE, roof, wall: '#cdbfa5', style: 'roofRoom', on: id, ...(bare && rnd(col, row, 4) < 0.5 ? { paint: true } : {}) });
    }
  }
}

// the older village centre, east of Village Road
const centre = [
  { id: 'hall', name: 'Ancestral hall (祠堂)', x0: 305, y0: 40, x1: 365, y1: 68, h: 7, roof: 'greyTile', wall: '#9a9a93', gable: 'x', style: 'hall' },
  { id: 'o1', name: 'Older village houses, 4 storeys', x0: 276, y0: 8.5, x1: 299, y1: 33, h: 12, roof: 'slabRoof', wall: '#d0c4ab', style: 'old', storeys: 4 },
  { id: 'o2', name: 'Older village houses, 4 storeys', x0: 303, y0: 8.5, x1: 331, y1: 33, h: 12, roof: 'slabRoof', wall: '#c8bca4', style: 'old', storeys: 4 },
  { id: 'o3', name: 'Older village houses, 3 storeys', x0: 335, y0: 8.5, x1: 361, y1: 33, h: 9, roof: 'slabRoof', wall: '#d6cbb5', style: 'old', storeys: 3 },
  { id: 'o4', name: 'Older village houses, 4 storeys', x0: 365, y0: 8.5, x1: 394, y1: 33, h: 12, roof: 'slabRoof', wall: '#cbbfa8', style: 'old', storeys: 4 },
  { id: 'o5', name: 'Older village houses, 3 storeys', x0: 276, y0: 222, x1: 314, y1: 263, h: 9, roof: 'slabRoof', wall: '#d2c6ae', style: 'old', storeys: 3 },
  { id: 'o6', name: 'Older village houses, 4 storeys', x0: 318, y0: 222, x1: 354, y1: 263, h: 12, roof: 'slabRoof', wall: '#c9bda6', style: 'old', storeys: 4 },
  { id: 'o7', name: 'Older village houses, 3 storeys', x0: 358, y0: 222, x1: 394, y1: 263, h: 9, roof: 'slabRoof', wall: '#d8cdb8', style: 'old', storeys: 3 },
];

// The low-rise edge, south of Bus Road: eleven rows of single-storey rooms,
// 8 m deep, between 2 m east-west alleys (centres 297.5 ... 387.5) and 2 m
// north-south alleys (centres XA); each run of rooms under one roof is 10-20 m long.
const XA = [32.5, 72.5, 112.5, 152.5, 192.5, 232.5];
const EDGE_KINDS = (r) => (r < 0.35 ? 'rustTin' : r < 0.55 ? 'galvTin' : r < 0.75 ? 'asbestosRoof' : r < 0.85 ? 'tarpRoof' : 'whiteTinAged');
const RISE_OF = { rustTin: 2.7, galvTin: 2.7, whiteTinAged: 2.7, asbestosRoof: 3, tarpRoof: 2.5 };
const ROOM_NAME = {
  rustTin: 'Rooms under rusty corrugated iron',
  galvTin: 'Rooms under galvanised sheet',
  asbestosRoof: 'Rooms under asbestos-cement sheet',
  tarpRoof: 'Rooms under a tarpaulin roof',
  whiteTinAged: 'Rooms under corrugated iron painted white by the residents',
};
const edge = [];
const segs = [[2, XA[0] - 1], ...XA.slice(0, -1).map((x, k) => [x + 1, XA[k + 1] - 1]), [XA[XA.length - 1] + 1, 258]];
for (let row = 0; row < 11; row++) {
  const y0 = 288.5 + 10 * row;
  const y1 = y0 + 8;
  segs.forEach(([sa, sb], si) => {
    let x = sa;
    let k = 0;
    while (x < sb - 0.1) {
      // run lengths end on a cell edge (a multiple of 5 m), at least 5 m before the segment's end
      const len = [10, 15, 20][Math.floor(rnd(row, si * 10 + k, 7) * 3)];
      let xb = Math.ceil((x + len) / 5) * 5;
      if (xb > sb - 5) xb = sb;
      const roof = EDGE_KINDS(rnd(row, si * 10 + k, 8));
      const bare = roof === 'rustTin' || roof === 'galvTin';
      edge.push({ id: `e${row}_${si}_${k}`, name: ROOM_NAME[roof], x0: x, y0, x1: xb, y1, h: RISE_OF[roof], roof, wall: ['#c2b49a', '#b9ab92', '#cbbfa6', '#bfae93'][k % 4], style: 'room', ...(bare && rnd(row, si * 10 + k, 9) < 0.45 ? { paint: true } : {}) });
      x = xb;
      k++;
    }
  });
}

// Lanes (narrower than a cell): axis x = east-west (centre y), y = north-south (centre x); a0-a1 their extent.
const lanes = [
  ...YL.slice(1, 17).map((c, j0) => {
    const j = j0 + 1;
    return { id: j === 9 ? 'market' : `lx${j}`, name: j === 9 ? 'Market Lane, 6 m wide' : `Lane, ${wy(j)} m wide, between village houses`, axis: 'x', c, W: wy(j), a0: 8.5, a1: 246.5, zone: 'village' };
  }),
  ...XL.slice(1, 16).map((c, i0) => {
    const i = i0 + 1;
    return { id: `ly${i}`, name: `Lane, ${wx(i)} m wide, between village houses`, axis: 'y', c, W: wx(i), a0: 8.5, a1: 261.5, zone: 'village' };
  }),
  ...Array.from({ length: 10 }, (_, m) => ({ id: `ax${m}`, name: 'Alley, 2 m wide, between rows of rooms', axis: 'x', c: 297.5 + 10 * m, W: 2, a0: 2, a1: 258, zone: 'edge' })),
  ...XA.map((c, m) => ({ id: `ay${m}`, name: 'Alley, 2 m wide, between rows of rooms', axis: 'y', c, W: 2, a0: 288.5, a1: 396.5, zone: 'edge' })),
];

const trees = [
  // three banyans (榕树) at the square, and shade trees along the edge path and in the open yard
  { x: 286, y: 84, r: 7, zc: 8, banyan: true },
  { x: 386, y: 88, r: 7, zc: 8, banyan: true },
  { x: 288, y: 158, r: 6.5, zc: 7.5, banyan: true },
  ...[20, 60, 100, 140, 180, 220].map((x) => ({ x, y: 266, r: 3.5, zc: 6 })),
  { x: 300, y: 320, r: 4.5, zc: 6.5 },
  { x: 345, y: 352, r: 4.5, zc: 6.5 },
  { x: 380, y: 310, r: 4, zc: 6 },
];

const ground = [
  { id: 'paving', name: 'Village paving (concrete)', mat: 'concrete', poly: rect(0, 0, 400, 400) },
  { id: 'busroad', name: 'Bus Road (asphalt)', mat: 'asphalt', poly: rect(0, 270, 400, 285), street: 'ew' },
  { id: 'villroad', name: 'Village Road (asphalt)', mat: 'asphalt', poly: rect(255, 0, 270, 270), street: 'ns' },
  { id: 'square', name: 'Ancestral hall square (concrete)', mat: 'concrete', poly: rect(275, 75, 395, 165), outline: true },
  { id: 'pond', name: 'Village pond (风水塘)', mat: 'water', poly: rect(300, 172, 370, 212) },
  { id: 'yard', name: 'Open yard (bare ground)', mat: 'drySoil', poly: rect(262, 288, 400, 400), outline: true },
  ...lanes.map((l) => ({ id: l.id, name: l.name, mat: 'concrete', poly: l.axis === 'x' ? rect(l.a0, l.c - l.W / 2, l.a1, l.c + l.W / 2) : rect(l.c - l.W / 2, l.a0, l.c + l.W / 2, l.a1), lane: true })),
];

export const SCENE = {
  id: 'village',
  title: 'Urban village and informal edge',
  size: 400,
  seed: 10160,
  villageBlock: true,
  shadeSamples: 2, // the ray-traced building mask (block 5's), 2 x 2 samples per cell
  pooling: false, // no pigment pooling on the many small washes (bake time)
  cullShadows: true, // draw only the shadow polygons that reach a tile (bake time)
  site: {
    lat: 22.5,
    lon: 114.1,
    tz: 8,
    year: 2026,
    month: 7,
    day: 20,
    taMin: 27,
    taMax: 35,
    wind: 1,
    vapourHpa: 28,
    plain: 'A hot, humid summer day in a southern Chinese city: the air goes from 27 °C at dawn to 35 °C in the afternoon.',
    note: 'Assumed heat-wave day: 22.5° N, 20 July, air 27–35 °C, vapour pressure 28 hPa, light wind 1 m/s. Air temperature is fixed: no warm air held in the lanes at night, no wind in the lanes, no heat from people or appliances.',
  },
  storey: STOREY,
  rise: RISE,
  lanes,
  ground,
  buildings: [...roofRooms, ...buildings, ...centre, ...edge],
  trees,
  cars: [],
  benches: [],
  decor: {
    sheds: [],
    lamps: [[262, 40], [262, 120], [262, 200], [40, 271.5], [140, 271.5], [240, 271.5], [340, 271.5], [280, 120], [390, 130]],
    dashes: [[0, 400, 277.5, 'x'], [0, 270, 262.5, 'y']],
  },
  // Walker routes: two variants each, of equal length (a sunnier and a shadier way).
  routes: [
    { id: 'market', n: 8, variants: [[8.5, 142.5, 246.5, 142.5], [8.5, 157.5, 246.5, 157.5]] },
    { id: 'lanes', n: 6, variants: [[8.5, 52.5, 246.5, 52.5], [8.5, 67.5, 246.5, 67.5]] },
    { id: 'ns', n: 6, variants: [[97.5, 8.5, 97.5, 261.5], [112.5, 8.5, 112.5, 261.5]] },
    { id: 'road', n: 8, variants: [[0, 273, 400, 273], [0, 266, 400, 266]] },
    { id: 'square', n: 6, variants: [[278, 120, 392, 120], [278, 96, 392, 96]] },
    { id: 'alley', n: 6, variants: [[2, 317.5, 258, 317.5], [2, 327.5, 258, 327.5]] },
  ],
  // Dwell spots: doorways in the lanes, the banyans' shade, the open square and the yard.
  spots: [
    ...[[45, 82.5], [75, 112.5], [165, 97.5], [210, 187.5], [105, 217.5], [127.5, 60], [217.5, 45], [172.5, 240]].map(([x, y]) => ({ x, y, cap: 2 })),
    { x: 287, y: 86, cap: 2 },
    { x: 385, y: 90, cap: 2 },
    { x: 289, y: 160, cap: 2 },
    { x: 335, y: 110, cap: 2 },
    { x: 355, y: 140, cap: 2 },
    { x: 320, y: 140, cap: 2 },
    { x: 300, y: 322, cap: 2 },
    { x: 330, y: 380, cap: 2 },
  ],
  dwellers: 14,
  // Residents on the roofs in the evening (engine/vgui.js): roof ids and a place on each.
  rooftops: [['v2_3', 0.3, 0.6], ['v4_10', 0.6, 0.4], ['v6_6', 0.5, 0.5], ['v9_2', 0.4, 0.3], ['v10_13', 0.5, 0.6], ['v12_8', 0.35, 0.45], ['v14_4', 0.6, 0.6], ['v15_11', 0.45, 0.35], ['v16_14', 0.5, 0.5], ['v13_1', 0.55, 0.4]],
  // Sample points (x, y, z) for notes, checks and cards.
  probes: {
    lane: [120, 112.5, 0],
    market: [135, 142.5, 0],
    square: [335, 120, 0],
    alley: [100, 317.5, 0],
    roof: [45, 45, 0],
    pond: [335, 192, 0],
    yard: [330, 360, 0],
  },
  // Margin notes (at most 5).
  notes: [
    { at: [120, 112.5, 0], dx: 200, dy: -40, key: 'lane' },
    { at: [335, 120, 0], dx: -70, dy: -125, key: 'square' },
    { at: [100, 340, 2.7], dx: -30, dy: 165, key: 'tin' },
    { at: [180, 360, 2.7], dx: 130, dy: 90, key: 'white' },
    { at: [60, 320, 2.7], dx: 170, dy: -120, key: 'under' },
  ],
  startCam: { z: 2, cx: 215, cy: 250 },
};
