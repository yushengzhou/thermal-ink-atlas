// Analysis helpers for the school campus playground (block 8), shared by the
// tests and scripts/sources.mjs (not shipped in the page): the world and its
// models, the irrigation numbers, the burn cells, the walkers and children,
// the sensitivity runs and the acceptance bands. CP_NOTES are the parameter
// notes for docs/sources.md (the block's materials keep theirs in materials.js).
import { SCENE } from '../cities/campus/scene.js';
import { buildWorld } from '../engine/world.js';
import { runModel, shadeClassField } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';
import { CP, campusSetup, campusStats, irrigationStats, irrigation, burnCells, kidPlan, kidsAt, tsMean, tmrtMean, mergeTurf, shadeSplit } from '../engine/campus.js';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';
import { splashParams } from '../engine/hutong.js';

/** Notes on the block-8 parameters (docs only). */
export const CP_NOTES = {
  irrigateHour: 'the pitch is watered at 14:00 (the spec); the design day repeats, so it is watered every day at that hour',
  efPeak: 'evaporative fraction of the watered turf at the start of the pulse (the brief: 0.8 decaying)',
  efRes: 'evaporative fraction the pulse decays to, until midnight; brief 0-0.1, the middle value',
  irrigateTau: 'decay time of the pulse, minutes; brief 10-20 min, the middle value; the model steps every minute and stores every 15 min',
  sailHeight: 'height of the shade sails, m; an assumption of this block',
  burnMetal: '1-min contact-burn threshold for bare metal (ISO 13732-1 via CENELEC Guide 29, via the brief)',
  burnStone: '1-min contact-burn threshold for ceramics, glass and stone (as above); concrete is read with them',
  burnPlastic: '1-min contact-burn threshold for plastics and wood (as above); used for the turf, the rubber, the track and the courts',
  burn10min: 'the 10-min threshold, 48 C for every material group (as above); quoted on the burn card for long contact',
  asphaltClass: 'ISO 13732-1 has no concrete or asphalt group; concrete and asphalt (stone aggregate in bitumen) are read with ceramics, glass and stone',
  playTimes: 'when the children come out (a summer day camp): engine assumption',
  kidSize: 'children are drawn at 0.7 of an adult figure; drawing only',
};

let cache = null;
/** World, models and statistics (memoised). */
export function base8() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = campusSetup(world);
    const T = setup.base;
    const W = setup.irrigated();
    const st = campusStats(world, T);
    cache = { scene: SCENE, world, setup, slots: setup.slots, T, W, st, C: st.C, water: irrigationStats(T, W, setup.cells) };
  }
  return cache;
}

/** The irrigation with the block-5 water store instead of the pulse (docs only, supplementary): W0, beta and W_c of the hutong splash. */
export function waterStore8() {
  const { world, slots, T, setup } = base8();
  const cells = setup.cells;
  const sp = splashParams();
  const run = runModel(world, { slots, cells, splash: { cells, w0: sp.w0, beta: sp.beta, wc: sp.wc, hour: CP.irrigateHour.value } });
  return { ...irrigationStats(T, mergeTurf(world, T, run, cells), cells), params: { w0: sp.w0, beta: sp.beta, wc: sp.wc } };
}

/** Burn cells at an hour by material (dry model). */
export function burn8(h = 15) {
  const { world, T } = base8();
  const out = {};
  for (const b of burnCells(world, T, h)) out[b.id] = (out[b.id] ?? 0) + 1;
  return out;
}

/** Walkers and children at hour h: dwellers in shade, walkers' shade density ratio, children's share in shade. */
export function walkers8(hour = 15) {
  const { world, T } = base8();
  const cacheShade = new Map();
  const shadeFor = (hq) => {
    if (!cacheShade.has(hq)) cacheShade.set(hq, shadeClassField(world, T.sun(hq)));
    return cacheShade.get(hq);
  };
  const life = new Life(SCENE, shadeFor, (h) => T.air(h));
  const P = life.plan(hour);
  const sh = shadeFor(hour);
  let dShade = 0;
  for (const [s] of P.dwell) if (shadeAt(sh, SCENE.spots[s].x, SCENE.spots[s].y) !== 0) dShade++;
  const frames = [400, 1600, 2800, 4000];
  const dens = frames.map((f) => shadeDensity(world, life.at(f / 60, hour), sh));
  const plan = kidPlan(SCENE, sh, T.air(hour), hour, SCENE.seed);
  let kShade = 0;
  let kN = 0;
  for (const f of frames) {
    for (const k of kidsAt(SCENE, plan, f / 60)) {
      kN++;
      if (shadeAt(sh, k.x, k.y) !== 0) kShade++;
    }
  }
  const spotsShade = SCENE.kids.spots.filter((s) => shadeAt(sh, s.x, s.y) !== 0).reduce((a, s) => a + s.cap, 0);
  return { dwellers: P.dwell.length, dwellShade: dShade / Math.max(1, P.dwell.length), ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length, kids: plan.length, kidShade: kN ? kShade / kN : 0, shadeCapacity: spotsShade };
}

/** One change at a time, within the cited ranges, on the cells it touches. */
let sens = null;
export function sensitivity8() {
  if (sens) return sens;
  const { world, slots, C, T, setup } = base8();
  const swap = (id, key, value) => ({ ...MATERIALS, [id]: { ...MATERIALS[id], [key]: { ...MATERIALS[id][key], value } } });
  const run = (cells, mats) => runModel(world, { slots, cells, materials: mats });
  const turf = [];
  for (const [key, vals] of [['alpha', [0.05, 0.15]], ['mu', [250, 500]]]) {
    for (const val of vals) {
      const m = run(C.turf, swap('turf', key, val));
      turf.push({ label: `turf ${key === 'alpha' ? 'albedo' : 'μ'} ${val}`, peak: Math.max(...[14, 14.25, 14.5, 14.75, 15].map((h) => tsMean(m, C.turf, h))), d15: tsMean(m, C.turf, 15) - tsMean(T, C.grass, 15), d05: tsMean(m, C.turf, 5) - tsMean(T, C.grass, 5) });
    }
  }
  const courts = [0.15, 0.3].map((a) => ({ label: `court albedo ${a}`, dt: tsMean(run(C.courts, swap('acrylic', 'alpha', a)), C.courts, 15) - T.air(15) }));
  const track = [0.1, 0.2].map((a) => ({ label: `track albedo ${a}`, dt: tsMean(run(C.track, swap('track', 'alpha', a)), C.track, 15) - T.air(15) }));
  // sail transmission: a world with the other value (the sails are screens; their tr is read at build)
  const sail = [];
  for (const tr of [0.1, 0.3]) {
    const was = MATERIALS.shadeSail.tr.value;
    MATERIALS.shadeSail.tr.value = tr;
    const w2 = buildWorld(SCENE);
    MATERIALS.shadeSail.tr.value = was;
    w2.campus = world.campus;
    const m = runModel(w2, { cells: C.rubber });
    const s = shadeSplit(w2, m, 15);
    sail.push({ label: `sail transmission ${tr}`, sail: tsMean(m, s.sail, 15) - T.air(15), cut: tsMean(m, s.sun, 15) - tsMean(m, s.sail, 15), tmrt12: (() => {
      const s12 = shadeSplit(w2, m, 12);
      return tmrtMean(m, s12.sun, 12) - tmrtMean(m, s12.sail, 12);
    })() });
  }
  const pulse = [];
  for (const [tau, res] of [[10, 0.05], [20, 0.05], [15, 0], [15, 0.1]]) {
    const ir = irrigation();
    ir.pulse = { ...ir.pulse, tau, res };
    const m = runModel(world, { slots, cells: setup.cells, splash: { cells: setup.cells, ...ir } });
    const w = irrigationStats(T, mergeTurf(world, T, m, setup.cells), setup.cells);
    pulse.push({ label: `τ ${tau} min, EF_res ${res}`, min: w.min.wet - w.min.air, drop: w.min.d, recovered: w.recovered, residual: w.residual });
  }
  sens = { turf, courts, track, sail, pulse, store: waterStore8() };
  return sens;
}

/**
 * Block 8 acceptance bands (spec #12, the brief's bands at Ta peak 35 C):
 * evaluated at 15:00 (the air's peak) unless the band names its hour (turf
 * 14-15 h, night 05:00, irrigation from 14:00, Tmrt at noon). Rows: {label,
 * value, lo, hi, unit, src, inside, supp}; supplementary rows are reported
 * and not counted.
 */
export function bands8() {
  const { st, T, C, water } = base8();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', o = {}) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, supp: !!o.supp, inside: (lo === null || value >= lo - 1e-9) && (hi === null || value <= hi + 1e-9) });
  const t = st.table;
  const a = (h) => T.air(h);
  const s12 = st.split[12];
  const s15 = st.split[15];
  add(`1. Artificial turf, highest 15-min mean 14:00–15:00 (n ${C.turf.length}), °C`, st.turfMax, 65, 80, 'jim2016', '°C');
  add(`1. Supplementary: turf daily peak (${String(Math.floor(st.turfPeak.h)).padStart(2, '0')}:${String(Math.round((st.turfPeak.h % 1) * 60)).padStart(2, '0')}), °C`, st.turfPeak.t, 65, 80, 'jim2016', '°C', { supp: true });
  add(`2. Turf − grass at 15:00 (grass field n ${C.grass.length}), K`, t.turf.ts[15] - t.grass.ts[15], 20, 40, 'singh2024', 'K');
  add('2. Supplementary: turf − grass at 14:00, K', t.turf.ts[14] - t.grass.ts[14], 20, 40, 'singh2024', 'K', { supp: true });
  add('3. Natural grass at 15:00, °C', t.grass.ts[15], 33, 42, 'jim2016', '°C');
  add('4. Turf − grass at 05:00, K', t.turf.ts[5] - t.grass.ts[5], -2, 2, 'jim2016', 'K');
  add(`5. Running track at 15:00 above the air (n ${C.track.length}), K`, t.track.ts[15] - a(15), 15, 30, 'kinmen', 'K');
  add('5. Running track − turf at 15:00, K (below the turf)', t.track.ts[15] - t.turf.ts[15], null, -1e-6, 'aoki2009', 'K');
  add('5. Supplementary: running track at 14:00 above the air, K', t.track.ts[14] - a(14), 15, 30, 'kinmen', 'K', { supp: true });
  add(`6. Acrylic courts at 15:00 above the air (n ${C.courts.length}), K`, t.courts.ts[15] - a(15), 15, 25, 'courtVendor', 'K');
  add(`7. Rubber under a sail at 15:00 above the air (n ${s15.sail.n}), K`, s15.sail.ts - a(15), 0, 8, 'vanos2016', 'K');
  add(`7. Rubber in sun (n ${s15.sun.n}) − under a sail at 15:00, K`, s15.sun.ts - s15.sail.ts, 25, null, 'pfautsch2020', 'K');
  add('7. Supplementary: the same at 12:00 (Vanos et al. measured at noon), K', s12.sun.ts - s12.sail.ts, 25, null, 'vanos2016', 'K', { supp: true });
  add(`8. Rubber under a tree at 15:00 above the air (n ${s15.tree.n}), K`, s15.tree.ts - a(15), 0, 5, 'vanos2016', 'K');
  add(`8. Supplementary: the same at 12:00 (n ${s12.tree.n}), K`, s12.tree.ts - a(12), 0, 5, 'vanos2016', 'K', { supp: true });
  const hh = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  add(`9. Watered pitch at its largest cooling (${hh(water.min.h)}) above the air, K (within 5 K)`, water.min.wet - water.min.air, null, 5, 'nydoh', 'K');
  add(`9. Share of that cooling gone 30 min later (${hh(water.later.h)}), 1 − ΔT(+30 min) / ΔT`, water.recovered, 0.3, 0.9, 'mcnitt2008');
  add(`9. Cooling left 3 h after watering (${hh(water.end.h)}), K`, water.residual, null, 10, 'mcnitt2008', 'K');
  const ws = waterStore8();
  add(`9. Supplementary (not shipped): the block-5 water store instead of the pulse (W0 ${ws.params.w0} mm, β ${ws.params.beta}, W_c ${ws.params.wc} mm, as the hutong splash), largest cooling (${hh(ws.min.h)}) above the air, K`, ws.min.wet - ws.min.air, null, 5, 'nydoh', 'K', { supp: true });
  add('9. Supplementary (not shipped): the same, share of the cooling gone 30 min later', ws.recovered, 0.3, 0.9, 'mcnitt2008', '', { supp: true });
  add(`10. Tmrt at noon, rubber in sun − under a sail (n ${s12.sun.n} / ${s12.sail.n}), K`, s12.sun.tmrt - s12.sail.tmrt, 15, 30, 'vanos2017', 'K');
  add(`10. Tmrt at noon, rubber in sun − under a tree (n ${s12.tree.n}), K`, s12.sun.tmrt - s12.tree.tmrt, 15, 30, 'vanos2017', 'K');
  const wk = walkers8(15);
  add(`Children at 15:00 (n ${wk.kids}) playing in shade (sails, trees, buildings)`, wk.kidShade, 0.5, null, 'melnikov');
  add(`Grown-ups resting at 15:00 in shade (n ${wk.dwellers})`, wk.dwellShade, 0.5, null, 'melnikov');
  add('Walkers at 15:00: density in shade over density in sun', wk.ratio, 2, null, 'melnikov');
  return rows;
}

/** Band verdicts 1-10: met if every counted row of the band is inside. */
export function bandVerdicts(rows) {
  const out = {};
  for (const r of rows) {
    const m = /^(\d+)\. /.exec(r.label);
    if (!m || r.supp) continue;
    out[m[1]] = (out[m[1]] ?? true) && r.inside;
  }
  return out;
}
