// Footnotes for technical terms: every glossary term opens its footnote (click,
// hover, keyboard focus, tap), closes with Esc / click outside; the page says
// the block is simulated.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { launch, open } from './helpers.mjs';
import { GLOSSARY, termsFor } from '../../engine/glossary.js';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

const fnKey = (page) => page.evaluate(() => (document.getElementById('fn').hidden ? null : document.getElementById('fn').dataset.key));

test('every glossary term opens its footnote from the terms panel; Esc closes it', async () => {
  const { page, context, errors } = await open(browser, 'hour=15&f=400');
  await page.click('#termsBtn');
  for (const key of termsFor('asphalt-park')) {
    const g = GLOSSARY[key];
    await page.locator(`#termsList .gl[data-gl="${key}"]`).click();
    assert.equal(await fnKey(page), key);
    const text = await page.locator('#fn').textContent();
    assert.ok(text.includes(g.term) && text.includes(g.model ? 'In this model:' : 'Typical:') && text.includes('Why it matters:'), key);
    assert.ok(!/undefined|NaN/.test(text), `${key}: ${text}`);
    await page.keyboard.press('Escape');
    assert.equal(await fnKey(page), null, `${key} closes with Esc`);
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('heat card, header and legend terms open footnotes (click, hover, focus); click outside closes', async () => {
  const { page, context } = await open(browser, 'thermal&hour=15&f=400');
  const [x, y] = await page.evaluate(() => window.atlas.project(215, 160, 0));
  await page.mouse.click(x, y);
  // the model's terms sit in the card's closed expert part (#29): open it
  await page.locator('#card details.expert summary').click();
  for (const key of ['albedo', 'emissivity', 'admittance', 'ef', 'svf', 'surfaceTemp', 'nightLag', 'tmrt', 'forceRestore']) {
    await page.locator(`#card .gl[data-gl="${key}"]`).first().click();
    assert.equal(await fnKey(page), key, `card ${key}`);
  }
  // click outside (on the cartouche text) closes
  await page.click('#cartouche h1');
  assert.equal(await fnKey(page), null);
  // the card, taller with its expert part open, may reach the legend: close it (Escape)
  await page.keyboard.press('Escape');
  // hover opens and leaving closes
  await page.hover('#legend .gl[data-gl="forceRestore"]');
  assert.equal(await fnKey(page), 'forceRestore');
  await page.mouse.move(5, 790);
  await page.waitForTimeout(450);
  assert.equal(await fnKey(page), null);
  // keyboard focus opens; Enter toggles it closed
  await page.locator('#cartouche .gl[data-gl="surfaceTemp"]').focus();
  assert.equal(await fnKey(page), 'surfaceTemp');
  await page.keyboard.press('Enter');
  assert.equal(await fnKey(page), null);
  // tooltip semantics: trigger described by #fn and expanded while open
  await page.locator('#cartouche .gl[data-gl="forceRestore"]').click();
  assert.equal(await page.getAttribute('#fn', 'role'), 'tooltip');
  assert.equal(await page.getAttribute('#cartouche .gl[data-gl="forceRestore"]', 'aria-describedby'), 'fn');
  assert.equal(await page.getAttribute('#cartouche .gl[data-gl="forceRestore"]', 'aria-expanded'), 'true');
  // hover over another term does not replace a pinned footnote
  await page.hover('#legend .gl[data-gl="surfaceTemp"]');
  await page.waitForTimeout(400);
  assert.equal(await fnKey(page), 'forceRestore');
  await page.keyboard.press('Escape');
  assert.equal(await page.getAttribute('#cartouche .gl[data-gl="forceRestore"]', 'aria-expanded'), 'false');
  // a focus-opened footnote closes when focus moves off the terms (to the slider)
  await page.locator('#legend .gl[data-gl="forceRestore"]').focus();
  assert.equal(await fnKey(page), 'forceRestore');
  await page.locator('#hour').focus();
  assert.equal(await fnKey(page), null);
  // the cool-roof card marks "cool roof"
  await page.evaluate(() => window.atlas.seek(400, { z: 3, cx: 325, cy: 128 }));
  const [rx, ry] = await page.evaluate(() => window.atlas.project(325, 127.5, 18));
  await page.mouse.click(rx, ry);
  await page.locator('#card .gl[data-gl="coolRoof"]').first().click();
  assert.equal(await fnKey(page), 'coolRoof');
  await context.close();
});

test('terms inside the canvas margin notes open footnotes', async () => {
  const { page, context } = await open(browser, 'hour=15&f=400');
  const hits = await page.evaluate(() => window.atlas.noteTerms());
  assert.ok(hits.length >= 5, `note terms: ${hits.length}`);
  for (const h of hits) {
    await page.mouse.click(h.x + h.w / 2, h.y - 6);
    assert.equal(await fnKey(page), h.key);
    await page.keyboard.press('Escape');
  }
  await context.close();
});

test('tap on a term opens its footnote on touch screens', async () => {
  const { page, context } = await open(browser, 'hour=15&f=400', { touch: true });
  await page.tap('#cartouche .gl[data-gl="forceRestore"]');
  assert.equal(await fnKey(page), 'forceRestore');
  await context.close();
});

test('the page and gallery say the block is made up and its temperatures calculated (#29 wording)', async () => {
  const { page, context } = await open(browser, 'thermal&hour=15&f=400');
  assert.match(await page.locator('#cartouche').textContent(), /Made-up block, calculated temperatures/);
  assert.match(await page.locator('#legend').textContent(), /Calculated for a made-up block, not measured/);
  await context.close();
  const gallery = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.equal((gallery.match(/Made-up block · calculated temperatures/g) ?? []).length, 12);
  assert.ok(!/energy-balance model|offline HTML file|Press [A-Z]\b/.test(gallery));
});
