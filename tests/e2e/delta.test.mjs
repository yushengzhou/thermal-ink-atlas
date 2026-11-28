// The heat view coloured by surface minus air (#36): a diverging scale about
// the air temperature at the hour shown, the same limits on every block.
//  - 15:00 on block 1: tree shade, sunlit lawn and the pond are far from the
//    sunlit asphalt in colour, and the pond (model ΔT < 0) is on the blue side;
//  - 23:00: the open lawn below the air reads blue, the asphalt above it warm;
//  - the wash reads back (through the ΔT palette, keyed by air + ΔT) to the
//    model's surface temperature;
//  - the legend: plain degrees (no K), air at the hour, cooler / hotter words,
//    the two-slope bar with its "stretched" note, walls not calculated, the
//    toggle (button and ?scale=abs) round-trips to the same pixels, and it
//    cannot be reached while the heat view is off;
//  - tick labels never overlap (desktop, and phones at 375 and 390 px), where
//    the legend is a small chip that opens on a tap;
//  - walls (not calculated) are hatched grey, in neither palette;
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
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/** CIELAB (D65) of an sRGB colour. */
const lab = (rgb) => {
  const [r, g, b] = rgb.map(lin);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const X = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const Y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const Z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
};
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

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
  // the pond against the asphalt: less far than on the absolute scale (a stated trade-off, docs/sources.md),
  // but still far apart, and clearly apart in CIELAB (hue carries the sign; the lightness is about the same)
  const [pDt, pAbs] = [dist(c.water.rgb, c.asphalt.rgb), dist(a.water.rgb, a.asphalt.rgb)];
  const pE = dE(c.water.rgb, c.asphalt.rgb);
  console.log(`  water vs asphalt: RGB distance ${pDt.toFixed(0)} on ΔT, ${pAbs.toFixed(0)} on the absolute scale; CIELAB ΔE ${pE.toFixed(0)}`);
  assert.ok(pDt > 85 && pE > 40, `pond vs asphalt: RGB ${pDt.toFixed(0)}, ΔE ${pE.toFixed(0)}`);
  assert.ok(lab(c.water.rgb)[2] < -5 && lab(c.asphalt.rgb)[2] > 10, `pond blue (b* < -5): ${lab(c.water.rgb)[2].toFixed(1)}, asphalt warm (b* > 10): ${lab(c.asphalt.rgb)[2].toFixed(1)}`);
});

test('23:00, block 1: the open lawn below the air reads blue, the asphalt above it warm (the night lag)', async () => {
  const c = await regionColours(23, ['openLawn', 'allAsphalt']);
  const air = M.air(23);
  assert.ok(c.openLawn.model < air && c.allAsphalt.model > air, 'model: lawn below, asphalt above the air');
  // CIELAB: the lawn's b* below zero (blue side; the paper at the air is b* +12), the asphalt's well above the paper's
  const [lawn, asph] = [lab(c.openLawn.rgb), lab(c.allAsphalt.rgb)];
  console.log(`  lawn Lab ${lawn.map((v) => v.toFixed(1))}, asphalt Lab ${asph.map((v) => v.toFixed(1))}`);
  assert.ok(lawn[2] < -1.5, `lawn on the blue side: b* ${lawn[2].toFixed(1)}`);
  assert.ok(asph[2] > 15, `asphalt on the warm side: b* ${asph[2].toFixed(1)}`);
  assert.ok(dE(c.openLawn.rgb, c.allAsphalt.rgb) > 15, 'night lawn and asphalt apart');
  assert.ok(c.openLawn.px < air && c.allAsphalt.px > air, 'read back: lawn below, asphalt above the air');
});

test('legend: plain degrees, air at the hour, cooler / hotter words, two-slope bar and its note, walls; the toggle (button and ?scale=abs) switches scale and palette, round-trips to the same pixels, and is out of reach with the heat view off', async () => {
  const { page, context, errors } = await open(browser, 'thermal&hour=15&f=400&notes=0');
  const legend = () => page.evaluate(() => {
    const L = document.getElementById('legend');
    const shown = (sel) => getComputedStyle(L.querySelector(sel)).display !== 'none';
    return {
      scale: window.atlas.scale(),
      text: L.innerText,
      title: L.querySelector('.hand').textContent,
      air: document.getElementById('legendAir').textContent,
      ticks: [...document.querySelectorAll('#legendTicks span')].map((e) => [e.textContent, parseFloat(e.style.left)]),
      bar: document.getElementById('legendBar').style.background,
      btn: document.getElementById('scaleBtn').textContent,
      pressed: document.getElementById('scaleBtn').getAttribute('aria-pressed'),
      vs: shown('.vs'), ends: shown('.ends'), note: shown('.lx'), walls: shown('.lw') && /walls: not calculated/.test(L.querySelector('.lw').textContent),
      p0: window.atlas.palette()[0][0],
    };
  });
  const a = await legend();
  assert.equal(a.scale, 'dt');
  assert.match(a.title, /how much hotter or cooler than the air \(°C\)/);
  assert.equal(a.air, '0 = the air at 15:00, 35.0 °C');
  assert.match(a.text, /cooler than the air/);
  assert.match(a.text, /hotter than the air/);
  assert.match(a.text, /blue side stretched: small cooling shows/);
  assert.doesNotMatch(a.text, /\bK\b/, 'no K on the page');
  // honest ticks on two equal halves: -8 at 0 %, -4 at 25 %, 0 at 50 %, +10 at 62.5 %, ... +40 at 100 %
  assert.deepEqual(a.ticks, [['−8', 0], ['−4', 25], ['0', 50], ['+10', 62.5], ['+20', 75], ['+30', 87.5], ['+40', 100]]);
  assert.match(a.bar, / 50%/, 'the bar puts 0 at its middle');
  assert.ok(a.vs && !a.ends && a.note && a.walls && a.pressed === 'false' && a.btn === 'show plain °C', JSON.stringify(a));
  assert.equal(a.p0, 35 + LO);
  const h0 = await page.evaluate(() => window.atlas.hash());
  await page.click('#scaleBtn');
  const b = await legend();
  assert.equal(b.scale, 'abs');
  assert.match(b.title, /surface temperature \(°C\)/);
  assert.ok(!b.vs && b.ends && !b.note && b.walls && b.pressed === 'true' && b.btn === 'compare with the air', JSON.stringify(b));
  assert.equal(b.p0, 18);
  const h1 = await page.evaluate(() => window.atlas.hash());
  assert.notEqual(h1, h0, 'the absolute scale draws other colours');
  // the hour moves: the air on the legend follows
  await page.evaluate(() => window.atlas.scale(true));
  await page.keyboard.press('h');
  await page.waitForFunction(() => window.atlas.settled());
  assert.match((await legend()).air, /^0 = the air at 16:00, /);
  await page.keyboard.press('H');
  await page.waitForFunction(() => window.atlas.settled());
  assert.equal(await page.evaluate(() => window.atlas.hash()), h0, 'back on ΔT: the same pixels as before the toggle');
  // heat view off: the hidden legend can be neither focused nor clicked
  await page.keyboard.press('t');
  await page.waitForTimeout(100);
  const off = await page.evaluate(() => {
    const L = document.getElementById('legend');
    const btn = document.getElementById('scaleBtn');
    btn.focus();
    const r = btn.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { inert: L.inert, focused: document.activeElement === btn, hit: L.contains(hit) };
  });
  assert.deepEqual(off, { inert: true, focused: false, hit: false });
  assert.equal(await page.evaluate(() => window.atlas.scale()), 'dt');
  assert.deepEqual(errors, []);
  await context.close();
  const q = await open(browser, 'thermal&hour=15&f=400&notes=0&scale=abs');
  assert.equal(await q.page.evaluate(() => window.atlas.scale()), 'abs');
  assert.equal(await q.page.evaluate(() => window.atlas.hash()), h1, '?scale=abs draws as the toggle does');
  await q.context.close();
});

/** Boxes of the visible tick labels; throws if two overlap or one leaves the legend. */
async function tickBoxes(page) {
  return page.evaluate(() => {
    const L = document.getElementById('legend').getBoundingClientRect();
    const r = [...document.querySelectorAll('#legendTicks span')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => {
      const b = e.getBoundingClientRect();
      return { t: e.textContent, x0: b.left, x1: b.right };
    });
    const bad = [];
    for (let k = 1; k < r.length; k++) if (r[k].x0 < r[k - 1].x1 + 2) bad.push(`${r[k - 1].t} / ${r[k].t}`);
    for (const b of r) if (b.x0 < L.left || b.x1 > L.right) bad.push(`${b.t} outside`);
    return { ticks: r.map((b) => b.t), bad, legend: [L.width, L.height].map(Math.round) };
  });
}

for (const [w, h] of [[1280, 800], [375, 667], [390, 844]]) {
  test(`legend ticks do not overlap at ${w} px${w < 700 ? '; on a phone the legend is a small chip that opens on a tap' : ''}`, async () => {
    const { page, context } = await open(browser, 'thermal&hour=15&f=400&notes=0', { viewport: { width: w, height: h }, touch: w < 700 });
    const t = await tickBoxes(page);
    console.log(`  ${w} px: ticks ${t.ticks.join(' ')}, legend ${t.legend.join(' × ')} px`);
    assert.deepEqual(t.bad, [], `${w} px: overlapping ticks`);
    if (w < 700) {
      assert.deepEqual(t.ticks, ['−8', '0', '+20', '+40']);
      // the cooler / hotter words stay on one line each, and the chip stays small
      const vs = await page.evaluate(() => [...document.querySelectorAll('#legend .vs span')].map((e) => e.getClientRects().length));
      assert.deepEqual(vs, [1, 1]);
      assert.ok(t.legend[1] < 90 && t.legend[0] <= 210, `chip ${t.legend}`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#legend .lw')).display), 'none');
      await page.tap('#legendAir');
      const open1 = await page.evaluate(() => ({ open: document.getElementById('legend').classList.contains('open'), walls: getComputedStyle(document.querySelector('#legend .lw')).display !== 'none' }));
      assert.deepEqual(open1, { open: true, walls: true });
      assert.deepEqual((await tickBoxes(page)).bad, []);
    } else assert.deepEqual(t.ticks, ['−8', '−4', '0', '+10', '+20', '+30', '+40']);
    await context.close();
  });
}

test('walls (not calculated) are hatched neutral grey in the heat view, on both scales: their colour is in neither palette', async () => {
  for (const q of ['', '&scale=abs']) {
    const { page, context } = await open(browser, `thermal&hour=15&f=400&notes=0&people=0${q}`, { city: 'glass-cbd' });
    const res = await page.evaluate(() => {
      const A = window.atlas;
      const c = document.getElementById('atlas');
      const g = c.getContext('2d');
      const lut = A.palette();
      // the middle of each opaque building's south face (not hidden by a nearer box), sampled over a 9 px square
      const out = [];
      const boxes = A.boxes();
      for (const [k, b] of boxes.entries()) {
        if (b.kind !== 'b') continue;
        const [x0, , x1, y1, , z1] = b.box;
        const [px, py] = A.project((x0 + x1) / 2, y1, z1 / 2).map(Math.round);
        if (px < 20 || py < 20 || px > c.width - 20 || py > c.height - 20) continue;
        const front = boxes.slice(k + 1).some(({ box: [a0, b0, a1, b1, c0, c1] }) => {
          const pts = [[a0, b0, c0], [a1, b1, c1], [a0, b1, c1], [a1, b0, c0]].map(([x, y, z]) => A.project(x, y, z));
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          return px > Math.min(...xs) - 4 && px < Math.max(...xs) + 4 && py > Math.min(...ys) - 4 && py < Math.max(...ys) + 4;
        });
        if (front) continue;
        const d = g.getImageData(px - 4, py - 4, 9, 9).data;
        const m = [0, 0, 0];
        for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) m[j] += d[i + j] / 81;
        const near = Math.min(...lut.map(([, p]) => Math.hypot(p[0] - m[0], p[1] - m[1], p[2] - m[2])));
        out.push({ b: b.b, rgb: m.map(Math.round), near: Math.round(near), max: Math.max(...d.filter((_, i) => i % 4 < 3)), min: Math.min(...d.filter((_, i) => i % 4 < 3)) });
      }
      return out;
    });
    await context.close();
    const glassFree = res.filter((r) => Math.max(...r.rgb) - Math.min(...r.rgb) < 6); // opaque walls: the neutral grey; glass faces take palette colours
    console.log(`  glass-cbd${q || ' (ΔT)'}: ${res.length} south faces sampled, ${glassFree.length} grey: ${glassFree.slice(0, 4).map((r) => `rgb(${r.rgb}) ${r.near} from the palette`).join('; ')}`);
    assert.ok(glassFree.length >= 3, 'some opaque walls in view');
    for (const r of glassFree) assert.ok(r.near > 8, `wall of building ${r.b}: rgb(${r.rgb}) only ${r.near} from a palette colour`);
  }
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
  for (const [k, re] of [['asphalt', /\d+\.\d\s°C, \d+\.\d degrees hotter than the air \(35\.0\s°C\)/], ['water', /\d+\.\d\s°C, \d+\.\d degrees cooler than the air \(35\.0\s°C\)/]]) {
    const [x, y] = await page.evaluate((k) => window.atlas.project(...window.atlas.probes()[k].at), k);
    await page.mouse.click(x, y);
    await page.waitForSelector('#card p.lead');
    const lead = await page.locator('#card p.lead').textContent();
    console.log(`  ${k}: ${lead}`);
    assert.match(lead, re, k);
    // numbers and units never split: "63.4 / 30.9 °C" and "now / 3 pm" stay on one line
    const split = await page.evaluate(() => [...document.querySelectorAll('#card td')].filter((td) => /°C|now \/|[ap]m/.test(td.textContent)).map((td) => td.innerHTML).filter((h) => / °C| \/ |\d [ap]m/.test(h)));
    assert.deepEqual(split, [], 'breakable spaces in card values');
    await page.click('#card button.x');
  }
  await context.close();
});

test('glass-cbd: the legend says glass façades are calculated (only there), and the glass cards give the façade temperatures at the hour shown', async () => {
  const { page, context } = await open(browser, 'thermal&hour=15&f=640&notes=0', { city: 'glass-cbd' });
  const note = await page.evaluate(() => getComputedStyle(document.querySelector('#legend .lw'), '::after').content);
  assert.equal(note, '"glass façades: calculated"');
  for (const g of ['clear', 'lowe', 'mirror']) {
    await page.click(`#glass [data-card="glass-${g}"]`);
    await page.waitForSelector('#card h3');
    const t = await page.locator('#card').innerText();
    const m = /At 15:00 this glass on the Exchange Tower is (\d+\.\d)\s°C on the south face and (\d+\.\d)\s°C on the east face.*?(\d+\.\d)\s°C on the west face, with the air at 35\.0\s°C/.exec(t);
    assert.ok(m, `${g}: ${t.slice(0, 400)}`);
    const card = await page.evaluate(() => window.atlas.card('building', 't3'));
    console.log(`  ${g}: south ${m[1]}, east ${m[2]}, west ${m[3]} °C (air 35.0)`);
    assert.ok(+m[1] >= 35 && +m[2] >= 35 && +m[3] > +m[1], `${g}: the sunlit west face is the warmest`);
    if (g === 'lowe') assert.equal(m[1], card.glass.faces.find((f) => f.face === 'S').tg.toFixed(1), 'the card and the building card agree (default glass)');
    await page.click('#card button.x');
  }
  await context.close();
  const o = await open(browser, 'thermal&hour=15&f=400&notes=0');
  assert.equal(await o.page.evaluate(() => getComputedStyle(document.querySelector('#legend .lw'), '::after').content), 'none');
  await o.context.close();
});
