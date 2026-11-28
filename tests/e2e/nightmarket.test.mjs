// Block 12 (night market street) in the running page: it opens at 21:00;
// the heat given off (Q, button, ?heat=1) and the market open or closed (M,
// button, ?market=0) leave the model's values bit-identical; the heat-view
// button (T), the loading hint, determinism in every mode, thermal pixel
// means against the model, the cards (plain lead sentence, closed expert
// part, the misses stated), heat cards with the heat given off and the
// nearest grill, glossary, notes, the crowd and the cooks (sweat only at the
// grills after dark), size / offline / load time, frame pacing and the
// hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base12 } from '../../scripts/nightmarket.mjs';
import { NM, heatParts } from '../../engine/market.js';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'nightmarket' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base12();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });
const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/** Ground cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800), with no building or awning on or in front of them. */
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
    if (X < 300 || X > 1250 || Y < 200 || Y > 600) return false;
    if (B.world.canopy[i] > 0) return false;
    for (const b of [...B.world.buildings, ...B.world.screens.map((P) => ({ ...P, h: P.z }))]) {
      const lo = Math.max(b.x0 - x, b.y0 - y, 0);
      const hi = Math.min(b.x1 - x, b.y1 - y, 0.95 * b.h + 2.5);
      if (lo < hi) return false;
    }
    return true;
  });
}

test('opens at 21:00; Q and M, their buttons and ?heat=1 / ?market=0; the model values stay bit-identical whatever is shown; R still restarts the intro', async () => {
  const probe = (page) => page.evaluate((cells) => ({ probes: window.atlas.probes(21), cards: cells.map(([x, y]) => window.atlas.card('ground', x, y)).map((c) => [c.tsNow, c.tmrtNow]) }), [[200, 125], [62.5, 197.5], [102.5, 132.5]]);
  for (const [q, heat, open] of [['', false, true], ['heat=1', true, true], ['market=0', false, false], ['heat=1&market=0', true, false]]) {
    const { page, context, errors } = await go(`f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.market.state(), hour: window.atlas.state().hour, give: document.querySelector('#market [data-give]').getAttribute('aria-pressed'), openPressed: document.querySelector('#market [data-open]').getAttribute('aria-pressed'), stats: window.atlas.stats() }));
    assert.equal(st.hour, 21, q);
    assert.equal(st.heat, heat, q);
    assert.equal(st.open, open, q);
    assert.equal(st.give, String(heat));
    assert.equal(st.openPressed, String(open));
    assert.equal(st.stats.heatCells > 0, heat, `${q}: heat cells ${st.stats.heatCells}`);
    if (heat) assert.ok(/Shown, not felt/.test(st.stats.heatLabel) && /stalls/.test(st.stats.heatLabel), st.stats.heatLabel);
    assert.equal(st.stats.bulbs > 0, open, `${q}: bulbs ${st.stats.bulbs}`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('f=400');
  const v0 = await probe(page);
  const h0 = await page.evaluate(() => window.atlas.hash());
  await page.keyboard.press('q');
  await page.keyboard.press('m');
  assert.deepEqual(await page.evaluate(() => window.atlas.market.state()), { heat: true, open: false });
  assert.deepEqual(await probe(page), v0, 'Q and M leave the model untouched');
  await page.keyboard.press('Q');
  await page.click('#market [data-open]');
  assert.deepEqual(await page.evaluate(() => window.atlas.market.state()), { heat: false, open: true });
  await page.click('#heatBtn');
  assert.equal(await page.evaluate(() => window.atlas.state().thermal), true);
  await page.click('#heatBtn');
  await page.evaluate(() => window.atlas.seek(400));
  await page.keyboard.press('r');
  const rs = await page.evaluate(() => ({ frame: window.atlas.state().frame, ...window.atlas.market.state() }));
  assert.ok(rs.frame < 30 && rs.open && !rs.heat, JSON.stringify(rs));
  assert.equal(await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.hash();
  }), h0, 'toggled off and on again: the same pixels');
  await page.click('#market [data-give]');
  const hq = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.hash();
  });
  assert.notEqual(hq, h0);
  const fresh = await go('f=400&heat=1');
  assert.equal(await fresh.page.evaluate(() => window.atlas.hash()), hq, 'Q pressed = ?heat=1');
  await fresh.context.close();
  // the bars are the model's stone and the bookkeeping: the page's numbers equal the engine's, and add up
  const cells = await page.evaluate(() => window.atlas.market.heat(21));
  assert.equal(cells.length, B.world.nm.F.market.length);
  for (const c of cells.filter((_, k) => k % 7 === 0)) {
    const p = heatParts(B.world, B.T, c.i, 21);
    for (const k of ['stoneRad', 'stoneAir', 'crowd', 'stall', 'light']) assert.ok(Math.abs(c[k] - p[k]) < 1e-3, `${c.i} ${k}: ${c[k]} vs ${p[k]}`);
    assert.ok(Math.abs(c.total - (c.stoneRad + c.stoneAir + c.crowd + c.stall + c.light)) <= 1e-6);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('the loading hint (#29 item 3): shown while the pen draws and the washes come in, gone after', async () => {
  const { page, context } = await go('f=60');
  assert.equal(await page.evaluate(() => window.atlas.hint()), true);
  assert.ok(/Drawing the street/.test(await page.locator('#inkHint').textContent()));
  await page.evaluate(() => window.atlas.seek(400));
  assert.equal(await page.evaluate(() => window.atlas.hint()), false);
  await context.close();
  const ui = await go('f=60&ui=0');
  assert.equal(await ui.page.locator('#inkHint').isVisible(), false, 'hidden with ?ui=0');
  await ui.context.close();
});

const CAM_A = { z: 2.5, cx: 205, cy: 175 };
const CAM_B = { z: 7.5, cx: 245, cy: 192 };
const CAM_C = { z: 4, cx: 200, cy: 150 };
// [frame, cam, thermal, hour, heat, open]
const FRAMES = [
  [400, CAM_A, 0, 21, false, true],
  [401, CAM_A, 0, 21, false, true],
  [400, CAM_A, 1, 21, false, true],
  [1650, CAM_B, 0, 21, true, true],
  [3150, CAM_B, 1, 22, false, true],
  [900, CAM_C, 0, 17, true, true],
  [900, CAM_C, 1, 12, false, false],
  [2100, CAM_A, 0, 23.5, true, false],
  [777, CAM_B, 1, 19, true, true],
  [90, CAM_A, 0, 21, false, true],
  [1500, CAM_C, 1, 4, true, true],
  [3601, CAM_B, 0, 20.25, false, true],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, heat, open] = frames[i];
      window.atlas.market.set({ heat, open });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (heat given off, market open, heat view, intro): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('heat=1&market=0');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 4, 7, 8]) {
    const [f, cam, thermal, hour, heat, open] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&heat=${heat ? 1 : 0}&market=${open ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 21:00: the stone of the street and the open square read close to the model', async () => {
  const cam = '3,200,150';
  const F = B.world.nm.F;
  const square = visibleCells(F.ref, cam);
  const street = visibleCells([...F.aisle, ...F.south], cam);
  const run = async (spec) => {
    const { page, context } = await go(`thermal&notes=0&people=0&f=400&market=0&cam=${cam}`);
    const r = await regionPixelMeans(page, spec, 2, 14);
    await context.close();
    return r;
  };
  const r = await run({ square: boxes(square), street: boxes(street) });
  const mean = (cells) => cells.reduce((s, i) => s + B.T.ts(i, 21), 0) / cells.length;
  for (const [k, cells, got] of [['square', square, r.square], ['street', street, r.street]]) {
    console.log(`  ${k.padEnd(7)} pixels ${got.mean.toFixed(1)} (n ${got.n}) model ${mean(cells).toFixed(1)} (${cells.length} cells)`);
    assert.ok(got.n >= 300, `${k}: only ${got.n} px`);
    assert.ok(Math.abs(got.mean - mean(cells)) < 1.5, `${k}: pixels vs model`);
  }
});

test('cards: all seven open from the panel, each with a plain first sentence and a closed expert part; the misses stated; heat cards with the heat given off and the nearest grill', async () => {
  const ids = ['stone', 'crowd', 'stalls', 'lights', 'night', 'grill', 'hours'];
  const { page, context, errors } = await go('f=400');
  for (const id of ids) {
    await page.click(`#market [data-card="${id}"]`);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
    const lead = await page.locator('#card p.lead').textContent();
    assert.ok(lead.length > 40 && !/undefined|NaN/.test(lead), `${id}: ${lead}`);
    assert.equal(await page.locator('#card details.expert').getAttribute('open'), null, `${id}: expert part closed`);
    assert.equal(await page.locator('#card .src').isVisible(), false, `${id}: sources inside the closed part`);
    await page.locator('#card details.expert summary').click();
    assert.ok(await page.locator('#card .src').isVisible());
    assert.ok(/references\.html#nightmarket/.test(await page.locator('#card .src a').first().getAttribute('href')));
    await page.keyboard.press('Escape');
  }
  const html = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.atlas.market.html(id)])), ids);
  const st = B.st;
  assert.ok(html.grill.includes('outside the expected range') && html.grill.includes(st.grill.find((r) => r.d === 3).dT.toFixed(1)));
  assert.ok(html.stone.includes(String(Math.round(st.place.aisle[21].net))) && html.stone.includes('outside the expected range'));
  assert.ok(html.night.includes(Math.abs(st.place.ref[21].dTmrt).toFixed(1)));
  for (const h of Object.values(html)) assert.ok(!/https?:/.test(h));
  // heat cards: a grill's cell, the open square, an awning cell
  const g = B.world.nm.grills[4];
  const d = await page.evaluate(([gx, gy]) => [window.atlas.card('ground', gx, gy), window.atlas.card('ground', 200, 125), window.atlas.card('ground', 62.5, 187.5)], [g.x, g.y]);
  assert.ok(d[0].market && Math.abs(d[0].market.stall - (NM.charcoal.value * 1000) / 25) < 1e-9 && d[0].market.stalls.includes('grill'), JSON.stringify(d[0].market));
  assert.ok(d[0].market.grillD < 3 && d[0].market.grillDT > 0);
  assert.ok(d[1].market && d[1].market.light === NM.lights.value && d[1].market.stall === 0);
  assert.ok(d[2].market && d[2].market.crowd > 0);
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(([gx, gy]) => window.atlas.project(gx, gy, 0), [g.x + 2, g.y + 4]);
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/Heat given off here now/.test(t) && /the crowd/.test(t) && /granite/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-12 glossary terms open their footnotes; notes carry their terms and the model numbers in plain words', async () => {
  const { page, context } = await go('f=400');
  await page.click('#termsBtn');
  for (const key of termsFor('nightmarket')) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const P = B.st.place;
  const txt = (k) => notes.find((n) => n.key === k).text.join(' ');
  assert.ok(txt('stone').includes(`${P.aisle[21].dTs.toFixed(1)} degrees above the air`) && txt('stone').includes(String(Math.round(P.aisle[21].net))));
  assert.ok(txt('square').includes(`${Math.abs(P.ref[21].dTmrt).toFixed(1)} degrees cooler`));
  assert.ok(txt('grill').includes(`${Math.round(B.st.grill.find((r) => r.d === 1).tmrt)} °C`));
  for (const n of notes) assert.ok(!/\bK\b|Tmrt|albedo/.test(n.text.join(' ')), n.key);
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  // every label on screen at the opening view
  for (const h of await page.evaluate(() => window.atlas.noteTerms())) assert.ok(h.x >= 0 && h.x + h.w <= 1280 && h.y >= 0 && h.y <= 800, JSON.stringify(h));
  await context.close();
});

test('people: the crowd and the cooks while open, nobody but the cooks within 1.5 m of the coals; sweat after dark only at the grills; none of the crowd when closed or at 15:00', async () => {
  const { page, context } = await go('f=400');
  const w = await page.evaluate(([grills]) => {
    const out = { crowd: 0, cooks: 0, near: Infinity, sweatNight: 0, sweatNotGrill: 0, crowd15: 0 };
    const dist = (p) => Math.min(...grills.map(([x, y]) => Math.hypot(x - p.x, y - p.y)));
    for (let f = 400; f < 400 + 60 * 20; f += 20) {
      const c = window.atlas.market.crowd(f, 21);
      for (const p of c) {
        if (p.cook) out.cooks++;
        else {
          out.crowd++;
          out.near = Math.min(out.near, dist(p));
        }
      }
      for (const p of window.atlas.sweat(f, 21)) {
        if (p.drops > 0) {
          out.sweatNight++;
          if (!(dist(p) < 1.3 && p.tmrt >= 65)) out.sweatNotGrill++;
        }
      }
      out.crowd15 += window.atlas.market.crowd(f, 15).length;
    }
    return out;
  }, [B.world.nm.grills.map((g) => [g.x, g.y])]);
  console.log(`  crowd ${w.crowd}, cooks ${w.cooks}, nearest ${w.near.toFixed(2)} m, sweating after dark ${w.sweatNight} (away from a grill ${w.sweatNotGrill})`);
  assert.ok(w.crowd > 1000 && w.cooks > 0 && w.near >= NM.keepAway.value);
  assert.ok(w.sweatNight > 0 && w.sweatNotGrill === 0);
  assert.equal(w.crowd15, 0);
  const s = await page.evaluate(() => window.atlas.seek(400));
  assert.ok(s.people >= 150, `people ${s.people}`);
  await page.keyboard.press('m');
  const c = await page.evaluate(() => ({ n: window.atlas.market.crowd(400, 21).length, s: window.atlas.seek(400) }));
  assert.equal(c.n, 0);
  assert.ok(c.s.people < s.people && c.s.bulbs === 0 && c.s.rings === 0);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/nightmarket/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('q');
  await page.keyboard.press('m');
  await page.click('#market [data-card="grill"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

// an hour in the query opens the page after the intro (as the other blocks' pacing tests do)
for (const [name, query] of [['night', 'hour=21'], ['thermal', 'thermal&hour=21'], ['heat given off', 'hour=21&heat=1'], ['day', 'hour=15']]) {
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

for (const [name, query] of [['night', 'hour=21'], ['thermal', 'thermal&hour=21'], ['heat given off', 'hour=21&heat=1']]) {
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
    const fresh = await go(`${query.replace('hour=21', 'hour=0')}&f=${st.frame}`);
    assert.equal(st.hash, await fresh.page.evaluate(() => window.atlas.hash()), 'refined frame after drag differs from ?f=N');
    await fresh.context.close();
    assert.deepEqual(errors, []);
    await context.close();
  });
}
