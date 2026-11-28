// Block 6 (car park and brownfield) model checks: the stored ground heat flux
// (a flux run matches a plain run bit for bit; G closes the daily balance of a
// slab and equals C dTs/dt on a thin roof; stepFlux and stepPlain agree),
// parked cars as a sub-grid shade and the PV canopy's sky view, damping depths,
// the acceptance bands with their pinned deviations and the docs table, basis
// tags, the scene's geometry, and that blocks 1-5 never ask for the new paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base6, bands6, pv6, thin6, cabinNumbers, bandVerdicts } from '../../scripts/parking.mjs';
import { bands6Markdown } from '../../scripts/parking-docs.mjs';
import { runModel, sunSlots, stepFlux, SIGMA } from '../../engine/thermal.js';
import { buildWorld, GROUND_MATS, depthOrder } from '../../engine/world.js';
import { drawWorld } from '../../engine/kit.js';
import { HT_DRAW } from '../../engine/htkit.js';
import { MATERIALS, MODEL, SOURCES, BASIS, paramKeys } from '../../engine/materials.js';
import { carBox, carShareField, slab, STEMPIHAR, tsMean, fluxMean } from '../../engine/parking.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { SCENE } from '../../cities/parking/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';
import { SCENE as S4 } from '../../cities/waterfront/scene.js';
import { SCENE as S5 } from '../../cities/hutong/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('a flux run matches a plain run bit for bit (block 6 cells and a block 1 subset)', () => {
  const { world, slots, C } = base6();
  const cells = [...C.openAsphalt.slice(0, 40), ...C.shed.slice(0, 20), ...C.lawn.slice(0, 20), ...C.pvBays.slice(0, 20)];
  const a = runModel(world, { slots, cells });
  const b = runModel(world, { slots, cells, flux: true });
  assert.equal(a.info.flux, undefined, 'a plain run keeps no flux');
  assert.ok(b.info.flux instanceof Float32Array);
  for (let k = 0; k < a.store.length; k++) if (a.store[k] !== b.store[k]) assert.fail(`store differs at ${k}`);
  const w1 = buildWorld(S1);
  const s1 = sunSlots(w1);
  const c1 = Array.from({ length: 200 }, (_, k) => k * 31);
  const p1 = runModel(w1, { slots: s1, cells: c1 });
  const f1 = runModel(w1, { slots: s1, cells: c1, flux: true });
  for (let k = 0; k < p1.store.length; k++) if (p1.store[k] !== f1.store[k]) assert.fail(`block 1 store differs at ${k}`);
  assert.equal(p1.flux(c1[0], 12), null, 'no flux unless asked for');
});

test('stepFlux is stepPlain plus G: same Ts on a synthetic cell, and G is the residual it steps with', () => {
  const mk = () => ({
    NN: 2, water: Uint8Array.of(0, 0), svf: Float32Array.of(1, 0.4), alpha: Float32Array.of(0.12, 0.3), eps: Float32Array.of(0.95, 0.9),
    cap: Float32Array.of(1e-5, 1 / 3000), restore: Float32Array.of((2 * Math.PI) / 86400, 0), ef: Float32Array.of(0, 0.2), cw: Float32Array.of(0.01, 0.1), cwa: Float32Array.of(0.001, 0.03),
    Ts: Float32Array.of(320, 305), Td: Float32Array.of(305, 305), sumDay: new Float64Array(2), hc: 11.4, dt: 60,
  });
  const C = mk();
  const G = new Float64Array(2);
  stepFlux(C, Float32Array.of(1, 0.3), Float32Array.of(1, 0.3), 0, 700, 80, 120, 300, 420, 450, 306, 0, G);
  // the same balance restated here
  for (let i = 0; i < 2; i++) {
    const D = mk();
    const K = [1, 0.3][i] * 700 + D.svf[i] * 80 + D.cw[i] * 120 + D.cwa[i] * 300;
    const L = D.svf[i] * 420 + (1 - D.svf[i]) * 450;
    const t = D.Ts[i];
    const q = (1 - D.alpha[i]) * K + D.eps[i] * L - D.eps[i] * SIGMA * t ** 4;
    const g = q - 11.4 * (t - 306) - (q > 0 ? D.ef[i] * q : 0);
    assert.ok(Math.abs(G[i] - g) < 1e-6 * Math.abs(g) + 1e-6, `G ${G[i]} vs ${g}`);
    assert.equal(C.Ts[i], Math.fround(t + 60 * (D.cap[i] * g - D.restore[i] * (t - D.Td[i]))));
  }
});

test('G closes the slab balance over a day (mean near 0) and equals C dTs/dt on the thin shed roof', () => {
  const { T, C } = base6();
  for (const k of ['openAsphalt', 'yard', 'soil', 'lawn']) {
    let sum = 0;
    let amp = 0;
    for (let s = 0; s < 96; s++) {
      const g = fluxMean(T, C[k], s / 4);
      sum += g;
      amp = Math.max(amp, Math.abs(g));
    }
    // the deep temperature converged to 0.05 K/day: the daily mean G is a small share of its swing
    assert.ok(Math.abs(sum / 96) < 0.03 * amp, `${k}: mean G ${sum / 96} vs swing ${amp}`);
  }
  // thin layer: G = C dTs/dt, checked against the stored Ts (central difference over 30 min) away from the sun's edges
  const Cs = MATERIALS.rustShed.thinC.value;
  for (const h of [1, 4, 21, 23]) {
    const d = ((tsMean(T, C.shed, h + 0.25) - tsMean(T, C.shed, h - 0.25)) / 1800) * Cs;
    assert.ok(Math.abs(fluxMean(T, C.shed, h) - d) < 0.6, `shed ${h}: G ${fluxMean(T, C.shed, h)} vs C dT/dt ${d}`);
  }
});

test('cars: the cell shares add up to the drawn footprints; sun and sky view lose the car share; PV cells take SVF 0.11', () => {
  const { world, slots } = base6();
  const share = carShareField(world);
  const area = SCENE.cars.reduce((a, c) => {
    const b = carBox(c);
    return a + (b.x1 - b.x0) * (b.y1 - b.y0);
  }, 0);
  const sum = share.reduce((a, x) => a + x, 0) * 25;
  assert.ok(Math.abs(sum - area) < 1e-3 * area, `${sum} vs ${area}`);
  assert.ok(share.every((x) => x >= 0 && x <= 1));
  const { pv, svf0 } = world.parking;
  let nPv = 0;
  for (let i = 0; i < share.length; i++) {
    if (world.bld[i] >= 0) continue;
    const want = (pv[i] ? MODEL.pvSvf.value : svf0[i]) * (1 - share[i]);
    assert.ok(Math.abs(world.svf[i] - want) < 1e-6, `svf ${i}`);
    if (pv[i]) nPv++;
  }
  assert.ok(nPv >= 100, `PV cells ${nPv}`);
  // the slots were shaded once: a fresh, unshaded run of sunSlots differs by exactly (1 - share)
  const raw = sunSlots(world);
  for (const k of [60, 84, 96]) {
    for (let i = 0; i < share.length; i += 7) assert.ok(Math.abs(slots.fields[k][i] - raw.fields[k][i] * (1 - share[i])) < 1e-6);
  }
});

test('damping depth and admittance from the Stempihar inputs match the brief (0.126 m and 0.133 m; 1570 and 1880)', () => {
  const a = slab(STEMPIHAR.hma.k, STEMPIHAR.hma.rho, STEMPIHAR.hma.c);
  const p = slab(STEMPIHAR.pcc.k, STEMPIHAR.pcc.rho, STEMPIHAR.pcc.c);
  assert.ok(Math.abs(a.d - 0.126) < 0.002 && Math.abs(p.d - 0.133) < 0.002, `${a.d} ${p.d}`);
  assert.ok(Math.abs(a.mu - 1570) < 10 && Math.abs(p.mu - 1880) < 10, `${a.mu} ${p.mu}`);
});

// Rows outside their band, as shipped (see docs/sources.md, Block 6): pinned so a change shows up here.
// Each with its own tolerance: K rows 0.1 K, the PV range ratio 0.02.
const PINNED_OUTSIDE = {
  '4. Shed roof: cooling in the first hour after sunset (19.15 h) minus the fastest other surface class (shed 0.98 K)': [-2.285, 0.1],
  '6. Daily range under the PV canopy (8.2 K) vs open asphalt (38.7 K): relative change': [-0.787, 0.02],
};
const key = (label) => label.replace(/n \d+/g, 'n');

test('acceptance bands: values, pinned deviations, docs table in sync', () => {
  const rows = bands6();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k][0]) <= PINNED_OUTSIDE[k][1], `${k}: ${v} (pinned ${PINNED_OUTSIDE[k][0]} ± ${PINNED_OUTSIDE[k][1]})`);
  // the brief's bands: 4 (after sunset) and 6 (PV range) missed; the supplementary evening-window row does not count
  assert.deepEqual(bandVerdicts(rows), { 1: true, 2: true, 3: true, 4: false, 5: true, 6: false, 7: true, 8: true });
  assert.deepEqual(rows.filter((r) => r.supp).map((r) => r.label.slice(0, 18)), ['4. Supplementary (']);
  assert.ok(md.includes(bands6Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['**Air fixed:**', '**No measured night W m⁻² for a car park**', '**Brownfield values are assumptions:**', '**Cars are a sub-grid shade**', 'internal inconsistencies', '**Misses:**', 'Not tuned', 'not changed after the bands were checked', 'information only']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
});

test('every band of the brief is checked: 1-8, each with at least one row', () => {
  const rows = bands6();
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) assert.ok(rows.some((r) => r.label.startsWith(`${n}. `)), `band ${n}`);
});

test('the PV comparison: an empty bay under the canopy is near the open asphalt at dawn and far below it at 15:00', () => {
  const P = pv6();
  assert.ok(Math.abs(P.empty.svf - MODEL.pvSvf.value) < 1e-6);
  assert.ok(P.open.t15 - P.empty.t15 > 20);
  assert.ok(P.empty.range < P.open.range / 2);
});

test('thin layer: a lower admittance raises the daily maximum and lowers the minimum; a higher one does the opposite', () => {
  const t = thin6();
  assert.ok(t.thin.max > t.ref.max && t.thin.min < t.ref.min);
  assert.ok(t.stempihar.max < t.ref.max && t.stempihar.min > t.ref.min);
});

test('the hot-car card quotes its sources (band 7, information only)', () => {
  assert.deepEqual(cabinNumbers(), { sun: 47.6, shade: 39.5, trees: 26 });
});

test('every block-6 value has a source and a basis tag; unverified values are flagged; values inside the brief ranges', () => {
  for (const k of ['groundFlux', 'dampingDepth', 'pvSvf', 'carShade', 'carSky', 'thinPaving']) {
    const p = MODEL[k];
    assert.ok(p && p.source in SOURCES && p.basis in BASIS, k);
    assert.equal(p.verified, false, k);
    assert.ok(md.includes(`\`${k}\``), `${k} missing in sources.md`);
  }
  for (const id of ['ballast', 'drySoil', 'scrub', 'rustShed', 'pvCanopy']) {
    const m = MATERIALS[id];
    for (const k of paramKeys(m)) {
      assert.ok(m[k].source in SOURCES && m[k].basis in BASIS, `${id}.${k}`);
      assert.equal(m[k].verified, false, `${id}.${k}`);
    }
    assert.ok(md.includes(`\`${id}\``), id);
  }
  const M = MATERIALS;
  assert.ok(M.ballast.alpha.value >= 0.1 && M.ballast.alpha.value <= 0.3 && M.ballast.mu.value >= 600 && M.ballast.mu.value <= 900);
  assert.ok(M.drySoil.alpha.value >= 0.2 && M.drySoil.alpha.value <= 0.35);
  assert.ok(M.rustShed.eps.value >= 0.69 && M.rustShed.eps.value <= 0.88 && M.rustShed.thinC.value >= 2000 && M.rustShed.thinC.value <= 5000);
  assert.ok(M.concrete.alpha.value >= 0.15 && M.concrete.alpha.value <= 0.35);
  assert.equal(MODEL.pvSvf.value, 0.11);
  assert.equal(M.pvCanopy.tr.value, 0);
  for (const k of ['brief6', 'golden2007', 'stempihar2012', 'takebayashi2009', 'asaeda1996', 'zhu2022', 'hoehne2020', 'matias2025', 'levinson2011', 'vanos2018', 'mclaren2005', 'nsc', 'scott1999', 'onishi2010', 'optris']) assert.ok(md.includes(`**[${k}]**`), k);
});

test('glossary: heat storage, damping depth, ground heat flux and thermal inertia, on the car park page only', () => {
  const keys = termsFor('parking');
  for (const k of ['heatStorage', 'dampingDepth', 'groundFlux', 'thermalInertia']) {
    assert.ok(keys.includes(k), k);
    assert.deepEqual(GLOSSARY[k].scenes, ['parking']);
    for (const c of ['asphalt-park', 'hutong']) assert.ok(!termsFor(c).includes(k), `${k} on ${c}`);
  }
});

test('scene: at most five notes, parcels on the 5 m grid (footpaths off the cell centres), PV screens, equal-length route variants', () => {
  assert.equal(SCENE.notes.length, 5);
  for (const g of SCENE.ground) {
    const ys = [g.poly[1], g.poly[5]];
    if (/^path\d/.test(g.id)) for (const y of ys) assert.ok(Math.abs((((y - 2.5) % 5) + 5) % 5) > 0.05, `${g.id} edge ${y} sits on a cell centre`);
    else for (const v of g.poly) assert.equal(v % 5, 0, g.id);
  }
  const { world } = base6();
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && SCENE.ground[world.parcel[i]].id.startsWith('path')) assert.fail('a footpath claims a model cell');
  assert.ok(SCENE.screens.length >= 6 && SCENE.screens.every((P) => P.kind === 'pvCanopy'));
  const len = (p) => Math.hypot(p[2] - p[0], p[3] - p[1]);
  for (const r of SCENE.routes) assert.ok(Math.abs(len(r.variants[0]) - len(r.variants[1])) < 1e-9, r.id);
  assert.ok(SCENE.cars.length > 500);
});

test('the PV canopy is drawn after every car beneath it (front flag); no object of blocks 1-5 carries the flag', () => {
  const { world } = base6();
  const d = drawWorld(world, SCENE.seed);
  const pos = new Map(d.objects.map((o, k) => [o, k]));
  for (const p of d.objects.filter((o) => o.kind === 'p')) {
    for (const c of d.objects.filter((o) => o.kind === 'c' && o.x0 < p.x1 && p.x0 < o.x1 && o.y0 < p.y1 && p.y0 < o.y1)) assert.ok(pos.get(c) < pos.get(p), 'a car is drawn over the canopy');
  }
  for (const S of [S1, S2, S3, S4, S5]) {
    assert.ok(!S.parkingBlock);
    if (S.retrofit) continue; // drawn per state; it has no screens
    const w = buildWorld(S, { svf: false });
    if (S.hutongBlock) w.draw = HT_DRAW; // as hutongSetup does on the page
    const objs = drawWorld(w, S.seed).objects;
    assert.ok(objs.every((o) => !o.front), S.id);
  }
  // with no front flags the depth order is the old one (overlap falls back to the centre sum)
  const boxes = [{ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 5, y0: 5, x1: 8, y1: 8 }, { x0: 20, y0: 0, x1: 22, y1: 2 }];
  assert.deepEqual(depthOrder(boxes), [0, 1, 2]);
  assert.deepEqual(depthOrder([{ ...boxes[0], front: true }, boxes[1], boxes[2]]), [1, 0, 2]);
});

test('blocks 1-5 keep their ground material indices; the new ground materials are appended', () => {
  assert.deepEqual(GROUND_MATS.slice(0, 12), ['concrete', 'asphalt', 'stone', 'grass', 'water', 'pavers', 'porousAsphalt', 'coolPave', 'raingarden', 'river', 'pond', 'greyBrick']);
  assert.deepEqual(GROUND_MATS.slice(12, 15), ['ballast', 'drySoil', 'scrub']);
});
