// life: deterministic pedestrians. Each walker belongs to a route with two
// equal-length variants (opposite pavements). At each (quantised) hour every
// walker takes the variant with the lowest perceived cost:
//   cost = sun distance + 0.84 x building-shade distance + 0.92 x tree-shade distance
// Melnikov et al. 2022 (doi 10.1038/s41598-022-06383-5): walking in shade is
// perceived ~16% shorter; tree shade gives about half the benefit of building
// shade (so its weight is 1 - 0.16/2 = 0.92). Those effects were measured in
// hot weather, so the shade benefit is scaled by heat: full weights at air
// >= 32 C (15:00 on the design day is 35 C), none at <= 26 C.
// Positions are a pure function of (seed, t, hour).
import { hash3, hexRgb } from './core.js';

export const W_SUN = 1;
export const W_BUILDING = 0.84;
export const W_TREE = 1 - (1 - W_BUILDING) / 2;
const WEIGHT = [W_SUN, W_BUILDING, W_TREE];

/** Shade weights at a given air temperature (heat factor 0..1). */
export function shadeWeights(air) {
  const s = Math.min(1, Math.max(0, (air - 26) / 6));
  return [W_SUN, 1 - (1 - W_BUILDING) * s, 1 - (1 - W_TREE) * s];
}

const SHIRTS = ['#b5533c', '#3f6e6a', '#c9973f', '#5b6b8c', '#e8e1d0', '#8e4b5e', '#2f3e52', '#d07a5a', '#6f8c52'].map(hexRgb);

/** Shade class (0 sun, 1 building, 2 tree) at a world point. */
export function shadeAt(shade, x, y) {
  const i = Math.floor(x / shade.cell);
  const j = Math.floor(y / shade.cell);
  if (i < 0 || j < 0 || i >= shade.n || j >= shade.n) return 0;
  return shade.cls[j * shade.n + i];
}

export function polyLength(p) {
  let L = 0;
  for (let i = 0; i + 3 < p.length; i += 2) L += Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
  return L;
}

/** Perceived cost of walking polyline p under a shade raster. */
export function routeCost(p, shade, step = 1, weight = WEIGHT) {
  let cost = 0;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const L = Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = p[i] + (p[i + 2] - p[i]) * t;
      const y = p[i + 1] + (p[i + 3] - p[i + 1]) * t;
      cost += (L / n) * weight[shadeAt(shade, x, y)];
    }
  }
  return cost;
}

/** Point at arc length s along polyline p; returns [x, y, dx, dy]. */
export function pointAt(p, s) {
  for (let i = 0; i + 3 < p.length; i += 2) {
    const dx = p[i + 2] - p[i];
    const dy = p[i + 3] - p[i + 1];
    const L = Math.hypot(dx, dy);
    if (s <= L || i + 4 >= p.length) {
      const t = Math.min(1, s / L);
      return [p[i] + dx * t, p[i + 1] + dy * t, dx / L, dy / L];
    }
    s -= L;
  }
  return [p[0], p[1], 1, 0];
}

/** Share of people out at a given hour (fewer late at night). */
const smoothStep = (t) => t * t * (3 - 2 * t);

export function presence(h) {
  const x = ((h % 24) + 24) % 24;
  if (x < 5) return 0.25;
  if (x < 7) return 0.25 + ((x - 5) / 2) * 0.75;
  if (x < 22) return 1;
  return 1 - ((x - 22) / 2) * 0.75;
}

export class Life {
  /**
   * @param {object} scene scene with routes, spots, dwellers, seed
   * @param {(hq:number)=>object} shadeFor shade raster for a quantised hour
   * @param {(h:number)=>number} airFor air temperature at an hour
   */
  constructor(scene, shadeFor, airFor) {
    this.scene = scene;
    this.shadeFor = shadeFor;
    this.airFor = airFor;
    this.seed = scene.seed;
    this.plans = new Map();
    this.walkers = [];
    scene.routes.forEach((r, ri) => {
      for (let j = 0; j < r.n; j++) {
        const k = ri * 1000 + j;
        this.walkers.push({
          route: ri,
          k,
          speed: 1.05 + 0.45 * hash3(k, this.seed, 1),
          phase: hash3(k, this.seed, 2),
          lateral: (hash3(k, this.seed, 3) - 0.5) * 2.6,
          shirt: SHIRTS[Math.floor(hash3(k, this.seed, 4) * SHIRTS.length)],
          tol: [1 + (hash3(k, this.seed, 5) - 0.5) * 0.1, 1 + (hash3(k, this.seed, 6) - 0.5) * 0.1],
          active: hash3(k, this.seed, 7),
        });
      }
    });
  }

  /** Route variant and dwell spot choices for a quantised hour (cached). */
  plan(hq) {
    if (this.plans.has(hq)) return this.plans.get(hq);
    const shade = this.shadeFor(hq);
    const air = this.airFor(hq);
    const weight = shade.night ? [1, 1, 1] : shadeWeights(air);
    const costs = this.scene.routes.map((r) => r.variants.map((v) => routeCost(v, shade, 1, weight)));
    const choice = this.walkers.map((w) => {
      const c = costs[w.route];
      return c[0] * w.tol[0] <= c[1] * w.tol[1] ? 0 : 1;
    });
    // dwellers: in heat, shade is cheaper; when it is cool, sun is mildly preferred
    const hot = air > 28 && !shade.night;
    const spots = this.scene.spots.map((s) => {
      const cls = shadeAt(shade, s.x, s.y);
      return hot ? weight[cls] : cls === 0 ? 0.95 : 1;
    });
    const used = new Array(spots.length).fill(0);
    const dwell = [];
    for (let d = 0; d < this.scene.dwellers; d++) {
      let best = -1;
      let bc = Infinity;
      for (let s = 0; s < spots.length; s++) {
        if (used[s] >= this.scene.spots[s].cap) continue;
        const c = spots[s] * (1 + (hash3(d, s, this.seed) - 0.5) * 0.08);
        if (c < bc) {
          bc = c;
          best = s;
        }
      }
      dwell.push([best, used[best]]);
      used[best]++;
    }
    const p = { choice, dwell, costs, shade, hot };
    this.plans.set(hq, p);
    return p;
  }

  _bestOffset(v, s, pref, shade) {
    const [x, y, dx, dy] = pointAt(v, s);
    let best = pref;
    let bc = Infinity;
    for (const o of [pref, -2.1, -1.2, -0.3, 0.6, 1.5, 2.1]) {
      const c = WEIGHT[shadeAt(shade, x - dy * o, y + dx * o)] + 0.02 * Math.abs(o - pref);
      if (c < bc) {
        bc = c;
        best = o;
      }
    }
    return best;
  }

  /** All agents at time t (seconds) and quantised hour hq. */
  at(t, hq) {
    const P = this.plan(hq);
    const out = [];
    const pres = presence(hq);
    this.walkers.forEach((w, i) => {
      if (w.active > pres) return;
      const v = this.scene.routes[w.route].variants[P.choice[i]];
      const L = polyLength(v);
      let s = (w.phase * 2 * L + w.speed * t) % (2 * L);
      let dir = 1;
      if (s > L) {
        s = 2 * L - s;
        dir = -1;
      }
      const [x, y, dx, dy] = pointAt(v, s);
      // lateral position across the pavement: when it is hot, drift toward the
      // shadiest strip (decided per 4 m block, blended between blocks)
      let off = w.lateral;
      if (P.hot) {
        const kb = Math.floor(s / 4);
        const f = s / 4 - kb;
        const a = this._bestOffset(v, kb * 4 + 2, w.lateral, P.shade);
        const b = this._bestOffset(v, kb * 4 + 6, w.lateral, P.shade);
        off = a + (b - a) * smoothStep(f);
      }
      out.push({ x: x - dy * off, y: y + dx * off, hx: dx * dir, hy: dy * dir, walk: (s / 0.7) % 2, shirt: w.shirt, k: w.k, sit: false });
    });
    P.dwell.forEach(([s, slot], d) => {
      const sp = this.scene.spots[s];
      const a = slot * 2.1 + hash3(d, 9) * 0.5;
      const r = slot === 0 ? 0 : 1.1;
      out.push({ x: sp.x + Math.cos(a) * r, y: sp.y + Math.sin(a) * r, hx: 1, hy: 0, walk: 0, shirt: SHIRTS[(d * 5) % SHIRTS.length], k: 90000 + d, sit: true, bob: hash3(d, 4) });
    });
    return out;
  }
}

/**
 * People per m2 in shade vs in sun, over walkable ground (pavements, paths,
 * lawn) of the fine grid.
 */
export function shadeDensity(world, agents, shade) {
  const f = world.fine;
  let aShade = 0;
  let aSun = 0;
  for (let j = 0; j < f.n; j++) {
    for (let i = 0; i < f.n; i++) {
      if (!f.walk[j * f.n + i]) continue;
      const c = shadeAt(shade, (i + 0.5) * f.cell, (j + 0.5) * f.cell);
      if (c) aShade += f.cell * f.cell;
      else aSun += f.cell * f.cell;
    }
  }
  let nShade = 0;
  let nSun = 0;
  for (const a of agents) {
    if (shadeAt(shade, a.x, a.y)) nShade++;
    else nSun++;
  }
  const dShade = nShade / Math.max(1, aShade);
  const dSun = nSun / Math.max(1, aSun);
  return { nShade, nSun, aShade, aSun, dShade, dSun, ratio: dShade / Math.max(1e-9, dSun) };
}
