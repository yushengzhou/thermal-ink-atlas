// render: replays the display list into per-tile bakes (keyed by mode, zoom,
// quantised hour and tile index), composites cast shadows, the watercolour
// heat wash and the live layer (people, margin notes). Every pixel is a pure
// function of (frame, camera, look); caches only skip repeated work.
import { iso, hash3, noise2, clamp, smooth, rgbCss, mixRgb, scaleRgb, hexRgb, PAPER, INK, ISO_C, ISO_S, ISO_Z, DEG } from './core.js';
import { shadowPolys, heatRgb } from './thermal.js';

export const TILE = 512;
export const HOUR_STEP = 0.25;
export const INTRO = { pen: 150, wash: 240, life: 300 };
export const quantHour = (h) => (Math.round((((h % 24) + 24) % 24) / HOUR_STEP) * HOUR_STEP) % 24;

const PAPER_CSS = rgbCss(PAPER);
const SHADOW_RGB = hexRgb('#4b5a78');
const THERMAL_WALL = hexRgb('#e7dfcd');
const NIGHT_RGB = hexRgb('#27355a');
const LIT = hexRgb('#f4cf7a');

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
    this.stats = { people: 0, tilesBaked: 0, frameMs: 0 };
    this.dpr = 1;
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
      for (let i = 0; i < p.length; i += 2) {
        const q = iso(p[i], p[i + 1], 0);
        out[i] = q[0];
        out[i + 1] = q[1];
      }
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
        for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
        ctx.closePath();
        ctx.globalAlpha = mode === 'scaffold' ? 1 : alpha;
        ctx.fillStyle = rgbCss(fill);
        ctx.fill();
        // pigment pooling at the edge of washes
        if (mode !== 'scaffold' && (t === 'w' || t === 'r' || t === 'tree' || t === 'g')) {
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
      for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
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
    const key = `${mode}|${z}|${hq}|${tx}|${ty}|${this.dpr}`;
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
      if (hc.shadows.length) this.drawShadows(g, hc, Z, ox, oy);
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
    while (this.tiles.size > 72) this.tiles.delete(this.tiles.keys().next().value);
    return c;
  }

  drawShadows(g, hc, Z, ox, oy) {
    // union first (solid), then one translucent multiply so overlaps don't stack
    if (!this.shadowScratch) this.shadowScratch = makeCanvas(TILE, TILE);
    const s = this.shadowScratch.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.clearRect(0, 0, TILE, TILE);
    s.setTransform(Z, 0, 0, Z, ox, oy);
    s.fillStyle = '#000';
    s.beginPath();
    for (const p of hc.shadows) {
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

  drawTiles(ctx, mode, cam, hq, W, H, alpha = 1) {
    const [ox, oy, Z] = this.origin(cam, W, H);
    const S = this.world.size;
    // world extent on the drawing plane (with margin for tall buildings)
    const minX = -S * ISO_C * Z;
    const maxX = S * ISO_C * Z;
    const minY = -40 * ISO_Z * Z;
    const maxY = (S + 8) * Z;
    const tx0 = Math.floor(Math.max(minX, -ox) / TILE);
    const tx1 = Math.floor(Math.min(maxX, W - ox) / TILE);
    const ty0 = Math.floor(Math.max(minY, -oy) / TILE);
    const ty1 = Math.floor(Math.min(maxY, H - oy) / TILE);
    ctx.globalAlpha = alpha;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        ctx.drawImage(this.tile(mode, cam.z, hq, tx, ty), ox + tx * TILE, oy + ty * TILE);
      }
    }
    ctx.globalAlpha = 1;
  }

  // ---- frame -----------------------------------------------------------------

  /**
   * Draw one frame. look: {hour, thermalMix (0..1), notes: [...], intro: bool}
   */
  frame(f, cam, look) {
    const t0 = performance.now();
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const hq = quantHour(look.hour);
    const [ox, oy] = this.origin(cam, W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
    this.noteHits = [];
    if (lifeA > 0) {
      if (look.people !== false) this.drawPeople(ctx, f, cam, hq, W, H, lifeA, look.thermalMix ?? 0);
      if (look.notes) this.drawNotes(ctx, cam, W, H, look.notes, lifeA);
    }
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

  /** True if the person's hip at (x, y) is hidden behind a building. */
  hidden(x, y) {
    for (const B of this.world.buildings) {
      const dIn = Math.max(B.x0 - x, B.y0 - y, 0);
      const dOut = Math.min(B.x1 - x, B.y1 - y);
      if (dOut <= dIn) continue;
      const top = B.h + (B.gable ? 2 : 0);
      if (top > 0.9 + dIn / ISO_Z) return true;
    }
    return false;
  }

  drawPeople(ctx, f, cam, hq, W, H, alpha, thermalMix) {
    const agents = this.life.at(f / 60, hq);
    const [ox, oy, Z] = this.origin(cam, W, H);
    agents.sort((a, b) => a.x + a.y - (b.x + b.y));
    const hc = this.hourCtx(hq);
    const sh = hc.up ? [-Math.sin(hc.sun.az * DEG), Math.cos(hc.sun.az * DEG)] : null;
    const shLen = hc.up ? Math.min(4, 1.7 / Math.tan(Math.max(8, hc.sun.alt) * DEG)) : 0;
    const s = Z * 1.25; // people drawn a little larger than life for legibility
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
      ctx.fillStyle = rgbCss(hash3(a.k, 11) < 0.5 ? hexRgb('#e2b894') : hexRgb('#9c6b4e'));
      ctx.beginPath();
      ctx.arc(X, top - 0.2 * s, Math.max(1, 0.19 * s), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
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

