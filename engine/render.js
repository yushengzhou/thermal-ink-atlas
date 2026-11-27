// render: replays the display list into per-tile bakes (keyed by mode, zoom,
// quantised hour and tile index), composites cast shadows, the watercolour
// heat wash and the live layer (people, margin notes). Every pixel is a pure
// function of (frame, camera, look); caches only skip repeated work. The one
// exception is the scrub preview during a slider drag (see previewHours).
import { iso, hash3, noise2, clamp, smooth, rgbCss, mixRgb, scaleRgb, hexRgb, PAPER, INK, ISO_C, ISO_S, ISO_Z, DEG } from './core.js';
import { shadowPolys, heatRgb } from './thermal.js';
import { sweatState, shadeAt } from './life.js';
import { overlayDT, dayWeight } from './wind.js';

export const TILE = 512;
export const HOUR_STEP = 0.25;
export const INTRO = { pen: 150, wash: 240, life: 300 };
export const PREVIEW_BUDGET = 2;
export const quantHour = (h) => (Math.round((((h % 24) + 24) % 24) / HOUR_STEP) * HOUR_STEP) % 24;

const PAPER_CSS = rgbCss(PAPER);
const SHADOW_RGB = hexRgb('#4b5a78');
const THERMAL_WALL = hexRgb('#e7dfcd');
const NIGHT_RGB = hexRgb('#27355a');
const LIT = hexRgb('#f4cf7a');
const SWEAT_CSS = 'rgba(143,182,207,0.95)';
// glass pane colours by type (day view), and the reflection-spot glint
export const GLASS_RGB = { clear: hexRgb('#7d9ea6'), lowe: hexRgb('#8ea4b8'), mirror: hexRgb('#b9c3c6') };
const GLINT = [255, 246, 214];
const AC_INK = hexRgb('#8a2f22');
// block 4: the water's air overlay (cooling / warming) and the wind-line ink
const AIR_COOL = hexRgb('#3b6573');
const AIR_WARM = hexRgb('#b96d4d');
const WIND_INK = hexRgb('#24354a');
const HAND_FONT = '"Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive';

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Paper (with fibres) and grain textures, 256 px, seamless by construction. */
function makeTextures() {
  const N = 256;
  const paper = makeCanvas(N, N);
  const grain = makeCanvas(N, N);
  const pc = paper.getContext('2d');
  const gc = grain.getContext('2d');
  const pd = pc.createImageData(N, N);
  const gd = gc.createImageData(N, N);
  const per = (x, y, s, seed) => {
    // periodic value noise: wrap lattice at N/s
    const P = N / s;
    const xi = x / s;
    const yi = y / s;
    const i = Math.floor(xi);
    const j = Math.floor(yi);
    const fx = xi - i;
    const fy = yi - j;
    const h = (a, b) => hash3(((a % P) + P) % P, ((b % P) + P) % P, seed);
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = h(i, j);
    const b = h(i + 1, j);
    const c = h(i, j + 1);
    const d = h(i + 1, j + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const k = (y * N + x) * 4;
      const fib = per(x, y * 4, 8, 3) * 0.5 + per(x, y, 32, 4) * 0.5;
      const g = hash3(x, y, 9);
      const m = 1 - 0.035 * fib - 0.03 * g;
      pd.data[k] = PAPER[0] * m;
      pd.data[k + 1] = PAPER[1] * m;
      pd.data[k + 2] = PAPER[2] * (m - 0.01);
      pd.data[k + 3] = 255;
      const gg = 255 * (1 - 0.05 * per(x, y, 4, 5) - 0.035 * g - 0.03 * fib);
      gd.data[k] = gg;
      gd.data[k + 1] = gg;
      gd.data[k + 2] = gg;
      gd.data[k + 3] = 255;
    }
  }
  pc.putImageData(pd, 0, 0);
  gc.putImageData(gd, 0, 0);
  return { paper, grain };
}

export class Renderer {
  constructor(canvas, world, display, thermal, life) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.items = display.items;
    this.groundCount = display.groundCount;
    this.thermal = thermal;
    this.life = life;
    this.tiles = new Map();
    this.hourCache = new Map();
    this.tex = makeTextures();
    this.scaffold = null;
    this.stats = { people: 0, tilesBaked: 0, frameMs: 0, preview: false };
    this.dpr = 1;
    this.maxTiles = 72;
    this.scrub = false; // set per frame from look.scrub
    this.budget = Infinity;
    this.pending = {};
    this.shown = {};
    this.pins = {}; // mode -> Set of `z|hour|dpr` the scrub preview needs
    this.clip = null; // [x0, x1] device px: draw only this vertical band (split view)
    this.glass = 'lowe'; // glass type (block 3): pane colours
    this.spotFor = null; // (hq) -> reflection spot field on the 2 m grid, or null (block 3)
    this.wind = null; // block 4: {lines, items} wind lines (wind.js windLines + pen.stream items)
    this.pool = world.scene.pooling !== false; // edge pooling on washes (off in block 5)
    // block 5: skip shadow polygons off the tile. Not used elsewhere: Skia may anti-alias a smaller
    // path differently, so blocks 1-4 keep their exact pixels
    this.cullShadows = !!world.scene.cullShadows;
    const hs = Math.max(0, ...world.buildings.map((b) => b.h + (b.chimney ? b.chimney[2] - b.h : 0)));
    this.topMargin = Math.max(40, hs + 8); // m above ground that tiles must cover
  }

  /** New glass type (block 3): pane colours, spots and heat change, so drop every cached bake. */
  setGlass(g, thermal) {
    this.glass = g;
    if (thermal) this.thermal = thermal;
    this.tiles.clear();
    this.hourCache.clear();
    this.tmrtCache = null;
    this.scaffold = null;
  }

  /** New model results (days since rain changed): drop heat-dependent caches. */
  setThermal(thermal) {
    this.thermal = thermal;
    this.hourCache.clear();
    this.tmrtCache = null;
    for (const k of [...this.tiles.keys()]) if (k.startsWith('thermal|')) this.tiles.delete(k);
  }

  /** New display list (aged / new materials redrawn): drop every cached bake. */
  setDisplay(display) {
    this.items = display.items;
    this.groundCount = display.groundCount;
    this.tiles.clear();
    this.scaffold = null;
  }

  // ---- hour context ------------------------------------------------------

  hourCtx(hq) {
    if (this.hourCache.has(hq)) return this.hourCache.get(hq);
    const sun = this.thermal.sun(hq);
    const up = sun.alt > 0;
    const sx = Math.sin(sun.az * DEG);
    const sy = -Math.cos(sun.az * DEG);
    const ca = Math.cos(Math.max(0, sun.alt) * DEG);
    const light = (n) => (up ? 0.72 + 0.3 * Math.max(0, n[0] * sx + n[1] * sy) * ca + 0.06 * Math.sin(Math.max(0, sun.alt) * DEG) : 0.8);
    const night = clamp((4 - sun.alt) / 12, 0, 1);
    const polys = shadowPolys(this.world, sun);
    const shadows = up ? polys.b.concat(polys.t).filter(Boolean).map((p) => {
      const out = new Float32Array(p.length);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let i = 0; i < p.length; i += 2) {
        const q = iso(p[i], p[i + 1], 0);
        out[i] = q[0];
        out[i + 1] = q[1];
        if (q[0] < x0) x0 = q[0];
        if (q[0] > x1) x1 = q[0];
        if (q[1] < y0) y0 = q[1];
        if (q[1] > y1) y1 = q[1];
      }
      out.bb = [x0, y0, x1, y1]; // projected bounds, to skip polygons off a tile
      return out;
    }) : [];
    // building roof temperatures and ground heat image for the thermal view
    const roofT = this.world.buildings.map(() => [0, 0]);
    const N = this.world.n * this.world.n;
    for (let i = 0; i < N; i++) {
      const b = this.world.bld[i];
      if (b >= 0) {
        roofT[b][0] += this.thermal.ts(i, hq);
        roofT[b][1]++;
      }
    }
    const ctxh = {
      hq,
      sun,
      up,
      light,
      night,
      shadows,
      roof: roofT.map(([s, c]) => (c ? s / c : 30)),
      lightS: light([0, 1]),
      lightE: light([1, 0]),
      canopyT: this.thermal.canopyTemp(hq),
      heatImg: null,
      spot: up && this.spotFor ? this.spotFor(hq) : null,
      spotImg: null,
    };
    this.hourCache.set(hq, ctxh);
    if (this.hourCache.size > 40) this.hourCache.delete(this.hourCache.keys().next().value);
    return ctxh;
  }

  /** Watercolour heat image of the ground (2 m pixels, world-aligned). */
  heatImage(hc) {
    if (hc.heatImg) return hc.heatImg;
    const W = this.world;
    const n = W.n;
    const field = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) field[i] = this.thermal.ts(i, hc.hq);
    // fill building footprints from neighbouring ground (they are under roofs)
    const ground = new Float32Array(field);
    const known = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) known[i] = W.bld[i] < 0 ? 1 : 0;
    for (let pass = 0; pass < 12; pass++) {
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const k = j * n + i;
          if (known[k]) continue;
          let s = 0;
          let c = 0;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const ii = i + di;
            const jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
            const kk = jj * n + ii;
            if (known[kk] === 1) {
              s += ground[kk];
              c++;
            }
          }
          if (c) {
            ground[k] = s / c;
            known[k] = 2;
          }
        }
      }
      for (let k = 0; k < n * n; k++) if (known[k] === 2) known[k] = 1;
    }
    // soft copy (3x3 box blur)
    const soft = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let s = 0;
        let c = 0;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const ii = i + di;
            const jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= n || jj >= n) continue;
            s += ground[jj * n + ii];
            c++;
          }
        }
        soft[j * n + i] = s / c;
      }
    }
    const sample = (f, x, y) => {
      const u = clamp(x / W.cell - 0.5, 0, n - 1.001);
      const v = clamp(y / W.cell - 0.5, 0, n - 1.001);
      const i = Math.floor(u);
      const j = Math.floor(v);
      const fx = u - i;
      const fy = v - j;
      const a = f[j * n + i];
      const b = f[j * n + Math.min(n - 1, i + 1)];
      const c = f[Math.min(n - 1, j + 1) * n + i];
      const d = f[Math.min(n - 1, j + 1) * n + Math.min(n - 1, i + 1)];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
    const R = 2; // metres per pixel
    const M = Math.round(W.size / R);
    const img = makeCanvas(M, M);
    const g = img.getContext('2d');
    const d = g.createImageData(M, M);
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        const wx = (x + 0.5) * R;
        const wy = (y + 0.5) * R;
        // blooming edges: jitter the sample point with smooth noise
        const jx = (noise2(wx / 9, wy / 9, 31) - 0.5) * 2;
        const jy = (noise2(wx / 9, wy / 9, 32) - 0.5) * 2;
        const sh = sample(ground, wx + jx, wy + jy);
        const so = sample(soft, wx, wy);
        const t = so + (sh - so) * 0.9;
        const c = heatRgb(t);
        const edge = 1 - Math.min(0.08, Math.abs(sh - so) * 0.012);
        const pig = 1 - 0.035 * noise2(wx / 3.5, wy / 3.5, 33);
        const k = (y * M + x) * 4;
        d.data[k] = c[0] * edge * pig;
        d.data[k + 1] = c[1] * edge * pig;
        d.data[k + 2] = c[2] * edge * pig;
        d.data[k + 3] = 255;
      }
    }
    g.putImageData(d, 0, 0);
    hc.heatImg = { img, R };
    return hc.heatImg;
  }

  /** Reflection spots as an alpha image (2 m pixels, world-aligned): alpha grows with r up to r = 0.4. */
  spotImage(hc) {
    if (hc.spotImg || !hc.spot) return hc.spotImg;
    const { n, r, cell } = hc.spot;
    const img = makeCanvas(n, n);
    const g = img.getContext('2d');
    const d = g.createImageData(n, n);
    // bounding box of the spots on the drawing plane (P units), to skip tiles without any
    let p0 = Infinity;
    let p1 = -Infinity;
    let q0 = Infinity;
    let q1 = -Infinity;
    for (let i = 0; i < n * n; i++) {
      if (r[i] > 0) {
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const [px, py] = iso(((i % n) + dx) * cell, (Math.floor(i / n) + dy) * cell, 0);
          if (px < p0) p0 = px;
          if (px > p1) p1 = px;
          if (py < q0) q0 = py;
          if (py > q1) q1 = py;
        }
      }
      const a = clamp(r[i] / 0.4, 0, 1);
      d.data[i * 4] = GLINT[0];
      d.data[i * 4 + 1] = GLINT[1];
      d.data[i * 4 + 2] = GLINT[2];
      d.data[i * 4 + 3] = Math.round(255 * (a > 0 ? 0.25 + 0.75 * a : 0));
    }
    g.putImageData(d, 0, 0);
    hc.spotImg = { img, R: hc.spot.cell, bb: [p0 - 2, q0 - 2, p1 + 2, q1 + 2] };
    return hc.spotImg;
  }

  /** Day view: pale glint wash over the reflection spots, with a fine ink hatch. */
  drawSpots(g, hc, Z, ox, oy, bb) {
    const si = this.spotImage(hc);
    if (!si) return;
    const s0 = si.bb;
    if (bb && this.spotSkip !== false && (s0[2] < bb[0] || s0[0] > bb[2] || s0[3] < bb[1] || s0[1] > bb[3])) return; // no spot on this tile
    if (!this.spotScratch) {
      this.spotScratch = makeCanvas(TILE, TILE);
      this.hatchScratch = makeCanvas(TILE, TILE);
      const p = makeCanvas(8, 8);
      const pc = p.getContext('2d');
      pc.strokeStyle = rgbCss(INK);
      pc.lineWidth = 0.8;
      pc.beginPath();
      pc.moveTo(-1, 9);
      pc.lineTo(9, -1);
      pc.stroke();
      this.hatchTile = p;
    }
    const s = this.spotScratch.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.clearRect(0, 0, TILE, TILE);
    const R = si.R;
    s.setTransform(Z * ISO_C * R, Z * ISO_S * R, -Z * ISO_C * R, Z * ISO_S * R, ox, oy);
    s.imageSmoothingEnabled = true;
    s.imageSmoothingQuality = 'high';
    s.drawImage(si.img, 0, 0);
    const k = clamp(hc.sun.alt / 10, 0, 1);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.45 * k;
    g.drawImage(this.spotScratch, 0, 0);
    g.globalCompositeOperation = 'source-over';
    // ink hatch, clipped to the spot by its alpha
    const hz = this.hatchScratch.getContext('2d');
    hz.setTransform(1, 0, 0, 1, 0, 0);
    hz.globalCompositeOperation = 'source-over';
    hz.clearRect(0, 0, TILE, TILE);
    hz.fillStyle = hz.createPattern(this.hatchTile, 'repeat');
    hz.fillRect(0, 0, TILE, TILE);
    hz.globalCompositeOperation = 'destination-in';
    hz.drawImage(this.spotScratch, 0, 0);
    hz.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.4 * k;
    g.drawImage(this.hatchScratch, 0, 0);
    g.globalAlpha = 1;
  }

  // ---- display-list replay -------------------------------------------------------

  /** Resolve an item's fill colour for a mode; returns rgb array or null. */
  fillOf(it, mode, hc) {
    const f = it.f;
    if (!f) return null;
    if (mode === 'scaffold') return it.t === 'gm' || it.t === 'treeTick' ? null : PAPER;
    if (mode === 'thermal') {
      if (it.t === 'g' || it.t === 'gm') return null;
      if (it.t === 'slab') return scaleRgb(THERMAL_WALL, 0.85);
      if (it.t === 'r' || it.t === 'rd') return it.b >= 0 ? heatRgb(hc.roof[it.b]) : null;
      if (it.t === 'tree') return null;
      if (it.t === 'win') return null;
      const n = f.n ?? [0, 1];
      return scaleRgb(THERMAL_WALL, n[0] ? 0.9 : 1);
    }
    if (Array.isArray(f)) return f;
    if (f.k === 'wall') return scaleRgb(f.c, hc.light(f.n));
    if (f.k === 'glass') return scaleRgb(mixRgb(GLASS_RGB[this.glass] ?? GLASS_RGB.lowe, f.c, 0.15), hc.light(f.n) * 1.02);
    if (f.k === 'win') return f.c;
    return null;
  }

  replay(ctx, list, mode, hc, Z, ox, oy, bb, lwBase) {
    ctx.setTransform(Z, 0, 0, Z, ox, oy);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const inkCss = rgbCss(INK);
    for (let n = 0; n < list.length; n++) {
      const it = list[n];
      const b = it.bb;
      if (bb && (b[2] < bb[0] || b[0] > bb[2] || b[3] < bb[1] || b[1] > bb[3])) continue;
      const t = it.t;
      if (t === 'glint' && mode === 'thermal') continue;
      if (t === 'hatchS' || t === 'hatchE') {
        if (mode !== 'day') continue;
        const L = t === 'hatchS' ? hc.lightS : hc.lightE;
        if (!hc.up || L > 0.8) continue;
      }
      let alpha = it.a ?? 1;
      let strokeA = alpha;
      if (mode === 'thermal') {
        if (t === 'g' || t === 'gm' || t === 'treeTick') strokeA *= 0.28;
        else if (t === 'win') strokeA *= 0.22;
        else if (t === 'tree') strokeA *= 0.55;
        else strokeA *= 0.7;
      }
      if (mode === 'scaffold' && (t === 'gm' || t === 'treeTick')) strokeA *= 0.8;
      const fill = this.fillOf(it, mode, hc);
      if (fill && it.fp) {
        const p = it.fp;
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        for (let i = 2; i < p.length; i += 2) {
          // pen-up break between shapes of a multi-shape item (Pen.shapes, block 5)
          if (p[i] !== p[i]) {
            ctx.closePath();
            i += 2;
            ctx.moveTo(p[i], p[i + 1]);
          } else ctx.lineTo(p[i], p[i + 1]);
        }
        ctx.closePath();
        ctx.globalAlpha = mode === 'scaffold' ? 1 : alpha;
        ctx.fillStyle = rgbCss(fill);
        ctx.fill();
        // pigment pooling at the edge of washes (scene.pooling === false skips it: block 5, hundreds of small washes per tile)
        if (mode !== 'scaffold' && this.pool && (t === 'w' || t === 'r' || t === 'tree' || t === 'g')) {
          ctx.globalAlpha = 0.28 * alpha;
          ctx.strokeStyle = rgbCss(scaleRgb(fill, 0.8));
          ctx.lineWidth = (lwBase * 1.6) / Z;
          ctx.stroke();
        }
      }
      if (it.s && it.sp && it.sp.length) {
        const p = it.sp;
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i < p.length; i += 2) {
          const x = p[i];
          if (x !== x) {
            pen = false;
            continue;
          }
          if (pen) ctx.lineTo(x, p[i + 1]);
          else {
            ctx.moveTo(x, p[i + 1]);
            pen = true;
          }
        }
        ctx.globalAlpha = strokeA;
        ctx.strokeStyle = it.s === 1 ? inkCss : rgbCss(it.s);
        ctx.lineWidth = (lwBase * it.lw) / Z;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** Lit windows after dark (drawn above the night tint). */
  litWindows(ctx, list, hc, Z, ox, oy, bb) {
    ctx.setTransform(Z, 0, 0, Z, ox, oy);
    for (const it of list) {
      if (it.t !== 'win' || !it.f || it.f.k !== 'win') continue;
      const b = it.bb;
      if (bb && (b[2] < bb[0] || b[0] > bb[2] || b[3] < bb[1] || b[1] > bb[3])) continue;
      if (it.f.h > (it.f.shop ? 0.75 : 0.45)) continue;
      const p = it.fp;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) {
        if (p[i] !== p[i]) {
          ctx.closePath();
          i += 2;
          ctx.moveTo(p[i], p[i + 1]);
        } else ctx.lineTo(p[i], p[i + 1]);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.85 * hc.night;
      ctx.fillStyle = rgbCss(LIT);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  lineBase(z) {
    return this.dpr * 0.95 * Math.pow(z / 3, 0.55);
  }

  // ---- tiles ---------------------------------------------------------------

  tile(mode, z, hq, tx, ty) {
    const key = this.tileKey(mode, z, hq, tx, ty);
    let c = this.tiles.get(key);
    if (c) {
      this.tiles.delete(key);
      this.tiles.set(key, c);
      return c;
    }
    const Z = z * this.dpr;
    c = makeCanvas(TILE, TILE);
    const g = c.getContext('2d');
    const ox = -tx * TILE;
    const oy = -ty * TILE;
    const bb = [tx * TILE / Z - 2, ty * TILE / Z - 2, (tx + 1) * TILE / Z + 2, (ty + 1) * TILE / Z + 2];
    const hc = this.hourCtx(hq);
    const lw = this.lineBase(z);
    g.fillStyle = PAPER_CSS;
    g.fillRect(0, 0, TILE, TILE);
    const ground = this.items.slice(0, this.groundCount);
    const objects = this.items.slice(this.groundCount);
    if (mode === 'thermal') {
      const { img, R } = this.heatImage(hc);
      const S = this.world.size;
      // clip to the block so the wash does not run onto the margin
      g.save();
      g.setTransform(Z, 0, 0, Z, ox, oy);
      g.beginPath();
      const corners = [[0, 0], [S, 0], [S, S], [0, S]].map(([x, y]) => iso(x, y, 0));
      g.moveTo(...corners[0]);
      for (const q of corners.slice(1)) g.lineTo(...q);
      g.closePath();
      g.clip();
      g.setTransform(Z * ISO_C * R, Z * ISO_S * R, -Z * ISO_C * R, Z * ISO_S * R, ox, oy);
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0);
      g.restore();
      this.replay(g, ground, 'thermal', hc, Z, ox, oy, bb, lw);
      this.replay(g, objects, 'thermal', hc, Z, ox, oy, bb, lw);
    } else {
      this.replay(g, ground, 'day', hc, Z, ox, oy, bb, lw);
      if (hc.shadows.length) this.drawShadows(g, hc, Z, ox, oy, this.cullShadows ? bb : null);
      if (hc.spot) this.drawSpots(g, hc, Z, ox, oy, bb);
      this.replay(g, objects, 'day', hc, Z, ox, oy, bb, lw);
      if (hc.night > 0) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'multiply';
        g.globalAlpha = 0.6 * hc.night;
        g.fillStyle = rgbCss(NIGHT_RGB);
        g.fillRect(0, 0, TILE, TILE);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1;
        this.litWindows(g, objects, hc, Z, ox, oy, bb);
      }
    }
    // paper grain over everything (multiply), tile-aligned so seams vanish
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = g.createPattern(this.tex.grain, 'repeat');
    g.fillRect(0, 0, TILE, TILE);
    g.globalCompositeOperation = 'source-over';
    this.tiles.set(key, c);
    this.stats.tilesBaked++;
    this.evict();
    return c;
  }

  drawShadows(g, hc, Z, ox, oy, bb = null) {
    // union first (solid), then one translucent multiply so overlaps don't stack;
    // bb (block 5): polygons wholly off the tile (drawing-plane bounds with a margin) are skipped
    if (!this.shadowScratch) this.shadowScratch = makeCanvas(TILE, TILE);
    const s = this.shadowScratch.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.clearRect(0, 0, TILE, TILE);
    s.setTransform(Z, 0, 0, Z, ox, oy);
    s.fillStyle = '#000';
    s.beginPath();
    for (const p of hc.shadows) {
      const b = p.bb;
      if (bb && b && (b[2] < bb[0] || b[0] > bb[2] || b[3] < bb[1] || b[1] > bb[3])) continue;
      s.moveTo(p[0], p[1]);
      for (let i = 2; i < p.length; i += 2) s.lineTo(p[i], p[i + 1]);
      s.closePath();
    }
    s.fill('nonzero');
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-in';
    const strength = clamp(hc.sun.alt / 8, 0, 1);
    s.fillStyle = rgbCss(SHADOW_RGB);
    s.fillRect(0, 0, TILE, TILE);
    s.globalCompositeOperation = 'source-over';
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'multiply';
    g.globalAlpha = 0.42 * strength;
    g.drawImage(this.shadowScratch, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  /** Device-pixel origin of the drawing plane for a camera. */
  origin(cam, W, H) {
    const Z = cam.z * this.dpr;
    const p = iso(cam.cx, cam.cy, 0);
    return [Math.round(W / 2 - p[0] * Z), Math.round(H / 2 - p[1] * Z), Z];
  }

  /** Tile indices covering the viewport for a camera (in draw order). */
  visibleTiles(cam, W, H) {
    const [ox, oy, Z] = this.origin(cam, W, H);
    const S = this.world.size;
    // world extent on the drawing plane (with margin for tall buildings)
    const minX = -S * ISO_C * Z;
    const maxX = S * ISO_C * Z;
    const minY = -this.topMargin * ISO_Z * Z;
    const maxY = (S + 8) * Z;
    const tx0 = Math.floor(Math.max(minX, -ox) / TILE);
    const tx1 = Math.floor(Math.min(maxX, W - ox) / TILE);
    const ty0 = Math.floor(Math.max(minY, -oy) / TILE);
    const ty1 = Math.floor(Math.min(maxY, H - oy) / TILE);
    const out = [];
    const c = this.clip;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        if (c && (ox + (tx + 1) * TILE <= c[0] || ox + tx * TILE >= c[1])) continue; // outside the split band
        out.push([tx, ty]);
      }
    }
    // Tile cache cap: a 512 px tile is 1 MB, so this is about 9 hours of the
    // visible view, but never more than 160 MB (36 MB floor for tiny views).
    // On large HiDPI views 9 hours do not fit; the scrub preview then relies
    // on pinning (see evict) rather than on the cap.
    this.maxTiles = clamp(out.length * 9, 36, 160);
    return { ox, oy, tiles: out };
  }

  /** True if a tile key belongs to a (zoom, hour, DPR) the scrub preview pinned. */
  pinned(key) {
    const [mode, z, hq, , , dpr] = key.split('|');
    const set = this.pins[mode];
    return !!set && set.has(`${z}|${hq}|${dpr}`);
  }

  pinSet(z, hours) {
    return new Set(hours.filter((h) => h !== undefined).map((h) => `${z}|${h}|${this.dpr}`));
  }

  /** Scrub over: unpin and shrink the cache back to its cap. */
  endScrub() {
    this.pending = {};
    this.shown = {};
    this.pins = {};
    this.evict();
  }

  /**
   * Drop least recently used tiles down to the cap, skipping pinned ones: the
   * scrub preview's pending and shown hours stay cached even when they alone
   * exceed the cap, so a preview always finishes (bounded by 4 hours x modes
   * of visible tiles: pending, target and the two shown hours). Pins match
   * zoom and DPR, so tiles of other zooms can still be evicted.
   */
  evict() {
    if (this.tiles.size <= this.maxTiles) return;
    for (const k of this.tiles.keys()) {
      if (this.tiles.size <= this.maxTiles) break;
      if (!this.pinned(k)) this.tiles.delete(k);
    }
  }

  tileKey(mode, z, hq, tx, ty) {
    return `${mode}|${z}|${hq}|${tx}|${ty}|${this.dpr}`;
  }

  /** True if every visible tile of (mode, hour) is already baked. */
  baked(mode, z, hq, tiles) {
    for (const [tx, ty] of tiles) if (!this.tiles.has(this.tileKey(mode, z, hq, tx, ty))) return false;
    return true;
  }

  /**
   * Bake up to `n` missing visible tiles of (mode, hour); a new heat image
   * counts as one tile. Returns how many units were spent. Used for the
   * scrub preview and for idle-time pre-baking; never changes what an exact
   * frame looks like, only how soon its tiles are ready.
   */
  bakeSome(mode, cam, hq, W, H, n) {
    const { tiles } = this.visibleTiles(cam, W, H);
    let spent = 0;
    if (mode === 'thermal') {
      const hc = this.hourCtx(hq);
      if (!hc.heatImg && spent < n) {
        this.heatImage(hc);
        spent++;
      }
    }
    for (const [tx, ty] of tiles) {
      if (spent >= n) break;
      if (this.tiles.has(this.tileKey(mode, cam.z, hq, tx, ty))) continue;
      this.tile(mode, cam.z, hq, tx, ty);
      spent++;
    }
    return spent;
  }

  drawTiles(ctx, mode, cam, hq, W, H, alpha = 1) {
    const { ox, oy, tiles } = this.visibleTiles(cam, W, H);
    if (this.scrub) {
      const shown = this.previewHours(mode, cam, hq, W, H, tiles);
      if (shown) {
        const [h0, h1, w] = shown;
        this.stats.preview = true;
        this.blit(ctx, mode, cam.z, h0, tiles, ox, oy, alpha);
        if (w > 0) this.blit(ctx, mode, cam.z, h1, tiles, ox, oy, alpha * w);
        return;
      }
    }
    this.blit(ctx, mode, cam.z, hq, tiles, ox, oy, alpha);
  }

  blit(ctx, mode, z, hq, tiles, ox, oy, alpha) {
    ctx.globalAlpha = alpha;
    for (const [tx, ty] of tiles) ctx.drawImage(this.tile(mode, z, hq, tx, ty), ox + tx * TILE, oy + ty * TILE);
    ctx.globalAlpha = 1;
  }

  /**
   * Scrub preview (slider drag): spend this frame's small bake budget on a
   * "pending" keyframe hour near the target, and show the nearest fully baked
   * hours around the target, cross-faded by distance. Returns null when the
   * target itself is baked (the frame is then exact) or nothing is baked.
   * Preview frames depend on what happens to be cached (earlier drags, idle
   * pre-baking), so they are not deterministic; they exist only while
   * scrubbing. seek(), ?f=N and the settled frame after release always take
   * the exact path and are deterministic.
   */
  previewHours(mode, cam, hq, W, H, tiles) {
    const z = cam.z;
    const steps = Math.round(24 / HOUR_STEP);
    const wrap = (h) => ((h % 24) + 24) % 24;
    const dist = (a, b) => {
      const d = Math.abs(wrap(a) - wrap(b));
      return Math.min(d, 24 - d);
    };
    if (!this.baked(mode, z, hq, tiles)) {
      let p = this.pending[mode];
      if (p === undefined || dist(p, hq) > 1 || this.baked(mode, z, p, tiles)) p = hq;
      this.pending[mode] = p;
      // keep what is on screen and what is being baked
      this.pins[mode] = this.pinSet(z, [p, hq, ...(this.shown[mode] ?? [])]);
      this.budget -= this.bakeSome(mode, cam, p, W, H, Math.max(0, this.budget));
    }
    if (this.baked(mode, z, hq, tiles)) return null;
    // nearest baked hour before and after the target
    let lo = null;
    let hi = null;
    for (let k = 1; k < steps && (lo === null || hi === null); k++) {
      if (lo === null && this.baked(mode, z, quantHour(hq - k * HOUR_STEP), tiles)) lo = k;
      if (hi === null && this.baked(mode, z, quantHour(hq + k * HOUR_STEP), tiles)) hi = k;
    }
    if (lo === null) return null; // nothing baked: fall back to an exact bake
    const h0 = quantHour(hq - lo * HOUR_STEP);
    const h1 = quantHour(hq + hi * HOUR_STEP);
    let out = [h0, h1, lo / (lo + hi)];
    if (h0 === h1 || lo + hi > 4 / HOUR_STEP) out = lo <= hi ? [h0, h0, 0] : [h1, h1, 0];
    this.shown[mode] = [out[0], out[1]];
    this.pins[mode] = this.pinSet(z, [this.pending[mode], hq, out[0], out[1]]);
    return out;
  }

  // ---- frame -----------------------------------------------------------------

  /**
   * Draw one frame. look: {hour, thermalMix (0..1), notes: [...], intro: bool,
   * scrub: bool}. With scrub set (slider drag) missing tiles are baked a few
   * per frame and stats.preview tells whether the frame is still a preview.
   */
  frame(f, cam, look) {
    const t0 = performance.now();
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const hq = quantHour(look.hour);
    const [ox, oy] = this.origin(cam, W, H);
    // scrub preview: at most PREVIEW_BUDGET tile bakes per frame (a tile count,
    // not a clock; what a preview frame shows still depends on the cache)
    this.scrub = !!look.scrub;
    this.budget = this.scrub ? (look.budget ?? PREVIEW_BUDGET) : Infinity;
    this.clip = look.clip ?? null;
    if (!this.scrub && (Object.keys(this.pins).length || Object.keys(this.pending).length)) this.endScrub();
    this.stats.preview = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (this.clip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.clip[0], 0, this.clip[1] - this.clip[0], H);
      ctx.clip();
    }
    const pat = ctx.createPattern(this.tex.paper, 'repeat');
    pat.setTransform(new DOMMatrix([1, 0, 0, 1, ((ox % 256) + 256) % 256, ((oy % 256) + 256) % 256]));
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);

    const intro = look.intro !== false;
    let lifeA = 1;
    if (intro && f < INTRO.pen) {
      this.drawScaffold(ctx, cam, W, H, Math.floor(this.items.length * smooth(f / INTRO.pen)), hq);
      lifeA = 0;
    } else if (intro && f < INTRO.wash) {
      this.drawScaffold(ctx, cam, W, H, this.items.length, hq);
      this.drawBloom(ctx, cam, hq, W, H, (f - INTRO.pen) / (INTRO.wash - INTRO.pen));
      lifeA = 0;
    } else {
      const m = look.thermalMix ?? 0;
      if (m < 1) this.drawTiles(ctx, 'day', cam, hq, W, H, 1);
      if (m > 0) this.drawTiles(ctx, 'thermal', cam, hq, W, H, m >= 1 ? 1 : smooth(m));
      if (intro) lifeA = clamp((f - INTRO.wash) / (INTRO.life - INTRO.wash), 0, 1);
    }
    this.stats.people = 0;
    this.stats.ac = false;
    this.stats.sweating = 0;
    this.stats.sweatGlyphPx = 0;
    this.noteHits = [];
    this.stats.windDashes = 0;
    this.stats.airSegs = 0;
    if (lifeA > 0) {
      if (this.wind && (look.wind || look.air)) this.drawWind(ctx, f, cam, W, H, lifeA, look, hq);
      if (look.ac) this.drawAc(ctx, f, cam, W, H, lifeA);
      if (look.people !== false) this.drawPeople(ctx, f, cam, hq, W, H, lifeA, look.thermalMix ?? 0);
      if (look.notes) this.drawNotes(ctx, cam, W, H, look.notes, lifeA);
    }
    if (this.clip) ctx.restore();
    this.stats.lifeA = lifeA;
    this.stats.phase = intro && f < INTRO.pen ? 'pen' : intro && f < INTRO.wash ? 'wash' : intro && f < INTRO.life ? 'life' : 'steady';
    this.stats.frameMs = performance.now() - t0;
    return this.stats;
  }

  drawScaffold(ctx, cam, W, H, k, hq) {
    const key = `${cam.z}|${cam.cx}|${cam.cy}|${W}|${H}|${this.dpr}`;
    if (!this.scaffold || this.scaffold.key !== key || this.scaffold.k > k) {
      const c = makeCanvas(W, H);
      this.scaffold = { key, k: 0, c };
    }
    const S = this.scaffold;
    if (k > S.k) {
      const [ox, oy, Z] = this.origin(cam, W, H);
      const g = S.c.getContext('2d');
      const bb = [-ox / Z - 2, -oy / Z - 2, (W - ox) / Z + 2, (H - oy) / Z + 2];
      this.replay(g, this.items.slice(S.k, k), 'scaffold', this.hourCtx(hq), Z, ox, oy, bb, this.lineBase(cam.z));
      S.k = k;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(S.c, 0, 0);
  }

  /** Colour blooms in like wet paint spreading outward from the park. */
  drawBloom(ctx, cam, hq, W, H, p) {
    if (!this.bloom || this.bloom.c.width !== W || this.bloom.c.height !== H) {
      this.bloom = { c: makeCanvas(W, H), m: makeCanvas(Math.ceil(W / 8), Math.ceil(H / 8)) };
    }
    const { c, m } = this.bloom;
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    this.drawTiles(g, 'day', cam, hq, W, H, 1);
    const mg = m.getContext('2d');
    const md = mg.createImageData(m.width, m.height);
    const cx = m.width * 0.5;
    const cy = m.height * 0.55;
    const R = Math.hypot(m.width, m.height) * 0.55;
    const front = smooth(p) * 1.35;
    for (let y = 0; y < m.height; y++) {
      for (let x = 0; x < m.width; x++) {
        const d = Math.hypot(x - cx, y - cy) / R + 0.3 * noise2(x / 9, y / 9, 71);
        const a = clamp((front - d) * 6, 0, 1);
        md.data[(y * m.width + x) * 4 + 3] = a * 255;
      }
    }
    mg.putImageData(md, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.imageSmoothingEnabled = true;
    g.drawImage(m, 0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
  }

  /** True if the person's hip at (x, y) is hidden behind a building (block 5: or under a pergola or awning). */
  hidden(x, y) {
    for (const B of this.world.buildings) {
      const dIn = Math.max(B.x0 - x, B.y0 - y, 0);
      const dOut = Math.min(B.x1 - x, B.y1 - y);
      if (dOut <= dIn) continue;
      const top = B.h + (B.gable ? 2 : 0);
      if (top > 0.9 + dIn / ISO_Z) return true;
    }
    if (this.world.screens) {
      // a flat top at z hides the hip if the line of sight passes through it inside its footprint
      for (const P of this.world.screens) {
        const dIn = Math.max(P.x0 - x, P.y0 - y, 0);
        const dOut = Math.min(P.x1 - x, P.y1 - y);
        if (dOut > dIn && 0.9 + dIn / ISO_Z <= P.z && 0.9 + dOut / ISO_Z >= P.z - 0.1) return true;
      }
    }
    return false;
  }

  /** Tmrt and sunlit share at a person's 5 m cell, cached per quantised hour. */
  heatAt(x, y, hq) {
    if (!this.tmrtCache || this.tmrtCache.hq !== hq) {
      this.tmrtCache = { hq, t: new Float32Array(this.world.n * this.world.n).fill(NaN) };
    }
    const i = this.world.cellIndex(x, y);
    const c = this.tmrtCache.t;
    if (c[i] !== c[i]) c[i] = this.thermal.tmrt(i, hq);
    return { tmrt: c[i], sunlit: this.thermal.sunlit(i, hq) };
  }

  /**
   * Sweat cue: hot cell (Tmrt) and the person in sun on the fine shade raster.
   * In a glass block a reflection spot counts as lit, so the cue follows Tmrt
   * there too (class 3: spot in shade, class 4: spot in sun).
   */
  sweatAt(a, t, hq) {
    const h = this.heatAt(a.x, a.y, hq);
    const sh = this.life.plan(hq).shade;
    const c = sh.night ? -1 : shadeAt(sh, a.x, a.y);
    const lit = c === 0 || c === 4 ? h.sunlit : c === 3 ? 1 : 0;
    return sweatState(a.k, t, h.tmrt, lit);
  }

  /**
   * AC overlay (block 3, information only): rooftop plant on each tall
   * building with a rising heat plume, and one label saying the model does not
   * feel this heat. Pure function of (frame, camera).
   */
  drawAc(ctx, f, cam, W, H, alpha) {
    const [ox, oy, Z] = this.origin(cam, W, H);
    const d = this.dpr;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = 'round';
    let label = null;
    for (const B of this.world.buildings) {
      if (B.h < 25) continue;
      const units = 1 + Math.floor(((B.x1 - B.x0) * (B.y1 - B.y0)) / 2500);
      for (let u = 0; u < Math.min(3, units); u++) {
        const x = B.x0 + (B.x1 - B.x0) * (0.25 + 0.5 * hash3(B.index, u, 61));
        const y = B.y0 + (B.y1 - B.y0) * (0.25 + 0.5 * hash3(B.index, u, 62));
        const p = iso(x, y, B.h + 1.5);
        const X = ox + p[0] * Z;
        const Y = oy + p[1] * Z;
        if (X < -40 || X > W + 40 || Y < -80 || Y > H + 40) continue;
        if (this.clip && (X < this.clip[0] || X > this.clip[1])) continue;
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
    this.stats.ac = !!label;
  }

  /**
   * Block 4: the water's illustrative air overlay (a soft band along each wind
   * line, cool by day, warm at night, strength |dTa|) and the pen-drawn wind
   * lines with moving dashes (spacing and speed proportional to u_i), each
   * with a label saying what it is. Vertices hidden behind buildings are
   * skipped. Pure function of (frame, camera, look).
   */
  drawWind(ctx, f, cam, W, H, alpha, look, hq) {
    const [ox, oy, Z] = this.origin(cam, W, H);
    const d = this.dpr;
    const { lines, items } = this.wind;
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
      const wd = dayWeight(this.hourCtx(hq).sun.alt);
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
          this.stats.airSegs += P.length / 2;
        }
      }
      labels.push([wd > 0.5 ? AIR_COOL : AIR_WARM, `Air effect of the water: illustrative, from literature, not simulated (${wd > 0.5 ? 'cooler' : wd < 0.5 ? 'warmer' : 'cooler / warmer'})`]);
    }
    if (look.wind) {
      ctx.strokeStyle = rgbCss(WIND_INK);
      ctx.fillStyle = rgbCss(WIND_INK);
      ctx.lineWidth = Math.max(1.6 * d, this.lineBase(cam.z) * 1.9);
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
      this.stats.windDashes = dashes;
      labels.unshift([WIND_INK, `Wind lines: assumed direction × shelter factor, not computed flow · ${u} m/s from the river`]);
    }
    // labels, bottom centre above the hour bar
    ctx.globalAlpha = alpha;
    ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
    ctx.textBaseline = 'bottom';
    labels.forEach(([c, text], k) => {
      const w = ctx.measureText(text).width;
      const bx = clamp(W / 2 - w / 2, 8 * d, W - w - 8 * d);
      const by = H - (84 + (labels.length - 1 - k) * 26) * d;
      ctx.fillStyle = 'rgba(248,243,231,0.94)';
      ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
      ctx.strokeStyle = rgbCss(c, 0.7);
      ctx.lineWidth = 0.9 * d;
      ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
      ctx.fillStyle = rgbCss(c);
      ctx.fillText(text, bx, by);
    });
    ctx.restore();
    this.stats.windLabels = labels.map((l) => l[1]);
  }

  /**
   * Cartoon sweat cue: an arc of 2-3 teardrops flying off the head plus a short
   * heat-shimmer stroke. Glyphs have a pixel floor (>= 9 px tall at DPR 1) so
   * the cue reads at the default overview; ink outline, pale-blue wash, white
   * highlight, same ink as the rest of the drawing.
   */
  drawSweat(ctx, X, hy, hr, sw, alpha, f) {
    const dp = this.dpr;
    const Hd = Math.max(9 * dp, hr * 1.6) * (0.9 + 0.2 * sw.s);
    const r = Hd * 0.3;
    this.stats.sweatGlyphPx = Math.max(this.stats.sweatGlyphPx || 0, Hd / dp);
    ctx.save();
    ctx.lineWidth = Math.max(0.9 * dp, hr * 0.12);
    ctx.strokeStyle = rgbCss(INK);
    for (const d of sw.drops) {
      const dist = hr * 1.3 + Hd * (0.5 + 1.0 * d.fall);
      const x = X + Math.sin(d.ang) * dist;
      const y = hy - Math.cos(d.ang) * dist + d.fall * d.fall * Hd * 0.6; // arcs over, then drops
      ctx.globalAlpha = alpha * d.alpha;
      ctx.setTransform(1, 0, 0, 1, x, y);
      ctx.rotate(d.ang + Math.PI); // tip points back toward the head
      ctx.beginPath();
      ctx.moveTo(0, -Hd * 0.5);
      ctx.bezierCurveTo(r * 0.9, -Hd * 0.15, r * 1.05, Hd * 0.2, 0, Hd * 0.5);
      ctx.bezierCurveTo(-r * 1.05, Hd * 0.2, -r * 0.9, -Hd * 0.15, 0, -Hd * 0.5);
      ctx.fillStyle = SWEAT_CSS;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, Hd * 0.12, r * 0.28, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sw.s >= 0.4) {
      // heat shimmer: two short wavy ink strokes above the head
      const w = Hd * 0.9;
      ctx.globalAlpha = alpha * 0.5 * sw.drops[0].alpha;
      ctx.lineWidth = Math.max(0.8 * dp, hr * 0.1);
      for (let k = 0; k < 2; k++) {
        const y0 = hy - hr - Hd * (0.55 + 0.35 * k);
        ctx.beginPath();
        for (let i = 0; i <= 12; i++) {
          const u = i / 12;
          const xx = X - w / 2 + u * w;
          const yy = y0 + Math.sin(u * Math.PI * 3 + f * 0.25 + k * 2) * 1.3 * dp;
          if (i) ctx.lineTo(xx, yy);
          else ctx.moveTo(xx, yy);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawPeople(ctx, f, cam, hq, W, H, alpha, thermalMix) {
    const agents = this.life.at(f / 60, hq);
    const [ox, oy, Z] = this.origin(cam, W, H);
    agents.sort((a, b) => a.x + a.y - (b.x + b.y));
    const hc = this.hourCtx(hq);
    const sh = hc.up ? [-Math.sin(hc.sun.az * DEG), Math.cos(hc.sun.az * DEG)] : null;
    const shLen = hc.up ? Math.min(4, 1.7 / Math.tan(Math.max(8, hc.sun.alt) * DEG)) : 0;
    // people drawn a little larger than life, with a floor so they (and the
    // sweat cue) stay legible at the default overview zoom
    const s = Math.max(Z * 1.25, 5.5 * this.dpr);
    const lw = Math.max(0.8, this.lineBase(cam.z) * 0.8);
    const ink = rgbCss(INK);
    let count = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.lineCap = 'round';
    for (const a of agents) {
      const p = iso(a.x, a.y, 0);
      const X = ox + p[0] * Z;
      const Y = oy + p[1] * Z;
      if (X < -20 || Y < -20 || X > W + 20 || Y > H + 40) continue;
      if (this.clip && (X < this.clip[0] - 30 || X > this.clip[1] + 30)) continue;
      if (this.hidden(a.x, a.y)) continue;
      count++;
      ctx.globalAlpha = alpha;
      if (sh) {
        const q = iso(a.x + sh[0] * shLen * 0.5, a.y + sh[1] * shLen * 0.5, 0);
        ctx.fillStyle = 'rgba(60,70,95,0.22)';
        ctx.beginPath();
        ctx.ellipse(ox + q[0] * Z, oy + q[1] * Z, Math.max(1.2, shLen * 0.45 * s * 0.6), Math.max(0.8, 0.22 * s), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const sit = a.sit;
      const bob = sit ? Math.sin(f / 50 + a.bob * 6) * 0.03 : 0;
      const hip = sit ? 0.5 : 0.92;
      const swing = sit ? 0 : Math.sin(a.walk * Math.PI) * 0.28;
      const hp = iso(a.hx * swing, a.hy * swing, 0);
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(X, Y - hip * s);
      ctx.lineTo(X + hp[0] * s, Y + hp[1] * s);
      ctx.moveTo(X, Y - hip * s);
      ctx.lineTo(X - hp[0] * s, Y - hp[1] * s);
      ctx.stroke();
      const shirt = thermalMix > 0.5 ? mixRgb(a.shirt, PAPER, 0.35) : a.shirt;
      const bw = 0.27 * s;
      const top = Y - (1.5 + bob) * s;
      const bot = Y - (hip - 0.05) * s;
      ctx.fillStyle = rgbCss(shirt);
      ctx.beginPath();
      ctx.moveTo(X - bw, bot);
      ctx.lineTo(X - bw * 1.05, top + bw * 0.6);
      ctx.quadraticCurveTo(X, top - bw * 0.3, X + bw * 1.05, top + bw * 0.6);
      ctx.lineTo(X + bw, bot);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const hr = Math.max(1.6 * this.dpr, 0.19 * s);
      const hy = top - 0.2 * s;
      const sw = hc.up ? this.sweatAt(a, f / 60, hq) : null;
      if (sw && sw.fan) {
        // hand to brow
        ctx.beginPath();
        ctx.moveTo(X + bw * 0.9, top + bw * 0.7);
        ctx.lineTo(X + hr * 1.5, hy - hr * 0.1);
        ctx.lineTo(X + hr * 0.6, hy - hr * 0.55);
        ctx.stroke();
      }
      ctx.fillStyle = rgbCss(hash3(a.k, 11) < 0.5 ? hexRgb('#e2b894') : hexRgb('#9c6b4e'));
      ctx.beginPath();
      ctx.arc(X, hy, hr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (sw && sw.drops.length) {
        this.stats.sweating++;
        this.drawSweat(ctx, X, hy, hr, sw, alpha, f);
      }
    }
    ctx.globalAlpha = 1;
    this.stats.people = count;
  }

  drawNotes(ctx, cam, W, H, notes, alpha) {
    this.noteHits = [];
    const [ox, oy, Z] = this.origin(cam, W, H);
    const d = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `${Math.round(15 * d)}px "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive`;
    ctx.textBaseline = 'top';
    notes.forEach((n, i) => {
      const p = iso(n.at[0], n.at[1], n.at[2] ?? 0);
      const ax = ox + p[0] * Z;
      const ay = oy + p[1] * Z;
      const tx = ax + n.dx * d;
      const ty = ay + n.dy * d;
      if (tx < -200 * d || tx > W + 50 || ty < -60 || ty > H + 20) return;
      ctx.globalAlpha = alpha;
      // leader: a gently bowed ink line with a dot at the anchor
      ctx.strokeStyle = rgbCss(INK);
      ctx.lineWidth = 1.1 * d;
      ctx.beginPath();
      const mx = (ax + tx) / 2 + (ty - ay) * 0.12;
      const my = (ay + ty) / 2 - (tx - ax) * 0.12;
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(mx, my, ax, ay);
      ctx.stroke();
      ctx.fillStyle = rgbCss(INK);
      ctx.beginPath();
      ctx.arc(ax, ay, 2.2 * d, 0, Math.PI * 2);
      ctx.fill();
      const lines = n.text;
      const lh = 18 * d;
      const w = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const bx = tx - (n.dx < 0 ? w + 6 * d : -6 * d);
      const by = ty - (n.dy < 0 ? lines.length * lh : 0);
      ctx.fillStyle = 'rgba(248,243,231,0.94)';
      ctx.fillRect(bx - 5 * d, by - 3 * d, w + 10 * d, lines.length * lh + 6 * d);
      ctx.strokeStyle = 'rgba(43,38,33,0.55)';
      ctx.lineWidth = 0.8 * d;
      ctx.strokeRect(bx - 5 * d, by - 3 * d, w + 10 * d, lines.length * lh + 6 * d);
      ctx.fillStyle = rgbCss(i === 0 ? hexRgb('#8a2f22') : INK);
      lines.forEach((l, k) => ctx.fillText(l, bx, by + k * lh));
      // glossary terms: dotted underline + hit box (CSS px) for the footnotes
      for (const [key, sub] of n.terms ?? []) {
        const k = lines.findIndex((l) => l.includes(sub));
        if (k < 0) continue;
        const x0 = bx + ctx.measureText(lines[k].slice(0, lines[k].indexOf(sub))).width;
        const w = ctx.measureText(sub).width;
        const y = by + k * lh + 16 * d;
        ctx.save();
        ctx.setLineDash([1.5 * d, 2 * d]);
        ctx.lineWidth = 1 * d;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + w, y);
        ctx.stroke();
        ctx.restore();
        this.noteHits.push({ key, x: x0 / d, y: y / d, w: w / d, h: lh / d });
      }
    });
    ctx.globalAlpha = 1;
  }
}

