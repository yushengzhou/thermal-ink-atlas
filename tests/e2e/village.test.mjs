// Block 10 (urban village and informal edge) in the running page: the
// residents' white roofs (R, button, ?coolroof=) and the room under the roof
// (O, button, ?under=), determinism in every mode, thermal pixel means (bare
// rusty iron against weathered white roofs, and the painted roofs with R),
// the cards (with the misses they state), heat cards for a lane, a sheet
// roof and a slab roof, glossary, notes, residents on the roofs, walkers and
// sweat, the language the brief rules out, size / offline / load time, frame
// pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base10, ruledOut } from '../../scripts/village.mjs';
import { VG_ROOF } from '../../engine/vgkit.js';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'village' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base10();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

test('white roofs and under the roof: default off, ?coolroof=1 and ?under=1, keys R and O, the buttons; the marked roofs repainted and re-modelled; the wash and its label', async () => {
  const painted = B.world.buildings.find((x) => x.paint && x.style === 'room');
  for (const [q, cool, under] of [['', false, false], ['coolroof=1', true, false], ['under=1', false, true], ['coolroof=1&under=1', true, true]]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate((id) => ({ ...window.atlas.village.state(), pressed: document.querySelector('#village [data-cool]').getAttribute('aria-pressed'), stats: window.atlas.stats(), fills: window.atlas.village.fills(), roof: window.atlas.village.roofTs(id, 15) }), painted.id);
    assert.equal(st.cool, cool, q);
    assert.equal(st.under, under, q);
    assert.equal(st.pressed, String(cool));
    assert.equal(st.stats.under > 0, under, `under ${st.stats.under}`);
    assert.equal(st.fills.length, B.world.buildings.filter((x) => x.paint).length);
    for (const f of st.fills) {
      assert.equal(f.roof === 'whiteTin', cool);
      assert.equal(f.rgb.join() === VG_ROOF.whiteTin.join(), cool);
    }
    const model = (cool ? B.C : B.T);
    const cells = [];
    for (let i = 0; i < B.world.bld.length; i++) if (B.world.bld[i] === painted.index) cells.push(i);
    assert.ok(Math.abs(st.roof - cells.reduce((a, i) => a + model.ts(i, 15), 0) / cells.length) < 1e-6);
    if (under) assert.ok(/Under the roof/.test(st.stats.underLabel) && /proxy/.test(st.stats.underLabel), st.stats.underLabel);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=15&f=400');
  const h0 = await page.evaluate(() => window.atlas.hash());
  await page.keyboard.press('r');
  await page.keyboard.press('o');
  assert.deepEqual(await page.evaluate(() => window.atlas.village.state()), { cool: true, under: true });
  await page.keyboard.press('R');
  await page.click('#village [data-under]');
  assert.deepEqual(await page.evaluate(() => window.atlas.village.state()), { cool: false, under: false });
  // toggled on and off again: the same pixels as before
  assert.equal(await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.hash();
  }), h0);
  await page.click('#village [data-cool]');
  const hc = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.hash();
  });
  const fresh = await go('hour=15&f=400&coolroof=1');
  assert.equal(await fresh.page.evaluate(() => window.atlas.hash()), hc, 'R pressed = ?coolroof=1');
  await fresh.context.close();
  assert.deepEqual(errors, []);
  await context.close();
});

const CAM_A = { z: 2, cx: 215, cy: 250 };
const CAM_B = { z: 5, cx: 120, cy: 330 };
const CAM_C = { z: 4, cx: 150, cy: 200 };
// [frame, cam, thermal, hour, cool, under]
const FRAMES = [
  [400, CAM_A, 0, 15, false, false],
  [401, CAM_A, 0, 15, false, false],
  [400, CAM_A, 1, 15, false, false],
  [1650, CAM_B, 0, 15, true, false],
  [3150, CAM_B, 1, 15, true, true],
  [900, CAM_C, 0, 21, false, true],
  [900, CAM_C, 1, 12, true, false],
  [2100, CAM_A, 0, 17, false, true],
  [777, CAM_B, 1, 22, false, false],
  [90, CAM_A, 0, 15, true, true],
  [1500, CAM_C, 1, 4, true, true],
  [3601, CAM_A, 0, 8.5, false, false],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, cool, under] = frames[i];
      window.atlas.village.set({ cool, under });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (white roofs, under the roof, residents on the roofs): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('coolroof=1&under=1');
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
  for (const i of [3, 4, 5, 10]) {
    const [f, cam, thermal, hour, cool, under] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&coolroof=${cool ? 1 : 0}&under=${under ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 16:00 (below the palette\'s 70 °C top): bare rusty-iron roofs read far hotter than weathered white ones, both close to the model; with R the painted roofs read as white roofs', async () => {
  const cam = '3.5,130,345';
  const { world, T, C } = B;
  const roofs = (f) => world.buildings.filter((x) => x.style === 'room' && f(x)).flatMap((x) => {
    const out = [];
    for (let i = 0; i < world.bld.length; i++) {
      if (world.bld[i] !== x.index) continue;
      const x0 = (i % world.n) * world.cell;
      const y0 = Math.floor(i / world.n) * world.cell;
      out.push({ x0: x0 + 0.5, y0: y0 + 0.5, x1: x0 + world.cell - 0.5, y1: y0 + world.cell - 0.5, z: x.h, b: x.index, i });
    }
    return out;
  });
  const rust = roofs((x) => x.roof === 'rustTin' && !x.paint);
  const white = roofs((x) => x.roof === 'whiteTinAged');
  const paint = roofs((x) => x.paint && x.roof === 'rustTin');
  const run = async (q, spec) => {
    const { page, context } = await go(`thermal&hour=16&notes=0&people=0&f=400&cam=${cam}${q}`);
    const r = await regionPixelMeans(page, spec, 2, 14);
    await context.close();
    return r;
  };
  const r = await run('', { rust, white, paint });
  const rc = await run('&coolroof=1', { paint });
  const mean = (cells, M) => cells.reduce((s, q) => s + M.ts(q.i, 16), 0) / cells.length;
  for (const [k, cells, got, M] of [['rust', rust, r.rust, T], ['white', white, r.white, T], ['paint bare', paint, r.paint, T], ['paint white', paint, rc.paint, C]]) {
    console.log(`  ${k.padEnd(11)} pixels ${got.mean.toFixed(1)} (n ${got.n}) model ${mean(cells, M).toFixed(1)}`);
    assert.ok(got.n >= 300, `${k}: only ${got.n} px`);
    assert.ok(Math.abs(got.mean - mean(cells, M)) < 1.5, `${k}: pixels vs model`);
  }
  assert.ok(r.rust.mean > r.white.mean + 8, `${r.rust.mean} ${r.white.mean}`);
  assert.ok(r.paint.mean > rc.paint.mean + 10, `${r.paint.mean} ${rc.paint.mean}`);
});

test('cards: lanes, metal roofs, under the roof, white roofs, villages measured, who is most at risk; the misses stated; heat cards for a lane, a sheet roof and a slab roof', async () => {
  const ids = ['lanes', 'roofs', 'under', 'white', 'measured', 'risk'];
  const { page, context, errors } = await go('hour=15&f=400');
  for (const id of ids) {
    await page.click(`#village [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN|Infinity/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
    // the words the brief rules out: none outside the source lines
    assert.deepEqual(ruledOut(t.split('Sources:')[0]), [], id);
  }
  const html = await page.evaluate((ids) => Object.fromEntries(ids.map((id) => [id, window.atlas.village.html(id)])), ids);
  const st = B.st;
  assert.ok(/band missed/.test(html.lanes) && /docs\/sources.md/.test(html.lanes) && html.lanes.includes(`+${(Math.round((st.lanes.village.tmrt[12] - st.air[12]) * 10) / 10).toFixed(1)} K`), 'lanes card states the noon miss');
  assert.ok(/Pingshan/.test(html.lanes) && /straight/.test(html.lanes));
  assert.ok(/band missed/.test(html.roofs) && /likely/.test(html.roofs) && html.roofs.includes(st.edge.asbestosRoof.ts15.toFixed(1)), 'roofs card states the asbestos miss');
  assert.ok(/health hazard/.test(html.roofs) && !/remov|replac/i.test(html.roofs), 'one neutral asbestos line, no advice');
  assert.ok(/proxy/.test(html.under) && /calibrat|set \(as the brief says\)/.test(html.under) && /±5 K/.test(html.under));
  assert.ok(/Vellingiri/.test(html.white) && /Nutkiewicz/.test(html.white) && html.white.includes(Math.abs(st.cool.rustRooms.d15).toFixed(1)));
  assert.ok(!/band missed/.test(html.white), 'bands 2 and 7 are met');
  assert.ok(/not a trait/.test(html.risk) && /No estimate/.test(html.risk));
  assert.ok(/Scott|Nairobi/.test(html.measured));
  for (const h of Object.values(html)) assert.ok(!/https?:/.test(h));
  // heat cards: a lane cell, a sheet roof, a slab roof, the open square
  const lane = B.world.vg.lanes.find((c) => c.kind === 'lane' && c.zone === 'village');
  const lx = ((lane.i % B.world.n) + 0.5) * 5;
  const ly = (Math.floor(lane.i / B.world.n) + 0.5) * 5;
  const room = B.world.buildings.find((x) => x.style === 'room' && x.roof === 'rustTin');
  const d = await page.evaluate(([lx, ly, room]) => [window.atlas.card('ground', lx, ly), window.atlas.card('building', room), window.atlas.card('building', 'v3_4'), window.atlas.card('ground', 335, 120)], [lx, ly, room.id]);
  assert.ok(d[0].village && d[0].village.lane && Math.abs(d[0].village.lane.svf - B.world.svf[lane.i]) < 1e-6 && d[0].svf < 0.1, JSON.stringify(d[0].village));
  assert.ok(d[1].village && d[1].village.under && d[1].village.under.radiant > d[1].air && Math.abs(d[1].village.under.value) <= 5, JSON.stringify(d[1].village));
  assert.ok(d[2].village && d[2].village.slab);
  assert.equal(d[3].village, null);
  // a heat card opened by a click on a lane's floor is hard to hit between the houses: click a sheet roof instead
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(([x, y, z]) => window.atlas.project(x, y, z), [(room.x0 + room.x1) / 2, (room.y0 + room.y1) / 2, room.h]);
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/radiant temperature under the roof/.test(t) && /illustrative/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-10 glossary terms open their footnotes; notes carry their terms and the model numbers', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('village');
  for (const k of ['urbanVillage', 'handshakeBuilding', 'indoorRadiant', 'heatVulnerability']) assert.ok(keys.includes(k), k);
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    assert.deepEqual(ruledOut(t), [], key);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const st = B.st;
  assert.ok(notes.find((n) => n.key === 'tin').text.join(' ').includes(`${st.edge.rustTin.ts15.toFixed(1)} °C`));
  assert.ok(notes.find((n) => n.key === 'lane').text.join(' ').includes(`${st.lanes.village.tmrt[22].toFixed(1)} °C`));
  assert.ok(notes.find((n) => n.key === 'under').text.join(' ').includes(`${st.edge.rustTin.radiant15.toFixed(1)} °C`));
  for (const n of notes) assert.deepEqual(ruledOut(n.text.join(' ')), [], n.key);
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('people: residents on ten roofs in the evening at the roof\'s height, none in the afternoon; walkers drawn; sweat only on hot sunlit people', async () => {
  const { page, context } = await go('hour=15&f=400');
  const r = await page.evaluate(() => ({ day: window.atlas.village.residents(400, 15), eve: window.atlas.village.residents(400, 21) }));
  assert.equal(r.day.length, 0);
  assert.equal(r.eve.length, 20);
  for (const p of r.eve) {
    const H = B.world.vgParent.get(p.roof);
    assert.equal(p.z, H.h);
  }
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
  assert.ok(s.people >= 10, `people ${s.people}`); // most walkers are out of sight in the lanes
  const e = await page.evaluate(() => {
    window.atlas.look({ hour: 21 });
    return window.atlas.seek(400);
  });
  assert.ok(e.people >= 10, `people ${e.people}`);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/village/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('r');
  await page.keyboard.press('o');
  await page.click('#village [data-card="white"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['white roofs + under the roof', 'hour=15&coolroof=1&under=1']]) {
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

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['white roofs + under the roof', 'hour=15&coolroof=1&under=1']]) {
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
