// Analysis helpers for the older high-rise estate (block 7), shared by the
// tests and scripts/sources.mjs (not shipped in the page): the world and its
// model, the sill rule, the shadow geometry, the condenser numbers, the
// checker on long continuous slabs, the sensitivity runs, the walkers and the
// acceptance bands. ES_NOTES are the parameter notes for docs/sources.md.
import { SCENE } from '../cities/estate/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField, runModel, buildingMask, wallTemp, cellMat } from '../engine/thermal.js';
import { solarPosition, sunVector } from '../engine/sun.js';
import {
  ES, estateSetup, estateStats, winterSite, ewCrossing, shadowDepth, maskDepth, courtShade, sunAtSolar, clockOf, ruleCheck, sunHours, sillPoints,
  effHeight, svfSlope, qRej, exhaustDT, rhoAir, acShare, siteHeat, plumeLw, tsMean, tmrtMean,
} from '../engine/estate.js';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';

/** Notes on the block-7 parameters (docs only; the page carries the values without them). */
export const ES_NOTES = {
  floorHeight: 'storey height of the older slabs; 18 floors make 52.2 m, 30 floors 87.0 m (the brief: 18F about 54 m, 30F about 87 m)',
  groundFloor: 'ground-floor level above the courtyard; older slabs often sit 0.3-0.45 m up (see Sensitivity)',
  sillHeight: 'the test point of the rule, 0.9 m above the floor (draft Zhejiang rules); H_eff = roof - (ground floor + 0.9 m)',
  ruleHours: '大寒 >= 2 h, climate zone II (35° N cities such as Zhengzhou, Xi\'an, Xuzhou), cities of 500,000 or more; table values from memory in the brief',
  ruleWindow: 'true solar time on 大寒 (20 January), as the draft Zhejiang rules; GB 50180 window not checked',
  ruleStep: 'minutes per step (at most 5 min in the draft Zhejiang rules); samples at mid-step',
  ruleSegment: 'only stretches of sun of at least this many minutes count (draft Zhejiang rules)',
  spacingK: 'G / H_eff for 2 h of 大寒 sun between long parallel slabs at 35° N, calculated in the brief (1.45 for 1 h, 1.52 for 3 h); the estate uses G = 80 m, G / H_eff = 1.56, the 5 m grid step above 1.47 x 51.3 = 75.4 m',
  qCool: 'cooling capacity of one split unit, kW (the brief\'s calculation)',
  eer: 'energy efficiency ratio of the split unit (the brief\'s calculation)',
  fanFlow: 'condenser fan air flow, m3/s; brief 0.5-0.7 (unverified)',
  perFlat: 'heat rejected per flat at full use, kW; the brief\'s estate estimate (2,400 flats x 3.3 kW on 16 ha, about 50 W m-2); an assumption',
  condensers: 'brief: 2-3 per flat, stacked per floor 2.8-3.0 m apart (unverified); here 2 on the south face and 1 on the north face',
  plumeWidth: 'width of the warm wall strip above a stack of condensers, m; an assumption of this block',
  wallDT: 'wall warming in the plume zones at full use; an assumption of the brief (at most 2 K), not a cited range; the upper end is used, so the Tmrt it adds is an upper estimate',
  acProfile: 'share of flats running AC by hour (AC_SHARE in engine/estate.js): 0.2 at 08:00, 0.45 in the afternoon, 1.0 at 20:00-21:00, 0.55 at 05:00; an assumption of this block',
};

let cache = null;
/** World, model and statistics (memoised). */
export function base7() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = estateSetup(world);
    const T = setup.model;
    const st = estateStats(world, T, setup.plume);
    cache = { scene: SCENE, world, setup, slots: setup.slots, T, st, C: st.C, plume: setup.plume };
  }
  return cache;
}

/** Sun geometry: noon altitudes, east-west crossings, noon shadow depths (analytic and from the engine's building mask). */
export function geometry7() {
  const { world } = base7();
  const site = SCENE.site;
  const win = winterSite(site);
  const B = world.buildings.find((b) => b.id === 'slab2a');
  const mask = (s, tst) => maskDepth(world, buildingMask(world, solarPosition(s, clockOf(s, tst))), B);
  return {
    jul: shadowDepth(site),
    jan: shadowDepth(win),
    ew: ewCrossing(site),
    H: B.h,
    hEff: effHeight(B),
    maskJul: mask(site, 720),
    maskJan: mask(win, 720),
  };
}

/** Courtyard shade cast by the southern slab (slab 2A into the courtyard north of it), every 10 min from 10:00 to 16:00 solar time. */
export function court7() {
  const { world } = base7();
  const B = world.buildings.find((b) => b.id === 'slab2a');
  const yN = world.buildings.find((b) => b.id === 'slab1a').y1;
  const rows = [];
  for (let tst = 600; tst <= 960; tst += 10) rows.push({ tst, ...courtShade(B, yN, sunAtSolar(SCENE.site, tst)) });
  // supplementary: all buildings (engine mask) at 16:00 solar time: shaded samples of that courtyard beyond 0.37 H from slab 2A
  const sun16 = sunAtSolar(SCENE.site, 960);
  const m = buildingMask(world, sun16);
  let beyond = 0;
  const lim = 0.37 * B.h;
  for (let x = B.x0 + 1.25; x < B.x1; x += 2.5) {
    for (let y = B.y0 - 1.25; y > yN; y -= 2.5) {
      if (B.y0 - y <= lim) continue;
      const c = Math.floor(y / 5) * world.n + Math.floor(x / 5);
      const s = (x % 5 < 2.5 ? 0 : 1) + (y % 5 < 2.5 ? 0 : 2);
      if (m[c * 4 + s]) beyond++;
    }
  }
  return { rows, B, yN, beyond16: beyond, far: Math.max(...rows.map((r) => r.far)), noon: rows.find((r) => r.tst === 720) };
}

/**
 * Solar declination (deg) from the full NOAA algorithm (the solar-calculator
 * spreadsheet: apparent longitude, corrected obliquity) at a UT instant. The
 * engine (sun.js) uses NOAA's fractional-year Fourier approximation instead,
 * which is about 0.2 deg off on the design days; this is for the docs only.
 */
export function fullDecl(year, month, day, utHour) {
  const jd = 367 * year - Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) + Math.floor((275 * month) / 9) + day + 1721013.5 + utHour / 24;
  const T = (jd - 2451545) / 36525;
  const r = Math.PI / 180;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const C = Math.sin(M * r) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * r) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * r) * 0.000289;
  const om = 125.04 - 1934.136 * T;
  const lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om * r);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(om * r);
  return Math.asin(Math.sin(eps * r) * Math.sin(lam * r)) / r;
}

/** Declination at local solar noon of a site's day, full NOAA algorithm. */
export const noonDecl = (site) => fullDecl(site.year ?? 2026, site.month, site.day, 12 - site.lon / 15);

/** Noon altitudes on 20 July and 大寒 with the engine's declination and with the full NOAA declination. */
export function noonCompare() {
  const site = SCENE.site;
  const win = winterSite(site);
  return {
    engine: { jul: shadowDepth(site).alt, jan: shadowDepth(win).alt },
    full: { jul: 90 - site.lat + noonDecl(site), jan: 90 - site.lat + noonDecl(win) },
  };
}

/** Sun samples as solarSamples, with one fixed declination (deg) and the hour angle from true solar time. */
function fixedSuns(lat, decl, t0 = 480, t1 = 960, step = ES.ruleStep.value) {
  const out = [];
  const r = Math.PI / 180;
  for (let t = t0; t < t1 - 1e-9; t += step) {
    const ha = ((t + step / 2) / 4 - 180) * r;
    const sa = Math.sin(lat * r) * Math.sin(decl * r) + Math.cos(lat * r) * Math.cos(decl * r) * Math.cos(ha);
    const alt = Math.asin(sa) / r;
    let az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(decl * r) - Math.sin(lat * r) * sa) / (Math.cos(lat * r) * Math.cos(alt * r))))) / r;
    if (ha > 0) az = 360 - az;
    out.push({ t, alt, az, d: alt > 0 ? sunVector(alt, az) : null });
  }
  return out;
}

/**
 * The checker on long continuous slabs (a test scene, not the estate): two
 * 400 m slabs G = k H_eff apart; sun hours at the middle sill on 大寒, with
 * the engine's sun (default) or with the full NOAA declination (full).
 */
export function longSlabs(k = ES.spacingK.value, full = false) {
  const h = 18 * ES.floorHeight.value;
  const hEff = h - ES.groundFloor.value - ES.sillHeight.value;
  const y1 = 100;
  const buildings = [
    { id: 'n', x0: 0, y0: y1 - 15, x1: 400, y1, h, index: 0 },
    { id: 's', x0: 0, y0: y1 + k * hEff, x1: 400, y1: y1 + k * hEff + 15, h, index: 1 },
  ];
  const world = { buildings, scene: { site: SCENE.site } };
  const p = { x: 200, y: y1 + 0.05, z: ES.groundFloor.value + ES.sillHeight.value, b: 0 };
  const win = winterSite(SCENE.site);
  return { k, G: k * hEff, ...sunHours(world, p, win, full ? { suns: fixedSuns(win.lat, noonDecl(win)) } : {}) };
}

let tsRun = null;
/**
 * Ground Ts with the plume wall term fed into the surface balance (docs and
 * tests only; the page feeds it to Tmrt alone): an upper bound, every wall
 * warmer by wallDT x the largest plume share all day, on a sample of the
 * ground cells that see condenser walls, against a plain run of the same cells.
 */
export function plumeTs7() {
  if (!tsRun) {
    const { world, slots } = base7();
    const P = world.estate.plume;
    const pMax = Math.max(...Array.from(P));
    const cells = [];
    for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && P[i] > 0 && i % 7 === 0) cells.push(i);
    const a = runModel(world, { slots, cells });
    const b = runModel(world, { slots, cells, wallTemp: (taK, k) => wallTemp(taK, k) + ES.wallDT.value * pMax });
    let max = 0;
    for (const i of cells) for (let s = 0; s < 96; s++) max = Math.max(max, Math.abs(b.ts(i, s / 4) - a.ts(i, s / 4)));
    tsRun = { n: cells.length, pMax, max };
  }
  return tsRun;
}

/** Shaded ground at hour h: least-squares slope of Tmrt on SVF over building-shaded ground cells (no crown), K per unit SVF. */
export function svfSlope7(h = 15) {
  const { world, T } = base7();
  return svfSlope(world, T, h);
}

/** Smallest G / H_eff (to 0.005) that gives the long slabs' middle sill 2 h of 大寒 sun (engine's sun, or the full NOAA declination). */
export function kFor2h(full = false) {
  for (let k = 1.4; k < 1.7; k += 0.005) if (longSlabs(k, full).hours >= ES.ruleHours.value - 1e-9) return Math.round(k * 1000) / 1000;
  return null;
}

let sens = null;
/** Sensitivity: one value at a time (rule geometry, condenser inputs, the plume term). */
export function sensitivity7() {
  if (!sens) {
    const { world, T, st, plume } = base7();
    const rule = (label, opts) => ({ label, min: ruleCheck(world, opts).min });
    const r = [
      rule('sill at 0.9 m (shipped)', {}),
      rule('ground floor 0.45 m up: sill at 1.35 m', { z: 1.35 }),
      rule('counted at the ground (0 m), not the sill', { z: 0 }),
    ];
    // a 1-min step: the same sills
    const site = winterSite(SCENE.site);
    const pts = sillPoints(world);
    const step1 = Math.min(...pts.filter((_, k) => k % 4 === 0).map((p) => sunHours(world, p, site, { step: 1 }).hours));
    r.push({ label: '1-min steps (every 4th sill)', min: step1 });
    const k = [1.45, 1.47, 1.52].map((kk) => ({ k: kk, G: kk * st.hEff, long: longSlabs(kk).hours, full: longSlabs(kk, true).hours }));
    const ac = [
      { label: 'shipped: 3.5 kW, EER 3.3, 0.6 m³/s', q: qRej(), dt: exhaustDT(35) },
      { label: 'fan 0.5 m³/s', q: qRej(), dt: exhaustDT(35, qRej(), 0.5) },
      { label: 'fan 0.7 m³/s', q: qRej(), dt: exhaustDT(35, qRej(), 0.7) },
      { label: 'EER 3.0', q: qRej(3.5, 3.0), dt: exhaustDT(35, qRej(3.5, 3.0)) },
      { label: 'EER 3.6', q: qRej(3.5, 3.6), dt: exhaustDT(35, qRej(3.5, 3.6)) },
    ];
    // the plume term at half the wall warming: the Tmrt it adds scales almost linearly
    const i = st.plumeAt.i;
    const h = st.plumeAt.h;
    const tw = (T.hourConst(h).opaque / 5.670374e-8) ** 0.25;
    const was = plume.on;
    plume.on = false;
    const off = T.tmrt(i, h);
    plume.on = was;
    const lw = (dT) => world.estate.plume[i] * plumeLw(tw, dT * acShare(h));
    const wall = [{ dT: 2, add: lw(2), tmrt: st.plumeMax }, { dT: 1, add: lw(1), tmrt: st.plumeMax * (lw(1) / lw(2)) }];
    sens = { rule: r, k, ac, wall, off };
  }
  return sens;
}

/** Walkers at hour h: dwellers by shade class, walkers' shade density, and the share on the north-face path of each courtyard route. */
export function walkers7(hour = 15) {
  const { world, T } = base7();
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
  const routes = SCENE.routes.map((r, k) => {
    const mine = life.walkers.map((w, i) => (w.route === k ? P.choice[i] : null)).filter((c) => c !== null);
    return { id: r.id, first: mine.filter((c) => c === 0).length / mine.length };
  });
  return { n: P.dwell.length, sun: cls[0], shadeShare: (cls[1] + cls[2]) / P.dwell.length, ratio: dens.reduce((a, x) => a + x.ratio, 0) / dens.length, routes };
}

/**
 * Block 7 acceptance bands (spec #13). Rows: {label, value, lo, hi, unit,
 * src, inside, supp, soft}. A supplementary row is reported but does not
 * decide its band; soft bands (5, 7) are reported, not asserted.
 */
export function bands7() {
  const { st, T, C, world } = base7();
  const g = geometry7();
  const ct = court7();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', o = {}) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, supp: !!o.supp, soft: !!o.soft, inside: (lo === null || value >= lo - 1e-9) && (hi === null || value <= hi + 1e-9) });
  // 1: sun
  add('1. Sun altitude at solar noon, 20 July (NOAA equations)', g.jul.alt, 75.3, 75.9, 'brief7', '°');
  add('1. Sun altitude at solar noon, 大寒 (20 January)', g.jan.alt, 34.5, 35.1, 'brief7', '°');
  add('1. Sun due east, 20 July (true solar time, minutes; 08:10 = 490)', g.ew.east, 485, 495, 'brief7', 'min');
  add('1. Sun due west, 20 July (true solar time, minutes; 15:50 = 950)', g.ew.west, 945, 955, 'brief7', 'min');
  // 2: slab noon shadow, from the engine's building mask (2.5 m samples) north of slab 2A, against d_N x H, ± 1 cell
  add(`2. July noon shadow north of a slab (engine mask), m; brief 0.257 H = ${(0.257 * g.H).toFixed(1)} m ± 5 m`, g.maskJul, 0.257 * g.H - 5, 0.257 * g.H + 5, 'brief7', 'm');
  add(`2. 大寒 noon shadow north of a slab (engine mask), m; brief 1.44 H = ${(1.44 * g.H).toFixed(1)} m ± 5 m`, g.maskJan, 1.44 * g.H - 5, 1.44 * g.H + 5, 'brief7', 'm');
  // 3: the rule
  const R = st.rule;
  const behind = R.sills.filter((s) => world.buildings[s.b].row < 3);
  add(`3. Lowest 大寒 sun at a ground-floor sill behind another row (rows 1–3, n ${behind.length} sills), h`, Math.min(...behind.map((s) => s.hours)), ES.ruleHours.value, null, 'gb50180', 'h');
  add(`3. Lowest 大寒 sun at any ground-floor sill (n ${R.sills.length}), h`, R.min, ES.ruleHours.value, null, 'gb50180', 'h');
  add('3. Row spacing G / H_eff, lowest of rows 1–3', Math.min(...R.slabs.filter((s) => s.k !== null).map((s) => s.k)), ES.spacingK.value, null, 'brief7');
  const L = longSlabs();
  const LF = longSlabs(ES.spacingK.value, true);
  add(`3. Supplementary: the checker on two long continuous slabs at G = 1.47 H_eff (${L.G.toFixed(1)} m; a test scene, not the estate), with the engine's approximate declination: sun at the middle sill, h (the brief: 2 h)`, L.hours, 1.75, 2.25, 'brief7', 'h', { supp: true });
  add('3. Supplementary: the same long slabs with the full NOAA declination (the brief\'s sun): sun at the middle sill, h', LF.hours, 1.75, 2.25, 'brief7', 'h', { supp: true });
  add('3. Supplementary: G / H_eff that gives 2 h at the middle sill of the long slabs, engine\'s approximate declination (the brief: 1.47)', kFor2h(), 1.45, 1.52, 'brief7', '', { supp: true });
  add('3. Supplementary: the same with the full NOAA declination', kFor2h(true), 1.45, 1.52, 'brief7', '', { supp: true });
  // 4: the July courtyard
  add(`4. July, 10:00–16:00 solar time: deepest shade slab 2A casts into the courtyard north of it, m (no shade beyond 0.37 H = ${(0.37 * g.H).toFixed(1)} m)`, ct.far, null, 0.37 * g.H, 'brief7', 'm');
  const want = (0.257 * g.H) / SCENE.gap;
  add(`4. July solar noon: shaded share of that courtyard's depth (middle column); brief 0.257 H / G = ${want.toFixed(3)} ± 1 cell`, ct.noon.share, want - 5 / SCENE.gap, want + 5 / SCENE.gap, 'brief7');
  add('4. Supplementary: 16:00 solar time, all buildings (engine mask): shaded samples of that courtyard beyond 0.37 H (the next row\'s south face, sun north of west after 15:50)', ct.beyond16, 0, null, 'brief7', '', { supp: true });
  // 5: soft
  const sl = svfSlope7(15);
  const sn = svfSlope7(21);
  add(`5. Supplementary (night, longwave only): 21:00 (after dark), all open paving (n ${sn.n}): Tmrt change per 0.1 less sky view, K`, -0.1 * sn.slope, 0.8, 3.2, 'lai2017', 'K', { supp: true });
  add(`5. Soft: 15:00, building-shaded paving (n ${sl.n}, SVF ${sl.svf[0].toFixed(2)}–${sl.svf[1].toFixed(2)}): Tmrt change per 0.1 less sky view, K (Lai et al.: +1.6 K, within × 2)`, -0.1 * sl.slope, 0.8, 3.2, 'lai2017', 'K', { soft: true });
  // 6: condensers
  add('6. Heat rejected per condenser, Q_cool (1 + 1/EER), kW', st.qRej, 3, 6, 'brief7', 'kW');
  add('6. Exhaust temperature rise at 15:00, Q_rej / (ρ c_p V̇), K', st.dtExh, 5, 8, 'brief7', 'K');
  add('6. Exhaust temperature rise at 23:00, K', st.dtExhNight, 5, 8, 'brief7', 'K');
  add(`6. Site heat rejection at its peak (${String(st.peak.h).padStart(2, '0')}:00, ${st.peak.flats} flats), W m⁻²`, st.peak.wm2, 20, 70, 'brief7', 'W m⁻²');
  // as shipped the term reaches Tmrt only: ground Ts with it off and on (every ground cell, 15:00 and 21:00)
  const was = base7().plume.on;
  const ground = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0) ground.push(i);
  const tsAll = (on) => {
    base7().plume.on = on;
    return ground.map((i) => [T.ts(i, 15), T.ts(i, 21)]);
  };
  const off = tsAll(false);
  const dTs = Math.max(...tsAll(true).map(([a, b], k) => Math.max(Math.abs(a - off[k][0]), Math.abs(b - off[k][1]))));
  base7().plume.on = was;
  add('6. Ground surface temperature change with the plume wall term on (as shipped, every ground cell, 15:00 and 21:00), K', dTs, null, 0, 'brief7', 'K');
  const pt = plumeTs7();
  add(`6. Supplementary (reported, no band): the same term fed into the surface balance, upper bound (every wall + ${ES.wallDT.value} K × ${pt.pMax.toFixed(2)} all day; n ${pt.n} cells, every 15 min): largest ground Ts change, K`, pt.max, null, null, 'brief7', 'K', { supp: true });
  add('6. Largest Tmrt change the plume wall term adds (ground cells seeing condenser walls, 03:00, 12:00, 15:00, 21:00), K', st.plumeMax, null, 1, 'brief7', 'K');
  // 7: soft
  add(`7. Soft: 15:00, sunlit paving at the sills (n ${C.sillStrip.length}) minus the lawn (n ${C.lawn.length}), K (Wuhan: 9.87 K, within × 2)`, tsMean(T, C.sillStrip, 15) - tsMean(T, C.lawn, 15), 5, 20, 'cai2017', 'K', { soft: true });
  // walkers
  const wk = walkers7(15);
  add(`Dwellers at 15:00 resting in shade, n ${wk.n}`, wk.shadeShare, 0.5, null, 'melnikov');
  add('Walkers at 15:00: density in shade over density in sun', wk.ratio, 2, null, 'melnikov');
  const w12 = walkers7(12);
  const court = w12.routes.filter((r) => /^court/.test(r.id));
  add('Walkers at 12:00 on the courtyard routes: lowest share on the north-face path (in the slab\'s shadow)', Math.min(...court.map((r) => r.first)), 0.5, null, 'melnikov');
  return rows;
}

/** The brief's bands 1-7: met if every one of its rows that is not supplementary is inside (soft bands too; reported, not asserted). */
export function bandVerdicts(rows) {
  const out = {};
  for (const r of rows) {
    const m = /^(\d)\. /.exec(r.label);
    if (!m || r.supp) continue;
    out[m[1]] = (out[m[1]] ?? true) && r.inside;
  }
  return out;
}

export { rhoAir, tmrtMean, siteHeat };
