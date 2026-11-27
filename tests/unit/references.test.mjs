// references.html: generated, current, offline, and lists every source key
// any block uses (and every key in docs/sources.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { referencesHtml, groups, sourceList, blockKeys, cities, everyBlockKeys, externalRefs } from '../../scripts/references.mjs';
import { MATERIALS, MODEL, GLASS, SOURCES } from '../../engine/materials.js';
import { GLOSSARY } from '../../engine/glossary.js';
import { MEASURES } from '../../engine/retrofit.js';

const root = new URL('../../', import.meta.url);
const html = readFileSync(new URL('references.html', root), 'utf8');
const md = readFileSync(new URL('docs/sources.md', root), 'utf8');
const listed = (key) => html.includes(`data-key="${key}"`);

test('references.html is generated and current', () => {
  assert.equal(html, referencesHtml(), 'run `npm run build`');
});

test('every source key used by any block appears on the page', () => {
  const used = new Set();
  cities().forEach((c, i) => [...blockKeys(c, i + 1), ...everyBlockKeys()].forEach((k) => used.add(k)));
  // independent check: keys taken straight from the data, not from the generator
  for (const m of Object.values(MATERIALS)) for (const p of Object.values(m)) if (p && p.source) used.add(p.source);
  for (const g of Object.values(GLASS)) for (const p of Object.values(g)) if (p && p.source) used.add(p.source);
  for (const p of Object.values(MODEL)) used.add(p.source);
  for (const g of Object.values(GLOSSARY)) if (g.src) g.src.split(',').forEach((k) => used.add(k.trim()));
  for (const m of MEASURES) m.sources.forEach((k) => used.add(k));
  for (const f of ['cbdui', 'wfui', 'retroui', 'hutui']) {
    const src = readFileSync(new URL(`engine/${f}.js`, root), 'utf8');
    for (const m of src.matchAll(/srcLine\(\[([^\]]+)\]\)/g)) m[1].split(',').forEach((k) => used.add(k.trim().replace(/'/g, '')));
  }
  for (const k of used) assert.ok(listed(k), `${k} is used by a block but missing from references.html`);
  assert.ok(used.size >= 50, `only ${used.size} keys found`);
});

test('every key in SOURCES and in the docs/sources.md key list appears, and only those', () => {
  const known = sourceList(md);
  for (const k of Object.keys(SOURCES)) assert.ok(k in known && listed(k), k);
  for (const k of Object.keys(known)) assert.ok(listed(k), k);
  const onPage = new Set([...html.matchAll(/data-key="(\w+)"/g)].map((m) => m[1]));
  for (const k of onPage) assert.ok(k in known, `unknown key on page: ${k}`);
});

test('groups: model and methods first, then one group per block in order', () => {
  const ids = groups().map((g) => g.id).filter((id) => id !== 'other');
  assert.deepEqual(ids, ['methods', 'asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong']);
  for (const id of ids) assert.ok(html.includes(`<section id="${id}">`), id);
  const methods = groups()[0].keys;
  for (const k of ['deardorff', 'noaa', 'brutsaert', 'meinel', 'oke', 'solweig', 'energyplus']) assert.ok(methods.includes(k), k);
});

test('page is offline: no URLs, no src, only relative links', () => {
  assert.deepEqual(externalRefs(html), []);
  assert.ok(!/https?:\/\//i.test(html), 'contains a URL');
  for (const m of html.matchAll(/href="([^"]+)"/g)) assert.ok(!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(m[1]), m[1]);
});

test('the gallery links to references.html and every block page links to it (relative, the file exists)', () => {
  assert.match(readFileSync(new URL('index.html', root), 'utf8'), /href="references.html"/);
  for (const c of cities()) {
    const page = new URL(`cities/${c}/index.html`, root);
    const m = /<a id="refsLink" href="([^"]+)">references\.html<\/a>/.exec(readFileSync(page, 'utf8'));
    assert.ok(m, `${c}: no link to references.html`);
    assert.equal(m[1], '../../references.html', c);
    assert.ok(existsSync(new URL(m[1], page)), `${c}: link target missing`);
  }
});
