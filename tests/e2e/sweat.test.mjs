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
  assert.ok(share > 0.25 && share < 0.6, 'a good share, but not everyone at once (pulsed)');
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
  // the glyphs are big enough to read at the default zoom (DPR 1): pale-blue
  // pixels added by the people layer (people on minus people off), per sweating person
  const blue = await page.evaluate(() => {
    const cam = window.atlas.state().cam;
    const count = () => {
      const c = document.getElementById('atlas');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 2] - d[i] > 40 && d[i + 2] > 150) n++;
      return n;
    };
    window.atlas.look({ people: true });
    window.atlas.seek(640, cam);
    const on = count();
    const people = window.atlas.stats().sweating;
    const glyph = window.atlas.stats().sweatGlyphPx;
    window.atlas.look({ people: false });
    window.atlas.seek(640, cam);
    const off = count();
    window.atlas.look({ people: true });
    return { n: on - off, people, glyph };
  });
  console.log(`default view: ${blue.people} people sweating, droplet glyphs ${blue.glyph.toFixed(1)} CSS px tall, ${blue.n} clearly blue pixels (${(blue.n / Math.max(1, blue.people)).toFixed(0)} per person)`);
  assert.ok(blue.glyph >= 9, 'droplet glyphs at least 9 px tall at the default zoom');
  assert.ok(blue.n / blue.people >= 8, 'droplets are drawn, not specks');
  await context.close();
});
