// Refresh the regression fixtures (tests/fixtures/base-pages): gzipped copies
// of the block 1-10 pages as committed at a git ref (default HEAD). Run it only
// after a deliberate, reviewed change to those blocks, and commit the result.
// Usage: npm run fixtures [-- <git-ref> [city ...]]   (default: every block 1-10 city)
// The block 1-3 fixtures come from 8e76f7a (before block 4), the block 4
// fixture from 189b7e1 (the block 4 branch before block 5), the block 5
// fixture from 40b5366 (the block 5 branch before block 6), the block 6
// fixture from 577a750 (block 6 before its shared-core diet), the block 7
// fixture from 1e292a5 (the block 7 branch tip before block 8), the block 8
// fixture from 8735385 (the block 8 branch tip before block 9), the block 9
// fixture from de54f2a (the block 9 branch tip before block 10), the block 10
// fixture from f751d00 (the block 10 branch tip before block 11).
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ref = process.argv[2] ?? 'HEAD';
const ALL = ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate', 'campus', 'busstop', 'village'];
const CITIES = process.argv.length > 3 ? process.argv.slice(3).filter((c) => ALL.includes(c)) : ALL;
mkdirSync(`${root}tests/fixtures/base-pages`, { recursive: true });
for (const c of CITIES) {
  const html = execFileSync('git', ['show', `${ref}:cities/${c}/index.html`], { cwd: root, maxBuffer: 1 << 24 });
  writeFileSync(`${root}tests/fixtures/base-pages/${c}.html.gz`, gzipSync(html, { level: 9 }));
  console.log(`tests/fixtures/base-pages/${c}.html.gz  from ${ref}`);
}
