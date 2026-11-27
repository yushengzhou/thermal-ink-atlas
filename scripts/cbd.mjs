// Analysis helpers for the glass CBD block (block 3), shared by the tests and
// scripts/sources.mjs (not shipped in the page): the world and its glass
// models, the canyon sky-view check, the Fresnel table, a flat-ground
// specular check, spot and canyon numbers, the acceptance bands and the
// walkers.
import { SCENE } from '../cities/glass-cbd/scene.js';
import { buildWorld } from '../engine/world.js';
import { sunSlots, cellMat, svfAt, irradiance } from '../engine/thermal.js';
import { glassSetup, glassShade, spotStats, canyonStats, openReference, SPOT_MIN } from '../engine/cbd.js';
import { fresnelPane, glassRho, fresnelShape, reflectField, glassFacades } from '../engine/reflect.js';
import { solarPosition, sunVector } from '../engine/sun.js';
import { GLASS, GLASS_IDS, MODEL } from '../engine/materials.js';
import { Life, classDensity } from '../engine/life.js';
import { DEG } from '../engine/core.js';

let cache = null;
/** World, sun slots, glass set-up and open reference cells (memoised). */
export function base3() {
  if (!cache) {
    const world = buildWorld(SCENE);
    const slots = sunSlots(world);
    const setup = glassSetup(world, slots);
    const refs = { stone: openReference(SCENE, 'stone'), asphalt: openReference(SCENE, 'asphalt'), concrete: openReference(SCENE, 'concrete') };
    cache = { scene: SCENE, world, slots, setup, refs };
  }
  return cache;
}

/** Infinite canyon centre: SVF from the engine's horizon scan vs 1 / sqrt(1 + (2H/W)^2). */
export function canyonSvfRows(hws = [1, 2, 3, 5]) {
  const W = 20;
  return hws.map((hw) => {
    const H = hw * W;
    const heightAt = (x) => (Math.abs(x) >= W / 2 && Math.abs(x) <= W / 2 + 30 ? H : 0);
    const exact = 1 / Math.sqrt(1 + (2 * hw) ** 2);
    return {
      hw,
      exact,
      fine: svfAt(heightAt, 0, 0, 0, 180, 3000, 0.25), // the scan in the limit
      cbd: svfAt(heightAt, 0, 0, 0, SCENE.svfDirs, 160, 2.5), // block 3 page setting
      app: svfAt(heightAt, 0, 0, 0, 16, 160, 2.5), // blocks 1 and 2
    };
  });
}

/**
 * EnergyPlus clear-glass normalised reflectance (Engineering Reference,
 * "Angular Properties for Coated Glass"): rho_bar = sum r_i cos^i - tau_bar,
 * against the engine's exact normalised Fresnel. Returns the largest |difference|.
 */
export function epClearShapeDiff() {
  const t = [-0.0015, 3.355, -3.84, 1.46, 0.0288];
  const r = [0.999, -0.563, 2.043, -2.532, 1.054];
  const poly = (c, x) => c.reduce((s, a, i) => s + a * x ** i, 0);
  let max = 0;
  let at = 0;
  for (let th = 0; th <= 90; th += 0.5) {
    const c = Math.cos(th * DEG);
    const d = Math.abs(poly(r, c) - poly(t, c) - fresnelShape(th));
    if (d > max) [max, at] = [d, th];
  }
  return { max, at };
}

/** Fresnel reflectance of clear float glass vs the brief's table. */
export const FRESNEL_BRIEF = [[0, 0.082], [45, 0.1], [60, 0.17], [70, 0.3], [75, 0.41], [80, 0.56]];
export const fresnelRows = () => FRESNEL_BRIEF.map(([th, brief]) => ({ th, brief, model: fresnelPane(th), clear: glassRho(GLASS.clear.rho0.value, th), lowe: glassRho(GLASS.lowe.rho0.value, th), mirror: glassRho(GLASS.mirror.rho0.value, th) }));

/**
 * Flat-ground check: one glass box on open ground, one sun position.
 * Returns reflected irradiance in fully lit cells vs rho(theta) I sin(beta),
 * the far edge of the spot along the mirrored azimuth vs H / tan(beta),
 * energy closure (ground vs façade) and the largest cell vs the bound.
 */
export function specularCheck({ hour = 15, face = 'S', h = 60, cell = 2, rho0 = GLASS.lowe.rho0.value } = {}) {
  const site = SCENE.site;
  const B = { id: 'g', name: 'glass', x0: 180, y0: 120, x1: 230, y1: 160, h, roof: 'membrane', wall: '#888888', glass: [face] };
  const scene = { ...SCENE, buildings: [B], trees: [], ground: [{ id: 'base', name: 'ground', mat: 'concrete', poly: [0, 0, 400, 0, 400, 400, 0, 400] }], decor: null };
  const world = buildWorld(scene, { svf: false });
  const f = glassFacades(world)[0];
  const sun = solarPosition(site, hour);
  const sv = sunVector(sun.alt, sun.az);
  const cosT = sv[0] * f.n[0] + sv[1] * f.n[1];
  const theta = Math.acos(cosT) / DEG;
  const rho = glassRho(rho0, theta);
  const ir = irradiance(sun.alt);
  const sinb = Math.sin(sun.alt * DEG);
  const n = Math.round(400 / cell);
  const ground = (i) => world.buildingAt(((i % n) + 0.5) * cell, (Math.floor(i / n) + 0.5) * cell) < 0;
  const r = reflectField(world, sun, { n, cell, S: 1 }, ground);
  // irradiance per cell, W m-2
  let sum = 0;
  let max = 0;
  let farPlane = 0;
  const mx = sv[0] - 2 * cosT * f.n[0];
  const my = sv[1] - 2 * cosT * f.n[1];
  const L = Math.hypot(mx, my); // = cos(beta)
  const k = -(mx * f.n[0] + my * f.n[1]) / L; // plane distance gained per metre of travel along the mirrored azimuth
  for (let i = 0; i < n * n; i++) {
    const v = rho0 * r.A[i] + (1 - rho0) * r.B[i];
    if (v <= 0) continue;
    const E = v * ir.beam * sinb;
    sum += E * cell * cell;
    max = Math.max(max, E);
    const x = ((i % n) + 0.5) * cell;
    const y = (Math.floor(i / n) + 0.5) * cell;
    farPlane = Math.max(farPlane, x * f.n[0] + y * f.n[1] - f.c0); // distance in front of the façade
  }
  const expectE = rho * ir.beam * sinb;
  const facadeArea = (f.u[1] - f.u[0]) * (f.z[1] - f.z[0]);
  const reflectedPower = rho * ir.beam * cosT * facadeArea;
  const farExpect = h / Math.tan(sun.alt * DEG);
  return {
    hour,
    face,
    theta,
    rho,
    beta: sun.alt,
    cellE: max,
    expectE,
    // far edge: farthest lit cell centre along the mirrored azimuth, and the
    // same as a distance in front of the façade (where one cell is one cell)
    far: farPlane / k,
    farExpect,
    farPlane,
    farPlaneExpect: farExpect * k,
    cell,
    closure: sum / reflectedPower,
    max,
    bound: expectE,
  };
}

/** Flat-ground cases: a west face at 50°, south faces at 76° and 84°, an east face at 61° and one at 88.5° (every tower's east face at noon). */
export const SPECULAR_CASES = [[15, 'W'], [12, 'S'], [15, 'S'], [10, 'E'], [12, 'E']];

/**
 * Lit ground area of each sunlit glass façade in the block (page sampling)
 * against its unobstructed area A cos(theta) / sin(beta), hourly 8:00-17:00.
 * Obstruction and the block edge only lower it; it can never exceed 1.
 */
export function litAreaRatio() {
  const { world } = base3();
  const facades = glassFacades(world);
  const cellA = (world.cell / 2) ** 2;
  let max = 0;
  let worst = null;
  for (let h = 8; h <= 17; h++) {
    const sun = solarPosition(SCENE.site, h);
    const sv = sunVector(sun.alt, sun.az);
    const area = new Map();
    reflectField(world, sun, { n: world.n, cell: world.cell, S: 2 }, (i) => world.bld[i] < 0, {
      trace: (i, x, y, f, g, tr, cover) => area.set(f, (area.get(f) ?? 0) + cover * cellA),
    });
    for (const [f, A] of area) {
      const cosT = sv[0] * f.n[0] + sv[1] * f.n[1];
      const ideal = ((f.u[1] - f.u[0]) * (f.z[1] - f.z[0]) * cosT) / Math.sin(sun.alt * DEG);
      if (A / ideal > max) {
        max = A / ideal;
        worst = { h, b: world.buildings[f.b].id, face: f.face };
      }
    }
  }
  return { max, worst };
}

/**
 * The spot cell with the largest ΔTmrt (any glass, 12:00 or 15:00) and the
 * façades that light it at that hour: [{b, face, theta, rho, cover}].
 */
export function maxSpotCell() {
  const { world, setup } = base3();
  let best = null;
  for (const g of GLASS_IDS) {
    const T = setup.model(g);
    const O = setup.off(g);
    for (const h of [12, 15]) {
      for (let i = 0; i < world.n * world.n; i++) {
        if (world.bld[i] >= 0 || cellMat(world, i) === 'water' || T.refl(i, h) < SPOT_MIN) continue;
        const d = T.tmrt(i, h) - O.tmrt(i, h);
        if (!best || d > best.d) best = { d, g, h, i, tmrt: T.tmrt(i, h), off: O.tmrt(i, h), sunlit: T.sunlit(i, h) };
      }
    }
  }
  const sun = solarPosition(SCENE.site, best.h);
  const sv = sunVector(sun.alt, sun.az);
  const by = new Map();
  reflectField(world, sun, { n: world.n, cell: world.cell, S: 2 }, (i) => i === best.i, {
    trace: (i, x, y, f, g, tr, cover) => by.set(f, (by.get(f) ?? 0) + (cover * tr) / 4),
  });
  best.facades = [...by].map(([f, c]) => {
    const theta = Math.acos(sv[0] * f.n[0] + sv[1] * f.n[1]) / DEG;
    return { b: world.buildings[f.b].id, name: world.buildings[f.b].name, face: f.face, theta, rho: glassRho(GLASS[best.g].rho0.value, theta), cover: c };
  });
  return best;
}

/** Mean ΔTmrt (glass vs the same glass with reflection off) over spot cells whose reflected share r is in [lo, hi]. */
export function dTmrtByRho(g, h, lo = 0.1, hi = 0.3) {
  const { world, setup } = base3();
  const T = setup.model(g);
  const O = setup.off(g);
  const d = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || cellMat(world, i) === 'water') continue;
    const r = T.refl(i, h);
    if (r >= lo && r <= hi) d.push(T.tmrt(i, h) - O.tmrt(i, h));
  }
  const mean = d.reduce((a, b) => a + b, 0) / Math.max(1, d.length);
  return { g, h, n: d.length, mean, min: Math.min(...d), max: Math.max(...d), inBand: d.filter((x) => x >= 1 && x <= 6).length };
}

/** Spot numbers per glass at 12:00 and 15:00 (spots key dropped). */
export function spotRows() {
  const { world, setup } = base3();
  const rows = [];
  for (const g of GLASS_IDS) {
    for (const h of [12, 15]) {
      const st = spotStats(setup, world, g, h);
      delete st.spots;
      rows.push(st);
    }
  }
  return rows;
}

/** Canyon numbers (low-e glass, the page default). */
export function canyons(g = 'lowe') {
  const { world, setup, refs, scene } = base3();
  const T = setup.model(g);
  const out = {};
  for (const [k, seg] of Object.entries(scene.canyons)) {
    const c = canyonStats(world, T, seg, refs[seg.mat]);
    c.name = seg.name;
    // the same floor with the glass reflection switched off
    c.ts15ShadeOff = (() => {
      const O = setup.off(g);
      const sh = c.cells.filter((i) => T.sunlit(i, 15) < 0.05);
      return sh.reduce((s, i) => s + O.ts(i, 15), 0) / Math.max(1, sh.length);
    })();
    delete c.cells;
    out[k] = c;
  }
  return out;
}

/**
 * Diffuse wall reflection on the canyon floors: daily shortwave with the wall
 * term at the top of its range (a_w 0.5) against no wall term, and the same at 15:00.
 */
export function wallBound(g = 'lowe') {
  const { world, setup, scene } = base3();
  const T = setup.model(g);
  const k = 0.5 / MODEL.wallAlbedo.value;
  const out = {};
  for (const [name, seg] of Object.entries(scene.canyons)) {
    const cells = [];
    for (let i = 0; i < world.n * world.n; i++) {
      const x = ((i % world.n) + 0.5) * world.cell;
      const y = (Math.floor(i / world.n) + 0.5) * world.cell;
      if (world.bld[i] < 0 && x > seg.x0 && x < seg.x1 && y > seg.y0 && y < seg.y1) cells.push(i);
    }
    let base = 0;
    let walls = 0;
    let base15 = 0;
    let walls15 = 0;
    for (const i of cells) {
      for (let q = 0; q < 96; q++) {
        const sw = T.shortwave(i, q / 4);
        base += sw.K - sw.walls;
        walls += sw.walls * k;
      }
      const s15 = T.shortwave(i, 15);
      base15 += s15.K - s15.walls;
      walls15 += s15.walls * k;
    }
    out[name] = { day: walls / base, h15: walls15 / base15, n: cells.length };
  }
  return out;
}

/**
 * Walkers at 15:00 on the default glass: people per m2 by class (plain
 * shade, reflection spot in shade, any spot, sun) averaged over frames.
 */
export function walkers(g = 'lowe', hour = 15) {
  const { world, setup, scene } = base3();
  const T = setup.model(g);
  const gs = glassShade(world, () => T, () => g);
  const life = new Life(scene, gs.shadeFor, (h) => T.air(h));
  const sh = gs.shadeFor(hour);
  const acc = { plainShade: 0, spotShade: 0, spots: 0, sun: 0, count: [0, 0, 0, 0, 0], area: null };
  let k = 0;
  for (let t = 0; t < 1200; t += 20) {
    const d = classDensity(world, life.at(t, hour), sh);
    acc.plainShade += d.plainShade;
    acc.spotShade += d.spotShade;
    acc.spots += d.spots;
    acc.sun += d.sun;
    d.count.forEach((c, i) => (acc.count[i] += c));
    acc.area = d.area;
    k++;
  }
  for (const key of ['plainShade', 'spotShade', 'spots', 'sun']) acc[key] /= k;
  acc.weights = sh.spotW;
  return acc;
}

/**
 * Acceptance bands (spec #8): {label, value, lo, hi, unit, kind, inside}.
 * Bands are the spec's; values are not tuned (every input stays at its cited
 * value or inside its cited range).
 */
export function bands3() {
  const rows = [];
  const add = (label, value, lo, hi, src, unit = 'K') => rows.push({ label, value: Math.round(value * 1000) / 1000, lo, hi, unit, src, inside: (lo === null || value >= lo) && (hi === null || value <= hi) });
  for (const r of canyonSvfRows()) add(`Canyon SVF, H/W ${r.hw}: horizon scan in the limit minus 1/√(1+(2H/W)²)`, r.fine - r.exact, -0.02, 0.02, 'brief3', '');
  add('Fresnel, clear glass, ρ(0°)', fresnelPane(0), 0.077, 0.087, 'fresnel', '');
  add('Fresnel, clear glass, ρ(75°)', fresnelPane(75), 0.38, 0.44, 'fresnel', '');
  for (const [hour, face] of SPECULAR_CASES) {
    const sc = specularCheck({ hour, face, cell: 0.5 });
    const tag = `${face} face at ${hour}:00 (θ ${Math.round(sc.theta)}°)`;
    add(`Flat ground, ${tag}: lit cell irradiance / ρ(θ) I sinβ − 1`, sc.cellE / sc.expectE - 1, -0.01, 0.01, 'brief3', '');
    add(`Flat ground, ${tag}: far edge in front of the façade minus (H/tanβ) along the mirrored azimuth (m, 0.5 m cells)`, sc.farPlane - sc.farPlaneExpect, -sc.cell, sc.cell, 'brief3', 'm');
    add(`Flat ground, ${tag}: energy on the ground / reflected by the façade − 1 (0.5 m cells)`, sc.closure - 1, -0.03, 0.03, 'brief3', '');
    add(`Flat ground, ${tag}: energy closure − 1 at the page's 2.5 m sampling`, specularCheck({ hour, face, cell: 2.5 }).closure - 1, -0.03, 0.03, 'brief3', '');
  }
  const la = litAreaRatio();
  add('In the block: largest lit ground area of any façade / its unobstructed area (8:00–17:00)', Math.round(la.max * 1e6) / 1e6, null, 1, 'brief3', '');
  for (const g of GLASS_IDS) {
    for (const h of [12, 15]) {
      const d = dTmrtByRho(g, h);
      add(`${GLASS[g].name}, ${h}:00: mean ΔTmrt in spot cells with r 0.1–0.3 (n ${d.n})`, d.mean, 1, 6, 'brief3');
    }
  }
  const all = spotRows();
  for (const r of all) add(`${GLASS[r.g].name}, ${r.h}:00: mean ΔTmrt over all spot cells (r ≥ ${SPOT_MIN}, n ${r.n}), read against the same band`, r.dTmrt, 1, 6, 'brief3');
  add('Largest ΔTmrt in any spot cell, any glass, 12:00 or 15:00', Math.max(...all.map((r) => r.dTmrtMax)), null, 13, 'du2025');
  const wb = wallBound();
  for (const [k, v] of Object.entries(wb)) add(`Wall term at a_w 0.5: extra daily shortwave on the ${base3().scene.canyons[k].name} floor (share)`, v.day, 0, 0.3, 'brief3', '');
  const c = canyons();
  add(`Night lag, ${c.lane.name} (H/W ${c.lane.hw.toFixed(1)}) floor minus open stone, 05:00`, c.lane.lag05, 2, 6, 'engine');
  add(`${c.deep.name} (H/W ${c.deep.hw.toFixed(1)}) floor in shade at 15:00 (°C)`, c.deep.ts15Shade, 34, 40, 'brief', '°C');
  const w = walkers();
  add('Walkers at 15:00: people per m² in shaded spots / in plain shade', w.spotShade / w.plainShade, null, 0.999, 'melnikov', '');
  return rows;
}
