// cpui: the overlay of the school campus playground (block 8): the water and
// burn controls, margin notes, the cards (turf and grass, the playground, the
// shade sails, watering the pitch, children, track and courts, burn limits),
// the heat-card rows, the children at play times and the block's API, as a
// block plugin for app.js.
import { SOURCES, BASIS, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { CP, campusStats, campusMisses, irrigationStats, burnCells, burnLimit, BURN_CLASS, efAt, kidPlan, kidsAt, playTime, tsMean } from './campus.js';
import { cpOverlay } from './cpkit.js';
import { quantHour } from './render.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const r0 = (v) => String(Math.round(v));
const pct = (v) => `${Math.round(v * 100)}%`;
const K = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))} K`;
const hm = (h) => `${String(Math.floor(h + 1e-9) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated, on a 5 m grid; the air temperature is fixed.</p>`;
const close = '<button class="x" aria-label="close">×</button>';
const CLASS_NAME = { plastic: 'plastics, rubber, turf', stone: 'concrete, stone, asphalt', metal: 'metal' };

/** Margin notes (at most 5). d: numbers from the plugin (noteData). */
export function cpNotes(scene, d) {
  const text = {
    turf: [`Artificial turf ${fmt(d.turf15)} °C at 3 pm, grass ${fmt(d.grass15)} °C;`, `at 5 am ${fmt(d.turf05)} and ${fmt(d.grass05)} °C`],
    sail: [`Rubber under the sail ${fmt(d.sail15)} °C,`, `in the sun ${fmt(d.sun15)} °C at 3 pm`],
    burn: [`3 pm: ${pct(d.playBurn)} of the play surfaces are over`, 'their 1-min burn limit (U shows them)'],
    water: [`Watered at 2 pm: ${K(d.waterDrop)} at ${hm(d.waterAt)},`, `${K(d.waterLater)} half an hour later`],
    kids: ['Children at play times', `pick the shade: ${pct(d.kidShade)} at 3 pm`],
  };
  const terms = {
    turf: [['artificialTurf', 'Artificial turf']],
    sail: [['shadeSail', 'under the sail']],
    burn: [['contactBurn', '1-min burn limit']],
    water: [['crumbRubber', 'Watered at 2 pm']],
    kids: [['tmrt', 'pick the shade']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** Turf and grass. d: {st}. */
export function turfCard(d) {
  const t = d.st.table;
  const row = (k, name) => `<tr><td>${name}</td><td>${fmt(t[k].ts[5])}</td><td>${fmt(t[k].ts[12])}</td><td>${fmt(t[k].ts[15])}</td><td>${fmt(t[k].ts[23])}</td><td>${fmt(t[k].tmrt[15])}</td></tr>`;
  const m = MATERIALS.turf;
  return `
    ${close}
    <h3>${gl('artificialTurf', 'Artificial turf against grass')}</h3>
    <div class="mat">Pitch: green plastic blades in black ${gl('crumbRubber', 'crumb rubber')} · albedo ${m.alpha.value}${tag(m.alpha)} · admittance ${m.mu.value}${tag(m.mu)} · no water to evaporate</div>
    <table class="cmp">
      <tr><td>surface, °C</td><td>05:00</td><td>12:00</td><td>15:00</td><td>23:00</td><td>Tmrt 15:00</td></tr>
      ${row('turf', 'artificial turf (pitch)')}
      ${row('grass', 'natural grass (field)')}
      ${row('track', 'running track')}
    </table>
    <p class="note">At 3 pm the pitch is ${fmt(t.turf.ts[15] - t.grass.ts[15])} K hotter than the watered grass field beside it (peak ${fmt(d.st.turfPeak.t)} °C at ${hm(d.st.turfPeak.h)}). It is dark, dry and holds little heat, so it heats fast in the sun and loses it fast after dark: by 5 am it is ${fmt(Math.abs(t.turf.ts[5] - t.grass.ts[5]))} K ${t.turf.ts[5] < t.grass.ts[5] ? 'below' : 'above'} the grass.</p>
    <p class="lit">Hong Kong: turf 74.6 °C vs grass 36.9 °C (Jim 2016), 73.8 vs 37.3 °C at 34.4 °C air (Jim 2017); at night both near 23 °C. Review of 23 studies: turf 9.4–33.7 K hotter than grass at the surface, but only 0.5–1.2 K in the air (Singh et al. 2024). Brigham Young University: up to 93 °C (via the New York State health department).</p>
    <p class="caveat">The air here is fixed: the hot layer just above the turf (54 °C at 15 cm over a 74 °C pitch, Jim 2016) is not modelled, so a child on the pitch is hotter than the numbers say. The turf's emissivity and admittance are assumptions of the brief; its albedo is cited.</p>
    ${srcLine(['jim2016', 'jim2017', 'singh2024', 'nydoh', 'brief8'])}`;
}

/** The playground. d: {st}. */
export function playCard(d) {
  const s12 = d.st.split[12];
  const s15 = d.st.split[15];
  const row = (k, name) => `<tr><td>${name}</td><td>${s12[k].n} / ${s15[k].n}</td><td>${fmt(s12[k].ts)} / ${fmt(s15[k].ts)} °C</td><td>${fmt(s12[k].tmrt)} / ${fmt(s15[k].tmrt)} °C</td></tr>`;
  return `
    ${close}
    <h3>The playground: rubber in the sun and in shade</h3>
    <div class="mat">Poured rubber play surface (the brief's track values, interpreted${tag(MATERIALS.rubber.alpha)}) · cells, then 12:00 / 15:00</div>
    <table class="cmp">
      <tr><td></td><td>cells</td><td>surface</td><td>${gl('tmrt', 'Tmrt')}</td></tr>
      ${row('sun', 'rubber in full sun')}
      ${row('sail', 'rubber under a sail')}
      ${row('tree', 'rubber under a tree')}
    </table>
    <p class="note">In full sun the rubber reaches ${fmt(s15.sun.ts)} °C at 3 pm, ${fmt(s15.sun.ts - d.air15)} K above the air. Under the sails it stays at ${fmt(s15.sail.ts)} °C and under the trees ${fmt(s15.tree.ts)} °C. The slide is drawn but not modelled.</p>
    <p class="lit">Gilbert, Arizona, at noon in 41.6 °C air: rubber 87.2 °C in sun, 46.7 °C under a shade sail and 42.2 °C under a tree; a metal slide 71.7 °C in sun and 43.9 °C in shade (Vanos et al. 2016).</p>
    <p class="caveat">${d.treeMiss ? `Under the trees the model gives ${fmt(s15.tree.ts - d.air15)} K above the air at 3 pm, more than the brief's 0–5 K: the band is missed (see docs/sources.md); not tuned. ` : ''}${d.sailMiss ? `The sails cut the rubber by ${fmt(s15.sun.ts - s15.sail.ts)} K at 3 pm, short of the brief's 25 K or more (band missed, see docs/sources.md; ${fmt(s12.sun.ts - s12.sail.ts)} K at noon); not tuned. ` : ''}The play surface has no measured albedo or heat store here: the brief's track values stand in for it.</p>
    ${srcLine(['vanos2016', 'brief8'])}`;
}

/** The shade sails. d: {st}. */
export function sailCard(d) {
  const s12 = d.st.split[12];
  const s15 = d.st.split[15];
  const tr = MATERIALS.shadeSail.tr;
  return `
    ${close}
    <h3>${gl('shadeSail', 'Shade sails')}: the cheapest cool spot</h3>
    <div class="mat">Knitted HDPE cloth ${CP.sailHeight.value} m up${tag(CP.sailHeight)} · lets through ${pct(tr.value)} of the sun${tag(tr)}</div>
    <table class="cmp">
      <tr><td></td><td>12:00</td><td>15:00</td></tr>
      <tr><td>rubber in sun − under a sail, surface</td><td>${K(s12.sun.ts - s12.sail.ts)}</td><td>${K(s15.sun.ts - s15.sail.ts)}</td></tr>
      <tr><td>under a sail, surface above the air</td><td>${K(s12.sail.ts - d.air12)}</td><td>${K(s15.sail.ts - d.air15)}</td></tr>
      <tr><td>${gl('tmrt', 'Tmrt')} in sun − under a sail</td><td>${K(s12.sun.tmrt - s12.sail.tmrt)}</td><td>${K(s15.sun.tmrt - s15.sail.tmrt)}</td></tr>
    </table>
    <p class="note">A sail stops most of the sun before it reaches the rubber and the child. It is not a roof: the sky still shows round its edges, and as the sun moves its shadow slides off the cells beneath it, so the sails here sit over the slide and the climbing frame, where children stay longest.</p>
    <p class="lit">Lubbock, Texas: a shade sail cut the radiation a child absorbs by 168 W m⁻²; concrete 40.0 °C in sun vs 29.2 °C in shade (Vanos et al. 2017). New South Wales schools: shade cooled black asphalt by about 25 K, the black globe by more than 10 K; shaded turf 35 °C vs 61 °C sunlit (Pfautsch et al. 2020). Phoenix: buildings shade best, then trees, then light structures; after sunset every kind of shade keeps a person a little warmer (Middel et al. 2021).</p>
    <p class="caveat">${d.sailMiss ? `Model: ${fmt(s15.sun.ts - s15.sail.ts)} K less at 3 pm (${fmt(s12.sun.ts - s12.sail.ts)} K at noon), short of the brief's 25 K or more: the band is missed (see docs/sources.md); not tuned. ` : ''}The cloth is a flat screen in this model; its own temperature is not computed: the cells under it see it as a warm wall (air + 2 K, more by day), so they stay a little warmer after dark.</p>
    ${srcLine(['vanos2017', 'pfautsch2020', 'middel2021', 'brief8'])}`;
}

/** Watering the pitch. d: {w (irrigationStats), on}. */
export function waterCard(d) {
  const w = d.w;
  const rows = w.rows.filter((r, k) => [0, 1, 2, 4, 12].includes(k));
  return `
    ${close}
    <h3>Watering the pitch helps for minutes</h3>
    <div class="mat">Sprinklers at ${hm(CP.irrigateHour.value)}${tag(CP.irrigateHour)}: evaporative fraction ${CP.efPeak.value}${tag(CP.efPeak)} falling to ${CP.efRes.value}${tag(CP.efRes)} with τ ${CP.irrigateTau.value} min${tag(CP.irrigateTau)} · ${d.on ? 'on (press I to switch off)' : 'off (press I to water)'}</div>
    <table class="cmp">
      <tr><td>turf, °C</td>${rows.map((r) => `<td>${hm(r.h)}</td>`).join('')}</tr>
      <tr><td>dry</td>${rows.map((r) => `<td>${fmt(r.dry)}</td>`).join('')}</tr>
      <tr><td>watered</td>${rows.map((r) => `<td>${fmt(r.wet)}</td>`).join('')}</tr>
      <tr><td>evaporative fraction</td>${rows.map((r) => `<td>${efAt((r.h - CP.irrigateHour.value) * 60).toFixed(2)}</td>`).join('')}</tr>
    </table>
    <p class="note">The water takes the heat of the sun into evaporation for a few minutes, then the turf dries and heats again: the pitch is ${fmt(-w.min.d)} K cooler at ${hm(w.min.h)}, ${fmt(-w.later.d)} K half an hour later, and ${fmt(w.residual)} K three hours on.</p>
    <p class="lit">Brigham Young University: watering took turf from 79 °C to 29 °C; it was back at 49 °C after 5 min and 73 °C after 20 min (via the New York State health department). Penn State: 54–71 °C down to 24 °C, 32–49 °C within 30 min, then about steady for 3 h (McNitt et al. 2008).</p>
    <p class="caveat">${w.min.wet - w.min.air > 5 ? `The measured drop to near the air is far deeper than this model gives (${fmt(w.min.wet - w.min.air)} K above the air at its coolest, against within 5 K): the brief's pulse spends at most ${CP.efPeak.value} of the net radiation on evaporation, while real sprinkler water also cools the turf with its own heat and evaporates far faster from a hot surface. Band missed (see docs/sources.md); not tuned. ` : ''}Turf cells only, every 15 min; the air is not cooled.</p>
    ${srcLine(['nydoh', 'mcnitt2008', 'brief8'])}`;
}

/** Children. d: {st, kids}. */
export function kidsCard(d) {
  return `
    ${close}
    <h3>Children: nearer the hot ground</h3>
    <div class="mat">Play times${tag(CP.playTimes)}: ${CP.playTimes.value} · drawn smaller (${pct(CP.kidSize.value)} of an adult${tag(CP.kidSize)})</div>
    <table class="cmp">
      <tr><td>children at 15:00 / in shade</td><td>${d.kids.n} / ${pct(d.kids.shade)}</td></tr>
      <tr><td>${gl('tmrt', 'Tmrt')} at 15:00 on the sunny rubber / under a sail (adult height)</td><td>${fmt(d.st.split[15].sun.tmrt)} / ${fmt(d.st.split[15].sail.tmrt)} °C</td></tr>
    </table>
    <p class="note">At play times the children make for the sails and the trees; the ones still in the sun on the rubber or the pitch show the sweat cue. A child's head and body are closer to a 60–70 °C surface than an adult's, they play hard, and they do not always notice or say that they are too hot.</p>
    <p class="lit">Lubbock playgrounds: children's bodies are nearer the hot ground, and a shade sail cut the radiation they absorb by 168 W m⁻² (Vanos et al. 2017); children's heat vulnerability outdoors is reviewed by Vanos (2015). In weak wind the air at 0.3 m was up to 1 K warmer than at 1.5 m (Paolini et al.).</p>
    <p class="caveat">Qualitative only: no measured child-height against adult-height Tmrt was found, and this model cannot resolve one (90% of the ground a child sees lies within 3–4.5 m, less than one 5 m cell). Every Tmrt here is for a standing adult; the air near the hot turf is not modelled, so a child's exposure is understated.</p>
    ${srcLine(['vanos2017', 'vanos2015', 'paolini', 'brief8'])}`;
}

/** Track and courts. d: {st, trackMiss, courtMiss}. */
export function courtsCard(d) {
  const t = d.st.table;
  const a = d.air15;
  return `
    ${close}
    <h3>Running track and courts: weak evidence</h3>
    <div class="mat">Track: PU / EPDM on asphalt, albedo ${MATERIALS.track.alpha.value}${tag(MATERIALS.track.alpha)} · courts: acrylic on asphalt, albedo ${MATERIALS.acrylic.alpha.value}${tag(MATERIALS.acrylic.alpha)}</div>
    <table class="cmp">
      <tr><td></td><td>surface 12:00 / 15:00</td><td>above the air at 15:00</td></tr>
      <tr><td>running track</td><td>${fmt(t.track.ts[12])} / ${fmt(t.track.ts[15])} °C</td><td>${K(t.track.ts[15] - a)}</td></tr>
      <tr><td>basketball courts</td><td>${fmt(t.courts.ts[12])} / ${fmt(t.courts.ts[15])} °C</td><td>${K(t.courts.ts[15] - a)}</td></tr>
      <tr><td>artificial turf</td><td>${fmt(t.turf.ts[12])} / ${fmt(t.turf.ts[15])} °C</td><td>${K(t.turf.ts[15] - a)}</td></tr>
    </table>
    <p class="note">Both are a thin coat on asphalt: as hot as dark paving, a little below the turf, which holds less heat.</p>
    <p class="lit">A school report from Kinmen: a PU track more than 15 K above the air at noon; Aoki (2004): track 42.2 °C against turf 67.0 °C. Court-coating makers: a standard acrylic court about 52 °C in 30 °C air (vendor claims). An asphalt court measured albedo 0.24 (Vanos et al. 2017).</p>
    <p class="caveat">${d.courtMiss ? `The courts come out ${fmt(t.courts.ts[15] - a)} K above the air at 3 pm, just over the vendors' 15–25 K: band missed (see docs/sources.md); not tuned. ` : ''}${d.trackMiss ? `The track comes out ${fmt(t.track.ts[15] - a)} K above the air at 3 pm, outside 15–30 K: band missed; not tuned. ` : ''}Weak sources: one school report, one study and vendor claims; the albedos, emissivities and heat stores are the brief's unverified values.</p>
    ${srcLine(['kinmen', 'aoki2004', 'courtVendor', 'vanos2017', 'brief8'])}`;
}

/** Burn limits. d: {st, cells}. */
export function burnCard(d) {
  const by = d.st.burn15.byMat;
  const name = (id) => MATERIALS[id]?.name ?? id;
  return `
    ${close}
    <h3>${gl('contactBurn', 'Contact-burn limits')}</h3>
    <div class="mat">ISO 13732-1 (via CENELEC Guide 29), bare skin, 1 min of contact${tag(CP.burnPlastic)}</div>
    <table class="cmp">
      <tr><td>material</td><td>1 min</td><td>10 min</td><td>8 h</td></tr>
      <tr><td>metal (the slide)</td><td>${CP.burnMetal.value} °C</td><td>48 °C</td><td>43 °C</td></tr>
      <tr><td>stone and concrete (asphalt read with them${tag(CP.asphaltClass)})</td><td>${CP.burnStone.value} °C</td><td>48 °C</td><td>43 °C</td></tr>
      <tr><td>plastics and wood (turf, rubber, track, courts)</td><td>${CP.burnPlastic.value} °C</td><td>48 °C</td><td>43 °C</td></tr>
    </table>
    <table class="cmp">
      <tr><td>ground above its 1-min limit at 15:00</td><td>${Object.entries(by).map(([id, n]) => `${name(id)} ${n}`).join(' · ') || 'none'}</td></tr>
    </table>
    <p class="note">Press <kbd>U</kbd>: every ground cell above its 1-min limit at this hour is hatched. A child sitting on the turf or sliding on sunny metal is in contact for longer than a minute and pulls away more slowly than an adult, so the lower 10-minute limit of ${CP.burn10min.value} °C${tag(CP.burn10min)} is the safer reading for children.</p>
    <p class="lit">Press coverage of Vanos's studies: 60 °C burns skin in 1 min, 74 °C in 5 s and 77 °C in 3 s (the standard not named). Gilbert, Arizona: a metal slide 71.7 °C in sun (Vanos et al. 2016).</p>
    <p class="caveat">The limits depend on the material and the contact time; the model gives surface temperatures, not skin. The slide is drawn but not modelled; no metal ground is hatched.</p>
    ${srcLine(['iso13732', 'vanosPress', 'vanos2016', 'brief8'])}`;
}

/** Button labels for the campus panel cards. */
export const CP_CARDS = [
  ['turf', 'Turf and grass'],
  ['play', 'Playground'],
  ['sail', 'Shade sails'],
  ['water', 'Watering the pitch'],
  ['kids', 'Children'],
  ['courts', 'Track and courts'],
  ['burn', 'Burn limits'],
];

/**
 * The block's plugin for app.js: its controls (watering and burn limits, the
 * cards), notes, heat-card rows, renderer hooks, the children and the API.
 * env: {scene, world, thermal, root, card, R, S, main, query, setup (campusSetup), hideCard(), reopen(), redraw(), setModel(T), setNotes(n)}.
 */
export function cpApp(env) {
  const { scene, world, root, card, R, S, main } = env;
  const set = env.setup;
  let thermal = env.thermal;
  const st = {
    irrigate: env.query.get('irrigate') === '1', // ?irrigate=1, default off
    burn: env.query.get('burn') === '1', // ?burn=1, default off
  };
  if (st.irrigate) {
    thermal = set.model(true);
    env.setModel(thermal);
  }
  let fixed = null;
  const cs = () => (fixed ??= campusStats(world, set.base));
  let wst = null;
  const ws = () => (wst ??= irrigationStats(set.base, set.irrigated(), set.cells));
  const site = scene.site;
  const airAt = (h) => set.base.air(h);
  // children: added to the main view's walkers at play times (a pure function of the frame and the hour)
  const life = main.life;
  const plans = new Map();
  const kidPlanAt = (hq) => {
    if (!plans.has(hq)) plans.set(hq, kidPlan(scene, main.shadeFor(hq), airAt(hq), hq, scene.seed));
    return plans.get(hq);
  };
  const baseAt = life.at.bind(life);
  life.at = (t, hq) => {
    const out = baseAt(t, hq);
    const p = kidPlanAt(hq);
    return p.length ? out.concat(kidsAt(scene, p, t)) : out;
  };
  const kidStats = (hq, f = S.frame) => {
    const kids = life.at(f / 60, hq).filter((a) => a.child);
    const sh = main.shadeFor(hq);
    const shade = kids.filter((a) => !sh.night && sh.cls[Math.floor(a.y / sh.cell) * sh.n + Math.floor(a.x / sh.cell)] !== 0).length;
    return { n: kids.length, shade: kids.length ? shade / kids.length : 0 };
  };
  // renderer data
  const burnCache = new Map();
  const T = scene.track;
  R.campus = {
    limits: { plastic: CP.burnPlastic.value, stone: CP.burnStone.value, metal: CP.burnMetal.value },
    burn: (hq) => {
      const k = `${hq}|${st.irrigate ? 1 : 0}`;
      if (!burnCache.has(k)) burnCache.set(k, burnCells(world, thermal, hq).map((b) => b.i));
      return burnCache.get(k);
    },
    modelKey: () => (st.irrigate ? 'w' : 'd'),
    hour: CP.irrigateHour.value,
    heads: [[T.cx - 30, T.cy - 30], [T.cx, T.cy - 30], [T.cx + 30, T.cy - 30], [T.cx - 30, T.cy + 30], [T.cx, T.cy + 30], [T.cx + 30, T.cy + 30]],
    waterLabel: (hq) => {
      const t = (hq - CP.irrigateHour.value) * 60;
      const turfNow = tsMean(thermal, set.cells, hq);
      const dryNow = tsMean(set.base, set.cells, hq);
      return t < 0
        ? `Pitch watered at ${hm(CP.irrigateHour.value)} (press I to switch off) · the turf now ${fmt(turfNow)} °C, dry`
        : `Pitch watered at ${hm(CP.irrigateHour.value)}: evaporative fraction now ${efAt(t).toFixed(2)} · the turf ${fmt(turfNow)} °C, ${K(turfNow - dryNow)} on the dry pitch (the air is not cooled)`;
    },
    layer: null,
  };
  R.overlay = cpOverlay;

  const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="campus" aria-label="Campus controls">
        <div class="seg">${btn('data-irrigate', '1', 'water the pitch at 14:00')}${btn('data-burn', '1', 'burn limits')}</div>
        <div class="measures"><div class="hand">Cards</div>${CP_CARDS.map(([id, label]) => btn('data-card', id, label)).join('')}</div>
      </div>`,
  );
  const el = root.getElementById('campus');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.irrigate) setIrrigate(!st.irrigate);
    else if (b.dataset.burn) setBurn(!st.burn);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-irrigate]').setAttribute('aria-pressed', String(st.irrigate));
    el.querySelector('[data-burn]').setAttribute('aria-pressed', String(st.burn));
    root.body.dataset.irrigate = st.irrigate ? '1' : '0';
  }
  const changed = () => {
    sync();
    env.reopen();
    env.redraw();
  };
  function setIrrigate(on) {
    if (!!on === st.irrigate) return;
    st.irrigate = !!on;
    thermal = set.model(st.irrigate);
    env.setModel(thermal);
    R.tmrtCache = null;
    env.setNotes(cpNotes(scene, noteData()));
    changed();
  }
  function setBurn(on) {
    st.burn = !!on;
    changed();
  }
  function html(id) {
    const s = cs();
    const d = { st: s, air12: airAt(12), air15: airAt(15), ...campusMisses(s, airAt(15)) };
    if (id === 'turf') return turfCard(d);
    if (id === 'play') return playCard(d);
    if (id === 'sail') return sailCard(d);
    if (id === 'water') return waterCard({ w: ws(), on: st.irrigate });
    if (id === 'kids') return kidsCard({ st: s, kids: kidStats(15, 400) });
    if (id === 'courts') return courtsCard(d);
    return burnCard(d);
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
    const s = cs();
    const w = ws();
    const t = s.table;
    return {
      turf15: tsMean(thermal, s.C.turf, 15),
      grass15: t.grass.ts[15],
      turf05: t.turf.ts[5],
      grass05: t.grass.ts[5],
      sail15: s.split[15].sail.ts,
      sun15: s.split[15].sun.ts,
      playBurn: (() => {
        const play = [...s.C.turf, ...s.C.track, ...s.C.courts, ...s.C.rubber];
        const over = new Set(R.campus.burn(15));
        return play.filter((i) => over.has(i)).length / play.length;
      })(),
      waterDrop: w.min.d,
      waterAt: w.min.h,
      waterLater: w.later.d,
      kidShade: kidStats(15, 400).shade,
    };
  }
  return {
    notes: () => cpNotes(scene, noteData()),
    look: () => ({ irrigate: st.irrigate, burn: st.burn, budget: 1 }),
    sync,
    html,
    /** Keyboard: I waters the pitch, U shows the burn limits; true if the key was the block's. */
    key(k) {
      if (k === 'i' || k === 'I') setIrrigate(!st.irrigate);
      else if (k === 'u' || k === 'U') setBurn(!st.burn);
      else return false;
      return true;
    },
    /** Heat-card rows: a ground cell's burn limit and margin now; on the watered pitch, the evaporative fraction now. */
    cardKey: 'campus',
    cardInfo: (cells, tmrtCell, h, leaf) => {
      if (leaf || tmrtCell === null) return null;
      const id = world.matIds[world.mat[tmrtCell]];
      const lim = burnLimit(id);
      const ts = thermal.ts(tmrtCell, h);
      return { cls: BURN_CLASS[id] ?? null, limit: lim, ts, over: lim !== null && ts > lim, ef: id === 'turf' && st.irrigate ? efAt((h - CP.irrigateHour.value) * 60) : null };
    },
    cardRows: (f) => `${f.limit !== null ? `<tr><td>${gl('contactBurn', '1-min burn limit')} (${CLASS_NAME[f.cls]})</td><td>${f.limit} °C · ${f.over ? `<b>above</b> by ${fmt(f.ts - f.limit)} K` : `below by ${fmt(f.limit - f.ts)} K`}</td></tr>` : ''}${f.ef !== null ? `<tr><td>watered at ${hm(CP.irrigateHour.value)}: evaporative fraction now</td><td>${f.ef.toFixed(2)}</td></tr>` : ''}`,
    glossary: () => ({}),
    /** Campus block (block 8) only: state {irrigate, burn}; set() it; numbers for the bands and cards; card HTML; children; burn cells. */
    api: {
      state: () => ({ irrigate: st.irrigate, burn: st.burn }),
      set(o) {
        if (o.irrigate !== undefined) setIrrigate(!!o.irrigate);
        if (o.burn !== undefined) setBurn(!!o.burn);
      },
      stats: () => {
        const s = cs();
        return { table: s.table, split: s.split, burn15: s.burn15, turfPeak: s.turfPeak, n: Object.fromEntries(Object.entries(s.C).map(([k, v]) => [k, v.length])) };
      },
      water: () => ws(),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#campus [data-card="${id}"]`)),
      ts: (x, y, h = S.hour) => thermal.ts(world.cellIndex(x, y), h),
      tmrt: (x, y, h = S.hour) => thermal.tmrt(world.cellIndex(x, y), h),
      burn: (h = S.hour) => R.campus.burn(quantHour(h)).slice(),
      burnAt: (x, y, h = S.hour) => {
        const i = world.cellIndex(x, y);
        const id = world.matIds[world.mat[i]];
        return { id, limit: burnLimit(id), ts: thermal.ts(i, h), hatched: R.campus.burn(quantHour(h)).includes(i) };
      },
      kids: (frame = S.frame, hour = S.hour) => {
        const hq = quantHour(hour);
        const sh = main.shadeFor(hq);
        return life.at(frame / 60, hq).filter((a) => a.child).map((a) => ({ x: a.x, y: a.y, shade: sh.night ? 0 : sh.cls[Math.floor(a.y / sh.cell) * sh.n + Math.floor(a.x / sh.cell)] }));
      },
      kidShade: (hour = S.hour, frame = S.frame) => kidStats(quantHour(hour), frame),
      playTime: (h = S.hour) => playTime(scene, h),
      models: () => set.cached(),
      site: () => ({ ...site }),
    },
  };
}
