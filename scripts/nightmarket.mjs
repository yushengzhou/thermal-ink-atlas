// Analysis helpers for the night market block (block 12), shared by the tests
// and scripts/sources.mjs (not shipped in the page): the world and its model,
// the statistics, the walkers, the crowd, the sensitivity runs and the
// acceptance bands. NM_NOTES are the parameter notes for docs/sources.md
// (the block's awning keeps its notes in materials.js).
import { SCENE } from '../cities/nightmarket/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField, runModel, STORE } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';
import { NM, marketSetup, marketStats, heatParts, stallPower, grillAt, grillFlux, withFlux, crowdShape, density, personW, isOpen, release, mean, centre } from '../engine/market.js';
import { crowdAt } from '../engine/nmui.js';
import { solarPosition } from '../engine/sun.js';
import SunCalc from 'suncalc';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';

/** Notes on the block-12 parameters (docs only). */
export const NM_NOTES = {
  lat: 'site latitude, ° N, a subtropical city like Taipei (about 25.0–25.1); longitude 121.52, time zone UTC+8, 15 July',
  taMin: 'the design day\'s coolest air, °C: about the July normal minimum of Taipei (not in the brief; from memory)',
  taMax: 'the design day\'s warmest air, °C (at 15:00, the shared hour): about the July normal maximum of Taipei (not in the brief; from memory). With it the air is about 31 °C at 21:00, close to the brief\'s worked example of 30 °C',
  vapour: 'vapour pressure, hPa: the brief\'s e_a 30 hPa for the Brutsaert sky (a humid subtropical night; dew point about 24 °C)',
  wind: 'site wind, m/s, the h_c input: the brief\'s 1 m/s (h_c 9.5 W m⁻² K⁻¹ with the shared formula, issue #20)',
  hour: 'the bands\' evening hour, 21:00 (the brief\'s "stone 21 h")',
  late: 'a later evening hour quoted on the cards, 23:00 (the brief\'s stone target at 23:00)',
  day: 'the walkers\' check hour, 15:00 (the shared hour of the other blocks; the market is closed)',
  opens: 'the market opens, clock hour: Shilin Night Market 16:00 (Taipei Travel via the brief)',
  closes: 'the market closes, clock hour: midnight (24:00)',
  peakFrom: 'start of the busiest hours: 20:00 (Wikipedia; guides say 19:00)',
  peakTo: 'end of the busiest hours: 23:00 (Wikipedia; guides say 22:00)',
  peak: 'crowd density at the peak in the busiest aisles, people per m²: the brief\'s 1.0 (0.3–2.0, an assumption: no night-market measurement found)',
  cap: 'the largest density allowed anywhere, people per m²: the spec\'s 1.5 (below the event limit of about 2)',
  walk: 'heat of a person walking slowly (0.9 m/s, about 2.0 met), W (ASHRAE 55 / ISO 8996 via the brief, from memory)',
  stand: 'heat of a person standing (about 1.2 met), W (as above)',
  walkShare: 'share of the crowd walking (the rest standing at stalls), engine assumption',
  sensible: 'the share of body heat that warms the air directly at 30 °C (0.3–0.55, an assumption of the brief); quoted on the cards only',
  lpg: 'heat of a gas stall (griddle, steamer, fryer), kW of fuel: the brief\'s 8 (5–15, unverified)',
  wok: 'heat of a jet wok burner, kW: 28–37 (vendor data via the brief), the middle',
  charcoal: 'heat of a charcoal grill, kW of fuel: 8–16 (the brief, partly vendor data), the middle',
  duty: 'share of the time a gas stall burns: the brief\'s 0.5 (unverified); woks take the same',
  coalDuty: 'share of the time a charcoal bed burns while open: 1 (a bed glows all evening), engine assumption',
  coalArea: 'area of a grill\'s coal bed, m²: the brief\'s 0.2 (an assumption)',
  coalTemp: 'temperature of the coal bed, °C: the brief\'s 600 (an assumption)',
  coalEps: 'emissivity of the coal bed: 0.95, which reproduces the brief\'s +490 W m⁻² at 1 m (engine assumption)',
  grillMin: 'nearest distance in the point-source formula, m (the brief: d ≥ 0.5 m)',
  grillMax: 'the term is added within this distance of an open grill, m (the spec: ≤ 3 m)',
  keepAway: 'the crowd keeps at least this far from a grill\'s coals, m (engine assumption; the cooks stand nearer)',
  vendorAt: 'where a cook stands, m from the stall\'s centre (engine assumption)',
  lights: 'heat of the string lights over the street and the square when on, W m⁻²: LED strings 0.2–1 (the brief, unverified), the middle',
  figures: 'figures drawn for the market\'s crowd at its peak (each stands for many people; engine choice)',
  warm: 'coarse 10-min spin-up days (block 3\'s opts.warm, with its stability guard); convergence is tested on 1-min days as everywhere',
};

let cache = null;
/** World, model and statistics (memoised). */
export function base12() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = marketSetup(world);
    const T = setup.base;
    const st = { ...marketStats(world, T), hc: T.info.hc };
    cache = { scene: SCENE, world, setup, T, st };
  }
  return cache;
}

/** Walkers and the people dwelling at hour h (the shared shade rule; the market closed at 15:00). */
export function walkers12(hour = 15) {
  const { world, T } = base12();
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
  return { ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length, dwellers: spots.length, shade: inShade / spots.length };
}

/** The crowd over an evening (every 15 min, 16:00-24:00, frames 400-4000): nearest approach to a grill (not the cooks), the cooks' distance, figures drawn. */
export function crowd12() {
  const { world, T } = base12();
  let near = Infinity;
  let cook = Infinity;
  let cookFar = 0;
  let most = 0;
  let cooksHot = 0;
  let cooks = 0;
  for (let q = 64; q < 96; q++) {
    const h = q / 4;
    for (const f of [400, 1300, 2200, 3100, 4000]) {
      const heatOf = (x, y) => {
        const dS = grillAt(world, T, x, y, h);
        return dS > 0 ? { tmrt: withFlux(T.tmrt(world.cellIndex(x, y), h), dS), sunlit: 1 } : null;
      };
      const A = crowdAt(world, f / 60, h, heatOf);
      most = Math.max(most, A.filter((a) => !a.cook).length);
      for (const a of A) {
        let d = Infinity;
        for (const g of world.nm.grills) d = Math.min(d, Math.hypot(g.x - a.x, g.y - a.y));
        if (a.cook) {
          // the cooks of the grill stalls (the others stand far from any coals)
          if (d < 1.2) {
            cook = Math.min(cook, d);
            cookFar = Math.max(cookFar, d);
            cooks++;
            if (a.heat && a.heat.tmrt >= 65) cooksHot++;
          }
        } else near = Math.min(near, d);
      }
    }
  }
  return { near, cook, cookFar, most, cooksAtGrills: cooks, cooksHot };
}

/**
 * The overlays' bookkeeping over the whole day (every 15 min, every market
 * cell, open and closed): the crowd term against rho_p M, the largest
 * density, the density outside the opening hours, the total against the
 * sum of its parts, and the model left bit-identical (each cell's Ts and
 * Tmrt at 21:00 before and after all the overlay calls, Object.is).
 */
export function overlays12() {
  const { world, T } = base12();
  const F = world.nm.F;
  const h0 = NM.hour.value;
  const snap = () => F.market.map((i) => [T.ts(i, h0), T.tmrt(i, h0)]);
  const before = snap();
  const storeCopy = Float32Array.from(T.store);
  let crowdErr = 0;
  let sumErr = 0;
  let rhoMax = 0;
  let rhoClosed = 0;
  let grillClosed = 0;
  for (let q = 0; q < 96; q++) {
    const h = q / 4;
    for (const open of [true, false]) {
      for (const i of F.market) {
        const p = heatParts(world, T, i, h, open);
        crowdErr = Math.max(crowdErr, Math.abs(p.crowd - p.rho * personW()));
        sumErr = Math.max(sumErr, Math.abs(p.total - (p.stoneRad + p.stoneAir + p.crowd + p.stall + p.light)));
        rhoMax = Math.max(rhoMax, p.rho);
        if (!isOpen(h) || !open) rhoClosed = Math.max(rhoClosed, p.rho, p.crowd, p.stall, p.light);
      }
      if (!isOpen(h) || !open) for (const g of world.nm.grills) grillClosed = Math.max(grillClosed, grillAt(world, T, g.x, g.y + 1, h, open));
    }
  }
  const after = snap();
  let changed = 0;
  before.forEach(([a, b], k) => {
    if (!Object.is(a, after[k][0]) || !Object.is(b, after[k][1])) changed++;
  });
  for (let k = 0; k < storeCopy.length; k++) if (!Object.is(storeCopy[k], T.store[k])) changed++;
  return { crowdErr, sumErr, rhoMax, rhoClosed, grillClosed, changed };
}

/**
 * Block 12 acceptance bands (spec #15, the brief's bands at 21:00).
 * Rows: {label, value, lo, hi, unit, src, inside, supp}; supplementary rows
 * are reported and not counted. Bands 1-5 test the model or the brief's
 * arithmetic; bands 6-9 check the overlays' bookkeeping (by construction).
 * Defined before the first band run.
 */
export function bands12() {
  const { st, world, T } = base12();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', o = {}) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, supp: !!o.supp, inside: (lo === null || value >= lo - 1e-9) && (hi === null || value <= hi + 1e-9) });
  const h = NM.hour.value;
  const L = NM.late.value;
  const P = st.place;
  const NAME = { ref: 'the open square', aisle: 'the street\'s open aisle', awning: 'under the awnings', alley: 'the narrow alleys', stallRow: 'the stall row', south: 'the street\'s south side' };
  // 1. the stone's surface above the air at 21:00
  add(`1. Stone − air at 21:00, ${NAME.ref} (n ${P.ref[h].n}), K`, P.ref[h].dTs, 1, 6, 'brief12', 'K');
  for (const k of ['aisle', 'awning', 'alley', 'stallRow', 'south']) add(`1. Supplementary: the same, ${NAME[k]} (n ${P[k][h].n}), K`, P[k][h].dTs, 1, 6, 'brief12', 'K', { supp: true });
  add(`1. Supplementary: the same at 23:00, ${NAME.aisle}, K`, P.aisle[L].dTs, 1, 6, 'brief12', 'K', { supp: true });
  // 2. net release
  add(`2. Net release at 21:00, ${NAME.ref}, W m⁻²`, P.ref[h].net, 30, 150, 'brief12', 'W m⁻²');
  add(`2. Net release at 21:00, ${NAME.aisle}, W m⁻²`, P.aisle[h].net, 30, 150, 'brief12', 'W m⁻²');
  add(`2. Net release at 21:00, ${NAME.alley}, W m⁻²`, P.alley[h].net, 30, 150, 'brief12', 'W m⁻²');
  add('2. Lower at a low sky view: the narrow alleys − the open square, W m⁻²', P.alley[h].net - P.ref[h].net, null, 0, 'brief12', 'W m⁻²');
  add(`2. Supplementary: net release at 21:00, ${NAME.awning}, W m⁻²`, P.awning[h].net, 30, 150, 'brief12', 'W m⁻²', { supp: true });
  add(`2. Supplementary: net release at 23:00, ${NAME.aisle}, W m⁻²`, P.aisle[L].net, 30, 150, 'brief12', 'W m⁻²', { supp: true });
  // the model's own budget (block 6's G): -G against Q on the open square
  const k21 = Math.round((h * STORE) / 24);
  const gap = mean(world.nm.F.ref.map((i) => -T.info.flux[i * STORE + k21] - release(T, i, h).net));
  add('2. Supplementary: the model\'s own budget, −G − Q at 21:00 on the open square, W m⁻²', gap, null, null, 'brief12', 'W m⁻²', { supp: true });
  // 3. gross emission
  add(`3. Gross emission at 21:00, ${NAME.ref}, W m⁻²`, P.ref[h].gross, 430, 500, 'brief12', 'W m⁻²');
  add(`3. Gross emission at 21:00, ${NAME.aisle}, W m⁻²`, P.aisle[h].gross, 430, 500, 'brief12', 'W m⁻²');
  add('3. Supplementary: the stone\'s coolest surface at 21:00 (square and street), °C', Math.min(P.ref[h].tsMin, P.aisle[h].tsMin), 28, 38, 'brief12', '°C', { supp: true });
  add('3. Supplementary: the stone\'s warmest surface at 21:00 (square and street), °C', Math.max(P.ref[h].tsMax, P.aisle[h].tsMax), 28, 38, 'brief12', '°C', { supp: true });
  // 4. night Tmrt without the grill
  for (const k of ['ref', 'aisle', 'awning', 'alley']) add(`4. Tmrt − air at 21:00, ${NAME[k]} (sky view ${P[k][h].svf.toFixed(2)}), K`, P[k][h].dTmrt, -6, 2, 'brief12', 'K');
  add('4. Higher at a low sky view: the narrow alleys − the open square, K', P.alley[h].dTmrt - P.ref[h].dTmrt, 0, null, 'brief12', 'K');
  add('4. Supplementary: under the awnings − the open square, K', P.awning[h].dTmrt - P.ref[h].dTmrt, 0, null, 'brief12', 'K', { supp: true });
  // 5. the grill term
  const g = (d) => st.grill.find((r) => r.d === d);
  add('5. Grill term at 3 m (the stall row\'s Tmrt at 21:00), K', g(3).dT, null, 5, 'brief12', 'K');
  add('5. ∝ 1/d² (by construction): the term at 1 m over the term at 2 m, W m⁻² over W m⁻²', g(1).dS / g(2).dS, 4, 4, 'brief12', '');
  const o = overlays12();
  add('5. Zero when closed (by construction): the largest term next to a grill outside the opening hours or with the market closed, W m⁻²', o.grillClosed, 0, 0, 'brief12', 'W m⁻²');
  add('5. Zero beyond 3 m (by construction): the term at 3.01 m, W m⁻²', g(3.01).dS, 0, 0, 'brief12', 'W m⁻²');
  add('5. Supplementary: Tmrt 1 m from a grill at 21:00 (the brief: about 88 °C), °C', g(1).tmrt, null, null, 'brief12', '°C', { supp: true });
  add('5. Supplementary: Tmrt 2 m from a grill at 21:00 (the brief: about 48 °C), °C', g(2).tmrt, null, null, 'brief12', '°C', { supp: true });
  add('5. Supplementary: distance where the uncut term falls below 5 K, m', st.under5, null, null, 'brief12', 'm', { supp: true });
  // 6-9: the overlays' bookkeeping (by construction)
  add('6. Crowd heat = ρ_p × M (by construction): largest absolute difference over the market cells, every 15 min, W m⁻²', o.crowdErr, 0, 1e-9, 'brief12', 'W m⁻²');
  add('7. Density ≤ 2 (by construction): largest anywhere, any time, people per m²', o.rhoMax, 0, 2, 'crowdLimits', 'm⁻²');
  add('7. Zero before 16:00 and after midnight (by construction): largest crowd, stall or light value outside the hours or closed', o.rhoClosed, 0, 0, 'travelTaipei', '');
  add('8. Overlays leave the model bit-identical (by construction): changed Ts, Tmrt or stored values', o.changed, 0, 0, 'brief12', '');
  add('9. Overlay total = sum of its parts (by construction): largest absolute difference, W m⁻²', o.sumErr, 0, 1e-6, 'brief12', 'W m⁻²');
  const wk = walkers12(NM.day.value);
  add('Walkers at 15:00: density in shade over density in sun', wk.ratio, 2, null, 'melnikov');
  add(`People dwelling at 15:00 (n ${wk.dwellers}) whose place is in shade`, wk.shade, 0.5, null, 'melnikov');
  const c = crowd12();
  add('Supplementary (by construction): the crowd\'s nearest approach to a grill\'s coals, 16:00–24:00, m', c.near, NM.keepAway.value, null, 'brief12', 'm', { supp: true });
  return rows;
}

/** Band verdicts 1-9: met if every counted row of the band is inside. */
export function bandVerdicts12(rows) {
  const out = {};
  for (const r of rows) {
    const m = /^(\d+)\. /.exec(r.label);
    if (!m || r.supp) continue;
    out[m[1]] = (out[m[1]] ?? true) && r.inside;
  }
  return out;
}

/** A world and its model for a changed scene, changed materials or a changed block parameter (docs runs only). */
function runWith({ scene = SCENE, mats = {}, nm = {} } = {}) {
  const keepM = Object.fromEntries(Object.keys(mats).map((k) => [k, MATERIALS[k]]));
  const keepN = Object.fromEntries(Object.keys(nm).map((k) => [k, NM[k].value]));
  try {
    Object.assign(MATERIALS, mats);
    for (const [k, x] of Object.entries(nm)) NM[k].value = x;
    const world = buildWorld(scene);
    const setup = marketSetup(world);
    return { world, setup, st: marketStats(world, setup.base) };
  } finally {
    Object.assign(MATERIALS, keepM);
    for (const [k, x] of Object.entries(keepN)) NM[k].value = x;
  }
}

/** A material with some parameter values changed. */
const patch = (id, p) => ({ [id]: { ...MATERIALS[id], ...Object.fromEntries(Object.entries(p).map(([k, x]) => [k, { ...MATERIALS[id][k], value: x }])) } });

let sens = null;
/**
 * One change at a time (docs only; nothing shipped changes). The stone runs
 * on its own cells (no lateral coupling); the site runs the whole block; the
 * overlay values are arithmetic on the shipped model.
 */
export function sensitivity12() {
  if (sens) return sens;
  const { world, T, st } = base12();
  const F = world.nm.F;
  const h = NM.hour.value;
  const stone = [...new Set([...F.street, ...F.square, ...F.alley])];
  const row = (label, M) => {
    const s = (cells, f) => mean(cells.map(f));
    return {
      label,
      dTs: s(F.aisle, (i) => M.ts(i, h)) - M.air(h),
      net: s(F.aisle, (i) => release(M, i, h).net),
      refNet: s(F.ref, (i) => release(M, i, h).net),
      alleyNet: s(F.alley, (i) => release(M, i, h).net),
      tmrtRef: s(F.ref, (i) => M.tmrt(i, h)) - M.air(h),
      tmrtAlley: s(F.alley, (i) => M.tmrt(i, h)) - M.air(h),
    };
  };
  const cellsRun = (mats, o = {}) => runModel(world, { slots: o.slots ?? T.slots, warm: NM.warm.value, cells: stone, materials: { ...MATERIALS, ...mats }, ...(o.wind ? { wind: o.wind } : {}) });
  const model = [row('shipped', T)];
  for (const x of [0.2, 0.4]) model.push(row(`stone α ${x} (cited 0.20–0.40)`, cellsRun(patch('stone', { alpha: x }))));
  for (const x of [1065, 2220]) model.push(row(`stone admittance ${x} (${x < 1500 ? 'brick' : 'solid stone'})`, cellsRun(patch('stone', { mu: x }))));
  model.push(row('site wind 1.5 m/s (h_c 11.4)', cellsRun({}, { wind: 1.5 })));
  model.push(row('direct sun 7% weaker (the engine\'s noon sun is likely a few per cent strong)', cellsRun({}, { slots: { suns: T.slots.suns, fields: T.slots.fields.map((f) => Float32Array.from(f, (x) => x * 0.93)) } })));
  const vap = runWith({ scene: { ...SCENE, site: { ...SCENE.site, vapourHpa: 25 } } });
  model.push(row('vapour pressure 25 hPa (a drier sky)', vap.setup.base));
  // the overlay's numbers at 21:00 over the street (arithmetic, no model run)
  const heat = (o) => {
    const keep = Object.fromEntries(Object.keys(o).map((k) => [k, NM[k].value]));
    try {
      for (const [k, x] of Object.entries(o)) NM[k].value = x;
      const sum = { crowd: 0, stall: 0, light: 0 };
      for (const i of F.street) {
        const p = heatParts(world, T, i, h);
        sum.crowd += p.crowd / F.street.length;
        sum.light += p.light / F.street.length;
      }
      // the stalls at these powers (world.nm.stallW holds the shipped ones)
      const street = world.nm.stalls.filter((x) => world.nm.F.street.includes(world.cellIndex(x.x, x.y)));
      sum.stall = street.reduce((a, x) => a + stallPower(x.type), 0) / (F.street.length * world.cell * world.cell);
      return sum;
    } finally {
      for (const [k, x] of Object.entries(keep)) NM[k].value = x;
    }
  };
  const overlay = [
    { label: 'shipped', ...heat({}) },
    { label: 'peak density 0.3', ...heat({ peak: 0.3 }) },
    { label: 'peak density 2.0 (capped at 1.5)', ...heat({ peak: 2 }) },
    { label: 'gas stalls 5 kW', ...heat({ lpg: 5 }) },
    { label: 'gas stalls 15 kW', ...heat({ lpg: 15 }) },
    { label: 'charcoal 8 kW, woks 28 kW', ...heat({ charcoal: 8, wok: 28 }) },
    { label: 'charcoal 16 kW, woks 37 kW', ...heat({ charcoal: 16, wok: 37 }) },
    { label: 'filament lights 5 W m⁻²', ...heat({ lights: 5 }) },
  ];
  // the grill term at 1, 2, 3 m with other coal beds (no range in the brief: illustrative)
  const t0 = st.place.stallRow[h].tmrt;
  const ta = T.air(h);
  const grill = [];
  for (const [label, o] of [['shipped (0.2 m², 600 °C)', {}], ['coal bed 0.1 m²', { coalArea: 0.1 }], ['coal bed 500 °C', { coalTemp: 500 }], ['coal bed 700 °C', { coalTemp: 700 }]]) {
    const keep = Object.fromEntries(Object.keys(o).map((k) => [k, NM[k].value]));
    try {
      for (const [k, x] of Object.entries(o)) NM[k].value = x;
      grill.push({ label, ...Object.fromEntries([1, 2, 3].map((d) => [`d${d}`, withFlux(t0, grillFlux(d, ta)) - t0])) });
    } finally {
      for (const [k, x] of Object.entries(keep)) NM[k].value = x;
    }
  }
  sens = { model, overlay, grill };
  return sens;
}

/**
 * The engine's sun (sun.js, issue #24) against suncalc (the tests' oracle)
 * at this site: altitude and azimuth at noon and 15:00, and sunset (docs only).
 */
export function sunCheck12() {
  const s = SCENE.site;
  const at = [12, 15].map((h) => {
    const ours = solarPosition(s, h);
    const r = SunCalc.getPosition(new Date(Date.UTC(s.year, s.month - 1, s.day) + (h - s.tz) * 3600e3), s.lat, s.lon);
    const ref = { alt: (r.altitude * 180) / Math.PI, az: ((r.azimuth * 180) / Math.PI + 180 + 360) % 360 };
    return { h, ours, ref, dAlt: ours.alt - ref.alt, dAz: ((ours.az - ref.az + 540) % 360) - 180 };
  });
  return at;
}

/** Numbers the hours card and the docs quote: the crowd's share and the aisles' density every hour. */
export function hours12() {
  return Array.from({ length: 24 }, (_, h) => ({ h, share: crowdShape(h), rho: density(1, h), open: isOpen(h) }));
}

export { centre };

let causes = null;
/**
 * The misses' causes, tested (docs only, added after the first band run;
 * nothing shipped changes):
 * - band 5: the brief's own formula with its own coal bed, at 1 m and 3 m
 *   (does it give both its +490 W m⁻² at 1 m and its "< 5 K at 3 m"?);
 * - the awnings' net release (a supplementary row below 30 W m⁻²): the
 *   awning cells run again with what they see overhead and around (the
 *   canvas, the shopfront) at the air temperature after dark instead of the
 *   shared warm wall (air + 2 K), and the brief's own formula at the
 *   awnings' sky view and surface.
 */
export function causes12() {
  if (causes) return causes;
  const { world, T, st } = base12();
  const F = world.nm.F;
  const h = NM.hour.value;
  const ta = T.air(h);
  const g1 = grillFlux(1, ta);
  const g3 = grillFlux(3, ta);
  const t0 = st.place.stallRow[h].tmrt;
  const M = runModel(world, { slots: T.slots, warm: NM.warm.value, cells: F.awning, wallTemp: (taK, K) => (K > 0 ? taK + 2 + (6 * K) / 900 : taK) });
  const cool = { net: mean(F.awning.map((i) => release(M, i, h).net)), dTs: mean(F.awning.map((i) => M.ts(i, h))) - ta };
  // the brief's formula at the awnings' sky view and surface (walls at air + 2 K, eps 0.92, h_c as here)
  const A = st.place.awning[h];
  const K0 = 273.15;
  const S = 5.670374e-8;
  const lsky = T.hourConst(h).lsky;
  const briefAt = (svf, dTs, tw) => 0.92 * (S * (ta + dTs + K0) ** 4 - (svf * lsky + (1 - svf) * S * (ta + tw + K0) ** 4)) + T.info.hc * dTs;
  causes = {
    grill: { at1: g1, at3: g3, dT1: withFlux(t0, g1) - t0, dT3: withFlux(t0, g3) - t0, under5: st.under5 },
    awning: { shipped: A.net, dTs: A.dTs, svf: A.svf, cool, brief: briefAt(A.svf, A.dTs, 2), briefCool: briefAt(A.svf, A.dTs, 0), brief04: briefAt(0.4, 2, 2) },
  };
  return causes;
}
