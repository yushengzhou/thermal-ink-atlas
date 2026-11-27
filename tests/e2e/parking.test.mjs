// Block 6 (car park and brownfield) in the running page: the night-release
// overlay (G, button, ?flux=), determinism in every mode, thermal pixel means
// (open asphalt vs bare soil at 23:00, under the PV canopy vs open asphalt at
// 15:00), the cards (the hot-car card's quoted numbers), heat cards with G and
// the car share, glossary, notes, walkers and sweat, size / offline / load
// time, frame pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base6 } from '../../scripts/parking.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';

const CITY = { city: 'parking' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base6();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/** Ground cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800), with no building, crown, canopy or car on them. */
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
    if (B.world.canopy[i] > 0 || B.world.parking.share[i] > 0) return false;
    for (const b of B.world.buildings) {
      const lo = Math.max(b.x0 - x, b.y0 - y, 0);
      const hi = Math.min(b.x1 - x, b.y1 - y, 0.95 * b.h + 2.5);
      if (lo < hi) return false;
    }
    return true;
  });
}

test('night-release overlay: default off, ?flux=0|1, G and the button; strokes rise at night, ticks point down at noon', async () => {
  for (const [q, want] of [['', false], ['flux=0', false], ['flux=1', true]]) {
    const { page, context, errors } = await go(`hour=23&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.parking.state(), pressed: document.querySelector('#parking [data-flux]').getAttribute('aria-pressed'), body: document.body.dataset.flux, stats: window.atlas.stats() }));
    assert.equal(st.flux, want, q);
    assert.equal(st.pressed, String(want));
    assert.equal(st.body, want ? '1' : '0');
    assert.equal(st.stats.fluxUp > 0, want, `strokes drawn: ${st.stats.fluxUp}`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=23&f=400');
  await page.keyboard.press('g');
  assert.equal((await page.evaluate(() => window.atlas.parking.state())).flux, true, 'G turns it on');
  await page.keyboard.press('G');
  assert.equal((await page.evaluate(() => window.atlas.parking.state())).flux, false);
  await page.click('#parking [data-flux]');
  const night = await page.evaluate(() => {
    window.atlas.seek(400);
    return window.atlas.stats();
  });
  assert.ok(night.fluxUp > 300 && night.fluxDown === 0, `23:00: ${night.fluxUp} up, ${night.fluxDown} down`);
  assert.ok(/stored heat coming back out/.test(night.fluxLabel) && /simulated/.test(night.fluxLabel));
  const noon = await page.evaluate(() => {
    window.atlas.look({ hour: 12 });
    window.atlas.seek(400);
    return window.atlas.stats();
  });
  assert.ok(noon.fluxDown > 300 && noon.fluxDown > 5 * noon.fluxUp, `12:00: ${noon.fluxUp} up, ${noon.fluxDown} down`);
  // more strokes where more heat comes out: the open asphalt's samples are drawn more often than the soil's
  const share = await page.evaluate(() => window.atlas.parking.flux(37.5, 72.5, 23));
  assert.ok(share < -90, `open asphalt G at 23:00 ${share}`);
  assert.deepEqual(errors, []);
  await context.close();
});

const CAM_A = { z: 2, cx: 200, cy: 200 };
const CAM_B = { z: 5.5, cx: 75, cy: 140 };
// [frame, cam, thermal, hour, flux]
const FRAMES = [
  [400, CAM_A, 0, 15, false],
  [401, CAM_A, 0, 15, false],
  [400, CAM_A, 1, 15, false],
  [400, CAM_A, 1, 23, true],
  [430, CAM_A, 1, 23, true],
  [400, CAM_A, 1, 23, false],
  [777, CAM_B, 1, 20, true],
  [777, CAM_B, 0, 12.25, true],
  [90, CAM_A, 0, 15, true],
  [1500, CAM_B, 1, 4, true],
  [3601, CAM_A, 0, 19, false],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, flux] = frames[i];
      window.atlas.parking.set({ flux });
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every mode (overlay on and off): same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 13) / 13, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('flux=1');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other (the overlay moves with the frame)');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [3, 6, 7, 9]) {
    const [f, cam, thermal, hour, flux] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&flux=${flux ? 1 : 0}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal 23:00: open asphalt reads warmer than bare soil, both close to the model', async () => {
  const cam = '3,130,150';
  const asp = visibleCells(B.C.openAsphalt, cam);
  const soil = visibleCells(B.C.soil, cam);
  const { page, context } = await go(`thermal&hour=23&notes=0&people=0&f=400&cam=${cam}`);
  const r = await regionPixelMeans(page, { asp: boxes(asp), soil: boxes(soil) }, 2, 14);
  await context.close();
  for (const [k, cells] of [['asp', asp], ['soil', soil]]) {
    const model = cells.reduce((s, i) => s + B.T.ts(i, 23), 0) / cells.length;
    console.log(`  ${k.padEnd(4)} pixels ${r[k].mean.toFixed(1)} (n ${r[k].n}) model ${model.toFixed(1)} (${cells.length} cells)`);
    assert.ok(r[k].n >= 300, `${k}: only ${r[k].n} px`);
    assert.ok(Math.abs(r[k].mean - model) < 1.5, `${k}: pixels vs model`);
  }
  assert.ok(r.asp.mean > r.soil.mean + 1, `asphalt ${r.asp.mean} vs soil ${r.soil.mean}`);
});

test('thermal 15:00: the bays under the PV canopy read far cooler than the open asphalt', async () => {
  const cam = '4,75,140';
  const asp = visibleCells(B.C.openAsphalt, cam);
  // PV bay cells: visible ignoring the canopy and the cars (the wash shows through both)
  const pv = B.C.pvBays.filter((i) => {
    const c = B.world.canopy[i];
    const s = B.world.parking.share[i];
    B.world.canopy[i] = 0;
    B.world.parking.share[i] = 0;
    const ok = visibleCells([i], cam).length === 1;
    B.world.canopy[i] = c;
    B.world.parking.share[i] = s;
    return ok;
  });
  const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&cam=${cam}`);
  // the canopy posts and car outlines are ink: drop ink-like pixels (inkRes 14), as for the block-5 awnings
  const r = await regionPixelMeans(page, { asp: boxes(asp), pv: boxes(pv) }, 1, 14, null);
  await context.close();
  console.log(`  PV bays ${r.pv.mean.toFixed(1)} (n ${r.pv.n}), open asphalt ${r.asp.mean.toFixed(1)} (n ${r.asp.n})`);
  assert.ok(r.pv.n >= 150 && r.asp.n >= 150, `pixels: pv ${r.pv.n}, asphalt ${r.asp.n}`);
  assert.ok(r.pv.mean < r.asp.mean - 15);
});

test('cards: storage, PV canopy, lot trees, shed, brownfield, hot car (quoted numbers); heat cards show G and the car share', async () => {
  const { page, context, errors } = await go('hour=23&f=400');
  for (const id of ['storage', 'pv', 'trees', 'shed', 'soil', 'car']) {
    await page.click(`#parking [data-card="${id}"]`);
    const t = await page.locator('#card').textContent();
    assert.ok(!/undefined|NaN/.test(t), `${id}: ${t}`);
    assert.ok(/Sources:/.test(t) && /°C|K/.test(t), id);
    assert.equal(await page.locator('#card').getAttribute('data-kind'), id);
  }
  const html = await page.evaluate(() => Object.fromEntries(['storage', 'pv', 'trees', 'shed', 'soil', 'car'].map((id) => [id, window.atlas.parking.html(id)])));
  for (const s of ['46 / 38 °C', '69 / 48 °C', '+1.8 K per 5 min', '80% of the rise in 30 min', 'up to 47 °C', '−26 K', 'up to 25 K', '1,010 (39 in 2024)', 'Not modelled', 'information only']) assert.ok(html.car.includes(s), `hot car: ${s}`);
  assert.ok(html.pv.includes('Golden') && html.pv.includes('63.5 / 28.5') && html.pv.includes('37.0 / 27.7') && html.pv.includes('outside the spec'));
  assert.ok(html.storage.includes('damping depth') && html.storage.includes('W m⁻²') && html.storage.includes('No measured night-time'));
  assert.ok(html.trees.includes('Scott') && html.trees.includes('7.26 K'));
  assert.ok(html.shed.includes('K/h') && html.shed.includes('after sunset') && html.shed.includes('band 4 missed'));
  const d = await page.evaluate(() => [window.atlas.card('ground', 37.5, 72.5), window.atlas.card('ground', 37.5, 147.5), window.atlas.card('building', 'shedA')]);
  assert.ok(d[0].flux && d[0].flux.now < -60 && d[0].flux.cars === 0, `open asphalt: ${JSON.stringify(d[0].flux)}`);
  assert.ok(d[1].flux.cars > 0.2 && d[1].flux.pv, 'PV bay: cars and canopy');
  assert.ok(Math.abs(d[2].flux.now) < 5, `shed roof G ${d[2].flux.now}`);
  // click open asphalt in view: the heat card shows the G row
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
  const [x, y] = await page.evaluate(() => window.atlas.project(117.5, 52.5, 0));
  await page.mouse.click(x, y);
  const t = await page.locator('#card').textContent();
  assert.ok(/ground heat flux G now \/ 23:00/.test(t) && /giving heat back/.test(t), t);
  assert.deepEqual(errors, []);
  await context.close();
});

test('block-6 glossary terms open their footnotes; notes carry their terms and the model numbers', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('parking');
  for (const k of ['heatStorage', 'dampingDepth', 'groundFlux', 'thermalInertia']) assert.ok(keys.includes(k), k);
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.equal(notes.length, 5);
  const st = await page.evaluate(() => window.atlas.parking.stats());
  const a = notes.find((n) => n.key === 'asphalt').text.join(' ');
  assert.ok(a.includes(`${st.table.openAsphalt.t23.toFixed(1)} °C at 11 pm`) && a.includes(`${Math.round(-st.table.openAsphalt.g23)} W m⁻²`), a);
  assert.ok(notes.find((n) => n.key === 'shed').text.join(' ').includes('below the'));
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 5);
  await context.close();
});

test('walkers at 15:00 take the shaded footpaths and rest in shade; sweat only on hot sunlit cells, none at 23:00', async () => {
  const { page, context } = await go('hour=15&f=400');
  const s = await page.evaluate(() => window.atlas.shadeStats(400, 15));
  assert.ok(s.ratio > 1, `shade density ratio ${s.ratio}`);
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
  const size = statSync(fileURLToPath(new URL('../../cities/parking/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, sun slots ${info.slotsMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('g');
  await page.click('#parking [data-card="pv"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['thermal + night release', 'thermal&hour=23&flux=1']]) {
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

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15'], ['thermal + night release', 'thermal&hour=15&flux=1']]) {
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
