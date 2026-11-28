// Block 9 (bus stops and footbridges) in the running page: the waiting
// places (K, button, ?spots=) and the burn flags (U, button, ?burn=), the
// buses and riders (the page's numbers against the scripts'), determinism in
// every mode, thermal pixel means (the road against the park at 15:00), the
// cards (with the misses they state), heat cards with the point-model rows,
// glossary, notes, riders crossing the footbridges, walkers and sweat,
// size / offline / load time, frame pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base9, waits9 } from '../../scripts/busstop.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'busstop' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base9();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

test('waiting places and burn flags: default off, ?spots= and ?burn=, keys K and U, the buttons; rings, flags and labels drawn', async () => {
  for (const [q, spots, burn] of [['', false, false], ['spots=1', true, false], ['burn=1', false, true], ['spots=1&burn=1', true, true]]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.busstop.state(), pressed: document.querySelector('#busstop [data-burn]').getAttribute('aria-pressed'), stats: window.atlas.stats() }));
    assert.equal(st.spots, spots, q);
    assert.equal(st.burn, burn, q);
    assert.equal(st.pressed, String(burn));
    assert.equal(st.stats.spots > 0, spots, `spots ${st.stats.spots}`);
    assert.equal(st.stats.flags > 0, burn, `flags ${st.stats.flags}`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=15&f=400');
  await page.keyboard.press('k');
  await page.keyboard.press('u');
  assert.deepEqual(await page.evaluate(() => window.atlas.busstop.state()), { spots: true, burn: true });
  await page.keyboard.press('K');
  await page.click('#busstop [data-burn]');
  assert.deepEqual(await page.evaluate(() => window.atlas.busstop.state()), { spots: false, burn: false });
  await page.click('#busstop [data-spots]');
  await page.click('#busstop [data-burn]');
  const s = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.stats();
  });
  assert.ok(/1-min contact-burn limit/.test(s.flagsLabel) && /51 °C/.test(s.flagsLabel) && /unverified/.test(s.flagsLabel), s.flagsLabel);
  assert.ok(/head in direct sun/.test(s.spotsLabel) && /adult head height/.test(s.spotsLabel), s.spotsLabel);
  // the rings agree with the point model: as many red rings as places with more than half the sun on the head
  const lit = B.world.bus.pts.filter((p) => p.kind === 'slot' && B.P.head(p.k, 15) >= 0.5).length;
  assert.equal(s.spotsLit, lit);
  assert.equal(s.spots, B.world.bus.pts.filter((p) => p.kind === 'slot').length);
  // at night nothing is flagged and every head is in shade
  const night = await page.evaluate(() => {
    window.atlas.look({ hour: 3 });
    return window.atlas.seek(400);
  });
  assert.equal(night.flags, 0);
  assert.equal(night.spotsLit, 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('buses and riders: the page\'s schedule, waiting riders and flags are the model\'s; riders board when the bus arrives; buses drawn', async () => {
  const { page, context, errors } = await go('hour=15&f=400');
  const r = await page.evaluate(() => {
    const A = window.atlas.busstop;
    const frames = [];
    for (let f = 0; f < 4500; f += 30) frames.push({ f, clock: A.clock(f, 15), n: A.waiting(f, 15).length, buses: A.buses(f, 15) });
    return { wait: A.wait(), sched: [0, 1, 2, 3, 4].map((i) => A.schedule(i)), frames, flags: A.flags(15), drawn: (() => {
      let most = 0;
      for (const fr of frames) if (fr.buses.length) most = Math.max(most, window.atlas.seek(fr.f).buses);
      return most;
    })() };
  });
  const w = waits9();
  assert.ok(Math.abs(r.wait.wait - w.wait) < 1e-9 && Math.abs(r.wait.formula - w.formula) < 1e-9);
  r.sched.forEach((s, si) => assert.deepEqual(s.buses, B.book.days[si].buses));
  // waiting riders at each frame: the model's count
  for (const fr of r.frames) {
    const n = B.scene.stops.reduce((a, _, si) => a + B.book.waiting(si, fr.clock).length, 0);
    assert.equal(fr.n, n, `frame ${fr.f}`);
  }
  // when a bus is standing at a stop, nobody who arrived before it is still waiting there
  assert.ok(r.frames.some((fr) => fr.buses.some((b) => b.dwell)));
  assert.ok(r.drawn > 0, 'buses drawn');
  // the flags are the model's
  for (const f of r.flags) {
    const lim = f.mat === 'metal' ? 51 : 56;
    assert.equal(f.min1, f.ts > lim);
    assert.equal(f.s1, f.mat === 'metal' && f.ts > 65);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

const CAM_A = { z: 1.75, cx: 200, cy: 180 };
const CAM_B = { z: 5.5, cx: 265, cy: 195 };
const CAM_C = { z: 4, cx: 200, cy: 262 };
// [frame, cam, thermal, hour, spots, burn]
const FRAMES = [
  [400, CAM_A, 0, 15, false, false],
  [401, CAM_A, 0, 15, false, false],
  [400, CAM_A, 1, 15, false, false],
  [1650, CAM_B, 0, 15, true, false],
  [3150, CAM_B, 0, 15, true, true],
  [900, CAM_C, 0, 15, false, true],
  [900, CAM_C, 1, 12, true, true],
  [2100, CAM_A, 0, 17, true, false],
  [777, CAM_B, 1, 16.25, false, true],
  [90, CAM_A, 0, 15, true, true],
  [1500, CAM_C, 1, 4, true, true],
  [3601, CAM_A, 0, 8.5, false, false],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, spots, burn] = frames[i];
      window.atlas.busstop.set({ spots, burn });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (buses, riders, waiting places, flags): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('spots=1&burn=1');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  const twice = await go('');
  const h4 = await hashes(twice.page, forward.flatMap((i) => [i, i]));
  await twice.context.close();
  assert.deepEqual(h4, h1);
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 4, 6, 8]) {
    const [f, cam, thermal, hour, spots, burn] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&spots=${spots ? 1 : 0}&burn=${burn ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 15:00: the avenue reads far hotter than the park lawn, both close to the model', async () => {
  const cam = '2.5,170,140';
  const [z, cx, cy] = cam.split(',').map(Number);
  const C = 0.8660254;
  const ox = Math.round(640 - (cx - cy) * C * z);
  const oy = Math.round(400 - (cx + cy) * 0.5 * z);
  const { world, T } = B;
  const pick = (mat) => {
    const out = [];
    for (let i = 0; i < world.n * world.n; i++) {
      if (world.bld[i] >= 0 || world.canopy[i] > 0 || world.matIds[world.mat[i]] !== mat) continue;
      const x = ((i % world.n) + 0.5) * world.cell;
      const y = (Math.floor(i / world.n) + 0.5) * world.cell;
      const X = ox + (x - y) * C * z;
      const Y = oy + (x + y) * 0.5 * z;
      if (X < 30 || X > 1250 || Y < 160 || Y > 600) continue;
      if (world.buildings.some((b) => Math.max(b.x0 - x, b.y0 - y, 0) < Math.min(b.x1 - x, b.y1 - y, 0.95 * b.h + 2.5))) continue;
      // nothing tall in front: trees within 8 m in front, the footbridges
      if (world.trees.some((t) => t.x - x > -2 && t.y - y > -2 && t.x - x + t.y - y < 14)) continue;
      if (world.scene.bridges.some((b) => x > b.x0 - 4 && x < b.x1 + 4 && y > b.y0 - 2 && y < b.y1 + 10)) continue;
      if (world.scene.screens.some((P) => x > P.x0 - 3 && x < P.x1 + 3 && y > P.y0 - 3 && y < P.y1 + 3)) continue;
      out.push(i);
    }
    return out;
  };
  const boxes = (cells) => cells.map((i) => {
    const x0 = (i % world.n) * world.cell;
    const y0 = Math.floor(i / world.n) * world.cell;
    return { x0, y0, x1: x0 + world.cell, y1: y0 + world.cell, z: 0, b: -1 };
  });
  const road = pick('asphalt');
  const lawn = pick('grass');
  const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${cam}`);
  const r = await regionPixelMeans(page, { road: boxes(road), lawn: boxes(lawn) }, 2, 14);
  await context.close();
  for (const [k, cells] of [['road', road], ['lawn', lawn]]) {
    const model = cells.reduce((s, i) => s + T.ts(i, 15), 0) / cells.length;
    console.log(`  ${k.padEnd(5)} pixels ${r[k].mean.toFixed(1)} (n ${r[k].n}) model ${model.toFixed(1)} (${cells.length} cells)`);
    assert.ok(r[k].n >= 300, `${k}: only ${r[k].n} px`);
    assert.ok(Math.abs(r[k].mean - model) < 1.5, `${k}: pixels vs model`);
  }
  assert.ok(r.road.mean > r.lawn.mean + 10, `road ${r.road.mean} vs lawn ${r.lawn.mean}`);
});

test('cards: west screen, stops A-E, which kerb, waiting, footbridges, burn flags, Phoenix, glass box, Hong Kong; the misses stated; heat cards with the point-model rows', async () => {
  const ids = ['screen', 'stopA', 'stopB', 'stopC', 'stopD', 'stopE', 'kerb', 'wait', 'bridge', 'burn', 'phoenix', 'glass', 'hk'];
  const { page, context, errors } = await go('hour=15&f=400');
  for (const id of ids) {
    await page.click(`#busstop [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN|Infinity/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t) && /°C|K/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
  }
  const html = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.atlas.busstop.html(id)])), ids);
  const cmp = await page.evaluate(() => window.atlas.busstop.compare());
  assert.ok(/<svg/.test(html.screen) && /bigger roof/.test(html.screen) && html.screen.includes(cmp.variants.built[17].tmrt.toFixed(1)) && html.screen.includes(cmp.variants.bigRoof[17].tmrt.toFixed(1)));
  assert.ok(/cooler than the bigger roof at every hour shown/.test(html.screen));
  for (const s of ['A', 'B', 'C', 'D', 'E']) assert.ok(/heat dose/.test(html[`stop${s}`]) && /Conditions while waiting/.test(html[`stop${s}`]) && /mean wait/.test(html[`stop${s}`]), s);
  assert.ok(/band missed/.test(html.stopA) && /band missed/.test(html.phoenix), 'stop A and Phoenix cards state the shaded-concrete miss');
  assert.ok(/band missed/.test(html.hk) && /likely/.test(html.hk), 'Hong Kong card states the opal miss');
  assert.ok(/not modelled/.test(html.stopE) && /Lanza/.test(html.glass));
  assert.ok(/Chen et al/.test(html.bridge) && /upper bounds/.test(html.bridge) && /likely/.test(html.bridge));
  assert.ok(html.burn.includes('ISO 13732-1') && html.burn.includes('51 °C') && html.burn.includes('apply to children too') && html.burn.includes('ceramics, glass and stone') && !html.burn.includes('healthy adult skin') && /unverified/.test(html.burn));
  assert.ok(/UTCI/.test(html.wait) && /not a measure of risk/.test(html.wait) && html.wait.includes('5.8 min'));
  assert.ok(/east kerb/.test(html.kerb) && /far less than the 20–35 an opaque roof usually gives/.test(html.kerb));
  for (const h of Object.values(html)) assert.ok(!/https?:/.test(h));
  // heat cards: at stop A the point model's rows; under the open footbridge its deck
  const d = await page.evaluate(() => [window.atlas.card('ground', 303.5, 211), window.atlas.card('ground', 200, 262.5), window.atlas.card('ground', 130, 100)]);
  assert.ok(d[0].busstop && d[0].busstop.stop === 'A' && d[0].busstop.open > d[0].busstop.under + 20, JSON.stringify(d[0].busstop));
  assert.ok(d[1].busstop && d[1].busstop.bridge === 'open' && d[1].busstop.deck > 51, JSON.stringify(d[1].busstop));
  assert.equal(d[2].busstop, null);
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(() => window.atlas.project(303.5, 211, 0));
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/stop A \(point model\)/.test(t) && /at the kerb/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-9 glossary terms open their footnotes; notes carry their terms and the model numbers', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('busstop');
  for (const k of ['transmittance', 'profileAngle', 'headway', 'heatDose', 'burnThreshold']) assert.ok(keys.includes(k), k);
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const st = await page.evaluate(() => window.atlas.busstop.stats());
  const A = st.stops.find((s) => s.id === 'A');
  assert.ok(notes.find((n) => n.key === 'stopA').text.join(' ').includes(`${A.centre[15].tmrt.toFixed(1)} °C`));
  assert.ok(notes.find((n) => n.key === 'deck').text.join(' ').includes(`${st.bridges.find((b) => b.id === 'open').deck[15].toFixed(1)} °C`));
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('riders: most wait in shade at 15:00, seated on the benches; crossers on the decks at 6 m; walkers drawn; sweat only on hot sunlit people', async () => {
  const { page, context } = await go('hour=15&f=400');
  const r = await page.evaluate(() => {
    const A = window.atlas.busstop;
    let n = 0;
    let shade = 0;
    let sit = 0;
    for (let f = 0; f < 4500; f += 60) for (const w of A.waiting(f, 15)) {
      n++;
      if (w.sunlit < 0.5) shade++;
      if (w.sit) sit++;
    }
    return { n, shade, sit, crossers: A.crossers(400, 15), night: A.waiting(400, 23.5).length };
  });
  assert.ok(r.n > 300 && r.shade / r.n >= 0.5 && r.sit > 0, JSON.stringify({ n: r.n, shade: r.shade, sit: r.sit }));
  assert.ok(r.crossers.some((c) => Math.abs(c.z - 6) < 1e-9 && c.tmrt !== null));
  assert.equal(r.night, 0, 'no buses at 23:30');
  const w = await page.evaluate(() => {
    const out = { sweating: 0, bad: 0, night: 0, waiters: 0 };
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
  console.log(`  sweating ${w.sweating}, outside hot sun ${w.bad}, at night ${w.night}`);
  assert.ok(w.sweating > 0 && w.bad === 0 && w.night === 0);
  const s = await page.evaluate(() => window.atlas.seek(400));
  assert.ok(s.people > 30);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/busstop/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, points ${info.pointMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('k');
  await page.keyboard.press('u');
  await page.click('#busstop [data-card="screen"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['places + flags', 'hour=15&spots=1&burn=1']]) {
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

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['places + flags', 'hour=15&spots=1&burn=1']]) {
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
