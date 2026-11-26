// glossary: one shared set of plain-English footnotes for the technical terms
// shown on the page (heat cards, margin notes, legend, header, terms panel).
// Each entry: term (title), text (1-2 sentences), range (typical values),
// why (why it matters for heat).

export const GLOSSARY = {
  albedo: {
    term: 'Albedo (α)',
    text: 'The share of sunlight a surface reflects: 0 absorbs everything, 1 reflects everything.',
    range: 'Fresh asphalt 0.05, aged asphalt 0.12–0.15, grass 0.16–0.26, new white roof 0.65–0.85.',
    why: 'Each extra 0.1 of albedo turns away roughly 100 W/m² of midday sun, so dark surfaces run far hotter.',
  },
  emissivity: {
    term: 'Emissivity (ε)',
    text: 'How well a surface gives off heat as invisible infrared light, from 0 to 1.',
    range: 'Most building materials, soil and plants 0.85–0.97; bare shiny metal 0.1–0.3.',
    why: 'High emissivity lets a surface shed heat to the cold sky, especially at night.',
  },
  admittance: {
    term: 'Thermal admittance (μ)',
    text: 'How readily a material soaks up heat and later gives it back (the square root of conductivity × heat capacity).',
    range: 'Dry soil ~600, asphalt ~1200, concrete ~1800, stone ~2200 J m⁻² s⁻½ K⁻¹.',
    why: 'High-admittance pavements warm up more slowly but stay warm long after sunset.',
  },
  heatCapacity: {
    term: 'Thin-layer heat capacity (C)',
    text: 'How much heat a thin skin, such as sheet metal, stores per square metre for each degree it warms.',
    range: 'About 5–20 kJ m⁻² K⁻¹ for metal sheet and thin roof layers.',
    why: 'With so little storage, a metal roof heats fast in sun and cools fast at night.',
  },
  ef: {
    term: 'Evaporative fraction',
    text: 'The share of a surface’s net sunshine that goes into evaporating water instead of heating it.',
    range: 'Dry paving 0; watered lawns and tree leaves 0.6–0.8.',
    why: 'Evaporation is the main reason lawns and trees stay cooler than pavement.',
  },
  svf: {
    term: 'Sky view factor (SVF)',
    text: 'How much of the sky a spot can see, from 1 (open field) to 0 (fully enclosed).',
    range: 'Open lawn ~0.95; street between tall buildings 0.3–0.6.',
    why: 'A low sky view traps heat at night, because surfaces cannot radiate it away to the cold sky.',
  },
  surfaceTemp: {
    term: 'Surface temperature',
    text: 'The temperature of the ground or roof skin itself, which can be very different from the air.',
    range: 'On a 35 °C afternoon: lawn 30–40 °C, shaded paving 34–40 °C, dark asphalt 55–65 °C.',
    why: 'Hot surfaces warm the air above them and radiate heat onto people nearby.',
  },
  tmrt: {
    term: 'Mean radiant temperature (Tmrt)',
    text: 'One number for all the sunshine and infrared heat falling on a standing person from every direction.',
    range: 'Hot afternoon: about 35–45 °C in shade, 60–70 °C in open sun.',
    why: 'It shapes how hot it feels outdoors more than air temperature does.',
  },
  forceRestore: {
    term: 'Force-restore model (simulation)',
    text: 'A simple surface energy balance (Deardorff 1978): sun, sky and air heat each 5 m cell, and a deep-ground term pulls it back toward its daily mean.',
    range: 'Here: 5 m grid, 1-minute steps, the design day repeated until it settles.',
    why: 'It captures daytime heating and night lag cheaply enough to run in your browser. All temperatures here are modelled, not measured.',
  },
  nightLag: {
    term: 'Thermal inertia / night lag',
    text: 'Heavy materials store heat during the day and release it after sunset, so they stay warm into the night.',
    range: 'Here asphalt and concrete stay about 3–5 °C warmer than the lawn at 11 pm.',
    why: 'Night lag keeps cities warm at night, when people most need to cool down.',
  },
  coolRoof: {
    term: 'Cool roof',
    text: 'A roof finished with a highly reflective coating, usually white.',
    range: 'Albedo 0.65–0.85 when new, about 0.5–0.6 after weathering.',
    why: 'Reflecting more sun keeps the roof, and the rooms under it, much cooler.',
  },
  permeable: {
    term: 'Permeable paving',
    text: 'Paving with gaps or pores that let rain soak through into the ground.',
    range: 'Albedo 0.15–0.30; 5–10 °C cooler than concrete while wet (not modelled in this block).',
    why: 'Water evaporating from wet paving cools it, but only while there is water left to evaporate.',
  },
};

/** Inline marker for a term: dotted underline, focusable, opens the footnote. */
export function gl(key, label) {
  if (!GLOSSARY[key]) throw new Error(`unknown glossary term ${key}`);
  return `<span class="gl" tabindex="0" role="button" aria-haspopup="dialog" data-gl="${key}">${label ?? GLOSSARY[key].term}</span>`;
}
