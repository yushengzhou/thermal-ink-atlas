// Cast shadows: direction = azimuth + 180 deg, length = H / tan(altitude).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solarPosition, boxShadow, rasterise } from '../../engine/sun.js';
import { SCENE } from '../../cities/asphalt-park/scene.js';

const DEG = Math.PI / 180;

test('pole shadow direction within 2 deg and length within 5% at 9, 12, 15, 18 h', () => {
  const H = 20;
  const cell = 0.05;
  const n = 4000; // 200 m x 200 m grid at 5 cm
  const [px, py] = [100, 100];
  for (const h of [9, 12, 15, 18]) {
    const sun = solarPosition(SCENE.site, h);
    const poly = boxShadow(px - 0.05, py - 0.05, px + 0.05, py + 0.05, H, sun);
    let far = 0;
    let fx = 0;
    let fy = 0;
    rasterise([poly], { nx: n, ny: n, cell }, (i) => {
      const x = (i % n) * cell + cell / 2 - px;
      const y = Math.floor(i / n) * cell + cell / 2 - py;
      const d = Math.hypot(x, y);
      if (d > far) [far, fx, fy] = [d, x, y];
    });
    const expectLen = H / Math.tan(sun.alt * DEG);
    // world y points south, so compass bearing of (x, y) = atan2(x, -y)
    const bearing = ((Math.atan2(fx, -fy) / DEG) + 360) % 360;
    const expectDir = (sun.az + 180) % 360;
    const dDir = Math.abs(((bearing - expectDir + 540) % 360) - 180);
    assert.ok(dDir <= 2, `${h}h direction ${bearing.toFixed(2)} vs ${expectDir.toFixed(2)}`);
    assert.ok(Math.abs(far - expectLen) / expectLen <= 0.05, `${h}h length ${far.toFixed(2)} vs ${expectLen.toFixed(2)}`);
  }
});
