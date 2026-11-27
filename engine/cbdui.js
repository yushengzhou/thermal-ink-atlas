// cbdui: the overlay of the glass CBD block (block 3): margin-note text and
// the cards (street canyon, each glass type, the reflection spot, AC rejected
// heat, the concave-façade extreme case).
import { SOURCES, BASIS, GLASS, GLASS_IDS } from './materials.js';
import { gl } from './glossary.js';
import { glassRho } from './reflect.js';
import { AC } from './cbd.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const f2 = (v) => v.toFixed(2);
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)} K`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated; air temperature is fixed, so no canyon air heating, wind or AC heat is felt.</p>`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the app (see app.js cbdNoteData). */
export function cbdNotes(scene, d) {
  const g = GLASS[d.glass];
  const text = {
    spot: [`Reflection spot: Tmrt ${fmt(d.spotTmrt)} °C at 3 pm,`, `out of the sun (plain shade ${fmt(d.shadeTmrt)} °C)`],
    glass: [`${d.towerName}, ${g.name.toLowerCase()} (ρ₀ ${g.rho0.value}):`, `reflects ${Math.round(d.rhoNow * 100)}% of the sun at 3 pm`],
    lane: [`Silk Lane (H/W ${fmt(d.laneHw)}): ${fmt(d.lane05)} °C at 5 am,`, `${sgn(d.lag05)} K vs open stone`],
    plaza: [`Plaza paving ${fmt(d.plaza15)} °C at 3 pm`],
  };
  const terms = {
    spot: [['reflectionSpot', 'Reflection spot'], ['tmrt', 'Tmrt']],
    glass: [['fresnel', `reflects ${Math.round(d.rhoNow * 100)}% of the sun`]],
    lane: [['canyon', `H/W ${fmt(d.laneHw)}`], ['nightLag', `${fmt(d.lane05)} °C at 5 am`]],
    plaza: [['surfaceTemp', 'Plaza paving']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** Street-canyon card. c: {lane, deep} canyonStats() results. */
export function canyonCard(c) {
  const L = c.lane;
  const D = c.deep;
  return `
    ${close}
    <h3>${gl('canyon', 'Street canyon')}: shade by day, slow to cool at night</h3>
    <div class="mat">Silk Lane (stone, 12 m wide) and Exchange Street between the towers, simulated</div>
    <table class="cmp">
      <tr><td></td><td>model</td><td>open / endless canyon</td></tr>
      <tr><td>Silk Lane H/W</td><td>${fmt(L.hw)}</td><td></td></tr>
      <tr><td>${gl('svf', 'sky view factor')}, lane floor</td><td>${f2(L.svf)}</td><td>${f2(L.svfCanyon)}</td></tr>
      <tr class="t"><td>Exchange St. floor in shade, 15:00</td><td>${fmt(D.ts15Shade)} °C</td><td>${fmt(D.open15)} °C open asphalt</td></tr>
      <tr><td>${gl('tmrt', 'Tmrt')} there, 15:00</td><td>${fmt(D.tmrt15Shade)} °C</td><td></td></tr>
      <tr class="t"><td>Silk Lane floor, 05:00</td><td>${fmt(L.ts05)} °C</td><td>${fmt(L.open05)} °C open stone</td></tr>
      <tr><td>${gl('nightLag', 'night lag')}, 05:00</td><td>${K(L.lag05)}</td><td>air ${fmt(L.air05)} °C</td></tr>
    </table>
    <p class="note">Tall walls hide the street from the sun for most of the day, so its floor stays far cooler than open paving. At night the same walls hide the cold sky: the floor loses heat more slowly than open ground.</p>
    <p class="lit">Literature: Oke (1981) found calm-night city–country air differences of about 7.45 + 3.97 ln(H/W) K, i.e. about ${fmt(7.45 + 3.97 * Math.log(L.hw))} K at H/W ${fmt(L.hw)} (air, not surface; coefficients from a secondary source; the relation breaks down at high H/W, Theeuwes et al. 2014). In Fez a canyon with H/W about 10 was about 6 K, up to 10 K, cooler by day (Johansson 2006).</p>
    <p class="caveat">The night lag here is an engine result: walls are held at air + 2 K at night (they do not store heat), and the air temperature is fixed, so the canyon's warmer air is not modelled. One wind speed for the whole block: no channelling, vortices or tower downdraughts. Sky view factor from a 32-direction horizon scan on the 5 m grid. <span class="unv">unverified</span></p>
    ${srcLine(['oke1981', 'theeuwes2014', 'johansson2006', 'brief3'])}`;
}

/**
 * Glass card for one type. st: {h12, h15} spotStats() for that glass;
 * face: {name, theta15} the façade quoted.
 */
export function glassCard(id, st, face) {
  const g = GLASS[id];
  const row = (r) => (r.n ? `<tr class="t"><td>${r.h}:00</td><td>${K(r.dTmrt)}</td><td>${K(r.dTmrtMax)}</td></tr><tr><td></td><td class="sub" colspan="2">${r.n} spot cells, mean reflected share ${f2(r.r)} of the beam; shaded spots ${fmt(r.tmrtSpotShade)} °C vs plain shade ${fmt(r.tmrtShade)} °C</td></tr>` : `<tr><td>${r.h}:00</td><td colspan="2">no reflection spots</td></tr>`);
  const rhoAt = (th) => f2(glassRho(g.rho0.value, th));
  return `
    ${close}
    <h3>${g.name}</h3>
    <div class="mat">${gl('curtainWall', 'curtain wall')} glass · simulated</div>
    <table>
      <tr><td>reflectance ρ₀, head-on</td><td>${g.rho0.value}${tag(g.rho0)}</td></tr>
      <tr><td>${gl('fresnel', 'at 45° / 70° / 80°')}</td><td>${rhoAt(45)} / ${rhoAt(70)} / ${rhoAt(80)}</td></tr>
      <tr><td>${face.name}, 15:00 (θ ${Math.round(face.theta15)}°)</td><td>${rhoAt(face.theta15)}</td></tr>
      <tr><td>solar absorptance</td><td>${g.absorb.value}${tag(g.absorb)}</td></tr>
      <tr><td>${gl('emissivity', 'emissivity ε')}</td><td>${g.eps.value}${tag(g.eps)}</td></tr>
      <tr><td>glass surface, 15:00 (${face.face} face)</td><td>${fmt(face.tg15)} °C</td></tr>
    </table>
    <table class="cmp">
      <tr><td></td><td>spot ΔTmrt mean</td><td>max</td></tr>
      ${row(st.h12)}
      ${row(st.h15)}
    </table>
    <p class="sub">ΔTmrt: the same glass with its mirror reflection switched off, same cells.</p>
    <p class="note">${g.note}</p>
    ${id === 'lowe' ? `<p class="lit">Singapore caps the daylight reflectance of façade glass at 20% (BCA Approved Document, Section P).</p>` : ''}
    <p class="caveat">Low-e and mirror reflectances are mid-range values from the brief; no product datasheet was checked (see the LBNL IGDB). The angular shape is exact Fresnel for clear glass, applied to coated glass in the EnergyPlus form R(0)(1 − ρ̄) + ρ̄ (EnergyPlus would use a bronze-glass curve for some coated products); coated glass can differ by up to about 8% at 60°. Glass surface temperature is the brief's simple balance, Ta + a_g I_f / (h_o + h_i) with I_f = I cosθ + 0.5 D, with no measurement behind it. <span class="unv">unverified</span></p>
    ${srcLine(['fresnel', 'energyplus', 'igdb', 'bca', 'en673', 'brief3'])}`;
}

/** The reflection-spot card: out of the sun, still hot. st: spotStats() at 15:00 for the current glass. */
export function spotCard(st, id) {
  const g = GLASS[id];
  return `
    ${close}
    <h3>${gl('reflectionSpot', 'Reflection spot')}: out of the sun, still hot</h3>
    <div class="mat">${g.name}, 15:00, person standing (${gl('tmrt', 'Tmrt')}), simulated</div>
    <table class="cmp">
      <tr><td></td><td>Tmrt</td></tr>
      <tr><td>plain building shade</td><td>${fmt(st.tmrtShade)} °C</td></tr>
      <tr class="t"><td>reflection spot in shade</td><td>${fmt(st.tmrtSpotShade)} °C</td></tr>
      <tr><td>full sun</td><td>${fmt(st.tmrtSun)} °C</td></tr>
      <tr class="t"><td>reflection spot in sun</td><td>${fmt(st.tmrtSpotSun)} °C</td></tr>
      <tr><td>spot vs reflection off, mean / max</td><td>${K(st.dTmrt)} / ${K(st.dTmrtMax)}</td></tr>
      <tr><td>shaded spot paving vs off</td><td>${K(st.tsSpotShade - st.tsSpotShadeOff)}</td></tr>
    </table>
    <p class="note">A flat glass façade in sun acts as a second, dimmer sun low in the sky. Its ${gl('specular', 'mirror reflection')} lands as a moving patch on the street, often in the shade of another building: people there are out of the sun but still take in much of its heat. Walkers here treat a spot as partly sunny and keep out of it when they can.</p>
    <p class="lit">Field data (Chengdu, Chunxi Road, August 2023): reflection zones Tmrt +4 to +13 °C, air +1–2 °C, UTCI +2–5 °C, peak Tmrt 73.9 °C (Du et al. 2025). Wallenberg et al. (2026), who give SOLWEIG walls an albedo of 0.5, note that Tmrt is highest in front of sunlit façades.</p>
    <p class="caveat">${st.dTmrtMax > 13 ? `The largest rise here (${K(st.dTmrtMax)}) is above the field range. ` : ''}Glass here is ideally flat and frameless, and Fresnel reflectance climbs steeply at grazing angles (over 0.5 beyond 80°), so façades lit edge-on send strong, thin spots, and a cell can be lit by two façades at once; mullions and pane distortion that break these up are not modelled. The ground under a spot also warms, which adds to Tmrt. Single bounce only (a second bounce off the opposite façade, ρ² of the beam, is ignored); air temperature is fixed (the measured air warming is not modelled). <span class="unv">unverified</span></p>
    ${srcLine(['du2025', 'wallenberg2026', 'fresnel', 'brief3'])}`;
}

/** AC rejected-heat card (information overlay only). */
export function acCard() {
  const q = 100;
  return `
    ${close}
    <h3>${gl('acHeat', 'AC rejected heat')}: shown, not felt</h3>
    <div class="mat">Information overlay · not part of the model</div>
    <p>An air conditioner pumps the heat out of the offices and adds its own electricity: rejected heat = cooling × (1 + 1/COP). At COP ${AC.cop}, every ${q} W of cooling puts about ${Math.round(AC.rejected(q, AC.cop))} W into the street air.</p>
    <table class="cmp">
      <tr><td>dense urban areas</td><td>${AC.dense[0]}–${AC.dense[1]} W m⁻² of ground, sometimes > 100</td></tr>
      <tr><td>central Tokyo, daytime</td><td>> ${AC.tokyo} W m⁻²</td></tr>
    </table>
    <p class="note">The plumes on the roofs mark where this heat leaves the towers.</p>
    <p class="caveat"><b>Not felt in this model:</b> the air temperature is a fixed design-day curve, so waste heat cannot warm the street or anyone in it, and it is not added to any surface or Tmrt value. No figure per m² of office floor was found for a CBD like this one.</p>
    ${srcLine(['xie2016', 'sailor2011'])}`;
}

/** Extreme case: concave façades (out of scope). */
export function extremeCard() {
  return `
    ${close}
    <h3>The extreme case: concave glass</h3>
    <div class="mat">Not modelled in this block</div>
    <p>A <b>flat</b> façade sends back a copy of the sun no stronger than the sun itself times its reflectance: in this block no spot ever gets more than the sum of ρ I sinβ over the façades that face it.</p>
    <p>A <b>concave</b> façade focuses the reflection. 20 Fenchurch Street in London ("the Walkie-Talkie", 2013) concentrated sunlight onto the street opposite; a later simulation put the peak at 3,384 W m⁻² (worst case 4,176), several times direct sunshine (Zhu, Jahn &amp; Rein 2018). The curved Vdara hotel in Las Vegas made a hot zone on its pool deck in 2010 (press reports, anecdotal). Scale models: concave façades raised pedestrian-level sunshine by more than 300%, flat mirrors by more than 100%, diffuse façades by at most 30% (Speroni et al. 2022).</p>
    <p class="caveat">Concave and curved façades are out of scope here: every tower in this block has flat faces.</p>
    ${srcLine(['zhu2018', 'vdara', 'speroni2022'])}`;
}

/** Button labels for the glass panel cards. */
export const CBD_CARDS = [
  ['canyon', 'Street canyon'],
  ...GLASS_IDS.map((id) => [`glass-${id}`, GLASS[id].name]),
  ['spot', 'Reflection spot'],
  ['ac', 'AC rejected heat'],
  ['extreme', 'Extreme case: concave glass'],
];
