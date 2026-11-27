// docs/sources.md section for block 11 (desert courtyard neighbourhood),
// generated from the code and model runs (scripts/desert.mjs).
import { BASIS, MATERIALS, MODEL } from '../engine/materials.js';
import { DS, KINDS } from '../engine/desert.js';
import { base11, bands11, bandVerdicts, sensitivity11, causes11, walkers11, sunCheck11, DS_NOTES } from './desert.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (k) => {
  const p = DS[k];
  const v = Array.isArray(p.value) ? p.value.join('–') : p.value;
  return `${v} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'} (${DS_NOTES[k]})`;
};
const NAME = { sail: 'shade sails (τ 0.15, 4 m)', ramada: 'ramada (opaque, 3.2 m)', arcade: 'arcade (opaque, 3.5 m, beside the shops)', patio: 'café patio roof (opaque, 3 m, concrete)', mesquite: 'mesquites (crown τ 0.30, calibrated)', paloVerde: 'palo verdes (crown τ 0.30, as the mesquite)' };

/** Block 11 acceptance table (also checked by the tests). */
export function bands11Markdown(rows) {
  const v = (r) => (r.unit === '' ? r.value.toFixed(3) : r.value.toFixed(2));
  const b = (r) => (r.lo === null && r.hi === null ? '— (reported)' : r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : r.lo === r.hi ? `${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const verdict = (r) => (r.supp ? `${r.lo === null && r.hi === null ? 'reported' : r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.inside ? 'inside' : '**outside**');
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${verdict(r)} |`);
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside).length;
  const bv = bandVerdicts(rows);
  const met = Object.keys(bv).filter((k) => bv[k]);
  const missed = Object.keys(bv).filter((k) => !bv[k]);
  return `| Check (spec #17) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${counted.length} counted checks fall outside their band; ${rows.length - counted.length} supplementary rows are not counted. By the brief's ten bands: ${met.length} of ${met.length + missed.length} met (${met.join(', ')})${missed.length ? `; missed: ${missed.join(', ')}` : ''}. Band 7's only counted row (the palo verdes) is semi-constructed: their crown is the mesquite's, calibrated to the measured −16.7 K (the mesquite row is by construction and supplementary), so band 7 does not test the model independently. They are reported, not tuned away: every other parameter value is the brief's central value (or the shared value the brief names), committed before the first band run.`;
}

export function desertMarkdown() {
  const { scene, world, T, st } = base11();
  const rows = bands11();
  const sens = sensitivity11();
  const cz = causes11();
  const wk = walkers11(15);
  const sc = sunCheck11();
  const h = DS.hour.value;
  const nn = DS.noon.value;
  const ni = DS.night.value;
  const F = world.ds.F;
  const params = Object.keys(DS).map((k) => `| \`${k}\` | ${cell(k)} |`);
  const kindRow = (k) => {
    const x = st.shade[k];
    const c = (hh) => (x[hh].n ? `${f1(x[hh].tmrt)} (${signed(x[hh].d)})` : '—');
    return `| ${NAME[k]} | ${F[k].length} | ${x[h].n} / ${x[ni].n} | ${x[h].n ? f2(x[h].svf) : '—'} | ${x[h].n ? `${Math.round(x[h].sun * 100)}%` : '—'} | ${c(nn)} | ${c(h)} | ${c(ni)} | ${x[h].n ? f1(x[h].ts) : '—'} |`;
  };
  const sensG = sens.gravel.map((r) => `| ${r.label} | ${f1(r.ts15)} | ${f1(r.tmrt15)} |`);
  const sensL = sens.lawn.map((r) => `| ${r.label} | ${signed(r.dTs)} | ${f2(r.evap)} |`);
  const sensC = sens.coat.map((r) => `| ${r.label} | ${signed(r.dTs)} | ${signed(r.dTmrt, 2)} |`);
  const sensW = sens.whole.map((r) => `| ${r.label} | ${signed(r.sail)} | ${signed(r.ramada)} | ${signed(r.arcade)} | ${signed(r.mesquite)} | ${signed(r.night)} | ${f1(r.court)} | ${f1(r.gravel)} | ${f1(r.ref)} |`);
  const s0 = sens.shipped;
  const sunTxt = sc.map((x) => `${signed(x.dAlt, 2)}° in altitude and ${signed(x.dAz, 2)}° in azimuth at ${x.h}:00`).join(', ');
  return `## Block 11: desert courtyard neighbourhood

The eleventh block (\`cities/desert\`) is an invented 400 m neighbourhood in the manner of a hot desert city like Phoenix,
at 33.43° N, 112.0° W on 15 July (no daylight saving): air ${scene.site.taMin}–${scene.site.taMax} °C with the warmest air at 16:30, vapour pressure
${scene.site.vapourHpa} hPa, wind ${scene.site.wind} m/s, a clear sky. ${world.buildings.filter((B) => B.style === 'court').length / 4} one- and two-storey courtyard houses of light stucco (four wings
around a 10 m courtyard on a 30 m plot) stand in gravel yards (xeriscape) with mesquites and palo verdes; east of the cross street,
a gravel plaza has three shade sails, a ramada, eight mesquites and four palo verdes, a row of shops has an arcade along Main Street,
and a café patio has a misted roof; south of Main Street lies an irrigated bermudagrass lawn (Lawn Park). Main Street carries a light
reflective coating (\`C\`, the panel button or \`?coat=0\` shows it bare); the water each kind of ground uses is \`L\`, the panel button
or \`?water=1\`. Its research brief is [\`docs/research/desert-brief.md\`](research/desert-brief.md).

### Block 11 parameters

The block's materials (\`gravel\`, \`desertLawn\`, \`coolCoat\`, \`desertSail\`, \`ramada\`, \`arcadeRoof\`, \`mesquite\`, \`paloVerde\`) are in
the parameter table above; they are cut from the other pages at build time (\`@page desert\` in \`engine/materials.js\`). House roofs
are the shared aged cool roof and dark membrane, sidewalks the shared concrete, the cross street and the residential streets the
shared aged asphalt. The block's own values live in \`engine/desert.js\` (\`DS\`):

| Parameter | Value |
|---|---|
${params.join('\n')}

### What is new in the engine (all other blocks pixel-identical)

- **The hour of the warmest air** is a site setting, \`site.tmaxHour\` (default 15:00): the air is a cosine from \`taMin\` at sunrise to
  \`taMax\` at that hour and back down to the next sunrise. Only this block sets it (16:30, the hourly normals' 16–17 MST [ncei]).
  At 15:00 the air is ${f1(st.air[h])} °C here, ${f1(scene.site.taMax - st.air[h])} K below the day's peak.
- **A block's own wall albedo**, \`world.wallAlbedo\` (default the shared ${MODEL.wallAlbedo.value}): the wall-reflection term K_wr = α_w·(1 − SVF_open)·c·K_wall
  uses the light stucco's ${DS.wallAlbedo.value} here. It changes the sunlight walls throw onto the ground and onto a person, not the walls'
  temperature: every wall is still the shared warm wall (air + 2 K + 6 K × K/900, issue #28).
- Nothing else is new: sails, the ramada, the arcade and the patio are block 5's flat screens (their tr; the cells under them take the
  crown factor for the sky view), the desert trees are block 5's species crowns, the lawn and gravel are ground materials, and the
  coating toggle runs the street's cells again with aged asphalt (as block 10's white roofs) and merges them into the model.

### Where people stand (cell classes)

Defined before the first band run, by geometry only. The **open reference** is the plaza's gravel cells with nothing over their centre,
no crown and sky view ≥ 0.85, by day those in full sun (sunlit > 0.95): ${st.ref[h].n} cells at 15:00. A cell counts for a **shade kind**
at an hour if that kind's shadow alone covers its centre (shadow polygons; no building or other kind) and the model gives it at
most the kind's transmission + 0.2 of the sun; at night, the cells under the kind's footprint (its screen, or within the crown's radius).
Mean radiant temperature (°C) and its difference from the open reference (K):

| Shade | footprint cells | cells ${h}:00 / ${ni}:00 | SVF | sun | ${nn}:00 | ${h}:00 | ${ni}:00 | ground ${h}:00 °C |
|---|---|---|---|---|---|---|---|---|
${KINDS.map(kindRow).join('\n')}
| the open reference (plaza gravel) | ${F.ref.length} | ${st.ref[h].n} / ${st.ref[ni].n} | — | 100% | ${f1(st.ref[nn].tmrt)} | ${f1(st.ref[h].tmrt)} | ${f1(st.ref[ni].tmrt)} | ${f1(st.ref[h].ts)} |

Air ${f1(st.air[nn])} / ${f1(st.air[h])} / ${f1(st.air[ni])} °C. The ${F.court.length} courtyard cells: sky view ${f2(st.court.svf)}, ${Math.round(st.court.sun15 * 100)}% in sun at 15:00, Tmrt ${f1(st.court.tmrt15)} °C at 15:00
and ${f1(st.court.tmrt21)} °C at ${ni}:00; ground ${f1(st.court.ts15)} °C at 15:00.

### The mesquite calibration

No measured leaf area was found for mesquite or palo verde (the brief); the brief says to calibrate the mesquite crown to the measured
ΔTmrt under Prosopis, −16.7 K [middel2021]. \`calibrateMesquite\` (scripts/desert.mjs) bisects the crown transmission (both species
together, as shipped) with the whole block run again at each step; it gave 0.302, shipped as 0.30 (an LAI of about 2.4 in exp(−0.5 LAI)):
mesquites ${signed(st.shade.mesquite[h].d, 2)} K at 15:00. That row is **by construction** and the palo verdes, which take the same crown, are
**semi-constructed**. The calibration ran after the parameter commit and before the first band run; it is the only value set from a model run.

### Lawn, water and gravel

Open lawn in full sun (${st.lawn.n} cells): ${f1(st.lawn.ts15)} °C at 15:00 (air ${f1(st.air[h])} °C), ${f1(st.lawn.ts03)} °C at 03:00. Water evaporated over
the design day (\`Thermal.evaporation\`, EF × max(Q*, 0) over 2.45 MJ kg⁻¹ on the stored 15-min values): ${f2(st.lawn.evap)} mm (L m⁻²) on average,
${f2(st.lawn.evapMin)}–${f2(st.lawn.evapMax)} across the lawn, against 5–7 from reference ET × the July crop coefficient [azmet, az1195] and about
${DS.lawnApplied.value} mm applied [amwua]. EF ${MATERIALS.desertLawn.ef.value} is a fixed share of the positive net radiation: it does not respond to the dry air and
draws no advected heat (the brief estimates a real lawn's latent flux at about its daily net radiation). Sunlit open gravel (${st.gravel.n} cells):
${f1(st.gravel.ts15)} °C at 15:00. Water used by the other covers (overlay and cards) is quoted, not modelled: desert trees ${DS.treeWater.value.join('–')} L per m² of crown a day
[amwua], misters ${DS.misters.value.join('–')} L m⁻² for each hour they run [huang2025], gravel and sails none.

### The coated street

Main Street's ${F.main.length} cells (the cross street's intersection is bare asphalt) carry the coating (α ${MATERIALS.coolCoat.alpha.value}, the middle of the
trial's 0.30–0.39); without it they are the shared aged asphalt (α ${MATERIALS.asphalt.alpha.value}; the trial's bare streets measured 0.036, so the
change in reflectance here, ${f3(MATERIALS.coolCoat.alpha.value - MATERIALS.asphalt.alpha.value)}, is likely smaller than the trial's). Sunlit cells, coated / bare:

| Hour | surface °C | change K | Tmrt °C | change K |
|---|---|---|---|---|
${[nn, h, ni].map((x) => `| ${x}:00 | ${f1(st.coat[x].ts)} / ${f1(st.coat[x].tsBare)} | ${signed(st.coat[x].dTs)} | ${f1(st.coat[x].tmrt)} / ${f1(st.coat[x].tmrtBare)} | ${signed(st.coat[x].dTmrt, 2)} |`).join('\n')}

The cross street's sunlit asphalt is ${f1(st.cross.ts15)} °C at 15:00. Measured in the trial: −6.7 K at noon and −5.8 K in the afternoon at the surface,
pedestrian Tmrt +3.2 K and +2.5 K [coolPave2024]; high-albedo canyons can worsen pedestrian heat stress [erell2014].

### Dry air

At ${scene.site.vapourHpa} hPa the clear-sky emissivity at 03:00 is ${f3(st.sky.eps)} (Brutsaert) against ${f3(st.sky.eps20)} at 20 hPa: ${f1(st.sky.lw3)} against ${f1(st.sky.lw3h)} W m⁻² of
sky longwave. The air's wet-bulb temperature (the engine's psychrometric balance, block 5) is ${f1(st.sky.wetBulb15)} °C at 15:00 and ${f1(st.sky.wetBulbMax)} °C at
the day's peak (the brief: about 22 °C at 43 °C and 12 hPa [stull2011]). Misting and the lawn's cooling of the air are not modelled.

### Walkers

Walkers choose the shadier of two equal routes (across the plaza under the sails and mesquites or in the open, under the arcade or on
the sunlit sidewalk, both Main Street sidewalks, both cross-street sidewalks, the mesquite path or the lawn, a residential street or the
path between the houses). At 15:00 their density in shade is ${f2(wk.ratio)} times that in sun; ${wk.dwellers} people dwell under the sails, the
ramada, the mesquites, the arcade and the patio, in the plaza and on the lawn, and at 15:00 ${Math.round(wk.shade * 100)}% of them are in shade.

### Sensitivity

One change at a time, inside the brief's ranges (docs only; nothing shipped changes). Gravel (shipped ${f1(s0.gravel)} °C sunlit at 15:00, the
open reference's Tmrt ${f1(s0.ref)} °C):

| Case | sunlit gravel 15:00 °C | open reference Tmrt °C |
|---|---|---|
${sensG.join('\n')}

Lawn (shipped ${signed(s0.lawnDTs)} K against the air at 15:00, ${f2(s0.evap)} mm a day):

| Case | surface − air K | mm a day |
|---|---|---|
${sensL.join('\n')}

Coating (shipped ${signed(s0.coatDTs)} K surface, ${signed(s0.coatDTmrt, 2)} K Tmrt at 15:00):

| Case | surface K | Tmrt K |
|---|---|---|
${sensC.join('\n')}

The whole block run again (ΔTmrt against open sun at 15:00, the sails after sunset at ${ni}:00, the courtyards' Tmrt, sunlit gravel and the open
reference at 15:00; shipped: sails ${signed(s0.sail)}, ramada ${signed(s0.ramada)}, arcade ${signed(s0.arcade)}, mesquites ${signed(s0.mesquite)}, night ${signed(s0.night)} K,
courtyards ${f1(s0.court)} °C):

| Case | sails | ramada | arcade | mesquites | sails ${ni}:00 | courtyards °C | gravel °C | open Tmrt °C |
|---|---|---|---|---|---|---|---|---|
${sensW.join('\n')}

The sails' transmission at the brief's upper end (0.25) brings them inside band 6; nothing in range brings the ramada or the night
gap inside. Moving the warmest air back to 15:00 warms the 15:00 air by ${f1(sens.whole.find((r) => /15:00/.test(r.label)).air - st.air[h])} K and the gravel by
${f1(sens.whole.find((r) => /15:00/.test(r.label)).gravel - st.gravel.ts15)} K.

### Causes of the misses (docs-only runs)

Nothing shipped changes.

- **Band 1** (sunlit gravel ${f1(st.gravel.ts15)} °C against 55–63 °C, measured at an air of 41.0 °C): the gravel cells run again with
${cz.gravel.map((g) => `  - ${g.label}: ${f1(g.ts)} °C (air ${f1(g.air)} °C at 15:00)`).join('\n')}

  Each of (a) and (b) alone leaves it outside; the brief's upper albedo alone, or all three together, bring it inside. Likely causes: the
  engine's clear-sky sun (the brief: noon global irradiance about 1037 W m⁻², 5–10% above Tempe's measured clear-day peaks) and an air
  ${f1(st.air[h] - 41)} K warmer than on the measurement day; the albedo is unverified (0.16–0.39).
- **Band 6** (sails ${signed(st.shade.sail[h].d)} K, ramada ${signed(st.shade.ramada[h].d)} K against −14 to −20 K): with the person's view of the ground spread
  over the neighbourhood (\`tmrtView\`: the downward face and the sides see each ground cell within 40 m by its view factor from 1.1 m,
  instead of the own cell only) the sails are ${signed(cz.view.sail.d)} K and the ramada ${signed(cz.view.ramada.d)} K; with that view and the sails' transmission at 0.25,
  ${signed(cz.sail25)} K (inside); sails and ramada of 10 m instead of 20 m (same centres): ${signed(cz.small.sail)} K and ${signed(cz.small.ramada)} K. Likely causes: the
  sail's transmission in the lower half of the brief's range and the one-cell ground view; the ramada is opaque, and the band's
  −17.3 K was measured under sails and umbrellas (opaque arcades and overhangs: −22.8 to −30.9 K), so its miss is likely the band's
  scope, not tested further.
- **Band 7** (palo verdes ${signed(st.shade.paloVerde[h].d)} K, semi-constructed): ${cz.palo.court.n} of the ${cz.palo.court.n + cz.palo.open.n} cells are in house courtyards
  (${signed(cz.palo.court.d)} K), where the stucco walls reflect sunlight onto the ground and a person and are the shared warm walls; with those
  walls at air + 2 K (no sun term) ${signed(cz.palo.court.cool)} K; the one cell in the open plaza: ${signed(cz.palo.open.d)} K (inside). A person in the crown's
  full shade (sunlit = τ) instead of the 5 m cell's mean sun: ${signed(cz.paloFull)} K; with the neighbourhood ground view as well, ${signed(cz.paloBoth)} K.
  Likely cause: the courtyards' reflected sun (the light walls' α_w ${DS.wallAlbedo.value}), not the crown. Noticed after the first run: every palo
  verde is centred on a cell corner, so no cell centre lies within its 3–3.5 m crown and the cells in its shade keep their open
  (or courtyard) sky view (the crown factor counts by cell centre; ${F.paloVerde.length} footprint cells in all); not changed.
- **Band 9** (after sunset, under the sails ${signed(st.shade.sail[ni].d)}, the ramada ${signed(st.shade.ramada[ni].d)}, the arcade ${signed(st.shade.arcade[ni].d)}, the mesquites
  ${signed(st.shade.mesquite[ni].d)} K against 0 to +5 K): what is overhead at night at the engine's own leaf temperature (air − 0.5 K) instead of the
  shared warm-wall term (air + 2 K), the shade cells run again: ${['sail', 'ramada', 'arcade', 'mesquite'].map((k) => signed(cz.leafNight[k])).join(', ')} K; at a thin sheet's
  own night temperature (sky above, its ground below, h_c on both faces: about ${f1(-cz.dSheet)} K below the air), run again:
  ${['sail', 'ramada', 'arcade', 'mesquite'].map((k) => signed(cz.sheetRun[k])).join(', ')} K; the neighbourhood ground view: ${['sail', 'ramada', 'arcade', 'mesquite'].map((k) => signed(cz.view[k].night)).join(', ')} K.
  None brings it inside. The ground under the sails is ${f1(cz.groundNight.sail - cz.groundNight.open)} K warmer than the open plaza at ${ni}:00 (measured: shaded
  ground 2.7–4.5 K cooler after sunset). Likely causes, not tested further: the crown factor hides three quarters of the night sky under
  any screen or crown, and the open plaza sees the engine's clear, dry Brutsaert sky (Tmrt ${f1(st.ref[ni].tmrt)} °C at an air of ${f1(st.air[ni])} °C).
- **Band 10** (a person on the coated street ${signed(st.coat[h].dTmrt, 2)} K against +2.5 to +3.2 K): with the neighbourhood ground view (sidewalks,
  yards and the cross street in view as well as the coated road) ${signed(cz.coatView, 2)} K (inside). Likely cause: the one-cell ground view.

### Acceptance bands

At 15:00 (the brief's bands), "after sunset" ${ni}:00, the open reference as above.

${bands11Markdown(rows)}

Misses:
- **Band 1** (sunlit gravel ${f1(st.gravel.ts15)} °C against 55–63 °C): likely the engine's strong clear-sky sun and the warmer design-day air (tested
  above); stated on the lawn card.
- **Band 6** (sails ${signed(st.shade.sail[h].d)} K, ramada ${signed(st.shade.ramada[h].d)} K): likely the sail's transmission and the one-cell ground view; for the
  ramada, the band's scope (tested above); stated on the sails card.
- **Band 7** (palo verdes ${signed(st.shade.paloVerde[h].d)} K, semi-constructed): likely the courtyards' reflected sun (tested above); stated on the sails card.
- **Band 9** (after sunset +${f1(Math.min(...['sail', 'ramada', 'arcade', 'mesquite'].map((k) => st.shade[k][ni].d)))} to +${f1(Math.max(...['sail', 'ramada', 'arcade', 'mesquite'].map((k) => st.shade[k][ni].d)))} K): likely the crown factor and the dry night sky (the tests above
  narrow it but do not close it); stated on the arcades card.
- **Band 10** (${signed(st.coat[h].dTmrt, 2)} K): likely the one-cell ground view (tested above); stated on the coating card.

### Disclosures

- **Invented place:** no real neighbourhood, addresses or people; the street names are generic. The layout (plots, storeys, roofs,
  the sails', ramada's and arcade's sizes and heights, which courtyards have a tree) is a design choice, committed with every parameter
  value (commit 29ae537) before any model run; the mesquite crown was calibrated next (03e3d62), and the bands and cell classes were
  committed (b6bd935) before the first band run.
- **After the first band run:** two supplementary rows were added to band 7 (the palo verde cells in the courtyards and in the open), to
  show where its miss comes from; they are not counted. Also noticed then, and not changed: the palo verdes stand on cell corners, so
  the crown factor (sky view) applies to almost none of the cells in their shade (band 7 above). Drawing only, with no geometry or model input changed: the margin notes' label
  offsets were moved so the five labels stay on screen at the opening view, and the coating layer was split at the cross street so it
  is not drawn over the bare intersection. The card texts name the misses and their tested causes.
- **Air fixed:** misters and the lawn do not cool the air; the patio's misters are drawn and quoted only; no wind from the streets, no
  traffic or air-conditioner heat.
- **Engine:** the shared warm-wall term (every wall and every screen or crown seen from below at air + 2 K, more in the sun; issue #28)
  whatever its colour or shade; the person sees only their own cell's ground; h_c from the 1.5 m/s site wind with the shared formula
  (issue #20); the engine's clear-sky sun, about 5–10% strong at noon by the brief; the lawn's EF is fixed (no response to the dry air,
  no advection).
- **Engine sun** (\`sun.js\`, issue #24): against suncalc at this site the sun differs by ${sunTxt}: too small to move any band here.
- **Thermal palette:** it tops out at 70 °C; the hottest surfaces here (the dark membrane roofs, up to ${f1(Math.max(...world.buildings.filter((B) => B.roof === 'membrane').map((B) => T.ts(world.cellIndex((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2), 14))))} °C at 14:00) show in its top colour; the heat cards give the numbers.
- **Health wording:** the heat-deaths card quotes the county's counts and its named risk factors, hedged, without advice beyond the
  county's; nothing on it is modelled.
`;
}
