// Analysis helpers for the desert courtyard block (block 11), shared by the
// tests and scripts/sources.mjs (not shipped in the page): the world and its
// models, the statistics, the mesquite calibration, the walkers, the
// sensitivity runs, the docs-only runs of the misses' causes and the
// acceptance bands. DS_NOTES are the parameter notes for docs/sources.md
// (the block's materials keep theirs in materials.js).
import { SCENE } from '../cities/desert/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField, runModel } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';
import { DS, desertSetup, desertStats, shadeCells, mean } from '../engine/desert.js';
import { solarPosition } from '../engine/sun.js';
import SunCalc from 'suncalc';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';
import { tmrtWalls as tmrtWallsVG } from './village.mjs';

/** Notes on the block-11 parameters (docs only). */
export const DS_NOTES = {
  lat: 'site latitude, ° N (Phoenix Sky Harbor about 33.43); longitude −112.0, time zone UTC−7 (no daylight saving), 15 July',
  taMin: 'the design day\'s coolest air, °C: between the 1991–2020 July normal (29.2) and July 2023 (32.7), as the brief suggests; AZMET hot days 28.7',
  taMax: 'the design day\'s warmest air, °C: between the July normal (41.4) and July 2023 (46.0), as the brief suggests',
  tmaxHour: 'clock hour of the warmest air: the hourly normals put it at 16–17 MST; 16:30, the middle (the spec). Every other block keeps 15:00',
  vapour: 'vapour pressure, hPa: the brief\'s 12 (dew point about 10 °C); AZMET hot days have dew points of 11–13 °C (13–15 hPa), June\'s normal 3.2 °C (7.7 hPa)',
  wind: 'site wind, m/s, the h_c input: AZMET hot days 1.5–2.2 m/s (2 m), the lower end; Sky Harbor 10 m normals are 2.4–4.7 m/s and pedestrian-level wind in Tempe under 1 m/s (h_c uses the formula of the shared engine, issue #20)',
  wallAlbedo: 'the light stucco walls\' albedo for the wall-reflection term (world.wallAlbedo, this block only; the shared value is 0.3): the brief\'s 0.5–0.7, the middle (the spec)',
  sailZ: 'height of the shade sails, m (engine assumption)',
  ramadaZ: 'height of the ramada roof, m (engine assumption); the café patio roof is 3 m',
  arcadeZ: 'height of the arcade roof, m (engine assumption)',
  hour: 'the bands\' hour, 15:00 (the brief\'s bands are at 15:00)',
  noon: 'the coating\'s supplementary hour, 12:00 local clock time (the Phoenix trial\'s "noon"); solar noon here is about 12:34',
  night: 'the "after sunset" hour, 21:00 (sunset about 19:35); set before the first run',
  mesquiteTarget: 'the calibration target for the mesquite crown, K: ΔTmrt under Prosopis against open sun (Middel et al. 2021), as the brief says ("mesquite LAI: calibrate to −16.7 K")',
  treeWater: 'water a desert tree takes, L per m² of canopy a day: about 890 L every 7–21 days for a 6.1 m canopy (AMWUA via the brief); quoted on the cards and the water overlay, not modelled',
  lawnApplied: 'water a Phoenix lawn is given, mm (= L m⁻²) a day: every 3 days, about 6.4 mm a day (AMWUA via the brief); quoted',
  misters: 'water a misted patio uses, L per m² an hour: 4.87 L h⁻¹ per nozzle at 0.3–0.7 nozzles per m² (Huang et al. 2025 via the brief); quoted, misting is not modelled',
  warm: 'coarse 10-min spin-up days (block 3\'s opts.warm, with its stability guard); convergence is tested on 1-min days as everywhere',
};

let cache = null;
/** World, models (coated, as built; and the street without its coating), statistics (memoised). */
export function base11() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = desertSetup(world);
    const T = setup.base;
    const U = setup.model(false);
    const st = desertStats(world, T, U);
    cache = { scene: SCENE, world, setup, T, U, st };
  }
  return cache;
}

/**
 * Mesquite calibration (as the brief says: no measured leaf area; calibrate
 * the crown to the measured ΔTmrt): bisection on the crown transmission tr
 * (mesquite and palo verde together, as shipped) so the mesquites' mean
 * ΔTmrt at 15:00 against open sun is DS.mesquiteTarget. Each step builds the
 * world and runs the model again. Returns {tr, d, steps}. Docs and tests
 * only; the result is the shipped value in materials.js.
 */
export function calibrateMesquite(lo = 0.02, hi = 0.8, tol = 0.02) {
  const keep = [MATERIALS.mesquite.tr.value, MATERIALS.paloVerde.tr.value];
  const at = (tr) => {
    MATERIALS.mesquite.tr.value = tr;
    MATERIALS.paloVerde.tr.value = tr;
    const world = buildWorld(SCENE);
    const setup = desertSetup(world);
    return desertStats(world, setup.base).shade.mesquite[DS.hour.value].d;
  };
  const target = DS.mesquiteTarget.value;
  const steps = [];
  try {
    let a = lo;
    let b = hi;
    for (let k = 0; k < 14; k++) {
      const m = (a + b) / 2;
      const d = at(m);
      steps.push({ tr: m, d });
      if (Math.abs(d - target) < tol) break;
      // more sun through the crown: a smaller (less negative) ΔTmrt
      if (d < target) a = m;
      else b = m;
    }
  } finally {
    MATERIALS.mesquite.tr.value = keep[0];
    MATERIALS.paloVerde.tr.value = keep[1];
  }
  const last = steps[steps.length - 1];
  return { tr: last.tr, d: last.d, steps };
}

/** Walkers and the people dwelling at hour h: walkers' shade density ratio; dwellers in shade. */
export function walkers11(hour = 15) {
  const { world, T } = base11();
  const cacheShade = new Map();
  const shadeFor = (hq) => {
    if (!cacheShade.has(hq)) cacheShade.set(hq, shadeClassField(world, T.sun(hq)));
    return cacheShade.get(hq);
  };
  const life = new Life(SCENE, shadeFor, (h) => T.air(h));
  const sh = shadeFor(hour);
  const frames = [400, 1600, 2800, 4000];
  const dens = frames.map((f) => shadeDensity(world, life.at(f / 60, hour).filter((a) => !a.sit), sh));
  const P = life.plan(hour);
  const spots = P.dwell.map(([s]) => SCENE.spots[s]);
  const inShade = spots.filter((s) => shadeAt(sh, s.x, s.y) !== 0).length;
  return { ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length, dwellers: spots.length, shade: inShade / spots.length, choice: P.choice };
}

/**
 * Block 11 acceptance bands (spec #17, the brief's bands at 15:00).
 * Rows: {label, value, lo, hi, unit, src, inside, supp}; supplementary rows
 * are reported and not counted. Defined before the first band run.
 */
export function bands11() {
  const { st } = base11();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', o = {}) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, supp: !!o.supp, inside: (lo === null || value >= lo - 1e-9) && (hi === null || value <= hi + 1e-9) });
  const h = DS.hour.value;
  const nn = DS.noon.value;
  const ni = DS.night.value;
  const S = st.shade;
  add(`1. Sunlit open gravel at 15:00 (n ${st.gravel.n}), °C`, st.gravel.ts15, 55, 63, 'middel2021', '°C');
  add(`1. Supplementary: the plaza's open gravel in full sun at 15:00 (n ${st.ref[h].n}), °C`, st.ref[h].ts, 55, 63, 'middel2021', '°C', { supp: true });
  const c = st.coat[h];
  add(`2. Main Street coated − the same street bare at 15:00 (n ${c.n} sunlit cells), K`, c.dTs, null, -5, 'coolPave2024', 'K');
  add('2. Supplementary: the same at 12:00, K', st.coat[nn].dTs, null, -5, 'coolPave2024', 'K', { supp: true });
  add(`2. Supplementary: Main Street coated − the cross street's bare asphalt at 15:00 (n ${st.cross.n}), K`, c.ts - st.cross.ts15, null, -5, 'coolPave2024', 'K', { supp: true });
  add(`3. Irrigated lawn in full sun at 15:00 (n ${st.lawn.n}): surface − air, K`, st.lawn.ts15 - st.air[h], null, 2, 'middel2021', 'K');
  add(`4. Irrigated lawn: water evaporated over the day, mean of ${st.lawn.n ? 'the open lawn' : ''} cells, mm (= L m⁻²)`, st.lawn.evap, 5, 7, 'az1195', 'mm');
  add('4. Supplementary: the same, lowest cell, mm', st.lawn.evapMin, 5, 7, 'az1195', 'mm', { supp: true });
  add('4. Supplementary: the same, highest cell, mm', st.lawn.evapMax, 5, 7, 'az1195', 'mm', { supp: true });
  add(`5. The plaza's open gravel in full sun at 15:00 (n ${st.ref[h].n}): Tmrt, °C`, st.ref[h].tmrt, 65, 76, 'middel2021', '°C');
  add(`5. Supplementary: all sunlit open gravel at 15:00 (n ${st.gravel.n}): Tmrt, °C`, st.gravel.tmrt15, 65, 76, 'middel2021', '°C', { supp: true });
  add(`5. Supplementary: the cross street's sunlit asphalt at 15:00: Tmrt, °C`, st.cross.tmrt15, 65, 76, 'middel2021', '°C', { supp: true });
  add(`6. Under the shade sails at 15:00 (n ${S.sail[h].n}): Tmrt − open sun, K`, S.sail[h].d, -20, -14, 'middel2021', 'K');
  add(`6. Under the ramada at 15:00 (n ${S.ramada[h].n}): Tmrt − open sun, K`, S.ramada[h].d, -20, -14, 'middel2021', 'K');
  add(`6. Supplementary: under the café patio roof at 15:00 (n ${S.patio[h].n}, concrete): Tmrt − open sun, K`, S.patio[h].d, -20, -14, 'middel2021', 'K', { supp: true });
  add(`7. Supplementary (by construction: the crown is calibrated to it): under the mesquites at 15:00 (n ${S.mesquite[h].n}): Tmrt − open sun, K`, S.mesquite[h].d, -20, -14, 'middel2021', 'K', { supp: true });
  add(`7. Under the palo verdes at 15:00 (n ${S.paloVerde[h].n}; semi-constructed: the mesquite's calibrated crown): Tmrt − open sun, K`, S.paloVerde[h].d, -20, -14, 'middel2021', 'K');
  // added after the first band run (disclosed in docs/sources.md): where band 7's palo verde cells stand
  const pv = causes11().palo;
  add(`7. Supplementary (added after the first run): the palo verde cells in the courtyards (n ${pv.court.n}): Tmrt − open sun, K`, pv.court.d, -20, -14, 'middel2021', 'K', { supp: true });
  add(`7. Supplementary (added after the first run): the palo verde cells in the open plaza (n ${pv.open.n}): Tmrt − open sun, K`, pv.open.d, -20, -14, 'middel2021', 'K', { supp: true });
  add(`8. Under the arcade at 15:00 (n ${S.arcade[h].n}): Tmrt − open sun, K`, S.arcade[h].d, -31, -20, 'middel2021', 'K');
  for (const k of ['sail', 'ramada', 'arcade', 'mesquite']) add(`9. After sunset (${ni}:00), under ${k === 'sail' ? 'the sails' : k === 'ramada' ? 'the ramada' : k === 'arcade' ? 'the arcade' : 'the mesquites'} (n ${S[k][ni].n}): Tmrt − the open plaza, K`, S[k][ni].d, 0, 5, 'middel2021', 'K');
  add(`9. Supplementary: after sunset, under the palo verdes (n ${S.paloVerde[ni].n}), K`, S.paloVerde[ni].d, 0, 5, 'middel2021', 'K', { supp: true });
  add(`10. A person on Main Street at 15:00: Tmrt coated − bare, K`, c.dTmrt, 2.5, 3.2, 'coolPave2024', 'K');
  add('10. Supplementary: the same at 12:00, K', st.coat[nn].dTmrt, 2.5, 3.2, 'coolPave2024', 'K', { supp: true });
  const wk = walkers11(h);
  add('Walkers at 15:00: density in shade over density in sun', wk.ratio, 2, null, 'melnikov');
  add(`People dwelling at 15:00 (n ${wk.dwellers}) whose place is in shade`, wk.shade, 0.5, null, 'melnikov');
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

const K0 = 273.15;

/**
 * Thermal.tmrt with the person's view of the ground spread over the
 * neighbourhood (docs runs only): the downward face and the four sides see
 * each ground cell within R m with the view factor of a horizontal patch
 * from a point z m up (downward face: z² / (π (z² + r²)²) per m², sides:
 * z / (2π (z² + r²)^1.5) per m²; the own cell as a disk of the same area),
 * normalised over the ground cells (buildings are walls, as in the engine).
 * The engine's tmrt sees only its own cell's ground. Same arithmetic otherwise.
 */
export function tmrtView(M, i, h, opts = {}) {
  const { world } = M;
  const z = opts.z ?? 1.1;
  const R = opts.R ?? 40;
  const mats = M.info.mats ?? MATERIALS;
  const sw = M.shortwave(i, h);
  const s = sw.sun;
  const sl = opts.sl ?? M.sunlit(i, h);
  const v = world.svf[i];
  const H = M.hourConst(h);
  const Ldown = v * H.lsky + (1 - v) * M.lwall(i, h);
  const n = world.n;
  const ci = i % n;
  const cj = Math.floor(i / n);
  const rc = Math.sqrt((world.cell * world.cell) / Math.PI);
  const reach = Math.ceil(R / world.cell);
  let wl = 0;
  let wd = 0;
  let Kl = 0;
  let Kd = 0;
  let Ll = 0;
  let Ld = 0;
  for (let dj = -reach; dj <= reach; dj++) {
    for (let di = -reach; di <= reach; di++) {
      const a = ci + di;
      const b = cj + dj;
      if (a < 0 || b < 0 || a >= n || b >= n) continue;
      const j = b * n + a;
      if (world.bld[j] >= 0) continue;
      const d = Math.hypot(di, dj) * world.cell;
      if (d > R) continue;
      const A = world.cell * world.cell;
      const lat = d === 0 ? 1 - z / Math.hypot(z, rc) : (A * z) / (2 * Math.PI * (z * z + d * d) ** 1.5);
      const dn = d === 0 ? (rc * rc) / (rc * rc + z * z) : (A * z * z) / (Math.PI * (z * z + d * d) ** 2);
      const m = mats[world.matIds[world.mat[j]]];
      const t = M.ts(j, h) + K0;
      const K = m.alpha.value * M.shortwave(j, h).K;
      const L = m.eps.value * 5.670374e-8 * t ** 4 + (1 - m.eps.value) * Ldown;
      wl += lat;
      wd += dn;
      Kl += lat * K;
      Kd += dn * K;
      Ll += lat * L;
      Ld += dn * L;
    }
  }
  const b = Math.max(0, s.alt);
  const fp = 0.308 * Math.cos(b * (1 - (b * b) / 48402) * (Math.PI / 180));
  const Ksky = v * sw.diffuse;
  const Klat = 0.5 * Ksky + 0.5 * (Kl / wl) + 0.5 * sw.walls;
  const S = 0.7 * (0.06 * Ksky + 0.06 * (Kd / wd) + 0.88 * Klat + fp * sw.beam * (sl + sw.r));
  const L = 0.97 * (0.06 * Ldown + 0.06 * (Ld / wd) + 0.88 * (0.5 * Ldown + 0.5 * (Ll / wl)));
  return Math.pow((S + L) / (0.97 * 5.670374e-8), 0.25) - K0;
}

/** A world and its base model for a changed scene, changed materials or a changed block parameter (docs runs only). */
function runWith({ scene = SCENE, mats = {}, ds = {} } = {}) {
  const keepM = Object.fromEntries(Object.keys(mats).map((k) => [k, MATERIALS[k]]));
  const keepD = Object.fromEntries(Object.keys(ds).map((k) => [k, DS[k].value]));
  try {
    Object.assign(MATERIALS, mats);
    for (const [k, x] of Object.entries(ds)) DS[k].value = x;
    const world = buildWorld(scene);
    const setup = desertSetup(world);
    return { world, setup, st: desertStats(world, setup.base) };
  } finally {
    Object.assign(MATERIALS, keepM);
    for (const [k, x] of Object.entries(keepD)) DS[k].value = x;
  }
}

/** A material with some parameter values changed. */
const patch = (id, p) => ({ [id]: { ...MATERIALS[id], ...Object.fromEntries(Object.entries(p).map(([k, x]) => [k, { ...MATERIALS[id][k], value: x }])) } });

let sens = null;
/**
 * One change at a time, inside the brief's ranges (docs only; nothing
 * shipped changes). Ground materials run on their own cells (no lateral
 * coupling); the sail, the walls, the trees and the site run the whole block.
 */
export function sensitivity11() {
  if (sens) return sens;
  const { world, T, U, st } = base11();
  const F = world.ds.F;
  const h = DS.hour.value;
  const sunny = (M, cells) => cells.filter((i) => M.sunlit(i, h) > 0.95);
  const cellsRun = (cells, mats) => runModel(world, { slots: T.slots, warm: DS.warm.value, cells, materials: { ...MATERIALS, ...mats } });
  const gravel = [];
  for (const [k, vals] of [['alpha', [0.16, 0.39]], ['mu', [600, 1000]]]) {
    for (const x of vals) {
      const M = cellsRun(F.gravel, patch('gravel', { [k]: x }));
      const c = sunny(M, F.gravel);
      const r = sunny(M, F.ref);
      gravel.push({ label: `gravel ${k === 'alpha' ? 'α' : 'μ'} ${x}`, ts15: mean(c.map((i) => M.ts(i, h))), tmrt15: mean(r.map((i) => M.tmrt(i, h))) });
    }
  }
  const lawn = [];
  for (const [k, vals] of [['ef', [0.85, 0.95]], ['alpha', [0.16]]]) {
    for (const x of vals) {
      const M = cellsRun(F.lawn, patch('desertLawn', { [k]: x }));
      const c = sunny(M, F.lawn);
      lawn.push({ label: `lawn ${k === 'ef' ? 'EF' : 'α'} ${x}`, dTs: mean(c.map((i) => M.ts(i, h))) - T.air(h), evap: mean(F.lawn.map((i) => M.evaporation(i))) });
    }
  }
  const coat = [];
  for (const x of [0.3, 0.39]) {
    const M = cellsRun(F.main, patch('coolCoat', { alpha: x }));
    const c = sunny(M, F.main);
    coat.push({ label: `coating α ${x}`, dTs: mean(c.map((i) => M.ts(i, h) - U.ts(i, h))), dTmrt: mean(c.map((i) => M.tmrt(i, h) - U.tmrt(i, h))) });
  }
  const whole = [];
  const row = (label, o) => {
    const r = runWith(o);
    whole.push({ label, sail: r.st.shade.sail[h].d, ramada: r.st.shade.ramada[h].d, arcade: r.st.shade.arcade[h].d, mesquite: r.st.shade.mesquite[h].d, night: r.st.shade.sail[DS.night.value].d, court: r.st.court.tmrt15, gravel: r.st.gravel.ts15, ref: r.st.ref[h].tmrt, air: r.st.air[h] });
  };
  for (const x of [0.1, 0.25]) row(`sail transmission ${x}`, { mats: patch('desertSail', { tr: x }) });
  for (const x of [0.5, 0.7]) row(`stucco wall albedo ${x}`, { ds: { wallAlbedo: x } });
  for (const x of [0.25, 0.35]) row(`desert tree crowns' transmission ${x}`, { mats: { ...patch('mesquite', { tr: x }), ...patch('paloVerde', { tr: x }) } });
  row('warmest air at 15:00 (the shared default)', { scene: { ...SCENE, site: { ...SCENE.site, tmaxHour: 15 } } });
  row('vapour pressure 15 hPa (dew point about 13 °C)', { scene: { ...SCENE, site: { ...SCENE.site, vapourHpa: 15 } } });
  sens = { gravel, lawn, coat, whole, shipped: { gravel: st.gravel.ts15, ref: st.ref[h].tmrt, lawnDTs: st.lawn.ts15 - st.air[h], evap: st.lawn.evap, coatDTs: st.coat[h].dTs, coatDTmrt: st.coat[h].dTmrt, sail: st.shade.sail[h].d, ramada: st.shade.ramada[h].d, arcade: st.shade.arcade[h].d, mesquite: st.shade.mesquite[h].d, night: st.shade.sail[DS.night.value].d, court: st.court.tmrt15 } };
  return sens;
}

let causes = null;
/**
 * The misses' likely causes, tested (docs only; nothing shipped changes):
 * - bands 6, 7, 10: the person's view of the ground spread over the
 *   neighbourhood (tmrtView) instead of the own cell only;
 * - band 7: a person in the full shade of a palo verde crown (sunlit = tr)
 *   instead of the 5 m cell's mean sun;
 * - band 6: smaller sails and ramada (10 m instead of 20 m, same centres);
 * - band 9: what is overhead at night (sails, roofs, crowns) at the engine's
 *   own leaf temperature, air - 0.5 K, instead of the shared warm-wall term
 *   (air + 2 K), the shade cells run again;
 * - band 1: the July normal air (29.2 / 41.4 °C), direct sun 7% weaker
 *   (the brief: the engine's noon sun is 5-10% high), gravel α at the
 *   brief's upper end 0.39, and all three.
 */
export function causes11() {
  if (causes) return causes;
  const { world, T, U, st } = base11();
  const h = DS.hour.value;
  const ni = DS.night.value;
  const by = shadeCells(world, T, h);
  const night = shadeCells(world, T, ni);
  const refView = mean(by.ref.map((i) => tmrtView(T, i, h)));
  const refViewN = mean(night.ref.map((i) => tmrtView(T, i, ni)));
  const kinds = ['sail', 'ramada', 'mesquite', 'paloVerde', 'arcade'];
  const view = Object.fromEntries(kinds.map((k) => [k, { d: mean(by[k].map((i) => tmrtView(T, i, h))) - refView, night: mean(night[k].map((i) => tmrtView(T, i, ni))) - refViewN }]));
  const paloFull = mean(by.paloVerde.map((i) => T.tmrt(i, h, MATERIALS.paloVerde.tr.value))) - st.ref[h].tmrt;
  const paloBoth = mean(by.paloVerde.map((i) => tmrtView(T, i, h, { sl: MATERIALS.paloVerde.tr.value }))) - refView;
  const main = by.ref.length ? world.ds.F.main.filter((i) => T.sunlit(i, h) > 0.95) : [];
  const coatView = mean(main.map((i) => tmrtView(T, i, h) - tmrtView(U, i, h)));
  // smaller sails and ramada
  const small = SCENE.screens.map((P) => (P.kind === 'desertSail' || (P.kind === 'ramada' && !P.patio) ? { ...P, x0: (P.x0 + P.x1) / 2 - 5, x1: (P.x0 + P.x1) / 2 + 5, y0: (P.y0 + P.y1) / 2 - 5, y1: (P.y0 + P.y1) / 2 + 5 } : P));
  const sm = runWith({ scene: { ...SCENE, screens: small } }).st;
  // what is overhead at night at the leaf temperature (air - 0.5 K); by day the shared term
  const cool = (taK, K) => (K > 0 ? taK + 2 + (6 * K) / 900 : taK - 0.5);
  const under = [...new Set(['sail', 'ramada', 'arcade', 'mesquite'].flatMap((k) => night[k]))];
  const Mn = runModel(world, { slots: T.slots, warm: DS.warm.value, cells: under.concat(night.ref), wallTemp: cool });
  const twN = T.air(ni) - 0.5 + K0;
  const refN = mean(night.ref.map((i) => Mn.tmrt(i, ni)));
  const leafNight = Object.fromEntries(['sail', 'ramada', 'arcade', 'mesquite'].map((k) => [k, mean(night[k].map((i) => tmrtWalls(Mn, i, ni, twN))) - refN]));
  // band 1: the measured day's air, weaker direct sun, a lighter gravel
  const F = world.ds.F;
  const gravelWith = ({ site = null, k = 1, alpha = null }) => {
    const w = site ? buildWorld({ ...SCENE, site: { ...SCENE.site, ...site } }) : world;
    if (site) w.wallAlbedo = DS.wallAlbedo.value;
    const slots = { suns: T.slots.suns, fields: T.slots.fields.map((f) => (k === 1 ? f : Float32Array.from(f, (x) => x * k))) };
    const M = runModel(w, { slots, warm: DS.warm.value, cells: F.gravel, materials: alpha ? { ...MATERIALS, ...patch('gravel', { alpha }) } : MATERIALS });
    const c = F.gravel.filter((i) => T.sunlit(i, h) > 0.95);
    return { ts: mean(c.map((i) => M.ts(i, h))), air: M.air(h) };
  };
  const normal = { taMin: 29.2, taMax: 41.4 };
  const gravel = [
    { label: 'shipped', ...gravelWith({}) },
    { label: '(a) the July normal air, 29.2 → 41.4 °C', ...gravelWith({ site: normal }) },
    { label: '(b) direct sun 7% weaker', ...gravelWith({ k: 0.93 }) },
    { label: '(c) gravel α 0.39 (the brief\'s upper end)', ...gravelWith({ alpha: 0.39 }) },
    { label: '(a), (b) and (c) together', ...gravelWith({ site: normal, k: 0.93, alpha: 0.39 }) },
  ];
  // band 7: the palo verde cells in the courtyards and in the open; the courtyard ones with their walls at air + 2 K (no sun term)
  const courtCells = new Set(world.ds.F.court);
  const pc = by.paloVerde.filter((i) => courtCells.has(i));
  const po = by.paloVerde.filter((i) => !courtCells.has(i));
  const Mc = runModel(world, { slots: T.slots, warm: DS.warm.value, cells: pc, wallTemp: (taK) => taK + 2 });
  const palo = { court: { n: pc.length, d: mean(pc.map((i) => T.tmrt(i, h))) - st.ref[h].tmrt, cool: mean(pc.map((i) => tmrtWalls(Mc, i, h, T.air(h) + 2 + K0))) - st.ref[h].tmrt }, open: { n: po.length, d: mean(po.map((i) => T.tmrt(i, h))) - st.ref[h].tmrt } };
  // band 6: the ground view with the sail at the brief's upper transmission 0.25
  const r25 = runWith({ mats: patch('desertSail', { tr: 0.25 }) });
  const b25 = shadeCells(r25.world, r25.setup.base, h);
  const sail25 = mean(b25.sail.map((i) => tmrtView(r25.setup.base, i, h))) - mean(b25.ref.map((i) => tmrtView(r25.setup.base, i, h)));
  // band 9: what is overhead at a thin sheet's own night temperature: sky above (the open sky view), the cell's ground below, convection h_c on both faces
  const sheetT = (M, i, hh) => {
    const H = M.hourConst(hh);
    const taK = H.taK;
    const tg = M.ts(i, hh) + K0;
    const hc = M.info.hc;
    const up = H.lsky;
    const down = 5.670374e-8 * tg ** 4;
    let lo = taK - 30;
    let hi = taK + 30;
    for (let k = 0; k < 60; k++) {
      const t = (lo + hi) / 2;
      const net = 0.9 * (up + down) - 2 * 0.9 * 5.670374e-8 * t ** 4 - 2 * hc * (t - taK);
      if (net > 0) lo = t;
      else hi = t;
    }
    return (lo + hi) / 2;
  };
  const sheetNight = Object.fromEntries(['sail', 'ramada', 'arcade', 'mesquite'].map((k) => {
    const c = night[k];
    return [k, { d: mean(c.map((i) => tmrtWalls(T, i, ni, sheetT(T, i, ni)))) - st.ref[ni].tmrt, t: mean(c.map((i) => sheetT(T, i, ni))) - K0 }];
  }));
  // the same, run: after sunset the shade cells see their overhead at that sheet's mean temperature below the air (their ground cools with it)
  const dSheet = mean(Object.values(sheetNight).map((x) => x.t)) - T.air(ni);
  const Ms = runModel(world, { slots: T.slots, warm: DS.warm.value, cells: under.concat(night.ref), wallTemp: (taK, K) => (K > 0 ? taK + 2 + (6 * K) / 900 : taK + dSheet) });
  const refS = mean(night.ref.map((i) => Ms.tmrt(i, ni)));
  const sheetRun = Object.fromEntries(['sail', 'ramada', 'arcade', 'mesquite'].map((k) => [k, mean(night[k].map((i) => tmrtWalls(Ms, i, ni, T.air(ni) + dSheet + K0))) - refS]));
  const groundNight = { open: mean(night.ref.map((i) => T.ts(i, ni))), sail: mean(night.sail.map((i) => T.ts(i, ni))), sailSheet: mean(night.sail.map((i) => Ms.ts(i, ni))) };
  causes = { dSheet, sheetRun, groundNight, view, refView, paloFull, paloBoth, coatView, small: { sail: sm.shade.sail[h].d, ramada: sm.shade.ramada[h].d, sailN: sm.shade.sail[h].n, ramadaN: sm.shade.ramada[h].n }, leafNight, sheetNight, gravel, palo, sail25 };
  return causes;
}

/** Tmrt with the walls (and what is overhead) at twK, K (block 10's docs helper). */
function tmrtWalls(M, i, h, twK) {
  return tmrtWallsVG(M, i, h, twK);
}

/**
 * The engine's sun (sun.js, issue #24) against suncalc (the tests' oracle)
 * at this site: altitude and azimuth at the bands' hours (docs only).
 */
export function sunCheck11() {
  const s = SCENE.site;
  return [DS.noon.value, DS.hour.value].map((h) => {
    const ours = solarPosition(s, h);
    const r = SunCalc.getPosition(new Date(Date.UTC(s.year, s.month - 1, s.day) + (h - s.tz) * 3600e3), s.lat, s.lon);
    const ref = { alt: (r.altitude * 180) / Math.PI, az: ((r.azimuth * 180) / Math.PI + 180 + 360) % 360 };
    return { h, ours, ref, dAlt: ours.alt - ref.alt, dAz: ((ours.az - ref.az + 540) % 360) - 180 };
  });
}
