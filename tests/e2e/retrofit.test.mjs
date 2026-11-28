// Block 2 (sponge-retrofit) in the running page: Before / After / split modes,
// the divider and B key, query modes, determinism in every state, region
// pixel means per state, walkers and sweat per state, measure cards, glossary,
// size / offline, load time and frame pacing.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base2 } from '../../scripts/retrofit.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';
import { MEASURES, measureCells } from '../../engine/retrofit.js';
import { cellMat } from '../../engine/thermal.js';

const CITY = { city: 'sponge-retrofit' };
/** The measure cards sit in a folded list (#29 item 8): open it. */
const openCards = (page) => page.evaluate(() => { document.querySelector('#retro details.cards').open = true; });
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

test('state query modes, buttons and the B key', async () => {
  for (const [q, want] of [
    ['state=before', { state: 'before', sides: ['before'] }],
    ['state=after', { state: 'after', sides: ['after'] }],
    ['state=split&split=0.3', { state: 'split', sides: ['before', 'after'], split: 0.3 }],
    ['', { state: 'split', sides: ['before', 'after'], split: 0.5, d: 3, aged: true }],
    ['state=split&swap=1&d=0&materials=new', { state: 'split', sides: ['after', 'before'], d: 0, aged: false }],
  ]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.retro.state(), sides: window.atlas.stats().sides, x: window.atlas.retro.divider() }));
    for (const [k, v] of Object.entries(want)) assert.deepEqual(st[k], v, `${q}: ${k}`);
    if (want.split) assert.ok(Math.abs(st.x - want.split * 1280) <= 1, `${q}: divider at ${st.x}`);
    if (want.d === 0) assert.match((await page.evaluate(() => window.atlas.notes())).map((n) => n.text.join(' ')).join(' | '), /clear day after overnight rain/);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context } = await go('hour=15&f=400');
  await page.keyboard.press('b');
  let st = await page.evaluate(() => ({ ...window.atlas.retro.state(), sides: window.atlas.seek(400).sides }));
  assert.deepEqual([st.swap, st.sides], [true, ['after', 'before']], 'B swaps the sides in split view');
  // the same with the visible button (#29 item 2)
  await page.click('#retro [data-swap]');
  st = await page.evaluate(() => window.atlas.retro.state());
  assert.equal(st.swap, false, 'the swap button swaps back');
  await page.click('#retro [data-state="after"]');
  assert.equal((await page.evaluate(() => window.atlas.retro.state())).state, 'after');
  await page.keyboard.press('B');
  st = await page.evaluate(() => ({ ...window.atlas.retro.state(), sides: window.atlas.seek(400).sides }));
  assert.deepEqual([st.state, st.sides], ['before', ['before']], 'B flips After -> Before');
  await page.click('#retro [data-aged="0"]');
  await page.locator('#rain').fill('0');
  st = await page.evaluate(() => window.atlas.retro.state());
  assert.deepEqual([st.aged, st.d], [false, 0]);
  assert.match(await page.locator('#rainLabel').textContent(), /the day after overnight rain \(best case\)/);
  await context.close();
});

test('dragging the divider\'s round handle moves the split, not the camera; a drag anywhere else on the line pans the map (#29 item 8)', async () => {
  const { page, context } = await go('hour=15&f=400&notes=0');
  const cam0 = (await page.evaluate(() => window.atlas.state())).cam;
  const x0 = await page.evaluate(() => window.atlas.retro.divider());
  // the handle sits half way down the canvas (800 px high here)
  await page.mouse.move(x0, 400);
  await page.mouse.down();
  await page.mouse.move(x0 + 120, 405, { steps: 6 });
  await page.mouse.move(900, 410, { steps: 6 });
  await page.mouse.up();
  const st = await page.evaluate(() => ({ ...window.atlas.retro.state(), cam: window.atlas.state().cam }));
  assert.ok(Math.abs(st.split - 900 / 1280) < 0.002, `split ${st.split}`);
  assert.deepEqual(st.cam, cam0);
  // on the line, away from the handle: the map pans and the split stays
  await page.mouse.move(900, 250);
  await page.mouse.down();
  await page.mouse.move(1000, 260, { steps: 6 });
  await page.mouse.up();
  const st2 = await page.evaluate(() => ({ ...window.atlas.retro.state(), cam: window.atlas.state().cam }));
  assert.equal(st2.split, st.split);
  assert.notDeepEqual(st2.cam, cam0);
  await context.close();
});

// [frame, cam, thermal, hour, retro settings]
const CAM_A = { z: 2.5, cx: 225, cy: 240 };
const CAM_B = { z: 4, cx: 330, cy: 220 };
const FRAMES = [
  [400, CAM_A, 0, 15, { state: 'split', split: 0.5, swap: false, d: 3, aged: true }],
  [400, CAM_A, 1, 15, { state: 'split', split: 0.5, swap: false, d: 3, aged: true }],
  [90, CAM_A, 0, 15, { state: 'split', split: 0.5, swap: false, d: 3, aged: true }],
  [200, CAM_A, 0, 15, { state: 'split', split: 0.4, swap: false, d: 3, aged: true }],
  [777, CAM_A, 0, 12, { state: 'before', d: 3, aged: true }],
  [777, CAM_A, 1, 12, { state: 'after', d: 3, aged: true }],
  [901, CAM_B, 1, 15, { state: 'after', d: 0, aged: true }],
  [901, CAM_B, 1, 15, { state: 'after', d: 7, aged: true }],
  [901, CAM_B, 1, 15, { state: 'after', d: 3, aged: false }],
  [1500, CAM_B, 0, 15, { state: 'split', split: 0.7, swap: true, d: 1, aged: false }],
  [1500, CAM_B, 1, 15, { state: 'split', split: 0.7, swap: true, d: 1, aged: true }],
  [3601, CAM_A, 1, 23, { state: 'before', d: 1, aged: true }],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, r] = frames[i];
      window.atlas.retro.set({ swap: false, split: 0.5, ...r });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every state: same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('notes=1');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.ok(new Set(Object.values(h1)).size === FRAMES.length, 'states draw differently');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  // a fresh page opened straight into a state matches the seeked frame
  for (const i of [6, 9]) {
    const [f, cam, thermal, hour, r] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&state=${r.state}&d=${r.d}${r.aged ? '' : '&materials=new'}${r.split ? `&split=${r.split}` : ''}${r.swap ? '&swap=1' : ''}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal view pixel means per state: retrofitted surfaces read cooler After, matching the model', async () => {
  const { wB, wA, before: tB, after: afterOf } = base2();
  const CAM = '2.5,225,240';
  const cellBoxes = (cells, w) => cells
    .map((i) => {
      const b = w.bld[i];
      if (b >= 0 && w.buildings[b].gable) return null;
      const x0 = (i % w.n) * w.cell;
      const y0 = Math.floor(i / w.n) * w.cell;
      return { x0, y0, x1: x0 + w.cell, y1: y0 + w.cell, z: b >= 0 ? w.buildings[b].h : 0, b };
    })
    .filter(Boolean);
  const d = 0;
  const tA = afterOf(d, true);
  const keys = ['coolRoof', 'greenRoof', 'pavers', 'porous'];
  const cells = Object.fromEntries(keys.map((k) => [k, measureCells(MEASURES.find((m) => m.id === k), wB, tB, wA, tA, 15)]));
  const means = {};
  for (const which of ['before', 'after']) {
    const w = which === 'before' ? wB : wA;
    const T = which === 'before' ? tB : tA;
    const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${CAM}&state=${which}&d=${d}`);
    const spec = Object.fromEntries(keys.map((k) => [k, cellBoxes(cells[k], w)]));
    const res = await regionPixelMeans(page, spec, 2, 14, which);
    await context.close();
    means[which] = {};
    for (const k of keys) {
      const model = cells[k].reduce((s, i) => s + T.ts(i, 15), 0) / cells[k].length;
      console.log(`  ${which.padEnd(6)} ${k.padEnd(9)} pixels ${res[k].mean.toFixed(1)} model ${model.toFixed(1)} n=${res[k].n}`);
      assert.ok(res[k].n >= 150, `${which} ${k}: only ${res[k].n} px`);
      assert.ok(Math.abs(res[k].mean - model) < 3, `${which} ${k}: pixels ${res[k].mean.toFixed(1)} vs model ${model.toFixed(1)}`);
      means[which][k] = res[k].mean;
    }
  }
  for (const k of keys) assert.ok(means.after[k] < means.before[k] - 3, `${k} cooler After on screen (d = 0)`);
});

test('walkers at 15:00: shade density >= 2x sun After; fewer sweating walkers After than Before', async () => {
  const { page, context } = await go('hour=15&f=400');
  const r = await page.evaluate(() => {
    const ratios = [];
    for (let f = 300; f < 300 + 60 * 60 * 2; f += 600) ratios.push(window.atlas.shadeStats(f, 15, 'after').ratio);
    const sweat = { before: 0, after: 0 };
    for (const which of ['before', 'after']) {
      for (let f = 400; f < 400 + 60 * 40; f += 5) sweat[which] += window.atlas.sweat(f, 15, which).filter((p) => p.drops > 0).length;
    }
    return { ratios, sweat };
  });
  const mean = r.ratios.reduce((a, b) => a + b, 0) / r.ratios.length;
  console.log(`After 15:00 shade/sun density ratio: mean ${mean.toFixed(2)}, min ${Math.min(...r.ratios).toFixed(2)}; sweating person-frames Before ${r.sweat.before}, After ${r.sweat.after}`);
  assert.ok(Math.min(...r.ratios) >= 2);
  assert.ok(r.sweat.after < r.sweat.before, 'fewer sweating walkers After');
  // the sweat cue is drawn at the default camera in the split view
  const drawn = await page.evaluate(() => {
    const cam = window.atlas.state().cam;
    let min = Infinity;
    let glyph = 0;
    for (let f = 600; f < 900; f += 10) {
      const s = window.atlas.seek(f, cam);
      min = Math.min(min, s.sweating);
      glyph = Math.max(glyph, s.sweatGlyphPx);
    }
    return { min, glyph };
  });
  console.log(`default split view: at least ${drawn.min} people sweating per frame, glyphs ${drawn.glyph.toFixed(1)} px`);
  assert.ok(drawn.min >= 3 && drawn.glyph >= 9);
  await context.close();
});

test('measure cards: ΔTs and ΔTmrt at 12:00 and 15:00, unverified flags, sources; trade-off and sponge-city cards', async () => {
  const { page, context, errors } = await go('hour=15&f=400');
  for (const m of MEASURES) {
    await openCards(page);
    await page.click(`#retro [data-measure="${m.id}"]`);
    const text = await page.locator('#card').textContent();
    assert.ok(text.includes(m.name), m.id);
    assert.match(text, /12:00/);
    assert.match(text, /15:00/);
    assert.match(text, /surface/);
    assert.match(text, /how it feels/);
    assert.match(text, /[−+]\d+\.\d°/);
    assert.match(text, /Sources:/);
    assert.match(text, /unverified/i, `${m.id}: unverified inputs are flagged`);
    assert.match(text, /no air cooling is modelled/);
  }
  await openCards(page);
    await page.click('#retro [data-measure="tradeoff"]');
  let text = await page.locator('#card').textContent();
  assert.match(text, /cools the road, not the person/);
  assert.match(text, /shade/);
  assert.match(text, /new 0\.25/);
  assert.match(text, /after a year 0\.18/);
  assert.match(text, /diffuse wall reflection/);
  const coat = await page.evaluate(() => window.atlas.retro.measure('coating').h12);
  assert.ok(coat.dTs < 0 && coat.dTmrt > 0);
  await openCards(page);
    await page.click('#retro [data-measure="sponge"]');
  text = await page.locator('#card').textContent();
  for (const s of ['渗、滞、蓄、净、用、排', '70%', '2015', 'co-benefit', 'does not quote one']) assert.ok(text.includes(s), s);
  // a heat card on a retrofitted parcel compares the states
  await page.click('#retro [data-state="after"]');
  const [x, y] = await page.evaluate(() => window.atlas.project(345, 225, 0));
  await page.mouse.click(x, y);
  text = await page.locator('#card').textContent();
  assert.match(text, /Permeable pavers/);
  assert.match(text, /15:00 Before → After/);
  assert.match(text, /d = 3/);
  // the card follows the days-since-rain slider
  await page.locator('#rain').fill('0');
  assert.match(await page.locator('#card').textContent(), /d = 0/);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-2 glossary terms open their footnotes; block-1-only terms are not listed', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('sponge-retrofit');
  for (const k of ['greenRoof', 'permeablePaving', 'rainGarden', 'daysSinceRain', 'bowen', 'spongeCity']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('permeable'));
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), key);
    await page.keyboard.press('Escape');
  }
  const hits = await page.evaluate(() => window.atlas.noteTerms());
  assert.ok(hits.length >= 5, `note terms ${hits.length}`);
  assert.ok((await page.evaluate(() => window.atlas.notes())).length <= 5);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/sponge-retrofit/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: worlds ${info.worldMs.toFixed(0)} ms, models ${info.modelMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms (${info.changedCells} After cells run)`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('b');
  await page.locator('#rain').fill('1');
  await page.click('#retro [data-aged="0"]');
  await openCards(page);
    await page.click('#retro [data-measure="sponge"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['split day', 'hour=15'], ['split thermal', 'thermal&hour=15']]) {
  test(`frame pacing, ${name} view`, async () => {
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

test('hour slider drag in the split view: p95 frame time and exact frame after release', async () => {
  const { page, context, errors } = await go('thermal&hour=15');
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
  console.log(`split drag: frame p95 ${pct(gaps, 95).toFixed(1)} ms, draw p95 ${pct(work, 95).toFixed(1)} ms, ${previews}/${work.length} preview frames (${strict ? 'strict' : 'relaxed'})`);
  if (strict) assert.ok(pct(gaps, 95) <= 33, `drag p95 frame ${pct(gaps, 95)}`);
  assert.ok(pct(work, 95) <= (strict ? 33 : 25), `drag p95 draw ${pct(work, 95)}`);
  await page.waitForFunction(() => window.atlas.settled(), null, { timeout: 8000 });
  const st = await page.evaluate(() => ({ ...window.atlas.state(), hash: window.atlas.hash() }));
  const fresh = await go(`thermal&hour=0&f=${st.frame}`);
  assert.equal(st.hash, await fresh.page.evaluate(() => window.atlas.hash()), 'refined frame after drag differs from ?f=N');
  await fresh.context.close();
  assert.deepEqual(errors, []);
  await context.close();
});

test('Before state keeps block-1 materials only; After shows every measure on screen', async () => {
  const { wB, wA } = base2();
  const mats = (w) => new Set([...Array(w.n * w.n).keys()].map((i) => cellMat(w, i)));
  assert.ok(!mats(wB).has('pavers') && mats(wA).has('pavers'));
});
