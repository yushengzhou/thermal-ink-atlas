// Refresh the regression fixtures (tests/fixtures/base-pages): gzipped copies
// of the block 1-6 pages as committed at a git ref (default HEAD). Run it only
// after a deliberate, reviewed change to those blocks, and commit the result.
// Usage: npm run fixtures [-- <git-ref> [city ...]]   (default: every block 1-6 city)
// The block 1-3 fixtures come from 8e76f7a (before block 4), the block 4
// fixture from 189b7e1 (the block 4 branch before block 5), the block 5
// fixture from 40b5366 (the block 5 branch before block 6), the block 6
// fixture from 577a750 (block 6 before its shared-core diet).
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ref = process.argv[2] ?? 'HEAD';
const ALL = ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking'];
const CITIES = process.argv.length > 3 ? process.argv.slice(3).filter((c) => ALL.includes(c)) : ALL;
mkdirSync(`${root}tests/fixtures/base-pages`, { recursive: true });
for (const c of CITIES) {
  const html = execFileSync('git', ['show', `${ref}:cities/${c}/index.html`], { cwd: root, maxBuffer: 1 << 24 });
  writeFileSync(`${root}tests/fixtures/base-pages/${c}.html.gz`, gzipSync(html, { level: 9 }));
  console.log(`tests/fixtures/base-pages/${c}.html.gz  from ${ref}`);
}
