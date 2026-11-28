// app: boot, clock, keys, seek(), query modes, overlay (slider, notes, heat
// card) and a small window.atlas API used by the checks.
import { iso, unIso, clamp, ISO_C, ISO_S } from './core.js';
import { buildWorld } from './world.js';
import { drawWorld } from './kit.js';
import { runModel, shadeClassField, paletteLut, PALETTE_STOPS, heatRgb } from './thermal.js';
import { Life, shadeDensity, shadeAt } from './life.js';
import { Renderer, INTRO, quantHour } from './render.js';
import { MATERIALS, SOURCES, BASIS, paramKeys } from './materials.js';
import { GLOSSARY, gl, glossaryStats, rangeLine, termsFor } from './glossary.js';
import { isRetrofit, sceneState, stateMaterials, runShared, resolveId, MEASURES, measureStats, waterBudget, ALIASES, D_MAX, D_DEFAULT } from './retrofit.js';
import { retrofitNotes, measureCard, tradeoffCard, spongeCard, drawDivider } from './retroui.js';
import { sunSlots } from './thermal.js';
import { GLASS, GLASS_IDS, GLASS_DEFAULT } from './materials.js';
import { isGlass, glassSetup, glassShade, spotStats, spotClasses, openReference, canyonStats } from './cbd.js';
import { cbdNotes, canyonCard, glassCard, spotCard, acCard, extremeCard, CBD_CARDS, cbdOverlay } from './cbdui.js';
import { classDensity } from './life.js';
import { glassRho, FACE_N } from './reflect.js';
import { sunVector } from './sun.js';
import { isGlassFace } from './kit.js';
import { isWaterfront, waterfrontSetup, comfortShade, windStats, hcStats, asphaltContrast, waterStats, overlayStats, lineStats, promenadeShade, shelterProfile, overlayReach, walkerWind } from './waterfront.js';
import { wfNotes, riverCard, pondCard, corridorCard, shelterCard, shadeCard, WF_CARDS, wfOverlay } from './wfui.js';
import { penLines, SPEEDS, apparentTemp } from './wind.js';
import { Pen } from './pen.js';
import { isHutong, hutongSetup } from './hutong.js';
import { htApp } from './hutui.js';
import { isParking, parkingSetup } from './parking.js';
import { pkApp } from './pkui.js';
import { isEstate, estateSetup } from './estate.js';
import { esApp } from './esui.js';
import { isCampus, campusSetup } from './campus.js';
import { cpApp } from './cpui.js';
import { isBus, busSetup } from './busstop.js';
import { bsApp } from './bsui.js';
import { isVillage, villageSetup } from './village.js';
import { vgApp } from './vgui.js';
import { isDesert, desertSetup } from './desert.js';
import { dsApp } from './dsui.js';
import { isMarket, marketSetup } from './market.js';
import { nmApp } from './nmui.js';

const ZOOMS = [1.25, 1.75, 2.5, 3, 4, 5.5, 7.5];
const FADE = 60; // thermal cross-fade, frames (~1 s)
const fmt = (v) => (Math.round(v * 10) / 10).toFixed(1);
const hhmm = (h) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** FNV-1a over the canvas pixels (hex string). */
function hashCanvas(ctx, w, h) {
  const d = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);
  let x = 0x811c9dc5;
  for (let i = 0; i < d.length; i++) {
    x ^= d[i];
    x = Math.imul(x, 0x01000193);
  }
  return (x >>> 0).toString(16).padStart(8, '0');
}

/**
 * A view: one drawn state of a scene (block 1 has one; a retrofit block has
 * Before and After) with its world, model, display list, walkers and renderer.
 */
function makeView(id, sc, world, thermal, canvas, glass = null, wf = null) {
  const display = drawWorld(world, sc.seed);
  const shadeCache = new Map();
  const view = { id, scene: sc, world, thermal, display };
  // glass block: reflection spots (2 m grid) join the shade classes (cbd.js glassShade)
  const gs = glass ? glassShade(world, () => view.thermal, glass.type) : null;
  // waterfront block: per-pixel route weights from shade and the local wind (waterfront.js comfortShade)
  const cs = wf ? comfortShade(world, () => view.thermal) : null;
  const shadeFor = gs
    ? gs.shadeFor
    : cs
      ? cs.shadeFor
      : (hq) => {
      if (!shadeCache.has(hq)) shadeCache.set(hq, shadeClassField(world, view.thermal.sun(hq)));
      return shadeCache.get(hq);
    };
  const life = new Life(sc, shadeFor, (h) => view.thermal.air(h));
  const R = new Renderer(canvas, world, display, thermal, life);
  if (gs) {
    R.spotFor = gs.spotFor;
    R.glass = glass.type();
    R.overlay = cbdOverlay;
  }
  /** Glass type changed: drop spot, shade and walker caches. */
  view.resetGlass = () => {
    if (gs) gs.reset();
    life.plans.clear();
  };
  if (wf) {
    // wind lines through the pen recorder (own pen, so the block's display list is unchanged)
    R.wind = { lines: wf.lines, items: penLines(new Pen(sc.seed + 97), wf.lines) };
    R.overlay = wfOverlay;
  }
  /** Wind preset changed: drop comfort-shade and walker caches. */
  view.resetWind = () => {
    if (cs) cs.reset();
    life.plans.clear();
  };
  return Object.assign(view, { shadeFor, spotFor: gs ? gs.spotFor : null, life, R });
}

export function boot(scene, root = document) {
  const q = new URLSearchParams(location.search);
  const canvas = root.getElementById('atlas');
  const retro = isRetrofit(scene);
  const t0 = performance.now();
  let world;
  let thermal;
  let t1;
  let t2;
  let V; // views by id
  let afterModel = null; // (d, aged) -> Thermal (retrofit only)
  const retroQ = {
    state: ['before', 'after', 'split'].includes(q.get('state')) ? q.get('state') : 'split',
    split: q.has('split') ? clamp(parseFloat(q.get('split')) || 0.5, 0.05, 0.95) : 0.5,
    d: q.has('d') ? Math.round(clamp(parseFloat(q.get('d')) || 0, 0, D_MAX)) : D_DEFAULT,
    aged: q.get('materials') !== 'new',
    swap: q.get('swap') === '1',
  };
  // glass block (block 3): glass type from ?glass=, default low-e
  const glassMode = isGlass(scene);
  let glassSet = null;
  const glassQ = { type: GLASS_IDS.includes(q.get('glass')) ? q.get('glass') : GLASS_DEFAULT, ac: q.get('ac') === '1' };
  const glassNow = { type: glassQ.type }; // read by the view's spot field
  // waterfront block (block 4): wind lines (?wind=0 hides them), speed preset ?u=, air overlay ?air=1
  const wfMode = isWaterfront(scene);
  let wfSet = null;
  const wfQ = wfMode
    ? { wind: q.get('wind') !== '0', air: q.get('air') === '1', u: SPEEDS.includes(Number(q.get('u'))) ? Number(q.get('u')) : scene.wind.default }
    : null;
  // hutong block (block 5): the evening splash, ?splash=0|1 (default on); its page parts are a block plugin (hutui.js htApp)
  const htMode = isHutong(scene);
  let htSet = null;
  const htSplash0 = q.get('splash') !== '0';
  // car park block (block 6): its page parts live in its own module (pkui.js pkApp: a block plugin, see blk below)
  const pkMode = isParking(scene);
  let pkSet = null;
  // estate block (block 7): a block plugin too (esui.js esApp)
  const esMode = isEstate(scene);
  let esSet = null;
  const cpMode = isCampus(scene); // block 8 plugin (cpui.js cpApp)
  let cpSet = null;
  const bsMode = isBus(scene); // block 9 plugin (bsui.js bsApp)
  let bsSet = null;
  const vgMode = isVillage(scene); // block 10 plugin (vgui.js vgApp)
  let vgSet = null;
  const dsMode = isDesert(scene); // block 11 plugin (dsui.js dsApp)
  let dsSet = null;
  const nmMode = isMarket(scene); // block 12 plugin (nmui.js nmApp)
  let nmSet = null;
  if (!retro) {
    world = buildWorld(scene);
    t1 = performance.now();
    if (glassMode) {
      const ta = performance.now();
      const slots = sunSlots(world);
      const tb = performance.now();
      glassSet = glassSetup(world, slots);
      const tc = performance.now();
      thermal = glassSet.model(glassQ.type);
      glassSet.timing = { slotsMs: tb - ta, reflMs: tc - tb, runMs: performance.now() - tc };
    } else if (wfMode) {
      const ta = performance.now();
      wfSet = waterfrontSetup(world, sunSlots(world));
      const tb = performance.now();
      thermal = wfSet.model(wfQ.u);
      const tc = performance.now();
      wfSet.lines();
      wfSet.timing = { slotsMs: tb - ta, runMs: tc - tb, linesMs: performance.now() - tc };
    } else if (htMode) {
      const ta = performance.now();
      htSet = hutongSetup(world, sunSlots(world));
      const tb = performance.now();
      htSet.base();
      const tc = performance.now();
      thermal = htSet.model(htSplash0);
      htSet.timing = { slotsMs: tb - ta, runMs: tc - tb, splashMs: performance.now() - tc };
    } else if (pkMode) {
      pkSet = parkingSetup(world);
      thermal = pkSet.model;
    } else if (esMode) {
      esSet = estateSetup(world);
      thermal = esSet.model;
    } else if (cpMode) {
      cpSet = campusSetup(world);
      thermal = cpSet.base;
    } else if (bsMode) {
      bsSet = busSetup(world);
      thermal = bsSet.base;
    } else if (vgMode) {
      vgSet = villageSetup(world);
      thermal = vgSet.base;
    } else if (dsMode) {
      dsSet = desertSetup(world);
      thermal = dsSet.base;
    } else if (nmMode) {
      nmSet = marketSetup(world);
      thermal = nmSet.base;
    } else thermal = runModel(world);
    t2 = performance.now();
    V = { main: makeView('main', scene, world, thermal, canvas, glassMode ? { type: () => glassNow.type } : null, wfMode ? { lines: wfSet.lines() } : null) };
  } else {
    // Before and After share buildings: the After world reuses the horizon
    // scan and building shade masks, and its model reuses every Before cell
    // whose inputs are unchanged (retrofit.js runShared)
    const sB = sceneState(scene, 'before');
    const sA = sceneState(scene, 'after');
    const wB = buildWorld(sB);
    const wA = buildWorld(sA, { svfFrom: wB });
    t1 = performance.now();
    const slB = sunSlots(wB, { keepMasks: true });
    const slA = sunSlots(wA, { masksFrom: slB });
    slB.masks = null;
    const ref = { world: wB, slots: slB, model: runModel(wB, { slots: slB, materials: stateMaterials(D_DEFAULT, true) }) };
    const cache = new Map();
    afterModel = (d, aged) => {
      const key = `${d}|${aged ? 1 : 0}`;
      if (!cache.has(key)) {
        if (cache.size >= 16) cache.delete(cache.keys().next().value);
        cache.set(key, runShared(ref, wA, slA, stateMaterials(d, aged)));
      }
      return cache.get(key);
    };
    wA.colours = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, resolveId(k, retroQ.aged)]));
    const mA = afterModel(retroQ.d, retroQ.aged);
    t2 = performance.now();
    V = { before: makeView('before', sB, wB, ref.model, canvas), after: makeView('after', sA, wA, mA, canvas) };
    world = wA;
    thermal = mA;
  }
  // the view the single-state code paths (notes, glossary, block 1) use
  const main = V.main ?? V.after;
  // ?glint=0 (checks): no glint wash in the day view; spots still act on walkers
  if (glassMode && q.get('glint') === '0') main.R.spotFor = null;
  // ?spotskip=0 (checks): draw the glint on every tile, without the bounding-box skip
  if (glassMode && q.get('spotskip') === '0') main.R.spotSkip = false;
  const R = main.R;
  const display = main.display;
  const t3 = performance.now();

  // ---- state -------------------------------------------------------------------------
  const S = {
    frame: 0,
    paused: false,
    cam: { ...scene.startCam },
    hour: scene.startHour ?? 15, // block 12 opens in the evening
    thermal: false,
    since: -1e9,
    notes: q.get('notes') !== '0',
    people: q.get('people') !== '0',
    intro: true,
    scrub: false, // hour slider being dragged, or refining after release
    released: true,
    // retrofit only: which state is drawn, divider position (share of width),
    // sides swapped (After on the left), days since rain, aged materials
    ...(retro ? retroQ : {}),
    // glass block only: glass type, AC overlay
    ...(glassMode ? { glass: glassQ.type, ac: glassQ.ac } : {}),
    // waterfront only: wind lines, air overlay, wind speed preset
    ...(wfMode ? wfQ : {}),
  };
  if (q.get('ui') === '0') root.body.classList.add('noui');
  if (q.has('hour')) S.hour = Math.round(clamp(parseFloat(q.get('hour')) || 0, 0, 23.75) / 0.25) * 0.25;
  if (q.has('thermal')) S.thermal = true;
  if (q.has('cam')) {
    const [z, cx, cy] = q.get('cam').split(',').map(Number);
    if (z > 0) S.cam = { z, cx: cx ?? S.cam.cx, cy: cy ?? S.cam.cy };
  }
  if (q.has('f')) {
    S.frame = Math.max(0, parseInt(q.get('f'), 10) || 0);
    S.paused = true;
  } else if (q.has('thermal') || q.has('hour')) S.frame = INTRO.life; // open directly in the view

  // model values used in notes and cards
  const P = scene.probes;
  const at = (k, h) => thermal.tsAt(P[k][0], P[k][1], h);
  // glass block: canyon segments for the cards, notes and glossary
  const CANYONS = glassMode ? scene.canyons : null;
  const openRefs = new Map();
  const openRef = (mat) => {
    if (!openRefs.has(mat)) openRefs.set(mat, openReference(scene, mat));
    return openRefs.get(mat);
  };
  const canyons = () => ({ lane: canyonStats(world, thermal, CANYONS.lane, openRef('stone')), deep: canyonStats(world, thermal, CANYONS.deep, openRef('asphalt')) });
  /** Incidence angle (deg) on a face of a building at hour h, or 90 if the face is turned away. */
  const incidence = (face, h) => {
    const s = thermal.sun(h);
    if (s.alt <= 0) return 90;
    const sv = sunVector(s.alt, s.az);
    const c = sv[0] * FACE_N[face][0] + sv[1] * FACE_N[face][1];
    return c > 0 ? Math.acos(c) / (Math.PI / 180) : 90;
  };
  /** Tmrt means at 15:00 by class (no reflection-off run needed). */
  const spotTmrt = (h = 15) => {
    const c = spotClasses(world, thermal, h);
    const m = (a) => a.reduce((x, i) => x + thermal.tmrt(i, h), 0) / Math.max(1, a.length);
    return { tmrtShade: m(c.shade), tmrtSun: m(c.sun), tmrtSpotShade: m(c.spotShade), tmrtSpotSun: m(c.spotSun), nSpotShade: c.spotShade.length, glassName: GLASS[S.glass].name.toLowerCase() };
  };
  function cbdNoteData() {
    const lane = canyonStats(world, thermal, CANYONS.lane, openRef('stone'));
    const st = spotTmrt(15);
    const tower = world.buildings.find((b) => b.id === 't3');
    const sp = world.cellIndex(P.spotStreet[0], P.spotStreet[1]);
    return {
      glass: S.glass,
      spotTmrt: thermal.tmrt(sp, 15),
      shadeTmrt: st.tmrtShade,
      towerName: tower.name,
      rhoNow: glassRho(GLASS[S.glass].rho0.value, incidence('S', 15)),
      laneHw: lane.hw,
      lane05: lane.ts05,
      lag05: lane.lag05,
      plaza15: at('plaza', 15),
    };
  }
  // waterfront block: numbers for notes, cards and glossary (cached per wind preset)
  const wfCache = new Map();
  const wf = () => {
    const key = S.u;
    if (!wfCache.has(key)) {
      const st = windStats(world);
      wfCache.set(key, {
        st,
        hc: hcStats(world, thermal),
        ac: asphaltContrast(world, thermal, 15),
        water: waterStats(world, thermal),
        overlay: overlayStats(world, wfSet.lines()),
        shade: promenadeShade(world, thermal, 15),
        profile: shelterProfile(world, P.sheltered[0], 145),
      });
    }
    return wfCache.get(key);
  };
  function wfNoteData() {
    const w = wf();
    const ci = (k) => world.cellIndex(P[k][0], P[k][1]);
    return {
      river15: thermal.ts(ci('river'), 15),
      air15: thermal.air(15),
      air04: thermal.air(4),
      pond04: thermal.ts(ci('pond'), 4),
      reach: overlayReach(),
      corridorFw: w.st.corridorMean,
      corridorTs: thermal.ts(ci('corridor'), 15),
      shelterFw: world.fw[ci('sheltered')],
      shelterTs: thermal.ts(ci('sheltered'), 15),
      shadeTmrt: w.shade.shadeTmrt,
      sunTmrt: w.shade.sunTmrt,
    };
  }
  let notes = retro ? retrofitNotes(scene, V.before, V.after, S.d, S.aged) : glassMode ? cbdNotes(scene, cbdNoteData()) : wfMode ? wfNotes(scene, wfNoteData()) : htMode || pkMode || esMode || cpMode || bsMode || vgMode || dsMode || nmMode ? null : block1Notes();
  function block1Notes() {
  const notesText = {
    asphalt: ['Kiln Street, old dark asphalt:', `${fmt(at('asphalt', 15))} °C at 3 pm, still ${fmt(at('asphalt', 23))} °C at 11 pm`],
    lawn: [`Park lawn: ${fmt(at('grass', 15))} °C at 3 pm;`, `${fmt(at('grass', 23))} °C at 11 pm, below the ${fmt(thermal.air(23))} °C air`],
    shade: ['3 pm · walkers take', 'the shady side'],
    roofs: [`White roof ${fmt(at('coolRoof', 15))} °C,`, `dark roof ${fmt(at('darkRoof', 15))} °C at 3 pm`],
    pond: [`The pond stays near ${fmt(at('water', 15))} °C`],
  };
  // glossary terms inside the canvas notes: [key, exact substring of a line]
  const notesTerms = {
    asphalt: [['albedo', 'old dark asphalt'], ['nightLag', `still ${fmt(at('asphalt', 23))} °C at 11 pm`]],
    lawn: [['surfaceTemp', `${fmt(at('grass', 15))} °C at 3 pm`], ['nightLag', `${fmt(at('grass', 23))} °C at 11 pm`]],
    shade: [['tmrt', 'the shady side']],
    roofs: [['coolRoof', 'White roof']],
    pond: [],
  };
  return scene.notes.slice(0, 5).map((n) => ({ ...n, text: notesText[n.key], terms: notesTerms[n.key] }));
  }

  const thermalMix = (f) => {
    const k = clamp((f - S.since) / FADE, 0, 1);
    return S.thermal ? k : 1 - k;
  };
  // glass block: its tall façades make a day tile slower to bake (about 7 ms),
  // so a slider drag bakes one tile per frame instead of two; the hutong block
  // likewise (hundreds of small tiled roofs and crowns per tile)
  const look = (f) => ({ hour: S.hour, thermalMix: thermalMix(f), notes: S.notes ? notes : null, intro: S.intro, people: S.people, scrub: S.scrub, ac: !!S.ac, budget: glassMode || htMode ? 1 : undefined, ...(wfMode ? { wind: S.wind, air: S.air, u: S.u } : {}), ...(blk ? blk.look() : {}) });

  // ---- sizing ------------------------------------------------------------------------------
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const v of Object.values(V)) v.R.dpr = dpr;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };
  resize();
  window.addEventListener('resize', () => {
    resize();
    draw();
  });

  let lastStats = null;
  let dirty = false;
  /** Views on screen: [{v, clip}] left to right (retrofit), or the one view. */
  const onScreen = () => {
    if (!retro) return [{ v: main, clip: null }];
    if (S.state !== 'split') return [{ v: V[S.state], clip: null }];
    const sx = Math.round(S.split * canvas.width);
    const [l, r] = S.swap ? [V.after, V.before] : [V.before, V.after];
    return [{ v: l, clip: [0, sx] }, { v: r, clip: [sx, canvas.width] }];
  };
  let notesR = R; // renderer whose note hit boxes are live
  const draw = () => {
    const tDraw = performance.now();
    if (!retro) lastStats = R.frame(S.frame, S.cam, look(S.frame));
    else {
      const lk = look(S.frame);
      const parts = onScreen();
      // the canvas context is shared by two renderers: start every frame from
      // the same context state so a frame never depends on the one before it
      const c0 = R.ctx;
      c0.setTransform(1, 0, 0, 1, 0, 0);
      c0.lineCap = 'butt';
      c0.lineJoin = 'miter';
      c0.textBaseline = 'alphabetic';
      c0.setLineDash([]);
      const stats = parts.map(({ v, clip }) => ({ ...v.R.frame(S.frame, S.cam, { ...lk, notes: null, clip, budget: parts.length > 1 ? 1 : undefined }) }));
      const st = stats[stats.length - 1];
      lastStats = {
        ...st,
        people: stats.reduce((a, x) => a + x.people, 0),
        sweating: stats.reduce((a, x) => a + x.sweating, 0),
        sweatGlyphPx: Math.max(...stats.map((x) => x.sweatGlyphPx)),
        tilesBaked: stats.reduce((a, x) => a + x.tilesBaked, 0),
        frameMs: stats.reduce((a, x) => a + x.frameMs, 0),
        preview: stats.some((x) => x.preview),
        sides: parts.map(({ v }) => v.id),
      };
      const ctx = R.ctx;
      if (parts.length > 1) drawDivider(ctx, parts[0].clip[1], canvas.height, R.dpr, S.swap ? 'After' : 'Before', S.swap ? 'Before' : 'After');
      notesR = parts[parts.length - 1].v.R;
      notesR.noteHits = [];
      if (lk.notes && st.lifeA > 0) notesR.drawNotes(ctx, S.cam, canvas.width, canvas.height, lk.notes, st.lifeA);
      lastStats.frameMs = performance.now() - tDraw;
    }
    dirty = false;
    // the loading hint (#29 item 3) while the pen draws and the washes come in: a DOM element, never the canvas
    const ink = S.intro && S.frame < INTRO.wash;
    if (inkHint.hidden === ink) inkHint.hidden = !ink;
    // a released scrub ends once the frame is exact again
    if (S.scrub && S.released && !lastStats.preview) {
      S.scrub = false;
      for (const v of Object.values(V)) v.R.endScrub(); // unpin now, even if the clock is paused and nothing else draws
    }
    return lastStats;
  };

  // ---- overlay -------------------------------------------------------------------------------
  const $ = (id) => root.getElementById(id);
  const slider = $('hour');
  const hourLabel = $('hourLabel');
  const legend = $('legend');
  const card = $('card');
  const heatBtn = $('heatBtn');
  const inkHint = $('inkHint');
  // the bar's buttons (#29: every key has a visible button): T, H and h, as the keys
  $('bar').addEventListener('click', (e) => {
    const b = e.target.closest ? e.target.closest('button[data-k]') : null;
    if (b) window.dispatchEvent(new KeyboardEvent('keydown', { key: b.dataset.k }));
  });
  // block panels fold (#29); on a narrow screen they start folded
  const foldPanels = () => {
    for (const p of root.querySelectorAll('.blockpanel')) {
      if (p.querySelector(':scope > details:not(.cards)')) continue;
      const d = root.createElement('details');
      d.open = window.innerWidth > 700;
      d.innerHTML = `<summary class="hand">${p.getAttribute('aria-label') ?? 'Controls'}</summary>`;
      while (p.firstChild) d.appendChild(p.firstChild);
      p.appendChild(d);
    }
    if (window.innerWidth <= 700) for (const d of root.querySelectorAll('.blockpanel > details')) d.open = false;
  };
  const syncUi = () => {
    slider.value = String(S.hour);
    hourLabel.textContent = `${hhmm(S.hour)}  ·  air ${fmt(thermal.air(S.hour))} °C`;
    legend.style.opacity = S.thermal ? '1' : '0';
    root.body.classList.toggle('thermal', S.thermal);
    heatBtn.setAttribute('aria-pressed', String(!!S.thermal));
  };
  // legend gradient from the palette
  const lo = PALETTE_STOPS[0][0];
  const hi = PALETTE_STOPS[PALETTE_STOPS.length - 1][0];
  $('legendBar').style.background = `linear-gradient(90deg, ${PALETTE_STOPS.map(([t]) => {
    const c = heatRgb(t);
    return `rgb(${c.map(Math.round).join(',')}) ${(((t - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  }).join(', ')})`;
  $('legendLo').textContent = `${lo} °C`;
  $('legendHi').textContent = `≥ ${hi} °C`;

  const setHour = (h, scrub = false) => {
    S.hour = ((Math.round(h / 0.25) * 0.25) % 24 + 24) % 24;
    syncUi();
    if (card.dataset.open === '1') reopenCard();
    if (scrub) {
      // slider drag: draw once in the next animation frame, as a preview
      S.scrub = true;
      dirty = true;
    } else {
      S.scrub = false;
      draw();
    }
  };
  slider.addEventListener('pointerdown', () => {
    S.released = false;
  });
  const release = () => {
    S.released = true;
    if (S.scrub) dirty = true;
  };
  slider.addEventListener('pointerup', release);
  slider.addEventListener('pointercancel', release);
  slider.addEventListener('change', release);
  slider.addEventListener('input', () => setHour(parseFloat(slider.value), true));
  // ---- retrofit controls: state, divider, days since rain, aged / new -------------------
  const retroUi = retro ? buildRetroUi() : null;
  function buildRetroUi() {
    const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
    root.body.insertAdjacentHTML(
      'beforeend',
      `<div id="retro" class="blockpanel" aria-label="Retrofit controls">
        <div class="seg" role="group" aria-label="Show Before, After or both">${btn('data-state', 'before', 'Before')}${btn('data-state', 'split', 'Split')}${btn('data-state', 'after', 'After')}${btn('data-swap', '1', 'swap (B)')}</div>
        <div class="row"><label for="rain">${gl('daysSinceRain', 'days since rain')}</label><input id="rain" type="range" min="0" max="${D_MAX}" step="1" aria-label="days since rain"><span id="rainLabel" class="hand"></span></div>
        <div class="seg" role="group" aria-label="Materials aged or new"><span>${gl('albedoAgeing', 'materials')}:</span>${btn('data-aged', '1', 'aged')}${btn('data-aged', '0', 'new')}</div>
        <details class="cards"><summary class="hand">What each measure does (${MEASURES.length + 2} cards)</summary><div class="measures">${MEASURES.map((m) => btn('data-measure', m.id, m.name)).join('')}${btn('data-measure', 'tradeoff', 'Trade-off: reflective pavement', 'class="warn"')}${btn('data-measure', 'sponge', 'Sponge city (海绵城市, China\'s rain plan)')}</div></details>
      </div>`,
    );
    const el = root.getElementById('retro');
    el.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.dataset.state) setState(b.dataset.state);
      else if (b.dataset.swap) {
        swapStates();
        redraw();
      } else if (b.dataset.aged) setAged(b.dataset.aged === '1');
      else if (b.dataset.measure) showMeasure(b.dataset.measure, b);
    });
    const rain = root.getElementById('rain');
    rain.addEventListener('input', () => setRain(parseInt(rain.value, 10)));
    return { el, rain, label: root.getElementById('rainLabel') };
  }
  function syncRetro() {
    if (!retroUi) return;
    for (const b of retroUi.el.querySelectorAll('[data-state]')) b.setAttribute('aria-pressed', String(b.dataset.state === S.state));
    for (const b of retroUi.el.querySelectorAll('[data-aged]')) b.setAttribute('aria-pressed', String((b.dataset.aged === '1') === S.aged));
    retroUi.rain.value = String(S.d);
    retroUi.label.textContent = S.d === 0 ? 'the day after overnight rain (best case)' : `${S.d} day${S.d === 1 ? '' : 's'} after rain`;
    root.body.dataset.state = S.state;
  }
  const redraw = () => {
    if (S.paused) draw();
  };
  function setState(st) {
    S.state = st;
    syncRetro();
    redraw();
  }
  /** B key: in split view swap the sides; otherwise flip Before <-> After. */
  function swapStates() {
    if (S.state === 'split') S.swap = !S.swap;
    else S.state = S.state === 'before' ? 'after' : 'before';
    syncRetro();
  }
  function setSplit(f) {
    S.split = clamp(f, 0.05, 0.95);
    redraw();
  }
  /** New After model for the current days since rain and aged / new choice. */
  function refreshAfter() {
    thermal = afterModel(S.d, S.aged);
    V.after.thermal = thermal;
    V.after.R.setThermal(thermal);
    notes = retrofitNotes(scene, V.before, V.after, S.d, S.aged);
    syncRetro();
    if (card.dataset.open === '1') reopenCard();
    redraw();
  }
  function setRain(d) {
    const v = Math.round(clamp(d, 0, D_MAX));
    if (v === S.d) return;
    S.d = v;
    refreshAfter();
  }
  function setAged(aged) {
    if (aged === S.aged) return;
    S.aged = aged;
    // redraw the After line work with the aged or new colours
    V.after.world.colours = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, resolveId(k, aged)]));
    V.after.display = drawWorld(V.after.world, V.after.scene.seed);
    V.after.R.setDisplay(V.after.display);
    refreshAfter();
  }
  function measureStatsFor(id) {
    const m = MEASURES.find((x) => x.id === id);
    return measureStats(m, V.before.world, V.before.thermal, V.after.world, V.after.thermal);
  }
  function measureHtml(id) {
    const mats = V.after.thermal.info.mats;
    if (id === 'sponge') return spongeCard();
    if (id === 'tradeoff') {
      // both coatings: new (the literature case) and after one year
      const m = MEASURES.find((x) => x.id === 'coating');
      const st = (aged) => measureStats(m, V.before.world, V.before.thermal, V.after.world, afterModel(S.d, aged), [12]).h12;
      return tradeoffCard({ new: st(false), aged: st(true) }, stateMaterials(S.d, false), stateMaterials(S.d, true));
    }
    return measureCard(MEASURES.find((x) => x.id === id), measureStatsFor(id), mats, S.d, S.aged);
  }
  function showMeasure(id, anchor) {
    card.innerHTML = measureHtml(id);
    card.querySelector('.x').onclick = hideCard;
    card._pick = null;
    card._measure = id;
    card.dataset.open = '1';
    card.dataset.kind = id;
    card.style.display = 'block';
    // beside the controls panel, level with the button
    const r = anchor ? anchor.getBoundingClientRect() : { top: 120 };
    const panel = retroUi.el.getBoundingClientRect();
    card.style.left = `${Math.min(window.innerWidth - card.offsetWidth - 10, panel.right + 12)}px`;
    card.style.top = `${Math.max(10, Math.min(window.innerHeight - card.offsetHeight - 10, r.top - 20))}px`;
  }
  function reopenCard() {
    if (card._measure && card._measure.startsWith('blk:')) {
      card.innerHTML = blk.html(card._measure.slice(4));
      card.querySelector('.x').onclick = hideCard;
    } else if (card._measure && card._measure.startsWith('wf:')) {
      card.innerHTML = wfCardHtml(card._measure.slice(3));
      card.querySelector('.x').onclick = hideCard;
    } else if (card._measure && card._measure.startsWith('cbd:')) {
      card.innerHTML = cbdCardHtml(card._measure.slice(4));
      card.querySelector('.x').onclick = hideCard;
    } else if (card._measure) {
      card.innerHTML = measureHtml(card._measure);
      card.querySelector('.x').onclick = hideCard;
    } else if (card._pick) showCard(card._pick);
  }

  // ---- glass controls (block 3): glass type, AC overlay, cards ---------------------------
  const glassUi = glassMode ? buildGlassUi() : null;
  function buildGlassUi() {
    const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
    root.body.insertAdjacentHTML(
      'beforeend',
      `<div id="glass" class="blockpanel" aria-label="Glass controls">
        <div class="seg" role="group" aria-label="Glass type"><span>${gl('curtainWall', 'glass')}:</span>${GLASS_IDS.map((id) => btn('data-glass', id, { clear: 'clear', lowe: 'low-e', mirror: 'mirror' }[id])).join('')}</div>
        <div class="seg">${btn('data-ac', '1', 'AC heat overlay', 'aria-pressed="false"')}</div>
        <div class="measures"><div class="hand">Cards</div>${CBD_CARDS.map(([id, label]) => btn('data-card', id, label, id === 'extreme' || id === 'spot' ? 'class="warn"' : '')).join('')}</div>
      </div>`,
    );
    const el = root.getElementById('glass');
    el.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.dataset.glass) setGlass(b.dataset.glass);
      else if (b.dataset.ac) setAc(!S.ac);
      else if (b.dataset.card) showCbdCard(b.dataset.card, b);
    });
    return { el };
  }
  function syncGlass() {
    if (!glassUi) return;
    for (const b of glassUi.el.querySelectorAll('[data-glass]')) b.setAttribute('aria-pressed', String(b.dataset.glass === S.glass));
    glassUi.el.querySelector('[data-ac]').setAttribute('aria-pressed', String(!!S.ac));
    root.body.dataset.glass = S.glass;
  }
  function setGlass(g) {
    if (!GLASS_IDS.includes(g) || g === S.glass) return;
    S.glass = g;
    glassNow.type = g;
    thermal = glassSet.model(g);
    main.thermal = thermal;
    main.resetGlass();
    R.setGlass(g, thermal);
    notes = cbdNotes(scene, cbdNoteData());
    syncGlass();
    if (card.dataset.open === '1') reopenCard();
    if (S.paused) draw();
  }
  function setAc(on) {
    S.ac = !!on;
    syncGlass();
    if (S.paused) draw();
  }
  function cbdCardHtml(id) {
    if (id === 'canyon') return canyonCard(canyons());
    if (id === 'spot') return spotCard(spotStats(glassSet, world, S.glass, 15), S.glass);
    if (id === 'ac') return acCard();
    if (id === 'extreme') return extremeCard();
    const g = id.slice(6);
    const tower = world.buildings.find((b) => b.id === 't3');
    const face = { name: `${tower.name}, south face`, face: 'S', theta15: incidence('S', 15), tg15: glassSet.model(g).glassTemp('S', 15) };
    return glassCard(g, { h12: spotStats(glassSet, world, g, 12), h15: spotStats(glassSet, world, g, 15) }, face);
  }
  function showCbdCard(id, anchor) {
    if (id === 'ac') setAc(true);
    card.innerHTML = cbdCardHtml(id);
    card.querySelector('.x').onclick = hideCard;
    card._pick = null;
    card._measure = `cbd:${id}`;
    card.dataset.open = '1';
    card.dataset.kind = id;
    card.style.display = 'block';
    const r = anchor ? anchor.getBoundingClientRect() : { top: 120 };
    const panel = glassUi.el.getBoundingClientRect();
    card.style.left = `${Math.min(window.innerWidth - card.offsetWidth - 10, panel.right + 12)}px`;
    card.style.top = `${Math.max(10, Math.min(window.innerHeight - card.offsetHeight - 10, r.top - 20))}px`;
  }

  // ---- wind controls (block 4): wind lines, speed preset, air overlay, cards ------------
  const wfUi = wfMode ? buildWfUi() : null;
  function buildWfUi() {
    const btn = (attr, v, label, extra = '') => `<button type="button" ${attr}="${v}" ${extra}>${label}</button>`;
    root.body.insertAdjacentHTML(
      'beforeend',
      `<div id="wind" class="blockpanel" aria-label="Wind controls">
        <div class="seg" role="group" aria-label="Wind speed"><span>${gl('windFactor', 'wind')}:</span>${btn('data-u', '1', 'calm 1 m/s')}${btn('data-u', '3', 'breezy 3 m/s')}</div>
        <div class="seg">${btn('data-lines', '1', 'wind lines (W)')}${btn('data-air', '1', 'air overlay (A)')}</div>
        <div class="measures"><div class="hand">Cards</div>${WF_CARDS.map(([id, label]) => btn('data-card', id, label, id === 'shelter' ? 'class="warn"' : '')).join('')}</div>
      </div>`,
    );
    const el = root.getElementById('wind');
    el.addEventListener('click', (e) => {
      const b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      if (b.dataset.u) setU(Number(b.dataset.u));
      else if (b.dataset.lines) setWindLines(!S.wind);
      else if (b.dataset.air) setAir(!S.air);
      else if (b.dataset.card) showWfCard(b.dataset.card, b);
    });
    return { el };
  }
  function syncWf() {
    if (!wfUi) return;
    for (const b of wfUi.el.querySelectorAll('[data-u]')) b.setAttribute('aria-pressed', String(Number(b.dataset.u) === S.u));
    wfUi.el.querySelector('[data-lines]').setAttribute('aria-pressed', String(!!S.wind));
    wfUi.el.querySelector('[data-air]').setAttribute('aria-pressed', String(!!S.air));
    root.body.dataset.u = String(S.u);
  }
  function setU(u) {
    if (!SPEEDS.includes(u) || u === S.u) return;
    S.u = u;
    thermal = wfSet.model(u);
    main.thermal = thermal;
    main.resetWind();
    R.setThermal(thermal);
    notes = wfNotes(scene, wfNoteData());
    syncWf();
    if (card.dataset.open === '1') reopenCard();
    if (S.paused) draw();
  }
  function setWindLines(on) {
    S.wind = !!on;
    syncWf();
    if (S.paused) draw();
  }
  function setAir(on) {
    S.air = !!on;
    syncWf();
    if (S.paused) draw();
  }
  function wfCardHtml(id) {
    const w = wf();
    if (id === 'river') return riverCard({ water: w.water, overlay: w.overlay, u: S.u });
    if (id === 'pond') return pondCard({ water: w.water, lawn04: thermal.ts(world.cellIndex(P.lawn[0], P.lawn[1]), 4) });
    if (id === 'corridor') return corridorCard({ st: w.st, ac: w.ac, hc: w.hc, u: S.u });
    if (id === 'shelter') return shelterCard({ st: w.st, ac: w.ac, u: S.u, profile: w.profile });
    return shadeCard({ ...w.shade, waterAir: w.overlay.at0 });
  }
  function showWfCard(id, anchor) {
    card.innerHTML = wfCardHtml(id);
    card.querySelector('.x').onclick = hideCard;
    card._pick = null;
    card._measure = `wf:${id}`;
    card.dataset.open = '1';
    card.dataset.kind = id;
    card.style.display = 'block';
    const r = anchor ? anchor.getBoundingClientRect() : { top: 120 };
    const panel = wfUi.el.getBoundingClientRect();
    card.style.left = `${Math.min(window.innerWidth - card.offsetWidth - 10, panel.right + 12)}px`;
    card.style.top = `${Math.max(10, Math.min(window.innerHeight - card.offsetHeight - 10, r.top - 20))}px`;
  }

  // ---- a block plugin (blocks 5 and 6): its controls, cards, notes, heat-card rows, glossary numbers
  // and API live in its own module; app.js only calls these hooks
  const env = {
    scene, world, thermal, root, card, R, S, main, query: q, setup: htSet ?? pkSet ?? esSet ?? cpSet ?? bsSet ?? vgSet ?? dsSet ?? nmSet,
    hideCard: () => hideCard(),
    reopen: () => card.dataset.open === '1' && reopenCard(),
    redraw: () => S.paused && draw(),
    /** A new model for the main view (block 5 splash on / off). */
    setModel(T) {
      thermal = T;
      main.thermal = T;
      R.setThermal(T);
    },
    setNotes: (n) => (notes = n),
  };
  const blk = pkMode ? pkApp(env) : htMode ? htApp(env, htSplash0) : esMode ? esApp(env) : cpMode ? cpApp(env) : bsMode ? bsApp(env) : vgMode ? vgApp(env) : dsMode ? dsApp(env) : nmMode ? nmApp(env) : null;
  if (blk) notes = blk.notes();

  const toggleThermal = () => {
    const m = thermalMix(S.frame);
    S.thermal = !S.thermal;
    // keep the fade continuous if toggled mid-fade
    S.since = S.frame - Math.round((S.thermal ? m : 1 - m) * FADE);
    syncUi();
  };
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.key !== 't' && e.key !== 'T') return;
    const k = e.key;
    if (k === 't' || k === 'T') toggleThermal();
    else if (retro && (k === 'b' || k === 'B')) swapStates();
    else if (glassMode && (k === 'g' || k === 'G')) setGlass(GLASS_IDS[(GLASS_IDS.indexOf(S.glass) + (k === 'g' ? 1 : GLASS_IDS.length - 1)) % GLASS_IDS.length]);
    else if (wfMode && (k === 'w' || k === 'W')) setWindLines(!S.wind);
    else if (wfMode && (k === 'a' || k === 'A')) setAir(!S.air);
    else if (blk && blk.key(k)) {
      // handled by the block plugin
    }
    else if (k === 'h') setHour(S.hour + 1);
    else if (k === 'H') setHour(S.hour - 1);
    else if (k === 'n' || k === 'N') S.notes = !S.notes;
    else if (k === ' ') S.paused = !S.paused;
    else if (k === 'r' || k === 'R') {
      S.frame = 0;
      S.intro = true;
    } else if (k === 'Escape') {
      if (!fn.hidden) hideFn();
      else if (!terms.hidden) toggleTerms(false);
      else hideCard();
    }
    else if (k === '+' || k === '=') zoomBy(1);
    else if (k === '-' || k === '_') zoomBy(-1);
    else if (k.startsWith('Arrow')) {
      const d = 40 / S.cam.z;
      const v = { ArrowLeft: [-d, d], ArrowRight: [d, -d], ArrowUp: [-d, -d], ArrowDown: [d, d] }[k];
      S.cam = { ...S.cam, cx: clamp(S.cam.cx + v[0], 0, 400), cy: clamp(S.cam.cy + v[1], 0, 400) };
    } else return;
    e.preventDefault();
    if (S.paused) draw();
  });
  const zoomBy = (s) => {
    let i = ZOOMS.findIndex((z) => z >= S.cam.z - 1e-6);
    if (i < 0) i = ZOOMS.length - 1;
    i = clamp(i + s, 0, ZOOMS.length - 1);
    S.cam = { ...S.cam, z: ZOOMS[i] };
    if (S.paused) draw();
  };
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1 : -1);
  }, { passive: false });

  // drag to pan, click to pick
  let drag = null;
  /** True if a CSS-px point is on the split divider's round handle (#29 item 8: anywhere else a drag pans the map). */
  const onDivider = (x, y) => retro && S.state === 'split' && Math.hypot(x * R.dpr - Math.round(S.split * canvas.width), y * R.dpr - canvas.height * 0.5) <= 20 * R.dpr;
  canvas.addEventListener('pointerdown', (e) => {
    // any press on the map closes an open footnote (hover or pinned), unless it lands on a margin note
    if (!fn.hidden && !noteHit(e.clientX, e.clientY)) hideFn();
    drag = { x: e.clientX, y: e.clientY, cam: { ...S.cam }, moved: false, divider: onDivider(e.clientX, e.clientY) };
    canvas.setPointerCapture(e.pointerId);
  });
  const noteHit = (x, y) => (notesR.noteHits ?? []).find((h) => x >= h.x && x <= h.x + h.w && y >= h.y - h.h && y <= h.y + 3);
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) {
      const h = noteHit(e.clientX, e.clientY);
      canvas.style.cursor = h ? 'help' : onDivider(e.clientX, e.clientY) ? 'ew-resize' : '';
      if (h && fn.hidden) showFn(h.key, { left: h.x, right: h.x + h.w, top: h.y - h.h, bottom: h.y + 3 }, false);
      else if (!h && !fn.hidden && !fnPinned) hideFn();
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (drag.divider) {
      setSplit((e.clientX * R.dpr) / canvas.width);
      return;
    }
    if (!drag.moved) return;
    const a = -dx / drag.cam.z / ISO_C;
    const b = -dy / drag.cam.z / ISO_S;
    S.cam = { ...drag.cam, cx: clamp(drag.cam.cx + (a + b) / 2, 0, 400), cy: clamp(drag.cam.cy + (b - a) / 2, 0, 400) };
    if (S.paused) draw();
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (d && !d.moved && !d.divider) {
      const h = noteHit(e.clientX, e.clientY);
      if (h) {
        showFn(h.key, { left: h.x, right: h.x + h.w, top: h.y - h.h, bottom: h.y + 3 }, true);
        return;
      }
      if (!fn.hidden) hideFn();
      const p = pick(e.clientX, e.clientY);
      if (p) showCard(p, e.clientX, e.clientY);
      else hideCard();
    }
  });

  /** The view drawn at a CSS-px x (split view: left or right of the divider). */
  const viewAt = (cx) => {
    const parts = onScreen();
    const x = cx * R.dpr;
    return (parts.find(({ clip }) => !clip || (x >= clip[0] && x < clip[1])) ?? parts[parts.length - 1]).v;
  };
  /** Screen (CSS px) -> what is under it: building, tree or ground parcel. */
  function pick(cx, cy) {
    const dpr = R.dpr;
    const [ox, oy, Z] = R.origin(S.cam, canvas.width, canvas.height);
    const px = (cx * dpr - ox) / Z;
    const py = (cy * dpr - oy) / Z;
    const view = viewAt(cx);
    const world = view.world;
    const objs = view.display.objects;
    for (let k = objs.length - 1; k >= 0; k--) {
      const o = objs[k];
      if (o.kind === 'b') {
        const B = o.o;
        const top = B.h + (B.gable ? 2 : 0);
        const hex = [[B.x0, B.y1, 0], [B.x1, B.y1, 0], [B.x1, B.y0, 0], [B.x1, B.y0, top], [B.x0, B.y0, top], [B.x0, B.y1, top]].map((p) => iso(...p));
        let inside = false;
        for (let i = 0, j = hex.length - 1; i < hex.length; j = i++) {
          const [xi, yi] = hex[i];
          const [xj, yj] = hex[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) return { kind: 'building', B, view };
      } else if (o.kind === 't') {
        const T = o.o;
        const c = iso(T.x, T.y, T.zc);
        if (Math.hypot(px - c[0], py - c[1]) < T.r * 0.95) return { kind: 'tree', T, view };
      }
    }
    const [x, y] = unIso(px, py, 0);
    if (x < 0 || y < 0 || x >= world.size || y >= world.size) return null;
    return { kind: 'ground', x, y, g: view.scene.ground[world.parcelAt(x, y)], view };
  }

  /** Data for a heat card (also used by checks). */
  function cardData(p) {
    const h = S.hour;
    const view = p.view ?? main;
    const world = view.world;
    const thermal = view.thermal;
    const mats = thermal.info.mats ?? MATERIALS;
    let title;
    let mat;
    let cells;
    let tmrtCell = null;
    if (p.kind === 'building') {
      title = p.B.name;
      mat = p.B.roof;
      cells = [];
      for (let i = 0; i < world.bld.length; i++) if (world.bld[i] === p.B.index) cells.push(i);
    } else if (p.kind === 'tree') {
      // block 5 trees carry a species (their own material)
      title = p.T.species ? mats[p.T.species].name : p.T.young ? 'Young street tree' : 'Tree';
      mat = p.T.species ?? (p.T.young ? 'youngCanopy' : 'canopy');
      cells = [world.cellIndex(p.T.x, p.T.y)];
      tmrtCell = cells[0];
    } else {
      title = p.g.name;
      mat = p.g.mat;
      cells = [world.cellIndex(p.x, p.y)];
      tmrtCell = cells[0];
    }
    const m = mats[mat];
    const mean = (hh, T = thermal) => cells.reduce((s, i) => s + T.ts(i, hh), 0) / cells.length;
    const svf = cells.reduce((s, i) => s + world.svf[i], 0) / cells.length;
    const leaf = mat === 'canopy' || mat === 'youngCanopy' || !!m.tree;
    const ts = leaf ? (hh) => thermal.canopyTemp(hh) : mean;
    // retrofit: the same cells in the other state, if anything there differs
    let compare = null;
    if (retro && !leaf) {
      const other = view === V.after ? V.before : V.after;
      const oid = p.kind === 'building' ? other.world.buildings[p.B.index].roof : other.scene.ground[other.world.parcelAt(p.x, p.y)].mat;
      const diff = oid !== mat || cells.some((i) => Math.abs(other.thermal.ts(i, 15) - thermal.ts(i, 15)) > 0.05);
      if (diff) {
        const [b, a] = view === V.after ? [other, view] : [view, other];
        compare = {
          before: mean(15, b.thermal),
          after: mean(15, a.thermal),
          beforeMat: (b.thermal.info.mats ?? MATERIALS)[p.kind === 'building' ? b.world.buildings[p.B.index].roof : b.scene.ground[b.world.parcelAt(p.x, p.y)].mat].name,
          afterMat: (a.thermal.info.mats ?? MATERIALS)[p.kind === 'building' ? a.world.buildings[p.B.index].roof : a.scene.ground[a.world.parcelAt(p.x, p.y)].mat].name,
          tmrtBefore: tmrtCell !== null ? b.thermal.tmrt(tmrtCell, 15) : null,
          tmrtAfter: tmrtCell !== null ? a.thermal.tmrt(tmrtCell, 15) : null,
        };
      }
    }
    // shortwave parts on the ground cell now (wall reflection, all blocks; glass, block 3)
    const sw = tmrtCell !== null ? thermal.shortwave(tmrtCell, h) : null;
    let glassInfo = null;
    if (p.kind === 'building' && p.B.glass) {
      const g = GLASS[S.glass];
      const faces = ['S', 'E', 'W', 'N'].filter((f) => isGlassFace(p.B, f)).map((f) => {
        const th = incidence(f, h);
        return { face: f, theta: th, rho: th < 90 ? glassRho(g.rho0.value, th) : null, tg: thermal.glassTemp(f, h) };
      });
      glassInfo = { id: S.glass, name: g.name, rho0: g.rho0, absorb: g.absorb, eps: g.eps, faces };
    }
    // waterfront: wind factor, local wind and h_c of the cell (roofs: f_w = 1)
    const windInfo = wfMode && cells.length
      ? (() => {
        const c = tmrtCell ?? cells[0];
        const fw = world.fw[c];
        const at = tmrtCell !== null ? apparentTemp(thermal.air(h), scene.site.vapourHpa, thermal.info.wind * fw, thermal.tmrt(tmrtCell, h)) : null;
        return { fw, u: thermal.info.wind * fw, hc: thermal.hcAt(c), site: thermal.info.wind, at };
      })()
      : null;
    // a block plugin's own heat-card numbers (block 5: water on a splashed cell; block 6: G and the car share)
    const blkInfo = blk && cells.length ? blk.cardInfo(cells, tmrtCell, h, leaf, thermal) : null;
    return {
      title,
      state: view.id,
      compare,
      wind: windInfo,
      water: null,
      flux: null,
      ...(blk ? { [blk.cardKey]: blkInfo } : {}),
      glass: glassInfo,
      wallsNow: sw ? sw.walls : null,
      glassNow: sw ? sw.glass : null,
      matId: retro ? resolveId(mat, S.aged) : mat,
      material: m.name,
      params: Object.fromEntries(paramKeys(m).map((k) => [k, m[k]])),
      caveat: m.caveat ?? null,
      prescribed: m.prescribed ?? null,
      svf,
      tsNow: ts(h),
      ts15: ts(15),
      ts23: ts(23),
      groundNow: leaf ? mean(h) : null,
      tmrtNow: tmrtCell !== null ? thermal.tmrt(tmrtCell, h) : null,
      tmrt15: tmrtCell !== null ? thermal.tmrt(tmrtCell, 15) : null,
      air: thermal.air(h),
      note: m.note,
      hour: h,
      dryEf: m.dry ? m.dry.ef.value : null,
      dryMu: m.dry ? m.dry.mu.value : null,
    };
  }

  /** A source key with its text, the key linking to this block's group on the references page (#29 item 5). */
  const refLink = (k) => `<a class="ref" href="../../references.html">[${k}]</a> ${SOURCES[k]}`;
  function showCard(p, x, y) {
    if (!p) return;
    const d = cardData(p);
    const tag = (v) =>
      (v.basis !== 'cited' ? ` <span class="basis">${BASIS[v.basis]}</span>` : '') +
      (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
    const P = d.params;
    const heat = P.thinC
      ? `<tr><td>${gl('heatCapacity', 'heat capacity C')}</td><td>${P.thinC.value / 1000} kJ m⁻² K⁻¹${tag(P.thinC)}</td></tr>`
      : P.mu
        ? `<tr><td>${gl('admittance', 'admittance μ')}</td><td>${P.mu.value} J m⁻² s⁻½ K⁻¹${tag(P.mu)}</td></tr>`
        : '';
    const srcs = [...new Set(Object.values(d.params).map((v) => v.source).concat(d.glass ? [d.glass.rho0.source, d.glass.absorb.source, d.glass.eps.source] : []))];
    // wetted materials: value at the current days since rain, with the wet / dry ends and τ
    const efCell = P.ef.atD !== undefined ? `${P.ef.value.toFixed(2)} at ${gl('daysSinceRain', `d = ${P.ef.atD}`)}${tag(P.ef)}` : `${P.ef.value}${tag(P.ef)}`;
    const wet = [
      P.efWet ? `<tr><td>evaporative fraction wet / dry</td><td>${P.efWet.value} / ${d.dryEf}${tag(P.efWet)}</td></tr>` : '',
      P.muWet ? `<tr><td>admittance wet / dry</td><td>${P.muWet.value} / ${d.dryMu}${tag(P.muWet)}</td></tr>` : '',
      P.tau ? `<tr><td>drying time τ</td><td>${P.tau.value} d${tag(P.tau)}</td></tr>` : '',
      P.storage ? `<tr><td>water held after rain</td><td>${P.storage.value} mm${tag(P.storage)}</td></tr>` : '',
      P.tr ? `<tr><td>sun let through the crown</td><td>${P.tr.value}${tag(P.tr)}</td></tr>` : '',
    ].join('');
    const cmp = d.compare
      ? `<tr class="t"><td>15:00 Before → After</td><td>${fmt(d.compare.before)} → ${fmt(d.compare.after)} °C</td></tr>
        ${d.compare.tmrtBefore !== null ? `<tr><td>${gl('tmrt', 'Tmrt')} 15:00 Before → After</td><td>${fmt(d.compare.tmrtBefore)} → ${fmt(d.compare.tmrtAfter)} °C</td></tr>` : ''}
        <tr><td colspan="2" class="sub">Before: ${d.compare.beforeMat}; After: ${d.compare.afterMat}</td></tr>`
      : '';
    const feel = d.tmrtNow !== null ? `; standing here feels like ${fmt(d.tmrtNow)} °C` : '';
    card.innerHTML = `
      <button class="x" aria-label="close">×</button>
      <h3>${d.title}</h3>
      <p class="lead">At ${hhmm(d.hour)} the ${d.groundNow !== null ? 'top' : 'surface'} here is ${fmt(d.tsNow)} °C${feel}, with the air at ${fmt(d.air)} °C.</p>
      <div class="mat">${d.matId === 'coolroof' || d.matId === 'coolroofAged' || d.matId === 'coolroofNew' ? gl('coolRoof', d.material) : d.material}${retro ? ` · ${d.state === 'after' ? 'After' : 'Before'}` : ''}</div>
      <table>
        <tr class="t"><td>${gl('surfaceTemp', 'surface')} now (${hhmm(d.hour)})</td><td>${fmt(d.tsNow)} °C</td></tr>
        <tr class="t"><td>surface at 3 pm / ${gl('nightLag', '11 pm')}</td><td>${fmt(d.ts15)} / ${fmt(d.ts23)} °C</td></tr>
        ${d.groundNow !== null ? `<tr><td>ground beneath now</td><td>${fmt(d.groundNow)} °C</td></tr>` : ''}
        ${d.tmrtNow !== null ? `<tr><td>how hot it ${gl('tmrt', 'feels')} to stand here, now / 3 pm</td><td>${fmt(d.tmrtNow)} / ${fmt(d.tmrt15)} °C</td></tr>` : ''}
        <tr><td>air now</td><td>${fmt(d.air)} °C</td></tr>
        ${blk && d[blk.cardKey] ? blk.cardRows(d[blk.cardKey]) : ''}
        ${d.wind && d.wind.at !== null ? `<tr><td>${gl('apparentTemp', 'feels like, with the wind')} now</td><td>${fmt(d.wind.at)} °C</td></tr>` : ''}
        ${cmp}
      </table>
      <p class="note">${d.note}</p>
      <details class="expert"><summary>For experts</summary>
      <table>
        <tr><td>${gl('albedo', 'albedo α')}</td><td>${P.alpha.value}${tag(P.alpha)}</td></tr>
        <tr><td>${gl('emissivity', 'emissivity ε')}</td><td>${P.eps.value}${tag(P.eps)}</td></tr>
        ${heat}
        <tr><td>${gl('ef', 'evaporative fraction')}</td><td>${efCell}</td></tr>
        ${wet}
        <tr><td>${gl('svf', 'sky view factor')}</td><td>${d.svf.toFixed(2)}</td></tr>
        ${d.tmrtNow !== null ? `<tr><td>${gl('tmrt', 'Tmrt')} now / 15:00</td><td>${fmt(d.tmrtNow)} / ${fmt(d.tmrt15)} °C</td></tr>` : ''}
        ${d.wallsNow !== null ? `<tr><td>sun off the ${gl('wallReflection', 'walls')} now</td><td>${Math.round(d.wallsNow)} W m⁻²</td></tr>` : ''}
        ${d.glassNow !== null && glassMode ? `<tr><td>sun off the ${gl('specular', 'glass')} now</td><td>${Math.round(d.glassNow)} W m⁻²</td></tr>` : ''}
        ${d.wind ? `<tr><td>${gl('windFactor', 'wind factor f_w')}</td><td>${d.wind.fw.toFixed(2)} · ${fmt(d.wind.u)} of ${d.wind.site} m/s</td></tr>
        <tr><td>convection h_c</td><td>${fmt(d.wind.hc)} W m⁻² K⁻¹</td></tr>` : ''}
      </table>
      ${d.glass ? `<table>
        <tr><td colspan="2" class="sub">${gl('curtainWall', 'Curtain wall')}: ${d.glass.name}</td></tr>
        <tr><td>reflectance ρ₀ head-on</td><td>${d.glass.rho0.value}${tag(d.glass.rho0)}</td></tr>
        ${d.glass.faces.map((f) => `<tr><td>${f.face} face now</td><td>${f.rho !== null ? `${gl('fresnel', `ρ ${f.rho.toFixed(2)}`)} at θ ${Math.round(f.theta)}°` : 'not in sun'} · glass ${fmt(f.tg)} °C</td></tr>`).join('')}
        <tr><td>glass ${gl('emissivity', 'ε')} / absorptance</td><td>${d.glass.eps.value}${tag(d.glass.eps)} / ${d.glass.absorb.value}${tag(d.glass.absorb)}</td></tr>
      </table>` : ''}
      ${d.caveat ? `<p class="caveat">${d.caveat}</p>` : ''}
      ${d.prescribed ? `<p class="caveat">${d.prescribed}</p>` : ''}
      <p class="src">Sources: ${srcs.map(refLink).join('; ')}. Made-up block, calculated temperatures: a ${gl('forceRestore', 'force-restore')} surface model (Deardorff 1978) on a 5 m grid; the air temperature is fixed.</p></details>`;
    for (const a of card.querySelectorAll('a.ref')) a.setAttribute('href', `${a.getAttribute('href')}#${scene.id}`); // this block's group on the references page
    card.querySelector('.x').onclick = hideCard;
    card._pick = p;
    card._measure = null;
    card.dataset.kind = 'heat';
    card.dataset.open = '1';
    card.style.display = 'block';
    if (x !== undefined) {
      // keep the card inside the window, beside the click
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const left = x + 16 + w > window.innerWidth - 10 ? x - 16 - w : x + 16;
      card.style.left = `${Math.max(10, left)}px`;
      card.style.top = `${Math.max(10, Math.min(window.innerHeight - h - 10, y - 40))}px`;
    }
  }
  function hideCard() {
    card.style.display = 'none';
    card.dataset.open = '0';
  }

  // ---- footnotes (glossary) ---------------------------------------------------------------
  // #fn is a tooltip: the trigger gets aria-describedby + aria-expanded while open.
  // "pinned" footnotes (click, tap, Enter, keyboard focus) are not replaced by hover.
  const fn = $('fn');
  const terms = $('terms');
  const termsBtn = $('termsBtn');
  // retrofit: footnote numbers come from the Before state (the old block)
  const gstats = retro
    ? glossaryStats(V.before.world, V.before.thermal)
    : glassMode
      ? glossaryStats(world, thermal, { canyon: canyonStats(world, thermal, CANYONS.lane, openRef('stone')), spot: spotTmrt(15) })
      : wfMode
        ? glossaryStats(world, thermal, { wind: { river: wf().st.river.mean, corridor: wf().st.corridorMean, shelter: wf().st.shelterMean, lee: wf().st.lee01.mean } })
        : blk
            ? glossaryStats(world, thermal, blk.glossary())
            : glossaryStats(world, thermal);
  let fnPinned = false;
  let fnByFocus = false;
  let fnTrigger = null;
  let fnTimer = null;
  $('termsList').innerHTML = termsFor(scene.id).map((k) => `<li>${gl(k)}</li>`).join('');
  function releaseTrigger() {
    if (fnTrigger) {
      fnTrigger.removeAttribute('aria-describedby');
      fnTrigger.setAttribute('aria-expanded', 'false');
    }
    fnTrigger = null;
  }
  function showFn(key, r, pinned, trigger = null) {
    const g = GLOSSARY[key];
    if (!g) return;
    clearTimeout(fnTimer);
    fn.innerHTML = `<b>${g.term}</b><p>${g.text}</p><p class="rng">${rangeLine(key, gstats)}</p><p class="why">Why it matters: ${g.why}</p>`;
    fn.dataset.key = key;
    fn.hidden = false;
    fnPinned = pinned;
    fnByFocus = false;
    releaseTrigger();
    if (trigger) {
      fnTrigger = trigger;
      trigger.setAttribute('aria-describedby', 'fn');
      trigger.setAttribute('aria-expanded', 'true');
    }
    const inCard = !!trigger && card.contains(trigger);
    const w = fn.offsetWidth;
    const h = fn.offsetHeight;
    let top = r.bottom + 6;
    let left = r.left;
    if (inCard) {
      // beside the heat card, so it never hides the card's other rows
      const c = card.getBoundingClientRect();
      left = c.left - w - 8 >= 8 ? c.left - w - 8 : c.right + 8;
      top = r.top - 10;
    } else if (top + h > window.innerHeight - 8) top = r.top - h - 6;
    fn.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, left))}px`;
    fn.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, top))}px`;
  }
  function hideFn() {
    fn.hidden = true;
    fn.dataset.key = '';
    fnPinned = false;
    fnByFocus = false;
    releaseTrigger();
  }
  function toggleTerms(open = terms.hidden) {
    terms.hidden = !open;
    termsBtn.setAttribute('aria-expanded', String(open));
  }
  termsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTerms();
  });
  const termOf = (el) => (el && el.closest ? el.closest('.gl') : null);
  root.addEventListener('mouseover', (e) => {
    const t = termOf(e.target);
    if (!t) return;
    if (fnPinned) {
      if (fn.dataset.key === t.dataset.gl) clearTimeout(fnTimer);
      return; // never replace a pinned footnote on hover
    }
    showFn(t.dataset.gl, t.getBoundingClientRect(), false, t);
  });
  root.addEventListener('mouseout', (e) => {
    if (termOf(e.target) && !fnPinned) fnTimer = setTimeout(hideFn, 300);
  });
  fn.addEventListener('mouseenter', () => clearTimeout(fnTimer));
  fn.addEventListener('mouseleave', () => {
    if (!fnPinned) fnTimer = setTimeout(hideFn, 300);
  });
  root.addEventListener('focusin', (e) => {
    const t = termOf(e.target);
    if (t) {
      showFn(t.dataset.gl, t.getBoundingClientRect(), true, t);
      fnByFocus = true;
    }
  });
  root.addEventListener('focusout', (e) => {
    // a footnote opened by focus closes when focus moves off the terms
    if (fnByFocus && termOf(e.target) && !termOf(e.relatedTarget) && !(e.relatedTarget && fn.contains(e.relatedTarget))) hideFn();
  });
  root.addEventListener('click', (e) => {
    const t = termOf(e.target);
    if (t) {
      e.stopPropagation();
      showFn(t.dataset.gl, t.getBoundingClientRect(), true, t);
      return;
    }
    if (!fn.hidden && !fn.contains(e.target) && e.target !== canvas) hideFn();
    if (!terms.hidden && !terms.contains(e.target) && e.target !== termsBtn) toggleTerms(false);
  }, true);
  root.addEventListener('keydown', (e) => {
    const t = termOf(e.target);
    if (t && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      if (!fn.hidden && fn.dataset.key === t.dataset.gl) hideFn();
      else showFn(t.dataset.gl, t.getBoundingClientRect(), true, t);
    }
  }, true);

  // ---- idle pre-baking ------------------------------------------------------------------
  // While nothing is moving, bake the neighbouring hours of the current view in
  // idle slices so the first steps of a slider drag (or H) are already cached.
  // This only fills caches: exact frames look the same with or without it.
  const NEIGHBOURS = [0.25, -0.25, 0.5, -0.5, 1, -1];
  const idle = {
    queued: false,
    kick() {
      if (this.queued || typeof requestIdleCallback === 'undefined') return;
      this.queued = true;
      requestIdleCallback((d) => this.run(d), { timeout: 1000 });
    },
    run(d) {
      this.queued = false;
      if (S.scrub || (S.intro && S.frame < INTRO.pen)) return;
      const m = thermalMix(S.frame);
      const modes = m <= 0 ? ['day'] : m >= 1 ? ['thermal'] : ['day', 'thermal'];
      const W = canvas.width;
      const H = canvas.height;
      for (const { v, clip } of onScreen()) {
        const Rv = v.R;
        Rv.clip = clip; // bake only the band this view shows
        const fit = Math.floor(Rv.maxTiles / Math.max(1, Rv.visibleTiles(S.cam, W, H).tiles.length)) - 2;
        const hours = NEIGHBOURS.slice(0, Math.max(0, Math.floor(fit / modes.length) - 1)).map((dh) => quantHour(S.hour + dh));
        for (const mode of modes) {
          for (const h of hours) {
            while (d.timeRemaining() > 12) {
              if (!Rv.bakeSome(mode, S.cam, h, W, H, 1)) break;
            }
            if (d.timeRemaining() <= 12) {
              this.kick();
              return;
            }
          }
        }
      }
    },
  };

  // ---- loop ----------------------------------------------------------------------------------
  const frameTimes = [];
  let lastT = null;
  const loop = (t) => {
    if (lastT !== null && frameTimes.length < 100000) frameTimes.push(t - lastT);
    lastT = t;
    if (!S.paused) {
      S.frame++;
      draw();
    } else if (dirty || S.scrub) draw();
    if (!S.scrub) idle.kick();
    requestAnimationFrame(loop);
  };
  syncUi();
  syncRetro();
  syncGlass();
  syncWf();
  if (blk) blk.sync();
  foldPanels();
  draw();
  requestAnimationFrame(loop);

  // ---- API (used by checks; stable) --------------------------------------------------------
  // checks may name a view: 'before' / 'after' (retrofit) or nothing (the main view)
  const vw = (which) => (which ? V[which] : main);
  const api = {
    ready: true,
    /** True while the loading hint is shown (#29 item 3). */
    hint: () => !inkHint.hidden,
    info: {
      worldMs: t1 - t0,
      modelMs: t2 - t1,
      drawMs: t3 - t2,
      totalMs: performance.now() - t0,
      items: display.items.length,
      intro: INTRO,
      views: Object.keys(V),
      changedCells: retro ? V.after.thermal.info.changed : 0,
      ...(glassSet ? glassSet.timing : {}),
      ...(wfSet ? wfSet.timing : {}),
      ...(htSet ? htSet.timing : {}),
      ...(pkSet ? pkSet.timing : {}),
      ...(esSet ? esSet.timing : {}),
      ...(cpSet ? cpSet.timing : {}),
      ...(bsSet ? bsSet.timing : {}),
      ...(vgSet ? vgSet.timing : {}),
      ...(dsSet ? dsSet.timing : {}),
      ...(nmSet ? nmSet.timing : {}),
    },
    /** Pure seek: render frame N with an optional camera {z,cx,cy}; pauses the clock. */
    seek(frame, cam) {
      S.paused = true;
      S.scrub = false;
      S.frame = frame;
      if (cam) S.cam = { ...cam };
      return { ...draw() };
    },
    hash: () => hashCanvas(R.ctx, canvas.width, canvas.height),
    /** Set the look: {hour, thermal (immediate), notes, intro}. */
    look(o) {
      if (o.hour !== undefined) {
        S.hour = o.hour;
        S.scrub = false;
      }
      if (o.thermal !== undefined) {
        S.thermal = !!o.thermal;
        S.since = -1e9;
      }
      if (o.notes !== undefined) S.notes = !!o.notes;
      if (o.intro !== undefined) S.intro = !!o.intro;
      if (o.people !== undefined) S.people = !!o.people;
      syncUi();
    },
    state: () => ({ frame: S.frame, cam: { ...S.cam }, hour: S.hour, thermal: S.thermal, mix: thermalMix(S.frame), paused: S.paused }),
    play() {
      S.paused = false;
    },
    /** World point -> CSS pixel on the canvas for the current camera. */
    project(x, y, z = 0) {
      const [ox, oy, Z] = R.origin(S.cam, canvas.width, canvas.height);
      const p = iso(x, y, z);
      return [(ox + p[0] * Z) / R.dpr, (oy + p[1] * Z) / R.dpr];
    },
    probes(h = S.hour, which) {
      const { world, thermal } = vw(which);
      const out = {};
      for (const k of Object.keys(P)) {
        const [x, y] = P[k];
        const i = world.cellIndex(x, y);
        out[k] = { at: P[k], ts: thermal.ts(i, h), sunlit: thermal.sunlit(i, h), svf: world.svf[i] };
      }
      out.air = thermal.air(h);
      return out;
    },
    palette: () => paletteLut(),
    agents(frame = S.frame, hour = S.hour, which) {
      const { life, shadeFor } = vw(which);
      const hq = quantHour(hour);
      const sh = shadeFor(hq);
      return life.at(frame / 60, hq).map((a) => ({ x: a.x, y: a.y, sit: a.sit, shade: shadeAt(sh, a.x, a.y) }));
    },
    /** Sweat cue per person: position, local Tmrt, sunlit share, strength, droplets showing. */
    sweat(frame = S.frame, hour = S.hour, which) {
      const { life, shadeFor, R } = vw(which);
      const hq = quantHour(hour);
      return life.at(frame / 60, hq).map((a) => {
        const h = a.heat ?? R.heatAt(a.x, a.y, hq);
        const st = R.sweatAt(a, frame / 60, hq);
        return { x: a.x, y: a.y, tmrt: h.tmrt, sunlit: h.sunlit, shade: a.heat ? +(h.sunlit < 0.5) : shadeAt(shadeFor(hq), a.x, a.y), s: st.s, drops: st.drops.length, fall: st.drops.length ? st.drops[0].fall : null, fan: st.fan, hidden: R.hidden(a.x, a.y) };
      });
    },
    shadeStats(frame = S.frame, hour = S.hour, which) {
      const { world, life, shadeFor } = vw(which);
      const hq = quantHour(hour);
      return shadeDensity(world, life.at(frame / 60, hq), shadeFor(hq));
    },
    card: (kind, a, b, which) => {
      const view = vw(which);
      const w = view.world;
      if (kind === 'tree') return cardData({ kind, T: w.trees[a], view }); // a: tree index
      return cardData(kind === 'building' ? { kind, B: w.buildings.find((B) => B.id === a), view } : { kind: 'ground', x: a, y: b, g: view.scene.ground[w.parcelAt(a, b)], view });
    },
    stats: () => ({ ...lastStats }),
    /** False while a slider drag is showing (or refining) preview frames. */
    settled: () => !S.scrub,
    /** Tile cache size and cap. */
    cache: () => ({ size: R.tiles.size, cap: R.maxTiles }),
    /** Glossary keys, and the on-canvas note term hit boxes (CSS px). */
    glossaryKeys: () => Object.keys(GLOSSARY),
    glossaryStats: () => ({ ...gstats }),
    noteTerms: () => (notesR.noteHits ?? []).map((h) => ({ ...h })),
    /** Notes on the canvas (text lines), for checks. */
    notes: () => (S.notes ? notes.map((n) => ({ key: n.key, text: n.text.slice() })) : []),
    /**
     * Opaque boxes in draw order (for occlusion masks in checks):
     * {kind, b (building index or -1), box: [x0, y0, x1, y1, z0, z1]}.
     */
    boxes(which) {
      const { display, world } = vw(which);
      const out = [];
      for (const o of display.objects) {
        if (o.kind === 'b') {
          const B = o.o;
          out.push({ kind: 'b', b: B.index, gable: !!B.gable, box: [B.x0, B.y0, B.x1, B.y1, 0, B.h + (B.gable ? 4 : 0)] });
          if (B.chimney) {
            const [cx, cy, ch] = B.chimney;
            out.push({ kind: 'chimney', b: -1, box: [cx - 1.6, cy - 1.6, cx + 1.6, cy + 1.6, B.h, ch] });
          }
          for (const A of world.awnings) if (A.b === B.index) out.push({ kind: 'a', b: -1, box: [A.x0, A.y0, A.x1, A.y1, A.z0 - 0.3, A.z1] });
        } else if (o.kind === 'p') out.push({ kind: 'p', b: -1, box: [o.o.x0, o.o.y0, o.o.x1, o.o.y1, o.o.z - 0.1, o.o.z] });
        else if (o.kind === 'c') out.push({ kind: 'c', b: -1, box: [o.x0, o.y0, o.x1, o.y1, 0, 1.6] });
        else if (o.kind === 's') out.push({ kind: 's', b: -1, box: [o.x0, o.y0, o.x1, o.y1, 0, 2.6] });
        else if (o.kind === 'n') out.push({ kind: 'n', b: -1, box: [o.x0, o.y0, o.x1, o.y1, 0, 1] });
      }
      return out;
    },
    /** Measure n animation frames; returns rAF intervals and draw cost. */
    perf(n = 300) {
      return new Promise((resolve) => {
        const draws = [];
        const gaps = [];
        let prev = null;
        let k = 0;
        S.paused = true;
        const step = (t) => {
          if (prev !== null) gaps.push(t - prev);
          prev = t;
          S.frame++;
          const a = performance.now();
          draw();
          draws.push(performance.now() - a);
          if (++k < n) requestAnimationFrame(step);
          else resolve({ gaps, draws });
        };
        requestAnimationFrame(step);
      });
    },
    frameTimes,
    /**
     * Retrofit (block 2) only: state {state, split, swap, d, aged}; set() any
     * of them (as the controls do); measures with Before / After numbers;
     * card HTML; daily evaporated water per wetted material and d.
     */
    /**
     * Glass block (block 3) only: state {glass, ac}; set() them; spot numbers
     * (with the reflection-off comparison); card HTML; walker density by class.
     */
    glass: glassMode
      ? {
        state: () => ({ glass: S.glass, ac: !!S.ac }),
        set(o) {
          if (o.glass !== undefined) setGlass(o.glass);
          if (o.ac !== undefined) setAc(o.ac);
        },
        spot: (h = 15, g = S.glass) => {
          const st = spotStats(glassSet, world, g, h);
          delete st.spots;
          return st;
        },
        canyons: () => {
          const c = canyons();
          for (const v of Object.values(c)) delete v.cells;
          return c;
        },
        html: (id) => cbdCardHtml(id),
        show: (id) => showCbdCard(id, root.querySelector(`#glass [data-card="${id}"]`)),
        density: (frame = S.frame, hour = S.hour) => {
          const hq = quantHour(hour);
          return classDensity(world, main.life.at(frame / 60, hq), main.shadeFor(hq));
        },
        models: () => glassSet.cached(),
        reflAt: (x, y, h = S.hour) => thermal.refl(world.cellIndex(x, y), h),
      }
      : null,
    /**
     * Waterfront block (block 4) only: state {wind, air, u}; set() them; wind
     * lines (hash, summary, vertices), wind factor at a point, model numbers,
     * card HTML, walkers' wind.
     */
    wind: wfMode
      ? {
        state: () => ({ wind: !!S.wind, air: !!S.air, u: S.u }),
        set(o) {
          if (o.u !== undefined) setU(Number(o.u));
          if (o.wind !== undefined) setWindLines(o.wind);
          if (o.air !== undefined) setAir(o.air);
        },
        lines: () => lineStats(world, wfSet.lines()),
        vertices: () => wfSet.lines().map((L) => Array.from(L.p)),
        fw: (x, y) => world.fw[world.cellIndex(x, y)],
        stats: () => {
          const w = wf();
          const ac = { ...w.ac, sheltered: { ...w.ac.sheltered, cells: undefined }, exposed: { ...w.ac.exposed, cells: undefined } };
          return { st: w.st, hc: w.hc, ac, water: w.water, overlay: w.overlay, shade: w.shade };
        },
        html: (id) => wfCardHtml(id),
        show: (id) => showWfCard(id, root.querySelector(`#wind [data-card="${id}"]`)),
        walkers: (frame = S.frame, hour = S.hour) => {
          const hq = quantHour(hour);
          const sh = main.shadeFor(hq);
          const P = main.life.plan(hq);
          return { ...walkerWind(world, main.life.at(frame / 60, hq), sh), choice: P.choice.slice(), costs: P.costs.map((c) => c.slice()), routes: scene.routes.map((r) => r.id), atGap: sh.atGap ?? null };
        },
        models: () => wfSet.cached(),
      }
      : null,
    /** Hutong block (block 5) only: its plugin's API (hutui.js htApp). */
    hutong: htMode ? blk.api : null,
    /** Car park block (block 6) only: its plugin's API (pkui.js pkApp). */
    parking: pkMode ? blk.api : null,
    /** Estate block (block 7) only: its plugin's API (esui.js esApp). */
    estate: esMode ? blk.api : null,
    campus: cpMode ? blk.api : null,
    busstop: bsMode ? blk.api : null,
    village: vgMode ? blk.api : null,
    desert: dsMode ? blk.api : null,
    market: nmMode ? blk.api : null,
    retro: retro
      ? {
        state: () => ({ state: S.state, split: S.split, swap: S.swap, d: S.d, aged: S.aged }),
        set(o) {
          if (o.aged !== undefined) setAged(!!o.aged);
          if (o.d !== undefined) setRain(o.d);
          if (o.state !== undefined) setState(o.state);
          if (o.split !== undefined) setSplit(o.split);
          if (o.swap !== undefined) S.swap = !!o.swap;
          syncRetro();
        },
        measures: () => MEASURES.map((m) => ({ id: m.id, name: m.name, ...measureStatsFor(m.id) })),
        measure: (id) => measureStatsFor(id),
        html: (id) => measureHtml(id),
        show: (id) => showMeasure(id, root.querySelector(`#retro [data-measure="${id}"]`)),
        water: (ds = [0, 1, 2, 3, 4, 5, 6, 7]) => waterBudget(V.after.world, ds.map((d) => ({ d, model: afterModel(d, S.aged) }))),
        divider: () => Math.round(S.split * canvas.width) / R.dpr,
      }
      : null,
  };
  window.atlas = api;
  return api;
}
