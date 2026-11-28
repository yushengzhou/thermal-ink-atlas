// No duplicate keys in the big object literals: SOURCES and MATERIALS
// (engine/materials.js, MATERIALS with its Object.assign groups), GLOSSARY
// (engine/glossary.js) and REFS (scripts/references-data.mjs). A duplicate
// key in a JS object literal is legal and silently keeps the last value (a
// second `chen2024` once replaced block 3's citation text), so the source
// text is scanned for the top-level keys (two-space indent) of each literal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');

/**
 * Top-level keys of every object literal opened by a line matching `start`
 * (e.g. /^export const SOURCES = \{$/), up to its closing line "};" or "});".
 * Returns the keys in order (all matching literals together).
 */
export function literalKeys(src, start) {
  const lines = src.split('\n');
  const keys = [];
  for (let i = 0; i < lines.length; i++) {
    if (!start.test(lines[i])) continue;
    for (let j = i + 1; j < lines.length && !/^\}\)?;/.test(lines[j]); j++) {
      const m = /^ {2}(\w+|'[^']+'): /.exec(lines[j]);
      if (m) keys.push(m[1].replace(/'/g, ''));
    }
  }
  return keys;
}

/** Keys that occur more than once. */
export const duplicates = (keys) => [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];

const CASES = [
  ['SOURCES', 'engine/materials.js', /^export const SOURCES = \{$/, 100],
  ['MATERIALS', 'engine/materials.js', /^(export const MATERIALS = \{|Object\.assign\(MATERIALS, \{)$/, 40],
  ['GLOSSARY', 'engine/glossary.js', /^export const GLOSSARY = \{$/, 40],
  ['REFS', 'scripts/references-data.mjs', /^export const REFS = \{$/, 100],
];

test('the scan finds an injected duplicate key (and the literal it is in)', () => {
  for (const [name, file, start] of CASES) {
    const src = read(file);
    const keys = literalKeys(src, start);
    const k = keys[keys.length - 1];
    // inject a copy of the first key's line right before the literal's last key
    const first = src.split('\n').find((l, i, a) => i > a.findIndex((x) => start.test(x)) && /^ {2}\w+: /.test(l));
    const firstKey = /^ {2}(\w+): /.exec(first)[1];
    const injected = src.replace(new RegExp(`\\n  ${k}: `), `\n  ${firstKey}: 'injected',\n  ${k}: `);
    assert.notEqual(injected, src, name);
    assert.deepEqual(duplicates(literalKeys(injected, start)), [firstKey], `${name}: the injected duplicate is found`);
  }
  // a key at a deeper indent (a field of an entry) is not a top-level key
  assert.deepEqual(literalKeys("export const REFS = {\n  a: {\n    title: 'x',\n  },\n  b: {\n    title: 'y',\n  },\n};\n", /^export const REFS = \{$/), ['a', 'b']);
});

for (const [name, file, start, min] of CASES) {
  test(`${name} (${file}) has no duplicate keys`, () => {
    const keys = literalKeys(read(file), start);
    assert.ok(keys.length >= min, `${name}: only ${keys.length} keys found; the scan no longer matches the file`);
    assert.deepEqual(duplicates(keys), [], `${name}: duplicate keys (the last value silently wins)`);
  });
}

test('the scan sees every key the modules export (no key hides from it)', async () => {
  const { SOURCES, MATERIALS } = await import('../../engine/materials.js');
  const { GLOSSARY } = await import('../../engine/glossary.js');
  const { REFS } = await import('../../scripts/references-data.mjs');
  for (const [name, obj] of [['SOURCES', SOURCES], ['MATERIALS', MATERIALS], ['GLOSSARY', GLOSSARY], ['REFS', REFS]]) {
    const [, file, start] = CASES.find((c) => c[0] === name);
    assert.deepEqual(new Set(literalKeys(read(file), start)), new Set(Object.keys(obj)), name);
  }
});
