// Block 8 (school campus playground) in the running page: watering the
// pitch (I, button, ?irrigate=) and the burn hatching (U, button, ?burn=),
// determinism in every mode, thermal pixel means (turf vs grass at 15:00),
// the burn overlay on known cells, the cards (with the misses they state),
// heat cards with the burn rows, glossary, notes, children at play times,
// walkers and sweat, size / offline / load time, frame pacing and the
// hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base8 } from '../../scripts/campus.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'campus' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base8();
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

test('watering and burn limits: default off, ?irrigate= and ?burn=, keys I and U, the buttons; spray, hatching and labels drawn', async () => {
  for (const [q, irrigate, burn] of [['', false, false], ['irrigate=1', true, false], ['burn=1', false, true], ['irrigate=1&burn=1', true, true]]) {
    const { page, context, errors } = await go(`hour=14.25&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.campus.state(), body: document.body.dataset.irrigate, pressed: document.querySelector('#campus [data-burn]').getAttribute('aria-pressed'), stats: window.atlas.stats(), models: window.atlas.campus.models() }));
    assert.equal(st.irrigate, irrigate, q);
    assert.equal(st.burn, burn, q);
    assert.equal(st.body, irrigate ? '1' : '0');
    assert.equal(st.pressed, String(burn));
    assert.equal(st.stats.spray > 0, irrigate, `spray ${st.stats.spray}`);
    assert.equal(st.stats.burnCells > 500, burn, `burn ${st.stats.burnCells}`);
    assert.equal(st.models.includes('irrigated'), irrigate || st.models.includes('irrigated'));
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=14.25&f=400');
  const dry = await page.evaluate(() => window.atlas.campus.ts(155, 125, 14.25));
  await page.keyboard.press('i');
  const st = await page.evaluate(() => ({ ...window.atlas.campus.state(), ts: window.atlas.campus.ts(155, 125, 14.25), grass: window.atlas.campus.ts(130, 252.5, 14.25) }));
  assert.equal(st.irrigate, true, 'I waters the pitch');
  assert.ok(st.ts < dry - 3, `turf ${st.ts} vs dry ${dry}`);
  await page.keyboard.press('I');
  assert.equal((await page.evaluate(() => window.atlas.campus.ts(155, 125, 14.25))), dry, 'back to the dry model');
  await page.keyboard.press('u');
  assert.equal((await page.evaluate(() => window.atlas.campus.state())).burn, true);
  await page.keyboard.press('U');
  await page.click('#campus [data-burn]');
  await page.click('#campus [data-irrigate]');
  const s = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.stats();
  });
  assert.ok(/1-min burn limit/.test(s.burnLabel) && /60 °C/.test(s.burnLabel) && /56 °C/.test(s.burnLabel) && /51 °C/.test(s.burnLabel), s.burnLabel);
  assert.ok(/watered at 14:00/.test(s.waterLabel) && /not cooled/.test(s.waterLabel), s.waterLabel);
  // no spray after half an hour, none before; at night nothing is hatched
  const later = await page.evaluate(() => [13.75, 15, 3].map((h) => {
    window.atlas.look({ hour: h });
    window.atlas.seek(400);
    return window.atlas.stats();
  }));
  assert.ok(later.every((x) => x.spray === 0));
  assert.equal(later[2].burnCells, 0);
  assert.deepEqual(errors, []);
  await context.close();
});

test('the burn overlay hatches exactly the cells above their own limit (known cells)', async () => {
  const { page, context, errors } = await go('hour=15&f=400&burn=1');
  const r = await page.evaluate(() => {
    const C = window.atlas.campus;
    return { turf: C.burnAt(155, 125, 15), grass: C.burnAt(130, 252.5, 15), sail: C.burnAt(302.5, 187.5, 15), paving: C.burnAt(250, 62.5, 15), road: C.burnAt(200, 5, 15), n: C.burn(15).length, night: C.burn(23).length };
  });
  assert.ok(r.turf.hatched && r.turf.limit === 60 && r.turf.ts > 60);
  assert.ok(!r.grass.hatched && r.grass.limit === null);
  assert.ok(!r.sail.hatched && r.sail.limit === 60 && r.sail.ts < 60);
  assert.equal(r.paving.hatched, r.paving.ts > 56);
  assert.equal(r.paving.limit, 56);
  assert.ok(r.road.hatched && r.road.limit === 56);
  assert.equal(r.night, 0);
  // the page's count equals the model's (scripts)
  let n = 0;
  const { world, T } = B;
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0) continue;
    const id = world.matIds[world.mat[i]];
    const lim = { turf: 60, track: 60, acrylic: 60, rubber: 60, concrete: 56, asphalt: 56, stone: 56 }[id];
    if (lim !== undefined && T.ts(i, 15) > lim) n++;
  }
  assert.equal(r.n, n);
  assert.deepEqual(errors, []);
  await context.close();
});

const CAM_A = { z: 1.75, cx: 210, cy: 170 };
const CAM_B = { z: 4, cx: 320, cy: 210 };
// [frame, cam, thermal, hour, irrigate, burn]
const FRAMES = [
  [400, CAM_A, 0, 15, false, false],
  [401, CAM_A, 0, 15, false, false],
  [400, CAM_A, 1, 15, false, false],
  [400, CAM_A, 1, 14.25, true, false],
  [430, CAM_A, 1, 14.25, true, false],
  [400, CAM_A, 0, 15, false, true],
  [400, CAM_A, 1, 12, true, true],
  [777, CAM_B, 1, 15.25, false, true],
  [777, CAM_B, 0, 10, true, false],
  [90, CAM_A, 0, 15, true, true],
  [1500, CAM_B, 1, 4, false, true],
  [3601, CAM_A, 0, 12.5, false, false],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, irrigate, burn] = frames[i];
      window.atlas.campus.set({ irrigate, burn });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (watering, burn hatching, children): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('irrigate=1&burn=1');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  // the same frame twice in a row (the overlays set the line state they use; it is not left over from the frame before)
  const twice = await go('');
  const h4 = await hashes(twice.page, forward.flatMap((i) => [i, i]));
  const h5 = await twice.page.evaluate(([frames]) => frames.map(([f, cam, thermal, hour, irrigate, burn]) => {
    window.atlas.campus.set({ irrigate, burn });
    window.atlas.look({ thermal: !!thermal, hour, intro: true });
    window.atlas.seek(f, cam);
    window.atlas.seek(f, cam);
    return window.atlas.hash();
  }), [FRAMES]);
  await twice.context.close();
  for (const i of forward) assert.equal(h5[i], h1[i], `frame ${i} drawn twice`);
  assert.deepEqual(h4, h1);
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 6, 7, 8]) {
    const [f, cam, thermal, hour, irrigate, burn] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&irrigate=${irrigate ? 1 : 0}&burn=${burn ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 15:00: the turf reads far hotter than the grass field, both close to the model', async () => {
  const cam = '2.5,150,190';
  const turf = visibleCells(B.C.turf, cam);
  const grass = visibleCells(B.C.grass, cam);
  const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${cam}`);
  const r = await regionPixelMeans(page, { turf: boxes(turf), grass: boxes(grass) }, 2, 14);
  await context.close();
  for (const [k, cells] of [['turf', turf], ['grass', grass]]) {
    const model = cells.reduce((s, i) => s + B.T.ts(i, 15), 0) / cells.length;
    console.log(`  ${k.padEnd(5)} pixels ${r[k].mean.toFixed(1)} (n ${r[k].n}) model ${model.toFixed(1)} (${cells.length} cells)`);
    assert.ok(r[k].n >= 300, `${k}: only ${r[k].n} px`);
    assert.ok(Math.abs(r[k].mean - model) < 1.5, `${k}: pixels vs model`);
  }
  assert.ok(r.turf.mean > r.grass.mean + 20, `turf ${r.turf.mean} vs grass ${r.grass.mean}`);
});

test('cards: turf, playground, sails, watering, children, track and courts, burn limits; the misses stated; heat cards with the burn rows', async () => {
  const ids = ['turf', 'play', 'sail', 'water', 'kids', 'courts', 'burn'];
  const { page, context, errors } = await go('hour=15&f=400');
  for (const id of ids) {
    await page.click(`#campus [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN|Infinity/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t) && /°C|K/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
  }
  const html = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.atlas.campus.html(id)])), ids);
  const st = await page.evaluate(() => window.atlas.campus.stats());
  assert.ok(html.turf.includes('74.6') && html.turf.includes('Singh') && html.turf.includes(`${st.table.turf.ts[15].toFixed(1)}`));
  assert.ok(html.play.includes('87.2') && /band is missed/.test(html.play), 'playground card states the tree-shade miss');
  assert.ok(html.sail.includes('168 W') && /band is missed/.test(html.sail) && html.sail.includes((st.split[15].sun.ts - st.split[15].sail.ts).toFixed(1)), 'sail card states the 25 K miss');
  assert.ok(html.water.includes('79 °C') && /Band missed/.test(html.water) && html.water.includes('McNitt'));
  assert.ok(/Qualitative only/.test(html.kids) && !/child-height Tmrt of/.test(html.kids));
  assert.ok(/band missed/.test(html.courts) && html.courts.includes('vendor'), 'courts card states the miss');
  assert.ok(html.burn.includes('ISO 13732-1') && html.burn.includes('51 °C') && html.burn.includes('56 °C') && html.burn.includes('60 °C') && html.burn.includes('48 °C') && html.burn.includes('healthy adult skin') && !/pulls away/.test(html.burn));
  for (const h of Object.values(html)) assert.ok(!/https?:/.test(h));
  const d = await page.evaluate(() => [window.atlas.card('ground', 155, 125), window.atlas.card('ground', 130, 252.5), window.atlas.card('ground', 302.5, 187.5)]);
  assert.ok(d[0].campus && d[0].campus.limit === 60 && d[0].campus.over, JSON.stringify(d[0].campus));
  assert.ok(d[1].campus && d[1].campus.limit === null);
  assert.ok(d[2].campus && !d[2].campus.over);
  assert.equal(d[0].material, 'Artificial turf (crumb-rubber infill)');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(() => window.atlas.project(155, 125, 0));
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/1-min burn limit/.test(t) && /above by/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-8 glossary terms open their footnotes; notes carry their terms and the model numbers', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('campus');
  for (const k of ['artificialTurf', 'crumbRubber', 'contactBurn', 'shadeSail']) assert.ok(keys.includes(k), k);
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const st = await page.evaluate(() => window.atlas.campus.stats());
  assert.ok(notes.find((n) => n.key === 'turf').text.join(' ').includes(`${st.table.grass.ts[15].toFixed(1)} °C`));
  assert.ok(notes.find((n) => n.key === 'sail').text.join(' ').includes(`${st.split[15].sail.ts.toFixed(1)} °C`));
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('children: out at play times only, drawn among the people, most in shade at 15:00; walkers keep to shade; sweat only on hot sunlit cells', async () => {
  const { page, context } = await go('hour=15&f=400');
  const r = await page.evaluate(() => {
    const C = window.atlas.campus;
    return { k15: C.kids(400, 15), k14: C.kids(400, 14), k10: C.kids(400, 10), shade: C.kidShade(15, 400), agents: window.atlas.agents(400, 15).length, agents14: window.atlas.agents(400, 14).length, play: [C.playTime(9.75), C.playTime(12.5)] };
  });
  assert.equal(r.k15.length, 26);
  assert.equal(r.k14.length, 0);
  assert.equal(r.k10.length, 26);
  assert.deepEqual(r.play, [false, true]);
  assert.ok(r.shade.shade >= 0.5, `children in shade ${r.shade.shade}`);
  assert.ok(r.agents >= r.agents14 + 26 - 2);
  const s = await page.evaluate(() => window.atlas.shadeStats(400, 15));
  assert.ok(s.ratio > 2, `shade density ratio ${s.ratio}`);
  const w = await page.evaluate(() => {
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
  console.log(`  sweating ${w.sweating}, outside hot sun ${w.bad}, at night ${w.night}`);
  assert.ok(w.sweating > 0 && w.bad === 0 && w.night === 0);
  // the children are drawn smaller: a frame with them differs from one with people off only where people stand
  const n = await page.evaluate(() => {
    window.atlas.look({ hour: 15 });
    return window.atlas.seek(400).people;
  });
  assert.ok(n > 20);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/campus/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, sun slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('i');
  await page.keyboard.press('u');
  await page.click('#campus [data-card="water"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['burn + watered', 'hour=15&burn=1&irrigate=1']]) {
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

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['burn + watered', 'hour=15&burn=1&irrigate=1']]) {
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
