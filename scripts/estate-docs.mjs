// docs/sources.md section for block 7 (older high-rise estate), generated
// from the code and model runs (scripts/estate.mjs).
import { BASIS } from '../engine/materials.js';
import { ES, AC_SHARE, flatsOf, plumeShares, tsMean } from '../engine/estate.js';
import { base7, geometry7, court7, longSlabs, kFor2h, noonCompare, plumeTs7, svfSlope7, sensitivity7, walkers7, bands7, bandVerdicts, ES_NOTES } from './estate.mjs';

const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x) => x.toFixed(2);
const r0 = (x) => String(Math.round(x));
const signed = (x, d = 1) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(d)}`;
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60) % 60).padStart(2, '0')}`;
const cell = (k) => {
  const p = ES[k];
  return `${p.value} [${p.source}] *${BASIS[p.basis]}*${p.verified ? '' : ', unverified'} (${ES_NOTES[k]})`;
};

/** Block 7 acceptance table (also checked by the tests). */
export function bands7Markdown(rows) {
  const v = (r) => (Number.isInteger(r.value) ? String(r.value) : r.unit === 'K' || r.unit === 'h' || r.unit === 'm' || r.unit === '°' || r.unit === 'kW' ? r.value.toFixed(2) : r.unit === 'W m⁻²' || r.unit === 'min' ? r.value.toFixed(1) : r.value.toFixed(3));
  const b = (r) => (r.lo === null && r.hi === null ? '— (reported)' : r.lo === null ? `≤ ${+r.hi.toFixed(3)}` : r.hi === null ? `≥ ${+r.lo.toFixed(3)}` : `${+r.lo.toFixed(3)} to ${+r.hi.toFixed(3)}`);
  const verdict = (r) => (r.supp ? `${r.lo === null && r.hi === null ? 'reported' : r.inside ? 'inside' : 'outside'} (supplementary, not counted)` : r.soft ? `${r.inside ? 'inside' : '**outside**'} (soft: reported, not asserted)` : r.inside ? 'inside' : '**outside**');
  const lines = rows.map((r) => `| ${r.label} | ${v(r)}${r.unit ? ` ${r.unit}` : ''} | ${b(r)} | ${r.src} | ${verdict(r)} |`);
  const counted = rows.filter((r) => !r.supp);
  const hard = counted.filter((r) => !r.soft);
  const out = hard.filter((r) => !r.inside).length;
  const softOut = counted.filter((r) => r.soft && !r.inside).length;
  const bv = bandVerdicts(rows);
  const met = Object.keys(bv).filter((k) => bv[k]);
  const missed = Object.keys(bv).filter((k) => !bv[k]);
  return `| Check (spec #13) | Model | Band | Source | |
|---|---|---|---|---|
${lines.join('\n')}

${out} of ${hard.length} asserted checks fall outside their band; ${softOut} of ${counted.length - hard.length} soft checks (bands 5 and 7, reported, not asserted) fall outside; ${rows.length - counted.length} supplementary rows are not counted. By the brief's bands: ${met.length} of ${met.length + missed.length} met (${met.join(', ')})${missed.length ? `; missed: ${missed.join(', ')} (soft)` : ''}. They are reported, not tuned away: no input was moved to pass a band.`;
}

export function estateMarkdown() {
  const { scene, world, T, st, C } = base7();
  const g = geometry7();
  const ct = court7();
  const L = longSlabs();
  const k2 = kFor2h();
  const LF = longSlabs(ES.spacingK.value, true);
  const k2f = kFor2h(true);
  const nc = noonCompare();
  const pt = plumeTs7();
  const sl = svfSlope7(15);
  const sn = svfSlope7(21);
  const sens = sensitivity7();
  const wk = walkers7(15);
  const w12 = walkers7(12);
  const rows = bands7();
  const t = st.table;
  const R = st.rule;
  const params = Object.keys(ES).map((k) => `| \`${k}\` | ${cell(k)} |`);
  const slabs = R.slabs.map((s) => `| ${s.id} | ${f1(s.hEff)} | ${s.G === null ? '— (back road)' : `${s.G} m`} | ${s.k === null ? '—' : f2(s.k)} | ${f2(s.min)} |`);
  const NAMES = { sillStrip: 'paving at the sills (0–10 m south of a slab)', lawn: 'lawn', worn: 'worn patches (bare soil)', parking: 'surface parking (asphalt)', northPath: 'paving along the next slab\'s north face (0–15 m)', court: 'all courtyard ground (no crown)' };
  const classes = Object.keys(NAMES).map((k) => `| ${NAMES[k]} (\`${k}\`) | ${t[k].n} | ${f2(t[k].svf)} | ${f2(t[k].s12)} | ${f1(t[k].t12)} | ${f1(t[k].t15)} | ${f1(t[k].t23)} | ${f1(t[k].r12)} | ${f1(t[k].r15)} |`);
  const shade = ct.rows.filter((r) => r.tst % 60 === 0).map((r) => `| ${hm(r.tst)} | ${f1(r.far)} | ${f2(r.share)} |`);
  const heat = [0, 3, 6, 9, 12, 15, 18, 20, 21, 23].map((h) => `| ${String(h).padStart(2, '0')}:00 | ${f2(AC_SHARE[h])} | ${r0(st.heat[h].kw)} | ${f1(st.heat[h].wm2)} |`);
  const flats = world.buildings.filter((B) => flatsOf(B)).reduce((a, B) => ({ ...a, [B.kind]: (a[B.kind] ?? 0) + flatsOf(B) }), {});
  const sh = plumeShares(world.buildings.find((B) => B.kind === 'slab'));
  const shT = plumeShares(world.buildings.find((B) => B.kind === 'tower'));
  const courtRoutes = w12.routes.filter((r) => /^court/.test(r.id));
  return `## Block 7: older high-rise estate

The seventh block (\`cities/estate\`) is an invented 400 m residential estate at 35° N of the kind built in older city
districts: four rows of east-west slabs (18 floors of ${ES.floorHeight.value} m, ${f1(g.H)} m; three 100 m slabs per row, 15 m deep), two
30-floor point towers (${f1(30 * ES.floorHeight.value)} m) at the north edge with lobbies and shops on their ground floors, a strip of two-storey shops on
the estate road, worn lawns, surface parking (${scene.cars.length} parked cars), plane trees along the lanes and in the tree
belts, pagoda trees (国槐) on the lawns, and air-conditioning condensers stacked on the façades. The rows stand
${scene.gap} m apart. The design day is block 1's (35° N, 20 July, air 25–35 °C, wind 1.5 m/s, vapour pressure 20 hPa); the
大寒 view (\`S\`, the panel button or \`?date=dajhan\`, default \`jul\`) is geometry only. The condenser overlay is \`C\`, the
panel button or \`?ac=1\` (default off); \`?acwall=0\` switches the plume wall term off (checks). Its research brief is
[\`docs/research/estate-brief.md\`](research/estate-brief.md).

### Block 7 parameters

The materials are shared: the paving \`concrete\`, the lanes and parking \`asphalt\`, the lawns \`grass\` (block 1's
irrigated lawn), the worn patches \`drySoil\` (block 6), the roofs \`membrane\`, the lane and belt trees \`canopy\`, the
lawn trees \`pagodaTree\` (block 5). The block's own values live in \`engine/estate.js\` (\`ES\`):

| Parameter | Value |
|---|---|
${params.join('\n')}

### Sun and shadow geometry

NOAA equations [noaa] at 35° N, 120° E, UTC+8 (the clock is within 12 min of true solar time on both days). The engine
(\`engine/sun.js\`, every block) takes the declination from NOAA's **fractional-year approximation**, which is about 0.2° off
the full NOAA algorithm (the solar-calculator spreadsheet) on these dates; the engine is not changed here, since every block's
pixels depend on it:

- Solar noon altitude, engine: 20 July ${f2(g.jul.alt)}°, 大寒 (20 January 2026) ${f2(g.jan.alt)}°. With the full NOAA declination:
  ${f2(nc.full.jul)}° and ${f2(nc.full.jan)}°. The brief's 75.6° and 34.8° (β = 90° − φ + δ) agree with the full algorithm; the engine's
  sun is ${f2(g.jul.alt - nc.full.jul)}° too high in July and ${f2(nc.full.jan - g.jan.alt)}° too low on 大寒 (band 1 allows ±0.3°).
- On 20 July the sun is due east at ${hm(g.ew.east)} and due west at ${hm(g.ew.west)} solar time (the brief: 08:10 and 15:50); before and
  after, it shines on the slabs' north faces and the slabs shade a strip south of them.
- A wall's north shadow at noon: ${g.jul.depth.toFixed(3)} H in July and ${g.jan.depth.toFixed(3)} H on 大寒 (brief 0.257 H and 1.44 H; with the full declination ${(1 / Math.tan((nc.full.jul * Math.PI) / 180)).toFixed(3)} H and ${(1 / Math.tan((nc.full.jan * Math.PI) / 180)).toFixed(3)} H: the engine's sun explains the difference), i.e. ${f1(g.jul.depth * g.H)} m and
  ${f1(g.jan.depth * g.H)} m for an 18-floor slab. The engine's building mask (2 × 2 samples per 5 m cell) north of slab 2A at solar
  noon: ${f1(g.maskJul)} m and ${f1(g.maskJan)} m (the run of shaded samples, 2.5 m each).

### The 大寒 sunlight rule

GB 50180-2018 Table 4.0.9 [gb50180]: in zone II (35° N cities such as Zhengzhou, Xi'an, Xuzhou), cities of 500,000 or more,
every home gets at least ${ES.ruleHours.value} h of sun on 大寒 (the brief's reading; table values not checked against the standard, unverified). Counted
here as the draft Zhejiang rules describe [db33] (the pre-2016 draft that revised DB33/1050-2008; the standard in force is DB33/1050-2016, in which these parameters were not checked): 08:00–16:00 true solar time on 20 January, at a point ${ES.sillHeight.value} m above the
ground-floor level (the floor at grade, \`groundFloor\` ${ES.groundFloor.value}), ${ES.ruleStep.value}-min steps (sampled at mid-step), cumulative, only stretches
of at least ${ES.ruleSegment.value} min. A step counts when the sun is up, south of the façade (its rays reach the south face) and no
building box is in the way (rays cast against every box; trees do not count). Sills every 2.5 m along each slab's south
face (${R.sills.length} in all, 5 cm out from the wall); a flat takes the lowest of its sills.

H_eff = roof − (ground floor + 0.9 m) = ${f1(st.hEff)} m. The brief's spacing coefficient for 2 h is 1.47 (G ≥ ${f1(1.47 * st.hEff)} m);
the rows stand ${scene.gap} m apart (G / H_eff ${f2(scene.gap / st.hEff)}), the 5 m grid step above it.

| Slab | H_eff m | G to the row south | G / H_eff | lowest sill h |
|---|---|---|---|---|
${slabs.join('\n')}

Every ground-floor sill gets at least ${f2(R.min)} h (the rows facing the back road ${f2(Math.min(...R.slabs.filter((s) => s.G === null).map((s) => s.min)))} h). More than the 2 h of
the coefficient because the slabs are 100 m long with 30 m gaps (the low morning and afternoon sun comes through the gaps)
and G / H_eff is 1.56, not 1.47.

The checker on two long continuous slabs (a 400 m test scene, not the estate) at G = 1.47 H_eff (${f1(L.G)} m) gives the middle
sill **${f2(L.hours)} h with the engine's approximate declination and ${f2(LF.hours)} h with the full NOAA declination** (the brief: 2 h).
So the brief's coefficient is right; the shortfall is the engine's sun, ${f2(nc.full.jan - g.jan.alt)}° low on 大寒, and near the threshold the
hours change fast (1.45: ${f2(sens.k[0].long)} / ${f2(sens.k[0].full)} h, 1.52: ${f2(sens.k[2].long)} / ${f2(sens.k[2].full)} h, engine / full). 2 h needs G / H_eff ≈ ${k2} with the engine's
sun and ${k2f} with the full declination. The estate's 1.56 clears both, so the rule test above holds either way.

### The July courtyard

Courtyard north of slab 2A (between rows 1 and 2, x 20–120 m), shade cast by slab 2A alone (its ground shadow polygon,
2.5 m samples, within the slab's x-range), by true solar time on 20 July:

| Solar time | deepest shade, m from slab 2A | shaded share of the courtyard depth (middle) |
|---|---|---|
${shade.join('\n')}

Between 10:00 and 16:00 the slab's shadow never reaches beyond ${f1(ct.far)} m (${f2(ct.far / g.H)} H; the brief: no shade beyond 0.37 H, its
worst case); at noon it covers ${Math.round(ct.noon.share * 100)}% of the ${scene.gap} m depth (the brief: 0.26 H / G = ${f2((0.257 * g.H) / scene.gap)}). With every
building (the engine's mask) at 16:00 solar time, ${ct.beyond16} samples of that courtyard beyond 0.37 H are shaded too: the sun is
north of west after ${hm(g.ew.west)} and the next row's south face throws a thin strip south (supplementary row).

Cell classes (ground cells with no crown, in the three courtyards within the slab columns, picked by parcel and
distance before any result; \`cellClasses\` in \`engine/estate.js\`); sun share = the cell's sunlit share at 12:00:

| Class | n | SVF | sun 12:00 | Ts 12:00 | Ts 15:00 | Ts 23:00 | Tmrt 12:00 | Tmrt 15:00 |
|---|---|---|---|---|---|---|---|---|
${classes.join('\n')}

At midday the only shade in the courtyards is the strip along the north faces (sun share ${f2(t.northPath.s12)}, Tmrt ${f1(t.northPath.r12)} °C
against ${f1(t.parking.r12)} °C over the parking). Sunlit paving at the sills minus the lawn at 15:00: ${signed(tsMean(T, C.sillStrip, 15) - tsMean(T, C.lawn, 15))} K (Wuhan,
August 2015, measured 9.87 K [cai2017]; soft band 7): the lawn here is block 1's irrigated lawn (EF 0.8), wetter than a worn
estate lawn in summer. Sky view in the courtyards ${f2(t.court.svf)} on average (Wo Che Estate podium 0.327 [plea2016]).

Tmrt and sky view in shade [lai2017]: over the ${sl.n} building-shaded paved cells at 15:00 (SVF ${f2(sl.svf[0])}–${f2(sl.svf[1])}) the model's Tmrt
rises ${f2(-0.1 * sl.slope)} K per 0.1 less sky view, against +1.6 K measured in Hong Kong: soft band 5 is **missed**. After dark
(21:00, longwave only, ${sn.n} paved cells) it is ${f2(-0.1 * sn.slope)} K. By day the model's shaded Tmrt is set mostly by the diffuse
and wall-reflected sun and the warm ground, and its walls are only air + 2 K (+ the daytime term): a wall-dominated
view adds less longwave than the Hong Kong measurements found (10 W m⁻² per 0.1 SVF). Not tuned.

### Condensers

One split unit: Q_rej = Q_cool (1 + 1/EER) = ${ES.qCool.value} × (1 + 1/${ES.eer.value}) = ${f2(st.qRej)} kW; exhaust rise ΔT = Q_rej / (ρ c_p V̇)
with ρ from the air temperature (ideal gas, sea level), c_p 1005 J kg⁻¹ K⁻¹, V̇ ${ES.fanFlow.value} m³/s: ${f2(st.dtExh)} K at 15:00
(35 °C), ${f2(st.dtExhNight)} K at 23:00. Measured in Changsha: +5.2 K by day, +6.5 K at night [mu2025].

${st.heat[0].flats} flats (${flats.slab} in the slabs: 8 per floor × 18 floors × 12; ${flats.tower} in the towers: 6 per floor × 29 residential floors × 2),
each rejecting up to ${ES.perFlat.value} kW (\`perFlat\`, the brief's estate estimate), times the share running by hour (\`acProfile\`):

| Hour | share running | kW | W m⁻² of site |
|---|---|---|---|
${heat.join('\n')}

Peak ${f1(st.peak.wm2)} W m⁻² at ${String(st.peak.h).padStart(2, '0')}:00 (the brief's estimate: about 50 W m⁻² for 2,400 flats on 16 ha). For scale, AC
waste heat raised Paris street air +0.5 K today, +1 K if all of it were sensible and +2 K under a future doubling, in simulations [demunck2013], Berlin up to 0.6 K [berlin2020]; in stacks and
recesses the upper condensers breathe air more than 7 K [chow1999] or 4–9 K [bojic2001] above ambient, and a 24-storey void warmed 10–13 K
from bottom to top [bruelisauer2014]. **None of this is simulated:** the air is fixed. The overlay draws plumes on the visible condenser stacks (more
strokes when more flats run their AC) and the heat of each south face.

**Plume wall term** (on by default in this block only): the walls in the condensers' plume zones are taken
${ES.wallDT.value} K × the share running warmer (\`wallDT\`, the brief's upper bound). A face's plume share is its condenser stacks × ${ES.plumeWidth.value} m
over its length: slabs ${f2(sh.S)} (south, 2 stacks per flat) and ${f2(sh.N)} (north), gables 0; towers ${f2(shT.S)} on every face. Each ground cell
takes the plume share of the walls it sees (a 16-direction horizon scan, each direction's wall view sin²(elevation) taking
the share of the face its ray entered; courtyard mean ${f2(st.plumeShare.mean)}, largest ${f2(st.plumeShare.max)}). Its longwave from the walls gains
share × σ((T_w + ΔT)⁴ − T_w⁴) (up to ${f1(sens.wall[0].add)} W m⁻² at the cell where it is largest). Only Thermal.lwall changes, so only Tmrt
(and the cards' evaporation sum) feel it: the largest Tmrt it adds is ${f2(st.plumeMax)} K (${f2(st.plumeCourt21)} K over the courtyards at 21:00);
the brief estimated about 1.2 W m⁻² and 0.2 K at the ground. The stored surface temperatures come from the run without it,
so ground Ts is unchanged; fed into the surface balance (a docs run, upper bound: every wall + ${ES.wallDT.value} K × ${f2(pt.pMax)} all day, ${pt.n}
cells) it would change ground Ts by at most ${f2(pt.max)} K.

### Sensitivity

| Sill rule case | lowest sill h |
|---|---|
${sens.rule.map((r) => `| ${r.label} | ${f2(r.min)} |`).join('\n')}

| G / H_eff (long slabs) | G m | middle sill h, engine's sun | middle sill h, full NOAA declination |
|---|---|---|---|
${sens.k.map((x) => `| ${x.k} | ${f1(x.G)} | ${f2(x.long)} | ${f2(x.full)} |`).join('\n')}

| Condenser case | Q_rej kW | exhaust ΔT at 35 °C, K |
|---|---|---|
${sens.ac.map((x) => `| ${x.label} | ${f2(x.q)} | ${f2(x.dt)} |`).join('\n')}

Plume wall term at ${sens.wall[1].dT} K instead of ${sens.wall[0].dT} K: ${f1(sens.wall[1].add)} W m⁻² and about ${f2(sens.wall[1].tmrt)} K of Tmrt at the cell where it is largest
(${f2(sens.wall[0].tmrt)} K as shipped). The rule margin holds for a raised ground floor, a ground-level count and 1-min steps; the
exhaust rise stays within 5–8 K for the fan and EER ranges. All shipped values were set from the brief before the first
model run and not changed after the bands were checked.

### Walkers

Walkers use the shade weights of blocks 1–6 [melnikov]. The courtyard routes pair the path along a slab's north face (in its
shadow at midday) with the path through the middle of the courtyard: at 12:00 ${courtRoutes.map((r) => `${r.id} ${Math.round(r.first * 100)}%`).join(', ')} take the
north-face path. At 15:00 ${Math.round(wk.shadeShare * wk.n)} of ${wk.n} people resting sit in shade, and walkers' density in shade is ${f1(wk.ratio)} times that in
sun. The north-face paths are hidden behind the next row in this view. The sweat cue is as before.

### Acceptance bands (block 7)

${bands7Markdown(rows)}

### Disclosures (block 7)

- **Air fixed:** the condensers' heat, the stack effect (warmer intake air higher up) and the night heat island they feed
  are shown and quoted, not simulated; ground Ts does not feel the condensers.
- **One wind**, the design day's 1.5 m/s everywhere; no flow between the slabs.
- **National rule only:** GB 50180-2018 as the brief read it (table values not checked against the standard, unverified); GB 55038-2025 and local
  rules (such as the Beijing coefficient 1.7, unverified) are not checked; older estates were approved under GB 50180-93.
- **Rule counted at the sill, not the ground:** the rule's point is 0.9 m above the ground-floor level (the floor taken at
  grade); trees do not count; the towers' ground floors are lobbies and shops (not tested).
- **The engine's sun is approximate:** \`sun.js\` uses NOAA's fractional-year declination, about 0.2° off the full algorithm
  (大寒 noon ${f2(g.jan.alt)}° vs ${f2(nc.full.jan)}°; July ${f2(g.jul.alt)}° vs ${f2(nc.full.jul)}°); the brief agrees with the full algorithm. Two long slabs at
  1.47 H_eff give the middle sill ${f2(L.hours)} h with the engine's sun and ${f2(LF.hours)} h with the full declination. The estate stands at
  1.56 and every sill gets at least ${f2(R.min)} h with the engine's sun. Not changed in this block (it would move every block's pixels).
- **Invented estate:** layout, flat counts, condensers per flat, the AC profile, the plume width and the plume wall term
  are assumptions; the shops' condensers are left out.
- **Lawn:** the lawns use block 1's irrigated lawn (EF 0.8), so they run cooler than a dry worn lawn; worn patches are bare soil.
- **Misses:** soft band 5 (Tmrt per sky view in shade, ${f2(-0.1 * sl.slope)} K per 0.1 against 1.6 K) is outside; reported, not tuned.
- **Drawing:** in this view the 49 m of each courtyard next to the row south of it (the parking and the north-face path)
  are hidden behind that row (18 floors); the 大寒 shadows are cut where a building stands in front, and the sill tallies
  are drawn on each slab's roof edge, one per flat.
`;
}
