// cbdui: the overlay of the glass CBD block (block 3): margin-note text and
// the cards (street canyon, each glass type, the reflection spot, AC rejected
// heat, the concave-façade extreme case).
import { SOURCES, BASIS, GLASS, GLASS_IDS } from './materials.js';
import { gl } from './glossary.js';
import { glassRho } from './reflect.js';
import { AC } from './cbd.js';
import { iso, hash3, rgbCss, clamp, hexRgb } from './core.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const f2 = (v) => v.toFixed(2);
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)} K`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const ref = (k) => `<a href="../../references.html#glass-cbd">[${k}]</a> ${SOURCES[k]}`;
/** The closed part at the bottom of a card (#29): the model's terms, flags and sources, with links to the references page. */
const experts = (body, keys) => `<details class="expert"><summary>For experts</summary>${body}<p class="src">Sources: ${keys.map(ref).join('; ')}. Made-up block, calculated temperatures: a ${gl('forceRestore', 'force-restore')} surface model on a 5 m grid; the air temperature is fixed, so no canyon air heating, wind or AC heat is felt.</p></details>`;
const hm = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const dg = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}°`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the app (see app.js cbdNoteData). */
const degs = (v) => `${Math.max(1, Math.round(Math.abs(v)))} degree${Math.round(Math.abs(v)) > 1 ? 's' : ''}`;
/** A height-to-width ratio in words: 2.3 -> 'over twice'. */
const times = (x) => `${x - Math.floor(x) > 0.05 ? 'over ' : ''}${['', 'once', 'twice', 'three times', 'four times', 'five times'][Math.floor(x)] ?? `${Math.floor(x)} times`}`;
/** The glass types in plain words (the panel buttons: clear, coated, mirror). */
const PLAIN_GLASS = { clear: 'clear glass', lowe: 'coated glass', mirror: 'mirror glass' };
export function cbdNotes(scene, d) {
  const g = GLASS[d.glass];
  const text = {
    spot: [`Reflection spot: in shade, yet radiant heat on you`, `${fmt(d.spotTmrt)} °C at 3 pm (plain shade ${fmt(d.shadeTmrt)} °C)`],
    glass: [`${d.towerName}, ${PLAIN_GLASS[d.glass] ?? g.name.toLowerCase()}: the 3 pm sun only grazes it;`, `it bounces back ${Math.round(d.rhoNow * 100)}% of that sliver`],
    lane: [`Silk Lane: buildings ${times(d.laneHw)} as tall as it is wide;`, `${fmt(d.lane05)} °C at 5 am, ${degs(d.lag05)} ${d.lag05 < 0 ? 'cooler' : 'warmer'} than open stone`],
    plaza: [`Plaza paving ${fmt(d.plaza15)} °C at 3 pm`],
  };
  const terms = {
    spot: [['reflectionSpot', 'Reflection spot'], ['tmrt', 'radiant heat on you']],
    glass: [['fresnel', `bounces back ${Math.round(d.rhoNow * 100)}% of that sliver`]],
    lane: [['canyon', 'as tall as it is wide'], ['nightLag', `${fmt(d.lane05)} °C at 5 am`]],
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
    <p class="lead">Between the towers the street is in shade most of the day: at 3 pm its floor is ${fmt(D.ts15Shade)} °C, against ${fmt(D.open15)} °C for open asphalt in the sun.</p>
    <table class="cmp">
      <tr><td>Exchange Street and Silk Lane</td><td>here</td><td>in the open</td></tr>
      <tr class="t"><td>Exchange St. floor at 3 pm${D.shadeSince !== null ? `, in shade since ${hm(D.shadeSince)}` : ''}</td><td>${fmt(D.ts15Shade)} °C</td><td>${fmt(D.open15)} °C asphalt in sun</td></tr>
      <tr><td>${gl('tmrt', 'radiant heat')} on you there at 3 pm</td><td>${fmt(D.tmrt15Shade)} °C</td><td></td></tr>
      <tr class="t"><td>Silk Lane floor at 5 am</td><td>${fmt(L.ts05)} °C</td><td>${fmt(L.open05)} °C open stone</td></tr>
      <tr><td>${gl('nightLag', 'slower to cool')}: at 5 am</td><td>${dg(L.lag05)}</td><td>air ${fmt(L.air05)} °C</td></tr>
    </table>
    <p class="note">Tall walls hide the street from the sun for most of the day, so its floor stays far cooler than open paving; the shaded floor here is still warm at 3 pm because it soaked up sun earlier in the day. At night the same walls hide the cold sky: the floor loses heat more slowly than open ground. Towers also push wind down to the street and channel it along it: that is real, but not shown on this page.</p>
    ${experts(`<p class="lit">Silk Lane: ${gl('canyon', 'H/W')} ${fmt(L.hw)}, ${gl('svf', 'sky view factor')} ${f2(L.svf)} on the lane floor (endless canyon ${f2(L.svfCanyon)}); night lag ${K(L.lag05)} at 05:00.</p><p class="lit">Literature: Oke (1981) found calm-night city–country air differences of about 7.45 + 3.97 ln(H/W) K, i.e. about ${fmt(7.45 + 3.97 * Math.log(L.hw))} K at H/W ${fmt(L.hw)} (air, not surface; coefficients from a secondary source; the relation breaks down at high H/W, Theeuwes et al. 2014). In Fez a canyon with H/W about 10 was about 6 K, up to 10 K, cooler by day (Johansson 2006).</p>
    <p class="caveat">The night lag here is an engine result: walls are held at air + 2 K at night (they do not store heat), and the air temperature is fixed, so the canyon's warmer air is not modelled. One wind speed for the whole block: no channelling, vortices or tower downdraughts. Sky view factor from a 32-direction horizon scan on the 5 m grid. <span class="unv">unverified</span></p>`, ['oke1981', 'theeuwes2014', 'johansson2006', 'brief3'])}`;
}

/**
 * Glass card for one type. st: {h12, h15} spotStats() for that glass;
 * face: {name, theta15} the façade quoted.
 */
export function glassCard(id, st, face) {
  const g = GLASS[id];
  const row = (r) => (r.n ? `<tr class="t"><td>${r.h}:00</td><td>${dg(r.dTmrt)}</td><td>${dg(r.dTmrtMax)}</td></tr><tr><td></td><td class="sub" colspan="2">${r.n} places (5 m squares) in the patch; radiant heat on you in a patch in shade ${fmt(r.tmrtSpotShade)} °C against ${fmt(r.tmrtShade)} °C in plain shade</td></tr>` : `<tr><td>${r.h}:00</td><td colspan="2">no reflected patch on the street</td></tr>`);
  const rhoAt = (th) => f2(glassRho(g.rho0.value, th));
  return `
    ${close}
    <h3>${g.name}${id === 'lowe' ? ' (coated glass)' : ''}</h3>
    <p class="lead">At 3 pm the sun only grazes the ${face.name} (it comes in ${Math.round(face.theta15)}° off straight-on), so just a sliver of sunlight reaches it; of that sliver the glass bounces ${Math.round(glassRho(g.rho0.value, face.theta15) * 100)}% back down onto the street${st.h15.n ? `, and people in the bright patch get about ${Math.max(1, Math.round(st.h15.dTmrt))} degrees more ${gl('tmrt', 'radiant heat')}` : ''}. At such a glancing angle every kind of glass bounces most of it, so the glass type matters little here.</p>
    <table class="cmp">
      <tr><td>in the bright reflected patch</td><td>hotter, on average</td><td>at most</td></tr>
      ${row(st.h12)}
      ${row(st.h15)}
    </table>
    <p class="sub">Compared with the same glass with its mirror reflection switched off, same places. The patch is drawn on the street (the glass switch moves and dims it).</p>
    <p class="note">${g.note}</p>
    ${experts(`<table>
      <tr><td>reflectance ρ₀, head-on</td><td>${g.rho0.value}${tag(g.rho0)}</td></tr>
      <tr><td>${gl('fresnel', 'at 45° / 70° / 80°')}</td><td>${rhoAt(45)} / ${rhoAt(70)} / ${rhoAt(80)}</td></tr>
      <tr><td>${face.name}, 15:00 (θ ${Math.round(face.theta15)}°)</td><td>${rhoAt(face.theta15)}</td></tr>
      <tr><td>solar absorptance</td><td>${g.absorb.value}${tag(g.absorb)}</td></tr>
      <tr><td>${gl('emissivity', 'emissivity ε')}</td><td>${g.eps.value}${tag(g.eps)}</td></tr>
      <tr><td>glass surface, 15:00 (${face.face} face)</td><td>${fmt(face.tg15)} °C</td></tr>
    </table>${id === 'lowe' ? '<p class="lit">Singapore caps the daylight reflectance of façade glass at 20% (BCA Approved Document, Section P).</p>' : ''}
    <p class="caveat">Low-e and mirror reflectances are mid-range values from the brief; no product datasheet was checked (see the LBNL IGDB). The angular shape is exact Fresnel for clear glass, applied to coated glass in the EnergyPlus form R(0)(1 − ρ̄) + ρ̄ (EnergyPlus would use a bronze-glass curve for some coated products); coated glass can differ by up to about 8% at 60°. Glass surface temperature is the brief's simple balance, Ta + a_g I_f / (h_o + h_i) with I_f = I cosθ + 0.5 D, with no measurement behind it. <span class="unv">unverified</span></p>`, ['fresnel', 'energyplus', 'igdb', 'bca', 'en673', 'brief3'])}`;
}

/** The reflection-spot card: out of the sun, still hot. st: spotStats() at 15:00 for the current glass. */
export function spotCard(st, id) {
  const g = GLASS[id];
  return `
    ${close}
    <h3>${gl('reflectionSpot', 'Reflection spot')}: out of the sun, still hot</h3>
    <p class="lead">Standing in a tower's shade but in the sunlight its glass bounces down, the radiant heat on you is ${fmt(st.tmrtSpotShade)} °C at 3 pm, against ${fmt(st.tmrtShade)} °C in plain shade.</p>
    <table class="cmp">
      <tr><td>${g.name}, 3 pm</td><td>${gl('tmrt', 'radiant heat on you')}</td></tr>
      <tr><td>plain building shade</td><td>${fmt(st.tmrtShade)} °C</td></tr>
      <tr class="t"><td>reflection spot in shade</td><td>${fmt(st.tmrtSpotShade)} °C</td></tr>
      <tr><td>full sun</td><td>${fmt(st.tmrtSun)} °C</td></tr>
      <tr class="t"><td>reflection spot in sun</td><td>${fmt(st.tmrtSpotSun)} °C</td></tr>
      <tr><td>the patch against the same place without it, mean / most</td><td>${dg(st.dTmrt)} / ${dg(st.dTmrtMax)}</td></tr>
      <tr><td>paving in a shaded patch, against without it</td><td>${dg(st.tsSpotShade - st.tsSpotShadeOff)}</td></tr>
    </table>
    <p class="note">A flat glass façade in sun acts as a second, dimmer sun low in the sky. Its ${gl('specular', 'mirror reflection')} lands as a moving patch on the street, often in the shade of another building: people there are out of the sun but still take in much of its heat. Walkers here treat a spot as partly sunny and keep out of it when they can.</p>
    ${experts(`<p class="lit">Field data (Chengdu, Chunxi Road, August 2023): reflection zones Tmrt +4 to +13 °C, air +1–2 °C, UTCI +2–5 °C, peak Tmrt 73.9 °C (Du et al. 2025). Wallenberg et al. (2026), who give SOLWEIG walls an albedo of 0.5, note that Tmrt is highest in front of sunlit façades.</p>
    <p class="caveat">${st.dTmrtMax > 13 ? `The largest rise here (${K(st.dTmrtMax)}) is above the field range. ` : ''}Glass here is ideally flat and frameless, and Fresnel reflectance climbs steeply at grazing angles (over 0.5 beyond 80°), so façades lit edge-on send strong, thin spots, and a cell can be lit by two façades at once; mullions and pane distortion that break these up are not modelled. The ground under a spot also warms, which adds to Tmrt. Single bounce only (a second bounce off the opposite façade, ρ² of the beam, is ignored); air temperature is fixed (the measured air warming is not modelled). <span class="unv">unverified</span></p>`, ['du2025', 'wallenberg2026', 'fresnel', 'brief3'])}`;
}

/** AC rejected-heat card (information overlay only). */
export function acCard() {
  const q = 100;
  return `
    ${close}
    <h3>${gl('acHeat', 'AC rejected heat')}: shown, not felt</h3>
    <p class="lead">Air conditioners push the offices' heat out into the street air; this page only marks where it leaves the towers.</p>
    <p>An air conditioner pumps the heat out of the offices and adds its own electricity: rejected heat = cooling × (1 + 1/COP). At COP ${AC.cop}, every ${q} W of cooling puts about ${Math.round(AC.rejected(q, AC.cop))} W into the street air.</p>
    <table class="cmp">
      <tr><td>dense urban areas</td><td>${AC.dense[0]}–${AC.dense[1]} watts per m² of ground, sometimes over 100</td></tr>
      <tr><td>central Tokyo, daytime</td><td>over ${AC.tokyo} watts per m²</td></tr>
    </table>
    <p class="note">The plumes on the roofs mark where this heat leaves the towers.</p>
    <p class="caveat"><b>Not felt in this model:</b> the air temperature is a fixed design-day curve, so waste heat cannot warm the street or anyone in it, and it is not added to any surface or radiant-heat value.</p>
    ${experts('<p class="caveat">Not added to any surface temperature or Tmrt. No figure per m² of office floor was found for a CBD like this one.</p>', ['xie2016', 'sailor2011'])}`;
}

/** Extreme case: concave façades (out of scope). */
export function extremeCard() {
  return `
    ${close}
    <h3>The extreme case: concave glass</h3>
    <p class="lead">A curved glass tower can focus sunlight like a magnifying glass; every tower here has flat faces, so this page does not model it.</p>
    <p>A <b>flat</b> façade sends back a copy of the sun no stronger than the sun itself times its reflectance: in this block no spot ever gets more than the façades that face it can send.</p>
    <p>A <b>concave</b> façade focuses the reflection. 20 Fenchurch Street in London ("the Walkie-Talkie", 2013) concentrated sunlight onto the street opposite; a later simulation put the peak at 3,384 watts per m² (worst case 4,176), several times direct sunshine (Zhu, Jahn &amp; Rein 2018). The curved Vdara hotel in Las Vegas made a hot zone on its pool deck in 2010 (press reports, anecdotal). Scale models: concave façades raised pedestrian-level sunshine by more than 300%, flat mirrors by more than 100%, diffuse façades by at most 30% (Speroni et al. 2022).</p>
    ${experts('<p class="lit">Flat façades: at most the sum of ρ I sinβ over the façades that face a spot.</p><p class="caveat">Concave and curved façades are out of scope here: every tower in this block has flat faces.</p>', ['zhu2018', 'vdara', 'speroni2022'])}`;
}

/** Button labels for the glass panel cards. */
export const CBD_CARDS = [
  ['canyon', 'Street canyon'],
  ...GLASS_IDS.map((id) => [`glass-${id}`, GLASS[id].name]),
  ['spot', 'Reflection spot'],
  ['ac', 'AC rejected heat'],
  ['extreme', 'Extreme case: concave glass'],
];

// ---- the block's overlay in the canvas (moved from render.js; the same drawing) ----
const AC_INK = hexRgb('#8a2f22');

/**
 * AC overlay (block 3, information only): rooftop plant on each tall
 * building with a rising heat plume, and one label saying the model does not
 * feel this heat. Pure function of (frame, camera).
 */
export function drawAc(R, ctx, f, cam, W, H, alpha) {
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  let label = null;
  for (const B of R.world.buildings) {
    if (B.h < 25) continue;
    const units = 1 + Math.floor(((B.x1 - B.x0) * (B.y1 - B.y0)) / 2500);
    for (let u = 0; u < Math.min(3, units); u++) {
      const x = B.x0 + (B.x1 - B.x0) * (0.25 + 0.5 * hash3(B.index, u, 61));
      const y = B.y0 + (B.y1 - B.y0) * (0.25 + 0.5 * hash3(B.index, u, 62));
      const p = iso(x, y, B.h + 1.5);
      const X = ox + p[0] * Z;
      const Y = oy + p[1] * Z;
      if (X < -40 || X > W + 40 || Y < -80 || Y > H + 40) continue;
      if (R.clip && (X < R.clip[0] || X > R.clip[1])) continue;
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = rgbCss(AC_INK);
      ctx.lineWidth = 1.1 * d;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const x0 = X + (k - 1) * 4 * d;
        for (let i = 0; i <= 10; i++) {
          const v = i / 10;
          const yy = Y - v * 26 * d;
          const xx = x0 + Math.sin(v * 7 + f * 0.08 + k * 1.7 + u) * 2.2 * d * (0.4 + v);
          if (i) ctx.lineTo(xx, yy);
          else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
      if (!label || Y < label[1]) label = [X, Y - 30 * d];
    }
  }
  if (label) {
    ctx.globalAlpha = alpha;
    ctx.font = `${Math.round(14 * d)}px "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive`;
    ctx.textBaseline = 'bottom';
    const text = 'AC rejected heat — not felt in this model';
    const w = ctx.measureText(text).width;
    const bx = clamp(label[0] - w / 2, 8 * d, W - w - 8 * d);
    const by = Math.max(24 * d, label[1]);
    ctx.fillStyle = 'rgba(248,243,231,0.94)';
    ctx.fillRect(bx - 5 * d, by - 19 * d, w + 10 * d, 23 * d);
    ctx.strokeStyle = 'rgba(138,47,34,0.7)';
    ctx.lineWidth = 0.9 * d;
    ctx.strokeRect(bx - 5 * d, by - 19 * d, w + 10 * d, 23 * d);
    ctx.fillStyle = rgbCss(AC_INK);
    ctx.fillText(text, bx, by);
  }
  ctx.restore();
  R.stats.ac = !!label;
}

/** Renderer overlay hook (render.js R.overlay): the AC plumes, when shown. */
export function cbdOverlay(R, ctx, f, cam, W, H, alpha, look) {
  if (look.ac) drawAc(R, ctx, f, cam, W, H, alpha);
}
