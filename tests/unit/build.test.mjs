// The built page: single file, under budget, nothing external, up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const file = `${root}cities/asphalt-park/index.html`;

test('build succeeds and the committed file is current', () => {
  const before = readFileSync(file, 'utf8');
  execFileSync(process.execPath, [`${root}scripts/build.mjs`], { stdio: 'pipe' });
  assert.equal(readFileSync(file, 'utf8'), before, 'run `npm run build` and commit the result');
});

test('built file < 500 KB with no external references', () => {
  const size = statSync(file).size;
  console.log(`built size: ${(size / 1024).toFixed(1)} KB`);
  assert.ok(size < 500 * 1024);
  const html = readFileSync(file, 'utf8');
  assert.ok(!/https?:\/\//i.test(html), 'contains a URL');
  assert.ok(!/<(script|link|img|iframe)[^>]+(src|href)=/i.test(html), 'references a resource');
  assert.ok(!/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/.test(html), 'non-deterministic source in drawing code');
});
