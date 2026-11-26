// materials: surface parameters for the thermal model.
// Every value carries:
//   source   - a key into SOURCES (where the number or range comes from)
//   basis    - how the value relates to that source (see BASIS)
//   verified - false until checked against the primary source; heat cards
//              label these "unverified".
// docs/sources.md is generated from this file (scripts/sources.mjs).

export const SOURCES = {
  lbnl: 'Pomerantz et al. (2000) LBNL-49283, cool pavements: asphalt albedo 0.05 fresh, 0.12-0.15 aged',
  oke: 'Oke (1987/2017) Boundary Layer Climates / Urban Climates, surface property tables (cited from memory in the research brief)',
  epa: 'US EPA (2008) Reducing Urban Heat Islands: Cool Pavements / Cool Roofs compendium',
  brief: 'Research brief docs/research/thermal-model-brief.md (ranges compiled from the sources above; not yet checked)',
  deardorff: 'Deardorff (1978) J. Geophys. Res. 83(C4) 1889-1903, force-restore method (NASA NTRS 19780019748)',
  melnikov: 'Melnikov et al. (2022) Scientific Reports 12, 2617, doi 10.1038/s41598-022-06383-5',
  engine: 'Engine assumption: no literature source',
};

/** How a value relates to its source. */
export const BASIS = {
  cited: 'cited value',
  range: 'cited range',
  edge: 'edge of cited range',
  interp: 'interpretation of the source',
  engine: 'engine assumption (no source)',
};

const v = (value, source, basis, verified = false, note = '') => ({ value, source, basis, verified, note });

/**
 * alpha: shortwave albedo; eps: longwave emissivity;
 * mu: thermal admittance sqrt(k C), J m-2 s-1/2 K-1 (force-restore), or
 * thinC: effective heat capacity of a thin layer, J m-2 K-1 (no restore term);
 * ef: evaporative fraction of positive net radiation.
 * prescribed: the grid model does not use these parameters (temperature is set
 * by a formula instead); they are listed for reference only.
 */
export const MATERIALS = {
  asphalt: {
    name: 'Aged asphalt',
    alpha: v(0.12, 'lbnl', 'cited', true, 'LBNL aged asphalt 0.12-0.15'),
    eps: v(0.95, 'oke', 'cited'),
    mu: v(1200, 'oke', 'cited'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'Dark, dense and dry: it soaks up most of the sun and gives the heat back long after dark.',
  },
  concrete: {
    name: 'Concrete paving',
    alpha: v(0.3, 'oke', 'range', false, 'cited 0.10-0.35'),
    eps: v(0.9, 'oke', 'edge', false, 'cited 0.71-0.90'),
    mu: v(1785, 'oke', 'cited'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'Lighter than asphalt so it peaks lower, but its mass keeps it warm into the night.',
  },
  stone: {
    name: 'Stone paving / gravel path',
    alpha: v(0.3, 'oke', 'range', false, 'cited 0.20-0.40'),
    eps: v(0.92, 'oke', 'range', false, 'cited 0.85-0.95'),
    mu: v(1500, 'brief', 'range', false, 'between brick 1065 and stone 2220'),
    ef: v(0.05, 'engine', 'engine'),
    note: 'Pale and porous: warm in the sun, cools sooner than the street.',
  },
  grass: {
    name: 'Irrigated lawn',
    alpha: v(0.25, 'oke', 'edge', false, 'cited 0.16-0.26'),
    eps: v(0.95, 'oke', 'edge', false, 'cited 0.90-0.95'),
    mu: v(1400, 'brief', 'range', false, 'soil 600-2200'),
    ef: v(0.8, 'brief', 'edge', false, 'cited 0.6-0.8'),
    note: 'Watered grass spends much of its sunshine evaporating water, and at night it cools below the air.',
    caveat: 'Its 3 pm place below shaded paving holds only with evaporative fraction and albedo at the top of their cited ranges (see Sensitivity in docs/sources.md).',
  },
  water: {
    name: 'Pond (open water)',
    alpha: v(0.06, 'oke', 'range', false, 'cited 0.03-0.10'),
    eps: v(0.96, 'oke', 'range', false, 'cited 0.92-0.97'),
    mu: v(1545, 'oke', 'cited'),
    ef: v(1, 'engine', 'engine'),
    prescribed: 'Not used by the grid model: the pond is held at daily mean air - 1 K, +-1 K (research brief).',
    note: 'Mixing and evaporation hold the pond near the daily mean air temperature.',
  },
  membrane: {
    name: 'Dark membrane roof',
    alpha: v(0.1, 'oke', 'range', false, 'cited 0.08-0.18'),
    eps: v(0.92, 'oke', 'cited'),
    mu: v(450, 'brief', 'range', false, 'brief assumes 300-500'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'A thin, dark, insulated skin: one of the hottest surfaces at 3 pm, cold again by midnight.',
  },
  metal: {
    name: 'Dark metal roof',
    alpha: v(0.15, 'oke', 'range', false, 'cited 0.10-0.25'),
    eps: v(0.9, 'brief', 'cited', false, '~0.9 painted'),
    thinC: v(12000, 'brief', 'range', false, 'thin layers 5-20 kJ m-2 K-1'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'Painted sheet metal has almost no heat capacity: it follows the sun up and the sky down.',
  },
  coolroof: {
    name: 'Cool (white) roof',
    alpha: v(0.8, 'epa', 'edge', false, 'cited >=0.65 new, 0.5-0.6 aged; 0.80 is a new, clean white roof'),
    eps: v(0.88, 'epa', 'range', false, 'cited 0.85-0.90'),
    mu: v(450, 'brief', 'range', false, 'same build-up as the dark membrane'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'The same roof build-up as its dark neighbour, painted white: it reflects most of the sun.',
    caveat: 'Its 3 pm place below shaded paving holds only with albedo at the top of its cited range (see Sensitivity in docs/sources.md).',
  },
  canopy: {
    name: 'Tree canopy',
    alpha: v(0.18, 'oke', 'range', false, 'cited 0.15-0.20'),
    eps: v(0.97, 'oke', 'range', false, 'cited 0.97-0.99'),
    ef: v(0.7, 'brief', 'range', false, 'cited 0.6-0.8'),
    prescribed: 'Not used by the grid model: leaf temperature = air + 2.5 K x (K/900 W m-2) by day, air - 0.5 K at night (engine assumption; brief: air +0-3 K).',
    note: 'Leaves stay within a few degrees of the air; the ground beneath sits in their shade.',
  },
};

/** Model constants shared by thermal.js and life.js. */
export const MODEL = {
  hc: v('5.7 + 3.8 u', 'oke', 'cited'),
  canopyTransmission: v(0.17, 'brief', 'interp', false, 'exp(-0.5 LAI) with LAI 3.5 (LAI is an engine assumption)'),
  diffuseFraction: v(0.12, 'brief', 'cited', false, 'D = 0.12 I_b sin(beta)'),
  wallTerm: v('Ta + 2 K + 6 K x K/900', 'engine', 'engine', false, 'warms the walls seen from the ground; ignores wall orientation'),
  efClip: v('EF x max(Q*, 0)', 'engine', 'engine', false, 'brief writes EF x Q*; clipped so latent heat never warms the surface at night'),
  buildingShadeWeight: v(0.84, 'melnikov', 'cited', false, 'shade walking perceived ~16% shorter'),
  treeShadeWeight: v(0.92, 'melnikov', 'interp', false, 'tree shade ~half as effective as building shade, read as half the 16% benefit'),
  shadeHeatRamp: v('26 -> 32 C', 'engine', 'engine', false, 'shade benefit scales linearly from none at air <= 26 C to full at >= 32 C'),
};

/** Parameter keys a material uses (for cards and docs). */
export const paramKeys = (m) => ['alpha', 'eps', m.thinC ? 'thinC' : 'mu', 'ef'].filter((k) => m[k]);
