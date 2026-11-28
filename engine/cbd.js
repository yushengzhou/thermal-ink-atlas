// cbd: block 3 (glass CBD) model runs and statistics: one model per glass
// type, the "reflection off" comparison runs, reflection spots on the fine
// grid (drawing and walkers), spot and canyon numbers for the cards, an open
// reference cell for the night-lag comparison, and the AC rejected-heat
// figures (information only: the air temperature is fixed, so the model
// cannot feel waste heat).
import { GLASS } from './materials.js';
import { runModel, cellMat, SLOTS, Thermal, STORE, airTemp, daylight, shadeClassField } from './thermal.js';
import { reflectSlots, reflectFor, reflectField, glassFacades } from './reflect.js';
import { solarPosition } from './sun.js';
import { GROUND_MATS } from './world.js';
import { shadeWeights } from './life.js';

/** Coarse 10-min spin-up days before the 1-min days (thermal.js opts.warm). */
export const WARM = 6;

/** Reflected share of the direct beam (r) from which a cell counts as being in a reflection spot. */
export const SPOT_MIN = 0.05;
const SUN_FULL = 0.95;
const SHADE = 0.05;

/** True if a scene is a glass block. */
export const isGlass = (scene) => !!scene.glassBlock;

/**
 * Glass set-up for a world: façades, reflection fields per sun slot, and
 * lazily computed models: model(g) for g in clear / lowe / mirror, and
 * off(g), the same glass with the specular bounce removed (run on the cells
 * that ever receive a reflection; every other cell is copied from model(g),
 * where it has no reflection either). Each result depends only on g, never on
 * the order the glass types were visited.
 */
export function glassSetup(world, slots) {
  world.glassFacades = glassFacades(world);
  const rs = reflectSlots(world, slots);
  const N = world.n * world.n;
  const spot = [];
  for (let i = 0; i < N; i++) if (rs && rs.A.some((f) => f && f[i] > 0)) spot.push(i);
  const spotCells = Int32Array.from(spot);
  const models = new Map();
  const offs = new Map();
  const model = (g) => {
    if (!models.has(g)) models.set(g, runModel(world, { slots, refl: reflectFor(rs, GLASS[g].rho0.value), glass: g, warm: WARM }));
    return models.get(g);
  };
  const off = (g) => {
    if (!offs.has(g)) {
      const full = model(g);
      const sub = runModel(world, { slots, glass: g, cells: spotCells, warm: WARM });
      const store = new Float32Array(full.store);
      for (const i of spotCells) store.set(sub.store.subarray(i * STORE, (i + 1) * STORE), i * STORE);
      offs.set(g, new Thermal(world, store, slots, { ...sub.info, refl: null, glass: g, cells: null, off: true }));
    }
    return offs.get(g);
  };
  return { rs, spotCells, model, off, cached: () => [...models.keys()] };
}

/**
 * Reflection spot field at one sun position on a fine grid (default 2 m, one
 * sample per cell) for glass g: Float32Array of r, or null.
 */
export function spotField(world, sun, g, cell = 2) {
  const n = Math.round(world.size / cell);
  const ground = (i) => world.buildingAt(((i % n) + 0.5) * cell, (Math.floor(i / n) + 0.5) * cell) < 0;
  const f = reflectField(world, sun, { n, cell, S: 1 }, ground);
  if (!f) return null;
  const rho0 = GLASS[g].rho0.value;
  const out = new Float32Array(n * n);
  for (let i = 0; i < out.length; i++) out[i] = rho0 * f.A[i] + (1 - rho0) * f.B[i];
  return { n, cell, r: out };
}

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

/**
 * Ground cells by heat class at hour h (model grid): plain shade (building
 * shade, no crown, no reflection), plain sun, and reflection-spot cells in
 * shade and in sun.
 */
export function spotClasses(world, T, h) {
  const N = world.n * world.n;
  const out = { shade: [], sun: [], spotShade: [], spotSun: [] };
  for (let i = 0; i < N; i++) {
    if (world.bld[i] >= 0 || cellMat(world, i) === 'water') continue;
    const s = T.sunlit(i, h);
    const r = T.refl(i, h);
    if (r >= SPOT_MIN) {
      if (s < SHADE) out.spotShade.push(i);
      else if (s > SUN_FULL) out.spotSun.push(i);
    } else if (r === 0 && world.canopy[i] === 0) {
      if (s < SHADE) out.shade.push(i);
      else if (s > SUN_FULL) out.sun.push(i);
    }
  }
  return out;
}

/**
 * Spot numbers for glass g at hour h: mean Tmrt in plain shade, plain sun,
 * shaded and sunlit spots; mean and max ΔTmrt in spots against the same glass
 * with reflection off; mean r.
 */
export function spotStats(setup, world, g, h) {
  const T = setup.model(g);
  const O = setup.off(g);
  const c = spotClasses(world, T, h);
  const spots = c.spotShade.concat(c.spotSun);
  const all = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && cellMat(world, i) !== 'water' && T.refl(i, h) >= SPOT_MIN) all.push(i);
  const d = all.map((i) => T.tmrt(i, h) - O.tmrt(i, h));
  const dShade = c.spotShade.map((i) => T.tmrt(i, h) - O.tmrt(i, h));
  return {
    g,
    h,
    n: all.length,
    nShade: c.spotShade.length,
    nSun: c.spotSun.length,
    tmrtShade: mean(c.shade.map((i) => T.tmrt(i, h))),
    tmrtSun: mean(c.sun.map((i) => T.tmrt(i, h))),
    tmrtSpotShade: mean(c.spotShade.map((i) => T.tmrt(i, h))),
    tmrtSpotSun: mean(c.spotSun.map((i) => T.tmrt(i, h))),
    dTmrt: mean(d),
    dTmrtMax: d.length ? Math.max(...d) : NaN,
    dTmrtShade: mean(dShade),
    tsSpotShade: mean(c.spotShade.map((i) => T.ts(i, h))),
    tsSpotShadeOff: mean(c.spotShade.map((i) => O.ts(i, h))),
    r: mean(all.map((i) => T.refl(i, h))),
    spots,
  };
}

/**
 * Tmrt-based route weights for walkers at hour h (Melnikov weights scaled by
 * heat, see life.js): a class sits between building shade (w_b) and sun (1) in
 * proportion to where its mean Tmrt sits between plain shade and plain sun:
 * w = w_b + (1 - w_b) (Tmrt - Tmrt_shade) / (Tmrt_sun - Tmrt_shade).
 * Returns [w_spotInShade, w_spotInSun] (sun-lit spots weigh more than 1).
 */
export function spotWeights(world, T, h) {
  const c = spotClasses(world, T, h);
  const ts = mean(c.shade.map((i) => T.tmrt(i, h)));
  const tu = mean(c.sun.map((i) => T.tmrt(i, h)));
  const wb = shadeWeights(T.air(h))[1];
  const w = (t) => (Number.isFinite(t) && tu - ts > 1 ? wb + ((1 - wb) * (t - ts)) / (tu - ts) : null);
  const a = w(mean(c.spotShade.map((i) => T.tmrt(i, h))));
  const b = w(mean(c.spotSun.map((i) => T.tmrt(i, h))));
  return [a ?? wb + (1 - wb) * 0.5, b ?? 1 + (1 - wb) * 0.5];
}

/**
 * An open reference cell (sky view factor 1, never shaded, no walls) of
 * material mat on the scene's design day, for the canyon night-lag check.
 */
export function openReference(scene, mat, mats) {
  const w = {
    scene,
    size: 5,
    cell: 5,
    n: 1,
    mat: Uint8Array.of(GROUND_MATS.indexOf(mat)),
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
  return runModel(w, { slots: { suns, fields }, materials: mats, warm: WARM });
}

/**
 * Canyon numbers for a street segment {x0, y0, x1, y1, mat, h, w}: engine SVF
 * vs the infinite-canyon value 1 / sqrt(1 + (2H/W)^2), the floor at 15:00 in
 * shade vs the open reference, and the night lag at 05:00 (canyon floor minus
 * the open reference cell of the same material).
 */
export function canyonStats(world, T, seg, ref) {
  const cells = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || cellMat(world, i) !== seg.mat) continue;
    const x = ((i % world.n) + 0.5) * world.cell;
    const y = (Math.floor(i / world.n) + 0.5) * world.cell;
    if (x > seg.x0 && x < seg.x1 && y > seg.y0 && y < seg.y1) cells.push(i);
  }
  const shaded = cells.filter((i) => T.sunlit(i, 15) < SHADE);
  const m = (a, h) => mean(a.map((i) => T.ts(i, h)));
  // since when each cell shaded at 15:00 has been out of the sun (quarter hours back from 15:00); the median
  const since = shaded.map((i) => {
    let h = 15;
    while (h > 5 && T.sunlit(i, h - 0.25) < SHADE) h -= 0.25;
    return h;
  }).sort((a, b) => a - b);
  return {
    shadeSince: since.length ? since[Math.floor(since.length / 2)] : null,
    n: cells.length,
    hw: seg.h / seg.w,
    svf: mean(cells.map((i) => world.svf[i])),
    svfCanyon: 1 / Math.sqrt(1 + (2 * seg.h / seg.w) ** 2),
    ts15: m(cells, 15),
    ts15Shade: m(shaded, 15),
    nShade15: shaded.length,
    ts05: m(cells, 5),
    open15: ref.ts(0, 15),
    open05: ref.ts(0, 5),
    lag05: m(cells, 5) - ref.ts(0, 5),
    tmrt15Shade: mean(shaded.map((i) => T.tmrt(i, 15))),
    air05: T.air(5),
    cells,
  };
}

/**
 * AC rejected heat (information only). Rejected = Q_cool (1 + 1 / COP); dense
 * urban anthropogenic heat 20-70 W m-2 of ground area, occasionally > 100;
 * central Tokyo > 400 W m-2 by day (brief). Not added to any temperature here.
 */
export const AC = {
  cop: 3,
  rejected: (qCool, cop = 3) => qCool * (1 + 1 / cop),
  dense: [20, 70],
  tokyo: 400,
};

/** Air temperature helper for cards (fixed forcing). */
export const airAt = (scene, h) => airTemp(scene.site, h, daylight(scene.site).rise);


/**
 * Cached spot and shade-class rasters for a glass block (2 m grid), used by
 * the walkers, the sweat cue and the day-view glint. thermalOf() and glassOf()
 * return the current model and glass type. shadeFor(hq) adds class 3 (spot in
 * shade) and 4 (spot in sun) to the shade classes, with Tmrt-based weights.
 */
export function glassShade(world, thermalOf, glassOf) {
  const shadeCache = new Map();
  const spotCache = new Map();
  const spotFor = (hq) => {
    const key = `${hq}|${glassOf()}`;
    if (!spotCache.has(key)) {
      if (spotCache.size > 60) spotCache.delete(spotCache.keys().next().value);
      spotCache.set(key, spotField(world, thermalOf().sun(hq), glassOf()));
    }
    return spotCache.get(key);
  };
  const shadeFor = (hq) => {
    if (!shadeCache.has(hq)) {
      const sh = shadeClassField(world, thermalOf().sun(hq));
      const sp = sh.night ? null : spotFor(hq);
      if (sp) {
        let any = false;
        for (let k = 0; k < sh.cls.length; k++) {
          if (sp.r[k] >= SPOT_MIN) {
            sh.cls[k] = sh.cls[k] === 0 ? 4 : 3;
            any = true;
          }
        }
        if (any) sh.spotW = spotWeights(world, thermalOf(), hq);
      }
      shadeCache.set(hq, sh);
    }
    return shadeCache.get(hq);
  };
  const reset = () => {
    shadeCache.clear();
    spotCache.clear();
  };
  return { spotFor, shadeFor, reset };
}
