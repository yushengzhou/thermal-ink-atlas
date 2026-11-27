// thermal: force-restore surface energy balance on a 5 m grid.
// dTs/dt = (2 sqrt(pi) / (mu sqrt(tau))) G - (2 pi / tau) (Ts - Td)   (Deardorff 1978)
// G = (1-a) K + e L_down - e s Ts^4 - hc (Ts - Ta) - EF max(Q*, 0)
// Thin layers (sheet metal) use dTs/dt = G / C instead (no restore term).
// Computed once at load with 1-min steps, repeating the design day until the
// deep temperature Td converges (max change < 0.05 K, at least 3 days), and
// stored at 15-min resolution for the last day; seek() only looks values up.
//
// Shortwave on a cell: K = sunlit I sin(beta) + SVF D + K_wr + r I sin(beta).
//   K_wr = a_w (1 - SVF_open) c K_wall is sunlight reflected diffusely by the
//   opaque walls the cell sees (all blocks; a_w = MODEL.wallAlbedo, c the
//   crown cover factor, glass walls excluded), with
//   K_wall = f_lit I cos(beta) / pi + 0.5 D + 0.5 a_g G (a_g the cell's albedo,
//   G = I sin(beta) + D unshaded);
//   r is the specular reflection off sunlit glass (block 3, reflect.js).
// Longwave from the walls: opaque walls at T_wall (engine assumption below),
// glass walls at T_g (reflect.js glassTemp) with emissivity eps_g, reflecting
// the air temperature for the rest.
import { MATERIALS, MODEL, GLASS } from './materials.js';
import { solarPosition, boxShadow, canopyShadow, rasterise, sunVector } from './sun.js';
import { lerp, hexRgb, DEG } from './core.js';
import { glassTemp, FACE_N, FACES } from './reflect.js';

export const SIGMA = 5.670374e-8;
const TAU = 86400;
const K0 = 273.15;
export const SLOTS = 144; // sun / shade samples per day (10 min)
export const STORE = 96; // stored temperature samples per day (15 min)
export const LATENT = 2.45e6; // latent heat of vaporisation, J kg-1

/** Prescribed water kinds: 1 pond of blocks 1-3 ('water'), 2 river, 3 still pond (block 4). */
export const WATER_KIND = { water: 1, river: 2, pond: 3 };
export const isWater = (id) => !!WATER_KIND[id];

/**
 * Prescribed water surface temperature (deg C) of a water kind at clock hour
 * h, for the daily mean air temperature taMean:
 *   water (blocks 1-3): taMean - 1 + sin(2 pi (h - 9) / 24)
 *   river (block 4):    taMean - 2 + 0.5 sin(2 pi (h - 9) / 24)
 *   pond (block 4):     taMean - 0.5 + 2 sin(2 pi (h - 10) / 24)
 */
export function waterTemp(kind, taMean, h) {
  if (kind === 2) return taMean - 2 + 0.5 * Math.sin((2 * Math.PI * (h - 9)) / 24);
  if (kind === 3) return taMean - 0.5 + 2 * Math.sin((2 * Math.PI * (h - 10)) / 24);
  return taMean - 1 + Math.sin((2 * Math.PI * (h - 9)) / 24);
}

/** Sunrise and sunset clock hours for the site (scan at 1-min steps). */
export function daylight(site) {
  let rise = 6;
  let set = 18;
  let prev = solarPosition(site, 0).alt;
  for (let m = 1; m <= 1440; m++) {
    const a = solarPosition(site, m / 60).alt;
    if (prev <= 0 && a > 0) rise = m / 60;
    if (prev > 0 && a <= 0) set = m / 60;
    prev = a;
  }
  return { rise, set };
}

/**
 * Air temperature (deg C): cosine rise from taMin at sunrise to taMax at
 * 15:00, cosine fall to the next sunrise.
 */
export function airTemp(site, hour, rise) {
  const { taMin, taMax } = site;
  const h = ((hour % 24) + 24) % 24;
  if (h >= rise && h <= 15) return taMin + ((taMax - taMin) * (1 - Math.cos((Math.PI * (h - rise)) / (15 - rise)))) / 2;
  const hh = h < rise ? h + 24 : h;
  return taMax - ((taMax - taMin) * (1 - Math.cos((Math.PI * (hh - 15)) / (rise + 24 - 15)))) / 2;
}

/** Clear-sky beam (normal) and diffuse (horizontal) irradiance, W m-2. */
export function irradiance(altDeg) {
  if (altDeg <= 0) return { beam: 0, diffuse: 0 };
  const sinb = Math.sin(altDeg * DEG);
  const am = 1 / Math.max(sinb, 0.05);
  const beam = 1361 * Math.pow(0.7, Math.pow(am, 0.678)); // Meinel & Meinel
  return { beam, diffuse: MODEL.diffuseFraction.value * beam * sinb };
}

/** Brutsaert (1975) clear-sky emissivity. ea in hPa, Ta in K. */
export const skyEmissivity = (eaHpa, taK) => 1.24 * Math.pow(eaHpa / taK, 1 / 7);

/**
 * Sky view factor at (x, y, z0) by horizon scan: SVF = mean over azimuths of
 * cos^2(horizon elevation). heightAt(x, y) returns obstacle height (m).
 * onDir(dx, dy, tanHorizon, dist) is called per direction with the sample
 * that sets the horizon (dist 0 if the horizon is open).
 */
export function svfAt(heightAt, x, y, z0, nDirs = 16, maxDist = 160, step = 2.5, onDir = null) {
  let sum = 0;
  for (let k = 0; k < nDirs; k++) {
    const a = ((k + 0.5) / nDirs) * 2 * Math.PI;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0; // tan of horizon angle
    let bestD = 0;
    for (let d = step; d <= maxDist; d += step) {
      const h = heightAt(x + dx * d, y + dy * d) - z0;
      if (h > 0) {
        const t = h / d;
        if (t > best) {
          best = t;
          bestD = d;
        }
      }
    }
    sum += 1 / (1 + best * best); // cos^2(atan(best))
    if (onDir) onDir(dx, dy, best, bestD);
  }
  return sum / nDirs;
}

/** Shadow polygons for all buildings and trees at a sun position. */
export function shadowPolys(world, sun, zFloor = 0) {
  const b = [];
  for (const B of world.buildings) {
    if (B.h <= zFloor) continue;
    b.push(boxShadow(B.x0, B.y0, B.x1, B.y1, B.h - zFloor, sun));
  }
  if (zFloor === 0) for (const A of world.awnings ?? []) b.push(boxShadow(A.x0, A.y0, A.x1, A.y1, A.z1, sun, A.z0));
  const t = [];
  for (const T of world.trees) t.push(canopyShadow(T.x, T.y, T.zc, T.r, sun));
  return { b, t };
}

/**
 * Building shade mask for one sun position: 2x2 samples per cell, 1 where a
 * building (or awning) shades the ground or a taller building shades a roof.
 */
export function buildingMask(world, sun) {
  const { n, cell } = world;
  const N = n * n;
  const S = 2;
  const grid = { nx: n, ny: n, cell };
  const bmask = new Uint8Array(N * S * S);
  const { b } = shadowPolys(world, sun);
  rasterise(b, grid, (i, p, s) => {
    const bi = world.bld[i];
    if (bi < 0) bmask[i * S * S + s] = 1; // ground cells only
  }, S);
  // roofs shaded by taller neighbours
  for (let r = 0; r < world.buildings.length; r++) {
    const R = world.buildings[r];
    const polys = [];
    for (const B of world.buildings) {
      if (B.h > R.h + 0.5) polys.push(boxShadow(B.x0, B.y0, B.x1, B.y1, B.h - R.h, sun));
    }
    if (!polys.length) continue;
    // only the roof's own cells can be marked: visit just its cell window
    const win = [Math.floor(R.x0 / cell), Math.floor(R.y0 / cell), Math.min(n - 1, Math.floor(R.x1 / cell)), Math.min(n - 1, Math.floor(R.y1 / cell))];
    rasterise(polys, grid, (i, p, s) => {
      if (world.bld[i] === r) bmask[i * S * S + s] = 1;
    }, S, win);
  }
  return bmask;
}

/**
 * Sunlit fraction per grid cell for one sun position (1 = full sun).
 * Building shade is opaque; canopy shade transmits MODEL.canopyTransmission,
 * or the tree's own `tr` (young street trees). `bmask` may be passed in from
 * another world with the same buildings (Before / After states).
 */
export function sunlitField(world, sun, bmask = null) {
  const { n, cell } = world;
  const N = n * n;
  const out = new Float32Array(N);
  if (sun.alt <= 0) return out;
  out.fill(1);
  const S = 2; // 2x2 samples per cell
  const grid = { nx: n, ny: n, cell };
  const bm = bmask ?? buildingMask(world, sun);
  const t = world.trees.map((T) => canopyShadow(T.x, T.y, T.zc, T.r, sun));
  const tr = MODEL.canopyTransmission.value;
  if (world.trees.some((T) => T.tr !== undefined)) {
    // per-tree transmission: multiply per sample, at most three crowns deep
    // as for the uniform case
    const trans = new Float64Array(N * S * S).fill(1);
    const deep = new Uint8Array(N * S * S);
    rasterise(t, grid, (i, p, s) => {
      const k = i * S * S + s;
      if (world.bld[i] < 0 && deep[k] < 3) {
        deep[k]++;
        trans[k] *= world.trees[p].tr ?? tr;
      }
    }, S);
    for (let i = 0; i < N; i++) {
      let f = 0;
      for (let s = 0; s < S * S; s++) {
        const k = i * S * S + s;
        if (!bm[k]) f += trans[k];
      }
      out[i] = f / (S * S);
    }
    return out;
  }
  const tcount = new Uint8Array(N * S * S);
  rasterise(t, grid, (i, p, s) => {
    if (world.bld[i] < 0 && tcount[i * S * S + s] < 3) tcount[i * S * S + s]++;
  }, S);
  for (let i = 0; i < N; i++) {
    let f = 0;
    for (let s = 0; s < S * S; s++) {
      const k = i * S * S + s;
      if (!bm[k]) f += Math.pow(tr, tcount[k]);
    }
    out[i] = f / (S * S);
  }
  return out;
}

/** Fine shade-class raster (0 sun, 1 building shade, 2 tree shade). */
export function shadeClassField(world, sun, cell = 2) {
  const n = Math.round(world.size / cell);
  const out = new Uint8Array(n * n);
  if (sun.alt <= 0) return { n, cell, cls: out, night: true };
  const { b, t } = shadowPolys(world, sun);
  const grid = { nx: n, ny: n, cell };
  rasterise(t, grid, (i) => {
    out[i] = 2;
  });
  rasterise(b, grid, (i) => {
    out[i] = 1;
  });
  return { n, cell, cls: out, night: false };
}

/**
 * Precompute sun positions and sunlit fields for every 10-min slot. With
 * keepMasks the building masks are kept (slots.masks) so a second world with
 * the same buildings can reuse them: sunSlots(worldB, { masksFrom: slotsA }).
 */
export function sunSlots(world, opts = {}) {
  const site = world.scene.site;
  const suns = [];
  const fields = [];
  const masks = opts.keepMasks ? [] : null;
  for (let k = 0; k < SLOTS; k++) {
    const h = (k * 24) / SLOTS;
    const s = solarPosition(site, h);
    suns.push(s);
    const bm = s.alt <= 0 ? null : opts.masksFrom ? opts.masksFrom.masks[k] : opts.keepMasks ? buildingMask(world, s) : null;
    if (masks) masks.push(bm);
    fields.push(sunlitField(world, s, bm));
  }
  return masks ? { suns, fields, masks } : { suns, fields };
}

/** Effective material for a cell: roof material for building cells. */
export function cellMat(world, i) {
  const b = world.bld[i];
  if (b >= 0) return world.buildings[b].roof;
  return world.matIds[world.mat[i]];
}

/**
 * Run the force-restore model. Returns a Thermal object with hourly lookups.
 * @param {object} world from buildWorld()
 * @param {object} [opts] {minDays: 3, maxDays: 30, tol: 0.05 K, dt: 60,
 *   materials: override table (sensitivity runs), slots: reuse sun slots}
 */
export function runModel(world, opts = {}) {
  const minDays = opts.minDays ?? 3;
  const maxDays = opts.maxDays ?? 30;
  const tol = opts.tol ?? 0.05;
  const mats = opts.materials ?? MATERIALS;
  const dt = opts.dt ?? 60;
  const site = world.scene.site;
  const { n } = world;
  const N = n * n;
  const { rise } = daylight(site);
  const slots = opts.slots ?? sunSlots(world);
  // opts.wind (block 4 presets) overrides the site wind speed u_site
  const uSite = opts.wind ?? site.wind;
  const hc = 5.7 + 3.8 * uSite;
  // block 4: per-cell wind factor f_w (wind.js) -> h_c = 5.7 + 3.8 u_site f_w.
  // Blocks without a wind direction have no f_w and keep the scalar h_c.
  const fwFull = opts.fw ?? world.fw ?? null;
  const tauFac = (2 * Math.PI) / TAU;
  const sqrtTau = Math.sqrt(TAU);
  // block 3: specular reflection fields per slot (reflect.js reflectFor) and the glass type
  const reflFull = opts.refl ?? null;
  const glass = opts.glass ?? null;

  // optional subset of cells (opts.cells): the model runs on a compact copy
  // of their inputs and the result is scattered back (other cells stay 0;
  // see retrofit.js). The arithmetic per cell is the same either way.
  const idx = opts.cells ?? null;
  const NF = N;
  const NN = idx ? idx.length : N;
  const fields = idx ? slots.fields.map((f) => Float32Array.from(idx, (i) => f[i])) : slots.fields;
  const refl = reflFull ? (idx ? reflFull.map((f) => (f ? Float32Array.from(idx, (i) => f[i]) : null)) : reflFull) : null;
  // per-cell parameters
  const alpha = new Float32Array(NN);
  const eps = new Float32Array(NN);
  const cap = new Float32Array(NN); // 2 sqrt(pi) / (mu sqrt(tau)), or 1 / C for thin layers
  const restore = new Float32Array(NN); // 2 pi / tau, or 0 for thin layers
  const ef = new Float32Array(NN);
  const water = new Uint8Array(NN);
  for (let i = 0; i < NN; i++) {
    const id = cellMat(world, idx ? idx[i] : i);
    const m = mats[id];
    water[i] = WATER_KIND[id] ?? 0;
    if (water[i]) continue; // prescribed temperature
    alpha[i] = m.alpha.value;
    eps[i] = m.eps.value;
    ef[i] = m.ef.value;
    if (m.thinC) {
      cap[i] = 1 / m.thinC.value;
      restore[i] = 0;
    } else if (m.mu && m.mu.value > 0) {
      cap[i] = (2 * Math.sqrt(Math.PI)) / (m.mu.value * sqrtTau);
      restore[i] = tauFac;
    } else throw new Error(`material ${id} has neither mu > 0 nor thinC`);
  }
  const svf = idx ? Float32Array.from(idx, (i) => world.svf[i]) : world.svf;
  // wall reflection coefficients: K_wr = cw kw0 + cwa kwG (see the header)
  const cw = new Float32Array(NN);
  const cwa = new Float32Array(NN);
  // glass share of the wall view per orientation (block 3): g0..g3 (S, N, E, W), gOpaque = 1 - sum
  const gv = world.gview ? [0, 1, 2, 3].map(() => new Float64Array(NN)) : null;
  const gOpaque = gv ? new Float64Array(NN) : null;
  for (let i = 0; i < NN; i++) {
    const c = idx ? idx[i] : i;
    let g = 0;
    if (gv) {
      for (let o = 0; o < 4; o++) {
        gv[o][i] = world.gview[c * 4 + o];
        g += gv[o][i];
      }
      gOpaque[i] = 1 - g;
    }
    cw[i] = wallReflectCoef(world, c) * (1 - g);
    cwa[i] = cw[i] * alpha[i];
  }
  const [g0, g1, g2, g3] = gv ?? [];
  // per-cell h_c (block 4) and whether any river / still-pond cell exists
  let hcA = null;
  if (fwFull) {
    if (gv) throw new Error('per-cell wind is not supported together with glass walls');
    hcA = new Float64Array(NN);
    for (let i = 0; i < NN; i++) hcA[i] = 5.7 + 3.8 * uSite * fwFull[idx ? idx[i] : i];
  }
  const kinds = water.some((k) => k > 1);

  // per-minute forcing
  const M = 1440;
  const ta = new Float32Array(M);
  const beamH = new Float32Array(M); // beam on horizontal
  const dif = new Float32Array(M);
  const kw0 = new Float32Array(M); // K_wall without the ground-reflected part
  const kwG = new Float32Array(M); // 0.5 G (times the cell albedo)
  const lglass = gv ? new Float32Array(M * 4) : null; // L from glass walls per orientation
  let taSum = 0;
  for (let m = 0; m < M; m++) {
    const h = m / 60;
    ta[m] = airTemp(site, h, rise);
    taSum += ta[m];
    const s = solarPosition(site, h);
    const ir = irradiance(s.alt);
    beamH[m] = ir.beam * Math.max(0, Math.sin(s.alt * DEG));
    dif[m] = ir.diffuse;
    const w = wallShortwave(ir, s);
    kw0[m] = w.k0;
    kwG[m] = w.kG;
    if (lglass) for (let o = 0; o < 4; o++) lglass[m * 4 + o] = glassLongwave(glass, ta[m], ir, s, FACES[o]);
  }
  const taMean = taSum / M;

  const Ts = new Float32Array(NN).fill(taMean + K0);
  const Td = new Float32Array(NN).fill(taMean + K0);
  const sumDay = new Float64Array(NN);
  let store = new Float32Array(NN * STORE);
  const stepsPerStore = M / STORE;

  // per-cell inputs and state for the step functions (one minute, all cells)
  const C = { NN, water, svf, alpha, eps, cap, restore, ef, cw, cwa, Ts, Td, sumDay, hc, hcA, dt, gOpaque, g0, g1, g2, g3, wt: new Float64Array(4) };
  let days = 0;
  let maxDelta = Infinity;
  /** One design day with steps of stepMin minutes; returns max |change of Td| over cells. */
  const runDay = (stepMin, keep) => {
    sumDay.fill(0);
    C.dt = stepMin * 60;
    for (let m = 0; m < M; m += stepMin) {
      const h = m / 60;
      const taK = ta[m] + K0;
      const ta4 = taK * taK * taK * taK;
      // walls seen from the ground: air + 2 K plus a sun term by day that
      // peaks at midday (engine assumption; ignores wall orientation; the peak
      // value is computed in docs/sources.md)
      const tw = wallTemp(taK, beamH[m] + dif[m]);
      const tw4 = tw * tw * tw * tw;
      const lsky = skyEmissivity(site.vapourHpa, taK) * SIGMA * ta4;
      const lwall = SIGMA * tw4;
      const sf = (m / 10) | 0; // slot index
      const st = (m % 10) / 10;
      const f0 = fields[sf];
      const f1 = fields[(sf + 1) % SLOTS];
      const r0 = refl ? refl[sf] : null;
      const r1 = refl ? refl[(sf + 1) % SLOTS] : null;
      const bh = beamH[m];
      const df = dif[m];
      const k0 = kw0[m];
      const kg = kwG[m];
      const waterT = taMean - 1 + Math.sin((2 * Math.PI * (h - 9)) / 24) + K0;
      if (gv) stepGlass(C, f0, f1, st, r0, r1, bh, df, k0, kg, lsky, lwall, lglass[m * 4], lglass[m * 4 + 1], lglass[m * 4 + 2], lglass[m * 4 + 3], taK, waterT);
      else if (hcA || kinds) {
        for (let k = 1; k <= 3; k++) C.wt[k] = waterTemp(k, taMean, h) + K0;
        stepWind(C, f0, f1, st, bh, df, k0, kg, lsky, lwall, taK);
      } else stepPlain(C, f0, f1, st, bh, df, k0, kg, lsky, lwall, taK, waterT);
      if (keep && m % stepsPerStore === 0) {
        const k = m / stepsPerStore;
        for (let i = 0; i < NN; i++) store[i * STORE + k] = Ts[i] - K0;
      }
    }
    const steps = M / stepMin;
    let md = 0;
    for (let i = 0; i < NN; i++) {
      const next = sumDay[i] / steps;
      if (!water[i]) md = Math.max(md, Math.abs(next - Td[i]));
      Td[i] = next;
    }
    return md;
  };
  // opts.warm (block 3): this many coarse days (10-min steps) first, to bring
  // the deep temperature close before the 1-min days; the convergence test
  // below is unchanged and counts only 1-min days (still at least minDays).
  // Guard: the coarse step is explicit, so it is used only where it is
  // comfortably stable: max over cells of 600 s x (cap (4 eps sigma T^3 + hc)
  // + restore) < 0.5 with T = 340 K (membrane roofs 0.31; thin metal roofs
  // about 0.96, so a block with them falls back to the plain start).
  const warmFactor = opts.warm ? coarseStability(C, 600) : 0;
  const warmUsed = !!opts.warm && warmFactor < 0.5;
  if (warmUsed) for (let k = 0; k < opts.warm; k++) runDay(10, false);
  while (days < maxDays && (days < minDays || maxDelta >= tol)) {
    maxDelta = runDay(dt / 60, true);
    days++;
  }
  if (idx) {
    const full = new Float32Array(NF * STORE);
    idx.forEach((i, c) => full.set(store.subarray(c * STORE, (c + 1) * STORE), i * STORE));
    store = full;
  }
  return new Thermal(world, store, slots, { rise, taMean, hc, fw: fwFull, wind: uSite, site, ta, days, maxDelta, mats, cells: idx, refl: reflFull, glass, warm: warmUsed ? opts.warm : 0, warmFactor });
}

/** Largest explicit-step stability factor over the cells for a step of dtS seconds (T = 340 K). */
export function coarseStability(C, dtS) {
  const T3 = 340 ** 3;
  let max = 0;
  for (let i = 0; i < C.NN; i++) {
    if (C.water[i]) continue;
    max = Math.max(max, dtS * (C.cap[i] * (4 * C.eps[i] * SIGMA * T3 + (C.hcA ? C.hcA[i] : C.hc)) + C.restore[i]));
  }
  return max;
}

/** One model minute for every cell (blocks without glass). */
function stepPlain(C, f0, f1, st, bh, df, k0, kg, lsky, lwall, taK, waterT) {
  const { NN, water, svf, alpha, eps, cap, restore, ef, cw, cwa, Ts, Td, sumDay, hc, dt } = C;
  for (let i = 0; i < NN; i++) {
    if (water[i]) {
      Ts[i] = waterT;
    } else {
      const sl = f0[i] + (f1[i] - f0[i]) * st;
      const v = svf[i];
      const K = sl * bh + v * df + cw[i] * k0 + cwa[i] * kg;
      const L = v * lsky + (1 - v) * lwall;
      const t = Ts[i];
      const t4 = t * t * t * t;
      const qstar = (1 - alpha[i]) * K + eps[i] * L - eps[i] * SIGMA * t4;
      const G = qstar - hc * (t - taK) - (qstar > 0 ? ef[i] * qstar : 0);
      Ts[i] = t + dt * (cap[i] * G - restore[i] * (t - Td[i]));
    }
    sumDay[i] += Ts[i];
  }
}

/**
 * One model minute for every cell with a per-cell h_c and / or several water
 * kinds (block 4). The same arithmetic as stepPlain, with hcA[i] for hc (or
 * the scalar hc when there is no wind factor) and C.wt[kind] for the water.
 */
function stepWind(C, f0, f1, st, bh, df, k0, kg, lsky, lwall, taK) {
  const { NN, water, svf, alpha, eps, cap, restore, ef, cw, cwa, Ts, Td, sumDay, hc, hcA, dt, wt } = C;
  for (let i = 0; i < NN; i++) {
    if (water[i]) {
      Ts[i] = wt[water[i]];
    } else {
      const sl = f0[i] + (f1[i] - f0[i]) * st;
      const v = svf[i];
      const K = sl * bh + v * df + cw[i] * k0 + cwa[i] * kg;
      const L = v * lsky + (1 - v) * lwall;
      const t = Ts[i];
      const t4 = t * t * t * t;
      const qstar = (1 - alpha[i]) * K + eps[i] * L - eps[i] * SIGMA * t4;
      const h = hcA ? hcA[i] : hc;
      const G = qstar - h * (t - taK) - (qstar > 0 ? ef[i] * qstar : 0);
      Ts[i] = t + dt * (cap[i] * G - restore[i] * (t - Td[i]));
    }
    sumDay[i] += Ts[i];
  }
}

/** One model minute for every cell of a glass block: adds the specular term and glass walls. */
function stepGlass(C, f0, f1, st, r0, r1, bh, df, k0, kg, lsky, lwall, L0, L1, L2, L3, taK, waterT) {
  const { NN, water, svf, alpha, eps, cap, restore, ef, cw, cwa, Ts, Td, sumDay, hc, dt, gOpaque, g0, g1, g2, g3 } = C;
  const a0 = r0 ? (1 - st) * bh : 0;
  const a1 = r1 ? st * bh : 0;
  for (let i = 0; i < NN; i++) {
    if (water[i]) {
      Ts[i] = waterT;
    } else {
      const sl = f0[i] + (f1[i] - f0[i]) * st;
      const v = svf[i];
      let K = sl * bh + v * df + cw[i] * k0 + cwa[i] * kg;
      if (r0) K += r0[i] * a0;
      if (r1) K += r1[i] * a1;
      const lw = gOpaque[i] * lwall + g0[i] * L0 + g1[i] * L1 + g2[i] * L2 + g3[i] * L3;
      const L = v * lsky + (1 - v) * lw;
      const t = Ts[i];
      const t4 = t * t * t * t;
      const qstar = (1 - alpha[i]) * K + eps[i] * L - eps[i] * SIGMA * t4;
      const G = qstar - hc * (t - taK) - (qstar > 0 ? ef[i] * qstar : 0);
      Ts[i] = t + dt * (cap[i] * G - restore[i] * (t - Td[i]));
    }
    sumDay[i] += Ts[i];
  }
}

/** Opaque wall temperature seen from the ground (engine assumption): Ta + 2 K + 6 K x (K/900). taK in K. */
export const wallTemp = (taK, kGlobal) => taK + 2 + (6 * kGlobal) / 900;

/**
 * Wall-reflection coefficient of cell i: a_w (1 - SVF_open), times the crown
 * factor (1 - 0.75 cover) under trees as for the sky. Glass walls are taken
 * out by the caller (they reflect specularly, see reflect.js).
 */
export function wallReflectCoef(world, i) {
  const open = world.svfOpen ? world.svfOpen[i] : world.svf[i];
  const crown = world.bld[i] < 0 ? 1 - 0.75 * world.canopy[i] : 1;
  return MODEL.wallAlbedo.value * Math.max(0, 1 - open) * crown;
}

/** Shortwave on a wall (azimuth mean): k0 = f_lit I cos(beta) / pi + 0.5 D; kG = 0.5 G (times ground albedo). */
export function wallShortwave(ir, sun) {
  if (sun.alt <= 0) return { k0: 0, kG: 0 };
  const sinb = Math.sin(sun.alt * DEG);
  const cosb = Math.cos(sun.alt * DEG);
  return { k0: (MODEL.wallLit.value * ir.beam * cosb) / Math.PI + 0.5 * ir.diffuse, kG: 0.5 * (ir.beam * sinb + ir.diffuse) };
}

/** Longwave from a glass wall of one orientation: eps_g sigma Tg^4 + (1 - eps_g) sigma Ta^4 (W m-2). */
export function glassLongwave(glass, ta, ir, sun, face) {
  const g = GLASS[glass ?? 'lowe'];
  let cosT = 0;
  if (sun.alt > 0) {
    const sv = sunVector(sun.alt, sun.az);
    const nn = FACE_N[face];
    cosT = sv[0] * nn[0] + sv[1] * nn[1];
  }
  const tg = glassTemp(ta, ir.beam, ir.diffuse, cosT, g.absorb.value) + K0;
  const e = g.eps.value;
  const taK = ta + K0;
  return e * SIGMA * tg ** 4 + (1 - e) * SIGMA * taK ** 4;
}

export class Thermal {
  constructor(world, store, slots, info) {
    this.world = world;
    this.store = store;
    this.slots = slots;
    this.info = info;
  }

  /** Wind factor f_w of cell i (1 for blocks without a wind direction). */
  fw(i) {
    return this.info.fw ? this.info.fw[i] : 1;
  }

  /** Convective coefficient h_c of cell i, W m-2 K-1 (as in runModel). */
  hcAt(i) {
    return this.info.fw ? 5.7 + 3.8 * this.info.wind * this.info.fw[i] : this.info.hc;
  }

  /** Air temperature at clock hour h. */
  air(h) {
    return airTemp(this.info.site, h, this.info.rise);
  }

  /** Surface temperature (deg C) of grid cell i at hour h. */
  ts(i, h) {
    const x = ((((h % 24) + 24) % 24) * STORE) / 24;
    const k = Math.floor(x);
    const f = x - k;
    const a = this.store[i * STORE + (k % STORE)];
    const b = this.store[i * STORE + ((k + 1) % STORE)];
    return a + (b - a) * f;
  }

  /** Surface temperature at a world point. */
  tsAt(x, y, h) {
    return this.ts(this.world.cellIndex(x, y), h);
  }

  /** Whole surface field at hour h (Float32Array n*n). */
  field(h) {
    const N = this.world.n * this.world.n;
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = this.ts(i, h);
    return out;
  }

  sun(h) {
    return solarPosition(this.info.site, h);
  }

  /** Sunlit fraction of cell i at hour h (interpolated between slots). */
  sunlit(i, h) {
    const x = ((((h % 24) + 24) % 24) * SLOTS) / 24;
    const k = Math.floor(x) % SLOTS;
    const f = x - Math.floor(x);
    return lerp(this.slots.fields[k][i], this.slots.fields[(k + 1) % SLOTS][i], f);
  }

  /** Specular reflected beam fraction r at cell i, hour h (block 3; 0 elsewhere). */
  refl(i, h) {
    const R = this.info.refl;
    if (!R) return 0;
    const x = ((((h % 24) + 24) % 24) * SLOTS) / 24;
    const k = Math.floor(x) % SLOTS;
    const f = x - Math.floor(x);
    const a = R[k] ? R[k][i] : 0;
    const b = R[(k + 1) % SLOTS] ? R[(k + 1) % SLOTS][i] : 0;
    return a + (b - a) * f;
  }

  /** Glass share of the walls cell i sees (all orientations). */
  glassShare(i) {
    const g = this.world.gview;
    return g ? g[i * 4] + g[i * 4 + 1] + g[i * 4 + 2] + g[i * 4 + 3] : 0;
  }

  /**
   * Shortwave parts on cell i at hour h, W m-2: direct (sunlit beam), sky
   * (diffuse), walls (diffuse wall reflection K_wr), glass (specular
   * reflection), and their sum K, as in runModel.
   */
  shortwave(i, h) {
    const H = this.hourConst(h);
    const mat = (this.info.mats ?? MATERIALS)[cellMat(this.world, i)];
    const c = wallReflectCoef(this.world, i) * (1 - this.glassShare(i));
    const direct = this.sunlit(i, h) * H.bh;
    const sky = this.world.svf[i] * H.ir.diffuse;
    const walls = c * (H.w.k0 + mat.alpha.value * H.w.kG);
    const r = this.refl(i, h);
    const glass = r * H.bh;
    return { direct, sky, walls, glass, r, K: direct + sky + walls + glass, beam: H.ir.beam, diffuse: H.ir.diffuse, sun: H.sun };
  }

  /**
   * Per-hour constants (sun, irradiance, wall shortwave, opaque and glass wall
   * longwave, sky longwave), cached: the same arithmetic as before, done once
   * per hour instead of once per cell.
   */
  hourConst(h) {
    if (!this._hc) this._hc = new Map();
    let H = this._hc.get(h);
    if (H) return H;
    const sun = this.sun(h);
    const ir = irradiance(sun.alt);
    const ta = this.air(h);
    const taK = ta + K0;
    const bh = ir.beam * Math.max(0, Math.sin(sun.alt * DEG));
    H = {
      sun,
      ir,
      ta,
      taK,
      bh,
      w: wallShortwave(ir, sun),
      opaque: SIGMA * wallTemp(taK, bh + ir.diffuse) ** 4,
      lsky: skyEmissivity(this.info.site.vapourHpa, taK) * SIGMA * taK ** 4,
      glassL: this.world.gview ? FACES.map((f) => glassLongwave(this.info.glass, ta, ir, sun, f)) : null,
    };
    if (this._hc.size > 200) this._hc.delete(this._hc.keys().next().value);
    this._hc.set(h, H);
    return H;
  }

  /** Longwave from the walls cell i sees (W m-2), as in runModel. */
  lwall(i, h) {
    const H = this.hourConst(h);
    const g = this.world.gview;
    if (!g) return H.opaque;
    let out = (1 - this.glassShare(i)) * H.opaque;
    for (let o = 0; o < 4; o++) if (g[i * 4 + o] > 0) out += g[i * 4 + o] * H.glassL[o];
    return out;
  }

  /** Glass outer-surface temperature (deg C) of a façade orientation at hour h. */
  glassTemp(face, h) {
    const s = this.sun(h);
    const ir = irradiance(s.alt);
    let cosT = 0;
    if (s.alt > 0) {
      const sv = sunVector(s.alt, s.az);
      cosT = sv[0] * FACE_N[face][0] + sv[1] * FACE_N[face][1];
    }
    return glassTemp(this.air(h), ir.beam, ir.diffuse, cosT, GLASS[this.info.glass ?? 'lowe'].absorb.value);
  }

  /**
   * Water evaporated from cell i over the design day, mm (= kg m-2):
   * sum of EF x max(Q*, 0) x dt / 2.45e6 J kg-1, evaluated on the stored
   * 15-min surface temperatures (a 15-min sum, not the model's 1-min one)
   * with the model's radiation terms, including its wall terms (driven by the
   * unshaded sun, as in runModel).
   */
  evaporation(i) {
    const site = this.info.site;
    const m = (this.info.mats ?? MATERIALS)[cellMat(this.world, i)];
    if (!m || !m.ef || isWater(cellMat(this.world, i))) return 0;
    const v = this.world.svf[i];
    let sum = 0;
    for (let k = 0; k < STORE; k++) {
      const h = (k * 24) / STORE;
      const K = this.shortwave(i, h).K;
      const taK = this.air(h) + K0;
      const L = v * skyEmissivity(site.vapourHpa, taK) * SIGMA * taK ** 4 + (1 - v) * this.lwall(i, h);
      const t = this.ts(i, h) + K0;
      const q = (1 - m.alpha.value) * K + m.eps.value * L - m.eps.value * SIGMA * t ** 4;
      if (q > 0) sum += m.ef.value * q * (86400 / STORE);
    }
    return sum / LATENT;
  }

  /** Mean leaf temperature of a canopy (simple: air + absorbed-sun term). */
  canopyTemp(h) {
    const s = this.sun(h);
    const ir = irradiance(s.alt);
    const K = ir.beam * Math.max(0, Math.sin(s.alt * DEG)) + ir.diffuse;
    return this.air(h) + (K > 0 ? (2.5 * K) / 900 : -0.5);
  }

  /**
   * Mean radiant temperature (deg C) for a standing person on a ground cell,
   * SOLWEIG-style six-direction sum (Lindberg et al. 2008), simplified:
   * opaque walls are treated as air + 2 K plus the same sun term as above and
   * reflect sunlight diffusely (K_wr: onto the ground, and half of it onto the
   * person's sides); glass walls reflect the beam specularly (an extra beam
   * r I from the mirrored direction, same altitude, so the same f_p) and emit
   * at the glass temperature.
   */
  tmrt(i, h, slIn) {
    // slIn (block 4 walkers): sunlit share of a 2 m pixel instead of the cell's
    const sw = this.shortwave(i, h);
    const s = sw.sun;
    const sl = slIn ?? this.sunlit(i, h);
    const v = this.world.svf[i];
    const mat = (this.info.mats ?? MATERIALS)[cellMat(this.world, i)];
    const tg = this.ts(i, h) + K0;
    const Kh = sw.K; // everything that reaches the ground
    const b = Math.max(0, s.alt);
    const fp = 0.308 * Math.cos(b * (1 - (b * b) / 48402) * DEG);
    const ak = 0.7;
    const ap = 0.97;
    const Ksky = v * sw.diffuse; // onto the upward-facing side (direct beam via fp)
    const Kground = mat.alpha.value * Kh; // reflected up from the ground
    const Klat = 0.5 * Ksky + 0.5 * Kground + 0.5 * sw.walls;
    const S = ak * (0.06 * Ksky + 0.06 * Kground + 0.88 * Klat + fp * sw.beam * (sl + sw.r));
    const lsky = this.hourConst(h).lsky;
    const Ldown = v * lsky + (1 - v) * this.lwall(i, h);
    const Lg = mat.eps.value * SIGMA * tg ** 4 + (1 - mat.eps.value) * Ldown; // emitted + reflected
    const Llat = 0.5 * Ldown + 0.5 * Lg;
    const L = ap * (0.06 * Ldown + 0.06 * Lg + 0.88 * Llat);
    return Math.pow((S + L) / (ap * SIGMA), 0.25) - K0;
  }
}

// ---- palette: low-saturation mineral colours, no rainbow --------------------
// Prussian blue -> blue-green -> pale stone -> amber -> cinnabar.
export const PALETTE_STOPS = [
  [18, '#2b4060'],
  [24, '#3b6573'],
  [28, '#6f958f'],
  [31, '#a9b5a0'],
  [34, '#d6ceb0'],
  [38, '#dcb987'],
  [44, '#d3965f'],
  [52, '#b96d4d'],
  [62, '#9e5040'],
  [70, '#7e4038'],
];

const STOP_RGB = PALETTE_STOPS.map(([t, c]) => [t, hexRgb(c)]);

/** Palette colour [r,g,b] for a temperature in deg C. */
export function heatRgb(t) {
  const s = STOP_RGB;
  if (t <= s[0][0]) return s[0][1].slice();
  for (let k = 1; k < s.length; k++) {
    if (t <= s[k][0]) {
      const f = (t - s[k - 1][0]) / (s[k][0] - s[k - 1][0]);
      const a = s[k - 1][1];
      const b = s[k][1];
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
    }
  }
  return s[s.length - 1][1].slice();
}

/** Lookup table: 1 entry per 0.25 C across the palette, for pixel inversion. */
export function paletteLut() {
  const out = [];
  for (let t = PALETTE_STOPS[0][0]; t <= PALETTE_STOPS[PALETTE_STOPS.length - 1][0]; t += 0.25) {
    out.push([t, heatRgb(t).map(Math.round)]);
  }
  return out;
}

