// Blocks 1-11 are unchanged by later blocks: every page renders the same
// pixels, notes and probe values as its fixture page, kept gzipped in
// tests/fixtures/base-pages. Blocks 1-10 were refreshed deliberately in the
// final pass (outside evaluation #29) from ec0417e: plain-word margin notes and
// overlay labels, notes kept on the canvas, lit windows no longer shining
// through nearer roofs, and the glass block's reflected patch and façade
// colours; their probe values were checked equal to the earlier fixtures
// (block 1-3 from 8e76f7a, 4 from 189b7e1, 5 from 40b5366, 6 from 577a750,
// 7 from 1e292a5, 8 from 8735385, 9 from de54f2a, 10 from f751d00) before
// the refresh. Block 11's fixture is still the one from d75de57 (the block 11
// branch tip before block 12). Parking, campus, estate and village were
// refreshed again from c05dff3: their bottom overlay labels move beside the
// controls panel (review of #33, N6); only the label strip (y 671-720 of 800)
// moved, probes and notes equal on all their cases. All eleven were refreshed
// again from 8bf78e3 (outside evaluation of #33): the notes say "radiant heat"
// instead of "feels like" and avoid the page's panels, the bar and each other
// (leaders drawn under the boxes), long shadows are clipped to the board, and the
// title box changed height (so bottom overlay labels may sit elsewhere); probe
// values equal on all 65 cases. Both pages run in the same browser here, so
// the comparison does not depend on the platform.
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
  campus: ['hour=15&f=640', 'thermal&hour=15&f=640', 'hour=14.25&f=640&irrigate=1&cam=3.5,160,130', 'thermal&hour=15&f=777&burn=1&cam=4,320,210', 'hour=10.25&f=400&notes=0&cam=5,330,210', 'thermal&hour=23&f=1500&irrigate=1&burn=1'],
  estate: ['hour=15&f=640', 'thermal&hour=15&f=640', 'hour=12&f=640&date=dajhan', 'thermal&hour=21&f=777&ac=1&cam=3.5,230,250', 'hour=9.25&f=400&date=dajhan&ac=1&notes=0&cam=4,70,200', 'thermal&hour=4&f=1500&acwall=0'],
  busstop: ['hour=15&f=640', 'thermal&hour=15&f=640', 'hour=15&f=1650&spots=1&cam=5.5,265,195', 'thermal&hour=16.25&f=777&burn=1&cam=4,200,262', 'hour=12&f=400&spots=1&burn=1&notes=0&cam=1.75,200,180', 'thermal&hour=4&f=1500&spots=1&burn=1'],
  village: ['hour=15&f=640', 'thermal&hour=15&f=640', 'thermal&hour=22&f=640&notes=0&cam=4,150,200', 'hour=15&f=640&under=1&notes=0&cam=4,130,340', 'thermal&hour=15&f=777&coolroof=1&cam=4,130,340', 'hour=21&f=1500&coolroof=1&under=1&cam=5,120,330'],
  desert: ['hour=15&f=640', 'thermal&hour=15&f=640', 'thermal&hour=21&f=640&notes=0&cam=3.5,300,120', 'hour=15&f=640&water=1&notes=0&cam=3,300,200', 'thermal&hour=15&f=777&coat=0&cam=4,120,190', 'f=120', 'hour=12&f=1500&coat=0&water=1&cam=5,250,40'],
};
// which page each fixture is (for messages)
const BEFORE = Object.fromEntries(['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate', 'campus', 'busstop', 'village', 'desert'].map((c) => [c, 'the #33 outside evaluation']));

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
