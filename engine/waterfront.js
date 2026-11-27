// waterfront: block 4 (waterfront and wind corridors) model runs and numbers:
// one model per wind preset (calm 1 / breezy 3 m/s), the walkers' comfort
// weights (Melnikov shade weights shifted by the local wind through an
// apparent temperature), and the statistics behind the cards, notes, checks
// and docs (wind factor by street, water curves, the air overlay, sheltered
// vs exposed asphalt).
import { MODEL } from './materials.js';
import { runModel, cellMat, isWater, shadeClassField, waterTemp, WATER_KIND, SLOTS } from './thermal.js';
import { apparentTemp, overlayDT, dayWeight, windLines, linesHash, F_MIN, F_MAX, OVERLAY } from './wind.js';
import { shadeWeights } from './life.js';
import { GROUND_MATS } from './world.js';
import { solarPosition } from './sun.js';

/** Coarse 10-min spin-up days (thermal.js opts.warm, as block 3; guarded there). */
export const WARM_WF = 6;

/** True if a scene is the waterfront block. */
export const isWaterfront = (scene) => !!scene.windBlock;

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

/** Lazily computed models per wind preset (m/s); each depends only on its speed. */
export function waterfrontSetup(world, slots) {
  const models = new Map();
  const model = (u) => {
    if (!models.has(u)) models.set(u, runModel(world, { slots, wind: u, warm: WARM_WF }));
    return models.get(u);
  };
  let lines = null;
  return {
    model,
    cached: () => [...models.keys()],
    lines: () => (lines ??= windLines(world, world.wind)),
  };
}

/** Ground cells (not water, not under a roof) of parcels whose id is in ids, optionally of one material. */
export function parcelCells(world, ids, mat = null) {
  const set = new Set(world.scene.ground.map((g, k) => (ids.includes(g.id) ? k : -1)).filter((k) => k >= 0));
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || !set.has(world.parcel[i])) continue;
    if (mat && cellMat(world, i) !== mat) continue;
    out.push(i);
  }
  return out;
}

/** Cell centre. */
export const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];

/** Street ids by role: aligned with the wind (C > 1) and across it (delta > 30 deg). */
export function streetGroups(world) {
  const ids = (f) => [...new Set(world.wind.streets.filter(f).map((s) => s.id))];
  return { aligned: ids((s) => s.C > 1), across: ids((s) => s.delta > 30) };
}

/**
 * Cells straight downwind of building B (inside its cross-wind extent, wind
 * from the north here: same x range, south of it) at along-wind distances
 * [d0, d1) from its leeward face, ground only.
 */
export function leeCells(world, B, d0, d1) {
  const w = world.wind.w;
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || isWater(cellMat(world, i))) continue;
    const [x, y] = centre(world, i);
    // along-wind distance from the leeward face and the cross-wind check, for any wind direction
    const along = (x - (B.x0 + B.x1) / 2) * w[0] + (y - (B.y0 + B.y1) / 2) * w[1];
    const half = (Math.abs(w[0]) * (B.x1 - B.x0) + Math.abs(w[1]) * (B.y1 - B.y0)) / 2;
    const across = Math.abs(-(x - (B.x0 + B.x1) / 2) * w[1] + (y - (B.y0 + B.y1) / 2) * w[0]);
    const halfW = (Math.abs(w[1]) * (B.x1 - B.x0) + Math.abs(w[0]) * (B.y1 - B.y0)) / 2;
    const d = along - half;
    if (across < halfW && d >= d0 && d < d1) out.push(i);
  }
  return out;
}

/** Wind-factor numbers for the bands, cards and docs. */
export function windStats(world) {
  const fw = world.fw;
  const river = [];
  for (let i = 0; i < world.n * world.n; i++) if (cellMat(world, i) === 'river') river.push(fw[i]);
  const g = streetGroups(world);
  const al = parcelCells(world, g.aligned).map((i) => fw[i]);
  const ac = parcelCells(world, g.across).map((i) => fw[i]);
  const sc = world.scene.segments;
  const lee = world.buildings.find((b) => b.id === sc.sheltered.lee);
  const lee01 = leeCells(world, lee, 0, lee.h).map((i) => fw[i]);
  const far = world.buildings.find((b) => b.id === 'a2');
  const far5 = leeCells(world, far, 5 * far.h, 6.5 * far.h).map((i) => fw[i]);
  const corridor = world.wind.streets.find((s) => s.id === sc.corridor.street);
  const shelter = world.wind.streets.find((s) => s.id === sc.sheltered.street);
  return {
    river: { n: river.length, min: Math.min(...river), max: Math.max(...river), mean: mean(river) },
    aligned: { ids: g.aligned, n: al.length, mean: mean(al), min: Math.min(...al) },
    across: { ids: g.across, n: ac.length, mean: mean(ac), max: Math.max(...ac) },
    lee01: { b: lee.name, h: lee.h, n: lee01.length, mean: mean(lee01), max: Math.max(...lee01) },
    far5: { b: far.name, h: far.h, n: far5.length, min: Math.min(...far5), mean: mean(far5) },
    corridor,
    shelter,
    corridorMean: mean(parcelCells(world, [sc.corridor.street]).map((i) => fw[i])),
    shelterMean: mean(parcelCells(world, [sc.sheltered.street]).map((i) => fw[i])),
  };
}

/** h_c over ground and roof cells for a model: min / max and the bounds 5.7 + 3.8 u [f_min, f_max]. */
export function hcStats(world, T) {
  let lo = Infinity;
  let hi = -Infinity;
  let roofLo = Infinity;
  let roofHi = -Infinity;
  for (let i = 0; i < world.n * world.n; i++) {
    if (isWater(cellMat(world, i))) continue;
    const h = T.hcAt(i);
    if (world.bld[i] >= 0) {
      roofLo = Math.min(roofLo, h);
      roofHi = Math.max(roofHi, h);
    } else {
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  const u = T.info.wind;
  return { u, lo, hi, roofLo, roofHi, boundLo: 5.7 + 3.8 * u * F_MIN, boundHi: 5.7 + 3.8 * u * F_MAX, open: 5.7 + 3.8 * u };
}

/**
 * Sheltered vs exposed sunlit asphalt at hour h: asphalt cells in full sun
 * (sunlit >= 0.95) with f_w <= 0.45 vs f_w >= 0.95; mean Ts, SVF, f_w, h_c.
 */
export function asphaltContrast(world, T, h = 15) {
  const sh = [];
  const ex = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || cellMat(world, i) !== 'asphalt' || T.sunlit(i, h) < 0.95) continue;
    if (world.fw[i] <= 0.45) sh.push(i);
    else if (world.fw[i] >= 0.95) ex.push(i);
  }
  const m = (a, f) => mean(a.map(f));
  const side = (a) => ({ n: a.length, ts: m(a, (i) => T.ts(i, h)), svf: m(a, (i) => world.svf[i]), fw: m(a, (i) => world.fw[i]), hc: m(a, (i) => T.hcAt(i)), tmrt: m(a, (i) => T.tmrt(i, h)), cells: a });
  const s = side(sh);
  const e = side(ex);
  return { h, sheltered: s, exposed: e, diff: s.ts - e.ts };
}

/** An open asphalt cell (SVF 1, never shaded, no walls) with a given wind factor, for the wind-only contrast. */
export function openAsphalt(scene, u, fw) {
  const w = {
    scene,
    size: 5,
    cell: 5,
    n: 1,
    mat: Uint8Array.of(GROUND_MATS.indexOf('asphalt')),
    matIds: GROUND_MATS,
    bld: Int16Array.of(-1),
    height: Float32Array.of(0),
    canopy: Float32Array.of(0),
    svf: Float32Array.of(1),
    svfOpen: Float32Array.of(1),
    gview: null,
    buildings: [],
    trees: [],
    cellIndex: () => 0,
  };
  const suns = [];
  const fields = [];
  for (let k = 0; k < SLOTS; k++) {
    const s = solarPosition(scene.site, (k * 24) / SLOTS);
    suns.push(s);
    fields.push(Float32Array.of(s.alt > 0 ? 1 : 0));
  }
  return runModel(w, { slots: { suns, fields }, wind: u, fw: Float32Array.of(fw), warm: WARM_WF });
}

/** Largest |Tmrt(u_a) - Tmrt(u_b)| over ground cells (not water) at hour h, and where. */
export function tmrtWindChange(world, Ta, Tb, h = 15) {
  let max = 0;
  let at = -1;
  const sun = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || isWater(cellMat(world, i))) continue;
    const d = Math.abs(Ta.tmrt(i, h) - Tb.tmrt(i, h));
    if (d > max) [max, at] = [d, i];
    if (Ta.sunlit(i, h) > 0.95) sun.push(Ta.tmrt(i, h) - Tb.tmrt(i, h));
  }
  return { max, at, meanSun: mean(sun) };
}

/** Water curves: daily range, value at 15:00 and 04:00 vs the air, per kind (model store). */
export function waterStats(world, T) {
  const out = {};
  for (const id of ['river', 'pond']) {
    let i = -1;
    for (let k = 0; k < world.n * world.n && i < 0; k++) if (cellMat(world, k) === id) i = k;
    if (i < 0) continue;
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < 96; k++) {
      const v = T.ts(i, k / 4);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    out[id] = { range: hi - lo, lo, hi, t15: T.ts(i, 15), t04: T.ts(i, 4), a15: T.air(15), a04: T.air(4), formula15: waterTemp(WATER_KIND[id], T.info.taMean, 15) };
  }
  return out;
}

/**
 * Air overlay numbers along the wind lines (information only): |dTa| at the
 * bank (first vertex off the river) by day, the largest |dTa| beyond 80 m
 * outside aligned streets and beyond 150 m inside them, and the smallest
 * night value.
 */
export function overlayStats(world, lines) {
  const bank = [];
  let beyond80 = 0;
  let beyond150 = 0;
  let nightMin = Infinity;
  const at = [0, 30, 80].map(() => []);
  for (const L of lines) {
    let seenBank = false;
    for (let v = 0; v < L.fw.length; v++) {
      if (L.kind[v] !== 2) continue;
      const day = overlayDT(L.lam[v], L.kind[v], 1);
      const night = overlayDT(L.lam[v], L.kind[v], 0);
      nightMin = Math.min(nightMin, night);
      const d = L.dist[v];
      if (!seenBank && d > 0) {
        bank.push(Math.abs(overlayDT(0, 2, 1)));
        seenBank = true;
      }
      const c = world.cellIndex(L.p[v * 2], L.p[v * 2 + 1]);
      if (world.wind.aligned[c]) {
        if (d > 150) beyond150 = Math.max(beyond150, Math.abs(day));
      } else if (d > 80) beyond80 = Math.max(beyond80, Math.abs(day));
      [0, 30, 80].forEach((x, k) => {
        if (Math.abs(d - x) < 1.3) at[k].push(day);
      });
    }
  }
  return { bank: mean(bank), nBank: bank.length, beyond80, beyond150, nightMin, at0: mean(at[0]), at30: mean(at[1]), at80: mean(at[2]) };
}

/** Wind-line checks: hash, vertex count and vertices inside any building footprint. */
export function lineStats(world, lines) {
  let inside = 0;
  let verts = 0;
  for (const L of lines) {
    for (let v = 0; v < L.fw.length; v++) {
      verts++;
      const x = L.p[v * 2];
      const y = L.p[v * 2 + 1];
      if (world.buildings.some((B) => x > B.x0 && x < B.x1 && y > B.y0 && y < B.y1)) inside++;
    }
  }
  return { n: lines.length, verts, inside, hash: linesHash(lines) };
}

// ---- walkers -------------------------------------------------------------------

/**
 * Shade raster with per-pixel route weights for the walkers (2 m grid):
 *   w = w_class + (1 - w_b) (AT(u f_w) - AT(u)) / (AT_sun - AT_shade)
 * w_class, w_b: the Melnikov shade weights at this air temperature (life.js
 * shadeWeights); AT: apparent temperature (wind.js) from the pixel's Tmrt
 * (sun / building shade / tree shade) and the local wind; AT_sun - AT_shade:
 * the mean apparent-temperature gap between sunlit and building-shaded
 * walkable ground at f_w = 1. So at f_w = 1 the weights are those of blocks
 * 1-3; a breezier spot weighs less and a sheltered one more, in the same
 * "shade-equivalent" units. Night: plain weights (life.js ignores wf).
 */
export function comfortShade(world, thermalOf) {
  const cache = new Map();
  const tr = MODEL.canopyTransmission.value;
  const shadeFor = (hq) => {
    const T = thermalOf();
    const key = `${hq}|${T.info.wind}`;
    if (cache.has(key)) return cache.get(key);
    const sh = shadeClassField(world, T.sun(hq));
    if (!sh.night) {
      const u = T.info.wind;
      const air = T.air(hq);
      const e = world.scene.site.vapourHpa;
      const W = shadeWeights(air);
      const N = world.n * world.n;
      const tm = [new Float32Array(N).fill(NaN), new Float32Array(N).fill(NaN), new Float32Array(N).fill(NaN)];
      const tmrt = (c, cls) => {
        const a = tm[cls];
        if (a[c] !== a[c]) a[c] = T.tmrt(c, hq, cls === 0 ? 1 : cls === 2 ? tr : 0);
        return a[c];
      };
      const n = sh.n;
      const f = world.fine;
      let sSun = 0;
      let nSun = 0;
      let sSh = 0;
      let nSh = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          if (!f.walk[j * n + i]) continue;
          const k = sh.cls[j * n + i];
          if (k === 2) continue;
          const c = world.cellIndex((i + 0.5) * sh.cell, (j + 0.5) * sh.cell);
          const at1 = apparentTemp(air, e, u, tmrt(c, k));
          if (k === 0) {
            sSun += at1;
            nSun++;
          } else {
            sSh += at1;
            nSh++;
          }
        }
      }
      const gap = nSun && nSh ? sSun / nSun - sSh / nSh : 0;
      const wf = new Float32Array(n * n);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const p = j * n + i;
          const k = sh.cls[p];
          const c = world.cellIndex((i + 0.5) * sh.cell, (j + 0.5) * sh.cell);
          if (world.bld[c] >= 0 || gap < 1) {
            wf[p] = W[k];
            continue;
          }
          const t = tmrt(c, k);
          const shift = (apparentTemp(air, e, u * world.fw[c], t) - apparentTemp(air, e, u, t)) / gap;
          wf[p] = W[k] + (1 - W[1]) * shift;
        }
      }
      sh.wf = wf;
      sh.atGap = gap;
    }
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    cache.set(key, sh);
    return sh;
  };
  return { shadeFor, reset: () => cache.clear() };
}

/** Mean f_w and weight at a set of walker positions (for checks and docs). */
export function walkerWind(world, agents, shade) {
  const fws = [];
  for (const a of agents) if (!a.sit) fws.push(world.fw[world.cellIndex(a.x, a.y)]);
  return { n: fws.length, fw: mean(fws) };
}

/** Day weight of the air overlay at hour h (from the sun altitude). */
export const overlayWeight = (site, h) => dayWeight(solarPosition(site, h).alt);

/**
 * Riverside shade at hour h: promenade cells in tree shade (sunlit share
 * <= 0.3) vs in full sun (>= 0.95): mean Tmrt and apparent temperature (with
 * the local wind).
 */
export function promenadeShade(world, T, h = 15) {
  const cells = parcelCells(world, ['promenade']);
  const sh = cells.filter((i) => T.sunlit(i, h) <= 0.3);
  const su = cells.filter((i) => T.sunlit(i, h) >= 0.95);
  const e = world.scene.site.vapourHpa;
  const u = T.info.wind;
  const air = T.air(h);
  const tm = (a) => mean(a.map((i) => T.tmrt(i, h)));
  const at = (a) => mean(a.map((i) => apparentTemp(air, e, u * world.fw[i], T.tmrt(i, h))));
  return { nShade: sh.length, nSun: su.length, shadeTmrt: tm(sh), sunTmrt: tm(su), shadeAT: at(sh), sunAT: at(su), air };
}

/** f_w profile behind the sheltering building along the street at a sample x (cards). */
export function shelterProfile(world, x, y0, ds = [2.5, 7.5, 12.5, 17.5]) {
  return ds.map((d) => ({ d, fw: world.fw[world.cellIndex(x, y0 + d)] }));
}

/** Overlay reach: the distance at which the day effect at the bank falls to 0.1 K (rounded to 10 m). */
export const overlayReach = () => Math.round((OVERLAY.L * Math.log(OVERLAY.day / 0.1)) / 10) * 10;
