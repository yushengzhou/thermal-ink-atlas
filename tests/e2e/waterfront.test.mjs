// Block 4 (waterfront) in the running page: wind-line and air-overlay toggles
// (W, A, buttons, ?wind=, ?air=), speed presets (?u=), determinism in every
// mode, the wind-line hash against Node, thermal pixel means (sheltered vs
// exposed asphalt at 15:00, the warm pond at 04:00), walkers, cards, heat
// card wind rows, glossary, size / offline / load time, frame pacing and the
// hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base4 } from '../../scripts/waterfront.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';
import { cellMat } from '../../engine/thermal.js';
import { asphaltContrast, lineStats, parcelCells } from '../../engine/waterfront.js';

const CITY = { city: 'waterfront' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base4();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/** Cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800) and not hidden behind a building or a tree crown. */
function visibleCells(cells, cam) {
  const [z, cx, cy] = cam.split(',').map(Number);
  const C = 0.8660254;
  const ox = Math.round(640 - (cx - cy) * C * z);
  const oy = Math.round(400 - (cx + cy) * 0.5 * z);
  return cells.filter((i) => {
    const x = ((i % B.world.n) + 0.5) * B.world.cell;
    const y = (Math.floor(i / B.world.n) + 0.5) * B.world.cell;
    const X = ox + (x - y) * C * z;
    const Y = oy + (x + y) * 0.5 * z;
    if (X < 20 || X > 1260 || Y < 20 || Y > 780) return false;
    if (B.world.canopy[i] > 0) return false;
    for (const b of B.world.buildings) {
      const lo = Math.max(b.x0 - x, b.y0 - y, 0);
      const hi = Math.min(b.x1 - x, b.y1 - y, 0.95 * b.h);
      if (lo < hi) return false;
    }
    return true;
  });
}

test('wind lines and air overlay: W, A, buttons and ?wind= / ?air=; speed presets ?u=', async () => {
  for (const [q, want] of [['', { wind: true, air: false, u: 3 }], ['wind=0', { wind: false, air: false, u: 3 }], ['wind=1&air=1', { wind: true, air: true, u: 3 }], ['u=1', { wind: true, air: false, u: 1 }], ['u=3', { wind: true, air: false, u: 3 }], ['u=7', { wind: true, air: false, u: 3 }]]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.wind.state(), stats: window.atlas.stats(), pressed: document.querySelector('#wind [aria-pressed="true"][data-u]').dataset.u }));
    assert.deepEqual({ wind: st.wind, air: st.air, u: st.u }, want, q);
    assert.equal(Number(st.pressed), want.u);
    assert.equal(st.stats.windDashes > 0, want.wind, `${q}: dashes`);
    assert.equal(st.stats.airSegs > 0, want.air, `${q}: overlay`);
    if (want.wind) assert.ok(st.stats.windLabels.some((l) => l.includes('assumed direction × shelter factor, not computed flow')), 'wind label');
    if (want.air) assert.ok(st.stats.windLabels.some((l) => l.includes('illustrative, from literature, not simulated')), 'air label');
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=15&f=400');
  await page.keyboard.press('w');
  assert.equal((await page.evaluate(() => window.atlas.wind.state())).wind, false, 'W hides the lines');
  await page.keyboard.press('W');
  await page.keyboard.press('a');
  assert.deepEqual(await page.evaluate(() => window.atlas.wind.state()), { wind: true, air: true, u: 3 });
  await page.click('#wind [data-u="1"]');
  assert.equal((await page.evaluate(() => window.atlas.wind.state())).u, 1);
  await page.click('#wind [data-lines]');
  await page.click('#wind [data-air]');
  assert.deepEqual(await page.evaluate(() => window.atlas.wind.state()), { wind: false, air: false, u: 1 });
  assert.deepEqual(errors, []);
  await context.close();
});

test('wind lines: the page traces the same lines as Node (hash), none inside a building', async () => {
  const want = lineStats(B.world, B.setup.lines());
  const { page, context } = await go('hour=15&f=400');
  const got = await page.evaluate(() => window.atlas.wind.lines());
  assert.equal(got.hash, want.hash);
  assert.equal(got.inside, 0);
  assert.equal(got.verts, want.verts);
  await context.close();
});

const CAM_A = { z: 2, cx: 205, cy: 205 };
const CAM_B = { z: 4.5, cx: 130, cy: 160 };
// [frame, cam, thermal, hour, {wind, air, u}]
const FRAMES = [
  [400, CAM_A, 0, 15, { wind: true, air: false, u: 3 }],
  [401, CAM_A, 0, 15, { wind: true, air: false, u: 3 }],
  [400, CAM_A, 1, 15, { wind: true, air: false, u: 3 }],
  [400, CAM_A, 0, 15, { wind: false, air: false, u: 3 }],
  [400, CAM_A, 0, 15, { wind: true, air: false, u: 1 }],
  [777, CAM_B, 1, 15, { wind: true, air: true, u: 3 }],
  [777, CAM_B, 1, 4, { wind: true, air: true, u: 1 }],
  [90, CAM_A, 0, 15, { wind: true, air: false, u: 3 }],
  [1500, CAM_B, 0, 9, { wind: false, air: true, u: 3 }],
  [3601, CAM_A, 1, 4, { wind: true, air: false, u: 3 }],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, w] = frames[i];
      window.atlas.wind.set(w);
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode: same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 11) / 11, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('u=1&air=1');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other (dashes move, toggles show)');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [4, 6, 8]) {
    const [f, cam, thermal, hour, w] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&u=${w.u}&wind=${w.wind ? 1 : 0}${w.air ? '&air=1' : ''}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('switching the wind preset and back returns the exact frame of a fresh page', async () => {
  const { page, context } = await go('thermal&hour=15&f=400');
  const h = await page.evaluate(() => {
    window.atlas.wind.set({ u: 1 });
    window.atlas.seek(400);
    window.atlas.wind.set({ u: 3 });
    window.atlas.seek(400);
    return window.atlas.hash();
  });
  await context.close();
  const f = await go('thermal&hour=15&f=400&u=3');
  assert.equal(await f.page.evaluate(() => window.atlas.hash()), h);
  await f.context.close();
});

test('thermal 15:00 (3 m/s): sheltered sunlit asphalt reads hotter than exposed asphalt, close to the model', async () => {
  const T = B.setup.model(3);
  const ac = asphaltContrast(B.world, T, 15);
  const cam = '2,205,205';
  const c = { sheltered: visibleCells(ac.sheltered.cells, cam), exposed: visibleCells(ac.exposed.cells, cam) };
  const { page, context } = await go(`thermal&hour=15&notes=0&people=0&wind=0&f=400&cam=${cam}`);
  const res = await regionPixelMeans(page, { sheltered: boxes(c.sheltered), exposed: boxes(c.exposed) }, 2, 14);
  await context.close();
  for (const k of ['sheltered', 'exposed']) {
    const model = c[k].reduce((s, i) => s + T.ts(i, 15), 0) / c[k].length;
    console.log(`  ${k.padEnd(9)} pixels ${res[k].mean.toFixed(1)} (n ${res[k].n}) model ${model.toFixed(1)} (${c[k].length} cells)`);
    assert.ok(res[k].n >= 150, `${k}: only ${res[k].n} px`);
    assert.ok(Math.abs(res[k].mean - model) < 3, `${k}: pixels vs model`);
  }
  assert.ok(res.sheltered.mean > res.exposed.mean + 4, 'sheltered asphalt reads hotter');
});

test('thermal 04:00: the still pond reads warmer than the garden lawn; the river cooler than the sunlit promenade at 15:00', async () => {
  const T = B.setup.model(3);
  const pond = [];
  const lawn = [];
  for (let i = 0; i < B.world.n * B.world.n; i++) {
    if (B.world.bld[i] >= 0) continue;
    const m = cellMat(B.world, i);
    if (m === 'pond') pond.push(i);
    if (m === 'grass' && B.world.canopy[i] === 0) lawn.push(i);
  }
  const cam = '3,205,212';
  const c = { pond: visibleCells(pond, cam), lawn: visibleCells(lawn, cam) };
  const { page, context } = await go(`thermal&hour=4&notes=0&people=0&wind=0&f=400&cam=${cam}`);
  const res = await regionPixelMeans(page, { pond: boxes(c.pond), lawn: boxes(c.lawn) }, 2, 14);
  await context.close();
  for (const k of ['pond', 'lawn']) {
    const model = c[k].reduce((s, i) => s + T.ts(i, 4), 0) / c[k].length;
    console.log(`  ${k.padEnd(5)} 04:00 pixels ${res[k].mean.toFixed(1)} (n ${res[k].n}) model ${model.toFixed(1)}`);
    assert.ok(res[k].n >= 100, `${k}: only ${res[k].n} px`);
    assert.ok(Math.abs(res[k].mean - model) < 2, `${k}: pixels vs model`);
  }
  assert.ok(res.pond.mean > res.lawn.mean + 1, 'pond reads warmer than the lawn at 04:00');
  const river = visibleCells(parcelCells(B.world, ['river']), '2,205,205').slice(0, 400);
  const prom = visibleCells(parcelCells(B.world, ['promenade']).filter((i) => T.sunlit(i, 15) > 0.95), '2,205,205');
  const d = await go('thermal&hour=15&notes=0&people=0&wind=0&f=400&cam=2,205,205');
  const r2 = await regionPixelMeans(d.page, { river: boxes(river), prom: boxes(prom) }, 2, 14);
  await d.context.close();
  assert.ok(r2.river.mean < r2.prom.mean - 10, `river ${r2.river.mean} vs promenade ${r2.prom.mean}`);
});

test('walkers at 15:00 take the tree-shaded, breezy riverside over sunny, sheltered Rope Walk', async () => {
  const { page, context } = await go('hour=15&f=400');
  const w = await page.evaluate(() => window.atlas.wind.walkers(400, 15));
  const ri = w.routes.indexOf('stroll');
  console.log(`  stroll costs riverside ${w.costs[ri][0].toFixed(1)} vs Rope Walk ${w.costs[ri][1].toFixed(1)}; f_w at walkers ${w.fw.toFixed(3)}`);
  assert.ok(w.costs[ri][0] < w.costs[ri][1]);
  await context.close();
});

test('cards: river, pond at night, corridor, sheltered street, riverside shade; heat card shows f_w, u and h_c', async () => {
  const { page, context, errors } = await go('hour=15&f=400');
  for (const id of ['river', 'pond', 'corridor', 'shelter', 'shade']) {
    await page.click(`#wind [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t) && /°C|K/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
  }
  const html = await page.evaluate(() => ({ r: window.atlas.wind.html('river'), p: window.atlas.wind.html('pond'), s: window.atlas.wind.html('shelter'), c: window.atlas.wind.html('corridor'), sh: window.atlas.wind.html('shade') }));
  assert.ok(html.r.includes('Hathway') && html.r.includes('Cheonggyecheon') && html.r.includes('Jacobs') && html.r.includes('unverified'));
  assert.ok(html.p.includes('Solcerova') && html.p.includes('Steeneveld'));
  assert.ok(html.c.includes('Ota River') && html.c.includes('30°'));
  assert.ok(html.s.includes('1.6–2.6') && html.s.includes('outside the brief'), 'shelter card discloses the band miss');
  assert.ok(html.sh.includes('PET') && html.sh.includes('UTCI'));
  const d = await page.evaluate(() => [window.atlas.card('ground', 62.5, 157.5), window.atlas.card('ground', 132.5, 312.5), window.atlas.card('building', 'a1')]);
  assert.ok(d[0].wind.fw < 0.45 && d[1].wind.fw > 1.1, 'sheltered vs corridor f_w');
  assert.ok(Math.abs(d[0].wind.hc - (5.7 + 3.8 * 3 * d[0].wind.fw)) < 1e-3);
  assert.equal(d[2].wind.fw, 1, 'roofs f_w = 1');
  await page.keyboard.press('Escape');
  const [x, y] = await page.evaluate(() => window.atlas.project(200, 157.5, 0)); // Rope Walk, mid-screen
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/wind factor f_w/.test(t) && /convection h_c/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-4 glossary terms open their footnotes; notes and their terms', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('waterfront');
  for (const k of ['windFactor', 'ventilationCorridor', 'fetch', 'sheltering', 'apparentTemp']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('curtainWall') && !keys.includes('greenRoof'));
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.ok(notes.length === 5);
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/waterfront/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, sun slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, wind lines ${info.linesMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('a');
  await page.click('#wind [data-u="1"]');
  await page.click('#wind [data-card="river"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15&air=1']]) {
  test(`frame pacing with wind lines, ${name} view`, async () => {
    const { page, context } = await go(query);
    await page.evaluate(() => window.atlas.perf(30));
    const { gaps, draws } = await page.evaluate(() => window.atlas.perf(300));
    const fps = 1000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length);
    console.log(`${name}: mean ${fps.toFixed(1)} fps, p95 frame ${pct(gaps, 95).toFixed(1)} ms, draw p95 ${pct(draws, 95).toFixed(2)} ms (${strict ? 'strict' : 'relaxed'})`);
    if (strict) {
      assert.ok(fps >= 59.4, `mean fps ${fps}`);
      assert.ok(pct(gaps, 95) <= 33);
    } else {
      assert.ok(fps >= 30);
      assert.ok(pct(draws, 95) <= 33);
    }
    await context.close();
  });
}

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15']]) {
  test(`hour slider drag, ${name} view: p95 frame time and exact frame after release`, async () => {
    const { page, context, errors } = await go(query);
    await page.evaluate(() => window.atlas.perf(30));
    const { gaps, work, previews } = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const s = document.getElementById('hour');
          const steps = [];
          for (let k = 0; k < 96; k++) steps.push(k * 0.25);
          for (let k = 95; k >= 0; k--) steps.push(k * 0.25);
          const gaps = [];
          const work = [];
          let previews = 0;
          let prev = null;
          let k = 0;
          s.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          const step = (t) => {
            if (prev !== null) {
              gaps.push(t - prev);
              const st = window.atlas.stats();
              work.push(st.frameMs);
              if (st.preview) previews++;
            }
            prev = t;
            if (k === steps.length) {
              s.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
              s.dispatchEvent(new Event('change', { bubbles: true }));
              resolve({ gaps, work, previews });
              return;
            }
            s.value = String(steps[k++]);
            s.dispatchEvent(new Event('input', { bubbles: true }));
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
    );
    console.log(`${name} drag: frame p95 ${pct(gaps, 95).toFixed(1)} ms, draw p95 ${pct(work, 95).toFixed(1)} ms, ${previews}/${work.length} preview frames (${strict ? 'strict' : 'relaxed'})`);
    if (strict) assert.ok(pct(gaps, 95) <= 33, `drag p95 frame ${pct(gaps, 95)}`);
    assert.ok(pct(work, 95) <= (strict ? 33 : 25), `drag p95 draw ${pct(work, 95)}`);
    await page.waitForFunction(() => window.atlas.settled(), null, { timeout: 8000 });
    const st = await page.evaluate(() => ({ ...window.atlas.state(), hash: window.atlas.hash() }));
    const fresh = await go(`${query.replace('hour=15', 'hour=0')}&f=${st.frame}`);
    assert.equal(st.hash, await fresh.page.evaluate(() => window.atlas.hash()), 'refined frame after drag differs from ?f=N');
    await fresh.context.close();
    assert.deepEqual(errors, []);
    await context.close();
  });
}
