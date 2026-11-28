// esui: the overlay of the older high-rise estate (block 7): the season and
// condenser controls, margin notes, the cards (spacing for winter sun, the
// July courtyard, the point towers, the condensers, lawns and paving), the
// heat-card rows and the block's API, as a block plugin for app.js.
import { SOURCES, BASIS } from './materials.js';
import { gl } from './glossary.js';
import { ES, estateStats, winterSite, acShare, siteHeat, exhaustDT, qRej, flatsOf, faceKw, courtShade, sunAtSolar, shadowDepth, effHeight, slabRule, plumeShares, tsMean, tmrtMean, svfSlope } from './estate.js';
import { esOverlay, hidden } from './eskit.js';
import { DEG } from './core.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const r0 = (v) => String(Math.round(v));
const pct = (v) => `${Math.round(v * 100)}%`;
const K = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}°`;
const hm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60) % 60).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const ref = (k) => `<a href="../../references.html#estate">[${k}]</a> ${SOURCES[k]}`;
/** The closed part at the bottom of a card (#29): the model's terms, flags and sources, with links to the references page. */
const experts = (body, keys) => `<details class="expert"><summary>For experts</summary>${body}<p class="src">Sources: ${keys.map(ref).join('; ')}. Made-up block, calculated temperatures: a ${gl('forceRestore', 'force-restore')} surface model on a 5 m grid; the air temperature is fixed.</p></details>`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the plugin (noteData). */
export function esNotes(scene, d) {
  const text = {
    courtyard: [`July noon: a slab's shadow reaches ${r0(d.julDepth)} m`, `into the ${scene.gap} m courtyard; parking ${fmt(d.court12)} °C`],
    sill: [`大寒 rule: ≥ ${ES.ruleHours.value} h of winter sun at the sill;`, `the ground-floor sills here get ${fmt(d.ruleMin)}–${fmt(d.ruleMax)} h`],
    ac: [`AC condensers: ${fmt(d.qRej)} kW each, air out ${r0(d.dtExh)} degrees warmer;`, `${r0(d.peakWm2)} watts per m² over the site at ${String(d.peakH).padStart(2, '0')}:00`],
    tower: [`30-floor tower: noon shadow ${r0(d.towerJul)} m in July,`, `${r0(d.towerJan)} m on 大寒`],
    lawn: [`Worn lawn ${fmt(d.lawn15)} °C, sunlit paving ${fmt(d.pave15)} °C`, 'at 3 pm (Wuhan measured about 10 degrees apart)'],
  };
  const terms = {
    courtyard: [['spacingCoefficient', `${scene.gap} m courtyard`]],
    sill: [['sunlightRule', '大寒 rule'], ['effectiveHeight', 'ground-floor sills']],
    ac: [['condenserHeat', 'AC condensers'], ['eer', `${fmt(d.qRej)} kW each`]],
    tower: [['svf', '30-floor tower']],
    lawn: [['surfaceTemp', `Worn lawn ${fmt(d.lawn15)} °C`]],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** A north-south section of two slab rows with the noon sun of 20 July and 大寒 (inline SVG, no external refs). */
export function sectionSvg(H, G, depth, jul, jan) {
  const s = 240 / (G + 30);
  const gx = 20;
  const gy = 108;
  const a = gx + 15 * s; // north face of the southern slab (drawn on the left; south is left)
  const b = a + G * s; // south face of the northern slab
  const hh = H * s;
  const ray = (alt, cls) => {
    const L = hh / Math.tan(alt * DEG);
    return `<line x1="${gx + 15 * s}" y1="${gy - hh}" x2="${a + L}" y2="${gy}" stroke="${cls}" stroke-width="1" stroke-dasharray="3 2"/>`;
  };
  return `<svg viewBox="0 0 300 120" width="100%" font-size="9" fill="#2b2621" role="img" aria-label="Section: the noon sun of 20 July and 大寒 over two slab rows">
    <line x1="4" y1="${gy}" x2="296" y2="${gy}" stroke="#2b2621" stroke-width="1.2"/>
    <rect x="${gx}" y="${gy - hh}" width="${15 * s}" height="${hh}" fill="#d9cbb4" stroke="#2b2621"/>
    <rect x="${b}" y="${gy - hh}" width="${15 * s}" height="${hh}" fill="#cfc4b0" stroke="#2b2621"/>
    <rect x="${a}" y="${gy}" width="${depth.jan * s}" height="5" fill="#3b5f86" opacity=".45"/>
    <rect x="${a}" y="${gy}" width="${depth.jul * s}" height="5" fill="#a2452f" opacity=".7"/>
    ${ray(jul, '#a2452f')}${ray(jan, '#3b5f86')}
    <text x="${a + 4}" y="${gy - hh + 12}">20 Jul noon ${fmt(jul)}°</text>
    <text x="${a + 4}" y="${gy - hh + 26}" fill="#3b5f86">大寒 noon ${fmt(jan)}°</text>
    <text x="${gx}" y="${gy + 12}">S</text><text x="${b + 15 * s - 8}" y="${gy + 12}">N</text>
    <text x="${(a + b) / 2 - 20}" y="${gy + 12}">G = ${r0(G)} m</text>
  </svg>`;
}

/** Spacing for winter sun. d: {st, G, rows: [{label, min, mean}], k}. */
export function ruleCard(d) {
  const st = d.st;
  const H = st.H;
  const jul = st.jul.depth * H;
  const jan = st.jan.depth * H;
  return `
    ${close}
    <h3>${gl('sunlightRule', 'Spacing made for winter sun')}</h3>
    <p class="lead">The rows of flats are spaced so every ground-floor home gets at least ${ES.ruleHours.value} hours of winter sun; in July the same spacing leaves the courtyards in full sun.</p>
    <div class="mat">18-floor slabs, ${fmt(H)} m high, rows ${r0(d.G)} m apart</div>
    ${sectionSvg(H, d.G, { jul, jan }, st.jul.alt, st.jan.alt)}
    <table class="cmp">
      <tr><td></td><td>20 July</td><td>大寒 (20 Jan)</td></tr>
      <tr><td>sun at solar noon</td><td>${fmt(st.jul.alt)}°</td><td>${fmt(st.jan.alt)}°</td></tr>
      <tr><td>a slab's noon shadow, north of it</td><td>${r0(jul)} m (${st.jul.depth.toFixed(3)} H)</td><td>${r0(jan)} m (${st.jan.depth.toFixed(2)} H)</td></tr>
      ${d.rows.map((r) => `<tr><td>${r.label}: 大寒 sun at the ground-floor sills, lowest / mean</td><td colspan="2">${fmt(r.min)} / ${fmt(r.mean)} h</td></tr>`).join('')}
    </table>
    <p class="note">The rows are spaced so that every ground-floor flat gets at least ${ES.ruleHours.value} hours of sun on 大寒, the Great Cold day, between 08:00 and 16:00 solar time. In July the noon sun is so high that the same slab throws a shadow only ${r0(jul)} m deep: the courtyard behind it lies in full sun for most of the day. Spacing made for winter sun leaves summer courtyards open. The 大寒 shadows button (S) shows the winter shadows and the sill tallies.</p>
    ${experts(`<p class="lit">${gl('effectiveHeight', 'Effective height')} ${fmt(st.hEff)} m; ${gl('spacingCoefficient', 'G / H_eff')} ${d.k.toFixed(2)} (the rule needs ${ES.spacingK.value}${tag(ES.spacingK)}); ${ES.ruleHours.value} h${tag(ES.ruleHours)}.</p><p class="caveat">Counted here as the rule does: at a point 0.9 m above the ground-floor level${tag(ES.sillHeight)}, 5-min steps${tag(ES.ruleStep)}, only stretches of at least 10 min${tag(ES.ruleSegment)}, buildings only (trees do not count). The national rule as the brief read it (GB 50180-2018, Table 4.0.9; its values not checked against the standard, unverified); the step and stretch rules are from the draft of Zhejiang's DB33/1050 (now the 2016 edition, not checked); other local rules and the newer GB 55038-2025 are not checked. The estate is invented; old estates were approved under the 1993 code.</p>`, ['gb50180', 'db33', 'gb55038', 'brief7'])}`;
}

/** The July courtyard. d: {st, shade: [{tst, far, share}], H}. */
export function courtCard(d) {
  const t = d.st.table;
  return `
    ${close}
    <h3>The July courtyard: almost no shade at midday</h3>
    <p class="lead">In July the slabs shade only a thin strip along their north faces at midday: the rest of the courtyard, its parking and lawns, lie in full sun.</p>
    <div class="mat">Courtyard between two rows, ${r0(d.G)} m deep · shade cast by the slab south of it, by solar time</div>
    <table class="cmp">
      <tr><td>solar time</td>${d.shade.map((s) => `<td>${hm(s.tst)}</td>`).join('')}</tr>
      <tr><td>shadow reaches (m from the slab)</td>${d.shade.map((s) => `<td>${r0(s.far)}</td>`).join('')}</tr>
      <tr><td>share of the courtyard in its shadow (middle)</td>${d.shade.map((s) => `<td>${pct(s.share)}</td>`).join('')}</tr>
    </table>
    <table class="cmp">
      <tr><td></td><td>sun 12:00</td><td>surface 12:00 / 15:00</td><td>${gl('tmrt', 'feels like')} 12:00 / 15:00</td></tr>
      <tr><td>paving at the sills (south of a slab)</td><td>${pct(t.sillStrip.s12)}</td><td>${fmt(t.sillStrip.t12)} / ${fmt(t.sillStrip.t15)} °C</td><td>${fmt(t.sillStrip.r12)} / ${fmt(t.sillStrip.r15)} °C</td></tr>
      <tr><td>surface parking</td><td>${pct(t.parking.s12)}</td><td>${fmt(t.parking.t12)} / ${fmt(t.parking.t15)} °C</td><td>${fmt(t.parking.r12)} / ${fmt(t.parking.r15)} °C</td></tr>
      <tr><td>path along the next slab's north face</td><td>${pct(t.northPath.s12)}</td><td>${fmt(t.northPath.t12)} / ${fmt(t.northPath.t15)} °C</td><td>${fmt(t.northPath.r12)} / ${fmt(t.northPath.r15)} °C</td></tr>
    </table>
    <p class="note">Between 10:00 and 16:00 the slab's shadow stays within ${r0(d.far)} m of its north face (${(d.far / d.H).toFixed(2)} H); the rest of the courtyard, the lawns, the parking and the sills of the next row, is in the sun. The only shade at midday is the strip along the north faces, and walkers keep to it. In shade, a more enclosed spot feels only a little warmer here, less than measured in Hong Kong (outside the measured range; not tuned).</p>
    ${experts(`<p class="lit">Hong Kong, in shade: Tmrt rises 1.6 K per 10 W m⁻² of extra longwave, about what 0.1 less sky view brings (Lai, Maing &amp; Ng 2017); a sky view near 0.4 or below marked the cooler spaces in a later Hong Kong study (Li et al. 2023). Shanghai high-rise quarters: greenery mattered more at night (Yang, Lau &amp; Qian 2010).</p>
    <p class="caveat">This model gives ${fmt(-0.1 * d.slope15)} K of Tmrt per 0.1 less sky view in shade at 15:00 (${fmt(-0.1 * d.slope21)} K after dark), well short of the 1.6 K measured in Hong Kong: the soft band for it is missed (docs/sources.md, block 7); not tuned. Shade here is from the buildings only (the courtyard trees are few). After about 15:50 solar time the July sun is north of west and the next row's south face shades a thin strip too. The air under the slabs and any breeze between the rows are not modelled.</p>`, ['lai2017', 'li2023', 'yang2010', 'brief7'])}`;
}

/** Point towers. d: {H, rows: [{tst, jul, jan}]}. */
export function towerCard(d) {
  return `
    ${close}
    <h3>Point towers: long winter shadows, kept to the north</h3>
    <p class="lead">A 30-floor tower throws a long but narrow winter shadow that moves quickly; these two stand on the north edge, so it never reaches a ground-floor window.</p>
    <div class="mat">30 floors, ${r0(d.H)} m · lobby and shops on the ground floor · shadow length on flat ground</div>
    <table class="cmp">
      <tr><td>solar time</td><td>20 July</td><td>大寒 (20 Jan)</td></tr>
      ${d.rows.map((r) => `<tr><td>${hm(r.tst)}</td><td>${r0(r.jul)} m</td><td>${r0(r.jan)} m</td></tr>`).join('')}
    </table>
    <p class="note">A tower's winter shadow is long but narrow and moves quickly, so it takes less sun from any one window than a slab of the same height. These two stand on the north edge: their shadows fall on the estate road and the shop roofs, never on a ground-floor sill.</p>
    ${experts(`<p class="caveat">The rule test here counts only the slabs' ground-floor flats; the towers' ground floors are lobbies and shops (an assumption of this invented estate).</p>`, ['brief7'])}`;
}

/** Condensers. d: {st, faceS, faceN}. */
export function acCard(d) {
  const st = d.st;
  const hours = [6, 12, 15, 18, 21, 0];
  return `
    ${close}
    <h3>AC condensers: heat the model shows but cannot feel</h3>
    <p class="lead">The flats' air conditioners blow their heat out at the walls, about ${r0(st.peak.wm2)} watts per m² over the site at ${String(st.peak.h).padStart(2, '0')}:00; this page shows where it goes but the air here does not warm.</p>
    <div class="mat">${gl('condenserHeat', 'Heat rejected')}: ${fmt(st.qRej)} kW per condenser</div>
    <table class="cmp">
      <tr><td>air blown out, warmer than the air: 3 pm / 11 pm</td><td>${K(st.dtExh)} / ${K(st.dtExhNight)}</td></tr>
      <tr><td>flats / condensers (2 south, 1 north per flat)</td><td>${st.heat[0].flats} / ${st.heat[0].flats * 3}</td></tr>
      <tr><td>one slab's south / north face at full use</td><td>${r0(d.faceS)} / ${r0(d.faceN)} kW</td></tr>
    </table>
    <table class="cmp">
      <tr><td>hour</td>${hours.map((h) => `<td>${String(h).padStart(2, '0')}</td>`).join('')}</tr>
      <tr><td>flats running AC</td>${hours.map((h) => `<td>${pct(st.heat[h].share)}</td>`).join('')}</tr>
      <tr><td>over the site, watts per m²</td>${hours.map((h) => `<td>${r0(st.heat[h].wm2)}</td>`).join('')}</tr>
    </table>
    <p class="note">${st.heat[0].flats} flats at up to ${ES.perFlat.value} kW each reject about ${r0(st.peak.wm2)} watts per m² over the whole site at ${String(st.peak.h).padStart(2, '0')}:00, as much as a sunny pavement gives the air, and most of it after dark. In this model the air is fixed, so that heat warms nothing; the plumes (the condensers button, C) only show where it goes. The walls in the plumes are taken ${fmt(ES.wallDT.value)} degrees warmer at full use: a person on the ground feels at most ${K(st.plumeMax)} from that (${K(st.plumeCourt21)} in the courtyards at 9 pm, mean); the ground surface is not changed.</p>
    ${experts(`<p class="lit">${fmt(ES.qCool.value)} kW of cooling × (1 + 1/${gl('eer', 'EER')} ${ES.eer.value}) = ${fmt(st.qRej)} kW${tag(ES.qCool)}; fan flow ${fmt(ES.fanFlow.value)} m³/s${tag(ES.fanFlow)}; condensers per flat${tag(ES.condensers)}; AC profile${tag(ES.acProfile)}; ${ES.perFlat.value} kW per flat${tag(ES.perFlat)}; plume walls +${fmt(ES.wallDT.value)} K${tag(ES.wallDT)} (Tmrt at most ${K(st.plumeMax)}).</p><p class="lit">Changsha: condenser exhaust 5.2 K above the air by day and 6.5 K at night, 14% drier (Mu et al. 2025). In stacks and recesses the air at the upper condensers runs warmer: more than 7 K (Chow &amp; Lin 1999), 4–9 K at the 30th floor next to window units (Bojic et al. 2001), and a rise of 10–13 K up a 24-storey Singapore void, with inlets near 50 °C from floor 10 and 32% less efficiency (Bruelisauer et al. 2014). City air, simulated: Paris +0.5 K today and +2 K if AC doubled (de Munck et al. 2013), Berlin up to +0.6 K (Jin et al. 2020).</p>
    <p class="caveat">Not simulated: the air the condensers heat, the warmer air they draw in higher up the stack, and the night heat island they add to. The flat count, the AC profile and the plume term are this block's assumptions; condensers of the shops are left out.</p>`, ['mu2025', 'chow1999', 'bojic2001', 'bruelisauer2014', 'demunck2013', 'berlin2020', 'brief7'])}`;
}

/** Lawns and paving. d: {st}. */
export function lawnCard(d) {
  const t = d.st.table;
  const row = (k, name) => `<tr><td>${name}</td><td>${pct(t[k].s15)}</td><td>${fmt(t[k].t15)}</td><td>${fmt(t[k].t23)}</td><td>${fmt(t[k].r15)}</td></tr>`;
  return `
    ${close}
    <h3>Worn lawns and hard paving</h3>
    <p class="lead">Where the lawn holds, it is ${fmt(t.sillStrip.t15 - t.lawn.t15)} degrees cooler than the sunlit paving at 3 pm; worn to bare soil, it gets nearly as hot.</p>
    <div class="mat">Courtyard ground · share in sun, surface at 3 pm and 11 pm, how it feels at 3 pm (°C)</div>
    <table class="cmp">
      <tr><td></td><td>sun</td><td>3 pm</td><td>11 pm</td><td>${gl('tmrt', 'feels like')}</td></tr>
      ${row('sillStrip', 'paving at the sills')}
      ${row('parking', 'surface parking (asphalt)')}
      ${row('worn', 'worn patches (bare soil)')}
      ${row('lawn', 'lawn')}
    </table>
    <p class="note">Where the lawn holds, it stays ${fmt(t.sillStrip.t15 - t.lawn.t15)} degrees cooler than the sunlit paving at 3 pm; where feet and parked cars have worn it to bare soil it gets nearly as hot as the paving. A person standing on the lawn still feels the full sun.</p>
    ${experts(`<p class="lit">Wuhan, August 2015: sunlit hard paving 9.87 K hotter than grass, open ground 3.67 K (Cai &amp; Hu 2017). Estates of this age had to keep 25–30% green, much of it later taken by parking (the brief, unverified).</p>
    <p class="caveat">The lawn here is the irrigated lawn of block 1 (its evaporation is that of watered grass); a dry, worn summer lawn evaporates less and runs warmer.</p>`, ['cai2017', 'gb50180', 'brief7'])}`;
}

/** Button labels for the estate panel cards. */
export const ES_CARDS = [
  ['rule', 'Winter spacing'],
  ['court', 'July courtyard'],
  ['towers', 'Point towers'],
  ['ac', 'Condensers'],
  ['lawn', 'Lawns and paving'],
];

/**
 * The block's plugin for app.js: its controls (season and condensers, the
 * cards), notes, heat-card rows, renderer hooks and API.
 * env: {scene, world, thermal, root, card, R, S, query, setup (estateSetup), hideCard(), reopen(), redraw()}.
 */
export function esApp(env) {
  const { scene, world, thermal, root, card, R, S } = env;
  const plume = env.setup.plume;
  const st = {
    season: env.query.get('date') === 'dajhan' ? 'dajhan' : 'jul', // ?date=jul|dajhan
    condensers: env.query.get('ac') === '1', // ?ac=1, default off
  };
  if (env.query.get('acwall') === '0') plume.on = false; // checks: the plume wall term off
  let fixed = null;
  let slopes = null; // Tmrt against sky view in shade (court card), lazily
  const es = () => (fixed ??= estateStats(world, thermal, plume));
  const site = scene.site;
  const win = winterSite(site);
  const rule = world.estate.rule;
  // renderer data: the 大寒 site, the tallies on the roofs, the visible condenser stacks, the south-face labels
  const stacks = [];
  const faces = [];
  for (const B of world.buildings) {
    if (B.kind !== 'slab' && B.kind !== 'tower') continue;
    const fh = B.h / B.floors;
    for (const face of B.kind === 'tower' ? ['S', 'E'] : ['S']) {
      const len = face === 'S' ? B.x1 - B.x0 : B.y1 - B.y0;
      const per = len / (B.kind === 'tower' ? 2 : B.flats);
      for (let u0 = 0, q = 0; u0 + per <= len + 1e-6; u0 += per) {
        for (const s of [per * 0.12, per * 0.58]) {
          const u = u0 + s + per * 0.3 + 0.45;
          q++;
          for (let f = (B.lobby ? 1 : 0) + (q % 2); f < B.floors; f += 2) {
            const p = face === 'S' ? [B.x0 + u, B.y1 + 0.5, f * fh + 1] : [B.x1 + 0.5, B.y1 - u, f * fh + 1];
            if (!hidden(world, p, B.index)) stacks.push({ x: p[0], y: p[1], z: p[2] });
          }
        }
      }
    }
    faces.push({ x: B.x0 + 2, y: B.y1, z: B.h + 1.5, kw: faceKw(B, 'S', 20) / acShare(20), id: B.id });
  }
  R.estate = {
    winter: win,
    ruleHours: ES.ruleHours.value,
    tallies: rule.flats.map((f) => ({ x: f.x, y: f.y - 1.5, z: world.buildings[f.b].h + 0.2, hours: f.hours })),
    stacks,
    faces,
    share: acShare,
    wm2: (h) => siteHeat(world, h).wm2,
    qRej: qRej(),
    dtExh: (h) => exhaustDT(thermal.air(h)),
    layer: null,
  };
  R.overlay = esOverlay;

  const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="estate" class="blockpanel" aria-label="Estate controls">
        <div class="seg">${btn('data-season', 'jul', '20 July')}${btn('data-season', 'dajhan', '大寒 shadows')}</div>
        <div class="seg">${btn('data-ac', '1', 'condensers')}</div>
        <div class="measures"><div class="hand">Cards</div>${ES_CARDS.map(([id, label]) => btn('data-card', id, label)).join('')}</div>
      </div>`,
  );
  const el = root.getElementById('estate');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.season) setSeason(b.dataset.season);
    else if (b.dataset.ac) setAc(!st.condensers);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    for (const b of el.querySelectorAll('[data-season]')) b.setAttribute('aria-pressed', String(b.dataset.season === st.season));
    el.querySelector('[data-ac]').setAttribute('aria-pressed', String(st.condensers));
    root.body.dataset.season = st.season;
  }
  const changed = () => {
    sync();
    env.reopen();
    env.redraw();
  };
  function setSeason(s) {
    st.season = s === 'dajhan' ? 'dajhan' : 'jul';
    changed();
  }
  function setAc(on) {
    st.condensers = !!on;
    changed();
  }
  function setWall(on) {
    plume.on = !!on;
    R.tmrtCache = null;
    fixed = null;
    slopes = null;
    changed();
  }
  const rows = () => [0, 1, 2, 3].map((r) => {
    const ids = world.buildings.filter((B) => B.kind === 'slab' && B.row === r).map((B) => slabRule(world, B.id));
    return { label: r < 3 ? `row ${r + 1} (behind row ${r + 2})` : 'row 4 (facing the back road)', min: Math.min(...ids.map((x) => x.min)), mean: ids.reduce((a, x) => a + x.mean, 0) / ids.length };
  });
  function courtRows() {
    const B = world.buildings.find((b) => b.id === 'slab2a');
    const yN = world.buildings.find((b) => b.id === 'slab1a').y1;
    return [600, 660, 720, 780, 840, 900, 960].map((tst) => ({ tst, ...courtShade(B, yN, sunAtSolar(site, tst)) }));
  }
  function html(id) {
    const s = es();
    const G = scene.gap;
    const slab = world.buildings.find((b) => b.id === 'slab2a');
    if (id === 'rule') return ruleCard({ st: s, G, k: G / effHeight(slab), rows: rows() });
    if (id === 'court') {
      const sh = courtRows();
      slopes ??= [svfSlope(world, thermal, 15).slope, svfSlope(world, thermal, 21).slope];
      return courtCard({ st: s, G, H: slab.h, shade: sh, far: Math.max(...sh.map((x) => x.far)), slope15: slopes[0], slope21: slopes[1] });
    }
    if (id === 'towers') {
      const T = world.buildings.find((b) => b.kind === 'tower');
      const len = (st2, tst) => {
        const p = sunAtSolar(st2, tst);
        return T.h / Math.tan(p.alt * DEG);
      };
      return towerCard({ H: T.h, rows: [540, 600, 720, 840, 900].map((tst) => ({ tst, jul: len(site, tst), jan: len(win, tst) })) });
    }
    if (id === 'ac') return acCard({ st: s, faceS: faceKw(slab, 'S', 20) / acShare(20), faceN: faceKw(slab, 'N', 20) / acShare(20) });
    return lawnCard({ st: s });
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
    const s = es();
    const tw = world.buildings.find((b) => b.kind === 'tower');
    const all = rule.sills.map((p) => p.hours);
    return {
      julDepth: s.jul.depth * s.H,
      court12: s.table.parking.t12,
      ruleMin: Math.min(...all),
      ruleMax: Math.max(...all),
      qRej: s.qRej,
      dtExh: s.dtExh,
      peakWm2: s.peak.wm2,
      peakH: s.peak.h,
      towerJul: s.jul.depth * tw.h,
      towerJan: s.jan.depth * tw.h,
      lawn15: s.table.lawn.t15,
      pave15: s.table.sillStrip.t15,
    };
  }
  /** Tmrt the plume wall term adds at a ground cell and hour (on minus off). */
  const plumeDT = (i, h) => {
    const was = plume.on;
    plume.on = false;
    const a = thermal.tmrt(i, h);
    plume.on = true;
    const b = thermal.tmrt(i, h);
    plume.on = was;
    return b - a;
  };
  return {
    notes: () => esNotes(scene, noteData()),
    look: () => ({ season: st.season, condensers: st.condensers, budget: 1 }),
    sync,
    html,
    /** Keyboard: S toggles the 大寒 view, C the condensers; true if the key was the block's. */
    key(k) {
      if (k === 's' || k === 'S') setSeason(st.season === 'jul' ? 'dajhan' : 'jul');
      else if (k === 'c' || k === 'C') setAc(!st.condensers);
      else return false;
      return true;
    },
    /** Heat-card numbers: a ground cell's plume share and the Tmrt it adds; a slab's flats, condensers, kW now and its 大寒 sills. */
    cardKey: 'estate',
    cardInfo: (cells, tmrtCell, h, leaf) => {
      if (leaf) return null;
      if (tmrtCell !== null) return { p: world.estate.plume[tmrtCell], dT: plume.on ? plumeDT(tmrtCell, h) : 0, on: plume.on };
      const B = world.buildings[world.bld[cells[0]]];
      if (!B || !flatsOf(B)) return null;
      const r = B.kind === 'slab' ? slabRule(world, B.id) : null;
      return { b: B.id, flats: flatsOf(B), kw: (faceKw(B, 'S', h) + faceKw(B, 'N', h) + faceKw(B, 'E', h) + faceKw(B, 'W', h)), rule: r, plume: plumeShares(B).S };
    },
    cardRows: (f) => (f.b
      ? `<tr><td>${gl('condenserHeat', 'condensers')} now</td><td>${f.flats} flats, ${r0(f.kw)} kW</td></tr>${f.rule ? `<tr><td>${gl('sunlightRule', '大寒 sun at the sills')}, lowest / mean</td><td>${fmt(f.rule.min)} / ${fmt(f.rule.mean)} h</td></tr>` : ''}`
      : f.p > 0
        ? `<tr><td>walls in condenser plumes (of the walls seen)</td><td>${pct(f.p)} · Tmrt ${f.on ? K(f.dT) : 'term off'} now</td></tr>`
        : ''),
    glossary: () => ({}),
    /** Estate block (block 7) only: state {season, condensers, acWall}; set() it; numbers for the bands and cards; card HTML. */
    api: {
      state: () => ({ season: st.season, condensers: st.condensers, acWall: plume.on }),
      set(o) {
        if (o.season !== undefined) setSeason(o.season);
        if (o.condensers !== undefined) setAc(!!o.condensers);
        if (o.acWall !== undefined) setWall(!!o.acWall);
      },
      stats: () => {
        const s = es();
        return { table: s.table, H: s.H, hEff: s.hEff, jul: s.jul, jan: s.jan, heat: s.heat, peak: s.peak, qRej: s.qRej, dtExh: s.dtExh, plumeMax: s.plumeMax, plumeCourt21: s.plumeCourt21, ruleMin: rule.min, n: Object.fromEntries(Object.entries(s.C).map(([k, v]) => [k, v.length])) };
      },
      rule: () => ({ min: rule.min, flats: rule.flats.map((f) => f.hours), slabs: rule.slabs }),
      court: () => courtRows(),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#estate [data-card="${id}"]`)),
      plume: (x, y) => world.estate.plume[world.cellIndex(x, y)],
      tmrt: (x, y, h = S.hour) => thermal.tmrt(world.cellIndex(x, y), h),
      ts: (x, y, h = S.hour) => thermal.ts(world.cellIndex(x, y), h),
      noon: () => ({ jul: shadowDepth(site), jan: shadowDepth(win) }),
      means: (k, h) => ({ ts: tsMean(thermal, es().C[k], h), tmrt: tmrtMean(thermal, es().C[k], h) }),
    },
  };
}
