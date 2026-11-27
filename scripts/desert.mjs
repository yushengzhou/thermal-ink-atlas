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
