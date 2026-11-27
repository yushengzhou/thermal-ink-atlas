// parking: block 6 (car park and industrial brownfield) set-up and numbers:
// parked cars as a sub-grid shade (a cell loses the share of its area under
// car footprints from its direct sun by day and from its sky view at night),
// the ground under the PV canopy with the measured sky view, the model run
// that keeps the ground heat flux G, and the statistics behind the bands,
// notes, cards, the night-release overlay and the docs.
import { MODEL, MATERIALS } from './materials.js';
import { runModel, sunSlots, cellMat, daylight, SIGMA } from './thermal.js';
import { buildWorld } from './world.js';
import { PK_DRAW } from './pkkit.js';

/** True if a scene is the car park block. */
export const isParking = (scene) => !!scene.parkingBlock;

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];

/** Car footprint {x0, y0, x1, y1} of a scene car [x, y, axis] (4.4 x 1.8 m, as drawn). */
export const carBox = ([x, y, ax]) => {
  const [hx, hy] = ax === 'x' ? [2.2, 0.9] : [0.9, 2.2];
  return { x0: x - hx, y0: y - hy, x1: x + hx, y1: y + hy };
};

/** Share of each cell's area under car footprints (exact rectangle overlap). */
export function carShareField(world) {
  const { n, cell } = world;
  const out = new Float32Array(n * n);
  for (const c of world.scene.cars) {
    const b = carBox(c);
    for (let j = Math.max(0, Math.floor(b.y0 / cell)); j <= Math.min(n - 1, Math.floor(b.y1 / cell)); j++) {
      for (let i = Math.max(0, Math.floor(b.x0 / cell)); i <= Math.min(n - 1, Math.floor(b.x1 / cell)); i++) {
        const ox = Math.min(b.x1, (i + 1) * cell) - Math.max(b.x0, i * cell);
        const oy = Math.min(b.y1, (j + 1) * cell) - Math.max(b.y0, j * cell);
        if (ox > 0 && oy > 0) out[j * n + i] += (ox * oy) / (cell * cell);
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, out[i]);
  return out;
}

/** 1 for ground cells whose centre is under a PV canopy row. */
export function pvField(world) {
  const out = new Uint8Array(world.n * world.n);
  const pv = (world.screens ?? []).filter((P) => P.kind === 'pvCanopy');
  for (let i = 0; i < out.length; i++) {
    if (world.bld[i] >= 0) continue;
    const [x, y] = centre(world, i);
    if (pv.some((P) => x > P.x0 && x < P.x1 && y > P.y0 && y < P.y1)) out[i] = 1;
  }
  return out;
}

/**
 * Block-6 changes to a built world (once): car shares and PV cells, and the
 * sky view they set: under a canopy SVF = pvSvf (Golden et al. 2007), and
 * SVF x (1 - car share) where cars stand (MODEL.carSky). world.svfOpen (the
 * building-only scan behind the wall reflection) is left as it is.
 */
export function prepWorld(world) {
  if (world.parking) return world;
  const share = carShareField(world);
  const pv = pvField(world);
  const svf0 = Float32Array.from(world.svf);
  for (let i = 0; i < share.length; i++) {
    if (world.bld[i] >= 0) continue;
    const v = pv[i] ? MODEL.pvSvf.value : world.svf[i];
    world.svf[i] = v * (1 - share[i]);
  }
  world.parking = { share, pv, svf0 };
  world.draw = PK_DRAW; // the block's own drawing (pkkit.js)
  return world;
}

/** Cars shade the ground beneath them all day: the sunlit share of every slot times (1 - car share) (MODEL.carShade; once). */
export function applyCarShade(world, slots) {
  if (slots.carShaded) return slots;
  const s = world.parking.share;
  for (const f of slots.fields) for (let i = 0; i < f.length; i++) if (s[i] > 0) f[i] *= 1 - s[i];
  slots.carShaded = true;
  return slots;
}

/** The block's model: prepared world, car-shaded sun slots, and the run that keeps G (thermal.js opts.flux). */
export function parkingSetup(world) {
  prepWorld(world);
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const slots = applyCarShade(world, sunSlots(world));
  const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
  const model = runModel(world, { slots, flux: true });
  const t2 = typeof performance !== 'undefined' ? performance.now() : 0;
  return { slots, model, timing: { slotsMs: t1 - t0, runMs: t2 - t1 } };
}

/** The lot's module top edges by section (from the scene's footpaths and screens). */
export function lotModules(world) {
  const sc = world.scene;
  const paths = sc.ground.filter((g) => /^path\d/.test(g.id)).map((g) => Math.round((g.poly[1] - 12.6) * 10) / 10);
  const pvTops = new Set((sc.screens ?? []).filter((P) => P.kind === 'pvCanopy').map((P) => Math.round((P.y0 - 7.6) * 10) / 10));
  const treeTops = new Set(sc.trees.filter((t) => t.x < 150 && t.y < 200).map((t) => Math.round((t.y - 14) * 10) / 10));
  return { open: paths.filter((m) => !pvTops.has(m) && !treeTops.has(m)), trees: paths.filter((m) => treeTops.has(m)), pv: paths.filter((m) => pvTops.has(m)) };
}

/**
 * Cell classes of the block (ground cells unless noted), picked by geometry
 * before any result:
 *   openAsphalt - lot and road asphalt with no car, crown or canopy over it and sky view > 0.85
 *   openBays / treeBays / pvBays - the two cell rows of the bay rows (centres m+12.5, m+17.5)
 *     of the open, tree and PV modules, away from the canopy ends (x 7.5-62.5 and 87.5-142.5)
 *   yard - open concrete of the loading yard and apron (sky view > 0.9)
 *   soil, scrub, ballast - open brownfield ground (sky view > 0.9, no crown)
 *   lawn - the irrigated lawn (sky view > 0.8)
 *   shed - rusty shed roof cells (roof level)
 */
export function cellClasses(world) {
  const sc = world.scene;
  const { share, pv } = world.parking;
  const out = { openAsphalt: [], openBays: [], treeBays: [], pvBays: [], yard: [], soil: [], scrub: [], ballast: [], lawn: [], shed: [] };
  const mods = lotModules(world);
  const rowOf = (y, list) => list.find((m) => Math.abs(y - (m + 12.5)) < 0.01 || Math.abs(y - (m + 17.5)) < 0.01);
  const interior = (x) => (x > 7 && x < 63) || (x > 87 && x < 143);
  for (let i = 0; i < world.n * world.n; i++) {
    const m = cellMat(world, i);
    if (world.bld[i] >= 0) {
      if (m === 'rustShed') out.shed.push(i);
      continue;
    }
    const [x, y] = centre(world, i);
    const g = sc.ground[world.parcel[i]].id;
    const clear = world.canopy[i] === 0 && !pv[i];
    if (m === 'asphalt' && clear && share[i] === 0 && world.svf[i] > 0.85) out.openAsphalt.push(i);
    if (g === 'lot' && interior(x)) {
      if (rowOf(y, mods.open) !== undefined) out.openBays.push(i);
      else if (rowOf(y, mods.trees) !== undefined) out.treeBays.push(i);
      else if (rowOf(y, mods.pv) !== undefined) out.pvBays.push(i);
    }
    if ((g === 'yard' || g === 'apron') && m === 'concrete' && clear && world.svf[i] > 0.9) out.yard.push(i);
    if (m === 'drySoil' && clear && world.svf[i] > 0.9) out.soil.push(i);
    if (m === 'scrub' && clear && world.svf[i] > 0.9) out.scrub.push(i);
    if (m === 'ballast' && clear && world.svf[i] > 0.9) out.ballast.push(i);
    if (m === 'grass' && clear && world.svf[i] > 0.8) out.lawn.push(i);
  }
  return out;
}

/** Mean Ts of cells at hour h. */
export const tsMean = (T, cells, h) => mean(cells.map((i) => T.ts(i, h)));
/** Mean G of cells at hour h, W m-2. */
export const fluxMean = (T, cells, h) => mean(cells.map((i) => T.flux(i, h)));

/** Daily max, min (15-min samples) and their hours of a class mean; range. */
export function dayRange(T, cells) {
  let max = -Infinity;
  let min = Infinity;
  let hMax = 0;
  let hMin = 0;
  for (let k = 0; k < 96; k++) {
    const h = k / 4;
    const t = tsMean(T, cells, h);
    if (t > max) [max, hMax] = [t, h];
    if (t < min) [min, hMin] = [t, h];
  }
  return { max, min, hMax, hMin, range: max - min, mean: mean(Array.from({ length: 96 }, (_, k) => tsMean(T, cells, k / 4))) };
}

/** Hour of the largest mean G of cells (15-min samples). */
export function fluxPeak(T, cells) {
  let best = -Infinity;
  let hb = 0;
  for (let k = 0; k < 96; k++) {
    const g = fluxMean(T, cells, k / 4);
    if (g > best) [best, hb] = [g, k / 4];
  }
  return { g: best, h: hb };
}

/**
 * Evening cooling of a class mean, K per hour over 15-min steps: the largest
 * rate from 16:00 to 1 h after sunset, and the mean rate over the first hour
 * after sunset (sunset to sunset + 1 h, interpolated).
 */
export function cooling(T, cells, set) {
  let peak = 0;
  let at = 16;
  for (let h = 16; h + 0.25 <= set + 1 + 1e-9; h += 0.25) {
    const r = (tsMean(T, cells, h) - tsMean(T, cells, h + 0.25)) / 0.25;
    if (r > peak) [peak, at] = [r, h + 0.125];
  }
  return { peak, at, after: tsMean(T, cells, set) - tsMean(T, cells, set + 1) };
}

/** Sensible heat to the air, h_c (Ts - Ta), mean over cells at hour h, W m-2. */
export const sensible = (T, cells, h) => mean(cells.map((i) => T.info.hc * (T.ts(i, h) - T.air(h))));

/** Damping depth d = sqrt(kappa tau / pi) and admittance sqrt(k rho c) for a slab of conductivity k, density rho, heat capacity c. */
export function slab(k, rho, c) {
  const kappa = k / (rho * c);
  return { kappa, d: Math.sqrt((kappa * 86400) / Math.PI), mu: Math.sqrt(k * rho * c) };
}

/** The Stempihar et al. (2012) inputs quoted by the brief: HMA and PCC. */
export const STEMPIHAR = { hma: { k: 1.2, rho: 2238, c: 921 }, pcc: { k: 1.5, rho: 2350, c: 1000 } };

/** The block's numbers at hour-grade detail (notes, cards, docs, bands). */
export function parkingStats(world, T) {
  const C = cellClasses(world);
  const { set, rise } = daylight(world.scene.site);
  const at = (k, h) => tsMean(T, C[k], h);
  const keys = ['openAsphalt', 'openBays', 'treeBays', 'pvBays', 'yard', 'ballast', 'soil', 'scrub', 'lawn', 'shed'];
  const table = Object.fromEntries(keys.map((k) => [k, { n: C[k].length, t15: at(k, 15), t23: at(k, 23), t05: at(k, 5), g20: fluxMean(T, C[k], 20), g23: fluxMean(T, C[k], 23), g04: fluxMean(T, C[k], 4), g12: fluxMean(T, C[k], 12), svf: mean(C[k].map((i) => world.svf[i])), share: mean(C[k].map((i) => world.parking.share[i])) }]));
  const cool = Object.fromEntries(keys.map((k) => [k, cooling(T, C[k], set)]));
  const ranges = Object.fromEntries(['openAsphalt', 'openBays', 'pvBays', 'treeBays'].map((k) => [k, dayRange(T, C[k])]));
  const gap = [20, 22, 23, 0, 2, 4].map((h) => ({ h, gap: sensible(T, C.openAsphalt, h) - sensible(T, C.lawn, h) }));
  const peakG = fluxPeak(T, C.openAsphalt);
  return { C, table, cool, ranges, gap, set, rise, peakG, air: { t15: T.air(15), t23: T.air(23), t05: T.air(5) }, hc: T.info.hc, lotShare: lotShare(world) };
}

/** Share of the lot's area under car footprints. */
export function lotShare(world) {
  const lot = world.scene.ground.find((g) => g.id === 'lot').poly;
  const area = (lot[2] - lot[0]) * (lot[5] - lot[1]);
  const b = world.scene.cars.map(carBox);
  return { cars: b.length, share: b.reduce((s, x) => s + (x.x1 - x.x0) * (x.y1 - x.y0), 0) / area };
}

/**
 * A class run again on its own cells with one material value changed (the
 * sensitivity rows and the thin-layer check): {ts15, ts23, max, min}.
 */
export function rerun(world, slots, cells, mat, key, value) {
  const m = MATERIALS[mat];
  const mats = { ...MATERIALS, [mat]: { ...m, [key]: { ...m[key], value } } };
  const T = runModel(world, { slots, cells, materials: mats, flux: true });
  const r = dayRange(T, cells);
  return { value, ts15: tsMean(T, cells, 15), ts23: tsMean(T, cells, 23), max: r.max, min: r.min, g20: fluxMean(T, cells, 20), T };
}

/**
 * Night-release overlay data at hour h: ground-cell samples on a 10 m grid
 * (cell centres, roofs at roof height) with G in W m-2, cached by the caller.
 */
export function fluxSamples(world, T, h) {
  const out = [];
  for (let j = 0; j < world.n; j += 2) {
    for (let i = 0; i < world.n; i += 2) {
      const c = j * world.n + i;
      const g = T.flux(c, h);
      if (g === null) continue;
      out.push({ x: (i + 0.5) * world.cell, y: (j + 0.5) * world.cell, z: world.height[c], g });
    }
  }
  return out;
}

/** Max, min, range, 15:00 and 05:00 of a class mean. */
const summary = (T, cells) => ({ ...dayRange(T, cells), t15: tsMean(T, cells, 15), t05: tsMean(T, cells, 5), t23: tsMean(T, cells, 23), n: cells.length });

/**
 * The PV canopy compared as Golden et al. (2007) did, bare asphalt under the
 * panels vs exposed asphalt: the canopy's bay cells run again in the same
 * scene without cars (an empty bay: SVF = pvSvf, no car shade), next to the
 * open asphalt (no car) of the block's model; and, as shipped, the canopy's
 * and the open section's bay rows with their cars.
 */
export function pvCompare(world, T, C) {
  const w2 = prepWorld(buildWorld({ ...world.scene, cars: [] }));
  const slots = applyCarShade(w2, sunSlots(w2));
  const E = runModel(w2, { slots, cells: C.pvBays, flux: true });
  return { open: summary(T, C.openAsphalt), empty: { ...summary(E, C.pvBays), svf: mean(C.pvBays.map((i) => w2.svf[i])), g23: fluxMean(E, C.pvBays, 23) }, bays: summary(T, C.pvBays), openBays: summary(T, C.openBays), model: E, world: w2 };
}

/** Time constant of the shed roof, minutes: C / (4 eps sigma T^3 + h_c) at air ta (deg C). */
export function shedTau(ta, hc) {
  const m = MATERIALS.rustShed;
  return m.thinC.value / (4 * m.eps.value * SIGMA * (ta + 273.15) ** 3 + hc) / 60;
}

/** Longwave a surface sends up at Ts (deg C) with emissivity eps, W m-2. */
export const emitted = (ts, eps) => eps * SIGMA * (ts + 273.15) ** 4;

/** Model lines for the block-6 glossary footnotes (glossaryStats extra.parking). */
export function parkingGlossary(st) {
  const r0 = (x) => Math.round(x);
  const r1 = (x) => x.toFixed(1);
  const t = st.table;
  const a = slab(STEMPIHAR.hma.k, STEMPIHAR.hma.rho, STEMPIHAR.hma.c);
  const p = slab(STEMPIHAR.pcc.k, STEMPIHAR.pcc.rho, STEMPIHAR.pcc.c);
  return {
    storageLine: `At 11 pm open asphalt is ${r1(t.openAsphalt.t23 - st.air.t23)} °C above the air and still gives back ${r0(-t.openAsphalt.g23)} W m⁻²; bare soil ${r0(-t.soil.g23)} W m⁻², the rusty shed roof ${r0(-t.shed.g23)} W m⁻².`,
    dampingLine: `With the Stempihar inputs: asphalt ${a.d.toFixed(3)} m, concrete ${p.d.toFixed(3)} m (admittance ${r0(a.mu)} and ${r0(p.mu)}; the model uses ${MATERIALS.asphalt.mu.value} and ${MATERIALS.concrete.mu.value}).`,
    fluxLine: `Open asphalt takes in up to ${r0(st.peakG.g)} W m⁻² (at ${hh(st.peakG.h)}) and gives back ${r0(-t.openAsphalt.g20)} W m⁻² at 8 pm, ${r0(-t.openAsphalt.g04)} W m⁻² at 4 am.`,
    inertiaLine: `At 11 pm: asphalt ${r1(t.openAsphalt.t23)} °C, concrete ${r1(t.yard.t23)} °C, ballast ${r1(t.ballast.t23)} °C, soil ${r1(t.soil.t23)} °C, shed roof ${r1(t.shed.t23)} °C (air ${r1(st.air.t23)} °C).`,
  };
}

const hh = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
