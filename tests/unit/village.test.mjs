// Block 10 (urban village and informal edge) model checks: the sub-grid
// lanes (the canyon sky view against a numerical integral, the sunlit floor's
// geometry, which cells are lanes, the slots and sky view replaced on those
// cells only), thin-sheet stability (the floor holds, a real tarpaulin
// diverges), the split runs and the white-roof model, the proxies and their
// cap, the acceptance bands with their pinned misses and the docs table,
// basis tags, glossary, the build cut of the block's materials, the scene,
// the residents on the roofs, the language the brief rules out, and that
// blocks 1-9 never take the new paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base10, bands10, bandVerdicts, sheetRun, causes10, walkers10, ruledOut, VG_NOTES } from '../../scripts/village.mjs';
import { bands10Markdown } from '../../scripts/village-docs.mjs';
import { VG, laneSvf, centreSvf, laneSun, laneCells, checkThin, radiantIn, airShare, airIn, airShown, nFor, calibrate, laneGroups, isVillage, patchSlots, HOURS, cellsOf } from '../../engine/village.js';
import { rooftopsAt, onRoofs, VG_BANDS } from '../../engine/vgui.js';
import { SOURCES, BASIS, MATERIALS } from '../../engine/materials.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { buildWorld } from '../../engine/world.js';
import { sunSlots, cellMat } from '../../engine/thermal.js';
import { pageMaterialGroups, trimMaterials, pageParts } from '../../scripts/build.mjs';
import { SCENE } from '../../cities/village/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';
import { SCENE as S4 } from '../../cities/waterfront/scene.js';
import { SCENE as S5 } from '../../cities/hutong/scene.js';
import { SCENE as S6 } from '../../cities/parking/scene.js';
import { SCENE as S7 } from '../../cities/estate/scene.js';
import { SCENE as S8 } from '../../cities/campus/scene.js';
import { SCENE as S9 } from '../../cities/busstop/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

test('lane sky view: the crossed-strings mean equals a numerical integral of the floor\'s view, and the brief\'s centre-line form for equal walls', () => {
  for (const [H1, H2, W] of [[21, 21, 2], [18, 24, 1.5], [24, 18, 3], [2.7, 3, 2], [21, 21, 6]]) {
    // point on the floor at x from wall 1: (sin t1 + sin t2) / 2, t the angles from the vertical to the wall tops
    const N = 20000;
    let s = 0;
    for (let k = 0; k < N; k++) {
      const x = ((k + 0.5) / N) * W;
      s += 0.5 * (x / Math.hypot(x, H1) + (W - x) / Math.hypot(W - x, H2));
    }
    assert.ok(Math.abs(s / N - laneSvf(H1, H2, W)) < 1e-6, `${H1} ${H2} ${W}`);
  }
  // equal walls: sqrt(1 + (H/W)^2) - H/W; the brief's centre-line form is the same to first order in W/H (within 0.001 for deep lanes)
  for (const [H, W] of [[21, 2], [18, 1.5], [24, 3]]) {
    assert.ok(Math.abs(laneSvf(H, H, W) - (Math.sqrt(1 + (H / W) ** 2) - H / W)) < 1e-12);
    assert.ok(Math.abs(laneSvf(H, H, W) - centreSvf(H, W)) < 1e-3);
  }
  // the brief's range: H 18-25 m, W 1-3 m
  assert.ok(laneSvf(25, 25, 1) < 0.03 && laneSvf(18, 18, 3) > 0.08 && laneSvf(18, 18, 3) < 0.16);
});

test('lane sun: overhead sun fills the floor, sun along the lane too; the wall on the sun\'s side casts H cot(beta) |d| across; none at night', () => {
  const ew = { axis: 'x', W: 2, H1: 10, H2: 20 }; // north wall 10 m, south wall 20 m
  assert.ok(laneSun(ew, { alt: 90, az: 180 }) > 1 - 1e-12);
  assert.ok(laneSun(ew, { alt: 30, az: 90 }) > 1 - 1e-12); // along an east-west lane
  assert.equal(laneSun(ew, { alt: -5, az: 180 }), 0);
  // sun from the south at beta: the south wall (20 m) casts 20 / tan(beta) across
  const b = Math.atan(20 / 1) * 180 / Math.PI; // shadow 1 m of 2 m
  assert.ok(Math.abs(laneSun(ew, { alt: b, az: 180 }) - 0.5) < 1e-9);
  // the same sun from the north: the north wall (10 m) casts half as far
  assert.ok(Math.abs(laneSun(ew, { alt: b, az: 0 }) - 0.75) < 1e-9);
  const ns = { axis: 'y', W: 2, H1: 20, H2: 10 }; // west wall 20 m, east wall 10 m
  assert.ok(Math.abs(laneSun(ns, { alt: b, az: 90 }) - 0.75) < 1e-9); // morning sun: the east wall casts
  assert.ok(Math.abs(laneSun(ns, { alt: b, az: 270 }) - 0.5) < 1e-9); // afternoon: the west wall
  assert.ok(laneSun(ns, { alt: 30, az: 180 }) > 1 - 1e-12); // along a north-south lane
});

test('lane cells: houses on both sides across, centred on cell centres; their sky view and slots replaced, every other cell as on the raster', () => {
  const { world, T } = base10();
  const raw = buildWorld(SCENE);
  const n = world.n;
  const L = world.vg.lanes;
  assert.ok(L.length > 1500);
  const set = new Set(L.map((c) => c.i));
  for (const c of L) {
    const i = c.i % n;
    const j = Math.floor(c.i / n);
    assert.ok(world.bld[c.i] < 0);
    if (c.kind === 'lane') {
      const [a, b] = c.axis === 'x' ? [(j - 1) * n + i, (j + 1) * n + i] : [j * n + i - 1, j * n + i + 1];
      assert.ok(world.bld[a] >= 0 && world.bld[b] >= 0, `lane ${c.lane} at ${c.i}`);
    }
    assert.equal(world.canopy[c.i], 0);
    assert.ok(Math.abs(world.svf[c.i] - laneSvf(c.H1, c.H2, c.W)) < 1e-6);
  }
  for (const l of SCENE.lanes) assert.equal(((l.c % 5) + 5) % 5, 2.5, l.id);
  let same = 0;
  for (let k = 0; k < n * n; k++) if (!set.has(k)) {
    assert.equal(world.svf[k], raw.svf[k]);
    same++;
  }
  assert.ok(same > 4000);
  // slots: the canyon sun on lane cells, the raster elsewhere
  const plain = sunSlots(raw);
  for (const k of [40, 72, 90, 100]) {
    for (const c of L.slice(0, 200)) assert.ok(Math.abs(T.slots.fields[k][c.i] - laneSun(c, T.slots.suns[k])) < 1e-6);
    let d = 0;
    for (let i = 0; i < n * n; i++) if (!set.has(i)) d = Math.max(d, Math.abs(T.slots.fields[k][i] - plain.fields[k][i]));
    assert.equal(d, 0, `slot ${k}`);
  }
  // patching twice changes nothing
  const again = patchSlots(world, { suns: T.slots.suns, fields: T.slots.fields.map((f) => Float32Array.from(f)) });
  assert.deepEqual(Array.from(again.fields[72]), Array.from(T.slots.fields[72]));
  // the bands' set: the village's interior lanes of 1.5-3 m, walls 18-24 m
  const G = laneGroups(world);
  assert.ok(G.village.length > 900 && G.village.every((c) => c.W >= 1.5 && c.W <= 3 && c.H1 >= 18 && c.H2 <= 24));
});

test('thin sheets: every thin layer of the scene holds the 2 kJ floor (checkThin refuses less); tarpaulin at the floor is stable, at its real 0.4 kJ the 60 s step diverges', () => {
  const { world } = base10();
  const ids = checkThin(world);
  for (const id of ['rustTin', 'galvTin', 'asbestosRoof', 'tarpRoof', 'whiteTinAged', 'whiteTin']) assert.ok(ids.includes(id), id);
  const thin = { ...MATERIALS, tarpRoof: { ...MATERIALS.tarpRoof, thinC: { ...MATERIALS.tarpRoof.thinC, value: 400 } } };
  assert.throws(() => checkThin(world, thin), /below the 2000 floor/);
  assert.equal(MATERIALS.tarpRoof.thinC.value, VG.thinFloor.value);
  const ok = sheetRun('tarpRoof', 2000);
  assert.ok(ok.finite && ok.maxDelta < 0.05 && ok.factor < 1 && ok.jump < 5 && ok.max < 90 && ok.min > 15, JSON.stringify({ ...ok, ts: undefined }));
  const bad = sheetRun('tarpRoof', 400);
  assert.ok(!bad.finite && bad.factor > 2, `factor ${bad.factor}`);
});

test('the model: every cell from one run (heavy cells with spin-up, thin roofs alone); the white-roof model differs on the painted roof cells only', () => {
  const { world, T, C, setup } = base10();
  const N = world.n * world.n;
  assert.equal(setup.sets.thin.length + setup.sets.mass.length, N);
  for (const i of setup.sets.thin) assert.ok(MATERIALS[cellMat(world, i)].thinC);
  for (let i = 0; i < N; i++) assert.ok(T.ts(i, 15) !== 0 && Number.isFinite(T.ts(i, 15)));
  const paint = new Set(setup.sets.paint);
  let diff = 0;
  for (let i = 0; i < N; i++) {
    const d = Math.abs(C.ts(i, 15) - T.ts(i, 15));
    if (paint.has(i)) assert.ok(d > 5, `painted ${i}: ${d}`);
    else diff = Math.max(diff, d);
  }
  assert.equal(diff, 0);
  assert.ok(T.info.warm === VG.warm.value && T.info.thinDays >= 3);
});

test('under the roof: radiant proxy at its ends, air share and calibration, the cap with its flag', () => {
  assert.ok(Math.abs(radiantIn(70, 35) - (Math.pow(0.4 * 343.15 ** 4 + 0.6 * 310.15 ** 4, 0.25) - 273.15)) < 1e-9);
  assert.ok(radiantIn(70, 35) > 37 && radiantIn(70, 35) < 70);
  assert.ok(Math.abs(airShare(0) - 1) < 1e-12 && airShare(20) < 0.1);
  assert.ok(Math.abs(airIn(65, 35, nFor(30)) - VG.airTarget.value) < 1e-9);
  const { world, T, n, st } = base10();
  assert.ok(Math.abs(calibrate(world, T) - n) < 1e-12);
  assert.ok(Math.abs(st.edge.rustTin.airPeak - VG.airTarget.value) < 1e-9, 'the bare rusty-iron rooms peak at the target');
  assert.deepEqual(airShown(7.2), { value: 5, capped: true });
  assert.deepEqual(airShown(-6), { value: -5, capped: true });
  assert.deepEqual(airShown(3.1), { value: 3.1, capped: false });
});

// Rows outside their band, as shipped (see docs/sources.md, Block 10): pinned with tight tolerances so a change shows up here.
const PINNED_OUTSIDE = {
  '3. Asbestos-cement roofs': [67.846, 0.05],
  '5. Village lanes at 12:00': [21.484, 0.05],
};

test('acceptance bands: values, pinned misses, verdicts, docs table in sync', () => {
  const rows = bands10();
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside);
  assert.deepEqual(out.map((r) => r.label.slice(0, r.label.indexOf(' ', 30))).length, Object.keys(PINNED_OUTSIDE).length);
  for (const r of out) {
    const k = Object.keys(PINNED_OUTSIDE).find((p) => r.label.startsWith(p));
    assert.ok(k, `unexpected miss: ${r.label} = ${r.value}`);
    const [v, tol] = PINNED_OUTSIDE[k];
    assert.ok(Math.abs(r.value - v) < tol, `${k}: ${r.value}`);
  }
  assert.deepEqual(bandVerdicts(rows), { 1: true, 2: true, 3: false, 4: true, 5: false, 6: true, 7: true, 8: true });
  assert.ok(md.includes(bands10Markdown(rows)), 'run node scripts/sources.mjs');
  // the calibrated band is supplementary (by construction), the cap never binds
  const cal = rows.find((r) => r.label.startsWith('7. Supplementary (by construction'));
  assert.ok(cal && cal.supp && Math.abs(cal.value - 3) < 1e-6);
  assert.equal(rows.find((r) => r.label.startsWith('8. Illustrative')).value, 0);
});

test('every band of the brief is checked: 1-8, each with at least one counted row', () => {
  const rows = bands10();
  for (let b = 1; b <= 8; b++) assert.ok(rows.some((r) => r.label.startsWith(`${b}. `) && !r.supp), `band ${b}`);
  for (const r of rows) assert.ok(r.src in SOURCES, r.src);
});

test('the misses\' causes (docs only): both lane causes together bring band 5 inside, neither alone; an underside loss brings asbestos inside', () => {
  const c = causes10();
  const [shipped, a, b, both] = c.lane;
  assert.ok(shipped.noon > 8 && a.noon > 8 && b.noon > 8 && both.noon <= 8);
  for (const r of c.lane) assert.ok(r.night >= 2 && r.night <= 6);
  const asb = c.sheet.find((s) => s.id === 'asbestosRoof');
  assert.ok(asb.ts15 >= 50 && asb.ts15 <= 62 && asb.shipped > 62);
  assert.ok(md.includes('### Causes of the misses (docs-only runs)'));
});

test('walkers and residents: shade-seeking at 15:00; residents on ten roofs from 20:00 to 01:00 at the roof\'s height, a pure function of the hour', () => {
  const w = walkers10(15);
  assert.ok(w.ratio >= 2 && w.shade >= 0.5);
  const { world, T } = base10();
  const heat = (hq) => (i) => ({ tmrt: T.tmrt(i, hq), sunlit: T.sunlit(i, hq) });
  for (const h of [15, 19.75, 1]) assert.equal(rooftopsAt(world, h, heat(h)).length, 0, `${h}`);
  assert.ok(onRoofs(20) && onRoofs(23.75) && onRoofs(0.5));
  const a = rooftopsAt(world, 21, heat(21));
  assert.deepEqual(a, rooftopsAt(world, 21, heat(21)));
  assert.equal(a.length, SCENE.rooftops.length * 2);
  for (const p of a) {
    const B = world.vgParent.get(p.roof);
    assert.ok(p.z === B.h && p.x > B.x0 && p.x < B.x1 && p.y > B.y0 && p.y < B.y1 && p.sit && Number.isFinite(p.heat.tmrt));
  }
});

test('every block-10 value has a source, a basis tag, a verified flag and a note; materials and keys listed in sources.md', () => {
  for (const [k, p] of Object.entries(VG)) {
    assert.ok(p.source in SOURCES, k);
    assert.ok(p.basis in BASIS, k);
    assert.equal(typeof p.verified, 'boolean');
    assert.ok(VG_NOTES[k], `note ${k}`);
    assert.ok(md.includes(`| \`${k}\` |`), `${k} in sources.md`);
    if (p.source === 'engine') assert.equal(p.basis, 'engine', k);
  }
  for (const id of ['rustTin', 'galvTin', 'asbestosRoof', 'tarpRoof', 'whiteTin', 'whiteTinAged', 'slabRoof']) {
    assert.ok(MATERIALS[id] && md.includes(`\`${id}\``), id);
    for (const k of ['alpha', 'eps']) assert.ok(MATERIALS[id][k].note, `${id}.${k} note`);
  }
  for (const k of ['brief10', 'pingshan', 'wu2015', 'yi2022', 'deng2023', 'scott2017', 'tasgaonkar2022', 'wilby2021', 'vellingiri2020', 'nutkiewicz2022', 'ma2015', 'hess2018']) assert.ok(md.includes(`**[${k}]**`), k);
  // the brief's central values
  assert.equal(MATERIALS.rustTin.alpha.value, 0.25);
  assert.equal(MATERIALS.rustTin.eps.value, 0.825);
  assert.equal(MATERIALS.rustTin.thinC.value, 3000);
  assert.equal(MATERIALS.asbestosRoof.alpha.value, 0.3);
  assert.equal(MATERIALS.galvTin.alpha.value, 0.6);
  assert.equal(VG.fr.value, 0.4);
  assert.equal(VG.hci.value, 1.25);
});

test('glossary: urban village (城中村), handshake building (握手楼), indoor radiant temperature, heat vulnerability, on the village page only', () => {
  const keys = termsFor('village');
  for (const k of ['urbanVillage', 'handshakeBuilding', 'indoorRadiant', 'heatVulnerability']) {
    assert.ok(keys.includes(k), k);
    assert.deepEqual(GLOSSARY[k].scenes, ['village']);
    assert.ok(!termsFor('busstop').includes(k));
  }
  assert.ok(GLOSSARY.urbanVillage.term.includes('城中村') && GLOSSARY.handshakeBuilding.term.includes('握手楼'));
});

test('build: the block\'s materials are one @page village group, carried by the village page only, as its own bytes', () => {
  const src = read('engine/materials.js');
  const g = pageMaterialGroups(src).filter((x) => x.city === 'village');
  assert.equal(g.length, 1);
  for (const id of ['rustTin', 'tarpRoof', 'slabRoof']) assert.ok(g[0].text.includes(`  ${id}: {`));
  assert.ok(!trimMaterials(src, new Set(), 'busstop').includes('rustTin: {'));
  assert.ok(trimMaterials(src, new Set(), 'village').includes('rustTin: {'));
  const p = pageParts('village');
  assert.ok(p.matBytes > 2500 && p.ownBytes > 40000, `${p.matBytes} ${p.ownBytes}`);
  const bs = pageParts('busstop').bundle;
  assert.ok(bs.includes("__m['village'] = { isVillage: () => false };") && !bs.includes('function villageSetup') && !bs.includes('rustTin: {'));
});

test('scene: at most five notes, equal-length route variants, rooftop rooms inside their house; blocks 1-9 are not the village block and keep their world', () => {
  assert.ok(isVillage(SCENE));
  assert.ok(SCENE.notes.length <= 5);
  const len = (v) => Math.hypot(v[2] - v[0], v[3] - v[1]);
  for (const r of SCENE.routes) assert.ok(Math.abs(len(r.variants[0]) - len(r.variants[1])) < 1e-9, r.id);
  const byId = new Map(SCENE.buildings.map((B) => [B.id, B]));
  for (const B of SCENE.buildings.filter((x) => x.on)) {
    const P = byId.get(B.on);
    assert.ok(B.x0 >= P.x0 && B.x1 <= P.x1 && B.y0 >= P.y0 && B.y1 <= P.y1 && B.h > P.h, B.id);
  }
  // the first building containing a rooftop room's cell centre is the room (rooms are listed first)
  const first = SCENE.buildings.findIndex((B) => !B.on);
  assert.ok(SCENE.buildings.slice(0, first).every((B) => B.on) && SCENE.buildings.slice(first).every((B) => !B.on));
  for (const S of [S1, S2, S3, S4, S5, S6, S7, S8, S9]) {
    assert.ok(!isVillage(S), S.id);
    const w = buildWorld(S, { svf: false });
    assert.ok(!w.vg && !w.vgFills, S.id);
  }
});

test('language: the block\'s UI text has none of the words the brief rules out ("slum" only in source titles); the check finds an injected word', () => {
  assert.deepEqual(ruledOut('Rooms in an urban village (城中村), residents'), []);
  assert.deepEqual(ruledOut('a chaotic tangle of tangled wires in the slum'), ['chaotic', 'tangled', 'slum']);
  for (const f of ['engine/vgui.js', 'engine/vgkit.js', 'engine/village.js', 'cities/village/scene.js', 'scripts/village-docs.mjs']) assert.deepEqual(ruledOut(read(f)), [], f);
  const terms = ['urbanVillage', 'handshakeBuilding', 'indoorRadiant', 'heatVulnerability'].map((k) => JSON.stringify(GLOSSARY[k])).join(' ');
  assert.deepEqual(ruledOut(terms), []);
  for (const id of ['rustTin', 'galvTin', 'asbestosRoof', 'tarpRoof', 'whiteTin', 'whiteTinAged', 'slabRoof']) assert.deepEqual(ruledOut(JSON.stringify(MATERIALS[id])), [], id);
  // the one source title with the word is a title (its SOURCES text quotes the study, the references page lists it)
  const withWord = Object.entries(SOURCES).filter(([k, v]) => ['brief10', 'pingshan', 'wu2015', 'yi2022', 'deng2023', 'scott2017', 'tasgaonkar2022', 'wilby2021', 'khlongToey', 'vellingiri2020', 'nutkiewicz2022', 'bunker2024', 'emissTables', 'energyStarRoof', 'ma2015', 'natMed2024', 'hess2018', 'carbonBriefAc', 'dialogueEarth', 'ren2025'].includes(k) && ruledOut(v).length);
  assert.deepEqual(withWord, []);
});

test('the cards quote the bands the docs check', () => {
  assert.deepEqual(VG_BANDS, { laneNoon: 8, openNoon: 25, night: [2, 6], rust: [60, 75], white: [15, 25], asbestos: [50, 62], cool: [-2.5, -1] });
  const rows = bands10();
  const band = (p) => rows.find((r) => r.label.startsWith(p));
  assert.deepEqual([band('1.').lo, band('1.').hi], VG_BANDS.rust);
  assert.deepEqual([band('3.').lo, band('3.').hi], VG_BANDS.asbestos);
  assert.equal(band('5. Village').hi, VG_BANDS.laneNoon);
  assert.equal(band('5. The open').lo, VG_BANDS.openNoon);
  assert.deepEqual([band('6.').lo, band('6.').hi], VG_BANDS.night);
});

test('roof cells: each sheet roof\'s cells are its own; the hours cover the day', () => {
  const { world } = base10();
  assert.equal(HOURS.length, 96);
  for (const B of world.buildings.filter((x) => x.style === 'roofRoom').slice(0, 10)) assert.equal(cellsOf(world, B.index).length, 1, B.id);
});

test('the block-10 modules hold no clock or random source', () => {
  for (const f of ['village', 'vgkit', 'vgui']) {
    const src = read(`engine/${f}.js`);
    assert.ok(!/Math\.random|Date\.now|new Date/.test(src), f);
  }
});
