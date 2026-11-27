// hutong: block 5 (hutong lanes and courtyards) model runs and numbers: the
// dry model, the evening-splash model (the wet-able cells run again with the
// surface water store, thermal.js), and the statistics behind the bands,
// cards, notes and docs: lane geometry (H/W, sky view, noon sunlit share),
// the splash (cooling, water left, wet-bulb floor), roofs, shaded lanes,
// courtyards under awnings and trees.
import { MODEL } from './materials.js';
import { runModel, cellMat, Thermal, STORE, sunlitField, wetBulb, isWater } from './thermal.js';
import { solarPosition } from './sun.js';
import { DEG } from './core.js';
import { HT_DRAW } from './htkit.js';

/** Coarse 10-min spin-up days (thermal.js opts.warm, as blocks 3 and 4; guarded there). */
export const WARM_HT = 6;

/** True if a scene is the hutong block. */
export const isHutong = (scene) => !!scene.hutongBlock;

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];

/** The splash: W0, beta_wet, W_c and the hour, from materials.js MODEL. */
export const splashParams = () => ({ w0: MODEL.splashW0.value, beta: MODEL.splashBeta.value, wc: MODEL.splashWc.value, hour: MODEL.splashHour.value });

/** Wet-able ground cells: lanes marked splash, and the courtyards that splash (scene.splashCourts). */
export function splashCells(world) {
  const sc = world.scene;
  const lanes = new Set(sc.ground.map((g, k) => (g.splash ? k : -1)).filter((k) => k >= 0));
  const out = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || isWater(cellMat(world, i))) continue;
    const [x, y] = centre(world, i);
    if (lanes.has(world.parcel[i]) || sc.splashCourts.some(([a, b, c, d]) => x > a && x < c && y > b && y < d)) out.push(i);
  }
  return out;
}

/**
 * The block's models: the dry model over every cell, and the splash model,
 * which is the dry model with the wet-able cells replaced by a run of just
 * those cells with the water store (the same arithmetic otherwise; no
 * lateral coupling in this model, so the other cells are unchanged). Both are
 * computed when first asked for.
 */
export function hutongSetup(world, slots) {
  world.draw = HT_DRAW; // the block's own drawing (htkit.js)
  const cells = splashCells(world);
  let dry = null;
  let wet = null;
  let merged = null;
  const base = () => (dry ??= runModel(world, { slots, warm: WARM_HT }));
  const wetRun = () => (wet ??= runModel(world, { slots, warm: WARM_HT, cells, splash: { cells, ...splashParams() } }));
  const splash = () => (merged ??= mergeWet(world, base(), wetRun(), cells));
  return { cells, slots, base, splash, model: (on) => (on ? splash() : base()), cached: () => [dry ? 'dry' : null, merged ? 'splash' : null].filter(Boolean) };
}

/** Dry model with the wet-able cells taken from the splash run (see hutongSetup). */
export function mergeWet(world, base, wet, cells) {
  const store = Float32Array.from(base.store);
  for (const i of cells) store.set(wet.store.subarray(i * STORE, (i + 1) * STORE), i * STORE);
  return new Thermal(world, store, base.slots, { ...base.info, wet: wet.info.wet, splashRun: { days: wet.info.days, maxDelta: wet.info.maxDelta, warm: wet.info.warm, warmFactor: wet.info.warmFactor } });
}

/** The old latent path alone on the given cells: EF := 1 from the splash hour to midnight, no water store. */
export function efPathRun(world, slots, cells) {
  return runModel(world, { slots, warm: WARM_HT, cells, splash: { cells, ...splashParams(), efOnly: true, efWet: 1 } });
}

/** Solar noon of the design day (largest altitude, 1-min scan): {h, alt, az, sun}. */
export function solarNoon(site) {
  let best = null;
  for (let m = 600; m <= 840; m++) {
    const s = solarPosition(site, m / 60);
    if (!best || s.alt > best.alt) best = { h: m / 60, alt: s.alt, az: s.az, sun: s };
  }
  return best;
}

/**
 * Interior cells of a lane: the lane's cells in columns (E-W lanes) or rows
 * (N-S lanes) where the cells just outside both edges, and their neighbours
 * along the lane, are all buildings, and nothing overhangs (no crown or screen).
 * lane: {y0, y1} (E-W) or {x0, x1} (N-S).
 */
export function laneInterior(world, lane) {
  const { n, cell, bld, canopy } = world;
  const ew = lane.y0 !== undefined;
  const a0 = Math.round((ew ? lane.y0 : lane.x0) / cell);
  const a1 = Math.round((ew ? lane.y1 : lane.x1) / cell);
  const at = (along, across) => (ew ? across * n + along : along * n + across);
  const out = [];
  for (let s = 1; s < n - 1; s++) {
    if (a0 - 1 < 0 || a1 >= n) continue;
    let ok = true;
    for (let d = -1; d <= 1 && ok; d++) ok = bld[at(s + d, a0 - 1)] >= 0 && bld[at(s + d, a1)] >= 0;
    for (let c = a0; c < a1 && ok; c++) ok = bld[at(s, c)] < 0 && canopy[at(s, c)] === 0;
    if (ok) for (let c = a0; c < a1; c++) out.push(at(s, c));
  }
  return out;
}

/** Sky view factor of an endless canyon at distances d1, d2 from its walls of height H: 0.5 / sqrt(1 + (H/d1)^2) + 0.5 / sqrt(1 + (H/d2)^2). */
export const canyonSvf = (H, d1, d2) => 0.5 / Math.sqrt(1 + (H / d1) ** 2) + 0.5 / Math.sqrt(1 + (H / d2) ** 2);

/**
 * Lane geometry: width W, wall height H (mean of the wall cells along the
 * interior), H/W, model sky view (mean over the interior cells) vs the
 * endless-canyon value at the same cell centres and at the centre line,
 * cos(atan(2H/W)); at solar noon (E-W lanes) the model's sunlit share vs
 * 1 - (H / tan beta) / W.
 */
export function laneGeometry(world, lane, noon) {
  const cells = laneInterior(world, lane);
  const ew = lane.y0 !== undefined;
  const W = ew ? lane.y1 - lane.y0 : lane.x1 - lane.x0;
  const walls = [];
  const svfA = [];
  for (const i of cells) {
    const [x, y] = centre(world, i);
    const d1 = ew ? y - lane.y0 : x - lane.x0;
    const hn = world.height[ew ? world.cellIndex(x, lane.y0 - 2.5) : world.cellIndex(lane.x0 - 2.5, y)];
    const hs = world.height[ew ? world.cellIndex(x, lane.y1 + 2.5) : world.cellIndex(lane.x1 + 2.5, y)];
    walls.push(hn, hs);
    svfA.push(canyonSvf((hn + hs) / 2, d1, W - d1));
  }
  const H = mean(walls);
  const out = { id: lane.id, name: lane.name, n: cells.length, W, H, hw: H / W, svf: mean(cells.map((i) => world.svf[i])), svfCells: mean(svfA), svfCentre: Math.cos(Math.atan((2 * H) / W)), cells };
  if (ew && noon) {
    const f = sunlitField(world, noon.sun);
    out.noon = { h: noon.h, alt: noon.alt, sunlit: mean(cells.map((i) => f[i])), analytic: 1 - H / Math.tan(noon.alt * DEG) / W, shadow: H / Math.tan(noon.alt * DEG) };
  }
  return out;
}

/** Every lane of the scene (E-W lanes from scene.lanes and Bell Lane), with geometry. */
export function lanesOf(world, noon = solarNoon(world.scene.site)) {
  const sc = world.scene;
  const bell = sc.ground.find((g) => g.id === 'bell');
  const list = [...sc.lanes.map((l) => ({ ...l })), { id: 'bell', name: bell.name, x0: bell.poly[0], x1: bell.poly[2] }];
  return list.map((l) => ({ ...laneGeometry(world, l, noon), mat: sc.ground.find((g) => g.id === l.id).mat, splash: !!sc.ground.find((g) => g.id === l.id).splash }));
}

/** Interior cells of the splashed lanes (the band cells: lane sky view about 0.5). */
export function splashLaneCells(world) {
  return lanesOf(world).filter((l) => l.splash).flatMap((l) => l.cells);
}

/**
 * The splash on a set of cells (dry vs splash model): mean ΔTs at the
 * quarter hours, the peak within an hour of the splash, at 23:00, before the
 * splash (18:45) and the next afternoon (15:00 of the repeated day), mean
 * ΔTmrt, water left; and over all wet-able cells: the largest evaporated
 * depth and the smallest Ts minus the air's wet-bulb temperature while water
 * is left (every model minute, from the model run).
 */
export function splashStats(world, dry, wet, cells, all) {
  const p = splashParams();
  const d = (h) => mean(cells.map((i) => wet.ts(i, h) - dry.ts(i, h)));
  const dm = (h) => mean(cells.map((i) => wet.tmrt(i, h) - dry.tmrt(i, h)));
  const curve = [];
  for (let h = p.hour; h <= 24; h += 0.25) curve.push({ h, dTs: d(h % 24), w: mean(cells.map((i) => wet.water(i, h % 24))) });
  let peak = curve[0];
  for (const c of curve) if (c.h <= p.hour + 1 && c.dTs < peak.dTs) peak = c;
  // the wet-bulb check runs inside the model, every minute of the last model day (thermal.js)
  const margin = wet.info.wet.margin;
  const marginAt = wet.info.wet.marginAt;
  const tm = [];
  for (let h = p.hour + 0.5; h <= 22; h += 0.25) tm.push(dm(h));
  return {
    n: cells.length,
    svf: mean(cells.map((i) => world.svf[i])),
    peak: peak.dTs,
    peakAt: peak.h,
    d20: d(20),
    d21: d(21),
    d23: d(23),
    before: d(p.hour - 0.25),
    next15: d(15),
    tmrt20: dm(20),
    tmrt21: dm(21),
    tmrtMin: Math.min(...tm),
    tmrtMax: Math.max(...tm),
    w21: mean(cells.map((i) => wet.water(i, 21))),
    w23: mean(cells.map((i) => wet.water(i, 23))),
    ...waterBalance(wet, all),
    w0: p.w0,
    margin,
    marginAt,
    ts20: mean(cells.map((i) => wet.ts(i, 20))),
    dry20: mean(cells.map((i) => dry.ts(i, 20))),
    air20: dry.air(20),
    curve,
  };
}

/**
 * Water bookkeeping of the splash model over the wet-able cells (last model
 * day): the largest depth evaporated in the day; the largest depth one splash
 * loses to evaporation before the next (W0 minus what is left at 19:00, which
 * the next splash tops up); the mass-balance error |evaporated - (start -
 * before + W0 - end)|; the smallest stored W; and the largest day-to-day
 * change of the store (start - end, the model day is not exactly periodic).
 */
export function waterBalance(T, cells) {
  const w = T.info.wet;
  let evapMax = 0;
  let perSplash = 0;
  let err = 0;
  let wMin = Infinity;
  let drift = 0;
  for (const i of cells) {
    evapMax = Math.max(evapMax, w.evap[i]);
    perSplash = Math.max(perSplash, w.w0 - w.before[i]);
    err = Math.max(err, Math.abs(w.evap[i] - (w.start[i] - w.before[i] + w.w0 - w.end[i])));
    drift = Math.max(drift, Math.abs(w.start[i] - w.end[i]));
    for (let k = 0; k < STORE; k++) wMin = Math.min(wMin, w.store[i * STORE + k]);
  }
  return { evapMax, perSplash, balanceErr: err, wMin, drift };
}

/** Largest |ΔTs| of the old EF path alone (efPathRun) vs dry over the evening (19:00-24:00) on the cells. */
export function efPathStats(dry, ef, cells) {
  let max = 0;
  for (let h = MODEL.splashHour.value; h <= 24; h += 0.25) max = Math.max(max, Math.abs(mean(cells.map((i) => ef.ts(i, h % 24) - dry.ts(i, h % 24)))));
  // net radiation on the cells after the splash: the EF term needs Q* > 0
  return { max };
}

/** Grey tile roofs at hour h: mean, min and max over roof cells. */
export function roofStats(world, T, h = 15) {
  const t = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] >= 0) t.push(T.ts(i, h));
  return { n: t.length, mean: mean(t), min: Math.min(...t), max: Math.max(...t), air: T.air(h) };
}

/** Lane floor cells in shade at hour h (sunlit share <= 0.3: walls, trees): Ts vs air. */
export function shadedLanes(world, T, h = 15) {
  const ids = new Set(world.scene.ground.map((g, k) => (g.street ? k : -1)).filter((k) => k >= 0));
  const c = [];
  for (let i = 0; i < world.n * world.n; i++) if (world.bld[i] < 0 && ids.has(world.parcel[i]) && T.sunlit(i, h) <= 0.3) c.push(i);
  const t = c.map((i) => T.ts(i, h));
  return { n: c.length, mean: mean(t), min: Math.min(...t), max: Math.max(...t), air: T.air(h), cells: c };
}

/** Courtyard cells (scene.courts) split by cover: under an awning, under a pergola, under a crown, open. */
export function courtCells(world) {
  const out = { awning: [], pergola: [], crown: [], open: [], all: [] };
  const scr = world.screens ?? [];
  for (const c of world.scene.courts) {
    for (let i = 0; i < world.n * world.n; i++) {
      if (world.bld[i] >= 0) continue;
      const [x, y] = centre(world, i);
      if (!(x > c.x0 && x < c.x1 && y > c.y0 && y < c.y1)) continue;
      out.all.push(i);
      const s = scr.find((P) => x > P.x0 && x < P.x1 && y > P.y0 && y < P.y1);
      if (s) out[s.kind].push(i);
      else if (world.canopy[i] > 0) out.crown.push(i);
      else out.open.push(i);
    }
  }
  return out;
}

/** Courtyards at hour h: sky view, Ts and Tmrt under awnings, pergolas, crowns and in the open sun. */
export function courtyardStats(world, T, h = 15) {
  const c = courtCells(world);
  const side = (a) => ({ n: a.length, svf: mean(a.map((i) => world.svf[i])), ts: mean(a.map((i) => T.ts(i, h))), tmrt: mean(a.map((i) => T.tmrt(i, h))), sunlit: mean(a.map((i) => T.sunlit(i, h))) });
  const sunOpen = c.open.filter((i) => T.sunlit(i, h) > 0.95);
  const svfAll = c.all.map((i) => world.svf[i]).sort((a, b) => a - b);
  const q = (p) => svfAll[Math.min(svfAll.length - 1, Math.floor(p * svfAll.length))];
  return { h, awning: side(c.awning), pergola: side(c.pergola), crown: side(c.crown), open: side(c.open), sun: side(sunOpen), svf10: q(0.1), svf50: q(0.5), svf90: q(0.9), air: T.air(h) };
}

/** Trees by species at hour h: ground cells under each crown centre (the tree's own cell), sunlit share and Tmrt. */
export function treeStats(world, T, h = 15) {
  const by = {};
  for (const t of world.trees) {
    if (!t.species) continue;
    const i = world.cellIndex(t.x, t.y);
    if (world.bld[i] >= 0 || (world.screens ?? []).some((P) => t.x > P.x0 && t.x < P.x1 && t.y > P.y0 && t.y < P.y1)) continue;
    (by[t.species] ??= []).push(i);
  }
  const out = {};
  for (const [k, a] of Object.entries(by)) out[k] = { n: a.length, tr: world.trees.find((t) => t.species === k).tr, sunlit: mean(a.map((i) => T.sunlit(i, h))), tmrt: mean(a.map((i) => T.tmrt(i, h))), ts: mean(a.map((i) => T.ts(i, h))) };
  return out;
}

/** Dwellers at hour h by the shade class of their spot (0 sun, 1 building, 2 crowns and screens). */
export function dwellShade(life, shade, hq) {
  const p = life.plan(hq);
  const cls = [0, 0, 0];
  for (const [s] of p.dwell) {
    const sp = life.scene.spots[s];
    const i = Math.floor(sp.x / shade.cell);
    const j = Math.floor(sp.y / shade.cell);
    cls[shade.night ? 0 : shade.cls[j * shade.n + i]]++;
  }
  return { sun: cls[0], building: cls[1], canopy: cls[2], n: p.dwell.length };
}

/** The splash on the cells with other values of beta_wet (the brief's range): largest ΔTs within 1 h and at 23:00. */
export function splashSensitivity(world, slots, dry, cells, betas = [0.3, 1]) {
  const p = splashParams();
  return betas.map((beta) => {
    const T = runModel(world, { slots, warm: WARM_HT, cells, splash: { cells, ...p, beta } });
    const d = (h) => mean(cells.map((i) => T.ts(i, h) - dry.ts(i, h)));
    let peak = 0;
    for (let h = p.hour; h <= p.hour + 1; h += 0.25) peak = Math.min(peak, d(h));
    return { beta, peak, d23: d(23), tmrt20: mean(cells.map((i) => T.tmrt(i, 20) - dry.tmrt(i, 20))) };
  });
}

/** Model lines for the block-5 glossary footnotes (glossaryStats extra.hutong). */
export function hutongGlossary(world, T, st) {
  const r2 = (x) => x.toFixed(2);
  const r1 = (x) => x.toFixed(1);
  const l5 = st.lanes.find((l) => l.id === 'jujube');
  const main = st.lanes.find((l) => l.id === 'main');
  const c = st.court;
  const s = st.s;
  const e = world.scene.site.vapourHpa;
  return {
    svfLine: `5 m lanes ${r2(l5.svf)}, the 10 m lane ${r2(main.svf)}; courtyards ${r2(c.svf10)}–${r2(c.svf90)} (10th–90th percentile); under a mat awning ${r2(c.awning.svf)}.`,
    lagLine: `At 11 pm the dry lane paving is ${r1(mean(l5.cells.map((i) => st.dry.ts(i, 23))) - T.air(23))} °C above the air; splashed, ${r1(mean(l5.cells.map((i) => st.wet.ts(i, 23))) - T.air(23))} °C (the evening splash).`,
    tmrtLine: `At 3 pm: ${Math.round(c.awning.tmrt)} °C under a mat awning, ${Math.round(c.crown.tmrt)} °C under tree crowns, ${Math.round(c.sun.tmrt)} °C in a sunlit courtyard.`,
    courtLine: `Courtyard sky view ${r2(c.svf10)}–${r2(c.svf90)} (10th–90th percentile), under a mat awning ${r2(c.awning.svf)}; Harbin's traditional courtyards measured 0.22–0.37.`,
    waterLine: `Each splash leaves ${s.w0} mm at 19:00; on the splashed lanes ${r2(s.w21)} mm is left at 21:00 and ${r2(s.w23)} mm at 23:00, and it is gone by morning.`,
    wetBulbLine: `At 21:00 the air is ${r1(T.air(21))} °C and its wet-bulb ${r1(wetBulb(T.air(21), e))} °C; the coolest wet paving stays ${r1(s.margin)} K above the wet-bulb.`,
  };
}
