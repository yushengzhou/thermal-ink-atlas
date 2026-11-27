// hutui: the overlay of the hutong block (block 5): margin-note text and the
// cards (lanes, courtyards, the summer mat awning tianpeng in Chinese and
// English, the evening splash, trees and screens).
import { SOURCES, BASIS, MODEL, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { lanesOf, solarNoon, splashStats, efPathRun, efPathStats, splashSensitivity, roofStats, courtyardStats, treeStats, shadedLanes, hutongGlossary, dwellShade } from './hutong.js';
import { quantHour } from './render.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const f2 = (v) => v.toFixed(2);
const pct = (v) => `${Math.round(v * 100)}%`;
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)} K`;
const hhmm = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated, on a 5 m grid; the air temperature is fixed.</p>`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the app (app.js htNoteData). */
export function htNotes(scene, d) {
  const text = {
    lane: [`Jujube Lane, 5 m wide, 4 m walls (H/W ${f2(d.laneHw)}):`, `at noon ${pct(d.laneNoon)} of the floor is in sun`],
    roofs: [`Grey tile roofs ${fmt(d.roof15)} °C at 3 pm,`, "above the brief's 50–62 °C (see docs/sources.md)"],
    awning: ['Under the mat awning (天棚):', `Tmrt ${fmt(d.awningTmrt)} °C; open courtyard sun ${fmt(d.sunTmrt)} °C`],
    splash: [`Splash at 19:00 (P): Lantern Lane ${sgn(d.d20)} K by 20:00,`, `${sgn(d.d23)} K at 23:00`],
    tree: ['Pagoda trees on the main lane:', `Tmrt ${fmt(d.treeTmrt)} °C beneath, ${fmt(d.laneSunTmrt)} °C in the sun`],
  };
  const terms = {
    lane: [['canyon', `H/W ${f2(d.laneHw)}`]],
    roofs: [['surfaceTemp', `${fmt(d.roof15)} °C at 3 pm`]],
    awning: [['tianpeng', 'mat awning (天棚)'], ['tmrt', 'Tmrt']],
    splash: [['waterStore', 'Splash at 19:00 (P)']],
    tree: [['tmrt', 'Tmrt']],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** Lanes card. d: {lanes (hutong.js lanesOf), noon}. */
export function lanesCard(d) {
  const l5 = d.lanes.find((l) => l.id === 'jujube');
  const rows = d.lanes.filter((l) => l.n).map((l) => `<tr><td>${l.name}</td><td>${l.W} m</td><td>${f2(l.hw)}</td><td>${f2(l.svf)} / ${f2(l.svfCells)}</td><td>${l.noon ? `${pct(l.noon.sunlit)} / ${pct(l.noon.analytic)}` : '—'}</td></tr>`).join('');
  return `
    ${close}
    <h3>Low lanes: in sun at noon</h3>
    <div class="mat">Single-storey lanes, walls ${fmt(l5.H)} m at the eaves · solar noon ${hhmm(d.noon.h)}, sun ${fmt(d.noon.alt)}° high</div>
    <table class="cmp">
      <tr><td></td><td>W</td><td>${gl('canyon', 'H/W')}</td><td>${gl('svf', 'sky view')} model / canyon</td><td>noon sun model / 1 − (H/tan β)/W</td></tr>
      ${rows}
    </table>
    <p class="note">At midsummer noon the sun stands ${fmt(d.noon.alt)}° high, so a 4 m wall casts only ${fmt(l5.noon.shadow)} m of shadow: three quarters of a 5 m lane is in the sun. The lanes are open to the sky (sky view about ${f2(l5.svf)}), so the midday shade comes from trees, vine pergolas and the summer mat awnings, not from the walls.</p>
    <p class="lit">Deep lanes are different: the Fez medina (H/W about 10, sky view 0.05) stays near the air temperature by day, about 10 K cooler than the modern town in the early afternoon (Johansson 2006). Lanes of a traditional block in Harbin have sky views 0.09–0.27 (Lin et al. 2019).</p>
    <p class="caveat">Invented geometry: plot sizes, the 4 m eaves and the lane widths are assumptions in the brief's range (hutong dimensions unverified). Lanes narrower than the 5 m grid cannot be shown. The houses are boxes at eave height: the pitched roofs are drawn but not in the shade or sky-view calculation (shade sampled every 1.25 m${tag(MODEL.shadeSamples)}). Sky view model vs an endless canyon at the same cell centres (the 10 m lane's cells sit off its centre line; its centre-line value is ${f2(d.lanes.find((l) => l.W === 10).svfCentre)}).</p>
    ${srcLine(['johansson2006', 'lin2019', 'brief5'])}`;
}

/** Courtyard card. d: {court (courtyardStats at 15:00)}. */
export function courtyardCard(d) {
  const c = d.court;
  return `
    ${close}
    <h3>${gl('siheyuan', 'Courtyards')}: shade from above</h3>
    <div class="mat">Paved grey-brick courtyards, 15:00 · air ${fmt(c.air)} °C</div>
    <table class="cmp">
      <tr><td></td><td>${gl('svf', 'sky view')}</td><td>${gl('surfaceTemp', 'paving')}</td><td>${gl('tmrt', 'Tmrt')}</td></tr>
      <tr class="t"><td>under a mat awning</td><td>${f2(c.awning.svf)}</td><td>${fmt(c.awning.ts)} °C</td><td>${fmt(c.awning.tmrt)} °C</td></tr>
      <tr><td>under a vine pergola</td><td>${f2(c.pergola.svf)}</td><td>${fmt(c.pergola.ts)} °C</td><td>${fmt(c.pergola.tmrt)} °C</td></tr>
      <tr><td>under a tree crown</td><td>${f2(c.crown.svf)}</td><td>${fmt(c.crown.ts)} °C</td><td>${fmt(c.crown.tmrt)} °C</td></tr>
      <tr><td>open, in full sun</td><td>${f2(c.sun.svf)}</td><td>${fmt(c.sun.ts)} °C</td><td>${fmt(c.sun.tmrt)} °C</td></tr>
      <tr><td colspan="4" class="sub">Sky view over all courtyard cells: ${f2(c.svf10)}–${f2(c.svf90)} (10th–90th percentile).</td></tr>
    </table>
    <p class="note">Houses on all four sides shade only the edges of a yard; the rest is shaded from above, by a tree, a vine or, in the richest yards, a mat awning over the whole court. Walkers who stop to rest pick these spots.</p>
    <p class="lit">Measured courtyard air (quoted, not simulated): in Córdoba and Seville courtyards were 3–6 K below the outdoor air on hot days and up to 11–15 K at 40–45 °C (abstracts only, unverified); in Harbin, courtyards with a lower sky view were only 0.3 K cooler (at most 0.6 K) and 0.4 K lower on a globe thermometer (Lin et al. 2019); the Fez medina's air was about 10 K cooler than the modern town in the early afternoon but 2–4 K warmer before dawn (Johansson 2006).</p>
    <p class="caveat">The air temperature in this model is fixed, so the courtyards' "cool pond" of air cannot appear: only the surfaces and the radiation differ. Awnings and pergolas count as full cover for the sky view (crown factor${tag(MODEL.screenCover)}).</p>
    ${srcLine(['spainCourtyard', 'lin2019', 'johansson2006', 'brief5'])}`;
}

/** The summer mat awning, tianpeng: the cultural card, in Chinese and English. d: {court}. */
export function tianpengCard(d) {
  const c = d.court;
  const a = MATERIALS.awning;
  return `
    ${close}
    <h3>天棚 · The summer mat awning</h3>
    <div class="mat">天棚鱼缸石榴树 · an old Beijing saying: "tianpeng, fish bowl, pomegranate tree"</div>
    <p lang="zh-Hans">老北京夏天在院里搭天棚：芦席棚顶高出屋檐，四周席子可卷起通风。老北京俗语“天棚鱼缸石榴树”说的就是四合院的夏景，漫画家李滨声曾以此作画（见邓云乡《天棚遮阴》）。院中多种枣树、槐树，石榴寓意多子。傍晚往地上洒水降温，与日本江户时代以来的“打ち水”（洒水）同理。</p>
    <p lang="en">In old Beijing summers a family built a tianpeng over the courtyard: a roof of reed mats on poles, higher than the eaves, with side mats that roll up to let the air through. An old Beijing saying sums up a courtyard summer as "tianpeng, fish bowl, pomegranate tree"; the cartoonist Li Binsheng drew it (as recorded by Deng Yunxiang, "Tianpeng zheyin"). Courtyards were planted with jujube and pagoda trees, and the pomegranate stands for many children. Sprinkling water on the ground in the evening cools it, the same idea as Japan's uchimizu (打ち水), practised since the Edo period.</p>
    <table class="cmp">
      <tr><td></td><td>${gl('tmrt', 'Tmrt')} 15:00</td></tr>
      <tr class="t"><td>under the awning (lets through ${pct(a.tr.value)} of the sun${tag(a.tr)})</td><td>${fmt(c.awning.tmrt)} °C</td></tr>
      <tr><td>the same courtyards' open sun</td><td>${fmt(c.sun.tmrt)} °C</td></tr>
    </table>
    <p class="caveat">北京傍晚泼水的习俗本身：未找到可引用的来源（未核实）。 No citable source was found for the Beijing evening-splashing custom itself (unverified); the uchimizu parallel and the awning are from the sources below. The awning's transmission (10–30% for reed mats) is the brief's, unverified.</p>
    ${srcLine(['deng', 'visitBeijing', 'nippon', 'brief5'])}`;
}

/** Splash card. d: {s (splashStats on the splashed lanes), sens: [{beta, peak, d23}], ef (efPathStats), on}. */
export function splashCard(d) {
  const s = d.s;
  const P = (k) => MODEL[k];
  return `
    ${close}
    <h3>Splashing at 19:00: cool for a few hours</h3>
    <div class="mat">${gl('waterStore', 'Water store')} on the splashed lanes and courtyards · ${d.on ? 'splash on' : 'splash off (P to show it)'}</div>
    <table class="cmp">
      <tr><td>water left on the paving, W0</td><td>${P('splashW0').value} mm${tag(P('splashW0'))}</td></tr>
      <tr><td>wetness of splashed brick, β_wet</td><td>${P('splashBeta').value}${tag(P('splashBeta'))}</td></tr>
      <tr><td colspan="2" class="sub">Splashed lanes (sky view ${f2(s.svf)}), splash minus no splash:</td></tr>
      <tr class="t"><td>paving, ${hhmm(s.peakAt)} (largest within 1 h)</td><td>${K(s.peak)}</td></tr>
      <tr><td>paving, 21:00 / 23:00</td><td>${K(s.d21)} / ${K(s.d23)}</td></tr>
      <tr><td>paving, next day 15:00</td><td>${K(s.next15)}</td></tr>
      <tr class="t"><td>${gl('tmrt', 'Tmrt')}, 20:00 / 21:00</td><td>${K(s.tmrt20)} / ${K(s.tmrt21)}</td></tr>
      <tr><td>water left at 21:00 / 23:00</td><td>${f2(s.w21)} / ${f2(s.w23)} mm</td></tr>
      <tr><td>evaporated per splash (at most)</td><td>${f2(s.perSplash)} of ${s.w0} mm</td></tr>
      <tr><td>coolest wet paving minus the ${gl('wetBulb', 'wet-bulb')}</td><td>${K(s.margin)}</td></tr>
      <tr><td>the old evaporation term alone (EF × Q*)</td><td>${K(-d.ef.max)}</td></tr>
      ${d.sens.map((x) => `<tr><td class="sub">β_wet ${x.beta}: largest / 23:00</td><td class="sub">${K(x.peak)} / ${K(x.d23)}</td></tr>`).join('')}
    </table>
    <p class="note">A bucket of water thrown on the warm brick at 19:00 evaporates over the evening; the heat that takes comes out of the paving, which cools by several degrees within the hour and stays cooler until the water is gone after midnight. By the next afternoon the sun has dried it: only the ground's lower daily mean remains.</p>
    <p class="lit">Paris, Rue du Louvre: about 1 L m⁻² per cycle, the surface −7.5 K at 19:30 and −6 K at 20:30, lasting several hours (Hendel et al. 2015); air −0.79 K at most and Tmrt −1.76 K (Hendel et al. 2016). Kobe: 0.025 mm per pass cools −2 to −4 K at once but is gone within 30 minutes in sun, so evening watering is recommended (Takebayashi et al. 2023). A watered road fell from 50 to 40 °C in about an hour (Kato et al. 2008, unverified).</p>
    <p class="caveat">The model's old evaporation term needs positive net radiation, which is gone after sunset, so it cannot show an evening splash; the water store W is a separate term (bulk evaporation${tag(P('waterStore'))}). The air is fixed: the splash cools the paving and the radiation people feel, not the air. The design day repeats with a splash every evening, so the paving is about ${fmt(Math.abs(s.before))} K cooler even before the splash. W0 sits at the top edge of the brief's 0.5–1.0 mm; β_wet is the brief's range (0.3–1).</p>
    ${srcLine(['hendel2015', 'hendel2016', 'takebayashi2023', 'kato2008', 'bolton1980', 'brief5'])}`;
}

/** Trees and screens card. d: {trees (treeStats at 15:00), court}. */
export function treesCard(d) {
  const sp = ['pagodaTree', 'jujube', 'pomegranate'].filter((k) => d.trees[k]);
  return `
    ${close}
    <h3>Pagoda, jujube, pomegranate: shade by species</h3>
    <div class="mat">Crown transmission from leaf area, exp(−0.5 LAI) · 15:00</div>
    <table class="cmp">
      <tr><td></td><td>lets through</td><td>${gl('tmrt', 'Tmrt')} at the trunk</td></tr>
      ${sp.map((k) => `<tr><td>${MATERIALS[k].name}</td><td>${pct(MATERIALS[k].tr.value)}${tag(MATERIALS[k].tr)}</td><td>${fmt(d.trees[k].tmrt)} °C</td></tr>`).join('')}
      <tr><td>${MATERIALS.pergola.name}</td><td>${pct(MATERIALS.pergola.tr.value)}${tag(MATERIALS.pergola.tr)}</td><td>${fmt(d.court.pergola.tmrt)} °C</td></tr>
      <tr><td>${MATERIALS.awning.name}</td><td>${pct(MATERIALS.awning.tr.value)}${tag(MATERIALS.awning.tr)}</td><td>${fmt(d.court.awning.tmrt)} °C</td></tr>
      <tr><td>courtyard in full sun</td><td>100%</td><td>${fmt(d.court.sun.tmrt)} °C</td></tr>
    </table>
    <p class="note">The pagoda tree's wide, dense crown stands above the roofs and shades the lanes; jujubes are open and airy; pomegranates are small and low. The trunk cell is not always in its own tree's shade at 3 pm, when the sun is in the west.</p>
    <p class="lit">Beijing street trees in summer: shade cooled the air by 1.0–2.1 K and cut the sunshine by 481–789 W m⁻²; the pagoda tree came second for comfort (Yang &amp; Wang 2024, abstract only). Overhead vine arbours give more than 90% cover; pergola vines need a leaf area index of 2 or more, ideally 3.</p>
    <p class="caveat">No measured leaf area for jujube or pagoda trees was found: the indices are the brief's (unverified). Crowns are spheres; leaf temperature is an engine assumption. Trees and screens enter the sky view through the crown factor, as in the other blocks.</p>
    ${srcLine(['yang2024', 'ucdavis', 'jjshs', 'brief5'])}`;
}

/** Button labels for the hutong panel cards. */
export const HT_CARDS = [
  ['lanes', 'Low lanes'],
  ['courtyard', 'Courtyards'],
  ['tianpeng', '天棚 mat awning'],
  ['splash', 'Splash at 19:00'],
  ['trees', 'Trees and vines'],
];

/**
 * The block's plugin for app.js: the evening-splash toggle and the cards,
 * notes, the heat-card water row, glossary numbers and API. env as for the
 * block-6 plugin (pkui.js pkApp), with setup (hutong.js hutongSetup),
 * setModel(T) and setNotes(notes); splash0: the splash at load (?splash=).
 */
export function htApp(env, splash0) {
  const { scene, world, root, card, R, S, main } = env;
  const htSet = env.setup;
  let thermal = env.thermal;
  const st = { splash: splash0 };
  // numbers for notes, cards and glossary; the splash comparison once, the 15:00 numbers per model (splash on / off)
  let htFixed = null;
  const htCache = new Map();
  const ht = () => {
    if (!htFixed) {
      const noon = solarNoon(scene.site);
      const lanes = lanesOf(world, noon);
      const band = lanes.filter((l) => l.splash).flatMap((l) => l.cells);
      const dry = htSet.base();
      const wet = htSet.splash();
      htFixed = { noon, lanes, band, dry, wet, s: splashStats(world, dry, wet, band, htSet.cells), sens: null, ef: null };
    }
    const key = st.splash ? 1 : 0;
    if (!htCache.has(key)) htCache.set(key, { roof: roofStats(world, thermal, 15), court: courtyardStats(world, thermal, 15), trees: treeStats(world, thermal, 15), shaded: shadedLanes(world, thermal, 15) });
    return { ...htFixed, ...htCache.get(key) };
  };
  /** Lazily: beta_wet sensitivity and the old EF path alone, on the splashed lanes (small runs). */
  const htExtra = () => {
    const h = ht();
    if (!htFixed.sens) htFixed.sens = splashSensitivity(world, htSet.slots, h.dry, h.band);
    if (!htFixed.ef) htFixed.ef = efPathStats(h.dry, efPathRun(world, htSet.slots, h.band), h.band);
    return { sens: htFixed.sens, ef: htFixed.ef };
  };
  function noteData() {
    const h = ht();
    const l5 = h.lanes.find((l) => l.id === 'jujube');
    const mainK = scene.ground.findIndex((g) => g.id === 'main');
    const mc = [];
    for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && world.parcel[i] === mainK) mc.push(i);
    const m = (a) => a.reduce((x, i) => x + thermal.tmrt(i, 15), 0) / Math.max(1, a.length);
    return {
      laneHw: l5.hw,
      laneNoon: l5.noon.sunlit,
      roof15: h.roof.mean,
      awningTmrt: h.court.awning.tmrt,
      sunTmrt: h.court.sun.tmrt,
      d20: h.s.d20,
      d23: h.s.d23,
      treeTmrt: m(mc.filter((i) => thermal.sunlit(i, 15) <= 0.5)),
      laneSunTmrt: m(mc.filter((i) => thermal.sunlit(i, 15) > 0.95)),
    };
  }
  const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="hutong" aria-label="Hutong controls">
        <div class="seg">${btn('data-splash', '1', 'splash at 19:00 (P)')}</div>
        <div class="measures"><div class="hand">Cards</div>${HT_CARDS.map(([id, label]) => btn('data-card', id, label)).join('')}</div>
      </div>`,
  );
  const el = root.getElementById('hutong');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.splash) setSplash(!st.splash);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-splash]').setAttribute('aria-pressed', String(!!st.splash));
    root.body.dataset.splash = st.splash ? '1' : '0';
  }
  function setSplash(on) {
    if (!!on === st.splash) return;
    st.splash = !!on;
    thermal = htSet.model(st.splash);
    env.setModel(thermal);
    env.setNotes(htNotes(scene, noteData()));
    sync();
    env.reopen();
    env.redraw();
  }
  function html(id) {
    const h = ht();
    if (id === 'lanes') return lanesCard({ lanes: h.lanes, noon: h.noon });
    if (id === 'courtyard') return courtyardCard({ court: h.court });
    if (id === 'tianpeng') return tianpengCard({ court: h.court });
    if (id === 'splash') return splashCard({ s: h.s, ...htExtra(), on: st.splash });
    return treesCard({ trees: h.trees, court: h.court });
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
  let wetSet = null;
  return {
    notes: () => htNotes(scene, noteData()),
    look: () => ({}),
    sync,
    html,
    /** Keyboard: P toggles the splash; true if the key was the block's. */
    key(k) {
      if (k !== 'p' && k !== 'P') return false;
      setSplash(!st.splash);
      return true;
    },
    /** Heat card: water on a splashed ground cell now. */
    cardKey: 'water',
    cardInfo: (cells, tmrtCell, h) => (tmrtCell !== null && (wetSet ??= new Set(htSet.cells)).has(tmrtCell) ? { now: thermal.water(tmrtCell, h), on: !!st.splash } : null),
    cardRows: (w) => `<tr><td>${gl('waterStore', 'water on the paving')} now</td><td>${w.now.toFixed(2)} mm${w.on ? ' (splashed at 19:00)' : ' (splash off: P)'}</td></tr>`,
    glossary: () => ({ hutong: hutongGlossary(world, thermal, ht()) }),
    /**
     * Hutong block (block 5) only: state {splash}; set() it; numbers for the
     * bands and cards; card HTML; water on the paving at a point; dwellers by
     * the shade class of their spot.
     */
    api: {
      state: () => ({ splash: !!st.splash }),
      set(o) {
        if (o.splash !== undefined) setSplash(!!o.splash);
      },
      stats: () => {
        const h = ht();
        const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'cells'));
        return { noon: { h: h.noon.h, alt: h.noon.alt }, lanes: h.lanes.map(strip), s: { ...h.s, curve: undefined, marginAt: undefined }, roof: h.roof, court: h.court, trees: h.trees, shaded: strip(h.shaded), cells: htSet.cells.length };
      },
      extra: () => htExtra(),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#hutong [data-card="${id}"]`)),
      water: (x, y, h = S.hour) => thermal.water(world.cellIndex(x, y), h),
      dwell: (frame = S.frame, hour = S.hour) => {
        const hq = quantHour(hour);
        return dwellShade(main.life, main.shadeFor(hq), hq);
      },
      models: () => htSet.cached(),
    },
  };
}
