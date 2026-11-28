// Refresh the regression fixtures (tests/fixtures/base-pages): gzipped copies
// of the block 1-11 pages as committed at a git ref (default HEAD). Run it only
// after a deliberate, reviewed change to those blocks, and commit the result.
// Usage: npm run fixtures [-- <git-ref> [city ...]]   (default: every block 1-11 city)
// The block 1-10 fixtures come from ec0417e (the final #29 pass: plain-word
// notes and overlay labels, notes kept on the canvas, lit windows behind
// nearer roofs, block 3's reflected patch and façade colours; probe values
// unchanged); the block 11 fixture from d75de57 (the block 11 branch tip
// before block 12). Parking, campus, estate and village were refreshed again
// from c05dff3 (overlay labels moved beside the controls panel, review of #33 N6;
// only the label strip moved, probes and notes equal). All eleven were refreshed
// again from 8bf78e3 (outside evaluation of #33: radiant-heat wording in the notes,
// note placement, board-clipped shadows, the title box; probes equal on all 65
// cases). Busstop and desert were refreshed again from adb137c (urbanist re-check of
// #33: map labels for stop A, the footbridges and the sails; probes equal).
// All eleven were refreshed again after #36 (heat view coloured by surface minus
// air, the taller legend moving some margin notes near the top right, the cards'
// "degrees hotter / cooler than the air"): probes and note texts equal on all 65 cases.
// Earlier origins: blocks 1-3 8e76f7a, 4 189b7e1, 5 40b5366,
// 6 577a750, 7 1e292a5, 8 8735385, 9 de54f2a, 10 f751d00.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ref = process.argv[2] ?? 'HEAD';
const ALL = ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate', 'campus', 'busstop', 'village', 'desert'];
const CITIES = process.argv.length > 3 ? process.argv.slice(3).filter((c) => ALL.includes(c)) : ALL;
mkdirSync(`${root}tests/fixtures/base-pages`, { recursive: true });
for (const c of CITIES) {
  const html = execFileSync('git', ['show', `${ref}:cities/${c}/index.html`], { cwd: root, maxBuffer: 1 << 24 });
  writeFileSync(`${root}tests/fixtures/base-pages/${c}.html.gz`, gzipSync(html, { level: 9 }));
  console.log(`tests/fixtures/base-pages/${c}.html.gz  from ${ref}`);
}
