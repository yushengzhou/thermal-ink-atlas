// The promo film, rendered frame by frame by the engine (issue #34).
//
//   npm run film                      media/thermal-ink-atlas.mp4, poster.jpg, loop.webp, blocks/*.jpg
//   npm run film -- --check           render a few frames twice (fresh browsers, reversed order), compare hashes
//   npm run film -- --stills=<dir>    one JPEG per shot into <dir> (to frame the cameras), no film
//   npm run film -- --bitrate=2500000
//
// How: a tiny local server (127.0.0.1, cities/ only) serves the built pages and
// a compositor page. The compositor holds one block page in a same-origin
// iframe, drives it with the determinism contract (atlas.seek(frame, camera),
// atlas.look({hour, thermal}), ?f / ?cam / ?thermal / ?hour, the T key for the
// heat-view fade), copies its canvas, draws the captions on top and hands the
// frame to WebCodecs (H.264 if the browser encodes it, else VP9). Every film
// frame is a pure function of its frame number (the cross-dissolves also use
// the previous shot's last frame). The encoded chunks are muxed here into an
// MP4 by the small writer below (no ffmpeg). Not part of npm test or CI.
//
// Every number in a caption is read from the page's own model output (its
// margin notes, atlas.notes()); a caption whose note is missing stops the run.
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, normalize, extname } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const arg = (k, d) => {
  const a = process.argv.find((x) => x === `--${k}` || x.startsWith(`--${k}=`));
  if (!a) return d;
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true;
};
const W = 1920;
const H = 1080;
const FPS = 30;
const BITRATE = Number(arg('bitrate', 2_600_000));
const OUT = join(root, 'media');

// ---- storyboard -----------------------------------------------------------------------------

const smooth = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const quarter = (h) => Math.round(h * 4) / 4;
const r0 = (x) => String(Math.round(x));
/** The note's text (both lines), or stop: captions never show a number the page did not compute. */
const note = (N, key) => {
  if (!N[key]) throw new Error(`note "${key}" missing on the page (have: ${Object.keys(N).join(', ')})`);
  return N[key];
};
/** Numbers in a note that are followed by `unit` ('°C', 'degrees', 'watts'), in order. */
const nums = (text, unit) => {
  const re = new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*${unit}`, 'g');
  const out = [...text.matchAll(re)].map((m) => Number(m[1]));
  if (!out.length) throw new Error(`no number with "${unit}" in note: ${text}`);
  return out;
};

// block 1 (the long sequence): film frames 0-449
const B1 = {
  len: 450,
  title: [0, 60], // title card over the empty paper
  penAt: 45, // the pen starts (engine frame 0 -> 300 over 150 film frames: pen, wash, life)
  fade1: 225, // day -> heat view at 3 pm (engine fade: 60 engine frames = 30 film frames)
  sweep: [300, 390], // 3 pm -> 11 pm
  fade2: 405, // heat view -> day view at 11 pm (night)
};
const ef1 = (t) => (t < B1.penAt ? 0 : (t - B1.penAt) * 2); // engine frame, 2 per film frame (engine runs at 60)

const MONT = 72; // frames per montage shot (2.4 s)
const DIS = 6; // cross-dissolve frames at the start of a montage shot (short: a whole-frame fade is costly to encode)
const END = 75; // end card

/**
 * Shots. q: page query (?f is added per frame by seek); cam {z,cx,cy}; pan
 * [dx, dy] world units over the shot; f0: first engine frame; hour; thermal;
 * set: per-frame block state; cap(notes) -> {en, zh}; tag: block name.
 */
const SHOTS = [
  {
    id: 'asphalt-park',
    n: 1,
    q: 'f=0',
    len: B1.len,
    cam: { z: 2.4, cx: 190, cy: 212 },
    tag: ['Asphalt street vs pocket park', '沥青街道与口袋公园'],
  },
  {
    id: 'sponge-retrofit',
    n: 2,
    q: 'f=640&thermal&hour=15&state=split',
    cam: { z: 2.9, cx: 225, cy: 238 },
    pan: [0, 0],
    hour: 15,
    thermal: true,
    set: (p) => [['retro', { split: 0.3 + 0.4 * smooth(p) }]],
    tag: ['Sponge-city and cool-roof retrofit', '海绵城市与凉屋顶改造'],
    cap: (N) => {
      const [cool, dark] = nums(note(N, 'roofs'), '°C');
      return { en: `Before | after: painted white, a dark roof goes from ${r0(dark)} °C to ${r0(cool)} °C at 3 pm`, zh: `改造前 | 改造后：深色屋顶刷白，下午 3 点从 ${r0(dark)} °C 降到 ${r0(cool)} °C` };
    },
  },
  {
    id: 'glass-cbd',
    n: 3,
    q: 'f=640&thermal&hour=15',
    cam: { z: 7, cx: 150, cy: 215 },
    pan: [6, -4],
    hour: 15,
    thermal: true,
    tag: ['Glass towers and street canyons', '玻璃塔楼与街道峡谷'],
    cap: (N) => {
      const [spot, shade] = nums(note(N, 'spot'), '°C');
      return { en: `Sun bounced off a glass tower: in the shade, yet it feels like ${r0(spot)} °C (plain shade ${r0(shade)} °C)`, zh: `玻璃幕墙反射的阳光：人在阴影里，体感却像 ${r0(spot)} °C（普通阴影 ${r0(shade)} °C）` };
    },
  },
  {
    id: 'waterfront',
    capLift: 50, // the page's overlay label (bottom centre, 978-1000 px) sits under the caption: lift the caption clear of it
    n: 4,
    q: 'f=640&thermal&hour=15',
    cam: { z: 2.6, cx: 205, cy: 200 },
    pan: [8, 0],
    hour: 15,
    thermal: true,
    tag: ['Waterfront and wind corridors', '滨水区与通风廊道'],
    cap: (N) => {
      const [open] = nums(note(N, 'corridor'), '°C');
      const [shel] = nums(note(N, 'sheltered'), '°C');
      return { en: `3 pm: the street open to the river breeze is ${r0(open)} °C; behind the warehouses, ${r0(shel)} °C`, zh: `下午 3 点：迎着河风的街道 ${r0(open)} °C；仓库背后避风的街道 ${r0(shel)} °C` };
    },
  },
  {
    id: 'hutong',
    n: 5,
    q: 'f=640&thermal&hour=20',
    cam: { z: 5.5, cx: 222, cy: 200 },
    pan: [6, 4],
    hour: 20,
    thermal: true,
    // without, then with the 7 pm splash (the page's P toggle)
    set: (p) => [['hutong', { splash: p >= 0.4 }]],
    state: (p) => (p >= 0.4 ? 'lanes splashed at 7 pm · 已泼水' : 'no splash · 未泼水'),
    tag: ['Hutong lanes and courtyards', '胡同与四合院'],
    cap: (N) => {
      const [d1] = nums(note(N, 'splash'), 'degrees');
      return { en: `An old summer habit: splash the lanes with water at 7 pm, and by 8 pm they are ${r0(d1)} degrees cooler`, zh: `老北京的消暑习惯：傍晚 7 点往胡同泼水，到 8 点地面凉了 ${r0(d1)} 度` };
    },
  },
  {
    id: 'parking',
    capLift: 50, // the page's overlay label (bottom centre, 978-1000 px) sits under the caption: lift the caption clear of it
    n: 6,
    q: 'f=640&thermal&hour=23&flux=1',
    cam: { z: 4.4, cx: 140, cy: 170 },
    pan: [8, 0],
    hour: 23,
    thermal: true,
    tag: ['Car park and brownfield', '停车场与棕地'],
    cap: (N) => {
      const [, night] = nums(note(N, 'asphalt'), '°C');
      const [, shed] = nums(note(N, 'shed'), '°C');
      return { en: `11 pm: the car park asphalt is still ${r0(night)} °C, giving back the day's heat; the metal shed roofs are down to ${r0(shed)} °C`, zh: `晚上 11 点：停车场沥青仍有 ${r0(night)} °C，正把白天的热放出来；铁皮棚顶已降到 ${r0(shed)} °C` };
    },
  },
  {
    id: 'estate',
    capLift: 50, // the page's overlay label (bottom centre, 978-1000 px) sits under the caption: lift the caption clear of it
    n: 7,
    q: 'f=640&hour=20&ac=1',
    cam: { z: 3.8, cx: 230, cy: 250 },
    pan: [6, -4],
    hour: 20,
    thermal: false,
    tag: ['Older high-rise estate', '老旧高层住宅小区'],
    cap: (N) => {
      const [w] = nums(note(N, 'ac'), 'watts');
      return { en: `8 pm: the air conditioners on the walls blow about ${r0(w)} watts per m² of heat into the evening air`, zh: `晚上 8 点：外墙上的空调外机向傍晚的空气排热，约每平方米 ${r0(w)} 瓦` };
    },
  },
  {
    id: 'campus',
    n: 8,
    q: 'f=640&thermal&hour=15',
    cam: { z: 3.4, cx: 145, cy: 190 },
    pan: [8, 0],
    hour: 15,
    thermal: true,
    tag: ['School campus playground', '校园操场'],
    cap: (N) => {
      const [turf, grass] = nums(note(N, 'turf'), '°C');
      return { en: `3 pm: the artificial-turf pitch is ${r0(turf)} °C, the real grass next to it ${r0(grass)} °C`, zh: `下午 3 点：人造草坪 ${r0(turf)} °C，旁边的真草地 ${r0(grass)} °C` };
    },
  },
  {
    id: 'busstop',
    capLift: 50, // the page's overlay label (bottom centre, 978-1000 px) sits under the caption: lift the caption clear of it
    n: 9,
    q: 'f=1650&hour=15&spots=1',
    f0: 1650,
    cam: { z: 12, cx: 303, cy: 211 },
    pan: [0, 0],
    hour: 15,
    thermal: false,
    tag: ['Bus stops and footbridges', '公交站与人行天桥'],
    cap: (N) => {
      const [shade, kerb] = nums(note(N, 'stopA'), '°C');
      return { en: `3 pm at a bus stop: in the shade of its metal roof it feels like ${r0(shade)} °C, at the kerb in the sun ${r0(kerb)} °C`, zh: `下午 3 点的公交站：金属顶棚阴影下体感 ${r0(shade)} °C，路边阳光下 ${r0(kerb)} °C` };
    },
  },
  {
    id: 'village',
    n: 10,
    q: 'f=640&thermal&hour=15',
    cam: { z: 6, cx: 130, cy: 340 },
    pan: [6, 4],
    hour: 15,
    thermal: true,
    // then the page's W toggle marks the roofs the residents painted white
    set: (p) => [['village', { cool: p >= 0.4 }]],
    state: (p) => (p >= 0.4 ? "residents' white roofs · 居民刷白的屋顶" : 'bare iron · 裸铁皮'),
    tag: ['Urban village and informal edge', '城中村与简易房边缘'],
    cap: (N) => {
      const [white, bare] = nums(note(N, 'white'), '°C');
      return { en: `3 pm: bare rusty iron roofs reach ${r0(bare)} °C; the roofs residents painted white, ${r0(white)} °C`, zh: `下午 3 点：裸露的生锈铁皮屋顶达 ${r0(bare)} °C；居民刷白的屋顶 ${r0(white)} °C` };
    },
  },
  {
    id: 'desert',
    n: 11,
    q: 'f=640&thermal&hour=15',
    cam: { z: 7, cx: 262, cy: 40 },
    pan: [6, 4],
    hour: 15,
    thermal: true,
    tag: ['Desert courtyard neighbourhood', '沙漠庭院街区'],
    cap: (N) => {
      const [d] = nums(note(N, 'sail'), 'degrees');
      return { en: `Desert, 3 pm: under the shade sails it feels about ${r0(d)} degrees cooler than in the open sun`, zh: `沙漠街区，下午 3 点：遮阳帆下体感比烈日下凉约 ${r0(d)} 度` };
    },
  },
  {
    id: 'nightmarket',
    n: 12,
    q: 'f=640&thermal&hour=21',
    cam: { z: 13, cx: 245, cy: 192 },
    pan: [-6, 0],
    hour: 21,
    thermal: true,
    tag: ['Night market street', '夜市街道'],
    cap: (N) => {
      const [grill] = nums(note(N, 'grill'), '°C');
      return { en: `9 pm at the night market: 1 m from a charcoal grill it feels like up to ${r0(grill)} °C`, zh: `晚上 9 点的夜市：离炭火烤炉 1 米，体感最高约 ${r0(grill)} °C` };
    },
  },
  { id: 'end', page: 'asphalt-park', q: 'f=0', len: END },
];
for (const s of SHOTS) s.len = s.len ?? MONT;
let acc = 0;
for (const s of SHOTS) {
  s.start = acc;
  acc += s.len;
}
const TOTAL = acc;

// block 1 captions, filled from its notes when the page is loaded
const b1caps = (N) => {
  const [road15, road23] = nums(note(N, 'asphalt'), '°C');
  const [lawn15] = nums(note(N, 'lawn'), '°C');
  return [
    { t: [70, 210], en: 'An old asphalt street next to a shady pocket park draws itself in ink', zh: '一条老沥青街和树荫下的小公园，用墨线一笔笔画出来' },
    { t: [228, 298], en: `Heat view, 3 pm on a heat-wave day: the dark road is ${r0(road15)} °C, the park lawn ${r0(lawn15)} °C`, zh: `热力视图，热浪中的下午 3 点：深色路面 ${r0(road15)} °C，公园草地 ${r0(lawn15)} °C` },
    { t: [306, 450], en: `By 11 pm the road is still ${r0(road23)} °C: it gives the day's heat back at night`, zh: `到晚上 11 点路面仍有 ${r0(road23)} °C：白天存下的热，夜里慢慢放出来` },
  ];
};

const fadeIO = (t, a, b, k = 8) => Math.min(smooth((t - a) / k), smooth((b - t) / k));

const shotOf = (i) => SHOTS.findIndex((s) => i >= s.start && i < s.start + s.len);

/** The spec of film frame i: what the page draws. Pure. */
function frameSpec(i, notesOf) {
  const si = shotOf(i);
  const s = SHOTS[si];
  const t = i - s.start;
  const spec = { i, shot: si, overlay: {} };
  if (s.id === 'asphalt-park') {
    const ef = ef1(t);
    let thermal = false;
    let fade = null;
    if (t >= B1.fade1 && t < B1.fade1 + 30) fade = { to: true, f0: ef1(B1.fade1) };
    else if (t >= B1.fade1 + 30 && t < B1.fade2) thermal = true;
    else if (t >= B1.fade2 && t < B1.fade2 + 30) fade = { to: false, f0: ef1(B1.fade2) };
    const p = (t - B1.sweep[0]) / (B1.sweep[1] - B1.sweep[0]);
    const hour = quarter(15 + 8 * smooth(p));
    Object.assign(spec, { ef, cam: s.cam, hour, thermal, fade });
    spec.overlay.title = { a: t < B1.title[1] ? Math.min(smooth((t + 1) / 12), smooth((B1.title[1] - t) / 15)) : 0 };
    const caps = b1caps(notesOf(si));
    const c = caps.find((x) => t >= x.t[0] && t < x.t[1]);
    if (c) spec.overlay.caption = { en: c.en, zh: c.zh, a: fadeIO(t, c.t[0], c.t[1]) };
    if (t >= 170) spec.overlay.hour = { h: hour, a: smooth((t - 170) / 15) };
    if (t >= 120) spec.overlay.tag = { n: 1, en: s.tag[0], zh: s.tag[1], a: smooth((t - 120) / 15) };
    if (t === s.len - 1) spec.save = true;
    return spec;
  }
  if (s.id === 'end') {
    Object.assign(spec, { ef: 0, cam: null, hour: 15, thermal: false, fade: null });
    spec.dissolve = t < 15 ? 1 - smooth((t + 1) / 15) : 0;
    spec.overlay.end = { a: smooth((t - 8) / 14) };
    return spec;
  }
  const p = t / (s.len - 1);
  const cam = { z: s.cam.z, cx: s.cam.cx + s.pan[0] * (p - 0.5), cy: s.cam.cy + s.pan[1] * (p - 0.5) };
  Object.assign(spec, { ef: (s.f0 ?? 640) + t * 2, cam, hour: s.hour, thermal: s.thermal, fade: null });
  if (s.set) spec.set = s.set(p);
  spec.dissolve = t < DIS ? 1 - smooth((t + 1) / DIS) : 0;
  const c = s.cap(notesOf(si));
  spec.overlay.caption = { ...c, lift: s.capLift ?? 0, a: fadeIO(t, DIS - 2, s.len, 7) };
  spec.overlay.tag = { n: s.n, en: s.tag[0], zh: s.tag[1], a: fadeIO(t, DIS - 4, s.len, 6) };
  spec.overlay.hour = { h: s.hour, a: fadeIO(t, DIS - 4, s.len, 6), state: s.state ? s.state(p) : null };
  if (t === s.len - 1) spec.save = true;
  return spec;
}

// ---- the compositor page (runs in the browser) ------------------------------------------------

function filmPage(W, H) {
  const PAPER = '#f3ecdd';
  const INK = '#2b2621';
  const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
  const ZH = '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif';
  const HAND = '"Bradley Hand", "Segoe Print", "Chalkboard SE", "Comic Sans MS", cursive';
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const base = mk(W, H); // the block's canvas (and dissolve), no captions
  const out = mk(W, H); // what is encoded
  const prev = mk(W, H); // the previous shot's last base frame
  const bctx = base.getContext('2d', { alpha: false });
  const octx = out.getContext('2d', { alpha: false });
  const pctx = prev.getContext('2d', { alpha: false });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const F = {
    ifr: null,
    chunks: [],
    desc: null,
    enc: null,
    async load(url) {
      const old = this.ifr;
      const f = document.createElement('iframe');
      f.width = W;
      f.height = H;
      f.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;border:0;opacity:0;pointer-events:none`;
      document.body.appendChild(f);
      await new Promise((r) => {
        f.onload = r;
        f.src = url;
      });
      for (let k = 0; k < 600 && !(f.contentWindow.atlas && f.contentWindow.atlas.ready); k++) await sleep(50);
      if (!f.contentWindow.atlas) throw new Error(`page did not boot: ${url}`);
      if (old) old.remove();
      this.ifr = f;
      this.win = f.contentWindow;
      this.doc = f.contentDocument;
      this.A = this.win.atlas;
      this.cv = this.doc.getElementById('atlas');
      if (this.cv.width !== W || this.cv.height !== H) throw new Error(`canvas ${this.cv.width}×${this.cv.height}`);
      const notes = {};
      for (const n of this.A.notes()) notes[n.key] = n.text.join(' ');
      this.A.look({ notes: false }); // the film draws its own captions
      return notes;
    },
    legend() {
      const bar = this.doc.getElementById('legendBar');
      const stops = [...(bar ? bar.style.background : '').matchAll(/rgb\((\d+), (\d+), (\d+)\)(?: (\d+(?:\.\d+)?)%)?/g)].map((m) => [m[4] === undefined ? null : Number(m[4]) / 100, `rgb(${m[1]},${m[2]},${m[3]})`]);
      const lo = this.doc.getElementById('legendLo')?.textContent ?? '';
      const hi = this.doc.getElementById('legendHi')?.textContent ?? '';
      return { stops, lo, hi };
    },
    /** Draw film frame `s` (see frameSpec) into base and out. */
    render(s) {
      const A = this.A;
      // block state: set only what differs (a model swap re-bakes the tiles)
      if (s.set) {
        for (const [ns, o] of s.set) {
          const now = A[ns].state();
          const d = Object.fromEntries(Object.entries(o).filter(([k, v]) => now[k] !== v));
          if (Object.keys(d).length) A[ns].set(d);
        }
      }
      if (s.fade) {
        // the engine's own fade, from a known start: the view before, then T at f0
        A.look({ hour: s.hour, thermal: !s.fade.to });
        A.seek(s.fade.f0, s.cam ?? undefined);
        this.win.dispatchEvent(new this.win.KeyboardEvent('keydown', { key: 't', bubbles: true }));
      } else A.look({ hour: s.hour, thermal: s.thermal });
      A.seek(s.ef, s.cam ?? undefined);
      const mix = A.state().mix;
      bctx.globalAlpha = 1;
      bctx.drawImage(this.cv, 0, 0);
      if (s.dissolve > 0) {
        bctx.globalAlpha = s.dissolve;
        bctx.drawImage(prev, 0, 0);
        bctx.globalAlpha = 1;
      }
      if (s.save) pctx.drawImage(base, 0, 0);
      octx.globalAlpha = 1;
      octx.drawImage(base, 0, 0);
      this.overlay(octx, s.overlay, mix);
    },
    overlay(g, o, mix) {
      if (o.title && o.title.a > 0) this.title(g, o.title.a);
      if (o.end && o.end.a > 0) this.endCard(g, o.end.a);
      if (o.tag && o.tag.a > 0) this.tag(g, o.tag);
      if (o.hour && o.hour.a > 0) this.clock(g, o.hour, mix);
      if (o.caption && o.caption.a > 0) this.caption(g, o.caption);
      if (o.brand) this.brand(g);
    },
    card(g, x, y, w, h) {
      g.save();
      g.shadowColor = 'rgba(43,38,33,.2)';
      g.shadowOffsetX = 4;
      g.shadowOffsetY = 5;
      g.fillStyle = 'rgba(251,247,238,.95)';
      g.beginPath();
      g.roundRect(x, y, w, h, [6, 16, 7, 14]);
      g.fill();
      g.restore();
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.beginPath();
      g.roundRect(x, y, w, h, [6, 16, 7, 14]);
      g.stroke();
    },
    caption(g, c) {
      g.save();
      g.globalAlpha = c.a;
      const fe = `500 34px ${SERIF}`;
      const fz = `30px ${ZH}`;
      const zh = c.zh.replace(/°C/g, '℃'); // the CJK degree sign sits right in a CJK font
      g.font = fe;
      const we = g.measureText(c.en).width;
      g.font = fz;
      const wz = g.measureText(zh).width;
      const w = Math.max(we, wz) + 56;
      const h = 118;
      const x = 64;
      const y = H - 64 - h - (c.lift ?? 0);
      this.card(g, x, y, w, h);
      g.fillStyle = INK;
      g.textBaseline = 'alphabetic';
      g.font = fe;
      g.fillText(c.en, x + 28, y + 50);
      g.font = fz;
      g.fillStyle = 'rgba(43,38,33,.88)';
      g.fillText(zh, x + 28, y + 96);
      g.restore();
    },
    tag(g, t) {
      g.save();
      g.globalAlpha = t.a;
      const f1 = `26px ${HAND}`;
      const f2 = `22px ${ZH}`;
      const l1 = `${t.n} / 12   ${t.en}`;
      g.font = f1;
      const w1 = g.measureText(l1).width;
      g.font = f2;
      const w2 = g.measureText(t.zh).width;
      const w = Math.max(w1, w2) + 40;
      this.card(g, 56, 52, w, 86);
      g.fillStyle = INK;
      g.font = f1;
      g.fillText(l1, 76, 90);
      g.font = f2;
      g.fillStyle = 'rgba(43,38,33,.8)';
      g.fillText(t.zh, 76, 124);
      g.restore();
    },
    hourText(h) {
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      const m = mm ? `:${String(mm).padStart(2, '0')}` : '';
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      const en = `${h12}${m} ${hh < 12 ? 'am' : 'pm'}`;
      const part = hh < 6 ? '凌晨' : hh < 12 ? '上午' : hh < 13 ? '中午' : hh < 18 ? '下午' : '晚上';
      const zh = `${part} ${h12}${mm ? m : ' 点'}`;
      return { en, zh };
    },
    clock(g, o, mix) {
      g.save();
      g.globalAlpha = o.a;
      const { en, zh } = this.hourText(o.h);
      const w = 400;
      const x = W - 56 - w;
      const hasLeg = mix > 0;
      const h = (hasLeg ? 160 : 86) + (o.state ? 34 : 0);
      this.card(g, x, 52, w, h);
      g.fillStyle = INK;
      g.font = `600 30px ${SERIF}`;
      g.fillText(en, x + 22, 92);
      g.font = `24px ${ZH}`;
      g.textAlign = 'right';
      g.fillText(zh, x + w - 22, 92);
      g.textAlign = 'left';
      g.font = `18px ${HAND}`;
      g.fillStyle = 'rgba(43,38,33,.75)';
      g.fillText(mix > 0.5 ? 'heat view · 热力视图' : 'day view · 白天视图', x + 22, 124);
      if (o.state) {
        g.font = `600 19px ${SERIF}`;
        g.fillStyle = '#8a2f22';
        g.fillText(o.state, x + 22, 52 + h - 16);
      }
      if (hasLeg) {
        const L = this.legend();
        g.globalAlpha = o.a * Math.min(1, mix * 1.5);
        const bx = x + 22;
        const bw = w - 44;
        const by = 140;
        const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
        L.stops.forEach(([p, col], k) => grad.addColorStop(p ?? k / Math.max(1, L.stops.length - 1), col));
        g.fillStyle = L.stops.length ? grad : '#ccc';
        g.fillRect(bx, by, bw, 14);
        g.strokeStyle = INK;
        g.lineWidth = 1.2;
        g.strokeRect(bx, by, bw, 14);
        g.fillStyle = INK;
        g.font = `16px ${SERIF}`;
        g.fillText(L.lo, bx, by + 34);
        g.textAlign = 'right';
        g.fillText(L.hi, bx + bw, by + 34);
        g.textAlign = 'center';
        g.font = `15px ${ZH}`;
        g.fillText('surface temperature · 地表温度', bx + bw / 2, by + 34);
      }
      g.restore();
    },
    title(g, a) {
      g.save();
      g.globalAlpha = a;
      g.fillStyle = INK;
      g.textAlign = 'center';
      g.font = `600 112px ${SERIF}`;
      g.fillText('Thermal-Ink Atlas', W / 2, H / 2 - 60);
      g.font = `64px ${ZH}`;
      g.fillText('热墨城市图集', W / 2, H / 2 + 30);
      g.font = `italic 36px ${SERIF}`;
      g.fillText('Twelve hand-inked city blocks through one heat-wave day', W / 2, H / 2 + 110);
      g.font = `32px ${ZH}`;
      g.fillText('十二个手绘街区，走过热浪中的一天', W / 2, H / 2 + 162);
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(W / 2 - 300, H / 2 - 20);
      g.bezierCurveTo(W / 2 - 100, H / 2 - 26, W / 2 + 120, H / 2 - 14, W / 2 + 300, H / 2 - 21);
      g.stroke();
      g.restore();
    },
    endCard(g, a) {
      g.save();
      g.globalAlpha = a;
      g.fillStyle = INK;
      g.textAlign = 'center';
      g.font = `600 84px ${SERIF}`;
      g.fillText('Thermal-Ink Atlas', W / 2, H / 2 - 120);
      g.font = `48px ${ZH}`;
      g.fillText('热墨城市图集', W / 2, H / 2 - 50);
      g.font = `600 40px ${SERIF}`;
      g.fillStyle = '#8a2f22';
      g.fillText('https://yushengzhou.github.io/thermal-ink-atlas/', W / 2, H / 2 + 40);
      g.fillStyle = INK;
      g.font = `30px ${SERIF}`;
      g.fillText('Sources: references.html   ·   文献：references.html', W / 2, H / 2 + 100);
      g.font = `italic 26px ${SERIF}`;
      g.fillStyle = 'rgba(43,38,33,.75)';
      g.fillText('Made-up blocks; temperatures are calculated by a simple model, not measured.', W / 2, H / 2 + 170);
      g.font = `24px ${ZH}`;
      g.fillText('街区均为虚构；温度由简化模型计算，并非实测。', W / 2, H / 2 + 210);
      g.restore();
    },
    brand(g) {
      g.save();
      const w = 520;
      this.card(g, 56, 52, w, 96);
      g.fillStyle = INK;
      g.font = `600 40px ${SERIF}`;
      g.fillText('Thermal-Ink Atlas', 80, 102);
      g.font = `24px ${ZH}`;
      g.fillStyle = 'rgba(43,38,33,.8)';
      g.fillText('热墨城市图集', 80, 134);
      g.restore();
    },
    async hash(which = 'out') {
      const c = which === 'out' ? octx : bctx;
      const d = c.getImageData(0, 0, W, H).data;
      const h = await crypto.subtle.digest('SHA-256', d);
      return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
    },
    /** JPEG / WebP data URL of base or out, scaled to w×h. */
    grab(which, w, h, type, q, overlay) {
      const c = mk(w, h);
      const g = c.getContext('2d', { alpha: false });
      g.imageSmoothingQuality = 'high';
      g.drawImage(which === 'out' ? out : base, 0, 0, w, h);
      if (overlay) {
        // the poster: base + its own overlay at full size first
        const big = mk(W, H);
        const bg = big.getContext('2d', { alpha: false });
        bg.drawImage(base, 0, 0);
        this.overlay(bg, overlay, this.A.state().mix);
        g.drawImage(big, 0, 0, w, h);
      }
      return c.toDataURL(type, q);
    },
    async encoder(cands, bitrate, fps) {
      for (const codec of cands) {
        const cfg = { codec, width: W, height: H, bitrate, framerate: fps, hardwareAcceleration: 'prefer-software', latencyMode: 'quality', bitrateMode: 'variable', ...(codec.startsWith('avc1') ? { avc: { format: 'avc' } } : {}) };
        try {
          const sup = await VideoEncoder.isConfigSupported(cfg);
          if (!sup.supported) continue;
        } catch {
          continue;
        }
        this.enc = new VideoEncoder({
          output: (chunk, meta) => {
            const b = new Uint8Array(chunk.byteLength);
            chunk.copyTo(b);
            if (meta && meta.decoderConfig && meta.decoderConfig.description && !this.desc) this.desc = new Uint8Array(meta.decoderConfig.description.buffer ?? meta.decoderConfig.description);
            let s = '';
            for (let k = 0; k < b.length; k += 0x8000) s += String.fromCharCode.apply(null, b.subarray(k, k + 0x8000));
            this.chunks.push({ key: chunk.type === 'key', ts: chunk.timestamp, data: btoa(s) });
          },
          error: (e) => {
            this.err = String(e);
          },
        });
        this.enc.configure(cfg);
        this.codec = codec;
        return codec;
      }
      throw new Error('no WebCodecs encoder for H.264 or VP9');
    },
    async encode(i, fps, key) {
      if (this.err) throw new Error(this.err);
      while (this.enc.encodeQueueSize > 3) await sleep(2);
      const fr = new VideoFrame(out, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      this.enc.encode(fr, { keyFrame: key });
      fr.close();
    },
    take() {
      const c = this.chunks;
      this.chunks = [];
      return c;
    },
    async finish() {
      await this.enc.flush();
      this.enc.close();
      if (this.err) throw new Error(this.err);
      let s = '';
      for (const b of this.desc ?? []) s += String.fromCharCode(b);
      return { desc: this.desc ? btoa(s) : null, chunks: this.take() };
    },
  };
  window.film = F;
}

// ---- MP4 writer (ISO BMFF, one video track, moov before mdat) ---------------------------------

const u32 = (n) => {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0);
  return b;
};
const u16 = (n) => {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n);
  return b;
};
const u8 = (n) => Buffer.from([n]);
const box = (type, ...parts) => {
  const body = Buffer.concat(parts);
  return Buffer.concat([u32(body.length + 8), Buffer.from(type, 'ascii'), body]);
};
const full = (type, v, flags, ...parts) => box(type, u8(v), Buffer.from([(flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);
const MATRIX = Buffer.concat([0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32));

/** samples: [{data: Buffer, key}], all with duration 1/fps; codec 'avc1' (desc = avcC) or 'vp09'. */
export function mp4({ codec, desc, width, height, fps, samples }) {
  const scale = fps * 1000;
  const delta = 1000;
  const dur = samples.length * delta;
  const durMs = Math.round((samples.length / fps) * 1000);
  const ftyp = box('ftyp', Buffer.from('isom'), u32(512), Buffer.from(codec === 'avc1' ? 'isomiso2avc1mp41' : 'isomiso2vp09mp41'));
  const entryHead = Buffer.concat([Buffer.alloc(6), u16(1), u16(0), u16(0), Buffer.alloc(12), u16(width), u16(height), u32(0x00480000), u32(0x00480000), u32(0), u16(1), Buffer.alloc(32), u16(0x0018), u16(0xffff)]);
  const cfg = codec === 'avc1' ? box('avcC', desc) : full('vpcC', 1, 0, u8(0), u8(31), u8((8 << 4) | (1 << 1)), u8(1), u8(1), u8(1), u16(0));
  const stsd = full('stsd', 0, 0, u32(1), box(codec, entryHead, cfg));
  const keys = samples.map((s, k) => (s.key ? k + 1 : 0)).filter(Boolean);
  const moovWith = (offset) =>
    box(
      'moov',
      full('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(durMs), u32(0x00010000), u16(0x0100), Buffer.alloc(10), MATRIX, Buffer.alloc(24), u32(2)),
      box(
        'trak',
        full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(durMs), Buffer.alloc(8), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(width << 16), u32(height << 16)),
        box(
          'mdia',
          full('mdhd', 0, 0, u32(0), u32(0), u32(scale), u32(dur), u16(0x55c4), u16(0)),
          full('hdlr', 0, 0, u32(0), Buffer.from('vide'), Buffer.alloc(12), Buffer.from('VideoHandler\0')),
          box(
            'minf',
            full('vmhd', 0, 1, Buffer.alloc(8)),
            box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))),
            box(
              'stbl',
              stsd,
              full('stts', 0, 0, u32(1), u32(samples.length), u32(delta)),
              full('stss', 0, 0, u32(keys.length), ...keys.map(u32)),
              full('stsc', 0, 0, u32(1), u32(1), u32(samples.length), u32(1)),
              full('stsz', 0, 0, u32(0), u32(samples.length), ...samples.map((s) => u32(s.data.length))),
              full('stco', 0, 0, u32(1), u32(offset)),
            ),
          ),
        ),
      ),
    );
  const probe = moovWith(0);
  const offset = ftyp.length + probe.length + 8;
  const moov = moovWith(offset);
  const payload = Buffer.concat(samples.map((s) => s.data));
  return Buffer.concat([ftyp, moov, u32(payload.length + 8), Buffer.from('mdat'), payload]);
}

// ---- animated WebP writer (frames from canvas.toDataURL('image/webp')) -----------------------

function riffChunks(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error('not a WebP');
  const out = [];
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString('ascii', p, p + 4);
    const n = buf.readUInt32LE(p + 4);
    out.push({ id, data: buf.subarray(p + 8, p + 8 + n) });
    p += 8 + n + (n & 1);
  }
  return out;
}
const chunk = (id, data) => {
  const h = Buffer.alloc(8);
  h.write(id, 0, 'ascii');
  h.writeUInt32LE(data.length, 4);
  return Buffer.concat([h, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]);
};
const u24 = (n) => Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255]);

/** frames: [{webp: Buffer, ms}] all w×h, opaque. */
export function animatedWebp(frames, w, h) {
  let alpha = false;
  const anmf = frames.map(({ webp, ms }) => {
    const parts = riffChunks(webp).filter((c) => ['ALPH', 'VP8 ', 'VP8L'].includes(c.id));
    if (parts.some((c) => c.id === 'ALPH')) alpha = true;
    return chunk('ANMF', Buffer.concat([u24(0), u24(0), u24(w - 1), u24(h - 1), u24(ms), u8(0b10), ...parts.map((c) => chunk(c.id, c.data))]));
  });
  const vp8x = chunk('VP8X', Buffer.concat([u8(0x02 | (alpha ? 0x10 : 0)), Buffer.alloc(3), u24(w - 1), u24(h - 1)]));
  const anim = chunk('ANIM', Buffer.concat([Buffer.from([0xdd, 0xec, 0xf3, 0xff]), u16le(0)]));
  const body = Buffer.concat([Buffer.from('WEBP'), vp8x, anim, ...anmf]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}
function u16le(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}

// ---- server, browser -------------------------------------------------------------------------

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp' };
function serve() {
  const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f3ecdd"><script>(${filmPage.toString()})(${W}, ${H})</script>`;
  const srv = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__film') {
      res.setHeader('content-type', TYPES['.html']);
      res.end(page);
      return;
    }
    // only the built pages, and the film's own output for its read-back check
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, '');
    if (!/^(cities\/[a-z-]+\/index\.html|media\/[a-z0-9.-]+)$/.test(rel) || !existsSync(join(root, rel))) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('content-type', TYPES[extname(rel)] ?? 'application/octet-stream');
    res.end(readFileSync(join(root, rel)));
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function session(port) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('page error:', String(e)));
  await page.goto(`http://127.0.0.1:${port}/__film`);
  const notes = new Map();
  let loaded = -1;
  const ensure = async (si) => {
    if (loaded === si) return;
    const s = SHOTS[si];
    const url = `/cities/${s.page ?? s.id}/index.html?${s.q}`;
    notes.set(si, await page.evaluate((u) => window.film.load(u), url));
    loaded = si;
  };
  const notesOf = (si) => notes.get(si);
  /** Render film frame i (first the previous shot's last frame, when a dissolve needs it and it is not saved). */
  let saved = -1;
  const render = async (i) => {
    const si = shotOf(i);
    const t = i - SHOTS[si].start;
    if (si > 0 && t < (SHOTS[si].id === 'end' ? 15 : DIS) && saved !== si - 1) {
      const p = SHOTS[si - 1];
      await ensure(si - 1);
      await page.evaluate((s) => window.film.render(s), frameSpec(p.start + p.len - 1, notesOf));
      saved = si - 1;
    }
    await ensure(si);
    const spec = frameSpec(i, notesOf);
    await page.evaluate((s) => window.film.render(s), spec);
    if (spec.save) saved = si;
    return spec;
  };
  return { browser, page, ensure, notesOf, render };
}

const dataUrlBuf = (u) => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
const kb = (f) => `${(statSync(f).size / 1024).toFixed(0)} KB`;

// ---- modes -----------------------------------------------------------------------------------

async function stills(srv, dir) {
  mkdirSync(dir, { recursive: true });
  const S = await session(srv.address().port);
  for (const [k, s] of SHOTS.entries()) {
    const pick = s.id === 'asphalt-park' ? [100, 160, 280, 345, 440] : [20, 60];
    for (const t of pick) {
      await S.render(s.start + t);
      const u = await S.page.evaluate(() => window.film.grab('out', 1280, 720, 'image/jpeg', 0.8));
      const f = join(dir, `${String(k).padStart(2, '0')}-${s.id}-${t}.jpg`);
      writeFileSync(f, dataUrlBuf(u));
      console.log(f);
    }
  }
  await S.browser.close();
}

// frames checked by --check: pen, wash, the T fade, heat view, the sweep, night, montage shots (no dissolve frames), the end card
const CHECK = [20, 90, 150, 240, 280, 350, 420, ...[1, 4, 8, 9, 11].map((k) => SHOTS[k].start + 50), TOTAL - 10];

async function check(srv) {
  const pass = async (order) => {
    const S = await session(srv.address().port);
    const out = {};
    for (const i of order) {
      await S.render(i);
      out[i] = await S.page.evaluate(() => window.film.hash());
    }
    await S.browser.close();
    return out;
  };
  const a = await pass(CHECK);
  const b = await pass([...CHECK].reverse());
  let bad = 0;
  for (const i of CHECK) {
    const ok = a[i] === b[i];
    if (!ok) bad++;
    console.log(`frame ${String(i).padStart(4)}  ${a[i].slice(0, 16)}  ${ok ? 'same' : `DIFFERENT ${b[i].slice(0, 16)}`}`);
  }
  if (bad) {
    console.error(`${bad} frame(s) differ between two renders`);
    process.exitCode = 1;
  } else console.log(`${CHECK.length} frames rendered twice (fresh browsers, reversed order): identical`);
}

async function film(srv) {
  mkdirSync(join(OUT, 'blocks'), { recursive: true });
  const S = await session(srv.address().port);
  const codec = await S.page.evaluate(([b, f]) => window.film.encoder(['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'vp09.00.31.08'], b, f), [BITRATE, FPS]);
  console.log(`codec ${codec}, ${TOTAL} frames (${(TOTAL / FPS).toFixed(1)} s) at ${W}×${H}, ${FPS} fps, ${BITRATE / 1e6} Mbit/s target`);
  const chunks = [];
  const loop = [];
  // the loop: block 1 drawing itself, the heat view and the evening, every 3rd frame (10 fps)
  const LOOP = { from: 45, to: 400, step: 3, w: 640, h: 360, q: 0.6 };
  // per-block stills (no captions): block 1 in the heat view at 3 pm, the others mid-shot
  const STILL = new Map([[280, 'asphalt-park'], ...SHOTS.slice(1, 12).map((s) => [s.start + 40, s.id])]);
  const POSTER = 285;
  const t0 = Date.now();
  for (let i = 0; i < TOTAL; i++) {
    const spec = await S.render(i);
    const s = SHOTS[spec.shot];
    const key = i - s.start === 0 || i - s.start === DIS || (i - s.start) % 120 === 0; // a fresh key frame after each dissolve
    await S.page.evaluate(([i, f, k]) => window.film.encode(i, f, k), [i, FPS, key]);
    if (i >= LOOP.from && i <= LOOP.to && (i - LOOP.from) % LOOP.step === 0) {
      const u = await S.page.evaluate((L) => window.film.grab('base', L.w, L.h, 'image/webp', L.q), LOOP);
      loop.push({ webp: dataUrlBuf(u), ms: i + LOOP.step > LOOP.to ? 1500 : 100 });
    }
    if (STILL.has(i)) {
      const u = await S.page.evaluate(() => window.film.grab('base', 800, 450, 'image/jpeg', 0.78));
      writeFileSync(join(OUT, 'blocks', `${STILL.get(i)}.jpg`), dataUrlBuf(u));
    }
    if (i === POSTER) {
      const ov = { ...spec.overlay, tag: undefined, brand: true };
      const u = await S.page.evaluate((o) => window.film.grab('base', 1920, 1080, 'image/jpeg', 0.82, o), ov);
      writeFileSync(join(OUT, 'poster.jpg'), dataUrlBuf(u));
    }
    if (CHECK.includes(i)) console.log(`  frame ${i}: ${(await S.page.evaluate(() => window.film.hash())).slice(0, 16)} (compare with --check)`);
    if (i % 30 === 29) chunks.push(...(await S.page.evaluate(() => window.film.take())));
    if (i % 150 === 149) console.log(`  ${i + 1} / ${TOTAL} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  const fin = await S.page.evaluate(() => window.film.finish());
  chunks.push(...fin.chunks);
  chunks.sort((a, b) => a.ts - b.ts);
  if (chunks.length !== TOTAL) throw new Error(`${chunks.length} chunks for ${TOTAL} frames`);
  const isAvc = codec.startsWith('avc1');
  const file = join(OUT, 'thermal-ink-atlas.mp4');
  writeFileSync(file, mp4({ codec: isAvc ? 'avc1' : 'vp09', desc: fin.desc ? Buffer.from(fin.desc, 'base64') : null, width: W, height: H, fps: FPS, samples: chunks.map((c) => ({ key: c.key, data: Buffer.from(c.data, 'base64') })) }));
  writeFileSync(join(OUT, 'loop.webp'), animatedWebp(loop, LOOP.w, LOOP.h));
  // read back: the browser must open the film (its length and size) and decode the loop
  const rb = await S.page.evaluate(async () => {
    const v = document.createElement('video');
    v.muted = true;
    v.src = '/media/thermal-ink-atlas.mp4';
    await new Promise((r, j) => {
      v.onloadeddata = r;
      v.onerror = () => j(new Error(`video error ${v.error && v.error.code}`));
    });
    const img = new Image();
    img.src = '/media/loop.webp';
    await img.decode();
    return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, loop: [img.naturalWidth, img.naturalHeight] };
  }).catch((e) => ({ error: String(e) }));
  await S.browser.close();
  console.log('read back:', JSON.stringify(rb));
  if (rb.error || Math.abs(rb.duration - TOTAL / FPS) > 0.1 || rb.w !== W) process.exitCode = 1;
  console.log(`${file}: ${kb(file)}, ${(TOTAL / FPS).toFixed(1)} s, ${codec}`);
  console.log(`media/loop.webp: ${kb(join(OUT, 'loop.webp'))}, ${loop.length} frames; media/poster.jpg: ${kb(join(OUT, 'poster.jpg'))}`);
  for (const id of STILL.values()) console.log(`media/blocks/${id}.jpg: ${kb(join(OUT, 'blocks', `${id}.jpg`))}`);
  console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const srv = await serve();
  try {
    if (arg('check')) await check(srv);
    else if (arg('stills')) await stills(srv, String(arg('stills')));
    else await film(srv);
  } finally {
    srv.close();
  }
}
export { SHOTS, TOTAL, frameSpec };
