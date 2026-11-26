// Budget and offline: < 500 KB, opens with the network off, zero external requests.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch, open } from './helpers.mjs';

let browser;
before(async () => {
  browser = await launch();
});
after(() => browser.close());

test('single file under 500 KB', () => {
  const size = statSync(fileURLToPath(new URL('../../cities/asphalt-park/index.html', import.meta.url))).size;
  console.log(`size ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
});

test('opens offline and makes zero external requests', async () => {
  const { page, requests, errors, context } = await open(browser);
  // let it play through the intro and interact a little
  await page.waitForTimeout(1500);
  await page.keyboard.press('t');
  await page.keyboard.press('h');
  await page.mouse.click(640, 420);
  await page.waitForTimeout(500);
  assert.deepEqual(requests, [], `external requests: ${requests.join(', ')}`);
  assert.deepEqual(errors, []);
  await context.close();
});
