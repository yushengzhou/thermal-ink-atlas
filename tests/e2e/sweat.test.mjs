// Sweat cue in the running page: at 15:00 droplets appear only on people
// standing on hot cells (Tmrt >= 50 C) in sun; none at 23:00.
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
        if (p.tmrt >= 50 && p.shade === 0) out.hotSun++;
        if (p.drops > 0) {
          out.sweating++;
          if (!(p.tmrt >= 50 && p.shade === 0 && p.sunlit >= 0.5)) out.bad.push(p);
        }
      }
      out.night += window.atlas.sweat(f, 23).filter((p) => p.drops > 0 || p.fan).length;
    }
    return out;
  });
  console.log(`15:00: ${r.sweating} sweating person-frames of ${r.people} (${r.hotSun} on hot sunlit cells); 23:00: ${r.night}`);
  assert.ok(r.sweating > 0, 'some walkers sweat at 15:00');
  assert.deepEqual(r.bad.slice(0, 3), [], 'sweat only on hot sunlit cells');
  assert.ok(r.sweating < r.hotSun * 0.35, 'sparse: only some of the people on hot ground at a time');
  assert.equal(r.night, 0, 'no sweat at 23:00');
  // drawn at close zoom, and the frame stays deterministic
  const drawn = await page.evaluate(() => {
    let max = 0;
    for (let f = 600; f < 800; f += 2) max = Math.max(max, window.atlas.seek(f, { z: 7.5, cx: 140, cy: 150 }).sweating);
    window.atlas.seek(640, { z: 7.5, cx: 140, cy: 150 });
    const a = window.atlas.hash();
    window.atlas.seek(700, { z: 7.5, cx: 140, cy: 150 });
    window.atlas.seek(640, { z: 7.5, cx: 140, cy: 150 });
    return { max, same: a === window.atlas.hash() };
  });
  assert.ok(drawn.max > 0 && drawn.same);
  await context.close();
});
