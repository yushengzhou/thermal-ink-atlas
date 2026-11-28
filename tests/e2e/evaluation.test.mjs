// The outside evaluation's page rules (#29 items 2-4 and the sticky footnote
// of item 8), on every block page: visible buttons for the heat view and the
// hour; one short loading hint while the ink is drawn (the first screen stays
// the line art); a phone layout where the bar fits the width, the panels fold
// and the margin notes stay on the canvas; a press on the map closes a
// footnote opened from the cartouche.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open } from './helpers.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const CITIES = readdirSync(`${root}cities`).filter((c) => existsSync(`${root}cities/${c}/scene.js`)).sort();
const PHONE = { width: 390, height: 844 };

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

for (const city of CITIES) {
  test(`${city}: heat view and hour buttons, the loading hint, the phone layout`, async () => {
    // desktop: the bar's buttons do what T, h and H do
    const { page, context, errors } = await open(browser, 'hour=15&f=60', { city });
    assert.equal(await page.evaluate(() => window.atlas.hint()), true, 'the hint while the pen draws');
    assert.ok(/Drawing the (block|street)/.test(await page.locator('#inkHint').textContent()));
    await page.evaluate(() => window.atlas.seek(400));
    assert.equal(await page.evaluate(() => window.atlas.hint()), false, 'gone once the washes are in');
    const thermal0 = (await page.evaluate(() => window.atlas.state())).thermal;
    await page.click('#heatBtn');
    assert.equal((await page.evaluate(() => window.atlas.state())).thermal, !thermal0);
    assert.equal(await page.locator('#heatBtn').getAttribute('aria-pressed'), String(!thermal0));
    const h0 = (await page.evaluate(() => window.atlas.state())).hour;
    await page.click('#bar [data-k="h"]');
    assert.equal((await page.evaluate(() => window.atlas.state())).hour, (h0 + 1) % 24);
    await page.click('#bar [data-k="H"]');
    assert.equal((await page.evaluate(() => window.atlas.state())).hour, h0);
    assert.equal(await page.locator('#keys').textContent(), 'drag · zoom · click a spot');
    // a footnote opened from the cartouche closes when the map is pressed (hover and pinned alike); the margin notes off, so the press lands on the map
    await page.evaluate(() => window.atlas.look({ notes: false }));
    await page.locator('#cartouche .gl').first().click();
    assert.equal(await page.locator('#fn').isHidden(), false);
    await page.mouse.move(900, 420);
    await page.mouse.down();
    await page.mouse.move(960, 440, { steps: 4 });
    await page.mouse.up();
    assert.equal(await page.locator('#fn').isHidden(), true, 'a press on the map closes the footnote');
    assert.deepEqual(errors, []);
    await context.close();
    // phone: the bar inside the screen, the panels folded, the notes on the canvas
    const ph = await open(browser, 'hour=15&f=640', { city, viewport: PHONE });
    const bar = await ph.page.locator('#bar').boundingBox();
    assert.ok(bar.x >= 0 && bar.x + bar.width <= PHONE.width + 0.5, `bar ${JSON.stringify(bar)}`);
    for (const b of await ph.page.locator('#bar button').all()) {
      const r = await b.boundingBox();
      assert.ok(r.x >= 0 && r.x + r.width <= PHONE.width + 0.5, `button ${JSON.stringify(r)}`);
    }
    for (const d of await ph.page.locator('.blockpanel > details:not(.cards)').all()) assert.equal(await d.evaluate((e) => e.open), false, 'panels start folded on a phone');
    const hits = await ph.page.evaluate(() => {
      window.atlas.seek(640);
      return window.atlas.noteTerms();
    });
    for (const h of hits) assert.ok(h.x >= 0 && h.x + h.w <= PHONE.width + 0.5, `note term ${JSON.stringify(h)}`);
    assert.deepEqual(ph.errors, []);
    await ph.context.close();
  });
}
