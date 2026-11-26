// Shared Playwright helpers: open the built page from disk, offline, and
// record every network request it tries to make.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PAGE = pathToFileURL(fileURLToPath(new URL('../../cities/asphalt-park/index.html', import.meta.url))).href;
export const VIEWPORT = { width: 1280, height: 800 };

export async function launch() {
  return chromium.launch();
}

/** Open the atlas with a query string; returns {page, context, requests, errors}. */
export async function open(browser, query = '', opts = {}) {
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
