// Block 4 (waterfront) model checks: wind-factor geometry, h_c bounds, water
// curves, the air overlay's decay, wind lines (determinism, never inside a
// building), the walkers' wind preference, the acceptance bands with their
// pinned deviations, basis tags, and that blocks 1-3 are untouched (no wind
// factor; a wind factor of 1 reproduces the scalar-h_c model bit for bit).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base4, bands4, isolatedBuilding, walkers4 } from '../../scripts/waterfront.mjs';
import { bands4Markdown } from '../../scripts/waterfront-docs.mjs';
import { windVector, channelFactor, shelterAt, rayBox, overlayDT, OVERLAY, windLines, linesHash, F_MIN, F_MAX, apparentTemp, seeds, SEED_GAP } from '../../engine/wind.js';
import { windStats, hcStats, waterStats, overlayStats, lineStats } from '../../engine/waterfront.js';
import { waterTemp, runModel, sunSlots } from '../../engine/thermal.js';
import { buildWorld } from '../../engine/world.js';
import { MATERIALS, MODEL, SOURCES, BASIS } from '../../engine/materials.js';
import { routeCost, weightAt } from '../../engine/life.js';
import { SCENE } from '../../cities/waterfront/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('wind vector, ray-box distance and channelling factor', () => {
  assert.deepEqual(windVector(0), [0, 1], 'from the north blows toward +y (south)');
  const [x, y] = windVector(90);
  assert.ok(Math.abs(x + 1) < 1e-12 && Math.abs(y) < 1e-12, 'from the east blows west');
  assert.equal(rayBox({ x0: 0, y0: 0, x1: 10, y1: 10 }, 5, 20, 0, -1), 10);
  assert.equal(rayBox({ x0: 0, y0: 0, x1: 10, y1: 10 }, 15, 20, 0, -1), Infinity);
  assert.ok(Math.abs(channelFactor(0, 0.6) - 1.2) < 1e-12);
  assert.ok(Math.abs(channelFactor(20, 0.6) - (1 + 0.2 * Math.cos((60 * Math.PI) / 180))) < 1e-12);
  assert.equal(channelFactor(30.0001, 0.6), 1, 'beyond 30 deg');
  assert.equal(channelFactor(0, 0.4), 1, 'H/W must exceed 0.4');
  assert.equal(channelFactor(90, 1), 1);
});

test('f_w geometry, isolated building: open = 1 ± 0.01; 0–1 H leeward mean ≤ 0.4 (0.44 at exactly 1 H); ≥ 0.95 at ≥ 5 H', () => {
  const r = isolatedBuilding();
  assert.ok(Math.abs(r.upwind - 1) <= 0.01);
  assert.ok(Math.abs(r.side - 1) <= 0.01, 'beside the wake: open');
  assert.ok(Math.abs(r.leeAtWall - F_MIN) < 1e-9, 'f_min at the wall');
  assert.ok(r.leeMean <= 0.4, `mean ${r.leeMean}`);
  assert.ok(Math.abs(r.leeMax - (F_MIN + (1 - F_MIN) / 5)) < 0.01, 'linear recovery: 0.44 at 1 H (a disclosed miss of the strict reading)');
  assert.ok(r.farMin >= 0.95);
  // the minimum over several buildings is taken
  const w = windVector(0);
  const B1 = { x0: 0, y0: 0, x1: 10, y1: 10, h: 10 };
  const B2 = { x0: 0, y0: 30, x1: 10, y1: 40, h: 2 };
  assert.ok(Math.abs(shelterAt([B1, B2], 5, 41, w) - F_MIN - (0.7 * 1) / 10) < 1e-9, 'nearest low building sets S');
});

test('f_w in the block: river 1 ± 0.01; along-wind streets ≥ 1.0 and ≥ across + 0.3; clamp 0.3–1.2; roofs 1', () => {
  const { world } = base4();
  const st = windStats(world);
  assert.ok(st.river.min >= 0.99 && st.river.max <= 1.01);
  assert.ok(st.aligned.mean >= 1.0, `aligned ${st.aligned.mean}`);
  assert.ok(st.aligned.mean >= st.across.mean + 0.3, `aligned ${st.aligned.mean} vs across ${st.across.mean}`);
  assert.ok(st.lee01.mean <= 0.4);
  assert.ok(st.far5.min >= 0.95);
  for (let i = 0; i < world.fw.length; i++) {
    assert.ok(world.fw[i] >= F_MIN - 1e-6 && world.fw[i] <= F_MAX + 1e-6);
    if (world.bld[i] >= 0) assert.equal(world.fw[i], 1);
  }
  const quay = world.wind.streets.find((s) => s.id === 'quay');
  assert.ok(quay.hw > 0.4 && quay.delta === 0 && Math.abs(quay.C - 1.2) < 1e-9);
});

test('h_c per cell within 5.7 + 3.8 u [f_min, f_max] at both presets; roofs at 5.7 + 3.8 u', () => {
  const { world, setup } = base4();
  for (const u of [1, 3]) {
    const h = hcStats(world, setup.model(u));
    assert.ok(h.lo >= h.boundLo - 1e-5 && h.hi <= h.boundHi + 1e-5, `u ${u}: ${h.lo}–${h.hi}`);
    assert.ok(Math.abs(h.roofLo - h.open) < 1e-5 && Math.abs(h.roofHi - h.open) < 1e-5);
  }
});

test('water curves: river range ≤ 1.5 K, pond 3–5 K, both below the air at 15:00, pond above it at 04:00', () => {
  for (const ta of [25, 30]) {
    let lo = [Infinity, Infinity];
    let hi = [-Infinity, -Infinity];
    for (let m = 0; m < 1440; m++) {
      [2, 3].forEach((k, j) => {
        const v = waterTemp(k, ta, m / 60);
        lo[j] = Math.min(lo[j], v);
        hi[j] = Math.max(hi[j], v);
      });
    }
    assert.ok(Math.abs(hi[0] - lo[0] - 1) < 1e-3 && Math.abs(hi[1] - lo[1] - 4) < 1e-3);
  }
  assert.equal(waterTemp(1, 30, 9), 29, 'blocks 1–3 pond curve unchanged');
  const { world, setup } = base4();
  const w = waterStats(world, setup.model(3));
  assert.ok(w.river.range <= 1.5 && w.pond.range >= 3 && w.pond.range <= 5);
  assert.ok(w.river.t15 < w.river.a15 && w.pond.t15 < w.pond.a15);
  assert.ok(w.pond.t04 > w.pond.a04);
});

test('air overlay decay: −ΔT0 at the bank, e-folding over L (2 L in aligned streets), positive at night, 0 before water', () => {
  assert.equal(overlayDT(0, 2, 1), -OVERLAY.day);
  assert.ok(Math.abs(overlayDT(1, 2, 1) + OVERLAY.day / Math.E) < 1e-12);
  assert.equal(overlayDT(0, 2, 0), OVERLAY.night);
  assert.equal(overlayDT(0, 0, 1), 0);
  assert.ok(Math.abs(overlayDT(0, 3, 1) + MODEL.airPond.value) < 1e-12, 'pond: −0.2 K');
  assert.ok(OVERLAY.day * Math.exp(-80 / OVERLAY.L) < 0.2 && OVERLAY.day * Math.exp(-150 / OVERLAY.Laligned) < 0.2);
  const { world, setup } = base4();
  const o = overlayStats(world, setup.lines());
  assert.ok(o.bank >= 0.5 && o.bank <= 1.5);
  assert.ok(o.beyond80 < 0.2 && o.beyond150 < 0.2);
  assert.ok(o.nightMin >= 0);
});

test('wind lines: deterministic (hash), seeded 20 m apart upwind, no vertex inside a building', () => {
  const { world, setup } = base4();
  const a = setup.lines();
  const b = windLines(buildWorld(SCENE), buildWorld(SCENE).wind);
  assert.equal(linesHash(a), linesHash(b), 'a fresh world gives the same lines');
  const s = seeds(400, windVector(0), SCENE.seed);
  assert.equal(s.length, 400 / SEED_GAP);
  for (const [x, y] of s) assert.ok(y >= 0 && y < 0.1 && x > 0 && x < 400, 'on the upwind (north) edge');
  const ls = lineStats(world, a);
  assert.equal(ls.inside, 0);
  // consecutive vertices 2.5 m apart at most (pushed out along a wall only)
  for (const L of a) for (let v = 1; v < L.fw.length; v++) assert.ok(Math.hypot(L.p[v * 2] - L.p[v * 2 - 2], L.p[v * 2 + 1] - L.p[v * 2 - 1]) <= 2.5 + 1e-6);
});

test('walkers: equal shade, the breezier route wins; in the block they take the shaded, breezy riverside', () => {
  // a synthetic raster: all shade class 1; per-pixel weights from the comfort shift
  const n = 10;
  const shade = { n, cell: 2, cls: new Uint8Array(n * n).fill(1), night: false, wf: new Float32Array(n * n) };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) shade.wf[j * n + i] = j < 5 ? 0.82 : 0.87; // north half breezy
  const breezy = routeCost([0, 3, 20, 3], shade, 1, [1, 0.84, 0.92]);
  const sheltered = routeCost([0, 15, 20, 15], shade, 1, [1, 0.84, 0.92]);
  assert.ok(breezy < sheltered);
  assert.equal(weightAt({ ...shade, night: true }, [1, 1, 1], 1, 1), 1, 'night: plain weights');
  // the comfort index: more wind feels cooler, and more so in the sun
  assert.ok(apparentTemp(35, 20, 3, 40) < apparentTemp(35, 20, 1, 40));
  assert.ok(apparentTemp(35, 20, 1, 65) - apparentTemp(35, 20, 3, 65) > apparentTemp(35, 20, 1, 40) - apparentTemp(35, 20, 3, 40));
  const wk = walkers4();
  assert.ok(wk.strollRiverside >= 0.5, `stroll riverside ${wk.strollRiverside}`);
  assert.ok(wk.walkerFw >= wk.plainFw, 'the wind term moves walkers toward breezier ground');
});

// Rows outside their band, pinned (reported in docs/sources.md, not tuned away).
const PINNED_OUTSIDE = {
  'Isolated building, 0–1 H leeward: largest f_w (at 1 H: f_min + (1 − f_min)/5)': 0.438,
  'Wharf Warehouses, ground 0–1 H leeward: largest f_w (cell centres 2.5–13.5 m behind the wall)': 0.409,
  'Sunlit asphalt at 15:00, 3 m/s: sheltered (f_w ≤ 0.45, n, SVF 0.58) minus exposed (f_w ≥ 0.95, n, SVF 0.76)': 11.13,
  'Open asphalt (SVF 1, no walls) at f_w 0.37 minus f_w 1.16, 15:00, 3 m/s: the wind alone': 9.57,
  'Tmrt at 15:00, 1 m/s minus 3 m/s: largest change over ground cells': 4.5,
  'Tmrt at 15:00, 1 m/s minus 3 m/s: mean over sunlit ground': 2.17,
};
const key = (label) => label.replace(/n \d+/g, 'n');

test('acceptance bands: values, pinned deviations, docs table in sync', () => {
  const rows = bands4();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k]) <= 0.25, `${k}: ${v} (pinned ${PINNED_OUTSIDE[k]})`);
  assert.ok(md.includes(bands4Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['Air fixed:', 'One wind direction and speed; a geometric heuristic, not CFD', 'Prescribed water curves', 'Shade is the biggest comfort lever near water', 'engine plausibility band to be calibrated from a run', 'was **not** widened']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
});

test('every block-4 value has a source and a basis tag; river and pond are prescribed', () => {
  for (const k of ['windFmin', 'shelterReach', 'channelC', 'windFmax', 'alignCut', 'channelHw', 'windHc', 'riverCurve', 'pondCurve', 'airDay', 'airL', 'airLaligned', 'airNight', 'airPond', 'apparentTemp', 'atRadiation', 'windLines']) {
    const p = MODEL[k];
    assert.ok(p && p.source in SOURCES && p.basis in BASIS, k);
    assert.ok(md.includes(`\`${k}\``), `${k} missing in sources.md`);
  }
  for (const id of ['river', 'pond']) assert.ok(MATERIALS[id].prescribed, id);
  for (const k of ['brief4', 'volker2013', 'hathway2012', 'steeneveld2014', 'theeuwes2013', 'jacobs2020', 'cheonggyecheon', 'ota', 'corridor', 'oke1988', 'wake', 'solcerova2019', 'webb2008', 'steadman1994']) assert.ok(md.includes(`**[${k}]**`), k);
});

test('scene: river on the upwind edge, corridors along the wind, streets across it, a pond, at most five notes', () => {
  assert.equal(SCENE.wind.from, 0);
  assert.deepEqual(SCENE.wind.speeds, [1, 3]);
  assert.ok(SCENE.ground.some((g) => g.mat === 'river') && SCENE.ground.some((g) => g.mat === 'pond'));
  assert.ok(SCENE.notes.length <= 5);
  const { world } = base4();
  const al = world.wind.streets.filter((s) => s.C > 1);
  const ac = world.wind.streets.filter((s) => s.delta > 30);
  assert.ok(al.length >= 2 && ac.length >= 2);
});

test('blocks 1–3 have no wind factor; f_w = 1 reproduces the scalar-h_c model bit for bit', () => {
  for (const sc of [S1, S2, S3]) assert.equal(buildWorld(sc, { svf: false }).fw, undefined, sc.id);
  const w = buildWorld(S1);
  const slots = sunSlots(w);
  const a = runModel(w, { slots, minDays: 3, maxDays: 3 });
  const b = runModel(w, { slots, minDays: 3, maxDays: 3, fw: new Float32Array(w.n * w.n).fill(1) });
  assert.equal(a.store.length, b.store.length);
  let diff = 0;
  for (let i = 0; i < a.store.length; i++) if (a.store[i] !== b.store[i]) diff++;
  assert.equal(diff, 0, 'per-cell h_c with f_w = 1 must equal the scalar path exactly');
});
