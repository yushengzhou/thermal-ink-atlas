// Every block page (1-11), as a reader clicks through it: every block-panel
// card, a grid of heat cards (ground, roofs and trees, whatever the click
// hits) and every terms-panel footnote. Fails on "undefined", "NaN",
// "[object", a source key with no text (a key built at runtime that the
// per-page SOURCES cut dropped), an empty "Sources:" line, or a page error.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open } from './helpers.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const CITIES = readdirSync(`${root}cities`).filter((c) => existsSync(`${root}cities/${c}/scene.js`)).sort();

/** What a reader must never see in a card or footnote. */
export function problemsIn(text) {
  const out = [];
  if (/undefined|NaN|\[object/.test(text)) out.push('undefined / NaN / [object');
  // a source key followed by nothing: "[key]" then ";", "." or the end of a line
  if (/\[\w+\][ \t]*(?:;|\.|$)/m.test(text)) out.push('source key without its text');
  if (/Sources?:\s*(?:\.|$)/m.test(text)) out.push('empty source line');
  return out;
}

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

test('the check itself flags what it should', () => {
  assert.deepEqual(problemsIn('Sources: [lbnl] Pomerantz et al.; [oke] Oke.'), []);
  assert.ok(problemsIn('Sources: [brief7] undefined.').length > 0);
  assert.ok(problemsIn('Sources: [brief7]; [oke] Oke.').length > 0);
  assert.ok(problemsIn('Sources: .').length > 0);
  assert.ok(problemsIn('Tmrt NaN °C').length > 0);
});

for (const city of CITIES) {
  test(`${city}: every block card, a grid of heat cards and every footnote read cleanly`, async () => {
    const { page, context, errors } = await open(browser, 'hour=15&f=400', { city });
    await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
    const problems = [];
    const cardText = () => page.locator('#card').evaluate((e) => (e.style.display === 'none' ? '' : e.innerText));
    // block-panel cards (and the retrofit measures)
    let blockCards = 0;
    for (const b of await page.locator('button[data-card], button[data-measure]').all()) {
      if (!(await b.isVisible())) continue;
      await b.click();
      const t = await cardText();
      if (!t) continue;
      blockCards++;
      for (const p of problemsIn(t)) problems.push(`card ${(await b.getAttribute('data-card')) ?? (await b.getAttribute('data-measure'))}: ${p}`);
      await page.keyboard.press('Escape');
    }
    // heat cards on a 45 m grid (whatever the click hits: ground, roof or tree)
    let heat = 0;
    for (let gx = 10; gx < 400; gx += 45) {
      for (let gy = 10; gy < 400; gy += 45) {
        const [x, y] = await page.evaluate(([a, b]) => window.atlas.project(a, b, 0), [gx, gy]);
        if (x < 260 || y < 170 || x > 1270 || y > 720) continue; // clear of the cartouche, the panel and the bar
        await page.mouse.click(x, y);
        const t = await cardText();
        if (!t) continue;
        heat++;
        for (const p of problemsIn(t)) problems.push(`heat card at ${gx},${gy}: ${p}`);
        await page.keyboard.press('Escape');
      }
    }
    // every terms-panel footnote
    await page.click('#termsBtn');
    const gls = await page.locator('#termsList .gl').all();
    for (const g of gls) {
      await g.click();
      const t = await page.locator('#fn').textContent();
      if (!t || !t.trim()) problems.push(`term ${await g.getAttribute('data-gl')}: empty footnote`);
      for (const p of problemsIn(t ?? '')) problems.push(`term ${await g.getAttribute('data-gl')}: ${p}`);
      await page.keyboard.press('Escape');
    }
    console.log(`  ${city}: ${blockCards} block cards, ${heat} heat cards, ${gls.length} footnotes`);
    assert.ok(heat >= 20, `${city}: only ${heat} heat cards opened`);
    assert.ok(gls.length >= 10, `${city}: ${gls.length} footnotes`);
    assert.deepEqual(problems, []);
    assert.deepEqual(errors, []);
    await context.close();
  });
}
