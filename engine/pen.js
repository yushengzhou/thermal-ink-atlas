// pen: a display-list recorder. Kit functions call the pen with world
// coordinates; the pen projects them, adds a hand-drawn wobble and corner
// overshoot (seeded by the item's sequence number, never by Math.random) and
// stores plain arrays that render.js can replay at any zoom.
import { iso, hash3, noise1 } from './core.js';

const SEG = 2.2; // wobble sample spacing (projected metres)

export class Pen {
  constructor(seed = 1) {
    this.seed = seed;
    this.items = [];
    this.tag = 'g'; // current tag (see render.js paint rules)
    this.b = -1; // current building index
    this.layer = 0; // 0 ground, 1 objects
    this.group = 0; // depth group (objects)
    this.amp = 0.11; // wobble amplitude
  }

  _k() {
    return this.items.length * 7919 + this.seed;
  }

  /** Wobbly stroke from a to b (projected points) appended to out. */
  _edge(out, ax, ay, bx, by, k, over = 1) {
    const dx = bx - ax;
    const dy = by - ay;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return;
    const ux = dx / L;
    const uy = dy / L;
    const o0 = (0.1 + 0.45 * hash3(k, 1)) * over * Math.min(1, L / 2);
    const o1 = (0.1 + 0.45 * hash3(k, 2)) * over * Math.min(1, L / 2);
    const sx = ax - ux * o0;
    const sy = ay - uy * o0;
    const ex = bx + ux * o1;
    const ey = by + uy * o1;
    const LL = L + o0 + o1;
    const n = Math.max(1, Math.ceil(LL / SEG));
    const amp = this.amp * Math.min(1, L / 3);
    if (out.length) out.push(NaN, NaN);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const w = i === 0 || i === n ? 0.3 : 1;
      const off = amp * w * noise1(t * (LL / 5) + (k % 97) * 3.1, k);
      out.push(sx + (ex - sx) * t - uy * off, sy + (ey - sy) * t + ux * off);
    }
  }

  _push(it, pts) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] !== pts[i]) continue;
      if (pts[i] < x0) x0 = pts[i];
      if (pts[i] > x1) x1 = pts[i];
      if (pts[i + 1] < y0) y0 = pts[i + 1];
      if (pts[i + 1] > y1) y1 = pts[i + 1];
    }
    it.bb = [x0 - 1, y0 - 1, x1 + 1, y1 + 1];
    it.t = it.t ?? this.tag;
    it.b = this.b;
    it.layer = this.layer;
    it.group = this.group;
    it.seq = this.items.length;
    this.items.push(it);
    return it;
  }

  /**
   * Closed shape from world points [[x,y,z],...].
   * opts: {stroke:rgb|null, lw, edges: bool[] which edges to ink, t, over}
   */
  shape(wpts, fill, opts = {}) {
    const p = wpts.map((q) => iso(q[0], q[1], q[2] ?? 0));
    return this.shapeP(p, fill, opts);
  }

  /** Closed shape from projected points [[px,py],...]. */
  shapeP(p, fill, opts = {}) {
    const k = this._k();
    const fp = new Float32Array(p.length * 2);
    p.forEach((q, i) => {
      fp[i * 2] = q[0];
      fp[i * 2 + 1] = q[1];
    });
    const sp = [];
    if (opts.stroke !== null) {
      for (let i = 0; i < p.length; i++) {
        if (opts.edges && !opts.edges[i]) continue;
        const a = p[i];
        const b = p[(i + 1) % p.length];
        this._edge(sp, a[0], a[1], b[0], b[1], k + i * 31, opts.over ?? 1);
      }
    }
    const it = {
      f: fill,
      s: opts.stroke === null ? null : opts.stroke ?? 1,
      lw: opts.lw ?? 1,
      fp,
      sp: new Float32Array(sp),
      t: opts.t,
      a: opts.a,
    };
    return this._push(it, sp.length ? sp.concat(Array.from(fp)) : Array.from(fp));
  }

  /**
   * Several closed shapes with one fill as one item (block 5: the window
   * panes of a façade): polys is [[[x,y,z],...], ...]; the fill path and the
   * ink keep pen-up breaks (NaN) between the shapes.
   */
  shapes(polys, fill, opts = {}) {
    const k = this._k();
    const fp = [];
    const sp = [];
    polys.forEach((wpts, n) => {
      const p = wpts.map((q) => iso(q[0], q[1], q[2] ?? 0));
      if (fp.length) fp.push(NaN, NaN);
      for (const q of p) fp.push(q[0], q[1]);
      if (opts.stroke !== null) for (let i = 0; i < p.length; i++) this._edge(sp, p[i][0], p[i][1], p[(i + 1) % p.length][0], p[(i + 1) % p.length][1], k + n * 131 + i * 31, opts.over ?? 1);
    });
    const it = { f: fill, s: opts.stroke === null ? null : opts.stroke ?? 1, lw: opts.lw ?? 1, fp: new Float32Array(fp), sp: new Float32Array(sp), t: opts.t, a: opts.a };
    return this._push(it, sp.concat(fp));
  }

  /** Open polyline from world points (ink only). */
  line(wpts, opts = {}) {
    const p = wpts.map((q) => iso(q[0], q[1], q[2] ?? 0));
    const k = this._k();
    const sp = [];
    if (opts.smooth) {
      for (let i = 0; i + 1 < p.length; i++) {
        if (sp.length && i > 0) {
          // continue without overshoot for smooth curves
          sp.push(p[i + 1][0], p[i + 1][1]);
        } else {
          this._edge(sp, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], k + i, 0.3);
        }
      }
    } else {
      for (let i = 0; i + 1 < p.length; i++) this._edge(sp, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1], k + i * 31, opts.over ?? 1);
    }
    const it = { f: null, s: opts.stroke ?? 1, lw: opts.lw ?? 1, fp: null, sp: new Float32Array(sp), t: opts.t, a: opts.a, dash: opts.dash };
    return this._push(it, sp);
  }

  /**
   * Many short strokes as one item (block 5: tile rows, brick courses,
   * hatching): segs is [[a, b], ...] of world points; each segment gets its
   * own wobble and overshoot, separated by pen-up breaks.
   */
  lines(segs, opts = {}) {
    const k = this._k();
    const sp = [];
    segs.forEach(([a, b], n) => {
      const p = iso(a[0], a[1], a[2] ?? 0);
      const q = iso(b[0], b[1], b[2] ?? 0);
      this._edge(sp, p[0], p[1], q[0], q[1], k + n * 31, opts.over ?? 1);
    });
    const it = { f: null, s: opts.stroke ?? 1, lw: opts.lw ?? 1, fp: null, sp: new Float32Array(sp), t: opts.t, a: opts.a };
    return this._push(it, sp);
  }

  /**
   * One continuous hand-drawn stream line (block 4 wind lines) from a flat
   * world array [x0, y0, x1, y1, ...] at height opts.z: projected, with a
   * slow seeded wobble across the line (no overshoot, no breaks), so it can
   * be dashed vertex by vertex. Returns the item; sp keeps one projected
   * point per input vertex.
   */
  stream(w, opts = {}) {
    const k = opts.k ?? this._k();
    const z = opts.z ?? 0;
    const amp = opts.amp ?? this.amp;
    const m = w.length / 2;
    const sp = new Float32Array(m * 2);
    let s = 0;
    for (let v = 0; v < m; v++) {
      const a = Math.max(0, v - 1);
      const b = Math.min(m - 1, v + 1);
      const p = iso(w[v * 2], w[v * 2 + 1], z);
      const pa = iso(w[a * 2], w[a * 2 + 1], z);
      const pb = iso(w[b * 2], w[b * 2 + 1], z);
      const dx = pb[0] - pa[0];
      const dy = pb[1] - pa[1];
      const L = Math.hypot(dx, dy) || 1;
      if (v) s += Math.hypot(p[0] - sp[v * 2 - 2], p[1] - sp[v * 2 - 1]);
      const off = amp * noise1(s / 9 + (k % 89) * 1.7, k * 13 + 5);
      sp[v * 2] = p[0] - (dy / L) * off;
      sp[v * 2 + 1] = p[1] + (dx / L) * off;
    }
    const it = { f: null, s: opts.stroke ?? 1, lw: opts.lw ?? 1, fp: null, sp, t: opts.t ?? 'wind', a: opts.a };
    return this._push(it, Array.from(sp));
  }

  /** Screen-plane blob (circle with wobbly outline) at a world point. */
  blob(c, r, fill, opts = {}) {
    const [cx, cy] = iso(c[0], c[1], c[2] ?? 0);
    const k = this._k();
    const n = Math.max(10, Math.round(r * 5));
    const pts = [];
    const sp = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (1 + 0.07 * noise1(i * 0.9, k) + (opts.lumpy ?? 0) * Math.sin(a * 3 + k));
      pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.92);
    }
    if (opts.stroke !== null) {
      // one continuous ink loop that slightly overshoots its start
      const m = n + 2;
      for (let i = 0; i <= m; i++) {
        const j = i % n;
        const jit = 0.06 * r * noise1(i * 0.7, k + 5);
        sp.push(pts[j * 2] + jit, pts[j * 2 + 1] + jit * 0.5);
      }
    }
    const it = { f: fill, s: opts.stroke === null ? null : opts.stroke ?? 1, lw: opts.lw ?? 1, fp: new Float32Array(pts), sp: new Float32Array(sp), t: opts.t, a: opts.a };
    return this._push(it, pts);
  }
}
