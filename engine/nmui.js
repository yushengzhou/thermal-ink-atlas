// nmui: the overlay of the night market block (block 12): margin-note text,
// the cards (the stone's night release, the crowd, the stalls, the lights,
// how warm it feels at night, next to the grill, the market's hours), the
// heat-card rows, the crowd and the cooks, and the block's plugin for app.js.
// Wording follows the outside evaluation (#29) from the start: each card
// opens with one everyday sentence, the numbers are in plain words, and Greek
// letters, units, "unverified" tags and sources sit in a closed "For
// experts" part at the bottom, with links to the references page. What is
// calculated (the stone, how warm a spot feels) and what is only shown (the
// heat of the crowd, the stalls and the lights: the air temperature is fixed)
// is said on every card that quotes them. No real addresses or vendors.
import { SOURCES, BASIS, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { INTRO, quantHour } from './render.js';
import { hash3, hexRgb } from './core.js';
import { solarPosition } from './sun.js';
import { NM, marketStats, heatParts, tmrtAt, grillAt, crowdShape, density, personW, isOpen, lightsOn, nearestGrill, centre, stallPower } from './market.js';
import { nmOverlay, lightStrings, behind } from './nmkit.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const r0 = (v) => String(Math.round(v));
const f2 = (v) => v.toFixed(2);
const deg = (v) => `${fmt(Math.abs(v))} degrees ${v < 0 ? 'cooler' : 'warmer'}`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const ref = (k) => `<a href="../../references.html#nightmarket">[${k}]</a> ${SOURCES[k]}`;
/** The closed part at the bottom of a card: the model's terms, flags and sources (with links to the references page). */
const experts = (body, keys) => `<details class="expert"><summary>For experts</summary>${body}<p class="src">Sources: ${keys.map(ref).join('; ')}. Made-up block, calculated temperatures: a ${gl('forceRestore', 'force-restore')} surface model on a 5 m grid; the air temperature is fixed, so the crowd, the stalls and the lights are shown, not felt.</p></details>`;
const close = '<button class="x" aria-label="close">×</button>';
const MISS = ' <b>(outside the expected range)</b>';
const outside = (x, [a, b]) => x < a - 1e-9 || x > b + 1e-9;
/** Sky view in plain words: "about 9 in 10 of the sky". */
const sky = (v) => `about ${Math.max(1, Math.round(v * 10))} in 10`;

/** The brief's bands the cards quote (docs/sources.md, Block 12, checks them all). */
export const NM_BANDS = { dTs: [1, 6], net: [30, 150], gross: [430, 500], tmrt: [-6, 2], grill3: 5 };
const PLACE = { ref: 'the open square', aisle: 'the street, open aisle', awning: 'under the awnings', alley: 'a narrow alley', stallRow: 'the stall row', south: 'the street, south side' };

/** Margin notes (at most 5), in plain words. d: numbers from the plugin (noteData). */
export function nmNotes(scene, d) {
  const text = {
    stone: [`Granite at 9 pm: ${fmt(d.stoneDTs)} degrees above the air,`, `still giving off about ${r0(d.stoneNet)} watts per m²`],
    square: [`The open square at 9 pm feels ${deg(d.squareDT)}`, `than the air: the clear sky draws heat away`],
    awning: ['Under the awnings it feels', `${Math.abs(d.awningDT) < 1 ? 'about as warm as the air' : deg(d.awningDT) + ' than the air'}: the canvas hides the sky`],
    grill: [`1 m from a charcoal grill it feels like ${r0(d.grill1)} °C;`, `3 m away, still ${fmt(d.grill3)} degrees more (an upper bound)`],
    crowd: [`The crowd at 9 pm: ${r0(d.crowd)} watts per m²`, 'of body heat, shown, not felt'],
  };
  const terms = {
    stone: [['netLongwave', 'still giving off']],
    square: [['tmrt', 'feels']],
    awning: [['svf', 'hides the sky']],
    grill: [['tmrt', 'it feels like']],
    crowd: [['metabolicRate', 'body heat']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** The stone's night release card. d: {st}. */
export function stoneCard(d) {
  const st = d.st;
  const h = NM.hour.value;
  const P = st.place;
  const rows = ['ref', 'aisle', 'awning', 'alley'].map((k) => {
    const x = P[k][h];
    return `<tr${k === 'aisle' ? ' class="t"' : ''}><td>${PLACE[k]}</td><td>${fmt(x.ts)} °C</td><td>${fmt(x.dTs)}${outside(x.dTs, NM_BANDS.dTs) ? MISS : ''}</td><td>${r0(x.net)}${outside(x.net, NM_BANDS.net) ? MISS : ''}</td><td>${r0(x.toAir)}</td></tr>`;
  }).join('');
  const a = P.aisle[h];
  const L = P.aisle[NM.late.value];
  const grossMiss = ['ref', 'aisle'].some((k) => outside(P[k][h].gross, NM_BANDS.gross));
  const order = P.alley[h].net < P.ref[h].net;
  return `
    ${close}
    <h3>The stone gives back the day's heat</h3>
    <p class="lead">At 9 pm the granite street is still about ${fmt(a.dTs)} degrees warmer than the air, and each square metre gives off about ${r0(a.net)} watts: heat it soaked up in the afternoon sun.</p>
    <table class="cmp">
      <tr><td>9 pm</td><td>stone</td><td>above the air, degrees</td><td>given off, watts per m²</td><td>of it, warming the air</td></tr>
      ${rows}
      <tr><td colspan="5" class="sub">Expected: 1 to 6 degrees above the air, 30 to 150 watts per m², less where the sky is hidden${order ? ' (so it is here)' : `${MISS}`}. At 11 pm the street still gives off ${r0(L.net)} watts per m².</td></tr>
    </table>
    <p class="note">Warm stone sends out a lot of invisible infrared heat, about ${r0(a.gross)} watts per m², but the warm night sky and the walls send most of it back${grossMiss ? MISS : ''}; only the difference is lost, together with the warm air rising off it. In the narrow alleys the walls hide the sky, so the stone keeps its heat longer. No measurement of a night-market street at 9 pm was found: the numbers here are calculated, and the comparison is with the expected physics, not with a measured street.</p>
    ${experts(`<p class="lit">Net release Q = ε(σT_s⁴ − L↓) + h_c(T_s − T_a), L↓ = SVF·ε_sky·σT_a⁴ + (1 − SVF)·σT_w⁴, from the model's own surface temperatures: ${r0(a.rad)} radiated + ${r0(a.toAir)} by convection on the open aisle (sky view ${f2(a.svf)}). The model's own heat budget (the ground heat flux kept as in the car park block) gives ${r0(-a.g)} W m⁻². Gross emission εσT_s⁴ ${r0(a.grossMin)}–${r0(a.grossMax)} W m⁻² for surfaces of ${fmt(a.tsMin)}–${fmt(a.tsMax)} °C. The brief's arithmetic: net 77 / 110 / 141 W m⁻² for T_s − T_a = +2 / +4 / +6 K under an open sky, 42 / 74 / 105 at a sky view of 0.4. A hot-humid Guangzhou study found granite and concrete warmed the air through the whole day (night numbers not checked); a cool-pavement trial in Phoenix: a treated surface 2.4 °F cooler at sunrise.</p>
      <p class="caveat">The paving is the atlas's shared stone (ε ${MATERIALS.stone.eps.value}${tag(MATERIALS.stone.eps)}, α ${MATERIALS.stone.alpha.value}${tag(MATERIALS.stone.alpha)}, admittance ${MATERIALS.stone.mu.value}${tag(MATERIALS.stone.mu)}): no granite values were in the brief, and solid granite slabs are denser, so they likely store a little more. h_c ${fmt(st.hc)} W m⁻² K⁻¹ from the site wind of ${NM.wind.value} m/s (the shared formula, issue #20); the walls are the shared warm wall, air + 2 K at night (issue #28); the day's heating depends on the engine's sun (issue #24).</p>`, ['brief12', 'yang2016', 'doulos2004', 'coolPaveNight', 'oke'])}`;
}

/** The crowd card. d: {st}. */
export function crowdCard(d) {
  const st = d.st;
  const M = personW();
  const rows = [0.3, NM.peak.value, NM.cap.value, 2].map((rho) => `<tr${rho === NM.peak.value ? ' class="t"' : ''}><td>${rho} ${rho === 1 ? 'person' : 'people'} per m²${rho === 2 ? ' (event limit)' : rho === NM.cap.value ? ' (this page\'s cap)' : rho === NM.peak.value ? ' (the busy aisles here)' : ''}</td><td>${r0(rho * M)}</td><td>${r0(rho * M * NM.sensible.value)}</td></tr>`).join('');
  return `
    ${close}
    <h3>A crowd is a heater</h3>
    <p class="lead">When the aisles are packed, about one person to every square metre, the crowd gives off about ${r0(NM.peak.value * M)} watts per square metre of body heat, about as much as the warm stone under their feet.</p>
    <table class="cmp">
      <tr><td>body heat, watts</td><td></td><td></td></tr>
      <tr><td>a person walking slowly / standing</td><td colspan="2">about ${NM.walk.value} / ${NM.stand.value}</td></tr>
      <tr><td>a crowd, half walking, half standing</td><td colspan="2">about ${fmt(M)} each</td></tr>
      <tr><td>per m²</td><td>all of it</td><td>as warm air</td></tr>
      ${rows}
      <tr><td colspan="3" class="sub">At 9 pm over the whole street: about ${r0(st.heat.street.crowd)} watts per m² from the crowd, ${r0(st.heat.street.stoneRad + st.heat.street.stoneAir)} from the stone.</td></tr>
    </table>
    <p class="note">On a warm night more than half of a body's heat leaves as sweat vapour; only about ${Math.round(NM.sensible.value * 100)}% warms the air directly. The page draws this heat (Q), shown, not felt: it does not warm the air here, because the air temperature is fixed. The crowd is made up; each figure drawn stands for about ${r0(d.perFigure)} people. Crowd-safety guidance treats about 2 people per m² as a limit for events.</p>
    ${experts(`<p class="lit">Q_crowd = ρ_p·M with M = ${NM.walkShare.value}·${NM.walk.value} + ${1 - NM.walkShare.value}·${NM.stand.value} W (walking at 0.9 m/s about 2.0 met, standing about 1.2 met; 1 met = 58.2 W m⁻² of body surface, about 1.8 m²${tag(NM.walk)}); the walking share ${NM.walkShare.value}${tag(NM.walkShare)}; peak density ${NM.peak.value} m⁻²${tag(NM.peak)} (the brief: 0.3–2.0, an assumption; no night-market measurement found), capped at ${NM.cap.value}${tag(NM.cap)}; sensible share ${NM.sensible.value}${tag(NM.sensible)} at 30 °C (0.3–0.55). Retail heat gain from people: 73 W sensible and 59 W latent at 25.6 °C (copies disagree). In a city, metabolism is about 2–3% of all the heat people add.</p>
      <p class="caveat">Not modelled: the warm, moist air of a crowd, and that bodies and awnings hide the sky (they would make a person feel about 0.5–1 degree warmer than shown).</p>`, ['ashrae55', 'ashraeRetail', 'sailorAms', 'crowdLimits', 'brief12'])}`;
}

/** The stalls card. d: {st}. */
export function stallsCard(d) {
  const st = d.st;
  const N = { grill: 'charcoal grill', wok: 'gas wok burner', lpg: 'gas griddle or steamer', drinks: 'drinks and fruit' };
  const rows = st.kinds.map((k) => `<tr${k.type === 'grill' ? ' class="t"' : ''}><td>${N[k.type]}</td><td>${k.n}</td><td>${k.W ? fmt(k.W / 1000) : '0'}</td><td>${k.W ? r0(k.W / 4.32) : '0'}</td></tr>`).join('');
  const avg = st.streetStallW / st.streetArea;
  return `
    ${close}
    <h3>Woks, griddles and charcoal</h3>
    <p class="lead">A gas wok burner can put out more than 30 kilowatts and a charcoal grill about ${r0(NM.charcoal.value)}; over a stall's few square metres that is more heat than the noon sun, but spread over the whole street it comes to about ${r0(avg)} watts per square metre.</p>
    <table class="cmp">
      <tr><td>stall</td><td>here</td><td>heat while open, kW</td><td>per m² of stall</td></tr>
      ${rows}
      <tr><td colspan="4" class="sub">Gas stalls burn about half the time; charcoal burns all evening. In a 5 m square of street holding a charcoal grill: about ${r0((NM.charcoal.value * 1000) / 25)} watts per m² while open. Shown (Q), not felt: the air here is fixed.</td></tr>
    </table>
    <p class="note">Cooks stand right at the fire and feel its heat most (see "Next to the grill"); many stalls run floor fans. Smoke and cooking fumes raise fine-particle levels around night markets, a news report from Taiwan says. This page computes neither air quality nor anything about food safety: only heat.</p>
    ${experts(`<p class="lit">Q_stall = Σ P_fuel·duty / A_cell over each 5 m cell. Gas stall ${NM.lpg.value} kW${tag(NM.lpg)} (5–15), duty ${NM.duty.value}${tag(NM.duty)}; jet wok burners 28–37 kW (vendor data), here ${NM.wok.value}${tag(NM.wok)} at the same duty; charcoal ${NM.charcoal.value} kW${tag(NM.charcoal)} (8–16; a roaster burning about 1.2 kg an hour, about 29 MJ per kg), duty ${NM.coalDuty.value}${tag(NM.coalDuty)}. The stall footprint is 2.4 m × 1.8 m. The brief's estimate: 60 stalls × 8 kW × 0.5 over a 400 m × 10 m street, about 60 W m⁻². No stall's heat or the air around one has been measured.</p>
      <p class="caveat">Stalls are drawn, not part of the model's shade or sky view.</p>`, ['wokVendor', 'charcoalVendor', 'taiwanNewsPm', 'ftvFans', 'brief12'])}`;
}

/** The lights card. d: {st, site}. */
export function lightsCard(d) {
  const st = d.st;
  const h = NM.hour.value;
  return `
    ${close}
    <h3>String lights: bright, not hot</h3>
    <p class="lead">The strings of bulbs make the street glow, but they give off very little heat: about ${NM.lights.value} watts per square metre with LED bulbs, a few watts with old filament bulbs, against about ${r0(st.place.aisle[h].net)} from the stone.</p>
    <table class="cmp">
      <tr><td>heat given off, watts per m²</td><td></td></tr>
      <tr class="t"><td>string lights, LED (this page)</td><td>0.2–1</td></tr>
      <tr><td>string lights, filament bulbs</td><td>2–8</td></tr>
      <tr><td>the crowd at its busiest</td><td>about ${r0(NM.peak.value * personW())}</td></tr>
      <tr><td>the stone at 9 pm</td><td>about ${r0(st.place.aisle[h].net)}</td></tr>
      <tr><td colspan="2" class="sub">Lights on from sunset (${hm(d.sunset)}) to midnight, while the market runs.</td></tr>
    </table>
    <p class="note">So the lights matter for seeing, not for heat. Shown (Q), not felt: the air here is fixed.</p>
    ${experts(`<p class="lit">Lighting ${NM.lights.value} W m⁻²${tag(NM.lights)} over the street and the square when on (LED strings 0.2–1, filament 2–8 W m⁻²; the brief, unverified).</p>`, ['brief12'])}`;
}

/** How warm it feels at night card. d: {st}. */
export function nightCard(d) {
  const st = d.st;
  const h = NM.hour.value;
  const P = st.place;
  const rows = ['ref', 'aisle', 'awning', 'alley'].map((k) => {
    const x = P[k][h];
    return `<tr${k === 'ref' ? ' class="t"' : ''}><td>${PLACE[k]}</td><td>${sky(x.svf)}</td><td>${fmt(x.tmrt)} °C</td><td>${deg(x.dTmrt)}${outside(x.dTmrt, NM_BANDS.tmrt) ? MISS : ''}</td></tr>`;
  }).join('');
  const order = P.alley[h].dTmrt > P.ref[h].dTmrt;
  return `
    ${close}
    <h3>How warm it feels at night</h3>
    <p class="lead">At 9 pm, standing in the open square feels about ${deg(P.ref[h].dTmrt)} than the air, because the clear sky draws heat away from you; under an awning it feels ${deg(P.awning[h].dTmrt)}, in a narrow alley ${deg(P.alley[h].dTmrt)} than the air.</p>
    <table class="cmp">
      <tr><td>9 pm, air ${fmt(st.air[h])} °C</td><td>sky seen</td><td>feels like</td><td>against the air</td></tr>
      ${rows}
      <tr><td colspan="4" class="sub">"Feels like" is the radiant heat on a standing person (${gl('tmrt', 'mean radiant temperature')}), not the air. Expected: 6 degrees cooler to 2 warmer than the air, warmer where less sky is seen${order ? '' : MISS}.</td></tr>
    </table>
    <p class="note">At night the hot sun is gone, so where you stand matters much less than by day. What makes a summer night uncomfortable is mostly the warm, humid air itself, which this page keeps fixed. Studies in Taipei found the streets uncomfortable in the afternoon and the evening depending on how wet the paving is; no study of a night market's comfort was found.</p>
    ${experts(`<p class="lit">The brief's arithmetic in this engine's form (air 30 °C, walls air + 2 K): Tmrt 25.7 / 27.8 / 28.9 °C under an open sky for a surface at the air / +4 / +6 K, 30.1–31.2 °C at a sky view of 0.3. Sky view: square ${f2(P.ref[h].svf)}, open aisle ${f2(P.aisle[h].svf)}, under the awnings ${f2(P.awning[h].svf)} (an awning counts as covering three quarters of the sky above), narrow alleys ${f2(P.alley[h].svf)}.</p>
      <p class="caveat">Every wall is the engine's shared warm wall (air + 2 K at night) and a person sees only the ground of their own 5 m cell (issue #28); awnings, stalls and the crowd's bodies are not in the sky view (likely 0.5–1 degree too cool here).</p>`, ['brief12', 'nccuXimen', 'ntuEnvimet'])}`;
}

/** Next to the grill card. d: {st}. */
export function grillCard(d) {
  const st = d.st;
  const g = (x) => st.grill.find((r) => r.d === x);
  const rows = [0.9, 1, 1.5, 2, 2.5, 3].map((x) => `<tr${x === 0.9 ? ' class="t"' : ''}><td>${x} m${x === 0.9 ? ' (where the cook stands)' : x === 1.5 ? ' (the crowd keeps at least this far)' : ''}</td><td>${r0(g(x).tmrt)} °C</td><td>${fmt(g(x).dT)} degrees${x === 3 && g(3).dT >= NM_BANDS.grill3 ? MISS : ''}</td></tr>`).join('');
  const miss = g(3).dT >= NM_BANDS.grill3;
  return `
    ${close}
    <h3>Right next to the grill</h3>
    <p class="lead">One metre from an open charcoal grill it feels like about ${r0(g(1).tmrt)} °C, while a few steps away in the aisle it feels like ${r0(st.place.stallRow[NM.hour.value].tmrt)} °C: the glowing coals are the one big source of radiant heat at a night market.</p>
    <table class="cmp">
      <tr><td>9 pm, from the coals</td><td>feels like</td><td>extra</td></tr>
      ${rows}
      <tr><td colspan="3" class="sub">Beyond 3 m the page adds nothing; when the market is closed, nothing at all.${miss ? ` At 3 m the extra heat is ${fmt(g(3).dT)} degrees, more than the less than 5 expected: the same formula that gives about ${r0(g(1).tmrt)} °C at 1 m gives this at 3 m, because it treats the coal bed as a glowing patch facing you from every side with nothing in the way (an upper bound); it falls below 5 degrees only about ${fmt(st.under5)} m away.` : ''}</td></tr>
    </table>
    <p class="note">This is an upper bound and only illustrative: a real grill is partly hidden by its own rim and the food on it, and the cook moves. It is the only stall heat this page lets reach a person, and only for people standing near a grill, not for the 5 m squares of the heat view. Cooks at the grill sweat; the crowd keeps a little distance.</p>
    ${experts(`<p class="lit">ΔS = ε_c·σ·(T_c⁴ − T_b⁴)·A_c / (4πd²), d ≥ ${NM.grillMin.value} m, summed over the open grills within ${NM.grillMax.value} m; Tmrt' = (Tmrt⁴ + ΔS/σ)^¼. Coal bed ${NM.coalArea.value} m²${tag(NM.coalArea)} at ${NM.coalTemp.value} °C${tag(NM.coalTemp)}, ε_c ${NM.coalEps.value}${tag(NM.coalEps)}, T_b the air. The brief: about +490 W m⁻² at 1 m (Tmrt about 88 °C) and about +120 at 2 m (about 48 °C), an upper bound. Here at 1 m +${r0(g(1).dS)} W m⁻², at 2 m +${r0(g(2).dS)}, at 3 m +${r0(g(3).dS)}.</p>
      <p class="caveat">Added to the Tmrt of a point (the people drawn, a heat card's cell centre), never to the grid model: surfaces, the air and the 5 m Tmrt are unchanged.</p>`, ['brief12', 'charcoalVendor'])}`;
}

/** The market's hours card. */
export function hoursCard() {
  const hours = [15, 16, 17, 18, 19, 20, 22, 23, 23.5, 0];
  const rows = hours.map((h) => `<tr${h >= 20 && h <= 23 ? ' class="t"' : ''}><td>${hm(h)}</td><td>${f2(density(1, h))}</td><td>${r0(density(1, h) * personW())}</td></tr>`).join('');
  return `
    ${close}
    <h3>When the market runs</h3>
    <p class="lead">A big night market like Shilin in Taipei opens around 4 pm and runs to midnight; it is busiest from about 8 to 11 pm, after the hottest part of the day.</p>
    <table class="cmp">
      <tr><td>hour</td><td>people per m², busy aisles</td><td>their heat, watts per m²</td></tr>
      ${rows}
    </table>
    <p class="note">Before 4 pm and after midnight this is an ordinary shopping street on this page: no stalls, no crowd, no lights. The crowd's rise and fall is made up, shaped to the opening hours and the busiest hours that guides give.</p>
    ${experts(`<p class="lit">Open ${NM.opens.value}:00–${NM.closes.value}:00${tag(NM.opens)}; busiest ${NM.peakFrom.value}:00–${NM.peakTo.value}:00${tag(NM.peakFrom)} (guides: 19–22 h). ρ_p(t) = ρ_peak × a cosine rise from 16:00 to 20:00, the peak to 23:00, a cosine fall to none at midnight; ρ_peak ${NM.peak.value} m⁻² times the place's weight (busy aisles 1, the stall row 0.5, the south side 0.6, the food court 0.8, the rest of the square 0.3, the alleys 0.2; engine assumptions).</p>`, ['travelTaipei', 'shilinWiki', 'brief12'])}`;
}

/** Button labels for the market panel cards. */
export const NM_CARDS = [
  ['stone', 'The stone at night'],
  ['crowd', 'A crowd is a heater'],
  ['stalls', 'Woks and charcoal'],
  ['lights', 'String lights'],
  ['night', 'How warm it feels'],
  ['grill', 'Next to the grill'],
  ['hours', 'Market hours'],
];

const STYLE = `#nmHint{position:fixed;left:50%;top:18px;transform:translateX(-50%);padding:6px 14px;background:rgba(246,240,226,.92);border:1px solid #2b2621;border-radius:6px 3px 8px 3px;font-size:14px}
.noui #nmHint{display:none}
#market summary{cursor:pointer;font-size:13px;margin-bottom:4px}
#card details.expert{margin-top:8px;border-top:1px dashed #6d6355;padding-top:4px}
#card details.expert summary{cursor:pointer;font-size:12px;opacity:.8}
#card .lead{margin:4px 0 8px;font-size:14px}`;

const SHIRTS = ['#b5533c', '#3f6e6a', '#c9973f', '#5b6b8c', '#e8e1d0', '#8e4b5e', '#2f3e52', '#d07a5a', '#6f8c52', '#d9c35a'].map(hexRgb);
const LANES = [186.8, 188.9, 195.7, 197.6, 199.5, 201.6];

/**
 * The crowd and the cooks at time t (s) and quantised hour hq (market open):
 * NM.figures figures, each shown while hash < the crowd's share of its peak:
 * strollers along the street's lanes (about half), customers in front of a
 * stall (a new stall every minute), and people walking the food court; one
 * cook behind each stall, NM.vendorAt from its centre. Nobody but the cooks
 * comes nearer than NM.keepAway to a grill. A figure within 3 m of a grill
 * carries its point Tmrt (heatOf). Pure function of (t, hq).
 */
export function crowdAt(world, t, hq, heatOf) {
  const out = [];
  const stalls = world.nm.stalls;
  const grills = world.nm.grills;
  const share = crowdShape(hq);
  const keep = NM.keepAway.value;
  const push = (a) => {
    for (const g of grills) {
      const dx = a.x - g.x;
      const dy = a.y - g.y;
      const dd = Math.hypot(dx, dy);
      if (dd < keep) {
        const u = dd > 1e-6 ? 1 / dd : 0;
        a.x = g.x + (u ? dx * u : 0) * keep;
        a.y = g.y + (u ? dy * u : 1) * keep;
      }
    }
  };
  for (let k = 0; k < NM.figures.value; k++) {
    if (hash3(k, 1, 1215) >= share) continue;
    const role = hash3(k, 2, 1215);
    const shirt = SHIRTS[Math.floor(hash3(k, 3, 1215) * SHIRTS.length)];
    let a;
    if (role < 0.55) {
      const dir = hash3(k, 4, 1215) < 0.5 ? 1 : -1;
      const speed = 0.45 + 0.45 * hash3(k, 5, 1215);
      const y = LANES[Math.floor(hash3(k, 6, 1215) * LANES.length)] + (hash3(k, 7, 1215) - 0.5) * 0.6;
      const s = (((hash3(k, 8, 1215) * 400 + dir * speed * t) % 400) + 400) % 400;
      a = { x: s, y: y + Math.sin(t * 0.4 + k) * 0.15, hx: dir, hy: 0, walk: (s / 0.6) % 2 };
    } else if (role < 0.82) {
      const slot = Math.floor((t + hash3(k, 9, 1215) * 60) / 60);
      const s = stalls[Math.floor(hash3(k, slot, 1216) * stalls.length)];
      a = { x: s.x + (hash3(k, slot, 1217) - 0.5) * 2, y: s.y + 2 + hash3(k, slot, 1218) * 0.8, hx: 0, hy: -1, walk: 0 };
    } else {
      const dir = hash3(k, 4, 1215) < 0.5 ? 1 : -1;
      const s = (((hash3(k, 8, 1215) * 140 + dir * 0.55 * t) % 140) + 140) % 140;
      const x = s < 70 ? 165 + s : 235 - (s - 70);
      const y = s < 70 ? 162.5 : 178.5;
      a = { x, y: y + (hash3(k, 7, 1215) - 0.5) * 1.5, hx: s < 70 ? 1 : -1, hy: 0, walk: (s / 0.6) % 2 };
    }
    push(a);
    a.shirt = shirt;
    a.k = 1215000 + k;
    a.sit = false;
    const h = heatOf(a.x, a.y);
    if (h) a.heat = h;
    out.push(a);
  }
  stalls.forEach((s, i) => {
    const a = { x: s.x + Math.sin(t * 0.7 + i) * 0.1, y: s.y - NM.vendorAt.value, hx: 0, hy: 1, walk: 0, shirt: SHIRTS[(i * 7) % SHIRTS.length], k: 1216000 + i, sit: false, cook: true };
    const h = heatOf(a.x, a.y);
    if (h) a.heat = h;
    out.push(a);
  });
  return out;
}

/**
 * The block's plugin for app.js: the heat-given-off bars (Q, button,
 * ?heat=1), the market open or closed (M, button, ?market=0; default open),
 * a heat-view button (T), the loading hint, the cards, notes, heat-card
 * rows, the crowd and the cooks, renderer hooks and the API. env: {scene,
 * world, thermal, root, card, R, S, main, query, setup (marketSetup),
 * hideCard(), reopen(), redraw(), setModel(T), setNotes(n)}.
 */
export function nmApp(env) {
  const { scene, world, root, card, R, S, main } = env;
  const base = env.setup.base;
  const st = { heat: env.query.get('heat') === '1', open: env.query.get('market') !== '0' };
  let fixed = null;
  const stats = () => (fixed ??= { ...marketStats(world, base), hc: base.info.hc });
  const site = scene.site;
  // the heat bars per quantised hour and toggle (cell centres and parts), cached
  const heatCache = new Map();
  const heatCells = (hq) => {
    const key = `${hq}|${st.open ? 1 : 0}`;
    if (!heatCache.has(key)) {
      if (heatCache.size > 24) heatCache.delete(heatCache.keys().next().value);
      heatCache.set(key, world.nm.F.market.map((i) => {
        const [x, y] = centre(world, i);
        return { i, x, y, ...heatParts(world, base, i, hq, st.open) };
      }));
    }
    return heatCache.get(key);
  };
  R.market = {
    lights: lightStrings(world),
    stalls: world.nm.stalls.map((s) => ({ ...s, vis: !behind(world, s.x, s.y + 1, 1.2) })),
    grills: world.nm.grills,
    heat: heatCells,
    lit: false,
  };
  R.overlay = nmOverlay;
  // the crowd and the cooks join the walkers while the market is open
  const life = main.life;
  const baseAt = life.at.bind(life);
  const tmrtCache = new Map();
  const heatOf = (hq) => (x, y) => {
    const dS = grillAt(world, base, x, y, hq, st.open);
    if (!(dS > 0)) return null;
    const i = world.cellIndex(x, y);
    const key = `${i}|${hq}`;
    if (!tmrtCache.has(key)) {
      if (tmrtCache.size > 4000) tmrtCache.clear();
      tmrtCache.set(key, base.tmrt(i, hq));
    }
    const t0 = tmrtCache.get(key);
    return { tmrt: ((t0 + 273.15) ** 4 + dS / 5.670374e-8) ** 0.25 - 273.15, sunlit: 1 };
  };
  life.at = (t, hq) => (st.open && isOpen(hq) ? baseAt(t, hq).concat(crowdAt(world, t, hq, heatOf(hq))) : baseAt(t, hq));

  root.head.insertAdjacentHTML('beforeend', `<style>${STYLE}</style>`);
  const btn = (attr, v, label) => `<button type="button" ${attr}="${v}">${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="nmHint" class="hand" role="status">Drawing the street… the colours and the lights come in as the ink dries</div>
    <div id="market" class="blockpanel" aria-label="Night market controls"><details open><summary class="hand">Night market: buttons and cards</summary>
        <div class="seg">${btn('data-heat', '1', 'heat view (T)')}${btn('data-give', '1', 'heat given off (Q)')}${btn('data-open', '1', 'market open (M)')}</div>
        <div class="measures"><div class="hand">Cards</div>${NM_CARDS.map(([id, label]) => btn('data-card', id, label)).join('')}</div>
      </details></div>`,
  );
  const el = root.getElementById('market');
  const hint = root.getElementById('nmHint');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.heat) window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    else if (b.dataset.give) setHeat(!st.heat);
    else if (b.dataset.open) setOpen(!st.open);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-heat]').setAttribute('aria-pressed', String(!!S.thermal));
    el.querySelector('[data-give]').setAttribute('aria-pressed', String(st.heat));
    el.querySelector('[data-open]').setAttribute('aria-pressed', String(st.open));
  }
  function setHeat(on) {
    st.heat = !!on;
    sync();
    env.reopen();
    env.redraw();
  }
  function setOpen(on) {
    st.open = !!on;
    sync();
    env.reopen();
    env.redraw();
  }
  const sunset = () => {
    let h = 17;
    for (let m = 17 * 60; m < 21 * 60; m++) if (solarPosition(site, m / 60).alt > -0.833) h = m / 60;
    return h;
  };
  function html(id) {
    const s = stats();
    if (id === 'stone') return stoneCard({ st: s });
    if (id === 'crowd') return crowdCard({ st: s, perFigure: perFigure() });
    if (id === 'stalls') return stallsCard({ st: s });
    if (id === 'lights') return lightsCard({ st: s, sunset: sunset() });
    if (id === 'night') return nightCard({ st: s });
    if (id === 'grill') return grillCard({ st: s });
    return hoursCard();
  }
  /** People one drawn figure stands for at the peak: the market's people over the figures drawn. */
  const perFigure = () => {
    const F = world.nm.F;
    let n = 0;
    for (const i of F.market) n += density(F.weight[i], 21) * world.cell * world.cell;
    return n / NM.figures.value;
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
    const h = NM.hour.value;
    const P = s.place;
    const g = (x) => s.grill.find((r) => r.d === x);
    return {
      stoneDTs: P.aisle[h].dTs,
      stoneNet: P.aisle[h].net,
      squareDT: P.ref[h].dTmrt,
      awningDT: P.awning[h].dTmrt,
      grill1: g(1).tmrt,
      grill3: g(3).dT,
      crowd: NM.peak.value * personW(),
    };
  }
  let shown = null;
  let heatShown = null;
  return {
    notes: () => nmNotes(scene, noteData()),
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
      const hq = quantHour(S.hour);
      return { heat: st.heat, open: st.open && isOpen(hq), lit: st.open && lightsOn(site, hq), budget: 1 };
    },
    sync,
    html,
    /** Keyboard: Q shows the heat given off, M opens and closes the market; true if the key was the block's. */
    key(k) {
      if (k === 'q' || k === 'Q') setHeat(!st.heat);
      else if (k === 'm' || k === 'M') setOpen(!st.open);
      else return false;
      return true;
    },
    /** Heat-card rows on a ground cell: the heat given off there now by source; the nearest grill and its extra heat at the cell's centre. */
    cardKey: 'market',
    cardInfo: (cells, tmrtCell, h) => {
      if (tmrtCell === null) return null;
      const i = tmrtCell;
      const p = heatParts(world, base, i, h, st.open);
      const [x, y] = centre(world, i);
      const g = nearestGrill(world, x, y);
      const t = tmrtAt(world, base, x, y, h, st.open);
      return { ...p, grillD: g, grillDT: t.dT, open: st.open && isOpen(h), stalls: world.nm.stalls.filter((s) => world.cellIndex(s.x, s.y) === i).map((s) => s.type) };
    },
    cardRows: (f) => {
      const rows = [`<tr><td colspan="2" class="sub">${gl('anthropogenicHeat', 'Heat given off')} here now, watts per m² (Q shows it; the air is fixed, so it is not felt):</td></tr>`,
        `<tr><td>the stone, radiated / warming the air</td><td>${r0(f.stoneRad)} / ${r0(f.stoneAir)}</td></tr>`];
      if (f.crowd > 0) rows.push(`<tr><td>the crowd (${f2(f.rho)} people per m²)</td><td>${r0(f.crowd)}</td></tr>`);
      if (f.stall > 0) rows.push(`<tr><td>stalls (${f.stalls.join(', ')})</td><td>${r0(f.stall)}</td></tr>`);
      if (f.light > 0) rows.push(`<tr><td>string lights</td><td>${fmt(f.light)}</td></tr>`);
      if (f.grillD <= 6) rows.push(`<tr><td>nearest charcoal grill</td><td>${fmt(f.grillD)} m from this square's centre${f.grillDT > 0 ? `; there it feels ${fmt(f.grillDT)} degrees hotter` : ''}</td></tr>`);
      return rows.join('');
    },
    /** The shared sky-view, night-lag and Tmrt footnotes quote the block's own lines; the block's terms their numbers. */
    glossary: () => {
      const s = stats();
      const P = s.place;
      const h = NM.hour.value;
      return {
        hutong: {
          svfLine: `Temple Square about ${f2(P.ref[h].svf)}; Lantern Street's open aisle about ${f2(P.aisle[h].svf)}, under the awnings ${f2(P.awning[h].svf)}; the narrow alleys about ${f2(P.alley[h].svf)}.`,
          lagLine: `At 11 pm the granite street is ${fmt(P.aisle[23].dTs)} °C above the air, the narrow alleys ${fmt(P.alley[23].dTs)} °C.`,
          tmrtLine: `At 9 pm: ${fmt(P.ref[h].tmrt)} °C in the open square, ${fmt(P.awning[h].tmrt)} °C under the awnings, ${fmt(P.alley[h].tmrt)} °C in a narrow alley (air ${fmt(s.air[h])} °C); 1 m from a charcoal grill about ${r0(s.grill.find((r) => r.d === 1).tmrt)} °C.`,
          netLwLine: `At 9 pm the street's stone sends out about ${r0(P.aisle[h].gross)} W/m² and gets back about ${r0(P.aisle[h].gross - P.aisle[h].rad)} from the sky and walls: a net loss of ${r0(P.aisle[h].rad)}.`,
        },
      };
    },
    /** Night market block (block 12) only: state {heat, open}; set() it; numbers for the bands and cards; card HTML; the heat given off per market cell; a point's Tmrt; the crowd. */
    api: {
      state: () => ({ heat: st.heat, open: st.open }),
      set(o) {
        if (o.heat !== undefined) setHeat(!!o.heat);
        if (o.open !== undefined) setOpen(!!o.open);
      },
      stats: () => stats(),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#market [data-card="${id}"]`)),
      heat: (h = S.hour) => heatCells(quantHour(h)).map((c) => ({ ...c })),
      tmrtAt: (x, y, h = S.hour) => tmrtAt(world, base, x, y, h, st.open),
      crowd: (frame = S.frame, h = S.hour) => life.at(frame / 60, quantHour(h)).filter((a) => a.k >= 1215000).map((a) => ({ x: a.x, y: a.y, cook: !!a.cook, tmrt: a.heat ? a.heat.tmrt : null })),
      grills: () => world.nm.grills.map((g) => [g.x, g.y]),
      hint: () => !hint.hidden,
      perFigure: () => perFigure(),
      stallW: (type) => stallPower(type),
    },
  };
}
