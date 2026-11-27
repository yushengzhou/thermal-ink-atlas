// The built page: single file, under budget, nothing external, up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { modulesFor, BLOCKS, STUBS, externalRefs } from '../../scripts/build.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const CITIES = ['asphalt-park', 'glass-cbd', 'hutong', 'parking', 'sponge-retrofit', 'waterfront'];
// block-specific modules each page must carry (all other block modules are stubs)
const OWN = { 'asphalt-park': [], 'sponge-retrofit': ['retrofit', 'retroui'], 'glass-cbd': ['cbd', 'cbdui'], waterfront: ['wind', 'waterfront', 'wfui'], hutong: ['htkit', 'hutong', 'hutui'], parking: ['pkkit', 'parking', 'pkui'] };
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
    // the same allow-list as the build: fragments and relative links that stay inside this repository
    assert.deepEqual(externalRefs(html, `cities/${c}/index.html`), [], 'external reference');
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

test('external-reference rule: allow-listed relative links pass; schemes, hosts, root paths, tricks and climbs out of the repo fail', () => {
  const page = 'cities/hutong/index.html';
  for (const ok of ['<a href="../../references.html">r</a>', '<a href="#x">x</a>', '<a href="../../docs/sources.md#block-5">d</a>', "<a href='index.html'>i</a>", '<img src="data:image/png;base64,AA">'])
    assert.deepEqual(externalRefs(ok, page), [], ok);
  const bad = [
    '../../../x', // resolves above the repository (on Pages: another site)
    ' javascript:alert(1)', // leading whitespace is stripped by browsers
    '\\\\evil.example\\x', // backslashes are read as // on http(s) pages
    '&#106;avascript:x', // entity-encoded scheme
    'java\tscript:x', // browsers drop tabs from URLs
    '//host/x',
    '/abs',
    'https://x',
    'http://x.y/',
    'file:///tmp/x',
    'data:text/html,x',
    'javascript:alert(1)',
    '../../references.html extra',
  ];
  for (const v of bad) {
    assert.ok(externalRefs(`<a href="${v}">x</a>`, page).length > 0, JSON.stringify(v));
    assert.ok(externalRefs(`<a href='${v}'>x</a>`, page).length > 0, JSON.stringify(v));
  }
  assert.ok(externalRefs('<a href=javascript:x>x</a>', page).length > 0, 'unquoted');
  assert.ok(externalRefs('<a href="../x">x</a>', 'references.html').length > 0, 'from the repo root, .. leaves it');
  for (const other of ['<script src="a.js"></script>', '<style>@import "x.css";</style>', '<div style="background:url(x.png)"></div>', 'fetch("//example.com/x")'])
    assert.ok(externalRefs(other, page).length > 0, other);
});
