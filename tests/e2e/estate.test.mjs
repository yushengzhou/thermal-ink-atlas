// Block 7 (older high-rise estate) in the running page: the 大寒 view (S,
// buttons, ?date=) and the condenser overlay (C, button, ?ac=), the plume
// wall term (?acwall=0), determinism in every mode, thermal pixel means
// (sunlit paving at the sills vs the lawn at 15:00), the cards, heat cards
// with the condenser rows, glossary, notes, walkers and sweat, size /
// offline / load time, frame pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base7 } from '../../scripts/estate.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'estate' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base7();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/** Ground cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800), with no building or crown on or in front of them. */
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
    if (X < 30 || X > 1250 || Y < 160 || Y > 600) return false;
    if (B.world.canopy[i] > 0) return false;
    for (const b of B.world.buildings) {
      const lo = Math.max(b.x0 - x, b.y0 - y, 0);
      const hi = Math.min(b.x1 - x, b.y1 - y, 0.95 * b.h + 2.5);
      if (lo < hi) return false;
    }
    return true;
  });
}

test('大寒 view and condensers: default off, ?date= and ?ac=, keys S and C, the buttons; shadows, tallies, plumes and labels drawn', async () => {
  for (const [q, season, ac] of [['', 'jul', false], ['date=dajhan', 'dajhan', false], ['date=jul&ac=1', 'jul', true], ['date=dajhan&ac=1', 'dajhan', true]]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.estate.state(), body: document.body.dataset.season, pressed: document.querySelector('#estate [data-ac]').getAttribute('aria-pressed'), stats: window.atlas.stats() }));
    assert.equal(st.season, season, q);
    assert.equal(st.condensers, ac, q);
    assert.equal(st.body, season);
    assert.equal(st.pressed, String(ac));
    assert.equal(st.acWall, true, 'the plume wall term is on by default');
    assert.equal(st.stats.tallies === 96, season === 'dajhan', `tallies ${st.stats.tallies}`);
    assert.equal(st.stats.winterPolys > 10, season === 'dajhan');
    assert.equal(st.stats.plumes > 100, ac, `plumes ${st.stats.plumes}`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=15&f=400');
  await page.keyboard.press('s');
  assert.equal((await page.evaluate(() => window.atlas.estate.state())).season, 'dajhan', 'S turns the 大寒 view on');
  await page.keyboard.press('S');
  assert.equal((await page.evaluate(() => window.atlas.estate.state())).season, 'jul');
  await page.keyboard.press('c');
  assert.equal((await page.evaluate(() => window.atlas.estate.state())).condensers, true);
  await page.keyboard.press('C');
  await page.click('#estate [data-season="dajhan"]');
  await page.click('#estate [data-ac]');
  const s = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.stats();
  });
  assert.ok(/geometry only/.test(s.winterLabel) && /20 July/.test(s.winterLabel) && /rule ≥ 2 h/.test(s.winterLabel), s.winterLabel);
  assert.ok(/does not feel them/.test(s.plumeLabel) && /watts per m²/.test(s.plumeLabel), s.plumeLabel);
  assert.equal(s.faceLabels > 6, true);
  // more plumes at 21:00 (every flat's AC on) than at 09:00
  const n = await page.evaluate(() => [21, 9].map((h) => {
    window.atlas.look({ hour: h });
    window.atlas.seek(400);
    return window.atlas.stats().plumes;
  }));
  assert.ok(n[0] > 2 * n[1], `plumes ${n}`);
  // before sunrise on 大寒 the label says the sun is down, and no shadows are drawn
  const night = await page.evaluate(() => {
    window.atlas.look({ hour: 6 });
    window.atlas.seek(400);
    return window.atlas.stats();
  });
  assert.ok(night.winterPolys === 0 && /sun is down/.test(night.winterLabel));
  assert.deepEqual(errors, []);
  await context.close();
});

test('the plume wall term: ?acwall=0 and the API switch it; Tmrt drops a little, surface temperatures do not move', async () => {
  const { page, context, errors } = await go('hour=21&f=400');
  const r = await page.evaluate(() => {
    const E = window.atlas.estate;
    const on = [E.tmrt(72.5, 152.5, 21), E.ts(72.5, 152.5, 21), E.plume(72.5, 152.5)];
    E.set({ acWall: false });
    const off = [E.tmrt(72.5, 152.5, 21), E.ts(72.5, 152.5, 21)];
    E.set({ acWall: true });
    return { on, off };
  });
  assert.ok(r.on[2] > 0, 'a north-face path cell sees condenser walls');
  assert.ok(r.on[0] > r.off[0] && r.on[0] - r.off[0] < 1, `Tmrt ${r.on[0]} vs ${r.off[0]}`);
  assert.equal(r.on[1], r.off[1], 'Ts');
  await context.close();
  const b = await go('hour=21&f=400&acwall=0');
  assert.equal((await b.page.evaluate(() => window.atlas.estate.state())).acWall, false);
  const t = await b.page.evaluate(() => window.atlas.estate.tmrt(72.5, 152.5, 21));
  assert.ok(Math.abs(t - r.off[0]) < 1e-9);
  assert.deepEqual(errors, []);
  await b.context.close();
});

const CAM_A = { z: 1.75, cx: 165, cy: 165 };
const CAM_B = { z: 4, cx: 70, cy: 200 };
// [frame, cam, thermal, hour, season, condensers]
const FRAMES = [
  [400, CAM_A, 0, 15, 'jul', false],
  [401, CAM_A, 0, 15, 'jul', false],
  [400, CAM_A, 1, 15, 'jul', false],
  [400, CAM_A, 0, 15, 'dajhan', false],
  [400, CAM_A, 0, 12, 'dajhan', true],
  [430, CAM_A, 0, 12, 'dajhan', true],
  [400, CAM_A, 1, 21, 'jul', true],
  [777, CAM_B, 1, 20, 'dajhan', true],
  [777, CAM_B, 0, 9.25, 'dajhan', false],
  [90, CAM_A, 0, 15, 'dajhan', true],
  [1500, CAM_B, 1, 4, 'jul', true],
  [3601, CAM_A, 0, 19, 'jul', false],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, season, condensers] = frames[i];
      window.atlas.estate.set({ season, condensers });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (season, condensers): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('date=dajhan&ac=1');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 4, 7, 10]) {
    const [f, cam, thermal, hour, season, condensers] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&date=${season}&ac=${condensers ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 15:00: the sunlit paving at the sills reads far hotter than the lawn, both close to the model', async () => {
  const cam = '3,240,230';
  const pave = visibleCells(B.C.sillStrip, cam);
  const lawn = visibleCells(B.C.lawn, cam);
  const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${cam}`);
  const r = await regionPixelMeans(page, { pave: boxes(pave), lawn: boxes(lawn) }, 2, 14);
  await context.close();
  for (const [k, cells] of [['pave', pave], ['lawn', lawn]]) {
    const model = cells.reduce((s, i) => s + B.T.ts(i, 15), 0) / cells.length;
    console.log(`  ${k.padEnd(4)} pixels ${r[k].mean.toFixed(1)} (n ${r[k].n}) model ${model.toFixed(1)} (${cells.length} cells)`);
    assert.ok(r[k].n >= 300, `${k}: only ${r[k].n} px`);
    assert.ok(Math.abs(r[k].mean - model) < 1.5, `${k}: pixels vs model`);
  }
  assert.ok(r.pave.mean > r.lawn.mean + 8, `paving ${r.pave.mean} vs lawn ${r.lawn.mean}`);
});

test('cards: winter spacing (with the section), July courtyard, towers, condensers, lawns; heat cards show the condenser rows', async () => {
  const { page, context, errors } = await go('hour=15&f=400');
  for (const id of ['rule', 'court', 'towers', 'ac', 'lawn']) {
    await page.click(`#estate [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN|Infinity/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t) && /°C|K|h|m/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
  }
  const html = await page.evaluate(() => Object.fromEntries(['rule', 'court', 'towers', 'ac', 'lawn'].map((id) => [id, window.atlas.estate.html(id)])));
  const st = await page.evaluate(() => window.atlas.estate.stats());
  assert.ok(html.rule.includes('<svg') && !/https?:/.test(html.rule) && html.rule.includes('Spacing made for winter sun leaves summer courtyards open'));
  assert.ok(html.rule.includes(`${st.jul.alt.toFixed(1)}°`) && html.rule.includes(`${st.jan.alt.toFixed(1)}°`) && html.rule.includes('unverified'));
  assert.ok(html.court.includes('Lai') && html.court.includes('north faces'));
  assert.ok(html.ac.includes('Changsha') && html.ac.includes('Bruelisauer') && html.ac.includes(`${st.qRej.toFixed(1)} kW`) && html.ac.includes('not changed'));
  assert.ok(html.lawn.includes('9.87 K') && html.lawn.includes('irrigated'));
  assert.ok(html.towers.includes('midwinter'));
  const d = await page.evaluate(() => [window.atlas.card('ground', 72.5, 152.5), window.atlas.card('building', 'slab2a'), window.atlas.card('building', 'shops1')]);
  assert.ok(d[0].estate && d[0].estate.p > 0 && d[0].estate.dT > 0, `path: ${JSON.stringify(d[0].estate)}`);
  assert.ok(d[1].estate && d[1].estate.flats === 144 && d[1].estate.rule.min >= 2, `slab: ${JSON.stringify(d[1].estate)}`);
  assert.equal(d[2].estate, null, 'shops: no condensers counted');
  // click a slab in view: the heat card shows the condenser and sill rows
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(() => window.atlas.project(300, 355, 30));
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/condensers now/.test(t) && /midwinter sun at the sills/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-7 glossary terms open their footnotes; notes carry their terms and the model numbers', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('estate');
  for (const k of ['sunlightRule', 'effectiveHeight', 'spacingCoefficient', 'condenserHeat', 'eer']) assert.ok(keys.includes(k), k);
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const st = await page.evaluate(() => window.atlas.estate.stats());
  const sill = notes.find((n) => n.key === 'sill').text.join(' ');
  assert.ok(sill.includes(`${st.ruleMin.toFixed(1)}–`), sill);
  assert.ok(notes.find((n) => n.key === 'ac').text.join(' ').includes(`${Math.round(st.peak.wm2)} watts per m²`));
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('walkers at 15:00 keep to the shade; sweat only on hot sunlit cells, none at 23:00', async () => {
  const { page, context } = await go('hour=15&f=400');
  const s = await page.evaluate(() => window.atlas.shadeStats(400, 15));
  assert.ok(s.ratio > 2, `shade density ratio ${s.ratio}`);
  const r = await page.evaluate(() => {
    const out = { sweating: 0, bad: 0, night: 0 };
    for (let f = 400; f < 400 + 60 * 20; f += 10) {
      for (const p of window.atlas.sweat(f, 15)) {
        if (p.drops > 0) {
          out.sweating++;
          if (!(p.tmrt >= 65 && p.shade === 0 && p.sunlit >= 0.5)) out.bad++;
        }
      }
      out.night += window.atlas.sweat(f, 23).filter((p) => p.drops > 0 || p.fan).length;
    }
    return out;
  });
  console.log(`  sweating ${r.sweating}, outside hot sun ${r.bad}, at night ${r.night}`);
  assert.ok(r.sweating > 0 && r.bad === 0 && r.night === 0);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/estate/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, rule ${info.ruleMs.toFixed(0)} ms, sun slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('s');
  await page.keyboard.press('c');
  await page.click('#estate [data-card="rule"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['大寒 + condensers', 'hour=15&date=dajhan&ac=1']]) {
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

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['大寒 + condensers', 'hour=15&date=dajhan&ac=1']]) {
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
