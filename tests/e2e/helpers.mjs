// Shared Playwright helpers: open the built page from disk, offline, and
// record every network request it tries to make.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** file:// URL of a built city page. */
export const pageFor = (city) => pathToFileURL(fileURLToPath(new URL(`../../cities/${city}/index.html`, import.meta.url))).href;
export const PAGE = pageFor('asphalt-park');
export const VIEWPORT = { width: 1280, height: 800 };

export async function launch() {
  return chromium.launch();
}

/** Open the atlas with a query string; returns {page, context, requests, errors}. */
export async function open(browser, query = '', opts = {}) {
  const PAGE = opts.city ? pageFor(opts.city) : pageFor('asphalt-park');
  const context = await browser.newContext({ viewport: opts.viewport ?? VIEWPORT, deviceScaleFactor: opts.dpr ?? 1, hasTouch: !!opts.touch });
  await context.setOffline(true);
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(PAGE.split('?')[0]) && !r.url().startsWith('data:')) requests.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(PAGE + (query ? `?${query}` : ''));
  await page.waitForFunction(() => window.atlas && window.atlas.ready, null, { timeout: 30000 });
  return { page, context, requests, errors };
}

/** Median of an array of numbers. */
export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** Percentile p (0-100) of an array. */
export const pct = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

/**
 * True region pixel means on the thermal view (see thermal.test.mjs): spec is
 * {key: [{x0, y0, x1, y1, z, b}]} cell boxes; occluders drawn in front are cut
 * out (boxes of the view `which`), the mask is eroded by `band` px, and each
 * pixel is read back through the palette; ink-like pixels are dropped.
 * Returns {key: {n, mean, inkShare}}.
 */
export function regionPixelMeans(page, spec, band, inkRes, which) {
  return page.evaluate(
    ([spec, band, inkRes, which]) => {
      const A = window.atlas;
      const c = document.getElementById('atlas');
      const Wd = c.width;
      const Hd = c.height;
      const img = c.getContext('2d').getImageData(0, 0, Wd, Hd).data;
      const lut = A.palette();
      const boxes = A.boxes(which ?? undefined);
      const hull = (pts) => {
        const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lo = [];
        for (const q of p) {
          while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
          lo.push(q);
        }
        const up = [];
        for (let i = p.length - 1; i >= 0; i--) {
          while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p[i]) <= 0) up.pop();
          up.push(p[i]);
        }
        return lo.slice(0, -1).concat(up.slice(0, -1));
      };
      const sil = boxes.map(({ box: [x0, y0, x1, y1, z0, z1] }) => {
        const pts = [];
        for (const z of [z0, z1]) for (const [x, y] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) pts.push(A.project(x, y, z));
        return hull(pts);
      });
      const poly = (g, pts) => {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
        g.closePath();
        g.fill();
      };
      const cellPoly = (q) => [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1]].map(([x, y]) => A.project(x, y, q.z));
      const mask = new OffscreenCanvas(Wd, Hd);
      const g = mask.getContext('2d');
      const tmp = new OffscreenCanvas(Wd, Hd);
      const t = tmp.getContext('2d');
      const out = {};
      for (const [key, cells] of Object.entries(spec)) {
        g.globalCompositeOperation = 'source-over';
        g.clearRect(0, 0, Wd, Hd);
        g.fillStyle = '#000';
        // group by building (-1 = ground)
        const groups = new Map();
        for (const q of cells) {
          if (!groups.has(q.b)) groups.set(q.b, []);
          groups.get(q.b).push(q);
        }
        for (const [b, qs] of groups) {
          t.globalCompositeOperation = 'source-over';
          t.clearRect(0, 0, Wd, Hd);
          t.fillStyle = '#000';
          for (const q of qs) poly(t, cellPoly(q));
          // cut out everything drawn in front: for ground, every occluder
          // (a box never covers ground in front of it); for a roof, the boxes
          // drawn after its building
          const after = b < 0 ? 0 : boxes.findIndex((x) => x.kind === 'b' && x.b === b) + 1;
          t.globalCompositeOperation = 'destination-out';
          for (let k = after; k < boxes.length; k++) {
            if (b >= 0 && boxes[k].kind === 'a') continue; // own-street awnings sit below roof level
            poly(t, sil[k]);
          }
          g.drawImage(tmp, 0, 0);
        }
        const a = g.getImageData(0, 0, Wd, Hd).data;
        let m = new Uint8Array(Wd * Hd);
        for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 127 ? 1 : 0;
        // erode by band (separable square min filter)
        for (const dir of [1, Wd]) {
          const e = new Uint8Array(m.length);
          for (let i = 0; i < m.length; i++) {
            if (!m[i]) continue;
            let ok = 1;
            for (let d = -band; d <= band && ok; d++) {
              const j = i + d * dir;
              if (j < 0 || j >= m.length || (dir === 1 && Math.floor(j / Wd) !== Math.floor(i / Wd)) || !m[j]) ok = 0;
            }
            e[i] = ok;
          }
          m = e;
        }
        let sum = 0;
        let n = 0;
        let ink = 0;
        for (let i = 0; i < m.length; i++) {
          if (!m[i]) continue;
          const r = img[i * 4];
          const gg = img[i * 4 + 1];
          const bb = img[i * 4 + 2];
          let best = 0;
          let be = Infinity;
          for (const [tt, col] of lut) {
            const dot = r * col[0] + gg * col[1] + bb * col[2];
            const cc = col[0] * col[0] + col[1] * col[1] + col[2] * col[2];
            const k = Math.min(1.04, Math.max(0.86, dot / cc));
            const e = (r - k * col[0]) ** 2 + (gg - k * col[1]) ** 2 + (bb - k * col[2]) ** 2;
            if (e < be) [be, best] = [e, tt];
          }
          if (Math.sqrt(be / 3) > inkRes) {
            ink++;
            continue;
          }
          sum += best;
          n++;
        }
        out[key] = { n, mean: n ? sum / n : NaN, inkShare: ink / Math.max(1, n + ink) };
      }
      return out;
    },
    [spec, band, inkRes, which ?? null],
  );
}
