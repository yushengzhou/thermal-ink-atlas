// pkui: the overlay of the car park and brownfield block (block 6): margin
// notes and the cards (thick pavement storage and the night release, the PV
// canopy, lot trees, the rusty shed, the brownfield ground, and the hot car,
// which is information only).
import { SOURCES, BASIS, MODEL, MATERIALS } from './materials.js';
import { gl } from './glossary.js';
import { parkingStats, parkingGlossary, fluxSamples, pvCompare, slab, STEMPIHAR, tsMean, fluxMean, shedTau } from './parking.js';
import { pkOverlay } from './pkkit.js';
import { quantHour } from './render.js';

const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const r0 = (v) => String(Math.round(v));
const pct = (v) => `${Math.round(v * 100)}%`;
const sgn = (v) => `${v < 0 ? '−' : '+'}${fmt(Math.abs(v))}`;
const K = (v) => `${sgn(v)} K`;
const W = (v) => `${v < 0 ? '−' : ''}${r0(Math.abs(v))} W m⁻²`;
const hhmm = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const tag = (v) => (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') + (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
const srcLine = (keys) => `<p class="src">Sources: ${keys.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: ${gl('forceRestore', 'force-restore')}, simulated, on a 5 m grid; the air temperature is fixed.</p>`;
const close = '<button class="x" aria-label="close">×</button>';

/** Margin notes (at most 5). d: numbers from the app (app.js pkNoteData). */
export function pkNotes(scene, d) {
  const text = {
    asphalt: [`Open asphalt: ${fmt(d.asphalt15)} °C at 3 pm,`, `still ${fmt(d.asphalt23)} °C at 11 pm, giving back ${r0(-d.asphaltG23)} W m⁻²`],
    shed: [`Rusty shed roof: ${fmt(d.shed15)} °C at 3 pm,`, `${fmt(d.shed23)} °C at 11 pm, below the ${fmt(d.air23)} °C air`],
    pv: ['Under the solar canopy:', `${fmt(d.pv15)} °C at 3 pm; open asphalt ${fmt(d.asphalt15)} °C`],
    soil: ['Bare soil and ballast cool sooner:', `soil ${fmt(d.soil23)} °C at 11 pm, ${fmt(d.asphalt23 - d.soil23)} K below the asphalt`],
    yard: [`Concrete yard: ${fmt(d.yard15)} °C at 3 pm (cooler),`, `${fmt(d.yard23)} °C at 11 pm (asphalt ${fmt(d.asphalt23)} °C)`],
  };
  const terms = {
    asphalt: [['groundFlux', `giving back ${r0(-d.asphaltG23)} W m⁻²`], ['nightLag', `still ${fmt(d.asphalt23)} °C at 11 pm`]],
    shed: [['heatCapacity', 'Rusty shed roof']],
    pv: [['svf', 'Under the solar canopy']],
    soil: [['thermalInertia', 'Bare soil and ballast cool sooner']],
    yard: [['heatStorage', `${fmt(d.yard23)} °C at 11 pm`]],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: text[n.key], terms: terms[n.key] }));
}

/** Thick pavement storage and the night release. d: {st (parking.js parkingStats), curve: [{h, air, rows: {asphalt, concrete, soil, shed, lawn: [Ts, G]}}], slabs: {hma, pcc}, flux}. */
export function storageCard(d) {
  const t = d.st.table;
  const NAMES = [['asphalt', 'open asphalt'], ['concrete', 'concrete yard'], ['soil', 'bare soil'], ['lawn', 'lawn'], ['shed', 'shed roof']];
  const head = d.curve.map((c) => `<td>${String(c.h).padStart(2, '0')} h</td>`).join('');
  const rows = NAMES.map(([k, name]) => `<tr><td>${name}</td>${d.curve.map((c) => `<td>${fmt(c.rows[k][0])}<br><span class="sub">${r0(c.rows[k][1])}</span></td>`).join('')}</tr>`).join('');
  const lead = (d.st.ranges.openAsphalt.hMax - d.st.peakG.h + 24) % 24;
  return `
    ${close}
    <h3>${gl('heatStorage', 'Thick pavement')}: hot by day, warm all night</h3>
    <div class="mat">${gl('groundFlux', 'Ground heat flux G')}: + into the ground, − given back · ${d.flux ? 'night-release strokes on (G)' : 'press G for the night-release strokes'}</div>
    <table class="cmp">
      <tr><td>°C (G in W m⁻² below)</td>${head}</tr>
      ${rows}
      <tr><td>air</td>${d.curve.map((c) => `<td>${fmt(c.air)}</td>`).join('')}</tr>
    </table>
    <p class="note">By day the dense asphalt and concrete soak heat down into the slab (G up to ${W(d.st.peakG.g)} at ${hhmm(d.st.peakG.h)}). After sunset the slab gives it back: at 23:00 open asphalt still sends ${W(-t.openAsphalt.g23)} up to its surface, so it stays ${K(t.openAsphalt.t23 - d.st.air.t23)} above the air and ${K(t.openAsphalt.t23 - t.soil.t23)} above the bare soil. The rusty shed roof stores almost nothing (${W(t.shed.g23)}): it is already below the air.</p>
    <table class="cmp">
      <tr><td>${gl('dampingDepth', 'damping depth')} d = √(κτ/π), asphalt / concrete</td><td>${d.slabs.hma.d.toFixed(3)} / ${d.slabs.pcc.d.toFixed(3)} m${tag(MODEL.dampingDepth)}</td></tr>
      <tr><td>admittance √(kρc) from the same inputs / used here</td><td>${r0(d.slabs.hma.mu)} / ${MATERIALS.asphalt.mu.value}, ${r0(d.slabs.pcc.mu)} / ${MATERIALS.concrete.mu.value}</td></tr>
      <tr><td>G peaks before Ts: model / pure sine wave</td><td>${fmt(lead)} h / 3 h</td></tr>
      <tr><td>asphalt minus lawn, heat to the air at 23:00 (h_c ΔT)</td><td>${W(d.st.gap.find((g) => g.h === 23).gap)}</td></tr>
    </table>
    <p class="lit">Grass parking vs asphalt: about 50 W m⁻² less sensible heat at night, 100–150 by day (Takebayashi &amp; Moriyama 2009). Modelled Phoenix pavements: minimum 34.0 °C for asphalt and 33.5 °C for concrete; surface temperatures stop changing above about 203 mm thickness (Stempihar et al. 2012). From space, roads were the only surface class warming the night in Phoenix (Zhu et al. 2022, interpretation, unverified).</p>
    <p class="caveat">Force-restore treats each surface as a uniform slab deeper than about 1.5 damping depths (0.2 m): right for the thick lot and yard, not for thin paving (lower μ, see the thin-layer row in docs/sources.md). No measured night-time W m⁻² for a car park was found: the night fluxes are the model's alone. The air is fixed, so the heat the lot gives the air is not felt by the air here.</p>
    ${srcLine(['stempihar2012', 'takebayashi2009', 'zhu2022', 'deardorff', 'brief6'])}`;
}

/** PV canopy. d: {pv: {open, empty, bays, openBays}: dayRange-like {max, min, range, t15, t05}}. */
export function pvCard(d) {
  const p = d.pv;
  const red = (a) => `${Math.round((a.range / p.open.range - 1) * 100)}%`;
  return `
    ${close}
    <h3>Solar canopy: shade by day, a lid at night</h3>
    <div class="mat">Opaque PV panels 4.2 m up · ground beneath: ${gl('svf', 'sky view')} ${MODEL.pvSvf.value}${tag(MODEL.pvSvf)} (as measured by Golden et al.)</div>
    <table class="cmp">
      <tr><td></td><td>15:00</td><td>max / min</td><td>daily range</td></tr>
      <tr><td>open asphalt (no car)</td><td>${fmt(p.open.t15)} °C</td><td>${fmt(p.open.max)} / ${fmt(p.open.min)}</td><td>${fmt(p.open.range)} K</td></tr>
      <tr class="t"><td>an empty bay under the canopy</td><td>${fmt(p.empty.t15)} °C</td><td>${fmt(p.empty.max)} / ${fmt(p.empty.min)}</td><td>${fmt(p.empty.range)} K (${red(p.empty)})</td></tr>
      <tr><td>the canopy's bays, with the cars</td><td>${fmt(p.bays.t15)} °C</td><td>${fmt(p.bays.max)} / ${fmt(p.bays.min)}</td><td>${fmt(p.bays.range)} K</td></tr>
      <tr><td>open bays, with the cars</td><td>${fmt(p.openBays.t15)} °C</td><td>${fmt(p.openBays.max)} / ${fmt(p.openBays.min)}</td><td>${fmt(p.openBays.range)} K</td></tr>
    </table>
    <p class="note">The panels take the sun off the bays all day, so the asphalt beneath stays near the air temperature; at night they hide the cold sky, so it cools a little less than the open lot. Cars under the canopy are out of the sun too.</p>
    <p class="lit">Phoenix, 17 June 2004 (air up to 41 °C): exposed asphalt 63.5 / 28.5 °C (max / min), under a PV canopy 37.0 / 27.7 °C, the daily range about 70% smaller (Golden et al. 2007; the paper has internal inconsistencies).</p>
    <p class="caveat">Here the range shrinks by ${red(p.empty)}, more than in Phoenix and outside the spec's −60 to −75% band (see docs/sources.md): the open asphalt swings ${fmt(p.open.range)} K here against 35.0 K there, the bay under the canopy ${fmt(p.empty.range)} K against 9.3 K, on a cooler day. Not tuned. The panel undersides count as warm walls (air + 2 K, more by day); a test run with hotter undersides by day and cooler ones at night brings the range inside the band (a sensitivity in docs/sources.md, not used here). The panels' own heat, their electricity and the air under them are not modelled.</p>
    ${srcLine(['golden2007', 'brief6'])}`;
}

/** Lot trees. d: {trees, openBays (15:00 Ts of the bay rows), share}. */
export function lotTreesCard(d) {
  return `
    ${close}
    <h3>Trees between the bays</h3>
    <div class="mat">Crowns 4.2 m across the footpaths, every 8 m · 15:00 · tree crowns let through ${pct(MODEL.canopyTransmission.value)} of the sun${tag(MODEL.canopyTransmission)}</div>
    <table class="cmp">
      <tr><td></td><td>bays, 15:00</td><td>bays, 23:00</td></tr>
      <tr><td>open bay rows</td><td>${fmt(d.openBays.t15)} °C</td><td>${fmt(d.openBays.t23)} °C</td></tr>
      <tr class="t"><td>bay rows under the trees</td><td>${fmt(d.trees.t15)} °C</td><td>${fmt(d.trees.t23)} °C</td></tr>
      <tr><td>difference</td><td>${K(d.trees.t15 - d.openBays.t15)}</td><td>${K(d.trees.t23 - d.openBays.t23)}</td></tr>
    </table>
    <p class="note">Shade keeps the sun off the asphalt and off the cars; less heat goes into the slab, so less comes out at night. The bay rows are about ${pct(d.share)} covered by cars in both sections, which shade the ground beneath them too.</p>
    <p class="lit">Sacramento parking lots: tree shade lowered asphalt by about 20 K, the air at 0.5 m by 1.3 K and car cabins by 26 K (Scott, Simpson &amp; McPherson 1999); in a model of Nagoya, greening one parking lot lowered its summer surface temperature by up to 7.26 K, though over the whole area the effect was slight (Onishi et al. 2010).</p>
    <p class="caveat">The model's 5 m cells mix shaded and sunlit ground under each crown, so the cell means differ by less than a spot right under a tree. The air under the trees is not simulated (fixed air).</p>
    ${srcLine(['scott1999', 'onishi2010', 'brief6'])}`;
}

/** Rusty shed. d: {shed: table row, cool: {peak, at, after}, tau (min), air, set}. */
export function shedCard(d) {
  const m = MATERIALS.rustShed;
  return `
    ${close}
    <h3>The rusty shed: no heat to give back</h3>
    <div class="mat">One sheet of corrugated steel: ${gl('heatCapacity', 'heat capacity')} C ${m.thinC.value / 1000} kJ m⁻² K⁻¹${tag(m.thinC)} · ${gl('emissivity', 'ε')} ${m.eps.value}${tag(m.eps)}</div>
    <table class="cmp">
      <tr><td>roof at 15:00 / 23:00</td><td>${fmt(d.shed.t15)} / ${fmt(d.shed.t23)} °C</td></tr>
      <tr><td>air at 23:00</td><td>${fmt(d.air.t23)} °C</td></tr>
      <tr><td>fastest evening cooling (at ${hhmm(d.cool.at)}, before sunset)</td><td>${fmt(d.cool.peak)} K/h</td></tr>
      <tr class="t"><td>first hour after sunset (${hhmm(d.set)})</td><td>${fmt(d.cool.after)} K (slower than the slabs)</td></tr>
      <tr><td>time constant C / (4εσT³ + h_c)</td><td>${fmt(d.tau)} min</td></tr>
      <tr><td>${gl('groundFlux', 'G')} at 23:00</td><td>${W(d.shed.g23)}</td></tr>
    </table>
    <p class="note">The thin roof follows its sunshine within minutes. As the low evening sun leaves it, it drops faster than any other surface of the block, and by sunset it has already lost most of its heat: after that it only follows the slowly cooling sky and ends the night below the air.</p>
    <p class="caveat">In the first hour after sunset the asphalt, concrete and soil cool faster than the roof, so the spec's "steepest cooling after sunset" is not met (band 4 missed; see docs/sources.md): the roof's fastest cooling comes before sunset. Not tuned. The shed's walls, its dark inside and the air in it are not modelled; the roof is one cell layer at 5–8 m. Emissivity of rusted steel varies widely (0.69–0.88 in emissivity tables, unverified); with a lower ε the roof cools less at night.</p>
    ${srcLine(['optris', 'brief6'])}`;
}

/** Brownfield ground. d: {st}. */
export function soilCard(d) {
  const t = d.st.table;
  const row = (k, name) => `<tr><td>${name}</td><td>${fmt(t[k].t15)}</td><td>${fmt(t[k].t23)}</td><td>${W(t[k].g23)}</td></tr>`;
  return `
    ${close}
    <h3>Brownfield: soil, scrub and ballast cool sooner</h3>
    <div class="mat">Open ground, sky view about 1 · °C at 15:00 and 23:00, ${gl('groundFlux', 'G')} at 23:00</div>
    <table class="cmp">
      <tr><td></td><td>15:00</td><td>23:00</td><td>G 23:00</td></tr>
      ${row('openAsphalt', 'open asphalt')}
      ${row('soil', 'bare compacted soil')}
      ${row('scrub', 'scrubby dry vegetation')}
      ${row('ballast', 'rail ballast')}
      ${row('lawn', 'irrigated lawn')}
    </table>
    <p class="note">Dry soil and loose ballast get nearly as hot as asphalt in the afternoon sun, but they hold less heat (lower ${gl('admittance', 'admittance')}), so by 23:00 they are ${fmt(t.openAsphalt.t23 - t.soil.t23)}–${fmt(t.openAsphalt.t23 - t.ballast.t23)} K cooler and give back less. Only the watered lawn, which spends sunshine on evaporation, stays cool by day.</p>
    <p class="lit">At its hottest, asphalt sends out about 150 W m⁻² more infrared than bare soil (Asaeda, Ca &amp; Wake 1996, via the brief, unverified).</p>
    <p class="caveat">The brownfield values (soil, scrub, ballast: albedo, admittance, evaporation) are the brief's assumptions, not measurements; real brownfield soils vary with moisture, rubble and crust. Moisture after rain is not modelled.</p>
    ${srcLine(['asaeda1996', 'oke', 'brief6'])}`;
}

/** The hot car: information only (not modelled). d: {openBay15, openAsphalt15}. */
export function hotCarCard(d) {
  return `
    ${close}
    <h3>A parked car in the sun (information only)</h3>
    <div class="mat">Not modelled: cars here only shade the asphalt beneath them</div>
    <table class="cmp">
      <tr><td>cabin air, in sun / in shade (Tempe, the study's steady-state mean)</td><td>47.6 / 39.5 °C</td></tr>
      <tr><td>dashboard after 1 h, sun / shade (the university's press release)</td><td>69 / 48 °C</td></tr>
      <tr><td>cabin rise, first minutes</td><td>+1.8 K per 5 min; 80% of the rise in 30 min</td></tr>
      <tr><td>on a mild 22 °C day</td><td>cabin up to 47 °C</td></tr>
      <tr><td>cabins under lot trees</td><td>−26 K</td></tr>
      <tr><td>black vs silver car roof</td><td>up to 25 K hotter; cabin air 5–6 K</td></tr>
      <tr><td>black vs white car roofs (Lisbon)</td><td>about 71 °C, about 20 degrees hotter</td></tr>
      <tr><td>air next to a black car (Lisbon)</td><td>up to 3.8 degrees warmer</td></tr>
      <tr class="t"><td>US children who died in hot cars, 1998–2024</td><td>1,010 (39 in 2024)</td></tr>
    </table>
    <p class="note">A closed car is a small greenhouse: sunlight comes in through the glass and the heat stays. Most of the rise happens in the first half hour, and cracking the windows does not help. Never leave a child or a pet in a parked car.</p>
    <p class="lit">Vanos et al. 2018 (Tempe, Arizona); McLaren, Null &amp; Quinn 2005; Scott, Simpson &amp; McPherson 1999; Levinson et al. 2011; Matias et al. 2025 (air) and 2026 (car roofs, unverified); US National Safety Council (via the brief).</p>
    <p class="caveat">This model does not simulate cabins, car bodies or the warm air next to them. For scale, the asphalt in the open bays is ${fmt(d.openBay15)} °C at 15:00 and open asphalt ${fmt(d.openAsphalt15)} °C (model).</p>
    ${srcLine(['vanos2018', 'mclaren2005', 'scott1999', 'levinson2011', 'matias2025', 'matias2026', 'nsc'])}`;
}

/** Button labels for the parking panel cards. */
export const PK_CARDS = [
  ['storage', 'Night release'],
  ['pv', 'Solar canopy'],
  ['trees', 'Lot trees'],
  ['shed', 'Rusty shed'],
  ['soil', 'Brownfield'],
  ['car', 'Hot car (info)'],
];

/**
 * The block's plugin for app.js: its controls (the night-release toggle and
 * the cards), notes, heat-card rows, glossary numbers, renderer hooks and API.
 * env: {scene, world, thermal, root, card, R, S (app state: hour, paused),
 * query, hideCard(), reopen() (re-render an open card), redraw() (draw if paused)}.
 */
export function pkApp(env) {
  const { scene, world, thermal, root, card, R, S } = env;
  const st = { flux: env.query.get('flux') === '1' }; // ?flux=0|1, default off
  let fixed = null;
  const pk = () => (fixed ??= { st: parkingStats(world, thermal), pv: null });
  /** Lazily: the PV comparison with an empty bay under the canopy (a run without cars on those cells). */
  const pkPv = () => (pk().pv ??= pvCompare(world, thermal, pk().st.C));
  // ground heat flux samples for the night-release overlay, per quantised hour
  const fc = new Map();
  R.flux = (hq) => {
    if (!fc.has(hq)) {
      if (fc.size >= 24) fc.delete(fc.keys().next().value);
      fc.set(hq, fluxSamples(world, thermal, hq));
    }
    return fc.get(hq);
  };
  R.overlay = pkOverlay;

  const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
  root.body.insertAdjacentHTML(
    'beforeend',
    `<div id="parking" class="blockpanel" aria-label="Car park controls">
        <div class="seg">${btn('data-flux', '1', 'night release G')}</div>
        <div class="measures"><div class="hand">Cards</div>${PK_CARDS.map(([id, label]) => btn('data-card', id, label, id === 'car' ? 'class="warn"' : '')).join('')}</div>
      </div>`,
  );
  const el = root.getElementById('parking');
  el.addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (!b) return;
    if (b.dataset.flux) setFlux(!st.flux);
    else if (b.dataset.card) show(b.dataset.card, b);
  });
  function sync() {
    el.querySelector('[data-flux]').setAttribute('aria-pressed', String(!!st.flux));
    root.body.dataset.flux = st.flux ? '1' : '0';
  }
  function setFlux(on) {
    st.flux = !!on;
    sync();
    env.reopen();
    env.redraw();
  }
  function html(id) {
    const P = pk();
    const s = P.st;
    if (id === 'storage') {
      const C = s.C;
      const K = { asphalt: C.openAsphalt, concrete: C.yard, soil: C.soil, lawn: C.lawn, shed: C.shed };
      const curve = [12, 15, 20, 23, 4].map((h) => ({ h, air: thermal.air(h), rows: Object.fromEntries(Object.entries(K).map(([k, c]) => [k, [tsMean(thermal, c, h), fluxMean(thermal, c, h)]])) }));
      return storageCard({ st: s, curve, slabs: { hma: slab(STEMPIHAR.hma.k, STEMPIHAR.hma.rho, STEMPIHAR.hma.c), pcc: slab(STEMPIHAR.pcc.k, STEMPIHAR.pcc.rho, STEMPIHAR.pcc.c) }, flux: !!st.flux });
    }
    if (id === 'pv') return pvCard({ pv: pkPv() });
    if (id === 'trees') return lotTreesCard({ trees: s.table.treeBays, openBays: s.table.openBays, share: (s.table.openBays.share + s.table.treeBays.share) / 2 });
    if (id === 'shed') return shedCard({ shed: s.table.shed, cool: s.cool.shed, tau: shedTau(thermal.air(s.set), thermal.info.hc), air: s.air, set: s.set });
    if (id === 'soil') return soilCard({ st: s });
    return hotCarCard({ openBay15: s.table.openBays.t15, openAsphalt15: s.table.openAsphalt.t15 });
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
    const t = pk().st.table;
    return { asphalt15: t.openAsphalt.t15, asphalt23: t.openAsphalt.t23, asphaltG23: t.openAsphalt.g23, shed15: t.shed.t15, shed23: t.shed.t23, air23: thermal.air(23), pv15: t.pvBays.t15, soil23: t.soil.t23, yard15: t.yard.t15, yard23: t.yard.t23 };
  }
  return {
    notes: () => pkNotes(scene, noteData()),
    look: () => ({ flux: !!st.flux }),
    sync,
    html,
    /** Keyboard: G toggles the night release; true if the key was the block's. */
    key(k) {
      if (k !== 'g' && k !== 'G') return false;
      setFlux(!st.flux);
      return true;
    },
    /** Heat-card numbers of cells: G now and at 23:00, the car share and the canopy of a ground cell. */
    cardKey: 'flux',
    cardInfo: (cells, tmrtCell, h, leaf) => (leaf ? null : { now: cells.reduce((a, i) => a + thermal.flux(i, h), 0) / cells.length, g23: cells.reduce((a, i) => a + thermal.flux(i, 23), 0) / cells.length, cars: tmrtCell !== null ? world.parking.share[tmrtCell] : 0, pv: tmrtCell !== null ? !!world.parking.pv[tmrtCell] : false }),
    cardRows: (f) => `<tr class="t"><td>${gl('groundFlux', 'ground heat flux G')} now / 23:00</td><td>${Math.round(f.now)} / ${Math.round(f.g23)} W m⁻² (${f.now < 0 ? 'giving heat back' : 'taking heat in'})</td></tr>${f.cars > 0 ? `<tr><td>share of the cell under cars</td><td>${Math.round(f.cars * 100)}% (shade and sky view, sub-grid)</td></tr>` : ''}${f.pv ? `<tr><td>under the PV canopy</td><td>yes (sky view ${MODEL.pvSvf.value} before cars, Golden et al. 2007)</td></tr>` : ''}`,
    glossary: () => ({ parking: parkingGlossary(pk().st) }),
    /** Car park block (block 6) only: state {flux}; set() it; numbers for the bands and cards; card HTML; G at a point; the overlay's samples. */
    api: {
      state: () => ({ flux: !!st.flux }),
      set(o) {
        if (o.flux !== undefined) setFlux(!!o.flux);
      },
      stats: () => {
        const s = pk().st;
        return { table: s.table, cool: s.cool, ranges: s.ranges, gap: s.gap, set: s.set, peakG: s.peakG, air: s.air, lotShare: s.lotShare, n: Object.fromEntries(Object.entries(s.C).map(([k, v]) => [k, v.length])) };
      },
      pv: () => pkPv(),
      html: (id) => html(id),
      show: (id) => show(id, root.querySelector(`#parking [data-card="${id}"]`)),
      flux: (x, y, h = S.hour) => thermal.flux(world.cellIndex(x, y), h),
      samples: (h = S.hour) => R.flux(quantHour(h)).length,
    },
  };
}
