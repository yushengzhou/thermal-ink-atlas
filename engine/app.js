// app: boot, clock, keys, seek(), query modes, overlay (slider, notes, heat
// card) and a small window.atlas API used by the checks.
import { iso, unIso, clamp, ISO_C, ISO_S } from './core.js';
import { buildWorld } from './world.js';
import { drawWorld } from './kit.js';
import { runModel, shadeClassField, paletteLut, PALETTE_STOPS, heatRgb } from './thermal.js';
import { Life, shadeDensity, shadeAt } from './life.js';
import { Renderer, INTRO, quantHour } from './render.js';
import { MATERIALS, SOURCES } from './materials.js';

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

export function boot(scene, root = document) {
  const t0 = performance.now();
  const world = buildWorld(scene);
  const t1 = performance.now();
  const thermal = runModel(world);
  const t2 = performance.now();
  const display = drawWorld(world, scene.seed);
  const shadeCache = new Map();
  const shadeFor = (hq) => {
    if (!shadeCache.has(hq)) shadeCache.set(hq, shadeClassField(world, thermal.sun(hq)));
    return shadeCache.get(hq);
  };
  const life = new Life(scene, shadeFor, (h) => thermal.air(h));
  const canvas = root.getElementById('atlas');
  const R = new Renderer(canvas, world, display, thermal, life);
  const t3 = performance.now();

  // ---- state -------------------------------------------------------------------------
  const q = new URLSearchParams(location.search);
  const S = {
    frame: 0,
    paused: false,
    cam: { ...scene.startCam },
    hour: 15,
    thermal: false,
    since: -1e9,
    notes: q.get('notes') !== '0',
    intro: true,
  };
  if (q.has('hour')) S.hour = clamp(parseFloat(q.get('hour')) || 0, 0, 23.75);
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
  const notesText = {
    asphalt: ['Kiln Street, old asphalt (albedo 0.12):', `${fmt(at('asphalt', 15))} °C at 3 pm, still ${fmt(at('asphalt', 23))} °C at 11 pm`],
    lawn: [`Park lawn: ${fmt(at('grass', 15))} °C at 3 pm;`, `${fmt(at('grass', 23))} °C at 11 pm, below the ${fmt(thermal.air(23))} °C air`],
    shade: ['In the hot hours walkers keep', 'to the shady pavement'],
    roofs: [`White roof ${fmt(at('coolRoof', 15))} °C,`, `dark roof ${fmt(at('darkRoof', 15))} °C at 3 pm`],
    pond: [`The pond stays near ${fmt(at('water', 15))} °C`],
  };
  const notes = scene.notes.slice(0, 5).map((n) => ({ ...n, text: notesText[n.key] }));

  const thermalMix = (f) => {
    const k = clamp((f - S.since) / FADE, 0, 1);
    return S.thermal ? k : 1 - k;
  };
  const look = (f) => ({ hour: S.hour, thermalMix: thermalMix(f), notes: S.notes ? notes : null, intro: S.intro });

  // ---- sizing ------------------------------------------------------------------------------
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    R.dpr = dpr;
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
  const draw = () => {
    lastStats = R.frame(S.frame, S.cam, look(S.frame));
    return lastStats;
  };

  // ---- overlay -------------------------------------------------------------------------------
  const $ = (id) => root.getElementById(id);
  const slider = $('hour');
  const hourLabel = $('hourLabel');
  const legend = $('legend');
  const card = $('card');
  const syncUi = () => {
    slider.value = String(S.hour);
    hourLabel.textContent = `${hhmm(S.hour)}  ·  air ${fmt(thermal.air(S.hour))} °C`;
    legend.style.opacity = S.thermal ? '1' : '0';
    root.body.classList.toggle('thermal', S.thermal);
  };
  // legend gradient from the palette
  const lo = PALETTE_STOPS[0][0];
  const hi = PALETTE_STOPS[PALETTE_STOPS.length - 1][0];
  $('legendBar').style.background = `linear-gradient(90deg, ${PALETTE_STOPS.map(([t]) => {
    const c = heatRgb(t);
    return `rgb(${c.map(Math.round).join(',')}) ${(((t - lo) / (hi - lo)) * 100).toFixed(1)}%`;
  }).join(', ')})`;
  $('legendLo').textContent = `${lo} °C`;
  $('legendHi').textContent = `${hi} °C`;

  const setHour = (h) => {
    S.hour = ((Math.round(h / 0.25) * 0.25) % 24 + 24) % 24;
    syncUi();
    if (card.dataset.open === '1') showCard(card._pick);
    draw();
  };
  slider.addEventListener('input', () => setHour(parseFloat(slider.value)));
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
    else if (k === 'h') setHour(S.hour + 1);
    else if (k === 'H') setHour(S.hour - 1);
    else if (k === 'n' || k === 'N') S.notes = !S.notes;
    else if (k === ' ') S.paused = !S.paused;
    else if (k === 'r' || k === 'R') {
      S.frame = 0;
      S.intro = true;
    } else if (k === 'Escape') hideCard();
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
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, cam: { ...S.cam }, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    if (!drag.moved) return;
    const a = -dx / drag.cam.z / ISO_C;
    const b = -dy / drag.cam.z / ISO_S;
    S.cam = { ...drag.cam, cx: clamp(drag.cam.cx + (a + b) / 2, 0, 400), cy: clamp(drag.cam.cy + (b - a) / 2, 0, 400) };
    if (S.paused) draw();
  });
  canvas.addEventListener('pointerup', (e) => {
    const d = drag;
    drag = null;
    if (d && !d.moved) {
      const p = pick(e.clientX, e.clientY);
      if (p) showCard(p, e.clientX, e.clientY);
      else hideCard();
    }
  });

  /** Screen (CSS px) -> what is under it: building, tree or ground parcel. */
  function pick(cx, cy) {
    const dpr = R.dpr;
    const [ox, oy, Z] = R.origin(S.cam, canvas.width, canvas.height);
    const px = (cx * dpr - ox) / Z;
    const py = (cy * dpr - oy) / Z;
    const objs = display.objects;
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
        if (inside) return { kind: 'building', B };
      } else if (o.kind === 't') {
        const T = o.o;
        const c = iso(T.x, T.y, T.zc);
        if (Math.hypot(px - c[0], py - c[1]) < T.r * 0.95) return { kind: 'tree', T };
      }
    }
    const [x, y] = unIso(px, py, 0);
    if (x < 0 || y < 0 || x >= world.size || y >= world.size) return null;
    return { kind: 'ground', x, y, g: scene.ground[world.parcelAt(x, y)] };
  }

  /** Data for a heat card (also used by checks). */
  function cardData(p) {
    const h = S.hour;
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
      title = 'Tree';
      mat = 'canopy';
      cells = [world.cellIndex(p.T.x, p.T.y)];
      tmrtCell = cells[0];
    } else {
      title = p.g.name;
      mat = p.g.mat;
      cells = [world.cellIndex(p.x, p.y)];
      tmrtCell = cells[0];
    }
    const m = MATERIALS[mat];
    const mean = (hh) => cells.reduce((s, i) => s + thermal.ts(i, hh), 0) / cells.length;
    const svf = cells.reduce((s, i) => s + world.svf[i], 0) / cells.length;
    const ts = mat === 'canopy' ? (hh) => thermal.canopyTemp(hh) : mean;
    return {
      title,
      material: m.name,
      params: { alpha: m.alpha, eps: m.eps, mu: m.mu, ef: m.ef },
      svf,
      tsNow: ts(h),
      ts15: ts(15),
      ts23: ts(23),
      groundNow: mat === 'canopy' ? mean(h) : null,
      tmrtNow: tmrtCell !== null ? thermal.tmrt(tmrtCell, h) : null,
      tmrt15: tmrtCell !== null ? thermal.tmrt(tmrtCell, 15) : null,
      air: thermal.air(h),
      note: m.note,
      hour: h,
    };
  }

  function showCard(p, x, y) {
    if (!p) return;
    const d = cardData(p);
    const tag = (v) => (v.verified ? '' : ' <span class="unv" title="value not yet checked against the primary source">unverified</span>');
    const srcs = [...new Set(Object.values(d.params).map((v) => v.source))];
    card.innerHTML = `
      <button class="x" aria-label="close">×</button>
      <h3>${d.title}</h3>
      <div class="mat">${d.material}</div>
      <table>
        <tr><td>albedo α</td><td>${d.params.alpha.value}${tag(d.params.alpha)}</td></tr>
        <tr><td>emissivity ε</td><td>${d.params.eps.value}${tag(d.params.eps)}</td></tr>
        <tr><td>admittance μ</td><td>${d.params.mu.value} J m⁻² s⁻½ K⁻¹${tag(d.params.mu)}</td></tr>
        <tr><td>evaporative fraction</td><td>${d.params.ef.value}${tag(d.params.ef)}</td></tr>
        <tr><td>sky view factor</td><td>${d.svf.toFixed(2)}</td></tr>
        <tr class="t"><td>surface now (${hhmm(d.hour)})</td><td>${fmt(d.tsNow)} °C</td></tr>
        <tr class="t"><td>surface 15:00 / 23:00</td><td>${fmt(d.ts15)} / ${fmt(d.ts23)} °C</td></tr>
        ${d.groundNow !== null ? `<tr><td>ground beneath now</td><td>${fmt(d.groundNow)} °C</td></tr>` : ''}
        ${d.tmrtNow !== null ? `<tr><td>Tmrt (person) now / 15:00</td><td>${fmt(d.tmrtNow)} / ${fmt(d.tmrt15)} °C</td></tr>` : ''}
        <tr><td>air now</td><td>${fmt(d.air)} °C</td></tr>
      </table>
      <p class="note">${d.note}</p>
      <p class="src">Sources: ${srcs.map((s) => `[${s}] ${SOURCES[s]}`).join('; ')}. Model: force-restore (Deardorff 1978); see docs/sources.md.</p>`;
    card.querySelector('.x').onclick = hideCard;
    card._pick = p;
    card.dataset.open = '1';
    if (x !== undefined) {
      card.style.left = `${Math.min(window.innerWidth - 340, x + 16)}px`;
      card.style.top = `${Math.max(10, Math.min(window.innerHeight - 420, y - 40))}px`;
    }
    card.style.display = 'block';
  }
  function hideCard() {
    card.style.display = 'none';
    card.dataset.open = '0';
  }

  // ---- loop ----------------------------------------------------------------------------------
  const frameTimes = [];
  let lastT = null;
  const loop = (t) => {
    if (lastT !== null && frameTimes.length < 100000) frameTimes.push(t - lastT);
    lastT = t;
    if (!S.paused) {
      S.frame++;
      draw();
    }
    requestAnimationFrame(loop);
  };
  syncUi();
  draw();
  requestAnimationFrame(loop);

  // ---- API (used by checks; stable) --------------------------------------------------------
  const api = {
    ready: true,
    info: {
      worldMs: t1 - t0,
      modelMs: t2 - t1,
      drawMs: t3 - t2,
      items: display.items.length,
      intro: INTRO,
    },
    /** Pure seek: render frame N with an optional camera {z,cx,cy}; pauses the clock. */
    seek(frame, cam) {
      S.paused = true;
      S.frame = frame;
      if (cam) S.cam = { ...cam };
      return { ...draw() };
    },
    hash: () => hashCanvas(R.ctx, canvas.width, canvas.height),
    /** Set the look: {hour, thermal (immediate), notes, intro}. */
    look(o) {
      if (o.hour !== undefined) S.hour = o.hour;
      if (o.thermal !== undefined) {
        S.thermal = !!o.thermal;
        S.since = -1e9;
      }
      if (o.notes !== undefined) S.notes = !!o.notes;
      if (o.intro !== undefined) S.intro = !!o.intro;
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
    probes(h = S.hour) {
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
    agents(frame = S.frame, hour = S.hour) {
      const hq = quantHour(hour);
      const sh = shadeFor(hq);
      return life.at(frame / 60, hq).map((a) => ({ x: a.x, y: a.y, sit: a.sit, shade: shadeAt(sh, a.x, a.y) }));
    },
    shadeStats(frame = S.frame, hour = S.hour) {
      const hq = quantHour(hour);
      return shadeDensity(world, life.at(frame / 60, hq), shadeFor(hq));
    },
    card: (kind, a, b) => cardData(kind === 'building' ? { kind, B: world.buildings.find((B) => B.id === a) } : { kind: 'ground', x: a, y: b, g: scene.ground[world.parcelAt(a, b)] }),
    stats: () => ({ ...lastStats }),
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
  };
  window.atlas = api;
  return api;
}
