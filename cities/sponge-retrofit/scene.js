// Scene: "Sponge-city and cool-roof retrofit". An invented 400 m x 400 m
// block shown twice: Before (dark membrane roofs, dense asphalt, few trees)
// and After a retrofit (aged cool roofs, green roofs, permeable pavers, porous
// asphalt, a cool-pavement coating on one street, rain gardens, young street
// trees). Units: metres, x east, y south. Every parcel lists its Before
// material (mat / roof) and, if the retrofit changes it, its After material
// (after). Trees with after: true are planted by the retrofit. Edges sit on
// the 5 m model grid so each measure covers whole cells.

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

function ellipse(cx, cy, rx, ry, n = 24) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  }
  return p;
}

// Young street trees: crown radius 2.6 m and centre height 4.4 m are scene
// (engine) assumptions; tr 0.47 is MODEL.youngTreeTransmission (brief, LAI 1.5).
const YOUNG = { r: 2.6, zc: 4.4, tr: 0.47, young: true, after: true };

export const SCENE = {
  id: 'sponge-retrofit',
  title: 'Sponge-city and cool-roof retrofit',
  size: 400,
  seed: 2611,
  retrofit: true,
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
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, light wind 1.5 m/s. Air temperature is the same in both states.',
  },
  // Ground parcels, painted in order (later wins). Base is concrete yards and pavements.
  ground: [
    { id: 'yards', name: 'Yards and pavements', mat: 'concrete', poly: rect(0, 0, 400, 400) },
    { id: 'canal', name: 'Canal Street', mat: 'asphalt', after: 'coolPave', poly: rect(0, 150, 400, 170), street: 'ew', measure: 'coolPave' },
    { id: 'willow', name: 'Willow Lane', mat: 'asphalt', poly: rect(0, 290, 400, 300), street: 'ew' },
    { id: 'market', name: 'Market Road', mat: 'asphalt', poly: rect(125, 0, 140, 400), street: 'ns' },
    { id: 'bridge', name: 'Bridge Road', mat: 'asphalt', poly: rect(275, 0, 290, 400), street: 'ns' },
    { id: 'carpark', name: 'Car park', mat: 'asphalt', after: 'porousAsphalt', poly: rect(150, 205, 265, 245), outline: true, measure: 'porousAsphalt' },
    { id: 'square', name: 'Market square', mat: 'asphalt', after: 'pavers', poly: rect(295, 205, 395, 245), outline: true, measure: 'pavers' },
    { id: 'vergeW', name: 'Willow Lane verge', mat: 'concrete', after: 'raingarden', poly: rect(0, 300, 120, 305), measure: 'raingarden' },
    { id: 'vergeE', name: 'Willow Lane verge', mat: 'concrete', after: 'raingarden', poly: rect(295, 300, 400, 305), measure: 'raingarden' },
    { id: 'green', name: 'Canal green', mat: 'grass', poly: rect(150, 310, 265, 395), outline: true },
    { id: 'gpath', name: 'Green path', mat: 'stone', poly: rect(150, 345, 265, 350) },
    { id: 'pond', name: 'Pond', mat: 'water', poly: ellipse(232, 375, 15, 9) },
  ],
  // Buildings: footprint, height (m), Before roof, After roof (if retrofitted), wall colour.
  buildings: [
    // far row
    { id: 'n1', name: 'Library', x0: 5, y0: 10, x1: 60, y1: 60, h: 18, roof: 'membrane', after: 'greenroof', wall: '#b8b1a5' },
    { id: 'n2', name: 'Terrace', x0: 65, y0: 10, x1: 120, y1: 55, h: 14, roof: 'membrane', after: 'coolroofR', wall: '#a9b89a' },
    { id: 'n3', name: 'Canal tower', x0: 145, y0: 10, x1: 205, y1: 60, h: 26, roof: 'membrane', after: 'coolroofR', wall: '#a8b9c4' },
    { id: 'n4', name: 'Old print works', x0: 210, y0: 10, x1: 270, y1: 55, h: 16, roof: 'membrane', wall: '#b9715a' },
    { id: 'n5', name: 'Wharf flats', x0: 295, y0: 10, x1: 395, y1: 60, h: 20, roof: 'membrane', after: 'coolroofR', wall: '#e3d3b0' },
    // Canal Street, north side
    { id: 'a1', name: 'Workshops', x0: 5, y0: 105, x1: 60, y1: 145, h: 11, roof: 'metal', wall: '#d9b77a', shops: true },
    { id: 'a2', name: 'Primary school', x0: 65, y0: 105, x1: 120, y1: 145, h: 15, roof: 'membrane', after: 'greenroof', wall: '#cf9c8c' },
    { id: 'a3', name: 'Canal offices', x0: 145, y0: 100, x1: 205, y1: 145, h: 18, roof: 'membrane', after: 'coolroofR', wall: '#e8e0cf', shops: true },
    { id: 'a4', name: 'Old office (not retrofitted)', x0: 210, y0: 110, x1: 270, y1: 145, h: 18, roof: 'membrane', wall: '#e3d3b0', shops: true },
    { id: 'a5', name: 'Health centre', x0: 295, y0: 105, x1: 345, y1: 145, h: 14, roof: 'membrane', after: 'greenroof', wall: '#a9b89a', shops: true },
    { id: 'a6', name: 'Bakery', x0: 350, y0: 110, x1: 395, y1: 145, h: 11, roof: 'metal', wall: '#b9715a', gable: 'y' },
    // Canal Street, south side (low, keeps the street in view)
    { id: 'm1', name: 'Canal Street shops', x0: 5, y0: 175, x1: 60, y1: 200, h: 8, roof: 'membrane', after: 'coolroofR', wall: '#d9b77a' },
    { id: 'm2', name: 'Canal Street shops', x0: 65, y0: 175, x1: 120, y1: 200, h: 9, roof: 'metal', wall: '#cf9c8c' },
    { id: 'm3', name: 'Canal Street shops', x0: 145, y0: 175, x1: 205, y1: 200, h: 9, roof: 'membrane', after: 'coolroofR', wall: '#e3d3b0' },
    { id: 'm4', name: 'Laundry and café', x0: 210, y0: 175, x1: 270, y1: 200, h: 8, roof: 'membrane', after: 'greenroof', wall: '#a9b89a' },
    { id: 'm5', name: 'Canal Street shops', x0: 295, y0: 175, x1: 345, y1: 200, h: 9, roof: 'membrane', after: 'coolroofR', wall: '#b9715a' },
    { id: 'm6', name: 'Corner shop (not retrofitted)', x0: 350, y0: 175, x1: 395, y1: 200, h: 10, roof: 'membrane', wall: '#e3d3b0' },
    // Willow Lane, north side
    { id: 'k1', name: 'Willow flats', x0: 5, y0: 225, x1: 55, y1: 285, h: 15, roof: 'membrane', after: 'coolroofR', wall: '#a9b89a' },
    { id: 'k2', name: 'Market Road flats', x0: 60, y0: 230, x1: 120, y1: 285, h: 18, roof: 'membrane', after: 'greenroof', wall: '#b9715a' },
    { id: 'k3', name: 'Willow Lane flats', x0: 145, y0: 250, x1: 205, y1: 285, h: 16, roof: 'membrane', after: 'coolroofR', wall: '#d9b77a' },
    { id: 'k4', name: 'Depot', x0: 210, y0: 255, x1: 270, y1: 285, h: 12, roof: 'metal', wall: '#a8b9c4' },
    { id: 'k5', name: 'Market hall', x0: 295, y0: 250, x1: 395, y1: 285, h: 12, roof: 'membrane', after: 'coolroofR', wall: '#b8b1a5' },
    // Willow Lane, south side
    { id: 's1', name: 'Garden flats', x0: 5, y0: 310, x1: 55, y1: 350, h: 16, roof: 'membrane', after: 'coolroofR', wall: '#cf9c8c' },
    { id: 's2', name: 'Garden flats (not retrofitted)', x0: 60, y0: 310, x1: 120, y1: 345, h: 13, roof: 'membrane', wall: '#e3d3b0' },
    { id: 's3', name: 'Green view flats', x0: 300, y0: 310, x1: 395, y1: 345, h: 20, roof: 'membrane', after: 'greenroof', wall: '#a9b89a' },
    { id: 's4', name: 'Boat house', x0: 300, y0: 360, x1: 350, y1: 395, h: 9, roof: 'metal', wall: '#d9b77a' },
    { id: 's5', name: 'Canal cottages', x0: 5, y0: 360, x1: 118, y1: 395, h: 10, roof: 'membrane', after: 'coolroofR', wall: '#b8b1a5' },
  ],
  // Trees: centre, canopy radius r, canopy centre height zc. Mature trees are
  // there in both states; after: true marks young trees planted by the retrofit
  // (small, thin crowns: transmission tr, see youngTreeTransmission).
  trees: [
    // Canal green, mature
    ...[[165, 322], [182, 330], [160, 372], [178, 384], [200, 365], [248, 325], [258, 352]].map(([x, y], i) => ({ x, y, r: 5.2 + (i % 3) * 0.4, zc: 7.5 })),
    // a few back-yard trees, mature
    { x: 38, y: 86, r: 4.5, zc: 6 },
    { x: 252, y: 88, r: 4.5, zc: 6 },
    { x: 92, y: 216, r: 4.5, zc: 6 },
    { x: 330, y: 84, r: 4.5, zc: 6 },
    // young trees at the edge of the Willow Lane rain gardens (south pavement)
    ...[8, 20, 32, 44, 56, 68, 80, 92, 104, 116].map((x) => ({ x, y: 306.5, ...YOUNG })),
    ...[300, 312, 324, 336, 348, 360, 372, 384, 396].map((x) => ({ x, y: 306.5, ...YOUNG })),
    // young trees on the west kerb of Market Road and Bridge Road (afternoon shade on the pavement)
    ...[180, 192, 204, 216, 228, 240, 252, 264, 276].map((y) => ({ x: 140.8, y, ...YOUNG })),
    ...[180, 192, 204, 216, 228, 240, 252, 264, 276].map((y) => ({ x: 270.8, y, ...YOUNG })),
    // Canal Street, north pavement
    ...[10, 26, 42, 58, 74, 90, 106, 156, 172, 188, 204, 220, 236, 252, 306, 322, 338, 354, 370, 386].map((x) => ({ x, y: 146.2, ...YOUNG })),
    // trees on the new Market square
    ...[310, 330, 350, 370, 390].map((x) => ({ x, y: 212, ...YOUNG })),
    ...[320, 360].map((x) => ({ x, y: 238, ...YOUNG })),
  ],
  benches: [
    { x: 172, y: 330, a: 0 },
    { x: 190, y: 372, a: 1 },
    { x: 225, y: 340, a: 0 },
    { x: 246, y: 360, a: 1 },
    { x: 330, y: 238, a: 0 },
    { x: 360, y: 238, a: 0 },
  ],
  cars: [
    [20, 152.5, 'x', '#7f8f99'],
    [60, 167.5, 'x', '#b5633f'],
    [165, 152.5, 'x', '#5d6b5a'],
    [238, 167.5, 'x', '#a33b2c'],
    [372, 152.5, 'x', '#43566b'],
    [160, 210, 'y', '#b5633f'],
    [172, 210, 'y', '#7f8f99'],
    [208, 240, 'y', '#c9b48a'],
    [244, 210, 'y', '#5d6b5a'],
    [256, 240, 'y', '#d5cfc2'],
    [127.5, 70, 'y', '#a33b2c'],
    [287.5, 330, 'y', '#7f8f99'],
  ],
  // Street furniture and ground marks (see kit.js drawDecor).
  decor: {
    patches: [[2, 291, 398, 299, 5, 16]],
    dashes: [[0, 120, 160, 'x'], [145, 270, 160, 'x'], [295, 400, 160, 'x'], [0, 145, 132.5, 'y'], [175, 285, 132.5, 'y'], [305, 400, 132.5, 'y'], [0, 145, 282.5, 'y'], [175, 285, 282.5, 'y'], [305, 400, 282.5, 'y']],
    crossings: [[126, 146, 139, 149.5, 'y'], [120.5, 151, 124, 169, 'x'], [276, 170.5, 289, 174, 'y'], [290.5, 151, 294, 169, 'x']],
    joints: [
      [0, 145, 120, 150, 'x'], [145, 145, 270, 150, 'x'], [295, 145, 400, 150, 'x'],
      [0, 170, 120, 175, 'x'], [145, 170, 270, 175, 'x'], [295, 170, 400, 175, 'x'],
      [0, 285, 120, 290, 'x'], [145, 285, 270, 290, 'x'], [295, 285, 400, 290, 'x'],
      [0, 305, 120, 310, 'x'], [295, 305, 400, 310, 'x'],
      [120, 0, 125, 145, 'y'], [140, 0, 145, 145, 'y'], [270, 0, 275, 145, 'y'], [290, 0, 295, 145, 'y'],
      [120, 175, 125, 285, 'y'], [140, 175, 145, 285, 'y'], [270, 175, 275, 285, 'y'], [290, 175, 295, 285, 'y'],
    ],
    bays: [[154, 262, 205.5, 211], [154, 262, 239, 244.5]],
    manholes: [[60, 158], [210, 162], [340, 157], [132, 60], [282, 220], [100, 295]],
    lawn: [[151, 311, 264, 394, 380]],
    lamps: [[12, 145.8], [38, 145.8], [64, 145.8], [90, 145.8], [160, 145.8], [186, 145.8], [212, 145.8], [238, 145.8], [264, 145.8], [306, 145.8], [332, 145.8], [358, 145.8], [384, 145.8], [25, 285.8], [55, 285.8], [85, 285.8], [315, 285.8], [345, 285.8], [375, 285.8]],
    sheds: [[60, 70, 'x'], [215, 66, 'y'], [350, 70, 'x'], [345, 210, 'y']],
    pond: [232, 375, 15, 9],
  },
  // Walker routes: two equal-length variants each (opposite pavements).
  routes: [
    { id: 'canal', n: 26, variants: [[0, 147.5, 400, 147.5], [0, 172.5, 400, 172.5]] },
    { id: 'willow', n: 22, variants: [[0, 287.5, 400, 287.5], [0, 307.5, 400, 307.5]] },
    { id: 'market', n: 18, variants: [[122.5, 0, 122.5, 400], [142.5, 0, 142.5, 400]] },
    { id: 'bridge', n: 18, variants: [[272.5, 0, 272.5, 400], [292.5, 0, 292.5, 400]] },
    { id: 'square', n: 10, variants: [[297, 207, 393, 243], [297, 243, 393, 207]] },
    { id: 'green', n: 12, variants: [[152, 312, 152, 393, 263, 393], [152, 312, 263, 312, 263, 393]] },
  ],
  spots: [
    { x: 172, y: 332, cap: 3 },
    { x: 190, y: 374, cap: 3 },
    { x: 162, y: 362, cap: 2 },
    { x: 225, y: 342, cap: 3 },
    { x: 246, y: 362, cap: 2 },
    { x: 205, y: 325, cap: 3 },
    { x: 222, y: 388, cap: 2 },
    { x: 330, y: 236, cap: 2 },
    { x: 360, y: 236, cap: 2 },
  ],
  dwellers: 16,
  // Sample points (x, y, z) for notes, checks and the measure cards.
  probes: {
    coolRoof: [175, 122.5, 18],
    darkRoof: [240, 127.5, 18],
    greenRoof: [92.5, 125, 15],
    coating: [100, 160, 0],
    square: [345, 225, 0],
    carpark: [207.5, 225, 0],
    grass: [228, 335, 0],
    concrete: [215, 147.5, 0],
    asphalt: [200, 295, 0],
  },
  // Margin notes (at most 5), anchored on the After half of the default split view.
  notes: [
    { at: [175, 122.5, 18], dx: 60, dy: 30, key: 'roofs' },
    { at: [250, 160, 0], dx: 60, dy: 60, key: 'coating' },
    { at: [345, 225, 0], dx: 30, dy: 70, key: 'square' },
    { at: [272.5, 216, 0], dx: -20, dy: 110, key: 'trees' },
    { at: [240, 187.5, 8], dx: 40, dy: -60, key: 'green' },
  ],
  startCam: { z: 2.5, cx: 225, cy: 240 },
};
