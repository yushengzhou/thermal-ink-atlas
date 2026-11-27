// bsui: the overlay of the bus stops and footbridges (block 9): the
// waiting-place and burn-flag controls, margin notes, the cards (west screen
// against a bigger roof, one card per stop, which kerb, Phoenix stops, the
// glass box, Hong Kong guidance, footbridges, burn flags, waiting and dose),
// the heat-card rows, the riders waiting at the stops and crossing the
// footbridges, and the block's API, as a block plugin for app.js.
import { SOURCES, BASIS, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { BS, riderBook, busStats, screenCompare, kerbCompare, roofSwap, clockAt, contactFlags, meanWait, burnLimit } from './busstop.js';
import { bsOverlay, busAt } from './bskit.js';
import { quantHour } from './render.js';
import { hash3, hexRgb } from './core.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const pct = (v) => `${Math.round(v * 100)}%`;
const K = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))} K`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated; the waiting places, decks, rails and benches at points (sub-cell), the rest on a 5 m grid; the air temperature is fixed.</p>`;
const close = '<button class="x" aria-label="close">×</button>';
const ADULT = 'Tmrt of an adult (head 1.7 m standing, 1.2 m seated)';

/** Margin notes (at most 5). d: numbers from the plugin (noteData). */
export function bsNotes(scene, d) {
  const text = {
    screen: [`Stop C, west screen: bench ${fmt(d.c17)} °C Tmrt at 5 pm;`, `${fmt(d.c17no)} without it, ${fmt(d.c17big)} under a bigger roof`],
    stopA: [`Stop A, metal roof: ${fmt(d.a15)} °C Tmrt at 3 pm`, `standing in its shade, ${fmt(d.a15open)} °C at the kerb`],
    glass: [`Glass box (stop E): ${fmt(d.e15)} °C Tmrt inside,`, `${fmt(d.e15open)} °C outside at 3 pm (air trap not modelled)`],
    deck: [`Open footbridge: steel deck ${fmt(d.deck15)} °C at 3 pm,`, `under the cover ${fmt(d.cdeck15)} °C`],
    trees: [`Stop D, under the trees: ${fmt(d.d15)} °C Tmrt`, `on the bench at 3 pm, no shelter at all`],
  };
  const terms = {
    screen: [['profileAngle', 'west screen']],
    stopA: [['tmrt', 'Tmrt']],
    glass: [['transmittance', 'Glass box']],
    deck: [['burnThreshold', 'steel deck']],
    trees: [['heatDose', 'under the trees']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** A plan of stop C with the shade at seated head height at 14-17 h (inline SVG, metres). */
export function shadeDiagram(cmp, suns) {
  const r = cmp.roof;
  const s = cmp.screen;
  const z = BS.headSeat.value;
  const ox = r.x0 - 3.5;
  const oy = r.y0 - 2;
  const S = 26; // px per m
  const X = (x) => ((x - ox) * S).toFixed(1);
  const Y = (y) => ((y - oy) * S).toFixed(1);
  const cols = ['#c9973f', '#b5533c', '#8a2f22', '#3f2a5e'];
  const out = [];
  cmp.hours.forEach((h, k) => {
    const sun = suns[k];
    const t = Math.tan(sun.alt * Math.PI / 180);
    const b = sun.az * Math.PI / 180;
    // shade at head height: the roof shifted away from the sun by (H - z) / tan(beta)
    const L = (r.z - z) / t;
    const dx = -Math.sin(b) * L;
    const dy = Math.cos(b) * L;
    out.push(`<polygon points="${X(r.x0 + dx)},${Y(r.y0 + dy)} ${X(r.x1 + dx)},${Y(r.y0 + dy)} ${X(r.x1 + dx)},${Y(r.y1 + dy)} ${X(r.x0 + dx)},${Y(r.y1 + dy)}" fill="${cols[k]}" fill-opacity="0.12" stroke="${cols[k]}" stroke-width="1.2"/>`);
    // the screen's shade at head height: the panel swept away from the sun up to (top - z) / tan(beta)
    const Ls = (s.z1 - z) / t;
    const ex = -Math.sin(b) * Ls;
    const ey = Math.cos(b) * Ls;
    out.push(`<polygon points="${X(s.x0)},${Y(s.y0)} ${X(s.x1)},${Y(s.y1)} ${X(s.x1 + ex)},${Y(s.y1 + ey)} ${X(s.x0 + ex)},${Y(s.y0 + ey)}" fill="${cols[k]}" fill-opacity="0.3" stroke="none"/>`);
    out.push(`<text x="4" y="${(12 + k * 12)}" font-size="10" fill="${cols[k]}">${hm(h)}</text>`);
  });
  const e = cmp.bigger;
  const heads = cmp.seats.map((p) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="#2b2621"/>`).join('');
  return `<svg class="diagram" viewBox="0 0 ${(r.x1 + 5 - ox) * S} ${(r.y1 - oy + 4) * S}" width="100%" role="img" aria-label="Plan of stop C: the roof, the bigger roof (dashed), the west screen and the shade at seated head height at 14:00 to 17:00">
      <rect x="${X(r.x0 - e)}" y="${Y(r.y0 - e)}" width="${(r.x1 - r.x0 + 2 * e) * S}" height="${(r.y1 - r.y0 + 2 * e) * S}" fill="none" stroke="#6d6355" stroke-dasharray="4 3"/>
      <rect x="${X(r.x0)}" y="${Y(r.y0)}" width="${(r.x1 - r.x0) * S}" height="${(r.y1 - r.y0) * S}" fill="none" stroke="#2b2621" stroke-width="1.5"/>
      ${out.join('')}
      <line x1="${X(s.x0)}" y1="${Y(s.y0)}" x2="${X(s.x1)}" y2="${Y(s.y1)}" stroke="#3f6e6a" stroke-width="4"/>
      ${heads}
      <text x="${X(r.x0)}" y="${Y(r.y1 + 1.6)}" font-size="11" fill="#2b2621">north up · road to the south · sun from the west</text>
    </svg>`;
}

/** West screen against a bigger roof (stop C). d: {cmp, suns}. */
export function screenCard(d) {
  const V = d.cmp.variants;
  const H = d.cmp.hours;
  const row = (k, name) => `<tr><td>${name}</td>${H.map((h) => `<td>${fmt(V[k][h].tmrt)}</td>`).join('')}</tr>`;
  const lit = (k, name) => `<tr><td class="sub">${name}: heads in direct sun</td>${H.map((h) => `<td>${pct(V[k][h].lit)}</td>`).join('')}</tr>`;
  const h17 = H[H.length - 1];
  const better = H.filter((h) => V.built[h].tmrt < V.bigRoof[h].tmrt);
  const o17 = d.overhang;
  return `
    ${close}
    <h3>West screen against a bigger roof</h3>
    <div class="mat">Stop C: opal roof ${BS.shelterH.value} m up${tag(BS.shelterH)}, ${BS.shelterDepth.value} m deep${tag(BS.shelterDepth)}, west end screen to ${BS.westScreen.value} m${tag(BS.westScreen)} · the bigger roof: ${BS.biggerRoof.value} m more on every side${tag(BS.biggerRoof)}, no screen</div>
    ${shadeDiagram(d.cmp, d.suns)}
    <table class="cmp">
      <tr><td>${gl('tmrt', 'Tmrt')}, seated, °C</td>${H.map((h) => `<td>${hm(h)}</td>`).join('')}</tr>
      ${row('built', 'as built: roof and west screen')}
      ${row('noScreen', 'the same roof, no screen')}
      ${row('bigRoof', 'a bigger roof, no screen')}
      ${lit('built', 'as built')}
      ${lit('bigRoof', 'bigger roof')}
    </table>
    <p class="note">In the afternoon the sun is low in the west and shines in under the open west end of a roof that runs east–west. The screen is ${better.length === H.length ? 'cooler than the bigger roof at every hour shown' : better.length ? `cooler than the bigger roof at ${better.map(hm).join(', ')}` : 'not cooler than the bigger roof at any hour shown here'}: at ${hm(h17)} the bench averages ${fmt(V.built[h17].tmrt)} °C with it, ${fmt(V.noScreen[h17].tmrt)} °C without it and ${fmt(V.bigRoof[h17].tmrt)} °C under the bigger roof. To shade a seated head at the west end at ${hm(h17)} a roof would have to reach ${fmt(o17)} m past it (${gl('profileAngle', 'profile angle')} ${fmt(d.phi17)}°).</p>
    <p class="lit">The brief: between 14 and 17 h the low western sun gets under any roof, so the west side needs a vertical screen; a 2.7 m roof needs a 3.2 m overhang to shade a seated head at 17 h, while a screen to 2.2 m shades 2.2 m behind it. Hong Kong guidance asks for low headroom or wider covers and fascias, checked with a sun-shadow analysis (Highways Department BS/GN/047). Phoenix: stops without side panels were worse (Dzyuban et al. 2022).</p>
    <p class="caveat">Point model at the four bench places: the direct sun is traced through the roof (opal, ${pct(MATERIALS.polyOpal.tr.value)} through) and the screen; between the top of the screen and the roof a band of sun still gets in. Tmrt is for a seated adult (head 1.2 m); the panels reflect no sunlight and their own temperature is not computed.</p>
    ${srcLine(['brief9', 'hyd047', 'dzyuban2022', 'brettMartin'])}`;
}

const STOP_LIT = {
  A: 'Phoenix: shade at bus stops cut PET by 19 °C on average; a metal roof by 20.6 °C, an ad panel by 20.3 °C (Dzyuban et al. 2022). Tempe: building shade −28.8 K Tmrt (Middel et al. 2021). A radiative-cooling film on a shelter roof: Tmrt 1–2 K lower (Arizona State University, not peer reviewed).',
  B: 'Polycarbonate datasheet: a clear 10 mm twinwall sheet lets through 0.80 of the sun (Brett Martin, via the brief). Phoenix: polycarbonate roofs cut PET by 18.2 °C (Dzyuban et al. 2022); Hong Kong guidance asks for opaque shelter roofs (BS/GN/047).',
  C: 'Opal polycarbonate lets through 0.47 of the sun, bronze 0.43 (Brett Martin, via the brief). Phoenix: stops without side panels were worse (Dzyuban et al. 2022).',
  D: 'Tempe: tree shade −28.1 K Tmrt (Middel et al. 2021). Houston: tree shade 3.2 °C WBGT cooler at bus stops (Lanza et al. 2025). Only 26% of Los Angeles Metro stops have a shelter (UCLA, via the brief).',
  E: 'Houston: enclosed shelters without overhead shade were more than 3 °C hotter than the open sun (Lanza et al. 2025).',
};
const STOP_SRC = { A: ['dzyuban2022', 'middel2021', 'asuFilm'], B: ['brettMartin', 'dzyuban2022', 'hyd047'], C: ['brettMartin', 'dzyuban2022'], D: ['middel2021', 'lanza2025', 'ucla'], E: ['lanza2025'] };

/** One stop. d: {s (busStats stop), air, misses}. */
export function stopCard(d) {
  const s = d.s;
  const H = [12, 15, 17];
  const w = s.wait15;
  const hasRoof = !!s.centre;
  const lim = burnLimit(s.benchMat);
  const note = {
    A: () => `Standing in the middle of the shelter at 3 pm you are ${fmt(s.open[15].tmrt - s.centre[15].tmrt)} K cooler in Tmrt than at the kerb; the seat at the open west end ${s.seat[15].head >= 0.5 ? 'is not: the low sun comes in under the roof from the side' : 'is shaded too'}.`,
    B: () => `The back panel faces west and stops the afternoon sun, so the bench is ${s.seat[15].head < 0.5 ? 'shaded' : 'still partly in sun'} at 3 pm; at noon the clear roof lets ${pct(MATERIALS.polyClear.tr.value)} of the sun through to the people under it.`,
    C: () => 'The opal roof halves the sun from above; the west screen stops the low afternoon sun from the side (see the West screen card).',
    D: () => 'No shelter: the crowns are the roof. They shade the bench in the afternoon as long as the sun stays behind them; there is nothing against rain.',
    E: () => `A box of glass on every side and on top: the sun comes in through the roof and the walls (${pct(MATERIALS.glassBox.tr.value)} each), so inside it is barely better than outside.`,
  }[s.id]();
  return `
    ${close}
    <h3>${s.name}</h3>
    <div class="mat">${ADULT}, point model · riders: a bus every ${BS.headway.value} min${tag(BS.headway)} (spread ${BS.cv.value}${tag(BS.cv)}), ${BS.riders.value} riders a minute${tag(BS.riders)}</div>
    <table class="cmp">
      <tr><td>${gl('tmrt', 'Tmrt')}, °C</td>${H.map((h) => `<td>${hm(h)}</td>`).join('')}</tr>
      ${hasRoof ? `<tr><td>under the roof (centre, standing)</td>${H.map((h) => `<td>${fmt(s.centre[h].tmrt)}</td>`).join('')}</tr>` : ''}
      <tr><td>on the bench (seated)</td>${H.map((h) => `<td>${fmt(s.seat[h].tmrt)}</td>`).join('')}</tr>
      <tr><td>in the open by the kerb (standing)</td>${H.map((h) => `<td>${fmt(s.open[h].tmrt)}</td>`).join('')}</tr>
      <tr><td>bench seat (${s.benchMat === 'metal' ? 'metal' : 'concrete'}), surface</td>${H.map((h) => `<td>${fmt(s.bench[h].ts)}</td>`).join('')}</tr>
    </table>
    <table class="cmp">
      <tr><td>riders arriving 15:00–16:00</td><td>${w.n}</td></tr>
      <tr><td>mean wait</td><td>${fmt(w.wait)} min</td></tr>
      <tr><td>mean Tmrt while waiting</td><td>${fmt(w.tmrt)} °C</td></tr>
      <tr><td>mean ${gl('heatDose', 'heat dose')} of a wait</td><td>${fmt(w.D)} K·min</td></tr>
      <tr><td>bench above its ${gl('burnThreshold', '1-min burn limit')} (${lim} °C) at 15:00</td><td>${s.bench[15].ts > lim ? `yes, by ${fmt(s.bench[15].ts - lim)} K` : 'no'}</td></tr>
    </table>
    <p class="note">${note}</p>
    <p class="lit">${STOP_LIT[s.id]}</p>
    <p class="caveat">Conditions while waiting, for an adult at the heights given: the model does not follow how a body heats up over a wait, and the dose is this page's own measure, not a health threshold. ${s.id === 'E' ? 'The warm air trapped in a glass box is not modelled (the air is fixed), so inside is understated. ' : ''}${d.misses && s.id === 'A' && d.misses.groundMiss ? `The shaded concrete under this roof comes out ${fmt(d.misses.groundShade)} K from the air at 3 pm, outside the brief's 0–8 K above it (band missed, see docs/sources.md); not tuned. ` : ''}Panels and walls reflect no sunlight here.</p>
    ${srcLine(['brief9', ...STOP_SRC[s.id]])}`;
}

/** Which kerb. d: {kerb}. */
export function kerbCard(d) {
  const k = d.kerb;
  const H = k.hours;
  return `
    ${close}
    <h3>Which kerb? The same shelter on either side of the avenue</h3>
    <div class="mat">Stop B's shelter with an opaque roof: as built on the west kerb (back panel to the west), and mirrored onto the east kerb (open front to the west) · ${ADULT}, point model</div>
    <table class="cmp">
      <tr><td>Tmrt, °C</td>${H.map((h) => `<td>${hm(h)}</td>`).join('')}</tr>
      <tr><td>west kerb, seated</td>${H.map((h) => `<td>${fmt(k.west[h].seated)}</td>`).join('')}</tr>
      <tr><td>east kerb, seated</td>${H.map((h) => `<td>${fmt(k.east[h].seated)}</td>`).join('')}</tr>
      <tr><td>west kerb, standing under the roof</td>${H.map((h) => `<td>${fmt(k.west[h].standing)}</td>`).join('')}</tr>
      <tr><td>east kerb, standing under the roof</td>${H.map((h) => `<td>${fmt(k.east[h].standing)}</td>`).join('')}</tr>
    </table>
    <p class="note">On a north–south street the afternoon sun comes from across the road. A shelter on the west kerb turns its back panel to it; on the east kerb its open front faces it, and the roof alone cannot keep the sun off: at 4 pm the seated places are ${fmt(k.east[16].seated - k.west[16].seated)} K warmer in Tmrt on the east kerb.</p>
    <p class="lit">The brief: on a north–south arterial the west-kerb stop's back blocks the afternoon sun and the east-kerb stop's open front takes it; check every design with a sun-shadow analysis (Hong Kong Highways Department BS/GN/047).</p>
    <p class="caveat">A comparison computed for this card only (the east-kerb shelter is not drawn). Panels reflect no sunlight; the air is fixed.</p>
    ${srcLine(['brief9', 'hyd047'])}`;
}

/** Phoenix stops. d: {st}. */
export function phoenixCard(d) {
  const A = d.st.stops.find((s) => s.id === 'A');
  return `
    ${close}
    <h3>Phoenix bus stops, measured</h3>
    <div class="mat">Dzyuban et al. (2022): bus stops in Phoenix, June–July 2018, air 41.8 °C in sun and 41.2 °C in shade</div>
    <table class="cmp">
      <tr><td></td><td>sun</td><td>shade</td></tr>
      <tr><td>globe temperature</td><td>52.0 °C</td><td>44.3 °C</td></tr>
      <tr><td>PET</td><td>68.2 °C</td><td>49.5 °C</td></tr>
      <tr><td>concrete</td><td>57.4 °C</td><td>41.3 °C</td></tr>
      <tr><td>metal bench</td><td>47.7 °C</td><td>40.4 °C</td></tr>
      <tr><td>this model, stop A at 15:00: Tmrt</td><td>${fmt(A.open[15].tmrt)} °C</td><td>${fmt(A.centre[15].tmrt)} °C</td></tr>
      <tr><td>this model: concrete</td><td>${fmt(A.open[15].ts)} °C</td><td>${fmt(A.centre[15].ts)} °C</td></tr>
    </table>
    <p class="note">Shade cut PET by 19 °C on average; metal roofs (20.6 °C) and ad panels (20.3 °C) did a little better than polycarbonate (18.2 °C), sparse vines made no significant difference, and stops without side panels did worse. Most riders arrived less than 5 min before their bus.</p>
    <p class="caveat">${d.misses.groundMiss ? `The shaded concrete here is ${fmt(d.misses.groundShade)} K from the air at 3 pm, outside the brief's 0–8 K above it (Phoenix: 41.3 °C at 41.2 °C air): band missed, see docs/sources.md; likely because a 2 m strip of shade at a point gets no heat from the sunlit slab around it; not tuned. ` : ''}Phoenix is hotter and drier than this design day (air 35 °C here), and globe temperature and PET are not Tmrt, so the rows compare only the direction and the rough size of the effect.</p>
    ${srcLine(['dzyuban2022', 'brief9'])}`;
}

/** The glass box. d: {st}. */
export function glassCard(d) {
  const E = d.st.stops.find((s) => s.id === 'E');
  return `
    ${close}
    <h3>The glass box: out of the wind, not out of the sun</h3>
    <div class="mat">Stop E: glass roof and walls, ${pct(MATERIALS.glassBox.tr.value)} of the direct sun through each${tag(MATERIALS.glassBox.tr)}</div>
    <table class="cmp">
      <tr><td>${gl('tmrt', 'Tmrt')}, °C</td><td>12:00</td><td>15:00</td><td>17:00</td></tr>
      <tr><td>inside, standing</td><td>${fmt(E.centre[12].tmrt)}</td><td>${fmt(E.centre[15].tmrt)}</td><td>${fmt(E.centre[17].tmrt)}</td></tr>
      <tr><td>outside by the kerb</td><td>${fmt(E.open[12].tmrt)}</td><td>${fmt(E.open[15].tmrt)}</td><td>${fmt(E.open[17].tmrt)}</td></tr>
      <tr><td>metal bench inside, surface</td><td>${fmt(E.bench[12].ts)}</td><td>${fmt(E.bench[15].ts)}</td><td>${fmt(E.bench[17].ts)}</td></tr>
    </table>
    <p class="note">The glass takes off only a fifth of the sun, from every side, so people inside get nearly what they would get outside: ${fmt(E.open[15].tmrt - E.centre[15].tmrt)} K less Tmrt at 3 pm. Without a breeze the air inside a sunlit box also warms up; this model holds the air fixed, so it shows only the radiation.</p>
    <p class="lit">Houston, 17 stops: enclosed shelters without overhead shade were more than 3 °C (WBGT) hotter than standing in the open sun; tree shade was 3.2 °C cooler (Lanza et al. 2025).</p>
    <p class="caveat">Air fixed: no heat trap, no greenhouse effect inside the box; the glass transmission is the block-3 clear glass at normal incidence (less at a glancing angle, not modelled); the glass reflects no sunlight here.</p>
    ${srcLine(['lanza2025', 'brief3', 'brief9'])}`;
}

/** Hong Kong guidance. d: {swap, cmp}. */
export function hkCard(d) {
  const sw = d.swap;
  const share = (k) => sw[k].benefit / sw.roofMetal.benefit;
  d.opalMiss = share('polyOpal') < 0.5 || share('polyOpal') > 0.65;
  return `
    ${close}
    <h3>Hong Kong guidance for shelters and covers</h3>
    <div class="mat">Highways Department, Guidance Note BS/GN/047 (November 2018), via the brief</div>
    <table class="cmp">
      <tr><td>the guidance</td><td>this model</td></tr>
      <tr><td>bus shelter roofs opaque; avoid translucent sheets</td><td>stop A's shelter at 15:00: an opaque roof cuts Tmrt by ${fmt(sw.roofMetal.benefit)} K, opal by ${fmt(sw.polyOpal.benefit)} K (${pct(share('polyOpal'))}), clear by ${fmt(sw.polyClear.benefit)} K (${pct(share('polyClear'))})</td></tr>
      <tr><td>low headroom, or wider covers and fascias</td><td>stop C at 17:00: west screen ${fmt(d.cmp.variants.built[17].tmrt)} °C, a roof 1 m bigger ${fmt(d.cmp.variants.bigRoof[17].tmrt)} °C</td></tr>
      <tr><td>walkway covers: translucent on at most a third of the width, at the sides</td><td>the covered footbridge is opaque</td></tr>
      <tr><td>flat covers better than upward-sloped ones; check with a sun-shadow analysis</td><td>every roof here is flat; the shade at each waiting place is traced at points</td></tr>
    </table>
    <p class="caveat">${d.opalMiss ? `Opal comes out at ${share('polyOpal').toFixed(2)} of the opaque cut, just under the brief's 0.50–0.65 (band missed, see docs/sources.md): likely because the model passes the sheet's light as a direct beam, while opal scatters it; not tuned. ` : ''}The guidance note was read through the brief, not in the original (unverified). The comparisons are this model's, at points, for a standing or seated adult.</p>
    ${srcLine(['hyd047', 'brief9'])}`;
}

/** Footbridges. d: {st}. */
export function bridgeCard(d) {
  const [cv, op] = ['covered', 'open'].map((id) => d.st.bridges.find((b) => b.id === id));
  const H = [12, 15, 17];
  return `
    ${close}
    <h3>Footbridges: steel in the sun</h3>
    <div class="mat">Two steel footbridges ${BS.deckH.value} m up${tag(BS.deckH)}; one under an opaque cover · deck and handrail: the thin metal layer (as the dark metal roof) · ${ADULT}, mean over ${op.n} points along each deck</div>
    <table class="cmp">
      <tr><td></td>${H.map((h) => `<td>${hm(h)}</td>`).join('')}</tr>
      <tr><td>${gl('tmrt', 'Tmrt')} on the open deck</td>${H.map((h) => `<td>${fmt(op.tmrt[h])}</td>`).join('')}</tr>
      <tr><td>${gl('tmrt', 'Tmrt')} on the covered deck</td>${H.map((h) => `<td>${fmt(cv.tmrt[h])}</td>`).join('')}</tr>
      <tr><td>open steel deck, surface</td>${H.map((h) => `<td>${fmt(op.deck[h])}</td>`).join('')}</tr>
      <tr><td>covered steel deck, surface</td>${H.map((h) => `<td>${fmt(cv.deck[h])}</td>`).join('')}</tr>
      <tr><td>handrail, open bridge</td>${H.map((h) => `<td>${fmt(op.rail[h])}</td>`).join('')}</tr>
    </table>
    <p class="note">At 3 pm the cover takes ${fmt(op.tmrt[15] - cv.tmrt[15])} K of Tmrt off the people crossing and keeps the deck at ${fmt(cv.deck[15])} °C instead of ${fmt(op.deck[15])} °C (daily peak of the open deck ${fmt(op.deckPeak)} °C${op.deckPeak > 70 ? ', above the 60–70 °C measured for steel deck surfacing: likely because the plate here loses no heat from below' : ''}). The handrail on the cover's south edge still sees the sun under the eaves.</p>
    <p class="lit">Hong Kong: Tmrt 53.5–68.0 °C on the open sidewalk against 19.9–39.6 °C under a covered walkway, a gap of 19.8–34.8 K; a footbridge itself raised the street's PET by up to 2.7 K in a simulation (Chen et al. 2024). Singapore: covered walkways still in strong heat stress more than 77% of the time (via the brief). Steel deck surfacing: 60–70 °C in summer sun.</p>
    <p class="caveat">The deck plate and the handrail are thin layers heated from above only (no cooling from below or round a tube), so their temperatures are upper bounds; climbing the stairs adds body heat, which is not modelled. The covered deck's sides are open.</p>
    ${srcLine(['chenWalk2024', 'sgWalkway', 'deckSteel', 'brief9'])}`;
}

/** Burn flags. d: {flags (contactFlags at 15:00 with names)}. */
export function burnCard(d) {
  const rows = d.flags.map((f) => `<tr><td>${f.name}</td><td>${fmt(f.ts)} °C</td><td>${f.limit} °C</td><td>${f.min1 ? '<b>above</b>' : 'below'}${f.s1 ? ' · 1 s' : ''}</td></tr>`).join('');
  return `
    ${close}
    <h3>${gl('burnThreshold', 'Contact-burn flags')}: benches, handrails, decks</h3>
    <div class="mat">ISO 13732-1 (via CENELEC Guide 29), bare skin, 1 min of contact${tag(BS.burnMetal)}; the 1-s flag for bare metal at ≈${BS.burn1s.value} °C${tag(BS.burn1s)} · display only</div>
    <table class="cmp">
      <tr><td>material</td><td>1 min</td><td>10 min</td><td>8 h</td></tr>
      <tr><td>metal</td><td>${BS.burnMetal.value} °C</td><td>48 °C</td><td>43 °C</td></tr>
      <tr><td>stone and concrete (glass and ceramics too)</td><td>${BS.burnStone.value} °C</td><td>48 °C</td><td>43 °C</td></tr>
      <tr><td>plastics and wood</td><td>${BS.burnPlastic.value} °C</td><td>48 °C</td><td>43 °C</td></tr>
    </table>
    <table class="cmp">
      <tr><td>surface at 15:00</td><td>model</td><td>1-min limit</td><td>flag</td></tr>
      ${rows}
    </table>
    <p class="note">Press <kbd>U</kbd>: every bench seat, handrail and deck point above its 1-min limit at this hour carries a flag, "1 s" where metal passes about ${BS.burn1s.value} °C. A hand on a rail or a bare leg on a bench stays in contact for seconds to minutes.</p>
    <p class="lit">Bare metal burns in about 1 s at 65–70 °C (unverified); the brief advises reading at least 4 s of contact for older people and children. The US Consumer Product Safety Commission warns that sunlit steel decks can burn in seconds; sunlit metal reached 62 °C in Las Vegas.</p>
    <p class="caveat">The ISO values are for healthy adult skin; the limits depend on the material and the contact time, and the model gives surface temperatures, not skin. Rails and decks are thin plates heated from above only, so their temperatures are upper bounds.</p>
    ${srcLine(['iso13732', 'brief9', 'cpsc', 'lasVegas'])}`;
}

/** Waiting and dose. d: {st, sim}. */
export function waitCard(d) {
  const rows = d.st.stops.map((s) => `<tr><td>${s.id}</td><td>${s.wait15.n}</td><td>${fmt(s.wait15.wait)} min</td><td>${fmt(s.wait15.tmrt)} °C</td><td>${fmt(s.wait15.D)}</td></tr>`).join('');
  return `
    ${close}
    <h3>Waiting: ${gl('headway', 'headway')} and ${gl('heatDose', 'heat dose')}</h3>
    <div class="mat">A bus every ${BS.headway.value} min${tag(BS.headway)}, gaps spread ±${pct(BS.cv.value)} (coefficient of variation${tag(BS.cv)}), service ${BS.service.value}${tag(BS.service)} · riders arrive at random, ${BS.riders.value} a minute at each stop${tag(BS.riders)} · bus clock ${BS.clock.value}× the animation${tag(BS.clock)}</div>
    <table class="cmp">
      <tr><td>mean wait, formula (h / 2)(1 + cv²)</td><td>${fmt(meanWait())} min</td></tr>
      <tr><td>mean wait, simulated (all ${d.sim.n} riders of the day)</td><td>${fmt(d.sim.wait)} min</td></tr>
    </table>
    <table class="cmp">
      <tr><td>stop</td><td>riders 15:00–16:00</td><td>wait</td><td>Tmrt while waiting</td><td>dose, K·min</td></tr>
      ${rows}
    </table>
    <p class="note">The heat dose of a wait is this page's own measure: the minutes spent times how far the apparent temperature (with the sun's radiation) is above ${BS.doseBase.value} °C${tag(BS.doseBase)}, summed. When it is hot, riders take the coolest free place; the rest wait in the sun.</p>
    <p class="lit">Riders arrive at random when buses come every 10–12 min or more often, and then wait about half the headway (Fan &amp; Machemehl 2002, via the brief); in Phoenix most arrived less than 5 min before the bus (Dzyuban et al. 2022). Walking to the stop adds more exposure than the wait (Liu et al. 2025); transit riders are among those most exposed (Fraser &amp; Chester 2017).</p>
    <p class="caveat">No standard heat dose exists for a few minutes of waiting. The brief defines it on UTCI, which this engine does not compute; the apparent temperature of block 4 stands in for it, so the numbers compare stops and are not a measure of risk.</p>
    ${srcLine(['fan2002', 'dzyuban2022', 'liu2025', 'fraser2017', 'bom', 'brief9'])}`;
}

/** Button labels for the panel cards. */
export const BS_CARDS = [
  ['screen', 'West screen vs bigger roof'],
  ['stopA', 'A'],
  ['stopB', 'B'],
  ['stopC', 'C'],
  ['stopD', 'D'],
  ['stopE', 'E'],
  ['kerb', 'Which kerb?'],
  ['wait', 'Waiting and dose'],
  ['bridge', 'Footbridges'],
  ['burn', 'Burn flags'],
  ['phoenix', 'Phoenix stops'],
  ['glass', 'Glass box'],
  ['hk', 'Hong Kong guidance'],
];

const SHIRTS = ['#b5533c', '#3f6e6a', '#c9973f', '#5b6b8c', '#e8e1d0', '#8e4b5e', '#2f3e52', '#d07a5a', '#6f8c52'].map(hexRgb);

/**
 * Riders crossing a footbridge (n per bridge): up the west stairs, across
 * the deck, down the east stairs and back, at 1.1-1.4 m/s; on the deck they
 * carry the deck's point-model heat. Pure function of t.
 */
export function crossersAt(scene, n, t, heatAt) {
  const out = [];
  scene.bridges.forEach((b, bi) => {
    const yc = (b.y0 + b.y1) / 2;
    const xs = b.x0 - 2.1;
    const xe = b.x1 + 2.1;
    const leg = 12;
    const L = leg + (xe - xs) + leg;
    for (let k = 0; k < n; k++) {
      const id = bi * 100 + k;
      const lane = (k % 2 ? -0.6 : 0.6);
      const speed = 1.1 + 0.3 * hash3(id, 7);
      let s = (hash3(id, 8) * 2 * L + speed * t) % (2 * L);
      let dir = 1;
      if (s > L) {
        s = 2 * L - s;
        dir = -1;
      }
      let x;
      let y;
      let z;
      let hx = 0;
      let hy = 0;
      if (s < leg) {
        x = xs;
        y = b.y1 + leg - s;
        z = (b.z * s) / leg;
        hy = -dir;
      } else if (s < leg + (xe - xs)) {
        x = xs + (s - leg);
        y = yc + lane;
        z = b.z;
        hx = dir;
      } else {
        x = xe;
        y = b.y1 + (s - leg - (xe - xs));
        z = b.z * (1 - (s - leg - (xe - xs)) / leg);
        hy = dir;
      }
      const a = { x, y, z, hx, hy, walk: (s / 0.7) % 2, shirt: SHIRTS[(id * 5) % SHIRTS.length], k: 810000 + id, sit: false };
      if (z >= b.z - 1e-9) a.heat = heatAt(b.id, x);
      out.push(a);
    }
  });
  return out;
}

/**
 * The block's plugin for app.js: its controls (waiting places and burn
 * flags, the cards), notes, heat-card rows, renderer hooks, the riders and
 * the API. env: {scene, world, thermal, root, card, R, S, main, query, setup
 * (busSetup), hideCard(), reopen(), redraw(), setModel(T), setNotes(n)}.
 */
export function bsApp(env) {
  const { scene, world, root, card, R, S, main } = env;
  const set = env.setup;
  const P = set.P;
  const pts = world.bus.pts;
  const st = {
    spots: env.query.get('spots') === '1', // ?spots=1, default off
    burn: env.query.get('burn') === '1', // ?burn=1, default off
  };
  const book = riderBook(world, P);
  let fixed = null;
  const bs = () => (fixed ??= busStats(world, set, book));
  let cmp = null;
  const compare = () => (cmp ??= screenCompare(world, set.base));
  let kerb = null;
  const kerbs = () => (kerb ??= kerbCompare(world, set.base));
  let swap = null;
  const swaps = () => (swap ??= roofSwap(world, set.base, ['roofMetal', 'polyClear', 'polyOpal']));
  let sim = null;
  const simWait = () => {
    if (!sim) {
      let n = 0;
      let w = 0;
      for (const d of book.days) for (const r of d.riders) {
        n++;
        w += r.b - r.a;
      }
      sim = { n, wait: w / n };
    }
    return sim;
  };
  const heatCache = new Map();
  const heatOf = (i, hq) => {
    const k = `${i}|${hq}`;
    if (!heatCache.has(k)) {
      if (heatCache.size > 4000) heatCache.clear();
      heatCache.set(k, { tmrt: P.tmrt(i, hq), sunlit: P.body(i, hq) });
    }
    return heatCache.get(k);
  };
  // riders waiting at the stops and crossing the footbridges, added to the main view's walkers (a pure function of the frame and the hour)
  const life = main.life;
  const baseAt = life.at.bind(life);
  const waitersAt = (t, hq) => {
    const c = clockAt(t, hq);
    const out = [];
    scene.stops.forEach((s, si) => {
      for (const w of book.waiting(si, c)) {
        const p = book.places[si][w.place];
        const a = (w.n * 2.4) + hash3(w.rider.id, si, 5) * 0.6;
        const r = w.n ? 0.55 : 0;
        out.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, hx: s.bus.axis === 'x' ? 0 : 1, hy: s.bus.axis === 'x' ? 1 : 0, walk: 0, shirt: SHIRTS[(w.rider.id * 7 + si) % SHIRTS.length], k: 820000 + si * 10000 + w.rider.id, sit: p.seated, bob: hash3(w.rider.id, 4), heat: heatOf(p.i, hq), wait: true, stop: s.id });
      }
    });
    return out;
  };
  const deckHeat = (hq) => (id, x) => {
    const D = decks[id];
    let best = D[0];
    for (const p of D) if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p;
    return heatOf(best.k, hq);
  };
  life.at = (t, hq) => baseAt(t, hq).concat(waitersAt(t, hq), crossersAt(scene, scene.crossers, t, deckHeat(hq)));

  // renderer data
  const decks = Object.fromEntries(scene.bridges.map((b) => [b.id, pts.filter((p) => p.kind === 'deck' && p.bridge === b.id)]));
  // flagged surfaces: the bench seats, the handrails and the middle of each deck
  const flagPts = pts.filter((p) => p.kind === 'bench' || p.kind === 'rail' || (p.kind === 'deck' && p === decks[p.bridge][Math.floor(decks[p.bridge].length / 2)]));
  const flagCache = new Map();
  R.bus = {
    stops: scene.stops,
    buses: (si) => book.days[si].buses,
    clock: (f, hq) => clockAt(f / 60, hq),
    places: () => book.places.flat(),
    headSun: (i, hq) => P.head(i, hq),
    flags: (hq) => {
      if (!flagCache.has(hq)) flagCache.set(hq, flagPts.map((p) => ({ x: p.x, y: p.y, z: p.z, ...contactFlags(P, p.k, hq) })));
      return flagCache.get(hq);
    },
    limits: { metal: BS.burnMetal.value, stone: BS.burnStone.value, s1: BS.burn1s.value },
    hm,
  };
  R.overlay = bsOverlay;

  const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="busstop" aria-label="Bus stop controls">
        <div class="seg">${btn('data-spots', '1', 'waiting places')}${btn('data-burn', '1', 'burn flags')}</div>
        <div class="measures"><div class="hand">Cards (stops A–E)</div>${BS_CARDS.map(([id, label]) => btn('data-card', id, label, id.startsWith('stop') ? `aria-label="Stop ${id.slice(4)}"` : '')).join('')}</div>
      </div>`,
  );
  const el = root.getElementById('busstop');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.spots) setSpots(!st.spots);
    else if (b.dataset.burn) setBurn(!st.burn);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-spots]').setAttribute('aria-pressed', String(st.spots));
    el.querySelector('[data-burn]').setAttribute('aria-pressed', String(st.burn));
  }
  const changed = () => {
    sync();
    env.reopen();
    env.redraw();
  };
  function setSpots(on) {
    st.spots = !!on;
    changed();
  }
  function setBurn(on) {
    st.burn = !!on;
    changed();
  }
  const NAMES = { bench: (p) => `bench seat, stop ${p.stop} (${p.mat})`, rail: (p) => `handrail, ${p.bridge} footbridge`, deck: (p) => `deck at x ${p.x} m, ${p.bridge} footbridge` };
  const flagRows = (h) => flagPts.map((p) => ({ name: NAMES[p.kind](p), ...contactFlags(P, p.k, h) }));
  const misses = () => {
    const A = bs().stops.find((s) => s.id === 'A');
    const g = A.centre[15].ts - bs().air[15];
    return { groundShade: g, groundMiss: g < 0 || g > 8 };
  };
  function html(id) {
    const s = bs();
    if (id === 'screen') {
      const c = compare();
      const C = scene.stops.find((x) => x.id === 'C');
      const sun17 = set.base.sun(17);
      // profile angle on the west end (its normal points west, azimuth 270)
      const phi = Math.atan(Math.tan(sun17.alt * Math.PI / 180) / Math.max(1e-6, Math.cos((sun17.az - 270) * Math.PI / 180))) * 180 / Math.PI;
      return screenCard({ cmp: c, suns: c.hours.map((h) => set.base.sun(h)), phi17: phi, overhang: (C.roof.z - BS.headSeat.value) / Math.tan(phi * Math.PI / 180) });
    }
    if (id.startsWith('stop')) return stopCard({ s: s.stops.find((x) => x.id === id.slice(4)), air: s.air, misses: misses() });
    if (id === 'kerb') return kerbCard({ kerb: kerbs() });
    if (id === 'phoenix') return phoenixCard({ st: s, misses: misses() });
    if (id === 'glass') return glassCard({ st: s });
    if (id === 'hk') return hkCard({ swap: swaps(), cmp: compare() });
    if (id === 'bridge') return bridgeCard({ st: s });
    if (id === 'wait') return waitCard({ st: s, sim: simWait() });
    return burnCard({ flags: flagRows(15) });
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
    const s = bs();
    const c = compare();
    const by = (id) => s.stops.find((x) => x.id === id);
    const [cv, op] = ['covered', 'open'].map((id) => s.bridges.find((b) => b.id === id));
    return {
      c17: c.variants.built[17].tmrt,
      c17no: c.variants.noScreen[17].tmrt,
      c17big: c.variants.bigRoof[17].tmrt,
      a15: by('A').centre[15].tmrt,
      a15open: by('A').open[15].tmrt,
      e15: by('E').centre[15].tmrt,
      e15open: by('E').open[15].tmrt,
      deck15: op.deck[15],
      cdeck15: cv.deck[15],
      d15: by('D').seat[15].tmrt,
    };
  }
  /** The stop (or deck) nearest a grid cell's centre, within 6 m. */
  const nearAt = (i) => {
    const x = ((i % world.n) + 0.5) * world.cell;
    const y = (Math.floor(i / world.n) + 0.5) * world.cell;
    const s = scene.stops.find((S0) => Math.hypot(S0.open[0] - x, S0.open[1] - y) < 6);
    const b = scene.bridges.find((B) => x > B.x0 && x < B.x1 && y > B.y0 - 2.5 && y < B.y1 + 2.5);
    return { s, b, x };
  };
  return {
    notes: () => bsNotes(scene, noteData()),
    look: () => ({ spots: st.spots, burn: st.burn }),
    sync,
    html,
    /** Keyboard: K shows the waiting places, U the burn flags; true if the key was the block's. */
    key(k) {
      if (k === 'k' || k === 'K') setSpots(!st.spots);
      else if (k === 'u' || k === 'U') setBurn(!st.burn);
      else return false;
      return true;
    },
    /** Heat-card rows: at a stop, the point model's Tmrt under the roof and at the kerb now; under a footbridge, its deck now. */
    cardKey: 'busstop',
    cardInfo: (cells, tmrtCell, h, leaf) => {
      if (leaf || tmrtCell === null) return null;
      const { s, b, x } = nearAt(tmrtCell);
      if (s) {
        const c = pts.find((p) => p.kind === 'centre' && p.stop === s.id) ?? pts.find((p) => p.kind === 'slot' && p.stop === s.id && p.seated);
        const o = pts.find((p) => p.kind === 'open' && p.stop === s.id);
        return { stop: s.id, under: P.tmrt(c.k, h), seated: !c.kind.startsWith('c'), open: P.tmrt(o.k, h), head: P.head(c.k, h) };
      }
      if (b) {
        const p = decks[b.id].reduce((a, q) => (Math.abs(q.x - x) < Math.abs(a.x - x) ? q : a));
        return { bridge: b.id, deck: P.ts(p.k, h), tmrt: P.tmrt(p.k, h), limit: BS.burnMetal.value };
      }
      return null;
    },
    cardRows: (f) => (f.stop ? `<tr><td>stop ${f.stop} (point model): ${gl('tmrt', 'Tmrt')} ${f.seated ? 'on the bench' : 'under the roof'} / at the kerb</td><td>${fmt(f.under)} / ${fmt(f.open)} °C (adult)</td></tr><tr><td>${f.seated ? 'seated' : 'standing'} head in direct sun</td><td>${pct(f.head)}</td></tr>` : `<tr><td>${f.bridge} footbridge deck above (point model)</td><td>${fmt(f.deck)} °C · ${f.deck > f.limit ? `<b>above</b> the 1-min metal limit ${f.limit} °C` : `below the 1-min metal limit ${f.limit} °C`}</td></tr><tr><td>${gl('tmrt', 'Tmrt')} on that deck (adult)</td><td>${fmt(f.tmrt)} °C</td></tr>`),
    glossary: () => ({}),
    /** Bus stop block (block 9) only: state {spots, burn}; set() it; numbers for the bands and cards; card HTML; riders and buses; flags. */
    api: {
      state: () => ({ spots: st.spots, burn: st.burn }),
      set(o) {
        if (o.spots !== undefined) setSpots(!!o.spots);
        if (o.burn !== undefined) setBurn(!!o.burn);
      },
      stats: () => bs(),
      compare: () => compare(),
      kerb: () => kerbs(),
      swap: () => swaps(),
      wait: () => ({ formula: meanWait(), ...simWait() }),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#busstop [data-card="${id}"]`)),
      points: () => pts.map((p) => ({ ...p })),
      tmrt: (k, h = S.hour) => P.tmrt(k, h),
      ts: (k, h = S.hour) => P.ts(k, h),
      head: (k, h = S.hour) => P.head(k, h),
      flags: (h = S.hour) => flagPts.map((p) => ({ kind: p.kind, stop: p.stop, bridge: p.bridge, mat: p.mat, ...contactFlags(P, p.k, h) })),
      clock: (frame = S.frame, hour = S.hour) => clockAt(frame / 60, quantHour(hour)),
      waiting: (frame = S.frame, hour = S.hour) => waitersAt(frame / 60, quantHour(hour)).map((a) => ({ stop: a.stop, x: a.x, y: a.y, sit: a.sit, tmrt: a.heat.tmrt, sunlit: a.heat.sunlit })),
      crossers: (frame = S.frame, hour = S.hour) => crossersAt(scene, scene.crossers, frame / 60, deckHeat(quantHour(hour))).map((a) => ({ x: a.x, y: a.y, z: a.z, tmrt: a.heat ? a.heat.tmrt : null })),
      buses: (frame = S.frame, hour = S.hour) => {
        const c = clockAt(frame / 60, quantHour(hour));
        return scene.stops.map((s, si) => busAt(book.days[si].buses, c)).map((b, si) => (b ? { stop: scene.stops[si].id, u: b.u, dwell: b.dwell } : null)).filter(Boolean);
      },
      schedule: (si) => ({ buses: book.days[si].buses.slice(), riders: book.days[si].riders.length }),
      riderStats: (si, h0, h1) => {
        const x = book.stats(si, h0, h1);
        return { n: x.n, wait: x.wait, tmrt: x.tmrt, D: x.D, headSun: x.headSun };
      },
      site: () => ({ ...scene.site }),
    },
  };
}
