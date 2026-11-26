// glossary: one shared set of plain-English footnotes for the technical terms
// shown on the page (heat cards, margin notes, legend, header, terms panel).
// Each entry: term (title), text (1-2 sentences), why (why it matters for heat),
// and either
//   range + src  - typical values from the literature, with a source key
//                  (materials.js SOURCES), or
//   model(stats) - values computed from this model at load (glossaryStats),
//                  shown as "In this model" so they cannot go stale.
import { cellMat } from './thermal.js';

export const GLOSSARY = {
  albedo: {
    term: 'Albedo (α)',
    text: 'The share of sunlight a surface reflects: 0 absorbs everything, 1 reflects everything.',
    range: 'Fresh asphalt 0.05, aged asphalt 0.12–0.15, grass 0.16–0.26, new white roof 0.65 or more.',
    src: 'lbnl, brief',
    why: 'Each extra 0.1 of albedo turns away roughly 100 W/m² of midday sun, so dark surfaces run far hotter.',
  },
  emissivity: {
    term: 'Emissivity (ε)',
    text: 'How well a surface gives off heat as invisible infrared light, from 0 to 1.',
    range: 'Concrete 0.71–0.90, asphalt about 0.95, grass 0.90–0.95, tree leaves 0.97–0.99.',
    src: 'brief',
    why: 'High emissivity lets a surface shed heat to the cold sky, especially at night.',
  },
  admittance: {
    term: 'Thermal admittance (μ)',
    text: 'How readily a material soaks up heat and later gives it back (the square root of conductivity × heat capacity).',
    range: 'Soils 600–2200, asphalt ~1200, concrete ~1785, stone ~2220 J m⁻² s⁻½ K⁻¹.',
    src: 'brief',
    why: 'High-admittance pavements warm up more slowly but stay warm long after sunset.',
  },
  heatCapacity: {
    term: 'Thin-layer heat capacity (C)',
    text: 'How much heat a thin skin, such as sheet metal, stores per square metre for each degree it warms.',
    range: 'About 5–20 kJ m⁻² K⁻¹ for metal sheet and thin roof layers.',
    src: 'brief',
    why: 'With so little storage, a metal roof heats fast in sun and cools fast at night.',
  },
  ef: {
    term: 'Evaporative fraction',
    text: 'The share of a surface’s net radiation (incoming sun and sky heat minus the heat it gives off) that goes into evaporating water instead of warming it.',
    range: 'Dry paving 0; watered lawns and tree leaves 0.6–0.8.',
    src: 'brief',
    why: 'Evaporation is the main reason lawns and trees stay cooler than pavement.',
  },
  svf: {
    term: 'Sky view factor (SVF)',
    text: 'How much of the sky a spot can see, from 1 (open field) to 0 (fully enclosed).',
    model: (S) => `Open lawn ${S.svfLawn}; paved ground near buildings ${S.svfPave}.`,
    why: 'A low sky view traps heat at night, because surfaces cannot radiate it away to the cold sky.',
  },
  surfaceTemp: {
    term: 'Surface temperature',
    text: 'The temperature of the ground or roof skin itself, which can be very different from the air.',
    range: 'On a hot afternoon (air 25–35 °C): lawn 30–40 °C, shaded paving 34–40 °C, aged asphalt 55–62 °C, fresh asphalt 60–68 °C.',
    src: 'brief',
    why: 'Hot surfaces warm the air above them and radiate heat onto people nearby.',
  },
  tmrt: {
    term: 'Mean radiant temperature (Tmrt)',
    text: 'One number for all the sunshine and infrared heat falling on a standing person from every direction.',
    model: (S) => `At 3 pm: ${S.tmrtShade} °C in building shade, ${S.tmrtSun} °C on sunlit ground (5th–95th percentile).`,
    why: 'It shapes how hot it feels outdoors more than air temperature does.',
  },
  forceRestore: {
    term: 'Force-restore model (simulation)',
    text: 'A simple surface energy balance (Deardorff 1978): sun, sky and air heat each 5 m cell, and a deep-ground term pulls it back toward its daily mean (thin metal roofs have no deep term).',
    model: (S) => `5 m grid, 1-minute steps, the design day repeated ${S.days} times until it settles.`,
    why: 'It captures daytime heating and night lag cheaply enough to run in your browser. All temperatures here are modelled, not measured.',
  },
  nightLag: {
    term: 'Thermal inertia / night lag',
    text: 'Heavy materials store heat during the day and release it after sunset, so they stay warm into the night.',
    model: (S) => `At 11 pm asphalt is ${S.lagAsphalt} °C and concrete ${S.lagConcrete} °C warmer than the open lawn.`,
    why: 'Night lag keeps cities warm at night, when people most need to cool down.',
  },
  coolRoof: {
    term: 'Cool roof',
    text: 'A roof finished with a highly reflective coating, usually white.',
    range: 'Albedo 0.65 or more when new, about 0.5–0.6 after weathering.',
    src: 'brief',
    why: 'Reflecting more sun keeps the roof, and the rooms under it, much cooler.',
  },
  permeable: {
    term: 'Permeable paving',
    text: 'Paving with gaps or pores that let rain soak through into the ground.',
    range: 'Albedo 0.15–0.30; 5–10 °C cooler than concrete while wet (not modelled in this block).',
    src: 'brief',
    why: 'Water evaporating from wet paving cools it, but only while there is water left to evaporate.',
  },
};

const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

/** Model-derived numbers quoted in the glossary (computed at load and in docs). */
export function glossaryStats(world, thermal) {
  const N = world.n * world.n;
  const sun = [];
  const shade = [];
  const lawn = [];
  const pave = [];
  const a23 = [];
  const c23 = [];
  const l23 = [];
  for (let i = 0; i < N; i++) {
    if (world.bld[i] >= 0) continue;
    const m = cellMat(world, i);
    if (m === 'water') continue;
    const s = thermal.sunlit(i, 15);
    if (s > 0.95) sun.push(thermal.tmrt(i, 15));
    else if (s < 0.05 && world.canopy[i] === 0) shade.push(thermal.tmrt(i, 15));
    if (m === 'grass' && world.canopy[i] === 0) lawn.push(world.svf[i]);
    if (m === 'concrete' && world.svf[i] < 0.9) pave.push(world.svf[i]);
    if (m === 'asphalt') a23.push(thermal.ts(i, 23));
    if (m === 'concrete') c23.push(thermal.ts(i, 23));
    if (m === 'grass' && world.canopy[i] === 0 && world.svf[i] > 0.8) l23.push(thermal.ts(i, 23));
  }
  const r0 = (x) => Math.round(x);
  const r1 = (x) => x.toFixed(1);
  const r2 = (x) => x.toFixed(2);
  return {
    tmrtSun: `${r0(q(sun, 0.05))}–${r0(q(sun, 0.95))}`,
    tmrtShade: `${r0(q(shade, 0.05))}–${r0(q(shade, 0.95))}`,
    svfLawn: `about ${r2(q(lawn, 0.5))}`,
    svfPave: `${r2(q(pave, 0.1))}–${r2(q(pave, 0.9))}`,
    lagAsphalt: r1(mean(a23) - mean(l23)),
    lagConcrete: r1(mean(c23) - mean(l23)),
    days: thermal.info.days,
  };
}

/** Footnote "range" line: literature range or model-derived numbers. */
export function rangeLine(key, stats) {
  const g = GLOSSARY[key];
  return g.model ? `In this model: ${g.model(stats)}` : `Typical: ${g.range}`;
}

/** Inline marker for a term: dotted underline, focusable, opens the footnote. */
export function gl(key, label) {
  if (!GLOSSARY[key]) throw new Error(`unknown glossary term ${key}`);
  return `<span class="gl" tabindex="0" role="button" aria-expanded="false" data-gl="${key}">${label ?? GLOSSARY[key].term}</span>`;
}
