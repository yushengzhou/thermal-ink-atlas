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
  brief2: 'Research brief docs/research/retrofit-brief.md (block 2; values compiled from the sources below, items marked unverified there are flagged here)',
  lbnlRoof: 'US EPA Cool Roofs compendium with ENERGY STAR / LBNL roof data: new white roof albedo about 0.80; LBNL-6714E: in-service roofs often below their CRRC aged rating',
  chicago: 'Chicago energy code via the block-2 brief: low-slope roofs need initial albedo >= 0.72 or 3-year aged >= 0.50',
  santamouris: 'Santamouris (2014) Solar Energy 103, 682-703, doi 10.1016/j.solener.2012.07.003, cool roofs and pavements review',
  noaaGreen: 'NOAA Institutional Repository noaa_57843: Javits Center green roof, NYC, up to 18.4 K cooler than a black roof',
  heusinger: 'Heusinger & Weber (2017) Science of the Total Environment, doi 10.1016/j.scitotenv.2016.10.168, extensive green roof energy balance (Bowen ratio about <1 to 2)',
  li2013: 'Li, Harvey et al. (2013) Environ. Res. Lett. 8 015023, permeable pavements (corrigendum not checked)',
  middel2020: 'Middel et al. (2020) Environ. Res. Lett., doi 10.1088/1748-9326/ab87d4, reflective coating on Los Angeles streets',
  ko2022: 'Ko et al. (2022) Environ. Res. Lett. 17 044027, cool pavement at neighbourhood scale, albedo 0.26 -> 0.18 in one year',
  mccoll: 'McColl et al. (2017) Geophys. Res. Lett., doi 10.1002/2017GL072819, global soil-moisture drydown timescales',
  middel2021: 'Middel et al. (2021) Bull. Amer. Meteor. Soc., doi 10.1175/BAMS-D-20-0193.1, shade and Tmrt in Phoenix',
  sponge2015: 'State Council General Office (2015) Guiding Opinions on Promoting Sponge City Construction, Guo Ban Fa [2015] No. 75 (English notice, gov.cn, 2015-10-16; reprint waizi.org.cn/law/6860.html; MOHURD interpretation via cs.com.cn; the primary Chinese text was not located)',
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

// ---- block 2: retrofit materials ------------------------------------------
// Wetted materials carry efWet / efDry and tau (days); green roof also muWet.
// The value used by the model is resolved for "days since rain" d by
// decay() in retrofit.js: X(d) = X_dry + (X_wet - X_dry) exp(-d / tau).
// storage: water a material can hold after rain (mm), for the water-budget check.
Object.assign(MATERIALS, {
  coolroofAged: {
    name: 'Cool roof, aged',
    alpha: v(0.6, 'brief2', 'range', false, 'brief: aged cool roofs 0.50-0.70, of which 0.60-0.70 unverified; Chicago code floor: 3-year aged >= 0.50 [chicago]'),
    eps: v(0.88, 'lbnlRoof', 'cited', false),
    mu: v(450, 'brief', 'range', false, 'same build-up as the dark membrane'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'A white roof after a few years of dust and weather: still far cooler than the dark membrane it replaced, but not as cool as when new.',
  },
  coolroofNew: {
    name: 'Cool roof, new',
    alpha: v(0.8, 'lbnlRoof', 'cited', false, 'new white roof about 0.80; read second-hand via the compendium, so unverified as in block 1'),
    eps: v(0.88, 'lbnlRoof', 'cited', false),
    mu: v(450, 'brief', 'range', false, 'same build-up as the dark membrane'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'A freshly coated white roof reflects about four fifths of the sun.',
  },
  greenroof: {
    name: 'Extensive green roof',
    alpha: v(0.2, 'brief2', 'range', false, 'cited 0.15-0.25'),
    eps: v(0.95, 'brief2', 'cited', false),
    mu: v(600, 'brief2', 'cited', false, 'dry substrate; wet 1200, decays with tau'),
    muWet: v(1200, 'brief2', 'cited', false, 'wet substrate'),
    ef: v(0.25, 'brief2', 'interp', false, 'dry; the brief\'s value. Heusinger & Weber report Bowen ratio <1-2'),
    efWet: v(0.5, 'heusinger', 'interp', false, 'wet; Bowen ratio about 1 (Heusinger & Weber: <1-2)'),
    tau: v(4, 'brief2', 'cited', false, 'substrate drying time, days'),
    storage: v(30, 'brief2', 'range', false, '100 mm substrate holds 20-40 mm'),
    note: 'Sedum and thin soil over the roof: plants and wet substrate spend sunshine on evaporation, more so soon after rain.',
  },
  pavers: {
    name: 'Permeable pavers',
    alpha: v(0.26, 'li2013', 'cited', true),
    eps: v(0.92, 'brief2', 'cited', false),
    mu: v(870, 'engine', 'engine', false, 'dry, assumed'),
    ef: v(0.02, 'brief2', 'interp', false, 'dry; brief value'),
    efWet: v(0.5, 'brief2', 'interp', false, 'wet; brief value'),
    tau: v(1, 'brief2', 'interp', false, 'days; the brief calls it calibrated to Li 2013, but in this model it does not reproduce Li at d = 1 (see docs/sources.md)'),
    storage: v(5, 'brief2', 'interp', false, 'brief: "a few mm", read as 5 mm; the daily water check needs >= 4.1 mm'),
    note: 'Pavers with open joints let rain soak in; the water evaporates over the next day or two and cools them while it lasts.',
  },
  porousAsphalt: {
    name: 'Porous asphalt',
    alpha: v(0.08, 'li2013', 'cited', true),
    eps: v(0.95, 'brief2', 'cited', false),
    mu: v(800, 'engine', 'engine', false, 'dry, assumed'),
    ef: v(0.02, 'brief2', 'interp', false, 'dry; as pavers'),
    efWet: v(0.5, 'brief2', 'interp', false, 'wet; as pavers'),
    tau: v(1, 'brief2', 'interp', false, 'days; as pavers'),
    storage: v(5, 'brief2', 'interp', false, 'brief: "a few mm", read as 5 mm; the daily water check needs >= 4.1 mm'),
    note: 'Open-graded asphalt that drains rain: cooler while wet, but once dry it is darker and lighter-weight than dense asphalt, so it runs hotter.',
  },
  coolPaveAged: {
    name: 'Cool pavement coating, 1 year old',
    alpha: v(0.18, 'ko2022', 'cited', false, '0.26 -> 0.18 after one year'),
    eps: v(0.92, 'brief2', 'cited', false),
    mu: v(1200, 'oke', 'cited', false, 'the asphalt underneath'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'A light grey coating on the old asphalt, after a year of traffic: a little cooler underfoot, and it bounces more sun onto people.',
  },
  coolPaveNew: {
    name: 'Cool pavement coating, new',
    alpha: v(0.25, 'middel2020', 'cited', false),
    eps: v(0.92, 'brief2', 'cited', false),
    mu: v(1200, 'oke', 'cited', false, 'the asphalt underneath'),
    ef: v(0, 'brief', 'cited', false, 'dry impervious'),
    note: 'A fresh light grey coating on the old asphalt: the road is cooler, but more sun bounces up onto people.',
  },
  raingarden: {
    name: 'Rain garden',
    alpha: v(0.2, 'engine', 'engine', false),
    eps: v(0.95, 'engine', 'engine', false),
    mu: v(1400, 'engine', 'engine', false),
    ef: v(0.35, 'engine', 'engine', false, 'dry'),
    efWet: v(0.8, 'engine', 'engine', false, 'wet'),
    tau: v(3, 'mccoll', 'interp', false, 'soil drydown, days; median not checked'),
    storage: v(40, 'engine', 'engine', false, 'ponding and soil, assumed'),
    note: 'A shallow planted hollow that takes the street runoff; its soil stays damp for days after rain.',
  },
  youngCanopy: {
    name: 'Young street tree',
    alpha: v(0.18, 'oke', 'range', false, 'cited 0.15-0.20'),
    eps: v(0.97, 'oke', 'range', false, 'cited 0.97-0.99'),
    ef: v(0.7, 'brief', 'range', false, 'cited 0.6-0.8'),
    prescribed: 'Not used by the grid model: leaf temperature as for mature trees. Its thin crown lets through exp(-0.5 x 1.5) = 0.47 of the sun (see youngTreeTransmission).',
    note: 'A newly planted tree: its small, thin crown gives patchy shade for now; it takes years to grow a full canopy.',
  },
});

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
  youngTreeTransmission: v(0.47, 'brief2', 'interp', false, 'exp(-0.5 LAI) with LAI 1.5; brief range 0.37-0.61 for LAI 1-2'),
  youngTreeCrown: v('crown radius 2.6 m, crown centre 4.4 m', 'engine', 'engine', false, 'scene assumption for newly planted street trees (cities/sponge-retrofit/scene.js)'),
  latentHeat: v('2.45e6 J kg-1', 'brief2', 'cited', true, 'evaporated depth = sum of EF x max(Q*, 0) x dt / 2.45e6'),
  sweatCue: v('Tmrt 65 -> 70 C', 'engine', 'engine', false, 'visual cue only: droplets on people in sun, strength rising from Tmrt 65 C to full at 70 C (separates sunlit pavement from sunlit lawn in this model); no physiological model'),
};

/** Parameter keys a material uses (for cards and docs). */
export const paramKeys = (m) => ['alpha', 'eps', m.thinC ? 'thinC' : 'mu', 'muWet', 'ef', 'efWet', 'tau', 'storage'].filter((k) => m[k]);
