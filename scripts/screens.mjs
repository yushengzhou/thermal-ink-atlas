// Review screenshots (docs/media) and gallery thumbnails (thumbs/).
// Usage: npm run screens [-- city-id]   (default: every city)
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const root = fileURLToPath(new URL('..', import.meta.url));
const pageOf = (city) => pathToFileURL(`${root}cities/${city}/index.html`).href;
const only = process.argv[2];
mkdirSync(`${root}docs/media`, { recursive: true });
mkdirSync(`${root}thumbs`, { recursive: true });

const AP = 'asphalt-park';
const SR = 'sponge-retrofit';
const GC = 'glass-cbd';
const shots = [
  [AP, 'docs/media/day-1500.jpg', 'hour=15&f=400', { width: 1280, height: 800 }],
  [AP, 'docs/media/thermal-1500.jpg', 'thermal&hour=15&f=400', { width: 1280, height: 800 }],
  [AP, 'docs/media/thermal-2300.jpg', 'thermal&hour=23&f=400', { width: 1280, height: 800 }],
  [AP, 'docs/media/sweat-default.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [AP, 'docs/media/sweat-default-2x.jpg', 'hour=15&f=640', { width: 1280, height: 800, dpr: 2 }],
  [AP, 'docs/media/intro-pen.jpg', 'hour=15&f=110', { width: 1280, height: 800 }],
  [
    AP,
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
  [AP, 'thumbs/asphalt-park.jpg', 'hour=15&f=400&notes=0&ui=0&cam=3,215,300', { width: 640, height: 400 }],
  // block 2: split view, d = 0 vs d = 3, the reflective-pavement card
  [SR, 'docs/media/retrofit-split-day-1500.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [SR, 'docs/media/retrofit-split-thermal-1500.jpg', 'thermal&hour=15&f=640', { width: 1280, height: 800 }],
  [SR, 'docs/media/retrofit-d0-thermal-1500.jpg', 'thermal&hour=15&f=640&state=split&split=0.42&d=0&cam=3.5,300,250&notes=0', { width: 1280, height: 800 }],
  [SR, 'docs/media/retrofit-d3-thermal-1500.jpg', 'thermal&hour=15&f=640&state=split&split=0.42&d=3&cam=3.5,300,250&notes=0', { width: 1280, height: 800 }],
  [
    SR,
    'docs/media/retrofit-tradeoff-card.jpg',
    'hour=12&f=640',
    { width: 1280, height: 800 },
    async (page) => {
      await page.click('#retro [data-measure="tradeoff"]');
    },
  ],
  [SR, 'thumbs/sponge-retrofit.jpg', 'hour=15&f=400&notes=0&ui=0&cam=3,260,215', { width: 640, height: 400 }],
  // block 3: the day view with a reflection spot, thermal clear vs mirror, the canyon at 05:00, the spot card
  [GC, 'docs/media/cbd-day-1500.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [GC, 'docs/media/cbd-day-1500-spot.jpg', 'hour=15&f=640&notes=0&cam=5.5,160,222', { width: 1280, height: 800 }],
  [GC, 'docs/media/cbd-thermal-1500-clear.jpg', 'thermal&hour=15&f=640&glass=clear&notes=0&cam=4.5,160,222', { width: 1280, height: 800 }],
  [GC, 'docs/media/cbd-thermal-1500-mirror.jpg', 'thermal&hour=15&f=640&glass=mirror&notes=0&cam=4.5,160,222', { width: 1280, height: 800 }],
  [GC, 'docs/media/cbd-thermal-0500-canyon.jpg', 'thermal&hour=5&f=640&cam=4.5,150,280', { width: 1280, height: 800 }],
  [
    GC,
    'docs/media/cbd-spot-card.jpg',
    'hour=15&f=640',
    { width: 1280, height: 800 },
    async (page) => {
      await page.click('#glass [data-card="spot"]');
    },
  ],
  [GC, 'thumbs/glass-cbd.jpg', 'hour=15&f=400&notes=0&ui=0&cam=2.5,215,205', { width: 640, height: 400 }],
];
const browser = await chromium.launch();
for (const [city, out, q, viewport, act] of shots) {
  if (only && city !== only) continue;
  const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.dpr ?? 1 });
  await ctx.setOffline(true);
  const page = await ctx.newPage();
  await page.goto(`${pageOf(city)}?${q}`);
  await page.waitForFunction(() => window.atlas && window.atlas.ready);
  await page.waitForTimeout(800); // let the legend fade in
  if (act) await act(page);
  await page.screenshot({ path: `${root}${out}`, type: 'jpeg', quality: 72 });
  console.log(out);
  await ctx.close();
}
await browser.close();
