// vgui: the overlay of the urban village block (block 10): margin-note text,
// the cards (lanes by day and night, metal roofs, under the roof, the
// residents' white roofs, urban villages measured, who is most at risk), the
// residents on the roofs in the evening, the heat-card rows and the block's
// plugin for app.js. Wording follows the brief: "urban village (城中村)",
// "informal settlement", "residents"; heat vulnerability is exposure plus a
// lack of resources, not a trait of the people who live here.
import { SOURCES, BASIS, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { hash3, hexRgb } from './core.js';
import { quantHour } from './render.js';
import { VG, villageStats, coolStats, underRoof, radiantIn, airShown, laneAt, squareCells, cellsOf, HOURS } from './village.js';
import { VG_ROOF, vgOverlay } from './vgkit.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const f2 = (v) => v.toFixed(2);
const pct = (v) => `${Math.round(v * 100)}%`;
const K = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))} K`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated, on a 5 m grid with the lanes' sky view and sun from their own width and walls; the air temperature is fixed.</p>`;
const close = '<button class="x" aria-label="close">×</button>';
const MISS = ' <b>(band missed)</b>';

/** The brief's bands the cards quote (docs/sources.md, Block 10, checks them all). */
export const VG_BANDS = { laneNoon: 8, openNoon: 25, night: [2, 6], rust: [60, 75], white: [15, 25], asbestos: [50, 62], cool: [-2.5, -1] };
const outside = (x, [a, b]) => x < a || x > b;

/** Roof names for the tables. */
const ROOF_ROWS = [['rustTin', 'rusty corrugated iron'], ['galvTin', 'galvanised sheet'], ['asbestosRoof', 'asbestos-cement sheet'], ['tarpRoof', 'tarpaulin'], ['whiteTinAged', 'iron painted white (weathered)']];

/** Margin notes (at most 5). d: numbers from the plugin (noteData). */
export function vgNotes(scene, d) {
  const text = {
    lane: [`Lanes 1.5–3 m wide, walls ${fmt(d.laneH)} m (sky view ${f2(d.laneSvf)}):`, `Tmrt ${fmt(d.lane15)} °C at 3 pm, ${fmt(d.lane22)} °C at 10 pm`],
    square: [`The open square: Tmrt ${fmt(d.sq15)} °C at 3 pm,`, `${fmt(d.sq22)} °C at 10 pm (lanes ${fmt(d.lane22)} °C)`],
    tin: [`Rusty iron roofs ${fmt(d.rust15)} °C at 3 pm,`, `${fmt(d.rust03)} °C at 3 am`],
    white: [`Roofs the residents painted white: ${fmt(d.white15)} °C`, `at 3 pm; bare rusty iron ${fmt(d.rust15)} °C`],
    under: [`Under bare iron (O): the room's radiant`, `temperature ${fmt(d.under15)} °C at 3 pm (air ${fmt(d.air15)} °C)`],
  };
  const terms = {
    lane: [['handshakeBuilding', 'Lanes 1.5–3 m wide'], ['svf', `sky view ${f2(d.laneSvf)}`]],
    square: [['tmrt', 'Tmrt']],
    tin: [['surfaceTemp', `${fmt(d.rust15)} °C at 3 pm`]],
    white: [['albedo', 'painted white']],
    under: [['indoorRadiant', "the room's radiant"]],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** Lanes card. d: {st (villageStats), noon, night}. */
export function lanesCard(d) {
  const L = d.st.lanes;
  const sq = d.st.square;
  const a = d.st.air;
  const nn = VG.noon.value;
  const ni = VG.night.value;
  const noonMiss = L.village.tmrt[nn] - a[nn] > VG_BANDS.laneNoon;
  const openMiss = sq.tmrt[nn] - a[nn] < VG_BANDS.openNoon;
  const gap = L.village.tmrt[ni] - sq.tmrt[ni];
  const nightMiss = outside(gap, VG_BANDS.night);
  const row = (name, x) => `<tr><td>${name}</td><td>${fmt(x.W)} m / ${fmt(x.H)} m</td><td>${f2(x.svf)} / ${f2(x.svfGrid)}</td><td>${fmt(x.tmrt[nn])} / ${fmt(x.tmrt[15])} / ${fmt(x.tmrt[ni])} °C</td></tr>`;
  return `
    ${close}
    <h3>Lanes by day and by night</h3>
    <div class="mat">${gl('handshakeBuilding', 'Handshake buildings')} 18–24 m high, lanes 1.5–3 m · air ${fmt(a[nn])} / ${fmt(a[15])} / ${fmt(a[ni])} °C at ${hm(nn)} / 15:00 / ${hm(ni)}</div>
    <table class="cmp">
      <tr><td></td><td>W / H</td><td>${gl('svf', 'sky view')} lane / 5 m grid</td><td>${gl('tmrt', 'Tmrt')} ${hm(nn)} / 15:00 / ${hm(ni)}</td></tr>
      ${L.byW.filter((x) => x.n).map((x) => row(`${x.W} m lanes`, x)).join('')}
      ${row('Market Lane', L.market)}
      ${row('alleys of the low-rise edge', L.edge)}
      <tr class="t"><td>the open square</td><td>—</td><td>${f2(sq.svf)}</td><td>${fmt(sq.tmrt[nn])} / ${fmt(sq.tmrt[15])} / ${fmt(sq.tmrt[ni])} °C</td></tr>
      <tr><td colspan="4" class="sub">Village lanes, ${gl('tmrt', 'Tmrt')} − air: ${K(L.village.tmrt[nn] - a[nn])} at ${hm(nn)}${noonMiss ? `, above the brief's +${VG_BANDS.laneNoon} K${MISS}` : ''}; the open square ${K(sq.tmrt[nn] - a[nn])}${openMiss ? `, below the brief's +${VG_BANDS.openNoon} K${MISS}` : ''}. At ${hm(ni)} the lanes are ${K(gap)} warmer than the square${nightMiss ? ` (brief +${VG_BANDS.night[0]} to +${VG_BANDS.night[1]} K${MISS})` : ` (brief +${VG_BANDS.night[0]} to +${VG_BANDS.night[1]} K)`}.</td></tr>
    </table>
    <p class="note">A lane two metres wide between walls twenty metres high sees only a few per cent of the sky. By day the walls keep most of the sun off the floor; after sunset the same walls keep the floor and the people in it from losing their heat to the sky, so the lanes stay warm into the night while the open square cools.</p>
    <p class="lit">An urban village in Pingshan, Shenzhen, was warmest against its surroundings between 20:00 and 24:00 (mean 1.71 K over 18–24 h, at most 3.95 K), and its thermal-humidity index was worse than a green reference, especially at night (unverified). In old blocks of Guangzhou the pedestrian Tmrt peaked at 43.7 °C with the air at 41.3 °C (Deng et al. 2023). No measured Tmrt for lanes 1–3 m wide was found.</p>
    <p class="caveat">The lanes are narrower than the 5 m grid: their sky view and sun come from an endless canyon of the lane's width and its two walls (the grid's own value is shown for comparison); a crossing of two lanes is taken as the east–west lane. Walls are straight: no balconies, air-conditioner boxes, overhangs or washing over the lane, so at noon, with the sun ${fmt(d.noonAlt)}° high, ${pct(L.village.sun[nn])} of a lane floor is in the sun. Every wall is the engine's shared warm wall (air + 2 K, more in the sun), so a lane that sees almost only walls cannot be much cooler than that.${noonMiss ? ` Both are tested in docs/sources.md (Block 10, docs-only runs): without the direct sun in the lanes and with their walls at air + 2 K the lanes come inside the brief's band; each alone does not.` : ''} The air is fixed: the heat held in the lanes' air at night, and the lack of wind, are not modelled.</p>
    ${srcLine(['pingshan', 'deng2023', 'brief10'])}`;
}

/** Metal roofs card. d: {st}. */
export function roofsCard(d) {
  const E = d.st.edge;
  const rust = E.rustTin;
  const asb = E.asbestosRoof;
  const rustMiss = rust && outside(rust.ts15, VG_BANDS.rust);
  const asbMiss = asb && outside(asb.ts15, VG_BANDS.asbestos);
  const rows = ROOF_ROWS.filter(([id]) => E[id]).map(([id, name]) => {
    const m = MATERIALS[id];
    const r = E[id];
    return `<tr><td>${name} (${r.n})</td><td>${m.alpha.value}${tag(m.alpha)} / ${m.eps.value}${tag(m.eps)}</td><td>${m.thinC.value / 1000}${tag(m.thinC)}</td><td>${fmt(r.ts15)} / ${fmt(r.peak)} / ${fmt(r.ts03)} °C</td></tr>`;
  }).join('');
  return `
    ${close}
    <h3>Metal roofs: hot by day, cold by night</h3>
    <div class="mat">Single-storey rooms of the low-rise edge · roofs are single sheets (${gl('heatCapacity', 'thin layers')})</div>
    <table class="cmp">
      <tr><td></td><td>${gl('albedo', 'α')} / ${gl('emissivity', 'ε')}</td><td>C kJ m⁻² K⁻¹</td><td>15:00 / day's peak / 03:00</td></tr>
      ${rows}
      <tr><td>flat concrete roofs of the village houses</td><td>${MATERIALS.slabRoof.alpha.value} / ${MATERIALS.slabRoof.eps.value}</td><td>μ ${MATERIALS.slabRoof.mu.value}</td><td>${fmt(d.st.slab.ts15)} / — / ${fmt(d.st.slab.ts03)} °C</td></tr>
      <tr><td colspan="4" class="sub">Brief at an air of 35 °C: rusty iron 60–75 °C at 15:00${rustMiss ? MISS : ''}; asbestos cement 50–62 °C${asbMiss ? `${MISS}: likely because the sheet here loses no heat through its underside to the room (a docs-only run with that loss, docs/sources.md, puts it inside the band, and rusty iron just below its band)` : ''}.</td></tr>
    </table>
    <p class="note">A sheet of iron holds almost no heat, so it follows the sun: rust turns it dark, it bakes in the afternoon and cools fast after sunset. Bright galvanised sheet reflects more of the sun but gives off little heat, so it is not much cooler. Asbestos-cement sheet is a recognised health hazard.</p>
    <p class="lit">Measured rooms: in Delhi in April, tin-roofed rooms were 33.4 °C against 32.8 °C outdoors, in Yavatmal 3–4 K above outdoors in May and June, and warmer than outdoors at night (Tasgaonkar et al. 2022); in Ahmedabad, tin-roofed homes 34.6–35.8 °C, asbestos 32.5–36.8 °C, concrete 31.6–33.8 °C (Vellingiri et al. 2020); in Ghana, metal-roofed rooms 4.5 K warmer by day than mud or thatch and 1.5 K cooler at night (Wilby et al. 2021). In Bangkok at an air of 37 °C a roof was 68.1 °C and its ceiling 49.2 °C (unverified).</p>
    <p class="caveat">No measured albedo was found for rusty iron, asbestos cement or tarpaulin: the brief's assumptions. The model's sheet loses heat from its top only: nothing goes through it into the room below, which likely makes every sheet here run hotter than a real roof over a room. A real tarpaulin stores about 0.4 kJ m⁻² K⁻¹; here it is held at 2 kJ, the smallest the 60 s model step can take without going unstable.</p>
    ${srcLine(['tasgaonkar2022', 'vellingiri2020', 'wilby2021', 'khlongToey', 'emissTables', 'energyStarRoof', 'brief10'])}`;
}

/** Under the roof card. d: {st}. */
export function underCard(d) {
  const E = d.st.edge;
  const st = d.st;
  const fr = VG.fr;
  const rows = ROOF_ROWS.filter(([id]) => E[id]).map(([id, name]) => {
    const r = E[id];
    const s = airShown(r.airPeak);
    return `<tr><td>${name}</td><td>${fmt(r.radiant15)} / ${fmt(r.radiant03)} °C</td><td>${K(s.value)}${s.capped ? ' (capped)' : ''}</td></tr>`;
  }).join('');
  return `
    ${close}
    <h3>Under the roof: a proxy, not the room</h3>
    <div class="mat">${gl('indoorRadiant', 'Indoor radiant temperature')}: the ceiling (the roof sheet) takes F_r ${fr.value}${tag(fr)} of the view, the walls the rest at air + ${VG.wallUp.value} K${tag(VG.wallUp)}</div>
    <table class="cmp">
      <tr><td>roof</td><td>radiant 15:00 / 03:00</td><td>air, illustrative: day's peak</td></tr>
      ${rows}
      <tr><td colspan="3" class="sub">Outdoor air ${fmt(st.air[15])} °C at 15:00, ${fmt(st.air[3])} °C at 03:00. The air figure is illustrative only: h_ci (T_roof − Ta) / (h_ci + ρc_p n h / 3600) with h_ci ${VG.hci.value}${tag(VG.hci)} W m⁻² K⁻¹, a room ${VG.roomH.value} m high${tag(VG.roomH)} and n = ${fmt(st.n)} air changes an hour, set (as the brief says) so the bare rusty-iron rooms peak at +${VG.airTarget.value} K; never shown beyond ±${VG.airCap.value} K.</td></tr>
    </table>
    <p class="note">On a hot afternoon the room under a bare iron sheet has a ceiling at the roof's own temperature, so it radiates onto everyone beneath it; the air of the room warms much less, because it is changed through gaps, doors and windows. At night the sheet is the coldest surface around.</p>
    <p class="lit">Measured indoor air under tin roofs was 0.6–4 K above the outdoor air in the studies the brief found, not the 5–8 K sometimes quoted (Tasgaonkar et al. 2022; Vellingiri et al. 2020).</p>
    <p class="caveat">Both numbers are proxies of the brief, not a simulation of the room: no walls' or floor's heat store, no people, cooking or appliances, no fans. The ceiling is taken as a black surface at the roof's temperature, which likely overstates the radiant heat under a bright galvanised sheet. The air figure is calibrated, so it can only show differences between roofs, not a measured room.</p>
    ${srcLine(['tasgaonkar2022', 'vellingiri2020', 'brief10'])}`;
}

/** The residents' white roofs card. d: {st, cool (coolStats), on}. */
export function whiteCard(d) {
  const c = d.cool;
  const all = c.all;
  const rr = c.rustRooms ?? c.rust;
  const dMiss = rr && outside(-rr.d15, VG_BANDS.white);
  const aMiss = rr && outside(rr.dAirPeak, VG_BANDS.cool);
  const aged = d.st.edge.whiteTinAged;
  const rust = d.st.edge.rustTin;
  const sAir = (x) => {
    const s = airShown(x);
    return `${K(s.value)}${s.capped ? ' (capped)' : ''}`;
  };
  return `
    ${close}
    <h3>The residents' white roofs</h3>
    <div class="mat">${c.n} bare iron roofs repainted white (R) · ${d.on ? 'white roofs on' : 'white roofs off (R to show them)'}</div>
    <table class="cmp">
      <tr><td>roofs painted (R)</td><td>bare</td><td>new white paint</td><td>change</td></tr>
      ${rr ? `<tr class="t"><td>rusty iron rooms, roof at 15:00</td><td>${fmt(rr.ts15)} °C</td><td>${fmt(rr.cool15)} °C</td><td>${K(rr.d15)}${dMiss ? MISS : ''}</td></tr>
      <tr><td>the same, radiant under the roof 15:00</td><td>${fmt(rr.rad15)} °C</td><td>${fmt(rr.radW15)} °C</td><td>${K(rr.dRad15)}</td></tr>
      <tr class="t"><td>the same, air (illustrative), day's peak</td><td>${sAir(rr.airPeakBare)}</td><td>${sAir(rr.airPeakWhite)}</td><td>${K(rr.dAirPeak)}${aMiss ? MISS : ''}</td></tr>` : ''}
      <tr><td>all ${all.n} painted roofs, 15:00</td><td>${fmt(all.ts15)} °C</td><td>${fmt(all.cool15)} °C</td><td>${K(all.d15)}</td></tr>
      ${aged && rust ? `<tr><td colspan="4" class="sub">Painted years ago (weathered, α ${MATERIALS.whiteTinAged.alpha.value}): ${fmt(aged.ts15)} °C at 15:00 against ${fmt(rust.ts15)} °C for bare rusty iron.</td></tr>` : ''}
    </table>
    <p class="note">Painting a roof white is one of the few changes residents can make themselves, and many do, often together: in this block some roofs are already white, and R paints the rest of the bare iron. New white paint (${gl('albedo', 'albedo')} ${MATERIALS.whiteTin.alpha.value}${tag(MATERIALS.whiteTin.alpha)}) turns back most of the sun, so the sheet and the ceiling under it stay far cooler.</p>
    <p class="lit">In 16 homes in Ahmedabad, white paint on a tin roof cooled the room by about 1.1 K, a cool-roof sheet by 2.0 K and insulation under an asbestos roof by 2.4 K (Vellingiri et al. 2020, with MHT and IIPH). Simulated for 17 cities, cool roofs cut the hours of heat stress indoors by up to 91% (Nutkiewicz et al. 2022). A cluster randomised trial of cool roofs in Burkina Faso has published its protocol (Bunker et al. 2024); its results were found in the press only.</p>
    <p class="caveat">Paint ages: the brief gives albedo 0.65 new and 0.50 weathered. The room figures are the proxies of the "Under the roof" card. ${dMiss || aMiss ? 'Where a band is missed, the likely cause is named in docs/sources.md (Block 10).' : ''}</p>
    ${srcLine(['vellingiri2020', 'nutkiewicz2022', 'bunker2024', 'brief10'])}`;
}

/** Urban villages measured card. d: {st}. */
export function measuredCard(d) {
  const L = d.st.lanes.village;
  const sq = d.st.square;
  const ni = VG.night.value;
  return `
    ${close}
    <h3>${gl('urbanVillage', 'Urban villages')}, measured</h3>
    <div class="mat">What studies of real urban villages and informal settlements found (quoted, not simulated)</div>
    <table class="cmp">
      <tr><td>Shenzhen, satellite surface heat island</td><td>high-density urban village 3.53 K · multi-storey 2.62 K · high-rise 1.60 K</td></tr>
      <tr><td>Shenzhen, Pingshan traverses (2011–12)</td><td>heat island largest 20:00–24:00; 1.71 K mean 18–24 h, 3.95 K at most</td></tr>
      <tr><td>Shenzhen, comfort survey</td><td>urban villages the worst summer thermal-humidity index; density worsens it, vegetation mitigates</td></tr>
      <tr><td>Nairobi, informal settlements</td><td>+3.1 K daily maximum, +1.83 K daily minimum against the station; sites with vegetation 0.7 K cooler</td></tr>
      <tr class="t"><td>this model, ${hm(ni)}</td><td>village lanes ${gl('tmrt', 'Tmrt')} ${fmt(L.tmrt[ni])} °C, open square ${fmt(sq.tmrt[ni])} °C (${K(L.tmrt[ni] - sq.tmrt[ni])})</td></tr>
    </table>
    <p class="note">The measurements are of the air, the surface or a comfort index; the model's numbers are of the radiation a person feels (Tmrt) with the air held fixed, so they show the same direction, a warm village in the evening, not the same quantity.</p>
    <p class="caveat">Most of these figures come through the brief and are unverified (the Pingshan study's journal was not confirmed); a computational study of wind in Shenzhen's lanes (Ren et al. 2025) is not used here, as the lanes have no wind in this model.</p>
    ${srcLine(['wu2015', 'pingshan', 'yi2022', 'scott2017', 'ren2025', 'brief10'])}`;
}

/** Who is most at risk card (literature only). */
export function riskCard() {
  return `
    ${close}
    <h3>Who is most at risk</h3>
    <div class="mat">${gl('heatVulnerability', 'Heat vulnerability')}: exposure plus a lack of resources to cope, not a trait of the people who live here</div>
    <table class="cmp">
      <tr><td>China, 66 communities</td><td>+5.0% deaths on heat-wave days (2.9–7.2%), more among older people, women, deaths out of hospital and in dense communities</td></tr>
      <tr><td>older adults (Nature Medicine 2024)</td><td>aged 65 and over at hazard ratio 1.78–1.98; a decline in daily functioning predicts risk</td></tr>
      <tr><td>Ahmedabad, May 2010</td><td>about 1,344 excess deaths (+43.1%); after the city's Heat Action Plan about 1,190 deaths a year avoided</td></tr>
      <tr><td>cooling at home, India</td><td>4.9% of households had an air conditioner in 2020–21, about 8% in 2024</td></tr>
      <tr><td>work outdoors, China</td><td>about 100 million outdoor workers</td></tr>
    </table>
    <p class="note">The studies name the same things again and again: a hot room, especially at night, work outdoors, older age and poor health, and little money for cooling or care. They add up, and they are not spread evenly. Residents and community groups do act, with white roofs and shade on the roofs, and city plans such as Ahmedabad's Heat Action Plan were followed by fewer deaths.</p>
    <p class="caveat">No estimate of heat deaths by type of housing, or for people who moved to the city for work and live in urban villages, was found; nothing on this card is modelled. Most figures are via the brief and unverified.</p>
    ${srcLine(['ma2015', 'natMed2024', 'hess2018', 'carbonBriefAc', 'dialogueEarth', 'brief10'])}`;
}

/** Button labels for the village panel cards. */
export const VG_CARDS = [
  ['lanes', 'Lanes by day and night'],
  ['roofs', 'Metal roofs'],
  ['under', 'Under the roof'],
  ['white', 'White roofs'],
  ['measured', 'Villages measured'],
  ['risk', 'Who is most at risk'],
];

const SHIRTS = ['#b5533c', '#3f6e6a', '#c9973f', '#5b6b8c', '#e8e1d0', '#8e4b5e', '#2f3e52', '#d07a5a', '#6f8c52'].map(hexRgb);

/** Evening hours on the roofs: 20:00 to 01:00. */
export const onRoofs = (hq) => hq >= 20 || hq < 1;

/**
 * Residents sitting on the roofs in the evening (scene.rooftops: house id and
 * a place on its roof as shares of its width and depth), two to a roof, at
 * the roof's height with the roof cell's heat. Pure function of the hour.
 */
export function rooftopsAt(world, hq, heatAt) {
  if (!onRoofs(hq)) return [];
  const out = [];
  world.scene.rooftops.forEach(([id, fx, fy], r) => {
    const B = world.vgParent.get(id);
    if (!B) return;
    for (let k = 0; k < 2; k++) {
      const x = B.x0 + (B.x1 - B.x0) * fx + k * 1.1;
      const y = B.y0 + (B.y1 - B.y0) * fy + k * 0.6;
      const i = world.cellIndex(x, y);
      out.push({ x, y, z: B.h, hx: 1, hy: 0, walk: 0, shirt: SHIRTS[(r * 3 + k) % SHIRTS.length], k: 830000 + r * 10 + k, sit: true, bob: hash3(r, k, 4), heat: heatAt(i), roof: id });
    }
  });
  return out;
}

/**
 * The block's plugin for app.js: the residents' white roofs (R, button,
 * ?coolroof=1) and the under-the-roof wash (O, button, ?under=1), the cards,
 * notes, heat-card rows, renderer hooks, the residents on the roofs and the
 * API. env: {scene, world, thermal, root, card, R, S, main, query, setup
 * (villageSetup), hideCard(), reopen(), redraw(), setModel(T), setNotes(n)}.
 */
export function vgApp(env) {
  const { scene, world, root, card, R, S, main } = env;
  const set = env.setup;
  const base = set.base;
  let thermal = env.thermal;
  const st = { cool: false, under: env.query.get('under') === '1' };
  const orig = new Map(world.buildings.filter((B) => B.paint).map((B) => [B.index, B.roof]));
  let fixed = null;
  const stats = () => (fixed ??= villageStats(world, base, set.n));
  let cs = null;
  const cool = () => (cs ??= coolStats(world, base, set.model(true), set.n, stats().roofs));
  const sheets = stats().roofs.map((r) => ({ b: r.b, cells: r.cells }));
  const underCache = new Map();
  const under = (hq) => {
    const key = `${st.cool ? 1 : 0}|${hq}`;
    if (!underCache.has(key)) {
      if (underCache.size > 200) underCache.clear();
      const rows = sheets.map((r) => underRoof(world, thermal, r.b, hq, set.n, r.cells));
      const m = (f) => {
        const a = rows.filter(f);
        return a.length ? fmt(a.reduce((s, x) => s + x.radiant, 0) / a.length) : '—';
      };
      underCache.set(key, { rows, summary: { rust: m((x) => x.roof === 'rustTin'), white: m((x) => x.roof === 'whiteTinAged' || x.roof === 'whiteTin'), air: fmt(thermal.air(hq)) } });
    }
    return underCache.get(key);
  };
  R.village = { buildings: world.buildings, under, hm, fr: VG.fr.value };
  R.overlay = vgOverlay;

  // residents on the roofs in the evening, added to the main view's walkers
  const life = main.life;
  const baseAt = life.at.bind(life);
  const heatAt = (hq) => (i) => ({ tmrt: thermal.tmrt(i, hq), sunlit: thermal.sunlit(i, hq) });
  life.at = (t, hq) => baseAt(t, hq).concat(rooftopsAt(world, hq, heatAt(hq)));

  const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="village" class="blockpanel" aria-label="Urban village controls">
        <div class="seg">${btn('data-cool', '1', 'white roofs (R)')}${btn('data-under', '1', 'under the roof (O)')}</div>
        <div class="measures"><div class="hand">Cards</div>${VG_CARDS.map(([id, label]) => btn('data-card', id, label)).join('')}</div>
      </div>`,
  );
  const el = root.getElementById('village');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.cool) setCool(!st.cool);
    else if (b.dataset.under) setUnder(!st.under);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-cool]').setAttribute('aria-pressed', String(st.cool));
    el.querySelector('[data-under]').setAttribute('aria-pressed', String(st.under));
  }
  /** Repaint the marked roofs (the display list holds these colour arrays) and switch the model. */
  function setCool(on) {
    if (!!on === st.cool) return;
    st.cool = !!on;
    for (const [b, { bare, fills }] of world.vgFills ?? []) {
      const c = st.cool ? VG_ROOF.whiteTin : bare;
      for (const f of fills) for (let k = 0; k < 3; k++) f[k] = c[k];
      world.buildings[b].roof = st.cool ? VG.paint.value : orig.get(b);
    }
    thermal = set.model(st.cool);
    env.setModel(thermal);
    R.tiles.clear();
    R.scaffold = null;
    sync();
    env.reopen();
    env.redraw();
  }
  function setUnder(on) {
    st.under = !!on;
    sync();
    env.reopen();
    env.redraw();
  }
  function html(id) {
    const s = stats();
    if (id === 'lanes') return lanesCard({ st: s, noonAlt: base.sun(VG.noon.value).alt });
    if (id === 'roofs') return roofsCard({ st: s });
    if (id === 'under') return underCard({ st: s });
    if (id === 'white') return whiteCard({ st: s, cool: cool(), on: st.cool });
    if (id === 'measured') return measuredCard({ st: s });
    return riskCard();
  }
  function show(id, anchor) {
    card.innerHTML = html(id);
    card.querySelector('.x').onclick = env.hideCard;
    card._pick = null;
    card._measure = `blk:${id}`;
    card.dataset.open = '1';
    card.dataset.kind = id;
    card.style.display = 'block';
    const r = anchor ? anchor.getBoundingClientRect() : { top: 120 };
    const panel = el.getBoundingClientRect();
    card.style.left = `${Math.min(window.innerWidth - card.offsetWidth - 10, panel.right + 12)}px`;
    card.style.top = `${Math.max(10, Math.min(window.innerHeight - card.offsetHeight - 10, r.top - 20))}px`;
  }
  function noteData() {
    const s = stats();
    const L = s.lanes.village;
    return {
      laneH: L.H,
      laneSvf: L.svf,
      lane15: L.tmrt[15],
      lane22: L.tmrt[VG.night.value],
      sq15: s.square.tmrt[15],
      sq22: s.square.tmrt[VG.night.value],
      rust15: s.edge.rustTin.ts15,
      rust03: s.edge.rustTin.ts03,
      white15: s.edge.whiteTinAged.ts15,
      under15: s.edge.rustTin.radiant15,
      air15: s.air[15],
    };
  }
  if (env.query.get('coolroof') === '1') setCool(true);
  return {
    notes: () => vgNotes(scene, noteData()),
    look: () => ({ under: st.under, budget: 1 }),
    sync,
    html,
    /** Keyboard: R paints the residents' white roofs, O shows the room under the roof; true if the key was the block's. */
    key(k) {
      if (k === 'r' || k === 'R') setCool(!st.cool);
      else if (k === 'o' || k === 'O') setUnder(!st.under);
      else return false;
      return true;
    },
    /** Heat-card rows: a lane's width, walls and canyon sky view; under a sheet roof, the room's proxies; a slab roof says so. */
    cardKey: 'village',
    cardInfo: (cells, tmrtCell, h, leaf) => {
      if (leaf) return null;
      if (tmrtCell !== null) {
        const c = world.vg.byCell.get(tmrtCell);
        return c ? { lane: { W: c.W, H1: c.H1, H2: c.H2, kind: c.kind, svf: world.svf[c.i], grid: world.vg.svfGrid[c.i], sun: thermal.sunlit(c.i, h) } } : null;
      }
      const b = world.bld[cells[0]];
      const B = world.buildings[b];
      const u = underRoof(world, thermal, b, h, set.n, cells);
      if (u) return { under: { ...u, peak: Math.max(...HOURS.map((x) => underRoof(world, thermal, b, x, set.n, cells).airRaw)), painted: !!B.paint && st.cool } };
      return B.roof === 'slabRoof' ? { slab: true } : null;
    },
    cardRows: (f) => {
      if (f.lane) {
        const L = f.lane;
        return `<tr><td>lane (sub-grid): width / walls</td><td>${L.W} m / ${fmt(L.H1)} and ${fmt(L.H2)} m${L.kind === 'cross' ? ' (crossing)' : ''}</td></tr><tr><td>${gl('svf', 'sky view')}, canyon / 5 m grid</td><td>${f2(L.svf)} / ${f2(L.grid)}</td></tr><tr><td>lane floor in sun now</td><td>${pct(L.sun)}</td></tr>`;
      }
      if (f.slab) return '<tr><td colspan="2" class="sub">The room under a concrete slab is not computed (its heat store is in the slab).</td></tr>';
      const u = f.under;
      const s = airShown(u.peak);
      return `<tr><td>${gl('indoorRadiant', 'radiant temperature under the roof')} now (proxy)</td><td>${fmt(u.radiant)} °C</td></tr><tr><td>room air now / day's peak (illustrative)</td><td>${K(u.value)}${u.capped ? ' (capped)' : ''} / ${K(s.value)}${s.capped ? ' (capped)' : ''} on the outdoor air</td></tr>${u.painted ? '<tr><td colspan="2" class="sub">Painted white by the residents (R).</td></tr>' : ''}`;
    },
    glossary: () => ({}),
    /** Urban village block (block 10) only: state {cool, under}; set() it; numbers for the bands and cards; card HTML; the proxies; residents. */
    api: {
      state: () => ({ cool: st.cool, under: st.under }),
      set(o) {
        if (o.cool !== undefined) setCool(!!o.cool);
        if (o.under !== undefined) setUnder(!!o.under);
      },
      stats: () => {
        const s = stats();
        return { ...s, roofs: s.roofs.map((r) => ({ ...r, cells: r.cells.length })) };
      },
      cool: () => cool(),
      n: () => set.n,
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#village [data-card="${id}"]`)),
      lane: (x, y) => {
        const c = laneAt(world, x, y);
        return c ? { ...c, svf: world.svf[c.i], grid: world.vg.svfGrid[c.i] } : null;
      },
      lanes: () => world.vg.lanes.length,
      under: (h = S.hour) => under(quantHour(h)).rows.map((u) => ({ ...u })),
      radiant: (tRoof, ta) => radiantIn(tRoof, ta),
      roofTs: (id, h = S.hour) => {
        const B = world.vgParent.get(id);
        const c = cellsOf(world, B.index);
        return c.reduce((a, i) => a + thermal.ts(i, h), 0) / c.length;
      },
      fills: () => [...(world.vgFills ?? new Map()).entries()].map(([b, v]) => ({ b, rgb: v.fills[0].slice(), roof: world.buildings[b].roof })),
      residents: (frame = S.frame, hour = S.hour) => rooftopsAt(world, quantHour(hour), heatAt(quantHour(hour))).map((a) => ({ x: a.x, y: a.y, z: a.z, roof: a.roof, tmrt: a.heat.tmrt })),
      square: () => squareCells(world).length,
      models: () => set.cached(),
    },
  };
}
