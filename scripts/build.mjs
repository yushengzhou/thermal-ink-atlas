// Build: inline engine modules + a city scene into one offline HTML file.
// Usage: node scripts/build.mjs [city-id]   (default: every city in cities/)
// Fails if the output is over 500 KB or references anything external.
// Each page carries the core engine plus only its own block's modules; the
// other blocks' modules are replaced by stubs whose predicates say "not this
// block" (STUBS), so app.js and world.js never enter their code paths.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { posix } from 'node:path';
import { SOURCES, MATERIALS, GLASS } from '../engine/materials.js';
import { GLOSSARY } from '../engine/glossary.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const MODULES = ['core', 'sun', 'materials', 'reflect', 'thermal', 'wind', 'world', 'pen', 'kit', 'life', 'render', 'glossary', 'retrofit', 'retroui', 'cbd', 'cbdui', 'waterfront', 'wfui', 'htkit', 'hutong', 'hutui', 'pkkit', 'parking', 'pkui', 'app'];
/** Block-specific modules, by the scene flag that selects them. */
export const BLOCKS = [
  { flag: /retrofit: true/, modules: ['retrofit', 'retroui'] },
  { flag: /glassBlock: true/, modules: ['cbd', 'cbdui'] },
  { flag: /windBlock: true/, modules: ['wind', 'waterfront', 'wfui'] },
  { flag: /hutongBlock: true/, modules: ['htkit', 'hutong', 'hutui'] },
  { flag: /parkingBlock: true/, modules: ['pkkit', 'parking', 'pkui'] },
];
/** What a left-out module exposes: only the predicates the core calls (always false there). */
export const STUBS = {
  retrofit: '{ isRetrofit: () => false }',
  cbd: '{ isGlass: () => false }',
  wind: '{ isWindBlock: () => false }',
  waterfront: '{ isWaterfront: () => false }',
  hutong: '{ isHutong: () => false }',
  parking: '{ isParking: () => false }',
};
/** Modules a page needs, given its scene source. */
export function modulesFor(scene) {
  const own = BLOCKS.filter((b) => b.flag.test(scene)).flatMap((b) => b.modules);
  const other = new Set(BLOCKS.flatMap((b) => b.modules).filter((m) => !own.includes(m)));
  return MODULES.map((m) => ({ m, stub: other.has(m) }));
}
const LIMIT = 500 * 1024;

/**
 * Links (href) a page may carry, as an allow-list: a fragment (#id), or a
 * relative path made only of [A-Za-z0-9._/-] (no whitespace, backslash,
 * entity "&", colon or "//"), optionally with a #fragment, that stays inside
 * the repository once resolved against the page's own directory. page is the
 * page's path from the repo root (cities/<id>/index.html, references.html).
 * Returns the offending href values (empty if all are allowed).
 */
export function hrefProblems(html, page) {
  const out = [];
  for (const m of html.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
    const v = m[1] ?? m[2] ?? m[3];
    if (/^#[A-Za-z0-9._-]*$/.test(v)) continue;
    if (/^[A-Za-z0-9._/-]+(?:#[A-Za-z0-9._-]*)?$/.test(v) && !v.startsWith('/') && !v.includes('//')) {
      const target = posix.normalize(posix.join(posix.dirname(page), v.split('#')[0]));
      if (target !== '..' && !target.startsWith('../') && !posix.isAbsolute(target)) continue;
    }
    out.push(`href="${v}"`);
  }
  return out;
}

/**
 * What a page may not reference: any URL with a host (//host/...), a src=
 * other than data: or #, @import, url() other than data: or #, and any href
 * outside the allow-list of hrefProblems (so no scheme, host, root path,
 * whitespace or entity tricks, and no relative path that climbs out of the
 * repository). Allowed links open offline and fetch nothing on load.
 */
export function externalRefs(html, page) {
  const hits = html.match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}\/|\bsrc\s*=\s*["'](?!#|data:)|@import|url\((?!\s*["']?(?:data:|#))/gi) ?? [];
  return [...new Set([...hits, ...hrefProblems(html, page)])];
}

// Each ES module becomes a function scope; imports become destructuring.
function wrap(name, src) {
  const names = [];
  const body = src
    .replace(/^import \{([^}]+)\} from '\.{1,2}\/(?:engine\/)?([\w-]+)\.js';$/gm, (_, list, mod) => `const {${list.replace(/ as /g, ': ')}} = __m['${mod}'];`)
    .replace(/^export (?:async )?(function|const|class|let) (\w+)/gm, (_, kind, id) => (names.push(id), `${kind} ${id}`));
  if (/^\s*(import|export) /m.test(body)) throw new Error(`${name}: unsupported import/export form`);
  return `__m['${name}'] = (() => {\n${body}\nreturn { ${names.join(', ')} };\n})();\n`;
}

const read = (p) => readFileSync(`${root}${p}`, 'utf8');

// ---- per-page trimming of the shared data modules ------------------------------
// Every page carries the whole engine core, but not every page needs all of its
// data. Three things are cut per page at build time (the engine files and the
// docs keep everything):
//   - SOURCES (materials.js): only the keys the page can show: the sources of
//     the materials its scene and its own modules name (plus the shared tree
//     canopies), of the glass types if its modules use GLASS, and the keys its
//     scene, its own modules and the core quote literally (card source lines);
//   - the note of each parameter, v(value, source, basis, verified, note): read
//     only by docs/sources.md, never by a page;
//   - GLOSSARY (glossary.js): the terms of other blocks (scenes: [...] without
//     this page) unless the page's code names them (gl('key') or 'key').
const quoted = (text) => new Set([...text.matchAll(/'(\w+)'/g)].map((m) => m[1]));
const paramSources = (o) => Object.values(o).filter((p) => p && typeof p === 'object' && 'source' in p).map((p) => p.source);

/** Source keys a page needs (see above). text: its scene, own modules and core modules (materials.js and glossary.js excluded). */
export function pageSourceKeys(sceneText, ownText, coreText) {
  const q = quoted(`${sceneText}\n${ownText}`);
  const keys = new Set();
  for (const id of [...q, 'canopy', 'youngCanopy']) if (MATERIALS[id]) paramSources(MATERIALS[id]).forEach((k) => keys.add(k));
  if (/\bGLASS\b/.test(ownText)) Object.values(GLASS).forEach((g) => paramSources(g).forEach((k) => keys.add(k)));
  for (const k of [...q, ...quoted(coreText)]) if (k in SOURCES) keys.add(k);
  return keys;
}

/** materials.js for one page: SOURCES cut to keys, parameter notes dropped. */
export function trimMaterials(src, keys) {
  const a = src.indexOf('export const SOURCES = {');
  const b = src.indexOf('\n};\n', a);
  if (a < 0 || b < 0) throw new Error('materials.js: SOURCES block not found');
  const lines = src.slice(a, b).split('\n');
  const kept = lines.filter((l, i) => i === 0 || !/^  \w+: /.test(l) || keys.has(/^  (\w+): /.exec(l)[1]));
  if (lines.some((l, i) => i > 0 && !/^  \w+: '.*',$/.test(l))) throw new Error('materials.js: every SOURCES entry must be one line');
  const out = src.slice(0, a) + kept.join('\n') + src.slice(b);
  // v(value, 'source', 'basis', verified, 'note') -> v(value, 'source', 'basis', verified)
  return out.replace(/(\bv\((?:[^()'\n]|'(?:[^'\\\n]|\\.)*')*?,\s*(?:true|false)),\s*'(?:[^'\\\n]|\\.)*'\)/g, '$1)');
}

/** glossary.js for one page: other blocks' terms dropped unless named in the page's code. */
export function trimGlossary(src, city, text) {
  const q = quoted(text);
  const named = new Set([...text.matchAll(/data-gl="(\w+)"/g)].map((m) => m[1]));
  const drop = Object.entries(GLOSSARY).filter(([k, g]) => g.scenes && !g.scenes.includes(city) && !q.has(k) && !named.has(k)).map(([k]) => k);
  let out = src;
  for (const k of drop) {
    const re = new RegExp(`\\n  ${k}: \\{\\n[\\s\\S]*?\\n  \\},(?=\\n)`);
    if (!re.test(out)) throw new Error(`glossary.js: term ${k} not found as a block`);
    out = out.replace(re, '');
  }
  return out;
}

/** The page's parts: {html, bundle, own (bytes of its own block modules), scene (bytes), core (the rest)}. */
export function pageParts(city) {
  const scene = read(`cities/${city}/scene.js`);
  const mods = modulesFor(scene);
  const own = new Set(BLOCKS.flatMap((b) => b.modules));
  const ownText = mods.filter(({ m, stub }) => !stub && own.has(m)).map(({ m }) => read(`engine/${m}.js`)).join('\n');
  const coreText = mods.filter(({ m, stub }) => !stub && !own.has(m) && m !== 'materials' && m !== 'glossary').map(({ m }) => read(`engine/${m}.js`)).join('\n');
  const keys = pageSourceKeys(scene, ownText, coreText);
  const shell = read('engine/shell.html');
  const source = (m) => (m === 'materials' ? trimMaterials(read('engine/materials.js'), keys) : m === 'glossary' ? trimGlossary(read('engine/glossary.js'), city, `${scene}\n${ownText}\n${coreText}\n${shell}`) : read(`engine/${m}.js`));
  const parts = mods.map(({ m, stub }) => ({ m, own: own.has(m) && !stub, text: stub ? `__m['${m}'] = ${STUBS[m] ?? '{}'};\n` : wrap(m, source(m)) }));
  const bundle = [
    "'use strict';",
    '(() => {',
    'const __m = {};',
    ...parts.map((p) => p.text),
    wrap('scene', scene),
    "__m['app'].boot(__m['scene'].SCENE);",
    '})();',
  ].join('\n');
  return { scene, keys, bundle, ownBytes: parts.filter((p) => p.own).reduce((a, p) => a + Buffer.byteLength(p.text), 0), sceneBytes: Buffer.byteLength(wrap('scene', scene)) };
}

function build(city) {
  const { scene, bundle, ownBytes, sceneBytes } = pageParts(city);

  const meta = /title: '([^']+)'/.exec(scene)[1];
  const sub = /note: '([^']+)'/.exec(scene)[1];
  const keys = /retrofit: true/.test(scene) ? '<kbd>B</kbd> before/after · ' : /glassBlock: true/.test(scene) ? '<kbd>G</kbd> glass · ' : /windBlock: true/.test(scene) ? '<kbd>W</kbd> wind · <kbd>A</kbd> air · ' : /hutongBlock: true/.test(scene) ? '<kbd>P</kbd> splash · ' : /parkingBlock: true/.test(scene) ? '<kbd>G</kbd> night release · ' : '';
  const html = read('engine/shell.html')
    .replace(/__TITLE__/g, meta)
    .replace('__SUBTITLE__', sub)
    .replace('__KEYS__', keys)
    .replace('__BUNDLE__', () => bundle.replace(/<\/script/gi, '<\\/script'));

  const external = externalRefs(html, `cities/${city}/index.html`);
  if (external.length) throw new Error(`${city}: external reference(s): ${external.join(', ')}`);
  const size = Buffer.byteLength(html);
  if (size > LIMIT) throw new Error(`${city}: built file is ${size} bytes, over the ${LIMIT} byte budget`);
  writeFileSync(`${root}cities/${city}/index.html`, html);
  console.log(`cities/${city}/index.html  ${(size / 1024).toFixed(1)} KB (own modules ${(ownBytes / 1024).toFixed(1)} KB, scene ${(sceneBytes / 1024).toFixed(1)} KB, shared core ${((size - ownBytes - sceneBytes) / 1024).toFixed(1)} KB)`);
}

/** Bytes of a built page that are not its own block modules or its scene: the shared core as this page carries it. */
export function coreBytes(city) {
  const size = Buffer.byteLength(read(`cities/${city}/index.html`));
  const p = pageParts(city);
  return size - p.ownBytes - p.sceneBytes;
}

// run as a script (tests import modulesFor without building)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cities = process.argv[2] ? [process.argv[2]] : readdirSync(`${root}cities`).filter((c) => existsSync(`${root}cities/${c}/scene.js`)).sort();
  for (const c of cities) build(c);
}
