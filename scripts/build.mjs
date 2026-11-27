// Build: inline engine modules + a city scene into one offline HTML file.
// Usage: node scripts/build.mjs [city-id]   (default: every city in cities/)
// Fails if the output is over 500 KB or references anything external.
// Each page carries the core engine plus only its own block's modules; the
// other blocks' modules are replaced by stubs whose predicates say "not this
// block" (STUBS), so app.js and world.js never enter their code paths.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { posix } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const MODULES = ['core', 'sun', 'materials', 'reflect', 'thermal', 'wind', 'world', 'pen', 'kit', 'life', 'render', 'glossary', 'retrofit', 'retroui', 'cbd', 'cbdui', 'waterfront', 'wfui', 'hutong', 'hutui', 'app'];
/** Block-specific modules, by the scene flag that selects them. */
export const BLOCKS = [
  { flag: /retrofit: true/, modules: ['retrofit', 'retroui'] },
  { flag: /glassBlock: true/, modules: ['cbd', 'cbdui'] },
  { flag: /windBlock: true/, modules: ['wind', 'waterfront', 'wfui'] },
  { flag: /hutongBlock: true/, modules: ['hutong', 'hutui'] },
];
/** What a left-out module exposes: only the predicates the core calls (always false there). */
export const STUBS = {
  retrofit: '{ isRetrofit: () => false }',
  cbd: '{ isGlass: () => false }',
  wind: '{ isWindBlock: () => false }',
  waterfront: '{ isWaterfront: () => false }',
  hutong: '{ isHutong: () => false }',
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

function build(city) {
  const scene = read(`cities/${city}/scene.js`);
  const bundle = [
    "'use strict';",
    '(() => {',
    'const __m = {};',
    ...modulesFor(scene).map(({ m, stub }) => (stub ? `__m['${m}'] = ${STUBS[m] ?? '{}'};\n` : wrap(m, read(`engine/${m}.js`)))),
    wrap('scene', scene),
    "__m['app'].boot(__m['scene'].SCENE);",
    '})();',
  ].join('\n');

  const meta = /title: '([^']+)'/.exec(scene)[1];
  const sub = /note: '([^']+)'/.exec(scene)[1];
  const keys = /retrofit: true/.test(scene) ? '<kbd>B</kbd> before/after · ' : /glassBlock: true/.test(scene) ? '<kbd>G</kbd> glass · ' : /windBlock: true/.test(scene) ? '<kbd>W</kbd> wind · <kbd>A</kbd> air · ' : /hutongBlock: true/.test(scene) ? '<kbd>P</kbd> splash · ' : '';
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
  console.log(`cities/${city}/index.html  ${(size / 1024).toFixed(1)} KB`);
}

// run as a script (tests import modulesFor without building)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cities = process.argv[2] ? [process.argv[2]] : readdirSync(`${root}cities`).filter((c) => existsSync(`${root}cities/${c}/scene.js`)).sort();
  for (const c of cities) build(c);
}
