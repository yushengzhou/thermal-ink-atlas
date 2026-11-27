// world: parcels -> grids (5 m model grid, 2 m fine grid), sky view factor,
// and a back-to-front depth order for objects by footprint.
import { inPoly } from './core.js';
import { svfAt } from './thermal.js';

export const GROUND_MATS = ['concrete', 'asphalt', 'stone', 'grass', 'water', 'pavers', 'porousAsphalt', 'coolPave', 'raingarden'];
const WALKABLE = { concrete: 1, stone: 1, grass: 1, pavers: 1 };

/** Shopfront segments [s0, s1] (metres along a face) for a shop building. */
export function shopSegments(B, face) {
  const along = face === 'S' ? B.x1 - B.x0 : B.y1 - B.y0;
  const m = Math.max(1, Math.floor(along / 7));
  const w = along / m;
  const out = [];
  for (let i = 0; i < m; i++) out.push([i * w + 0.6, i * w + w - 1.2]);
  return out;
}

/** Awning boxes (building shade) in front of shopfronts on the south face. */
export function awningsOf(B) {
  if (!B.shops) return [];
  return shopSegments(B, 'S').map(([a, b]) => ({ x0: B.x0 + a, y0: B.y1, x1: B.x0 + b, y1: B.y1 + 1.6, z0: 2.6, z1: 3.2, b: B.index }));
}

export function buildWorld(scene, opts = {}) {
  const size = scene.size;
  const cell = opts.cell ?? 5;
  const n = Math.round(size / cell);
  const N = n * n;
  const buildings = scene.buildings.map((b, i) => ({ ...b, index: i }));
  const trees = scene.trees.map((t, i) => ({ ...t, index: i }));
  const awnings = buildings.flatMap(awningsOf);

  const parcelAt = (x, y) => {
    for (let k = scene.ground.length - 1; k >= 0; k--) {
      if (inPoly(scene.ground[k].poly, x, y)) return k;
    }
    return 0;
  };
  const buildingAt = (x, y) => {
    for (let k = 0; k < buildings.length; k++) {
      const b = buildings[k];
      if (x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1) return k;
    }
    return -1;
  };

  const mat = new Uint8Array(N);
  const parcel = new Int16Array(N);
  const bld = new Int16Array(N);
  const height = new Float32Array(N);
  const canopy = new Float32Array(N);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * cell;
      const y = (j + 0.5) * cell;
      const k = j * n + i;
      const p = parcelAt(x, y);
      parcel[k] = p;
      mat[k] = GROUND_MATS.indexOf(scene.ground[p].mat);
      const b = buildingAt(x, y);
      bld[k] = b;
      height[k] = b >= 0 ? buildings[b].h : 0;
      let cover = 0;
      for (const t of trees) {
        const d = Math.hypot(t.x - x, t.y - y);
        if (d < t.r) cover = Math.max(cover, 1 - (d / t.r) ** 2 * 0.5);
      }
      canopy[k] = cover;
    }
  }

  const cellIndex = (x, y) => {
    const i = Math.min(n - 1, Math.max(0, Math.floor(x / cell)));
    const j = Math.min(n - 1, Math.max(0, Math.floor(y / cell)));
    return j * n + i;
  };
  const heightAt = (x, y) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return 0;
    return height[cellIndex(x, y)];
  };

  // sky view factor: horizon scan from roof level for roofs, ground otherwise;
  // canopies block most of the sky directly beneath them.
  // opts.svfFrom: a world with the same buildings (Before / After states)
  // whose open-sky horizon scan is reused.
  const svf = new Float32Array(N);
  const svfOpen = opts.svfFrom ? opts.svfFrom.svfOpen : new Float32Array(N);
  if (opts.svf !== false) {
    for (let k = 0; k < N; k++) {
      const x = ((k % n) + 0.5) * cell;
      const y = (Math.floor(k / n) + 0.5) * cell;
      const z0 = height[k];
      let v = opts.svfFrom ? svfOpen[k] : svfAt(heightAt, x, y, z0 + 0.01, 16, 160, cell / 2);
      svfOpen[k] = v;
      if (bld[k] < 0) v *= 1 - 0.75 * canopy[k];
      svf[k] = v;
    }
  } else svf.fill(1);

  // fine grid (2 m): ground material, walkable flag
  const fcell = 2;
  const fn = Math.round(size / fcell);
  const fmat = new Uint8Array(fn * fn);
  const walk = new Uint8Array(fn * fn);
  for (let j = 0; j < fn; j++) {
    for (let i = 0; i < fn; i++) {
      const x = (i + 0.5) * fcell;
      const y = (j + 0.5) * fcell;
      const m = scene.ground[parcelAt(x, y)].mat;
      fmat[j * fn + i] = GROUND_MATS.indexOf(m);
      walk[j * fn + i] = buildingAt(x, y) < 0 && WALKABLE[m] ? 1 : 0;
    }
  }

  return {
    scene,
    size,
    cell,
    n,
    mat,
    matIds: GROUND_MATS,
    parcel,
    bld,
    height,
    canopy,
    svf,
    svfOpen,
    buildings,
    trees,
    awnings,
    cellIndex,
    heightAt,
    parcelAt,
    buildingAt,
    fine: { n: fn, cell: fcell, mat: fmat, walk },
  };
}

/**
 * Back-to-front order for footprint boxes {x0,y0,x1,y1}. For the view from
 * the south-east, A is behind B if A lies wholly west of or north of B.
 * Overlapping footprints fall back to the centre sum. Topological DFS.
 */
export function depthOrder(boxes) {
  const n = boxes.length;
  const behind = (a, b) => {
    const A = boxes[a];
    const B = boxes[b];
    const overlapX = A.x0 < B.x1 && B.x0 < A.x1;
    const overlapY = A.y0 < B.y1 && B.y0 < A.y1;
    if (overlapX && overlapY) return A.x0 + A.x1 + A.y0 + A.y1 < B.x0 + B.x1 + B.y0 + B.y1;
    const west = A.x1 <= B.x0;
    const north = A.y1 <= B.y0;
    const east = B.x1 <= A.x0;
    const south = B.y1 <= A.y0;
    if ((west && south) || (east && north)) return false; // never overlap on screen
    return west || north;
  };
  const key = (i) => boxes[i].x0 + boxes[i].x1 + boxes[i].y0 + boxes[i].y1;
  const idx = [...Array(n).keys()].sort((a, b) => key(a) - key(b));
  const state = new Uint8Array(n);
  const out = [];
  const visit = (i) => {
    if (state[i] === 2) return;
    if (state[i] === 1) return; // cycle guard
    state[i] = 1;
    for (const j of idx) if (j !== i && state[j] !== 2 && behind(j, i)) visit(j);
    state[i] = 2;
    out.push(i);
  };
  for (const i of idx) visit(i);
  return out;
}
