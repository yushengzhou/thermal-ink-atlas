// Every parameter shown on a heat card has a source and a basis tag in
// docs/sources.md, and the file is generated from the code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATERIALS, MODEL, SOURCES, BASIS, GLASS, paramKeys } from '../../engine/materials.js';
import { sourcesMarkdown } from '../../scripts/sources.mjs';

const md = readFileSync(new URL('../../docs/sources.md', import.meta.url), 'utf8');

test('docs/sources.md is generated from the code and current', () => {
  assert.equal(md, sourcesMarkdown(), 'run `node scripts/sources.mjs`');
});

test('every card parameter has a known source, a basis tag and a verified flag', () => {
  for (const [id, m] of Object.entries(MATERIALS)) {
    for (const k of paramKeys(m)) {
      const p = m[k];
      assert.ok(p.source in SOURCES, `${id}.${k} source ${p.source}`);
      assert.ok(p.basis in BASIS, `${id}.${k} basis ${p.basis}`);
      assert.ok(md.includes(`**[${p.source}]**`), `${p.source} missing in sources.md`);
      assert.equal(typeof p.verified, 'boolean');
      if (p.source === 'engine') assert.equal(p.basis, 'engine', `${id}.${k}: no-source values must be tagged engine assumption`);
    }
    assert.ok(md.includes(`\`${id}\``), `${id} row missing`);
  }
  for (const [k, p] of Object.entries(MODEL)) {
    assert.ok(p.basis in BASIS && p.source in SOURCES, k);
    assert.ok(md.includes(`\`${k}\``), `${k} missing`);
  }
  for (const [id, g] of Object.entries(GLASS)) {
    assert.ok(md.includes(`\`${id}\``), `glass ${id} row missing`);
    for (const k of ['rho0', 'absorb', 'eps']) assert.ok(md.includes(`**[${g[k].source}]**`), `${g[k].source} missing in sources.md`);
  }
});

test('Oke-table values are flagged unverified', () => {
  for (const m of Object.values(MATERIALS)) {
    for (const k of paramKeys(m)) if (m[k].source === 'oke') assert.equal(m[k].verified, false);
  }
});

test('the docs disclose the assumptions the result depends on', () => {
  for (const phrase of ['## Sensitivity', '## Model vs literature targets', 'engine assumption', '26 °C', '32 °C', 'interpretation', 'edge of cited range']) {
    assert.ok(md.includes(phrase), `missing: ${phrase}`);
  }
  assert.ok(!/within the range of the research brief/.test(md));
});

test('glossary numbers carry a literature source key or are computed from the model', async () => {
  const { GLOSSARY } = await import('../../engine/glossary.js');
  for (const [k, g] of Object.entries(GLOSSARY)) {
    if (g.model) {
      assert.equal(g.range, undefined, `${k}: model-derived entries must not hard-code a range`);
    } else {
      assert.ok(g.range && g.src, `${k}: range needs a source`);
      for (const key of g.src.split(',').map((x) => x.trim())) assert.ok(key in SOURCES, `${k}: unknown source ${key}`);
    }
  }
  assert.ok(md.includes('## Glossary sources'));
});
