// docs/sources.md section for block 5 (hutong lanes and courtyards),
// generated from the code and model runs (scripts/hutong.mjs).
import { MODEL, MATERIALS, BASIS } from '../engine/materials.js';
import { WARM_HT, splashParams } from '../engine/hutong.js';
import { wetBulb, QSAT_DT } from '../engine/thermal.js';
import { base5, extras5, bands5, afternoon5, longShade5, walkers5, roofSensitivity5 } from './hutong.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (p) => `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'}${p.note ? ` (${p.note})` : ''}`;
const hhmm = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

/** Block 5 acceptance table (also checked by the tests). */
export function bands5Markdown(rows) {
  const v = (r) => (Number.isInteger(r.value) ? String(r.value) : r.unit === 'K' ? signed(r.value, 2) : r.value.toFixed(3));
  const b = (r) => (r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${r.inside ? 'inside' : '**outside**'} |`);
  const out = rows.filter((r) => !r.inside).length;
  return `| Check (spec #10) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${rows.length} checks fall outside their band. They are reported, not tuned away: no input was moved to pass a band.`;
}

export function hutongMarkdown() {
  const { scene, world, setup, dry, wet, noon, lanes, s } = base5();
  const ex = extras5();
  const pm = afternoon5(wet);
  const ls = longShade5(wet);
  const wk = walkers5(15);
  const rows = bands5();
  const p = splashParams();
  const e = scene.site.vapourHpa;
  const laneRows = lanes.filter((l) => l.n).map((l) => `| ${l.name} (\`${l.id}\`) | ${l.mat} | ${l.W} | ${f1(l.H)} | ${f2(l.hw)} | ${l.n} | ${f2(l.svf)} | ${f2(l.svfCells)} | ${f2(l.svfCentre)} | ${l.noon ? `${f2(l.noon.sunlit)} / ${f2(l.noon.analytic)}` : '—'} | ${l.splash ? 'yes' : 'no'} |`);
  const { band } = base5();
  const rs = roofSensitivity5();
  const curve = s.curve.filter((c) => Math.abs(c.h * 2 - Math.round(c.h * 2)) < 1e-9).map((c) => {
    const h = c.h % 24;
    const m = (T) => band.reduce((a, i) => a + T.ts(i, h), 0) / band.length;
    return `| ${hhmm(c.h)} | ${f1(m(dry))} | ${f1(m(wet))} | ${signed(c.dTs, 2)} | ${f2(c.w)} | ${f1(wet.air(h))} | ${f1(wetBulb(wet.air(h), e))} |`;
  });
  const params = ['waterStore', 'satVapour', 'splashW0', 'splashBeta', 'splashWc', 'splashHour', 'shadeSamples', 'screenCover'].map((k) => `| \`${k}\` | ${cell(MODEL[k])} |`);
  const mats = ['greyBrick', 'greyTile', 'jujube', 'pomegranate', 'pagodaTree', 'pergola', 'awning'];
  const species = Object.entries(pm.trees).map(([k, t]) => `| ${MATERIALS[k].name} (\`${k}\`) | ${t.n} | ${f2(t.tr)} | ${f2(t.sunlit)} | ${f1(t.tmrt)} |`);
  const c = pm.court;
  return `## Block 5: hutong lanes and courtyards

The fifth block (\`cities/hutong\`) is an invented 400 m block in the manner of old Beijing: six bands of single-storey
courtyard houses (siheyuan), two rows to a band, back to back, between east–west lanes (hutong) 5 m wide, a 10 m main
lane with pagoda trees (Pagoda Tree Hutong, asphalt) and one north–south lane (Bell Lane). Every house is a 4 m
grey-brick box with a grey tile roof on a mud and lime back; each courtyard has a jujube, a pair of pomegranates or a
pagoda tree, ${scene.courts.filter((x) => x.pergola).length} have a vine pergola, and ${scene.courts.filter((x) => x.awning).length} the summer mat awning (tianpeng, 天棚) over
the whole yard. ${scene.splashCourts.length} of the ${scene.courts.length} courtyards (about two households in five, an assumption) and two
lanes (Jujube Lane and Lantern Lane) are splashed with water at ${p.hour}:00. The design day is 21 June (the solstice) at
39.9° N, air 25–35 °C, vapour pressure 25 hPa, wind 1 m/s: the brief's band conditions. Its research brief is
[\`docs/research/hutong-brief.md\`](research/hutong-brief.md).

The splash is shown with \`P\`, the panel button or \`?splash=0|1\` (default on).

### Materials and screens

${mats.map((id) => `- \`${id}\`: ${MATERIALS[id].name}. ${MATERIALS[id].note}`).join('\n')}

Their values and basis tags are in the Surface parameters table above. The brief's paving and roof values sit
inside wider product ranges: brick solar absorptance 0.45 (light grey) to 0.90 (slate grey) [midlandBrick]; clay
tile reflectance 0.40–0.50 for light terracotta, grey reduced-fired tile darker [carb]; northern roofs bed the tiles
on a mud and lime back, not ventilated [sohuRoof], so the cooler ventilated-tile result [miller2007] does not apply.
Tree species shade with their own crown
transmission tr = exp(−0.5 LAI) (LAI from the brief, unverified; no measured LAI for jujube or the pagoda tree was found).
Pergolas and awnings are flat screens: their cast shadow (a thin box at z ${scene.screens.find((x) => x.kind === 'pergola').z} m or
${scene.screens.find((x) => x.kind === 'awning').z} m) multiplies in their transmission; the cells under them count as fully covered for the sky view and
the wall reflection, with the crown factor 1 − 0.75 used for trees in every block. Trees enter the sky view the same
way, so the sky view here does **not** ignore trees (it is a crude crown factor, not a ray trace through leaves).

### Lanes

Lane geometry, from the model's grid (interior cells: walls on both sides, nothing overhead). Sky view: the model,
the endless canyon at the same cell centres (0.5/√(1 + (H/d₁)²) + 0.5/√(1 + (H/d₂)²)) and on the centre line
(cos(atan(2H/W))). Noon: the model's sunlit share at solar noon (${hhmm(noon.h)}, sun ${f1(noon.alt)}° high) vs 1 − (H/tan β)/W.

| Lane | Paving | W m | H m | H/W | n | SVF model | SVF canyon at cells | SVF centre line | noon sunlit model / formula | splashed |
|---|---|---|---|---|---|---|---|---|---|---|
${laneRows.join('\n')}

Two grid changes make 5 m lanes come out right; both are used only by this block (\`scene.shadeSamples\`, \`scene.svfExact\`):

- **Shade sampled every 1.25 m** (4 × 4 per 5 m cell instead of 2 × 2): at noon a 4 m wall casts ${f2(lanes.find((l) => l.id === 'jujube').noon.shadow)} m of shadow, which
  the 2.5 m samples of blocks 1–4 miss entirely. The building shade is found by marching each sample's ray toward the
  sun over the height grid (\`buildingMaskRay\`), which gives the same samples as the cast-shadow polygons (checked on
  every ground sample of the block for 48 sun positions) without visiting the footprints; the crown and screen shadows
  use a scanline version of the polygon rasteriser with the same inside rule (\`rasteriseScan\`).
- **Exact horizon scan** (\`svfGridAt\`): the 2.5 m horizon-scan step of blocks 1–4, started from the cell centre, lands
  exactly on a 5 m lane's wall line and sees the wall at 5 m on one side instead of 2.5 m (sky view 0.71 for the 5 m
  lanes instead of the canyon's 0.53). Here each ray steps from cell edge to cell edge and sees each wall at its true
  distance; 32 azimuths.
- The 10 m lane has no cell on its centre line: its cells sit 2.5 m from one wall, so the model's sky view (${f2(lanes.find((l) => l.id === 'main').svf)}) is
  that of those points, not of the centre line (${f2(lanes.find((l) => l.id === 'main').svfCentre)}). The acceptance row against the centre-line formula is outside (below) for this reason.
- Lanes narrower than the 5 m grid cannot be shown. Houses are boxes at eave height: the pitched roofs are drawn but
  are not in the shade or sky-view calculation (the brief: roof tilt negligible for pedestrian metrics).

### Evening splash: the surface water store

The model's evaporation term EF·max(Q*, 0) needs positive net radiation, which is gone after sunset: switched on
at ${p.hour}:00 (EF := 1 on the splashed lanes, no store) it changes the lane paving by at most ${f2(ex.ef.max)} K. So block 5
adds a per-cell water store W, engine-wide but empty unless a block asks for it (blocks 1–4 never enter the step;
their pages render the same pixels as before, \`tests/e2e/regression.test.mjs\`):

- LE = L·β(W)·(h_c/c_p)·max(0, q_sat(Ts) − q_a), β(W) = β_wet·min(1, W/W_c), dW/dt = −LE/L, W := W0 at ${p.hour}:00 every day;
  G = (1 − α)K + εL↓ − εσTs⁴ − h_c(Ts − Ta) − EF·max(Q*, 0) − LE (thermal.js \`stepSplash\`).
- q = 0.622·e/(p − 0.378·e) with p = 1013.25 hPa; e_s = 6.112·exp(17.67·T/(T + 243.5)) hPa [bolton1980]; in the
  1-min step q_sat comes from a ${QSAT_DT} K table of the same formula (linear between entries, within 2e-7 kg kg⁻¹; Math.exp per
  cell and minute was the slow part). The wet-bulb check uses the formula itself.
- Evaporation is explicit and capped so W never goes below 0. The splash model runs the wet-able cells (n ${setup.cells.length}) again
  with the store (${WARM_HT} coarse spin-up days, the coarse-step guard including the latent coupling at 40 °C; this run:
  ${wet.info.splashRun.days} 1-min days, max |ΔTd| ${wet.info.splashRun.maxDelta.toFixed(3)} K); the other cells are those of the dry model (no lateral
  coupling in this model).
- The design day repeats with a splash **every evening**, so the paving's daily mean is lower and the splashed lanes
  are ${f2(Math.abs(s.before))} K cooler even at 18:45, before the splash, and ${f2(Math.abs(s.next15))} K the next afternoon.

| Constant | Value |
|---|---|
${params.join('\n')}

The splashed lanes (n ${s.n}, sky view ${f2(s.svf)}), dry vs splash, °C:

| Time | dry | splash | ΔTs | W mm | air | wet-bulb |
|---|---|---|---|---|---|---|
${curve.join('\n')}

- Largest ΔTs within 1 h: ${signed(s.peak, 2)} K at ${hhmm(s.peakAt)}; ${signed(s.d23, 2)} K at 23:00; ΔTmrt ${signed(s.tmrt20, 2)} K at 20:00 and ${signed(s.tmrt21, 2)} K at 21:00.
- Water: one splash evaporates at most ${f2(s.perSplash)} of its ${s.w0} mm before the next (what is left at ${p.hour}:00 is topped up, not
  added); the day's evaporation balances the store to ${s.balanceErr.toExponential(1)} mm; the store's day-to-day drift is
  ${s.drift.toExponential(1)} mm (the model day is not exactly periodic). W is never negative.
- The wet paving stays at least ${f2(s.margin)} K above the air's wet-bulb temperature while water is left.
- Literature: Paris, about 1 L m⁻² per cycle, surface −7.5 K at 19:30 and −6 K at 20:30, lasting several hours
  [hendel2015]; air −0.79 K at most and Tmrt −1.76 K [hendel2016]; Kobe, 0.025 mm per pass, −2 to −4 K at once, gone
  within 30 min in sun, evening recommended [takebayashi2023]; a road 50 → 40 °C in about 60 min [kato2008].

**β_wet sensitivity** (the brief's range 0.3–1; shipped ${p.beta}), splashed lanes:

| β_wet | largest ΔTs within 1 h | ΔTs 23:00 | ΔTmrt 20:00 |
|---|---|---|---|
| ${p.beta} (shipped) | ${signed(s.peak, 2)} K | ${signed(s.d23, 2)} K | ${signed(s.tmrt20, 2)} K |
${ex.sens.map((x) => `| ${x.beta} | ${signed(x.peak, 2)} K | ${signed(x.d23, 2)} K | ${signed(x.tmrt20, 2)} K |`).join('\n')}

At β_wet 1 the largest ΔTs (${signed(ex.sens.find((x) => x.beta === 1).peak, 2)} K) and ΔTmrt (${signed(ex.sens.find((x) => x.beta === 1).tmrt20, 2)} K) fall outside the spec's bands;
${p.beta} (near the middle of the brief's range; the geometric mean of 0.3 and 1 is 0.55) was set in the code
before the first model run and was not changed after the bands were checked; 0.3 also passes, 1 does not.

### Roofs, shaded lanes, courtyards

- Grey tile roofs at 15:00: ${f1(pm.roof.mean)} °C (all ${pm.roof.n} roof cells alike: same material, all open to the sky),
  **outside** the brief's 50–62 °C. Across the cited albedo range the roof is ${rs.map((r) => `${f1(r.ts)} °C at ${r.alpha}`).join(' and ')}, outside
  at every value; the light 1 m/s wind (h_c 9.5 W m⁻² K⁻¹) and the brief's admittance 1000 for the tile and mud back keep the
  roof hot. Not tuned.
- Lane floor in shade at 15:00 (sunlit share ≤ 0.3, n ${pm.shaded.n}): ${f1(pm.shaded.mean)} °C, Ta ${signed(pm.shaded.mean - pm.shaded.air)} K,
  **outside** the brief's Ta to Ta + 8 K; floor shaded at 13:00, 14:00 and 15:00 (n ${ls.n}): Ta ${signed(ls.mean - ls.air)} K, also
  outside. In these low lanes the floor is in sun most of the day (the point of this block), a 5 m cell is one lane
  width (its shaded share mixes with sun), and the brick (μ 1100) keeps the midday heat; the wall term (Ta + 2 K +
  6 K·K/900) adds longwave. Not tuned.
- Courtyards at 15:00 (Tmrt): under a mat awning ${f1(c.awning.tmrt)} °C, under a pergola ${f1(c.pergola.tmrt)} °C, under crowns ${f1(c.crown.tmrt)} °C,
  open and sunlit ${f1(c.sun.tmrt)} °C; paving ${f1(c.awning.ts)}, ${f1(c.pergola.ts)}, ${f1(c.crown.ts)} and ${f1(c.sun.ts)} °C. Courtyard sky view
  ${f2(c.svf10)}–${f2(c.svf90)} (10th–90th percentile; Harbin's traditional courtyards 0.22–0.37, lanes 0.09–0.27 [lin2019]).
- Courtyard air ("cool pond") is **quoted, not simulated**: Córdoba and Seville 3–6 K below the outdoor air, up to
  11–15 K at 40–45 °C [spainCourtyard] (abstracts only, unverified); Harbin 0.3 K (at most 0.6 K) [lin2019]; the Fez medina
  about 10 K cooler in the early afternoon, 2–4 K warmer before dawn [johansson2006]. The air temperature is fixed.

Trees by species at 15:00 (ground cell at the trunk; at 3 pm the shade falls east of it):

| Species | trees | tr | sunlit share | Tmrt °C |
|---|---|---|---|---|
${species.join('\n')}

Beijing street-tree shade: air −1.0 to −2.1 K, −481 to −789 W m⁻², the pagoda tree second for comfort [yang2024]
(abstract only).

### Walkers

Walkers use the lanes with the shade weights of blocks 1–3 [melnikov]; pergolas and awnings count as crown shade
(weight 0.92 at full heat). Of the ${wk.n} people resting in courtyards and Well Square at 15:00, ${wk.building + wk.canopy} sit in shade
(${wk.canopy} under crowns or screens); walkers' density in shade is ${f1(wk.ratio)} times that in sun. The sweat cue is as before.

### Acceptance bands (block 5)

${bands5Markdown(rows)}

### Disclosures (block 5)

- **Air fixed:** the splash cools the paving and the radiation people feel, not the air (Paris: −0.79 K at most);
  courtyard air cooling is quoted, not simulated.
- **Grid:** 5 m cells; lanes narrower than 5 m cannot be shown; the 10 m lane's cells sit off its centre line.
- **Houses are boxes at eave height** (4 m); the pitched roofs are drawing only.
- **Sky view includes trees and screens** through the crown factor (every block does the same for trees); it is not
  a ray trace through leaves.
- **Daily splash:** the repeated design day is splashed every evening (see above); the custom itself in Beijing has
  no citable source in the brief (unverified); the Japanese uchimizu parallel is [nippon].
- **Dimensions and materials unverified:** plot widths, 4 m eaves, lane widths, grey brick and tile values, LAI of the
  trees and the awning's transmission are the brief's, unverified; the Spanish courtyard numbers are abstracts only.
- **Misses:** the grey roof, the shaded lane floor and the 10 m lane's centre-line sky view fall outside their bands
  (table above); β_wet 1 would push the splash outside its band.
- **The 4 × 4 shade samples, ray-marched building shade and exact horizon scan are used only by this block;** blocks
  1–4 keep 2 × 2 samples, the polygon masks and the 2.5 m horizon scan, and render the same pixels as before.
- **Drawing only, for bake time:** this block skips the pigment pooling at the edge of washes and draws only the
  shadow polygons that reach a tile (tried for every block, but culling changes how the shadow union is
  anti-aliased, so blocks 1–4 keep drawing all of them); during a slider drag it bakes one tile per frame, as block 3.
`;
}
