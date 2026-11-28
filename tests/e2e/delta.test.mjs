// The heat view coloured by surface minus air (#36): a diverging scale about
// the air temperature at the hour shown, the same limits on every block.
//  - 15:00 on block 1: tree shade, sunlit lawn and the pond are far from the
//    sunlit asphalt in colour, and the pond (model ΔT < 0) is on the blue side;
//  - 23:00: the open lawn below the air reads blue, the asphalt above it warm;
//  - the wash reads back (through the ΔT palette, keyed by air + ΔT) to the
//    model's surface temperature;
//  - the legend: air at the hour, cooler / hotter words, K ticks, the °C toggle
//    (button and ?scale=abs), and the toggle round-trips to the same pixels;
//  - the limits hold the model's spread on all 12 blocks at 15:00, 23:00, 4:00;
//  - heat cards keep °C and say how far above or below the air.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open, regionPixelMeans } from './helpers.mjs';
import { base, regions, cellsOf, regionMean } from '../../scripts/regions.mjs';
import { DT_STOPS } from '../../engine/thermal.js';

const CAM = '2.5,230,250';
const LO = DT_STOPS[0][0];
const HI = DT_STOPS.at(-1)[0];
const CITIES = ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate', 'campus', 'busstop', 'village', 'desert', 'nightmarket'];

let browser;
let W;
let M;
before(async () => {
  browser = await launch();
  ({ world: W, model: M } = base());
});
after(() => browser.close());

const cellsFor = (pred) => cellsOf(W, pred).map((i) => {
  const b = W.bld[i];
  if (b >= 0 && W.buildings[b].gable) return null;
  const x0 = (i % W.n) * W.cell;
  const y0 = Math.floor(i / W.n) * W.cell;
  return { x0, y0, x1: x0 + W.cell, y1: y0 + W.cell, z: b >= 0 ? W.buildings[b].h : 0, b };
}).filter(Boolean);

async function regionColours(hour, keys, query = '') {
  const R = regions(W, M);
  const spec = Object.fromEntries(keys.map((k) => [k, cellsFor(R[k])]));
  const { page, context } = await open(browser, `thermal&hour=${hour}&notes=0&people=0&f=400&cam=${CAM}${query}`);
  const rgb = await regionPixelMeans(page, spec, 2, 14, undefined, 'rgb');
  const temp = await regionPixelMeans(page, spec, 2, 14);
  await context.close();
  const out = {};
  for (const k of keys) {
    out[k] = { rgb: rgb[k].mean, px: temp[k].mean, model: regionMean(W, M, R[k], hour), n: rgb[k].n };
    const c = out[k].rgb.map((v) => v.toFixed(0)).join(',');
    console.log(`  ${hour}:00 ${k.padEnd(10)} rgb(${c})  model ΔT ${(out[k].model - M.air(hour)).toFixed(1)} K  read back ${(out[k].px - M.air(hour)).toFixed(1)} K  n=${out[k].n}`);
  }
  return out;
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('15:00, block 1: tree shade, lawn and pond stand apart from sunlit asphalt; the pond (below the air) is on the blue side', async () => {
  const keys = ['treeShade', 'grass', 'water', 'asphalt'];
  const c = await regionColours(15, keys);
  for (const k of keys) assert.ok(c[k].n >= 150, `${k}: only ${c[k].n} px`);
  for (const k of ['treeShade', 'grass', 'water']) {
    const d = dist(c[k].rgb, c.asphalt.rgb);
    console.log(`  ${k} vs asphalt: RGB distance ${d.toFixed(0)}`);
    assert.ok(d > 90, `${k} vs asphalt: RGB distance only ${d.toFixed(0)}`);
  }
  const air = M.air(15);
  assert.ok(c.water.model < air, 'the model has the pond below the air at 15:00');
  assert.ok(c.water.rgb[2] > c.water.rgb[0] + 30, `pond reads blue: rgb ${c.water.rgb.map(Math.round)}`);
  // tree shade sits at the air (ΔT ≈ 0): pale, near the paper, not hot
  assert.ok(Math.min(...c.treeShade.rgb) > 150, `tree shade pale: rgb ${c.treeShade.rgb.map(Math.round)}`);
  assert.ok(c.asphalt.rgb[0] > c.asphalt.rgb[2] + 50, 'asphalt reads warm');
  for (const k of keys) assert.ok(Math.abs(c[k].px - c[k].model) < 3, `${k}: reads back ${c[k].px.toFixed(1)} vs model ${c[k].model.toFixed(1)}`);
  // against the old absolute 18-70 °C scale (?scale=abs), tree shade and lawn stand further from the asphalt
  const a = await regionColours(15, keys, '&scale=abs');
  for (const k of ['treeShade', 'grass']) {
    const [dt, abs] = [dist(c[k].rgb, c.asphalt.rgb), dist(a[k].rgb, a.asphalt.rgb)];
    console.log(`  ${k} vs asphalt: RGB distance ${dt.toFixed(0)} on ΔT, ${abs.toFixed(0)} on the absolute scale`);
    assert.ok(dt > abs, `${k}: ΔT ${dt.toFixed(0)} not above absolute ${abs.toFixed(0)}`);
  }
});

test('23:00, block 1: the open lawn below the air reads blue, the asphalt above it warm (the night lag)', async () => {
  const c = await regionColours(23, ['openLawn', 'allAsphalt']);
  const air = M.air(23);
  assert.ok(c.openLawn.model < air && c.allAsphalt.model > air, 'model: lawn below, asphalt above the air');
  assert.ok(c.openLawn.rgb[2] > c.openLawn.rgb[0], `lawn on the blue side: rgb ${c.openLawn.rgb.map(Math.round)}`);
  assert.ok(c.allAsphalt.rgb[0] > c.allAsphalt.rgb[2] + 15, `asphalt on the warm side: rgb ${c.allAsphalt.rgb.map(Math.round)}`);
  assert.ok(c.openLawn.px < air && c.allAsphalt.px > air, 'read back: lawn below, asphalt above the air');
});

test('legend: air at the hour, cooler / hotter words, K ticks; the °C toggle (button and ?scale=abs) switches scale and palette and round-trips to the same pixels', async () => {
  const { page, context, errors } = await open(browser, 'thermal&hour=15&f=400&notes=0');
  const legend = () => page.evaluate(() => ({
    scale: window.atlas.scale(),
    cls: document.getElementById('legend').className,
    air: document.getElementById('legendAir').textContent,
    ticks: document.getElementById('legendTicks').textContent,
    vs: document.querySelector('#legend .vs').textContent,
    btn: document.getElementById('scaleBtn').textContent,
    pressed: document.getElementById('scaleBtn').getAttribute('aria-pressed'),
    vsShown: getComputedStyle(document.querySelector('#legend .vs')).display !== 'none',
    endsShown: getComputedStyle(document.querySelector('#legend .ends')).display !== 'none',
    p0: window.atlas.palette()[0][0],
  }));
  const a = await legend();
  assert.equal(a.scale, 'dt');
  assert.match(a.air, /15:00, 35\.0 °C/);
  assert.match(a.vs, /cooler than the air.*hotter than the air/);
  assert.match(a.ticks, /−8 K.*0.*\+10.*\+20.*\+30.*\+40 K/);
  assert.ok(a.vsShown && !a.endsShown && a.pressed === 'false' && a.btn === '°C scale', JSON.stringify(a));
  assert.equal(a.p0, 35 + LO);
  const h0 = await page.evaluate(() => window.atlas.hash());
  await page.click('#scaleBtn');
  const b = await legend();
  assert.equal(b.scale, 'abs');
  assert.ok(!b.vsShown && b.endsShown && b.pressed === 'true', JSON.stringify(b));
  assert.equal(b.p0, 18);
  const h1 = await page.evaluate(() => window.atlas.hash());
  assert.notEqual(h1, h0, 'the absolute scale draws other colours');
  // the hour moves: the air on the legend follows
  await page.evaluate(() => window.atlas.scale(true));
  await page.keyboard.press('h');
  await page.waitForFunction(() => window.atlas.settled());
  assert.match((await legend()).air, /16:00, /);
  await page.keyboard.press('H');
  await page.waitForFunction(() => window.atlas.settled());
  assert.equal(await page.evaluate(() => window.atlas.hash()), h0, 'back on ΔT: the same pixels as before the toggle');
  assert.deepEqual(errors, []);
  await context.close();
  const q = await open(browser, 'thermal&hour=15&f=400&notes=0&scale=abs');
  assert.equal(await q.page.evaluate(() => window.atlas.scale()), 'abs');
  assert.equal(await q.page.evaluate(() => window.atlas.hash()), h1, '?scale=abs draws as the toggle does');
  await q.context.close();
});

test(`the ΔT limits (${LO} / +${HI} K) hold the model's spread on all 12 blocks at 15:00, 23:00 and 4:00`, async () => {
  for (const city of CITIES) {
    const { page, context } = await open(browser, 'f=400&notes=0', { city });
    const rows = await page.evaluate(() => window.atlas.info.views.flatMap((v) => [15, 23, 4].map((h) => {
      const a = window.atlas.heatSpread(h, v);
      return { v, h, min: a[0], p99: a[Math.floor(0.99 * a.length)], max: a.at(-1) };
    })));
    await context.close();
    for (const r of rows) {
      console.log(`  ${city.padEnd(16)} ${r.v.padEnd(6)} ${String(r.h).padStart(2)}:00  min ${r.min.toFixed(1)}  p99 ${r.p99.toFixed(1)}  max ${r.max.toFixed(1)} K`);
      assert.ok(r.min >= LO, `${city} ${r.v} ${r.h}:00: coolest cell ${r.min.toFixed(1)} K below the ${LO} K limit`);
      assert.ok(r.p99 <= HI, `${city} ${r.v} ${r.h}:00: 99th percentile ${r.p99.toFixed(1)} K above the +${HI} K limit`);
    }
  }
});

test('heat cards keep °C and say how far above or below the air', async () => {
  const { page, context } = await open(browser, 'thermal&hour=15&f=400&notes=0&people=0');
  // open a real card by clicking the probe spot
  for (const [k, re] of [['asphalt', /\d+\.\d °C, \d+\.\d degrees hotter than the air \(35\.0 °C\)/], ['water', /\d+\.\d °C, \d+\.\d degrees cooler than the air \(35\.0 °C\)/]]) {
    const [x, y] = await page.evaluate((k) => window.atlas.project(...window.atlas.probes()[k].at), k);
    await page.mouse.click(x, y);
    await page.waitForSelector('#card p.lead');
    const lead = await page.locator('#card p.lead').textContent();
    console.log(`  ${k}: ${lead}`);
    assert.match(lead, re, k);
    await page.click('#card button.x');
  }
  await context.close();
});
