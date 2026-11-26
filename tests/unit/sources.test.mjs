// Every parameter shown on a heat card has a source in docs/sources.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATERIALS, SOURCES } from '../../engine/materials.js';
import { sourcesMarkdown } from '../../scripts/sources.mjs';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('docs/sources.md is generated from materials.js and current', () => {
  assert.equal(md, sourcesMarkdown(), 'run `node scripts/sources.mjs`');
});

test('every card parameter has a known source, listed in docs/sources.md, and a verified flag', () => {
  for (const [id, m] of Object.entries(MATERIALS)) {
    for (const k of ['alpha', 'eps', 'mu', 'ef']) {
      const p = m[k];
      assert.ok(p.source in SOURCES, `${id}.${k} source ${p.source}`);
      assert.ok(md.includes(`**[${p.source}]**`), `${p.source} missing in sources.md`);
      assert.equal(typeof p.verified, 'boolean');
    }
    assert.ok(md.includes(`\`${id}\``), `${id} row missing`);
  }
});

test('Oke-table values are flagged unverified', () => {
  for (const m of Object.values(MATERIALS)) {
    for (const k of ['alpha', 'eps', 'mu', 'ef']) if (m[k].source === 'oke') assert.equal(m[k].verified, false);
  }
});
