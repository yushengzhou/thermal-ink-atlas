// Block 12 (night market street): the opening hour (and that it leaves every
// other block as it was), the scene, the parameters (source, basis,
// verified, note), the places, the crowd's hours, the grill's radiant term,
// the heat-given-off bookkeeping against the model's own G, the acceptance
// bands with every row pinned, the misses' causes (docs only) and the
// numbers the cards quote from them, walkers and the crowd, glossary, the
// build cut, the cards' plain-words layout (outside evaluation #29) and
// determinism.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENE } from '../../cities/nightmarket/scene.js';
import { STORE } from '../../engine/thermal.js';
import { MATERIALS, SOURCES, BASIS } from '../../engine/materials.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { NM, isMarket, crowdShape, density, personW, grillFlux, grillRaw, grillTaper, withFlux, grillAt, heatParts, release, isOpen, lightsOn, stallPower, tmrtAt } from '../../engine/market.js';
import { NM_CARDS, NM_BANDS, nmNotes, stoneCard, crowdCard, stallsCard, lightsCard, nightCard, grillCard, hoursCard } from '../../engine/nmui.js';
import { base12, bands12, bandVerdicts12, causes12, sensitivity12, walkers12, crowd12, overlays12, NM_NOTES } from '../../scripts/nightmarket.mjs';
import { bands12Markdown } from '../../scripts/nightmarket-docs.mjs';
import { pageParts, pageMaterialGroups, coreBytes } from '../../scripts/build.mjs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''}: ${a} vs ${b} (± ${tol})`);
const OTHERS = ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate', 'campus', 'busstop', 'village', 'desert'];

test('the opening hour: app.js opens at scene.startHour, else 15:00; only this scene sets it', () => {
  assert.ok(/hour: scene\.startHour \?\? 15,/.test(read('engine/app.js')));
  assert.equal(SCENE.startHour, 21);
  for (const c of OTHERS) assert.ok(!/startHour|marketBlock/.test(read(`cities/${c}/scene.js`)), c);
});

test('site and parameters: the scene\'s site is the NM values; every NM value and the awning have a source, a basis tag, a verified flag and a note; the brief\'s central values', () => {
  const s = SCENE.site;
  assert.equal(s.lat, NM.lat.value);
  assert.equal(s.taMin, NM.taMin.value);
  assert.equal(s.taMax, NM.taMax.value);
  assert.equal(s.vapourHpa, NM.vapour.value);
  assert.equal(s.wind, NM.wind.value);
  assert.equal(s.tz, 8);
  assert.ok(isMarket(SCENE) && s.tmaxHour === undefined);
  for (const [k, p] of Object.entries(NM)) {
    assert.ok(p.source in SOURCES, `${k}: source ${p.source}`);
    assert.ok(p.basis in BASIS, `${k}: basis ${p.basis}`);
    assert.equal(typeof p.verified, 'boolean', k);
    assert.equal(p.verified, false, `${k}: nothing here was checked against a primary source`);
    assert.ok(NM_NOTES[k] && NM_NOTES[k].length > 20, `${k}: note`);
  }
  assert.deepEqual(Object.keys(NM_NOTES).sort(), Object.keys(NM).sort());
  const m = MATERIALS.marketAwning;
  for (const k of ['alpha', 'eps', 'ef', 'tr']) {
    assert.ok(m[k].source in SOURCES && m[k].basis in BASIS && m[k].note.length > 2, k);
  }
  // the brief's central values (and the middles of its ranges)
  assert.equal(NM.vapour.value, 30);
  assert.equal(NM.wind.value, 1);
  assert.equal(NM.peak.value, 1);
  assert.equal(NM.walk.value, 210);
  assert.equal(NM.stand.value, 125);
  assert.equal(NM.sensible.value, 0.4);
  assert.equal(NM.lpg.value, 8);
  assert.equal(NM.duty.value, 0.5);
  assert.equal(NM.wok.value, (28 + 37) / 2);
  assert.equal(NM.charcoal.value, (8 + 16) / 2);
  assert.equal(NM.coalArea.value, 0.2);
  assert.equal(NM.coalTemp.value, 600);
  assert.equal(NM.lights.value, (0.2 + 1) / 2);
  assert.equal(NM.cap.value, 1.5);
  // the paving is the shared stone
  for (const g of SCENE.ground.filter((x) => ['lantern', 'square', 'alleyN', 'alleyS'].includes(x.id))) assert.equal(g.mat, 'stone', g.id);
});

test('scene: at most five notes, equal-length route variants, buildings and awnings on the 5 m grid, nothing overlapping, stalls on the paving and clear of buildings', () => {
  assert.ok(SCENE.notes.length <= 5);
  for (const r of SCENE.routes) {
    const len = (v) => Math.hypot(v[2] - v[0], v[3] - v[1]);
    near(len(r.variants[0]), len(r.variants[1]), 1e-9, r.id);
  }
  const B = SCENE.buildings;
  for (let a = 0; a < B.length; a++) {
    for (const k of ['x0', 'y0', 'x1', 'y1']) assert.equal(B[a][k] % 5, 0, `${B[a].id}.${k}`);
    for (let b = a + 1; b < B.length; b++) {
      const o = B[a].x0 < B[b].x1 && B[b].x0 < B[a].x1 && B[a].y0 < B[b].y1 && B[b].y0 < B[a].y1;
      assert.ok(!o, `${B[a].id} overlaps ${B[b].id}`);
    }
  }
  for (const P of SCENE.screens) {
    assert.ok(!B.some((q) => P.x0 < q.x1 && q.x0 < P.x1 && P.y0 < q.y1 && q.y0 < P.y1), P.id);
    for (const k of ['x0', 'y0', 'x1', 'y1']) assert.equal(P[k] % 5, 0, `${P.id}.${k}`);
  }
  const { world } = base12();
  for (const s of SCENE.stalls) {
    assert.ok(!B.some((q) => s.x + 1.2 > q.x0 && s.x - 1.2 < q.x1 && s.y + 0.9 > q.y0 && s.y - 0.9 < q.y1), s.id);
    const g = SCENE.ground[world.parcel[world.cellIndex(s.x, s.y)]];
    assert.ok(g.mat === 'stone', `${s.id} on ${g.id}`);
  }
  assert.equal(SCENE.benches.filter((b) => b.stall !== undefined).length, SCENE.stalls.length);
  for (const p of Object.values(SCENE.probes)) assert.ok(world.bld[world.cellIndex(p[0], p[1])] < 0);
  // no real names: the street names are generic
  assert.ok(!/Shilin|Raohe|Ningxia|Wangfujing|Chunxi|Nanjing/.test(read('cities/nightmarket/scene.js')));
});

test('places: the awnings cover their cells, the open square sees the sky, the narrow alleys little; classes disjoint', () => {
  const { world } = base12();
  const F = world.nm.F;
  for (const i of F.awning) assert.equal(world.canopy[i], 1);
  for (const i of F.ref) assert.ok(world.svf[i] >= 0.85 && world.canopy[i] === 0);
  for (const i of F.alley) assert.ok(world.svf[i] < 0.3, `alley ${world.svf[i]}`);
  const seen = new Set();
  for (const k of ['awning', 'stallRow', 'aisle', 'south', 'alley', 'square']) for (const i of F[k]) {
    assert.ok(!seen.has(i), `${k}: cell ${i} twice`);
    seen.add(i);
  }
  assert.ok(F.ref.length > 50 && F.awning.length > 50 && F.alley.length >= 20);
  assert.equal(world.nm.grills.length, SCENE.stalls.filter((s) => s.type === 'grill').length);
});

test('the crowd\'s hours: none before 16:00 or from midnight, the peak 20:00-23:00, smooth, capped', () => {
  for (let m = 0; m < 1440; m++) {
    const h = m / 60;
    const s = crowdShape(h);
    assert.ok(s >= 0 && s <= 1);
    if (h < 16) assert.equal(s, 0, `${h}`);
    if (h >= 20 && h <= 23) assert.equal(s, 1, `${h}`);
    if (m) assert.ok(Math.abs(s - crowdShape((m - 1) / 60)) < 0.03, `jump at ${h}`);
    assert.equal(isOpen(h), h >= 16);
  }
  assert.equal(crowdShape(24), 0);
  assert.equal(crowdShape(23.999), crowdShape(23.999));
  assert.ok(crowdShape(23.99) < 0.001);
  assert.equal(density(1, 21), NM.peak.value);
  assert.equal(density(5, 21), NM.cap.value);
  assert.equal(personW(), 167.5);
});

test('the grill term: the brief\'s +490 W per m² at 1 m, 1/d², in full to 3 m, a smooth taper to zero at 4 m, nothing when closed, d >= 0.5 m; a point\'s Tmrt', () => {
  const { world, T } = base12();
  near(grillFlux(1, 30), 490, 6, '1 m');
  near(grillFlux(1, 31) / grillFlux(2, 31), 4, 1e-12, '1/d²');
  assert.equal(grillFlux(3, 31), grillRaw(3, 31), 'in full at 3 m');
  assert.equal(grillFlux(4, 31), 0, 'zero at 4 m');
  assert.equal(grillFlux(4.5, 31), 0, 'zero beyond 4 m');
  near(grillFlux(3.5, 31), grillRaw(3.5, 31) / 2, 1e-9, 'half at 3.5 m');
  // no step: the term is continuous and never rises with distance from 2.9 to 4.1 m
  let prev = grillFlux(2.9, 31);
  for (let d = 2.9; d <= 4.1; d += 0.001) {
    const f = grillFlux(d, 31);
    assert.ok(f <= prev + 1e-9 && prev - f < 0.2, `continuous and falling at ${d.toFixed(3)} m`);
    prev = f;
  }
  assert.equal(grillTaper(3), 1);
  assert.equal(grillTaper(4), 0);
  assert.equal(grillFlux(0.2, 31), grillFlux(0.5, 31));
  assert.equal(withFlux(30, 0), 30);
  near(withFlux(28, 491), 87.4, 0.3, 'the brief\'s about 88 °C at 1 m');
  const g = world.nm.grills[3];
  assert.equal(grillAt(world, T, g.x, g.y + 1, 15), 0, 'closed at 15:00');
  assert.equal(grillAt(world, T, g.x, g.y + 1, 1), 0, 'closed at 01:00');
  assert.equal(grillAt(world, T, g.x, g.y + 1, 21, false), 0, 'the market closed');
  assert.ok(grillAt(world, T, g.x, g.y + 1, 21) > 400);
  const p = tmrtAt(world, T, g.x, g.y + 1, 21);
  assert.equal(p.base, T.tmrt(world.cellIndex(g.x, g.y + 1), 21));
  near(p.tmrt, withFlux(p.base, p.dS), 1e-9);
  const far = tmrtAt(world, T, g.x, g.y + 3.2, 21);
  assert.ok(far.dT === 0 || far.dS === grillAt(world, T, g.x, g.y + 3.2, 21));
  // a point 4 m or more from every grill gets nothing
  const lone = world.nm.grills.map((q) => [q.x, q.y + 4.2]).find(([x, y]) => world.nm.grills.every((q) => Math.hypot(q.x - x, q.y - y) >= 4));
  if (lone) assert.equal(grillAt(world, T, lone[0], lone[1], 21), 0);
});

test('heat given off: the parts add up, the crowd is rho M, a grill cell 480 W per m² while open, the lights only on the street and square after sunset; the stone\'s release is the model\'s own -G at night', () => {
  const { world, T } = base12();
  const F = world.nm.F;
  const gi = world.cellIndex(world.nm.grills[0].x, world.nm.grills[0].y);
  const p = heatParts(world, T, gi, 21);
  assert.equal(p.total, p.stoneRad + p.stoneAir + p.crowd + p.stall + p.light);
  assert.equal(p.crowd, p.rho * personW());
  near(p.stall, (NM.charcoal.value * 1000) / 25, 1e-9);
  assert.equal(heatParts(world, T, gi, 15).stall, 0);
  assert.equal(heatParts(world, T, gi, 21, false).stall, 0);
  assert.ok(lightsOn(SCENE.site, 21) && !lightsOn(SCENE.site, 17) && !lightsOn(SCENE.site, 2));
  assert.equal(heatParts(world, T, F.alley[0], 21).light, 0);
  assert.equal(heatParts(world, T, F.ref[0], 21).light, NM.lights.value);
  assert.equal(stallPower('drinks'), 0);
  // -G (block 6's flux, kept by the run) against Q on every open-square cell at 21:00
  const k = Math.round((21 * STORE) / 24);
  for (const i of F.ref) assert.ok(Math.abs(-T.info.flux[i * STORE + k] - release(T, i, 21).net) < 1, `${i}`);
  // overlays and toggles leave the model bit-identical
  assert.equal(overlays12().changed, 0);
});

/** Every band row, pinned (value, tolerance): a change to the model or the scene moves one and must be disclosed. */
const PINS = [
  [/^1\. Stone − air at 21:00, the open square/, 3.344, 0.03],
  [/^1\. Supplementary: the same, the street's open aisle/, 4.277, 0.03],
  [/^1\. Supplementary: the same, under the awnings/, 1.06, 0.03],
  [/^1\. Supplementary: the same, the narrow alleys/, 2.35, 0.03],
  [/^1\. Supplementary: the same, the stall row/, 3.992, 0.03],
  [/^1\. Supplementary: the same, the street's south side/, 4.975, 0.03],
  [/^1\. Supplementary: the same at 23:00/, 4.179, 0.03],
  [/^2\. Net release at 21:00, the open square/, 94.679, 0.5],
  [/^2\. Net release at 21:00, the street's open aisle/, 102.098, 0.5],
  [/^2\. Net release at 21:00, the narrow alleys/, 38.167, 0.5],
  [/^2\. Lower at a low sky view/, -56.512, 0.5],
  [/^2\. Supplementary: net release at 21:00, under the awnings/, 13.223, 0.3],
  [/^2\. Supplementary: net release at 23:00/, 99.242, 0.5],
  [/^2\. Supplementary: the model's own budget/, 0.252, 0.1],
  [/^3\. Gross emission at 21:00, the open square/, 468.632, 0.3],
  [/^3\. Gross emission at 21:00, the street's open aisle/, 474.344, 0.3],
  [/^3\. Supplementary: the stone's coolest/, 34.265, 0.05],
  [/^3\. Supplementary: the stone's warmest/, 35.99, 0.05],
  [/^4\. Tmrt − air at 21:00, the open square/, -2.395, 0.03],
  [/^4\. Tmrt − air at 21:00, the street's open aisle/, -1.273, 0.03],
  [/^4\. Tmrt − air at 21:00, under the awnings/, 0.774, 0.03],
  [/^4\. Tmrt − air at 21:00, the narrow alleys/, 0.921, 0.03],
  [/^4\. Higher at a low sky view/, 3.316, 0.03],
  [/^4\. Supplementary: under the awnings/, 3.168, 0.03],
  [/^5\. Grill term at 3 m/, 8.281, 0.03],
  [/^5\. ∝ 1\/d²/, 4, 1e-9],
  [/^5\. Zero when closed/, 0, 0],
  [/^5\. Zero from 4 m on/, 0, 0],
  [/^5\. Supplementary: the tapered term at 3\.5 m/, 3.12, 0.05],
  [/^5\. Supplementary: Tmrt 1 m/, 88.534, 0.1],
  [/^5\. Supplementary: Tmrt 2 m/, 47.862, 0.05],
  [/^5\. Supplementary: distance/, 3.892, 0.01],
  [/^6\./, 0, 1e-9],
  [/^7\. Density/, 1, 0],
  [/^7\. Zero before/, 0, 0],
  [/^8\./, 0, 0],
  [/^9\./, 0, 1e-6],
  [/^Walkers/, 3.453, 0.3],
  [/^People dwelling/, 1, 1e-9],
  [/^Supplementary \(by construction\): the crowd's nearest/, 2.12, 0.02],
];

test('acceptance bands: every row pinned; band 5 missed (4 of 5 independent bands met), bands 6-9 met; the one supplementary row outside; docs table in sync with the rows', () => {
  const rows = bands12();
  assert.equal(rows.length, PINS.length);
  for (const r of rows) {
    const p = PINS.filter(([re]) => re.test(r.label));
    assert.equal(p.length, 1, `one pin for ${r.label}`);
    near(r.value, p[0][1], p[0][2], r.label);
  }
  const v = bandVerdicts12(rows);
  assert.deepEqual(Object.keys(v).sort(), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  assert.deepEqual(Object.keys(v).filter((k) => !v[k]), ['5']);
  const out = rows.filter((r) => r.supp && !r.inside && !(r.lo === null && r.hi === null)).map((r) => r.label);
  assert.deepEqual(out, ['2. Supplementary: net release at 21:00, under the awnings, W m⁻²']);
  assert.ok(!rows.some((r) => r.label.includes('|')), 'no pipe in a label (the docs table)');
  const md = read('docs/sources.md');
  assert.ok(md.includes(bands12Markdown(rows)), 'run `node scripts/sources.mjs` and commit docs/sources.md');
  assert.ok(md.includes('4 of 5 independent bands met (1, 2, 3, 4); missed: 5; bands 6–9 check the overlays\' bookkeeping by construction (4 of 4 met).'));
});

test('the misses\' causes (docs only) and the numbers the cards quote from them', () => {
  const c = causes12();
  const { st } = base12();
  // band 5: the brief's own formula gives its +490 at 1 m and more than 5 K at 3 m
  near(c.grill.at1, 490, 6);
  assert.ok(c.grill.dT3 > 5 && c.grill.under5 > 3.5 && c.grill.under5 < 4.2);
  // the awnings: the brief's formula at their sky view reproduces the model's value
  near(c.awning.brief, c.awning.shipped, 0.5);
  near(c.awning.brief04, 42, 3, 'the brief\'s 42 at SVF 0.4');
  assert.ok(c.awning.cool.net < c.awning.shipped);
  // the cards quote them
  const g = grillCard({ st });
  assert.ok(g.includes(`${(Math.round(c.grill.dT3 * 10) / 10).toFixed(1)} degrees, more than the less than 5 expected`) && g.includes(`${(Math.round(c.grill.under5 * 10) / 10).toFixed(1)} m away`));
  assert.ok(stoneCard({ st }).includes(`${Math.round(st.place.awning[21].net)} <b>(outside the expected range)</b>`));
});

test('sensitivity runs restore every shipped value', () => {
  const keep = { alpha: MATERIALS.stone.alpha.value, mu: MATERIALS.stone.mu.value, peak: NM.peak.value, lpg: NM.lpg.value, coalArea: NM.coalArea.value };
  const s = sensitivity12();
  assert.equal(s.model.length, 8);
  assert.equal(s.overlay.length, 8);
  assert.equal(s.grill.length, 4);
  assert.deepEqual({ alpha: MATERIALS.stone.alpha.value, mu: MATERIALS.stone.mu.value, peak: NM.peak.value, lpg: NM.lpg.value, coalArea: NM.coalArea.value }, keep);
  // the stall rows move with the powers; the crowd's with the density
  const o = Object.fromEntries(s.overlay.map((r) => [r.label, r]));
  assert.ok(o['gas stalls 15 kW'].stall > o.shipped.stall && o['gas stalls 5 kW'].stall < o.shipped.stall);
  near(o['peak density 0.3'].crowd, 0.3 * o.shipped.crowd, 1e-6);
});

test('walkers seek shade at 15:00; the crowd keeps 1.5 m from the coals; the grill cooks carry a sweat-hot Tmrt', () => {
  const w = walkers12(15);
  assert.ok(w.ratio >= 2, `${w.ratio}`);
  const c = crowd12();
  assert.ok(c.near >= NM.keepAway.value, `${c.near}`);
  assert.ok(c.cooksAtGrills > 0 && c.cooksHot === c.cooksAtGrills);
  near(c.cook, NM.vendorAt.value, 0.02);
  assert.equal(c.most, NM.figures.value);
});

test('glossary: net longwave, metabolic rate, anthropogenic heat, sensible and latent heat on the night market page only', () => {
  const keys = termsFor('nightmarket');
  const own = ['netLongwave', 'metabolicRate', 'anthropogenicHeat', 'sensibleLatent'];
  for (const k of own) {
    assert.ok(keys.includes(k), k);
    assert.deepEqual(GLOSSARY[k].scenes, ['nightmarket']);
    if (GLOSSARY[k].src) for (const s of GLOSSARY[k].src.split(', ')) assert.ok(s in SOURCES, `${k}: ${s}`);
  }
  for (const c of OTHERS) for (const k of own) assert.ok(!termsFor(c).includes(k), `${c}: ${k}`);
});

test('build: the awning is one @page nightmarket group on this page only; its modules are its own bytes; the shared core stays under budget', () => {
  const groups = pageMaterialGroups(read('engine/materials.js')).filter((g) => g.city === 'nightmarket');
  assert.equal(groups.length, 1);
  const p = pageParts('nightmarket');
  assert.ok(p.matBytes > 300 && p.ownBytes > 40000);
  for (const c of ['desert', 'asphalt-park']) assert.ok(!pageParts(c).bundle.includes('marketAwning: {'), c);
  assert.ok(coreBytes('nightmarket') < 290000);
  const html = read('cities/nightmarket/index.html');
  assert.ok(html.includes('<kbd>Q</kbd> heat given off · <kbd>M</kbd> market open · '));
});

test('cards (#29 rules from the start): one everyday sentence first, the expert part closed at the bottom, no file paths or "the brief" in the visible part, links only to the references page; notes in plain words', () => {
  const { st } = base12();
  const html = {
    stone: stoneCard({ st }),
    crowd: crowdCard({ st, perFigure: 39 }),
    stalls: stallsCard({ st }),
    lights: lightsCard({ st, sunset: 18.77 }),
    night: nightCard({ st }),
    grill: grillCard({ st }),
    hours: hoursCard(),
  };
  assert.deepEqual(Object.keys(html), NM_CARDS.map(([id]) => id));
  for (const [id, h] of Object.entries(html)) {
    const body = h.replace(/<button[^>]*>.*?<\/button>/, '').trim();
    assert.ok(/^<h3>[^<]+<\/h3>\s*<p class="lead">/.test(body), `${id}: a heading, then one everyday sentence`);
    const lead = /<p class="lead">([\s\S]*?)<\/p>/.exec(h)[1];
    assert.ok(!/[αεμτσΔ]|W m⁻²|J m⁻²|\bK\b|Tmrt|unverified|\[\w+\]|kW\b/.test(lead), `${id}: plain lead: ${lead}`);
    const i = h.indexOf('<details class="expert">');
    assert.ok(i > 0 && !/<details class="expert" open/.test(h), `${id}: a closed expert part`);
    assert.ok(h.trim().endsWith('</details>'), `${id}: the expert part is last`);
    const visible = h.slice(0, i);
    assert.ok(!/docs\/|\.md\b|the brief|from memory|unverified|\[\w+\]|W m⁻²/.test(visible), `${id}: ${visible.match(/docs\/|\.md\b|the brief|from memory|unverified|\[\w+\]|W m⁻²/)}`);
    assert.ok(/Made-up block, calculated temperatures/.test(h.slice(i)), id);
    for (const m of h.matchAll(/href="([^"]*)"/g)) assert.equal(m[1], '../../references.html#nightmarket', id);
  }
  // shown vs calculated said where the crowd, stalls and lights are quoted
  for (const id of ['crowd', 'stalls', 'lights']) assert.ok(/not felt/.test(html[id].slice(0, html[id].indexOf('<details'))), id);
  // the miss stated with its number
  assert.ok(html.grill.includes('(outside the expected range)') && html.grill.includes(`${st.grill.find((r) => r.d === 3).dT.toFixed(1)} degrees`));
  // health wording: hedged, no instructions
  assert.ok(/news report/.test(html.stalls) && /neither air quality nor anything about food safety/.test(html.stalls) && !/you should|must\b/i.test(Object.values(html).join(' ')));
  const notes = nmNotes(SCENE, { stoneDTs: 4.3, stoneNet: 102, squareDT: -2.4, awningDT: 0.8, grill1: 88.5, grill3: 8.3, crowd: 167.5 });
  assert.equal(notes.length, 5);
  for (const n of notes) assert.ok(!/\bK\b|Tmrt|albedo|α|W m⁻²/.test(n.text.join(' ')), n.key);
  assert.equal(NM_BANDS.grill3, 5);
});

test('the block-12 modules hold no clock or random source', () => {
  for (const f of ['engine/market.js', 'engine/nmkit.js', 'engine/nmui.js', 'cities/nightmarket/scene.js']) {
    const src = read(f);
    assert.ok(!/Math\.random|Date\.now|new Date\(/.test(src), f);
    assert.ok(!/performance\.now/.test(src) || f === 'engine/market.js', f);
  }
});
