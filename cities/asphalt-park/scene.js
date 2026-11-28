// Scene: "Asphalt street vs pocket park". An invented 400 m x 400 m block.
// Units: metres, x east, y south. Every parcel lists footprint, height and
// material. Site settings are assumptions, easy to change.

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];

function ellipse(cx, cy, rx, ry, n = 28) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    p.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry);
  }
  return p;
}

/** A path of width w along polyline pts, as quads per segment. */
function strip(pts, w) {
  const out = [];
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const [x0, y0, x1, y1] = [pts[i], pts[i + 1], pts[i + 2], pts[i + 3]];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const nx = (-(y1 - y0) / L) * (w / 2);
    const ny = ((x1 - x0) / L) * (w / 2);
    const ex = ((x1 - x0) / L) * (w / 2);
    const ey = ((y1 - y0) / L) * (w / 2);
    out.push([x0 - ex + nx, y0 - ey + ny, x1 + ex + nx, y1 + ey + ny, x1 + ex - nx, y1 + ey - ny, x0 - ex - nx, y0 - ey - ny]);
  }
  return out;
}

const PERIMETER = [149, 309, 266, 309, 266, 396, 149, 396, 149, 309];
const DIAGONAL = [149, 309, 205, 350, 266, 396];

export const SCENE = {
  id: 'asphalt-park',
  title: 'Asphalt street vs pocket park',
  size: 400,
  seed: 1907,
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
    note: 'Assumed heat-wave day: 35° N, 20 July, air 25–35 °C, light wind 1.5 m/s.',
  },
  // Ground parcels, painted in order (later wins). Base is concrete yards.
  ground: [
    { id: 'yards', name: 'Back yards', mat: 'concrete', poly: rect(0, 0, 400, 400) },
    { id: 'kiln', name: 'Kiln Street', mat: 'asphalt', poly: rect(0, 150, 400, 170), street: 'ew' },
    { id: 'linden', name: 'Linden Lane', mat: 'asphalt', poly: rect(0, 290, 400, 300), street: 'ew' },
    { id: 'mill', name: 'Mill Road', mat: 'asphalt', poly: rect(125, 0, 140, 400), street: 'ns' },
    { id: 'ferry', name: 'Ferry Road', mat: 'asphalt', poly: rect(275, 0, 290, 400), street: 'ns' },
    { id: 'carpark', name: 'Car park', mat: 'asphalt', poly: rect(150, 207, 265, 245) },
    { id: 'gardens', name: 'Shared gardens', mat: 'grass', poly: rect(8, 352, 115, 395) },
    { id: 'park', name: 'Pocket park lawn', mat: 'grass', poly: rect(145, 305, 270, 400) },
    ...strip(PERIMETER, 3.5).map((poly, i) => ({ id: `path${i}`, name: 'Park path', mat: 'stone', poly })),
    ...strip(DIAGONAL, 3).map((poly, i) => ({ id: `diag${i}`, name: 'Park path', mat: 'stone', poly })),
    { id: 'plaza', name: 'Grove plaza', mat: 'stone', poly: ellipse(180, 372, 11, 9) },
    { id: 'pond', name: 'Pond', mat: 'water', poly: ellipse(232, 360, 17, 11) },
  ],
  // Buildings: footprint, height (m), roof material, wall colour.
  buildings: [
    // north row
    { id: 'b1', name: 'Kiln Works sheds', x0: 5, y0: 112, x1: 40, y1: 145, h: 9, roof: 'metal', wall: '#b9715a', gable: 'x' },
    { id: 'b2', name: 'Workshops', x0: 45, y0: 115, x1: 80, y1: 145, h: 11, roof: 'metal', wall: '#d9b77a', shops: true },
    { id: 'b3', name: 'Kiln Street flats', x0: 85, y0: 105, x1: 120, y1: 145, h: 16, roof: 'membrane', wall: '#e3d3b0', shops: true },
    { id: 'b4', name: 'Print house', x0: 5, y0: 10, x1: 60, y1: 60, h: 18, roof: 'membrane', wall: '#b8b1a5' },
    { id: 'b5', name: 'Terrace', x0: 65, y0: 10, x1: 120, y1: 55, h: 14, roof: 'membrane', wall: '#a9b89a' },
    { id: 'b6', name: 'Old kiln hall', x0: 145, y0: 105, x1: 205, y1: 145, h: 11, roof: 'metal', wall: '#b9715a', gable: 'y', chimney: [160, 118, 30] },
    { id: 'b7', name: 'Dark-roof office', x0: 210, y0: 110, x1: 270, y1: 145, h: 18, roof: 'membrane', wall: '#e3d3b0', shops: true },
    { id: 'b9', name: 'Mill tower', x0: 170, y0: 10, x1: 235, y1: 60, h: 32, roof: 'membrane', wall: '#a8b9c4' },
    { id: 'b10', name: 'Cool-roof office', x0: 295, y0: 110, x1: 355, y1: 145, h: 18, roof: 'coolroof', wall: '#e8e0cf', shops: true },
    { id: 'b11', name: 'Corner house', x0: 360, y0: 115, x1: 395, y1: 145, h: 14, roof: 'membrane', wall: '#cf9c8c', shops: true },
    { id: 'b12', name: 'Ferry flats', x0: 300, y0: 10, x1: 395, y1: 60, h: 20, roof: 'membrane', wall: '#a9b89a' },
    // middle row: low buildings south of Kiln Street keep the street in view
    { id: 'b13', name: 'Kiln Street shops', x0: 5, y0: 175, x1: 60, y1: 200, h: 8, roof: 'membrane', wall: '#d9b77a' },
    { id: 'b14', name: 'Kiln Street shops', x0: 65, y0: 175, x1: 120, y1: 200, h: 9, roof: 'metal', wall: '#cf9c8c' },
    { id: 'b15', name: 'Linden flats', x0: 5, y0: 245, x1: 55, y1: 285, h: 15, roof: 'membrane', wall: '#a9b89a' },
    { id: 'b16', name: 'Mill Road flats', x0: 60, y0: 235, x1: 120, y1: 285, h: 18, roof: 'membrane', wall: '#b9715a' },
    { id: 'b17', name: 'Kiln Street shops', x0: 145, y0: 175, x1: 200, y1: 200, h: 9, roof: 'membrane', wall: '#e3d3b0' },
    { id: 'b18', name: 'Bakery and laundry', x0: 205, y0: 175, x1: 270, y1: 200, h: 8, roof: 'metal', wall: '#a9b89a' },
    { id: 'b19', name: 'Linden Lane flats', x0: 145, y0: 250, x1: 205, y1: 285, h: 16, roof: 'membrane', wall: '#d9b77a' },
    { id: 'b20', name: 'Depot', x0: 210, y0: 255, x1: 270, y1: 285, h: 13, roof: 'metal', wall: '#a8b9c4' },
    { id: 'b21', name: 'Kiln Street shops', x0: 295, y0: 175, x1: 345, y1: 200, h: 9, roof: 'membrane', wall: '#b9715a' },
    { id: 'b22', name: 'Clinic', x0: 350, y0: 175, x1: 395, y1: 205, h: 10, roof: 'coolroof', wall: '#e3d3b0' },
    { id: 'b23', name: 'Warehouse', x0: 295, y0: 245, x1: 395, y1: 285, h: 12, roof: 'metal', wall: '#b8b1a5' },
    // south row, either side of the park
    { id: 'b24', name: 'Garden flats', x0: 5, y0: 305, x1: 55, y1: 345, h: 16, roof: 'membrane', wall: '#cf9c8c' },
    { id: 'b25', name: 'Garden flats', x0: 60, y0: 305, x1: 118, y1: 340, h: 13, roof: 'membrane', wall: '#e3d3b0' },
    { id: 'b27', name: 'Park view flats', x0: 300, y0: 310, x1: 395, y1: 345, h: 20, roof: 'membrane', wall: '#a9b89a' },
    { id: 'b28', name: 'Corner shop', x0: 300, y0: 360, x1: 350, y1: 395, h: 9, roof: 'metal', wall: '#d9b77a' },
  ],
  // Trees: centre, canopy radius r, canopy centre height zc (top = zc + r).
  trees: [
    // Linden Lane street trees on the park-side pavement
    ...[152, 164, 176, 188, 200, 212, 224, 236, 248, 260].map((x, i) => ({ x, y: 303, r: 4.2 + (i % 3) * 0.4, zc: 6.5 })),
    // park west edge
    ...[322, 336, 350].map((y) => ({ x: 155, y, r: 5, zc: 7 })),
    // the grove around the plaza
    { x: 165, y: 362, r: 6, zc: 8 },
    { x: 178, y: 356, r: 5.5, zc: 7.5 },
    { x: 193, y: 364, r: 6, zc: 8 },
    { x: 167, y: 381, r: 6, zc: 8 },
    { x: 183, y: 388, r: 5.5, zc: 7.5 },
    { x: 197, y: 381, r: 5, zc: 7 },
    { x: 157, y: 393, r: 4.5, zc: 6.5 },
    // lone lawn trees
    { x: 214, y: 322, r: 5, zc: 7 },
    { x: 255, y: 331, r: 4.5, zc: 6.5 },
    { x: 260, y: 388, r: 5, zc: 7 },
    // gardens
    { x: 30, y: 370, r: 4.5, zc: 6 },
    { x: 85, y: 378, r: 5, zc: 6.5 },
    // car park island
    { x: 207, y: 226, r: 4, zc: 5.5 },
    // back-yard trees
    { x: 28, y: 218, r: 4.5, zc: 6 },
    { x: 92, y: 222, r: 5, zc: 6.5 },
    { x: 38, y: 86, r: 4.5, zc: 6 },
    { x: 100, y: 82, r: 4, zc: 5.5 },
    { x: 158, y: 82, r: 5, zc: 6.5 },
    { x: 252, y: 88, r: 4.5, zc: 6 },
    { x: 328, y: 84, r: 5, zc: 6.5 },
    { x: 383, y: 92, r: 4, zc: 5.5 },
    { x: 322, y: 226, r: 4.5, zc: 6 },
    { x: 372, y: 222, r: 4, zc: 5.5 },
  ],
  benches: [
    { x: 172, y: 366, a: 0 },
    { x: 189, y: 371, a: 1 },
    { x: 180, y: 381, a: 0 },
    { x: 226, y: 347, a: 0 },
    { x: 246, y: 372, a: 1 },
    { x: 156, y: 330, a: 1 },
  ],
  cars: [
    [20, 152.5, 'x', '#7f8f99'],
    [52, 152.5, 'x', '#b5633f'],
    [98, 167.5, 'x', '#c9b48a'],
    [165, 152.5, 'x', '#5d6b5a'],
    [238, 167.5, 'x', '#a33b2c'],
    [318, 152.5, 'x', '#d5cfc2'],
    [372, 167.5, 'x', '#43566b'],
    [160, 212, 'y', '#b5633f'],
    [172, 212, 'y', '#7f8f99'],
    [184, 240, 'y', '#c9b48a'],
    [236, 212, 'y', '#5d6b5a'],
    [250, 240, 'y', '#d5cfc2'],
    [127.5, 70, 'y', '#a33b2c'],
    [287.5, 225, 'y', '#7f8f99'],
  ],
  // Walker routes: each has two equal-length variants (opposite pavements).
  routes: [
    { id: 'kiln', n: 26, variants: [[0, 147.5, 400, 147.5], [0, 172.5, 400, 172.5]] },
    { id: 'mill', n: 18, variants: [[122.5, 0, 122.5, 400], [142.5, 0, 142.5, 400]] },
    { id: 'ferry', n: 18, variants: [[272.5, 0, 272.5, 400], [292.5, 0, 292.5, 400]] },
    { id: 'linden', n: 20, variants: [[0, 287.5, 400, 287.5], [0, 302.5, 400, 302.5]] },
    {
      id: 'park',
      n: 14,
      variants: [
        [149, 309, 149, 396, 266, 396],
        [149, 309, 266, 309, 266, 396],
      ],
    },
  ],
  // Dwell spots in the park: capacity and kind.
  spots: [
    { x: 172, y: 368, cap: 3 },
    { x: 189, y: 373, cap: 3 },
    { x: 180, y: 383, cap: 3 },
    { x: 160, y: 356, cap: 2 },
    { x: 199, y: 386, cap: 2 },
    { x: 156, y: 332, cap: 2 },
    { x: 216, y: 326, cap: 2 },
    { x: 226, y: 345, cap: 3 },
    { x: 246, y: 374, cap: 2 },
    { x: 205, y: 338, cap: 3 },
    { x: 238, y: 330, cap: 3 },
    { x: 222, y: 384, cap: 3 },
    { x: 250, y: 352, cap: 2 },
  ],
  dwellers: 24,
  // Sample points for checks (x, y, z).
  probes: {
    treeShade: [172.5, 382.5, 0],
    water: [232, 360, 0],
    grass: [228, 338, 0],
    coolRoof: [325, 127.5, 18],
    shadedPaving: [122.5, 187.5, 0],
    asphalt: [215, 160, 0],
    darkRoof: [240, 127.5, 18],
    concrete: [215, 147.5, 0],
  },
  notes: [
    { at: [200, 160, 0], dx: 55, dy: 48, key: 'asphalt' },
    { at: [228, 338, 0], dx: 150, dy: 35, key: 'lawn' },
    { at: [122.5, 190, 0], dx: -60, dy: 70, key: 'shade' },
    { at: [325, 127.5, 18], dx: -60, dy: 120, key: 'roofs' },
    { at: [232, 360, 0], dx: -120, dy: 75, key: 'pond' },
  ],
  startCam: { z: 2.5, cx: 230, cy: 250 },
};
