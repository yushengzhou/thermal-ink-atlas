// docs/sources.md section for block 6 (car park and brownfield), generated
// from the code and model runs (scripts/parking.mjs).
import { MODEL, MATERIALS, BASIS } from '../engine/materials.js';
import { slab, STEMPIHAR, tsMean, fluxMean, shedTau } from '../engine/parking.js';
import { base6, pv6, thin6, sensitivity6, walkers6, bands6, bandVerdicts, pvWallSensitivity } from './parking.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const r0 = (x) => String(Math.round(x));
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (p) => `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'}${p.note ? ` (${p.note})` : ''}`;
const hhmm = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

const NAMES = { openAsphalt: 'open asphalt (no car, crown or canopy)', openBays: 'open bay rows (with cars)', treeBays: 'bay rows under the trees', pvBays: 'bay rows under the PV canopy', yard: 'concrete yard and apron', ballast: 'rail ballast', soil: 'bare compacted soil', scrub: 'scrubby dry vegetation', lawn: 'irrigated lawn', shed: 'rusty shed roofs' };

/** Block 6 acceptance table (also checked by the tests). */
export function bands6Markdown(rows) {
  const v = (r) => (Number.isInteger(r.value) ? String(r.value) : r.unit === 'K' || r.unit === 'K/h' ? signed(r.value, 2) : r.unit === 'W m⁻²' ? signed(r.value, 1) : r.value.toFixed(3));
  const b = (r) => (r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${r.supp ? `${r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.inside ? 'inside' : '**outside**'} |`);
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside).length;
  const bv = bandVerdicts(rows);
  const met = Object.keys(bv).filter((k) => bv[k]);
  const missed = Object.keys(bv).filter((k) => !bv[k]);
  return `| Check (spec #11) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${counted.length} checks fall outside their band (${rows.length - counted.length} supplementary row not counted). By the brief's bands: ${met.length} of ${met.length + missed.length} met (${met.join(', ')}); missed: ${missed.join(', ')}. They are reported, not tuned away: no input was moved to pass a band.`;
}

export function parkingMarkdown() {
  const { scene, world, T, st, C } = base6();
  const P = pv6();
  const PW = pvWallSensitivity();
  const th = thin6();
  const sens = sensitivity6();
  const wk = walkers6(15);
  const rows = bands6();
  const t = st.table;
  const hma = slab(STEMPIHAR.hma.k, STEMPIHAR.hma.rho, STEMPIHAR.hma.c);
  const pcc = slab(STEMPIHAR.pcc.k, STEMPIHAR.pcc.rho, STEMPIHAR.pcc.c);
  const keys = Object.keys(NAMES);
  const night = keys.map((k) => `| ${NAMES[k]} (\`${k}\`) | ${C[k].length} | ${f2(t[k].svf)} | ${f2(t[k].share)} | ${f1(t[k].t15)} | ${f1(t[k].t23)} | ${signed(t[k].t23 - st.air.t23)} | ${signed(t[k].g20, 0)} | ${signed(t[k].g23, 0)} | ${signed(t[k].g04, 0)} |`);
  const hours = [9, 12, 15, 18, 20, 23, 2, 5];
  const curve = hours.map((h) => `| ${hhmm(h)} | ${f1(T.air(h))} | ${['openAsphalt', 'yard', 'soil', 'ballast', 'lawn', 'shed'].map((k) => `${f1(tsMean(T, C[k], h))} / ${signed(fluxMean(T, C[k], h), 0)}`).join(' | ')} |`);
  const cool = keys.map((k) => `| ${NAMES[k]} | ${f2(st.cool[k].peak)} at ${hhmm(st.cool[k].at)} | ${f2(st.cool[k].after)} |`);
  const params = ['groundFlux', 'dampingDepth', 'pvSvf', 'carShade', 'carSky', 'thinPaving'].map((k) => `| \`${k}\` | ${cell(MODEL[k])} |`);
  const mats = ['asphalt', 'concrete', 'ballast', 'drySoil', 'scrub', 'grass', 'rustShed', 'pvCanopy'];
  const sensRows = sens.filter((s) => s.kind !== 'shed').map((s) => `| ${s.label} | ${f1(s.ts15)} | ${f1(s.ts23)} | ${s.d23soil !== null ? signed(s.d23soil, 2) : '—'} | ${s.d23lawn !== null ? signed(s.d23lawn, 2) : '—'} | ${s.d15asp !== null ? signed(s.d15asp, 2) : '—'} | ${s.d23asp !== null ? signed(s.d23asp, 2) : '—'} |`);
  const shedRows = sens.filter((s) => s.kind === 'shed').map((s) => `| ${s.label} | ${f1(s.ts15)} | ${f1(s.ts23)} | ${signed(s.d23air, 2)} |`);
  const lead = (st.ranges.openAsphalt.hMax - st.peakG.h + 24) % 24;
  const lotRoute = wk.routes.filter((r) => /^across/.test(r.id));
  const sv = (label) => sens.find((x) => x.label.startsWith(label));
  const margin = f2(t.openAsphalt.t23 - t.soil.t23 - 2);
  const shedSpan = sens.filter((x) => x.kind === 'shed').map((x) => -x.d23air);
  return `## Block 6: car park and brownfield

The sixth block (\`cities/parking\`) is an invented 400 m block on the edge of an industrial town: a big open-air car
park of thick asphalt (${scene.cars.length} parked cars in rows; an open section, a section with trees planted on the footpaths
between the bays, and a section under solar (PV) canopies), a concrete loading yard and apron, four rusty corrugated
steel sheds, two rail sidings on ballast, a small irrigated office lawn, and a brownfield of bare compacted soil and
scrubby dry vegetation around an old floor slab. The design day is block 1's (35° N, 20 July, air 25–35 °C, wind
1.5 m/s, vapour pressure 20 hPa): the brief's bands assume air 25–35 °C. Its research brief is
[\`docs/research/parking-brief.md\`](research/parking-brief.md).

The night-release overlay is shown with \`G\`, the panel button or \`?flux=1\` (default off).

### Materials

${mats.map((id) => `- \`${id}\`: ${MATERIALS[id].name}. ${MATERIALS[id].note}`).join('\n')}

Their values and basis tags are in the Surface parameters table above. The thick asphalt and the concrete slab are the
shared \`asphalt\` and \`concrete\` (α 0.12 and 0.30, μ 1200 and 1785), inside the brief's ranges; the brownfield
values (ballast, soil, scrub, the shed's albedo) are the brief's **assumptions**, not measurements.

### Cars, the PV canopy and heat storage in the model

- **Parked cars** are not modelled as objects with a temperature. Each 5 m cell gets the share of its area under car
  footprints (exact rectangle overlap with the drawn 4.4 × 1.8 m cars); its direct sun is multiplied by
  (1 − share) in every 10-min sun slot (\`carShade\`), and its sky view by (1 − share) all day (\`carSky\`: the car underside
  is taken as the warm-wall term, air + 2 K and more by day, so the ground under a car also loses diffuse sky light by day). The lot is taken as full all day and the car shadow is not offset with the
  sun angle. ${st.lotShare.cars} cars cover ${Math.round(st.lotShare.share * 100)}% of the lot (the brief's rule of thumb is 30–35%, unverified); the
  bay rows ${Math.round(t.openBays.share * 100)}%.
- **The PV canopy** is a flat opaque screen 4.2 m up (\`pvCanopy\`, tr 0); its cast shadow is computed like the block-5
  screens. Cells whose centre is under a panel row take the sky view Golden et al. measured, ${MODEL.pvSvf.value} (\`pvSvf\`, then × (1 − car share)),
  and see the panel undersides as the warm-wall term. In the drawing the canopy is drawn after the cars it covers
  (an opt-in \`front\` flag in the depth sort that no object of blocks 1–5 carries).
- **Ground heat flux G.** The force-restore step already computes G, the flux into the surface:
  G = (1 − α)K↓ + εL↓ − εσTs⁴ − h_c(Ts − Ta) − EF·max(Q*, 0) [deardorff]. With \`opts.flux\` the model stores it every 15 min:
  on those minutes it runs \`stepFlux\`, the same statement as \`stepPlain\` that also writes G, so a flux run matches a
  plain run bit for bit (checked in \`tests/unit/parking.test.mjs\`); thin layers (the shed roofs) have G = C dTs/dt.
  Blocks 1–5 never ask for it.
- **Damping depth** d = √(κτ/π), κ = k/(ρc): with the Stempihar et al. inputs [stempihar2012] asphalt (k 1.2, ρ 2238, c 921)
  ${hma.d.toFixed(3)} m and concrete (k 1.5, ρ 2350, c 1000) ${pcc.d.toFixed(3)} m; their admittances √(kρc) are ${r0(hma.mu)} and ${r0(pcc.mu)},
  against ${MATERIALS.asphalt.mu.value} and ${MATERIALS.concrete.mu.value} used here (the Oke values; see Sensitivity). Force-restore is exact for a sinusoidal
  forcing of a uniform semi-infinite slab, and fits slabs thicker than about 1.5 d (0.2 m): the lot and the yard. In a pure sine
  wave G leads Ts by 3 h; here the open asphalt's G peaks at ${hhmm(st.peakG.h)} (${r0(st.peakG.g)} W m⁻²) and its Ts at
  ${hhmm(st.ranges.openAsphalt.hMax)}, ${f1(lead)} h later (the day is not a sine wave: no sun at night).

| Constant | Value |
|---|---|
${params.join('\n')}

### The 23:00 picture: heat storage and the night release

Class means (cells picked by geometry before any result: see \`cellClasses\` in \`engine/parking.js\`); air
${f1(st.air.t15)} °C at 15:00, ${f1(st.air.t23)} °C at 23:00; G in W m⁻², negative = the ground gives heat back.

| Surface | n | SVF | car share | 15:00 °C | 23:00 °C | 23:00 − air | G 20:00 | G 23:00 | G 04:00 |
|---|---|---|---|---|---|---|---|---|---|
${night.join('\n')}

The day, Ts °C / G W m⁻² (class means):

| Time | air | open asphalt | concrete yard | bare soil | ballast | lawn | shed roof |
|---|---|---|---|---|---|---|---|
${curve.join('\n')}

- Open asphalt takes in up to ${r0(st.peakG.g)} W m⁻² (at ${hhmm(st.peakG.h)}), the concrete yard ${r0(t.yard.g12)} at noon; at 23:00 they give back ${r0(-t.openAsphalt.g23)} and
  ${r0(-t.yard.g23)} W m⁻²; the soil, scrub and ballast ${r0(-t.scrub.g23)}–${r0(-t.soil.g23)}; the lawn ${r0(-t.lawn.g23)}; the shed roofs ${r0(Math.abs(t.shed.g23))} (nothing to give).
- Sensible heat to the air at night (h_c(Ts − Ta), h_c ${st.hc.toFixed(1)} W m⁻² K⁻¹), asphalt minus lawn:
  ${st.gap.map((g) => `${hhmm(g.h)} ${r0(g.gap)}`).join(', ')} W m⁻²; grass parking vs asphalt measured about 50 W m⁻² at night and
  100–150 by day [takebayashi2009]. **No measured night-time W m⁻² for a car park was found** (the brief): the night
  fluxes are the model's alone.
- Literature for scale: modelled Phoenix pavements, max 53–69 °C, min 29–35 °C (asphalt 34.0, concrete 33.5) [stempihar2012]
  (a hotter day than this one); asphalt about 150 W m⁻² more infrared than bare soil at its maximum [asaeda1996] (abstracts,
  unverified); roads the only class warming the night in Phoenix [zhu2022] (interpretation, unverified); pavements and
  vehicles' sensible heat in Phoenix 67% roads, 29% parking, 3.9% vehicles [hoehne2020] (snippet only, unverified).

### The PV canopy

Compared as Golden et al. did [golden2007] (bare asphalt under the panels vs exposed asphalt): the canopy's bay cells
(n ${P.empty.n}) run again in the same scene without cars (an empty bay, SVF ${f2(P.empty.svf)}), next to the open asphalt of the
block's model. And, as shipped, the bay rows with their cars:

| | 15:00 °C | max °C | min °C | daily range K | range vs open asphalt |
|---|---|---|---|---|---|
| open asphalt (no car) | ${f1(P.open.t15)} | ${f1(P.open.max)} | ${f1(P.open.min)} | ${f1(P.open.range)} | — |
| empty bay under the canopy | ${f1(P.empty.t15)} | ${f1(P.empty.max)} | ${f1(P.empty.min)} | ${f1(P.empty.range)} | ${signed((P.empty.range / P.open.range - 1) * 100, 0)}% |
| canopy bay rows, with cars | ${f1(P.bays.t15)} | ${f1(P.bays.max)} | ${f1(P.bays.min)} | ${f1(P.bays.range)} | ${signed((P.bays.range / P.open.range - 1) * 100, 0)}% |
| open bay rows, with cars | ${f1(P.openBays.t15)} | ${f1(P.openBays.max)} | ${f1(P.openBays.min)} | ${f1(P.openBays.range)} | ${signed((P.openBays.range / P.open.range - 1) * 100, 0)}% |

Golden et al., Phoenix, 17 June 2004 (air max 41.0 °C, wind 0.86 m/s): exposed asphalt 63.5 / 28.5 °C (max / min), under
the canopy 37.0 / 27.7 °C: the brief quotes the range as −70% (−73% from these max / min; the paper has internal
inconsistencies). Here the empty bay's range shrinks by ${r0(Math.abs((P.empty.range / P.open.range - 1) * 100))}%, **outside** the spec's −60 to −75% band. Both ranges
differ from Phoenix: the open asphalt swings ${f1(P.open.range)} K here vs 35.0 K there, the bay under the canopy ${f1(P.empty.range)} K vs 9.3 K
(a different day: air 25–35 °C here, up to 41 °C there). The panel undersides are the shared warm-wall term (air + 2 K +
6 K·K↓/900). **Sensitivity (not shipped, not tuned):** with undersides at air + 2 K + 25 K·K↓/900 by day (a module about
25 K above the air in full sun, a typical rating figure, not from the brief) and air − 2 K at night (panels facing a
clear sky), the empty bay runs ${f1(PW.max)} / ${f1(PW.min)} °C (max / min), ${f1(PW.t15)} °C at 15:00, a range of ${f1(PW.range)} K: ${signed(PW.ratio * 100, 0)}% against
open asphalt, ${PW.ratio >= -0.75 && PW.ratio <= -0.6 ? 'inside' : 'outside'} the band. So the shared wall term is a likely cause of the miss. It stays as shipped:
the wall term is shared by every block, and the underside temperatures above are an assumption, not a source. The
panels' own temperature, their electricity and the air beneath are not modelled.

### Lot trees, cars and the hot-car card

Bay rows at 15:00: open ${f1(t.openBays.t15)} °C, under the trees ${f1(t.treeBays.t15)} °C (${signed(t.treeBays.t15 - t.openBays.t15)} K); at 23:00
${f1(t.openBays.t23)} and ${f1(t.treeBays.t23)} °C. Sacramento lots: tree shade −20 K on the asphalt, −1.3 K air at 0.5 m, −26 K in
car cabins [scott1999]; greening up to −7.26 K surface for one modelled lot, slight over the whole area [onishi2010]. The 5 m cells mix crown shade and sun, so the cell
means differ by less than a spot right under a crown.

The hot-car card is **information only**: cabins, car bodies and the air next to them are not simulated. It quotes
[vanos2018] (Tempe: steady-state mean cabin air 47.6 °C in sun vs 39.5 °C in shade, the paper's abstract; dashboard 69 vs 48 °C after 1 h, the press release), [mclaren2005] (+1.8 K per
5 min, 80% of the rise in 30 min, 47 °C at 22 °C ambient, cracked windows ineffective), [scott1999] (cabins −26 K under
trees), [levinson2011] (black vs silver roof up to 25 K, cabin 5–6 K), [matias2025] (air up to 3.8 K warmer next to a black car), [matias2026] (black car roofs about 71 °C, unverified)
and [nsc] (1,010 US child hot-car deaths 1998–2024, 39 in 2024; via the brief).

### The rusty shed: evening cooling

Fastest evening cooling of each class mean (largest 15-min rate from 16:00 to 1 h after sunset, ${hhmm(st.set)}) and the
cooling over the first hour after sunset:

| Surface | fastest K/h, at | first hour after sunset K |
|---|---|---|
${cool.join('\n')}

The shed roof (C ${MATERIALS.rustShed.thinC.value / 1000} kJ m⁻² K⁻¹, time constant C/(4εσT³ + h_c) about ${f1(shedTau(T.air(st.set), st.hc))} min) cools fastest of all
as the low evening sun leaves it, and is already near its night balance with the sky at sunset; after sunset it cools
**more slowly** than the slabs, which still have heat to lose. So the brief's "steepest cooling after sunset" is **not**
met: band 4 counts as missed. The evening-window row in the table below (16:00 to sunset + 1 h, peaking two hours before
sunset) is supplementary and does not count. At 23:00 the roof is ${signed(t.shed.t23 - st.air.t23)} K from the air.

### Thin layers and sensitivity

Thin paving (a lower effective admittance, \`thinPaving\` ${MODEL.thinPaving.value}; not in the scene) on ${th.n} open-asphalt cells: daily
max ${f1(th.ref.max)} → ${f1(th.thin.max)} °C, min ${f1(th.ref.min)} → ${f1(th.thin.min)} °C (hotter by day, cooler at night). With the Stempihar admittance
(${r0(hma.mu)}): max ${f1(th.stempihar.max)} °C, min ${f1(th.stempihar.min)} °C.

One value at a time at the ends of its range, the class run again on every sixth of its cells (°C; differences against
the shipped model's other classes; bands: asphalt − soil at 23:00 +2 to +6 K, asphalt − lawn +3 to +8 K, concrete − asphalt
at 15:00 −5 to −12 K and at 23:00 ±2 K, soil − asphalt at 23:00 ≤ −2 K):

| Case | 15:00 | 23:00 | asphalt − soil 23:00 | asphalt − lawn 23:00 | − asphalt 15:00 | − asphalt 23:00 |
|---|---|---|---|---|---|---|
${sensRows.join('\n')}

| Shed case | 15:00 | 23:00 | 23:00 − air |
|---|---|---|---|
${shedRows.join('\n')}

Bands 1 (asphalt − soil) and 5 (soil − asphalt at 23:00) pass by ${margin} K only: a darker soil (α 0.20, asphalt − soil
${signed(sv('soil α 0.20').d23soil, 2)} K) or a lighter aged asphalt (α 0.15, ${signed(sv('asphalt α 0.15').d23soil, 2)} K), both inside their ranges, puts them outside; the
Stempihar asphalt admittance (1570: ${signed(sv('asphalt μ 1570').d23soil, 2)} K) or Oke's dry soil (600: ${signed(sv('soil μ 600').d23soil, 2)} K) widens the gap. A light
concrete (α 0.35) or a dark one (0.15) moves the 15:00 gap to ${signed(sv('concrete α 0.35').d15asp, 1)} or ${signed(sv('concrete α 0.15').d15asp, 1)} K (band −12 to −5 K). The shed stays
${f1(Math.min(...shedSpan))}–${f1(Math.max(...shedSpan))} K below the air at 23:00 across its ranges. All shipped values were set from the brief before
the first model run and not changed after the bands were checked.

### Walkers

Walkers use the shade weights of blocks 1–5 [melnikov]; the PV canopy counts as crown shade (weight 0.92 at full heat),
as the block-5 screens. At 15:00 the walkers crossing the lot take the footpath under the trees or the canopy
(${lotRoute.map((r) => `${r.id} ${Math.round(r.second * 100)}%`).join(', ')}); ${wk.building + wk.canopy} of ${wk.n} people resting sit in shade, and walkers' density in shade is ${f1(wk.ratio)}
times that in sun on the walkable ground (footpaths, yard, lawn). The sweat cue is as before.

### Acceptance bands (block 6)

${bands6Markdown(rows)}

### Disclosures (block 6)

- **Air fixed:** the heat the lot gives the air at night, and the warm air next to cars, are quoted, not simulated.
- **No measured night W m⁻² for a car park** was found; the night release is the model's alone.
- **Brownfield values are assumptions:** ballast, soil and scrub (albedo, admittance, evaporation) and the shed's albedo are
  the brief's assumptions; the shed's emissivity is from emissivity tables (0.69–0.88, unverified); the lot's car share is
  from the drawn cars (the brief's 30–35% rule of thumb is unverified).
- **Cars are a sub-grid shade**, the lot full all day; their shadows are not offset with the sun; cabins are not modelled
  (the hot-car card is information only).
- **Golden et al. 2007** has internal inconsistencies; several other figures are from abstracts or press only
  (Asaeda, Zhu, Hoehne, Matias) and flagged unverified.
- **Misses:** bands 4 (the shed's steepest cooling after sunset) and 6 (the PV canopy's range reduction) are missed (above);
  bands 1 and 5 pass by ${margin} K and are sensitive to albedos inside their ranges (Sensitivity). Not tuned.
- **Footpaths narrower than the grid:** the 2 m concrete footpaths between the bays are drawn and walkable (2 m grid);
  the 5 m model sees the asphalt around them.
- **Drawing:** in the thermal view parked cars are drawn as outlines over the heat wash of the ground beneath (cell
  means); the PV canopy is drawn like the block-5 screens (the wash shows through).
`;
}
