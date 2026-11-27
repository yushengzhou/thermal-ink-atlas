// Block 5 (hutong) model checks: moist-air formulas and the q_sat table, the
// water store (never negative, mass balance, at most W0 per splash, wet
// paving above the wet-bulb), the old EF path alone, the splash bands, lane
// geometry (noon sunlit share, sky view vs the endless canyon), the fine
// shade samples (ray-marched mask and scanline rasteriser match the polygon
// rasteriser), the acceptance bands with their pinned deviations, basis tags,
// and that blocks 1-4 are untouched (an empty water store reproduces the dry
// model bit for bit; none of them asks for the new paths).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base5, extras5, bands5, walkers5 } from '../../scripts/hutong.mjs';
import { bands5Markdown } from '../../scripts/hutong-docs.mjs';
import { satVapour, specificHumidity, qSat, qSatTable, wetBulb, runModel, sunSlots, svfGridAt, svfAt, buildingMaskRay, buildingMaskPoly, stepSplash, CP_AIR, LATENT, SLOTS, SIGMA } from '../../engine/thermal.js';
import { rasterise, rasteriseScan, solarPosition, boxShadow } from '../../engine/sun.js';
import { buildWorld } from '../../engine/world.js';
import { MATERIALS, MODEL, SOURCES, BASIS, paramKeys } from '../../engine/materials.js';
import { canyonSvf, laneInterior, splashCells, splashParams, waterBalance } from '../../engine/hutong.js';
import { makeRng } from '../../engine/core.js';
import { SCENE } from '../../cities/hutong/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';
import { SCENE as S4 } from '../../cities/waterfront/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('moist air: saturation vapour pressure, specific humidity, wet-bulb, and the q_sat table', () => {
  assert.equal(satVapour(0), 6.112);
  assert.ok(Math.abs(satVapour(20) - 23.37) < 0.05, `e_s(20) ${satVapour(20)}`);
  assert.ok(Math.abs(satVapour(30) - 42.46) < 0.1, `e_s(30) ${satVapour(30)}`);
  assert.ok(Math.abs(specificHumidity(25) - 0.0155) < 2e-4);
  // psychrometric tables: 30 C at 50% relative humidity -> wet-bulb about 22.0-22.2 C
  const tw = wetBulb(30, 0.5 * satVapour(30));
  assert.ok(tw > 21.6 && tw < 22.6, `wet-bulb ${tw}`);
  assert.ok(Math.abs(wetBulb(25, satVapour(25)) - 25) < 1e-6, 'saturated air: wet-bulb = air');
  let e = 0;
  for (let T = 240; T < 365; T += 0.0137) e = Math.max(e, Math.abs(qSatTable(T) - qSat(T - 273.15)));
  assert.ok(e < 2e-7, `table error ${e}`);
});

test('the water store: never negative, mass balance closes, one splash evaporates at most W0, wet paving stays above the wet-bulb', () => {
  const { s, setup, wet } = base5();
  const w = waterBalance(wet, setup.cells);
  assert.ok(w.wMin >= 0, `W min ${w.wMin}`);
  assert.ok(w.balanceErr < 1e-9, `balance ${w.balanceErr}`);
  assert.ok(w.perSplash <= splashParams().w0 + 1e-12, `per splash ${w.perSplash}`);
  assert.ok(w.evapMax <= splashParams().w0 + w.drift + 1e-12, 'a day evaporates W0 plus the store\'s day-to-day drift at most');
  assert.ok(s.margin >= 0, `wet paving ${s.margin} K below the wet-bulb`);
  // dry cells and cells outside the splash set hold no water
  const set = new Set(setup.cells);
  for (let i = 0; i < 6400; i++) if (!set.has(i)) assert.equal(wet.water(i, 21), 0);
  assert.equal(setup.base().water(setup.cells[0], 21), 0, 'the dry model has no store');
});

/** One wet cell for stepSplash: a sunlit open patch of grey brick (no restore term, so Ts follows G only). */
function oneCell(W, beta, wc, Ts) {
  const m = MATERIALS.greyBrick;
  return {
    NN: 1, water: Uint8Array.of(0), svf: Float32Array.of(1), alpha: Float32Array.of(m.alpha.value), eps: Float32Array.of(m.eps.value),
    cap: Float32Array.of(1e-5), restore: Float32Array.of(0), ef: Float32Array.of(0), cw: Float32Array.of(0), cwa: Float32Array.of(0),
    Ts: Float32Array.of(Ts), Td: Float32Array.of(Ts), sumDay: new Float64Array(1), hc: 9.5, hcA: null, dt: 60, wt: new Float64Array(4),
    WS: { wet: Uint8Array.of(1), W: Float64Array.of(W), evap: new Float64Array(1), qa: specificHumidity(25), beta, wc, efOn: false, efWet: 1 },
  };
}
const ONE = [Float32Array.of(1), Float32Array.of(1)];

test('water store, step by step: W follows an independent integration of the bulk flux from W0', () => {
  const C = oneCell(1.0, 0.5, 0.2, 273.15 + 40);
  const taK = 273.15 + 32;
  const lsky = 400;
  let W = 1.0;
  let evap = 0;
  for (let k = 0; k < 600; k++) {
    // the flux restated here from the formula, with the exact q_sat (the model reads a table)
    const T = C.Ts[0];
    const dq = qSat(T - 273.15) - C.WS.qa;
    let E = dq > 0 ? 0.5 * Math.min(1, W / 0.2) * (9.5 / CP_AIR) * dq : 0;
    if (E * 60 > W) E = W / 60;
    W -= E * 60;
    evap += E * 60;
    stepSplash(C, ONE[0], ONE[1], 0, 300, 50, 0, 0, lsky, 0, taK);
    assert.ok(Math.abs(C.WS.W[0] - W) < 1e-6, `step ${k}: model W ${C.WS.W[0]} vs integrated ${W}`);
  }
  assert.ok(W < 0.95, `the patch dries: W ${W}`);
  assert.ok(Math.abs(C.WS.evap[0] - evap) < 1e-6 && Math.abs(1.0 - C.WS.W[0] - C.WS.evap[0]) < 1e-12, 'W0 = W + evaporated');
  assert.ok(C.WS.evap[0] * LATENT > 0);
});

test('water store, cap: a step that would evaporate more than is left empties the store exactly, never below 0', () => {
  // a hot, wet-looking patch with almost no water: beta 1, tiny W_c, so E dt >> W
  const C = oneCell(1e-5, 1, 1e-9, 273.15 + 60);
  const before = C.Ts[0];
  stepSplash(C, ONE[0], ONE[1], 0, 800, 100, 0, 0, 450, 0, 273.15 + 35);
  assert.equal(C.WS.W[0], 0, 'store emptied exactly');
  assert.equal(C.WS.evap[0], 1e-5, 'evaporated what was there');
  const D = oneCell(0, 1, 1e-9, 273.15 + 60);
  stepSplash(D, ONE[0], ONE[1], 0, 800, 100, 0, 0, 450, 0, 273.15 + 35);
  // the capped latent heat is the difference between the two cells' warming: L x 1e-5 kg over the step
  const dT = (D.Ts[0] - before) - (C.Ts[0] - before);
  assert.ok(Math.abs(dT - 1e-5 * 1e-5 * LATENT) < 1e-3, `latent cooling ${dT}`);
  for (let k = 0; k < 10; k++) stepSplash(C, ONE[0], ONE[1], 0, 800, 100, 0, 0, 450, 0, 273.15 + 35);
  assert.equal(C.WS.W[0], 0);
});

test('splash bands (spec #10): peak −3 to −8 K within 1 h, −1 to −6 K at 23:00, |ΔTs| ≤ 1.5 K the next afternoon, Tmrt −0.5 to −3.5 K', () => {
  const { s } = base5();
  console.log(`  peak ${s.peak.toFixed(2)} K at ${s.peakAt} h, 23:00 ${s.d23.toFixed(2)} K, next 15:00 ${s.next15.toFixed(2)} K, ΔTmrt 20:00 ${s.tmrt20.toFixed(2)} K`);
  assert.ok(s.peak <= -3 && s.peak >= -8);
  assert.ok(s.peakAt <= splashParams().hour + 1);
  assert.ok(s.d23 <= -1 && s.d23 >= -6);
  assert.ok(Math.abs(s.next15) <= 1.5);
  assert.ok(s.tmrt20 <= -0.5 && s.tmrt20 >= -3.5);
  assert.ok(s.tmrt21 <= -0.5 && s.tmrt21 >= -3.5);
  assert.ok(Math.abs(s.svf - 0.5) < 0.1, 'the band cells are lanes with a sky view about 0.5');
});

test('the old evaporation term alone cannot show an evening splash (< 0.5 K): net radiation is negative after the splash', () => {
  const { world, dry, band } = base5();
  const ex = extras5();
  console.log(`  EF := 1 from 19:00: largest |ΔTs| ${ex.ef.max.toFixed(3)} K`);
  assert.ok(ex.ef.max < 0.5);
  // why: Q* on the band cells is negative from the splash hour to midnight
  for (const h of [19.5, 20, 22, 23.5]) {
    for (const i of band) {
      const sw = dry.shortwave(i, h);
      const m = MATERIALS.greyBrick;
      const t = dry.ts(i, h) + 273.15;
      const L = world.svf[i] * dry.hourConst(h).lsky + (1 - world.svf[i]) * dry.lwall(i, h);
      const q = (1 - m.alpha.value) * sw.K + m.eps.value * L - m.eps.value * SIGMA * t ** 4;
      assert.ok(q < 0, `Q* ${q} at ${h} h`);
    }
  }
});

test('an empty water store reproduces the dry model bit for bit (block 1 world, and the hutong subset)', () => {
  const w = buildWorld(S1);
  const slots = sunSlots(w);
  const a = runModel(w, { slots, minDays: 3, maxDays: 3 });
  const b = runModel(w, { slots, minDays: 3, maxDays: 3, splash: { cells: [1, 2, 3, 500], w0: 0, beta: 0.5, wc: 0.2, hour: 19 } });
  let diff = 0;
  for (let i = 0; i < a.store.length; i++) if (a.store[i] !== b.store[i]) diff++;
  assert.equal(diff, 0, 'W0 = 0 must give the dry model exactly');
  const { world, slots: sl, dry } = base5();
  const cells = splashCells(world).slice(0, 60);
  // no coarse spin-up on either side (the guard turns it off for wet runs: latent coupling at 340 K)
  const c = runModel(world, { slots: sl, cells, minDays: 3, maxDays: 3 });
  const d = runModel(world, { slots: sl, cells, minDays: 3, maxDays: 3, splash: { cells, ...splashParams(), w0: 0 } });
  for (const i of cells) for (let k = 0; k < 96; k++) assert.equal(d.store[i * 96 + k], c.store[i * 96 + k]);
  assert.ok(dry.info.days >= 3);
});

test('blocks 1–4 never ask for the new paths: no screens, no fine shade samples, no exact sky view, no water store', () => {
  for (const sc of [S1, S2, S3, S4]) {
    assert.ok(!sc.screens && !sc.shadeSamples && !sc.svfExact && !sc.splashCourts && !sc.hutongBlock, sc.id);
    const w = buildWorld(sc, { svf: false });
    assert.equal(w.screens, undefined);
    assert.equal(w.shadeS, undefined);
    assert.ok(!w.trees.some((t) => t.species), sc.id);
  }
});

test('exact horizon scan: an endless canyon matches its analytic sky view; the old 2.5 m scan does not in a 5 m lane', () => {
  const n = 80;
  const cell = 5;
  const height = new Float32Array(n * n);
  // walls 4 m high, rows 30 and 32 (y 150-155 and 160-165): a 5 m lane at y 155-160
  for (let i = 0; i < n; i++) {
    height[30 * n + i] = 4;
    height[32 * n + i] = 4;
  }
  const v = svfGridAt({ n, cell, height }, 200, 157.5, 0.01, 64, 160);
  assert.ok(Math.abs(v - Math.cos(Math.atan(1.6))) < 0.01, `svf ${v} vs ${Math.cos(Math.atan(1.6))}`);
  const heightAt = (x, y) => (x < 0 || y < 0 || x >= 400 || y >= 400 ? 0 : height[Math.floor(y / cell) * n + Math.floor(x / cell)]);
  const old = svfAt(heightAt, 200, 157.5, 0.01, 64, 160, cell / 2);
  assert.ok(old - Math.cos(Math.atan(1.6)) > 0.1, `the 2.5 m scan reads ${old}`);
  assert.ok(Math.abs(canyonSvf(4, 2.5, 2.5) - Math.cos(Math.atan(1.6))) < 1e-12);
});

test('lane geometry (spec #10): noon sunlit share within ±0.05 of 1 − (H/tan β)/W; sky view within ±0.05 of the canyon at the cells', () => {
  const { lanes, noon } = base5();
  assert.ok(Math.abs(noon.alt - 73.5) < 0.2, `noon sun ${noon.alt}`);
  const ew = lanes.filter((l) => l.noon && l.n);
  assert.ok(ew.length >= 5);
  for (const l of ew) {
    console.log(`  ${l.name}: W ${l.W} H ${l.H} noon ${l.noon.sunlit.toFixed(3)} vs ${l.noon.analytic.toFixed(3)}; SVF ${l.svf.toFixed(3)} vs ${l.svfCells.toFixed(3)} (centre line ${l.svfCentre.toFixed(3)})`);
    assert.ok(Math.abs(l.noon.sunlit - l.noon.analytic) <= 0.05, l.id);
  }
  for (const l of lanes.filter((x) => x.n)) {
    assert.ok(Math.abs(l.svf - l.svfCells) <= 0.05, l.id);
    if (l.W === 5) assert.ok(Math.abs(l.svf - l.svfCentre) <= 0.05, `${l.id}: 5 m lane cells sit on the centre line`);
    assert.ok(l.W >= 5 && l.W <= 10, 'lanes 5-10 m');
  }
  const { world } = base5();
  assert.deepEqual(laneInterior(world, { y0: 65, y1: 70 }).length, lanes.find((l) => l.id === 'jujube').n);
});

test('fine shade samples: the ray-marched building mask equals the cast-shadow polygons on every ground and roof sample, every daylight slot', () => {
  const { world } = base5();
  const S = world.shadeS;
  assert.equal(S, 4);
  const same = (w, sun) => {
    const a = buildingMaskPoly(w, sun);
    const r = buildingMaskRay(w, sun);
    let diff = 0;
    for (let k = 0; k < a.length; k++) if (a[k] !== r[k]) diff++;
    return diff;
  };
  let slots = 0;
  for (let k = 0; k < SLOTS; k++) {
    const sun = solarPosition(SCENE.site, (k * 24) / SLOTS);
    if (sun.alt <= 0) continue;
    slots++;
    assert.equal(same(world, sun), 0, `slot ${k}`);
  }
  assert.ok(slots > 80, `${slots} daylight slots`);
  // a test block with houses of 4, 7 and 12 m: lower roofs are shaded by taller neighbours
  const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1];
  const test = buildWorld({ size: 100, seed: 1, shadeSamples: 4, ground: [{ id: 'g', name: 'g', mat: 'greyBrick', poly: rect(0, 0, 100, 100) }], trees: [], buildings: [
    { id: 'a', x0: 20, y0: 20, x1: 40, y1: 30, h: 12, roof: 'greyTile' },
    { id: 'b', x0: 20, y0: 30, x1: 40, y1: 45, h: 4, roof: 'greyTile' },
    { id: 'c', x0: 45, y0: 20, x1: 55, y1: 60, h: 7, roof: 'greyTile' },
    { id: 'd', x0: 55, y0: 20, x1: 70, y1: 60, h: 4, roof: 'greyTile' },
  ] }, { svf: false });
  let roofShaded = 0;
  for (let k = 0; k < SLOTS; k++) {
    const sun = solarPosition(SCENE.site, (k * 24) / SLOTS);
    if (sun.alt <= 0) continue;
    assert.equal(same(test, sun), 0, `test block, slot ${k}`);
    const r = buildingMaskRay(test, sun);
    for (let c = 0; c < test.n * test.n; c++) if (test.bld[c] >= 0) for (let q = 0; q < 16; q++) roofShaded += r[c * 16 + q];
  }
  assert.ok(roofShaded > 100, 'roof samples are exercised');
  // and the scanline rasteriser equals the per-sample one on random (also self-intersecting) polygons
  const rng = makeRng(7);
  for (let t = 0; t < 40; t++) {
    const pts = [];
    const m = 3 + Math.floor(rng() * 6);
    for (let k = 0; k < m; k++) pts.push(rng() * 60, rng() * 60);
    const a = [];
    const b = [];
    rasterise([pts], { nx: 12, ny: 12, cell: 5 }, (i, p, s) => a.push(i * 16 + s), 4);
    rasteriseScan([pts], { nx: 12, ny: 12, cell: 5 }, (i, p, s) => b.push(i * 16 + s), 4);
    assert.deepEqual(b.sort((x, y) => x - y), a.sort((x, y) => x - y), `polygon ${t}`);
  }
});

test('walkers rest in shade at 15:00 (courtyard trees, pergolas, awnings)', () => {
  const w = walkers5(15);
  console.log(`  dwellers in shade ${w.building + w.canopy} of ${w.n}; walkers' shade density ratio ${w.ratio.toFixed(2)}`);
  assert.ok(w.shadeShare >= 0.5);
  assert.ok(w.ratio > 1);
});

// Rows outside their band, pinned (reported in docs/sources.md, not tuned away).
const PINNED_OUTSIDE = {
  'Pagoda Tree Hutong: sky view (model, cells 2.5 m off the centre line) minus cos(atan(2H/W)) = 0.781 on the centre line': -0.069,
  'Grey tile roofs at 15:00 (n)': 66.862,
  'Lane floor in shade at 15:00 (sunlit share ≤ 0.3, n) minus the air': 14.162,
  'Lane floor in shade at 13:00, 14:00 and 15:00 (n) minus the air at 15:00': 10.246,
};
const key = (label) => label.replace(/n \d+/g, 'n');

test('acceptance bands: values, pinned deviations, docs table in sync', () => {
  const rows = bands5();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k]) <= 0.25, `${k}: ${v} (pinned ${PINNED_OUTSIDE[k]})`);
  assert.ok(md.includes(bands5Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['**Air fixed:**', 'quoted, not simulated', '**Grid:**', 'does **not** ignore trees', '**Daily splash:**', 'no citable source', 'abstracts only', 'not changed after the bands were checked', 'Not tuned.']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
});

test('every block-5 value has a source and a basis tag; unverified values are flagged', () => {
  for (const k of ['waterStore', 'satVapour', 'splashW0', 'splashBeta', 'splashWc', 'splashHour', 'shadeSamples', 'screenCover']) {
    const p = MODEL[k];
    assert.ok(p && p.source in SOURCES && p.basis in BASIS, k);
    assert.equal(p.verified, false, `${k}: nothing here was checked against a primary source`);
    assert.ok(md.includes(`\`${k}\``), `${k} missing in sources.md`);
  }
  for (const id of ['greyBrick', 'greyTile', 'jujube', 'pomegranate', 'pagodaTree', 'pergola', 'awning']) {
    const m = MATERIALS[id];
    for (const k of paramKeys(m)) {
      assert.ok(m[k].source in SOURCES && m[k].basis in BASIS, `${id}.${k}`);
      assert.equal(m[k].verified, false, `${id}.${k}`);
    }
    if (m.tree || id === 'awning') assert.ok(m.tr && m.tr.value > 0 && m.tr.value < 1, `${id}.tr`);
  }
  // species transmissions follow exp(-0.5 LAI) inside the brief's LAI ranges
  for (const [id, lo, hi] of [['jujube', 1.5, 2.5], ['pomegranate', 2, 3], ['pagodaTree', 3, 4], ['pergola', 2, 3]]) {
    const lai = -2 * Math.log(MATERIALS[id].tr.value);
    assert.ok(lai >= lo - 0.02 && lai <= hi + 0.02, `${id}: LAI ${lai}`);
  }
  // values inside the brief's ranges
  assert.ok(MODEL.splashW0.value >= 0.5 && MODEL.splashW0.value <= 1.0);
  assert.ok(MODEL.splashBeta.value >= 0.3 && MODEL.splashBeta.value <= 1);
  assert.ok(MATERIALS.greyBrick.alpha.value >= 0.15 && MATERIALS.greyBrick.alpha.value <= 0.3);
  assert.ok(MATERIALS.greyTile.alpha.value >= 0.12 && MATERIALS.greyTile.alpha.value <= 0.25);
  assert.ok(MATERIALS.awning.tr.value >= 0.1 && MATERIALS.awning.tr.value <= 0.3);
  for (const k of ['brief5', 'hendel2015', 'hendel2016', 'takebayashi2023', 'kato2008', 'nippon', 'lin2019', 'spainCourtyard', 'yang2024', 'carb', 'midlandBrick', 'sohuRoof', 'miller2007', 'ucdavis', 'jjshs', 'deng', 'visitBeijing', 'bolton1980']) assert.ok(md.includes(`**[${k}]**`), k);
});

test('scene: lanes 5–10 m on the grid, at most five notes, splash cells in lanes and courtyards, species trees and screens', () => {
  assert.ok(SCENE.notes.length <= 5 && SCENE.notes.length === 5);
  for (const l of SCENE.lanes) assert.ok(l.y1 - l.y0 >= 5 && l.y1 - l.y0 <= 10 && l.y0 % 5 === 0, l.id);
  for (const B of SCENE.buildings) for (const v of [B.x0, B.y0, B.x1, B.y1]) assert.equal(v % 5, 0, B.id);
  const { world, setup } = base5();
  assert.ok(setup.cells.length > 100);
  assert.ok(SCENE.ground.filter((g) => g.splash).length === 2);
  assert.ok(world.trees.every((t) => ['jujube', 'pomegranate', 'pagodaTree'].includes(t.species)));
  assert.ok(world.screens.some((p) => p.kind === 'awning') && world.screens.some((p) => p.kind === 'pergola'));
  assert.equal(world.shadeS, 4);
});
