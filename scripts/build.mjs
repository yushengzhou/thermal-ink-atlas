// Build: inline engine modules + a city scene into one offline HTML file.
// Usage: node scripts/build.mjs [city-id]   (default asphalt-park)
// Fails if the output is over 500 KB or references anything external.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const city = process.argv[2] ?? 'asphalt-park';
const MODULES = ['core', 'sun', 'materials', 'thermal', 'world', 'pen', 'kit', 'life', 'render', 'glossary', 'app'];
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
const scene = read(`cities/${city}/scene.js`);
const bundle = [
  "'use strict';",
  '(() => {',
  'const __m = {};',
  ...MODULES.map((m) => wrap(m, read(`engine/${m}.js`))),
  wrap('scene', scene),
  "__m['app'].boot(__m['scene'].SCENE);",
  '})();',
].join('\n');

const meta = /title: '([^']+)'/.exec(scene)[1];
const sub = /note: '([^']+)'/.exec(scene)[1];
const html = read('engine/shell.html')
  .replace(/__TITLE__/g, meta)
  .replace('__SUBTITLE__', sub)
  .replace('__BUNDLE__', () => bundle.replace(/<\/script/gi, '<\\/script'));

const external = html.match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}\/|\b(?:src|href)\s*=\s*["'](?!#|data:)|@import|url\((?!\s*["']?(?:data:|#))/gi);
if (external) throw new Error(`external reference(s): ${[...new Set(external)].join(', ')}`);
const size = Buffer.byteLength(html);
if (size > LIMIT) throw new Error(`built file is ${size} bytes, over the ${LIMIT} byte budget`);
writeFileSync(`${root}cities/${city}/index.html`, html);
console.log(`cities/${city}/index.html  ${(size / 1024).toFixed(1)} KB`);
