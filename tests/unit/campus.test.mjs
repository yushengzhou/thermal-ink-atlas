// Block 8 (school campus playground) model checks: the irrigation pulse (the
// per-minute EF(t), its turf-only run and merge), the burn thresholds per
// material class on known cells, the cell classes and shade split, the
// children (play times, shade preference, pure function of time), the
// acceptance bands with their pinned misses and the docs table, basis tags,
// the glossary, the build cut of the block's materials, and that blocks 1-7
// never take the new paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base8, bands8, bandVerdicts, walkers8, CP_NOTES, waterStore8 } from '../../scripts/campus.mjs';
import { bands8Markdown } from '../../scripts/campus-docs.mjs';
import { CP, BURN_CLASS, burnLimit, burnCells, efAt, irrigation, kidPlan, kidsAt, playTime, cellClasses, shadeSplit, tsMean, campusMisses } from '../../engine/campus.js';
import { runModel, shadeClassField, cellMat } from '../../engine/thermal.js';
import { SOURCES, BASIS, MATERIALS } from '../../engine/materials.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { buildWorld, GROUND_MATS } from '../../engine/world.js';
import { pageMaterialGroups, trimMaterials, pageParts } from '../../scripts/build.mjs';
import { SCENE } from '../../cities/campus/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';
import { SCENE as S4 } from '../../cities/waterfront/scene.js';
import { SCENE as S5 } from '../../cities/hutong/scene.js';
import { SCENE as S6 } from '../../cities/parking/scene.js';
import { SCENE as S7 } from '../../cities/estate/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('the irrigation pulse: EF(t) = EF_res + (0.8 - EF_res) exp(-t / tau) with the brief\'s middle values; 0 before watering', () => {
  assert.deepEqual([CP.efPeak.value, CP.efRes.value, CP.irrigateTau.value, CP.irrigateHour.value], [0.8, 0.05, 15, 14]);
  assert.equal(efAt(-1), 0);
  assert.equal(efAt(0), 0.8);
  assert.ok(Math.abs(efAt(15) - (0.05 + 0.75 / Math.E)) < 1e-12);
  assert.ok(Math.abs(efAt(600) - 0.05) < 1e-9);
  const ir = irrigation();
  assert.equal(ir.efOnly, true);
  assert.deepEqual(ir.pulse, { ef0: 0.8, res: 0.05, tau: 15 });
});

test('the watered run changes only the turf, only from the watering hour, and cools it; the dry model is the plain run', () => {
  const { world, T, W, setup, C } = base8();
  assert.deepEqual(setup.cells, C.turf);
  // a cell that is not turf: identical in both models at every stored step
  const other = world.cellIndex(130, 252.5);
  for (let k = 0; k < 96; k++) assert.equal(W.ts(other, k / 4), T.ts(other, k / 4));
  // turf before 14:00: the same up to the deep-temperature convergence of the second run
  const i = world.cellIndex(155, 125);
  for (const h of [3, 8, 12, 13.75]) assert.ok(Math.abs(W.ts(i, h) - T.ts(i, h)) < 0.15, `${h}`);
  for (const h of [14.25, 14.5, 15]) assert.ok(W.ts(i, h) < T.ts(i, h) - 1, `${h}`);
  // switching the pulse off (EF 0 throughout) gives back the dry turf
  const off = runModel(world, { slots: setup.slots, cells: setup.cells, splash: { cells: setup.cells, ...irrigation(), pulse: { ef0: 0, res: 0, tau: 15 } } });
  for (const h of [12, 14.5, 16]) assert.ok(Math.abs(off.ts(i, h) - T.ts(i, h)) < 0.06, `${h}`);
});

test('burn thresholds per material class: ISO 13732-1 1-min values; known cells hatched or not', () => {
  assert.deepEqual([CP.burnMetal.value, CP.burnStone.value, CP.burnPlastic.value, CP.burn10min.value], [51, 56, 60, 48]);
  for (const id of ['turf', 'track', 'acrylic', 'rubber']) assert.equal(burnLimit(id), 60, id);
  for (const id of ['concrete', 'asphalt', 'stone']) assert.equal(burnLimit(id), 56, id);
  assert.equal(burnLimit('metal'), 51);
  for (const id of ['grass', 'water', 'canopy']) assert.equal(burnLimit(id), null, id);
  const { world, T } = base8();
  const at = (x, y, h) => {
    const i = world.cellIndex(x, y);
    return { i, ts: T.ts(i, h), hit: burnCells(world, T, h).some((b) => b.i === i) };
  };
  // the pitch at 15:00 (68 C > 60), the grass field (no limit), rubber under a sail (42 C), the paving at 14:00 and 23:00
  const turf = at(155, 125, 15);
  assert.ok(turf.ts > 60 && turf.hit);
  assert.ok(!at(130, 252.5, 15).hit);
  const sail = at(302.5, 187.5, 15);
  assert.ok(sail.ts < 60 && !sail.hit);
  for (const h of [15, 23]) {
    const c = at(250, 62.5, h);
    assert.equal(c.hit, c.ts > 56, `paving ${h}: ${c.ts}`);
  }
  assert.equal(burnCells(world, T, 3).length, 0, 'nothing at night');
  // every hatched cell is above its own limit and every cell above its limit is hatched
  const all = burnCells(world, T, 14);
  for (const b of all) assert.ok(b.ts > burnLimit(b.id));
  let n = 0;
  for (let i = 0; i < world.n * world.n; i++) {
    const lim = world.bld[i] >= 0 ? null : burnLimit(cellMat(world, i));
    if (lim !== null && T.ts(i, 14) > lim) n++;
  }
  assert.equal(all.length, n);
  for (const id of Object.keys(BURN_CLASS)) assert.ok(MATERIALS[id], id);
});

test('cell classes and the shade split: by material and geometry; rubber in sun, under a sail and under a tree', () => {
  const { world, T, C } = base8();
  const again = cellClasses(world);
  for (const k of Object.keys(C)) assert.deepEqual(again[k], C[k]);
  assert.ok(C.turf.length > 350 && C.grass.length > 700 && C.track.length > 100 && C.courts.length >= 250 && C.sail.length > 40);
  for (const i of C.turf) assert.equal(cellMat(world, i), 'turf');
  for (const i of C.sail) assert.ok(C.rubber.includes(i) && !C.openRubber.includes(i));
  for (const h of [12, 15]) {
    const s = shadeSplit(world, T, h);
    assert.ok(s.sun.length > 200 && s.sail.length > 30 && s.tree.length > 5, `${h}`);
    for (const i of s.sail) assert.ok(T.sunlit(i, h) < 0.35);
    for (const i of s.sun) assert.ok(T.sunlit(i, h) > 0.95);
    assert.ok(tsMean(T, s.sun, h) > tsMean(T, s.sail, h) + 15);
  }
  assert.deepEqual(shadeSplit(world, T, 2), { sun: [], sail: [], tree: [] });
});

test('children: only at play times, pure function of time, prefer shade when hot, smaller figures', () => {
  const { world, T } = base8();
  assert.equal(playTime(SCENE, 9.75), false);
  assert.equal(playTime(SCENE, 10), true);
  assert.equal(playTime(SCENE, 10.5), false);
  assert.equal(playTime(SCENE, 12.75), true);
  assert.equal(playTime(SCENE, 15.25), true);
  const sh = (h) => shadeClassField(world, T.sun(h));
  assert.deepEqual(kidPlan(SCENE, sh(14), T.air(14), 14, SCENE.seed), []);
  const p = kidPlan(SCENE, sh(15), T.air(15), 15, SCENE.seed);
  assert.equal(p.length, SCENE.kids.n);
  assert.deepEqual(kidsAt(SCENE, p, 7.5), kidsAt(SCENE, p, 7.5));
  assert.notDeepEqual(kidsAt(SCENE, p, 7.5), kidsAt(SCENE, p, 8));
  assert.ok(kidsAt(SCENE, p, 3).every((k) => k.child && !k.sit));
  // every shaded play place is taken before any sunny one (hot afternoon)
  const s15 = sh(15);
  const shaded = SCENE.kids.spots.map((s, k) => [k, s]).filter(([, s]) => s15.cls[Math.floor(s.y / 2) * s15.n + Math.floor(s.x / 2)] !== 0);
  const cap = shaded.reduce((a, [, s]) => a + s.cap, 0);
  const inShade = p.filter((x) => shaded.some(([k]) => k === x.spot)).length;
  assert.equal(inShade, Math.min(cap, p.length));
  const w = walkers8(15);
  assert.ok(w.kidShade >= 0.5, `${w.kidShade}`);
  assert.equal(CP.kidSize.value, 0.7);
});

// Rows outside their band, as shipped (see docs/sources.md, Block 8): pinned with tight tolerances so a change shows up here.
const PINNED_OUTSIDE = {
  '6. Acrylic courts at 15:00 above the air (n), K': [25.98, 0.05],
  '7. Rubber in sun (n) − under a sail at 15:00, K': [22.57, 0.05],
  '8. Rubber under a tree at 15:00 above the air (n), K': [10.59, 0.05],
  '9. Watered pitch at its largest cooling (14:15) above the air, K (within 5 K)': [31.43, 0.05],
  '5. Supplementary: running track at 14:00 above the air, K': [33.3, 0.05],
  '8. Supplementary: the same at 12:00 (n), K': [8.23, 0.05],
  '9. Supplementary (not shipped): the block-5 water store instead of the pulse (W0 1 mm, β 0.5, W_c 0.2 mm, as the hutong splash), largest cooling (14:30) above the air, K': [7.82, 0.05],
};
const key = (label) => label.replace(/\bn \d+( \/ \d+)?/g, 'n');

test('acceptance bands: values, pinned misses, verdicts, docs table in sync', () => {
  const rows = bands8();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k][0]) <= PINNED_OUTSIDE[k][1], `${k}: ${v}`);
  assert.deepEqual(bandVerdicts(rows), { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: false, 8: false, 9: false, 10: true });
  // the track sits just inside its band (30.0 K against at most 30): pinned too
  const track = rows.find((r) => r.label.startsWith('5. Running track at 15:00'));
  assert.ok(Math.abs(track.value - 29.952) < 0.02, `${track.value}`);
  assert.ok(rows.filter((r) => r.supp).every((r) => /Supplementary/.test(r.label)));
  assert.ok(md.includes(bands8Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['**Air fixed:**', '**No height-resolved Tmrt:**', '**Burn limits depend on the material and the contact time:**', '**Irrigation lasts minutes, and here it is weak:**', '**Shade structures hold heat after sunset:**', '**Weak evidence:**', '**Misses:**', 'Not tuned', 'set before the first model run']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
  // the cards state the misses: the flags the page computes agree with the bands
  const { st, T } = base8();
  assert.deepEqual(campusMisses(st, T.air(15)), { sailMiss: true, treeMiss: true, courtMiss: true, trackMiss: false });
});

test('every band of the brief is checked: 1-10, each with at least one counted row', () => {
  const rows = bands8();
  for (let n = 1; n <= 10; n++) assert.ok(rows.some((r) => r.label.startsWith(`${n}. `) && !r.supp), `band ${n}`);
  // the water-store comparison is supplementary and closer to the measurements than the shipped pulse
  const ws = waterStore8();
  assert.ok(ws.min.d < base8().water.min.d - 10);
});

test('every block-8 value has a source, a basis tag, a verified flag and a note; materials and keys listed in sources.md', () => {
  for (const [k, p] of Object.entries(CP)) {
    assert.ok(p.source in SOURCES && p.basis in BASIS, k);
    assert.equal(typeof p.verified, 'boolean', k);
    assert.ok(CP_NOTES[k], `${k}: no note`);
    assert.ok(md.includes(`| \`${k}\` |`), `${k} missing in sources.md`);
  }
  for (const id of ['turf', 'track', 'acrylic', 'rubber', 'shadeSail']) {
    const m = MATERIALS[id];
    for (const p of Object.values(m)) if (p && typeof p === 'object' && 'source' in p) assert.ok(p.source in SOURCES && p.basis in BASIS && p.note, `${id}`);
    assert.ok(md.includes(`(\`${id}\`)`), id);
  }
  // the brief's central values
  assert.deepEqual([MATERIALS.turf.alpha.value, MATERIALS.turf.eps.value, MATERIALS.turf.mu.value, MATERIALS.turf.ef.value], [0.08, 0.93, 350, 0]);
  assert.deepEqual([MATERIALS.track.alpha.value, MATERIALS.track.mu.value, MATERIALS.acrylic.alpha.value, MATERIALS.acrylic.mu.value, MATERIALS.shadeSail.tr.value], [0.12, 950, 0.2, 1200, 0.2]);
  for (const k of ['brief8', 'jim2016', 'jim2017', 'singh2024', 'nydoh', 'mcnitt2008', 'pfautsch2020', 'vanos2016', 'vanos2017', 'vanos2015', 'paolini', 'kinmen', 'aoki2004', 'courtVendor', 'iso13732', 'vanosPress']) assert.ok(md.includes(`**[${k}]**`), k);
});

test('glossary: artificial turf, crumb rubber, contact burn, shade sail, on the campus page only', () => {
  const keys = termsFor('campus');
  for (const k of ['artificialTurf', 'crumbRubber', 'contactBurn', 'shadeSail']) {
    assert.ok(keys.includes(k), k);
    assert.deepEqual(GLOSSARY[k].scenes, ['campus']);
    for (const c of ['asphalt-park', 'estate']) assert.ok(!termsFor(c).includes(k), `${k} on ${c}`);
  }
});

test('build: the block\'s materials are one @page campus group, carried by the campus page only, as its own bytes', () => {
  const src = readFileSync(new URL('../../engine/materials.js', import.meta.url), 'utf8');
  const g = pageMaterialGroups(src);
  assert.deepEqual(g.map((x) => x.city), ['campus']);
  for (const id of ['turf', 'track', 'acrylic', 'rubber', 'shadeSail']) assert.ok(g[0].text.includes(`  ${id}: {`), id);
  const keys = new Set(['oke']);
  assert.ok(!trimMaterials(src, keys, 'estate').includes('turf: {'));
  assert.ok(trimMaterials(src, keys, 'campus').includes('turf: {'));
  for (const c of ['asphalt-park', 'estate']) {
    assert.ok(!readFileSync(new URL(`../../cities/${c}/index.html`, import.meta.url), 'utf8').includes('Artificial turf'), c);
    assert.equal(pageParts(c).matBytes, 0);
  }
  assert.ok(readFileSync(new URL('../../cities/campus/index.html', import.meta.url), 'utf8').includes('Artificial turf (crumb-rubber infill)'));
  assert.ok(pageParts('campus').matBytes > 1000);
  // the new ground materials are appended after blocks 1-7's
  assert.deepEqual(GROUND_MATS.slice(15), ['turf', 'track', 'acrylic', 'rubber']);
});

test('scene: at most five notes, equal-length route variants, a standard track; blocks 1-7 are not the campus', () => {
  assert.ok(SCENE.notes.length <= 5);
  const len = (p) => Math.hypot(p[2] - p[0], p[3] - p[1]);
  for (const r of SCENE.routes) assert.ok(Math.abs(len(r.variants[0]) - len(r.variants[1])) < 1e-9, r.id);
  assert.ok(Math.abs(2 * SCENE.track.half - 84.39) < 0.02 && SCENE.track.rIn === 36.5);
  for (const S of [S1, S2, S3, S4, S5, S6, S7]) assert.ok(!S.campusBlock && !S.kids, S.id);
  const w = buildWorld(SCENE, { svf: false });
  assert.ok(w.screens.length === 2 && w.screens.every((P) => P.tr === 0.2 && P.z === CP.sailHeight.value));
});

test('the block-8 modules hold no clock or random source', () => {
  for (const f of ['campus', 'cpkit', 'cpui']) {
    const src = readFileSync(new URL(`../../engine/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|new Date/.test(src), f);
  }
});
