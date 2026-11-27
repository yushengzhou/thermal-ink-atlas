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
  brief3: 'Research brief docs/research/cbd-brief.md (block 3; values compiled from the sources below, items marked unverified there are flagged here)',
  fresnel: 'Fresnel equations for uncoated float glass, n = 1.52, two surfaces (computed); LBNL (Furler; Rubin et al.): ASHRAE-style angular fit within 1.5% for clear glass, coated glass up to about 8% off at 60 deg',
  energyplus: 'EnergyPlus Engineering Reference, Window Calculation Module, Angular Properties for Coated Glass: R(phi) = R(0) (1 - rho_bar(phi)) + rho_bar(phi), rho_bar a normalised clear-glass curve (polynomial fit in cos phi); origin given as Finlayson et al. 1993, WINDOW 4.0 documentation, LBL-33943 (not checked)',
  igdb: 'LBNL International Glazing Database (IGDB) suggested for product reflectances; no datasheet was checked for the low-e or mirror values',
  bca: 'Singapore BCA Approved Document, Section P: glass daylight reflectance at most 20% (via the block-3 brief)',
  en673: 'EN 673 glass outer-surface emissivity about 0.84 (via the block-3 brief)',
  iso6946: 'EN ISO 6946 internal surface resistance 0.13 m2 K W-1, i.e. about 7.7 W m-2 K-1 (from memory)',
  oke1981: 'Oke (1981) J. Climatol. 1, 237-254, doi 10.1002/joc.3370010304: max nocturnal UHI = 7.45 + 3.97 ln(H/W) (coefficients via a secondary source, redalyc 283230157011)',
  theeuwes2014: 'Theeuwes et al. (2014) Q. J. R. Meteorol. Soc., doi 10.1002/qj.2289: the Oke relation breaks down at high H/W',
  johansson2006: 'Johansson (2006) Building and Environment, doi 10.1016/j.buildenv.2005.05.022: Fez deep canyon (H/W about 10) about 6 K, up to 10 K, cooler by day',
  zhu2018: 'Zhu, Jahn & Rein (2018) J. Building Performance Simulation, doi 10.1080/19401493.2018.1538389: 20 Fenchurch St simulated peak 3,384 W m-2 (worst 4,176)',
  vdara: 'Vdara hotel, Las Vegas, 2010 pool-deck hot zone (NBC News; Architectural Record): anecdotal',
  speroni2022: 'Speroni et al. (2022) Sustainability 14, 5781, doi 10.3390/su14105781 (abstract only): scale models, diffuse façades <= +30%, flat mirror > +100%, concave > +300% at pedestrian level',
  du2025: 'Du et al. (2025) J. Harbin Inst. Tech. 57(9), doi 10.11918/202406062: Chengdu Chunxi Road, Aug 2023, reflection zones Tmrt +4 to +13 C, air +1-2 C, UTCI +2-5 C, peak Tmrt 73.9 C',
  chen2024: 'Chen et al. (2024) Energy and Buildings, doi 10.1016/j.enbuild.2024.114926: reflective façades lower cooling energy but raise canyon UTCI',
  sanagar2025: 'Sanagar Darbani et al. (2025) Developments in the Built Environment, doi 10.1016/j.dibe.2025.100758: low-emissivity glass cuts Tmrt by up to 5 K (simulation)',
  wallenberg2026: 'Wallenberg et al. (2026) Geosci. Model Dev. 19, 1321, doi 10.5194/gmd-19-1321-2026: SOLWEIG wall albedo 0.5 with reflected shortwave; highest Tmrt in front of sunlit façades',
  xie2016: 'Xie et al. (2016) Atmos. Chem. Phys. 16, 6071, doi 10.5194/acp-16-6071-2016: dense urban anthropogenic heat 20-70 W m-2 of ground area, occasionally > 100',
  sailor2011: 'Sailor (2011) Int. J. Climatol., doi 10.1002/joc.2106, anthropogenic heat review; Sailor et al. (2015) citing Ichinose (1999): central Tokyo > 400 W m-2 by day',
  sponge2015: 'State Council General Office (2015) Guiding Opinions on Promoting Sponge City Construction, Guo Ban Fa [2015] No. 75 (English notice, gov.cn, 2015-10-16; reprint waizi.org.cn/law/6860.html; MOHURD interpretation via cs.com.cn; the primary Chinese text was not located)',
  brief4: 'Research brief docs/research/waterfront-brief.md (block 4; values compiled from the sources below, items marked unverified there are flagged here)',
  volker2013: 'Völker et al. (2013) Erdkunde 67(4), review of 27 studies: urban blue space about 2.5 K (95% CI 1.9-3.2) cooler May-October, inflated by remote-sensing surface temperatures',
  hathway2012: 'Hathway & Sharples (2012) Building and Environment, River Don, Sheffield: river about 1 K cooler than the city reference, vegetated banks about 2 K cooler than paved, reach about 30 m with open banks (via secondary sources, unverified)',
  steeneveld2014: 'Steeneveld et al. (2014) Landscape and Urban Planning, doi 10.1016/j.landurbplan.2013.09.001: in Rotterdam, water bodies raise the 95th percentile of the daily maximum UHI (warm after sunset)',
  theeuwes2013: 'Theeuwes et al. (2013) J. Geophys. Res. Atmos., doi 10.1002/jgrd.50704 (WRF): water warmer than the air at night worsens night-time comfort',
  jacobs2020: 'Jacobs et al. (2020) Are urban water bodies really cooling? Urban Climate (ENVI-met, small Dutch water bodies): afternoon air -0.2 K typical, -0.6 K at most; PET -0.6 typical, -1.9 at most; shade gives PET -1 to -7 K',
  cheonggyecheon: 'Cheonggyecheon, Seoul (TMU repository; AMS abstract): more than 1 K cooler to 70-80 m (north side), about 0.5 K to 30-50 m (south side); before / after -0.1 to -0.9 K',
  ota: 'Murakawa group, Ota River, Hiroshima (AIJ papers, J-STAGE aijax 415): river cooling detectable 150-500 m inland along streets perpendicular to the river, more with wind, wider streets and lower density (unverified)',
  corridor: 'Ventilation-corridor planning criteria: corridors within 30 deg of the prevailing wind (Chinese planning criteria and Givoni 20-30 deg, via Ren et al. 2018 (CUHK) and MDPI Buildings 14(2):348)',
  oke1988: 'Oke (1988) Energy and Buildings 11, street-canyon flow regimes, thresholds about 0.3-0.4 and 0.65-0.7 H/W (unverified)',
  wake: 'Building Simulation (Springer), doi 10.1007/s12273-024-1103-z: building wake recirculation length about 1.6-2.6 x building width',
  solcerova2019: 'Solcerova et al. (2019) Frontiers in Earth Science 7, 156, doi 10.3389/feart.2019.00156: a Delft pond is warmer than the air at night and releases about 2.7 MJ m-2 per night (43% longwave, 39% latent, 11% sensible)',
  webb2008: 'Webb et al. (2008) Hydrological Processes, river water temperature review: large deep rivers have the smallest daily range ("< 1 K" unverified)',
  steadman1994: 'Steadman (1994) Australian Meteorological Magazine 43, apparent temperature with radiation (the paper itself was not read; formula via [bom])',
  bom: 'Australian Bureau of Meteorology, Thermal stress: About the formula for the apparent temperature (bom.gov.au/info/thermal_stress/): AT = Ta + 0.348 e - 0.70 ws + 0.70 Q / (ws + 10) - 4.25, ws the 10 m wind, Q the net radiation absorbed per unit area of body surface (W m-2); coefficients checked against this page',
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

// ---- block 4: water with its own prescribed curves -------------------------
Object.assign(MATERIALS, {
  river: {
    name: 'River (open water)',
    alpha: v(0.06, 'oke', 'range', false, 'cited 0.03-0.10'),
    eps: v(0.96, 'oke', 'range', false, 'cited 0.92-0.97'),
    mu: v(1545, 'oke', 'cited'),
    ef: v(1, 'engine', 'engine'),
    prescribed: 'Not used by the grid model: the river is held at daily mean air - 2 K, +-0.5 K (peak at 15:00), so it stays below the air all afternoon (research brief, block 4; offset and amplitude are assumptions).',
    note: 'A large, deep, flowing river barely warms through the day: it stays below the afternoon air.',
  },
  pond: {
    name: 'Still pond (shallow)',
    alpha: v(0.06, 'oke', 'range', false, 'cited 0.03-0.10'),
    eps: v(0.96, 'oke', 'range', false, 'cited 0.92-0.97'),
    mu: v(1545, 'oke', 'cited'),
    ef: v(1, 'engine', 'engine'),
    prescribed: 'Not used by the grid model: the pond is held at daily mean air - 0.5 K, +-2 K (peak at 16:00): cooler than the afternoon air, warmer than the air before dawn (research brief, block 4; numbers are assumptions, the warm night is cited).',
    note: 'A shallow still pond stores the day\'s heat and gives it back at night: before dawn it is warmer than the air.',
  },
});

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

// ---- block 3: glass presets ---------------------------------------------------
// rho0: normal-incidence solar reflectance (the angular shape is Fresnel, see
// reflect.js); absorb: solar absorptance of the pane (glass temperature);
// eps: outer-surface longwave emissivity.
export const GLASS = {
  clear: {
    name: 'Clear float glass',
    rho0: v(0.08, 'fresnel', 'cited', true, 'Fresnel calculation, n = 1.52, two surfaces: 0.082'),
    absorb: v(0.1, 'brief3', 'cited', false, 'brief: a_g 0.1 for clear glass, marked an assumption'),
    eps: v(0.84, 'en673', 'cited', false),
    note: 'Ordinary clear glass reflects only about 8% of the sun head-on, but far more at a glancing angle (Fresnel).',
  },
  lowe: {
    name: 'Solar-control low-e glass',
    rho0: v(0.2, 'brief3', 'range', false, 'brief range 0.15-0.35; no datasheet checked (LBNL IGDB) [igdb]'),
    absorb: v(0.3, 'brief3', 'edge', false, 'brief: 0.3-0.45 for coated glass, marked an assumption'),
    eps: v(0.84, 'en673', 'cited', false, 'outer surface; the low-e coating faces the cavity'),
    note: 'A coated glass that turns away much of the sun; at 0.20 it sits at the Singapore cap for daylight reflectance.',
  },
  mirror: {
    name: 'Reflective (mirror) glass',
    rho0: v(0.35, 'brief3', 'range', false, 'brief range 0.25-0.45; no datasheet checked (LBNL IGDB) [igdb]'),
    absorb: v(0.4, 'brief3', 'range', false, 'brief: 0.3-0.45 for coated glass, marked an assumption'),
    eps: v(0.84, 'en673', 'cited', false),
    note: 'A metallic coating makes the tower a mirror: it keeps sun out of the offices and throws more of it onto the street.',
  },
};
export const GLASS_IDS = ['clear', 'lowe', 'mirror'];
export const GLASS_DEFAULT = 'lowe';

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
  wallAlbedo: v(0.3, 'brief3', 'range', false, 'opaque walls; brief: 0.3 (0.2-0.5, Oke range unverified); SOLWEIG uses 0.5 [wallenberg2026]'),
  wallLit: v(0.5, 'engine', 'engine', false, 'share of a wall in sun, f_lit, for the diffuse wall-reflection term (not used for glass temperature, which follows the brief)'),
  wallReflection: v('K_wr = a_w (1 - SVF) K_wall', 'brief3', 'interp', false, 'K_wall = f_lit I cos(beta)/pi + 0.5 D + 0.5 a_g G; SOLWEIG form a_w G (1 - psi) recalled from memory in the brief'),
  glassHo: v(20, 'brief3', 'range', false, 'outside film coefficient h_o, brief 15-25 W m-2 K-1'),
  glassHi: v(7.7, 'iso6946', 'interp', false, 'inside film coefficient h_i,eff, W m-2 K-1, read as 1 / 0.13'),
  sweatCue: v('Tmrt 65 -> 70 C', 'engine', 'engine', false, 'visual cue only: droplets on people in sun, strength rising from Tmrt 65 C to full at 70 C (separates sunlit pavement from sunlit lawn in this model); no physiological model'),
  // ---- block 4 (waterfront): wind factor, water curves, air overlay, comfort ----
  windFmin: v(0.3, 'brief4', 'engine', false, 'f_min: wind factor right behind an obstacle (leeward face); also the lower clamp of f_w'),
  shelterReach: v('5 H', 'brief4', 'engine', false, 'shelter recovers linearly to 1 at 5 building heights downwind ("5H recovery" is an assumption in the brief; wake recirculation 1.6-2.6 x building width is cited [wake])'),
  channelC: v(0.2, 'brief4', 'engine', false, 'c_ch: channelling gain in streets aligned with the wind, C = 1 + c_ch max(0, cos 3 delta)'),
  windFmax: v(1.2, 'brief4', 'engine', false, 'f_max: upper clamp of f_w'),
  alignCut: v('30 deg', 'corridor', 'cited', false, 'channelling only in streets whose axis is within 30 deg of the wind'),
  channelHw: v(0.4, 'oke1988', 'interp', false, 'channelling only where the street H/W > 0.4 (read from the Oke 1988 regime thresholds, about 0.3-0.4, unverified)'),
  windHc: v('h_c = 5.7 + 3.8 u_site f_w', 'brief4', 'interp', false, 'the same h_c formula [oke] with the local wind u_i = u_site f_w per cell (roofs and blocks without a wind direction: f_w = 1). The formula is a near-surface flat-plate fit fed here with the 10 m wind x f_w, which overstates street-level h_c and its wind sensitivity'),
  riverCurve: v('Ta_mean - 2 K + 0.5 K sin(2 pi (h - 9) / 24)', 'brief4', 'engine', false, 'prescribed river surface; range 1 K (large rivers: smallest daily range [webb2008]); the -2 K offset and 0.5 K amplitude are assumptions'),
  pondCurve: v('Ta_mean - 0.5 K + 2 K sin(2 pi (h - 10) / 24)', 'brief4', 'engine', false, 'prescribed shallow pond surface; range 4 K; warmer than the air at night is cited [solcerova2019], the numbers are assumptions'),
  airDay: v(1.0, 'brief4', 'range', false, 'overlay only: dTa at the bank by day, -1.0 K (cited range 0.2-1.5 K [hathway2012, cheonggyecheon, jacobs2020])'),
  airL: v(30, 'brief4', 'range', false, 'overlay only: decay length L, m (cited 30-80 m [hathway2012, cheonggyecheon], unverified)'),
  airLaligned: v(60, 'brief4', 'interp', false, 'overlay only: decay length in streets aligned with the wind, m, chosen so the effect is below 0.2 K by 150 m (the brief reads the Ota River 150-500 m [ota] as at most 150 m here)'),
  airNight: v(0.3, 'brief4', 'engine', false, 'overlay only: dTa at the bank at night, +0.3 K (range 0-1 K assumed; the sign is cited [steeneveld2014, solcerova2019])'),
  airPond: v(0.2, 'jacobs2020', 'cited', false, 'overlay only: dTa next to the small pond by day, -0.2 K (Jacobs et al. typical afternoon value)'),
  apparentTemp: v('AT = Ta + 0.348 e - 0.70 ws + 0.70 Q / (ws + 10) - 4.25', 'bom', 'cited', true, 'Steadman (1994) [steadman1994], coefficients checked against the BoM page; comfort for the walkers in block 4 (a stand-in for UTCI, which is not implemented); ws = u_10 f_w clamped to 0.5-17 m/s as the brief gives for UTCI'),
  atRadiation: v('Q = 6.1 W m-2 K-1 x (Tmrt - Ta)', 'bom', 'interp', false, 'extra radiation absorbed by a person, linearised: 4 eps sigma T^3 with eps 0.97 and T 303 K over the whole body surface. At a sunlit Tmrt near 68 C (341 K) 4 eps sigma T^3 is about 8.7, so Q is understated by about 30% there; a standing person radiates over only about 0.7 of the body surface (ASHRAE effective radiating area), which errs the other way. Route weights divide by the sun-shade AT gap, so this largely cancels for the walkers; absolute AT on the cards carries it'),
  windLines: v('seeds every 20 m upwind, RK2 2.5 m steps, slide along buildings', 'brief4', 'engine', false, 'drawing only: assumed direction x shelter factor, not computed flow; dash spacing and speed proportional to u_i (speed drawn 4x)'),
};

/** Parameter keys a material uses (for cards and docs). */
export const paramKeys = (m) => ['alpha', 'eps', m.thinC ? 'thinC' : 'mu', 'muWet', 'ef', 'efWet', 'tau', 'storage'].filter((k) => m[k]);
