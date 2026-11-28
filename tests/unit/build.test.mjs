// The built page: single file, under budget, nothing external, up to date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { modulesFor, BLOCKS, STUBS, externalRefs } from '../../scripts/build.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const CITIES = ['asphalt-park', 'busstop', 'campus', 'estate', 'glass-cbd', 'hutong', 'parking', 'sponge-retrofit', 'village', 'waterfront', 'desert', 'nightmarket'];
// block-specific modules each page must carry (all other block modules are stubs)
const OWN = { 'asphalt-park': [], 'sponge-retrofit': ['retrofit', 'retroui'], 'glass-cbd': ['reflect', 'cbd', 'cbdui'], waterfront: ['wind', 'waterfront', 'wfui'], hutong: ['htkit', 'hutong', 'hutui'], parking: ['pkkit', 'parking', 'pkui'], estate: ['eskit', 'estate', 'esui'], campus: ['cpkit', 'campus', 'cpui'], busstop: ['bskit', 'busstop', 'bsui'], village: ['vgkit', 'village', 'vgui'], desert: ['dskit', 'desert', 'dsui'], nightmarket: ['nmkit', 'market', 'nmui'] };
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

test('external-reference rule: allow-listed relative links pass; schemes, hosts, root paths, tricks and climbs out of the repo fail, in href, form action / formaction and srcset alike', () => {
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
    // the same allow-list for a form's action, a button's formaction and each srcset URL
    assert.ok(externalRefs(`<form action="${v}"></form>`, page).length > 0, `action ${JSON.stringify(v)}`);
    assert.ok(externalRefs(`<button formaction='${v}'>x</button>`, page).length > 0, `formaction ${JSON.stringify(v)}`);
    if (!/[\s,]/.test(v)) assert.ok(externalRefs(`<img srcset="a.png 1x, ${v} 2x">`, page).length > 0, `srcset ${JSON.stringify(v)}`);
  }
  assert.ok(externalRefs('<form action=https://x.y/a></form>', page).length > 0, 'unquoted action');
  assert.ok(externalRefs('<img srcset="../../../x.png">', page).length > 0, 'srcset climbing out of the repo');
  for (const ok of ['<form action="#x"></form>', '<img srcset="data-x.png 1x, ../../thumbs/a.jpg 2x">'])
    assert.deepEqual(externalRefs(ok, page), [], ok);
  assert.ok(externalRefs('<a href=javascript:x>x</a>', page).length > 0, 'unquoted');
  assert.ok(externalRefs('<a href="../x">x</a>', 'references.html').length > 0, 'from the repo root, .. leaves it');
  for (const other of ['<script src="a.js"></script>', '<style>@import "x.css";</style>', '<div style="background:url(x.png)"></div>', 'fetch("//example.com/x")'])
    assert.ok(externalRefs(other, page).length > 0, other);
});

// ---- the shared core's budget, and the per-page SOURCES cut ------------------------
// Every page carries the shared core (engine modules that are not a block's
// own, the shell, the stubs, and the per-page cut of materials.js and
// glossary.js). Blocks 7-12 must still fit under 500 KB, so the core may not
// grow past this budget; a block's own code belongs in its own modules.
// A page's own SOURCES keys (carried by no other page: the sources only its
// block cites) count as the page's own bytes, not core (build.mjs ownSources).
// CORE_BUDGET (scripts/build.mjs): 290,000 B when set (largest core then 283,013 B, waterfront); 300,000 B since the #29 pass
const { CORE_BUDGET } = await import('../../scripts/build.mjs');

test(`the shared core stays under its budget (${CORE_BUDGET} bytes on every page)`, async () => {
  const { coreBytes } = await import('../../scripts/build.mjs');
  for (const c of CITIES) {
    const b = coreBytes(c);
    console.log(`${c}: shared core ${b} B`);
    assert.ok(b <= CORE_BUDGET, `${c}: shared core ${b} B over the ${CORE_BUDGET} B budget (move block-only code into the block's modules)`);
  }
});

test('a page\'s own source keys are carried by that page only, and their bytes are its own', async () => {
  const { ownSources, pageParts } = await import('../../scripts/build.mjs');
  const keys = Object.fromEntries(CITIES.map((c) => [c, pageParts(c).keys]));
  for (const c of CITIES) {
    const o = ownSources(c, keys[c]);
    for (const k of o.keys) {
      assert.ok(keys[c].has(k), `${c}: ${k}`);
      for (const d of CITIES) if (d !== c) assert.ok(!keys[d].has(k), `${c}: own key ${k} is also on ${d}`);
    }
    // the bytes are the SOURCES lines of those keys in the built page
    const html = readFileSync(file(c), 'utf8');
    const block = /const SOURCES = \{\n([\s\S]*?)\n\};/.exec(html)[1].split('\n');
    const lines = block.filter((l) => o.keys.includes(/^ {2}(\w+): /.exec(l)?.[1]));
    assert.equal(lines.length, o.keys.length, c);
    assert.equal(o.bytes, lines.reduce((a, l) => a + Buffer.byteLength(`${l}\n`), 0), c);
  }
});

test('every page bundles each source key its heat cards and cards can show (and drops the rest)', async () => {
  const { SOURCES, MATERIALS, GLASS } = await import('../../engine/materials.js');
  const { buildWorld } = await import('../../engine/world.js');
  const { cellMat } = await import('../../engine/thermal.js');
  const { sceneState, stateMaterials } = await import('../../engine/retrofit.js');
  const src = (o) => Object.values(o).filter((p) => p && typeof p === 'object' && 'source' in p).map((p) => p.source);
  for (const c of CITIES) {
    const html = readFileSync(file(c), 'utf8');
    const block = /const SOURCES = \{\n([\s\S]*?)\n\};/.exec(html)[1];
    const bundled = new Set([...block.matchAll(/^ {2}(\w+): /gm)].map((m) => m[1]));
    const { SCENE } = await import(`../../cities/${c}/scene.js`);
    const need = new Set();
    // heat cards: every ground cell, roof and tree of each drawn state, with that state's material table
    const states = SCENE.retrofit ? ['before', 'after'].map((w) => sceneState(SCENE, w)) : [SCENE];
    const tables = SCENE.retrofit ? [0, 3, 7].flatMap((d) => [stateMaterials(d, true), stateMaterials(d, false)]) : [MATERIALS];
    for (const S of states) {
      const w = buildWorld(S, { svf: false });
      const ids = new Set();
      for (let i = 0; i < w.n * w.n; i++) ids.add(cellMat(w, i));
      for (const t of w.trees) ids.add(t.species ?? (t.young ? 'youngCanopy' : 'canopy'));
      for (const id of ids) for (const T of tables) if (T[id]) src(T[id]).forEach((k) => need.add(k));
    }
    if (SCENE.glassBlock) Object.values(GLASS).forEach((g) => src(g).forEach((k) => need.add(k)));
    // card source lines: srcLine([...]) in the page's own modules
    for (const m of html.matchAll(/srcLine\(\[([^\]]*)\]\)/g)) for (const k of m[1].matchAll(/'(\w+)'/g)) need.add(k[1]);
    const missing = [...need].filter((k) => k in SOURCES && !bundled.has(k));
    assert.deepEqual(missing, [], `${c}: source keys a card can show but the page does not carry`);
    assert.ok(bundled.size < Object.keys(SOURCES).length, `${c}: carries every source key`);
    // and no parameter notes: v(value, source, basis, verified) only
    assert.ok(!/\bv\([^()\n]*,\s*(?:true|false),\s*'/.test(html), `${c}: a parameter note was bundled`);
  }
});

test('the promo film stays out of the pages and out of npm test (#34)', () => {
  for (const c of CITIES) assert.ok(!/(^|[^@\w])media\//.test(readFileSync(file(c), 'utf8')), `${c} refers to media/`);
  assert.ok(!/(^|[^@\w])media\//.test(readFileSync(`${root}index.html`, 'utf8')), 'the gallery refers to media/');
  const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
  for (const k of ['test', 'test:unit', 'test:e2e', 'build']) assert.ok(!/film/.test(pkg.scripts[k]), `npm run ${k} runs the film`);
});
