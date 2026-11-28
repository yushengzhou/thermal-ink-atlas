// dsui: the overlay of the desert courtyard block (block 11): margin-note
// text, the cards (the design day, sails or trees, arcades and courtyards,
// what a lawn costs in water, misters, the light street coating, dry air and
// the night sky, heat deaths in the county), the heat-card rows and the
// block's plugin for app.js. Wording follows the outside evaluation (#29)
// from the start: each card opens with one everyday sentence, the numbers
// are in plain words, and Greek letters, units, "unverified" tags and
// sources sit in a closed "For experts" part at the bottom, with links to the
// references page. Health wording is factual and hedged; no real addresses.
import { SOURCES, BASIS, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { INTRO, quantHour } from './render.js';
import { DS, desertStats, waterUse, KINDS, shadeCells } from './desert.js';
import { DS_STREET, dsOverlay } from './dskit.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const r0 = (v) => String(Math.round(v));
const f2 = (v) => v.toFixed(2);
const K = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))} K`;
const deg = (v) => `${fmt(Math.abs(v))} degrees ${v < 0 ? 'cooler' : 'warmer'}`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const ref = (k) => `<a href="../../references.html#desert">[${k}]</a> ${SOURCES[k]}`;
/** The closed part at the bottom of a card: the model's terms, flags and sources (with links to the references page). */
const experts = (body, keys) => `<details class="expert"><summary>For experts</summary>${body}<p class="src">Sources: ${keys.map(ref).join('; ')}. Made-up block, calculated temperatures: a ${gl('forceRestore', 'force-restore')} surface model on a 5 m grid; the air temperature is fixed.</p></details>`;
const close = '<button class="x" aria-label="close">×</button>';
const MISS = ' <b>(outside the measured range)</b>';
const outside = (x, [a, b]) => x < a || x > b;

/** The brief's bands the cards quote (docs/sources.md, Block 11, checks them all). */
export const DS_BANDS = { gravel: [55, 63], coat: -5, lawnAir: 2, evap: [5, 7], open: [65, 76], sail: [-20, -14], tree: [-20, -14], arcade: [-31, -20], night: [0, 5], coatTmrt: [2.5, 3.2] };
const NAME = { sail: 'shade sails', ramada: 'the ramada', arcade: 'the arcade', patio: 'the café patio', mesquite: 'mesquite trees', paloVerde: 'palo verde trees' };

/** Margin notes (at most 5), in plain words. d: numbers from the plugin (noteData). */
export function dsNotes(scene, d) {
  const text = {
    sail: ['Under the sails at 3 pm it feels', `about ${r0(-d.sail)} degrees cooler than in the open sun`],
    arcade: [`In the arcade: about ${r0(-d.arcade)} degrees cooler`, 'to stand in than the open sun at 3 pm'],
    lawn: [`The watered lawn: ${fmt(d.lawn15)} °C at 3 pm (air ${fmt(d.air15)} °C);`, `it drinks about ${fmt(d.evap)} litres per m² a day`],
    street: [`Light-coated Main Street: ${r0(-d.coatTs)} degrees cooler underfoot,`, `but ${fmt(d.coatTmrt)} degrees hotter to stand on at 3 pm`],
    plaza: [`Open gravel in the sun: ${fmt(d.gravel15)} °C at 3 pm,`, 'the hottest place to stand in the plaza'],
  };
  const terms = {
    sail: [['shadeSail', 'Under the sails']],
    arcade: [['tmrt', 'to stand in']],
    lawn: [['referenceEt', 'it drinks about']],
    street: [['albedo', 'Light-coated']],
    plaza: [['xeriscape', 'Open gravel']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** The design day card. d: {st, site, ghi}. */
export function designCard(d) {
  const a = d.st.air;
  const s = d.site;
  const rh = (100 * s.vapourHpa) / (6.112 * Math.exp((17.67 * s.taMax) / (s.taMax + 243.5)));
  return `
    ${close}
    <h3>A normal hot July day</h3>
    <p class="lead">A clear day in a desert city like Phoenix: ${fmt(s.taMin)} °C at dawn, ${fmt(s.taMax)} °C at half past four in the afternoon, and air so dry that sweat dries at once.</p>
    <table class="cmp">
      <tr><td></td><td>coolest / warmest air</td></tr>
      <tr class="t"><td>this block (made up)</td><td>${fmt(s.taMin)} / ${fmt(s.taMax)} °C</td></tr>
      <tr><td>an average July, 1991–2020</td><td>29.2 / 41.4 °C</td></tr>
      <tr><td>July 2023, the hottest month on record there</td><td>32.7 / 45.9 °C</td></tr>
      <tr><td colspan="2" class="sub">Air at noon ${fmt(a[12])} °C, at 3 pm ${fmt(a[15])} °C, at 9 pm ${fmt(a[21])} °C. In July 2023 the city had 31 days in a row at or above 43 °C (110 °F); in the whole of 2024, a record 70 such days.</td></tr>
    </table>
    <p class="note">The warmest hour comes late, after 4 pm, because the ground keeps heating the air long after noon. The night stays warm too: the coolest hour, just before sunrise, is still ${fmt(s.taMin)} °C.</p>
    ${experts(`<p class="lit">Air: a cosine from ${fmt(s.taMin)} °C at sunrise to ${fmt(s.taMax)} °C at ${hm(s.tmaxHour)}${tag(DS.tmaxHour)} (hourly normals: warmest 16–17 h local standard time), between the 1991–2020 normal and July 2023. Vapour pressure ${s.vapourHpa} hPa${tag(DS.vapour)} (dew point about 10 °C; lowest relative humidity ${r0(rh)}%), wind ${s.wind} m/s${tag(DS.wind)}; no daylight saving. Hot days at a nearby weather station: dew point 11–13 °C, reference evapotranspiration 7.8–8.9 mm a day.</p>
      <p class="caveat">The engine's clear-sky sun gives ${r0(d.ghi)} W m⁻² on open ground at solar noon; measured clear-day peaks in Tempe were 919–983 W m⁻², so the model's midday sun is likely a few per cent strong. The sun's position comes from the engine's own formula (an open check, issue #24).</p>`, ['ncei', 'azmet', 'climateGov2023', 'nwsPsr', 'middel2021', 'brief11'])}`;
}

/** Sails or trees card. d: {st}. */
export function sailsCard(d) {
  const S = d.st.shade;
  const h = DS.hour.value;
  const row = (k, lo, hi, cls = '') => {
    const x = S[k][h];
    return `<tr${cls}><td>${NAME[k]}</td><td>${r0(x.tmrt)} °C</td><td>${deg(x.d)}</td><td>${lo} to ${hi}</td></tr>`;
  };
  const sailMiss = outside(S.sail[h].d, DS_BANDS.sail);
  const ramMiss = outside(S.ramada[h].d, DS_BANDS.sail);
  const paloMiss = outside(S.paloVerde[h].d, DS_BANDS.tree);
  return `
    ${close}
    <h3>Sails or trees?</h3>
    <p class="lead">At 3 pm, standing under a shade sail feels about ${r0(-S.sail[h].d)} degrees cooler than standing in the open sun; under a mesquite tree about ${r0(-S.mesquite[h].d)} degrees. The sail needs no water.</p>
    <table class="cmp">
      <tr><td>3 pm, standing under</td><td>feels like</td><td>against open sun</td><td>measured, degrees</td></tr>
      <tr><td>open sun on the plaza</td><td>${r0(d.st.ref[h].tmrt)} °C</td><td>—</td><td>—</td></tr>
      ${row('sail', '−14', '−20', ' class="t"')}
      ${row('ramada', '−14', '−20')}
      ${row('mesquite', '−14', '−20')}
      ${row('paloVerde', '−14', '−20')}
      <tr><td colspan="4" class="sub">"Feels like" is the radiant heat on a standing person (${gl('tmrt', 'mean radiant temperature')}), not the air. ${sailMiss || ramMiss || paloMiss ? `Outside the range measured in Tempe: ${[sailMiss ? 'the sails' : '', ramMiss ? 'the ramada' : '', paloMiss ? 'the palo verdes' : ''].filter(Boolean).join(', ')}${MISS}.` : 'All inside the range measured in Tempe.'}</td></tr>
    </table>
    ${sailMiss || ramMiss || paloMiss ? `<p class="caveat">Why the model differs, likely: ${sailMiss ? `the sails here stop 85% of the direct sun, and a person under them sees only the shaded ground below, not the hot gravel around (in test runs, sails letting through 25% of the sun, the top of the suggested range, land at about −19 degrees; with the gravel around in view, about −21). ` : ''}${ramMiss ? `The ramada is a solid roof, so it acts like the arcade (measured 23 to 31 degrees cooler); the 14 to 20 degrees were measured under sails and umbrellas. ` : ''}${paloMiss ? `${d.palo.court.n} of the ${d.palo.court.n + d.palo.open.n} palo verde spots are in house courtyards, where the light walls throw sunlight back onto a person (${deg(d.palo.court.d)}); the one in the open plaza: ${deg(d.palo.open.d)}.` : ''}</p>` : ''}
    <p class="note">A sail stops most of the sunshine before it reaches you; a desert tree does the same with its leaves and also evaporates a little water. Here the air temperature is the same under both: measured shade in Tempe changed the air by less than 1.3 degrees.</p>
    ${experts(`<p class="lit">Middel et al. (2021), Tempe: ΔTmrt −16.7 K (mesquite, Prosopis) to −25.9 K (Canary Island pine) by species; sails and umbrellas −17.3 K; ΔTs tree over gravel −21.2 K (12:30); lightweight shade −11 to −14 K at the surface.</p>
      <p class="caveat">The sail lets through ${MATERIALS.desertSail.tr.value}${tag(MATERIALS.desertSail.tr)} of the direct sun; the ramada none. The mesquite crown's share of sun (${f2(MATERIALS.mesquite.tr.value)}${tag(MATERIALS.mesquite.tr)}) is set so the mesquites match the measured −16.7 K, so their row cannot test the model; the palo verdes take the same crown (no measured value${tag(MATERIALS.paloVerde.tr)}), and as they stand on the corners of the 5 m grid cells, the cells in their shade keep their open sky view. Under a screen the model counts the cloth or roof as a warm surface overhead (the engine's shared warm-wall term), and no blocked sky.</p>`, ['middel2021', 'colter2019', 'brief11'])}`;
}

/** Arcades and courtyards card. d: {st}. */
export function arcadeCard(d) {
  const st = d.st;
  const h = DS.hour.value;
  const ni = DS.night.value;
  const A = st.shade.arcade;
  const arcMiss = outside(A[h].d, DS_BANDS.arcade);
  const nightRows = ['sail', 'ramada', 'arcade', 'mesquite'].map((k) => `<tr><td>${NAME[k]}</td><td>${deg(st.shade[k][ni].d)}${outside(st.shade[k][ni].d, DS_BANDS.night) ? MISS : ''}</td></tr>`).join('');
  return `
    ${close}
    <h3>Arcades and courtyards: the deepest shade</h3>
    <p class="lead">A covered walkway along the shops is the coolest place to stand at 3 pm: it feels about ${r0(-A[h].d)} degrees cooler than the open sun${arcMiss ? `, outside the 20 to 31 degrees measured${MISS}` : ', within the 20 to 31 degrees measured in Tempe'}.</p>
    <table class="cmp">
      <tr><td>3 pm</td><td>feels like</td></tr>
      <tr class="t"><td>under the arcade</td><td>${r0(A[h].tmrt)} °C</td></tr>
      <tr><td>in a house's courtyard</td><td>${r0(st.court.tmrt15)} °C</td></tr>
      <tr><td>open sun on the plaza</td><td>${r0(st.ref[h].tmrt)} °C</td></tr>
      <tr><td colspan="2" class="sub">After dark (9 pm) the shade turns around: under a roof it feels warmer than in the open, because the roof hides the cold night sky. Measured: 0 to 5 degrees warmer.</td></tr>
      ${nightRows}
    </table>
    ${nightRows.includes('outside') ? '<p class="caveat">After dark the model keeps every spot under a roof, a sail or a crown 6 to 11 degrees warmer than the open plaza, more than measured. Likely: the model hides three quarters of the night sky under any of them behind a surface near the air temperature, while the open plaza sees the cold, dry desert sky; in a test run, roofs and sails cooling 3 degrees below the air at night (as a thin sheet does here) still leave a gap of about 6 to 8 degrees.</p>' : ''}
    <p class="note">The arcade has the building on one side and a roof above, so it sees little sky and no afternoon sun. The courtyards of the houses are small and walled: by 3 pm about half of each lies in the shade of its own walls.</p>
    ${experts(`<p class="lit">Middel et al. (2021): arcades, tunnels and overhangs ΔTmrt −22.8 to −30.9 K by day, tunnels +3.2 K at night; trees up to +5 K after sunset. Sky view: arcade ${f2(A[h].svf)}, courtyards ${f2(st.court.svf)} (5 m grid, walls at their true distance).</p>
      <p class="caveat">Every wall is the engine's shared warm wall (air + 2 K, more in the sun; issue #28), whatever its colour or shade, so the arcade's shaded back wall and the roof overhead likely read warmer than real stucco in shade.</p>`, ['middel2021', 'middelKrayenhoff2019', 'brief11'])}`;
}

/** What a lawn costs in water card. d: {st, water}. */
export function lawnCard(d) {
  const L = d.st.lawn;
  const w = d.water;
  const evapMiss = outside(L.evap, DS_BANDS.evap);
  const tsMiss = L.ts15 - d.st.air[15] > DS_BANDS.lawnAir;
  return `
    ${close}
    <h3>What a lawn costs in water</h3>
    <p class="lead">The watered lawn stays near the air temperature (${fmt(L.ts15)} °C at 3 pm, air ${fmt(d.st.air[15])} °C) while gravel next to it is far hotter, but every square metre of lawn uses about ${fmt(L.evap)} litres of water a day to do it.</p>
    <table class="cmp">
      <tr><td>water a day, litres per m²</td><td></td></tr>
      <tr class="t"><td>lawn, evaporated (this model)</td><td>${fmt(L.evap)}${evapMiss ? MISS : ''}</td></tr>
      <tr><td>lawn, estimated from crop water needs</td><td>5–7</td></tr>
      <tr><td>lawn, watered as the guidance says</td><td>about ${w.lawnApplied}</td></tr>
      <tr><td>desert tree, per m² of its crown</td><td>${w.trees[0]}–${w.trees[1]}</td></tr>
      <tr><td>gravel yard, shade sail</td><td>0</td></tr>
      <tr><td colspan="2" class="sub">Lawn surface at 3 pm ${fmt(L.ts15)} °C${tsMiss ? ` (more than 2 degrees above the air${MISS})` : ' (measured: irrigated grass is never far above the air)'}; sunlit gravel ${fmt(d.st.gravel.ts15)} °C${outside(d.st.gravel.ts15, DS_BANDS.gravel) ? ` (measured 55–63 °C${MISS}: likely the engine's strong midday sun and an air 1.4 degrees warmer than on the measurement day; gravel at the light end of its likely range would be about 61 °C)` : ''}.</td></tr>
    </table>
    <p class="note">The lawn cools itself by evaporating water: the sun that would heat it goes into turning water to vapour. In dry desert air that works well, but it needs water every day. A neighbourhood study found that much more watering would cool the evenings only a little faster.</p>
    ${experts(`<p class="lit">Reference evapotranspiration at Phoenix Encanto in July 7.1–7.8 mm a day; bermudagrass crop coefficient 0.78 in July, so about 5–7 mm a day (1 mm = 1 L m⁻²); lawns watered every 3 days, about 6.4 mm a day applied; a desert tree with a 6.1 m crown about 890 L every 7–21 days. Gober et al.: 32.8% more outdoor water for 0.41–0.82 K per hour faster evening cooling. Middel et al. (2014): xeric yards warmest, then oasis, then mesic; by day the form of a neighbourhood matters more than its landscaping. Middel et al. (2015): about −0.14 K of air per 1% more tree canopy.</p>
      <p class="caveat">The lawn's ${gl('ef', 'evaporative fraction')} is ${MATERIALS.desertLawn.ef.value}${tag(MATERIALS.desertLawn.ef)}: a fixed share of its net sunshine. It does not depend on how dry the air is, and it cannot draw extra heat out of the hot, dry air blowing over the lawn (the "oasis effect": a real lawn here likely evaporates about as much water as all its net sunshine could). Here it evaporates ${L.evapMin.toFixed(1)}–${L.evapMax.toFixed(1)} L a day across the lawn, inside the 5–7 L estimate.</p>`, ['azmet', 'az1195', 'amwua', 'gober2009', 'middel2014', 'middel2015', 'templeton2018', 'brief11'])}`;
}

/** Misters card (quoted, not modelled). */
export function mistCard(d) {
  return `
    ${close}
    <h3>Misters on the café patio</h3>
    <p class="lead">Fine water spray under the patio roof makes sitting there feel a few degrees cooler; this page does not calculate it, it quotes the studies.</p>
    <table class="cmp">
      <tr><td>measured or modelled</td><td></td></tr>
      <tr><td>misters in Phoenix, felt heat</td><td>about 4–8 degrees cooler</td></tr>
      <tr><td>a misting model, air near the nozzles</td><td>up to about 17 degrees cooler</td></tr>
      <tr><td>water</td><td>${d.water.misters[0]}–${d.water.misters[1]} L per m² an hour</td></tr>
    </table>
    <p class="note">Misting works best in dry air like this, because the drops evaporate before they land: the drier the air, the further its ${gl('wetBulb', 'wet-bulb temperature')} (${fmt(d.st.sky.wetBulb15)} °C at 3 pm here) lies below the air. The cooling stays close to the nozzles and uses water for every hour it runs.</p>
    ${experts(`<p class="lit">Vanos et al. (2022): misters lowered Tmrt by 7.6 K, PET by 6.5 K and UTCI by 4.4 K. Huang et al. (2025): up to −17.5 K of air in a model; 4.87 L per hour per nozzle, 0.3–0.7 nozzles per m², i.e. 1.5–3.4 L m⁻² h⁻¹. Wet-bulb at 43 °C and 12 hPa: about 22 °C.</p>
      <p class="caveat">Not modelled: the page's air temperature is fixed, and the patio is drawn with its mister line only. The numbers above are the studies', not this page's.</p>`, ['vanos2022', 'huang2025', 'stull2011', 'brief11'])}`;
}

/** The light street coating card. d: {st, on}. */
export function coatCard(d) {
  const c = d.st.coat[15];
  const n = d.st.coat[12];
  const tsMiss = c.dTs > DS_BANDS.coat;
  const tmMiss = outside(c.dTmrt, DS_BANDS.coatTmrt);
  return `
    ${close}
    <h3>The light street coating</h3>
    <p class="lead">Main Street is coated pale grey: at 3 pm its surface is about ${r0(-c.dTs)} degrees cooler than bare asphalt, but a person standing on it feels about ${fmt(c.dTmrt)} degrees hotter, because more sunlight bounces up onto them.</p>
    <table class="cmp">
      <tr><td></td><td>coated / bare</td><td>change</td><td>measured</td></tr>
      <tr class="t"><td>road surface, 3 pm</td><td>${fmt(c.ts)} / ${fmt(c.tsBare)} °C</td><td>${deg(c.dTs)}${tsMiss ? MISS : ''}</td><td>about 6 cooler</td></tr>
      <tr class="t"><td>a person on it, 3 pm</td><td>${r0(c.tmrt)} / ${r0(c.tmrtBare)} °C</td><td>${deg(c.dTmrt)}${tmMiss ? MISS : ''}</td><td>2.5–3.2 warmer</td></tr>
      <tr><td>road surface, noon</td><td>${fmt(n.ts)} / ${fmt(n.tsBare)} °C</td><td>${deg(n.dTs)}</td><td>about 7 cooler</td></tr>
      <tr><td>a person on it, noon</td><td>${r0(n.tmrt)} / ${r0(n.tmrtBare)} °C</td><td>${deg(n.dTmrt)}</td><td>about 3 warmer</td></tr>
      <tr><td colspan="4" class="sub">${d.on ? 'Coating on' : 'Coating off'} (C, or the panel button). The cross street is bare asphalt: ${fmt(d.st.cross.ts15)} °C at 3 pm.</td></tr>
    </table>
    ${tmMiss ? `<p class="caveat">Likely why the model's change is above the measured 2.5–3.2 degrees: a person here sees only the coated road below them; in a test run with the sidewalks and yards around them in view, about +3.1 degrees.</p>` : ''}
    <p class="note">A light coating helps the road and the buildings next to it, and helps at night a little; for people walking at midday it is the wrong tool on its own. Shade over the sidewalk does both.</p>
    ${experts(`<p class="lit">Phoenix cool pavement pilot, phase 2 (2024): coated road −6.7 K at noon, −5.8 K in the afternoon; pedestrian Tmrt +3.2 K at noon, +2.5 K in the afternoon; air −0.07 K on average, the most cooling at 8 pm and a little warmer at 9 pm. Erell et al. (2014): high-albedo street canyons can worsen pedestrian heat stress. Los Angeles coated streets: Middel et al. (2020).</p>
      <p class="caveat">Coating ${gl('albedo', 'albedo')} ${MATERIALS.coolCoat.alpha.value}${tag(MATERIALS.coolCoat.alpha)}; the bare street is the atlas's aged asphalt (${MATERIALS.asphalt.alpha.value}), lighter than the 0.036 measured on the Phoenix streets, so the change in reflectance here (${f2(MATERIALS.coolCoat.alpha.value - MATERIALS.asphalt.alpha.value)}) is likely smaller than in the trial. No cars, no traffic heat, no wind from the street.</p>`, ['coolPave2024', 'erell2014', 'middel2020', 'middelKrayenhoff2019', 'brief11'])}`;
}

/** Dry air and the night sky card. d: {st}. */
export function dryCard(d) {
  const s = d.st.sky;
  return `
    ${close}
    <h3>Dry air, a colder night sky</h3>
    <p class="lead">Desert air holds little water vapour, so the clear night sky is "colder" than over a humid city: open ground loses heat to it faster after sunset.</p>
    <table class="cmp">
      <tr><td>3 am, the sky's infrared glow</td><td></td></tr>
      <tr class="t"><td>this dry air (12 hPa of vapour)</td><td>${r0(s.lw3)} W per m²</td></tr>
      <tr><td>the same air, more humid (20 hPa)</td><td>${r0(s.lw3h)} W per m²</td></tr>
      <tr><td colspan="2" class="sub">At 3 am: the watered lawn ${fmt(d.st.lawn.ts03)} °C, the air ${fmt(d.st.air[3])} °C.</td></tr>
    </table>
    <p class="note">Each square metre of open ground gets about ${r0(s.lw3h - s.lw3)} watts less warmth from the sky than it would under humid air. Walls, roofs and sails hide the night sky, so after dark the open plaza cools faster than the shaded places. The same dry air makes evaporation strong: a wet surface can cool to about ${fmt(s.wetBulbMax)} °C, the ${gl('wetBulb', 'wet-bulb temperature')}, when the air is ${fmt(d.site.taMax)} °C.</p>
    ${experts(`<p class="lit">${gl('vapourPressure', 'Vapour pressure')} e_a = 6.112 exp(17.67 T_d / (T_d + 243.5)) hPa: 12.3 hPa at a dew point of 10 °C. Clear-sky emissivity (Brutsaert 1975) ${f2(s.eps)} at 12 hPa against ${f2(s.eps20)} at 20 hPa (3 am air). Wet-bulb at 43 °C and 12 hPa about 22 °C (Stull 2011).</p>`, ['stull2011', 'azmet', 'brief11'])}`;
}

/** Heat deaths card (literature only). */
export function deathsCard() {
  return `
    ${close}
    <h3>Heat deaths in the county</h3>
    <p class="lead">In the county around Phoenix, heat is counted as a cause or contributor in hundreds of deaths a year; most of them happen outdoors.</p>
    <table class="cmp">
      <tr><td>heat-related deaths</td><td></td></tr>
      <tr><td>2021</td><td>339</td></tr>
      <tr><td>2022</td><td>425</td></tr>
      <tr><td>2023</td><td>645</td></tr>
      <tr><td>2024</td><td>608</td></tr>
      <tr><td>2025</td><td>430 (313 outdoors, 111 indoors)</td></tr>
      <tr><td colspan="2" class="sub">In 2024, about half of the people who died were homeless, and drugs were involved in more than half of the deaths (as quoted from the report, not re-checked). Counts come from the county's public-health reports; the preliminary count for 2025 was 427.</td></tr>
    </table>
    <p class="note">People without a cool place to go, people working or living outside, and people with heart, lung or kidney illness are most at risk. Shade, water, cooling centres and checking on neighbours are the measures the county names most often. Nothing on this card is calculated by the page.</p>
    ${experts(`<p class="caveat">Figures from the county's 2025 annual report (April 2026) as quoted by the research brief, not re-checked; a preliminary count for 2026 is not shown. Deaths are counted where heat caused or contributed to them.</p>`, ['mcdph2025', 'brief11'])}`;
}

/** Button labels for the desert panel cards. */
export const DS_CARDS = [
  ['design', 'The design day'],
  ['sails', 'Sails or trees?'],
  ['arcade', 'Arcades and courtyards'],
  ['lawn', 'What a lawn costs'],
  ['mist', 'Misters'],
  ['coat', 'The street coating'],
  ['dry', 'Dry air at night'],
  ['deaths', 'Heat deaths'],
];

const STYLE = `#dsHint{position:fixed;left:50%;top:18px;transform:translateX(-50%);padding:6px 14px;background:rgba(246,240,226,.92);border:1px solid #2b2621;border-radius:6px 3px 8px 3px;font-size:14px}
.noui #dsHint{display:none}
#desert summary{cursor:pointer;font-size:13px;margin-bottom:4px}
#card details.expert{margin-top:8px;border-top:1px dashed #6d6355;padding-top:4px}
#card details.expert summary{cursor:pointer;font-size:12px;opacity:.8}
#card .lead{margin:4px 0 8px;font-size:14px}`;

/**
 * The block's plugin for app.js: the street coating (C, button, ?coat=0 to
 * show it bare; default on, as built), the water overlay (L, button,
 * ?water=1), a heat-view button (T), the loading hint, the cards, notes,
 * heat-card rows, renderer hooks and the API. env: {scene, world, thermal,
 * root, card, R, S, main, query, setup (desertSetup), hideCard(), reopen(),
 * redraw(), setModel(T), setNotes(n)}.
 */
export function dsApp(env) {
  const { scene, world, root, card, R, S } = env;
  const set = env.setup;
  const base = set.base;
  let thermal = env.thermal;
  const st = { coat: true, water: env.query.get('water') === '1' };
  let fixed = null;
  const stats = () => (fixed ??= desertStats(world, base, set.model(false)));
  const water = () => waterUse(stats());
  R.desert = {
    water: water(),
    lawns: scene.ground.filter((g) => g.mat === 'desertLawn').map((g) => [g.poly[0], g.poly[1], g.poly[4], g.poly[5]]),
    trees: world.trees.filter((t) => t.species),
    patios: world.screens.filter((P) => P.patio),
  };
  R.overlay = dsOverlay;

  root.head.insertAdjacentHTML('beforeend', `<style>${STYLE}</style>`);
  const btn = (attr, v, label) => `<button type="button" ${attr}="${v}">${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="dsHint" class="hand" role="status">Drawing the block… the colours come in as the ink dries</div>
    <div id="desert" class="blockpanel" aria-label="Desert block controls"><details open><summary class="hand">Desert block: buttons and cards</summary>
        <div class="seg">${btn('data-heat', '1', 'heat view (T)')}${btn('data-coat', '1', 'street coating (C)')}${btn('data-water', '1', 'water used (L)')}</div>
        <div class="measures"><div class="hand">Cards</div>${DS_CARDS.map(([id, label]) => btn('data-card', id, label)).join('')}</div>
      </details></div>`,
  );
  const el = root.getElementById('desert');
  const hint = root.getElementById('dsHint');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.heat) window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    else if (b.dataset.coat) setCoat(!st.coat);
    else if (b.dataset.water) setWater(!st.water);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-heat]').setAttribute('aria-pressed', String(!!S.thermal));
    el.querySelector('[data-coat]').setAttribute('aria-pressed', String(st.coat));
    el.querySelector('[data-water]').setAttribute('aria-pressed', String(st.water));
  }
  /** Repaint the street's coating layer (the display list holds this colour array) and switch the model. */
  function setCoat(on, init = false) {
    if (!!on === st.coat) return;
    st.coat = !!on;
    const c = st.coat ? DS_STREET.coated : DS_STREET.bare;
    if (world.dsCoat) for (let k = 0; k < 3; k++) world.dsCoat[k] = c[k];
    thermal = set.model(st.coat);
    env.setModel(thermal);
    R.tiles.clear();
    R.scaffold = null;
    sync();
    if (init) return; // at load (?coat=0): app.js draws once the plugin is in place
    env.reopen();
    env.redraw();
  }
  function setWater(on) {
    st.water = !!on;
    sync();
    env.reopen();
    env.redraw();
  }
  function html(id) {
    const s = stats();
    const site = scene.site;
    if (id === 'design') {
      let ghi = 0;
      for (let m = 600; m <= 900; m++) ghi = Math.max(ghi, base.shortwave(world.ds.F.ref[0], m / 60).direct + base.shortwave(world.ds.F.ref[0], m / 60).sky);
      return designCard({ st: s, site, ghi });
    }
    if (id === 'sails') return sailsCard({ st: s, palo: palo() });
    if (id === 'arcade') return arcadeCard({ st: s });
    if (id === 'lawn') return lawnCard({ st: s, water: water() });
    if (id === 'mist') return mistCard({ st: s, water: water() });
    if (id === 'coat') return coatCard({ st: s, on: st.coat });
    if (id === 'dry') return dryCard({ st: s, site });
    return deathsCard();
  }
  /** Band 7's palo verde cells split: in the courtyards and in the open plaza (Tmrt − open sun at 15:00). */
  const palo = () => {
    const h = DS.hour.value;
    const c = shadeCells(world, base, h).paloVerde;
    const court = new Set(world.ds.F.court);
    const ref = stats().ref[h].tmrt;
    const d = (a) => (a.length ? a.reduce((x, i) => x + base.tmrt(i, h), 0) / a.length - ref : 0);
    const a = c.filter((i) => court.has(i));
    const b = c.filter((i) => !court.has(i));
    return { court: { n: a.length, d: d(a) }, open: { n: b.length, d: d(b) } };
  };
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
    const h = DS.hour.value;
    return {
      sail: s.shade.sail[h].d,
      arcade: s.shade.arcade[h].d,
      lawn15: s.lawn.ts15,
      air15: s.air[h],
      evap: s.lawn.evap,
      coatTs: s.coat[h].dTs,
      coatTmrt: s.coat[h].dTmrt,
      gravel15: s.gravel.ts15,
    };
  }
  /** What is over a ground cell (a screen or a desert tree's crown), by footprint. */
  const overOf = (i) => {
    const F = world.ds.F;
    for (const k of KINDS) if (F[k].includes(i)) return k;
    return null;
  };
  let shown = null;
  let heatShown = null;
  if (env.query.get('coat') === '0') setCoat(false, true);
  return {
    notes: () => dsNotes(scene, noteData()),
    look: () => {
      // the loading hint while the pen draws and the washes come in (a DOM element, not the canvas)
      const on = S.intro && S.frame < INTRO.wash;
      if (on !== shown) {
        shown = on;
        hint.hidden = !on;
      }
      if (S.thermal !== heatShown) {
        heatShown = S.thermal;
        el.querySelector('[data-heat]').setAttribute('aria-pressed', String(!!S.thermal));
      }
      return { water: st.water, budget: 1 };
    },
    sync,
    html,
    /** Keyboard: C takes the street's coating off and on, L shows the water used; true if the key was the block's. */
    key(k) {
      if (k === 'c' || k === 'C') setCoat(!st.coat);
      else if (k === 'l' || k === 'L') setWater(!st.water);
      else return false;
      return true;
    },
    /** Heat-card rows: what shades a ground cell, a lawn cell's water, the street with and without its coating; the stucco walls of a building. */
    cardKey: 'desert',
    cardInfo: (cells, tmrtCell, h, leaf) => {
      if (leaf) return null;
      if (tmrtCell === null) return { wall: true };
      const i = tmrtCell;
      const out = {};
      const k = overOf(i);
      if (k) out.over = { kind: k, tr: k === 'mesquite' || k === 'paloVerde' ? MATERIALS[k].tr.value : MATERIALS[k === 'sail' ? 'desertSail' : k === 'arcade' ? 'arcadeRoof' : 'ramada'].tr.value };
      if (world.ds.F.lawn.includes(i) || base.info.mats[world.matIds[world.mat[i]]] === MATERIALS.desertLawn) out.water = base.evaporation(i);
      if (world.ds.F.main.includes(i)) {
        const U = set.model(false);
        out.coat = { on: st.coat, ts: base.ts(i, h), tsBare: U.ts(i, h), tmrt: base.tmrt(i, h), tmrtBare: U.tmrt(i, h) };
      }
      return Object.keys(out).length ? out : null;
    },
    cardRows: (f) => {
      if (f.wall) return `<tr><td colspan="2" class="sub">Light stucco walls: they reflect ${Math.round(DS.wallAlbedo.value * 100)}% of the sun that reaches them${tag(DS.wallAlbedo)}.</td></tr>`;
      const rows = [];
      if (f.over) rows.push(`<tr><td>shade over this spot</td><td>${NAME[f.over.kind]}, lets through ${Math.round(f.over.tr * 100)}% of the sun</td></tr>`);
      if (f.water !== undefined) rows.push(`<tr><td>water evaporated a day</td><td>${fmt(f.water)} L per m²</td></tr>`);
      if (f.coat) rows.push(`<tr><td>surface now, coated / bare</td><td>${fmt(f.coat.ts)} / ${fmt(f.coat.tsBare)} °C</td></tr><tr><td>${gl('tmrt', 'feels like')} now, coated / bare</td><td>${fmt(f.coat.tmrt)} / ${fmt(f.coat.tmrtBare)} °C</td></tr>${f.coat.on ? '' : '<tr><td colspan="2" class="sub">Coating off (C): the page shows the bare street.</td></tr>'}`);
      return rows.join('');
    },
    /** The shared sky-view, night-lag and wet-bulb footnotes quote the block's own lines (no shared lawn here). */
    glossary: () => {
      const s = stats();
      const F = world.ds.F;
      const lag = (cells) => cells.reduce((a, i) => a + base.ts(i, 23), 0) / cells.length;
      const r = lag(F.ref);
      return {
        hutong: {
          svfLine: `Open plaza about ${f2(F.ref.reduce((a, i) => a + world.svf[i], 0) / F.ref.length)}; the courtyards about ${f2(s.court.svf)}; under the arcade ${f2(s.shade.arcade[15].svf)}.`,
          lagLine: `At 11 pm, against the open gravel of the plaza: Main Street ${fmt(lag(F.main) - r)} °C and the cross street's asphalt ${fmt(lag(F.cross) - r)} °C warmer, the watered lawn ${fmt(r - lag(F.lawn))} °C cooler.`,
          wetBulbLine: `${fmt(s.sky.wetBulb15)} °C at 3 pm (air ${fmt(s.air[15])} °C, vapour pressure ${scene.site.vapourHpa} hPa): far below the air, because the air is so dry.`,
          tmrtLine: `At 3 pm: ${r0(s.ref[15].tmrt)} °C in the open plaza, ${r0(s.shade.sail[15].tmrt)} °C under a sail, ${r0(s.shade.arcade[15].tmrt)} °C under the arcade.`,
        },
      };
    },
    /** Desert block (block 11) only: state {coat, water}; set() it; numbers for the bands and cards; card HTML; water use. */
    api: {
      state: () => ({ coat: st.coat, water: st.water }),
      set(o) {
        if (o.coat !== undefined) setCoat(!!o.coat);
        if (o.water !== undefined) setWater(!!o.water);
      },
      stats: () => stats(),
      water: () => water(),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#desert [data-card="${id}"]`)),
      shade: (h = S.hour) => Object.fromEntries(Object.entries(shadeCells(world, thermal, quantHour(h))).map(([k, v]) => [k, v.length])),
      coatRgb: () => (world.dsCoat ? world.dsCoat.slice() : null),
      hint: () => !hint.hidden,
      models: () => set.cached(),
    },
  };
}
