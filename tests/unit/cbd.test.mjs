// Glass CBD block (block 3): canyon sky view, Fresnel, the specular bounce on
// flat ground (irradiance, far edge, energy closure, no focusing), spot ΔTmrt,
// the diffuse wall-term bound, night lag, walkers, glass parameters and the
// docs table. Rows outside a band are pinned and disclosed, never tuned.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresnelPane, glassRho, fresnelShape, reflectField, glassFacades } from '../../engine/reflect.js';
import { GLASS, GLASS_IDS, GLASS_DEFAULT, MODEL, SOURCES, BASIS } from '../../engine/materials.js';
import { runModel, cellMat } from '../../engine/thermal.js';
import { glassSetup, spotStats, SPOT_MIN, WARM } from '../../engine/cbd.js';
import { solarPosition, sunVector } from '../../engine/sun.js';
import { base3, canyonSvfRows, specularCheck, SPECULAR_CASES, bands3, wallBound, canyons, walkers, spotRows, litAreaRatio, epClearShapeDiff } from '../../scripts/cbd.mjs';
import { bands3Markdown } from '../../scripts/cbd-docs.mjs';
import { SCENE } from '../../cities/glass-cbd/scene.js';

let B;
before(() => {
  B = base3();
});

test('canyon SVF at the centre of an endless canyon: horizon scan within ±0.02 of 1/√(1+(2H/W)²) for H/W 1, 2, 3, 5', () => {
  for (const r of canyonSvfRows()) {
    console.log(`H/W ${r.hw}: exact ${r.exact.toFixed(3)}, scan in the limit ${r.fine.toFixed(3)}, block-3 page ${r.cbd.toFixed(3)}, blocks 1-2 page ${r.app.toFixed(3)}`);
    assert.ok(Math.abs(r.fine - r.exact) <= 0.02, `H/W ${r.hw}`);
    // the page settings are coarser; block 3's 32 directions stay within 0.05
    assert.ok(Math.abs(r.cbd - r.exact) <= 0.05, `page scan H/W ${r.hw}`);
  }
});

test('Fresnel: clear glass ρ(0°) = 0.082 ± 0.005, ρ(75°) = 0.41 ± 0.03; scaled glass keeps ρ(0) = ρ0 and stays ≤ 1', () => {
  assert.ok(Math.abs(fresnelPane(0) - 0.082) <= 0.005, `${fresnelPane(0)}`);
  assert.ok(Math.abs(fresnelPane(75) - 0.41) <= 0.03, `${fresnelPane(75)}`);
  let prev = 0;
  for (let th = 0; th <= 90; th += 1) {
    const r = fresnelPane(th);
    assert.ok(r >= prev - 1e-12 && r <= 1, `monotonic at ${th}`);
    prev = r;
  }
  assert.equal(fresnelShape(0), 0);
  // the coated-glass form is EnergyPlus's; its clear-glass curve is a polynomial fit close to exact Fresnel
  const ep = epClearShapeDiff();
  console.log(`normalised Fresnel vs EnergyPlus clear polynomial: max |difference| ${ep.max.toFixed(3)} at ${ep.at}°`);
  assert.ok(ep.max < 0.05);
  assert.equal(fresnelPane(90), 1);
  for (const id of GLASS_IDS) {
    const r0 = GLASS[id].rho0.value;
    assert.ok(Math.abs(glassRho(r0, 0) - r0) < 1e-12, id);
    for (let th = 0; th < 90; th += 5) assert.ok(glassRho(r0, th) <= 1 && glassRho(r0, th) >= r0 - 1e-12, `${id} ${th}`);
  }
  assert.ok(GLASS.clear.rho0.value < GLASS.lowe.rho0.value && GLASS.lowe.rho0.value < GLASS.mirror.rho0.value);
});

test('specular spot on flat ground: lit cells get ρ(θ) I sinβ (±1%), far edge at H/tanβ (±1 cell), energy closure ±3%, no cell above the bound', () => {
  for (const [hour, face] of SPECULAR_CASES) {
    const s = specularCheck({ hour, face, cell: 0.5 });
    const grid = specularCheck({ hour, face, cell: 2.5 }); // the page's sample spacing
    console.log(`${face} ${hour}:00 θ ${s.theta.toFixed(1)}°: cell ${s.cellE.toFixed(1)} vs ${s.expectE.toFixed(1)} W m-2; far ${s.far.toFixed(1)} m along the mirrored azimuth vs H/tanβ ${s.farExpect.toFixed(1)} m (${s.farPlane.toFixed(2)} vs ${s.farPlaneExpect.toFixed(2)} m in front); closure ${s.closure.toFixed(3)} (2.5 m: ${grid.closure.toFixed(3)})`);
    assert.ok(Math.abs(s.cellE / s.expectE - 1) <= 0.01);
    assert.ok(Math.abs(s.farPlane - s.farPlaneExpect) <= s.cell, 'far edge within one cell');
    assert.ok(Math.abs(s.closure - 1) <= 0.03, 'energy closure');
    assert.ok(Math.abs(grid.closure - 1) <= 0.03, 'energy closure at page sampling');
    assert.ok(Math.abs(specularCheck({ hour, face, cell: 5 }).closure - 1) <= 0.03, 'energy closure even at 5 m sampling');
    assert.ok(s.max <= s.bound * (1 + 1e-6), 'a flat façade never focuses (Float32 sums)');
  }
});

test('in the block, no glass façade lights more ground than its unobstructed area A cosθ / sinβ (thin grazing strips clipped)', () => {
  const la = litAreaRatio();
  console.log(`largest lit-area ratio ${la.max.toFixed(6)} (${JSON.stringify(la.worst)})`);
  assert.ok(la.max <= 1 + 1e-6);
});

test('in the block, no cell receives more than the sum of ρ(θ) I sinβ over the glass façades facing the sun', () => {
  const { world } = B;
  const facades = glassFacades(world);
  const ground = (i) => world.bld[i] < 0;
  for (const h of [8, 10, 12, 14, 15, 17]) {
    const sun = solarPosition(SCENE.site, h);
    const sv = sunVector(sun.alt, sun.az);
    for (const g of GLASS_IDS) {
      const rho0 = GLASS[g].rho0.value;
      let bound = 0;
      for (const f of facades) {
        const c = sv[0] * f.n[0] + sv[1] * f.n[1];
        if (c > 1e-4) bound += glassRho(rho0, Math.acos(c) / (Math.PI / 180));
      }
      const r = reflectField(world, sun, { n: world.n, cell: world.cell, S: 2 }, ground);
      let max = 0;
      for (let i = 0; i < world.n * world.n; i++) if (r) max = Math.max(max, rho0 * r.A[i] + (1 - rho0) * r.B[i]);
      assert.ok(max <= bound * (1 + 1e-6), `${h}:00 ${g}: ${max} > ${bound}`);
      // and no single façade contributes more than its own rho: r <= number of façades facing it, each <= 1
      assert.ok(max <= 4, 'at most four faces can face a cell');
    }
  }
});

test('reflection spots: hotter than plain shade, more with mirror glass than with clear', () => {
  const rows = spotRows();
  for (const r of rows) console.log(`${r.g.padEnd(6)} ${r.h}:00 spots ${r.n}, r ${r.r.toFixed(2)}, ΔTmrt mean ${r.dTmrt.toFixed(1)} max ${r.dTmrtMax.toFixed(1)}; Tmrt shaded spot ${r.tmrtSpotShade.toFixed(1)} vs plain shade ${r.tmrtShade.toFixed(1)}, sun ${r.tmrtSun.toFixed(1)}, sunlit spot ${r.tmrtSpotSun.toFixed(1)}`);
  for (const r of rows) {
    assert.ok(r.n > 50, 'spots exist');
    assert.ok(r.dTmrt > 0, 'spots raise Tmrt');
    assert.ok(r.tmrtSpotShade > r.tmrtShade + 3, 'out of the sun, still hot');
    assert.ok(r.tmrtSpotShade < r.tmrtSun, 'but cooler than full sun');
    assert.ok(r.tmrtSpotSun > r.tmrtSun, 'sun plus glare is hottest');
    assert.ok(r.tmrtSpotShade < 65, 'shaded spots stay below the sweat threshold (docs)');
  }
  for (const h of [12, 15]) {
    const at = (g) => rows.find((r) => r.g === g && r.h === h);
    assert.ok(at('clear').dTmrt < at('lowe').dTmrt && at('lowe').dTmrt < at('mirror').dTmrt, `${h}:00 order clear < low-e < mirror`);
  }
});

test('glass models do not depend on the order the glass types are visited', () => {
  const { world, slots } = B;
  const a = glassSetup(world, slots);
  const b = glassSetup(world, slots);
  const ma = GLASS_IDS.map((g) => a.model(g));
  const mb = [...GLASS_IDS].reverse().map((g) => b.model(g)).reverse();
  for (let k = 0; k < GLASS_IDS.length; k++) for (let i = 0; i < world.n * world.n; i += 7) assert.equal(ma[k].ts(i, 15), mb[k].ts(i, 15));
  // off(g) only changes cells that ever receive a reflection
  const off = a.off('mirror');
  const on = a.model('mirror');
  const spot = new Set(a.spotCells);
  for (let i = 0; i < world.n * world.n; i += 3) if (!spot.has(i)) assert.equal(off.ts(i, 15), on.ts(i, 15));
});

test(`warm start (${WARM} coarse days) lands at least as close to a 30-day run as the plain start`, () => {
  const { world, slots } = B;
  const ref = runModel(world, { slots, minDays: 30, maxDays: 30 });
  const plain = runModel(world, { slots });
  const warm = runModel(world, { slots, warm: WARM });
  let ep = 0;
  let ew = 0;
  for (let i = 0; i < world.n * world.n; i++) {
    for (const h of [5, 15, 23]) {
      ep = Math.max(ep, Math.abs(plain.ts(i, h) - ref.ts(i, h)));
      ew = Math.max(ew, Math.abs(warm.ts(i, h) - ref.ts(i, h)));
    }
  }
  console.log(`max |ΔTs| vs 30 days: plain ${ep.toFixed(3)} K (${plain.info.days} days), warm ${ew.toFixed(3)} K (${warm.info.days} 1-min days)`);
  assert.ok(ew <= ep + 1e-6 && ew < 0.05);
  assert.ok(warm.info.days >= 3 && warm.info.maxDelta < 0.05);
  assert.equal(warm.info.warm, WARM, 'block 3 uses the warm start');
  assert.ok(warm.info.warmFactor < 0.5, `stability factor ${warm.info.warmFactor}`);
});

test('the coarse warm-up falls back to the plain start when a material would be near its stability limit (thin metal roofs)', async () => {
  const { SCENE: S1 } = await import('../../cities/asphalt-park/scene.js');
  const { buildWorld } = await import('../../engine/world.js');
  const w = buildWorld(S1, { svf: false });
  const m = runModel(w, { warm: WARM, minDays: 3, maxDays: 3 });
  console.log(`block 1 (metal roofs): stability factor at 600 s ${m.info.warmFactor.toFixed(2)}, warm used: ${m.info.warm}`);
  assert.ok(m.info.warmFactor > 0.9 && m.info.warmFactor < 1);
  assert.equal(m.info.warm, 0, 'no coarse days with metal roofs');
});

test('every tower in block 3 is fine for the coarse step', () => {
  assert.ok(!SCENE.buildings.some((b) => b.roof === 'metal'));
});

test('diffuse wall term raises the canyon-floor shortwave by at most 30% with a_w at 0.5', () => {
  const wb = wallBound();
  for (const [k, v] of Object.entries(wb)) {
    console.log(`${k}: +${(v.day * 100).toFixed(0)}% per day, +${(v.h15 * 100).toFixed(0)}% at 15:00 (${v.n} cells)`);
    assert.ok(v.day > 0 && v.day <= 0.3 && v.h15 <= 0.3);
  }
  assert.ok(MODEL.wallAlbedo.value <= 0.5 && MODEL.wallAlbedo.value >= 0.2, 'wall albedo inside the cited range');
});

test('night: the stone lane (H/W 2-3) is warmer at 05:00 than an open stone surface', () => {
  const c = canyons();
  console.log(`${c.lane.name} H/W ${c.lane.hw.toFixed(2)} SVF ${c.lane.svf.toFixed(2)}: 05:00 ${c.lane.ts05.toFixed(1)} vs open ${c.lane.open05.toFixed(1)} -> ${c.lane.lag05.toFixed(2)} K; ${c.deep.name} in shade at 15:00 ${c.deep.ts15Shade.toFixed(1)} C (reflection off ${c.deep.ts15ShadeOff.toFixed(1)})`);
  assert.ok(c.lane.hw >= 2 && c.lane.hw <= 3);
  assert.ok(c.lane.lag05 > 0, 'canyon floor warmer than open ground at 05:00');
  assert.ok(c.deep.hw >= 2 && c.deep.hw <= 4);
});

test('walkers at 15:00: people per m2 in reflection spots lower than in plain shade', () => {
  const w = walkers();
  console.log(`per 1000 m2: plain shade ${(w.plainShade * 1000).toFixed(2)}, spots in shade ${(w.spotShade * 1000).toFixed(2)}, all spots ${(w.spots * 1000).toFixed(2)}, sun ${(w.sun * 1000).toFixed(2)}; weights ${w.weights.map((x) => x.toFixed(3))}`);
  assert.ok(w.spotShade < w.plainShade && w.spots < w.plainShade);
  assert.ok(w.weights[0] > 0.84 && w.weights[0] < 1, 'a shaded spot costs more than shade, less than sun');
  assert.ok(w.weights[1] > 1, 'a sunlit spot costs more than sun');
});

// Rows outside their band, pinned (same rows, within 0.25 of the pinned value
// either way) and disclosed in docs/sources.md. Never tune an input outside its
// cited range to pass.
const PINNED_OUTSIDE = {
  'Solar-control low-e glass, 15:00: mean ΔTmrt in spot cells with r 0.1–0.3 (n)': 6.6,
  'Reflective (mirror) glass, 12:00: mean ΔTmrt in spot cells with r 0.1–0.3 (n)': 6.9,
  'Reflective (mirror) glass, 15:00: mean ΔTmrt in spot cells with r 0.1–0.3 (n)': 6.3,
  'Clear float glass, 12:00: mean ΔTmrt over all spot cells (r ≥ 0.05, n), read against the same band': 9.7,
  'Clear float glass, 15:00: mean ΔTmrt over all spot cells (r ≥ 0.05, n), read against the same band': 6.6,
  'Solar-control low-e glass, 12:00: mean ΔTmrt over all spot cells (r ≥ 0.05, n), read against the same band': 11.1,
  'Solar-control low-e glass, 15:00: mean ΔTmrt over all spot cells (r ≥ 0.05, n), read against the same band': 8.9,
  'Reflective (mirror) glass, 12:00: mean ΔTmrt over all spot cells (r ≥ 0.05, n), read against the same band': 12.8,
  'Reflective (mirror) glass, 15:00: mean ΔTmrt over all spot cells (r ≥ 0.05, n), read against the same band': 11.7,
  'Largest ΔTmrt in any spot cell, any glass, 12:00 or 15:00': 26.8,
  'Exchange Street (H/W 2.6) floor in shade at 15:00 (°C)': 48.6,
};
const key = (label) => label.replace(/n \d+/, 'n');

test('acceptance bands: values, pinned deviations, docs table in sync', () => {
  const rows = bands3();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k]) <= 0.25, `${k}: ${v} (pinned ${PINNED_OUTSIDE[k]}); a deliberate change must update the pin and the docs`);
  const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');
  assert.ok(md.includes(bands3Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['Wind:', 'Air temperature is fixed', 'AC heat is shown, not felt', 'Second bounce ignored', 'Concave façades are out of scope']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
});

test('every glass value has a source and basis tag; unverified ones are flagged', () => {
  for (const id of GLASS_IDS) {
    for (const k of ['rho0', 'absorb', 'eps']) {
      const p = GLASS[id][k];
      assert.ok(p.source in SOURCES && p.basis in BASIS && typeof p.verified === 'boolean', `${id}.${k}`);
    }
  }
  assert.equal(GLASS.lowe.rho0.verified, false);
  assert.equal(GLASS.mirror.rho0.verified, false);
  assert.equal(GLASS.clear.eps.verified, false);
  for (const id of GLASS_IDS) assert.equal(GLASS[id].absorb.verified, false, 'glass absorptance is an assumption');
  for (const k of ['wallAlbedo', 'wallLit', 'wallReflection', 'glassHo', 'glassHi']) assert.equal(MODEL[k].verified, false, k);
  assert.ok(GLASS.lowe.rho0.value <= 0.2, 'default glass at or under the Singapore cap');
  assert.equal(GLASS_DEFAULT, 'lowe');
  assert.ok(SPOT_MIN > 0 && SPOT_MIN < 0.1);
});

test('scene: towers with glass, canyons H/W 2-4, a plaza, at most five notes', () => {
  const glassB = SCENE.buildings.filter((b) => b.glass);
  assert.ok(glassB.length >= 6 && glassB.some((b) => b.h >= 100));
  for (const c of Object.values(SCENE.canyons)) assert.ok(c.h / c.w >= 2 && c.h / c.w <= 4, c.name);
  assert.ok(SCENE.ground.some((g) => g.id === 'plaza'));
  assert.ok(SCENE.notes.length <= 5);
  // ground cells of the plaza exist and are stone
  const { world } = B;
  assert.ok([...Array(world.n * world.n).keys()].some((i) => world.bld[i] < 0 && cellMat(world, i) === 'stone'));
});

test('glass block spot stats are reproducible', () => {
  const { world, setup } = B;
  const a = spotStats(setup, world, 'clear', 15);
  const b = spotStats(setup, world, 'clear', 15);
  assert.equal(a.dTmrt, b.dTmrt);
});
