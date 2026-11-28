// desert: block 11 (desert courtyard neighbourhood) set-up and numbers.
// What is new here is site and scene data, not physics: the site's air
// temperature peaks at its own hour (site.tmaxHour, 16:30), the house walls
// are light stucco (world.wallAlbedo, the wall-reflection term), sails, the
// ramada and the arcade are block 5's flat screens with their own
// transmission, mesquite and palo verde are block 5's tree species, and the
// lawn is a ground material with a higher evaporative fraction. The street
// coating toggle (block 2's before / after, as block 10's white roofs) runs
// the street cells again with the coating taken off (aged asphalt) and
// merges them into the model; no other cell changes (no lateral coupling).
// The air temperature is fixed: misters and the lawn do not cool it.
import { runModel, Thermal, sunSlots, cellMat, STORE, wetBulb, skyEmissivity, SIGMA } from './thermal.js';
import { boxShadow, canopyShadow } from './sun.js';
import { inPoly } from './core.js';
import { MATERIALS } from './materials.js';
import { DS_DRAW } from './dskit.js';

/** True if a scene is the desert block. */
export const isDesert = (scene) => !!scene.desertBlock;

// a parameter: value, source key (materials.js SOURCES), basis (materials.js BASIS), verified;
// the notes for docs/sources.md are in scripts/desert.mjs (DS_NOTES), not on the page
const v = (value, source, basis, verified = false) => ({ value, source, basis, verified });

/** Block-11 parameters (each with a source key, a basis tag and a verified flag). */
export const DS = {
  lat: v(33.43, 'brief11', 'cited'),
  taMin: v(30, 'brief11', 'interp'),
  taMax: v(43, 'brief11', 'interp'),
  tmaxHour: v(16.5, 'ncei', 'range'),
  vapour: v(12, 'brief11', 'interp'),
  wind: v(1.5, 'azmet', 'edge'),
  wallAlbedo: v(0.6, 'brief11', 'range'),
  sailZ: v(4, 'engine', 'engine'),
  ramadaZ: v(3.2, 'engine', 'engine'),
  arcadeZ: v(3.5, 'engine', 'engine'),
  hour: v(15, 'brief11', 'cited'),
  noon: v(12, 'engine', 'engine'),
  night: v(21, 'engine', 'engine'),
  mesquiteTarget: v(-16.7, 'middel2021', 'cited'),
  treeWater: v([1.4, 4.3], 'amwua', 'range'),
  lawnApplied: v(6.4, 'amwua', 'cited'),
  eto: v([7.1, 8.9], 'azmet', 'range'),
  kc: v(0.68, 'az1195', 'interp'),
  misters: v([1.5, 3.4], 'huang2025', 'range'),
  warm: v(6, 'engine', 'engine'),
};

export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];

/** The street with the coating taken off: the coating's cells take the shared aged asphalt. */
export const UNCOATED = { ...MATERIALS, coolCoat: { ...MATERIALS.asphalt, name: 'Main Street without its coating (aged asphalt)' } };

/** Shade kinds by screen material (the café patio is its own kind). */
const kindOf = (P) => (P.patio ? 'patio' : P.kind === 'desertSail' ? 'sail' : P.kind === 'arcadeRoof' ? 'arcade' : P.kind);

/**
 * Ground cells by what stands over their centre (footprints, any hour):
 * sail, ramada, arcade, patio (screens), mesquite and paloVerde (inside the
 * crown's radius), the open plaza reference (plaza gravel, sky view >= 0.85,
 * nothing over it), the open lawn (no crown, sky view >= 0.85), the coated
 * street, the uncoated cross street and the courtyards.
 */
export function footprints(world) {
  const sc = world.scene;
  const out = { sail: [], ramada: [], arcade: [], patio: [], mesquite: [], paloVerde: [], ref: [], gravel: [], lawn: [], main: [], cross: [], court: [] };
  const pid = (id) => sc.ground.findIndex((g) => g.id === id);
  const plaza = pid('plaza');
  const lawn = pid('lawn');
  const main = pid('main');
  const cross = pid('cross');
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0) continue;
    const [x, y] = centre(world, i);
    const P = world.screens.find((s) => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);
    const T = world.trees.find((t) => Math.hypot(t.x - x, t.y - y) < t.r);
    const m = cellMat(world, i);
    const p = world.parcel[i];
    if (P) out[kindOf(P)].push(i);
    else if (T) out[T.species].push(i);
    if (!P && !T && world.canopy[i] === 0 && world.svf[i] >= 0.85) {
      if (m === 'gravel') out.gravel.push(i);
      if (p === plaza) out.ref.push(i);
      if (p === lawn) out.lawn.push(i);
    }
    if (p === main) out.main.push(i);
    if (p === cross && world.canopy[i] === 0) out.cross.push(i);
    if (sc.ground[p].court) out.court.push(i);
  }
  return out;
}

/** Block-11 changes to a built world (once): drawing hooks, the stucco walls, colours of the new ground materials, the footprints. */
export function prepWorld(world) {
  if (world.ds) return world;
  world.draw = DS_DRAW; // the block's own drawing (dskit.js)
  world.wallAlbedo = DS.wallAlbedo.value;
  world.colours = { gravel: 'drySoil', desertLawn: 'grass', coolCoat: 'asphalt' };
  world.ds = { F: footprints(world) };
  return world;
}

/** A model made of a base model with some cells taken from another run (no lateral coupling). */
export function merged(world, base, other, cells, info) {
  const store = Float32Array.from(base.store);
  for (const i of cells) store.set(other.store.subarray(i * STORE, (i + 1) * STORE), i * STORE);
  return new Thermal(world, store, base.slots, { ...base.info, ...info });
}

/**
 * The block's models: sun slots, the base model (Main Street coated, as
 * built; heavy cells with block 3's coarse warm-up days, convergence as in
 * runModel) and, when first asked for, the street without its coating (its
 * cells run again with aged asphalt).
 */
export function desertSetup(world) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const t0 = now();
  prepWorld(world);
  const slots = sunSlots(world);
  const t1 = now();
  const base = runModel(world, { slots, warm: DS.warm.value });
  const t2 = now();
  let bare = null;
  const bareModel = () => {
    if (!bare) {
      const cells = world.ds.F.main;
      const U = runModel(world, { slots, warm: DS.warm.value, cells, materials: UNCOATED });
      bare = merged(world, base, U, cells, { mats: UNCOATED, uncoated: cells.length });
    }
    return bare;
  };
  return { base, slots, model: (coated) => (coated ? base : bareModel()), cached: () => [bare ? 'uncoated' : null].filter(Boolean), timing: { slotsMs: t1 - t0, runMs: t2 - t1 } };
}

// ---- what shades a cell at an hour ---------------------------------------------------

/**
 * Ground cells by what shades their centre at hour h (shadow polygons; the
 * share of sun a cell gets is the model's own): a cell counts for a shade
 * kind if that kind's shadow alone covers its centre (no building, no other
 * kind) and its sunlit share is at most the kind's transmission + 0.2. The
 * open reference: the plaza's open cells in full sun (sunlit > 0.95).
 * At night: the footprints.
 */
export function shadeCells(world, T, h) {
  const F = world.ds.F;
  const sun = T.sun(h);
  if (sun.alt <= 0) return { ...F, ref: F.ref.slice() };
  const polys = [];
  for (const P of world.screens) polys.push([kindOf(P), boxShadow(P.x0, P.y0, P.x1, P.y1, P.z, sun, P.z - 0.1), MATERIALS[P.kind].tr.value]);
  for (const t of world.trees) polys.push([t.species, canopyShadow(t.x, t.y, t.zc, t.r, sun), t.tr]);
  for (const B of world.buildings) polys.push(['building', boxShadow(B.x0, B.y0, B.x1, B.y1, B.h, sun), 0]);
  const box = polys.map(([, p]) => {
    if (!p) return null;
    let a = Infinity;
    let b = Infinity;
    let c = -Infinity;
    let d = -Infinity;
    for (let k = 0; k < p.length; k += 2) {
      a = Math.min(a, p[k]);
      b = Math.min(b, p[k + 1]);
      c = Math.max(c, p[k]);
      d = Math.max(d, p[k + 1]);
    }
    return [a, b, c, d];
  });
  const out = { sail: [], ramada: [], arcade: [], patio: [], mesquite: [], paloVerde: [], ref: F.ref.filter((i) => T.sunlit(i, h) > 0.95) };
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0) continue;
    const [x, y] = centre(world, i);
    const kinds = new Set();
    let tr = 0;
    polys.forEach(([k, p, t], j) => {
      const q = box[j];
      if (!q || x < q[0] || x > q[2] || y < q[1] || y > q[3] || !inPoly(p, x, y)) return;
      kinds.add(k);
      tr = t;
    });
    if (kinds.size !== 1) continue;
    const k = [...kinds][0];
    if (k !== 'building' && T.sunlit(i, h) <= tr + 0.2) out[k].push(i);
  }
  return out;
}

export const KINDS = ['sail', 'ramada', 'arcade', 'patio', 'mesquite', 'paloVerde'];

// ---- statistics for the cards, notes, bands and docs ----------------------------------

/**
 * Numbers behind the cards, notes, bands and docs (pure functions of the
 * models): the open reference, each shade kind against it (Tmrt and ground,
 * at the bands' hours, by day from the shadow classes, at night from the
 * footprints), gravel, the lawn (surface and the water it evaporates), the
 * coated street with and without its coating, the cross street and the
 * courtyards; the dry air (sky emissivity, wet-bulb).
 */
export function desertStats(world, T, U = null) {
  const F = world.ds.F;
  const hours = [DS.noon.value, DS.hour.value, DS.night.value, 3];
  const tm = (cells, h, M = T) => mean(cells.map((i) => M.tmrt(i, h)));
  const tsm = (cells, h, M = T) => mean(cells.map((i) => M.ts(i, h)));
  const air = Object.fromEntries(hours.map((h) => [h, T.air(h)]));
  const by = Object.fromEntries(hours.map((h) => [h, shadeCells(world, T, h)]));
  const ref = Object.fromEntries(hours.map((h) => [h, { n: by[h].ref.length, tmrt: tm(by[h].ref, h), ts: tsm(by[h].ref, h) }]));
  const shade = Object.fromEntries(KINDS.map((k) => [k, Object.fromEntries(hours.map((h) => {
    const c = by[h][k];
    const t = tm(c, h);
    return [h, { n: c.length, tmrt: t, d: t - ref[h].tmrt, ts: tsm(c, h), sun: mean(c.map((i) => T.sunlit(i, h))), svf: mean(c.map((i) => world.svf[i])) }];
  }))]));
  const sunny = (cells, h) => cells.filter((i) => T.sunlit(i, h) > 0.95);
  const h15 = DS.hour.value;
  const gravel = sunny(F.gravel, h15);
  const lawn = sunny(F.lawn, h15);
  const evap = F.lawn.map((i) => T.evaporation(i));
  const out = {
    air,
    ref,
    shade,
    gravel: { n: gravel.length, ts15: tsm(gravel, h15), tmrt15: tm(gravel, h15) },
    lawn: { n: lawn.length, ts15: tsm(lawn, h15), tmrt15: tm(lawn, h15), ts03: tsm(F.lawn, 3), evap: mean(evap), evapMin: Math.min(...evap), evapMax: Math.max(...evap) },
    cross: { n: sunny(F.cross, h15).length, ts15: tsm(sunny(F.cross, h15), h15), tmrt15: tm(sunny(F.cross, h15), h15) },
    court: { n: F.court.length, svf: mean(F.court.map((i) => world.svf[i])), ts15: tsm(F.court, h15), tmrt15: tm(F.court, h15), tmrt21: tm(F.court, DS.night.value), sun15: mean(F.court.map((i) => T.sunlit(i, h15))) },
    sky: { eps: skyEmissivity(world.scene.site.vapourHpa, air[3] + 273.15), eps20: skyEmissivity(20, air[3] + 273.15), lw3: skyEmissivity(world.scene.site.vapourHpa, air[3] + 273.15) * SIGMA * (air[3] + 273.15) ** 4, lw3h: skyEmissivity(20, air[3] + 273.15) * SIGMA * (air[3] + 273.15) ** 4, wetBulb15: wetBulb(air[h15], world.scene.site.vapourHpa), wetBulbMax: wetBulb(world.scene.site.taMax, world.scene.site.vapourHpa) },
  };
  if (U) {
    const sm = (h) => sunny(F.main, h);
    out.coat = Object.fromEntries([DS.noon.value, h15, DS.night.value].map((h) => {
      const c = h === DS.night.value ? F.main : sm(h);
      return [h, { n: c.length, ts: tsm(c, h), tsBare: tsm(c, h, U), tmrt: tm(c, h), tmrtBare: tm(c, h, U), dTs: tsm(c, h) - tsm(c, h, U), dTmrt: tm(c, h) - tm(c, h, U) }];
    }));
  }
  return out;
}

/** Litres of water a square metre uses a day by what covers it (the overlay and the cards): the lawn's from the model, the rest quoted. */
export function waterUse(st) {
  return {
    lawn: st.lawn.evap,
    lawnApplied: DS.lawnApplied.value,
    trees: DS.treeWater.value,
    misters: DS.misters.value,
    gravel: 0,
  };
}
