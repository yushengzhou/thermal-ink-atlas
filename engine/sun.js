// sun: NOAA solar position and cast-shadow geometry.
// Equations: NOAA Global Monitoring Laboratory, "General Solar Position
// Calculations" (gml.noaa.gov/grad/solcalc/solareqns.PDF), fractional-year form.
import { DEG, hull, inPoly } from './core.js';

const DAYS_BEFORE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export function dayOfYear(year, month, day) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return DAYS_BEFORE[month - 1] + day + (leap && month > 2 ? 1 : 0);
}

/**
 * Solar position for a local clock time.
 * @param {object} site {lat, lon (deg, east +), tz (hours), year, month, day}
 * @param {number} hour local clock hour, decimal (15.5 = 15:30)
 * @returns {{alt:number, az:number, decl:number, eqtime:number}} degrees,
 *   azimuth clockwise from north; eqtime in minutes.
 */
export function solarPosition(site, hour) {
  const year = site.year ?? 2026;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const doy = dayOfYear(year, site.month, site.day);
  const g = ((2 * Math.PI) / (leap ? 366 : 365)) * (doy - 1 + (hour - site.tz - 12) / 24);
  const eqtime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const offset = eqtime + 4 * site.lon - 60 * site.tz; // minutes
  const tst = hour * 60 + offset; // true solar time, minutes
  const ha = (tst / 4 - 180) * DEG;
  const lat = site.lat * DEG;
  const cosZen = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(Math.max(-1, Math.min(1, cosZen)));
  // azimuth from north, clockwise
  const cosAz = (Math.sin(decl) - Math.sin(lat) * cosZen) / (Math.cos(lat) * Math.sin(zen));
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) / DEG;
  if (ha > 0) az = 360 - az;
  return { alt: 90 - zen / DEG, az, decl: decl / DEG, eqtime };
}

/** Unit vector pointing to the sun in world axes (x east, y south, z up). */
export function sunVector(alt, az) {
  const a = alt * DEG;
  const b = az * DEG;
  return [Math.sin(b) * Math.cos(a), -Math.cos(b) * Math.cos(a), Math.sin(a)];
}

/** Horizontal displacement of the shadow of a point at height h. */
export function shadowOffset(h, sun) {
  if (sun.alt <= 0.5) return null;
  const L = h / Math.tan(sun.alt * DEG);
  const b = sun.az * DEG;
  return [-Math.sin(b) * L, Math.cos(b) * L];
}

/** Ground shadow polygon (flat array) of an axis-aligned box from z0 to z1. */
export function boxShadow(x0, y0, x1, y1, z1, sun, z0 = 0) {
  const top = shadowOffset(z1, sun);
  if (!top) return null;
  const bot = z0 > 0 ? shadowOffset(z0, sun) : [0, 0];
  const pts = [];
  for (const [ox, oy] of [bot, top]) {
    pts.push([x0 + ox, y0 + oy], [x1 + ox, y0 + oy], [x1 + ox, y1 + oy], [x0 + ox, y1 + oy]);
  }
  return hull(pts).flat();
}

/** Ground shadow of a spherical canopy (centre height zc, radius r) as polygon. */
export function canopyShadow(cx, cy, zc, r, sun, n = 18) {
  const o = shadowOffset(zc, sun);
  if (!o) return null;
  const b = sun.az * DEG;
  const ux = -Math.sin(b);
  const uy = Math.cos(b);
  const stretch = 1 / Math.sin(sun.alt * DEG);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI;
    const along = Math.cos(t) * r * stretch;
    const across = Math.sin(t) * r;
    pts.push(cx + o[0] + ux * along - uy * across, cy + o[1] + uy * along + ux * across);
  }
  return pts;
}

/**
 * Rasterise polygons onto a grid. For every grid sample point inside a
 * polygon, calls visit(index, polyIndex). Samples: s x s per cell.
 */
export function rasterise(polys, grid, visit, s = 1) {
  const { nx, ny, cell } = grid;
  for (let p = 0; p < polys.length; p++) {
    const poly = polys[p];
    if (!poly) continue;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < poly.length; i += 2) {
      x0 = Math.min(x0, poly[i]);
      x1 = Math.max(x1, poly[i]);
      y0 = Math.min(y0, poly[i + 1]);
      y1 = Math.max(y1, poly[i + 1]);
    }
    const i0 = Math.max(0, Math.floor(x0 / cell));
    const i1 = Math.min(nx - 1, Math.floor(x1 / cell));
    const j0 = Math.max(0, Math.floor(y0 / cell));
    const j1 = Math.min(ny - 1, Math.floor(y1 / cell));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        for (let sj = 0; sj < s; sj++) {
          for (let si = 0; si < s; si++) {
            const x = (i + (si + 0.5) / s) * cell;
            const y = (j + (sj + 0.5) / s) * cell;
            if (inPoly(poly, x, y)) visit(j * nx + i, p, si + sj * s);
          }
        }
      }
    }
  }
}
