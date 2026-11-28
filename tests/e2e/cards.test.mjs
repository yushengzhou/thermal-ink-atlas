// Every block page (1-12), as a reader clicks through it: every block-panel
// card, a grid of heat cards (ground, roofs and trees, whatever the click
// hits) and every terms-panel footnote. Fails on "undefined", "NaN",
// "[object", a source key with no text (a key built at runtime that the
// per-page SOURCES cut dropped), an empty "Sources:" line, or a page error.
// Every card also keeps the outside evaluation's layout (#29 item 1): a
// heading, then one everyday sentence; the expert part closed and last; no
// file paths, "the brief", "from memory", "unverified" tags or source keys in
// the visible part; links only to the references page (#29 item 5).
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

/** Breaches of the #29 card layout in a card's HTML. */
export function layoutProblems(html) {
  const out = [];
  const body = html.replace(/<button[^>]*>.*?<\/button>/, '').trim();
  if (!/^<h3>[\s\S]*?<\/h3>\s*<p class="lead">/.test(body)) out.push('no heading + lead sentence first');
  const lead = /<p class="lead">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? '';
  if (/[αεμτρΔ]|W m⁻²|J m⁻²|\bK\b|Tmrt|unverified|\[\w+\]/.test(lead.replace(/<[^>]+>/g, ''))) out.push(`lead not plain: ${lead.replace(/<[^>]+>/g, '').slice(0, 80)}`);
  const i = html.indexOf('<details class="expert">');
  if (i < 0) out.push('no expert part');
  else {
    if (/<details class="expert" open/.test(html)) out.push('expert part open');
    if (!html.trim().endsWith('</details>')) out.push('expert part not last');
    const visible = html.slice(0, i).replace(/<[^>]+>/g, ' ');
    const m = visible.match(/docs\/|\.md\b|the brief|from memory|unverified|\[\w+\]/);
    if (m) out.push(`visible part says "${m[0]}"`);
  }
  for (const m of html.matchAll(/href="([^"]*)"/g)) if (!/^\.\.\/\.\.\/references\.html(#[\w-]+)?$/.test(m[1])) out.push(`link ${m[1]}`);
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
  const ok = '<button class="x">×</button><h3>A</h3><p class="lead">Plain words.</p><p>x</p><details class="expert"><summary>For experts</summary><a href="../../references.html#desert">[k]</a> unverified</details>';
  assert.deepEqual(layoutProblems(ok), []);
  assert.ok(layoutProblems(ok.replace('Plain words.', 'Tmrt +2 K')).length > 0);
  assert.ok(layoutProblems(ok.replace('<p>x</p>', '<p>see docs/sources.md</p>')).length > 0);
  assert.ok(layoutProblems(ok.replace('<details class="expert">', '<details class="expert" open>')).length > 0);
  assert.ok(layoutProblems(ok.replace('../../references.html#desert', 'docs/sources.md')).length > 0);
});

for (const city of CITIES) {
  test(`${city}: every block card, a grid of heat cards and every footnote read cleanly`, async () => {
    const { page, context, errors } = await open(browser, 'hour=15&f=400', { city });
    await page.evaluate(() => window.atlas.look({ notes: false, people: false }));
    const problems = [];
    // the card's text with its expert part opened (so it is read too), and its HTML as built
    const cardText = () => page.locator('#card').evaluate((e) => {
      if (e.style.display === 'none') return '';
      const html = e.innerHTML;
      for (const d of e.querySelectorAll('details')) d.open = true;
      e.dataset.html = html;
      return e.innerText;
    });
    const cardHtml = () => page.locator('#card').evaluate((e) => e.dataset.html ?? '');
    // block-panel cards (and the retrofit measures), every folded list opened
    await page.evaluate(() => { for (const d of document.querySelectorAll('.blockpanel details')) d.open = true; });
    let blockCards = 0;
    for (const b of await page.locator('button[data-card], button[data-measure]').all()) {
      if (!(await b.isVisible())) continue;
      await b.click();
      const t = await cardText();
      if (!t) continue;
      blockCards++;
      const id = (await b.getAttribute('data-card')) ?? (await b.getAttribute('data-measure'));
      for (const p of problemsIn(t)) problems.push(`card ${id}: ${p}`);
      for (const p of layoutProblems(await cardHtml())) problems.push(`card ${id}: ${p}`);
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
        for (const p of layoutProblems(await cardHtml())) problems.push(`heat card at ${gx},${gy}: ${p}`);
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
