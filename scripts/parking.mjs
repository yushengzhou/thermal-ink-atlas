// Analysis helpers for the car park and brownfield block (block 6), shared by
// the tests and scripts/sources.mjs (not shipped in the page): the world and
// its model, the cell classes, the PV comparison, the thin-layer check, the
// sensitivity runs and the acceptance bands.
import { SCENE } from '../cities/parking/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField } from '../engine/thermal.js';
import { parkingSetup, parkingStats, pvCompare, rerun, dayRange, tsMean, fluxMean, shedTau, slab, STEMPIHAR, parkingGlossary } from '../engine/parking.js';
import { MATERIALS, MODEL } from '../engine/materials.js';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';
import { hotCarCard } from '../engine/pkui.js';

let cache = null;
/** World, slots, model and the statistics behind bands and docs (memoised). */
export function base6() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = parkingSetup(world);
    const T = setup.model;
    const st = parkingStats(world, T);
    cache = { scene: SCENE, world, slots: setup.slots, T, st, C: st.C };
  }
  return cache;
}

let pv = null;
/** The PV comparison (an empty bay under the canopy vs open asphalt; as shipped with cars). */
export function pv6() {
  if (!pv) {
    const { world, T, C } = base6();
    pv = pvCompare(world, T, C);
  }
  return pv;
}

let thin = null;
/** Thin-layer check: open asphalt run again with the thin-paving admittance (MODEL.thinPaving) and with the Stempihar admittance. */
export function thin6() {
  if (!thin) {
    const { world, slots, C } = base6();
    const cells = C.openAsphalt.filter((_, k) => k % 8 === 0);
    const ref = rerun(world, slots, cells, 'asphalt', 'mu', MATERIALS.asphalt.mu.value);
    const t = rerun(world, slots, cells, 'asphalt', 'mu', MODEL.thinPaving.value);
    const s = rerun(world, slots, cells, 'asphalt', 'mu', Math.round(slab(STEMPIHAR.hma.k, STEMPIHAR.hma.rho, STEMPIHAR.hma.c).mu));
    thin = { n: cells.length, ref, thin: t, stempihar: s };
  }
  return thin;
}

let sens = null;
/**
 * Sensitivity: one value at a time moved to the ends of its cited or assumed
 * range, the class run again on a sample of its own cells; the bands it
 * touches are recomputed against the shipped model's other classes.
 */
export function sensitivity6() {
  if (!sens) {
    const { world, slots, C, T } = base6();
    const sample = (k) => C[k].filter((_, i) => i % 6 === 0);
    const A = sample('openAsphalt');
    const S = sample('soil');
    const Y = sample('yard');
    const B = sample('ballast');
    const asp = { t15: tsMean(T, C.openAsphalt, 15), t23: tsMean(T, C.openAsphalt, 23) };
    const soil = { t15: tsMean(T, C.soil, 15), t23: tsMean(T, C.soil, 23) };
    const lawn23 = tsMean(T, C.lawn, 23);
    const row = (label, r, kind) => ({ label, value: r.value, ts15: r.ts15, ts23: r.ts23, g20: r.g20, kind,
      d23soil: kind === 'asphalt' ? r.ts23 - soil.t23 : kind === 'soil' ? asp.t23 - r.ts23 : null,
      d23lawn: kind === 'asphalt' ? r.ts23 - lawn23 : null,
      d15asp: kind === 'concrete' || kind === 'soil' ? r.ts15 - asp.t15 : null,
      d23asp: kind === 'concrete' || kind === 'soil' || kind === 'ballast' ? r.ts23 - asp.t23 : null });
    sens = [
      row('asphalt μ 1570 (Stempihar inputs)', rerun(world, slots, A, 'asphalt', 'mu', 1570), 'asphalt'),
      row('asphalt α 0.09 (LBNL 0.12 − 0.03)', rerun(world, slots, A, 'asphalt', 'alpha', 0.09), 'asphalt'),
      row('asphalt α 0.15 (LBNL 0.12 + 0.03)', rerun(world, slots, A, 'asphalt', 'alpha', 0.15), 'asphalt'),
      row('concrete μ 1880 (Stempihar inputs)', rerun(world, slots, Y, 'concrete', 'mu', 1880), 'concrete'),
      row('concrete α 0.15 (brief range 0.15–0.35)', rerun(world, slots, Y, 'concrete', 'alpha', 0.15), 'concrete'),
      row('concrete α 0.35', rerun(world, slots, Y, 'concrete', 'alpha', 0.35), 'concrete'),
      row('soil μ 600 (Oke dry soil)', rerun(world, slots, S, 'drySoil', 'mu', 600), 'soil'),
      row('soil α 0.20 (brief 0.20–0.35)', rerun(world, slots, S, 'drySoil', 'alpha', 0.2), 'soil'),
      row('soil α 0.35', rerun(world, slots, S, 'drySoil', 'alpha', 0.35), 'soil'),
      row('ballast μ 600 (brief 600–900)', rerun(world, slots, B, 'ballast', 'mu', 600), 'ballast'),
      row('ballast μ 900', rerun(world, slots, B, 'ballast', 'mu', 900), 'ballast'),
    ];
    // the shed: emissivity and heat capacity at the ends of their ranges (23:00 minus air)
    const Sh = C.shed;
    const shed = (label, key, value) => {
      const r = rerun(world, slots, Sh, 'rustShed', key, value);
      return { label, value, ts15: r.ts15, ts23: r.ts23, d23air: r.ts23 - T.air(23), kind: 'shed' };
    };
    sens.push(shed('shed ε 0.69 (tables 0.69–0.88)', 'eps', 0.69), shed('shed ε 0.88', 'eps', 0.88), shed('shed C 2 kJ m⁻² K⁻¹ (brief 2–5)', 'thinC', 2000), shed('shed C 5 kJ m⁻² K⁻¹', 'thinC', 5000));
  }
  return sens;
}

/** Walkers at hour h: dwellers by shade class, walkers' shade density (frames 400-4000). */
export function walkers6(hour = 15) {
  const { world, T } = base6();
  const cacheShade = new Map();
  const shadeFor = (hq) => {
    if (!cacheShade.has(hq)) cacheShade.set(hq, shadeClassField(world, T.sun(hq)));
    return cacheShade.get(hq);
  };
  const life = new Life(SCENE, shadeFor, (h) => T.air(h));
  const P = life.plan(hour);
  const sh = shadeFor(hour);
  const cls = [0, 0, 0];
  for (const [s] of P.dwell) cls[shadeAt(sh, SCENE.spots[s].x, SCENE.spots[s].y)]++;
  const frames = [400, 1600, 2800, 4000];
  const dens = frames.map((f) => shadeDensity(world, life.at(f / 60, hour), sh));
  // per route: the share of its walkers on the second variant (the lot crossings: under the trees or the PV canopy)
  const routes = SCENE.routes.map((r, k) => {
    const mine = life.walkers.map((w, i) => (w.route === k ? P.choice[i] : null)).filter((c) => c !== null);
    return { id: r.id, second: mine.filter((c) => c === 1).length / mine.length };
  });
  return { n: P.dwell.length, sun: cls[0], building: cls[1], canopy: cls[2], shadeShare: (cls[1] + cls[2]) / P.dwell.length, ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length, routes };
}

/** Glossary numbers for block 6, computed as on the page. */
export function pkGlossaryStats() {
  return parkingGlossary(base6().st);
}

/** Numbers quoted by the hot-car card, read back from its HTML (band 7). */
export function cabinNumbers() {
  const h = hotCarCard({ openBay15: 0, openAsphalt15: 0 });
  const pair = (re) => re.exec(h).slice(1).map(Number);
  const [sun, shade] = pair(/cabin air after 1 h, in sun \/ in shade \(Tempe\)<\/td><td>(\d+) \/ (\d+) °C/);
  const [trees] = pair(/cabins under lot trees<\/td><td>−(\d+) K/);
  return { sun, shade, trees };
}

/** Block 6 acceptance bands (spec #11). Rows: {label, value, lo, hi, unit, src, inside}. */
export function bands6() {
  const { st, T, C } = base6();
  const t = st.table;
  const P = pv6();
  const th = thin6();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', tol = 1e-9) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, inside: (lo === null || value >= lo - tol) && (hi === null || value <= hi + tol) });
  const n = (k) => `n ${C[k].length}`;
  // 1: night lag of thick asphalt
  add(`1. Open asphalt (${n('openAsphalt')}) minus bare compacted soil (${n('soil')}) at 23:00`, t.openAsphalt.t23 - t.soil.t23, 2, 6, 'brief6', 'K');
  add(`1. Open asphalt minus scrubby dry vegetation (${n('scrub')}) at 23:00`, t.openAsphalt.t23 - t.scrub.t23, 2, 6, 'brief6', 'K');
  add(`1. Open asphalt minus the irrigated lawn (${n('lawn')}) at 23:00`, t.openAsphalt.t23 - t.lawn.t23, 3, 8, 'brief6', 'K');
  // 2: ground heat flux and the night sensible-heat gap
  add('2. Open asphalt: ground heat flux G at 20:00', t.openAsphalt.g20, -160, -60, 'brief6', 'W m⁻²');
  add('2. Open asphalt: ground heat flux G at 04:00', t.openAsphalt.g04, null, -30, 'brief6', 'W m⁻²');
  const gaps = st.gap.map((g) => g.gap);
  add(`2. Asphalt minus lawn sensible heat h_c (Ts − Ta), h_c ${st.hc.toFixed(1)} W m⁻² K⁻¹: smallest of 20:00, 22:00, 23:00, 00:00, 02:00, 04:00`, Math.min(...gaps), 30, 80, 'brief6', 'W m⁻²');
  add('2. Asphalt minus lawn sensible heat: largest of the same hours', Math.max(...gaps), 30, 80, 'brief6', 'W m⁻²');
  // 3: concrete vs asphalt
  add(`3. Concrete yard (${n('yard')}) minus open asphalt at 15:00`, t.yard.t15 - t.openAsphalt.t15, -12, -5, 'brief6', 'K');
  add('3. Concrete yard minus open asphalt at 23:00', t.yard.t23 - t.openAsphalt.t23, -2, 2, 'brief6', 'K');
  // 4: the metal shed
  add(`4. Rusty shed roof (${n('shed')}) at 23:00 minus the air`, t.shed.t23 - st.air.t23, null, 0.5, 'brief6', 'K');
  const others = Object.keys(st.cool).filter((k) => k !== 'shed');
  const top = (f) => Math.max(...others.map((k) => f(st.cool[k])));
  add(`4. Shed roof: fastest evening cooling (largest 15-min rate, 16:00 to sunset + 1 h) minus the fastest other surface class (shed ${st.cool.shed.peak.toFixed(2)} K/h at ${st.cool.shed.at.toFixed(2)} h)`, st.cool.shed.peak - top((c) => c.peak), 0, null, 'brief6', 'K/h');
  add(`4. Shed roof: cooling in the first hour after sunset (${st.set.toFixed(2)} h) minus the fastest other surface class (shed ${st.cool.shed.after.toFixed(2)} K)`, st.cool.shed.after - top((c) => c.after), 0, null, 'brief6', 'K');
  // 5: bare soil
  add('5. Bare soil minus open asphalt at 15:00', t.soil.t15 - t.openAsphalt.t15, -8, 8, 'brief6', 'K');
  add('5. Bare soil minus open asphalt at 23:00', t.soil.t23 - t.openAsphalt.t23, null, -2, 'brief6', 'K');
  // 6: the PV canopy, compared as Golden et al. did (bare asphalt under the panels vs exposed asphalt)
  add(`6. Empty bay under the PV canopy (n ${P.empty.n}, SVF ${P.empty.svf.toFixed(2)}) minus open asphalt at 15:00`, P.empty.t15 - P.open.t15, -30, -20, 'golden2007', 'K');
  add(`6. Empty bay under the PV canopy minus open asphalt at dawn (sunrise ${st.rise.toFixed(2)} h)`, tsMean(P.model, C.pvBays, st.rise) - tsMean(T, C.openAsphalt, st.rise), -1.5, 1.5, 'golden2007', 'K');
  add(`6. Daily range under the PV canopy (${P.empty.range.toFixed(1)} K) vs open asphalt (${P.open.range.toFixed(1)} K): relative change`, P.empty.range / P.open.range - 1, -0.75, -0.6, 'golden2007');
  // 7: the cabin card quotes its sources (information only)
  const cab = cabinNumbers();
  add('7. Hot-car card (information only): cabin air in sun minus in shade after 1 h, as quoted (Vanos et al. 2018)', cab.sun - cab.shade, 8, null, 'vanos2018', 'K');
  add('7. Hot-car card: cabins under lot trees, as quoted (Scott et al. 1999)', cab.trees, null, 26, 'scott1999', 'K');
  // 8: thin layer (lower effective admittance)
  add(`8. Thin paving (μ ${MODEL.thinPaving.value} vs ${MATERIALS.asphalt.mu.value}, n ${th.n}): change of the daily maximum`, th.thin.max - th.ref.max, 0, null, 'brief6', 'K');
  add('8. Thin paving: change of the daily minimum', th.thin.min - th.ref.min, null, 0, 'brief6', 'K');
  // walkers
  const wk = walkers6(15);
  add(`Dwellers at 15:00 resting in shade (crowns, PV canopy, buildings), n ${wk.n}`, wk.shadeShare, 0.5, null, 'melnikov');
  add('Walkers at 15:00: density in shade over density in sun, walkable ground (footpaths, yard, lawn)', wk.ratio, 1, null, 'melnikov');
  return rows;
}

export { dayRange, tsMean, fluxMean, shedTau };
