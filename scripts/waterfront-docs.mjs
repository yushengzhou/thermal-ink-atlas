// docs/sources.md section for block 4 (waterfront and wind corridors),
// generated from the code and model runs (scripts/waterfront.mjs).
import { MODEL, BASIS } from '../engine/materials.js';
import { base4, bands4, isolatedBuilding, walkers4, shade4 } from './waterfront.mjs';
import { windStats, asphaltContrast, waterStats, overlayStats, lineStats, tmrtWindChange, WARM_WF, promenadeShade } from '../engine/waterfront.js';
import { glossaryStats } from '../engine/glossary.js';
import { F_MIN, F_MAX, C_CH, ALIGN, HW_MIN, REACH, OVERLAY, SEED_GAP, STEP, MARGIN, JOIN, DASH_PER_U, DRAW_SPEED, SPEEDS, FACE } from '../engine/wind.js';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const cell = (p) => `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'}${p.note ? ` (${p.note})` : ''}`;

/** Glossary numbers for block 4, computed as on the page (app.js). */
export function wfGlossaryStats() {
  const { world, setup } = base4();
  const st = windStats(world);
  return glossaryStats(world, setup.model(world.scene.wind.default), { wind: { river: st.river.mean, corridor: st.corridorMean, shelter: st.shelterMean, lee: st.lee01.mean } });
}

/** Block 4 acceptance table (also checked by the tests). */
export function bands4Markdown(rows) {
  const v = (r) => (Number.isInteger(r.value) ? String(r.value) : r.unit === 'K' ? signed(r.value, 2) : r.value.toFixed(3));
  const b = (r) => (r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${r.inside ? 'inside' : '**outside**'} |`);
  const out = rows.filter((r) => !r.inside).length;
  return `| Check (spec #9) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${rows.length} checks fall outside their band. They are reported, not tuned away: no input was moved to pass a band.`;
}

export function waterfrontMarkdown() {
  const { scene, world, setup } = base4();
  const T3 = setup.model(3);
  const T1 = setup.model(1);
  const st = windStats(world);
  const iso = isolatedBuilding();
  const ac = asphaltContrast(world, T3, 15);
  const ac1 = asphaltContrast(world, T1, 15);
  const w = waterStats(world, T3);
  const lines = setup.lines();
  const o = overlayStats(world, lines);
  const ls = lineStats(world, lines);
  const tm = tmrtWindChange(world, T1, T3, 15);
  const wk = walkers4();
  const sh = shade4(3);
  const rows = bands4();
  const streets = world.wind.streets.map((s) => `| ${s.name} (\`${s.id}\`) | ${s.axis === 'ns' ? 'N–S' : 'E–W'} | ${Math.round(s.delta)}° | ${s.samples ? f1(s.h) : '–'} | ${s.samples ? f1(s.w) : '–'} | ${s.samples ? f2(s.hw) : 'no facing walls'} | ${f2(s.C)} |`);
  const params = ['windFmin', 'shelterReach', 'channelC', 'windFmax', 'alignCut', 'channelHw', 'windHc', 'riverCurve', 'pondCurve', 'airDay', 'airL', 'airLaligned', 'airNight', 'airPond', 'apparentTemp', 'atRadiation', 'windLines'].map((k) => `| \`${k}\` | ${cell(MODEL[k])} |`);
  const [tc, tx] = [ac.sheltered, ac.exposed];
  return `## Block 4: waterfront and wind corridors

The fourth block (\`cities/waterfront\`) is an invented 400 m block on the south bank of a river: a stone promenade
with a row of riverside trees, two wide streets running south from the river along the prevailing wind (Quay Street
and Willow Street, the ventilation corridors), two narrower streets across it (Rope Walk and Tannery Lane, in the lee
of the building rows upwind of them) and a garden with a small still pond. The wind blows from the river (north) at a
calm (${SPEEDS[0]} m/s) or breezy (${SPEEDS[1]} m/s, default) preset; buttons, \`?u=1|3\`. Its research brief is
[\`docs/research/waterfront-brief.md\`](research/waterfront-brief.md).

### Wind factor

Each 5 m ground cell gets a wind factor f_w = clamp(S·C, ${F_MIN}, ${F_MAX}) (\`engine/wind.js\`):

- **Shelter S** = min over upwind buildings b within ${REACH}·H_b of f_min + (1 − f_min)·d_b/(${REACH}·H_b), 1 if none;
  d_b is the distance from the cell centre, straight upwind, to b's footprint (an exact ray–box distance).
- **Channelling C** = 1 + c_ch·max(0, cos 3δ) in a street within ${ALIGN}° of the wind (δ the angle between its axis
  and the wind) whose H/W > ${HW_MIN}; else 1. A street here is its carriageway and pavements out to the facing walls;
  H is the mean height of the walls facing it within ${FACE} m of the kerb and W the mean wall-to-wall width, both
  sampled every 5 m where walls face it on both sides.
- **Roofs** keep f_w = 1 (*engine assumption*: above the street-level shelter). Trees are not obstacles (porous; not
  modelled).
- The local wind u_i = u_site·f_w sets the convective coefficient of the cell, h_c = 5.7 + 3.8·u_i [oke], in the
  force-restore model, and the wind a walker feels. **Blocks 1–3 declare no wind direction, have no f_w and keep the
  scalar h_c = 5.7 + 3.8·u_site**: their model runs, drawings and pixels are unchanged (checked against the pages
  built before this block, \`tests/e2e/regression.test.mjs\`).
- Block 4 runs one model per preset, each with ${WARM_WF} coarse (10-min) spin-up days before the 1-min days (as block 3,
  with the same stability guard); this run converges after ${T3.info.days} 1-min days at ${SPEEDS[1]} m/s
  (max |ΔTd| ${T3.info.maxDelta.toFixed(3)} K) and ${T1.info.days} at ${SPEEDS[0]} m/s.

| Street | Axis | δ | H m | W m | H/W | C |
|---|---|---|---|---|---|---|
${streets.join('\n')}

Isolated-building check (H ${iso.H} m, wind from the north, centre line): upwind f_w ${f2(iso.upwind)}; at the leeward wall
${f2(iso.leeAtWall)}; mean over 0–1 H ${f2(iso.leeMean)}, ${f2(iso.leeMax)} at 1 H; ${f2(iso.farMin)} at 5–6 H. In the block: over the
river f_w = ${f2(st.river.min)}–${f2(st.river.max)}; Quay and Willow Streets ${f2(st.aligned.mean)} (mean); the streets across the wind
${f2(st.across.mean)}; Rope Walk ${f2(st.shelterMean)}; 0–1 H behind the ${st.lee01.b} ${f2(st.lee01.mean)} (mean), ${f2(st.lee01.max)} (largest).

### Block 4 parameters

| Constant | Value |
|---|---|
${params.join('\n')}

### Water

River and pond are prescribed (\`engine/thermal.js\` waterTemp), not computed; the pond of blocks 1–3 keeps its curve.

- River: Ts = daily mean Ta − 2 K + 0.5 K·sin(2π(t − 9 h)/24): ${f1(w.river.lo)}–${f1(w.river.hi)} °C (range ${f1(w.river.range)} K),
  ${f1(w.river.t15)} °C at 15:00 against ${f1(w.river.a15)} °C air. Large deep rivers have the smallest daily range [webb2008].
- Pond: Ts = daily mean Ta − 0.5 K + 2 K·sin(2π(t − 10 h)/24): ${f1(w.pond.lo)}–${f1(w.pond.hi)} °C (range ${f1(w.pond.range)} K),
  ${f1(w.pond.t15)} °C at 15:00 (air ${f1(w.pond.a15)} °C) and ${f1(w.pond.t04)} °C at 04:00 (air ${f1(w.pond.a04)} °C). A pond warmer than the
  air at night is cited [solcerova2019, steeneveld2014]; the offsets and amplitudes are assumptions.

### Air overlay (information only)

The air temperature stays a fixed forcing. The water's effect on the air is drawn as an overlay along the wind lines
(\`A\`, \`?air=1\`), labelled "illustrative, from literature, not simulated", and never enters a temperature, Tmrt or
comfort value. Along a line, λ = ∫ds/L(s) from where it leaves the water, L = ${OVERLAY.L} m (${OVERLAY.Laligned} m in streets along the
wind); by day ΔTa = −${OVERLAY.day} K·exp(−λ), at night +${OVERLAY.night} K·exp(−λ) (day weight from the sun altitude, full above
10°). The pond uses the river's numbers ×${f2(OVERLAY.pond)} (−${MODEL.airPond.value} K by day [jacobs2020]; at night the same ratio,
an *engine assumption*). By day: ${signed(o.at0, 2)} K at the bank, ${signed(o.at30, 2)} K at 30 m, ${signed(o.at80, 2)} K at 80 m.

### Wind lines (drawing only)

Seeds every ${SEED_GAP} m across the wind on the upwind edge (seeded jitter ±${0.15 * SEED_GAP} m); RK2 steps of ${STEP} m along the wind, or,
where a step would enter a building (grown by ${MARGIN} m), along the wall: the side the wind leans toward, head-on the
side of the wall's centre the line is on. A line ends at the block edge or where it meets an earlier line (on a
${JOIN} m grid), so no path is drawn twice. Lines are recorded once through the pen recorder (a slow seeded wobble) and
dashed every frame: dash period ${DASH_PER_U} m per m/s of local wind (∝ u_i), moving at ${DRAW_SPEED}·u_i (drawn faster than life);
the phase is a pure function of the frame. Label on the page: "assumed direction × shelter factor, not computed flow".
This run: ${ls.n} lines, ${ls.verts} vertices, ${ls.inside} inside a building, hash \`${ls.hash}\`. Toggle \`W\`, \`?wind=0|1\`.

### Comfort and walkers

Walkers use the block 1 route rule (Melnikov shade weights, scaled by heat) with a wind term
(\`engine/waterfront.js\` comfortShade): per 2 m pixel, w = w_class + (1 − w_b)·(AT(u·f_w) − AT(u))/(AT_sun − AT_shade),
with AT the apparent temperature with radiation [steadman1994, bom] from the pixel's Tmrt (sun, building shade or tree shade
of its 5 m cell) and the local wind (u_10·f_w clamped to 0.5–17 m/s as the brief gives for UTCI), and AT_sun − AT_shade
the mean gap between sunlit and building-shaded walkable ground at f_w = 1 (${f1(wk.atGap)} K at 15:00, 3 m/s). At f_w = 1 the
weights are exactly those of blocks 1–3; a breezier pixel weighs less, a sheltered one more. UTCI is not implemented;
apparent temperature is a simpler stand-in (coefficients checked against the Bureau of Meteorology page; Steadman's paper
itself not read). The extra radiation Q = 6.1·(Tmrt − Ta) is a linearisation (4εσT³ at 303 K over the whole body
surface): at a sunlit Tmrt near 68 °C it understates Q by about 30 %, while counting the whole body surface (rather than
the ≈ 0.7 that radiates, ASHRAE) overstates it; the walkers' weights divide by the sun–shade AT gap, so this largely
cancels in routing, but the absolute apparent temperatures on the cards carry it. The sweat cue is unchanged (Tmrt only).

At 15:00 (3 m/s) all ${wk.strollN} walkers on the stroll route take the tree-shaded, breezy riverside (cost ${f1(wk.costs[0])}) over sunny,
sheltered Rope Walk (${f1(wk.costs[1])}). Across all routes the wind term moves walkers only a little: mean f_w where people walk
${f2(wk.walkerFw)} vs ${f2(wk.plainFw)} with the wind ignored (walkable ground ${f2(wk.groundFw)}). Shade dominates: under the riverside trees
Tmrt is ${f1(sh.shadeTmrt)} °C vs ${f1(sh.sunTmrt)} °C in the sun beside them (apparent temperature ${f1(sh.shadeAT)} vs ${f1(sh.sunAT)} °C), against
the overlay's −${OVERLAY.day} K at the bank.

### Acceptance bands (block 4)

${bands4Markdown(rows)}

Notes on the rows outside:

- **0–1 H leeward, largest f_w.** S rises linearly from f_min = ${F_MIN} at the wall, so at exactly 1 H it is
  ${F_MIN} + ${f2(1 - F_MIN)}/${REACH} = ${f2(F_MIN + (1 - F_MIN) / REACH)} > 0.4: the band holds for the mean over 0–1 H (${f2(iso.leeMean)} isolated, ${f2(st.lee01.mean)} in the block) but
  not for the far end of the zone. f_min and the 5 H recovery are assumptions with no cited range; they were not changed.
- **Sheltered minus exposed asphalt at 15:00, ${SPEEDS[1]} m/s: ${signed(ac.diff)} K, above the 2–8 K band.** The brief marks this band as an
  engine plausibility band to be calibrated from a run. This is that run: sheltered sunlit asphalt (mean f_w ${f2(tc.fw)}, h_c
  ${f1(tc.hc)} W m⁻² K⁻¹, ${f1(tc.ts)} °C) against exposed sunlit asphalt (f_w ${f2(tx.fw)}, h_c ${f1(tx.hc)}, ${f1(tx.ts)} °C). Doubling h_c removes
  that much heat; part of the gap is the narrower streets (SVF ${f2(tc.svf)} vs ${f2(tx.svf)}), but an open cell with no walls still
  gives ${signed(rows.find((r) => r.label.startsWith('Open asphalt')).value)} K. At ${SPEEDS[0]} m/s the gap is ${signed(ac1.diff)} K (inside). The band was **not** widened to fit, and no
  parameter was moved; the result is reported as an engine finding: with h_c = 5.7 + 3.8 u and a 3 m/s site wind, the
  wind factor's 0.3–1.2 range makes a larger surface contrast than the brief expected. No measurement of this contrast
  was found.
- **Tmrt change with u: ${f1(tm.max)} K at most, ${f1(tm.meanSun)} K on average in sun (band ≤ 2 K).** Wind does not enter Tmrt directly;
  at ${SPEEDS[0]} m/s the ground runs hotter and its longwave raises Tmrt. The largest change is on sunlit asphalt.
- **What drives both misses: h_c = 5.7 + 3.8 u is a flat-plate fit fed with the 10 m wind × f_w.** The Jürges / McAdams
  form [oke] is a fit for the wind just above a surface; here it is fed with the site's 10 m reference wind times f_w,
  although street-level wind is usually well below the 10 m value even before any shelter. That overstates street-level
  h_c and, above all, its sensitivity to wind (3.8 W m⁻² K⁻¹ per m/s across the 0.3–1.2 range of f_w), which is what makes
  the ${signed(ac.diff)} K asphalt contrast and the ${f1(tm.max)} K Tmrt change. A reference-height correction (a factor below 1 on u
  before h_c) would shrink both. Blocks 1–3 use the same convention with one site wind, so their numbers carry the same
  bias but no contrast. **Decision:** these misses are accepted as disclosed engine findings and the bands are kept as
  written (project lead, under the maintainer's standing instruction); a wind-height correction is left to a follow-up
  issue and is not made here.

### Disclosures (block 4)

- **Air fixed:** the air temperature is the same design-day curve as in blocks 1–3; the water's air effect is an overlay
  only. Measured urban water cools the air only a little and over a short distance (about 0.2–1.5 K by day, mostly
  within 30–80 m [hathway2012, cheonggyecheon, jacobs2020]; reviews that report about 2.5 K are inflated by remote-sensing
  surface temperatures [volker2013]) and can warm the night [steeneveld2014, theeuwes2013, solcerova2019].
- **One wind direction and speed; a geometric heuristic, not CFD:** no vortices, downdraughts, corner jets, river or sea
  breezes, gusts or humidity. h_c uses the 10 m wind × f_w in a near-surface flat-plate fit, which overstates street-level
  convection and its wind sensitivity (see the notes above). Wakes are straight shadows of the footprint along the wind; oblique winds would also
  shelter the corridors' edges. Trees do not slow the wind. Roofs keep f_w = 1.
- **Prescribed water curves** for the river and pond (not a water energy balance).
- **Shade is the biggest comfort lever near water** [jacobs2020: PET −1 to −7 K for shade vs −0.6 K typical next to small
  water bodies]; the riverside-shade card says so.
- **Comfort** uses apparent temperature [steadman1994, bom], not UTCI; Q is linearised (see Comfort and walkers).
- Unverified: the Hathway & Sharples numbers (secondary sources), the Ota River reach, the Oke (1988) thresholds, the decay
  length 30–80 m, the "< 1 K" river range, the Q linearisation; f_min, c_ch, f_max, the 5 H recovery, the water curves and the night overlay
  are assumptions.
`;
}
