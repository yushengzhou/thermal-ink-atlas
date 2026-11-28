// wfui: the overlay of the waterfront block (block 4): margin-note text and
// the cards (the river, the pond at night, the ventilation corridor, the
// sheltered street, riverside shade).
import { SOURCES, BASIS, MODEL } from './materials.js';
import { gl } from './glossary.js';
import { OVERLAY, overlayDT, dayWeight } from './wind.js';
import { rgbCss, clamp, hexRgb, mixRgb } from './core.js';
import { HAND_FONT, labelX } from './render.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const f2 = (v) => v.toFixed(2);
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)}°`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const ref = (k) => `<a href="../../references.html#waterfront">[${k}]</a> ${SOURCES[k]}`;
/** The closed part at the bottom of a card (#29): the model's terms, flags and sources, with links to the references page. */
const experts = (body, keys) => `<details class="expert"><summary>For experts</summary>${body}<p class="src">Sources: ${keys.map(ref).join('; ')}. Made-up block, calculated temperatures: a ${gl('forceRestore', 'force-restore')} surface model on a 5 m grid; the air temperature is fixed, and the wind is a geometric ${gl('windFactor', 'wind factor')}, not computed flow.</p></details>`;
const degs = (v) => `${Math.max(1, Math.round(Math.abs(v)))} degree${Math.round(Math.abs(v)) > 1 ? 's' : ''}`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the app (app.js wfNoteData). */
export function wfNotes(scene, d) {
  const text = {
    river: [`River ${fmt(d.river15)} °C at 3 pm (air ${fmt(d.air15)} °C);`, `its air effect fades within about ${d.reach} m`],
    pond: [`Lily Pond ${fmt(d.pond04)} °C at 4 am,`, `warmer than the ${fmt(d.air04)} °C air`],
    corridor: [`Quay Street, along the wind (${Math.round(d.corridorFw * 100)}% of the open breeze):`, `asphalt ${fmt(d.corridorTs)} °C at 3 pm`],
    sheltered: [`Rope Walk, behind the warehouses (${Math.round(d.shelterFw * 100)}% of it):`, `asphalt ${fmt(d.shelterTs)} °C at 3 pm`],
    shade: [`Under the riverside trees, radiant heat on you ${fmt(d.shadeTmrt)} °C;`, `in the sun beside them ${fmt(d.sunTmrt)} °C`],
  };
  const terms = {
    river: [['surfaceTemp', `River ${fmt(d.river15)} °C at 3 pm`], ['fetch', `fades within about ${d.reach} m`]],
    pond: [['nightLag', `Lily Pond ${fmt(d.pond04)} °C at 4 am`]],
    corridor: [['ventilationCorridor', 'along the wind'], ['windFactor', 'of the open breeze']],
    sheltered: [['sheltering', 'behind the warehouses'], ['windFactor', `${Math.round(d.shelterFw * 100)}% of it`]],
    shade: [['tmrt', 'radiant heat on you']],
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
    <p class="lead">At 3 pm the river is ${fmt(r.t15)} °C, below the ${fmt(r.a15)} °C air, but its cooling reaches only a few tens of metres inland.</p>
    <div class="mat">River surface prescribed; its effect on the air is an illustrative overlay, not simulated</div>
    <table class="cmp">
      <tr><td></td><td>model</td><td>air</td></tr>
      <tr class="t"><td>river surface, 15:00</td><td>${fmt(r.t15)} °C</td><td>${fmt(r.a15)} °C</td></tr>
      <tr><td>river surface, 04:00</td><td>${fmt(r.t04)} °C</td><td>${fmt(r.a04)} °C</td></tr>
      <tr><td>daily range of the river</td><td>${fmt(r.range)}°</td><td></td></tr>
      <tr><td colspan="3" class="sub">Air overlay along the ${gl('fetch', 'wind lines')} by day (illustrative, from literature):</td></tr>
      <tr><td>at the bank (first 2.5 m)</td><td>${K(o.at0)}</td><td></td></tr>
      <tr><td>30 m inland</td><td>${K(o.at30)}</td><td></td></tr>
      <tr><td>80 m inland</td><td>${K(o.at80)}</td><td></td></tr>
    </table>
    <p class="note">Measured urban rivers and canals cool the air beside them only a little and over a short distance. A large river barely warms through the day, so its surface stays below the afternoon air; at night it can be warmer than the air.</p>
    ${experts(`<p class="lit">River Don, Sheffield: about 1 K cooler than the city reference, reaching about 30 m with open banks; vegetated banks about 2 K cooler than paved ones (Hathway &amp; Sharples 2012, via secondary sources). Cheonggyecheon, Seoul: more than 1 K to 70–80 m on one side, about 0.5 K to 30–50 m on the other. Small Dutch water bodies (ENVI-met): −0.2 K typical, −0.6 K at most in the afternoon, "negligible in design" (Jacobs et al. 2020). A review of 27 studies gives about 2.5 K, inflated by satellite surface temperatures (Völker et al. 2013).</p>
    <p class="caveat">The air temperature in this model is fixed, so the river cannot cool the air or anyone in it. The overlay uses ΔT₀ ${OVERLAY.day} K${tag(MODEL.airDay)} and L ${OVERLAY.L} m${tag(MODEL.airL)} (${OVERLAY.Laligned} m in streets along the wind${tag(MODEL.airLaligned)}). The river curve (daily mean air − 2 K, ±0.5 K) is an assumption.</p>`, ['hathway2012', 'cheonggyecheon', 'jacobs2020', 'volker2013', 'webb2008', 'brief4'])}`;
}

/** Pond-at-night card. d: {water, lawn04, overlayNight}. */
export function pondCard(d) {
  const p = d.water.pond;
  return `
    ${close}
    <h3>The still pond at night: warmer than the air</h3>
    <p class="lead">Before dawn the shallow pond is ${fmt(p.t04)} °C, warmer than the ${fmt(p.a04)} °C air: it gives back the day's sun at night.</p>
    <div class="mat">Lily Pond, shallow and still · surface prescribed</div>
    <table class="cmp">
      <tr><td></td><td>pond</td><td>air</td></tr>
      <tr class="t"><td>04:00</td><td>${fmt(p.t04)} °C</td><td>${fmt(p.a04)} °C</td></tr>
      <tr><td>15:00</td><td>${fmt(p.t15)} °C</td><td>${fmt(p.a15)} °C</td></tr>
      <tr><td>daily range of the pond</td><td>${fmt(p.range)}°</td><td></td></tr>
      <tr><td>garden lawn, 04:00</td><td>${fmt(d.lawn04)} °C</td><td></td></tr>
    </table>
    <p class="note">Shallow water soaks up the day's sun and gives it back after dark. Before dawn the pond is the warmest open surface in the garden, a few degrees above the air, while the lawn beside it has cooled below the air.</p>
    ${experts(`<p class="lit">A Delft pond was warmer than the air at night and released about 2.7 MJ m⁻² per night: 43% as longwave radiation, 39% as evaporation, 11% as sensible heat (Solcerova et al. 2019). In Rotterdam, water bodies raise the hottest nights' urban heat island (Steeneveld et al. 2014); in a model, water warmer than the air worsens night-time comfort (Theeuwes et al. 2013).</p>
    <p class="caveat">The pond curve (daily mean air − 0.5 K, ±2 K, peak at 16:00) is an assumption${tag(MODEL.pondCurve)}; that a pond is warmer than the air at night is cited. The air overlay at night is +${OVERLAY.night} K at the river bank${tag(MODEL.airNight)} (the pond's ×${f2(OVERLAY.pond)}), illustrative only.</p>`, ['solcerova2019', 'steeneveld2014', 'theeuwes2013', 'brief4'])}`;
}

/** Ventilation-corridor card. d: {st (windStats), ac (asphaltContrast), hc (hcStats), u}. */
export function corridorCard(d) {
  const c = d.st.corridor;
  return `
    ${close}
    <h3>${gl('ventilationCorridor', 'Ventilation corridor')}: Quay Street</h3>
    <p class="lead">Quay Street points along the wind, so the breeze runs down it: its sunlit asphalt is ${fmt(d.ac.exposed.ts)} °C at 3 pm, against ${fmt(d.ac.sheltered.ts)} °C behind the warehouses.</p>
    <div class="mat">A wide street running south from the river, along the wind</div>
    <table class="cmp">
      <tr><td></td><td>model</td></tr>
      <tr><td>the street's angle to the wind</td><td>${Math.round(c.delta)}°</td></tr>
      <tr class="t"><td>${gl('windFactor', 'share of the open wind')} in the street</td><td>${Math.round(d.st.corridorMean * 100)}%</td></tr>
      <tr><td>wind in the street</td><td>${fmt(d.u * d.st.corridorMean)} m/s</td></tr>
      <tr class="t"><td>sunlit exposed asphalt, 15:00</td><td>${fmt(d.ac.exposed.ts)} °C</td></tr>
      <tr><td>sunlit sheltered asphalt, 15:00</td><td>${fmt(d.ac.sheltered.ts)} °C</td></tr>
    </table>
    <p class="note">A street that points along the wind lets it run in unobstructed, and the walls funnel it a little. A stronger wind carries heat off the pavement faster, so the corridor's asphalt runs cooler than asphalt behind the buildings.</p>
    ${experts(`<p class="lit">Along the Ota River in Hiroshima, river cooling was detectable 150–500 m inland along streets perpendicular to the river, more with wind, wider streets and lower density (AIJ papers, unverified). Planning guides ask for corridors within about 30° of the prevailing wind (Chinese planning criteria; Givoni 20–30°).</p>
    <p class="lit">H/W ${f2(c.hw)} (channelling above ${MODEL.channelHw.value}); f_w ${f2(d.st.corridorMean)}; h_c ${fmt(5.7 + 3.8 * d.u * d.st.corridorMean)} W m⁻² K⁻¹; axis ${Math.round(c.delta)}° off the wind (cut-off 30°).</p>
    <p class="caveat">A geometric heuristic, not a flow solution: f_w = clamp(S × C, 0.3, 1.2) with C = 1 + 0.2 max(0, cos 3δ) in aligned streets with H/W > 0.4 (c_ch, f_min, f_max are assumptions${tag(MODEL.channelC)}). One wind direction (from the river) and speed; no vortices, corner jets or river breezes. The wind changes the surface (via h_c) and the walkers' comfort, not the air temperature.</p>`, ['ota', 'corridor', 'oke1988', 'brief4'])}`;
}

/** Sheltered-street card. d: {st, ac, u, profile: [{d, fw}]}. */
export function shelterCard(d) {
  const s = d.st.shelter;
  return `
    ${close}
    <h3>${gl('sheltering', 'Sheltered street')}: Rope Walk</h3>
    <p class="lead">Behind the warehouses the wind drops, and the sunlit asphalt of Rope Walk is ${fmt(d.ac.sheltered.ts)} °C at 3 pm, ${degs(d.ac.diff)} hotter than in the open breeze.</p>
    <div class="mat">Across the wind, in the lee of the Wharf Warehouses (${d.st.lee01.h} m)</div>
    <table class="cmp">
      <tr><td></td><td>model</td></tr>
      <tr class="t"><td>${gl('windFactor', 'share of the open wind')} in the street</td><td>${Math.round(d.st.shelterMean * 100)}%</td></tr>
      ${d.profile.map((p) => `<tr><td>${p.d} m behind the wall</td><td>${Math.round(p.fw * 100)}%</td></tr>`).join('')}
      <tr><td>local wind there</td><td>${fmt(d.u * d.st.shelterMean)} m/s</td></tr>
      <tr class="t"><td>sunlit sheltered asphalt, 15:00</td><td>${fmt(d.ac.sheltered.ts)} °C (${Math.round(d.ac.sheltered.fw * 100)}% of the wind)</td></tr>
      <tr><td>sunlit exposed asphalt, 15:00</td><td>${fmt(d.ac.exposed.ts)} °C (${Math.round(d.ac.exposed.fw * 100)}% of the wind)</td></tr>
      <tr><td>difference</td><td>${K(d.ac.diff)}</td></tr>
    </table>
    <p class="note">Behind a row of buildings the wind drops and only slowly recovers. With less wind the sunlit asphalt keeps more of its heat: in this model it runs ${fmt(d.ac.diff)} degrees hotter than exposed asphalt at 3 pm.</p>
    ${experts(`<p class="lit">Wind tunnel and CFD studies put the recirculation behind a building at about 1.6–2.6 times its width; streets switch flow regime at H/W about 0.3–0.4 and 0.65–0.7 (Oke 1988, unverified).</p>
    <p class="lit">Rope Walk H/W ${f2(s.hw)}; f_w ${f2(d.st.shelterMean)} (sheltered ${f2(d.ac.sheltered.fw)}, exposed ${f2(d.ac.exposed.fw)}).</p>
    <p class="caveat">S rises linearly from 0.3 at the wall to 1 at 5 building heights downwind; the 5H recovery and f_min 0.3 are assumptions${tag(MODEL.windFmin)}. Part of the difference comes from the narrower street (sky view ${f2(d.ac.sheltered.svf)} vs ${f2(d.ac.exposed.svf)}). Most of it comes from h_c = 5.7 + 3.8 u, a flat-plate fit for the wind just above a surface, fed here with the 10 m wind × f_w: that overstates street-level convection and how strongly it changes with wind, so this contrast is likely too large.${d.ac.diff > 8 || d.ac.diff < 2 ? ` The difference is outside the brief's 2–8 K engine-plausibility band at ${d.u} m/s (reported, not tuned).` : ''}</p>`, ['wake', 'oke1988', 'brief4'])}`;
}

/** Riverside shade card. d: {shadeTmrt, sunTmrt, shadeAT, sunAT, waterAir}. */
export function shadeCard(d) {
  return `
    ${close}
    <h3>Riverside shade: the biggest lever near water</h3>
    <p class="lead">Under the riverside trees the radiant heat on you is ${fmt(d.shadeTmrt)} °C at 3 pm, against ${fmt(d.sunTmrt)} °C in the sun beside them: the shade does more than the river.</p>
    <div class="mat">The promenade under the riverside trees, 15:00</div>
    <table class="cmp">
      <tr><td></td><td>${gl('tmrt', 'radiant heat')}</td><td>${gl('apparentTemp', 'feels like, with the wind')}</td></tr>
      <tr class="t"><td>under the trees</td><td>${fmt(d.shadeTmrt)} °C</td><td>${fmt(d.shadeAT)} °C</td></tr>
      <tr><td>in the sun beside them</td><td>${fmt(d.sunTmrt)} °C</td><td>${fmt(d.sunAT)} °C</td></tr>
      <tr><td>shade minus sun</td><td>${K(d.shadeTmrt - d.sunTmrt)}</td><td>${K(d.shadeAT - d.sunAT)}</td></tr>
      <tr><td>the river's air effect at the bank</td><td colspan="2">${K(d.waterAir)} (illustrative)</td></tr>
    </table>
    <p class="note">The breeze off the river is welcome, but what makes the promenade bearable at 3 pm is the shade of its trees. Walkers here take the tree-shaded, breezy riverside over sunny, sheltered Rope Walk.</p>
    ${experts(`<p class="lit">Jacobs et al. (2020): next to small urban water bodies, PET fell by 0.6 K typically (1.9 K at most), while shade lowered PET by 1–7 K.</p>
    <p class="caveat">Apparent temperature (Steadman 1994, coefficients as given by the Australian Bureau of Meteorology) stands in for UTCI, which is not implemented; wind at the person is u_site × f_w, clamped to 0.5–17 m/s. The extra radiation is linearised as Q = 6.1 (Tmrt − Ta)${tag(MODEL.atRadiation)}: about 30% low in full sun, partly offset by counting the whole body surface, so the absolute apparent temperatures are approximate. The air temperature is fixed.</p>`, ['jacobs2020', 'bom', 'steadman1994', 'brief4'])}`;
}

/** Button labels for the wind panel cards. */
export const WF_CARDS = [
  ['river', 'The river'],
  ['pond', 'Pond at night'],
  ['corridor', 'Ventilation corridor'],
  ['shelter', 'Sheltered street'],
  ['shade', 'Riverside shade'],
];

// ---- the block's overlay in the canvas (moved from render.js; the same drawing) ----
// the water's air overlay (cooling / warming) and the wind-line ink
const AIR_COOL = hexRgb('#3b6573');
const AIR_WARM = hexRgb('#b96d4d');
const WIND_INK = hexRgb('#24354a');
const WIND_GREY = hexRgb('#4a4744'); // heat view: ink grey, not the palette's cool blue (#36)

/**
 * Block 4: the water's illustrative air overlay (a soft band along each wind
 * line, cool by day, warm at night, strength |dTa|) and the pen-drawn wind
 * lines with moving dashes (spacing and speed proportional to u_i), each
 * with a label saying what it is. Vertices hidden behind buildings are
 * skipped. Pure function of (frame, camera, look).
 */
export function drawWind(R, ctx, f, cam, W, H, alpha, look, hq) {
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  const { lines, items } = R.wind;
  const t = f / 60;
  const u = look.u || 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const X = (sp, v) => ox + sp[v * 2] * Z;
  const Y = (sp, v) => oy + sp[v * 2 + 1] * Z;
  const labels = [];
  if (look.air) {
    const wd = dayWeight(R.hourCtx(hq).sun.alt);
    // strength in 6 alpha steps per sign, one path each
    const B = 6;
    const paths = [[], []];
    for (let s = 0; s < 2; s++) for (let b = 0; b < B; b++) paths[s].push([]);
    lines.forEach((L, li) => {
      const sp = items[li].sp;
      for (let v = 0; v + 1 < L.fw.length; v++) {
        if (L.hid[v] || L.hid[v + 1] || L.wet[v + 1]) continue; // over land only
        const dt = overlayDT(L.lam[v], L.kind[v], wd);
        const a = Math.abs(dt);
        if (a < 0.02) continue;
        const b = Math.min(B - 1, Math.floor((a / 1.0) * B));
        paths[dt < 0 ? 0 : 1][b].push(v, li);
      }
    });
    ctx.lineWidth = Math.max(4 * d, 6 * Z);
    for (let s = 0; s < 2; s++) {
      ctx.strokeStyle = rgbCss(s === 0 ? AIR_COOL : AIR_WARM);
      for (let b = 0; b < B; b++) {
        const P = paths[s][b];
        if (!P.length) continue;
        ctx.globalAlpha = alpha * (0.12 + 0.5 * ((b + 0.5) / B));
        ctx.beginPath();
        for (let k = 0; k < P.length; k += 2) {
          const v = P[k];
          const sp = items[P[k + 1]].sp;
          ctx.moveTo(X(sp, v), Y(sp, v));
          ctx.lineTo(X(sp, v + 1), Y(sp, v + 1));
        }
        ctx.stroke();
        R.stats.airSegs += P.length / 2;
      }
    }
    labels.push([wd > 0.5 ? AIR_COOL : AIR_WARM, `Air effect of the water: illustrative, from literature, not simulated (${wd > 0.5 ? 'cooler' : wd < 0.5 ? 'warmer' : 'cooler / warmer'})`]);
  }
  const wInk = mixRgb(WIND_INK, WIND_GREY, look.thermalMix ?? 0);
  if (look.wind) {
    ctx.strokeStyle = rgbCss(wInk);
    ctx.fillStyle = rgbCss(wInk);
    ctx.lineWidth = Math.max(1.6 * d, R.lineBase(cam.z) * 1.9);
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    const heads = [];
    let dashes = 0;
    lines.forEach((L, li) => {
      const sp = items[li].sp;
      // a dash is "on" where frac(phi / u - t) < 0.5 (phi: integral of ds / (4 f_w))
      let on = false;
      for (let v = 0; v + 1 < L.fw.length; v++) {
        if (L.hid[v] || L.hid[v + 1]) {
          on = false;
          continue;
        }
        const p0 = L.phi[v] / u - t;
        const p1 = L.phi[v + 1] / u - t;
        if (p1 <= p0) continue;
        // walk the on / off boundaries inside this segment
        let a = p0;
        while (a < p1) {
          const fr = a - Math.floor(a);
          const inOn = fr < 0.5;
          const next = Math.min(p1, Math.floor(a) + (inOn ? 0.5 : 1));
          const ta = (a - p0) / (p1 - p0);
          const tb = (next - p0) / (p1 - p0);
          if (inOn) {
            const xa = X(sp, v) + (X(sp, v + 1) - X(sp, v)) * ta;
            const ya = Y(sp, v) + (Y(sp, v + 1) - Y(sp, v)) * ta;
            const xb = X(sp, v) + (X(sp, v + 1) - X(sp, v)) * tb;
            const yb = Y(sp, v) + (Y(sp, v + 1) - Y(sp, v)) * tb;
            if (!on) {
              ctx.moveTo(xa, ya);
              dashes++;
            }
            ctx.lineTo(xb, yb);
            on = true;
            // the head of every third dash gets a small arrow
            if (next === Math.floor(a) + 0.5 && next < p1 + 1e-9 && ((Math.floor(a) % 3) + 3) % 3 === 0) heads.push([xb, yb, X(sp, v + 1) - X(sp, v), Y(sp, v + 1) - Y(sp, v)]);
          } else on = false;
          if (next === a) break;
          a = next;
        }
      }
    });
    ctx.stroke();
    const hs = Math.max(2.5 * d, 1.2 * Z);
    ctx.beginPath();
    for (const [x, y, dx, dy] of heads) {
      const L = Math.hypot(dx, dy) || 1;
      const ux = dx / L;
      const uy = dy / L;
      ctx.moveTo(x - ux * hs - uy * hs * 0.6, y - uy * hs + ux * hs * 0.6);
      ctx.lineTo(x, y);
      ctx.lineTo(x - ux * hs + uy * hs * 0.6, y - uy * hs - ux * hs * 0.6);
    }
    ctx.stroke();
    R.stats.windDashes = dashes;
    labels.unshift([wInk, `Wind lines: assumed direction × shelter factor, not computed flow · ${u} m/s from the river`]);
  }
  // labels, bottom centre above the hour bar
  ctx.globalAlpha = alpha;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  labels.forEach(([c, text], k) => {
    const w = ctx.measureText(text).width;
    const by = H - (84 + (labels.length - 1 - k) * 26) * d;
    const bx = labelX(R, w, W, by);
    ctx.fillStyle = 'rgba(248,243,231,0.94)';
    ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
    ctx.strokeStyle = rgbCss(c, 0.7);
    ctx.lineWidth = 0.9 * d;
    ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
    ctx.fillStyle = rgbCss(c);
    ctx.fillText(text, bx, by);
  });
  ctx.restore();
  R.stats.windLabels = labels.map((l) => l[1]);
}

/** Renderer overlay hook (render.js R.overlay): wind lines and the air overlay, when shown. */
export function wfOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  if (R.wind && (look.wind || look.air)) drawWind(R, ctx, f, cam, W, H, alpha, look, hq);
}
