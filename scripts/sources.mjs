// Generate docs/sources.md from engine/materials.js and model runs, so the
// parameter table, its basis tags, the literature comparison and the
// sensitivity results cannot drift from the code.
// Usage: node scripts/sources.mjs [--print]
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MATERIALS, MODEL, SOURCES, BASIS, paramKeys } from '../engine/materials.js';
import { solarPosition } from '../engine/sun.js';
import { irradiance } from '../engine/thermal.js';
import { SCENE } from '../cities/asphalt-park/scene.js';
import { base, targetRows, sensitivity, TIERS } from './regions.mjs';
import { GLOSSARY, glossaryStats, rangeLine } from '../engine/glossary.js';
import { base2, bandRows, water, sensitivity2, diagnostics } from './retrofit.mjs';
import { MEASURES, D_DEFAULT, D_MAX, decay } from '../engine/retrofit.js';
import { cbdMarkdown } from './cbd-docs.mjs';

const UNITS = { mu: ' J m⁻² s⁻½ K⁻¹', muWet: ' J m⁻² s⁻½ K⁻¹', thinC: ' J m⁻² K⁻¹', tau: ' d', storage: ' mm' };
const cell = (p, k = '') =>
  `${p.value}${UNITS[k] ?? ''} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'}${p.note ? ` (${p.note})` : ''}`;
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;

/** Largest value of the daytime wall term 6 K x K/900 on the design day. */
export function wallTermMax() {
  let max = 0;
  for (let m = 0; m < 1440; m++) {
    const s = solarPosition(SCENE.site, m / 60);
    const ir = irradiance(s.alt);
    max = Math.max(max, (6 * (ir.beam * Math.max(0, Math.sin((s.alt * Math.PI) / 180)) + ir.diffuse)) / 900);
  }
  return max;
}

/** Markdown for the "Model vs literature targets" table (also checked by tests). */
export function targetsMarkdown(rows) {
  const lines = rows.map((r) => {
    const val = r.rel ? `air ${signed(r.value)}` : f1(r.value);
    const range = r.rel ? `air ${signed(r.lo, 1)} to ${signed(r.hi, 1)}` : `${r.lo}–${r.hi}`;
    return `| ${r.label} | ${r.h}:00 | ${val} | ${range} | ${r.inside ? 'inside' : '**outside**'} |`;
  });
  const out = rows.filter((r) => !r.inside).length;
  return `| Surface (model region mean) | Hour | Model °C | Brief range °C | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${rows.length} values fall outside the brief's ranges. These are known deviations of this simple
model, not tuned away; ranges are the research brief's exact figures (targets for air 25–35 °C).`;
}

export function sensitivityMarkdown(cases) {
  const keys = ['treeShade', 'water', 'grass', 'coolRoof', 'shadedPaving', 'asphalt', 'darkRoof'];
  const rows = cases.map((c) => `| ${c.label} | ${keys.map((k) => f1(c.means[k])).join(' | ')} | ${c.flips.length ? c.flips.map(([a, b]) => `${a} ≥ ${b}`).join(', ') : 'order holds'} |`);
  return `| Case (one change) | tree shade | water | grass | cool roof | shaded paving | asphalt | dark roof | 15:00 order |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}`;
}

export function glossaryMarkdown(world, model) {
  const st = glossaryStats(world, model);
  return Object.entries(GLOSSARY)
    .map(([k, g]) => `- **${g.term}**${g.scenes ? ` (${g.scenes.join(', ')} only)` : ''}: ${rangeLine(k, st)} ${g.model ? '[this model]' : `[${g.src}]`}`)
    .join('\n');
}

/** Block 2 model-vs-literature table (also checked by tests). */
export function bandsMarkdown(rows) {
  const r = (x) => (x === null ? '' : signed(x, 1));
  const lines = rows.map((x) => `| ${x.label} | ${signed(x.value)} | ${x.lo === null ? `> ${r(x.hi)}` : x.hi === null ? `> ${r(x.lo)}` : `${r(x.lo)} to ${r(x.hi)}`} | ${x.kind === 'spec' ? 'acceptance' : 'literature'} | ${x.src} | ${x.inside ? 'inside' : '**outside**'} |`);
  const out = rows.filter((x) => !x.inside);
  return `| Comparison (After minus Before, same cells) | Model K | Band K | Use | Source | |
|---|---|---|---|---|---|
${lines.join('\n')}

${out.filter((x) => x.kind === 'spec').length} of ${rows.filter((x) => x.kind === 'spec').length} acceptance bands and ${out.filter((x) => x.kind === 'lit').length} of ${rows.filter((x) => x.kind === 'lit').length} literature comparisons fall outside. They are reported, not tuned away: every input stays at its cited value or inside its cited range.`;
}

export function waterMarkdown(w) {
  const ds = w[Object.keys(w)[0]].days.map((x) => x.d);
  const rows = Object.entries(w).map(([id, v]) => `| \`${id}\` | ${v.storage} | ${v.days.map((x) => x.max.toFixed(1)).join(' | ')} | ${v.total.toFixed(1)} |`);
  return `| Material | storage mm | ${ds.map((d) => `d = ${d}`).join(' | ')} | sum d = 0–${ds[ds.length - 1]} |
|${'---|'.repeat(ds.length + 3)}
${rows.join('\n')}`;
}

export function sensitivity2Markdown(cases) {
  return `| Case (one change, within the cited range) | Measure, hour, d | shipped ΔTs K | changed ΔTs K |
|---|---|---|---|
${cases.map((c) => `| ${c.label} | ${c.measure}, ${c.h}:00, d = ${c.d} | ${signed(c.base)} | ${signed(c.value)} |`).join('\n')}`;
}

function retrofitMarkdown() {
  const { after } = base2();
  const D = diagnostics();
  const a = after(D_DEFAULT, true);
  const w = water();
  const exceed = Object.entries(w).filter(([, v]) => v.total > v.storage).map(([id, v]) => `\`${id}\` (${v.total.toFixed(1)} mm vs ${v.storage} mm)`);
  const ef = (id, d) => decay(MATERIALS[id].ef.value, MATERIALS[id].efWet.value, MATERIALS[id].tau.value, d).toFixed(2);
  return `## Block 2: retrofit parameters

The second block (\`cities/sponge-retrofit\`) shows one invented 400 m block twice: **Before** (dark membrane
roofs, dense asphalt, few trees) and **After** a sponge-city and cool-roof retrofit. Its materials are in the
parameter table above (\`coolroofAged\`, \`coolroofNew\`, \`greenroof\`, \`pavers\`, \`porousAsphalt\`,
\`coolPaveAged\`, \`coolPaveNew\`, \`raingarden\`, \`youngCanopy\`); its research brief is
[\`docs/research/retrofit-brief.md\`](research/retrofit-brief.md).

- **Aged / new.** The page defaults to aged materials (cool roof α 0.60, coating α 0.18); "new" switches to
  α 0.80 and 0.25. Aged cool-roof albedo 0.60 sits in the aged range 0.50–0.70, of which 0.60–0.70 is unverified.
- **Days since rain d** (0–${D_MAX}, default ${D_DEFAULT}; d = 0 is a clear day after overnight rain). Wetted materials
  decay from wet to dry: X(d) = X_dry + (X_wet − X_dry)·exp(−d/τ), for the evaporative fraction and, for the green
  roof, the substrate admittance μ (600 dry → 1200 wet). τ = 1 d for pavers and porous asphalt (calibrated to
  Li 2013 in the brief), 3 d for rain-garden soil (McColl 2017 drydown; median not checked), 4 d for green-roof
  substrate (unverified). Irrigated lawn does not decay. For example the pavers' evaporative fraction is
  ${ef('pavers', 0)} at d = 0, ${ef('pavers', 1)} at d = 1 and ${ef('pavers', 3)} at d = 3. EF(d) is held for the whole day.
- **Young street trees** transmit exp(−0.5·LAI) = 0.47 of the sun with LAI 1.5 (brief range 0.37–0.61 for LAI 1–2,
  unverified); mature trees keep 0.17.
- **Shared run.** Before is run in full. After reuses every Before cell whose inputs (material parameters, sky view
  factor, sunlit share in all 144 sun slots) are identical, and runs the other ${a.info.changed} cells with the same
  force-restore scheme and convergence test (this run: ${a.info.subDays} days, final max |ΔTd| = ${a.info.subMaxDelta.toFixed(3)} K).
  After is always derived from the same Before run, so a state does not depend on the order the controls were used.
- **Air temperature is a fixed forcing**, identical in both states: the model cannot show air cooling, and the
  page does not claim any. Air-temperature effects on the cards are quoted from the literature and labelled so.

### Measures

Each card compares the same cells Before and After: cells with the measure's After material in full sun (> 95%)
in both states at that hour; for young trees, ground cells their crowns shade at that hour. Tmrt is for a
person standing on those cells (roofs have none).

| Measure | Sources | Card literature line |
|---|---|---|
${MEASURES.map((m) => `| ${m.name} | ${m.sources.map((k) => `[${k}]`).join(' ')} | ${m.lit} |`).join('\n')}

### Model vs literature (block 2)

${bandsMarkdown(bandRows())}

Notes on the rows outside:

- **Coating, pedestrian Tmrt — a structural limit of this model.** No single coating albedo meets both Middel bands
  here. The new coating (α 0.25) gives ΔTs ${signed(D.coatNew.dTs)} K (inside) but ΔTmrt ${signed(D.coatNew.dTmrt)} K (short);
  α 0.30, the brief's step, gives ΔTmrt ${signed(D.coat030.dTmrt)} K (inside) but ΔTs ${signed(D.coat030.dTs)} K (beyond −6 K).
  The model raises Tmrt by about ${D.ratio.toFixed(2)} K per K of surface cooling, against about 0.8 in Middel's
  measurements (+4 K Tmrt for −4 to −6 K surface). Diffuse wall reflection (added engine-wide in #8, wall albedo
  0.3) moved the new coating's ΔTmrt from +2.6 K to ${signed(D.coatNew.dTmrt)} K, toward the band but not into it: the
  extra sunshine the walls bounce onto people is now in the model, but walls here are scattered, not mirrors, and
  the wall term uses one albedo and a half-sunlit wall for every street (an engine assumption).
- **Permeable pavers.** At d = 0 the model is just short of the −15 K end of Li 2013's range (${signed(bandRows()[6].value)} K);
  at d = 1 it is just beyond the −7 K end (${signed(bandRows()[7].value)} K). Two things drive the d = 1 miss:
  (1) the albedo step 0.12 → 0.26 alone makes dry pavers (d = 7) ${signed(D.paversDry)} K cooler than asphalt, so most of the
  d = 1 difference is the albedo floor and only the rest is moisture; (2) τ = 1 d, which the brief describes as
  "calibrated to Li 2013", does not reproduce Li in this model: τ ≈ 0.8 d would (d = 0 ${signed(D.tau08d0)} K, d = 1 ${signed(D.tau08)} K).
  τ = 1 d is the approved brief value and is kept; it is not re-calibrated. The pavers' μ (870, an engine assumption
  with no cited range) is a second lever, also left alone (see the sensitivity table).
- **Aged coating rows** compare a one-year-old coating with a band measured on a fresh one; they are expected to
  fall short and are shown to make the ageing visible.

### Who cools the walkers

At 15:00 the share of route sample points (every 2 m along both pavements of every walker route) where a person's
Tmrt is 65 °C or more — the sweat-cue threshold — is ${(D.walk.before.share * 100).toFixed(1)}% Before, ${(D.walk.after.share * 100).toFixed(1)}% After, and
${(D.walk.afterNoTrees.share * 100).toFixed(1)}% for After **without the young street trees** (mean Tmrt ${f1(D.walk.before.mean)}, ${f1(D.walk.after.mean)} and ${f1(D.walk.afterNoTrees.mean)} °C).
**The drop in sweating walkers After comes entirely from the young trees.** The roofs do not touch pedestrians, nobody
walks on the coated road, and the sponge measures and reflective paving alone leave walkers as hot or slightly hotter
(the lighter pavers add ${signed(D.paversNoonTmrt)} K Tmrt at noon). Shade is what cools people; the young-trees card says so.
The trees' crown size (radius 2.6 m, centre 4.4 m) is an engine (scene) assumption, their transmission 0.47 the
brief's mid value, and their kerb-side placement a design choice of this invented block.

### Water budget

Daily evaporated depth = Σ EF·max(Q*, 0)·Δt / 2.45·10⁶ J kg⁻¹, from the stored 15-min surface temperatures, maximum
over each material's cells, in mm, for each d (aged materials). The check is that no single day evaporates more
water than the material holds after rain (storage values: brief, or engine assumptions where marked).

${waterMarkdown(w)}

The daily check holds, but only because the brief's "a few mm" for pavers and porous asphalt is read as 5 mm: porous
asphalt evaporates up to ${w.porousAsphalt.days[0].max.toFixed(2)} mm and pavers ${w.pavers.days[0].max.toFixed(2)} mm at d = 0, so a storage of 4 mm would fail for porous
asphalt and 3 mm for both. ${exceed.length ? `Summed over a whole dry week, ${exceed.join(' and ')} evaporate more than they hold: the decay rule does not stop when the stored water runs out, and the dry evaporative fraction (0.02) keeps drawing a little water. The excess is small and comes after the surfaces are effectively dry, but it is a known inconsistency of the simple rule.` : 'Summed over a whole dry week, every material stays within its storage.'}

### Sensitivity (block 2)

${sensitivity2Markdown(sensitivity2())}

## Sponge city

The sponge-city card follows the State Council General Office guideline of October 2015 (国办发〔2015〕75号) [sponge2015]:
manage rain where it falls — let it soak in, slow it, store it, clean it, use it, then drain it (渗、滞、蓄、净、用、排) — with
green roofs, permeable paving, rain gardens and wetlands; absorb and use 70% of rainfall on site, applied as a
control rate for total annual runoff (年径流总量控制率); 20% of built-up area by 2020 and 80% by 2030. Flooding and water
supply come first; cooling is a co-benefit. **No robust measured block-scale cooling figure for sponge-city retrofits was
found, so the page quotes none.** The primary Chinese text was not located; the summary follows the English notice
(gov.cn, 2015-10-16), a reprint (waizi.org.cn/law/6860.html) and a MOHURD interpretation (cs.com.cn), so it is marked
unverified on the card. Rain, runoff and flooding are not modelled.

## Trade-offs

- **Reflective (cool) pavement cools the road, not the person.** The model's Tmrt already includes sunshine reflected
  up from the ground, so a lighter street raises a pedestrian's midday Tmrt while its surface cools (Middel et al.
  2020 measured about +4 K Tmrt and −4 to −6 K surface in Los Angeles). The card says so and pairs it with shade.
  Walls now reflect sunshine diffusely (wall albedo 0.3, half the wall taken as sunlit; #8), so light bounced onto
  the pavements from building faces is included in a simple, street-averaged form (Middel saw +20–30 W m⁻² on
  sidewalks in the evening).
- **Porous asphalt is hotter when dry.** It is darker (α 0.08) and lighter-weight than dense asphalt, so it only
  cools in the first day or two after rain (Li et al. 2013: dry porous asphalt about +5 K).
- **Pavers are lighter, so they also reflect more sun onto people** at midday once dry; the pavers card shows ΔTmrt.
- **Ageing:** a coating that starts at 0.26 is about 0.18 after a year (Ko et al. 2022); in-service cool roofs often sit
  below their aged rating (LBNL-6714E). The page defaults to aged values.
`;
}

export function sourcesMarkdown() {
  const { world, model } = base();
  const rows = Object.entries(MATERIALS).map(([id, m]) => {
    const ks = paramKeys(m);
    const heat = m.thinC ? `C ${cell(m.thinC, 'thinC')}` : m.mu ? `μ ${cell(m.mu, 'mu')}` : '—';
    const wet = ['efWet', 'muWet', 'tau', 'storage'].filter((k) => m[k]).map((k) => `${{ efWet: 'EF wet', muWet: 'μ wet', tau: 'τ', storage: 'storage' }[k]} ${cell(m[k], k)}`);
    return `| ${m.name} (\`${id}\`) | ${cell(m.alpha)} | ${cell(m.eps)} | ${heat} | ${ks.includes('ef') ? `${m.efWet ? 'dry ' : ''}${cell(m.ef)}` : '—'} | ${wet.length ? wet.join('; ') : '—'} |`;
  });
  const prescribed = Object.entries(MATERIALS).filter(([, m]) => m.prescribed).map(([id, m]) => `- \`${id}\`: ${m.prescribed}`);
  const caveats = Object.entries(MATERIALS).filter(([, m]) => m.caveat).map(([id, m]) => `- \`${id}\`: ${m.caveat}`);
  const consts = Object.entries(MODEL).map(([k, p]) => `| \`${k}\` | ${cell(p)} |`);
  const wmax = wallTermMax();
  return `# Sources and parameters

Generated by \`node scripts/sources.mjs\` from \`engine/materials.js\` and model runs; do not edit by hand.

Each value carries a source key and a basis tag:

${Object.values(BASIS).map((b) => `- *${b}*`).join('\n')}

Values marked *unverified* have not been checked against the primary source yet; the heat cards
label them the same way. "Cited" ranges are the research brief's figures, which it compiled from
the sources listed below without checking them.

## Surface parameters

| Material | albedo α | emissivity ε | heat storage (μ, or thin-layer C) | evaporative fraction | wet after rain, drying time, water held (block 2) |
|---|---|---|---|---|---|
${rows.join('\n')}

Not used by the grid model:

${prescribed.join('\n')}

Shown on the heat cards as a caveat:

${caveats.join('\n')}

## Model constants

| Constant | Value |
|---|---|
${consts.join('\n')}

The wall term's daytime part peaks at ${f1(wmax)} K on the design day (total wall excess up to ${f1(2 + wmax)} K above air).

## Source keys

${Object.entries(SOURCES).map(([k, v]) => `- **[${k}]** ${v}`).join('\n')}
- **[noaa]** NOAA Global Monitoring Laboratory, General Solar Position Calculations (solareqns.PDF)
- **[brutsaert]** Brutsaert (1975) Water Resources Research 11(5) 742-744, clear-sky emissivity
- **[meinel]** Meinel & Meinel (1976) Applied Solar Energy, clear-sky beam irradiance
- **[solweig]** Lindberg, Holmer & Thorsson (2008) Int. J. Biometeorol. 52, 697-713, SOLWEIG mean radiant temperature

## Equations

- Sun position [noaa]: fractional-year γ, equation of time, declination, true solar time, hour angle → zenith and azimuth.
- Surface energy balance, force-restore [deardorff]:
  dTs/dt = (2√π / (μ√τ))·G − (2π/τ)·(Ts − Td), τ = 86400 s, Td = previous-day mean of Ts.
  Thin layers (sheet-metal roofs) use dTs/dt = G / C with no restore term [brief].
  1-min steps; the design day repeats until max |ΔTd| < 0.05 K (at least 3 days; this scene converges after ${model.info.days} days, final max |ΔTd| = ${model.info.maxDelta.toFixed(3)} K).
  G = (1−α)·K↓ + ε·L↓ − εσTs⁴ − h_c·(Ts − Ta) − EF·max(Q*, 0). The brief writes EF·Q*; clipping at 0 is an *engine assumption* so latent heat never warms a surface at night.
- Shortwave: K↓ = sunlit·I_b·sinβ + SVF·D + K_wr (+ r·I_b·sinβ off glass, block 3), I_b = 1361·0.7^(AM^0.678) [meinel], D = 0.12·I_b·sinβ [brief]; tree shade transmits exp(−0.5·LAI) ≈ 0.17 (LAI 3.5 is an *engine assumption*).
- Longwave: L↓ = SVF·ε_sky·σTa⁴ + (1−SVF)·L_wall, L_wall = σT_wall⁴ for opaque walls (glass walls: block 3), ε_sky = 1.24·(e_a/Ta)^(1/7) [brutsaert], T_wall = Ta + 2 K + 6 K·(K↓/900) (*engine assumption*, peaks at ${f1(wmax)} K + 2 K, ignores wall orientation).
- Convection: h_c = 5.7 + 3.8·u [oke], the same for roofs and ground.
- Water: Ts = daily mean Ta − 1 K + 1 K·sin(2π(t − 9 h)/24) [brief].
- Tree leaves: air + 2.5 K·(K↓/900) by day, air − 0.5 K at night (*engine assumption*; brief: air +0–3 K).
- Air temperature [brief]: sinusoid with Ta,min at sunrise and Ta,max at 15:00, implemented as two half-cosines (rise and fall).
- Sky view factor: horizon scan, SVF = mean over 16 azimuths of cos²(horizon elevation); canyon check against cos(arctan(2H/W)).
- Shortwave reflected by opaque walls (all blocks, added in #8) [brief3]: K_wr = α_w·(1 − SVF_open)·c·K_wall with
  K_wall = f_lit·I_b·cosβ/π + 0.5·D + 0.5·α_g·G, α_w = ${MODEL.wallAlbedo.value} (*cited range*, unverified), f_lit = ${MODEL.wallLit.value} (*engine assumption*),
  α_g the cell's own albedo, G = I_b·sinβ + D unshaded, SVF_open the building-only sky view factor and c = 1 − 0.75·crown cover
  (as for the sky). The brief gives the SOLWEIG form α_w·G·(1 − ψ) from memory; this is an *interpretation*. Glass walls are
  left out of it (they reflect specularly, block 3). K_wr adds to K↓ and to a person's sides.
- Mean radiant temperature [solweig], simplified six-direction sum: Tmrt = ((S_str + L_str)/(a_p·σ))^¼ − 273.15, a_k = 0.7, a_p = 0.97, f_p = 0.308·cos(β(1 − β²/48402));
  K_lat = 0.5·K_sky + 0.5·α·K↓ + 0.5·K_wr; glass adds a beam r·I_b from the mirrored sun (same altitude, same f_p).
- Pedestrian route cost [melnikov]: sun distance + w_b × building-shade distance + w_t × tree-shade distance, with w_b = 1 − 0.16·s and w_t = 1 − 0.08·s.
  w_b = 0.84 at full heat is cited; w_t = 0.92 is an *interpretation* of "tree shade about half as effective"; the heat factor s rises linearly from 0 at air ≤ 26 °C to 1 at air ≥ 32 °C (*engine assumption*, not in the source). The same weights drive the sideways drift toward shade within a pavement (only when air > 28 °C).

## Glossary sources

Numbers quoted in the on-page footnotes (\`engine/glossary.js\`). Literature ranges carry a source key;
"In this model" lines are computed from the model at load, the same way as here.

${glossaryMarkdown(world, model)}

## Model vs literature targets

${targetsMarkdown(targetRows(world, model))}

## Sensitivity

The spec's 15:00 order (${TIERS.map((t) => t.join(' / ')).join(' < ')}) holds as shipped, but **it depends on
edge-of-range values** for the lawn (evaporative fraction 0.8, albedo 0.25) and the cool roof (albedo 0.80).
Moving any one of them toward the middle of its cited range breaks it. Region means at 15:00, °C:

${sensitivityMarkdown(sensitivity())}

${retrofitMarkdown()}
${cbdMarkdown()}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const md = sourcesMarkdown();
  if (process.argv.includes('--print')) process.stdout.write(md);
  else writeFileSync(fileURLToPath(new URL('../docs/sources.md', import.meta.url)), md);
}
