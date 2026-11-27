// Generate references.html: every source key, grouped by block plus a
// "Model and methods" group, from engine/materials.js SOURCES, the source-key
// list in docs/sources.md and scripts/references-data.mjs.
// Usage: node scripts/references.mjs [--print]
//
// Which keys a block uses is read from the code and the docs, so a new block
// only has to use its keys:
//   - materials (and glass types) named in its scene or its own modules -> each parameter's source,
//   - source keys quoted or bracketed in its scene and its own modules (card source lines, measures),
//   - MODEL.<name> used in its own modules -> that constant's source,
//   - glossary terms shown on its page -> their src keys,
//   - [key] references in its "## Block n" section of docs/sources.md
//     (block 1: "Model vs literature targets" and "Sensitivity").
// "Model and methods" = keys in the Equations section of docs/sources.md, the
// sources of MODEL constants used by the shared engine, the sources of the
// shared tree-canopy material, and METHOD_EXTRA.
//
// Offline page, same rule as the block pages: no URL with a scheme or "//host/",
// no src=, @import or url(). Unlike block pages it may link to relative files
// in this repo (the gallery does the same). DOIs and URLs are text, not links.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MATERIALS, MODEL, GLASS } from '../engine/materials.js';
import { GLOSSARY, termsFor } from '../engine/glossary.js';
import { BLOCKS, modulesFor, hrefProblems } from './build.mjs';
import { REFS } from './references-data.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(`${root}${p}`, 'utf8');

/** Block order on the page; cities not listed here follow, sorted by id. */
export const ORDER = ['asphalt-park', 'sponge-retrofit', 'glass-cbd', 'waterfront', 'hutong', 'parking', 'estate'];
/** Block-specific method references also listed under "Model and methods". */
export const METHOD_EXTRA = ['fresnel', 'energyplus', 'steadman1994', 'bom'];

/** Reading-status flags read from the SOURCES text. */
const FLAG_RULES = [
  [/abstract only|AMS abstract/i, 'abstract only'],
  [/\bvia\b|secondary|from memory|not read\b/i, 'secondary source'],
  [/unverified|not checked|not located|no datasheet|anecdotal/i, 'unverified'],
  [/\bchecked against\b/i, 'checked against the source'],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Source keys and their one-line text, from the "## Source keys" list of docs/sources.md. */
export function sourceList(md = read('docs/sources.md')) {
  const sec = section(md, /^## Source keys$/m);
  return Object.fromEntries([...sec.matchAll(/^- \*\*\[(\w+)\]\*\* (.*)$/gm)].map((m) => [m[1], m[2]]));
}

/** Text of a "## " section (to the next "## " heading). */
function section(md, head) {
  const m = head.exec(md);
  if (!m) return '';
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next);
}

/** Text from a "## Block n" heading to the next "## Block" heading (subsections and topic sections included). */
function blockSection(md, n) {
  const start = md.search(new RegExp(`^## Block ${n}\\b`, 'm'));
  if (start < 0) return '';
  const rest = md.slice(start + 1);
  const next = rest.search(/^## Block \d/m);
  return next < 0 ? rest : rest.slice(0, next);
}

const bracketKeys = (text, known) => new Set([...text.matchAll(/\[([\w, ]+)\]/g)].flatMap((m) => m[1].split(',').map((s) => s.trim())).filter((k) => k in known));
const quotedKeys = (text, known) => new Set([...text.matchAll(/'(\w+)'/g)].map((m) => m[1]).filter((k) => k in known));
const paramSources = (obj) => Object.values(obj).filter((p) => p && typeof p === 'object' && 'source' in p).map((p) => p.source);
const srcKeys = (g) => (g.src ? g.src.split(',').map((s) => s.trim()) : []);

export function cities() {
  const all = readdirSync(`${root}cities`).filter((c) => existsSync(`${root}cities/${c}/scene.js`));
  return [...ORDER.filter((c) => all.includes(c)), ...all.filter((c) => !ORDER.includes(c)).sort()];
}

/** Source keys used by one block's page (see the header comment). */
export function blockKeys(city, n, md = read('docs/sources.md'), known = sourceList(md)) {
  const scene = read(`cities/${city}/scene.js`);
  const own = new Set(BLOCKS.flatMap((b) => b.modules));
  const mods = modulesFor(scene).filter(({ m, stub }) => !stub && own.has(m)).map(({ m }) => read(`engine/${m}.js`));
  const text = [scene, ...mods].join('\n');
  const keys = new Set();
  for (const id of quotedKeys(text, MATERIALS)) paramSources(MATERIALS[id]).forEach((k) => keys.add(k));
  if (mods.some((s) => /\bGLASS\b/.test(s))) Object.values(GLASS).forEach((g) => paramSources(g).forEach((k) => keys.add(k)));
  quotedKeys(text, known).forEach((k) => keys.add(k));
  bracketKeys(mods.join('\n'), known).forEach((k) => keys.add(k));
  for (const m of mods.join('\n').matchAll(/\bMODEL\.(\w+)/g)) if (MODEL[m[1]]) keys.add(MODEL[m[1]].source);
  for (const t of termsFor(city)) srcKeys(GLOSSARY[t]).forEach((k) => keys.add(k));
  const docs = n === 1 ? section(md, /^## Model vs literature targets$/m) + section(md, /^## Sensitivity$/m) : blockSection(md, n);
  bracketKeys(docs, known).forEach((k) => keys.add(k));
  return [...keys].filter((k) => k in known);
}

/** Keys behind the shared engine (every block uses them). */
export function methodKeys(md = read('docs/sources.md'), known = sourceList(md)) {
  const own = new Set(BLOCKS.flatMap((b) => b.modules));
  const core = readdirSync(`${root}engine`).filter((f) => f.endsWith('.js') && !own.has(f.slice(0, -3))).map((f) => read(`engine/${f}`)).join('\n');
  const keys = new Set(everyBlockKeys(md, known));
  for (const m of core.matchAll(/\bMODEL\.(\w+)/g)) if (MODEL[m[1]]) keys.add(MODEL[m[1]].source);
  METHOD_EXTRA.forEach((k) => keys.add(k));
  return [...keys].filter((k) => k in known);
}

/** Keys every page uses: the Equations section of docs/sources.md and the shared tree canopy. */
export function everyBlockKeys(md = read('docs/sources.md'), known = sourceList(md)) {
  const keys = new Set(bracketKeys(section(md, /^## Equations$/m), known));
  if (MATERIALS.canopy) paramSources(MATERIALS.canopy).forEach((k) => keys.add(k));
  return [...keys].filter((k) => k in known);
}

/** One structured reference: REFS details, with DOI/URL and flags filled from the SOURCES text. */
export function entry(key, text) {
  const r = REFS[key] ?? {};
  const doi = r.doi ?? /\bdoi[: ]+(10\.\d{4,}\/[^\s,;)]+)/i.exec(text)?.[1]?.replace(/[.:]$/, '') ?? null;
  const url = r.url ?? /\b((?:[a-z0-9-]+\.)+(?:gov|org|edu|au|cn|nl|uk|PDF)(?:\/[^\s,;)]*)?)/.exec(text)?.[1] ?? null;
  const flags = new Set(r.flags ?? []);
  if (key === 'engine') flags.add('no literature source');
  else if (/^brief\d*$/.test(key)) flags.add('project document');
  else for (const [re, f] of FLAG_RULES) if (re.test(text)) flags.add(f);
  if (!REFS[key]) flags.add('details not structured');
  return {
    key, text, flags: [...flags], doi, url: doi ? (r.url ?? null) : url, link: r.link ?? null,
    authors: r.authors ?? null, year: r.year ?? null, title: r.title ?? null, venue: r.venue ?? null,
    missingId: !doi && !url && !r.link && key !== 'engine',
  };
}

/** All groups: { id, title, keys, shared } in page order. */
export function groups(md = read('docs/sources.md')) {
  const known = sourceList(md);
  const methods = methodKeys(md, known);
  const every = everyBlockKeys(md, known);
  const out = [{ id: 'methods', title: 'Model and methods (all blocks)', keys: methods, shared: [] }];
  cities().forEach((c, i) => {
    const scene = read(`cities/${c}/scene.js`);
    const title = /title: '([^']+)'/.exec(scene)[1];
    const keys = [...new Set([...blockKeys(c, i + 1, md, known), ...every])];
    out.push({ id: c, n: i + 1, title: `Block ${i + 1}, ${c}: ${title}`, keys: keys.filter((k) => !methods.includes(k) || METHOD_EXTRA.includes(k)), shared: keys.filter((k) => methods.includes(k) && !METHOD_EXTRA.includes(k)) });
  });
  const used = new Set(out.flatMap((g) => [...g.keys, ...g.shared]));
  const rest = Object.keys(known).filter((k) => !used.has(k));
  if (rest.length) out.push({ id: 'other', title: 'Other sources (listed in docs/sources.md, not tied to one block)', keys: rest, shared: [] });
  return out;
}

const sortKey = (e) => `${/^brief|^engine/.test(e.key) ? 'z' : 'a'}${(e.authors ?? e.text).toLowerCase()}`;

function li(e, gid) {
  const who = `${esc(e.authors ?? 'Authors not recorded')}${e.year ? ` (${esc(e.year)})` : ''}.`;
  const stop = (t) => (/[.?!]$/.test(t) ? '' : '.');
  const title = e.title ? ` <cite>${esc(e.title)}</cite>${stop(e.title)}` : ' <span class="none">Title not recorded.</span>';
  const venue = e.venue ? ` ${esc(e.venue)}${stop(e.venue)}` : '';
  const ids = [e.doi && `<span class="id">doi ${esc(e.doi)}</span>`, e.url && `<span class="id">${esc(e.url)}</span>`, e.link && `<a href="${esc(e.link)}">${esc(e.link)}</a>`].filter(Boolean);
  const id = ids.length ? ` ${ids.join(' · ')}` : e.key === 'engine' ? '' : ' <span class="none">No DOI or URL recorded.</span>';
  const flags = e.flags.map((f) => ` <span class="flag">${esc(f)}</span>`).join('');
  return `<li id="ref-${gid}-${e.key}" data-key="${e.key}"><span class="key">[${e.key}]</span> ${who}${title}${venue}${id}${flags}
      <span class="as">As cited in the code: ${esc(e.text)}</span></li>`;
}

export function referencesHtml(md = read('docs/sources.md')) {
  const known = sourceList(md);
  const gs = groups(md);
  const methods = gs[0];
  const body = gs.map((g) => {
    const list = g.keys.map((k) => entry(k, known[k])).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const shared = g.shared.length
      ? `\n    <p class="shared">Also uses the shared model references: ${g.shared.map((k) => `<a href="#ref-methods-${k}">[${k}]</a>`).join(' ')}.</p>`
      : '';
    return `  <section id="${g.id}">
    <h2>${esc(g.title)}</h2>
    <p class="count">${g.keys.length + g.shared.length} sources${g.shared.length ? ` (${g.keys.length} listed here, ${g.shared.length} shared)` : ''}</p>
    <ol>
      ${list.map((e) => li(e, g.id)).join('\n      ')}
    </ol>${shared}
  </section>`;
  }).join('\n');
  const toc = gs.map((g) => `<a href="#${g.id}">${esc(g.id === 'methods' ? 'Model and methods' : g.id === 'other' ? 'Other' : `${g.n} ${g.id}`)}</a>`).join(' · ');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thermal-Ink Atlas · References</title>
<style>
  body { margin: 0; min-height: 100vh; background: #f3ecdd; color: #2b2621;
    font: 16px/1.5 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif; }
  main { max-width: 860px; margin: 0 auto; padding: 48px 24px; }
  h1 { margin: 0; font-size: 34px; letter-spacing: .02em; }
  .lede { margin: 6px 0 18px; max-width: 680px; opacity: .85; }
  .hand { font-family: "Segoe Print", "Bradley Hand", "Chalkboard SE", "Comic Sans MS", cursive; }
  nav { font-size: 14px; margin-bottom: 28px; }
  a { color: #8a2f22; }
  section { background: #fbf7ee; border: 1.5px solid #2b2621; border-radius: 4px 12px 5px 10px;
    box-shadow: 3px 4px 0 rgba(43,38,33,.18); padding: 14px 20px 10px; margin: 0 0 26px; }
  h2 { margin: 0; font-size: 21px; }
  .count { margin: 0 0 6px; font-size: 13px; opacity: .7; }
  ol { margin: 0; padding-left: 0; list-style: none; }
  li { margin: 0 0 10px; font-size: 14.5px; }
  .key { font: 12px ui-monospace, Menlo, monospace; opacity: .7; }
  .id { font: 12.5px ui-monospace, Menlo, monospace; word-break: break-all; }
  .none { font-style: italic; opacity: .7; }
  .flag { display: inline-block; margin-left: 4px; padding: 0 5px; font-size: 11px; border: 1px dashed #8a2f22; color: #8a2f22; border-radius: 3px; }
  .as { display: block; margin-top: 1px; font-size: 12.5px; opacity: .7; }
  .shared { font-size: 13px; margin: 4px 0 6px; }
  .shared a { font: 12px ui-monospace, Menlo, monospace; }
  dl { font-size: 13.5px; margin: 0 0 26px; }
  dt { display: inline; font-weight: bold; }
  dd { display: inline; margin: 0 0 0 4px; }
  dd::after { content: ""; display: block; }
  footer { margin-top: 40px; font-size: 13px; opacity: .7; }
</style>
</head>
<body>
<main>
  <h1>References</h1>
  <p class="lede">Every source behind the temperatures, parameters and card notes of the Thermal-Ink Atlas, by block.
    The temperatures are modelled with literature parameters, not measured. Parameter-by-parameter use, basis tags
    and the model-vs-literature checks are in <a href="docs/sources.md">docs/sources.md</a>.
    <a href="index.html">Back to the atlas</a>.</p>
  <p class="hand">Generated by scripts/references.mjs from the source keys in the code; do not edit by hand.</p>
  <nav>${toc}</nav>
  <dl>
    <dt>abstract only</dt><dd>only the abstract was read.</dd>
    <dt>secondary source</dt><dd>the figure was taken from another work, a summary or memory, not from this source itself.</dd>
    <dt>unverified</dt><dd>not yet checked against the primary source (or anecdotal).</dd>
    <dt>project document</dt><dd>a research brief in this repository; it compiles the other sources without checking them.</dd>
    <dt>details not structured</dt><dd>only the one-line citation from the code is available.</dd>
    <dt>checked against the source</dt><dd>the values used were compared with this source.</dd>
    <dt>no flag</dt><dd>cited by the research briefs; this does not mean the full text was checked.</dd>
  </dl>
  <p class="count">DOIs and web addresses are shown as text: this page makes no network requests. Titles were filled in
    from the bibliographic records; where a title was not certain it is marked "Title not recorded".</p>
${body}
  <footer>MIT licence · thermal-ink-atlas contributors · ${Object.keys(known).length} source keys</footer>
</main>
</body>
</html>
`;
  const bad = externalRefs(html);
  if (bad.length) throw new Error(`references.html: external reference(s): ${bad.join(', ')}`);
  return html;
}

/**
 * The references page's rule: no URL with a host, no src=, @import or url()
 * at all, and only allow-listed links (build.mjs hrefProblems: fragments and
 * relative paths that stay inside the repository).
 */
export function externalRefs(html) {
  const hits = html.match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}\/|\bsrc\s*=|@import|url\(/gi) ?? [];
  return [...new Set([...hits, ...hrefProblems(html, 'references.html')])];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = referencesHtml();
  if (process.argv.includes('--print')) process.stdout.write(html);
  else {
    writeFileSync(`${root}references.html`, html);
    const known = sourceList();
    for (const g of groups()) console.log(`${g.id}: ${g.keys.length + g.shared.length} sources`);
    const missing = Object.keys(known).map((k) => entry(k, known[k])).filter((e) => e.missingId).map((e) => e.key);
    console.log(`references.html  ${Object.keys(known).length} keys; no DOI/URL: ${missing.join(', ') || 'none'}`);
  }
}
