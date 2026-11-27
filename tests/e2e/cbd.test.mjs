// Block 3 (glass-cbd) in the running page: glass query modes, buttons and the
// G key, determinism in every glass mode, thermal pixel means (reflection
// spots and the canyon at night), the day-view glint, walkers and the sweat
// cue, cards, the AC overlay, glossary, size / offline / load time, frame
// pacing and the hour-slider drag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open, pct, regionPixelMeans } from './helpers.mjs';
import { base3 } from '../../scripts/cbd.mjs';
import { termsFor, GLOSSARY } from '../../engine/glossary.js';
import { cellMat } from '../../engine/thermal.js';
import { spotClasses } from '../../engine/cbd.js';
import { GLASS } from '../../engine/materials.js';

const CITY = { city: 'glass-cbd' };
const strict = process.env.PERF_STRICT === '1' || !process.env.CI;

let browser;
let B;
before(async () => {
  browser = await launch();
  B = base3();
});
after(() => browser.close());

const go = (q, opts = {}) => open(browser, q, { ...CITY, ...opts });

/** Cell boxes for the pixel checks (ground cells: z 0, b -1). */
const boxes = (cells) => cells.map((i) => {
  const x0 = (i % B.world.n) * B.world.cell;
  const y0 = Math.floor(i / B.world.n) * B.world.cell;
  return { x0, y0, x1: x0 + B.world.cell, y1: y0 + B.world.cell, z: 0, b: -1 };
});

/**
 * Cells whose centre is on screen for a camera "z,cx,cy" (1280 x 800, DPR 1)
 * and not hidden behind a building: a ground point (x, y) is hidden by a box
 * of height h if (x + t, y + t) lies inside its footprint for some
 * t in [0, 0.95 h] (the isometric view from the south-east).
 */
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
    for (const b of B.world.buildings) {
      const lo = Math.max(b.x0 - x, b.y0 - y, 0);
      const hi = Math.min(b.x1 - x, b.y1 - y, 0.95 * b.h);
      if (lo < hi) return false;
    }
    return true;
  });
}

test('glass query modes, buttons and the G key', async () => {
  for (const [q, want] of [['', 'lowe'], ['glass=clear', 'clear'], ['glass=lowe', 'lowe'], ['glass=mirror', 'mirror'], ['glass=gold', 'lowe']]) {
    const { page, context, errors } = await go(`hour=15&f=400&${q}`);
    const st = await page.evaluate(() => ({ ...window.atlas.glass.state(), pressed: document.querySelector('#glass [aria-pressed="true"][data-glass]').dataset.glass, notes: window.atlas.notes().map((n) => n.text.join(' ')).join(' | ') }));
    assert.equal(st.glass, want, q);
    assert.equal(st.pressed, want);
    assert.ok(st.notes.includes(GLASS[want].name.toLowerCase()), `${q}: note names the glass`);
    assert.deepEqual(errors, []);
    await context.close();
  }
  const { page, context, errors } = await go('hour=15&f=400');
  await page.click('#glass [data-glass="mirror"]');
  assert.equal((await page.evaluate(() => window.atlas.glass.state())).glass, 'mirror');
  await page.keyboard.press('g');
  assert.equal((await page.evaluate(() => window.atlas.glass.state())).glass, 'clear', 'g cycles forward');
  await page.keyboard.press('G');
  assert.equal((await page.evaluate(() => window.atlas.glass.state())).glass, 'mirror', 'G cycles back');
  assert.deepEqual(errors, []);
  await context.close();
});

const CAM_A = { z: 2, cx: 235, cy: 225 };
const CAM_B = { z: 4, cx: 160, cy: 215 };
// [frame, cam, thermal, hour, {glass, ac}]
const FRAMES = [
  [400, CAM_A, 0, 15, { glass: 'lowe', ac: false }],
  [400, CAM_A, 1, 15, { glass: 'lowe', ac: false }],
  [90, CAM_A, 0, 15, { glass: 'lowe', ac: false }],
  [400, CAM_A, 0, 15, { glass: 'clear', ac: false }],
  [400, CAM_A, 1, 15, { glass: 'mirror', ac: false }],
  [777, CAM_B, 0, 12, { glass: 'mirror', ac: false }],
  [777, CAM_B, 1, 12, { glass: 'clear', ac: false }],
  [901, CAM_B, 0, 15, { glass: 'lowe', ac: true }],
  [1500, CAM_A, 1, 5, { glass: 'lowe', ac: false }],
  [3601, CAM_A, 0, 9, { glass: 'mirror', ac: true }],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal, hour, g] = frames[i];
      window.atlas.glass.set(g);
      window.atlas.look({ thermal: !!thermal, hour, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('deterministic in every glass mode: same hash regardless of order, and from a fresh ?query page', async () => {
  const forward = FRAMES.map((_, i) => i);
  const reversed = [...forward].reverse();
  const shuffled = forward.map((i) => [((i * 7919) % 11) / 11, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const a = await go('notes=1');
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await go('');
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size, FRAMES.length, 'frames differ from each other');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${i} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${i} differs (fresh page, shuffled)`);
  }
  for (const i of [4, 7]) {
    const [f, cam, thermal, hour, g] = FRAMES[i];
    const q = `f=${f}&cam=${cam.z},${cam.cx},${cam.cy}&hour=${hour}${thermal ? '&thermal' : ''}&glass=${g.glass}${g.ac ? '&ac=1' : ''}`;
    const c = await go(q);
    assert.equal(await c.page.evaluate(() => window.atlas.hash()), h1[i], `?${q}`);
    await c.context.close();
  }
});

test('thermal view at 15:00: reflection-spot ground reads hotter than plain shade, close to the model, clear vs mirror', async () => {
  const { world, setup } = B;
  const out = {};
  for (const g of ['clear', 'mirror']) {
    const T = setup.model(g);
    const cam = '2,200,215';
    const all = spotClasses(world, T, 15);
    // ground cells in view, split by class (model means over the same cells)
    const c = Object.fromEntries(['spotShade', 'shade', 'spotSun'].map((k) => [k, visibleCells(all[k], cam)]));
    const spec = { spotShade: boxes(c.spotShade), shade: boxes(c.shade), spotSun: boxes(c.spotSun) };
    const { page, context } = await go(`thermal&hour=15&notes=0&people=0&f=400&glass=${g}&cam=${cam}`);
    const res = await regionPixelMeans(page, spec, 2, 14);
    await context.close();
    out[g] = {};
    for (const k of Object.keys(spec)) {
      const cells = c[k];
      const model = cells.reduce((s, i) => s + T.ts(i, 15), 0) / cells.length;
      console.log(`  ${g.padEnd(6)} ${k.padEnd(9)} pixels ${res[k].mean.toFixed(1)} (n ${res[k].n}) model ${model.toFixed(1)} (${cells.length} cells)`);
      assert.ok(res[k].n >= 150, `${g} ${k}: only ${res[k].n} px`);
      assert.ok(Math.abs(res[k].mean - model) < 3, `${g} ${k}: pixels vs model`);
      out[g][k] = res[k].mean;
    }
    assert.ok(out[g].spotShade > out[g].shade + 2, `${g}: shaded spots read hotter than plain shade`);
  }
  assert.ok(out.mirror.spotShade > out.clear.spotShade, 'mirror spots read hotter than clear');
});

test('night 05:00 thermal: the Silk Lane floor reads warmer than the open plaza paving', async () => {
  const { world, setup, scene } = B;
  const T = setup.model('lowe');
  const L = scene.canyons.lane;
  const lane = [];
  const plaza = [];
  for (let i = 0; i < world.n * world.n; i++) {
    if (world.bld[i] >= 0 || cellMat(world, i) !== 'stone') continue;
    const y = (Math.floor(i / world.n) + 0.5) * world.cell;
    if (y > L.y0 && y < L.y1) lane.push(i);
    else if (world.svf[i] > 0.45 && world.canopy[i] === 0) plaza.push(i);
  }
  const { page, context } = await go('thermal&hour=5&notes=0&people=0&f=400&cam=2.5,240,280');
  const res = await regionPixelMeans(page, { lane: boxes(lane), plaza: boxes(plaza) }, 2, 14);
  await context.close();
  const m = (a) => a.reduce((s, i) => s + T.ts(i, 5), 0) / a.length;
  console.log(`05:00 lane pixels ${res.lane.mean.toFixed(1)} (n ${res.lane.n}, model ${m(lane).toFixed(1)}), plaza pixels ${res.plaza.mean.toFixed(1)} (n ${res.plaza.n}, model ${m(plaza).toFixed(1)})`);
  assert.ok(res.lane.n >= 150 && res.plaza.n >= 150);
  assert.ok(res.lane.mean > res.plaza.mean, 'canyon floor warmer at night');
});

test('day view at 15:00: the glint wash brightens reflection spots, not plain shade', async () => {
  const { world, setup } = B;
  const c = spotClasses(world, setup.model('lowe'), 15);
  const spec = { spotShade: boxes(c.spotShade), spotSun: boxes(c.spotSun), shade: boxes(c.shade) };
  const lum = {};
  for (const glint of ['1', '0']) {
    const { page, context } = await go(`hour=15&notes=0&people=0&f=400&glint=${glint}&cam=2,200,215`);
    lum[glint] = await regionPixelMeans(page, spec, 2, 14, undefined, true);
    await context.close();
  }
  for (const k of Object.keys(spec)) console.log(`  ${k.padEnd(9)} luminance with glint ${lum['1'][k].mean.toFixed(1)}, without ${lum['0'][k].mean.toFixed(1)} (n ${lum['1'][k].n})`);
  assert.ok(lum['1'].spotShade.mean > lum['0'].spotShade.mean + 4, 'shaded spots visibly lighter');
  assert.ok(lum['1'].spotSun.mean > lum['0'].spotSun.mean + 2, 'sunlit spots lighter');
  assert.ok(Math.abs(lum['1'].shade.mean - lum['0'].shade.mean) < 1.5, 'plain shade unchanged');
  assert.ok(lum['1'].spotShade.mean - lum['0'].spotShade.mean < 40, 'subtle, not a white-out');
});

test('walkers avoid reflection spots at 15:00; the sweat cue appears in spots and follows Tmrt', async () => {
  const { page, context } = await go('hour=15&f=400');
  const r = await page.evaluate(() => {
    const d = { plainShade: 0, spotShade: 0, spots: 0, k: 0 };
    for (let f = 300; f < 300 + 60 * 60 * 2; f += 600) {
      const x = window.atlas.glass.density(f, 15);
      d.plainShade += x.plainShade;
      d.spotShade += x.spotShade;
      d.spots += x.spots;
      d.k++;
    }
    const sw = { inSpot: 0, sweatInSpot: 0, bad: 0, people: 0 };
    for (let f = 400; f < 400 + 60 * 40; f += 5) {
      for (const p of window.atlas.sweat(f, 15)) {
        sw.people++;
        if (p.shade === 3 || p.shade === 4) {
          sw.inSpot++;
          if (p.drops > 0) sw.sweatInSpot++;
        }
        if (p.drops > 0 && !(p.tmrt >= 65)) sw.bad++;
      }
    }
    return { d, sw };
  });
  console.log(`15:00 people per 1000 m2: plain shade ${((r.d.plainShade / r.d.k) * 1000).toFixed(2)}, spots in shade ${((r.d.spotShade / r.d.k) * 1000).toFixed(2)}, all spots ${((r.d.spots / r.d.k) * 1000).toFixed(2)}; person-frames in spots ${r.sw.inSpot}, sweating there ${r.sw.sweatInSpot}`);
  assert.ok(r.d.spotShade < r.d.plainShade && r.d.spots < r.d.plainShade, 'lower density in spots than in plain shade');
  assert.ok(r.sw.sweatInSpot > 0, 'sweat cue in spots');
  assert.equal(r.sw.bad, 0, 'sweat only where Tmrt >= 65 C');
  await context.close();
});

test('cards: canyon, each glass, reflection spot, AC heat, extreme case; heat cards show glass and wall reflection', async () => {
  const { page, context, errors } = await go('hour=15&f=400');
  const card = async (id) => {
    await page.click(`#glass [data-card="${id}"]`);
    return page.locator('#card').textContent();
  };
  let t = await card('canyon');
  for (const s of ['Street canyon', 'sky view factor', 'night lag', 'Oke (1981)', 'air + 2 K', 'unverified']) assert.ok(t.includes(s), `canyon: ${s}`);
  for (const g of ['clear', 'lowe', 'mirror']) {
    t = await card(`glass-${g}`);
    for (const s of [GLASS[g].name, 'reflectance ρ₀', 'ΔTmrt', '12:00', '15:00', 'Sources:']) assert.ok(t.includes(s), `${g}: ${s}`);
    assert.match(t, /[−+]\d+\.\d K/);
    if (g !== 'clear') assert.match(t, /unverified/);
  }
  t = await card('spot');
  for (const s of ['out of the sun, still hot', 'plain building shade', 'Chengdu', '+4 to +13', 'Single bounce only', 'reflection off']) assert.ok(t.includes(s), `spot: ${s}`);
  t = await card('ac');
  for (const s of ['1 + 1/COP', '20–70', '400', 'Not felt in this model']) assert.ok(t.includes(s), `ac: ${s}`);
  assert.equal((await page.evaluate(() => window.atlas.glass.state())).ac, true, 'the AC card turns the overlay on');
  t = await card('extreme');
  for (const s of ['concave', '20 Fenchurch', '3,384', 'Vdara', 'out of scope']) assert.ok(t.includes(s), `extreme: ${s}`);
  // heat card on a glass tower
  const [x, y] = await page.evaluate(() => window.atlas.project(195, 170, 60));
  await page.mouse.click(x, y);
  t = await page.locator('#card').textContent();
  assert.match(t, /Exchange Tower|Plaza Tower/);
  assert.match(t, /Curtain wall/);
  assert.match(t, /glass \d+\.\d °C/);
  // a ground card carries the wall and glass reflection rows
  const d = await page.evaluate(() => window.atlas.card('ground', 147.5, 217.5));
  assert.ok(d.wallsNow > 0 && d.glassNow > 0, 'the shaded spot gets sun off walls and glass');
  assert.deepEqual(errors, []);
  await context.close();
});

test('AC overlay: drawn and labelled not felt; deterministic; does not change the model', async () => {
  const on = await go('hour=15&f=400&ac=1');
  const s = await on.page.evaluate(() => ({ stats: window.atlas.seek(400).ac, hash: window.atlas.hash(), probes: window.atlas.probes(15) }));
  await on.context.close();
  const off = await go('hour=15&f=400');
  const s0 = await off.page.evaluate(() => ({ stats: window.atlas.seek(400).ac, hash: window.atlas.hash(), probes: window.atlas.probes(15) }));
  await off.context.close();
  assert.equal(s.stats, true);
  assert.notEqual(s.hash, s0.hash);
  assert.deepEqual(s.probes, s0.probes, 'temperatures are the same with the overlay on');
});

test('block-3 glossary terms open their footnotes; notes and their terms', async () => {
  const { page, context } = await go('hour=15&f=400');
  await page.click('#termsBtn');
  const keys = termsFor('glass-cbd');
  for (const k of ['curtainWall', 'specular', 'fresnel', 'reflectionSpot', 'canyon', 'lowE', 'acHeat', 'wallReflection']) assert.ok(keys.includes(k), k);
  assert.ok(!keys.includes('greenRoof') && !keys.includes('permeable'));
  for (const key of keys) {
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    const t = await page.locator('#fn').textContent();
    assert.ok(t.includes(GLOSSARY[key].term) && !/undefined|NaN/.test(t), `${key}: ${t}`);
    await page.keyboard.press('Escape');
  }
  const notes = await page.evaluate(() => window.atlas.notes());
  assert.ok(notes.length <= 5 && notes.length >= 4);
  assert.ok((await page.evaluate(() => window.atlas.noteTerms())).length >= 4);
  await context.close();
});

test('single file < 500 KB, offline, zero external requests; loads in < 1.5 s', async () => {
  const size = statSync(fileURLToPath(new URL('../../cities/glass-cbd/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const { page, requests, errors, context } = await go('');
  await page.waitForTimeout(1200);
  const info = await page.evaluate(() => window.atlas.info);
  console.log(`load: world ${info.worldMs.toFixed(0)} ms, sun slots ${info.slotsMs.toFixed(0)} ms, reflections ${info.reflMs.toFixed(0)} ms, model ${info.runMs.toFixed(0)} ms, drawing ${info.drawMs.toFixed(0)} ms, total ${info.totalMs.toFixed(0)} ms`);
  assert.ok(info.totalMs < (strict ? 1500 : 3000), `load ${info.totalMs} ms`);
  await page.keyboard.press('t');
  await page.keyboard.press('g');
  await page.click('#glass [data-ac]');
  await page.click('#glass [data-card="spot"]');
  await page.mouse.click(900, 420);
  await page.waitForTimeout(400);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
  await context.close();
});

for (const [name, query] of [['day', 'hour=15'], ['thermal', 'thermal&hour=15']]) {
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

test('switching glass and back returns the exact frame of a fresh page', async () => {
  const { page, context } = await go('hour=15&f=400');
  const h = await page.evaluate(() => {
    window.atlas.glass.set({ glass: 'mirror' });
    window.atlas.glass.set({ glass: 'clear' });
    window.atlas.glass.set({ glass: 'lowe' });
    window.atlas.seek(400);
    return window.atlas.hash();
  });
  await context.close();
  const f = await go('hour=15&f=400&glass=lowe');
  assert.equal(await f.page.evaluate(() => window.atlas.hash()), h);
  await f.context.close();
});
