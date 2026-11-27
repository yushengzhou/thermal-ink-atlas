// Analysis helpers for the desert courtyard block (block 11), shared by the
// tests and scripts/sources.mjs (not shipped in the page): the world and its
// models, the statistics, the mesquite calibration, the walkers, the
// sensitivity runs, the docs-only runs of the misses' causes and the
// acceptance bands. DS_NOTES are the parameter notes for docs/sources.md
// (the block's materials keep theirs in materials.js).
import { SCENE } from '../cities/desert/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField, runModel, sunSlots, STORE } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';
import { DS, desertSetup, desertStats, shadeCells, merged, UNCOATED, mean } from '../engine/desert.js';
import { solarPosition } from '../engine/sun.js';
import SunCalc from 'suncalc';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';

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
