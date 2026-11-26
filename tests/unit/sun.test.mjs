// Sun position vs NOAA almanac anchors and suncalc (dev-only oracle).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import SunCalc from 'suncalc';
import { solarPosition } from '../../engine/sun.js';

const site = { lat: 35, lon: 120, tz: 8, year: 2026, month: 7, day: 20 };

test('declination and equation of time match almanac values', () => {
  // June solstice: declination ~ +23.44 deg
  assert.ok(Math.abs(solarPosition({ ...site, month: 6, day: 21 }, 12).decl - 23.44) < 0.15);
  // 20 July: declination ~ +20.6 deg (Astronomical Almanac, about 20 deg 36')
  assert.ok(Math.abs(solarPosition(site, 12).decl - 20.6) < 0.3);
  // equation of time extremes: ~ -14.2 min (11 Feb) and ~ +16.4 min (3 Nov)
  assert.ok(Math.abs(solarPosition({ ...site, month: 2, day: 11 }, 12).eqtime + 14.2) < 0.6);
  assert.ok(Math.abs(solarPosition({ ...site, month: 11, day: 3 }, 12).eqtime - 16.4) < 0.6);
});

test('solar noon altitude = 90 - lat + decl and azimuth crosses south', () => {
  // local solar noon at lon 120, tz +8: 12:00 - eqtime (eqtime ~ -6.3 min)
  const noon = 12 + 6.3 / 60;
  const s = solarPosition(site, noon);
  assert.ok(Math.abs(s.alt - (90 - 35 + s.decl)) < 0.1, `alt ${s.alt}`);
  assert.ok(Math.abs(s.az - 180) < 1.5, `az ${s.az}`);
});

test('altitude and azimuth agree with suncalc within 0.3 deg', () => {
  const cases = [
    [site, [6, 9, 12, 15, 18]],
    [{ lat: 51.5, lon: 0, tz: 0, year: 2026, month: 3, day: 21 }, [8, 12, 16]],
    [{ lat: -33.9, lon: 151.2, tz: 10, year: 2026, month: 12, day: 22 }, [7, 13, 18]],
  ];
  for (const [s, hours] of cases) {
    for (const h of hours) {
      const ours = solarPosition(s, h);
      const d = new Date(Date.UTC(s.year, s.month - 1, s.day) + (h - s.tz) * 3600e3);
      const ref = SunCalc.getPosition(d, s.lat, s.lon);
      const alt = (ref.altitude * 180) / Math.PI;
      const az = ((ref.azimuth * 180) / Math.PI + 180 + 360) % 360;
      assert.ok(Math.abs(ours.alt - alt) < 0.3, `alt ${s.lat} ${h}: ${ours.alt} vs ${alt}`);
      // azimuth error as an angle on the sky (shrinks near the zenith)
      const dAz = Math.abs(((ours.az - az + 540) % 360) - 180) * Math.cos((alt * Math.PI) / 180);
      assert.ok(dAz < 0.3, `az ${s.lat} ${h}: ${ours.az} vs ${az}`);
    }
  }
});
