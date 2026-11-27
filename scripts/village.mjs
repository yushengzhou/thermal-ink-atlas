// Analysis helpers for the urban village (block 10), shared by the tests and
// scripts/sources.mjs (not shipped in the page): the world and its models,
// the statistics, the walkers and residents, the thin-sheet stability runs,
// the sensitivity runs and the acceptance bands. VG_NOTES are the parameter
// notes for docs/sources.md (the block's materials keep theirs in
// materials.js).
import { SCENE } from '../cities/village/scene.js';
import { buildWorld } from '../engine/world.js';
import { shadeClassField, runModel, STORE, SIGMA, cellMat } from '../engine/thermal.js';
import { MATERIALS } from '../engine/materials.js';
import { VG, villageSetup, villageStats, laneSvf, centreSvf, airShown, HOURS, thinFactor, underRoof, mean, laneGroups, laneSun } from '../engine/village.js';
import { solarPosition } from '../engine/sun.js';
import SunCalc from 'suncalc';
import { Life, shadeDensity, shadeAt } from '../engine/life.js';

/** Notes on the block-10 parameters (docs only). */
export const VG_NOTES = {
  storey: 'storey height of a village house, m; engine assumption (the houses are 6-8 storeys, 18-24 m)',
  storeys: 'storeys of the village houses: 6, 7 or 8 (30 / 40 / 30% by plot, layout); the brief\'s 6-8 storeys and walls 18-25 m',
  laneW: 'lane width, m: the brief\'s 1-3 m, most lanes the middle value 2 m; the layout also has lanes of 1.5 and 3 m (and Market Lane 6 m, outside the bands\' set)',
  roomRise: 'height of a rooftop room above its house\'s roof, m; engine assumption',
  thinFloor: 'the smallest heat capacity of a thin layer, J m-2 K-1: the brief\'s floor for the explicit 60 s step (C >= 2 kJ); checked for every thin layer of the scene at load (checkThin)',
  warm: 'coarse 10-min spin-up days for the heavy cells (block 3\'s opts.warm, with its stability guard); the thin roofs run from a cold start (they converge within the first day)',
  noon: 'the bands\' "noon": 12:00 local clock time (set before the first model run; solar noon at 114.1° E is about 12:30, reported as a supplementary row)',
  night: 'the hour of the lane-against-open band, 22:00 (the brief)',
  fr: 'F_r, the ceiling\'s share of a person\'s view in a room under a sheet roof; an assumption of the brief, 0.3-0.5; the middle value',
  wallUp: 'the room\'s walls in the radiant proxy are at the outdoor air + this, K; the brief\'s 1-3 K, the middle value',
  hci: 'h_ci, convective coefficient of the ceiling in the air proxy, W m-2 K-1; the brief\'s 1-1.5, the middle value',
  roomH: 'room height h (volume over roof area) in the air proxy, m; engine assumption',
  rhoCp: 'rho c_p of air, J m-3 K-1 (1.2 kg m-3 x 1005 J kg-1 K-1)',
  airTarget: 'the air proxy is calibrated (as the brief says: "calibrate n to +2-4 K peak under bare tin") so the bare rusty-iron rooms peak at this many K above the outdoor air, the middle of 2-4 K; the band on it therefore holds by construction and is not counted',
  airCap: 'the air proxy is never shown beyond +-5 K (the brief)',
  paint: 'what the residents\' white-roof toggle (R) paints the marked bare iron and galvanised roofs with: white-painted tin, new paint (albedo 0.65)',
};

let cache = null;
/** World, models, statistics (memoised; the white-roof model included). */
export function base10() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const setup = villageSetup(world);
    const T = setup.base;
    const C = setup.model(true);
    const st = villageStats(world, T, setup.n, C);
    cache = { scene: SCENE, world, setup, T, C, n: setup.n, st };
  }
  return cache;
}

/** Walkers and the people dwelling at hour h: walkers' shade density ratio; dwellers in shade. */
export function walkers10(hour = 15) {
  const { world, T } = base10();
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
 * One roof of a thin sheet run alone (a one-cell world in the open, the
 * block's site and sun): its surface temperatures over the last day, the
 * number of days and the largest step-to-step change. For the stability
 * check (tarpaulin at the floor and at its real heat capacity).
 */
export function sheetRun(id, thinC, opts = {}) {
  const mats = { ...MATERIALS, [id]: { ...MATERIALS[id], thinC: { ...MATERIALS[id].thinC, value: thinC } } };
  const scene = { ...SCENE, size: 5, lanes: [], ground: [{ id: 'g', name: 'g', mat: 'concrete', poly: [0, 0, 5, 0, 5, 5, 0, 5] }], buildings: [{ id: 'b', name: 'b', x0: 0, y0: 0, x1: 5, y1: 5, h: 3, roof: id }], trees: [], routes: [], spots: [] };
  const world = buildWorld(scene);
  const T = runModel(world, { materials: mats, maxDays: opts.maxDays ?? 6, dt: opts.dt ?? 60 });
  const ts = Array.from(T.store.subarray(0, STORE));
  let jump = 0;
  for (let k = 0; k < STORE; k++) jump = Math.max(jump, Math.abs(ts[(k + 1) % STORE] - ts[k]));
  return { ts, days: T.info.days, maxDelta: T.info.maxDelta, jump, finite: ts.every((x) => Number.isFinite(x)), max: Math.max(...ts), min: Math.min(...ts), factor: thinFactor(mats[id], T.info.hc) };
}

/** Roofs of one material on the ground-level rooms, run alone with changed parameters (sensitivity): mean Ts at 15:00 and the day's peak. */
function roofsWith(id, patch, extra = {}) {
  const { world, T } = base10();
  const mats = { ...MATERIALS, [id]: { ...MATERIALS[id], ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, { ...MATERIALS[id][k], value: v }])) } };
  const rooms = world.buildings.filter((B) => B.style === 'room' && B.roof === id);
  const cells = [];
  for (let i = 0; i < world.bld.length; i++) if (world.bld[i] >= 0 && rooms.includes(world.buildings[world.bld[i]])) cells.push(i);
  const M = runModel(world, { slots: T.slots, cells, materials: mats, ...extra });
  const by = (h) => mean(rooms.map((B) => mean(cells.filter((i) => world.bld[i] === B.index).map((i) => M.ts(i, h)))));
  return { ts15: by(15), peak: Math.max(...HOURS.map(by)), M, cells, rooms };
}

let sens = null;
/** One change at a time, within the brief's ranges (docs only; nothing shipped changes). */
export function sensitivity10() {
  if (sens) return sens;
  const { st, T, world, n } = base10();
  const rust = [];
  for (const [k, vals] of [['alpha', [0.2, 0.3]], ['eps', [0.75, 0.9]], ['thinC', [2000, 4000]]]) for (const val of vals) rust.push({ label: `rusty iron ${k === 'alpha' ? 'α' : k === 'eps' ? 'ε' : 'C'} ${k === 'thinC' ? `${val / 1000} kJ m⁻² K⁻¹` : val}`, ...roofsWith('rustTin', { [k]: val }) });
  const asb = [];
  for (const [k, vals] of [['alpha', [0.25, 0.35]], ['thinC', [6000, 10000]]]) for (const val of vals) asb.push({ label: `asbestos cement ${k === 'alpha' ? 'α' : 'C'} ${k === 'thinC' ? `${val / 1000} kJ m⁻² K⁻¹` : val}`, ...roofsWith('asbestosRoof', { [k]: val }) });
  // white paint: the painted rusty-iron rooms with weathered paint (0.50) instead of new (0.65)
  const white = [];
  for (const a of [0.5]) {
    const r = roofsWith('rustTin', { alpha: a }, {});
    white.push({ label: `white paint weathered (α ${a})`, d15: r.ts15 - st.edge.rustTin.ts15 });
  }
  // the proxies: F_r and the wall excess (radiant, bare rusty iron at 15:00); h_ci with n recalibrated (the white-paint change of the air peak)
  const r15 = st.edge.rustTin.ts15;
  const a15 = T.air(15);
  const rad = (fr, up) => Math.pow(fr * (r15 + 273.15) ** 4 + (1 - fr) * (a15 + up + 273.15) ** 4, 0.25) - 273.15;
  const proxy = [[0.3, 2], [0.5, 2], [0.4, 1], [0.4, 3]].map(([fr, up]) => ({ label: `F_r ${fr}, walls air + ${up} K`, radiant: rad(fr, up) }));
  const rr = st.cool.rustRooms;
  // h_ci 1 or 1.5: n is recalibrated so the bare rooms still peak at the target, which leaves the share of (T_roof - Ta) reaching the air, and so the white-paint change, as shipped
  const share = VG.airTarget.value / mean(world.buildings.filter((B) => B.style === 'room' && B.roof === 'rustTin').map((B) => Math.max(...HOURS.map((h) => underRoof(world, T, B.index, h, n).ts - T.air(h)))));
  const hci = [1, 1.5].map((h) => ({ label: `h_ci ${h} (n recalibrated: ${((3600 * h * (1 / share - 1)) / (VG.rhoCp.value * VG.roomH.value)).toFixed(1)} per hour)`, share, dAir: rr.dAirPeak }));
  // lane width at the village's mean wall height (the canyon formula)
  const H = st.lanes.village.H;
  const lane = [1, 1.5, 2, 3].map((W) => ({ label: `lane ${W} m, walls ${H.toFixed(1)} m`, svf: laneSvf(H, H, W), centre: centreSvf(H, W) }));
  sens = { rust, asb, white, proxy, hci, lane, shipped: { rust15: st.edge.rustTin.ts15, rustPeak: st.edge.rustTin.peak, asb15: st.edge.asbestosRoof.ts15, radiant15: st.edge.rustTin.radiant15 } };
  return sens;
}

/**
 * Thermal.tmrt with the opaque walls at twK (K) instead of the shared
 * warm-wall term (docs runs only; the same arithmetic otherwise).
 */
export function tmrtWalls(M, i, h, twK) {
  const sw = M.shortwave(i, h);
  const s = sw.sun;
  const sl = M.sunlit(i, h);
  const v = M.world.svf[i];
  const mat = MATERIALS[cellMat(M.world, i)];
  const tg = M.ts(i, h) + 273.15;
  const b = Math.max(0, s.alt);
  const fp = 0.308 * Math.cos(b * (1 - (b * b) / 48402) * Math.PI / 180);
  const Ksky = v * sw.diffuse;
  const Kground = mat.alpha.value * sw.K;
  const Klat = 0.5 * Ksky + 0.5 * Kground + 0.5 * sw.walls;
  const S = 0.7 * (0.06 * Ksky + 0.06 * Kground + 0.88 * Klat + fp * sw.beam * (sl + sw.r));
  const Ldown = v * M.hourConst(h).lsky + (1 - v) * SIGMA * twK ** 4;
  const Lg = mat.eps.value * SIGMA * tg ** 4 + (1 - mat.eps.value) * Ldown;
  const L = 0.97 * (0.06 * Ldown + 0.06 * Lg + 0.88 * (0.5 * Ldown + 0.5 * Lg));
  return Math.pow((S + L) / (0.97 * SIGMA), 0.25) - 273.15;
}

let causes = null;
/**
 * Band 5 (docs only; nothing shipped changes): the village lanes' Tmrt - air
 * at noon with (a) their walls at air + 2 K all day (no sun term: lane walls
 * are mostly in shade) instead of the shared warm-wall term, (b) no direct
 * sun on the lane floor or the person (as if balconies, overhangs and washing
 * shaded the lane), (c) both. Each a run of the lane cells alone.
 * Bands 1 and 3: the sheets with a loss through their underside to a room at
 * the outdoor air, h_u = h_ci + 4 eps sigma T^3 (T = 340 K), added to h_c.
 */
export function causes10() {
  if (causes) return causes;
  const { world, T, st } = base10();
  const lanes = laneGroups(world).village.map((c) => c.i);
  const nn = VG.noon.value;
  const ni = VG.night.value;
  const cool = (taK) => taK + 2;
  const dark = { suns: T.slots.suns, fields: T.slots.fields.map((f) => { const g = Float32Array.from(f); for (const i of lanes) g[i] = 0; return g; }) };
  const run = (slots, walls) => runModel(world, { slots, cells: lanes, ...(walls ? { wallTemp: cool } : {}) });
  const Ma = run(T.slots, true);
  const Mb = run(dark, false);
  const Mc = run(dark, true);
  const t = (M, h, walls) => mean(lanes.map((i) => (walls ? tmrtWalls(M, i, h, T.air(h) + 2 + 273.15) : M.tmrt(i, h)))) - T.air(h);
  const lane = [
    { label: 'shipped (shared warm walls, canyon sun)', noon: st.lanes.village.tmrt[nn] - T.air(nn), night: st.lanes.village.tmrt[ni] - st.square.tmrt[ni] },
    { label: '(a) walls at air + 2 K all day', noon: t(Ma, nn, true), night: t(Ma, ni, true) + T.air(ni) - st.square.tmrt[ni] },
    { label: '(b) no direct sun in the lanes', noon: t(Mb, nn, false), night: t(Mb, ni, false) + T.air(ni) - st.square.tmrt[ni] },
    { label: '(c) both', noon: t(Mc, nn, true), night: t(Mc, ni, true) + T.air(ni) - st.square.tmrt[ni] },
  ];
  const site = world.scene.site;
  const sheet = ['rustTin', 'asbestosRoof'].map((id) => {
    const m = MATERIALS[id];
    const hu = VG.hci.value + 4 * m.eps.value * SIGMA * 340 ** 3;
    const r = roofsWith(id, {}, { wind: site.wind + hu / 3.8 });
    return { id, hu, ts15: r.ts15, peak: r.peak, shipped: id === 'rustTin' ? st.edge.rustTin.ts15 : st.edge.asbestosRoof.ts15 };
  });
  causes = { lane, sheet, wallNoon: (T.hourConst(nn).opaque / SIGMA) ** 0.25 - 273.15 };
  return causes;
}

/**
 * The engine's sun (sun.js, issue #24) against suncalc (the tests' oracle)
 * at this site: altitude and azimuth at the bands' hours, and the village
 * lanes' mean sunlit floor with either sun (docs only).
 */
export function sunCheck10() {
  const { world } = base10();
  const s = world.scene.site;
  const lanes = laneGroups(world).village;
  return [VG.noon.value, 15].map((h) => {
    const ours = solarPosition(s, h);
    const r = SunCalc.getPosition(new Date(Date.UTC(s.year, s.month - 1, s.day) + (h - s.tz) * 3600e3), s.lat, s.lon);
    const ref = { alt: (r.altitude * 180) / Math.PI, az: ((r.azimuth * 180) / Math.PI + 180 + 360) % 360 };
    return { h, ours, ref, dAlt: ours.alt - ref.alt, dAz: ((ours.az - ref.az + 540) % 360) - 180, lit: mean(lanes.map((c) => laneSun(c, ours))), litRef: mean(lanes.map((c) => laneSun(c, ref))) };
  });
}

/**
 * Block 10 acceptance bands (spec #16, the brief's bands at Ta 35 C, clear).
 * Rows: {label, value, lo, hi, unit, src, inside, supp}; supplementary rows
 * are reported and not counted.
 */
export function bands10() {
  const { st, T, world, C, n } = base10();
  const rows = [];
  const add = (label, value, lo, hi, src, unit = '', o = {}) => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, supp: !!o.supp, inside: (lo === null || value >= lo - 1e-9) && (hi === null || value <= hi + 1e-9) });
  const E = st.edge;
  add(`1. Rusty corrugated iron roofs of the rooms (n ${E.rustTin.n}) at 15:00, °C`, E.rustTin.ts15, 60, 75, 'brief10', '°C');
  if (st.rooftop.rustTin) add(`1. Supplementary: rusty iron rooftop rooms (n ${st.rooftop.rustTin.n}) at 15:00, °C`, st.rooftop.rustTin.ts15, 60, 75, 'brief10', '°C', { supp: true });
  const rr = st.cool.rustRooms;
  add(`2. The painted rusty-iron rooms (n ${rr.n}): bare − newly white roof at 15:00, K`, -rr.d15, 15, 25, 'brief10', 'K');
  add(`2. Supplementary: every painted roof (n ${st.cool.all.n}, iron and galvanised): bare − newly white at 15:00, K`, -st.cool.all.d15, 15, 25, 'brief10', 'K', { supp: true });
  add(`2. Supplementary: rusty iron rooms − rooms the residents painted white years ago (weathered, n ${E.whiteTinAged.n}) at 15:00, K`, E.rustTin.ts15 - E.whiteTinAged.ts15, 15, 25, 'brief10', 'K', { supp: true });
  add(`3. Asbestos-cement roofs of the rooms (n ${E.asbestosRoof.n}) at 15:00, °C`, E.asbestosRoof.ts15, 50, 62, 'brief10', '°C');
  const L = st.lanes.village;
  add(`4. Sky view of the village lanes 1.5–3 m (n ${L.n} lane cells): mean`, L.svf, 0.03, 0.16, 'brief10');
  add('4. The same: lowest lane cell', L.svfMin, 0.03, 0.16, 'brief10');
  add('4. The same: highest lane cell', L.svfMax, 0.03, 0.16, 'brief10');
  add('4. Supplementary: the same cells on the 5 m grid (the raster, not used): mean', L.svfGrid, 0.03, 0.16, 'brief10', '', { supp: true });
  add('4. Supplementary: the brief\'s centre-line form cos(atan(2H/W)) on the same cells: mean', L.svfCentre, 0.03, 0.16, 'brief10', '', { supp: true });
  add('4. Supplementary: Market Lane (6 m)', st.lanes.market.svf, 0.03, 0.16, 'brief10', '', { supp: true });
  const nn = VG.noon.value;
  const ni = VG.night.value;
  add(`5. Village lanes at ${nn}:00: Tmrt − air, K`, L.tmrt[nn] - st.air[nn], null, 8, 'brief10', 'K');
  add(`5. The open square at ${nn}:00 (n ${st.square.nSun[nn]} sunlit cells): Tmrt − air, K`, st.square.tmrt[nn] - st.air[nn], 25, null, 'brief10', 'K');
  // solar noon (the sun's highest, 1-min scan) for the lanes, as a supplementary row
  let sn = 12;
  for (let m = 660; m <= 840; m++) if (T.sun(m / 60).alt > T.sun(sn).alt) sn = m / 60;
  const lc = laneGroups(world).village.map((c) => c.i);
  add(`5. Supplementary: village lanes at solar noon (${String(Math.floor(sn)).padStart(2, '0')}:${String(Math.round((sn % 1) * 60)).padStart(2, '0')}): Tmrt − air, K`, mean(lc.map((i) => T.tmrt(i, sn))) - T.air(sn), null, 8, 'brief10', 'K', { supp: true });
  add('5. Supplementary: village lanes at 15:00: Tmrt − air, K', L.tmrt[15] - st.air[15], null, 8, 'brief10', 'K', { supp: true });
  add('5. Supplementary: the open square at 15:00: Tmrt − air, K', st.square.tmrt[15] - st.air[15], 25, null, 'brief10', 'K', { supp: true });
  add(`6. Village lanes − the open square, Tmrt at ${ni}:00, K`, L.tmrt[ni] - st.square.tmrt[ni], 2, 6, 'brief10', 'K');
  add(`6. Supplementary: the edge's alleys − the open square, Tmrt at ${ni}:00, K`, st.lanes.edge.tmrt[ni] - st.square.tmrt[ni], 2, 6, 'brief10', 'K', { supp: true });
  add(`7. Supplementary (by construction: n calibrated to it): illustrative room air under bare rusty iron, day's peak, K above the outdoor air (n ${n.toFixed(1)} per hour)`, rr ? st.edge.rustTin.airPeak : NaN, 2, 4, 'brief10', 'K', { supp: true });
  add(`7. White paint on the painted rusty-iron rooms (n ${rr.n}): change of the illustrative room air's day's peak, K`, rr.dAirPeak, -2.5, -1, 'vellingiri2020', 'K');
  // band 8: every air-proxy value a card can show (each sheet roof, every 15 min, base and white roofs) within +-5 K
  let beyond = 0;
  let rawMax = 0;
  for (const M of [T, C]) for (const r of st.roofs) for (const h of HOURS) {
    const u = underRoof(world, M, r.b, h, n, r.cells);
    rawMax = Math.max(rawMax, Math.abs(u.airRaw));
    if (Math.abs(airShown(u.airRaw).value) > VG.airCap.value + 1e-9) beyond++;
  }
  add(`8. Illustrative room-air values shown beyond ±${VG.airCap.value} K (${st.roofs.length} sheet roofs × 96 times × 2 roof states)`, beyond, 0, 0, 'brief10');
  add('8. Supplementary: the largest raw value before the cap, K', rawMax, null, null, 'brief10', 'K', { supp: true });
  const wk = walkers10(15);
  add('Walkers at 15:00: density in shade over density in sun', wk.ratio, 2, null, 'melnikov');
  add(`People dwelling at 15:00 (n ${wk.dwellers}) whose place is in shade`, wk.shade, 0.5, null, 'melnikov');
  return rows;
}

/** Band verdicts 1-8: met if every counted row of the band is inside. */
export function bandVerdicts(rows) {
  const out = {};
  for (const r of rows) {
    const m = /^(\d+)\. /.exec(r.label);
    if (!m || r.supp) continue;
    out[m[1]] = (out[m[1]] ?? true) && r.inside;
  }
  return out;
}
