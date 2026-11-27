// Refresh the regression fixtures (tests/fixtures/base-pages): gzipped copies
// of the block 1-3 pages as committed at a git ref (default HEAD). Run it only
// after a deliberate, reviewed change to blocks 1-3, and commit the result.
// Usage: npm run fixtures [-- <git-ref>]
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ref = process.argv[2] ?? 'HEAD';
const CITIES = ['asphalt-park', 'sponge-retrofit', 'glass-cbd'];
mkdirSync(`${root}tests/fixtures/base-pages`, { recursive: true });
for (const c of CITIES) {
  const html = execFileSync('git', ['show', `${ref}:cities/${c}/index.html`], { cwd: root, maxBuffer: 1 << 24 });
  writeFileSync(`${root}tests/fixtures/base-pages/${c}.html.gz`, gzipSync(html, { level: 9 }));
  console.log(`tests/fixtures/base-pages/${c}.html.gz  from ${ref}`);
}
