// docs/sources.md section for block 8 (school campus playground), generated
// from the code and model runs (scripts/campus.mjs).
import { BASIS, MATERIALS } from '../engine/materials.js';
import { CP, BURN_CLASS, efAt } from '../engine/campus.js';
import { base8, bands8, bandVerdicts, sensitivity8, walkers8, burn8, CP_NOTES } from './campus.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const cell = (k) => {
  const p = CP[k];
  return `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'} (${CP_NOTES[k]})`;
};

/** Block 8 acceptance table (also checked by the tests). */
export function bands8Markdown(rows) {
  const v = (r) => (r.unit === '' ? r.value.toFixed(3) : r.value.toFixed(2));
  const b = (r) => (r.lo === null && r.hi === null ? '— (reported)' : r.lo === null ? (r.hi < 0 && r.hi > -1e-3 ? '< 0' : `≤ ${+r.hi.toFixed(3)}`) : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const verdict = (r) => (r.supp ? `${r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.inside ? 'inside' : '**outside**');
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${verdict(r)} |`);
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside).length;
  const bv = bandVerdicts(rows);
  const met = Object.keys(bv).filter((k) => bv[k]);
  const missed = Object.keys(bv).filter((k) => !bv[k]);
  return `| Check (spec #12) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${counted.length} counted checks fall outside their band; ${rows.length - counted.length} supplementary rows are not counted. By the brief's bands: ${met.length} of ${met.length + missed.length} met (${met.join(', ')})${missed.length ? `; missed: ${missed.join(', ')}` : ''}. They are reported, not tuned away: every input is the brief's central value (or the shared value the brief names), set before the first model run.`;
}

export function campusMarkdown() {
  const { scene, world, T, st, C, water, setup } = base8();
  const rows = bands8();
  const sens = sensitivity8();
  const wk = walkers8(15);
  const wk12 = walkers8(12);
  const b15 = burn8(15);
  const b12 = burn8(12);
  const t = st.table;
  const s12 = st.split[12];
  const s15 = st.split[15];
  const params = Object.keys(CP).map((k) => `| \`${k}\` | ${cell(k)} |`);
  const NAMES = { turf: 'artificial turf (the pitch)', grass: 'natural grass (the field, no crown)', track: 'running track (no crown)', courts: 'acrylic courts (no crown)', rubber: 'playground rubber (all)', sail: 'rubber with its centre under a sail', openRubber: 'rubber, no crown, not under a sail' };
  const classes = Object.keys(NAMES).map((k) => `| ${NAMES[k]} (\`${k}\`) | ${t[k].n} | ${f2(t[k].svf)} | ${f1(t[k].ts[5])} | ${f1(t[k].ts[12])} | ${f1(t[k].ts[14])} | ${f1(t[k].ts[15])} | ${f1(t[k].ts[23])} | ${f1(t[k].tmrt[12])} | ${f1(t[k].tmrt[15])} |`);
  const split = ['sun', 'sail', 'tree'].map((k) => `| ${k === 'sun' ? 'in full sun (sunlit > 0.95)' : k === 'sail' ? 'in a sail\'s shadow only (sunlit < 0.35)' : 'in a crown\'s shadow only (sunlit < 0.35)'} | ${s12[k].n} / ${s15[k].n} | ${f1(s12[k].ts)} / ${f1(s15[k].ts)} | ${f1(s12[k].tmrt)} / ${f1(s15[k].tmrt)} |`);
  const wrows = water.rows.map((r) => `| ${hm(r.h)} | ${f2(efAt((r.h - CP.irrigateHour.value) * 60))} | ${f1(r.air)} | ${f1(r.dry)} | ${f1(r.wet)} | ${signed(r.d)} |`);
  const burnRows = (b) => Object.entries(b).map(([id, n]) => `${MATERIALS[id].name} ${n}`).join(', ');
  const ws = sens.store;
  return `## Block 8: school campus playground

The eighth block (\`cities/campus\`) is an invented 400 m school campus at 35° N on a summer day-camp day: a 400 m running
track (PU / EPDM on asphalt; 36.5 m radius, 84.39 m straights, 8 lanes) around an artificial-turf football pitch, three
acrylic basketball courts, a natural grass field, a playground on poured rubber with a slide, climbing frames, swings, two
shade sails (${scene.screens.length}, ${CP.sailHeight.value} m up) and shade trees, the teaching block and a gym on the north road, a staff car park (${scene.cars.length}
cars) and trees along the edges. The design day is block 1's (35° N, 20 July, air 25–35 °C, wind 1.5 m/s, vapour pressure
20 hPa); 20 July falls in the school holidays, so the children are at a day camp. Watering the pitch at ${hm(CP.irrigateHour.value)} is \`I\`, the panel
button or \`?irrigate=1\` (default off); the contact-burn hatching is \`U\`, the panel button or \`?burn=1\` (default off).
Its research brief is [\`docs/research/campus-brief.md\`](research/campus-brief.md).

### Block 8 parameters

The block's materials (\`turf\`, \`track\`, \`acrylic\`, \`rubber\`, \`shadeSail\`) are in the parameter table above; they
are cut from the other pages at build time (\`@page campus\` in \`engine/materials.js\`). The grass field is the shared
irrigated lawn (\`grass\`, α 0.25; the brief lists 0.23 and calls it the existing value), the paving \`concrete\`, the roads
and the car park \`asphalt\`, the roofs \`membrane\` and \`metal\` (the gym), the trees \`canopy\`. The poured rubber of the
playground has no row in the brief: its PU / EPDM track row is used (an *interpretation*). The block's own values live in
\`engine/campus.js\` (\`CP\`):

| Parameter | Value |
|---|---|
${params.join('\n')}

### Surfaces

Cell classes (ground cells picked by material and geometry before any result; \`cellClasses\` in \`engine/campus.js\`), mean
surface temperature (°C) and Tmrt of a standing adult (°C):

| Class | n | SVF | Ts 05:00 | Ts 12:00 | Ts 14:00 | Ts 15:00 | Ts 23:00 | Tmrt 12:00 | Tmrt 15:00 |
|---|---|---|---|---|---|---|---|---|---|
${classes.join('\n')}

The turf peaks at ${f1(st.turfPeak.t)} °C at ${hm(st.turfPeak.h)} (Hong Kong: 74.6 °C [jim2016]); at 15:00 it is ${signed(t.turf.ts[15] - t.grass.ts[15])} K on the grass
(review: 9.4–33.7 K [singh2024]; Penn State 20–30 K [nydoh]), and at 05:00 ${signed(t.turf.ts[5] - t.grass.ts[5])} K (Jim: both near 23 °C). Low admittance
(μ ${MATERIALS.turf.mu.value}) and a dark, dry surface make it fast both ways. The track and the courts are a thin coat on asphalt: at 15:00 the
track is ${signed(t.track.ts[15] - T.air(15))} K above the air and the courts ${signed(t.courts.ts[15] - T.air(15))} K (bands 5 and 6; weak sources [kinmen], [aoki2004],
vendor claims [courtVendor]).

Rubber of the playground by what shades the cell's centre (shadow polygons of the sails and the crowns; the cell's sunlit
share from the model), 12:00 / 15:00 (\`shadeSplit\`):

| Rubber | n | Ts °C | Tmrt °C |
|---|---|---|---|
${split.join('\n')}

Gilbert, Arizona at noon (air 41.6 °C): rubber 87.2 °C in sun, 46.7 °C under a sail, 42.2 °C under a tree [vanos2016]. Here the sail
cuts ${f1(s12.sun.ts - s12.sail.ts)} K at noon and ${f1(s15.sun.ts - s15.sail.ts)} K at 15:00 (band 7 asks 25 K or more at the air's peak: **missed** at 15:00); the sail cells sit
${signed(s15.sail.ts - T.air(15))} K above the air (inside 0–8 K). The tree-shaded cells at 15:00 are the cells east of the crowns, in their shade only since
early afternoon and still warm from the morning sun: ${signed(s15.tree.ts - T.air(15))} K above the air (${s15.tree.n} cells; ${signed(s12.tree.ts - T.air(12))} K at noon), outside the
brief's 0–5 K (band 8 **missed**). The crowns pass 0.17 of the sun (the shared canopy) and the sail 0.20.

### Watering the pitch

The brief's pulse [brief8]: EF(t) = EF_res + (${CP.efPeak.value} − EF_res)·exp(−t/τ), EF_res ${CP.efRes.value}, τ ${CP.irrigateTau.value} min, from ${hm(CP.irrigateHour.value)}, on the turf cells only.
It runs through the per-minute path of the block-5 water store (\`opts.splash\` with \`efOnly\` and a \`pulse\`; no water store,
EF·max(Q*, 0) as everywhere else); the watered turf cells are a second run of just those cells (${setup.cells.length}), merged into the dry model
(no lateral coupling). Turf means:

| Time | EF | air °C | dry °C | watered °C | difference |
|---|---|---|---|---|---|
${wrows.join('\n')}

The largest cooling, ${f1(-water.min.d)} K at ${hm(water.min.h)}, leaves the turf ${f1(water.min.wet - water.min.air)} K above the air: the measured drops to near the air
(Brigham Young University 79 → 29 °C [nydoh]; Penn State 54–71 → 24 °C [mcnitt2008]) are **not reproduced** (band 9 missed). EF caps the
evaporation at ${CP.efPeak.value} of the net radiation (a few hundred W m⁻² in the early afternoon), while real sprinkler water cools the infill with its own heat
capacity and evaporates from a 70 °C surface far faster than the net radiation alone allows. The recovery is inside the band
(${Math.round(water.recovered * 100)}% of the cooling gone 30 min later; ${f2(water.residual)} K left after 3 h), but of a small drop. Not tuned.

For comparison only (supplementary, not shipped): the block-5 water store on the turf (bulk evaporation from W0 ${ws.params.w0} mm with
β ${ws.params.beta} and W_c ${ws.params.wc} mm, the hutong splash values, which were not set for turf) cools the turf ${f1(-ws.min.d)} K by ${hm(ws.min.h)}, to
${f1(ws.min.wet - ws.min.air)} K above the air, and ${Math.round(ws.recovered * 100)}% of that is gone 30 min later: the shape of the measurements, but with
parameters nobody measured for turf.

### Contact burns

ISO 13732-1 via CENELEC Guide 29 [iso13732], 1 min of contact: metal ${CP.burnMetal.value} °C, stone and concrete ${CP.burnStone.value} °C, plastics and wood
${CP.burnPlastic.value} °C (10 min: ${CP.burn10min.value} °C; 8 h: 43 °C). Material classes: ${Object.entries(BURN_CLASS).map(([id, c]) => `\`${id}\` ${c}`).join(', ')}; grass, water and leaves
have none. Asphalt is read with stone and concrete (an *interpretation*). The overlay hatches every ground cell above its
limit at the hour shown (\`burnCells\`). Cells over the limit at 12:00: ${burnRows(b12)}; at 15:00: ${burnRows(b15)}. The slide
is drawn, not modelled (no metal ground is hatched); Vanos et al. measured a slide at 71.7 °C in sun [vanos2016].

### Children and walkers

Children come out at the play times (${CP.playTimes.value}, an engine assumption) and take the cheapest play spot with room left,
the cost being the shade weight of the spot (sun 1, building shade 0.84, tree or sail shade 0.92 at full heat [melnikov]). At
15:00 ${Math.round(wk.kidShade * 100)}% of the ${wk.kids} children play in shade (${wk.shadeCapacity} of the ${scene.kids.spots.reduce((a, s) => a + s.cap, 0)} play places are shaded then; at 12:00 ${Math.round(wk12.kidShade * 100)}%). They are drawn at
${CP.kidSize.value} of an adult. The grown-ups (walkers and people waiting) use the weights of blocks 1–7: at 15:00 ${Math.round(wk.dwellShade * wk.dwellers)} of ${wk.dwellers}
waiting sit in shade, and walkers' density in shade is ${f1(wk.ratio)} times that in sun. The sweat cue is as before.

No measured child-height against adult-height Tmrt was found [brief8], and the model cannot resolve one: the ground share a
person sees within R from height z is R²/(R² + z²), so 90% lies within 3 m at 1.0 m and 4.5 m at 1.5 m, both less than one 5 m
cell. The children card is qualitative: children are nearer the hot ground [vanos2017], [vanos2015], and the air at 0.3 m can be
up to 1 K warmer than at 1.5 m [paolini].

### Sensitivity

One value at a time, within the brief's ranges, on the cells it touches:

| Case | turf peak 14–15 h °C | turf − grass 15:00 K | turf − grass 05:00 K |
|---|---|---|---|
| shipped (α ${MATERIALS.turf.alpha.value}, μ ${MATERIALS.turf.mu.value}) | ${f1(st.turfMax)} | ${signed(t.turf.ts[15] - t.grass.ts[15])} | ${signed(t.turf.ts[5] - t.grass.ts[5])} |
${sens.turf.map((x) => `| ${x.label} | ${f1(x.peak)} | ${signed(x.d15)} | ${signed(x.d05)} |`).join('\n')}

| Case | above the air at 15:00, K |
|---|---|
| courts, shipped α ${MATERIALS.acrylic.alpha.value} | ${signed(t.courts.ts[15] - T.air(15))} |
${sens.courts.map((x) => `| ${x.label} | ${signed(x.dt)} |`).join('\n')}
| track, shipped α ${MATERIALS.track.alpha.value} | ${signed(t.track.ts[15] - T.air(15))} |
${sens.track.map((x) => `| ${x.label} | ${signed(x.dt)} |`).join('\n')}

| Case | under the sail above the air, 15:00 | sun − sail, 15:00 | Tmrt sun − sail, 12:00 |
|---|---|---|---|
| shipped, transmission ${MATERIALS.shadeSail.tr.value} | ${signed(s15.sail.ts - T.air(15))} K | ${signed(s15.sun.ts - s15.sail.ts)} K | ${signed(s12.sun.tmrt - s12.sail.tmrt)} K |
${sens.sail.map((x) => `| ${x.label} | ${signed(x.sail)} K | ${signed(x.cut)} K | ${signed(x.tmrt12)} K |`).join('\n')}

| Irrigation pulse | at the largest cooling, above the air | largest cooling | gone 30 min later | left after 3 h |
|---|---|---|---|---|
| shipped: τ ${CP.irrigateTau.value} min, EF_res ${CP.efRes.value} | ${signed(water.min.wet - water.min.air)} K | ${signed(water.min.d)} K | ${Math.round(water.recovered * 100)}% | ${f2(water.residual)} K |
${sens.pulse.map((x) => `| ${x.label} | ${signed(x.min)} K | ${signed(x.drop)} K | ${Math.round(x.recovered * 100)}% | ${f2(x.residual)} K |`).join('\n')}

The courts' miss (band 6) closes at the light end of the court albedo range (0.30) and the sail's 25 K (band 7) at the
dense end of the sail range (0.10); the shipped values are the brief's middle values and were not moved. No pulse in the
brief's ranges brings the watered turf within 5 K of the air.

### Acceptance bands (block 8)

Evaluated at 15:00, the air's peak (the brief's bands are for Ta peak 35 °C), unless the band names its hour: the turf peak
at 14–15 h, the night at 05:00, the irrigation from 14:00, Tmrt at noon.

${bands8Markdown(rows)}

### Disclosures (block 8)

- **Air fixed:** no near-ground air layer (54 °C at 15 cm over a 74 °C pitch in Hong Kong [jim2016] is not modelled), no
  cooling of the air by the grass or the sprinklers; a child's exposure on the turf is understated.
- **No height-resolved Tmrt:** every Tmrt is for a standing adult; the children card is qualitative, and no child-height
  number is quoted.
- **Burn limits depend on the material and the contact time:** the overlay uses the 1-min limits per material class
  (asphalt read with stone and concrete); children's longer contact makes the 10-min ${CP.burn10min.value} °C the safer reading; the slide
  is not modelled.
- **Irrigation lasts minutes, and here it is weak:** the brief's EF pulse cools the turf ${f1(-water.min.d)} K at most, far short of the measured
  drops to near the air (band 9 missed); not tuned. The bulk water store of block 5 would come closer but has no turf values.
- **Shade structures hold heat after sunset:** the cells under the sails see the cloth as a warm wall (air + 2 K, more by
  day) instead of the sky, so they stay a little warmer at night [middel2021]; the cloth's own temperature is not computed.
- **Weak evidence:** the track (one school report, one study) and the courts (vendor claims) bands are unverified; the
  play-surface rubber borrows the track's values.
- **Misses:** band 6 (courts ${signed(t.courts.ts[15] - T.air(15))} K above the air, against 15–25 K), band 7 (sun − sail ${f1(s15.sun.ts - s15.sail.ts)} K at 15:00, against ≥ 25 K),
  band 8 (tree-shaded rubber ${signed(s15.tree.ts - T.air(15))} K, against 0–5 K; ${s15.tree.n} cells) and band 9 (watered turf ${f1(water.min.wet - water.min.air)} K above the air, against
  ≤ 5 K) are outside; each card that states the number says so. Reported, not tuned.
- **Invented campus:** layout, the sail height, the play times and the play spots are assumptions; 20 July is a holiday,
  so the children are at a day camp.
`;
}
