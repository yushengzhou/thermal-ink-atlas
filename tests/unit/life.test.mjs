// Route cost (Melnikov et al. 2022 weights) and shade-seeking density.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeCost, Life, shadeDensity, shadeWeights, W_BUILDING, W_TREE } from '../../engine/life.js';
import { SCENE } from '../../cities/asphalt-park/scene.js';
import { buildWorld } from '../../engine/world.js';
import { shadeClassField, airTemp, daylight } from '../../engine/thermal.js';
import { solarPosition } from '../../engine/sun.js';

/** 100 m x 100 m raster: column x < 50 sunny, x >= 50 shaded with class c. */
const raster = (c) => {
  const n = 50;
  const cls = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 25; i < n; i++) cls[j * n + i] = c;
  return { n, cell: 2, cls, night: false };
};

test('route cost weights: building shade 0.84, tree shade half the benefit', () => {
  assert.equal(W_BUILDING, 0.84);
  assert.ok(Math.abs(W_TREE - 0.92) < 1e-9);
  const sunny = [10, 0, 10, 100];
  const shady = [80, 0, 80, 100];
  assert.ok(Math.abs(routeCost(sunny, raster(1)) - 100) < 1e-6);
  assert.ok(Math.abs(routeCost(shady, raster(1)) - 84) < 1e-6);
  assert.ok(Math.abs(routeCost(shady, raster(2)) - 92) < 1e-6);
});

test('shade weights reach the Melnikov values in the heat and fade when cool', () => {
  const hot = shadeWeights(35);
  [1, 0.84, 0.92].forEach((v, i) => assert.ok(Math.abs(hot[i] - v) < 1e-9));
  assert.deepEqual(shadeWeights(24), [1, 1, 1]);
  const mid = shadeWeights(29);
  assert.ok(mid[1] > 0.84 && mid[1] < 1);
});

test('walkers pick the shaded variant; a slightly longer shaded route still wins', () => {
  const scene = {
    seed: 3,
    routes: [{ n: 40, variants: [[10, 0, 10, 100], [80, 0, 80, 100]] }],
    spots: [{ x: 10, y: 50, cap: 5 }, { x: 80, y: 50, cap: 5 }],
    dwellers: 4,
  };
  const life = new Life(scene, () => raster(1), () => 34);
  const p = life.plan(15);
  assert.ok(p.choice.every((c) => c === 1));
  assert.ok(p.dwell.every(([s]) => s === 1));
  // 10% longer but fully in building shade: 110 * 0.84 = 92.4 < 100
  const longer = new Life({ ...scene, routes: [{ n: 10, variants: [[10, 0, 10, 100], [80, 0, 80, 110]] }] }, () => raster(1), () => 34);
  assert.ok(longer.plan(15).choice.every((c) => c === 1));
  // when nothing is shaded the choice is split by personal tolerance
  const flat = new Life(scene, () => raster(0), () => 34);
  const ch = flat.plan(15).choice;
  assert.ok(ch.some((c) => c === 0) && ch.some((c) => c === 1));
});

test('agents are a pure function of (seed, t, hour)', () => {
  const life = new Life(SCENE, () => raster(1), () => 34);
  const a = JSON.stringify(life.at(123.4, 15));
  const other = new Life(SCENE, () => raster(1), () => 34);
  other.at(5, 9);
  assert.equal(JSON.stringify(other.at(123.4, 15)), a);
});

test('at 15:00 people per m2 in shade is at least 2x the density in sun', () => {
  const W = buildWorld(SCENE, { svf: false });
  const rise = daylight(SCENE.site).rise;
  const shadeFor = (h) => shadeClassField(W, solarPosition(SCENE.site, h));
  const life = new Life(SCENE, shadeFor, (h) => airTemp(SCENE.site, h, rise));
  const sh = shadeFor(15);
  const ratios = [];
  for (let t = 0; t < 600; t += 20) ratios.push(shadeDensity(W, life.at(t, 15), sh).ratio);
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  console.log(`15:00 shade/sun density ratio: mean ${mean.toFixed(2)}, min ${Math.min(...ratios).toFixed(2)} over ${ratios.length} samples`);
  assert.ok(mean >= 2, `mean ratio ${mean}`);
  assert.ok(Math.min(...ratios) >= 2, `min ratio ${Math.min(...ratios)}`);
});

test('sweat cue: pure, sparse, only on hot sunlit ground', async () => {
  const { sweatState, sweatStrength, SWEAT_TMRT } = await import('../../engine/life.js');
  assert.equal(sweatStrength(SWEAT_TMRT - 0.1, 1), 0);
  assert.equal(sweatStrength(70, 0.4), 0, 'no sweat in shade');
  assert.equal(sweatStrength(65, 1), 1);
  assert.deepEqual(sweatState(7, 12.3, 62, 1), sweatState(7, 12.3, 62, 1));
  let shown = 0;
  let n = 0;
  for (let k = 0; k < 50; k++) {
    for (let t = 0; t < 20; t += 0.05) {
      const s = sweatState(k, t, 70, 1);
      n++;
      if (s.drops.length) shown++;
      assert.ok(s.drops.length <= 3);
      for (const d of s.drops) assert.ok(d.fall >= 0 && d.fall <= 1 && d.alpha >= 0 && d.alpha <= 1);
      assert.equal(sweatState(k, t, 40, 1).drops.length, 0);
    }
  }
  const share = shown / n;
  console.log(`sweat droplets visible ${(share * 100).toFixed(1)}% of the time at full heat`);
  assert.ok(share > 0.05 && share < 0.3, `share ${share}`);
});
