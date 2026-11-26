// Review screenshots: day view, thermal 15:00, thermal 23:00 (docs/media) and
// the gallery thumbnail (thumbs/). Usage: npm run screens
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const page0 = pathToFileURL(`${root}cities/asphalt-park/index.html`).href;
mkdirSync(`${root}docs/media`, { recursive: true });
mkdirSync(`${root}thumbs`, { recursive: true });

const shots = [
  ['docs/media/day-1500.jpg', 'hour=15&f=400', { width: 1280, height: 800 }],
  ['docs/media/thermal-1500.jpg', 'thermal&hour=15&f=400', { width: 1280, height: 800 }],
  ['docs/media/thermal-2300.jpg', 'thermal&hour=23&f=400', { width: 1280, height: 800 }],
  ['docs/media/sweat-default.jpg', 'hour=15&f=640&notes=0', { width: 1280, height: 800 }],
  ['docs/media/intro-pen.jpg', 'hour=15&f=110', { width: 1280, height: 800 }],
  [
    'docs/media/footnote.jpg',
    'thermal&hour=15&f=400',
    { width: 1280, height: 800 },
    async (page) => {
      // open the cool-roof heat card, then the albedo footnote on it
      const [x, y] = await page.evaluate(() => window.atlas.project(325, 127.5, 18));
      await page.mouse.click(x, y);
      await page.locator('#card .gl[data-gl="albedo"]').click();
    },
  ],
  ['thumbs/asphalt-park.jpg', 'hour=15&f=400&notes=0&ui=0&cam=3,215,300', { width: 640, height: 400 }],
];
const browser = await chromium.launch();
for (const [out, q, viewport, act] of shots) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.setOffline(true);
  const page = await ctx.newPage();
  await page.goto(`${page0}?${q}`);
  await page.waitForFunction(() => window.atlas && window.atlas.ready);
  await page.waitForTimeout(800); // let the legend fade in
  if (act) await act(page);
  await page.screenshot({ path: `${root}${out}`, type: 'jpeg', quality: 72 });
  console.log(out);
  await ctx.close();
}
await browser.close();
