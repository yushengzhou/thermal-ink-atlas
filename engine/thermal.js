// thermal: force-restore surface energy balance on a 5 m grid.
// dTs/dt = (2 sqrt(pi) / (mu sqrt(tau))) G - (2 pi / tau) (Ts - Td)   (Deardorff 1978)
// G = (1-a) K + e L_down - e s Ts^4 - hc (Ts - Ta) - EF max(Q*, 0)
// Thin layers (sheet metal) use dTs/dt = G / C instead (no restore term).
// Computed once at load with 1-min steps, repeating the design day until the
// deep temperature Td converges (max change < 0.05 K, at least 3 days), and
// stored at 15-min resolution for the last day; seek() only looks values up.
import { MATERIALS, MODEL } from './materials.js';
import { solarPosition, boxShadow, canopyShadow, rasterise } from './sun.js';
import { lerp, hexRgb, DEG } from './core.js';

export const SIGMA = 5.670374e-8;
const TAU = 86400;
const K0 = 273.15;
export const SLOTS = 144; // sun / shade samples per day (10 min)
export const STORE = 96; // stored temperature samples per day (15 min)

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
 */
export function svfAt(heightAt, x, y, z0, nDirs = 16, maxDist = 160, step = 2.5) {
  let sum = 0;
  for (let k = 0; k < nDirs; k++) {
    const a = ((k + 0.5) / nDirs) * 2 * Math.PI;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0; // tan of horizon angle
    for (let d = step; d <= maxDist; d += step) {
      const h = heightAt(x + dx * d, y + dy * d) - z0;
      if (h > 0) {
        const t = h / d;
        if (t > best) best = t;
      }
    }
    sum += 1 / (1 + best * best); // cos^2(atan(best))
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
 * Sunlit fraction per grid cell for one sun position (1 = full sun).
 * Building shade is opaque; canopy shade transmits MODEL.canopyTransmission.
 */
export function sunlitField(world, sun) {
  const { n, cell } = world;
  const N = n * n;
  const out = new Float32Array(N);
  if (sun.alt <= 0) return out;
  out.fill(1);
  const S = 2; // 2x2 samples per cell
  const grid = { nx: n, ny: n, cell };
  const bmask = new Uint8Array(N * S * S);
  const tcount = new Uint8Array(N * S * S);
  const { b, t } = shadowPolys(world, sun);
  rasterise(b, grid, (i, p, s) => {
    const bi = world.bld[i];
    if (bi < 0) bmask[i * S * S + s] = 1; // ground cells only
  }, S);
  rasterise(t, grid, (i, p, s) => {
    if (world.bld[i] < 0 && tcount[i * S * S + s] < 3) tcount[i * S * S + s]++;
  }, S);
  // roofs shaded by taller neighbours
  for (let r = 0; r < world.buildings.length; r++) {
    const R = world.buildings[r];
    const polys = [];
    for (const B of world.buildings) {
      if (B.h > R.h + 0.5) polys.push(boxShadow(B.x0, B.y0, B.x1, B.y1, B.h - R.h, sun));
    }
    if (!polys.length) continue;
    rasterise(polys, grid, (i, p, s) => {
      if (world.bld[i] === r) bmask[i * S * S + s] = 1;
    }, S);
  }
  const tr = MODEL.canopyTransmission.value;
  for (let i = 0; i < N; i++) {
    let f = 0;
    for (let s = 0; s < S * S; s++) {
      const k = i * S * S + s;
      if (!bmask[k]) f += Math.pow(tr, tcount[k]);
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

/** Precompute sun positions and sunlit fields for every 10-min slot. */
export function sunSlots(world) {
  const site = world.scene.site;
  const suns = [];
  const fields = [];
  for (let k = 0; k < SLOTS; k++) {
    const h = (k * 24) / SLOTS;
    const s = solarPosition(site, h);
    suns.push(s);
    fields.push(sunlitField(world, s));
  }
  return { suns, fields };
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
  const hc = 5.7 + 3.8 * site.wind;
  const tauFac = (2 * Math.PI) / TAU;
  const sqrtTau = Math.sqrt(TAU);

  // per-cell parameters
  const alpha = new Float32Array(N);
  const eps = new Float32Array(N);
  const cap = new Float32Array(N); // 2 sqrt(pi) / (mu sqrt(tau)), or 1 / C for thin layers
  const restore = new Float32Array(N); // 2 pi / tau, or 0 for thin layers
  const ef = new Float32Array(N);
  const water = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const id = cellMat(world, i);
    const m = mats[id];
    water[i] = id === 'water' ? 1 : 0;
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
  const svf = world.svf;

  // per-minute forcing
  const M = 1440;
  const ta = new Float32Array(M);
  const beamH = new Float32Array(M); // beam on horizontal
  const dif = new Float32Array(M);
  let taSum = 0;
  for (let m = 0; m < M; m++) {
    const h = m / 60;
    ta[m] = airTemp(site, h, rise);
    taSum += ta[m];
    const s = solarPosition(site, h);
    const ir = irradiance(s.alt);
    beamH[m] = ir.beam * Math.max(0, Math.sin(s.alt * DEG));
    dif[m] = ir.diffuse;
  }
  const taMean = taSum / M;

  const Ts = new Float32Array(N).fill(taMean + K0);
  const Td = new Float32Array(N).fill(taMean + K0);
  const sumDay = new Float64Array(N);
  const store = new Float32Array(N * STORE);
  const stepsPerStore = M / STORE;

  let days = 0;
  let maxDelta = Infinity;
  while (days < maxDays && (days < minDays || maxDelta >= tol)) {
    sumDay.fill(0);
    for (let m = 0; m < M; m += dt / 60) {
      const h = m / 60;
      const taK = ta[m] + K0;
      const ta4 = taK * taK * taK * taK;
      // walls seen from the ground: air + 2 K plus a sun term by day that
      // peaks near 6.9 K at noon (engine assumption; ignores wall orientation)
      const tw = taK + 2 + (6 * (beamH[m] + dif[m])) / 900;
      const tw4 = tw * tw * tw * tw;
      const lsky = skyEmissivity(site.vapourHpa, taK) * SIGMA * ta4;
      const lwall = SIGMA * tw4;
      const sf = (m / 10) | 0; // slot index
      const st = (m % 10) / 10;
      const f0 = slots.fields[sf];
      const f1 = slots.fields[(sf + 1) % SLOTS];
      const bh = beamH[m];
      const df = dif[m];
      const waterT = taMean - 1 + Math.sin((2 * Math.PI * (h - 9)) / 24) + K0;
      for (let i = 0; i < N; i++) {
        if (water[i]) {
          Ts[i] = waterT;
        } else {
          const sl = f0[i] + (f1[i] - f0[i]) * st;
          const v = svf[i];
          const K = sl * bh + v * df;
          const L = v * lsky + (1 - v) * lwall;
          const t = Ts[i];
          const t4 = t * t * t * t;
          const qstar = (1 - alpha[i]) * K + eps[i] * L - eps[i] * SIGMA * t4;
          const G = qstar - hc * (t - taK) - (qstar > 0 ? ef[i] * qstar : 0);
          Ts[i] = t + dt * (cap[i] * G - restore[i] * (t - Td[i]));
        }
        sumDay[i] += Ts[i];
      }
      if (m % stepsPerStore === 0) {
        const k = m / stepsPerStore;
        for (let i = 0; i < N; i++) store[i * STORE + k] = Ts[i] - K0;
      }
    }
    const steps = M / (dt / 60);
    maxDelta = 0;
    for (let i = 0; i < N; i++) {
      const next = sumDay[i] / steps;
      if (!water[i]) maxDelta = Math.max(maxDelta, Math.abs(next - Td[i]));
      Td[i] = next;
    }
    days++;
  }
  return new Thermal(world, store, slots, { rise, taMean, hc, site, ta, days, maxDelta, mats });
}

export class Thermal {
  constructor(world, store, slots, info) {
    this.world = world;
    this.store = store;
    this.slots = slots;
    this.info = info;
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
   * walls are treated as air + 2 K (+ up to ~6.9 K in sun) and reflect no shortwave.
   */
  tmrt(i, h) {
    const site = this.info.site;
    const s = this.sun(h);
    const ir = irradiance(s.alt);
    const sl = this.sunlit(i, h);
    const v = this.world.svf[i];
    const taK = this.air(h) + K0;
    const mat = (this.info.mats ?? MATERIALS)[cellMat(this.world, i)];
    const tg = this.ts(i, h) + K0;
    const Kh = sl * ir.beam * Math.max(0, Math.sin(s.alt * DEG)) + v * ir.diffuse;
    const b = Math.max(0, s.alt);
    const fp = 0.308 * Math.cos(b * (1 - (b * b) / 48402) * DEG);
    const ak = 0.7;
    const ap = 0.97;
    const Ksky = v * ir.diffuse; // onto the upward-facing side (direct beam via fp)
    const Kground = mat.alpha.value * Kh; // reflected up from the ground
    const Klat = 0.5 * Ksky + 0.5 * Kground;
    const S = ak * (0.06 * Ksky + 0.06 * Kground + 0.88 * Klat + fp * ir.beam * sl);
    const lsky = skyEmissivity(site.vapourHpa, taK) * SIGMA * taK ** 4;
    const tw = taK + 2 + (6 * (ir.beam * Math.max(0, Math.sin(s.alt * DEG)) + ir.diffuse)) / 900;
    const Ldown = v * lsky + (1 - v) * SIGMA * tw ** 4;
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

