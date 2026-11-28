// docs/sources.md section for block 10 (urban village and informal edge),
// generated from the code and model runs (scripts/village.mjs).
import { BASIS, MATERIALS } from '../engine/materials.js';
import { VG, laneSvf } from '../engine/village.js';
import { DT_STOPS } from '../engine/thermal.js';
import { base10, bands10, bandVerdicts, sensitivity10, causes10, walkers10, sheetRun, sunCheck10, VG_NOTES } from './village.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (k) => {
  const p = VG[k];
  return `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'} (${VG_NOTES[k]})`;
};
const ROOFS = [['rustTin', 'rusty corrugated iron'], ['galvTin', 'galvanised sheet'], ['asbestosRoof', 'asbestos-cement sheet'], ['tarpRoof', 'tarpaulin'], ['whiteTinAged', 'iron painted white years ago (weathered)']];

/** Block 10 acceptance table (also checked by the tests). */
export function bands10Markdown(rows) {
  const v = (r) => (r.unit === '' ? r.value.toFixed(3) : r.value.toFixed(2));
  const b = (r) => (r.lo === null && r.hi === null ? '— (reported)' : r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : r.lo === r.hi ? `${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const verdict = (r) => (r.supp ? `${r.lo === null && r.hi === null ? 'reported' : r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.inside ? 'inside' : '**outside**');
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${verdict(r)} |`);
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside).length;
  const bv = bandVerdicts(rows);
  const met = Object.keys(bv).filter((k) => bv[k]);
  const missed = Object.keys(bv).filter((k) => !bv[k]);
  return `| Check (spec #16) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${counted.length} counted checks fall outside their band; ${rows.length - counted.length} supplementary rows are not counted. By the brief's bands: ${met.length} of ${met.length + missed.length} met (${met.join(', ')})${missed.length ? `; missed: ${missed.join(', ')}` : ''}. Band 7 is counted as met but is semi-constructed (its size follows from the calibration target × the roofs' relative cooling; it holds for every target in the brief's +2 to +4 K), so only ${met.length - 1} met bands are independent of a calibration. They are reported, not tuned away: every parameter value is the brief's central value (or the shared value the brief names), and the layout and every value were committed before the first model run of these bands; nothing in the scene's geometry or inputs changed after it (only the margin notes' label offsets, see Disclosures).`;
}

export function villageMarkdown() {
  const { scene, world, T, st, n } = base10();
  const rows = bands10();
  const sens = sensitivity10();
  const cz = causes10();
  const wk = walkers10(15);
  const L = st.lanes;
  const nn = VG.noon.value;
  const ni = VG.night.value;
  const params = Object.keys(VG).map((k) => `| \`${k}\` | ${cell(k)} |`);
  const laneRow = (name, x) => `| ${name} | ${x.n} | ${f1(x.W)} | ${f1(x.H)} | ${f3(x.svf)} | ${f3(x.svfGrid)} | ${f3(x.svfCentre)} | ${Math.round(x.sun[nn] * 100)}% / ${Math.round(x.sun[15] * 100)}% | ${f1(x.tmrt[nn])} / ${f1(x.tmrt[15])} / ${f1(x.tmrt[ni])} | ${f1(x.ts[15])} / ${f1(x.ts[ni])} |`;
  const laneRows = [...L.byW.filter((x) => x.n).map((x) => laneRow(`village lanes ${x.W} m`, x)), laneRow('all village lanes 1.5–3 m (the bands\' set)', L.village), laneRow('Market Lane 6 m', L.market), laneRow('crossings (as the east–west lane)', L.cross), laneRow('alleys of the low-rise edge, 2 m', L.edge)];
  const roofRow = (grp) => ROOFS.filter(([id]) => grp[id]).map(([id, name]) => {
    const r = grp[id];
    return `| ${name} | ${r.n} | ${f1(r.ts15)} | ${f1(r.peak)} | ${f1(r.ts03)} | ${f1(r.radiant15)} / ${f1(r.radiant03)} | ${signed(r.airPeak)} |`;
  });
  const tarp = [MATERIALS.tarpRoof.thinC.value, 400].map((C) => ({ C, ...sheetRun('tarpRoof', C) }));
  const tarpRows = tarp.map((r) => `| tarpaulin, C ${r.C / 1000} kJ m⁻² K⁻¹${r.C === MATERIALS.tarpRoof.thinC.value ? ' (shipped, the floor)' : ' (a real sheet, the brief)'} | ${f2(r.factor)} | ${r.finite ? 'yes' : '**no** (NaN)'} | ${r.finite ? `${f1(r.min)}–${f1(r.max)} °C` : '—'} | ${r.finite ? `${f2(r.jump)} K` : '—'} |`);
  const thinRows = ['rustTin', 'galvTin', 'asbestosRoof', 'whiteTin', 'whiteTinAged'].map((id) => {
    const r = sheetRun(id, MATERIALS[id].thinC.value);
    return `| ${MATERIALS[id].name}, C ${MATERIALS[id].thinC.value / 1000} kJ m⁻² K⁻¹ | ${f2(r.factor)} | ${r.finite ? 'yes' : 'no'} | ${f1(r.min)}–${f1(r.max)} °C | ${f2(r.jump)} K |`;
  });
  const C = st.cool;
  const coolRow = (name, g) => (g ? `| ${name} | ${g.n} | ${f1(g.ts15)} | ${f1(g.cool15)} | ${signed(g.d15)} | ${f1(g.rad15)} → ${f1(g.radW15)} (${signed(g.dRad15)}) | ${signed(g.airPeakBare, 2)} → ${signed(g.airPeakWhite, 2)} (${signed(g.dAirPeak, 2)}) |` : '');
  const sensRust = sens.rust.map((r) => `| ${r.label} | ${f1(r.ts15)} | ${f1(r.peak)} |`);
  const sensAsb = sens.asb.map((r) => `| ${r.label} | ${f1(r.ts15)} | ${f1(r.peak)} |`);
  const sensProxy = sens.proxy.map((r) => `| ${r.label} | ${f1(r.radiant)} |`);
  const sensLane = sens.lane.map((r) => `| ${r.label} | ${f3(r.svf)} | ${f3(r.centre)} |`);
  const laneCause = cz.lane.map((r) => `| ${r.label} | ${signed(r.noon)} | ${signed(r.night)} |`);
  const sheetCause = cz.sheet.map((r) => `| ${MATERIALS[r.id].name} | ${f1(r.hu)} | ${f1(r.shipped)} | ${f1(r.ts15)} | ${f1(r.peak)} |`);
  const sun = (h) => T.sun(h);
  const sc = sunCheck10();
  return `## Block 10: urban village and informal edge

The tenth block (\`cities/village\`) is an invented 400 m block in the manner of a South China urban village (城中村) at
22.5° N on 20 July (air 27–35 °C, vapour pressure 28 hPa, wind 1 m/s; an assumed heat-wave day). West of Village Road
stand ${world.buildings.filter((B) => B.style === 'village').length} village houses of 6–8 storeys (18–24 m) built plot to plot, the "handshake buildings" (握手楼), with lanes
1.5–3 m wide between them and a 6 m market lane; flat concrete roofs, ${world.buildings.filter((B) => B.style === 'roofRoom').length} of them with a rooftop room under metal
sheeting. East of the road: the older village centre (an ancestral hall, its open square, a pond, three banyans). South of
Bus Road: a low-rise edge of single-storey rooms in ${world.buildings.filter((B) => B.style === 'room').length} runs, roofed with rusty corrugated iron, galvanised sheet,
asbestos-cement sheet or tarpaulin, some painted white by the residents, between 2 m alleys. The residents' white roofs
are \`W\`, the panel button or \`?coolroof=1\` (default off: they repaint the ${C.n} bare roofs marked in the scene); the
room under each sheet roof is \`O\`, the panel button or \`?under=1\`. Its research brief is [\`docs/research/village-brief.md\`](research/village-brief.md).

### Block 10 parameters

The block's materials (\`rustTin\`, \`galvTin\`, \`asbestosRoof\`, \`tarpRoof\`, \`whiteTin\`, \`whiteTinAged\`, \`slabRoof\`) are in
the parameter table above; they are cut from the other pages at build time (\`@page village\` in \`engine/materials.js\`).
Lanes and paths are the shared \`concrete\`, the roads \`asphalt\`, the yard \`drySoil\`, the pond \`water\`, the ancestral
hall \`greyTile\` (block 5). The block's own values live in \`engine/village.js\` (\`VG\`):

| Parameter | Value |
|---|---|
${params.join('\n')}

### The lanes (sub-grid)

A lane 1.5–3 m wide cannot be drawn on a 5 m grid: on the raster it is a 5 m gap, which sees about four times the sky
(below). Each lane is centred on a row (or column) of cell centres, so it keeps one cell; its houses cover the cells on
either side. The ${world.vg.lanes.length} lane cells take their sky view and direct sun from an endless canyon of the lane's own width W and
its two walls H1, H2 (the houses on either side; a rooftop room stands back from the lane, so its house's height):

- sky view of the floor (its mean over the width, crossed strings): F = (√(W² + H1²) + √(W² + H2²) − H1 − H2) / (2W);
  for equal walls √(1 + (H/W)²) − H/W, which for deep lanes is the brief's centre-line form cos(atan(2H/W)) to within 0.001
  (both are about W / 2H);
- sunlit share of the floor: s = clamp(1 − H_s·|d| / (W·tan β), 0, 1), H_s the wall on the sun's side and d the across-lane part of
  the unit vector toward the sun;
- a crossing of two lanes (with houses on all four corners) is taken as the east–west lane with the mean heights of its corner
  houses: the cross lane's extra sky and sun are not counted;
- the cell's own sky view also sets its share of the walls (1 − F) for the wall terms, as everywhere.

Lane cells: number, width W (m), wall height H (m), sky view canyon / 5 m raster (not used) / centre-line form, floor in
sun at ${nn}:00 / 15:00, Tmrt at ${nn}:00 / 15:00 / ${ni}:00 (°C), floor at 15:00 / ${ni}:00 (°C):

| Lanes | n | W | H | SVF | raster | centre line | sun | Tmrt | floor |
|---|---|---|---|---|---|---|---|---|---|
${laneRows.join('\n')}
| the open square (${st.square.n} cells, SVF ≥ 0.85; by day its sunlit cells) | ${st.square.n} | — | — | ${f3(st.square.svf)} | — | — | — | ${f1(st.square.tmrt[nn])} / ${f1(st.square.tmrt[15])} / ${f1(st.square.tmrt[ni])} | ${f1(st.square.ts[15])} / ${f1(st.square.ts[ni])} |

Air ${f1(st.air[nn])} / ${f1(st.air[15])} / ${f1(st.air[ni])} °C. The sun is ${f1(sun(nn).alt)}° high at ${nn}:00 (azimuth ${f1(sun(nn).az)}°) and ${f1(sun(15).alt)}° at 15:00, so a
straight-walled lane floor gets the sun at midday; the walls are the shared warm wall (air + 2 K + 6 K × K/900: ${f1(cz.wallNoon)} °C at ${nn}:00,
whatever their own shade). The lanes keep the people in them out of the night sky: at ${ni}:00 the village lanes are
${signed(L.village.tmrt[ni] - st.square.tmrt[ni])} K warmer in Tmrt than the open square, in line with the Pingshan traverses (heat island largest 20:00–24:00) [pingshan].

### Thin sheets and the 60 s step

A sheet roof is a thin layer, dTs/dt = G / C (no restore term). The explicit 60 s step is stable only while
Δt (4εσT³ + h_c) / C stays well below 2 (smooth below 1); with T = 340 K and h_c = ${f1(T.info.hc)} W m⁻² K⁻¹ a real
tarpaulin (about 0.4 kJ m⁻² K⁻¹, the brief) is past it and the run diverges. Every thin layer on this page holds C ≥ ${VG.thinFloor.value / 1000} kJ
(the brief's floor; \`checkThin\` refuses a scene that breaks it). Each sheet alone, in the open, on the design day:

| Sheet | stability factor | finite | daily range | largest 15-min change |
|---|---|---|---|---|
${tarpRows.join('\n')}
${thinRows.join('\n')}

At the floor the tarpaulin's time constant is about C / (4εσT³ + h_c) ≈ 110 s instead of about 20 s: on the stored 15-min
values the difference is small, but the floor slightly slows its rise and fall.

### Roofs

Ground-level rooms of the low-rise edge, by roof: number, surface at 15:00, the day's peak, at 03:00 (°C), the radiant proxy under
the roof at 15:00 / 03:00 (°C) and the illustrative room air's day's peak (K above the outdoor air):

| Roof | n | 15:00 | peak | 03:00 | radiant | air peak |
|---|---|---|---|---|---|---|
${roofRow(st.edge).join('\n')}

Rooftop rooms on the village houses:

| Roof | n | 15:00 | peak | 03:00 | radiant | air peak |
|---|---|---|---|---|---|---|
${roofRow(st.rooftop).join('\n')}

The flat concrete roofs of the village houses (${st.slab.n} cells): ${f1(st.slab.ts15)} °C at 15:00, ${f1(st.slab.ts22)} °C at ${ni}:00, ${f1(st.slab.ts03)} °C at 03:00; the room under a slab
is not computed. Measured rooms (quoted, not simulated): Delhi in April, tin roofs 33.4 °C indoors against 32.8 °C outdoors;
Yavatmal 3–4 K above outdoors in May–June [tasgaonkar2022]; Ahmedabad homes 34.6–35.8 °C under tin, 32.5–36.8 °C under
asbestos, 31.6–33.8 °C under concrete [vellingiri2020]; Ghana, metal-roofed rooms 4.5 K warmer by day than mud or thatch,
1.5 K cooler at night [wilby2021]; Bangkok, one unshaded house at midday in April, roof 68.1 °C and ceiling 49.2 °C (a shaded house's roof 45.5 °C) [khlongToey].

### Under the roof (proxies)

Not a simulation of the room (the brief's option: a radiant proxy and an information overlay):

- radiant: T_mrt,in⁴ = F_r·T_roof⁴ + (1 − F_r)·T_w⁴, T_w = Ta + ${VG.wallUp.value} K, F_r = ${VG.fr.value}; the ceiling is the roof sheet, taken
  as black at the roof's temperature (likely an overstatement under a bright galvanised underside, ε 0.25);
- air (illustrative only): ΔT = h_ci·(T_roof − Ta) / (h_ci + ρc_p·n·h/3600) with h_ci ${VG.hci.value}, h ${VG.roomH.value} m and
  n = ${f2(n)} air changes per hour, **calibrated** as the brief says, so the mean of the ${st.calib.n} bare rusty-iron rooms' daily peaks is
  +${VG.airTarget.value} K (the middle of the brief's +2 to +4 K): the share of (T_roof − Ta) that reaches the air is ${f3(st.share)}. Its band
  (7, bare tin) therefore holds by construction and is not counted. The white-paint change (band 7) is **semi-constructed**: the proxy is
  linear in T_roof − Ta, so the change is the target times the roofs' relative cooling (${signed(sens.target[1].rel, 3)} per K of target); it tests the
  model's roof-temperature ratio, not an independent indoor prediction (${sens.target.map((x) => `${signed(x.dAir, 2)} K at +${x.t} K`).join(', ')}). A card never
  shows it beyond ±${VG.airCap.value} K; the largest raw value in this model is ${f2(rows.find((r) => r.label.startsWith('8. Supplementary')).value)} K, so the cap does not bind here.

### The residents' white roofs

\`W\` repaints the ${C.n} marked bare roofs (iron and galvanised) with new white paint (albedo ${MATERIALS.whiteTin.alpha.value}) and runs those roof cells
again (the other cells are unchanged: there is no lateral coupling). Surface at 15:00 bare → white (°C), its change (K), the radiant
proxy at 15:00 (°C) and the illustrative air's day's peak (K above the outdoor air):

| Painted roofs | n | bare 15:00 | white 15:00 | change | radiant | air peak |
|---|---|---|---|---|---|---|
${[coolRow('rusty-iron rooms (the bands\' set)', C.rustRooms), coolRow('every painted rusty-iron roof', C.rust), coolRow('every painted galvanised roof', C.galv), coolRow('all painted roofs', C.all)].filter(Boolean).join('\n')}

Roofs the residents painted white years ago (weathered, albedo ${MATERIALS.whiteTinAged.alpha.value}) are ${f1(st.edge.rustTin.ts15 - st.edge.whiteTinAged.ts15)} K cooler than bare rusty iron at 15:00.
Measured: white paint on tin −1.1 K indoors, a cool-roof sheet −2.0 K, insulation under asbestos −2.4 K [vellingiri2020];
simulated, up to 91% fewer heat-stress hours [nutkiewicz2022]; a randomised trial's protocol [bunker2024].

### Walkers and residents

Walkers choose the shadier of two equal routes (a 2 m lane against the 6 m market lane, two lanes, two village lanes north–south,
the bus-road kerb against the tree-lined path, across the square, two alleys of the edge). At 15:00 their density in shade is
${f2(wk.ratio)} times that in sun. ${wk.dwellers} people dwell at doorways in the lanes, under the banyans, on the square and in the yard;
at 15:00 ${Math.round(wk.shade * 100)}% of them sit in shade. From 20:00 to 01:00, ${scene.rooftops.length * 2} residents sit on ${scene.rooftops.length} roofs (\`engine/vgui.js\`,
a pure function of the hour; their heat is their roof cell's).

### Sensitivity

One change at a time, inside the brief's ranges (docs only). Rusty-iron rooms (shipped ${f1(sens.shipped.rust15)} °C at 15:00, peak ${f1(sens.shipped.rustPeak)} °C):

| Case | 15:00 °C | peak °C |
|---|---|---|
${sensRust.join('\n')}

Asbestos-cement rooms (shipped ${f1(sens.shipped.asb15)} °C at 15:00):

| Case | 15:00 °C | peak °C |
|---|---|---|
${sensAsb.join('\n')}

No value inside the brief's ranges brings asbestos cement into 50–62 °C (band 3). Weathered white paint (α 0.50) instead of new
on the painted rusty-iron rooms: ${signed(sens.white[0].d15)} K at 15:00 against bare (band 2's 15–25 K: outside).

Radiant proxy under bare rusty iron at 15:00 (shipped ${f1(sens.shipped.radiant15)} °C):

| Case | °C |
|---|---|
${sensProxy.join('\n')}

h_ci 1 or 1.5: n is recalibrated (${sens.hci.map((h) => h.label.replace(/^h_ci [\d.]+ \(n recalibrated: /, '').replace(')', '')).join(' and ')}), the share reaching the air stays ${f3(sens.hci[0].share)} and the
white-paint change ${signed(sens.hci[0].dAir, 2)} K.

Band 7 over the brief's calibration targets (bare tin peaking at +2 to +4 K): the white-paint change scales one for one with the target.

| Target | white-paint change of the air peak |
|---|---|
${sens.target.map((x) => `| +${x.t} K${x.t === VG.airTarget.value ? ' (shipped)' : ''} | ${signed(x.dAir, 2)} K |`).join('\n')}

Every target in the brief's range lands inside −1 to −2.5 K, so band 7 confirms only the model's roof-temperature ratio (semi-constructed).

Lane width at the village's mean wall height (the canyon floor's mean and the brief's centre-line form):

| Lane | SVF | centre line |
|---|---|---|
${sensLane.join('\n')}

A 1 m lane (the brief's lower end) would sit at ${f3(laneSvf(L.village.H, L.village.H, 1))}, below band 4's 0.03; the scene's narrowest lanes are 1.5 m.

### Causes of the misses (docs-only runs)

Nothing shipped changes. Band 5 (village lanes at ${nn}:00, Tmrt − air, shipped ${signed(cz.lane[0].noon)} K against ≤ +8 K): the lane cells run again
alone with (a) their walls at air + 2 K all day (lane walls are mostly in shade; the shared term's sun part adds ${f1(cz.wallNoon - st.air[nn] - 2)} K at ${nn}:00),
(b) no direct sun on the lane floor or the person (as balconies, overhangs and washing would give), (c) both. Tmrt − air at
${nn}:00 and lanes − square at ${ni}:00 (K):

| Run | ${nn}:00 | ${ni}:00 |
|---|---|---|
${laneCause.join('\n')}

Each cause alone leaves the lanes outside; together they bring them inside (${signed(cz.lane[3].noon)} K). Band 6 stays inside in every run.

Bands 1 and 3: the sheets with a heat loss through their underside to a room at the outdoor air, h_u = h_ci + 4εσT³ at
340 K, added to h_c (a docs run with opts.wind; the room is taken at the air temperature, slightly overstating the loss):

| Sheet | h_u W m⁻² K⁻¹ | shipped 15:00 °C | with h_u 15:00 °C | with h_u peak °C |
|---|---|---|---|---|
${sheetCause.join('\n')}

With the underside loss asbestos cement comes inside band 3 and rusty iron falls just below band 1's 60 °C: the engine's
thin layer, which loses heat from its top only, is the likely common cause (band 1 is met as shipped).

### Acceptance bands

At an air of 35 °C at 15:00 (the brief's bands for Ta 35, clear), "noon" 12:00 local time, night ${ni}:00.

${bands10Markdown(rows)}

Misses:
- **Band 3** (asbestos cement ${f1(st.edge.asbestosRoof.ts15)} °C at 15:00 against 50–62 °C): the thin layer here has no loss through its underside to the room
  (tested above, docs only: ${f1(cz.sheet[1].ts15)} °C with it); no parameter in the brief's ranges brings it inside (Sensitivity). Stated on the metal-roofs card.
- **Band 5** (village lanes at ${nn}:00, ${signed(L.village.tmrt[nn] - st.air[nn])} K against ≤ +8 K): two causes, tested above (docs only): the direct sun on a
  straight-walled lane floor at midday (the sun ${f1(sun(nn).alt)}° high; no balconies or overhangs) and the shared warm-wall term
  (engine), which sets every wall at air + ${f1(cz.wallNoon - st.air[nn])} K at ${nn}:00 whether in sun or shade. Stated on the lanes card.

### Disclosures

- **Invented place:** no real village, addresses or people; the layout (plots, storeys, lane widths, roofs, which roofs are painted)
  is a design choice inside the brief's ranges, and it was committed before the first model run of the bands; nothing in the
  scene's geometry or inputs changed after it. Afterwards only the margin notes' label offsets (\`notes[].dx, dy\`) were moved, so
  the labels stay on screen at the opening view (drawing only).
- **Air fixed:** no warm air held in the lanes at night, no wind in the lanes (Ren et al. 2025, cited by the brief for the lanes'
  wind shadows, is not used), no heat from people, cooking or appliances.
- **Lanes:** an endless straight-walled canyon per lane cell (no balconies, air-conditioner boxes, overhangs or washing); a crossing
  is taken as the east–west lane; the edges of the village keep the grid's values. The raster's sky view of the same cells
  (${f3(L.village.svfGrid)}) is reported, not used.
- **Walls:** the shared warm-wall term (air + 2 K + 6 K × K/900, all orientations, in sun or shade) is an engine assumption; in a lane
  that sees almost only walls it dominates Tmrt (band 5).
- **Sheets:** thin layers that exchange heat at their top only (no loss into the room, bands 1 and 3); the tarpaulin held at the 2 kJ
  floor; no measured albedo for rusty iron, asbestos cement or tarpaulin (the brief's assumptions).
- **Indoor values are proxies:** the radiant proxy treats the ceiling as black at the roof's temperature; the air figure is
  illustrative, calibrated to the brief's band (so that band is by construction) and capped at ±5 K; the room under a concrete slab is not computed.
- **Thermal palette:** the default heat view (surface minus air, issue #36) tops out at +${DT_STOPS.at(-1)[0]} K, ${f1(T.air(15) + DT_STOPS.at(-1)[0])} °C at 15:00 (air ${f1(T.air(15))} °C), so rusty iron at
  15:00 (${f1(st.edge.rustTin.ts15)} °C) keeps its own colour; the sheets near their daily peak (up to
  ${f1(Math.max(...Object.values(st.edge).filter(Boolean).map((r) => r.peak)))} °C) may reach the top colour. The absolute scale (the legend's °C toggle) tops
  out at 70 °C, so there both show in the top colour; the heat cards give the numbers.
- **Engine sun** (\`sun.js\`, issue #24): against suncalc at this site, the altitude differs by ${sc.map((x) => `${signed(x.dAlt, 2)}° at ${x.h}:00`).join(' and ')} (azimuth ${sc.map((x) => `${signed(x.dAz, 2)}°`).join(', ')}); the village lanes' sunlit floor is ${sc.map((x) => `${Math.round(x.lit * 1000) / 10}% against ${Math.round(x.litRef * 1000) / 10}%`).join(' and ')} with the reference sun: too small to move band 5.
- **Language:** "urban village (城中村)", "informal settlement", "residents"; vulnerability is described as exposure plus a lack of
  resources, with cited and hedged figures only; asbestos cement is named a health hazard in one line, without advice. The block's
  text is checked for the words the brief rules out (\`tests/unit/village.test.mjs\`).
`;
}
