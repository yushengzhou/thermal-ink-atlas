// retroui: the Before / After overlay of a retrofit block: margin-note text,
// measure cards, the reflective-pavement trade-off card, the sponge-city card
// and the split divider drawn on the canvas.
import { rgbCss, noise1, INK } from './core.js';
import { SOURCES } from './materials.js';
import { gl } from './glossary.js';
import { MEASURES, measureStats } from './retrofit.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)} K`;

/** Margin notes (at most 5) for the retrofit block: text lines and glossary terms. */
export function retrofitNotes(scene, B, A, d, aged) {
  const P = scene.probes;
  const at = (V, k, h) => V.thermal.tsAt(P[k][0], P[k][1], h);
  const cellOf = (k) => A.world.cellIndex(P[k][0], P[k][1]);
  const roofA = A.thermal.info.mats.coolroofR;
  const coat = measureStats(MEASURES.find((m) => m.id === 'coating'), B.world, B.thermal, A.world, A.thermal, [12]).h12;
  const dLabel = d === 0 ? 'a clear day after overnight rain' : `${d} day${d === 1 ? '' : 's'} after rain`;
  const text = {
    roofs: [`Cool roof (${aged ? 'aged' : 'new'}, albedo ${roofA.alpha.value.toFixed(2)}): ${fmt(at(A, 'coolRoof', 15))} °C at 3 pm,`, `was ${fmt(at(B, 'coolRoof', 15))} °C as a dark membrane`],
    coating: ['Coated Canal Street at noon: road', `${K(coat.dTs)}, but ${K(coat.dTmrt)} Tmrt for people on it`],
    square: [`Permeable pavers, ${dLabel}:`, `${fmt(A.thermal.ts(cellOf('square'), 15))} °C at 3 pm (asphalt was ${fmt(B.thermal.ts(cellOf('square'), 15))} °C)`],
    trees: ['Young street trees: thin shade, but they', 'are what cools the walkers here'],
    green: [`Green roof ${fmt(at(A, 'greenRoof', 15))} °C at 3 pm,`, `was ${fmt(at(B, 'greenRoof', 15))} °C`],
  };
  const terms = {
    roofs: [['coolRoof', 'Cool roof'], ['albedoAgeing', aged ? 'aged' : 'new']],
    coating: [['tmrt', 'Tmrt']],
    square: [['permeablePaving', 'Permeable pavers'], ['daysSinceRain', dLabel]],
    trees: [],
    green: [['greenRoof', 'Green roof']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated; air temperature is the same in both states, so no air cooling is modelled.</p>`;

/** Unverified inputs behind a measure (material parameter names). */
function unverified(m, mats) {
  const mat = m.young ? mats.youngCanopy : mats[m.mat];
  const keys = ['alpha', 'eps', 'mu', 'muWet', 'ef', 'efWet', 'tau'].filter((k) => mat[k] && !mat[k].verified);
  const names = { alpha: 'albedo', eps: 'emissivity', mu: 'admittance', muWet: 'wet admittance', ef: 'dry evaporative fraction', efWet: 'wet evaporative fraction', tau: 'drying time τ' };
  const out = keys.map((k) => names[k]);
  if (m.young) out.push('crown transmission 0.47 (LAI 1.5)', 'crown size r 2.6 m, height 4.4 m (engine assumption)');
  return out;
}

/** Card HTML for one measure. st: measureStats(); mats: After material table. */
export function measureCard(m, st, mats, d, aged) {
  const mat = m.young ? mats.youngCanopy : mats[m.mat];
  const row = (h) => {
    const r = st[`h${h}`];
    if (!r.n) return `<tr><td>${h}:00</td><td colspan="2">no cells in full sun</td></tr>`;
    const tm = m.roof ? '<td class="sub">roof</td>' : `<td>${K(r.dTmrt)}</td>`;
    return `<tr class="t"><td>${h}:00</td><td>${K(r.dTs)}</td>${tm}</tr><tr><td></td><td class="sub" colspan="2">surface ${fmt(r.before)} → ${fmt(r.after)} °C${m.roof ? '' : `; Tmrt ${fmt(r.tmrtBefore)} → ${fmt(r.tmrtAfter)} °C`}</td></tr>`;
  };
  const wet = mat.efWet ? `<p class="sub">${gl('daysSinceRain', 'Days since rain')} d = ${d}: ${gl('ef', 'evaporative fraction')} ${mat.ef.value.toFixed(2)} (wet ${mat.efWet.value}, dry ${mat.dry.ef.value}, τ ${mat.tau.value} d).</p>` : '';
  const age = m.mat === 'coolroofR' || m.mat === 'coolPave' ? `<p class="sub">Materials: ${aged ? 'aged' : 'new'}, ${gl('albedo', 'albedo')} ${mat.alpha.value.toFixed(2)} (${gl('albedoAgeing', 'aged vs new')}).</p>` : '';
  const unv = unverified(m, mats);
  return `
    <button class="x" aria-label="close">×</button>
    <h3>${m.name}</h3>
    <div class="mat">After minus Before, same cells, simulated</div>
    <table class="cmp">
      <tr><td></td><td>${gl('surfaceTemp', 'surface')} ΔTs</td><td>${gl('tmrt', 'person')} ΔTmrt</td></tr>
      ${row(12)}
      ${row(15)}
    </table>
    ${wet}${age}
    <p class="note">${m.line}</p>
    ${m.lesson ? `<p class="caveat"><b>${m.lesson}</b></p>` : ''}
    <p class="lit">${m.lit}</p>
    ${unv.length ? `<p class="caveat">Unverified inputs: ${unv.join(', ')} <span class="unv">unverified</span></p>` : ''}
    ${srcLine(m.sources)}`;
}

/**
 * The reflective-pavement trade-off card. st: {new, aged} noon stats of the
 * coating measure; matsNew / matsAged: material tables for the two coatings.
 */
export function tradeoffCard(st, matsNew, matsAged) {
  const row = (label, r) => `<tr class="t"><td>${label}</td><td>${K(r.dTs)}</td><td>${K(r.dTmrt)}</td></tr>`;
  return `
    <button class="x" aria-label="close">×</button>
    <h3>Reflective pavement: cools the road, not the person</h3>
    <div class="mat">Canal Street coating vs the old asphalt (${gl('albedo', 'albedo')} 0.12), noon, simulated</div>
    <table class="cmp">
      <tr><td>coating</td><td>road ΔTs</td><td>person ΔTmrt</td></tr>
      ${row(`new, α ${matsNew.coolPave.alpha.value}`, st.new)}
      ${row(`1 year, α ${matsAged.coolPave.alpha.value}`, st.aged)}
    </table>
    <p class="note">The light coating sends more sunshine back up, and part of it lands on people. The road gets cooler; a person standing on it gets more radiant heat at midday. Pair reflective paving with shade, such as trees or awnings.</p>
    <p class="lit">Literature (Los Angeles): road −4 to −6 K, pedestrian Tmrt about +4 K at midday, with +118 W m⁻² more reflected sunshine (Middel et al. 2020). Neighbourhood scale: surface up to −5 K in the afternoon, air only −0.2 K (Ko et al. 2022).</p>
    <p class="caveat">Known under-estimate: walls reflect no sunlight in this model, so light bounced onto the pavements from building faces is missing (Middel saw +20–30 W m⁻² on sidewalks in the evening). Coating albedos are <span class="unv">unverified</span></p>
    ${srcLine(['middel2020', 'ko2022'])}`;
}

/** Sponge-city guide card (text only; the block does not model rain or runoff). */
export function spongeCard() {
  return `
    <button class="x" aria-label="close">×</button>
    <h3>${gl('spongeCity', 'Sponge city')}</h3>
    <div class="mat">State Council General Office guideline, October 2015 (国办发〔2015〕75号)</div>
    <p>Manage rain where it falls: let it soak in, slow it, store it, clean it, use it, and only then drain it — <span lang="zh">渗、滞、蓄、净、用、排</span>. The tools are the ones in this block: ${gl('greenRoof', 'green roofs')}, ${gl('permeablePaving', 'permeable paving')}, ${gl('rainGarden', 'rain gardens')}, and wetlands and parks at larger scale.</p>
    <p>Target: absorb and use <b>70% of rainfall</b> on site, applied as a control rate for total annual runoff (年径流总量控制率); <b>20%</b> of built-up area by 2020 and <b>80%</b> by 2030.</p>
    <p class="note">The goals are flooding and water supply first; cooling is a co-benefit. No robust measured block-scale cooling figure for sponge-city retrofits was found, so this page does not quote one. Rain and runoff are not modelled here, only the drying of wet surfaces.</p>
    <p class="caveat">The primary Chinese text of the guideline was not located; the summary follows the English notice and a reprint <span class="unv">unverified</span></p>
    ${srcLine(['sponge2015'])}`;
}

/**
 * Split divider: an inked vertical line with a hand-drawn handle and the two
 * state labels. Pure function of (x, height, sides). dpr scales sizes.
 */
export function drawDivider(ctx, x, H, dpr, left, right) {
  const ink = rgbCss(INK);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  // paper gutter, then a double ink line with a slight wobble
  ctx.fillStyle = 'rgba(243,236,221,0.85)';
  ctx.fillRect(x - 2 * dpr, 0, 4 * dpr, H);
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  for (const [off, lw, seed] of [[-1.6, 1.3, 3], [1.6, 0.8, 7]]) {
    ctx.lineWidth = lw * dpr;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 6 * dpr) {
      const xx = x + off * dpr + 0.6 * dpr * noise1(y / (40 * dpr), seed);
      if (y === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  // handle
  const hy = H * 0.5;
  const r = 15 * dpr;
  ctx.fillStyle = '#fbf7ee';
  ctx.lineWidth = 1.5 * dpr;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = r * (1 + 0.04 * noise1(i * 0.8, 11));
    const px = x + Math.cos(a) * rr;
    const py = hy + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.4 * dpr;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(x + s * 4 * dpr, hy - 5 * dpr);
    ctx.lineTo(x + s * 9 * dpr, hy);
    ctx.lineTo(x + s * 4 * dpr, hy + 5 * dpr);
  }
  ctx.stroke();
  // labels
  ctx.font = `${Math.round(17 * dpr)}px "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive`;
  ctx.textBaseline = 'middle';
  const ly = H * 0.5 - 36 * dpr;
  for (const [label, side] of [[left, -1], [right, 1]]) {
    const w = ctx.measureText(label).width;
    const bx = side < 0 ? x - 12 * dpr - w : x + 12 * dpr;
    ctx.fillStyle = 'rgba(251,247,238,0.92)';
    ctx.fillRect(bx - 6 * dpr, ly - 12 * dpr, w + 12 * dpr, 24 * dpr);
    ctx.lineWidth = 0.9 * dpr;
    ctx.strokeStyle = 'rgba(43,38,33,0.6)';
    ctx.strokeRect(bx - 6 * dpr, ly - 12 * dpr, w + 12 * dpr, 24 * dpr);
    ctx.fillStyle = label === 'After' ? '#3f6e6a' : '#8a2f22';
    ctx.fillText(label, bx, ly + 1 * dpr);
  }
  ctx.restore();
}
