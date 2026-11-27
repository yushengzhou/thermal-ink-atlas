// Blocks 1-6 are unchanged by later blocks: every page renders the same
// pixels, notes and probe values as its fixture page, kept gzipped in
// tests/fixtures/base-pages: blocks 1-3 as built before block 4 (main at
// 8e76f7a), block 4 as built before block 5 (189b7e1), block 5 as built
// before block 6 (40b5366, the block 5 branch), block 6 as first built
// (577a750, before the shared-core diet). Both pages run in the
// same browser here, so the comparison does not depend on the platform.
// A deliberate change to these blocks must refresh the fixtures: commit the
// rebuilt pages, then `npm run fixtures` (gzips them from HEAD) and commit.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, pageFor, VIEWPORT } from './helpers.mjs';

const CASES = {
  'asphalt-park': ['hour=15&f=400', 'thermal&hour=15&f=400', 'thermal&hour=23&f=777&cam=5.5,190,340', 'f=120', 'f=200&hour=9', 'hour=15&f=640&notes=0'],
  'sponge-retrofit': ['hour=15&f=640', 'thermal&hour=15&f=640', 'thermal&hour=15&f=640&state=split&split=0.42&d=0&cam=3.5,300,250', 'state=before&hour=12&f=400', 'state=after&thermal&hour=23&f=400&materials=new'],
  'glass-cbd': ['hour=15&f=640', 'thermal&hour=15&f=640&glass=clear', 'thermal&hour=5&f=640&cam=4.5,150,280', 'hour=12&f=400&glass=mirror&ac=1', 'hour=9&f=400&cam=5.5,160,222&glass=lowe'],
  waterfront: ['hour=15&f=640', 'thermal&hour=15&f=640', 'thermal&hour=4&f=640&cam=3.5,205,212&u=1', 'hour=15&f=640&air=1&notes=0&cam=3.5,200,95', 'hour=9&f=777&wind=0&cam=4.5,130,160', 'thermal&hour=23&f=400&u=1&air=1'],
  hutong: ['hour=15&f=640', 'thermal&hour=15&f=640', 'thermal&hour=21&f=640&cam=3.5,120,240&splash=1', 'thermal&hour=21&f=400&splash=0', 'hour=12.25&f=777&cam=5.5,125,240&notes=0', 'thermal&hour=23&f=1500&cam=5,125,245'],
  parking: ['hour=15&f=640', 'thermal&hour=15&f=640', 'thermal&hour=23&f=640&flux=1', 'thermal&hour=23&f=777&flux=1&notes=0&cam=4,140,170', 'hour=12&f=500&flux=1&cam=5,70,150', 'hour=9&f=400&cam=5.5,330,150'],
};
// which page each fixture is (for messages)
const BEFORE = { 'asphalt-park': 'block 4', 'sponge-retrofit': 'block 4', 'glass-cbd': 'block 4', waterfront: 'block 5', hutong: 'block 6', parking: 'the shared-core diet' };

let browser;
let dir;
before(async () => {
  browser = await launch();
  dir = mkdtempSync(join(tmpdir(), 'tia-base-'));
});
after(async () => {
  await browser.close();
  rmSync(dir, { recursive: true, force: true });
});

async function snap(url) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  await context.setOffline(true);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.waitForFunction(() => window.atlas && window.atlas.ready, null, { timeout: 30000 });
  const out = await page.evaluate(() => ({ hash: window.atlas.hash(), notes: window.atlas.notes(), probes: window.atlas.probes(15) }));
  await context.close();
  return { ...out, errors };
}

for (const [city, queries] of Object.entries(CASES)) {
  test(`${city}: same pixels, notes and probe values as before ${BEFORE[city]}`, async () => {
    const base = join(dir, `${city}.html`);
    writeFileSync(base, gunzipSync(readFileSync(new URL(`../fixtures/base-pages/${city}.html.gz`, import.meta.url))));
    for (const q of queries) {
      const a = await snap(`${pathToFileURL(base).href}?${q}`);
      const b = await snap(`${pageFor(city)}?${q}`);
      assert.deepEqual(b.errors, [], q);
      assert.equal(b.hash, a.hash, `${city} ?${q}: pixels differ from the page before ${BEFORE[city]}`);
      assert.deepEqual(b.notes, a.notes, `${city} ?${q}: notes differ`);
      assert.deepEqual(b.probes, a.probes, `${city} ?${q}: probe values differ`);
    }
  });
}
