// nmkit: what the pen draws for block 12 (night market street) only: the
// shophouses' shopfronts and signboards, the canvas awnings on posts, the
// stalls (a counter under a small cloth canopy, with a charcoal grill, a wok
// burner, a gas griddle or a drinks cooler on it); and the live layer: the
// string lights, the stalls' lamps, smoke and steam, the grills' radiant
// rings in the heat view, and the "heat given off" bars. kit.js reaches the
// drawing through world.draw (set by market.js prepWorld); the live layer is
// the renderer's R.overlay (set by nmui.js nmApp), so the other pages do not
// carry this code. Everything is a pure function of the frame, the camera,
// the hour and the toggles.
import { hash3, hexRgb, scaleRgb, iso, rgbCss, clamp, ISO_Z } from './core.js';
import { box, jitter, building, WIN } from './kit.js';
import { HAND_FONT } from './render.js';

const CLOTH = ['#b5533c', '#c9973f', '#3f6e6a', '#8e4b5e', '#d9cfb8', '#5b6b8c'].map(hexRgb);
const SIGNS = ['#b5533c', '#c9973f', '#e8c75a', '#3f6e6a', '#8e4b5e', '#d07a5a'].map(hexRgb);
const STEEL = hexRgb('#7d8084');
const WOOD = hexRgb('#8a6a4a');
const COAL = hexRgb('#3a2a25');
const EMBER = hexRgb('#c4482c');

/** A shophouse fronting the street: the shared building, then a glazed shopfront in each bay and a vertical signboard. */
function frontage(pen, B, world) {
  building(pen, B, world);
  pen.b = B.index;
  const { x0, x1, y1 } = B;
  const bays = Math.max(1, Math.round((x1 - x0) / 5));
  const w = (x1 - x0) / bays;
  const fronts = [];
  for (let k = 0; k < bays; k++) fronts.push([[x0 + k * w + 0.4, y1, 0.05], [x0 + (k + 1) * w - 0.4, y1, 0.05], [x0 + (k + 1) * w - 0.4, y1, 2.8], [x0 + k * w + 0.4, y1, 2.8]]);
  pen.tag = 'win';
  pen.shapes(fronts, { k: 'win', h: 0.1 + 0.5 * hash3(B.index, 81), c: scaleRgb(WIN, 1.15), shop: true }, { lw: 0.55, t: 'win' });
  // a vertical signboard on the street face, standing out from the wall
  const sx = x0 + 1 + (x1 - x0 - 2.2) * hash3(B.index, 82);
  const c = SIGNS[Math.floor(hash3(B.index, 83) * SIGNS.length)];
  pen.tag = 'o';
  box(pen, sx, y1, sx + 0.9, y1 + 0.35, 4.2, Math.min(B.h - 0.8, 9.5), c, { t: 'o', lw: 0.55 });
  pen.tag = 'gm';
  const marks = [];
  for (let z = 4.8; z < Math.min(B.h - 1.2, 9); z += 1.1) marks.push([[sx + 0.2, y1 + 0.36, z], [sx + 0.7, y1 + 0.36, z + 0.15]]);
  if (marks.length) pen.lines(marks, { lw: 0.5, stroke: hexRgb('#f4ecd8'), a: 0.75, over: 0, t: 'treeTick' });
  pen.b = -1;
}

/** A canvas awning: sloping from the shopfront (3.5 m) to its front edge (2.9 m), on posts, with stripes. */
function awning(pen, P, i) {
  const { x0, x1, y0, y1 } = P;
  const c = jitter(CLOTH[Math.floor(hash3(i, 84) * CLOTH.length)], i * 7, 0.05);
  pen.tag = 'trunk';
  const posts = [];
  for (let x = x0 + 0.5; x <= x1 - 0.4; x += Math.max(4, (x1 - x0 - 1) / Math.max(1, Math.round((x1 - x0) / 5)))) posts.push([[x, y1 - 0.2, 0], [x, y1 - 0.2, 2.9]]);
  pen.lines(posts, { lw: 0.8, stroke: STEEL, a: 0.95, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape([[x0, y0, 3.5], [x1, y0, 3.5], [x1, y1, 2.9], [x0, y1, 2.9]], c, { lw: 0.85, t: 'tree', a: 0.9 });
  pen.shape([[x0, y1, 2.9], [x1, y1, 2.9], [x1, y1, 2.55], [x0, y1, 2.55]], scaleRgb(c, 0.8), { lw: 0.55, t: 'tree', a: 0.95 });
  const st = [];
  for (let x = x0 + 0.6; x < x1; x += 1.2) st.push([[x, y0, 3.5], [x, y1, 2.9]]);
  pen.lines(st, { lw: 0.7, stroke: hexRgb('#efe6d2'), a: 0.45, over: 0, t: 'treeTick' });
}

/** A stall: counter, cloth canopy on four posts, a front sign, and its fire or cooler on the counter. */
function stall(pen, s, i) {
  const { x, y, type } = s;
  const hx = 1.2;
  const hy = 0.9;
  const cloth = CLOTH[(i * 3 + (type === 'grill' ? 0 : type === 'wok' ? 1 : type === 'lpg' ? 2 : 4)) % CLOTH.length];
  pen.tag = 'o';
  box(pen, x - hx, y - hy, x + hx, y + hy, 0, 0.9, type === 'drinks' ? hexRgb('#cfd6d2') : hexRgb('#b7a487'), { t: 'o', lw: 0.6 });
  // on the counter
  if (type === 'grill') {
    box(pen, x - 0.9, y - 0.25, x + 0.9, y + 0.25, 0.9, 1.05, COAL, { t: 'o', lw: 0.5, top: EMBER });
    pen.tag = 'gm';
    const sk = [];
    for (let k = 0; k < 7; k++) sk.push([[x - 0.75 + k * 0.25, y - 0.3, 1.1], [x - 0.75 + k * 0.25, y + 0.45, 1.1]]);
    pen.lines(sk, { lw: 0.45, stroke: WOOD, a: 0.9, over: 0, t: 'treeTick' });
  } else if (type === 'wok') {
    box(pen, x - 0.35, y - 0.35, x + 0.35, y + 0.35, 0.9, 1.15, STEEL, { t: 'o', lw: 0.5 });
    pen.blob([x, y, 1.25], 0.42, hexRgb('#3b3b3e'), { lw: 0.5, t: 'o' });
  } else if (type === 'lpg') {
    box(pen, x - 0.8, y - 0.35, x + 0.6, y + 0.35, 0.9, 1.0, hexRgb('#55575c'), { t: 'o', lw: 0.5 });
    box(pen, x + 0.7, y - 0.25, x + 1.05, y + 0.1, 0.9, 1.35, hexRgb('#c9c3b5'), { t: 'o', lw: 0.45 });
  } else {
    for (let k = 0; k < 4; k++) box(pen, x - 0.9 + k * 0.45, y + 0.3, x - 0.65 + k * 0.45, y + 0.55, 0.9, 1.15, SIGNS[(i + k) % SIGNS.length], { t: 'o', lw: 0.35 });
  }
  // canopy
  pen.tag = 'trunk';
  pen.lines([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [[x + a * hx, y + b * hy, 0.9], [x + a * hx, y + b * hy, 2.3]]), { lw: 0.6, stroke: STEEL, a: 0.9, over: 0.05, t: 'trunk' });
  pen.tag = 'tree';
  pen.shape([[x - hx - 0.15, y - hy - 0.15, 2.3], [x + hx + 0.15, y - hy - 0.15, 2.3], [x + hx + 0.15, y + hy + 0.15, 2.3], [x - hx - 0.15, y + hy + 0.15, 2.3]], jitter(cloth, i * 11, 0.06), { lw: 0.7, t: 'tree', a: 0.92 });
  pen.shape([[x - hx - 0.15, y + hy + 0.15, 2.3], [x + hx + 0.15, y + hy + 0.15, 2.3], [x + hx + 0.15, y + hy + 0.15, 1.95], [x - hx - 0.15, y + hy + 0.15, 1.95]], scaleRgb(cloth, 0.82), { lw: 0.5, t: 'tree', a: 0.95 });
}

/** kit.js object hook: the shophouses' fronts, the awnings and the stalls. */
function objects(pen, ob, world) {
  if (ob.kind === 'b' && ob.o.style === 'front') {
    frontage(pen, ob.o, world);
    return true;
  }
  if (ob.kind === 'p' && ob.o.kind === 'marketAwning') {
    awning(pen, ob.o, ob.i);
    return true;
  }
  if (ob.kind === 'n' && ob.o.stall !== undefined) {
    stall(pen, world.scene.stalls[ob.o.stall], ob.o.stall);
    return true;
  }
  return false;
}

/** Ground marks: drain covers down the street's middle and the square's well-worn centre ring. */
function decor(pen) {
  pen.tag = 'gm';
  const drains = [];
  for (let x = 6; x < 400; x += 12) drains.push([[x, 195.2], [x + 1.6, 195.2], [x + 1.6, 195.7], [x, 195.7], [x, 195.2]]);
  pen.lines(drains.flatMap((p) => p.slice(1).map((q, k) => [p[k], q])), { lw: 0.4, a: 0.45, over: 0, t: 'gm' });
}

/** The block-12 drawing hooks for kit.js (world.draw). */
export const NM_DRAW = { objects, decor };

// ---- the live layer ---------------------------------------------------------------------------

const BULB = hexRgb('#f6d98a');
const OFF = hexRgb('#e9e4d6');
const GLOW = hexRgb('#f2b85a');
const INK_RGB = hexRgb('#3b2f2a');
/** Colours of the heat-given-off bars: stone radiated, stone to the air, crowd, stalls, lights. */
export const HEAT_RGB = { stoneRad: hexRgb('#c9a66b'), stoneAir: hexRgb('#9a7442'), crowd: hexRgb('#b4677a'), stall: hexRgb('#b5432c'), light: hexRgb('#e3c13d') };
export const HEAT_KEYS = ['stoneRad', 'stoneAir', 'crowd', 'stall', 'light'];

/** True if a point (x, y, z) is behind a building in the fixed isometric view (the renderer's rule for people). */
export function behind(world, x, y, z) {
  for (const B of world.buildings) {
    const dIn = Math.max(B.x0 - x, B.y0 - y, 0);
    const dOut = Math.min(B.x1 - x, B.y1 - y);
    if (dOut <= dIn) continue;
    if (B.h + (B.gable ? 2 : 0) > z + dIn / ISO_Z) return true;
  }
  return false;
}

/**
 * The string lights (once): strings along Lantern Street (two, 4.5 m up,
 * sagging between poles every 13 m) and across the square's food court
 * (three); a bulb every 1.3 m. Bulbs behind a building in the fixed view are
 * left out, and a wire is drawn only between two visible bulbs.
 */
export function lightStrings(world) {
  const bulbs = [];
  const string = (xa, xb, y, z, span) => {
    const out = [];
    for (let x = xa; x <= xb + 1e-9; x += 1.3) {
      const u = ((x - xa) % span) / span;
      const zz = z - 0.6 * 4 * u * (1 - u);
      out.push({ x, y, z: zz, vis: !behind(world, x, y, zz) });
    }
    return out;
  };
  const strings = [string(0.6, 399.4, 190.6, 4.6, 13), string(0.6, 399.4, 199.4, 4.4, 13), ...[150, 162.5, 177].map((y) => string(161, 239, y, 4.2, 13))];
  const wires = [];
  for (const s of strings) {
    for (let k = 0; k + 1 < s.length; k++) if (s[k].vis && s[k + 1].vis) wires.push([s[k], s[k + 1]]);
    for (const b of s) if (b.vis) bulbs.push(b);
  }
  return { bulbs, wires };
}

/** A bottom label box (as the other blocks' overlay labels); returns its top in pixels. */
function label(R, ctx, text, W, H, rgb, row = 0) {
  const d = R.dpr;
  ctx.font = `${Math.round(13 * d)}px ${HAND_FONT}`;
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(text).width;
  const bx = clamp(W / 2 - w / 2, 8 * d, W - w - 8 * d);
  const by = H - (84 + 26 * row) * d;
  ctx.fillStyle = 'rgba(248,243,231,0.94)';
  ctx.fillRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.strokeStyle = rgbCss(rgb, 0.7);
  ctx.lineWidth = 0.9 * d;
  ctx.strokeRect(bx - 5 * d, by - 18 * d, w + 10 * d, 22 * d);
  ctx.fillStyle = rgbCss(rgb);
  ctx.fillText(text, bx, by);
}

/** String lights, the stalls' lamps, smoke over the grills and steam over the woks (market open; lamps after dark). */
function drawMarket(R, ctx, f, cam, W, H, alpha, M, hq) {
  const [ox, oy, Z] = R.origin(cam, W, H);
  const d = R.dpr;
  const P = (x, y, z) => {
    const q = iso(x, y, z);
    return [ox + q[0] * Z, oy + q[1] * Z];
  };
  const night = R.hourCtx(hq).night;
  const off = (X, Y) => X < -30 || Y < -30 || X > W + 30 || Y > H + 30;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the canvas state is set here, not inherited from the previous frame's people (a pure function of the frame)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  {
    // wires, then (lit after dark) a glow, and a core per bulb (one path each)
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = rgbCss(INK_RGB);
    ctx.lineWidth = Math.max(0.6 * d, 0.05 * Z);
    ctx.beginPath();
    for (const [a, b] of M.lights.wires) {
      const [X0, Y0] = P(a.x, a.y, a.z);
      if (off(X0, Y0)) continue;
      const [X1, Y1] = P(b.x, b.y, b.z);
      ctx.moveTo(X0, Y0);
      ctx.lineTo(X1, Y1);
    }
    ctx.stroke();
    const rg = Math.max(2.2 * d, 0.55 * Z);
    const rc = Math.max(1 * d, 0.16 * Z);
    const pts = [];
    for (const b of M.lights.bulbs) {
      const [X, Y] = P(b.x, b.y, b.z);
      if (!off(X, Y)) pts.push(X, Y);
    }
    if (M.lit) {
      ctx.globalAlpha = alpha * 0.28 * night;
      ctx.fillStyle = rgbCss(GLOW);
      ctx.beginPath();
      for (let k = 0; k < pts.length; k += 2) {
        ctx.moveTo(pts[k] + rg, pts[k + 1]);
        ctx.arc(pts[k], pts[k + 1], rg, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = alpha * (M.lit ? 0.5 + 0.5 * night : 0.8);
    ctx.fillStyle = rgbCss(M.lit ? BULB : OFF);
    ctx.beginPath();
    for (let k = 0; k < pts.length; k += 2) {
      ctx.moveTo(pts[k] + rc, pts[k + 1]);
      ctx.arc(pts[k], pts[k + 1], rc, 0, Math.PI * 2);
    }
    ctx.fill();
    R.stats.bulbs = M.lit ? pts.length / 2 : 0;
  }
  // stall lamps after dark: a warm pool under each visible canopy
  if (night > 0) {
    ctx.globalAlpha = alpha * 0.32 * night;
    ctx.fillStyle = rgbCss(GLOW);
    ctx.beginPath();
    for (const s of M.stalls) {
      if (!s.vis) continue;
      const [X, Y] = P(s.x, s.y + 1.4, 0);
      if (off(X, Y)) continue;
      ctx.moveTo(X + 1.9 * Z, Y);
      ctx.ellipse(X, Y, 1.9 * Z, 1.1 * Z, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  // smoke over the grills, steam over the woks: three drifting strokes each (period 3 s)
  const t = f / 60;
  ctx.lineCap = 'round';
  for (const [type, rgb, a0] of [['grill', hexRgb('#8f8a84'), 0.45], ['wok', hexRgb('#e9eef0'), 0.55]]) {
    ctx.globalAlpha = alpha * a0;
    ctx.strokeStyle = rgbCss(rgb);
    ctx.lineWidth = Math.max(1 * d, 0.22 * Z);
    ctx.beginPath();
    for (const s of M.stalls) {
      if (s.type !== type || !s.vis) continue;
      const [X, Y] = P(s.x, s.y, 2.4);
      if (off(X, Y)) continue;
      for (let k = 0; k < 3; k++) {
        const ph = (t / 3 + hash3(s.i, k, 91)) % 1;
        const L = 1.6 * Z;
        const x0 = X + (k - 1) * 0.5 * Z;
        const y0 = Y - ph * 2.5 * Z;
        ctx.moveTo(x0, y0);
        for (let q = 1; q <= 4; q++) ctx.lineTo(x0 + Math.sin(q * 1.4 + s.i + t * 1.7 + k) * 0.25 * Z, y0 - (L * q) / 4);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Heat view: rings on the ground at 1, 2 and 3 m around each open grill (illustrative radiant heat). */
function drawRings(R, ctx, cam, W, H, alpha, M) {
  const [ox, oy, Z] = R.origin(cam, W, H);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgbCss(hexRgb('#a2302a'));
  for (const [r, a] of [[1, 0.85], [2, 0.55], [3, 0.3]]) {
    ctx.globalAlpha = alpha * a;
    ctx.lineWidth = Math.max(1.2 * R.dpr, 0.12 * Z);
    ctx.beginPath();
    for (const g of M.grills) {
      const q = iso(g.x, g.y, 0);
      const X = ox + q[0] * Z;
      const Y = oy + q[1] * Z;
      if (X < -60 || Y < -60 || X > W + 60 || Y > H + 60) continue;
      // a ground circle of radius r in the isometric view: an ellipse r*sqrt(2)*cos30 wide, r*sqrt(2)*sin30 high
      ctx.moveTo(X + r * Math.SQRT2 * 0.8660254 * Z, Y);
      ctx.ellipse(X, Y, r * Math.SQRT2 * 0.8660254 * Z, r * Math.SQRT2 * 0.5 * Z, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  }
  ctx.restore();
  R.stats.rings = M.grills.length;
}

/**
 * The "heat given off" bars (look.heat): on each market cell a stacked
 * column, 3 m of height per 100 W m⁻², by source (stone radiated, stone to
 * the air, crowd, stalls, lights), and the label. M.heat(hq) gives the
 * parts per cell (cached by the caller). Pure function of the camera and
 * the hour.
 */
function drawHeat(R, ctx, cam, W, H, alpha, M, hq) {
  const [ox, oy, Z] = R.origin(cam, W, H);
  const cells = M.heat(hq);
  const runs = Object.fromEntries(HEAT_KEYS.map((k) => [k, []]));
  let n = 0;
  for (const c of cells) {
    const q = iso(c.x, c.y, 0);
    const X = ox + q[0] * Z;
    const Y = oy + q[1] * Z;
    if (X < -20 || X > W + 20 || Y < -40 * Z || Y > H + 20) continue;
    let z = 0;
    for (const k of HEAT_KEYS) {
      const v = Math.max(0, c[k]);
      if (v > 0) runs[k].push(X, Y - z * 0.03 * ISO_Z * Z, Y - (z + v) * 0.03 * ISO_Z * Z);
      z += v;
    }
    n++;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.lineWidth = Math.max(2 * R.dpr, 0.9 * Z);
  ctx.globalAlpha = alpha * 0.9;
  for (const k of HEAT_KEYS) {
    const P = runs[k];
    if (!P.length) continue;
    ctx.strokeStyle = rgbCss(HEAT_RGB[k]);
    ctx.beginPath();
    for (let i = 0; i < P.length; i += 3) {
      ctx.moveTo(P[i], P[i + 1]);
      ctx.lineTo(P[i], P[i + 2]);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = alpha;
  const text = 'Heat given off now, watts per m² (a bar 3 m tall = 100). Shown, not felt: the air temperature is fixed';
  const key = 'pale ochre: stone, radiated · dark ochre: stone, warming the air (calculated) · rose: crowd · red: stalls · yellow: lights';
  label(R, ctx, key, W, H, INK_RGB);
  label(R, ctx, text, W, H, INK_RGB, 1);
  ctx.restore();
  R.stats.heatCells = n;
  R.stats.heatLabel = `${text} | ${key}`;
}

/** Renderer overlay hook (render.js R.overlay): the market's live layer, the rings in the heat view, the bars when shown. */
export function nmOverlay(R, ctx, f, cam, W, H, alpha, look, hq) {
  const M = R.market;
  R.stats.bulbs = 0;
  R.stats.rings = 0;
  R.stats.heatCells = 0;
  if (!M) return;
  M.lit = look.lit;
  if (look.open) drawMarket(R, ctx, f, cam, W, H, alpha, M, hq);
  if (look.open && (look.thermalMix ?? 0) > 0) drawRings(R, ctx, cam, W, H, alpha * look.thermalMix, M);
  if (look.heat) drawHeat(R, ctx, cam, W, H, alpha, M, hq);
}
