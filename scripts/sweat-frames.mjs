// Close-up frames of the sweat cue for review (docs/media/sweat-*.{jpg,webp}).
// Usage: node scripts/sweat-frames.mjs <outDir>   writes close-up.png and frame-NNN.png
// (the animated webp is assembled from the frames with any image tool).
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = process.argv[2] ?? `${root}test-results/sweat`;
mkdirSync(out, { recursive: true });
const url = pathToFileURL(`${root}cities/asphalt-park/index.html`).href;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await ctx.setOffline(true);
const page = await ctx.newPage();
await page.goto(`${url}?hour=15&f=400&notes=0&ui=0`);
await page.waitForFunction(() => window.atlas && window.atlas.ready);
// find a walker who will sweat on Kiln Street's sunny pavement in the next seconds
const pick = await page.evaluate(() => {
  for (let f = 600; f < 6000; f += 3) {
    const all = window.atlas.sweat(f, 15);
    const s = all.find((p) => !p.hidden && p.drops === 3 && p.fall > 0.3 && p.fall < 0.5 && p.s > 0.6 && p.y > 140 && p.y < 180 && p.x > 40 && p.x < 360 && all.every((q) => q === p || Math.hypot(q.x - p.x, q.y - p.y) > 6));
    if (s) return { f, x: s.x, y: s.y };
  }
  return null;
});
if (!pick) throw new Error('no sweating walker found');
const frames = 60; // 3 s at 20 fps: two 1.5 s pulse cycles
for (let i = 0; i < frames; i++) {
  const f = pick.f - 30 + i * 3;
  const p = await page.evaluate(([f, x, y]) => {
    // follow the nearest walker to the picked one
    const a = window.atlas.sweat(f, 15).reduce((b, q) => (Math.hypot(q.x - x, q.y - y) < Math.hypot(b.x - x, b.y - y) ? q : b));
    window.atlas.seek(f, { z: 28, cx: a.x + 1, cy: a.y - 1 });
    return window.atlas.project(a.x, a.y, 1.2);
  }, [f, pick.x, pick.y]);
  const clip = { x: p[0] - 130, y: p[1] - 80, width: 260, height: 160 };
  await page.screenshot({ path: `${out}/frame-${String(i).padStart(3, '0')}.png`, clip });
  if (i === 10) await page.screenshot({ path: `${out}/close-up.png`, clip: { x: p[0] - 240, y: p[1] - 150, width: 480, height: 300 } });
}
console.log(`frames in ${out}`, pick);
await browser.close();
