// docs/sources.md section for block 9 (bus stops and footbridges),
// generated from the code and model runs (scripts/busstop.mjs).
import { BASIS, MATERIALS } from '../engine/materials.js';
import { BS, meanWait } from '../engine/busstop.js';
import { base9, compare9, bands9, bandVerdicts, sensitivity9, walkers9, waits9, flags9, roofUnderside3, BS_NOTES } from './busstop.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const cell = (k) => {
  const p = BS[k];
  return `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'} (${BS_NOTES[k]})`;
};

/** Block 9 acceptance table (also checked by the tests). */
export function bands9Markdown(rows) {
  const v = (r) => (r.unit === '' ? r.value.toFixed(3) : r.value.toFixed(2));
  const b = (r) => (r.lo === null && r.hi === null ? '— (reported)' : r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : r.lo === r.hi ? `${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const verdict = (r) => (r.supp ? `${r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.inside ? 'inside' : '**outside**');
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${verdict(r)} |`);
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside).length;
  const bv = bandVerdicts(rows);
  const met = Object.keys(bv).filter((k) => bv[k]);
  const missed = Object.keys(bv).filter((k) => !bv[k]);
  return `| Check (spec #14) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${counted.length} counted checks fall outside their band; ${rows.length - counted.length} supplementary rows are not counted. By the brief's bands: ${met.length} of ${met.length + missed.length} met (${met.join(', ')})${missed.length ? `; missed: ${missed.join(', ')}` : ''}. They are reported, not tuned away: every parameter value is the brief's central value (or the shared value the brief names), set before the first model run. The layout is a design choice, and one placement was made after model runs (stop A, see Stops).`;
}

export function busstopMarkdown() {
  const { scene, world, T, P, st } = base9();
  const { cmp, kerb, swap } = compare9();
  const rows = bands9();
  const sens = sensitivity9();
  const wk = walkers9(15);
  const w = waits9();
  const fl = flags9(15);
  const by = (id) => st.stops.find((s) => s.id === id);
  const A = by('A');
  const [cv, op] = ['covered', 'open'].map((id) => st.bridges.find((b) => b.id === id));
  const params = Object.keys(BS).map((k) => `| \`${k}\` | ${cell(k)} |`);
  const H3 = [12, 15, 17];
  const stopRows = st.stops.map((s) => `| ${s.id} | ${s.centre ? H3.map((h) => f1(s.centre[h].tmrt)).join(' / ') : '—'} | ${H3.map((h) => f1(s.seat[h].tmrt)).join(' / ')} | ${H3.map((h) => f1(s.open[h].tmrt)).join(' / ')} | ${s.centre ? f1(s.centre[15].ts) : '—'} / ${f1(s.open[15].ts)} | ${f1(s.bench[15].ts)} (${s.benchMat}) | ${s.svf.centre === null ? '—' : f2(s.svf.centre)} / ${f2(s.svf.open)} |`);
  const riderRows = st.stops.map((s) => `| ${s.id} | ${s.wait15.n} | ${f1(s.wait15.wait)} | ${f1(s.wait15.tmrt)} | ${f1(s.wait15.D)} | ${Math.round(s.wait15.headSun * 100)}% | ${s.wait12.n} | ${f1(s.wait12.tmrt)} | ${f1(s.wait12.D)} |`);
  const V = cmp.variants;
  const scr = [['built', 'as built: opal roof and the west screen'], ['noScreen', 'the same roof, no screen'], ['bigRoof', `a roof ${BS.biggerRoof.value} m bigger on every side, no screen`]].map(([k, name]) => `| ${name} | ${cmp.hours.map((h) => `${f1(V[k][h].tmrt)} (${Math.round(V[k][h].lit * 100)}%)`).join(' | ')} |`);
  const kr = ['west', 'east'].map((k) => `| ${k} kerb | ${kerb.hours.map((h) => `${f1(kerb[k][h].seated)} / ${f1(kerb[k][h].standing)}`).join(' | ')} |`);
  const sw = [['roofMetal', 'opaque metal (τ 0)'], ['polyClear', 'clear polycarbonate (τ 0.80)'], ['polyOpal', 'opal polycarbonate (τ 0.47)'], [0.43, 'bronze polycarbonate (τ 0.43, not in the scene)']].map(([k, name]) => `| ${name} | ${f1(swap[k].centre)} | ${f1(swap[k].benefit)} | ${f2(swap[k].benefit / swap.roofMetal.benefit)} | ${f1(swap[k].ts)} |`);
  const flagRows = fl.rows.filter((r) => r.p.kind !== 'deck' || r.p.x === world.bus.pts.filter((q) => q.kind === 'deck' && q.bridge === r.p.bridge)[3].x).map((r) => `| ${r.p.kind === 'bench' ? `bench seat, stop ${r.p.stop}` : r.p.kind === 'rail' ? `handrail, ${r.p.bridge} footbridge` : `deck, mid-span, ${r.p.bridge} footbridge`} (${r.p.mat}) | ${f1(r.ts)} | ${r.limit} | ${r.min1 ? 'yes' : 'no'} | ${r.s1 ? 'yes' : 'no'} |`);
  const g15 = A.centre[15].ts - T.air(15);
  const ru = roofUnderside3();
  const kc = (k) => kerb[k][15].open - kerb[k][15].standing;
  return `## Block 9: bus stops and footbridges

The ninth block (\`cities/busstop\`) is an invented 400 m stretch of a north–south arterial (Station Avenue: 40 m of asphalt
between 12 m concrete sidewalks) crossed by an east–west street (Market Street), with five bus stops of different designs
and two steel footbridges 6 m up, on block 1's design day (35° N, 20 July, air 25–35 °C, wind 1.5 m/s, vapour pressure
20 hPa). The stops: **A** an opaque metal roof on Market Street (back panel to the south), **B** a clear polycarbonate roof
on the avenue's west kerb (back panel to the west), **C** an opal polycarbonate roof with a west end screen on Market
Street, **D** no shelter, a bench under three street trees on the west kerb, **E** an enclosed glass box with a glass roof
on Market Street. One footbridge is covered by an opaque roof, the other is open. Buses come to every stop on a headway
schedule and riders wait for them; others cross the footbridges. The waiting places are \`K\`, the panel button or
\`?spots=1\` (default off); the contact-burn flags are \`U\`, the panel button or \`?burn=1\` (default off). Its research
brief is [\`docs/research/busstop-brief.md\`](research/busstop-brief.md).

### Block 9 parameters

The block's materials (\`roofMetal\`, \`polyClear\`, \`polyOpal\`, \`glassBox\`, \`adPanel\`, \`bridgeDeck\`, \`bridgeRoof\`)
are in the parameter table above; they are cut from the other pages at build time (\`@page busstop\` in
\`engine/materials.js\`). Only their transmission of direct sun (τ) is used. The sidewalks are the shared \`concrete\`, the
roads \`asphalt\`, the park \`grass\`; the footbridge decks, the handrails and the metal bench seats are the shared dark
metal thin layer \`metal\` (C ${MATERIALS.metal.thinC.value / 1000} kJ m⁻² K⁻¹, inside the brief's 5–20 kJ), stop D's bench \`concrete\`. The glass of stop E
has no value in the brief: 1 − ρ₀ − a_g of the block-3 clear float glass (0.82) is used, an *interpretation*. The block's
own values live in \`engine/busstop.js\` (\`BS\`):

| Parameter | Value |
|---|---|
${params.join('\n')}

### The waiting-point model

Shelters are 2 m deep on a 5 m grid, so a grid cell cannot tell a seat under the roof from the kerb in front of it [brief9].
The grid model runs as everywhere else (the roofs and decks are flat screens with their τ, the opaque panels thin opaque
boxes for the ground shade), and every waiting place, each stop's centre and a reference point in the open, the bench
seats, ${op.n} points along each deck and a handrail point per bridge (${world.bus.pts.length} points) are computed again at points (\`engine/busstop.js\`):

- **Direct sun at a point** (x, y, z): the ray toward the sun is tested against the buildings (boxes), the tree crowns (the
  grid's crown shadow ellipse, seen from z; transmission 0.17, at most three crowns), every flat roof above the point (it
  passes τ where the ray crosses the roof plane inside the roof) and every vertical panel (τ where it crosses the panel).
  For a person, the share of the sun on the body is the mean at ${BS.bodySamples.value}; the head alone gives the
  shade check (heads 1.7 m standing, 1.2 m seated).
- **Sky view at a point**: the buildings' horizon (\`svfAt\` from the point's height) × (1 − 0.75 crown cover) × (1 − F),
  F the view factor of the roofs above from an upward-facing point (rectangle corner formula). A roof counts as full cover
  whatever its τ, as the sails and PV canopies of blocks 6 and 8: its underside is the engine's warm wall (air + 2 K, more
  by day).
- **Ground and Tmrt**: the points run the same force-restore model as a grid cell (a one-row "world" of points, each with
  its own sun share and sky view, \`runModel\` with \`opts.cells\`); Tmrt is the engine's six-direction sum (\`Thermal.tmrt\`)
  with the body's sun share and the sky view at ${BS.skyAt.value}.

### Stops

Tmrt of an adult (°C; standing at the centre and in the open, seated on the bench) at 12:00 / 15:00 / 17:00, the concrete
under the centre and in the open and the bench seat at 15:00 (°C), and the sky view (centre / open):

| Stop | centre | bench | open | concrete 15:00 | bench 15:00 | SVF |
|---|---|---|---|---|---|---|
${stopRows.join('\n')}

Riders arriving 15:00–16:00 and 12:00–13:00 (mean wait in min, mean Tmrt while waiting in °C, mean heat dose in K·min, share
of the waits with the head in direct sun):

| Stop | n 15–16 h | wait | Tmrt | dose | head in sun | n 12–13 h | Tmrt | dose |
|---|---|---|---|---|---|---|---|---|
${riderRows.join('\n')}

At 15:00 the opaque roof of stop A takes ${f1(A.open[15].tmrt - A.centre[15].tmrt)} K of Tmrt off a person standing under it (Tempe: building shade −28.8 K,
tree −28.1 K [middel2021]; Phoenix: shade −19 °C PET [dzyuban2022]), but its seat at the open west end gets the low sun from
the side. The trees of stop D cut ${f1(by('D').open[15].tmrt - by('D').seat[15].tmrt)} K on the bench. The glass box (stop E) cuts only ${f1(by('E').open[15].tmrt - by('E').centre[15].tmrt)} K: its glass passes
${MATERIALS.glassBox.tr.value} of the sun from above and the sides (Houston: enclosed shelters without overhead shade more than 3 °C WBGT hotter than
the open sun [lanza2025], mostly from the trapped air, which is not modelled).

**Stop A's placement.** The opaque stop was first placed on the avenue's east kerb (open front to the west, the brief's
"east-kerb stop"). Model runs during development showed that there the low afternoon sun reaches most of a standing body
under the roof at 15:00, so band 1 would have measured the kerb rather than the roof; the stop was then moved to Market
Street (east–west, back panel to the south). This happened after model runs, while the scene was being built; no parameter
value changed. Band 1 is therefore a property of an opaque roof **and** of where it stands: on the avenue the kerb decides
(see Which kerb: the same opaque shelter cuts ${f1(kc('west'))} K at 15:00 on the west kerb, inside band 1, and ${f1(kc('east'))} K on the east kerb, far
outside it; both are supplementary rows of the band table).

### West screen against a bigger roof

Stop C's four bench places (seated heads), Tmrt (°C) and, in brackets, the share of heads with more than half the sun on
them (point model):

| Stop C | ${cmp.hours.map((h) => hm(h)).join(' | ')} |
|---|${cmp.hours.map(() => '---').join('|')}|
${scr.join('\n')}

The screen to ${BS.westScreen.value} m is cooler than the bigger roof at ${cmp.hours.filter((h) => V.built[h].tmrt < V.bigRoof[h].tmrt).map(hm).join(', ')}; at 17:00 by ${f1(V.bigRoof[17].tmrt - V.built[17].tmrt)} K. The brief:
between 14 and 17 h the low western sun gets under any roof, so the west side needs a vertical screen [brief9]; Hong Kong's
guidance asks for fascias and a sun-shadow check [hyd047]. A band of sun still passes between the top of the screen and the
roof.

### Which kerb

Stop B's shelter with an opaque roof, as built on the west kerb and mirrored onto the east kerb (open front to the west),
Tmrt seated / standing under the roof (°C); the reference in the open stands 6 m north of the shelter (Tmrt at 15:00:
${f1(kerb.west[15].open)} °C west, ${f1(kerb.east[15].open)} °C east), so the cut at 15:00 for a standing person is ${f1(kc('west'))} K on the west kerb and ${f1(kc('east'))} K on the
east kerb:

| Shelter | ${kerb.hours.map((h) => hm(h)).join(' | ')} |
|---|${kerb.hours.map(() => '---').join('|')}|
${kr.join('\n')}

On a north–south street the west-kerb stop's back panel blocks the afternoon sun and the east-kerb stop's open front takes
it [brief9].

### Roofs: transmittance

Stop A's shelter with each roof (the same panel, the same place), Tmrt at its centre at 15:00 (standing), the cut against
the open reference (${f1(swap.roofMetal.open)} °C), the share of the opaque roof's cut, and the concrete under the centre:

| Roof | Tmrt °C | cut K | share | concrete °C |
|---|---|---|---|---|
${sw.join('\n')}

The datasheet transmissions [brettMartin] are used as a share of the **direct** beam; the sheet's diffuse light is not
counted (the roof counts as cover for the sky view). An opal sheet scatters what it lets through, so less of it reaches a
standing body's sides than the model's beam gives: likely why opal comes out at ${f2(swap.polyOpal.benefit / swap.roofMetal.benefit)} of the opaque cut, just under the
brief's 0.50–0.65 (band 2 **missed**); bronze (τ 0.43) is inside.

### Buses, riders and the heat dose

Buses come every ${BS.headway.value} min with gaps h (1 + a (2u − 1)), u uniform, a = cv √3 (cv ${BS.cv.value}), from 06:00 to 23:00; riders
arrive at random (exponential gaps, ${BS.riders.value} a minute at each stop) and board the next bus (\`daySchedule\`, a pure function of the
seed and the stop). For random arrivals E[W] = (h / 2)(1 + cv²) = ${f2(meanWait())} min [brief9], [fan2002] (Salek & Machemehl 1999, cited by the brief as Fan & Machemehl 2002); simulated: ${f2(w.wait)} min over
${w.n} riders (${w.per.map((p) => `${p.id} ${f2(p.wait)}`).join(', ')}). When it is hot (air above 28 °C, by day) a rider takes the free waiting place with
the lowest Tmrt at that moment, else the first free one (the bench first). On the page the bus clock runs ${BS.clock.value} times faster than the
animation over the 15 min after the hour shown, looping.

The heat dose of a wait is the engine's definition [brief9]: D = Σ max(0, AT − ${BS.doseBase.value}) Δt, in 1-min steps (K·min). The brief writes it
on UTCI, which this engine does not compute; the apparent temperature with radiation of block 4 stands in for it
(AT = Ta + 0.348 e − 0.70 ws + 0.70 Q / (ws + 10) − 4.25, Q = 6.1 (Tmrt − Ta) [bom], ws the site wind ${scene.site.wind} m/s), an *interpretation*.
No standard heat dose exists for a few minutes of waiting [brief9]; it compares stops, it is not a measure of risk.

### Footbridges

| | ${H3.map((h) => hm(h)).join(' | ')} | daily peak |
|---|---|---|---|---|
| Tmrt, open deck (mean of ${op.n} points), °C | ${H3.map((h) => f1(op.tmrt[h])).join(' | ')} | |
| Tmrt, covered deck, °C | ${H3.map((h) => f1(cv.tmrt[h])).join(' | ')} | |
| steel deck, open, °C | ${H3.map((h) => f1(op.deck[h])).join(' | ')} | ${f1(op.deckPeak)} |
| steel deck, covered, °C | ${H3.map((h) => f1(cv.deck[h])).join(' | ')} | ${f1(cv.deckPeak)} |
| handrail, open bridge, °C | ${H3.map((h) => f1(op.rail[h])).join(' | ')} | ${f1(op.railPeak)} |
| handrail, covered bridge (south edge), °C | ${H3.map((h) => f1(cv.rail[h])).join(' | ')} | ${f1(cv.railPeak)} |

At 15:00 the cover takes ${f1(op.tmrt[15] - cv.tmrt[15])} K of Tmrt off a person on the deck (Hong Kong elevated walkway: 19.8–34.8 K via the brief, not in the abstract, which gives PET 2–17 K lower on the walkway [chenWalk2024]). The open
steel deck peaks at ${f1(op.deckPeak)} °C, above the brief's 60–70 °C for steel deck surfacing (supplementary, not counted; the source [deckSteel] models extreme conditions and tests at 70 °C, it does not show 60–70 °C in summer sun): likely
because the plate is heated from above and loses no heat from below in this thin-layer model, so deck and rail temperatures
are upper bounds. The covered bridge's south handrail still gets the sun under the eaves.

### Contact burns

ISO 13732-1 via CENELEC Guide 29 [iso13732], 1 min of contact: metal ${BS.burnMetal.value} °C, ceramics, glass and stone ${BS.burnStone.value} °C (concrete read with them), plastics and wood
${BS.burnPlastic.value} °C; bare metal in about 1 s at 65–70 °C (unverified [brief9]; the flag at ${BS.burn1s.value} °C, the low end). Display only. At 15:00:

| Surface | °C | 1-min limit | above it | 1-s flag |
|---|---|---|---|---|
${flagRows.join('\n')}

${fl.flagged} of ${fl.n} bench, rail and deck points carry the 1-min flag at 15:00, ${fl.s1} the 1-s flag. Sunlit steel decks can burn in seconds
[cpsc]; sunlit metal reached 62 °C in Las Vegas [lasVegas]; for 1–10 s contacts CENELEC Guide 29 advises the low end of its range for children (from 1 min on Table A.1
applies to children as is), and the brief advises reading at least 4 s of contact for older people and children.

### Walkers and riders

Walkers use the shade weights of blocks 1–8 on two sidewalk variants per route [melnikov]; at 15:00 their density in shade is
${f2(wk.ratio)} times that in sun, short of the 2 the other blocks reach: likely because both sidewalks of each street have the same rows
of street trees and little building shade in the afternoon, so the choice between them changes little. Riders choose their
waiting place by Tmrt: ${Math.round(wk.shade * 100)}% of the ${wk.riders} riders arriving 15:00–16:00 wait with the head in shade. Riders crossing the
footbridges carry the deck's point-model heat. The sweat cue is as before (Tmrt 65–70 °C in sun).

### Sensitivity

One value at a time, within the brief's ranges:

| Stop A's shelter | Tmrt cut at 15:00 | under the roof − air | concrete under it − air |
|---|---|---|---|
| shipped (H ${BS.shelterH.value} m, depth ${BS.shelterDepth.value} m) | ${signed(sens.shipped.shelter.cut)} K | ${signed(sens.shipped.shelter.above)} K | ${signed(sens.shipped.shelter.ground)} K |
${sens.shelter.map((x) => `| ${x.label} | ${signed(x.cut)} K | ${signed(x.above)} K | ${signed(x.ground)} K |`).join('\n')}

| Buses | simulated mean wait | formula | ratio |
|---|---|---|---|
| shipped (h ${BS.headway.value} min, cv ${BS.cv.value}) | ${f2(w.wait)} min | ${f2(w.formula)} min | ${f2(w.wait / w.formula)} |
${sens.wait.map((x) => `| ${x.label} | ${f2(x.wait)} min | ${f2(x.formula)} min | ${f2(x.ratio)} |`).join('\n')}

| Steel (open bridge) | deck 15:00 | deck daily peak | handrail peak |
|---|---|---|---|
| shipped, C ${MATERIALS.metal.thinC.value / 1000} kJ m⁻² K⁻¹ | ${f1(sens.shipped.thin.open15)} °C | ${f1(sens.shipped.thin.openPeak)} °C | ${f1(sens.shipped.thin.railPeak)} °C |
${sens.thin.map((x) => `| ${x.label} | ${f1(x.open15)} °C | ${f1(x.openPeak)} °C | ${f1(x.railPeak)} °C |`).join('\n')}

| Deck height | Tmrt open − covered at 15:00 |
|---|---|
| shipped, ${BS.deckH.value} m | ${signed(sens.shipped.deck)} K |
${sens.deck.map((x) => `| ${x.label} | ${signed(x.gap)} K |`).join('\n')}

Band 2 (opal) closes with the bronze sheet (τ 0.43, its own datasheet value, not in the scene); no shelter height or depth in
the brief's ranges brings the shaded concrete (band 3) up to the air.

**Band 3, roof underside (docs only, not shipped, not tuned).** The point under stop A's roof sees the roof (${f2(ru.share)} of its view)
as the shared warm-wall term, ${f1(ru.wall15)} °C at 15:00 (air + 2 K + 6 K·K/900). A sunlit dark metal roof is far hotter underneath: this
model's own dark metal roofs (the grid's \`metal\` roof cells, a thin layer, so the underside is about the top) reach ${f1(ru.roof15)} °C at 15:00.
With the roof's share of the view at that temperature, minute by minute (the building walls keep the shared term), the
concrete under the roof comes out ${signed(ru.above)} K from the air at 15:00 (${signed(ru.shipped)} K in the same run with the shared term), inside
the brief's 0–8 K. So the shared wall term is a likely cause of the miss; the missing lateral conduction from the sunlit slab
around the 2 m strip is another, not tested. It stays as shipped: the wall term is shared by every block, as for block 6's
PV undersides. The deck's peak barely moves with C: a thin layer in
full sun sits near its radiative balance whatever its heat capacity.

### Acceptance bands (block 9)

Evaluated at 15:00, the air's peak (the brief's bands are for Ta peak 35 °C), unless the band names its hours: the shadow
shift at 14–17 h, the wait over the whole service day. Band 4 checks the engine's sun (\`sun.js\`, NOAA's fractional-year
form) against the brief's NOAA table: the gap is the engine approximation (about 0.2° at noon, issue #24), well inside
0.25 m here.

${bands9Markdown(rows)}

### Disclosures (block 9)

- **Air fixed:** no warm air trapped in the glass box (Lanza et al. found enclosed shelters without overhead shade more than
  3 °C WBGT hotter than the open sun [lanza2025]), no bus exhaust, no misting, no wind shelter; inside stop E is understated.
- **Panels and glass:** walls and panels reflect no sunlight; their own temperature is not computed; no greenhouse effect;
  the glass passes ${MATERIALS.glassBox.tr.value} of the beam at every angle (less at a glancing angle). Translucent roofs pass their τ as direct beam
  and their diffuse light is not counted (the roof counts as cover for the sky view).
- **Sub-cell shade check:** the waiting places, decks, rails and benches are points; the 5 m grid around them sees only the
  roofs, the decks and the opaque panels (not the glass walls). The ground under a point has no lateral heat exchange with
  the sunlit slab around it.
- **Conditions while waiting:** Tmrt is a steady-state value for an adult (head 1.7 m standing, 1.2 m seated); the model does
  not follow a body heating up over a wait. The heat dose is the engine's own measure, on the apparent temperature (UTCI is
  not implemented), not a health threshold; the stairs' extra effort is not modelled.
- **Thin plates:** decks, handrails and bench seats are horizontal thin layers heated from above only (no cooling from below
  or round a tube), so their temperatures are upper bounds; the open deck's peak (${f1(op.deckPeak)} °C) is above the brief's 60–70 °C.
- **Burn limits depend on the material and the contact time:** the 1-min ISO limits apply to adults and, from 1 min on, to children; the 1-s value
  for bare metal is unverified; flags are display only.
- **Misses:** band 2 (opal ${f2(swap.polyOpal.benefit / swap.roofMetal.benefit)} of the opaque cut, against 0.50–0.65), band 3 (concrete under stop A's roof ${signed(g15)} K from the air at
  15:00, against 0–8 K above it; likely the roof underside taken at the shared warm-wall temperature, which the sensitivity run
  above supports, and the missing lateral conduction from the sunlit slab around a 2 m strip, not tested) and the
  walkers' shade ratio (${f2(wk.ratio)}, against 2) are outside; each card that states the number says so. Reported, not tuned.
- **Engine sun:** \`sun.js\` uses NOAA's fractional-year approximation (about 0.2° off at noon, issue #24); against the brief's
  table the shadow shifts at 14–17 h differ by at most ${f2(Math.max(...rows.filter((r) => /^4\. Roof/.test(r.label)).map((r) => Math.abs(r.value - (r.lo + 0.25)))))} m.
- **Invented street:** layout, the stops' places (stop A moved after model runs, see Stops), the rider rate, the bus clock and the bigger roof of the comparison are
  assumptions.
`;
}
