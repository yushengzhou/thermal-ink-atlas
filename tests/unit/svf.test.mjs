// Sky view factor horizon scan vs the analytic canyon value cos(arctan(2H/W)).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { svfAt } from '../../engine/thermal.js';

test('canyon floor SVF matches cos(atan(2H/W))', () => {
  const W = 20;
  for (const H of [5, 10, 20, 40]) {
    // infinite canyon along y, walls of height H, 30 m deep each side
    const heightAt = (x) => (Math.abs(x) >= W / 2 && Math.abs(x) <= W / 2 + 30 ? H : 0);
    const exact = Math.cos(Math.atan((2 * H) / W));
    const fine = svfAt(heightAt, 0, 0, 0, 180, 3000, 0.25);
    assert.ok(Math.abs(fine - exact) < 0.02, `H/W ${H / W}: ${fine.toFixed(3)} vs ${exact.toFixed(3)}`);
    // the in-app setting (16 directions) stays within 0.05
    const app = svfAt(heightAt, 0, 0, 0, 16, 3000, 0.5);
    assert.ok(Math.abs(app - exact) < 0.05, `16 dirs H/W ${H / W}: ${app.toFixed(3)} vs ${exact.toFixed(3)}`);
  }
});

test('open ground has SVF 1', () => {
  assert.equal(svfAt(() => 0, 0, 0, 0), 1);
});
