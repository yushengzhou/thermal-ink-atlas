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
const WF = 'waterfront';
const HT = 'hutong';
const PK = 'parking';
const ES = 'estate';
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
  // block 4: wind lines by day, thermal at 15:00, the warm pond at 04:00, the air overlay, the sheltered-street card
  [WF, 'docs/media/wf-day-1500-wind.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [WF, 'docs/media/wf-thermal-1500.jpg', 'thermal&hour=15&f=640', { width: 1280, height: 800 }],
  [WF, 'docs/media/wf-thermal-0400-pond.jpg', 'thermal&hour=4&f=640&cam=3.5,205,212', { width: 1280, height: 800 }],
  [WF, 'docs/media/wf-air-overlay-1500.jpg', 'hour=15&f=640&air=1&notes=0&cam=3.5,200,95', { width: 1280, height: 800 }],
  [
    WF,
    'docs/media/wf-shelter-card.jpg',
    'hour=15&f=640',
    { width: 1280, height: 800 },
    async (page) => {
      await page.click('#wind [data-card="shelter"]');
    },
  ],
  [WF, 'thumbs/waterfront.jpg', 'hour=15&f=400&notes=0&ui=0&cam=2.5,170,150', { width: 640, height: 400 }],
  // block 5: lanes and courtyards by day, thermal at 15:00, thermal 21:00 with and without the splash, the tianpeng card
  [HT, 'docs/media/ht-day-1500.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [HT, 'docs/media/ht-day-1500-lanes.jpg', 'hour=15&f=640&notes=0&cam=5,125,245', { width: 1280, height: 800 }],
  [HT, 'docs/media/ht-thermal-1500.jpg', 'thermal&hour=15&f=640', { width: 1280, height: 800 }],
  [HT, 'docs/media/ht-thermal-2100-splash.jpg', 'thermal&hour=21&f=640&notes=0&cam=3.5,120,240&splash=1', { width: 1280, height: 800 }],
  [HT, 'docs/media/ht-thermal-2100-nosplash.jpg', 'thermal&hour=21&f=640&notes=0&cam=3.5,120,240&splash=0', { width: 1280, height: 800 }],
  [
    HT,
    'docs/media/ht-tianpeng-card.jpg',
    'hour=15&f=640&cam=5,125,245&notes=0',
    { width: 1280, height: 800 },
    async (page) => {
      await page.click('#hutong [data-card="tianpeng"]');
    },
  ],
  [HT, 'thumbs/hutong.jpg', 'hour=15&f=400&notes=0&ui=0&cam=3.5,125,245', { width: 640, height: 400 }],
  // block 6: the car park by day, thermal at 15:00 and at 23:00 with the night-release strokes, the PV canopy close up, the storage card
  [PK, 'docs/media/pk-day-1500.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [PK, 'docs/media/pk-thermal-1500.jpg', 'thermal&hour=15&f=640', { width: 1280, height: 800 }],
  [PK, 'docs/media/pk-thermal-2300-release.jpg', 'thermal&hour=23&f=640&flux=1', { width: 1280, height: 800 }],
  [PK, 'docs/media/pk-thermal-2300-close.jpg', 'thermal&hour=23&f=640&flux=1&notes=0&cam=4,140,170', { width: 1280, height: 800 }],
  [PK, 'docs/media/pk-day-1500-pv.jpg', 'hour=15&f=640&notes=0&cam=5,70,150', { width: 1280, height: 800 }],
  [
    PK,
    'docs/media/pk-storage-card.jpg',
    'thermal&hour=23&f=640&flux=1&notes=0',
    { width: 1280, height: 800 },
    async (page) => {
      await page.click('#parking [data-card="storage"]');
    },
  ],
  [PK, 'thumbs/parking.jpg', 'hour=15&f=400&notes=0&ui=0&cam=3,110,140', { width: 640, height: 400 }],
  // block 7: day and thermal at 15:00, the 大寒 view with the sill tallies, the condenser plumes at 21:00, the spacing card
  [ES, 'docs/media/es-day-1500.jpg', 'hour=15&f=640', { width: 1280, height: 800 }],
  [ES, 'docs/media/es-thermal-1500.jpg', 'thermal&hour=15&f=640', { width: 1280, height: 800 }],
  [ES, 'docs/media/es-dajhan-1200.jpg', 'hour=12&f=640&date=dajhan&notes=0', { width: 1280, height: 800 }],
  [ES, 'docs/media/es-dajhan-tallies.jpg', 'hour=12&f=640&date=dajhan&notes=0&cam=5.5,190,250', { width: 1280, height: 800 }],
  [ES, 'docs/media/es-ac-2100.jpg', 'hour=21&f=640&ac=1&notes=0&cam=3.5,230,250', { width: 1280, height: 800 }],
  [
    ES,
    'docs/media/es-rule-card.jpg',
    'hour=12&f=640&notes=0',
    { width: 1280, height: 800 },
    async (page) => {
      await page.click('#estate [data-card="rule"]');
    },
  ],
  [ES, 'thumbs/estate.jpg', 'hour=15&f=400&notes=0&ui=0&cam=2.5,215,215', { width: 640, height: 400 }],
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
