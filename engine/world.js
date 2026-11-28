// world: parcels -> grids (5 m model grid, 2 m fine grid), sky view factor,
// and a back-to-front depth order for objects by footprint.
import { inPoly } from './core.js';
import { svfAt, svfGridAt } from './thermal.js';
import { windField, isWindBlock } from './wind.js';
import { MATERIALS } from './materials.js';

export const GROUND_MATS = ['concrete', 'asphalt', 'stone', 'grass', 'water', 'pavers', 'porousAsphalt', 'coolPave', 'raingarden', 'river', 'pond', 'greyBrick', 'ballast', 'drySoil', 'scrub', 'turf', 'track', 'acrylic', 'rubber', 'gravel', 'desertLawn', 'coolCoat'];
const WALKABLE = { concrete: 1, stone: 1, grass: 1, pavers: 1, greyBrick: 1, turf: 1, track: 1, acrylic: 1, rubber: 1, gravel: 1, desertLawn: 1 };

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

const FACE_INDEX = { S: 0, N: 1, E: 2, W: 3 };

/** Face of box B that a ray from (x, y) along (dx, dy) enters ('S', 'N', 'E' or 'W'). */
export function entryFace(B, x, y, dx, dy) {
  const tx = Math.abs(dx) < 1e-12 ? -Infinity : ((dx > 0 ? B.x0 : B.x1) - x) / dx;
  const ty = Math.abs(dy) < 1e-12 ? -Infinity : ((dy > 0 ? B.y0 : B.y1) - y) / dy;
  if (tx >= ty) return dx > 0 ? 'W' : 'E';
  return dy > 0 ? 'N' : 'S';
}

export function buildWorld(scene, opts = {}) {
  const size = scene.size;
  const cell = opts.cell ?? 5;
  const n = Math.round(size / cell);
  const N = n * n;
  const buildings = scene.buildings.map((b, i) => ({ ...b, index: i }));
  // block 5: trees of a named species take its crown transmission (materials.js tr)
  const trees = scene.trees.map((t, i) => (t.species ? { ...t, tr: t.tr ?? MATERIALS[t.species].tr.value, index: i } : { ...t, index: i }));
  const awnings = buildings.flatMap(awningsOf);
  // block 5: flat screens (vine pergolas, mat awnings) with their material's transmission
  const screens = scene.screens ? scene.screens.map((P, i) => ({ ...P, tr: MATERIALS[P.kind].tr.value, index: i })) : null;

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
      // a screen counts as full cover over the cells whose centre it spans (sky view, wall reflection)
      if (screens) for (const P of screens) if (x > P.x0 && x < P.x1 && y > P.y0 && y < P.y1) cover = 1;
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
  // Glass scenes (block 3) also record, per cell, which share of the walls it
  // sees is glass of each orientation (gview, 4 per cell: S, N, E, W): in each
  // scan direction the building that sets the horizon takes that direction's
  // wall view sin^2(horizon elevation), through the face the ray enters.
  const svf = new Float32Array(N);
  const svfOpen = opts.svfFrom ? opts.svfFrom.svfOpen : new Float32Array(N);
  const hasGlass = buildings.some((b) => b.glass);
  const gview = hasGlass ? (opts.svfFrom ? opts.svfFrom.gview : new Float32Array(N * 4)) : null;
  const nDirs = scene.svfDirs ?? 16;
  if (opts.svf !== false) {
    for (let k = 0; k < N; k++) {
      const x = ((k % n) + 0.5) * cell;
      const y = (Math.floor(k / n) + 0.5) * cell;
      const z0 = height[k];
      let onDir = null;
      let v0 = 0;
      if (hasGlass && !opts.svfFrom) {
        const g = [0, 0, 0, 0];
        onDir = (dx, dy, t, d) => {
          if (!d) return;
          const b = bld[cellIndex(x + dx * d, y + dy * d)];
          if (b < 0 || !buildings[b].glass) return;
          const face = entryFace(buildings[b], x, y, dx, dy);
          const faces = buildings[b].glass === true ? ['S', 'N', 'E', 'W'] : buildings[b].glass;
          if (faces.includes(face)) g[FACE_INDEX[face]] += (t * t) / (1 + t * t) / nDirs;
        };
        v0 = svfAt(heightAt, x, y, z0 + 0.01, nDirs, 160, cell / 2, onDir);
        const wall = 1 - v0;
        for (let o = 0; o < 4; o++) gview[k * 4 + o] = wall > 1e-6 ? g[o] / wall : 0;
      }
      // block 5 (svfExact): grid traversal, walls at their true distance in 5 m lanes
      let v = opts.svfFrom ? svfOpen[k] : onDir ? v0 : scene.svfExact ? svfGridAt({ n, cell, height }, x, y, z0 + 0.01, nDirs, 160) : svfAt(heightAt, x, y, z0 + 0.01, nDirs, 160, cell / 2);
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

  const W = {
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
    gview,
    buildings,
    trees,
    awnings,
    ...(screens ? { screens } : {}),
    ...(scene.shadeSamples ? { shadeS: scene.shadeSamples } : {}),
    cellIndex,
    heightAt,
    parcelAt,
    buildingAt,
    fine: { n: fn, cell: fcell, mat: fmat, walk },
  };
  // block 4: per-cell wind factor (wind.js); other blocks have none (f_w = 1)
  if (isWindBlock(scene)) {
    W.wind = windField(W);
    W.fw = W.wind.fw;
  }
  return W;
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
    // block 6: an overhead screen marked front (PV canopy) is drawn after whatever its footprint overlaps
    if (overlapX && overlapY && !A.front !== !B.front) return !!B.front;
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
