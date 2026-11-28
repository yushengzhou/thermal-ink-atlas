// Block 7 (older high-rise estate) model checks: the sun geometry, the sill
// rule checker (rays against boxes, steps, stretches, the long-slab case),
// the courtyard shade (polygon against the engine's mask), the condenser
// numbers and the plume wall term (Tmrt only, Ts untouched), the acceptance
// bands with their pinned soft miss and the docs table, basis tags, the
// glossary, the scene's geometry, and that blocks 1-6 never take the new paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base7, geometry7, court7, longSlabs, kFor2h, fullDecl, noonCompare, bands7, bandVerdicts, ES_NOTES, plumeTs7 } from '../../scripts/estate.mjs';
import { bands7Markdown } from '../../scripts/estate-docs.mjs';
import { ES, AC_SHARE, acShare, rayHits, sunHours, sillPoints, qRej, exhaustDT, rhoAir, siteHeat, flatsOf, plumeShares, plumeField, winterSite, clockOf, solarMinutes, courtShade, sunAtSolar, maskDepth, effHeight } from '../../engine/estate.js';
import { hidden } from '../../engine/eskit.js';
import { buildingMask, CP_AIR } from '../../engine/thermal.js';
import { solarPosition } from '../../engine/sun.js';
import { SOURCES, BASIS } from '../../engine/materials.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { buildWorld } from '../../engine/world.js';
import { SCENE } from '../../cities/estate/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';
import { SCENE as S4 } from '../../cities/waterfront/scene.js';
import { SCENE as S5 } from '../../cities/hutong/scene.js';
import { SCENE as S6 } from '../../cities/parking/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('solar time and clock time are inverse; the 大寒 site is 20 January at the same place', () => {
  const w = winterSite(SCENE.site);
  assert.deepEqual([w.month, w.day, w.lat, w.lon], [1, 20, 35, 120]);
  for (const s of [SCENE.site, w]) for (const tst of [480, 600, 720, 900, 960]) assert.ok(Math.abs(solarMinutes(s, clockOf(s, tst)) - tst) < 1e-6, `${tst}`);
  // at solar noon the sun is due south
  for (const s of [SCENE.site, w]) assert.ok(Math.abs(sunAtSolar(s, 720).az - 180) < 1e-3);
});

test('rays against boxes: hits in front, misses beside, above and behind', () => {
  const B = { x0: 0, y0: 10, x1: 10, y1: 20, h: 30 };
  const up = (dx, dy, dz) => {
    const n = Math.hypot(dx, dy, dz);
    return [dx / n, dy / n, dz / n];
  };
  assert.equal(rayHits([5, 30, 1], up(0, -1, 0.5), B), true, 'toward the box, below its top');
  assert.equal(rayHits([5, 30, 1], up(0, -1, 3), B), false, 'over its top');
  assert.equal(rayHits([20, 30, 1], up(0, -1, 0.5), B), false, 'beside it');
  assert.equal(rayHits([5, 30, 1], up(0, 1, 0.5), B), false, 'away from it');
});

test('the checker counts 5-min steps in stretches of at least 10 min, and nothing behind a wall', () => {
  const site = winterSite(SCENE.site);
  // open ground: the whole window (8 h) when the point faces south and nothing is in the way
  const open = sunHours({ buildings: [] }, { x: 0, y: 0, z: 0.9, b: -1 }, site);
  assert.equal(open.hours, 8);
  assert.deepEqual(open.runs, [[480, 960]]);
  // a wall 1 m south, 50 m high and long: no sun at all
  const wall = { x0: -500, y0: 1, x1: 500, y1: 2, h: 50, index: 0 };
  assert.equal(sunHours({ buildings: [wall] }, { x: 0, y: 0, z: 0.9, b: -1 }, site).hours, 0);
  // stretches shorter than 10 min do not count: with 15-min segments required, 10-min runs drop out
  const r5 = sunHours({ buildings: [] }, { x: 0, y: 0, z: 0.9, b: -1 }, site, { t0: 700, t1: 710 });
  assert.equal(r5.hours, 10 / 60);
  assert.equal(sunHours({ buildings: [] }, { x: 0, y: 0, z: 0.9, b: -1 }, site, { t0: 700, t1: 710, seg: 15 }).hours, 0);
});

test('long continuous slabs: the sill hours grow with the spacing, 1.47 H_eff gives 1.5 h with this sun (pinned), 2 h needs about 1.485', () => {
  const hs = [1.4, 1.45, 1.47, 1.5, 1.52, 1.6].map((k) => longSlabs(k).hours);
  for (let i = 1; i < hs.length; i++) assert.ok(hs[i] >= hs[i - 1], `${hs}`);
  assert.equal(longSlabs(1.47).hours, 1.5);
  const k = kFor2h();
  assert.ok(k > 1.47 && k < 1.5, `${k}`);
});

test('the engine sun vs the full NOAA declination: about 0.2 deg apart on the design days (documented, not changed); with the full one 1.47 H_eff gives the brief\'s 2 h', () => {
  // full NOAA algorithm, reference values (solar-calculator spreadsheet method): 20 Jan 2026 and 20 Jul 2026 at 04:00 UT
  assert.ok(Math.abs(fullDecl(2026, 1, 20, 4) - -20.129) < 0.01, `${fullDecl(2026, 1, 20, 4)}`);
  const n = noonCompare();
  assert.ok(Math.abs(n.full.jan - 34.87) < 0.01 && Math.abs(n.full.jul - 75.66) < 0.01, JSON.stringify(n.full));
  // the brief's 34.8 / 75.6 match the full algorithm within 0.1 deg; the engine is about 0.2 deg off (pinned)
  assert.ok(Math.abs(n.full.jan - 34.8) < 0.1 && Math.abs(n.full.jul - 75.6) < 0.1);
  assert.ok(Math.abs(n.engine.jan - n.full.jan - -0.24) < 0.02 && Math.abs(n.engine.jul - n.full.jul - 0.22) < 0.02, JSON.stringify(n));
  assert.equal(longSlabs(1.47, true).hours, 2);
  assert.equal(kFor2h(true), 1.47);
});

test('sill points: every 2.5 m along each slab south face, 0.9 m up, eight flats per slab; the rule holds at every sill', () => {
  const { world, st } = base7();
  const pts = sillPoints(world);
  const slabs = world.buildings.filter((B) => B.kind === 'slab');
  assert.equal(slabs.length, 12);
  assert.equal(pts.length, slabs.length * 40);
  assert.ok(pts.every((p) => p.z === 0.9 && Math.abs(p.y - world.buildings[p.b].y1 - 0.05) < 1e-9));
  assert.equal(st.rule.flats.length, 96);
  assert.ok(st.rule.min >= ES.ruleHours.value, `lowest ${st.rule.min}`);
  // a sill hours number is the stretches it counted
  for (const s of st.rule.sills.slice(0, 10)) assert.ok(s.hours >= 0 && s.hours <= 8);
  // rows 1-3 have the next row 80 m south; G / H_eff above 1.47
  for (const s of st.rule.slabs) if (s.G !== null) assert.ok(s.G === SCENE.gap && s.k >= ES.spacingK.value, s.id);
});

test('courtyard shade: the slab polygon matches the engine mask at noon, and stays within 0.37 H from 10:00 to 16:00', () => {
  const { world } = base7();
  const B = world.buildings.find((b) => b.id === 'slab2a');
  const g = geometry7();
  const ct = court7();
  assert.ok(ct.far <= 0.37 * B.h, `${ct.far}`);
  assert.ok(ct.far > 0 && ct.noon.far === ct.far, 'deepest at noon');
  // the mask depth (2.5 m samples, all buildings) agrees with the polygon's noon depth on the middle column
  assert.ok(Math.abs(g.maskJul - ct.noon.mid) <= 2.5, `${g.maskJul} vs ${ct.noon.mid}`);
  assert.ok(Math.abs(g.maskJul - g.jul.depth * B.h) <= 2.5);
  assert.ok(Math.abs(g.maskJan - g.jan.depth * B.h) <= 2.5);
  // a different time: the depth from the mask follows the sun (deeper at 10:00 on 大寒 than in July)
  const w = winterSite(SCENE.site);
  const m = (s) => maskDepth(world, buildingMask(world, solarPosition(s, clockOf(s, 600))), B);
  assert.ok(m(w) > m(SCENE.site));
  assert.equal(courtShade(B, 75, { alt: -5, az: 180 }).far, 0, 'no sun, no shadow');
});

test('condensers: Q_rej = Q_cool (1 + 1/EER), exhaust rise = Q_rej / (rho c_p V), the site W m-2 from the flat count and the profile', () => {
  assert.ok(Math.abs(qRej() - 3.5 * (1 + 1 / 3.3)) < 1e-12);
  assert.ok(Math.abs(exhaustDT(35) - (qRej() * 1000) / (rhoAir(35) * CP_AIR * 0.6)) < 1e-9);
  assert.ok(Math.abs(rhoAir(35) - 1.146) < 0.002);
  assert.equal(AC_SHARE.length, 24);
  assert.ok(AC_SHARE.every((x) => x >= 0 && x <= 1));
  assert.equal(Math.max(...AC_SHARE), acShare(20));
  assert.ok(acShare(20.5) === 1 && Math.abs(acShare(23.5) - 0.85) < 1e-12);
  const { world } = base7();
  const flats = world.buildings.reduce((a, B) => a + flatsOf(B), 0);
  assert.equal(flats, 12 * 18 * 8 + 2 * 29 * 6);
  const h = siteHeat(world, 21);
  assert.ok(Math.abs(h.wm2 - (flats * 3.3 * 1000) / 160000) < 1e-9);
  // plume shares: slabs south twice north, gables none, shops none
  const s = plumeShares(world.buildings.find((B) => B.kind === 'slab'));
  assert.ok(Math.abs(s.S - 2 * s.N) < 1e-12 && s.E === 0 && s.W === 0);
  assert.deepEqual(plumeShares(world.buildings.find((B) => B.kind === 'shops')), { S: 0, N: 0, E: 0, W: 0 });
});

test('plume field: shares of the walls a cell sees, between 0 and the largest face share; none on roofs or far from walls', () => {
  const { world } = base7();
  const P = world.estate.plume;
  const top = Math.max(...world.buildings.map((B) => Math.max(...Object.values(plumeShares(B)))));
  for (let i = 0; i < P.length; i++) {
    assert.ok(P[i] >= 0 && P[i] <= top + 1e-6, `${i}`);
    if (world.bld[i] >= 0) assert.equal(P[i], 0);
  }
  // a world with one shop box only: nothing anywhere
  const w = buildWorld({ ...SCENE, buildings: SCENE.buildings.filter((B) => B.kind === 'shops') }, { svf: false });
  assert.ok(plumeField(w).every((x) => x === 0));
  // the path along a slab's north face sees the north face (share 0.12) and the slab across the courtyard (south face, 0.24)
  const c = world.cellIndex(72.5, 152.5);
  assert.ok(P[c] > 0.05 && P[c] < 0.25, `${P[c]}`);
});

test('the plume wall term reaches Tmrt only: Ts identical on and off, Tmrt up by less than 1 K, off = the plain longwave', () => {
  const { world, T, plume, st } = base7();
  const cells = [];
  for (let i = 0; i < world.n * world.n; i += 11) if (world.bld[i] < 0) cells.push(i);
  const was = plume.on;
  for (const h of [3, 15, 21]) {
    plume.on = false;
    const a = cells.map((i) => [T.ts(i, h), T.tmrt(i, h), T.lwall(i, h)]);
    plume.on = true;
    const b = cells.map((i) => [T.ts(i, h), T.tmrt(i, h), T.lwall(i, h)]);
    cells.forEach((i, k) => {
      assert.equal(b[k][0], a[k][0], 'Ts changed');
      const d = b[k][1] - a[k][1];
      assert.ok(d >= 0 && d < 1, `Tmrt +${d}`);
      if (world.estate.plume[i] === 0) assert.equal(b[k][2], a[k][2]);
      else assert.ok(b[k][2] > a[k][2]);
    });
  }
  plume.on = was;
  assert.ok(st.plumeMax > 0.05 && st.plumeMax < 1);
  // fed into the surface balance (docs run, upper bound) it would move ground Ts by a little
  const pt = plumeTs7();
  assert.ok(pt.max > 0 && pt.max < 0.5, `${pt.max}`);
});

test('the view test: a point is hidden by a tall block in front of it (south-east, toward the viewer), not by one behind', () => {
  const { world } = base7();
  const T = world.buildings.find((b) => b.id === 'towerW');
  assert.equal(hidden(world, [37.5, T.y1 + 0.5, 3], T.index), true, 'low on the tower, slab 1A stands 20 m in front');
  assert.equal(hidden(world, [37.5, T.y1 + 0.5, 80], T.index), false, 'high on the tower');
  assert.equal(hidden(world, [70, 245, 0], -1), true, 'courtyard ground 5 m behind slab 3A');
  const B = world.buildings.find((b) => b.id === 'slab2a');
  assert.equal(hidden(world, [70, B.y1 + 0.5, 3], B.index), false, 'a sill 80 m behind the next row is in view');
});

// Rows outside their band, as shipped (see docs/sources.md, Block 7): pinned so a change shows up here.
const PINNED_OUTSIDE = {
  '5. Soft: 15:00, building-shaded paving (n, SVF 0.33–0.85): Tmrt change per 0.1 less sky view, K (Lai et al.: +1.6 K, within × 2)': [0.174, 0.02],
  '3. Supplementary: the checker on two long continuous slabs at G = 1.47 H_eff (75.4 m; a test scene, not the estate), with the engine\'s approximate declination: sun at the middle sill, h (the brief: 2 h)': [1.5, 1e-9],
};
const key = (label) => label.replace(/n \d+/g, 'n');

test('acceptance bands: values, pinned deviations, verdicts, docs table in sync', () => {
  const rows = bands7();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k][0]) <= PINNED_OUTSIDE[k][1], `${k}: ${v}`);
  // the hard bands 1-4 and 6 are met; soft band 5 missed, soft band 7 inside (reported, not asserted beyond the pin)
  assert.deepEqual(bandVerdicts(rows), { 1: true, 2: true, 3: true, 4: true, 5: false, 6: true, 7: true });
  for (const r of rows.filter((x) => !x.soft && !x.supp)) assert.ok(r.inside, r.label);
  assert.ok(rows.filter((r) => r.soft).every((r) => /^[57]\. Soft/.test(r.label)));
  assert.ok(rows.filter((r) => r.supp).every((r) => /Supplementary/.test(r.label)));
  assert.ok(md.includes(bands7Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['**Air fixed:**', '**One wind**', '**National rule only:**', '**Rule counted at the sill, not the ground:**', '**The engine\'s sun is approximate:**', '**Invented estate:**', '**Misses:**', 'Not tuned', 'not changed after the bands were checked']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
});

test('every band of the brief is checked: 1-7, each with at least one counted row', () => {
  const rows = bands7();
  for (const n of [1, 2, 3, 4, 5, 6, 7]) assert.ok(rows.some((r) => r.label.startsWith(`${n}. `) && !r.supp), `band ${n}`);
});

test('every block-7 value has a source, a basis tag, a verified flag and a note; listed in sources.md', () => {
  for (const [k, p] of Object.entries(ES)) {
    assert.ok(p.source in SOURCES && p.basis in BASIS, k);
    assert.equal(typeof p.verified, 'boolean', k);
    assert.ok(ES_NOTES[k], `${k}: no note`);
    assert.ok(md.includes(`| \`${k}\` |`), `${k} missing in sources.md`);
  }
  for (const k of ['brief7', 'gb50180', 'db33', 'gb55038', 'mu2025', 'chow1999', 'bojic2001', 'bruelisauer2014', 'demunck2013', 'berlin2020', 'lai2017', 'plea2016', 'li2023', 'yang2010', 'cai2017']) assert.ok(md.includes(`**[${k}]**`), k);
  // central values of the brief
  assert.deepEqual([ES.floorHeight.value, ES.sillHeight.value, ES.ruleHours.value, ES.spacingK.value, ES.qCool.value, ES.eer.value, ES.fanFlow.value, ES.perFlat.value], [2.9, 0.9, 2, 1.47, 3.5, 3.3, 0.6, 3.3]);
  assert.ok(ES.wallDT.value <= 2);
});

test('glossary: the sunlight rule, effective height, spacing coefficient, condenser heat and EER, on the estate page only', () => {
  const keys = termsFor('estate');
  for (const k of ['sunlightRule', 'effectiveHeight', 'spacingCoefficient', 'condenserHeat', 'eer']) {
    assert.ok(keys.includes(k), k);
    assert.deepEqual(GLOSSARY[k].scenes, ['estate']);
    for (const c of ['asphalt-park', 'parking']) assert.ok(!termsFor(c).includes(k), `${k} on ${c}`);
  }
});

test('scene: at most five notes, edges on the 5 m grid, rows 80 m apart, equal-length route variants; blocks 1-6 are not the estate', () => {
  assert.ok(SCENE.notes.length <= 5);
  for (const g of SCENE.ground) for (const v of g.poly) assert.equal(v % 5, 0, g.id);
  for (const B of SCENE.buildings) for (const v of [B.x0, B.y0, B.x1, B.y1]) assert.equal(v % 5, 0, B.id);
  const slabs = SCENE.buildings.filter((B) => B.kind === 'slab');
  for (const B of slabs) assert.ok(Math.abs(B.h - 18 * 2.9) < 1e-9 && Math.abs(effHeight(B) - 51.3) < 1e-9);
  for (let r = 0; r + 1 < SCENE.rows.length; r++) assert.equal(SCENE.rows[r + 1] - 15 - SCENE.rows[r], SCENE.gap);
  const len = (p) => Math.hypot(p[2] - p[0], p[3] - p[1]);
  for (const r of SCENE.routes) assert.ok(Math.abs(len(r.variants[0]) - len(r.variants[1])) < 1e-9, r.id);
  for (const S of [S1, S2, S3, S4, S5, S6]) assert.ok(!S.estateBlock, S.id);
});

test('the block-7 modules hold no clock or random source', () => {
  for (const f of ['estate', 'eskit', 'esui']) {
    const src = readFileSync(new URL(`../../engine/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|new Date/.test(src), f);
  }
});
