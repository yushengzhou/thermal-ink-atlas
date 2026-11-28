// docs/sources.md section for block 12 (night market street),
// generated from the code and model runs (scripts/nightmarket.mjs).
import { BASIS, MATERIALS } from '../engine/materials.js';
import { NM, personW, stallPower } from '../engine/market.js';
import { base12, bands12, bandVerdicts12, sensitivity12, causes12, walkers12, crowd12, sunCheck12, hours12, NM_NOTES } from './nightmarket.mjs';

const f0 = (x) => String(Math.round(x));
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (k) => {
  const p = NM[k];
  const v = Array.isArray(p.value) ? p.value.join('–') : p.value;
  return `${v} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'} (${NM_NOTES[k]})`;
};
/** The independent bands (1-5) and the bookkeeping bands checked by construction (6-9). */
export const INDEPENDENT12 = ['1', '2', '3', '4', '5'];

/** Block 12 acceptance table (also checked by the tests). */
export function bands12Markdown(rows) {
  const v = (r) => (Math.abs(r.value) > 0 && Math.abs(r.value) < 1e-3 ? r.value.toExponential(1) : r.unit === '' ? r.value.toFixed(3) : r.value.toFixed(2));
  const num = (x) => (Math.abs(x) > 0 && Math.abs(x) < 1e-3 ? x.toExponential(0) : `${+x.toFixed(3)}`);
  const b = (r) => (r.lo === null && r.hi === null ? '— (reported)' : r.lo === null ? `≤ ${num(r.hi)}` : r.hi === null ? `≥ ${num(r.lo)}` : r.lo === r.hi ? num(r.lo) : `${num(r.lo)} to ${num(r.hi)}`);
  const verdict = (r) => (r.supp ? `${r.lo === null && r.hi === null ? 'reported' : r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.inside ? 'inside' : '**outside**');
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${verdict(r)} |`);
  const counted = rows.filter((r) => !r.supp);
  const out = counted.filter((r) => !r.inside).length;
  const bv = bandVerdicts12(rows);
  const ind = INDEPENDENT12.filter((k) => k in bv);
  const met = ind.filter((k) => bv[k]);
  const missed = ind.filter((k) => !bv[k]);
  const cons = Object.keys(bv).filter((k) => !INDEPENDENT12.includes(k));
  const consMet = cons.filter((k) => bv[k]);
  return `| Check (spec #15) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${counted.length} counted checks fall outside their band; ${rows.length - counted.length} supplementary rows are not counted. By the brief's bands: ${met.length} of ${ind.length} independent bands met (${met.join(', ')})${missed.length ? `; missed: ${missed.join(', ')}` : ''}; bands ${cons[0]}–${cons[cons.length - 1]} check the overlays' bookkeeping by construction (${consMet.length} of ${cons.length} met). Band 5's ∝ 1/d², closed and from-4-m rows are by construction too; its 3 m row is the one that tests the brief's numbers. They are reported, not tuned away: every parameter value is the brief's central value (or the shared value the brief names), committed before the first band run.`;
}

export function nightmarketMarkdown() {
  const { scene, world, T, st } = base12();
  const rows = bands12();
  const sens = sensitivity12();
  const cz = causes12();
  const wk = walkers12(NM.day.value);
  const cr = crowd12();
  const sc = sunCheck12();
  const h = NM.hour.value;
  const L = NM.late.value;
  const F = world.nm.F;
  const P = st.place;
  const params = Object.keys(NM).map((k) => `| \`${k}\` | ${cell(k)} |`);
  const NAME = { ref: 'the open square (sky view ≥ 0.85, outside the food court)', square: 'all of Temple Square', aisle: 'Lantern Street, open aisle (y 195–200)', awning: 'under the awnings (y 185–190)', stallRow: 'the stall row (y 190–195)', south: 'the south side (y 200–205)', street: 'all of Lantern Street', alley: 'the narrow alleys (5 m, three-storey walls)' };
  const placeRow = (k) => {
    const x = P[k];
    return `| ${NAME[k]} | ${x[h].n} | ${f2(x[h].svf)} | ${f1(x[15].ts)} | ${f1(x[h].ts)} (${signed(x[h].dTs)}) | ${f1(x[L].ts)} (${signed(x[L].dTs)}) | ${f0(x[h].net)} (${f0(x[h].rad)} + ${f0(x[h].toAir)}) | ${f0(-x[h].g)} | ${f0(x[h].gross)} | ${f1(x[h].tmrt)} (${signed(x[h].dTmrt)}) |`;
  };
  const H = st.heat;
  const heatRow = (label, x) => `| ${label} | ${f0(x.stoneRad)} | ${f0(x.stoneAir)} | ${f0(x.crowd)} | ${f0(x.stall)} | ${f1(x.light)} | ${f0(x.total)} |`;
  const hr = hours12().filter((x) => x.h >= 15 || x.h === 0);
  const sensM = sens.model.map((r) => `| ${r.label} | ${signed(r.dTs)} | ${f0(r.net)} | ${f0(r.refNet)} | ${f0(r.alleyNet)} | ${signed(r.tmrtRef)} | ${signed(r.tmrtAlley)} |`);
  const sensO = sens.overlay.map((r) => `| ${r.label} | ${f0(r.crowd)} | ${f0(r.stall)} | ${f1(r.light)} |`);
  const sensG = sens.grill.map((r) => `| ${r.label} | ${signed(r.d1)} | ${signed(r.d2)} | ${signed(r.d3)} |`);
  const sunTxt = sc.map((x) => `${signed(x.dAlt, 2)}° in altitude and ${signed(x.dAz, 2)}° in azimuth at ${x.h}:00`).join(', ');
  const g = (d) => st.grill.find((r) => r.d === d);
  const bv = bandVerdicts12(rows);
  return `## Block 12: night market street

The twelfth block (\`cities/nightmarket\`) is an invented 400 m street in the manner of a subtropical city like Taipei, at
25.09° N, 121.52° E on 15 July: air ${scene.site.taMin}–${scene.site.taMax} °C (warmest at 15:00), vapour pressure ${scene.site.vapourHpa} hPa, wind ${scene.site.wind} m/s, a clear sky.
Lantern Street is 20 m of granite paving between three- and four-storey shophouses with canvas awnings (north) and one- and two-storey
shops (south); from ${NM.opens.value}:00 to midnight it is a night market: ${st.nStalls} stalls (${st.kinds.map((k) => `${k.n} ${k.type === 'lpg' ? 'gas griddles and steamers' : k.type === 'wok' ? 'wok stalls' : k.type === 'grill' ? 'charcoal grills' : 'drinks stalls'}`).join(', ')}) in a row down the
street and in a food court on Temple Square, which opens off the street to the north, string lights, and a crowd that peaks from
${NM.peakFrom.value}:00 to ${NM.peakTo.value}:00. Two 5 m alleys between three-storey walls lead off the street. The page opens at ${scene.startHour}:00. \`Q\` (the panel button or \`?heat=1\`)
shows the heat given off by source; \`M\` (or \`?market=0\`) closes the market. Its research brief is
[\`docs/research/nightmarket-brief.md\`](research/nightmarket-brief.md).

### Block 12 parameters

The paving is the shared stone (α ${MATERIALS.stone.alpha.value}, ε ${MATERIALS.stone.eps.value}, admittance ${MATERIALS.stone.mu.value}, EF ${MATERIALS.stone.ef.value}): the brief gives no granite values. The shop awnings are
the block's one material (\`marketAwning\`, opaque, in the parameter table above, \`@page nightmarket\`). Roofs are the shared grey tile,
membrane, aged cool roof and (on the one-storey shops) metal; the back streets the shared aged asphalt; the lanes the shared concrete.
The block's own values live in \`engine/market.js\` (\`NM\`):

| Parameter | Value |
|---|---|
${params.join('\n')}

### What is new in the engine (all other blocks pixel-identical)

- **A scene's opening hour**, \`scene.startHour\` (default 15:00): this page opens at ${scene.startHour}:00. No other scene sets it.
- Nothing else in the shared engine is new. The model run keeps the ground heat flux G (block 6's \`opts.flux\`) to check the stone's
  release against the model's own budget; the awnings are block 5's flat screens (the cells under them take the crown factor for the
  sky view); the people near a grill carry a point Tmrt, as block 9's waiting people do; the crowd joins the walkers through the
  block's plugin, as block 10's rooftop people do. The crowd, the stalls, the lights and the grills never enter the model.

### Places (cell classes)

By geometry only, defined before the first band run. Surface temperature (°C, and above the air, K), the stone's net release
Q = ε(σT_s⁴ − L↓) + h_c(T_s − T_a) with L↓ = SVF·L_sky + (1 − SVF)·σT_w⁴ as in the model (W m⁻², radiated + to the air), the model's own −G,
the gross emission εσT_s⁴ and Tmrt (°C, and against the air, K). Air ${f1(st.air[15])} / ${f1(st.air[h])} / ${f1(st.air[L])} °C at 15:00 / ${h}:00 / ${L}:00.

| Place | cells | SVF | 15:00 | ${h}:00 | ${L}:00 | Q ${h}:00 | −G ${h}:00 | εσT⁴ ${h}:00 | Tmrt ${h}:00 |
|---|---|---|---|---|---|---|---|---|---|
${['ref', 'square', 'aisle', 'awning', 'stallRow', 'south', 'street', 'alley'].map(placeRow).join('\n')}

The model's own budget agrees: at night the stone has no sun and no evaporation (EF acts only on a positive net radiation), so
−G = Q; the stored surface temperature is a minute later than the step that gives G, hence the small gap (band 2's supplementary row).

### Heat given off (the Q overlay)

Shown, not felt: the air temperature is fixed, so none of this warms the air or changes a surface or a person's Tmrt here. Per 5 m
cell: the stone (radiated and to the air, from the model), the crowd ρ_p·M (M = ${NM.walkShare.value} × ${NM.walk.value} + ${1 - NM.walkShare.value} × ${NM.stand.value} = ${f1(personW())} W; ρ_p the peak
${NM.peak.value} m⁻² × the hour's share × the place's weight: busy aisles 1, the stall row 0.5, the south side 0.6, the food court 0.8, the rest of
the square 0.3, the alleys 0.2; capped at ${NM.cap.value}), the stalls (P·duty over the 25 m² cell: gas ${f1(stallPower('lpg') / 1000)} kW, woks ${f2(stallPower('wok') / 1000)} kW,
charcoal ${f1(stallPower('grill') / 1000)} kW), the lights (${NM.lights.value} W m⁻² over the street and the square from sunset to midnight). Means, W m⁻²:

| Where | stone, radiated | stone, to the air | crowd | stalls | lights | total |
|---|---|---|---|---|---|---|
${heatRow(`Lantern Street, ${h}:00`, H.street)}
${heatRow(`Lantern Street, ${L}:00`, H.streetLate)}
${heatRow(`Temple Square, ${h}:00`, H.square)}

The street's ${st.streetStallW / 1000} kW of stalls over its ${st.streetArea} m² come to ${f0(st.streetStallW / st.streetArea)} W m⁻² (the brief's estimate: about 60 W m⁻² for 60 stalls × 8 kW × 0.5
over 400 m × 10 m). The crowd's sensible share (${NM.sensible.value}) is quoted on the cards; the overlay shows the whole metabolic heat.

### The crowd over the evening

ρ_p in the busy aisles (weight 1), people per m², and their heat, W m⁻²:

| Hour | ${hr.map((x) => `${x.h}:00`).join(' | ')} |
|---|${hr.map(() => '---').join('|')}|
| ρ_p | ${hr.map((x) => f2(x.rho)).join(' | ')} |
| ρ_p·M | ${hr.map((x) => f0(x.rho * personW())).join(' | ')} |

${NM.figures.value} figures are drawn at the peak (each stands for about ${f0(F.market.reduce((a, i) => a + F.weight[i], 0) * NM.peak.value * 25 / NM.figures.value)} people): strollers on six lanes of the street,
customers in front of a stall (a new stall every minute) and people walking the food court, plus one cook behind each stall,
${NM.vendorAt.value} m from its centre. From 16:00 to midnight nobody but the cooks comes nearer than ${f2(cr.near)} m to a grill's coals (the rule:
${NM.keepAway.value} m); the cooks of the grill stalls stand ${f2(cr.cook)}–${f2(cr.cookFar)} m from them, and every one of them (${cr.cooksHot} of ${cr.cooksAtGrills} samples) carries a Tmrt
of 65 °C or more, so they show the sweat cue. Walkers at 15:00 (the market closed): density in shade over density in sun ${f2(wk.ratio)};
${Math.round(wk.shade * 100)}% of the ${wk.dwellers} people dwelling are in shade.

### The grill's radiant term

The brief's illustrative point source, added to the Tmrt of a point (a person drawn, a heat card's cell centre), never to the grid:
ΔS = ε_c·σ·(T_c⁴ − T_b⁴)·A_c / (4πd²), d ≥ ${NM.grillMin.value} m, summed over the open grills, in full within ${NM.grillMax.value} m and times a cosine taper
(1 + cos(π(d − ${NM.grillMax.value}) / ${NM.grillTaper.value - NM.grillMax.value}))/2 down to zero at ${NM.grillTaper.value} m (so a person walking away meets no step at ${NM.grillMax.value} m; band 5 still
reads the full term at ${NM.grillMax.value} m), T_b the air, Tmrt' = (Tmrt⁴ + ΔS/σ)^¼.
At ${h}:00 on the stall row (Tmrt ${f1(P.stallRow[h].tmrt)} °C):

| d, m | ${st.grill.map((r) => r.d).join(' | ')} |
|---|${st.grill.map(() => '---').join('|')}|
| ΔS, W m⁻² | ${st.grill.map((r) => f0(r.dS)).join(' | ')} |
| Tmrt, °C | ${st.grill.map((r) => f1(r.tmrt)).join(' | ')} |
| ΔTmrt, K | ${st.grill.map((r) => f1(r.dT)).join(' | ')} |

The brief: about +490 W m⁻² at 1 m (Tmrt about 88 °C) and about +120 at 2 m (about 48 °C). Without the taper the term would fall
below 5 K at ${f2(st.under5)} m.

### Sensitivity

One change at a time (docs only; nothing shipped changes). The stone's cells run again (no lateral coupling); the drier sky runs the
whole block. At ${h}:00: the open aisle's stone − air (K) and net release, the open square's and the alleys' net release (W m⁻²), Tmrt − air
on the open square and in the alleys (K):

| Case | aisle T_s − T_a | aisle Q | square Q | alleys Q | square Tmrt − T_a | alleys Tmrt − T_a |
|---|---|---|---|---|---|---|
${sensM.join('\n')}

The overlay over the street at ${h}:00 (W m⁻²; arithmetic on the shipped model):

| Case | crowd | stalls | lights |
|---|---|---|---|
${sensO.join('\n')}

The grill term (ΔTmrt, K, at 1 / 2 / 3 m; the brief gives no range for the coal bed, so these are illustrative):

| Case | 1 m | 2 m | 3 m |
|---|---|---|---|
${sensG.join('\n')}

### Causes of the misses (docs-only runs, after the first band run)

Nothing shipped changes.

- **Band 5** (the grill term at 3 m ${signed(g(3).dT)} K against < 5 K): the brief's own formula with its own coal bed (0.2 m² at 600 °C, ε 0.95) gives
  ${f0(cz.grill.at1)} W m⁻² at 1 m, its "about +490", and ${f0(cz.grill.at3)} W m⁻² at 3 m, ${signed(cz.grill.dT3)} K on the stall row's Tmrt: the two statements of the brief do
  not agree, and the term falls below 5 K only at ${f2(cz.grill.under5)} m. So the miss is the formula's (tested): an isotropic point source with
  nothing in the way, an upper bound; a smaller or cooler bed would meet it (sensitivity above). Not tuned.
- **The awnings' net release** (a supplementary row, ${f0(cz.awning.shipped)} W m⁻² against 30–150): the brief's own formula at the awnings' sky view
  (${f2(cz.awning.svf)}) and surface (${signed(cz.awning.dTs)} K above the air), walls and canvas at air + 2 K, gives ${f0(cz.awning.brief)} W m⁻² (at a sky view of 0.4 and +2 K,
  ${f0(cz.awning.brief04)}: the brief's 42). With what the awning cells see overhead and around at the air temperature after dark, run again:
  ${f0(cz.awning.cool.net)} W m⁻² (surface ${signed(cz.awning.cool.dTs)} K above the air). The band is for an open street; under a canvas that hides most of the sky
  the stone keeps its heat, as the brief's "lower at low SVF" says.

### Acceptance bands

At ${h}:00 (the brief's "stone 21 h"); the places as above.

${bands12Markdown(rows)}

Misses:
${bv['5'] ? '' : `- **Band 5** (the grill term at 3 m ${signed(g(3).dT)} K): the brief's formula and coal bed give it (tested above); stated on the grill card with its number.\n`}- Supplementary, outside its band: the awnings' net release ${f0(P.awning[h].net)} W m⁻² (the sky view of ${f2(P.awning[h].svf)}, tested above); stated on the stone card.

### Disclosures

- **Invented place:** no real street, addresses, stalls or vendors; the names (Lantern Street, Temple Square, Well Alley, Lamp Alley)
  are generic. The layout (plots, storeys, awnings, the stall row and the food court, the stall types, the alleys) and every parameter
  value were committed (commit 9c2ad47) before any model run of the bands; the bands and places were committed (d3d1f47) before the first
  band run.
- **After the first band run:** drawing and wording only, with no geometry or model input changed: four margin notes' label offsets
  were moved so the five labels stay on screen at the opening view, the crowd note was shortened, and the grill card names the tested
  cause of band 5. A helper bug in the docs' crowd statistics (the cooks' distance counted under 0.6 m instead of under 1.2 m) was
  fixed; it changes no band row. The docs-only runs of the misses' causes were added.
- **Air fixed:** the crowd, the stalls and the lights are shown (Q), not felt: they do not warm the air, the stone or a person. Only the
  grills' radiant term reaches a person, at points, illustrative and an upper bound. No smoke, no air quality, no food safety.
- **The site** (taMin, taMax) is a Taipei-like July day from memory (not in the brief, unverified); every band is relative to the air.
- **The paving** is the atlas's shared stone (no granite values in the brief; solid granite is denser, sensitivity above).
- **Crowd density and timing** are invented (no night-market measurement found); the awnings, the stalls and the crowd's bodies are not
  in the sky view (the brief: Tmrt likely 0.5–1 K too cool under them); stalls are drawn, not shade.
- **Engine:** the shared warm-wall term (every wall and the awnings seen from below at air + 2 K at night; issue #28); a person sees only
  their own cell's ground (issue #28); h_c from the 1 m/s site wind with the shared formula (issue #20); the stone's stored heat comes from
  the engine's clear-sky sun, likely a few per cent strong at noon (sensitivity above).
- **Engine sun** (\`sun.js\`, issue #24): against suncalc at this site the sun differs by ${sunTxt}.
- **No measured night data** for any real night-market street was found (the brief); the bands compare with the brief's physics.
`;
}
