// Determinism (same frame hash regardless of seek order) and build order
// (pen scaffold -> colour wash -> life).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { launch, open } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

const CAM_A = { z: 3, cx: 200, cy: 250 };
const CAM_B = { z: 5.5, cx: 190, cy: 340 };
// 24 frames across the intro phases, the steady state, two cameras and both looks
const FRAMES = [
  [0, CAM_A, 0], [40, CAM_A, 0], [90, CAM_A, 0], [149, CAM_A, 0], [160, CAM_A, 0], [200, CAM_A, 0],
  [239, CAM_A, 0], [260, CAM_A, 0], [300, CAM_A, 0], [400, CAM_A, 0], [777, CAM_A, 0], [1500, CAM_A, 0],
  [400, CAM_A, 1], [901, CAM_A, 1], [2000, CAM_A, 1], [60, CAM_B, 0], [210, CAM_B, 0], [420, CAM_B, 0],
  [999, CAM_B, 0], [420, CAM_B, 1], [5000, CAM_B, 1], [123, CAM_A, 0], [3601, CAM_A, 0], [3601, CAM_B, 1],
];

async function hashes(page, order) {
  return page.evaluate(([frames, order]) => {
    const out = {};
    for (const i of order) {
      const [f, cam, thermal] = frames[i];
      window.atlas.look({ thermal: !!thermal, hour: 15, intro: true });
      window.atlas.seek(f, cam);
      out[i] = window.atlas.hash();
    }
    return out;
  }, [FRAMES, order]);
}

test('frame hashes do not depend on seek order (24 frames, fresh page and shuffled)', async () => {
  const forward = FRAMES.map((_, i) => i);
  const shuffled = forward.map((i) => [((i * 7919) % 31) / 31, i]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const reversed = [...forward].reverse();
  const a = await open(browser);
  const h1 = await hashes(a.page, forward);
  const h2 = await hashes(a.page, reversed);
  await a.context.close();
  const b = await open(browser);
  const h3 = await hashes(b.page, shuffled);
  await b.context.close();
  assert.equal(new Set(Object.values(h1)).size > 15, true, 'frames should differ from each other');
  for (const i of forward) {
    assert.equal(h2[i], h1[i], `frame ${FRAMES[i][0]} differs (reverse order)`);
    assert.equal(h3[i], h1[i], `frame ${FRAMES[i][0]} differs (fresh page, shuffled)`);
  }
});

test('?f=N renders the same pixels as seek(N)', async () => {
  const a = await open(browser, 'f=420&cam=5.5,190,340');
  const direct = await a.page.evaluate(() => window.atlas.hash());
  await a.context.close();
  const b = await open(browser);
  const seeked = await b.page.evaluate(() => {
    window.atlas.seek(420, { z: 5.5, cx: 190, cy: 340 });
    return window.atlas.hash();
  });
  await b.context.close();
  assert.equal(direct, seeked);
});

test('draws itself in order: pen scaffold, then colour wash, then life', async () => {
  const { page, context } = await open(browser);
  const probe = (f) => page.evaluate((f) => {
    window.atlas.look({ intro: true, thermal: false, hour: 15 });
    const s = window.atlas.seek(f);
    const c = document.getElementById('atlas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    // pigment coverage: share of pixels clearly away from the paper colour
    let n = 0;
    let k = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      k++;
      if (Math.abs(d[i] - 243) + Math.abs(d[i + 1] - 236) + Math.abs(d[i + 2] - 221) > 60) n++;
    }
    return { phase: s.phase, people: s.people, sat: n / k };
  }, f);
  const pen = await probe(100);
  const washEarly = await probe(170);
  const washLate = await probe(235);
  const life = await probe(280);
  const steady = await probe(400);
  console.log({ pen, washEarly, washLate, life, steady });
  assert.equal(pen.phase, 'pen');
  assert.equal(pen.people, 0);
  assert.equal(washLate.phase, 'wash');
  assert.equal(washLate.people, 0);
  assert.ok(pen.sat < washEarly.sat && washEarly.sat < washLate.sat, 'colour arrives after the ink');
  assert.ok(life.people > 0 && steady.people > 0, 'people arrive last');
  // ink comes first and keeps growing through the pen phase
  const early = await probe(20);
  assert.ok(early.sat < pen.sat);
  await context.close();
});

test('T toggles the thermal view, H and the slider move the hour, ?thermal&hour=15 opens there', async () => {
  const { page, context } = await open(browser, 'thermal&hour=15');
  let s = await page.evaluate(() => window.atlas.state());
  assert.equal(s.thermal, true);
  assert.equal(s.hour, 15);
  assert.equal(s.mix, 1);
  await page.keyboard.press('t');
  s = await page.evaluate(() => {
    const st = window.atlas.state();
    window.atlas.seek(st.frame + 61);
    return window.atlas.state();
  });
  assert.equal(s.thermal, false);
  assert.equal(s.mix, 0);
  await page.keyboard.press('t');
  s = await page.evaluate(() => {
    const st = window.atlas.state();
    window.atlas.seek(st.frame + 30);
    return window.atlas.state();
  });
  assert.ok(s.thermal && s.mix > 0.3 && s.mix < 0.7, `cross-fade midway, mix ${s.mix}`);
  await page.keyboard.press('h');
  assert.equal((await page.evaluate(() => window.atlas.state())).hour, 16);
  await page.keyboard.press('Shift+H');
  await page.keyboard.press('Shift+H');
  assert.equal((await page.evaluate(() => window.atlas.state())).hour, 14);
  await page.locator('#hour').fill('23');
  assert.equal((await page.evaluate(() => window.atlas.state())).hour, 23);
  assert.match(await page.locator('#hourLabel').textContent(), /23:00/);
  await context.close();
});

test('clicking a parcel opens a heat card with values, unverified labels and sources', async () => {
  const { page, context } = await open(browser, 'hour=15&notes=0');
  const [x, y] = await page.evaluate(() => window.atlas.project(215, 160, 0));
  await page.mouse.click(x, y);
  const card = page.locator('#card');
  await card.waitFor({ state: 'visible' });
  const text = await card.textContent();
  assert.match(text, /Kiln Street/);
  assert.match(text, /Aged asphalt/);
  assert.match(text, /albedo/);
  assert.match(text, /sky view factor/);
  assert.match(text, /3 pm \/ 11 pm/);
  assert.match(text, /Tmrt/);
  assert.match(text, /unverified/);
  assert.match(text, /Sources:/);
  // a roof (centre the camera on it first)
  await page.evaluate(() => window.atlas.seek(400, { z: 3, cx: 325, cy: 128 }));
  const [rx, ry] = await page.evaluate(() => window.atlas.project(325, 127.5, 18));
  await page.mouse.click(rx, ry);
  assert.match(await card.textContent(), /Cool \(white\) roof/);
  await context.close();
});
