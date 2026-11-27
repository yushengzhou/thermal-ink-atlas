// wfui: the overlay of the waterfront block (block 4): margin-note text and
// the cards (the river, the pond at night, the ventilation corridor, the
// sheltered street, riverside shade).
import { SOURCES, BASIS, MODEL } from './materials.js';
import { gl } from './glossary.js';
import { OVERLAY } from './wind.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const f2 = (v) => v.toFixed(2);
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)} K`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated; the air temperature is fixed, and the wind is a geometric ${gl('windFactor', 'wind factor')}, not computed flow.</p>`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the app (app.js wfNoteData). */
export function wfNotes(scene, d) {
  const text = {
    river: [`River ${fmt(d.river15)} °C at 3 pm (air ${fmt(d.air15)} °C);`, `its air effect fades within about ${d.reach} m`],
    pond: [`Lily Pond ${fmt(d.pond04)} °C at 4 am,`, `warmer than the ${fmt(d.air04)} °C air`],
    corridor: [`Quay Street, along the wind: f_w ${f2(d.corridorFw)},`, `asphalt ${fmt(d.corridorTs)} °C at 3 pm`],
    sheltered: [`Rope Walk, behind the warehouses: f_w ${f2(d.shelterFw)},`, `asphalt ${fmt(d.shelterTs)} °C at 3 pm`],
    shade: [`Under the riverside trees: Tmrt ${fmt(d.shadeTmrt)} °C,`, `in the sun beside them ${fmt(d.sunTmrt)} °C`],
  };
  const terms = {
    river: [['surfaceTemp', `River ${fmt(d.river15)} °C at 3 pm`], ['fetch', `fades within about ${d.reach} m`]],
    pond: [['nightLag', `Lily Pond ${fmt(d.pond04)} °C at 4 am`]],
    corridor: [['ventilationCorridor', 'along the wind'], ['windFactor', `f_w ${f2(d.corridorFw)}`]],
    sheltered: [['sheltering', 'behind the warehouses'], ['windFactor', `f_w ${f2(d.shelterFw)}`]],
    shade: [['tmrt', 'Tmrt']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** River card. d: {water (waterStats), overlay (overlayStats), u}. */
export function riverCard(d) {
  const r = d.water.river;
  const o = d.overlay;
  return `
    ${close}
    <h3>The river: cool, but only close by</h3>
    <div class="mat">River surface prescribed; its effect on the air is an illustrative overlay, not simulated</div>
    <table class="cmp">
      <tr><td></td><td>model</td><td>air</td></tr>
      <tr class="t"><td>river surface, 15:00</td><td>${fmt(r.t15)} °C</td><td>${fmt(r.a15)} °C</td></tr>
      <tr><td>river surface, 04:00</td><td>${fmt(r.t04)} °C</td><td>${fmt(r.a04)} °C</td></tr>
      <tr><td>daily range of the river</td><td>${fmt(r.range)} K</td><td></td></tr>
      <tr><td colspan="3" class="sub">Air overlay along the ${gl('fetch', 'wind lines')} by day (illustrative, from literature):</td></tr>
      <tr><td>at the bank (first 2.5 m)</td><td>${K(o.at0)}</td><td></td></tr>
      <tr><td>30 m inland</td><td>${K(o.at30)}</td><td></td></tr>
      <tr><td>80 m inland</td><td>${K(o.at80)}</td><td></td></tr>
    </table>
    <p class="note">Measured urban rivers and canals cool the air beside them only a little and over a short distance. A large river barely warms through the day, so its surface stays below the afternoon air; at night it can be warmer than the air.</p>
    <p class="lit">River Don, Sheffield: about 1 K cooler than the city reference, reaching about 30 m with open banks; vegetated banks about 2 K cooler than paved ones (Hathway &amp; Sharples 2012, via secondary sources). Cheonggyecheon, Seoul: more than 1 K to 70–80 m on one side, about 0.5 K to 30–50 m on the other. Small Dutch water bodies (ENVI-met): −0.2 K typical, −0.6 K at most in the afternoon, "negligible in design" (Jacobs et al. 2020). A review of 27 studies gives about 2.5 K, inflated by satellite surface temperatures (Völker et al. 2013).</p>
    <p class="caveat">The air temperature in this model is fixed, so the river cannot cool the air or anyone in it. The overlay uses ΔT₀ ${OVERLAY.day} K${tag(MODEL.airDay)} and L ${OVERLAY.L} m${tag(MODEL.airL)} (${OVERLAY.Laligned} m in streets along the wind${tag(MODEL.airLaligned)}). The river curve (daily mean air − 2 K, ±0.5 K) is an assumption.</p>
    ${srcLine(['hathway2012', 'cheonggyecheon', 'jacobs2020', 'volker2013', 'webb2008', 'brief4'])}`;
}

/** Pond-at-night card. d: {water, lawn04, overlayNight}. */
export function pondCard(d) {
  const p = d.water.pond;
  return `
    ${close}
    <h3>The still pond at night: warmer than the air</h3>
    <div class="mat">Lily Pond, shallow and still · surface prescribed</div>
    <table class="cmp">
      <tr><td></td><td>pond</td><td>air</td></tr>
      <tr class="t"><td>04:00</td><td>${fmt(p.t04)} °C</td><td>${fmt(p.a04)} °C</td></tr>
      <tr><td>15:00</td><td>${fmt(p.t15)} °C</td><td>${fmt(p.a15)} °C</td></tr>
      <tr><td>daily range of the pond</td><td>${fmt(p.range)} K</td><td></td></tr>
      <tr><td>garden lawn, 04:00</td><td>${fmt(d.lawn04)} °C</td><td></td></tr>
    </table>
    <p class="note">Shallow water soaks up the day's sun and gives it back after dark. Before dawn the pond is the warmest open surface in the garden, a few degrees above the air, while the lawn beside it has cooled below the air.</p>
    <p class="lit">A Delft pond was warmer than the air at night and released about 2.7 MJ m⁻² per night: 43% as longwave radiation, 39% as evaporation, 11% as sensible heat (Solcerova et al. 2019). In Rotterdam, water bodies raise the hottest nights' urban heat island (Steeneveld et al. 2014); in a model, water warmer than the air worsens night-time comfort (Theeuwes et al. 2013).</p>
    <p class="caveat">The pond curve (daily mean air − 0.5 K, ±2 K, peak at 16:00) is an assumption${tag(MODEL.pondCurve)}; that a pond is warmer than the air at night is cited. The air overlay at night is +${OVERLAY.night} K at the river bank${tag(MODEL.airNight)} (the pond's ×${f2(OVERLAY.pond)}), illustrative only.</p>
    ${srcLine(['solcerova2019', 'steeneveld2014', 'theeuwes2013', 'brief4'])}`;
}

/** Ventilation-corridor card. d: {st (windStats), ac (asphaltContrast), hc (hcStats), u}. */
export function corridorCard(d) {
  const c = d.st.corridor;
  return `
    ${close}
    <h3>${gl('ventilationCorridor', 'Ventilation corridor')}: Quay Street</h3>
    <div class="mat">A wide street running south from the river, along the wind</div>
    <table class="cmp">
      <tr><td></td><td>model</td></tr>
      <tr><td>street axis vs wind</td><td>${Math.round(c.delta)}° (cut-off 30°)</td></tr>
      <tr><td>H/W (facing walls)</td><td>${f2(c.hw)} (channelling above ${MODEL.channelHw.value})</td></tr>
      <tr class="t"><td>${gl('windFactor', 'wind factor f_w')}, street mean</td><td>${f2(d.st.corridorMean)}</td></tr>
      <tr><td>local wind u = u_site × f_w</td><td>${fmt(d.u * d.st.corridorMean)} m/s</td></tr>
      <tr><td>convection h_c</td><td>${fmt(5.7 + 3.8 * d.u * d.st.corridorMean)} W m⁻² K⁻¹</td></tr>
      <tr class="t"><td>sunlit exposed asphalt, 15:00</td><td>${fmt(d.ac.exposed.ts)} °C</td></tr>
      <tr><td>sunlit sheltered asphalt, 15:00</td><td>${fmt(d.ac.sheltered.ts)} °C</td></tr>
    </table>
    <p class="note">A street that points along the wind lets it run in unobstructed, and the walls funnel it a little. A stronger wind carries heat off the pavement faster, so the corridor's asphalt runs cooler than asphalt behind the buildings.</p>
    <p class="lit">Along the Ota River in Hiroshima, river cooling was detectable 150–500 m inland along streets perpendicular to the river, more with wind, wider streets and lower density (AIJ papers, unverified). Planning guides ask for corridors within about 30° of the prevailing wind (Chinese planning criteria; Givoni 20–30°).</p>
    <p class="caveat">A geometric heuristic, not a flow solution: f_w = clamp(S × C, 0.3, 1.2) with C = 1 + 0.2 max(0, cos 3δ) in aligned streets with H/W > 0.4 (c_ch, f_min, f_max are assumptions${tag(MODEL.channelC)}). One wind direction (from the river) and speed; no vortices, corner jets or river breezes. The wind changes the surface (via h_c) and the walkers' comfort, not the air temperature.</p>
    ${srcLine(['ota', 'corridor', 'oke1988', 'brief4'])}`;
}

/** Sheltered-street card. d: {st, ac, u, profile: [{d, fw}]}. */
export function shelterCard(d) {
  const s = d.st.shelter;
  return `
    ${close}
    <h3>${gl('sheltering', 'Sheltered street')}: Rope Walk</h3>
    <div class="mat">Across the wind, in the lee of the Wharf Warehouses (${d.st.lee01.h} m)</div>
    <table class="cmp">
      <tr><td></td><td>model</td></tr>
      <tr><td>H/W (facing walls)</td><td>${f2(s.hw)}</td></tr>
      <tr class="t"><td>${gl('windFactor', 'wind factor f_w')}, street mean</td><td>${f2(d.st.shelterMean)}</td></tr>
      ${d.profile.map((p) => `<tr><td>${p.d} m behind the wall</td><td>f_w ${f2(p.fw)}</td></tr>`).join('')}
      <tr><td>local wind there</td><td>${fmt(d.u * d.st.shelterMean)} m/s</td></tr>
      <tr class="t"><td>sunlit sheltered asphalt, 15:00</td><td>${fmt(d.ac.sheltered.ts)} °C (f_w ${f2(d.ac.sheltered.fw)})</td></tr>
      <tr><td>sunlit exposed asphalt, 15:00</td><td>${fmt(d.ac.exposed.ts)} °C (f_w ${f2(d.ac.exposed.fw)})</td></tr>
      <tr><td>difference</td><td>${K(d.ac.diff)}</td></tr>
    </table>
    <p class="note">Behind a row of buildings the wind drops and only slowly recovers. With less wind the sunlit asphalt keeps more of its heat: in this model it runs ${fmt(d.ac.diff)} K hotter than exposed asphalt at 3 pm.</p>
    <p class="lit">Wind tunnel and CFD studies put the recirculation behind a building at about 1.6–2.6 times its width; streets switch flow regime at H/W about 0.3–0.4 and 0.65–0.7 (Oke 1988, unverified).</p>
    <p class="caveat">S rises linearly from 0.3 at the wall to 1 at 5 building heights downwind; the 5H recovery and f_min 0.3 are assumptions${tag(MODEL.windFmin)}. Part of the difference comes from the narrower street (sky view ${f2(d.ac.sheltered.svf)} vs ${f2(d.ac.exposed.svf)}).${d.ac.diff > 8 || d.ac.diff < 2 ? ` The difference is outside the brief's 2–8 K engine-plausibility band at ${d.u} m/s (reported, not tuned; see docs/sources.md).` : ''}</p>
    ${srcLine(['wake', 'oke1988', 'brief4'])}`;
}

/** Riverside shade card. d: {shadeTmrt, sunTmrt, shadeAT, sunAT, waterAir}. */
export function shadeCard(d) {
  return `
    ${close}
    <h3>Riverside shade: the biggest lever near water</h3>
    <div class="mat">The promenade under the riverside trees, 15:00</div>
    <table class="cmp">
      <tr><td></td><td>${gl('tmrt', 'Tmrt')}</td><td>${gl('apparentTemp', 'apparent temp.')}</td></tr>
      <tr class="t"><td>under the trees</td><td>${fmt(d.shadeTmrt)} °C</td><td>${fmt(d.shadeAT)} °C</td></tr>
      <tr><td>in the sun beside them</td><td>${fmt(d.sunTmrt)} °C</td><td>${fmt(d.sunAT)} °C</td></tr>
      <tr><td>shade minus sun</td><td>${K(d.shadeTmrt - d.sunTmrt)}</td><td>${K(d.shadeAT - d.sunAT)}</td></tr>
      <tr><td>the river's air effect at the bank</td><td colspan="2">${K(d.waterAir)} (illustrative)</td></tr>
    </table>
    <p class="note">The breeze off the river is welcome, but what makes the promenade bearable at 3 pm is the shade of its trees. Walkers here take the tree-shaded, breezy riverside over sunny, sheltered Rope Walk.</p>
    <p class="lit">Jacobs et al. (2020): next to small urban water bodies, PET fell by 0.6 K typically (1.9 K at most), while shade lowered PET by 1–7 K.</p>
    <p class="caveat">Apparent temperature (Steadman 1994, coefficients from memory) stands in for UTCI, which is not implemented; wind at the person is u_site × f_w, clamped to 0.5–17 m/s. The air temperature is fixed.</p>
    ${srcLine(['jacobs2020', 'steadman1994', 'brief4'])}`;
}

/** Button labels for the wind panel cards. */
export const WF_CARDS = [
  ['river', 'The river'],
  ['pond', 'Pond at night'],
  ['corridor', 'Ventilation corridor'],
  ['shelter', 'Sheltered street'],
  ['shade', 'Riverside shade'],
];
