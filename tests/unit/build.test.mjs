// The built page: single file, under budget, nothing external, up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { modulesFor, BLOCKS, STUBS } from '../../scripts/build.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const CITIES = ['asphalt-park', 'glass-cbd', 'sponge-retrofit', 'waterfront'];
// block-specific modules each page must carry (all other block modules are stubs)
const OWN = { 'asphalt-park': [], 'sponge-retrofit': ['retrofit', 'retroui'], 'glass-cbd': ['cbd', 'cbdui'], waterfront: ['wind', 'waterfront', 'wfui'] };
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

test('each page carries only its own block modules; left-out modules are predicate stubs', () => {
  const blockMods = BLOCKS.flatMap((b) => b.modules);
  for (const c of CITIES) {
    const mods = modulesFor(readFileSync(`${root}cities/${c}/scene.js`, 'utf8'));
    const real = mods.filter((x) => !x.stub).map((x) => x.m).filter((m) => blockMods.includes(m));
    assert.deepEqual(real.sort(), [...OWN[c]].sort(), c);
    const html = readFileSync(file(c), 'utf8');
    for (const { m, stub } of mods) {
      if (stub) assert.ok(html.includes(`__m['${m}'] = ${STUBS[m] ?? '{}'};`), `${c}: stub ${m}`);
      else assert.ok(html.includes(`__m['${m}'] = (() => {`), `${c}: module ${m}`);
    }
  }
});
