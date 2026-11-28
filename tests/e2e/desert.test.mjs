// Block 11 (desert courtyard neighbourhood) in the running page: the street
// coating (C, button, ?coat=0) and the water overlay (L, button, ?water=1),
// the heat-view button (T), the loading hint, determinism in every mode,
// thermal pixel means (the watered lawn against sunlit gravel, the coated
// street with and without its coating), the cards (plain lead sentence,
// closed expert part, the misses stated), heat cards for a sail, the lawn,
// the coated street and a house, glossary, notes, walkers and sweat,
// size / offline / load time, frame pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base11 } from '../../scripts/desert.mjs';
import { DS_STREET } from '../../engine/dskit.js';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'desert' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base11();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/** Ground cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800), with no building, screen or crown on or in front of them. */
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
    for (const t of B.world.trees) if (Math.hypot(t.x - x, t.y - y) < t.r + 2.5 + t.zc) return false;
    return true;
  });
}

test('street coating and water used: coating on by default, ?coat=0 and ?water=1, keys C and L, the buttons; R still restarts the intro; the layer repainted, the street re-modelled; the wash and its label', async () => {
  const main = B.world.ds.F.main;
  for (const [q, coat, water] of [['', true, false], ['coat=0', false, false], ['water=1', true, true], ['coat=0&water=1', false, true]]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate((i) => ({ ...window.atlas.desert.state(), pressed: document.querySelector('#desert [data-coat]').getAttribute('aria-pressed'), stats: window.atlas.stats(), rgb: window.atlas.desert.coatRgb(), card: window.atlas.card('ground', ((i % 80) + 0.5) * 5, (Math.floor(i / 80) + 0.5) * 5) }), main[40]);
    assert.equal(st.coat, coat, q);
    assert.equal(st.water, water, q);
    assert.equal(st.pressed, String(coat));
    assert.equal(st.rgb.join(), (coat ? DS_STREET.coated : DS_STREET.bare).join());
    const M = coat ? B.T : B.U;
    assert.ok(Math.abs(st.card.ts15 - M.ts(main[40], 15)) < 1e-4, `${q}: ${st.card.ts15}`);
    assert.equal(st.stats.water > 0, water, `water ${st.stats.water}`);
    if (water) assert.ok(/litres per m² a day/.test(st.stats.waterLabel) && st.stats.waterLabel.includes(B.st.lawn.evap.toFixed(1)), st.stats.waterLabel);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=15&f=400');
  const h0 = await page.evaluate(() => window.atlas.hash());
  await page.keyboard.press('c');
  await page.keyboard.press('l');
  assert.deepEqual(await page.evaluate(() => window.atlas.desert.state()), { coat: false, water: true });
  await page.keyboard.press('C');
  await page.click('#desert [data-water]');
  assert.deepEqual(await page.evaluate(() => window.atlas.desert.state()), { coat: true, water: false });
  // the heat-view button is T
  await page.click('#heatBtn');
  assert.equal(await page.evaluate(() => window.atlas.state().thermal), true);
  await page.click('#heatBtn');
  assert.equal(await page.evaluate(() => window.atlas.state().thermal), false);
  // R restarts the intro on this page as everywhere
  await page.evaluate(() => window.atlas.seek(400));
  await page.keyboard.press('r');
  const rs = await page.evaluate(() => ({ frame: window.atlas.state().frame, ...window.atlas.desert.state() }));
  assert.ok(rs.frame < 30 && rs.coat, JSON.stringify(rs));
  // toggled off and on again: the same pixels as before
  assert.equal(await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.hash();
  }), h0);
  await page.click('#desert [data-coat]');
  const hc = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.hash();
  });
  assert.notEqual(hc, h0);
  const fresh = await go('hour=15&f=400&coat=0');
  assert.equal(await fresh.page.evaluate(() => window.atlas.hash()), hc, 'C pressed = ?coat=0');
  await fresh.context.close();
  assert.deepEqual(errors, []);
  await context.close();
});

test('the loading hint (#29 item 3): shown while the pen draws and the washes come in, gone after; the canvas is the same either way', async () => {
  const { page, context } = await go('hour=15&f=60');
  assert.equal(await page.evaluate(() => window.atlas.hint()), true);
  assert.ok(/Drawing the block/.test(await page.locator('#inkHint').textContent()));
  await page.evaluate(() => window.atlas.seek(400));
  assert.equal(await page.evaluate(() => window.atlas.hint()), false);
  await page.evaluate(() => window.atlas.seek(60));
  assert.equal(await page.evaluate(() => window.atlas.hint()), true);
  await context.close();
  const ui = await go('hour=15&f=60&ui=0');
  assert.equal(await ui.page.locator('#inkHint').isVisible(), false, 'hidden with ?ui=0');
  await ui.context.close();
});

const CAM_A = { z: 2, cx: 230, cy: 180 };
const CAM_B = { z: 5, cx: 280, cy: 60 };
const CAM_C = { z: 4, cx: 150, cy: 190 };
// [frame, cam, thermal, hour, coat, water]
const FRAMES = [
  [400, CAM_A, 0, 15, true, false],
  [401, CAM_A, 0, 15, true, false],
  [400, CAM_A, 1, 15, true, false],
  [1650, CAM_B, 0, 15, false, false],
  [3150, CAM_B, 1, 15, false, true],
  [900, CAM_C, 0, 21, true, true],
  [900, CAM_C, 1, 12, false, false],
  [2100, CAM_A, 0, 17, true, true],
  [777, CAM_B, 1, 22, true, false],
  [90, CAM_A, 0, 15, false, true],
  [1500, CAM_C, 1, 4, false, true],
  [3601, CAM_A, 0, 8.5, true, false],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, coat, water] = frames[i];
      window.atlas.desert.set({ coat, water });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (coating, water overlay, heat view, intro): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('coat=0&water=1');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 4, 5, 9]) {
    const [f, cam, thermal, hour, coat, water] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&coat=${coat ? 1 : 0}&water=${water ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 15:00: the watered lawn reads far cooler than sunlit gravel; the coated street cooler than bare; all close to the model', async () => {
  const cam = '2.5,290,240';
  const F = B.world.ds.F;
  const lawn = visibleCells(F.lawn, cam);
  const gravel = visibleCells(F.gravel.filter((i) => B.T.sunlit(i, 15) > 0.95), cam);
  const main = visibleCells(F.main.filter((i) => B.T.sunlit(i, 15) > 0.95), cam);
  const run = async (q, spec) => {
    const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${cam}${q}`);
    const r = await regionPixelMeans(page, spec, 2, 14);
    await context.close();
    return r;
  };
  const r = await run('', { lawn: boxes(lawn), gravel: boxes(gravel), main: boxes(main) });
  const rb = await run('&coat=0', { main: boxes(main) });
  const mean = (cells, M) => cells.reduce((s, i) => s + M.ts(i, 15), 0) / cells.length;
  for (const [k, cells, got, M] of [['lawn', lawn, r.lawn, B.T], ['gravel', gravel, r.gravel, B.T], ['coated', main, r.main, B.T], ['bare', main, rb.main, B.U]]) {
    console.log(`  ${k.padEnd(7)} pixels ${got.mean.toFixed(1)} (n ${got.n}) model ${mean(cells, M).toFixed(1)} (${cells.length} cells)`);
    assert.ok(got.n >= 300, `${k}: only ${got.n} px`);
    assert.ok(Math.abs(got.mean - mean(cells, M)) < 1.5, `${k}: pixels vs model`);
  }
  assert.ok(r.gravel.mean > r.lawn.mean + 15, `${r.gravel.mean} ${r.lawn.mean}`);
  assert.ok(rb.main.mean > r.main.mean + 5, `${rb.main.mean} ${r.main.mean}`);
});

test('cards: all eight open from the panel, each with a plain first sentence and a closed expert part; the misses stated; heat cards for a sail, the lawn, the coated street and a house', async () => {
  const ids = ['design', 'sails', 'arcade', 'lawn', 'mist', 'coat', 'dry', 'deaths'];
  const { page, context, errors } = await go('hour=15&f=400');
  for (const id of ids) {
    await page.click(`#desert [data-card="${id}"]`);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
    const lead = await page.locator('#card p.lead').textContent();
    assert.ok(lead.length > 40 && !/undefined|NaN/.test(lead), `${id}: ${lead}`);
    const ex = page.locator('#card details.expert');
    assert.equal(await ex.getAttribute('open'), null, `${id}: expert part closed`);
    assert.equal(await page.locator('#card .src').isVisible(), false, `${id}: sources inside the closed part`);
    await page.locator('#card details.expert summary').click();
    assert.ok(await page.locator('#card .src').isVisible(), `${id}: sources open`);
    assert.ok(/references\.html#desert/.test(await page.locator('#card .src a').first().getAttribute('href')));
    await page.keyboard.press('Escape');
  }
  const html = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.atlas.desert.html(id)])), ids);
  const st = B.st;
  assert.ok(html.sails.includes('outside the measured range') && html.sails.includes(Math.abs(st.shade.sail[15].d).toFixed(1)));
  assert.ok(html.coat.includes(st.coat[15].dTmrt.toFixed(1)) && html.coat.includes('outside the measured range'));
  assert.ok(html.lawn.includes(st.lawn.evap.toFixed(1)) && html.lawn.includes(st.gravel.ts15.toFixed(1)));
  assert.ok(/not calculate/.test(html.mist) && /Vanos/.test(html.mist));
  assert.ok(/645/.test(html.deaths) && /430/.test(html.deaths));
  for (const h of Object.values(html)) assert.ok(!/https?:/.test(h));
  // heat cards: under a sail, the lawn, the coated street, a house wing
  const F = B.world.ds.F;
  const c = (i) => [((i % B.world.n) + 0.5) * 5, (Math.floor(i / B.world.n) + 0.5) * 5];
  const d = await page.evaluate(([s, l, m]) => [window.atlas.card('ground', ...s), window.atlas.card('ground', ...l), window.atlas.card('ground', ...m), window.atlas.card('building', 'nw95_2n')], [c(F.sail[3]), c(F.lawn[20]), c(F.main[30])]);
  assert.ok(d[0].desert && d[0].desert.over && d[0].desert.over.kind === 'sail' && d[0].desert.over.tr === 0.15, JSON.stringify(d[0].desert));
  assert.ok(d[1].desert && Math.abs(d[1].desert.water - B.T.evaporation(F.lawn[20])) < 1e-6, JSON.stringify(d[1].desert));
  assert.ok(d[2].desert && d[2].desert.coat && d[2].desert.coat.tsBare > d[2].desert.coat.ts, JSON.stringify(d[2].desert));
  assert.ok(d[3].desert && d[3].desert.wall);
  // a heat card opened by a click on the lawn
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(() => window.atlas.project(305, 270, 0));
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/water evaporated a day/.test(t) && /bermudagrass/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-11 glossary terms open their footnotes; notes carry their terms and the model numbers in plain words', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('desert');
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const st = B.st;
  const txt = (k) => notes.find((n) => n.key === k).text.join(' ');
  assert.ok(txt('lawn').includes(`${st.lawn.ts15.toFixed(1)} °C`) && txt('lawn').includes(st.lawn.evap.toFixed(1)));
  assert.ok(txt('sail').includes(`${Math.round(-st.shade.sail[15].d)} degrees cooler`));
  assert.ok(txt('arcade').includes(`${Math.round(-st.shade.arcade[15].d)} degrees cooler`));
  assert.ok(txt('street').includes(`${st.coat[15].dTmrt.toFixed(1)} degrees hotter`));
  assert.ok(txt('plaza').includes(`${st.gravel.ts15.toFixed(1)} °C`));
  for (const n of notes) assert.ok(!/\bK\b|Tmrt|albedo/.test(n.text.join(' ')), n.key);
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('people: walkers drawn, sweat only on hot sunlit people, none at night', async () => {
  const { page, context } = await go('hour=15&f=400');
  const w = await page.evaluate(() => {
    const out = { sweating: 0, bad: 0, night: 0 };
    for (let f = 400; f < 400 + 60 * 20; f += 10) {
      for (const p of window.atlas.sweat(f, 15)) {
        if (p.drops > 0) {
          out.sweating++;
          if (!(p.tmrt >= 65 && p.shade === 0 && p.sunlit >= 0.5)) out.bad++;
        }
      }
      out.night += window.atlas.sweat(f, 21).filter((p) => p.drops > 0 || p.fan).length;
    }
    return out;
  });
  console.log(`  sweating ${w.sweating}, outside hot sun ${w.bad}, at night ${w.night}`);
  assert.ok(w.sweating > 0 && w.bad === 0 && w.night === 0);
  const s = await page.evaluate(() => window.atlas.seek(400));
  assert.ok(s.people >= 20, `people ${s.people}`);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/desert/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('c');
  await page.keyboard.press('l');
  await page.click('#desert [data-card="coat"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['bare street + water', 'hour=15&coat=0&water=1']]) {
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

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['bare street + water', 'hour=15&coat=0&water=1']]) {
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
