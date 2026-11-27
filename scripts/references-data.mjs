// Bibliographic details for the source keys in engine/materials.js SOURCES
// (and the four model keys listed in scripts/sources.mjs). Used only by
// scripts/references.mjs to build references.html.
//
// A key with no entry here still appears on the page: the generator falls back
// to the SOURCES text, pulls any DOI or URL out of it, and flags the entry as
// "details not structured". So a new block only has to add its keys to
// SOURCES; an entry here makes the listing tidier.
//
// Fields (all optional): authors, year, title, venue, doi, url, flags.
//   title: null when the title was not recorded by the research briefs.
//   doi:   bare DOI (10.xxxx/...), shown as text.
//   url:   scheme-less address (no http://), shown as text, never a link.
//   link:  a relative path inside this repo (the only real links on the page).
//   flags: extra reading-status flags, added to the ones read from the
//          SOURCES text (see FLAG_RULES in references.mjs).
// Titles were filled in from the bibliographic records when the page was made;
// where a title was not certain it is left null rather than guessed.

export const REFS = {
  // ---- model and methods ----
  deardorff: {
    authors: 'Deardorff, J. W.', year: 1978,
    title: 'Efficient prediction of ground surface temperature and moisture, with inclusion of a layer of vegetation',
    venue: 'Journal of Geophysical Research 83(C4), 1889–1903 (NASA NTRS 19780019748)',
    doi: '10.1029/JC083iC04p01889',
  },
  noaa: {
    authors: 'NOAA Global Monitoring Laboratory', year: null,
    title: 'General Solar Position Calculations',
    venue: 'NOAA GML solar calculator documentation (solareqns.PDF)',
    url: 'gml.noaa.gov/grad/solcalc/solareqns.PDF',
  },
  meinel: {
    authors: 'Meinel, A. B. & Meinel, M. P.', year: 1976,
    title: 'Applied Solar Energy: An Introduction',
    venue: 'Addison-Wesley (book); clear-sky beam irradiance formula',
  },
  brutsaert: {
    authors: 'Brutsaert, W.', year: 1975,
    title: 'On a derivable formula for long-wave radiation from clear skies',
    venue: 'Water Resources Research 11(5), 742–744',
    doi: '10.1029/WR011i005p00742',
  },
  oke: {
    authors: 'Oke, T. R.; Oke, T. R., Mills, G., Christen, A. & Voogt, J. A.', year: '1987 / 2017',
    title: 'Boundary Layer Climates (2nd ed.); Urban Climates',
    venue: 'Routledge; Cambridge University Press (books; surface property tables)',
  },
  solweig: {
    authors: 'Lindberg, F., Holmer, B. & Thorsson, S.', year: 2008,
    title: 'SOLWEIG 1.0 – Modelling spatial variations of 3D radiant fluxes and mean radiant temperature in complex urban settings',
    venue: 'International Journal of Biometeorology 52, 697–713',
    doi: '10.1007/s00484-008-0162-7',
  },
  melnikov: {
    authors: 'Melnikov, V. R. et al.', year: 2022,
    title: null,
    venue: 'Scientific Reports 12, 2617 (pedestrian shade-seeking route choice)',
    doi: '10.1038/s41598-022-06383-5',
  },
  engine: {
    authors: 'This project', year: null, title: 'Engine assumption',
    venue: 'No literature source; listed so every value has a key',
  },

  // ---- block 1 ----
  lbnl: {
    authors: 'Pomerantz, M. et al.', year: 2000, title: null,
    venue: 'Lawrence Berkeley National Laboratory report LBNL-49283 (cool pavements)',
  },
  epa: {
    authors: 'US Environmental Protection Agency', year: 2008,
    title: 'Reducing Urban Heat Islands: Compendium of Strategies (Cool Pavements; Cool Roofs)',
    venue: 'US EPA',
  },
  brief: {
    authors: 'This project', year: 2026, title: 'Research brief: thermal model (block 1)',
    venue: 'docs/research/thermal-model-brief.md', link: 'docs/research/thermal-model-brief.md',
  },

  // ---- block 2 ----
  brief2: {
    authors: 'This project', year: 2026, title: 'Research brief: sponge-city and cool-roof retrofit (block 2)',
    venue: 'docs/research/retrofit-brief.md', link: 'docs/research/retrofit-brief.md',
  },
  lbnlRoof: {
    authors: 'US EPA; ENERGY STAR; Lawrence Berkeley National Laboratory', year: null, title: null,
    venue: 'EPA Cool Roofs compendium with ENERGY STAR / LBNL roof data; LBNL-6714E (in-service roofs)',
  },
  chicago: {
    authors: 'City of Chicago', year: null, title: 'Chicago energy code, low-slope roof reflectance',
    venue: 'Building code (via the block-2 brief)',
  },
  santamouris: {
    authors: 'Santamouris, M.', year: 2014,
    title: 'Cooling the cities – A review of reflective and green roof mitigation technologies to fight heat island and improve comfort in urban environments',
    venue: 'Solar Energy 103, 682–703',
  },
  noaaGreen: {
    authors: 'NOAA Institutional Repository', year: null, title: null,
    venue: 'Item noaa_57843 (Javits Center green roof, New York City)',
  },
  heusinger: {
    authors: 'Heusinger, J. & Weber, S.', year: 2017,
    title: 'Surface energy balance of an extensive green roof as quantified by full year eddy-covariance measurements',
    venue: 'Science of the Total Environment',
  },
  li2013: {
    authors: 'Li, H., Harvey, J. et al.', year: 2013, title: null,
    venue: 'Environmental Research Letters 8, 015023 (permeable pavements)',
  },
  middel2020: {
    authors: 'Middel, A. et al.', year: 2020,
    title: 'Solar reflective pavements – A policy panacea to heat mitigation?',
    venue: 'Environmental Research Letters',
  },
  ko2022: {
    authors: 'Ko, J. et al.', year: 2022, title: null,
    venue: 'Environmental Research Letters 17, 044027 (cool pavement at neighbourhood scale)',
  },
  mccoll: {
    authors: 'McColl, K. A. et al.', year: 2017,
    title: 'Global characterization of surface soil moisture drydowns',
    venue: 'Geophysical Research Letters',
  },
  middel2021: {
    authors: 'Middel, A. et al.', year: 2021, title: '50 Grades of Shade',
    venue: 'Bulletin of the American Meteorological Society',
  },
  sponge2015: {
    authors: 'General Office of the State Council of China', year: 2015,
    title: 'Guiding Opinions on Promoting Sponge City Construction (国办发〔2015〕75号)',
    venue: 'English notice on gov.cn, 2015-10-16; reprint and MOHURD interpretation',
    url: 'waizi.org.cn/law/6860.html',
  },

  // ---- block 3 ----
  brief3: {
    authors: 'This project', year: 2026, title: 'Research brief: glass CBD (block 3)',
    venue: 'docs/research/cbd-brief.md', link: 'docs/research/cbd-brief.md',
  },
  fresnel: {
    authors: 'Computed; LBNL (Furler; Rubin et al.)', year: null, title: 'Fresnel equations for uncoated float glass (n = 1.52)',
    venue: 'Calculation; angular-fit accuracy from LBNL reports',
  },
  energyplus: {
    authors: 'US Department of Energy', year: null,
    title: 'EnergyPlus Engineering Reference: Window Calculation Module, Angular Properties for Coated Glass',
    venue: 'EnergyPlus documentation (origin: Finlayson et al. 1993, LBL-33943, not checked)',
  },
  igdb: {
    authors: 'Lawrence Berkeley National Laboratory', year: null, title: 'International Glazing Database (IGDB)',
    venue: 'Product database (no datasheet was checked)',
  },
  bca: {
    authors: 'Building and Construction Authority, Singapore', year: null, title: 'Approved Document, Section P',
    venue: 'Building regulation (via the block-3 brief)',
  },
  en673: {
    authors: 'CEN', year: null, title: 'EN 673: Glass in building – Determination of thermal transmittance (U value)',
    venue: 'European standard (via the block-3 brief)',
  },
  iso6946: {
    authors: 'ISO / CEN', year: null, title: 'EN ISO 6946: Building components and building elements – Thermal resistance and thermal transmittance',
    venue: 'Standard (value quoted from memory)',
  },
  oke1981: {
    authors: 'Oke, T. R.', year: 1981,
    title: 'Canyon geometry and the nocturnal urban heat island: comparison of scale model and field observations',
    venue: 'Journal of Climatology 1, 237–254',
  },
  theeuwes2014: {
    authors: 'Theeuwes, N. E. et al.', year: 2014,
    title: 'Seasonal dependence of the urban heat island on the street canyon aspect ratio',
    venue: 'Quarterly Journal of the Royal Meteorological Society',
  },
  johansson2006: {
    authors: 'Johansson, E.', year: 2006,
    title: 'Influence of urban geometry on outdoor thermal comfort in a hot dry climate: a study in Fez, Morocco',
    venue: 'Building and Environment',
  },
  zhu2018: {
    authors: 'Zhu, Jahn & Rein', year: 2018, title: null,
    venue: 'Journal of Building Performance Simulation (20 Fenchurch Street reflection)',
  },
  vdara: {
    authors: 'NBC News; Architectural Record', year: 2010, title: 'Vdara hotel pool-deck hot zone, Las Vegas',
    venue: 'News reports (anecdotal)',
  },
  speroni2022: {
    authors: 'Speroni et al.', year: 2022, title: null,
    venue: 'Sustainability 14, 5781 (scale models of façade reflection)',
  },
  du2025: {
    authors: 'Du et al.', year: 2025, title: null,
    venue: 'Journal of Harbin Institute of Technology 57(9) (Chengdu Chunxi Road field study)',
  },
  chen2024: {
    authors: 'Chen et al.', year: 2024, title: null,
    venue: 'Energy and Buildings (reflective façades, cooling energy and canyon UTCI)',
  },
  sanagar2025: {
    authors: 'Sanagar Darbani et al.', year: 2025, title: null,
    venue: 'Developments in the Built Environment (low-emissivity glass and Tmrt, simulation)',
  },
  wallenberg2026: {
    authors: 'Wallenberg et al.', year: 2026, title: null,
    venue: 'Geoscientific Model Development 19, 1321 (SOLWEIG wall albedo and reflected shortwave)',
  },
  xie2016: {
    authors: 'Xie et al.', year: 2016, title: null,
    venue: 'Atmospheric Chemistry and Physics 16, 6071 (urban anthropogenic heat)',
  },
  sailor2011: {
    authors: 'Sailor, D. J.', year: 2011,
    title: 'A review of methods for estimating anthropogenic heat and moisture emissions in the urban environment',
    venue: 'International Journal of Climatology (Tokyo figure: Ichinose 1999 via Sailor et al. 2015)',
  },

  // ---- block 4 ----
  brief4: {
    authors: 'This project', year: 2026, title: 'Research brief: waterfront and wind corridors (block 4)',
    venue: 'docs/research/waterfront-brief.md', link: 'docs/research/waterfront-brief.md',
  },
  volker2013: {
    authors: 'Völker, S. et al.', year: 2013,
    title: 'Evidence for the temperature-mitigating capacity of urban blue space – a health geographic perspective',
    venue: 'Erdkunde 67(4) (review of 27 studies)',
    url: 'erdkunde.uni-bonn.de/article/view/2737',
  },
  hathway2012: {
    authors: 'Hathway, E. A. & Sharples, S.', year: 2012,
    title: 'The interaction of rivers and urban form in mitigating the urban heat island effect: a UK case study',
    venue: 'Building and Environment',
  },
  steeneveld2014: {
    authors: 'Steeneveld, G. J. et al.', year: 2014,
    title: 'Refreshing the role of open water surfaces on mitigating the maximum urban heat island effect',
    venue: 'Landscape and Urban Planning',
  },
  theeuwes2013: {
    authors: 'Theeuwes, N. E. et al.', year: 2013,
    title: 'Modeling the influence of open water surfaces on the summertime temperature and thermal comfort in the city',
    venue: 'Journal of Geophysical Research: Atmospheres',
  },
  jacobs2020: {
    authors: 'Jacobs, C. et al.', year: 2020, title: 'Are urban water bodies really cooling?',
    venue: 'Urban Climate (ENVI-met, small Dutch water bodies)',
    url: 'research.wur.nl/en/publications/are-urban-water-bodies-really-cooling/',
  },
  cheonggyecheon: {
    authors: 'Tokyo Metropolitan University repository; AMS conference abstract', year: null,
    title: 'Cheonggyecheon stream restoration, Seoul: air-temperature effect', venue: 'Repository item and abstract',
  },
  ota: {
    authors: 'Murakawa group', year: null, title: 'Ota River, Hiroshima: river-breeze cooling along streets',
    venue: 'Architectural Institute of Japan papers (J-STAGE aijax 415)',
  },
  corridor: {
    authors: 'Chinese planning criteria; Givoni; Ren et al. (2018, CUHK)', year: null,
    title: 'Ventilation-corridor orientation criteria', venue: 'via Ren et al. 2018 and MDPI Buildings 14(2):348',
  },
  oke1988: {
    authors: 'Oke, T. R.', year: 1988, title: 'Street design and urban canopy layer climate',
    venue: 'Energy and Buildings 11',
  },
  wake: {
    authors: 'Authors not recorded', year: 2024, title: null,
    venue: 'Building Simulation (building wake recirculation length)',
  },
  solcerova2019: {
    authors: 'Solcerova, A. et al.', year: 2019, title: 'Nighttime cooling of an urban pond',
    venue: 'Frontiers in Earth Science 7, 156',
  },
  webb2008: {
    authors: 'Webb, B. W. et al.', year: 2008, title: 'Recent advances in stream and river temperature research',
    venue: 'Hydrological Processes',
  },
  steadman1994: {
    authors: 'Steadman, R. G.', year: 1994, title: 'Norms of apparent temperature in Australia',
    venue: 'Australian Meteorological Magazine 43',
  },
  bom: {
    authors: 'Australian Bureau of Meteorology', year: null,
    title: 'Thermal stress: About the formula for the apparent temperature',
    venue: 'Web page (coefficients checked against it)',
    url: 'bom.gov.au/info/thermal_stress/',
  },
  // ---- block 5 ----
  brief5: {
    authors: 'This project', year: 2026, title: 'Research brief: hutong lanes and courtyards (block 5)',
    venue: 'docs/research/hutong-brief.md', link: 'docs/research/hutong-brief.md',
  },
  hendel2015: {
    authors: 'Hendel, M. et al.', year: 2015, title: null,
    venue: 'Journal of Sustainable Development of Energy, Water and Environment Systems (watering the Rue du Louvre, Paris)',
    doi: '10.13044/j.sdewes.2015.03.0001',
  },
  hendel2016: {
    authors: 'Hendel, M. et al.', year: 2016, title: null,
    venue: 'Urban Climate (pavement watering in Paris)',
    doi: '10.1016/j.uclim.2016.02.003',
  },
  takebayashi2023: {
    authors: 'Takebayashi, H. et al.', year: 2023, title: null,
    venue: 'Atmosphere 14(6), 1014 (road watering in Kobe)',
    doi: '10.3390/atmos14061014',
  },
  kato2008: {
    authors: 'Kato, S. et al.', year: 2008, title: null,
    venue: 'Watered road surface temperatures (via the block-5 brief)',
  },
  nippon: {
    authors: 'nippon.com', year: null, title: null,
    venue: 'Feature on uchimizu, sprinkling water in summer (web; via the block-5 brief)',
  },
  lin2019: {
    authors: 'Lin et al.', year: 2019, title: null,
    venue: 'International Journal of Environmental Research and Public Health 16, 2986 (traditional block in Harbin)',
    doi: '10.3390/ijerph16162986',
  },
  spainCourtyard: {
    authors: 'Several authors', year: null, title: null,
    venue: 'MDPI Proceedings 2(22) 1390 and 1381; 38(1) 17 (courtyards in Córdoba and Seville; abstracts only)',
  },
  yang2024: {
    authors: 'Yang & Wang', year: 2024, title: null,
    venue: 'Journal of Beijing Forestry University (Beijing street trees; abstract only)',
    doi: '10.12171/j.1000-1522.20240012',
  },
  carb: {
    authors: 'California Air Resources Board', year: null, title: null,
    venue: 'Cool-roof product data (via the block-5 brief)',
  },
  midlandBrick: {
    authors: 'Midland Brick', year: null, title: null,
    venue: 'Brick product data (via the block-5 brief)',
  },
  sohuRoof: {
    authors: 'Sohu', year: null, title: null,
    venue: 'Web article on northern tile roofs (via the block-5 brief)',
  },
  miller2007: {
    authors: 'Miller, W. A.', year: 2007, title: null,
    venue: 'Oak Ridge National Laboratory, tile roofs (via the block-5 brief)',
  },
  ucdavis: {
    authors: 'University of California, Davis', year: null, title: null,
    venue: 'Guidance on vine arbours (via the block-5 brief)',
  },
  jjshs: {
    authors: null, year: null, title: null,
    venue: 'Journal of the Japanese Society for Horticultural Science 54(3), 293 (via the block-5 brief)',
  },
  deng: {
    authors: 'Deng Yunxiang (邓云乡)', year: null, title: '天棚遮阴 (Tianpeng zheyin)',
    venue: 'The Paper (澎湃新闻), newsDetail_forward_18319465 (via the block-5 brief)',
  },
  visitBeijing: {
    authors: 'Visit Beijing', year: null, title: null,
    venue: 'Official tourism site of Beijing (via the block-5 brief)',
  },
  bolton1980: {
    authors: 'Bolton, D.', year: 1980,
    title: 'The computation of equivalent potential temperature',
    venue: 'Monthly Weather Review 108, 1046–1053',
  },
};
