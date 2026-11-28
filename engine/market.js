// market: block 12 (night market street) set-up and numbers. The 5 m grid
// model runs as everywhere else, with the ground heat flux G kept (block 6's
// opts.flux) so the stone's release of the day's heat after dark can be
// checked against the model's own budget; the shop awnings are block 5's flat
// screens. What is new is evening bookkeeping, not air physics:
// - the stone's net release, eps (sigma Ts^4 - L_down) + h_c (Ts - Ta), from
//   the model's surface temperatures (the brief's Q_pave_net);
// - the crowd's metabolic heat rho_p M (rho_p a pure function of the hour
//   and the place), the stalls' fuel heat P duty / A_cell and the string
//   lights, shown as a "heat given off" overlay: the air temperature is fixed,
//   so none of it warms the air or changes a surface or Tmrt here;
// - one radiant term for a person near an open charcoal grill (the brief's
//   illustrative point source eps_c sigma (T_c^4 - T_b^4) A_c / (4 pi d^2),
//   d >= 0.5 m, in full within 3 m, tapering smoothly to zero between 3 and
//   4 m, only while the market is open), added to the Tmrt of a point, never
//   to the grid model.
import { runModel, sunSlots, cellMat, SIGMA } from './thermal.js';
import { solarPosition } from './sun.js';
import { NM_DRAW } from './nmkit.js';

/** True if a scene is the night market block. */
export const isMarket = (scene) => !!scene.marketBlock;

// a parameter: value, source key (materials.js SOURCES), basis (materials.js BASIS), verified;
// the notes for docs/sources.md are in scripts/nightmarket.mjs (NM_NOTES), not on the page
const v = (value, source, basis, verified = false) => ({ value, source, basis, verified });

/** Block-12 parameters (each with a source key, a basis tag and a verified flag). */
export const NM = {
  lat: v(25.09, 'engine', 'engine'),
  taMin: v(27, 'cwaTaipei', 'interp'),
  taMax: v(34, 'cwaTaipei', 'interp'),
  vapour: v(30, 'brief12', 'cited'),
  wind: v(1, 'brief12', 'cited'),
  hour: v(21, 'brief12', 'cited'),
  late: v(23, 'brief12', 'cited'),
  day: v(15, 'engine', 'engine'),
  opens: v(16, 'travelTaipei', 'interp'),
  closes: v(24, 'travelTaipei', 'interp'),
  peakFrom: v(20, 'shilinWiki', 'interp'),
  peakTo: v(23, 'shilinWiki', 'interp'),
  peak: v(1, 'brief12', 'range'),
  cap: v(1.5, 'engine', 'engine'),
  walk: v(210, 'ashrae55', 'cited'),
  stand: v(125, 'ashrae55', 'cited'),
  walkShare: v(0.5, 'engine', 'engine'),
  sensible: v(0.4, 'brief12', 'range'),
  lpg: v(8, 'brief12', 'range'),
  wok: v(32.5, 'wokVendor', 'range'),
  charcoal: v(12, 'brief12', 'range'),
  duty: v(0.5, 'brief12', 'cited'),
  coalDuty: v(1, 'engine', 'engine'),
  coalArea: v(0.2, 'brief12', 'engine'),
  coalTemp: v(600, 'brief12', 'engine'),
  coalEps: v(0.95, 'engine', 'engine'),
  grillMin: v(0.5, 'brief12', 'cited'),
  grillMax: v(3, 'brief12', 'cited'),
  grillTaper: v(4, 'engine', 'engine'),
  keepAway: v(1.5, 'engine', 'engine'),
  vendorAt: v(0.9, 'engine', 'engine'),
  lights: v(0.6, 'brief12', 'range'),
  figures: v(260, 'engine', 'engine'),
  warm: v(6, 'engine', 'engine'),
};

const K0 = 273.15;
export const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const centre = (world, i) => [((i % world.n) + 0.5) * world.cell, (Math.floor(i / world.n) + 0.5) * world.cell];
const wrap24 = (h) => ((h % 24) + 24) % 24;

/** Heat a stall gives off when the market is open, W (fuel power x duty; drinks stalls none). */
export function stallPower(type) {
  if (type === 'lpg') return NM.lpg.value * 1000 * NM.duty.value;
  if (type === 'wok') return NM.wok.value * 1000 * NM.duty.value;
  if (type === 'grill') return NM.charcoal.value * 1000 * NM.coalDuty.value;
  return 0;
}

/** True while the market is open (16:00 to midnight), as a pure function of the hour. */
export const isOpen = (h) => wrap24(h) >= NM.opens.value && wrap24(h) < NM.closes.value;

/**
 * The crowd's share of its peak at hour h, 0..1: none before 16:00, a cosine
 * rise to the peak at 20:00, the peak until 23:00, a cosine fall to none at
 * midnight (and none after it). Pure function of the hour.
 */
export function crowdShape(h) {
  const x = wrap24(h);
  const a = NM.opens.value;
  const b = NM.peakFrom.value;
  const c = NM.peakTo.value;
  const d = NM.closes.value;
  if (x < a || x >= d) return 0;
  if (x < b) return (1 - Math.cos((Math.PI * (x - a)) / (b - a))) / 2;
  if (x <= c) return 1;
  return (1 + Math.cos((Math.PI * (x - c)) / (d - c))) / 2;
}

/** A person's heat, W: the mix of walking and standing people (ASHRAE 55 / ISO 8996 via the brief). */
export const personW = () => NM.walkShare.value * NM.walk.value + (1 - NM.walkShare.value) * NM.stand.value;

/** Crowd density at a place of weight w (0..1) at hour h, people per m², capped. */
export const density = (w, h) => Math.min(NM.cap.value, NM.peak.value * w * crowdShape(h));

/** True while the string lights are on: the market open and the sun down. */
export function lightsOn(site, h) {
  return isOpen(h) && solarPosition(site, wrap24(h)).alt < 0;
}

// ---- the grill's radiant term ----------------------------------------------------------

/**
 * Mean extra radiant flux on a body at distance d (m) from one open charcoal
 * bed, W m⁻² (the brief's illustrative point source, an upper bound):
 * eps_c sigma (T_c^4 - T_b^4) A_c / (4 pi d^2), d >= 0.5 m; in full within
 * 3 m, then times a cosine taper from 1 at 3 m to 0 at 4 m (no step where
 * the term stops); zero from 4 m on.
 * T_b: the air temperature (the background the bed hides), °C.
 */
export function grillFlux(d, tb) {
  return grillTaper(d) * grillRaw(d, tb);
}

/** The point-source term without the taper (the brief's formula as it stands), W m⁻². */
export function grillRaw(d, tb) {
  const r = Math.max(NM.grillMin.value, d);
  const tc = NM.coalTemp.value + K0;
  const t = tb + K0;
  return (NM.coalEps.value * SIGMA * (tc ** 4 - t ** 4) * NM.coalArea.value) / (4 * Math.PI * r * r);
}

/** The taper's weight at distance d: 1 within 3 m, (1 + cos(pi (d - 3) / (4 - 3))) / 2 between, 0 from 4 m. */
export function grillTaper(d) {
  const a = NM.grillMax.value;
  const b = NM.grillTaper.value;
  if (d <= a) return 1;
  if (d >= b) return 0;
  return (1 + Math.cos((Math.PI * (d - a)) / (b - a))) / 2;
}

/** Tmrt (°C) with an extra mean radiant flux dS (W m⁻²) on the body. */
export const withFlux = (tmrt, dS) => (dS > 0 ? ((tmrt + K0) ** 4 + dS / SIGMA) ** 0.25 - K0 : tmrt);

// ---- set-up ------------------------------------------------------------------------------

/**
 * Cells by place (geometry only, any hour): the open square (Temple Square,
 * nothing over the centre, sky view >= 0.85), Lantern Street by row (under
 * the awnings, the stall row, the open aisle, the south pavement), the
 * narrow alleys (between three-storey walls), the market's cells (street,
 * square, alleys) with their crowd weight, and the lit cells (street and square).
 */
export function places(world) {
  const sc = world.scene;
  const pid = (id) => sc.ground.findIndex((g) => g.id === id);
  const [lantern, square, aN, aS] = ['lantern', 'square', 'alleyN', 'alleyS'].map(pid);
  const out = { square: [], ref: [], awning: [], stallRow: [], aisle: [], south: [], street: [], alley: [], market: [], weight: new Float32Array(world.n * world.n), lit: new Uint8Array(world.n * world.n), court: [] };
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0) continue;
    const [x, y] = centre(world, i);
    const p = world.parcel[i];
    const P = world.screens.find((s) => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);
    let w = 0;
    if (p === lantern || p === square) out.lit[i] = 1;
    if (p === lantern) {
      out.street.push(i);
      if (y < 190) {
        // under an awning (the square's and the alley's mouths have none: no class)
        if (P) out.awning.push(i);
        w = 1;
      } else if (y < 195) {
        out.stallRow.push(i);
        w = 0.5;
      } else if (y < 200) {
        out.aisle.push(i);
        w = 1;
      } else {
        out.south.push(i);
        w = 0.6;
      }
    } else if (p === square) {
      out.square.push(i);
      const court = y > 145 && y < 180;
      if (court) out.court.push(i);
      w = court ? 0.8 : 0.3;
      if (!P && !court && world.svf[i] >= 0.85) out.ref.push(i);
    } else if (p === aN || p === aS) {
      w = 0.2;
      // the narrow parts: between the three-storey walls, clear of the street and the lanes
      if ((p === aN && y > 80 && y < 150) || (p === aS && y > 240 && y < 320)) out.alley.push(i);
    }
    if (w > 0) {
      out.market.push(i);
      out.weight[i] = w;
    }
  }
  return out;
}

/** The stalls with their heat (W), and the charcoal grills (the coal bed at the stall's centre). */
export function stallList(scene) {
  return scene.stalls.map((s, i) => ({ ...s, i, W: stallPower(s.type) }));
}

/** Block-12 changes to a built world (once): drawing hooks, the places, the stalls and grills, each cell's stall heat. */
export function prepWorld(world) {
  if (world.nm) return world;
  world.draw = NM_DRAW; // the block's own drawing (nmkit.js)
  const stalls = stallList(world.scene);
  const grills = stalls.filter((s) => s.type === 'grill');
  const stallW = new Float64Array(world.n * world.n);
  for (const s of stalls) stallW[world.cellIndex(s.x, s.y)] += s.W;
  world.nm = { F: places(world), stalls, grills, stallW };
  return world;
}

/**
 * The block's model: sun slots and one run that keeps G (thermal.js
 * opts.flux, block 6), with block 3's coarse warm-up days; convergence as in
 * runModel. Nothing else runs: the crowd, the stalls, the lights and the
 * grills never enter it.
 */
export function marketSetup(world) {
  const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const t0 = now();
  prepWorld(world);
  const slots = sunSlots(world);
  const t1 = now();
  const base = runModel(world, { slots, warm: NM.warm.value, flux: true });
  const t2 = now();
  return { base, slots, timing: { slotsMs: t1 - t0, runMs: t2 - t1 } };
}

// ---- heat given off, by source ---------------------------------------------------------

/**
 * The stone's release at hour h, W m⁻² (positive: out of the surface), from
 * the model's surface temperature: radiated, eps (sigma Ts^4 - L_down) with
 * L_down = SVF L_sky + (1 - SVF) L_walls as in the model, and to the air,
 * h_c (Ts - Ta); gross emission eps sigma Ts^4.
 */
export function release(T, i, h) {
  const m = (T.info.mats)[cellMat(T.world, i)];
  const H = T.hourConst(h);
  const v = T.world.svf[i];
  const ts = T.ts(i, h) + K0;
  const Ld = v * H.lsky + (1 - v) * T.lwall(i, h);
  const gross = m.eps.value * SIGMA * ts ** 4;
  const rad = gross - m.eps.value * Ld;
  const air = T.hcAt(i) * (ts - H.taK);
  return { rad, air, net: rad + air, gross, Ld };
}

/**
 * Heat given off on cell i at hour h, W m⁻², by source: the stone (radiated
 * and to the air, calculated), the crowd (rho_p M, its density from the
 * hour and the place), the stalls (fuel power x duty over the cell), the
 * lights; and their total. open: the market toggle (default open). Pure.
 */
export function heatParts(world, T, i, h, open = true) {
  const r = release(T, i, h);
  const w = world.nm.F.weight[i];
  const on = open && isOpen(h);
  const rho = on ? density(w, h) : 0;
  const crowd = rho * personW();
  const stall = on ? world.nm.stallW[i] / (world.cell * world.cell) : 0;
  const light = on && world.nm.F.lit[i] && lightsOn(world.scene.site, h) ? NM.lights.value : 0;
  return { stoneRad: r.rad, stoneAir: r.air, crowd, stall, light, rho, total: r.rad + r.air + crowd + stall + light };
}

/** The grills' extra radiant flux at a point (x, y) at hour h, W m⁻² (zero when closed). */
export function grillAt(world, T, x, y, h, open = true) {
  if (!open || !isOpen(h)) return 0;
  let s = 0;
  const ta = T.air(h);
  for (const g of world.nm.grills) {
    const d = Math.hypot(g.x - x, g.y - y);
    if (d < NM.grillTaper.value) s += grillFlux(d, ta);
  }
  return s;
}

/** Tmrt of a person at a point: the 5 m cell's Tmrt plus the grill term (°C); also the term alone. */
export function tmrtAt(world, T, x, y, h, open = true) {
  const base = T.tmrt(world.cellIndex(x, y), h);
  const dS = grillAt(world, T, x, y, h, open);
  const t = withFlux(base, dS);
  return { base, dS, tmrt: t, dT: t - base };
}

/** Distance to the nearest grill, m. */
export function nearestGrill(world, x, y) {
  let d = Infinity;
  for (const g of world.nm.grills) d = Math.min(d, Math.hypot(g.x - x, g.y - y));
  return d;
}

// ---- statistics for the cards, notes, bands and docs --------------------------------------

/**
 * Numbers behind the cards, notes, bands and docs (pure functions of the
 * model): by place at the evening hours (21:00, 23:00) and at 15:00, the
 * stone's surface, release and emission, Tmrt, sky view; the grill term
 * against distance; the market's heat by source over the street.
 */
export function marketStats(world, T) {
  const F = world.nm.F;
  const hours = [NM.day.value, 19, NM.hour.value, NM.late.value, 3];
  const air = Object.fromEntries(hours.map((h) => [h, T.air(h)]));
  const PL = ['ref', 'square', 'aisle', 'awning', 'stallRow', 'south', 'street', 'alley'];
  const by = (cells, h) => {
    const r = cells.map((i) => release(T, i, h));
    return {
      n: cells.length,
      ts: mean(cells.map((i) => T.ts(i, h))),
      dTs: mean(cells.map((i) => T.ts(i, h))) - air[h],
      tsMin: Math.min(...cells.map((i) => T.ts(i, h))),
      tsMax: Math.max(...cells.map((i) => T.ts(i, h))),
      tmrt: mean(cells.map((i) => T.tmrt(i, h))),
      dTmrt: mean(cells.map((i) => T.tmrt(i, h))) - air[h],
      net: mean(r.map((x) => x.net)),
      rad: mean(r.map((x) => x.rad)),
      toAir: mean(r.map((x) => x.air)),
      gross: mean(r.map((x) => x.gross)),
      grossMin: Math.min(...r.map((x) => x.gross)),
      grossMax: Math.max(...r.map((x) => x.gross)),
      g: mean(cells.map((i) => T.flux(i, h))),
      svf: mean(cells.map((i) => world.svf[i])),
    };
  };
  const place = Object.fromEntries(PL.map((k) => [k, Object.fromEntries(hours.map((h) => [h, by(F[k], h)]))]));
  // the grill term on the stall row at 21:00 against distance (the base Tmrt of the street's stall row)
  const h = NM.hour.value;
  const t0 = place.stallRow[h].tmrt;
  const ta = air[h];
  const grill = [0.5, 0.9, 1, 1.5, 2, 2.5, 3, 3.25, 3.5, 3.75, 4].map((d) => {
    const dS = grillFlux(d, ta);
    return { d, dS, tmrt: withFlux(t0, dS), dT: withFlux(t0, dS) - t0 };
  });
  // where the term falls below 5 K (bisection on d, the term without the taper)
  const raw = (d) => withFlux(t0, grillRaw(d, ta)) - t0;
  let a = 1;
  let b = 10;
  for (let k = 0; k < 50; k++) {
    const m = (a + b) / 2;
    if (raw(m) > 5) a = m;
    else b = m;
  }
  // heat given off over the street at 21:00, by source (mean over the street's cells, W m⁻²)
  const sum = (cells, hh) => {
    const o = { stoneRad: 0, stoneAir: 0, crowd: 0, stall: 0, light: 0, total: 0 };
    for (const i of cells) {
      const p = heatParts(world, T, i, hh);
      for (const k of Object.keys(o)) o[k] += p[k] / cells.length;
    }
    return o;
  };
  const stalls = world.nm.stalls;
  const kinds = ['grill', 'wok', 'lpg', 'drinks'].map((t) => ({ type: t, n: stalls.filter((s) => s.type === t).length, W: stallPower(t) }));
  const streetStalls = stalls.filter((s) => s.y > 185 && s.y < 205);
  return {
    air,
    place,
    grill,
    under5: (a + b) / 2,
    heat: { street: sum(F.street, h), streetLate: sum(F.street, NM.late.value), square: sum(F.square, h) },
    kinds,
    streetStallW: streetStalls.reduce((s, x) => s + x.W, 0),
    streetArea: F.street.length * world.cell * world.cell,
    nStalls: stalls.length,
    nGrills: world.nm.grills.length,
    person: personW(),
  };
}
