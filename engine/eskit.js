// eskit: what the pen draws for block 7 (older high-rise estate) only: the
// slab blocks and point towers (tiled façades with a window row per floor,
// AC condensers stacked beside the windows, stair-core boxes on the roof),
// the parked cars, and the block's two canvas overlays: the 大寒 (20 January)
// shadows with the sill-rule tallies, and the condenser plumes. kit.js
// reaches the drawing through world.draw (set by estate.js prepWorld); the
// overlays are the renderer's R.overlay (set by esui.js).
import { hash3, hexRgb, scaleRgb, mixRgb, iso, rgbCss, clamp } from './core.js';
import { HAND_FONT } from './render.js';
import { jitter, ROOF_RGB, WIN, box } from './kit.js';
import { solarPosition, boxShadow } from './sun.js';

const UNIT = hexRgb('#bdb9b0'); // condenser casing
const FLOOR_INK = hexRgb('#7d7263');

/**
 * An 18-floor slab or a 30-floor point tower (block 7): walls with shade
 * hatching, a band line per floor, two windows per flat per floor (lit and
 * dark panes as two items), condensers beside the windows on the south face
 * (and the east face of a tower) as one item per face, a cornice, the roof
 * deck and the stair-core boxes. The model treats it as a box.
 */
export function estateBlock(pen, B) {
  pen.b = B.index;
  const { x0, y0, x1, y1, h } = B;
  const wall = jitter(hexRgb(B.wall), B.index * 3, 0.05);
  const roof = jitter(ROOF_RGB.membrane, B.index * 5, 0.06);
  const fh = h / B.floors;
  pen.tag = 'w';
  pen.shape([[x0, y1, 0], [x1, y1, 0], [x1, y1, h], [x0, y1, h]], { k: 'wall', c: wall, n: [0, 1] }, { lw: 1.15, t: 'w' });
  pen.shape([[x1, y1, 0], [x1, y0, 0], [x1, y0, h], [x1, y1, h]], { k: 'wall', c: wall, n: [1, 0] }, { lw: 1.15, t: 'w' });
  for (const face of ['S', 'E']) {
    const len = face === 'S' ? x1 - x0 : y1 - y0;
    const P = (u, z) => (face === 'S' ? [x0 + u, y1, z] : [x1, y1 - u, z]);
    // shade hatching, one item per face (drawn only when the face is turned from the sun)
    const hs = [];
    for (let t = 1.2; t < len + h; t += 3.2) {
      const a = Math.max(0, t - h);
      const b = Math.min(len, t);
      if (b - a >= 0.5) hs.push([P(a, t - a), P(b, t - b)]);
    }
    pen.lines(hs, { lw: 0.4, a: 0.28, over: 0.1, t: face === 'S' ? 'hatchS' : 'hatchE' });
    // floor bands
    const bands = [];
    for (let f = 1; f < B.floors; f++) bands.push([P(0, f * fh), P(len, f * fh)]);
    pen.lines(bands, { lw: 0.3, stroke: FLOOR_INK, a: 0.35, over: 0, t: 'win' });
    // windows and condensers: per flat along the face (the slab's gable has one small window per floor)
    const per = face === 'S' || B.kind === 'tower' ? len / (B.kind === 'tower' ? 2 : B.flats) : len;
    const lit = [];
    const dark = [];
    const units = [];
    const grille = [];
    const gable = face === 'E' && B.kind === 'slab';
    for (let f = B.lobby ? 1 : 0; f < B.floors; f++) {
      const z = f * fh;
      for (let u0 = 0; u0 + per <= len + 1e-6; u0 += per) {
        const wins = gable ? [len / 2 - 0.6] : [per * 0.12, per * 0.58];
        for (const [w, s] of wins.map((s, k) => [k, s])) {
          const ww = gable ? 1.2 : per * 0.26;
          const pane = [P(u0 + s, z + 0.9), P(u0 + s + ww, z + 0.9), P(u0 + s + ww, z + 2.2), P(u0 + s, z + 2.2)];
          (hash3(B.index * 31 + (face === 'S' ? 0 : 1), f * 7 + w, Math.round(u0)) < 0.4 ? lit : dark).push(pane);
          if (gable) continue;
          // a condenser on its bracket beside the window, 0.9 x 0.6 m, standing 0.45 m off the wall
          const c = u0 + s + ww + per * 0.04;
          const out = 0.45;
          const Q = (u, zz) => (face === 'S' ? [x0 + u, y1 + out, zz] : [x1 + out, y1 - u, zz]);
          units.push([Q(c, z + 0.35), Q(c + 0.9, z + 0.35), Q(c + 0.9, z + 0.95), Q(c, z + 0.95)]);
          grille.push([Q(c + 0.1, z + 0.65), Q(c + 0.8, z + 0.65)]);
        }
      }
    }
    pen.tag = 'win';
    if (dark.length) pen.shapes(dark, { k: 'win', h: 0.9, c: WIN }, { lw: 0.4, over: 0.2, t: 'win' });
    if (lit.length) pen.shapes(lit, { k: 'win', h: 0.2, c: scaleRgb(WIN, 1.04) }, { lw: 0.4, over: 0.2, t: 'win' });
    if (units.length) {
      pen.shapes(units, UNIT, { lw: 0.35, over: 0.1, t: 'win' });
      pen.lines(grille, { lw: 0.25, a: 0.5, over: 0, t: 'win' });
    }
  }
  // lobby doors (towers) and entrance doors (slabs) on the ground floor of the south face
  pen.tag = 'win';
  const doors = [];
  const nd = B.kind === 'tower' ? 1 : 4;
  for (let k = 0; k < nd; k++) {
    const u = ((k + 0.5) * (x1 - x0)) / nd;
    doors.push([[x0 + u - 1, y1, 0], [x0 + u + 1, y1, 0], [x0 + u + 1, y1, 2.4], [x0 + u - 1, y1, 2.4]]);
  }
  pen.shapes(doors, hexRgb('#6b4e3a'), { lw: 0.5, t: 'win' });
  pen.tag = 'w';
  pen.line([[x0, y1, h - 0.6], [x1, y1, h - 0.6], [x1, y0, h - 0.6]], { lw: 0.5, a: 0.6, t: 'w' });
  // roof: parapet top, the deck inset below it, stair-core and lift boxes
  pen.tag = 'r';
  const p = 0.7;
  pen.shape([[x0, y0, h], [x1, y0, h], [x1, y1, h], [x0, y1, h]], scaleRgb(roof, 1.12), { lw: 1.1, t: 'r' });
  pen.shape([[x0 + p, y0 + p, h - 0.1], [x1 - p, y0 + p, h - 0.1], [x1 - p, y1 - p, h - 0.1], [x0 + p, y1 - p, h - 0.1]], roof, { lw: 0.5, a: 0.7, t: 'r' });
  pen.tag = 'rd';
  const cores = B.kind === 'tower' ? [(x0 + x1) / 2] : [0, 1, 2, 3].map((k) => x0 + ((k + 0.5) * (x1 - x0)) / 4);
  for (const cx of cores) box(pen, cx - 2, (y0 + y1) / 2 - 2, cx + 2, (y0 + y1) / 2 + 2, h, h + 3, hexRgb('#a7a39c'), { t: 'rd', lw: 0.55 });
  pen.b = -1;
}

/** A parked car in three items (body sides, body top, cabin), tagged 'car' (outline only in the thermal view). */
export function estateCar(pen, x, y, axis, colour, i) {
  const L = 4.4;
  const W = 1.8;
  const c = hexRgb(colour);
  const [hx, hy] = axis === 'x' ? [L / 2, W / 2] : [W / 2, L / 2];
  const sides = (a0, b0, a1, b1, z0, z1) => [[[a0, b1, z0], [a1, b1, z0], [a1, b1, z1], [a0, b1, z1]], [[a1, b1, z0], [a1, b0, z0], [a1, b0, z1], [a1, b1, z1]]];
  const top = (a0, b0, a1, b1, z) => [[a0, b0, z], [a1, b0, z], [a1, b1, z], [a0, b1, z]];
  pen.tag = 'car';
  pen.shapes(sides(x - hx, y - hy, x + hx, y + hy, 0.25, 1.0), { k: 'wall', c, n: [0, 1] }, { lw: 0.5, t: 'car' });
  pen.shape(top(x - hx, y - hy, x + hx, y + hy, 1.0), scaleRgb(c, 1.08), { lw: 0.5, t: 'car' });
  const [cx, cy] = axis === 'x' ? [L * 0.27, W * 0.42] : [W * 0.42, L * 0.27];
  const off = (hash3(i, 3) - 0.5) * 0.6;
  const ox = axis === 'x' ? off : 0;
  const oy = axis === 'y' ? off : 0;
  const g = mixRgb(c, hexRgb('#c9d3d6'), 0.45);
  pen.shapes([...sides(x - cx + ox, y - cy + oy, x + cx + ox, y + cy + oy, 1.0, 1.5), top(x - cx + ox, y - cy + oy, x + cx + ox, y + cy + oy, 1.5)], g, { lw: 0.45, t: 'car' });
}

/** kit.js drawWorld hook: draw a block-7 object; true if it was one. */
function objects(pen, ob) {
  if (ob.kind === 'b' && (ob.o.kind === 'slab' || ob.o.kind === 'tower')) estateBlock(pen, ob.o);
  else if (ob.kind === 'c') estateCar(pen, ...ob.o, ob.i);
  else return false;
  return true;
}

/** The block-7 drawing hooks for kit.js (world.draw). */
export const ES_DRAW = { objects };

// ---- the canvas overlays -----------------------------------------------------------
const WINTER = hexRgb('#3b5f86');
const PLUME = hexRgb('#a2452f');
const OK = hexRgb('#2f5d3a');
const BAD = hexRgb('#8a2f22');
// view direction toward the viewer in world axes: iso() is constant along (1, 1, 1 / 0.95)
const VIEW = [1, 1, 1 / 0.95];

/** True if a world point is hidden from the viewer by a building box other than its own (ray toward the viewer). */
export function hidden(world, p, own = -1) {
  for (const B of world.buildings) {
    if (B.index === own) continue;
    let t0 = 1e-6;
    let t1 = Infinity;
    const lo = [B.x0, B.y0, 0];
    const hi = [B.x1, B.y1, B.h];
    let hit = true;
    for (let a = 0; a < 3 && hit; a++) {
      let u = (lo[a] - p[a]) / VIEW[a];
      let w = (hi[a] - p[a]) / VIEW[a];
      if (u > w) [u, w] = [w, u];
      t0 = Math.max(t0, u);
      t1 = Math.min(t1, w);
      if (t0 > t1) hit = false;
    }
    if (hit) return true;
  }
  return false;
}

/** A bottom label box (as the other blocks' overlay labels). */
function label(R, ctx, text, ink, W, H, row = 0) {
  const d = R.dpr;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const bx = clamp(W / 2 - w / 2, 8 * d, W - w - 8 * d);
  const by = H - (84 + row * 26) * d;
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(ink, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(ink);
  ctx.fillText(text, bx, by);
}

/** Silhouette (screen hull of the 8 corners) of a box, device px. */
function silhouette(B, ox, oy, Z) {
  const pts = [];
  for (const z of [0, B.h]) for (const [x, y] of [[B.x0, B.y0], [B.x1, B.y0], [B.x1, B.y1], [B.x0, B.y1]]) {
    const p = iso(x, y, z);
    pts.push([ox + p[0] * Z, oy + p[1] * Z]);
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of pts) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop();
    up.push(pts[i]);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/**
 * Block 7: the 大寒 (20 January) view, geometry only. The buildings'
 * ground shadows at the same clock hour on 20 January, as a blue wash with
 * an ink edge, cut where a building stands in front (an off-screen layer,
 * cached per hour and camera); on each slab's roof edge a tally per flat:
 * one stroke per hour of 大寒 sun at that flat's ground-floor sill (green
 * at or above the rule, red below); and a label.
 */
export function drawWinter(R, ctx, cam, W, H, alpha, hq) {
  const E = R.estate;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  const site = E.winter;
  const sun = solarPosition(site, hq);
  const key = `${hq}|${cam.z}|${cam.cx}|${cam.cy}|${W}|${H}|${d}`;
  if (!E.layer || E.layer.key !== key) {
    const c = E.layer?.c && E.layer.c.width === W && E.layer.c.height === H ? E.layer.c : (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }));
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    let n = 0;
    if (sun.alt > 0.5) {
      g.beginPath();
      for (const B of R.world.buildings) {
        const poly = boxShadow(B.x0, B.y0, B.x1, B.y1, B.h, sun);
        if (!poly) continue;
        n++;
        for (let i = 0; i < poly.length; i += 2) {
          const p = iso(poly[i], poly[i + 1], 0);
          if (i) g.lineTo(ox + p[0] * Z, oy + p[1] * Z);
          else g.moveTo(ox + p[0] * Z, oy + p[1] * Z);
        }
        g.closePath();
      }
      g.fillStyle = rgbCss(WINTER, 0.3);
      g.fill();
      g.strokeStyle = rgbCss(WINTER, 0.85);
      g.lineWidth = Math.max(1, 0.35 * Z);
      g.stroke();
      // buildings stand in front of the ground: cut their silhouettes out
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000';
      for (const B of R.world.buildings) {
        const s = silhouette(B, ox, oy, Z);
        g.beginPath();
        s.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
      }
      g.globalCompositeOperation = 'source-over';
    }
    E.layer = { key, c, n };
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(E.layer.c, 0, 0);
  R.stats.winterPolys = E.layer.n;
  // tallies on the roofs
  ctx.lineCap = 'round';
  const unit = Math.max(4 * d, 1.6 * Z);
  let tallies = 0;
  for (const t of E.tallies) {
    const p = iso(t.x, t.y, t.z);
    const X = ox + p[0] * Z;
    const Y = oy + p[1] * Z;
    if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
    if (R.clip && (X < R.clip[0] || X > R.clip[1])) continue;
    const full = Math.floor(t.hours + 1e-9);
    const part = t.hours - full;
    ctx.strokeStyle = rgbCss(t.hours >= E.ruleHours ? OK : BAD);
    ctx.lineWidth = Math.max(1.1 * d, 0.3 * Z);
    ctx.beginPath();
    const step = unit * 0.45;
    const x0 = X - ((Math.min(full, 4) + (part > 0.05 ? 1 : 0)) * step) / 2;
    for (let k = 0; k < full; k++) {
      if (k % 5 === 4) {
        // the fifth stroke crosses the four before it
        ctx.moveTo(x0 + (k - 4.4) * step, Y - unit * 0.25);
        ctx.lineTo(x0 + (k - 0.4) * step, Y - unit * 0.85);
      } else {
        ctx.moveTo(x0 + (k % 5) * step + Math.floor(k / 5) * 5 * step, Y);
        ctx.lineTo(x0 + (k % 5) * step + Math.floor(k / 5) * 5 * step, Y - unit);
      }
    }
    if (part > 0.05) {
      const xx = x0 + (full % 5) * step;
      ctx.moveTo(xx, Y);
      ctx.lineTo(xx, Y - unit * part);
    }
    ctx.stroke();
    tallies++;
  }
  R.stats.tallies = tallies;
  const hh = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60) % 60).padStart(2, '0')}`;
  const tst = hq * 60 + sun.eqtime + 4 * site.lon - 60 * site.tz;
  const text = sun.alt > 0.5
    ? `大寒 (20 Jan) shadows at ${hh(hq * 60)} (${hh(tst)} solar time): geometry only, the colours and temperatures stay on 20 July · roof tallies: hours of 大寒 sun at each flat's ground-floor sill (rule ≥ ${E.ruleHours} h)`
    : `大寒 (20 Jan): the sun is down at ${hh(hq * 60)} · roof tallies: hours of 大寒 sun at each flat's ground-floor sill (rule ≥ ${E.ruleHours} h)`;
  label(R, ctx, text, WINTER, W, H, 1);
  R.stats.winterLabel = text;
  ctx.restore();
}

/**
 * Block 7: the condenser overlay. Short warm strokes rise from the
 * condensers on the visible faces (the stacks of every flat, every second
 * floor, where a ray toward the viewer is clear), more of them when more
 * flats run their AC; the heat each south face rejects (kW) at its top; a
 * label with the site's W m-2, a condenser's rejected heat and its exhaust
 * temperature rise. The strokes drift up with the frame number (a pure
 * function of frame, camera and hour).
 */
export function drawPlumes(R, ctx, f, cam, W, H, alpha, hq) {
  const E = R.estate;
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  const share = E.share(hq);
  const t = f / 60;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgbCss(PLUME);
  ctx.lineWidth = Math.max(1.4 * d, 0.5 * Z);
  ctx.globalAlpha = alpha * 0.85;
  const L = Math.max(14 * d, 4.8 * Z);
  ctx.beginPath();
  let n = 0;
  for (let k = 0; k < E.stacks.length; k++) {
    const s = E.stacks[k];
    if (hash3(k, 5, 93) >= share) continue;
    const p = iso(s.x, s.y, s.z);
    const X = ox + p[0] * Z;
    const Y = oy + p[1] * Z;
    if (X < -20 || X > W + 20 || Y < -L * 2 || Y > H + 20) continue;
    if (R.clip && (X < R.clip[0] || X > R.clip[1])) continue;
    const ph = (t / 3 + hash3(k, 7, 93)) % 1;
    const y0 = Y - ph * L * 0.6;
    ctx.moveTo(X, y0);
    for (let i = 1; i <= 5; i++) ctx.lineTo(X + Math.sin(i * 1.3 + k + t * 1.5) * (0.6 + 0.25 * i) * Math.max(d, 0.35 * Z), y0 - (L * i) / 5);
    n++;
  }
  ctx.stroke();
  R.stats.plumes = n;
  // kW per south face
  ctx.globalAlpha = alpha;
  ctx.fillStyle = rgbCss(PLUME);
  ctx.font = `${Math.round(clamp(3.6 * Z, 12 * d, 18 * d))}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  let labels = 0;
  for (const F of E.faces) {
    const p = iso(F.x, F.y, F.z);
    const X = ox + p[0] * Z;
    const Y = oy + p[1] * Z;
    if (X < 0 || X > W - 40 * d || Y < 20 * d || Y > H) continue;
    const txt = `${Math.round(F.kw * share)} kW`;
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(248,243,231,0.85)';
    ctx.fillRect(X - 2 * d, Y - 15 * d, tw + 4 * d, 16 * d);
    ctx.fillStyle = rgbCss(PLUME);
    ctx.fillText(txt, X, Y);
    labels++;
  }
  R.stats.faceLabels = labels;
  const text = `AC condensers (shown; the air here is fixed, so it does not feel them): ${Math.round(E.wm2(hq))} watts per m² over the site at this hour · each blows out ${E.qRej.toFixed(1)} kW, ${E.dtExh(hq).toFixed(1)} degrees warmer than the air`;
  label(R, ctx, text, PLUME, W, H, 0);
  R.stats.plumeLabel = text;
  ctx.restore();
}

/** Renderer overlay hook (render.js R.overlay): the 大寒 view and the condenser plumes, when shown. */
export function esOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  R.stats.plumes = 0;
  R.stats.tallies = 0;
  R.stats.winterPolys = 0;
  if (!R.estate) return;
  if (look.season === 'dajhan') drawWinter(R, ctx, cam, W, H, alpha, hq);
  if (look.condensers) drawPlumes(R, ctx, f, cam, W, H, alpha, hq);
}
