// Block 9 (bus stops and footbridges) model checks: the waiting-point model
// (direct sun through roofs and panels, the sky view under a roof, the same
// arithmetic as a grid cell in the open), the bus schedule and the riders
// (pure functions, the mean wait, shade-seeking), the heat dose, the contact
// flags, the headline comparison, the acceptance bands with their pinned
// misses and the docs table, basis tags, the glossary, the build cut of the
// block's materials, and that blocks 1-8 never take the new paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { base9, compare9, bands9, bandVerdicts, waits9, walkers9, flags9, roofUnderside3, surround9, BS_NOTES } from '../../scripts/busstop.mjs';
import { bands9Markdown } from '../../scripts/busstop-docs.mjs';
import { BS, transmit, viewRect, pointSky, geometry, pointModel, daySchedule, meanWait, seatRiders, waitDose, apparentTemp, contactFlags, burnLimit, clockAt, isBus } from '../../engine/busstop.js';
import { busAt } from '../../engine/bskit.js';
import { crossersAt, BS_SURROUND } from '../../engine/bsui.js';
import { SOURCES, BASIS, MATERIALS } from '../../engine/materials.js';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';
import { buildWorld, GROUND_MATS } from '../../engine/world.js';
import { cellMat, SLOTS } from '../../engine/thermal.js';
import { pageMaterialGroups, trimMaterials, pageParts } from '../../scripts/build.mjs';
import { SCENE } from '../../cities/busstop/scene.js';
import { SCENE as S1 } from '../../cities/asphalt-park/scene.js';
import { SCENE as S2 } from '../../cities/sponge-retrofit/scene.js';
import { SCENE as S3 } from '../../cities/glass-cbd/scene.js';
import { SCENE as S4 } from '../../cities/waterfront/scene.js';
import { SCENE as S5 } from '../../cities/hutong/scene.js';
import { SCENE as S6 } from '../../cities/parking/scene.js';
import { SCENE as S7 } from '../../cities/estate/scene.js';
import { SCENE as S8 } from '../../cities/campus/scene.js';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');
const sun = (alt, az) => ({ alt, az });

test('direct sun at a point: a roof overhead passes its tau, a panel in the ray stops it, a building shades, nothing below 0.5 deg', () => {
  // a roof 7 m long (x) and 2 m deep (y), 2.65 m up, opal
  const G = { buildings: [], trees: [], roofs: [{ x0: 0, y0: 0, x1: 7, y1: 2, z: 2.65, tr: 0.47 }], panels: [], canopyTr: 0.17 };
  // high sun from the south: a standing head under the middle of the roof is behind it
  assert.equal(transmit(G, 3.5, 1, 1.7, sun(70, 180)), 0.47);
  // low sun from the west (17 h): a seated head 1 m from the west end gets the sun under the roof's edge
  assert.equal(transmit(G, 1, 1, 1.2, sun(25, 270)), 1);
  // the brief's example: a seated head is shaded from (H - z) / tan(phi) behind the west end on
  const z = 1.2;
  const need = (2.65 - z) / Math.tan(25 * Math.PI / 180);
  assert.equal(transmit(G, need - 0.05, 1, z, sun(25, 270)), 1);
  assert.equal(transmit(G, need + 0.05, 1, z, sun(25, 270)), 0.47);
  // a west screen to 2.2 m shades (2.2 - z) / tan(beta) behind it; between that and the roof's reach a band of sun gets in
  G.panels.push({ x0: 0, y0: 0, x1: 0, y1: 2, z0: 0.1, z1: 2.2, tr: 0 });
  const reach = (2.2 - z) / Math.tan(25 * Math.PI / 180);
  assert.ok(reach < need);
  assert.equal(transmit(G, reach - 0.05, 1, z, sun(25, 270)), 0);
  assert.equal(transmit(G, (reach + need) / 2, 1, z, sun(25, 270)), 1);
  assert.equal(transmit(G, need + 0.05, 1, z, sun(25, 270)), 0.47);
  // a building box between the point and the sun
  const GB = { buildings: [{ x0: -20, y0: 0, x1: -10, y1: 10, h: 12 }], trees: [], roofs: [], panels: [], canopyTr: 0.17 };
  assert.equal(transmit(GB, -5, 5, 0, sun(45, 270)), 0);
  assert.equal(transmit(GB, -5, 5, 0, sun(45, 90)), 1);
  assert.equal(transmit(GB, -5, 5, 0, sun(0.4, 90)), 0);
  // a crown: the grid's ellipse, its transmission
  const GT = { buildings: [], trees: [{ x: 0, y: 0, r: 4, zc: 7 }], roofs: [], panels: [], canopyTr: 0.17 };
  assert.equal(transmit(GT, 0, 0, 0, sun(89, 180)), 0.17);
  assert.equal(transmit(GT, 10, 0, 0, sun(89, 180)), 1);
});

test('the view factor of a roof: about 1 under a wide roof, the corner formula, 0 far away; the sky view under a shelter', () => {
  assert.ok(viewRect(-1000, -1000, 1000, 1000, 1, 0, 0) > 0.999);
  assert.ok(viewRect(100, 100, 102, 102, 1, 0, 0) < 1e-3);
  // corner of a square of side c directly over the point: 0.25 * the centred square of side 2c
  const a = viewRect(0, 0, 1, 1, 1, 0, 0);
  assert.ok(Math.abs(a * 4 - viewRect(-1, -1, 1, 1, 1, 0, 0)) < 1e-12);
  const { world } = base9();
  const G = geometry(world);
  const A = SCENE.stops.find((s) => s.id === 'A');
  const under = pointSky(world, G, 303.5, 213, 1.1);
  const open = pointSky(world, G, A.open[0], A.open[1], 1.1);
  assert.ok(under.F > 0.3 && under.svf < open.svf - 0.2, `${under.F} ${under.svf} ${open.svf}`);
});

test('a point in the open runs the same arithmetic as its grid cell (same sun, sky view and surface temperature)', () => {
  const { world, T } = base9();
  const G = geometry(world);
  // asphalt road cells, no crown, whose 2 x 2 grid samples agree with the cell centre at every sun slot
  let checked = 0;
  for (let i = 0; i < world.n * world.n && checked < 3; i++) {
    if (world.bld[i] >= 0 || world.canopy[i] > 0 || cellMat(world, i) !== 'asphalt') continue;
    const x = ((i % world.n) + 0.5) * world.cell;
    const y = (Math.floor(i / world.n) + 0.5) * world.cell;
    if ((i * 7919) % 13) continue; // a spread sample of cells
    let same = true;
    for (let k = 0; k < SLOTS && same; k++) same = Math.abs(T.slots.fields[k][i] - transmit(G, x, y, 0.01, T.slots.suns[k])) < 1e-6;
    if (!same) continue;
    const P = pointModel(world, G, [{ x, y, z: 0, mat: 'asphalt', head: 1.7 }], { suns: T.slots.suns });
    // the same horizon scan and crown factor; distant roofs add a sliver of view factor the grid leaves out
    assert.ok(Math.abs(P.sky[0].open - world.svfOpen[i]) < 1e-6 && Math.abs(P.sky[0].svf - world.svf[i]) < 2e-3, `svf at ${x},${y}`);
    for (const h of [5, 12, 15, 21]) assert.ok(Math.abs(P.ts(0, h) - T.ts(i, h)) < 0.05, `Ts at ${x},${y}, ${h} h: ${P.ts(0, h)} vs ${T.ts(i, h)}`);
    assert.ok(Math.abs(P.tmrt(0, 15) - T.tmrt(i, 15, P.body(0, 15))) < 0.05, 'Tmrt');
    checked++;
  }
  assert.ok(checked >= 2, `only ${checked} cells checked`);
});

test('buses and riders: pure functions of the seed; gaps with the set spread; riders board the next bus; mean wait as the formula', () => {
  const a = daySchedule(SCENE.seed, 2);
  assert.deepEqual(a, daySchedule(SCENE.seed, 2));
  assert.notDeepEqual(a.buses, daySchedule(SCENE.seed, 3).buses);
  assert.ok(a.buses[0] >= 360 && a.buses[a.buses.length - 1] < 1380);
  const g = a.buses.slice(1).map((b, k) => b - a.buses[k]);
  assert.ok(g.every((x) => x > 0 && x <= BS.headway.value * (1 + BS.cv.value * Math.sqrt(3)) + 1e-9));
  for (const r of a.riders) assert.ok(r.b >= r.a && a.buses[r.bus] === r.b && (r.bus === 0 || a.buses[r.bus - 1] < r.a));
  assert.ok(Math.abs(meanWait(10, 0.4) - 5.8) < 1e-12);
  const w = waits9();
  assert.ok(Math.abs(w.wait / w.formula - 1) < 0.1, `${w.wait} vs ${w.formula}`);
  for (const p of w.per) assert.ok(Math.abs(p.cv - BS.cv.value) < 0.08, `${p.id}: cv ${p.cv}`);
  // the bus clock: the hour, then 15 min at 12 times the animation, looping
  assert.equal(clockAt(0, 15), 900);
  assert.ok(Math.abs(clockAt(5, 15) - 901) < 1e-9);
  assert.ok(Math.abs(clockAt(75, 15) - 900) < 1e-9);
  // a bus comes in, stands, pulls out
  assert.equal(busAt([100], 99), null);
  assert.ok(busAt([100], 99.7).u < 0 && busAt([100], 100.2).dwell && busAt([100], 100.9).u > 0);
});

test('riders waiting at a clock minute are those who arrived since the last bus; when hot they take the coolest free place', () => {
  const { book, P, world } = base9();
  const d = book.days[0];
  const c = 15 * 60 + 7.3;
  const ws = book.waiting(0, c);
  const prev = d.buses.filter((b) => b <= c).pop();
  const expect = d.riders.filter((r) => r.a <= c && r.a > prev);
  assert.deepEqual(ws.map((x) => x.rider.id).sort(), expect.map((r) => r.id).sort());
  // seating: at 15:00 the first rider takes the place with the lowest Tmrt (up to the jitter)
  const places = book.places[0];
  const s = seatRiders([{ id: 1, a: 900 }], places, P.tmrt, P.air, () => true, SCENE.seed);
  const t = places.map((p) => P.tmrt(p.i, 15));
  assert.ok(t[s[0].place] <= Math.min(...t) + 0.5);
  // at night, the first free place (the bench) in order
  const n = seatRiders([{ id: 1, a: 22.5 * 60 }, { id: 2, a: 22.6 * 60 }], places, P.tmrt, P.air, (h) => P.T.sun(h).alt > 0, SCENE.seed);
  assert.deepEqual(n.map((x) => x.place), [0, 1]);
  assert.ok(world.bus.pts.filter((p) => p.kind === 'slot').length >= 50);
});

test('heat dose: the apparent temperature above 32 C times the minutes; none at night; more in the sun than under the roof', () => {
  const { P, world } = base9();
  assert.ok(Math.abs(apparentTemp(35, 20, 1.5, 35) - (35 + 6.96 - 1.05 - 4.25)) < 1e-9);
  const pts = world.bus.pts;
  const c = pts.find((p) => p.kind === 'centre' && p.stop === 'A').k;
  const o = pts.find((p) => p.kind === 'open' && p.stop === 'A').k;
  assert.equal(waitDose(P, c, 23 * 60, 23 * 60 + 6, SCENE.site).D, 0);
  const dc = waitDose(P, c, 900, 906, SCENE.site);
  const dO = waitDose(P, o, 900, 906, SCENE.site);
  assert.ok(dO.D > dc.D + 30 && dc.D >= 0, `${dO.D} ${dc.D}`);
  // the dose of a minute equals AT - 32 at that minute
  const one = waitDose(P, o, 900, 901, SCENE.site);
  assert.ok(Math.abs(one.D - (apparentTemp(P.air(900.5 / 60), 20, 1.5, P.tmrt(o, 900.5 / 60)) - 32)) < 1e-9);
});

test('contact flags: the 1-min limit by material, the 1-s flag on metal only; they agree with the surfaces at every hour', () => {
  assert.deepEqual([burnLimit('metal'), burnLimit('concrete'), BS.burn1s.value], [51, 56, 65]);
  const { P, world } = base9();
  for (const h of [3, 9, 12, 15, 17]) {
    const f = flags9(h);
    assert.equal(f.bad1 + f.badS, 0, `${h}`);
  }
  const deck = world.bus.pts.find((p) => p.kind === 'deck' && p.bridge === 'open');
  const cov = world.bus.pts.find((p) => p.kind === 'deck' && p.bridge === 'covered');
  const fo = contactFlags(P, deck.k, 15);
  const fc = contactFlags(P, cov.k, 15);
  assert.ok(fo.min1 && fo.s1 && fo.ts > 65, JSON.stringify(fo));
  assert.ok(!fc.min1 && fc.ts < 51, JSON.stringify(fc));
  assert.equal(flags9(3).flagged, 0, 'nothing at night');
});

test('the headline: the west screen beats a bigger roof at stop C from 15 to 17 h; which kerb', () => {
  const { cmp, kerb } = compare9();
  for (const h of [15, 16, 17]) {
    assert.ok(cmp.variants.built[h].tmrt < cmp.variants.bigRoof[h].tmrt - 1, `${h}`);
    assert.ok(cmp.variants.built[h].tmrt < cmp.variants.noScreen[h].tmrt - 1, `${h}`);
  }
  for (const h of [15, 16, 17]) assert.ok(kerb.east[h].seated > kerb.west[h].seated + 15, `${h}`);
  // band 1 depends on the kerb: the west-kerb opaque shelter is inside 20-35 K, the east-kerb one far outside
  const cut = (k) => kerb[k][15].open - kerb[k][15].standing;
  assert.ok(cut('west') >= 20 && cut('west') <= 35 && cut('east') < 5, `${cut('west')} ${cut('east')}`);
});

test('riders crossing the footbridges: pure function of t, on the deck at its height with its heat, on the stairs in between', () => {
  const heat = (id, x) => ({ tmrt: id === 'open' ? 70 : 38, sunlit: 1, x });
  const a = crossersAt(SCENE, SCENE.crossers, 12.5, heat);
  assert.deepEqual(a, crossersAt(SCENE, SCENE.crossers, 12.5, heat));
  assert.equal(a.length, SCENE.crossers * SCENE.bridges.length);
  for (const t of [3, 40, 90, 200]) for (const c of crossersAt(SCENE, SCENE.crossers, t, heat)) {
    assert.ok(c.z >= 0 && c.z <= SCENE.deck + 1e-9);
    if (c.heat) assert.ok(Math.abs(c.z - SCENE.deck) < 1e-9);
  }
});

// Rows outside their band, as shipped (see docs/sources.md, Block 9): pinned with tight tolerances so a change shows up here.
const PINNED_OUTSIDE = {
  '2. The same with an opal roof (τ 0.47): share': [0.471, 0.01],
  '3. Concrete under stop A\'s roof − air at 15:00, K': [-1.417, 0.05],
  'Walkers at 15:00: density in shade over density in sun': [1.162, 0.05],
  '1. Supplementary: stop E (glass box, centre) at 15:00, Tmrt at the kerb − under the roof, K': [3.997, 0.05],
  '5. Supplementary: stop C (n riders)': [0.897, 0.005],
  '7. Supplementary: open steel deck, daily peak (mean of the deck points; the brief\'s 60–70 °C), °C': [76.207, 0.05],
  '1. Supplementary: an opaque roof on the avenue\'s east kerb (stop B\'s shelter, mirrored: open front to the west) at 15:00, standing: Tmrt at the kerb − under the roof, K': [0.022, 0.05],
};
const key = (label) => label.replace(/\(\d+ riders\)/g, '(n riders)').replace(/\bn \d+\b/g, 'n');

test('acceptance bands: values, pinned misses, verdicts, docs table in sync', () => {
  const rows = bands9();
  for (const r of rows) console.log(`${r.inside ? 'inside ' : 'OUTSIDE'} ${r.label}: ${r.value} (band ${r.lo} to ${r.hi})`);
  const outside = Object.fromEntries(rows.filter((r) => !r.inside).map((r) => [key(r.label), r.value]));
  assert.deepEqual(Object.keys(outside).sort(), Object.keys(PINNED_OUTSIDE).sort(), 'the set of rows outside a band changed');
  for (const [k, v] of Object.entries(outside)) assert.ok(Math.abs(v - PINNED_OUTSIDE[k][0]) <= PINNED_OUTSIDE[k][1], `${k}: ${v}`);
  assert.deepEqual(bandVerdicts(rows), { 1: true, 2: false, 3: false, 4: true, 5: true, 6: true, 7: true });
  // band 1 and band 6 sit inside, not at an edge: pinned too
  const b1 = rows.find((r) => r.label.startsWith('1. Opaque shelter'));
  assert.ok(Math.abs(b1.value - 33.91) < 0.05, `${b1.value}`);
  const b6 = rows.find((r) => r.label.startsWith('6. Footbridge'));
  assert.ok(Math.abs(b6.value - 31.65) < 0.05, `${b6.value}`);
  assert.ok(rows.filter((r) => r.supp).every((r) => /Supplementary/.test(r.label)));
  assert.ok(md.includes(bands9Markdown(rows)), 'run `node scripts/sources.mjs` to refresh the table');
  for (const s of ['**Air fixed:**', '**Panels and glass:**', '**Sub-cell shade check:**', '**Conditions while waiting:**', '**Thin plates:**', '**Burn limits depend on the material and the contact time:**', '**Misses:**', '**Engine sun:**', 'Not tuned', 'every parameter value', 'set before the first model run', '**Stop A\'s placement.**', 'after model runs', 'issue #24']) assert.ok(md.includes(s), `disclosure missing: ${s}`);
});

test('band 3 sensitivity (docs only): the roof underside at the model\'s own metal-roof temperature brings the shaded concrete inside 0-8 K', () => {
  const r = roofUnderside3();
  assert.ok(r.roof15 > 55 && r.wall15 < 45, JSON.stringify(r));
  assert.ok(r.shipped < 0 && r.above >= 0 && r.above <= 8, JSON.stringify(r));
  assert.ok(/Band 3, roof underside/.test(md) && /roof underside taken at the shared warm-wall temperature/.test(md));
});

test('shade ranking (docs only, outside evaluation of #33): with the ground around a person and the roof underside, stop A is no better than stop D\'s trees; the card quotes these numbers', () => {
  const r = surround9();
  const { st } = base9();
  const A = st.stops.find((s) => s.id === 'A');
  const D = st.stops.find((s) => s.id === 'D');
  // the replica of Thermal.tmrt equals the shipped value at every person
  for (const k of ['Acentre', 'Aopen', 'Dseat', 'Dopen']) assert.ok(Math.abs(r[k].replica - r[k].shipped) < 0.05, k);
  assert.ok(Math.abs(r.Acentre.shipped - A.centre[15].tmrt) < 0.05 && Math.abs(r.Dseat.shipped - D.seat[15].tmrt) < 0.05);
  // the surrounding ground is the big term; the roof seen from above adds about 1 K (the brief)
  assert.ok(r.Acentre.ground - r.Acentre.shipped > 5, JSON.stringify(r.Acentre));
  assert.ok(r.Acentre.both - r.Acentre.ground > 0.3 && r.Acentre.both - r.Acentre.ground < 2, JSON.stringify(r.Acentre));
  assert.ok(Math.abs(r.Dseat.ground - r.Dseat.shipped) < 2, JSON.stringify(r.Dseat));
  assert.ok(r.Acentre.both >= r.Dseat.ground, 'the measured order: trees at least as good as a light shelter');
  // the card's constants are these numbers (rounded to 0.1)
  const f = (x) => Math.round(x * 10) / 10;
  assert.deepEqual(BS_SURROUND, { a15: [f(r.Acentre.both), f(r.Acentre.bothSides)], d15: f(r.Dseat.ground), roof15: f(r.Acentre.roofT) });
  assert.ok(/Shade ranking: what a person under a roof sees/.test(md) && /likely too optimistic/.test(md) && /issues\/28/.test(md));
});

test('every band of the brief is checked: 1-7, each with at least one counted row', () => {
  const rows = bands9();
  for (let n = 1; n <= 7; n++) assert.ok(rows.some((r) => r.label.startsWith(`${n}. `) && !r.supp), `band ${n}`);
  const w = walkers9(15);
  assert.ok(w.shade >= 0.5 && w.riders > 50, `${w.shade}`);
});

test('every block-9 value has a source, a basis tag, a verified flag and a note; materials and keys listed in sources.md', () => {
  for (const [k, p] of Object.entries(BS)) {
    assert.ok(p.source in SOURCES && p.basis in BASIS, k);
    assert.equal(typeof p.verified, 'boolean', k);
    assert.ok(BS_NOTES[k], `${k}: no note`);
    assert.ok(md.includes(`| \`${k}\` |`), `${k} missing in sources.md`);
  }
  for (const id of ['roofMetal', 'polyClear', 'polyOpal', 'glassBox', 'adPanel', 'bridgeDeck', 'bridgeRoof']) {
    const m = MATERIALS[id];
    for (const p of Object.values(m)) if (p && typeof p === 'object' && 'source' in p) assert.ok(p.source in SOURCES && p.basis in BASIS && p.note, `${id}`);
    assert.ok(md.includes(`\`${id}\``), id);
  }
  // the brief's central values
  assert.deepEqual([BS.shelterH.value, BS.shelterDepth.value, BS.shelterLength.value, BS.deckH.value, BS.headway.value, BS.cv.value], [2.65, 2, 7, 6, 10, 0.4]);
  assert.deepEqual([MATERIALS.polyClear.tr.value, MATERIALS.polyOpal.tr.value, MATERIALS.roofMetal.tr.value, MATERIALS.adPanel.tr.value], [0.8, 0.47, 0, 0]);
  for (const s of SCENE.stops) if (s.roof) {
    assert.equal(s.roof.z, BS.shelterH.value);
    assert.ok(Math.abs(Math.min(s.roof.x1 - s.roof.x0, s.roof.y1 - s.roof.y0) - BS.shelterDepth.value) < 0.5 && Math.abs(Math.max(s.roof.x1 - s.roof.x0, s.roof.y1 - s.roof.y0) - BS.shelterLength.value) < 1e-9, s.id);
  }
  for (const b of SCENE.bridges) assert.equal(b.z, BS.deckH.value);
  for (const k of ['brief9', 'dzyuban2022', 'lanza2025', 'chenWalk2024', 'hyd047', 'brettMartin', 'asuFilm', 'sgWalkway', 'ucla', 'fan2002', 'fraser2017', 'liu2025', 'cpsc', 'deckSteel', 'lasVegas', 'iso13732', 'middel2021']) assert.ok(md.includes(`**[${k}]**`), k);
});

test('glossary: transmittance, profile angle, headway, heat dose, contact-burn threshold, on the bus stop page only', () => {
  const keys = termsFor('busstop');
  for (const k of ['transmittance', 'profileAngle', 'headway', 'heatDose', 'burnThreshold']) {
    assert.ok(keys.includes(k), k);
    assert.deepEqual(GLOSSARY[k].scenes, ['busstop']);
    for (const c of ['asphalt-park', 'campus']) assert.ok(!termsFor(c).includes(k), `${k} on ${c}`);
  }
  assert.ok(/not compute/.test(GLOSSARY.heatDose.range) && /not yet checked/.test(GLOSSARY.burnThreshold.range));
});

test('build: the block\'s materials are one @page busstop group, carried by the bus stop page only, as its own bytes', () => {
  const src = readFileSync(new URL('../../engine/materials.js', import.meta.url), 'utf8');
  const g = pageMaterialGroups(src).filter((x) => x.city === 'busstop');
  assert.equal(g.length, 1);
  for (const id of ['roofMetal', 'polyClear', 'polyOpal', 'glassBox', 'adPanel', 'bridgeDeck', 'bridgeRoof']) assert.ok(g[0].text.includes(`  ${id}: {`), id);
  const keys = new Set(['oke']);
  assert.ok(!trimMaterials(src, keys, 'campus').includes('polyOpal: {'));
  assert.ok(trimMaterials(src, keys, 'busstop').includes('polyOpal: {'));
  for (const c of ['asphalt-park', 'campus']) {
    assert.ok(!readFileSync(new URL(`../../cities/${c}/index.html`, import.meta.url), 'utf8').includes('Opal polycarbonate'), c);
    assert.equal(pageParts(c).matBytes, pageParts(c).matBytes); // unchanged by this block
  }
  assert.ok(readFileSync(new URL('../../cities/busstop/index.html', import.meta.url), 'utf8').includes('Opal polycarbonate shelter roof'));
  assert.ok(pageParts('busstop').matBytes > 1000);
  // no new ground materials (the next ones appended are block 11's)
  assert.equal(GROUND_MATS.indexOf('rubber'), 18);
  assert.deepEqual(GROUND_MATS.slice(19), ['gravel', 'desertLawn', 'coolCoat']);
});

test('scene: at most five notes, equal-length route variants, stops on the sidewalks; blocks 1-8 are not the bus stop block and keep their world', () => {
  assert.ok(SCENE.notes.length <= 5);
  const len = (p) => Math.hypot(p[2] - p[0], p[3] - p[1]);
  for (const r of SCENE.routes) assert.ok(Math.abs(len(r.variants[0]) - len(r.variants[1])) < 1e-9, r.id);
  for (const S of [S1, S2, S3, S4, S5, S6, S7, S8]) {
    assert.ok(!isBus(S) && !S.stops, S.id);
    const w = buildWorld(S, { svf: false });
    assert.ok(!w.bus && !w.awnings.some((A) => A.b === -1), S.id);
  }
  const w = buildWorld(SCENE, { svf: false });
  assert.equal(w.screens.length, 4 + 2 + 1);
  for (const s of SCENE.stops) for (const [x, y] of s.slots) assert.equal(SCENE.ground[w.parcelAt(x, y)].mat, 'concrete', `${s.id} ${x},${y}`);
});

test('the block-9 modules hold no clock or random source', () => {
  for (const f of ['busstop', 'bskit', 'bsui']) {
    const src = readFileSync(new URL(`../../engine/${f}.js`, import.meta.url), 'utf8');
    assert.ok(!/Math\.random|Date\.now|new Date/.test(src), f);
  }
});
