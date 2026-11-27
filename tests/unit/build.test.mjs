// The built page: single file, under budget, nothing external, up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const CITIES = ['asphalt-park', 'sponge-retrofit'];
const file = (c) => `${root}cities/${c}/index.html`;

test('build succeeds and the committed files are current', () => {
  const before = CITIES.map((c) => readFileSync(file(c), 'utf8'));
  execFileSync(process.execPath, [`${root}scripts/build.mjs`], { stdio: 'pipe' });
  CITIES.forEach((c, k) => assert.equal(readFileSync(file(c), 'utf8'), before[k], `${c}: run \`npm run build\` and commit the result`));
});

for (const c of CITIES) {
  test(`${c}: built file < 500 KB with no external references`, () => {
    const size = statSync(file(c)).size;
    console.log(`${c} built size: ${(size / 1024).toFixed(1)} KB`);
    assert.ok(size < 500 * 1024);
    const html = readFileSync(file(c), 'utf8');
    assert.ok(!/https?:\/\//i.test(html), 'contains a URL');
    assert.ok(!/<(script|link|img|iframe)[^>]+(src|href)=/i.test(html), 'references a resource');
    assert.ok(!/Math\.random\s*\(|Date\.now\s*\(|new Date\s*\(/.test(html), 'non-deterministic source in drawing code');
  });
}
