// materials: surface parameters for the thermal model.
// Every value carries a source key (see SOURCES and docs/sources.md) and a
// `verified` flag. verified:false means the value is a plausible textbook /
// assumed figure that has not been checked against the primary source yet;
// heat cards label these "unverified".

export const SOURCES = {
  lbnl: 'Pomerantz et al. (2000) LBNL-49283, cool pavements: asphalt albedo 0.05 fresh, 0.12-0.15 aged',
  oke: 'Oke (1987/2017) Boundary Layer Climates / Urban Climates, surface property tables (cited from memory)',
  epa: 'US EPA (2008) Reducing Urban Heat Islands: Cool Pavements / Cool Roofs compendium',
  deardorff: 'Deardorff (1978) J. Geophys. Res. 83(C4) 1889-1903, force-restore method (NASA NTRS 19780019748)',
  assumed: 'Assumed for this model (engineering guess within the range of the research brief)',
};

const v = (value, source, verified = false) => ({ value, source, verified });

/**
 * alpha: shortwave albedo; eps: longwave emissivity;
 * mu: thermal admittance sqrt(k C) in J m-2 s-1/2 K-1 (force-restore);
 * ef: evaporative fraction of positive net radiation.
 */
export const MATERIALS = {
  asphalt: {
    name: 'Aged asphalt',
    alpha: v(0.12, 'lbnl', true),
    eps: v(0.95, 'oke'),
    mu: v(1200, 'oke'),
    ef: v(0, 'assumed'),
    note: 'Dark, dense and dry: it soaks up most of the sun and gives the heat back long after dark.',
  },
  concrete: {
    name: 'Concrete paving',
    alpha: v(0.3, 'oke'),
    eps: v(0.9, 'oke'),
    mu: v(1785, 'oke'),
    ef: v(0, 'assumed'),
    note: 'Lighter than asphalt so it peaks lower, but its mass keeps it warm into the night.',
  },
  stone: {
    name: 'Stone paving / gravel path',
    alpha: v(0.3, 'oke'),
    eps: v(0.92, 'oke'),
    mu: v(1500, 'assumed'),
    ef: v(0.05, 'assumed'),
    note: 'Pale and porous: warm in the sun, cools sooner than the street.',
  },
  grass: {
    name: 'Irrigated lawn',
    alpha: v(0.25, 'oke'),
    eps: v(0.95, 'oke'),
    mu: v(1400, 'assumed'),
    ef: v(0.8, 'assumed'),
    note: 'Watered grass spends much of its sunshine evaporating water, and at night it cools below the air.',
  },
  water: {
    name: 'Pond (open water)',
    alpha: v(0.06, 'oke'),
    eps: v(0.96, 'oke'),
    mu: v(1545, 'oke'),
    ef: v(1, 'assumed'),
    note: 'Mixing and evaporation hold the pond near the daily mean air temperature.',
  },
  membrane: {
    name: 'Dark membrane roof',
    alpha: v(0.1, 'oke'),
    eps: v(0.92, 'oke'),
    mu: v(450, 'assumed'),
    ef: v(0, 'assumed'),
    note: 'A thin, dark, insulated skin: one of the hottest surfaces at 3 pm, cold again by midnight.',
  },
  metal: {
    name: 'Dark metal roof',
    alpha: v(0.15, 'oke'),
    eps: v(0.85, 'assumed'),
    mu: v(320, 'assumed'),
    ef: v(0, 'assumed'),
    note: 'Painted sheet metal has almost no heat capacity: it follows the sun up and the sky down.',
  },
  coolroof: {
    name: 'Cool (white) roof',
    alpha: v(0.8, 'epa'),
    eps: v(0.88, 'epa'),
    mu: v(450, 'assumed'),
    ef: v(0, 'assumed'),
    note: 'The same roof build-up as its dark neighbour, painted white: it reflects most of the sun.',
  },
  canopy: {
    name: 'Tree canopy',
    alpha: v(0.18, 'oke'),
    eps: v(0.97, 'oke'),
    mu: v(0, 'assumed'),
    ef: v(0.7, 'assumed'),
    note: 'Leaves stay within a few degrees of the air; the ground beneath sits in their shade.',
  },
};

/** Model constants shared by thermal.js (with sources). */
export const MODEL = {
  hc: { value: '5.7 + 3.8 u', source: 'oke', verified: false },
  canopyTransmission: { value: 0.17, source: 'assumed', verified: false }, // exp(-0.5 LAI), LAI ~ 3.5
  diffuseFraction: { value: 0.12, source: 'assumed', verified: false },
  roofWind: { value: 1.6, source: 'assumed', verified: false }, // roof-level wind / street-level wind
};
