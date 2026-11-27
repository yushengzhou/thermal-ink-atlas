// Build: inline engine modules + a city scene into one offline HTML file.
// Usage: node scripts/build.mjs [city-id]   (default: every city in cities/)
// Fails if the output is over 500 KB or references anything external.
// Each page carries the core engine plus only its own block's modules; the
// other blocks' modules are replaced by stubs whose predicates say "not this
// block" (STUBS), so app.js and world.js never enter their code paths.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const MODULES = ['core', 'sun', 'materials', 'reflect', 'thermal', 'wind', 'world', 'pen', 'kit', 'life', 'render', 'glossary', 'retrofit', 'retroui', 'cbd', 'cbdui', 'waterfront', 'wfui', 'app'];
/** Block-specific modules, by the scene flag that selects them. */
export const BLOCKS = [
  { flag: /retrofit: true/, modules: ['retrofit', 'retroui'] },
  { flag: /glassBlock: true/, modules: ['cbd', 'cbdui'] },
  { flag: /windBlock: true/, modules: ['wind', 'waterfront', 'wfui'] },
];
/** What a left-out module exposes: only the predicates the core calls (always false there). */
export const STUBS = {
  retrofit: '{ isRetrofit: () => false }',
  cbd: '{ isGlass: () => false }',
  wind: '{ isWindBlock: () => false }',
  waterfront: '{ isWaterfront: () => false }',
};
/** Modules a page needs, given its scene source. */
export function modulesFor(scene) {
  const own = BLOCKS.filter((b) => b.flag.test(scene)).flatMap((b) => b.modules);
  const other = new Set(BLOCKS.flatMap((b) => b.modules).filter((m) => !own.includes(m)));
  return MODULES.map((m) => ({ m, stub: other.has(m) }));
}
const LIMIT = 500 * 1024;

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
  const keys = /retrofit: true/.test(scene) ? '<kbd>B</kbd> before/after · ' : /glassBlock: true/.test(scene) ? '<kbd>G</kbd> glass · ' : /windBlock: true/.test(scene) ? '<kbd>W</kbd> wind · <kbd>A</kbd> air · ' : '';
  const html = read('engine/shell.html')
    .replace(/__TITLE__/g, meta)
    .replace('__SUBTITLE__', sub)
    .replace('__KEYS__', keys)
    .replace('__BUNDLE__', () => bundle.replace(/<\/script/gi, '<\\/script'));

  const external = html.match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}\/|\b(?:src|href)\s*=\s*["'](?!#|data:)|@import|url\((?!\s*["']?(?:data:|#))/gi);
  if (external) throw new Error(`${city}: external reference(s): ${[...new Set(external)].join(', ')}`);
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
