// Block 11 (desert courtyard neighbourhood): the per-site hour of the warmest
// air and the block's own wall albedo (and that both leave every other block
// as it was), the scene, the parameters (source, basis, verified, note), the
// mesquite calibration, the coating model, the shade classes, the acceptance
// bands with every row pinned, the misses' causes (docs only) and the
// numbers the cards quote from them, walkers, glossary, the build cut, the
// cards' plain-words layout (outside evaluation #29) and determinism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENE } from '../../cities/desert/scene.js';
import { airTemp, wallReflectCoef, daylight, cellMat } from '../../engine/thermal.js';
import { MATERIALS, SOURCES, BASIS, MODEL } from '../../engine/materials.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { DS, isDesert, UNCOATED, KINDS } from '../../engine/desert.js';
import { DS_CARDS, DS_BANDS, dsNotes, designCard, sailsCard, arcadeCard, lawnCard, mistCard, coatCard, dryCard, deathsCard } from '../../engine/dsui.js';
import { base11, bands11, bandVerdicts, causes11, sensitivity11, walkers11, calibrateMesquite, DS_NOTES, sunCheck11 } from '../../scripts/desert.mjs';
import { bands11Markdown } from '../../scripts/desert-docs.mjs';
import { pageParts, pageMaterialGroups, coreBytes } from '../../scripts/build.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''}: ${a} vs ${b} (± ${tol})`);

test('air temperature: without tmaxHour the curve is the old 15:00 one bit for bit; with it the peak moves to that hour, continuous through the day', () => {
  const old = (site, hour, rise) => {
    const { taMin, taMax } = site;
    const h = ((hour % 24) + 24) % 24;
    if (h >= rise && h <= 15) return taMin + ((taMax - taMin) * (1 - Math.cos((Math.PI * (h - rise)) / (15 - rise)))) / 2;
    const hh = h < rise ? h + 24 : h;
    return taMax - ((taMax - taMin) * (1 - Math.cos((Math.PI * (hh - 15)) / (rise + 24 - 15)))) / 2;
  };
  const site = { ...SCENE.site, tmaxHour: undefined };
  const { rise } = daylight(site);
  for (let m = 0; m < 1440; m += 7) assert.equal(airTemp(site, m / 60, rise), old(site, m / 60, rise), `minute ${m}`);
  const s = SCENE.site;
  const r = daylight(s).rise;
  let best = -Infinity;
  let at = 0;
  for (let m = 0; m < 1440; m++) {
    const t = airTemp(s, m / 60, r);
    if (t > best) [best, at] = [t, m / 60];
  }
  near(at, s.tmaxHour, 1 / 60, 'peak hour');
  near(best, s.taMax, 1e-9, 'peak');
  near(airTemp(s, r, r), s.taMin, 1e-9, 'sunrise');
  for (let m = 1; m < 1440; m++) assert.ok(Math.abs(airTemp(s, m / 60, r) - airTemp(s, (m - 1) / 60, r)) < 0.1, `jump at minute ${m}`);
});

test('wall albedo: the block\'s own (world.wallAlbedo) where set, else the shared value; every other scene sets none', () => {
  const { world } = base11();
  const i = world.ds.F.arcade[0];
  const a = wallReflectCoef(world, i);
  const keep = world.wallAlbedo;
  world.wallAlbedo = undefined;
  const b = wallReflectCoef(world, i);
  world.wallAlbedo = keep;
  near(a / b, DS.wallAlbedo.value / MODEL.wallAlbedo.value, 1e-9, 'ratio');
  assert.equal(world.wallAlbedo, DS.wallAlbedo.value);
  for (const c of ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate', 'campus', 'busstop', 'village']) {
    const src = read(`cities/${c}/scene.js`);
    assert.ok(!/tmaxHour|wallAlbedo|desertBlock/.test(src), c);
  }
});

test('site and parameters: the scene\'s site is the DS values; every DS value and every block-11 material value has a source, a basis tag, a verified flag and a note', () => {
  const s = SCENE.site;
  assert.equal(s.lat, DS.lat.value);
  assert.equal(s.taMin, DS.taMin.value);
  assert.equal(s.taMax, DS.taMax.value);
  assert.equal(s.tmaxHour, DS.tmaxHour.value);
  assert.equal(s.vapourHpa, DS.vapour.value);
  assert.equal(s.wind, DS.wind.value);
  assert.equal(s.lon, -112);
  assert.equal(s.tz, -7);
  assert.ok(isDesert(SCENE));
  for (const [k, p] of Object.entries(DS)) {
    assert.ok(p.source in SOURCES || p.source === 'engine', `${k}: source ${p.source}`);
    assert.ok(p.basis in BASIS, `${k}: basis ${p.basis}`);
    assert.equal(typeof p.verified, 'boolean', k);
    assert.ok(DS_NOTES[k] && DS_NOTES[k].length > 20, `${k}: note`);
  }
  for (const id of ['gravel', 'desertLawn', 'coolCoat', 'desertSail', 'ramada', 'arcadeRoof', 'mesquite', 'paloVerde']) {
    const m = MATERIALS[id];
    for (const k of ['alpha', 'eps', 'ef', 'mu', 'tr']) {
      if (!m[k]) continue;
      assert.ok(m[k].source in SOURCES, `${id}.${k}`);
      assert.ok(m[k].basis in BASIS, `${id}.${k}`);
      assert.equal(m[k].verified, false, `${id}.${k}: nothing here was checked against a primary source`);
      assert.ok(m[k].note.length > 2, `${id}.${k}: note`);
    }
  }
  // the brief's central values
  assert.equal(MATERIALS.gravel.alpha.value, 0.275);
  assert.equal(MATERIALS.desertLawn.ef.value, 0.9);
  assert.equal(MATERIALS.coolCoat.alpha.value, 0.345);
  assert.equal(MATERIALS.desertSail.tr.value, 0.15);
  assert.equal(DS.wallAlbedo.value, 0.6);
  assert.equal(MATERIALS.mesquite.tr.basis, 'calib');
  assert.equal(MATERIALS.paloVerde.tr.value, MATERIALS.mesquite.tr.value);
});

test('scene: at most five notes, equal-length route variants, houses on the 5 m grid with courtyards inside, no two buildings overlapping, screens off the buildings', () => {
  assert.ok(SCENE.notes.length <= 5);
  for (const r of SCENE.routes) {
    const len = (v) => Math.hypot(v[2] - v[0], v[3] - v[1]);
    near(len(r.variants[0]), len(r.variants[1]), 1e-9, r.id);
  }
  const B = SCENE.buildings;
  for (let a = 0; a < B.length; a++) {
    for (let b = a + 1; b < B.length; b++) {
      const o = B[a].x0 < B[b].x1 && B[b].x0 < B[a].x1 && B[a].y0 < B[b].y1 && B[b].y0 < B[a].y1;
      assert.ok(!o, `${B[a].id} overlaps ${B[b].id}`);
    }
  }
  for (const x of B.filter((q) => q.style === 'court')) for (const k of ['x0', 'y0', 'x1', 'y1']) assert.equal(x[k] % 5, 0, `${x.id}.${k}`);
  for (const P of SCENE.screens) assert.ok(!B.some((q) => P.x0 < q.x1 && q.x0 < P.x1 && P.y0 < q.y1 && q.y0 < P.y1), P.id);
  for (const p of Object.values(SCENE.probes)) assert.ok(p[0] >= 0 && p[0] <= 400 && p[1] >= 0 && p[1] <= 400);
  const { world } = base11();
  const court = SCENE.probes.court;
  assert.ok(world.bld[world.cellIndex(court[0], court[1])] < 0, 'the court probe is in a courtyard');
});

test('the mesquite crown is calibrated to the measured -16.7 K (by construction); the bisection, run again, finds the shipped value', () => {
  const { st } = base11();
  near(st.shade.mesquite[15].d, DS.mesquiteTarget.value, 0.1, 'shipped crown');
  const r = calibrateMesquite(0.2, 0.4, 0.05);
  near(r.tr, MATERIALS.mesquite.tr.value, 0.01, 'bisection');
  // and the shipped values are restored
  assert.equal(MATERIALS.mesquite.tr.value, 0.3);
  assert.equal(MATERIALS.paloVerde.tr.value, 0.3);
});

test('the coating model: the bare street differs from the coated one on Main Street\'s cells only, with aged asphalt there', () => {
  const { world, T, U } = base11();
  const main = new Set(world.ds.F.main);
  let other = 0;
  let changed = 0;
  for (let i = 0; i < world.n * world.n; i++) {
    const d = Math.abs(T.ts(i, 15) - U.ts(i, 15));
    if (main.has(i)) changed += d > 1 ? 1 : 0;
    else other += d > 0 ? 1 : 0;
  }
  assert.equal(other, 0);
  assert.ok(changed > 0.9 * main.size, `${changed} of ${main.size}`);
  for (const i of main) assert.equal(cellMat(world, i), 'coolCoat');
  assert.equal(UNCOATED.coolCoat.alpha.value, MATERIALS.asphalt.alpha.value);
  assert.deepEqual(U.info.mats.coolCoat.alpha, MATERIALS.asphalt.alpha);
});

test('shade classes: footprints are disjoint, the open reference is open sky and full sun by day, a class only where its shadow alone falls', () => {
  const { world, T, st } = base11();
  const F = world.ds.F;
  const seen = new Set();
  for (const k of KINDS) for (const i of F[k]) {
    assert.ok(!seen.has(i), `${k}: cell ${i} twice`);
    seen.add(i);
  }
  for (const i of F.ref) {
    assert.ok(world.svf[i] >= 0.85 && world.canopy[i] === 0 && world.bld[i] < 0 && !seen.has(i));
  }
  assert.ok(st.ref[15].n > 500);
  for (const k of ['sail', 'ramada', 'arcade', 'mesquite']) assert.ok(st.shade[k][15].n >= 10, `${k}: ${st.shade[k][15].n}`);
  assert.ok(T.sunlit(F.sail[0], 3) === 0);
});

/** Every band row, pinned (value, tolerance): a change to the model or the scene moves one and must be disclosed. */
const PINS = [
  [/^1\. Sunlit open gravel/, 65.916, 0.05],
  [/^1\. Supplementary: the plaza/, 65.675, 0.05],
  [/^2\. Main Street coated/, -8.847, 0.05],
  [/^2\. Supplementary: the same at 12/, -8.946, 0.05],
  [/^2\. Supplementary: Main Street coated − the cross/, -8.778, 0.05],
  [/^3\./, -1.55, 0.05],
  [/^4\. Irrigated/, 6.469, 0.02],
  [/^4\. Supplementary: the same, lowest/, 6.37, 0.02],
  [/^4\. Supplementary: the same, highest/, 6.516, 0.02],
  [/^5\. The plaza/, 73.642, 0.05],
  [/^5\. Supplementary: all sunlit/, 73.997, 0.05],
  [/^5\. Supplementary: the cross/, 70.997, 0.05],
  [/^6\. Under the shade sails/, -22.858, 0.05],
  [/^6\. Under the ramada/, -28.996, 0.05],
  [/^6\. Supplementary: under the café/, -29.17, 0.05],
  [/^7\. Supplementary \(by construction/, -16.764, 0.05],
  [/^7\. Under the palo verdes/, -8.807, 0.05],
  [/^7\. Supplementary \(added after the first run\): the palo verde cells in the courtyards/, -7.367, 0.05],
  [/^7\. Supplementary \(added after the first run\): the palo verde cells in the open/, -17.444, 0.05],
  [/^8\./, -26.963, 0.05],
  [/^9\. After sunset \(21:00\), under the sails/, 9.759, 0.05],
  [/^9\. After sunset \(21:00\), under the ramada/, 9.515, 0.05],
  [/^9\. After sunset \(21:00\), under the arcade/, 10.668, 0.05],
  [/^9\. After sunset \(21:00\), under the mesquites/, 7.89, 0.05],
  [/^9\. Supplementary/, 6.944, 0.05],
  [/^10\. A person/, 3.373, 0.02],
  [/^10\. Supplementary/, 5.29, 0.05],
  [/^Walkers/, 5.515, 0.3],
  [/^People dwelling/, 1, 1e-9],
];

test('acceptance bands: every row pinned; misses 1, 6, 7, 9, 10; verdicts; docs table in sync with the rows', () => {
  const rows = bands11();
  assert.equal(rows.length, PINS.length);
  for (const r of rows) {
    const p = PINS.filter(([re]) => re.test(r.label));
    assert.equal(p.length, 1, `one pin for ${r.label}`);
    near(r.value, p[0][1], p[0][2], r.label);
  }
  const v = bandVerdicts(rows);
  assert.deepEqual(Object.keys(v).sort((a, b) => a - b), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  assert.deepEqual(Object.keys(v).filter((k) => !v[k]).sort((a, b) => a - b), ['1', '6', '7', '9', '10']);
  // the supplementary rows outside their band are exactly these
  const out = rows.filter((r) => r.supp && !r.inside && !(r.lo === null && r.hi === null)).map((r) => r.label.slice(0, 40));
  assert.equal(out.length, 5, out.join(' | '));
  const md = read('docs/sources.md');
  assert.ok(md.includes(bands11Markdown(rows)), 'run `node scripts/sources.mjs` and commit docs/sources.md');
  assert.ok(md.includes('5 of 9 independent bands met (2, 3, 4, 5, 8); missed: 1, 6, 9, 10; band 7 semi-constructed (missed).'));
});

test('the misses\' causes (docs only) and the numbers the cards quote from them', () => {
  const c = causes11();
  const { st } = base11();
  const inside = (x, [a, b]) => x >= a && x <= b;
  // band 10 comes inside with the neighbourhood ground view, band 6's sails with that view and the brief's upper transmission
  assert.ok(inside(c.coatView, DS_BANDS.coatTmrt), `coating ${c.coatView}`);
  assert.ok(inside(c.sail25, DS_BANDS.sail), `sails ${c.sail25}`);
  assert.ok(!inside(c.view.sail.d, DS_BANDS.sail) && !inside(c.view.ramada.d, DS_BANDS.sail));
  // band 7: the courtyard cells miss, the open one is inside
  assert.ok(inside(c.palo.open.d, DS_BANDS.tree) && !inside(c.palo.court.d, DS_BANDS.tree));
  // band 9: no tested cause closes it
  for (const k of ['sail', 'ramada', 'arcade', 'mesquite']) {
    assert.ok(c.sheetRun[k] > 5 && c.leafNight[k] > 5 && c.view[k].night > 5, k);
    assert.ok(c.sheetRun[k] < st.shade[k][21].d, `${k}: the cooler overhead narrows the gap`);
  }
  // band 1: each of (a), (b) alone stays outside; the brief's upper albedo alone and all three together are inside
  const [g0, ga, gb, gc, gall] = c.gravel.map((x) => x.ts);
  assert.ok(ga > 63 && gb > 63 && gc <= 63 && ga < g0 && gb < g0 && gall <= 63, JSON.stringify(c.gravel));
  // the cards' rounded figures from these runs
  const sails = sailsCard({ st, palo: c.palo });
  assert.ok(sails.includes('about −19 degrees') && Math.round(-sensitivity11().whole.find((r) => r.label === 'sail transmission 0.25').sail) === 19);
  assert.ok(sails.includes('about −21') && Math.round(-c.view.sail.d) === 21);
  assert.ok(coatCard({ st, on: true }).includes('about +3.1 degrees') && c.coatView.toFixed(1) === '3.1');
  const night = ['sail', 'ramada', 'arcade', 'mesquite'].map((k) => c.sheetRun[k]);
  assert.ok(arcadeCard({ st }).includes('about 6 to 8 degrees') && Math.round(Math.min(...night)) === 6 && Math.round(Math.max(...night)) === 8);
  assert.ok(lawnCard({ st, water: { lawnApplied: 6.4, trees: [1.4, 4.3] } }).includes('about 61 °C') && Math.round(c.gravel[3].ts) === 61);
});

test('sensitivity runs restore every shipped value; the engine sun is within 0.3° of suncalc here', () => {
  const s = sensitivity11();
  assert.ok(s.gravel.length === 4 && s.lawn.length === 3 && s.coat.length === 2 && s.whole.length === 8);
  assert.equal(MATERIALS.desertSail.tr.value, 0.15);
  assert.equal(DS.wallAlbedo.value, 0.6);
  for (const x of sunCheck11()) assert.ok(Math.abs(x.dAlt) < 0.3 && Math.abs(x.dAz) < 0.3, JSON.stringify(x));
});

test('walkers seek shade at 15:00; the people dwelling are in shade', () => {
  const w = walkers11(15);
  assert.ok(w.ratio >= 2, `${w.ratio}`);
  assert.ok(w.shade >= 0.5);
});

test('glossary: xeriscape, ramada, reference ET and vapour pressure on the desert page only; wet-bulb and shade sail on it too', () => {
  const keys = termsFor('desert');
  for (const k of ['xeriscape', 'ramada', 'referenceEt', 'vapourPressure', 'wetBulb', 'shadeSail']) assert.ok(keys.includes(k), k);
  for (const k of ['xeriscape', 'ramada', 'referenceEt', 'vapourPressure']) {
    assert.deepEqual(GLOSSARY[k].scenes, ['desert']);
    for (const s of GLOSSARY[k].src.split(', ')) assert.ok(s in SOURCES, `${k}: ${s}`);
  }
  for (const c of ['village', 'campus', 'asphalt-park']) for (const k of ['xeriscape', 'ramada', 'referenceEt', 'vapourPressure']) assert.ok(!termsFor(c).includes(k));
});

test('build: the block\'s materials are one @page desert group on the desert page only; its modules are its own bytes; the shared core stays under budget', () => {
  const groups = pageMaterialGroups(read('engine/materials.js')).filter((g) => g.city === 'desert');
  assert.equal(groups.length, 1);
  const p = pageParts('desert');
  assert.ok(p.matBytes > 2000 && p.ownBytes > 40000);
  for (const c of ['village', 'asphalt-park']) assert.ok(!pageParts(c).bundle.includes('desertLawn: {'), c);
  assert.ok(coreBytes('desert') < 290000);
});

test('cards (#29 rules from the start): one everyday sentence first, the expert part closed at the bottom, no file paths or "the brief" in the visible part, links only to the references page', () => {
  const { st } = base11();
  const c = causes11();
  const html = {
    design: designCard({ st, site: SCENE.site, ghi: 1000 }),
    sails: sailsCard({ st, palo: c.palo }),
    arcade: arcadeCard({ st }),
    lawn: lawnCard({ st, water: { lawnApplied: 6.4, trees: [1.4, 4.3], misters: [1.5, 3.4] } }),
    mist: mistCard({ st, water: { misters: [1.5, 3.4] } }),
    coat: coatCard({ st, on: true }),
    dry: dryCard({ st, site: SCENE.site }),
    deaths: deathsCard(),
  };
  assert.deepEqual(Object.keys(html), DS_CARDS.map(([id]) => id));
  for (const [id, h] of Object.entries(html)) {
    const body = h.replace(/<button[^>]*>.*?<\/button>/, '').trim();
    assert.ok(/^<h3>[^<]+<\/h3>\s*<p class="lead">/.test(body), `${id}: a heading, then one everyday sentence`);
    const lead = /<p class="lead">([\s\S]*?)<\/p>/.exec(h)[1];
    assert.ok(!/[αεμτΔ]|W m⁻²|J m⁻²|\bK\b|Tmrt|unverified|\[\w+\]/.test(lead), `${id}: plain lead: ${lead}`);
    const i = h.indexOf('<details class="expert">');
    assert.ok(i > 0 && !/<details class="expert" open/.test(h), `${id}: a closed expert part`);
    assert.ok(h.trim().endsWith('</details>'), `${id}: the expert part is last`);
    const visible = h.slice(0, i);
    assert.ok(!/docs\/|\.md\b|the brief|from memory|unverified|\[\w+\]/.test(visible), `${id}: ${visible.match(/docs\/|\.md\b|the brief|from memory|unverified|\[\w+\]/)}`);
    assert.ok(/Made-up block, calculated temperatures/.test(h.slice(i)), id);
    for (const m of h.matchAll(/href="([^"]*)"/g)) assert.equal(m[1], '../../references.html#desert', id);
  }
  // misses stated with their number
  assert.ok(html.sails.includes('outside the measured range') && html.sails.includes(`${Math.abs(st.shade.sail[15].d).toFixed(1)} degrees cooler`));
  assert.ok(html.coat.includes('outside the measured range') && html.coat.includes(`${st.coat[15].dTmrt.toFixed(1)} degrees warmer`));
  assert.ok(html.lawn.includes(`${st.gravel.ts15.toFixed(1)} °C (measured 55–63 °C`));
  assert.ok((html.arcade.match(/outside the measured range/g) ?? []).length === 4);
  // health wording: hedged counts, no instructions beyond the county's
  assert.ok(/county/.test(html.deaths) && !/you should|must/i.test(html.deaths));
  // notes in plain words (#29): no K, Tmrt or albedo numbers on the map
  const notes = dsNotes(SCENE, { sail: -22.9, arcade: -27, lawn15: 40.9, air15: 42.4, evap: 6.5, coatTs: -8.8, coatTmrt: 3.4, gravel15: 65.9 });
  assert.equal(notes.length, 5);
  for (const n of notes) assert.ok(!/\bK\b|Tmrt|albedo|α/.test(n.text.join(' ')), n.key);
});

test('the block-11 modules hold no clock or random source', () => {
  for (const f of ['engine/desert.js', 'engine/dskit.js', 'engine/dsui.js', 'cities/desert/scene.js']) {
    const src = read(f);
    assert.ok(!/Math\.random|Date\.now|new Date\(/.test(src), f);
    assert.ok(!/performance\.now/.test(src) || f === 'engine/desert.js', f);
  }
});
