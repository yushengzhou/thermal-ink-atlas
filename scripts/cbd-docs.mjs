// docs/sources.md section for block 3 (glass CBD), generated from the code and
// model runs (scripts/cbd.mjs).
import { GLASS, GLASS_IDS, GLASS_DEFAULT, MODEL, BASIS } from '../engine/materials.js';
import { base3, canyonSvfRows, fresnelRows, specularCheck, SPECULAR_CASES, spotRows, canyons, wallBound, walkers, bands3, dTmrtByRho, epClearShapeDiff, maxSpotCell } from './cbd.mjs';
import { glassRho } from '../engine/reflect.js';
import { SPOT_MIN, WARM, spotClasses, canyonStats } from '../engine/cbd.js';
import { glossaryStats } from '../engine/glossary.js';
import { AC } from '../engine/cbd.js';
import { diagnostics } from './retrofit.mjs';
import { glassTemp } from '../engine/reflect.js';
import { irradiance } from '../engine/thermal.js';
import { solarPosition } from '../engine/sun.js';

/** Glass temperature rise above air at 15:00 for a face lit head-on (cos theta = 1). */
function tgRise(id) {
  const { scene } = base3();
  const ir = irradiance(solarPosition(scene.site, 15).alt);
  return glassTemp(0, ir.beam, ir.diffuse, 1, GLASS[id].absorb.value);
}

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (p) => `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'}${p.note ? ` (${p.note})` : ''}`;

/** Glossary numbers for block 3, computed as on the page (app.js). */
export function cbdGlossaryStats() {
  const { world, setup, scene, refs } = base3();
  const T = setup.model(GLASS_DEFAULT);
  const c = spotClasses(world, T, 15);
  const m = (a) => a.reduce((x, i) => x + T.tmrt(i, 15), 0) / Math.max(1, a.length);
  return glossaryStats(world, T, {
    canyon: canyonStats(world, T, scene.canyons.lane, refs.stone),
    spot: { tmrtShade: m(c.shade), tmrtSun: m(c.sun), tmrtSpotShade: m(c.spotShade), tmrtSpotSun: m(c.spotSun), glassName: GLASS[GLASS_DEFAULT].name.toLowerCase() },
  });
}

/** Block 3 acceptance table (also checked by the tests). */
export function bands3Markdown(rows) {
  const v = (r) => (r.unit === '°C' ? f1(r.value) : r.unit === 'K' ? signed(r.value) : r.unit === 'm' ? signed(r.value, 2) : signed(r.value, 3));
  const b = (r) => (r.lo === null ? `≤ ${r.hi}` : r.hi === null ? `≥ ${r.lo}` : `${r.lo} to ${r.hi}`);
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit && r.unit !== 'm' ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${r.inside ? 'inside' : '**outside**'} |`);
  const out = rows.filter((r) => !r.inside).length;
  return `| Check (spec #8) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${rows.length} checks fall outside their band. They are reported, not tuned away: every input stays at its cited value or inside its cited range.`;
}

export function cbdMarkdown() {
  const { world, setup, scene, refs } = base3();
  const svf = canyonSvfRows();
  const fr = fresnelRows();
  const spots = spotRows();
  const c = canyons();
  const wb = wallBound();
  const wk = walkers();
  const rows = bands3();
  const T = setup.model(GLASS_DEFAULT);
  const ac = (g) => spots.find((r) => r.g === g && r.h === 15);
  const lowe15 = dTmrtByRho('lowe', 15);
  const ep = epClearShapeDiff();
  const mx = maxSpotCell();
  const mxF = mx.facades.map((f) => `the ${f.name}'s ${f.face} face (θ ${f1(f.theta)}°, ρ ${f3(f.rho)}${f.cover < 0.999 ? `, ${Math.round(f.cover * 100)}% of the cell` : ''})`).join(' and ');
  const glassRows = GLASS_IDS.map((id) => {
    const g = GLASS[id];
    return `| ${g.name} (\`${id}\`) | ${cell(g.rho0)} | ${f2(glassRho(g.rho0.value, 45))} / ${f2(glassRho(g.rho0.value, 70))} / ${f2(glassRho(g.rho0.value, 80))} | ${cell(g.absorb)} | ${cell(g.eps)} |`;
  });
  const spec = SPECULAR_CASES.map(([h, f]) => {
    const fine = specularCheck({ hour: h, face: f, cell: 0.5 });
    const grid = specularCheck({ hour: h, face: f, cell: 2.5 });
    return `| ${f} face, ${h}:00 | ${f1(fine.theta)}° | ${f3(fine.rho)} | ${f1(fine.expectE)} | ${f1(fine.cellE)} | ${f1(fine.farExpect)} m | ${f1(fine.far)} m | ${f3(fine.closure)} | ${f3(grid.closure)} |`;
  });
  return `## Block 3: glass CBD

The third block (\`cities/glass-cbd\`) is an invented 400 m CBD block: glass curtain-wall towers (40–120 m) along Meridian
Avenue, a small plaza around the 80 m Plaza Tower, and stone-clad mid-rise blocks either side of Silk Lane. Its research
brief is [\`docs/research/cbd-brief.md\`](research/cbd-brief.md). Canyons: ${c.deep.name} between the Guild Building
(60 m) and the Exchange Tower (120 m), H/W ${f1(c.deep.hw)}; ${c.lane.name}, 30 m and 26 m stone walls 12 m apart, H/W ${f1(c.lane.hw)}.
The rows south and east of the plaza are kept low so the avenue and plaza stay in view (an isometric view from the
south-east hides any street floor behind a building taller than the street is wide).

- **Glass type** (\`?glass=clear|lowe|mirror\`, buttons, \`G\`): every curtain wall in the block uses the chosen glass;
  the page opens on ${GLASS[GLASS_DEFAULT].name.toLowerCase()}. Each type is its own model run, so changing it re-runs the model.
- **Model run.** Block 3 starts each run with ${WARM} coarse days (10-min steps) before the 1-min days, to bring the deep
  temperature close sooner; the convergence test is unchanged and counts only 1-min days (this run: ${T.info.days} days,
  final max |ΔTd| = ${f3(T.info.maxDelta)} K); it lands at least as close to a 30-day reference run as the plain start (checked in
  \`tests/unit/cbd.test.mjs\`).
  The horizon scan uses 32 directions here (16 in blocks 1 and 2).
- **Air temperature is fixed**, as in blocks 1 and 2: canyon air heating, AC waste heat and the air warming measured in
  reflection zones are not modelled.

### Glass parameters

| Glass | reflectance ρ₀ (head-on) | ρ at 45° / 70° / 80° | solar absorptance a_g | outer emissivity ε |
|---|---|---|---|---|
${glassRows.join('\n')}

Wall and glass constants: wall albedo α_w ${cell(MODEL.wallAlbedo)}; sunlit share of a wall f_lit ${cell(MODEL.wallLit)};
glass outside film coefficient h_o ${cell(MODEL.glassHo)}; inside film coefficient h_i ${cell(MODEL.glassHi)}.
Singapore caps the daylight reflectance of façade glass at 20% [bca]; the low-e value sits at that cap.

### Street canyons

Sky view factor at the centre of an endless canyon is 1/√(1 + (2H/W)²). The engine's horizon scan (mean cos² of the
horizon elevation) reproduces it in the limit; at page settings (2.5 m steps, 160 m reach) it is coarser:

| H/W | 1/√(1+(2H/W)²) | scan in the limit (180 directions, 0.25 m) | block 3 page (32 directions) | blocks 1–2 page (16 directions) |
|---|---|---|---|---|
${svf.map((r) => `| ${r.hw} | ${f3(r.exact)} | ${f3(r.fine)} | ${f3(r.cbd)} | ${f3(r.app)} |`).join('\n')}

| Canyon | H/W | floor SVF (model) | endless canyon | floor at 15:00 in shade | open surface at 15:00 | floor at 05:00 | open surface at 05:00 | night lag |
|---|---|---|---|---|---|---|---|---|
${['lane', 'deep'].map((k) => `| ${c[k].name} (${scene.canyons[k].mat}) | ${f1(c[k].hw)} | ${f2(c[k].svf)} | ${f2(c[k].svfCanyon)} | ${c[k].nShade15 ? `${f1(c[k].ts15Shade)} °C (reflection off ${f1(c[k].ts15ShadeOff)} °C)` : 'not in shade'} | ${f1(c[k].open15)} °C | ${f1(c[k].ts05)} °C | ${f1(c[k].open05)} °C | ${signed(c[k].lag05)} K |`).join('\n')}

"Open surface" is a reference cell of the same material with SVF 1 and no shade or walls, run on the same design day.
The floors' SVF sits above the endless-canyon value because the streets are short and open at their ends.

- **Night lag is an engine result** (the spec's +2 to +6 K band is engine-derived): at night walls are held at air + 2 K
  (they store no heat), so the lag comes only from walls replacing the cold sky, less the heat the floor missed while
  shaded by day. ${c.deep.name}, shaded most of the day, ends up no warmer than open asphalt at 05:00.
- **Oke (1981)** [oke1981]: calm-night maximum urban–rural *air* difference ≈ 7.45 + 3.97 ln(H/W) K, about ${f1(7.45 + 3.97 * Math.log(c.lane.hw))} K at
  H/W ${f1(c.lane.hw)}. It compares city air with rural air, not one surface with another, and the coefficients come from a secondary
  source (unverified); Theeuwes et al. (2014) [theeuwes2014] show it breaks down at high H/W. Quoted on the canyon card, not modelled.
- **Daytime:** Fez (H/W about 10) was about 6 K, up to 10 K, cooler than open streets by day (Johansson 2006) [johansson2006].
  ${c.deep.name}'s floor is in shade at 15:00 but got about two hours of sun around noon and, in the early afternoon, the reflected
  sun of the Exchange Tower's west face; it reads ${f1(c.deep.ts15Shade)} °C, outside the brief's 34–40 °C for shaded paving
  (with the reflection off: ${f1(c.deep.ts15ShadeOff)} °C). Block 1's shaded paving is outside the same band (see above).

### Glass optics

Fresnel reflectance of an uncoated float-glass pane, n = 1.52, two surfaces, non-absorbing, with multiple reflections
between the surfaces, computed per polarisation and then averaged (unpolarised sun) [fresnel]:

| θ | brief | Fresnel (this model) | clear (ρ₀ 0.08) | low-e (ρ₀ 0.20) | mirror (ρ₀ 0.35) |
|---|---|---|---|---|---|
${fr.map((r) => `| ${r.th}° | ${r.brief} | ${f3(r.model)} | ${f3(r.clear)} | ${f3(r.lowe)} | ${f3(r.mirror)} |`).join('\n')}

The brief's table is a little higher at 60–80° (0.41 vs ${f3(fr[4].model)} at 75°): it matches applying the two-surface
formula 2R/(1 + R) to the polarisation-averaged single-surface R. Both are inside the acceptance band at 75° (0.41 ± 0.03).
Coated glass keeps the clear-glass angular shape, scaled so that ρ(0) = ρ₀ and ρ(90°) = 1:
ρ(θ) = ρ₀·(1 − ρ̄(θ)) + ρ̄(θ), ρ̄(θ) = (R(θ) − R(0))/(1 − R(0)). This is the EnergyPlus form for coated glass [energyplus]
(origin given there as Finlayson et al. 1993, WINDOW 4.0 documentation, LBL-33943; not checked), with two differences:
the engine uses exact normalised Fresnel for ρ̄ instead of EnergyPlus's 4th-order polynomial fit in cos θ (largest
difference ${f3(ep.max)} at ${ep.at}°, the fit is a little lower), and EnergyPlus switches to a bronze-glass curve when the normal
transmittance is ≤ 0.645 (likely for low-e and mirror products), while the engine always uses the clear shape. LBNL finds
coated glass up to about 8% off the clear-glass shape at 60°. **At grazing incidence every glass reflects strongly**: at 15:00 the sun is
at azimuth 261°, so the south faces are lit at about 84° and reflect 0.7–0.8 of the beam whatever the glass type.

### Specular reflection

Single bounce of the direct beam off every sunlit glass façade [brief3]: mirrored sun vector s′ = s − 2(s·n)n (same
altitude, mirrored azimuth); for each ground sample p, if the ray from p along s′ first hits glass of façade f at a point
that is itself in sun (both rays tested against every other building, clipped to the space in front of the façade, and
crowns transmitting as for shade), p receives ρ(θ)·I_b·sinβ on the ground and a person there an extra beam ρ(θ)·I_b
(S_str += a_k·f_p·ρ·I_b). The reflected beam is evaluated where it reaches the ground (z = 0), not at a person's height,
a negligible shift (about 1 m along the beam). Coverage across the façade normal is clipped analytically: a sample stands
for a square, and a strip thinner than a sample (grazing incidence) is counted with its true area, so no façade lights more
ground than its unobstructed area A·cosθ/sinβ (checked in the block, 8:00–17:00). Samples: 2 × 2 per 5 m cell, every 10-min sun slot, only under each sunlit façade's reflected
beam (the projection of the façade along −s′, landing up to H/tanβ away). Reflections land on the ground only (not on
lower roofs). Flat façades do not focus: no point gets more than Σ ρ(θ)·I_b·sinβ over the façades that face it.

Flat-ground checks (one 50 m × 60 m glass face on open ground, low-e glass):

| Case | θ | ρ(θ) | ρ I_b sinβ (W m⁻²) | lit cell (W m⁻²) | H/tanβ | far edge (0.5 m cells) | energy closure, 0.5 m cells | energy closure, page sampling (2.5 m) |
|---|---|---|---|---|---|---|---|---|
${spec.join('\n')}

At grazing incidence the spot is a thin strip (a south face at 84° throws a strip only ${f1(specularCheck({ hour: 15, face: 'S', cell: 0.5 }).farPlaneExpect)} m deep but over
50 m long), so the far edge along the mirrored azimuth moves in large steps per cell; measured as a distance in front of the
façade it is within one cell (see the acceptance table).

### Reflection spots (glass types)

A cell is in a reflection spot when it receives at least ${SPOT_MIN} of the direct beam off glass (r ≥ ${SPOT_MIN}). ΔTmrt
compares the same glass with the specular bounce switched off (same glass temperatures), same cells.

| Glass | Hour | spot cells | mean r | mean ΔTmrt | max ΔTmrt | Tmrt, spots in shade | plain shade | sun | spots in sun |
|---|---|---|---|---|---|---|---|---|---|
${spots.map((r) => `| ${GLASS[r.g].name} | ${r.h}:00 | ${r.n} | ${f2(r.r)} | ${signed(r.dTmrt)} K | ${signed(r.dTmrtMax)} K | ${f1(r.tmrtSpotShade)} °C (${r.nShade}) | ${f1(r.tmrtShade)} °C | ${f1(r.tmrtSun)} °C | ${f1(r.tmrtSpotSun)} °C |`).join('\n')}

Field comparison: Chengdu, Chunxi Road (August 2023), reflection zones Tmrt +4 to +13 °C, air +1–2 °C, UTCI +2–5 °C,
peak Tmrt 73.9 °C [du2025]. Wallenberg et al., who give SOLWEIG walls an albedo of 0.5, note that Tmrt is highest in front of sunlit façades [wallenberg2026].
Reflective façades lower cooling energy but raise canyon UTCI [chen2024]; low-emissivity glass can cut Tmrt by up to 5 K
in simulation [sanagar2025] (not modelled: glass emissivity is 0.84 for every type here).

### Walkers and the sweat cue

Walkers' route cost treats a reflection spot by its Tmrt: a class sits between building shade (w_b) and sun (1) in
proportion to where its mean Tmrt sits between plain shade and plain sun at that hour, w = w_b + (1 − w_b)(Tmrt − Tmrt_shade)/(Tmrt_sun − Tmrt_shade)
(*engine assumption* built on [melnikov]); spots in sun weigh more than 1. At 15:00 (low-e) the weights are ${f3(wk.weights[0])} for a spot in shade and ${f3(wk.weights[1])}
for a spot in sun (building shade ${f3(0.84)}). People per m² of walkable ground at 15:00: plain shade ${f3(wk.plainShade * 1000)}, spots in shade ${f3(wk.spotShade * 1000)},
all spots ${f3(wk.spots * 1000)}, sun ${f3(wk.sun * 1000)} (per 1000 m²). The sweat cue follows Tmrt (65 → 70 °C) for anyone in sun or in a
reflection spot; shaded spots stay below 65 °C here, so in practice it shows in sunlit spots.

### Diffuse wall reflection (all blocks)

Added engine-wide in #8 (see Equations). Bound check at the top of the wall-albedo range (α_w 0.5): the extra daily
shortwave on the canyon floors is ${(wb.lane.day * 100).toFixed(0)}% (${scene.canyons.lane.name}) and ${(wb.deep.day * 100).toFixed(0)}% (${scene.canyons.deep.name}); at 15:00 ${(wb.lane.h15 * 100).toFixed(0)}% and ${(wb.deep.h15 * 100).toFixed(0)}%
(the spec allows up to 30%; with the shipped 0.3 these are three fifths as large). It changed blocks 1 and 2 a little:
shaded paving and pavements near walls warm most (block 1 shaded paving at 15:00 went from 40.6 to 41.6 °C), and the block 2 coating's
pedestrian ΔTmrt rose from +2.6 to ${signed(diagnostics().coatNew.dTmrt)} K at noon (toward Middel's +3 to +5 K, still just short).

### Glass surface temperature

T_g = Ta + a_g·I_f/(h_o + h_i), I_f = I_b·max(0, cos θ) + 0.5·D per façade orientation (the brief's equation, a sunlit façade taken as fully lit; *assumption*,
no measurement found): at 15:00 on a face lit head-on, Ta + ${f1(tgRise('clear'))} K (clear) to Ta + ${f1(tgRise('mirror'))} K (mirror); ≈ Ta at night. Glass walls emit
ε_g·σT_g⁴ and reflect (1 − ε_g)·σTa⁴; each cell's wall view is split into opaque and glass (per orientation) by the horizon scan:
in each direction the building that sets the horizon takes that direction's wall view through the face the ray enters
(*engine assumption*: lower walls in front of it are not counted separately).

### AC rejected heat (information only)

Rejected heat = Q_cool·(1 + 1/COP) (at COP ${AC.cop}, 100 W of cooling rejects about ${Math.round(AC.rejected(100))} W). Dense urban areas 20–70 W m⁻² of
ground area, occasionally > 100 [xie2016]; central Tokyo > 400 W m⁻² by day [sailor2011]. No figure per m² of CBD office
floor was found. **The air temperature is fixed, so this heat is not felt in this model**: it is not added to any
surface temperature or Tmrt; the overlay only marks rooftop plant.

### Model vs acceptance bands (block 3)

${bands3Markdown(rows)}

Notes on the rows outside:

- **Spot ΔTmrt for ρ 0.1–0.3 and the +13 K ceiling.** The spec band counts the reflected share of the beam r = ρ(θ). The
  model's rise comes from three parts: the reflected beam on the person, the extra sunshine the ground reflects up, and
  the ground under the spot warming (low-e, 15:00: mean shaded-spot paving ${signed(ac('lowe').tsSpotShade - ac('lowe').tsSpotShadeOff)} K against reflection off).
  The mean for r 0.1–0.3 is inside for clear glass and just above +6 K for the coated glasses (low-e at 15:00
  ${signed(lowe15.mean)} K over ${lowe15.n} cells); over all spot cells every glass type and hour is above +6 K (rows above). The maximum
  (${signed(mx.d)} K, ${GLASS[mx.g].name.toLowerCase()}, ${mx.h}:00, a ${mx.sunlit > 0.95 ? 'sunlit' : mx.sunlit < 0.05 ? 'shaded' : 'part-shaded'} cell: Tmrt ${f1(mx.off)} → ${f1(mx.tmrt)} °C) is far above Chengdu's +13 K.
  That cell is lit by ${mx.facades.length === 1 ? 'one façade' : `${mx.facades.length} façades`}: ${mxF}. Façades lit at grazing angles reflect over half the beam for any glass.
  The glass here is ideally flat and frameless; mullions, frames and pane distortion that break up grazing reflections in
  real curtain walls are not modelled. Not tuned: ρ₀, a_g and the Fresnel shape stay at their cited values.
- **${c.deep.name} shaded floor at 15:00** is above 34–40 °C for the reasons in "Street canyons" (noon sun and reflected
  glare earlier in the afternoon; the engine's shaded paving also runs warm in block 1).

### Disclosures (block 3)

- **Wind:** one site wind speed (${scene.site.wind} m/s) sets convection everywhere; no channelling along canyons, no vortices, no
  tower downdraughts, no sheltering.
- **Air temperature is fixed:** no canyon air heat island, no warming of air in reflection zones (Chengdu: +1–2 °C), no AC
  waste heat.
- **AC heat is shown, not felt** (see above).
- **Second bounce ignored:** light reflected twice (off the opposite glass) carries ρ² of the beam, 0.04–0.16 of the first
  bounce for ρ 0.2–0.4 at normal incidence, more at grazing angles.
- **Concave façades are out of scope:** flat façades cannot focus. 20 Fenchurch Street (2013) focused up to a simulated
  3,384 W m⁻² (worst 4,176) [zhu2018]; the Vdara pool deck (2010) is anecdotal [vdara]; in scale models concave façades
  raised pedestrian sunshine by more than 300% [speroni2022]. The extreme-case card says so.
- Reflections land on ground only; lower roofs next to towers receive none. Glass reflects only specularly here (its
  diffuse part is ignored) and opaque walls only diffusely.
- Low-e and mirror reflectances, all absorptances, glass emissivity and the glass temperature balance are unverified
  (no datasheet or measurement was found).
`;
}
