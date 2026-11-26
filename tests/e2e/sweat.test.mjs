// Sweat cue in the running page: at 15:00 droplets appear only on people
// standing in sun on baking cells (Tmrt >= 65 C), on a good share of them,
// visible at the default camera; none at 23:00.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

test('sweating walkers only on hot sunlit cells at 15:00, none at 23:00', async () => {
  const { page, context } = await open(browser, 'hour=15&notes=0');
  const r = await page.evaluate(() => {
    const out = { people: 0, hotSun: 0, sweating: 0, bad: [], night: 0 };
    for (let f = 400; f < 400 + 60 * 40; f += 5) {
      for (const p of window.atlas.sweat(f, 15)) {
        out.people++;
        if (p.tmrt >= 65 && p.shade === 0 && p.sunlit >= 0.5) out.hotSun++;
        if (p.drops > 0) {
          out.sweating++;
          if (!(p.tmrt >= 65 && p.shade === 0 && p.sunlit >= 0.5)) out.bad.push(p);
        }
      }
      out.night += window.atlas.sweat(f, 23).filter((p) => p.drops > 0 || p.fan).length;
    }
    return out;
  });
  console.log(`15:00: ${r.sweating} sweating person-frames of ${r.people} (${r.hotSun} on hot sunlit cells); 23:00: ${r.night}`);
  assert.ok(r.sweating > 0, 'some walkers sweat at 15:00');
  assert.deepEqual(r.bad.slice(0, 3), [], 'sweat only on hot sunlit cells');
  const share = r.sweating / r.hotSun;
  console.log(`share of people on baking ground showing droplets: ${(share * 100).toFixed(0)}%`);
  assert.ok(share > 0.3 && share < 0.9, 'a good share, but not everyone at once');
  assert.equal(r.night, 0, 'no sweat at 23:00');
  // drawn at the default camera, and the frame stays deterministic
  const drawn = await page.evaluate(() => {
    const cam = window.atlas.state().cam;
    let min = Infinity;
    for (let f = 600; f < 900; f += 10) min = Math.min(min, window.atlas.seek(f, cam).sweating);
    window.atlas.seek(640, cam);
    const a = window.atlas.hash();
    window.atlas.seek(700, cam);
    window.atlas.seek(640, cam);
    return { min, cam, same: a === window.atlas.hash() };
  });
  console.log(`default camera z ${drawn.cam.z}: at least ${drawn.min} people showing droplets in every sampled frame`);
  assert.ok(drawn.min >= 3 && drawn.same);
  await context.close();
});
