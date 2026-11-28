// Analysis helpers for the bus stops and footbridges (block 9), shared by
// the tests and scripts/sources.mjs (not shipped in the page): the world and
// its models, the riders, the walkers, the headline comparison, the
// sensitivity runs and the acceptance bands. BS_NOTES are the parameter
// notes for docs/sources.md (the block's materials keep theirs in
// materials.js).
import { SCENE } from '../cities/busstop/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField, wallTemp, cellMat } from '../engine/thermal.js';
import { shadowOffset } from '../engine/sun.js';
import { MATERIALS } from '../engine/materials.js';
import { BS, busSetup, riderBook, busStats, screenCompare, kerbCompare, roofSwap, meanWait, daySchedule, contactFlags, burnLimit, pointModel, geometry, prepWorld } from '../engine/busstop.js';
import { Life, shadeDensity } from '../engine/life.js';

/** Notes on the block-9 parameters (docs only). */
export const BS_NOTES = {
  shelterH: 'roof height of the shelters, m; an assumption of the brief, 2.5-2.8 m, the middle value (the brief\'s worked example uses 2.7 m)',
  shelterDepth: 'shelter depth, m; an assumption of the brief, 1.5-2.5 m, the middle value',
  shelterLength: 'shelter length, m; an assumption of the brief, 4-10 m, the middle value',
  deckH: 'footbridge deck height, m; brief 5.5-6.5 m (unverified), the middle value; the cover is a shelter height above the deck',
  headStand: 'head height of a standing adult, m (the brief\'s geometry)',
  headSeat: 'head height of a seated adult, m (the brief\'s geometry)',
  bodySamples: 'the direct sun on the body for Tmrt is the mean of the sun shares at these heights (the head alone gives the shade check)',
  skyAt: 'the sky view of a person under a roof is taken at this height (the roof\'s view factor from an upward-facing point)',
  westScreen: 'top of stop C\'s west end screen, m (the brief\'s worked example: a screen to 2.2 m)',
  biggerRoof: 'the bigger roof of the headline comparison: 1 m more on every side of stop C\'s roof',
  headway: 'mean time between buses, min; an assumption of the brief, 5-15 min, the middle value',
  cv: 'coefficient of variation of the gaps between buses; brief 0.3-0.5 (unverified), the middle value; gaps h (1 + a (2u - 1)), a = cv sqrt(3)',
  riders: 'riders arriving at each stop per minute (Poisson); engine assumption',
  service: 'buses run from 06:00 to 23:00; engine assumption',
  clock: 'the bus clock runs this many times faster than the animation, over the 15 min after the hour shown (drawing only; the statistics use the real clock)',
  doseBase: 'heat dose D = sum max(0, AT - 32) dt: the brief defines it on UTCI (engine definition); this engine has no UTCI, so the apparent temperature with radiation (block 4, [bom]) stands in, an interpretation',
  burnMetal: '1-min contact-burn threshold for bare metal (ISO 13732-1 via CENELEC Guide 29, via the briefs)',
  burnStone: '1-min threshold for stone, concrete, glass and ceramics (as above); the concrete bench of stop D',
  burnPlastic: '1-min threshold for plastics and wood (as above); quoted on the card, no plastic surface is modelled',
  burn1s: 'about 1 s of contact for bare metal at 65-70 C (unverified, via the brief); the low end, as the brief\'s band 7 names it, so the flag errs early',
  benchZ: 'bench seat height, m; engine assumption',
  railZ: 'handrail height above the deck, m; engine assumption',
};

let cache = null;
/** World, models, riders and statistics (memoised). */
export function base9() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = busSetup(world);
    const book = riderBook(world, setup.P);
    const st = busStats(world, setup, book);
    cache = { scene: SCENE, world, setup, T: setup.base, P: setup.P, book, st };
  }
  return cache;
}

let extra = null;
/** The comparisons (memoised): screen vs bigger roof, which kerb, roof swaps on stop A. */
export function compare9() {
  if (!extra) {
    const { world, T } = base9();
    extra = { cmp: screenCompare(world, T), kerb: kerbCompare(world, T), swap: roofSwap(world, T, ['roofMetal', 'polyClear', 'polyOpal', 0.43]) };
  }
  return extra;
}

/** Simulated mean wait over every rider of the day (all stops, and per stop). */
export function waits9(o = {}) {
  const per = SCENE.stops.map((s, si) => {
    const d = daySchedule(SCENE.seed, si, o);
    const w = d.riders.reduce((a, r) => a + r.b - r.a, 0);
    const g = d.buses.slice(1).map((b, k) => b - d.buses[k]);
    const gm = g.reduce((a, x) => a + x, 0) / g.length;
    const cv = Math.sqrt(g.reduce((a, x) => a + (x - gm) ** 2, 0) / g.length) / gm;
    return { id: s.id, n: d.riders.length, wait: w / d.riders.length, buses: d.buses.length, gap: gm, cv, sum: w };
  });
  const n = per.reduce((a, x) => a + x.n, 0);
  return { per, n, wait: per.reduce((a, x) => a + x.sum, 0) / n, formula: meanWait(o.headway, o.cv) };
}

/** Walkers and riders at hour h: walkers' shade density ratio; riders arriving in the hour with their head in shade. */
export function walkers9(hour = 15) {
  const { world, T, book } = base9();
  const cacheShade = new Map();
  const shadeFor = (hq) => {
    if (!cacheShade.has(hq)) cacheShade.set(hq, shadeClassField(world, T.sun(hq)));
    return cacheShade.get(hq);
  };
  const life = new Life(SCENE, shadeFor, (h) => T.air(h));
  const sh = shadeFor(hour);
  const frames = [400, 1600, 2800, 4000];
  const dens = frames.map((f) => shadeDensity(world, life.at(f / 60, hour), sh));
  const rows = SCENE.stops.flatMap((s, si) => book.stats(si, hour, hour + 1).rows);
  return { ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length, riders: rows.length, shade: rows.filter((r) => r.head < 0.5).length / rows.length };
}

/** Stop A's shelter (centre and open reference) with another height or depth (sensitivity): Tmrt cut at 15:00 and under-roof Tmrt - air. */
function shelterA(o) {
  const { world, T } = base9();
  const A = SCENE.stops.find((s) => s.id === 'A');
  const r = { ...A.roof, z: o.z ?? A.roof.z };
  if (o.depth) r.y0 = r.y1 - o.depth; // the back stays on the panel line, the front moves
  const pts = [{ x: (r.x0 + r.x1) / 2, y: (A.roof.y0 + A.roof.y1) / 2, z: 0, mat: 'concrete', head: BS.headStand.value }, { x: A.open[0], y: A.open[1], z: 0, mat: 'concrete', head: BS.headStand.value }];
  const panels = A.panels.map((P) => ({ ...P, stop: 'A', tr: MATERIALS[P.kind].tr.value }));
  const P = pointModel(world, geometry(world, { stop: 'A', roofs: [{ id: 'roofA', ...r, tr: 0 }], panels }), pts, { suns: T.slots.suns });
  return { cut: P.tmrt(1, 15) - P.tmrt(0, 15), above: P.tmrt(0, 15) - T.air(15), ground: P.ts(0, 15) - T.air(15) };
}

/** One change at a time, within the brief's ranges. */
let sens = null;
export function sensitivity9() {
  if (sens) return sens;
  const { world, T, P } = base9();
  const shelter = [
    { label: 'roof height 2.5 m', ...shelterA({ z: 2.5 }) },
    { label: 'roof height 2.8 m', ...shelterA({ z: 2.8 }) },
    { label: 'depth 1.5 m', ...shelterA({ depth: 1.5 }) },
    { label: 'depth 2.5 m', ...shelterA({ depth: 2.5 }) },
  ];
  const wait = [];
  for (const [k, vals] of [['headway', [5, 15]], ['cv', [0.3, 0.5]]]) for (const val of vals) {
    const w = waits9({ [k]: val });
    wait.push({ label: `${k === 'headway' ? 'headway' : 'cv'} ${val}`, wait: w.wait, formula: w.formula, ratio: w.wait / w.formula });
  }
  // the thin metal layer: C 5 and 20 kJ m-2 K-1 (the brief's range) on the deck and rail points
  const pts = world.bus.pts;
  const metal = pts.filter((p) => p.mat === 'metal' && (p.kind === 'deck' || p.kind === 'rail'));
  const G = geometry(world);
  const runMetal = (c) => {
    const mats = { ...MATERIALS, metal: { ...MATERIALS.metal, thinC: { ...MATERIALS.metal.thinC, value: c } } };
    const M = pointModel(world, G, metal, { suns: T.slots.suns }, mats);
    const idx = (b, kind) => metal.map((p, i) => [p, i]).filter(([p]) => p.bridge === b && p.kind === kind).map(([, i]) => i);
    const deckPeak = (b) => Math.max(...[...Array(96).keys()].map((k) => idx(b, 'deck').reduce((a, i) => a + M.ts(i, k / 4), 0) / idx(b, 'deck').length));
    return { label: `thin metal C ${c / 1000} kJ m⁻² K⁻¹`, open15: idx('open', 'deck').reduce((a, i) => a + M.ts(i, 15), 0) / idx('open', 'deck').length, openPeak: deckPeak('open'), railPeak: Math.max(...[...Array(96).keys()].map((k) => M.ts(idx('open', 'rail')[0], k / 4))) };
  };
  const thin = [5000, 20000].map(runMetal);
  // the deck height: 5.5 and 6.5 m (a world with the bridges moved; deck points only)
  const deck = [5.5, 6.5].map((z) => {
    const bridges = SCENE.bridges.map((b) => ({ ...b, z }));
    const screens = SCENE.screens.map((S) => (S.id.startsWith('deck-') ? { ...S, z } : S.id.startsWith('cover-') ? { ...S, z: z + SCENE.shelterH } : S));
    const w2 = prepWorld(buildWorld({ ...SCENE, bridges, screens }, { svf: false }));
    const dp = w2.bus.pts.filter((p) => p.kind === 'deck');
    const M = pointModel(w2, geometry(w2), dp, { suns: T.slots.suns });
    const m = (b) => dp.map((p, i) => [p, i]).filter(([p]) => p.bridge === b).reduce((a, [, i], _, arr) => a + M.tmrt(i, 15) / arr.length, 0);
    return { label: `deck ${z} m`, gap: m('open') - m('covered'), open: m('open'), covered: m('covered') };
  });
  const st = base9().st;
  sens = { shelter, wait, thin, deck, shipped: { shelter: shelterA({}), thin: { open15: st.bridges.find((b) => b.id === 'open').deck[15], openPeak: st.bridges.find((b) => b.id === 'open').deckPeak, railPeak: st.bridges.find((b) => b.id === 'open').railPeak }, deck: st.bridges.find((b) => b.id === 'open').tmrt[15] - st.bridges.find((b) => b.id === 'covered').tmrt[15] }, P };
  return sens;
}

let under = null;
/**
 * Band 3 sensitivity (docs only; nothing shipped changes): the concrete under
 * stop A's roof with the roof underside at the temperature of this model's own
 * dark metal roofs (the mean of the grid's metal roof cells, minute by minute;
 * a thin layer, so its underside is about its top) instead of the shared
 * warm-wall term (air + 2 K + 6 K x K/900). The roof's share of the point's
 * view (svfOpen - svf) takes that temperature, the building walls (1 -
 * svfOpen) keep the shared term, blended as sigma T^4.
 */
export function roofUnderside3() {
  if (under) return under;
  const { world, T } = base9();
  const A = SCENE.stops.find((s) => s.id === 'A');
  const pt = [{ x: (A.roof.x0 + A.roof.x1) / 2, y: (A.roof.y0 + A.roof.y1) / 2, z: 0, mat: 'concrete', head: 0 }];
  const G = geometry(world);
  const metal = [...Array(world.n * world.n).keys()].filter((i) => world.bld[i] >= 0 && cellMat(world, i) === 'metal');
  const roofAt = (m) => metal.reduce((a, i) => a + T.ts(i, m / 60), 0) / metal.length + 273.15;
  const base = pointModel(world, G, pt, { suns: T.slots.suns });
  const { open, svf } = base.sky[0];
  let calls = 0;
  const wall = (taK, k) => {
    const m = calls++ % 1440; // runModel calls this once per model minute, in order (1-min days)
    const tw = wallTemp(taK, k);
    const tr = roofAt(m);
    return ((((1 - open) * tw ** 4) + (open - svf) * tr ** 4) / (1 - svf)) ** 0.25;
  };
  const P = pointModel(world, G, pt, { suns: T.slots.suns }, null, { wallTemp: wall });
  under = { roof15: roofAt(900) - 273.15, ts: P.ts(0, 15), above: P.ts(0, 15) - T.air(15), shipped: base.ts(0, 15) - T.air(15), share: open - svf, wall15: wallTemp(T.air(15) + 273.15, T.shortwave(0, 15).beam * Math.sin(T.sun(15).alt * Math.PI / 180) + T.shortwave(0, 15).diffuse) - 273.15 };
  return under;
}

/** The brief's table: cot beta and the shadow shift per m (east, north) at 14-17 h (NOAA via the brief). */
export const BRIEF_SUN = { 14: { cot: 0.55, e: 0.51, n: 0.21 }, 15: { cot: 0.86, e: 0.85, n: 0.13 }, 16: { cot: 1.32, e: 1.32, n: -0.02 }, 17: { cot: 2.15, e: 2.12, n: -0.33 } };

/** The contact flags at hour h, checked against the ISO limits (mismatches). */
export function flags9(h = 15) {
  const { world, P } = base9();
  const pts = world.bus.pts.filter((p) => p.kind === 'bench' || p.kind === 'rail' || p.kind === 'deck');
  let bad1 = 0;
  let badS = 0;
  const rows = pts.map((p) => {
    const f = contactFlags(P, p.k, h);
    if (f.min1 !== f.ts > burnLimit(p.mat)) bad1++;
    if (f.s1 !== (p.mat === 'metal' && f.ts > BS.burn1s.value)) badS++;
    return { p, ...f };
  });
  return { rows, bad1, badS, n: rows.length, flagged: rows.filter((r) => r.min1).length, s1: rows.filter((r) => r.s1).length };
}

/**
 * Block 9 acceptance bands (spec #14, the brief's bands at Ta peak 35 C),
 * at 15:00 unless the band names its hours (the shadow shift at 14-17 h,
 * the wait over the day). Rows: {label, value, lo, hi, unit, src, inside,
 * supp}; supplementary rows are reported and not counted.
 */
export function bands9() {
  const { st, T, world } = base9();
  const { swap } = compare9();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', o = {}) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, supp: !!o.supp, inside: (lo === null || value >= lo - 1e-9) && (hi === null || value <= hi + 1e-9) });
  const by = (id) => st.stops.find((s) => s.id === id);
  const A = by('A');
  const a15 = T.air(15);
  add('1. Opaque shelter (stop A) at 15:00, standing: Tmrt at the kerb − under the roof (centre), K', A.open[15].tmrt - A.centre[15].tmrt, 20, 35, 'middel2021', 'K');
  add('1. The same: Tmrt under the roof − air, K', A.centre[15].tmrt - a15, 0, 15, 'brief9', 'K');
  const { kerb } = compare9();
  for (const k of ['west', 'east']) add(`1. Supplementary: an opaque roof on the avenue's ${k} kerb (stop B's shelter${k === 'east' ? ', mirrored: open front to the west' : ''}) at 15:00, standing: Tmrt at the kerb − under the roof, K`, kerb[k][15].open - kerb[k][15].standing, 20, 35, 'middel2021', 'K', { supp: true });
  for (const id of ['B', 'D', 'E']) {
    const S = by(id);
    const c = S.centre ?? S.seat;
    add(`1. Supplementary: stop ${id} (${id === 'D' ? 'trees, on the bench' : id === 'B' ? 'clear roof, centre' : 'glass box, centre'}) at 15:00, Tmrt at the kerb − ${id === 'D' ? 'on the bench' : 'under the roof'}, K`, S.open[15].tmrt - c[15].tmrt, 20, 35, 'middel2021', 'K', { supp: true });
  }
  add('2. Stop A\'s shelter with a clear polycarbonate roof (τ 0.80): share of the opaque roof\'s Tmrt cut at 15:00', swap.polyClear.benefit / swap.roofMetal.benefit, null, 0.3, 'brief9');
  add('2. The same with an opal roof (τ 0.47): share', swap.polyOpal.benefit / swap.roofMetal.benefit, 0.5, 0.65, 'brief9');
  add('2. Supplementary: the same with a bronze roof (τ 0.43, not in the scene): share', swap[0.43].benefit / swap.roofMetal.benefit, 0.5, 0.65, 'brief9', '', { supp: true });
  add('3. Concrete at 15:00: at the kerb − under stop A\'s roof, K', A.open[15].ts - A.centre[15].ts, 10, null, 'dzyuban2022', 'K');
  add('3. Concrete under stop A\'s roof − air at 15:00, K', A.centre[15].ts - a15, 0, 8, 'dzyuban2022', 'K');
  const H = SCENE.shelterH;
  for (const h of [14, 15, 16, 17]) {
    const o = shadowOffset(H, T.sun(h));
    add(`4. Roof shadow shift at ${h}:00 (H ${H} m, sun.js), m (H·cot β ${(H * BRIEF_SUN[h].cot).toFixed(3)} m from the brief's NOAA table)`, Math.hypot(o[0], o[1]), H * BRIEF_SUN[h].cot - 0.25, H * BRIEF_SUN[h].cot + 0.25, 'noaa', 'm');
  }
  for (const h of [14, 17]) {
    const o = shadowOffset(1, T.sun(h));
    add(`4. Supplementary: shadow shift per m at ${h}:00, east (brief ${BRIEF_SUN[h].e}), m`, o[0], BRIEF_SUN[h].e - 0.02, BRIEF_SUN[h].e + 0.02, 'noaa', 'm', { supp: true });
    add(`4. Supplementary: shadow shift per m at ${h}:00, north (brief ${BRIEF_SUN[h].n}), m`, -o[1], BRIEF_SUN[h].n - 0.02, BRIEF_SUN[h].n + 0.02, 'noaa', 'm', { supp: true });
  }
  const w = waits9();
  add(`5. Simulated mean wait (${w.n} riders, all stops, the whole day) over (h / 2)(1 + cv²) = ${meanWait().toFixed(2)} min`, w.wait / w.formula, 0.9, 1.1, 'fan2002');
  for (const p of w.per) add(`5. Supplementary: stop ${p.id} (${p.n} riders)`, p.wait / w.formula, 0.9, 1.1, 'fan2002', '', { supp: true });
  const [cv, op] = ['covered', 'open'].map((id) => st.bridges.find((b) => b.id === id));
  add(`6. Footbridge decks at 15:00: Tmrt on the open − the covered deck (mean of ${op.n} points each), K`, op.tmrt[15] - cv.tmrt[15], 20, 35, 'chenWalk2024', 'K');
  add('6. Supplementary: the same at mid-span, K', op.tmrtMid[15] - cv.tmrtMid[15], 20, 35, 'chenWalk2024', 'K', { supp: true });
  const f = flags9(15);
  add(`7. Surfaces at 15:00 (${f.n} bench, rail and deck points) whose 1-min flag disagrees with its ISO 13732-1 limit`, f.bad1, 0, 0, 'iso13732');
  add('7. Metal surfaces at 15:00 whose 1-s flag disagrees with ≈65 °C', f.badS, 0, 0, 'brief9');
  add('7. Supplementary: open steel deck, daily peak (mean of the deck points; the brief\'s 60–70 °C), °C', op.deckPeak, 60, 70, 'deckSteel', '°C', { supp: true });
  const wk = walkers9(15);
  add(`Riders arriving 15:00–16:00 (n ${wk.riders}) waiting with their head in shade`, wk.shade, 0.5, null, 'melnikov');
  add('Walkers at 15:00: density in shade over density in sun', wk.ratio, 2, null, 'melnikov');
  return rows;
}

/** Band verdicts 1-7: met if every counted row of the band is inside. */
export function bandVerdicts(rows) {
  const out = {};
  for (const r of rows) {
    const m = /^(\d+)\. /.exec(r.label);
    if (!m || r.supp) continue;
    out[m[1]] = (out[m[1]] ?? true) && r.inside;
  }
  return out;
}
