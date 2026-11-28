// estate: block 7 (older high-rise residential estate) set-up and numbers:
// the winter sunlight rule (大寒日 hours at every ground-floor sill, counted
// by casting rays to the sun every 5 min of true solar time), the July and
// 大寒 shadow geometry of the slab rows, the courtyard shade, and the
// air-conditioning condensers (heat rejected per condenser and per façade,
// exhaust temperature rise, the site's W m-2 through the day, and a small
// wall term in the condensers' plume zones that only the Tmrt of a person
// on the ground feels). The air is fixed: condenser heat never warms it.
import { runModel, sunSlots, cellMat, SIGMA, CP_AIR } from './thermal.js';
import { solarPosition, sunVector, boxShadow } from './sun.js';
import { inPoly, DEG } from './core.js';
import { ES_DRAW } from './eskit.js';

/** True if a scene is the estate block. */
export const isEstate = (scene) => !!scene.estateBlock;

// a parameter: value, source key (materials.js SOURCES), basis (materials.js BASIS), verified;
// the notes for docs/sources.md are in scripts/estate.mjs (ES_NOTES), not on the page
const v = (value, source, basis, verified = false) => ({ value, source, basis, verified });

/** Block-7 parameters (each with a source key, a basis tag and a verified flag). */
export const ES = {
  floorHeight: v(2.9, 'brief7', 'cited'),
  groundFloor: v(0, 'engine', 'engine'),
  sillHeight: v(0.9, 'db33', 'cited'),
  ruleHours: v(2, 'gb50180', 'cited'),
  ruleWindow: v('08:00-16:00', 'db33', 'cited'),
  ruleStep: v(5, 'db33', 'cited'),
  ruleSegment: v(10, 'db33', 'cited'),
  spacingK: v(1.47, 'brief7', 'interp'),
  qCool: v(3.5, 'brief7', 'cited'),
  eer: v(3.3, 'brief7', 'cited'),
  fanFlow: v(0.6, 'brief7', 'range'),
  perFlat: v(3.3, 'brief7', 'engine'),
  condensers: v('2 south + 1 north per flat', 'brief7', 'range'),
  plumeWidth: v(1.5, 'engine', 'engine'),
  wallDT: v(2, 'brief7', 'engine'),
  acProfile: v('peak 20:00-21:00', 'engine', 'engine'),
};

/** Share of the flats running their AC at each hour 0-23 (engine assumption; peak in the evening). */
export const AC_SHARE = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.4, 0.25, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.45, 0.45, 0.5, 0.6, 0.75, 0.9, 1, 1, 0.95, 0.9];
/** AC share at a (fractional) hour, linear between the hours. */
export function acShare(h) {
  const t = ((h % 24) + 24) % 24;
  const a = Math.floor(t);
  return AC_SHARE[a] + (AC_SHARE[(a + 1) % 24] - AC_SHARE[a]) * (t - a);
}

/** The 大寒 (Great Cold, 20 January) site: the same place in winter. */
export const winterSite = (site) => ({ ...site, month: 1, day: 20 });

/** True solar time (minutes) of a clock hour. */
export function solarMinutes(site, hour) {
  const p = solarPosition(site, hour);
  return hour * 60 + p.eqtime + 4 * site.lon - 60 * site.tz;
}

/** Clock hour of a true solar time (minutes), by fixed-point on the equation of time. */
export function clockOf(site, tst) {
  let h = tst / 60;
  for (let k = 0; k < 3; k++) h = (tst - solarPosition(site, h).eqtime - 4 * site.lon + 60 * site.tz) / 60;
  return h;
}

/** Sun at a true solar time (minutes). */
export const sunAtSolar = (site, tst) => solarPosition(site, clockOf(site, tst));

/** Solar times (minutes) when the sun crosses due east (morning) and due west (afternoon). */
export function ewCrossing(site) {
  const find = (a, b, target) => {
    for (let k = 0; k < 50; k++) {
      const m = (a + b) / 2;
      // the azimuth grows through the day (east in the morning, west in the afternoon)
      if (sunAtSolar(site, m).az < target) a = m;
      else b = m;
    }
    return (a + b) / 2;
  };
  return { east: find(300, 720, 90), west: find(720, 1140, 270) };
}

/** Effective height of a building for the sill rule: roof minus (ground floor + sill height). */
export const effHeight = (B) => B.h - (ES.groundFloor.value + ES.sillHeight.value);

/** True if the ray from p along d (unit, d[2] > 0) passes through box B. */
export function rayHits(p, d, B) {
  let t0 = 1e-6;
  let t1 = Infinity;
  const lo = [B.x0, B.y0, 0];
  const hi = [B.x1, B.y1, B.h];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-12) {
      if (p[a] < lo[a] || p[a] > hi[a]) return false;
      continue;
    }
    let u = (lo[a] - p[a]) / d[a];
    let w = (hi[a] - p[a]) / d[a];
    if (u > w) [u, w] = [w, u];
    if (u > t0) t0 = u;
    if (w < t1) t1 = w;
    if (t0 > t1) return false;
  }
  return true;
}

/** Ground-floor sill points of the slabs: every 2.5 m along each south face, 5 cm out, at sill height. */
export function sillPoints(world, z = ES.groundFloor.value + ES.sillHeight.value) {
  const out = [];
  for (const B of world.buildings) {
    if (B.kind !== 'slab') continue;
    const per = (B.x1 - B.x0) / B.flats;
    for (let x = B.x0 + 1.25; x < B.x1; x += 2.5) out.push({ x, y: B.y1 + 0.05, z, b: B.index, flat: Math.min(B.flats - 1, Math.floor((x - B.x0) / per)) });
  }
  return out;
}

/**
 * Sun hours at a south-facing point on a day: true solar time from t0 to t1
 * (minutes) in steps of `step` minutes, each sample standing for its step
 * (sampled at mid-step); a sample counts when the sun is up, in front of the
 * façade (south of it) and no building box is in the way (trees do not
 * count, as in the rule); only runs of at least `seg` minutes count.
 * Returns {hours, runs: [[from, to] solar minutes]}.
 */
export function sunHours(world, p, site, opts = {}) {
  const t0 = opts.t0 ?? 480;
  const t1 = opts.t1 ?? 960;
  const step = opts.step ?? ES.ruleStep.value;
  const seg = opts.seg ?? ES.ruleSegment.value;
  const suns = opts.suns ?? solarSamples(site, t0, t1, step);
  const runs = [];
  let start = null;
  const P = [p.x, p.y, p.z];
  for (let k = 0; k <= suns.length; k++) {
    let lit = false;
    if (k < suns.length) {
      const d = suns[k].d;
      if (d && d[1] > 0) {
        lit = true;
        for (const B of world.buildings) {
          if (B.index === p.b) continue;
          if (rayHits(P, d, B)) {
            lit = false;
            break;
          }
        }
      }
    }
    const t = t0 + k * step;
    if (lit && start === null) start = t;
    if (!lit && start !== null) {
      if (t - start >= seg - 1e-9) runs.push([start, t]);
      start = null;
    }
  }
  return { hours: runs.reduce((a, [x, y]) => a + (y - x), 0) / 60, runs };
}

/** Sun unit vectors at mid-step solar times t0 + (k + 0.5) step (null when the sun is down). */
export function solarSamples(site, t0, t1, step) {
  const out = [];
  for (let t = t0; t < t1 - 1e-9; t += step) {
    const s = sunAtSolar(site, t + step / 2);
    out.push({ t, alt: s.alt, az: s.az, d: s.alt > 0 ? sunVector(s.alt, s.az) : null });
  }
  return out;
}

/**
 * The sunlight rule at every ground-floor sill on 大寒 (08:00-16:00 true
 * solar time, 5-min steps, runs of >= 10 min): per sill {x, y, z, b, flat,
 * hours}, per flat the lowest of its sills, per slab the lowest, and the
 * spacing of each slab row to the row south of it (G and G / H_eff).
 */
export function ruleCheck(world, opts = {}) {
  const site = winterSite(world.scene.site);
  const pts = sillPoints(world, opts.z);
  const suns = solarSamples(site, 480, 960, ES.ruleStep.value);
  const sills = pts.map((p) => ({ ...p, hours: sunHours(world, p, site, { suns }).hours }));
  const flats = [];
  for (const B of world.buildings) {
    if (B.kind !== 'slab') continue;
    for (let f = 0; f < B.flats; f++) {
      const mine = sills.filter((s) => s.b === B.index && s.flat === f);
      flats.push({ b: B.index, flat: f, x: (mine[0].x + mine[mine.length - 1].x) / 2, y: B.y1, hours: Math.min(...mine.map((s) => s.hours)) });
    }
  }
  const slabs = world.buildings.filter((B) => B.kind === 'slab').map((B) => {
    const south = world.buildings.filter((S) => S.kind === 'slab' && S.y0 >= B.y1 && S.x0 < B.x1 && S.x1 > B.x0).sort((a, b) => a.y0 - b.y0)[0] ?? null;
    const G = south ? south.y0 - B.y1 : null;
    return { b: B.index, id: B.id, hEff: effHeight(B), south: south ? south.id : null, G, k: G !== null ? G / effHeight(south) : null, min: Math.min(...sills.filter((s) => s.b === B.index).map((s) => s.hours)) };
  });
  return { sills, flats, slabs, min: Math.min(...sills.map((s) => s.hours)) };
}

/** Noon altitude (at true solar noon) and the north shadow of a wall of height H at solar time tst, as a multiple of H. */
export function shadowDepth(site, tst = 720) {
  const s = sunAtSolar(site, tst);
  // northward component of the shadow: cos(az - 180) / tan(alt)
  return { alt: s.alt, az: s.az, depth: -Math.cos(s.az * DEG) / Math.tan(s.alt * DEG) };
}

/**
 * Model shade depth north of a slab at a sun position, from the engine's
 * building mask (2 x 2 samples per 5 m cell): the run of shaded ground
 * samples north of the slab's north face, along the sample column at the
 * slab's middle, in metres (samples x 2.5 m).
 */
export function maskDepth(world, mask, B) {
  const { n, cell } = world;
  const S = 2;
  const i = Math.floor((B.x0 + B.x1) / 2 / cell);
  const sx = 0; // first sample column of the cell
  let depth = 0;
  for (let y = B.y0 - cell / 4; y > 0; y -= cell / 2) {
    const j = Math.floor(y / cell);
    const sy = y - j * cell < cell / 2 ? 0 : 1;
    const c = j * n + i;
    if (world.bld[c] >= 0) break;
    if (!mask[c * S * S + sy * S + sx]) break;
    depth += cell / 2;
  }
  return depth;
}

/**
 * Courtyard shade cast by one slab (the courtyard's southern slab) at a sun
 * position, on the 2.5 m sample grid of the courtyard north of it (x within
 * the slab, y from the northern row's south face to the slab's north face):
 * the deepest shaded sample's distance from the slab (m) and the shaded
 * share of the courtyard depth along the middle column.
 */
export function courtShade(B, yNorth, sun) {
  const poly = boxShadow(B.x0, B.y0, B.x1, B.y1, B.h, sun);
  const out = { far: 0, mid: 0 };
  if (!poly) return out;
  const xm = Math.floor((B.x0 + B.x1) / 2 / 2.5) * 2.5 + 1.25;
  for (let x = B.x0 + 1.25; x < B.x1; x += 2.5) {
    for (let y = B.y0 - 1.25; y > yNorth; y -= 2.5) {
      if (!inPoly(poly, x, y)) continue;
      out.far = Math.max(out.far, B.y0 - y);
      if (Math.abs(x - xm) < 1e-6) out.mid += 2.5;
    }
  }
  out.share = out.mid / (B.y0 - yNorth);
  return out;
}

// ---- condensers ----------------------------------------------------------------

/** Heat one condenser rejects, kW: Q_cool (1 + 1 / EER). */
export const qRej = (qc = ES.qCool.value, eer = ES.eer.value) => qc * (1 + 1 / eer);
/** Air density at ta (deg C) and sea-level pressure, kg m-3 (ideal gas). */
export const rhoAir = (ta) => 101325 / (287.05 * (ta + 273.15));
/** Exhaust air temperature rise, K: Q_rej / (rho c_p V). */
export const exhaustDT = (ta, q = qRej(), flow = ES.fanFlow.value) => (q * 1000) / (rhoAir(ta) * CP_AIR * flow);

/** Flats in a building (residential floors x flats per floor; tower lobbies have none). */
export const flatsOf = (B) => (B.flats ? (B.floors - (B.lobby ? 1 : 0)) * B.flats : 0);

/** Plume-zone share of each face of a building: condenser stacks x plume width / face length. */
export function plumeShares(B) {
  const w = ES.plumeWidth.value;
  if (B.kind === 'slab') {
    const per = (B.x1 - B.x0) / B.flats;
    return { S: (2 * w) / per, N: w / per, E: 0, W: 0 };
  }
  if (B.kind === 'tower') {
    const s = Math.min(1, ((B.flats * 3) / 4) * w / (B.x1 - B.x0));
    return { S: s, N: s, E: s, W: s };
  }
  return { S: 0, N: 0, E: 0, W: 0 };
}

/** Site numbers at hour h: total heat rejected, kW, and per m2 of the site, W m-2. */
export function siteHeat(world, h) {
  const flats = world.buildings.reduce((a, B) => a + flatsOf(B), 0);
  const kw = flats * ES.perFlat.value * acShare(h);
  return { flats, kw, wm2: (kw * 1000) / (world.size * world.size) };
}

/** Heat on one face at hour h, kW: the face's share of its building's flats' condensers. */
export function faceKw(B, face, h) {
  const k = B.kind === 'slab' ? { S: 2 / 3, N: 1 / 3, E: 0, W: 0 }[face] : B.kind === 'tower' ? 0.25 : 0;
  return flatsOf(B) * ES.perFlat.value * acShare(h) * k;
}

/**
 * Plume share of the walls each ground cell sees: a horizon scan in 16
 * directions (as the sky view), each direction's wall view sin^2(horizon
 * elevation) taking the plume share of the face its ray entered.
 */
export function plumeField(world) {
  const { n, cell, height, bld, buildings } = world;
  const out = new Float32Array(n * n);
  const shares = buildings.map(plumeShares);
  const dirs = Array.from({ length: 16 }, (_, k) => [Math.sin((k * Math.PI) / 8), -Math.cos((k * Math.PI) / 8)]);
  for (let c = 0; c < n * n; c++) {
    if (bld[c] >= 0) continue;
    const x0 = ((c % n) + 0.5) * cell;
    const y0 = (Math.floor(c / n) + 0.5) * cell;
    let wsum = 0;
    let psum = 0;
    for (const [dx, dy] of dirs) {
      let best = 0;
      let bestShare = 0;
      let inB = -1;
      let face = 0;
      let px = x0;
      let py = y0;
      for (let t = 2.5; t <= 160; t += 2.5) {
        const x = x0 + dx * t;
        const y = y0 + dy * t;
        if (x < 0 || y < 0 || x >= world.size || y >= world.size) break;
        const k = Math.floor(y / cell) * n + Math.floor(x / cell);
        const b = bld[k];
        if (b >= 0 && b !== inB) {
          const B = buildings[b];
          face = py >= B.y1 ? 'S' : py <= B.y0 ? 'N' : px >= B.x1 ? 'E' : 'W';
        }
        inB = b;
        px = x;
        py = y;
        if (b < 0) continue;
        const e = height[k] / t;
        if (e > best) {
          best = e;
          bestShare = shares[b][face];
        }
      }
      const s2 = (best * best) / (1 + best * best); // sin^2 of the horizon elevation
      wsum += s2;
      psum += s2 * bestShare;
    }
    out[c] = wsum > 0 ? psum / wsum : 0;
  }
  return out;
}

/** Extra longwave from a wall at T_w (K) warmed by dT in its plume zones, W m-2 of plume wall. */
export const plumeLw = (tw, dT) => SIGMA * ((tw + dT) ** 4 - tw ** 4);

/**
 * The plume wall term on a model (default on in this block): the longwave
 * from the walls a ground cell sees gains plume share x sigma((T_w + dT)^4 -
 * T_w^4), dT = wallDT x the AC share at that hour. Only Thermal.lwall changes,
 * so only Tmrt (and the evaporation sum) feel it; the stored surface
 * temperatures come from the run without it. state.on switches it.
 */
export function addPlumeTerm(T, plume, state) {
  const base = T.lwall.bind(T);
  T.lwall = (i, h) => {
    const L = base(i, h);
    if (!state.on || !(plume[i] > 0)) return L;
    const tw = (T.hourConst(h).opaque / SIGMA) ** 0.25;
    return L + plume[i] * plumeLw(tw, ES.wallDT.value * acShare(h));
  };
  return T;
}

// ---- set-up ---------------------------------------------------------------------

/** Block-7 changes to a built world (once): its drawing hooks, the sill rule and the plume field. */
export function prepWorld(world) {
  if (world.estate) return world;
  world.draw = ES_DRAW; // the block's own drawing (eskit.js)
  world.estate = { rule: ruleCheck(world), plume: plumeField(world) };
  return world;
}

/** The block's model: prepared world, the plain run, and the plume wall term on it (state {on}). */
export function estateSetup(world, on = true) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  prepWorld(world);
  const t1 = typeof performance !== 'undefined' ? performance.now() : 0;
  const slots = sunSlots(world);
  const t2 = typeof performance !== 'undefined' ? performance.now() : 0;
  const state = { on };
  const model = addPlumeTerm(runModel(world, { slots }), world.estate.plume, state);
  const t3 = typeof performance !== 'undefined' ? performance.now() : 0;
  return { slots, model, plume: state, timing: { ruleMs: t1 - t0, slotsMs: t2 - t1, runMs: t3 - t2 } };
}

// ---- statistics -----------------------------------------------------------------

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];

/**
 * Cell classes (ground cells, picked by parcel and geometry before any
 * result), in the three courtyards between the slab rows, within the slab
 * columns:
 *   sillStrip - the paving in front of a slab's south face (0-10 m)
 *   lawn - the worn lawns (grass, no crown over the cell)
 *   worn - the trampled patches (bare soil)
 *   parking - the surface parking (asphalt)
 *   northPath - the paving along the next slab's north face (0-15 m from it)
 *   court - every ground cell of the courtyards (no crown)
 */
export function cellClasses(world) {
  const sc = world.scene;
  const out = { sillStrip: [], lawn: [], worn: [], parking: [], northPath: [], court: [] };
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || world.canopy[i] > 0) continue;
    const [x, y] = centre(world, i);
    const k = sc.rows.slice(0, 3).findIndex((s) => y > s && y < s + sc.gap);
    if (k < 0 || !sc.cols.some(([a, b]) => x > a && x < b)) continue;
    const s = sc.rows[k];
    const m = cellMat(world, i);
    out.court.push(i);
    if (y < s + 10) out.sillStrip.push(i);
    else if (y > s + sc.gap - 15) out.northPath.push(i);
    else if (m === 'grass') out.lawn.push(i);
    else if (m === 'drySoil') out.worn.push(i);
    else if (m === 'asphalt') out.parking.push(i);
  }
  return out;
}

/** Mean Ts / Tmrt of cells at hour h. */
export const tsMean = (T, cells, h) => mean(cells.map((i) => T.ts(i, h)));
export const tmrtMean = (T, cells, h) => mean(cells.map((i) => T.tmrt(i, h)));
/** Mean sunlit share (buildings and crowns) of cells at hour h. */
export const sunMean = (T, cells, h) => mean(cells.map((i) => T.sunlit(i, h)));

/** The block's numbers (notes, cards, docs, bands). T: the model; plume: its state {on}. */
export function estateStats(world, T, plume) {
  const C = cellClasses(world);
  const sc = world.scene;
  const site = sc.site;
  const win = winterSite(site);
  const H = sc.floor * 18;
  const slab = world.buildings.find((B) => B.id === 'slab2a');
  const hEff = effHeight(slab);
  const at = (k, h) => tsMean(T, C[k], h);
  const table = Object.fromEntries(Object.keys(C).map((k) => [k, { n: C[k].length, t12: at(k, 12), t15: at(k, 15), t23: at(k, 23), r12: tmrtMean(T, C[k], 12), r15: tmrtMean(T, C[k], 15), s12: sunMean(T, C[k], 12), s15: sunMean(T, C[k], 15), svf: mean(C[k].map((i) => world.svf[i])) }]));
  const jul = shadowDepth(site);
  const jan = shadowDepth(win);
  // with the plume term off and on: the Tmrt it adds (largest over ground cells and hours 0-23)
  let dMax = 0;
  let dAt = null;
  const was = plume.on;
  const ground = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && world.estate.plume[i] > 0) ground.push(i);
  const sample = ground.filter((_, k) => k % 3 === 0);
  const dCourt = [];
  for (const h of [3, 12, 15, 21]) {
    plume.on = false;
    const off = sample.map((i) => T.tmrt(i, h));
    plume.on = true;
    const on = sample.map((i) => T.tmrt(i, h));
    sample.forEach((i, k) => {
      const d = on[k] - off[k];
      if (d > dMax) [dMax, dAt] = [d, { i, h }];
    });
    if (h === 21) {
      plume.on = false;
      const a = tmrtMean(T, C.court, 21);
      plume.on = true;
      dCourt.push(tmrtMean(T, C.court, 21) - a);
    }
  }
  plume.on = was;
  const heat = Array.from({ length: 24 }, (_, h) => ({ h, share: acShare(h), ...siteHeat(world, h) }));
  const peak = heat.reduce((a, b) => (b.wm2 > a.wm2 ? b : a));
  return {
    C, table, H, hEff, jul, jan,
    rule: world.estate.rule,
    air: { t12: T.air(12), t15: T.air(15), t21: T.air(21), t23: T.air(23) },
    heat, peak,
    qRej: qRej(), dtExh: exhaustDT(T.air(15)), dtExhNight: exhaustDT(T.air(23)),
    plumeMax: dMax, plumeAt: dAt, plumeCourt21: dCourt[0],
    plumeShare: { max: Math.max(...ground.map((i) => world.estate.plume[i])), mean: mean(C.court.map((i) => world.estate.plume[i])) },
  };
}

/**
 * Tmrt against sky view at hour h: the least-squares slope over building-shaded,
 * crown-free paved ground cells (concrete, asphalt), K per unit SVF (band 5).
 */
export function svfSlope(world, T, h = 15) {
  const xs = [];
  const ys = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || world.canopy[i] > 0) continue;
    if (T.sunlit(i, h) > 0.05) continue;
    const m = cellMat(world, i);
    if (m !== 'concrete' && m !== 'asphalt') continue;
    xs.push(world.svf[i]);
    ys.push(T.tmrt(i, h));
  }
  const mx = xs.reduce((a, x) => a + x, 0) / xs.length;
  const my = ys.reduce((a, x) => a + x, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  xs.forEach((x, k) => {
    sxy += (x - mx) * (ys[k] - my);
    sxx += (x - mx) ** 2;
  });
  return { n: xs.length, slope: sxy / sxx, svf: [Math.min(...xs), Math.max(...xs)] };
}

/** Hours of 大寒 sun at the sill points of one slab (for the cards): {min, mean}. */
export function slabRule(world, id) {
  const B = world.buildings.find((b) => b.id === id);
  const s = world.estate.rule.sills.filter((p) => p.b === B.index);
  return { min: Math.min(...s.map((p) => p.hours)), mean: mean(s.map((p) => p.hours)) };
}
