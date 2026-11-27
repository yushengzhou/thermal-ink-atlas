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
    authors: 'Deardorff, J. W.',
    year: 1978,
    title: 'Efficient prediction of ground surface temperature and moisture, with inclusion of a layer of vegetation',
    venue: 'Journal of Geophysical Research: Oceans 83(C4), 1889–1903 (NASA NTRS 19780019748)',
    doi: '10.1029/JC083iC04p01889',
  },
  noaa: {
    authors: 'NOAA Global Monitoring Laboratory', year: null,
    title: 'General Solar Position Calculations',
    venue: 'NOAA GML solar calculator documentation (solareqns.PDF)',
    url: 'gml.noaa.gov/grad/solcalc/solareqns.PDF',
  },
  meinel: {
    authors: 'Meinel, A. B. & Meinel, M. P.',
    year: 1976,
    title: 'Applied Solar Energy: An Introduction',
    venue: 'Addison-Wesley, Reading, MA (book, ISBN 0201047195); clear-sky beam irradiance formula',
  },
  brutsaert: {
    authors: 'Brutsaert, W.',
    year: 1975,
    title: 'On a derivable formula for long-wave radiation from clear skies',
    venue: 'Water Resources Research 11(5), 742–744',
    doi: '10.1029/WR011i005p00742',
  },
  oke: {
    authors: 'Oke, T. R.; Oke, T. R., Mills, G., Christen, A. & Voogt, J. A.',
    year: '1987 / 2017',
    title: 'Boundary Layer Climates (2nd ed.); Urban Climates',
    venue: 'Methuen, London (later reissued by Routledge, doi 10.4324/9780203407219); Cambridge University Press (books; surface property tables)',
    doi: '10.1017/9781139016476',
  },
  solweig: {
    authors: 'Lindberg, F., Holmer, B. & Thorsson, S.',
    year: 2008,
    title: 'SOLWEIG 1.0 – Modelling spatial variations of 3D radiant fluxes and mean radiant temperature in complex urban settings',
    venue: 'International Journal of Biometeorology 52(7), 697–713',
    doi: '10.1007/s00484-008-0162-7',
  },
  melnikov: {
    authors: 'Melnikov, V. R., Christopoulos, G. I., Krzhizhanovskaya, V. V., Lees, M. H. & Sloot, P. M. A.',
    year: 2022,
    title: 'Behavioural thermal regulation explains pedestrian path choices in hot urban environments',
    venue: 'Scientific Reports 12, 2441',
    doi: '10.1038/s41598-022-06383-5',
  },
  engine: {
    authors: 'This project', year: null, title: 'Engine assumption',
    venue: 'No literature source; listed so every value has a key',
  },

  // ---- block 1 ----
  lbnl: {
    authors: 'Pomerantz, M., Pon, B., Akbari, H. & Chang, S.-C.',
    year: 2000,
    title: 'The effect of pavements\' temperatures on air temperatures in large cities',
    venue: 'Lawrence Berkeley National Laboratory report LBNL-43442 (Fig. 1). Secondary: Pomerantz, M., Akbari, H., Chang, S.-C., Levinson, R. & Pon, B. (2003) Examples of cooler reflective streets for urban heat-island mitigation: Portland cement concrete and chip seals, LBNL-49283, doi 10.2172/816205',
    url: 'escholarship.org/uc/item/6ss5g0wg',
  },
  epa: {
    authors: 'US Environmental Protection Agency',
    year: '2008 / 2012',
    title: 'Reducing Urban Heat Islands: Compendium of Strategies (Cool Pavements, updated 2012; Cool Roofs)',
    venue: 'US EPA (the 2012 Cool Pavements text was not read)',
    url: 'epa.gov/heatislands/heat-island-compendium',
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
    authors: 'US EPA; ENERGY STAR; Lawrence Berkeley National Laboratory',
    year: null,
    title: null,
    venue: 'EPA Cool Roofs compendium with ENERGY STAR / LBNL roof data (new white roof albedo)',
  },
  chicago: {
    authors: 'City of Chicago', year: null, title: 'Chicago energy code, low-slope roof reflectance',
    venue: 'Building code (via the block-2 brief)',
  },
  santamouris: {
    authors: 'Santamouris, M.',
    year: 2014,
    title: 'Cooling the cities – A review of reflective and green roof mitigation technologies to fight heat island and improve comfort in urban environments',
    venue: 'Solar Energy 103, 682–703',
    doi: '10.1016/j.solener.2012.07.003',
  },
  noaaGreen: {
    authors: 'Smalls-Mantey, L. & Montalto, F.',
    year: 2021,
    title: 'The seasonal microclimate trends of a large scale extensive green roof',
    venue: 'Building and Environment 197, 107792 (NOAA Institutional Repository item noaa/57843; Javits Center, New York City)',
    doi: '10.1016/j.buildenv.2021.107792',
  },
  heusinger: {
    authors: 'Heusinger, J. & Weber, S.',
    year: 2017,
    title: 'Surface energy balance of an extensive green roof as quantified by full year eddy-covariance measurements',
    venue: 'Science of the Total Environment 577, 220–230',
    doi: '10.1016/j.scitotenv.2016.10.168',
  },
  li2013: {
    authors: 'Li, H., Harvey, J. T., Holland, T. J. & Kayhanian, M.',
    year: 2013,
    title: 'The use of reflective and permeable pavements as a potential practice for heat island mitigation and stormwater management',
    venue: 'Environmental Research Letters 8(1), 015023 (corrigendum: 8(4), 049501, doi 10.1088/1748-9326/8/4/049501)',
    doi: '10.1088/1748-9326/8/1/015023',
  },
  middel2020: {
    authors: 'Middel, A., Turner, V. K., Schneider, F. A., Zhang, Y. & Stiller, M.',
    year: 2020,
    title: 'Solar reflective pavements—A policy panacea to heat mitigation?',
    venue: 'Environmental Research Letters 15(6), 064016',
    doi: '10.1088/1748-9326/ab87d4',
  },
  ko2022: {
    authors: 'Ko, J., Schlaerth, H., Bruce, A., Sanders, K. & Ban-Weiss, G.',
    year: 2022,
    title: 'Measuring the impacts of a real-world neighborhood-scale cool pavement deployment on albedo and temperatures in Los Angeles',
    venue: 'Environmental Research Letters 17(4), 044027',
    doi: '10.1088/1748-9326/ac58a8',
  },
  mccoll: {
    authors: 'McColl, K. A. et al.',
    year: 2017,
    title: 'Global characterization of surface soil moisture drydowns',
    venue: 'Geophysical Research Letters 44(8), 3682–3690',
    doi: '10.1002/2017GL072819',
  },
  middel2021: {
    authors: 'Middel, A. et al.',
    year: 2021,
    title: '50 Grades of Shade',
    venue: 'Bulletin of the American Meteorological Society 102(9), E1805–E1820',
    doi: '10.1175/BAMS-D-20-0193.1',
  },
  sponge2015: {
    authors: 'General Office of the State Council of China', year: 2015,
    title: 'Guiding Opinions on Promoting Sponge City Construction (国办发〔2015〕75号)',
    venue: 'English notice on gov.cn, 2015-10-16; reprint and MOHURD interpretation',
    url: 'waizi.org.cn/law/6860.html',
  },

  rupar2015: {
    authors: 'Rupar, J. & Graham, M.',
    year: 2015,
    title: 'Long-Term Reflective Performance of Roof Surfaces in the Chicago Area',
    venue: 'ASTM STP1590, 153–205 (abstract only)',
    doi: '10.1520/STP159020150019',
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
    authors: 'Oke, T. R.',
    year: 1981,
    title: 'Canyon geometry and the nocturnal urban heat island: Comparison of scale model and field observations',
    venue: 'Journal of Climatology 1(3), 237–254',
    doi: '10.1002/joc.3370010304',
  },
  theeuwes2014: {
    authors: 'Theeuwes, N. E. et al.',
    year: 2014,
    title: 'Seasonal dependence of the urban heat island on the street canyon aspect ratio',
    venue: 'Quarterly Journal of the Royal Meteorological Society 140(684), 2197–2210',
    doi: '10.1002/qj.2289',
  },
  johansson2006: {
    authors: 'Johansson, E.',
    year: 2006,
    title: 'Influence of urban geometry on outdoor thermal comfort in a hot dry climate: A study in Fez, Morocco',
    venue: 'Building and Environment 41(10), 1326–1338',
    doi: '10.1016/j.buildenv.2005.05.022',
  },
  zhu2018: {
    authors: 'Zhu, J., Jahn, W. & Rein, G.',
    year: 2019,
    title: 'Computer simulation of sunlight concentration due to façade shape: application to the 2013 Death Ray at Fenchurch Street, London',
    venue: 'Journal of Building Performance Simulation 12(4), 378–387 (online 2018)',
    doi: '10.1080/19401493.2018.1538389',
  },
  vdara: {
    authors: 'NBC News; Architectural Record', year: 2010, title: 'Vdara hotel pool-deck hot zone, Las Vegas',
    venue: 'News reports (anecdotal)',
  },
  speroni2022: {
    authors: 'Speroni, A., Mainini, A. G., Zani, A., Paolini, R., Pagnacco, T. & Poli, T.',
    year: 2022,
    title: 'Experimental Assessment of the Reflection of Solar Radiation from Façades of Tall Buildings to the Pedestrian Level',
    venue: 'Sustainability 14(10), 5781 (abstract only)',
    doi: '10.3390/su14105781',
  },
  du2025: {
    authors: 'Du Xinyi, Ouyang Jinlong, Gao Qinglong & Wang Chunyuan (杜欣怡, 欧阳金龙, 高庆龙, 王春元)',
    year: 2025,
    title: '夏季玻璃幕墙热反射对周边环境微气候的影响 (Impact of summer glass curtain walls thermal reflection on microclimate of surrounding environments)',
    venue: 'Journal of Harbin Institute of Technology 57(9), 11–20 (DOI registered with ISTIC)',
    doi: '10.11918/202406062',
  },
  chen2024: {
    authors: 'Chen, C., Wang, J., Zhang, H. et al.',
    year: 2024,
    title: 'Dual impacts of solar-reflective façades in high-density urban areas on building energy use and outdoor thermal environments',
    venue: 'Energy and Buildings 324, 114926',
    doi: '10.1016/j.enbuild.2024.114926',
  },
  sanagar2025: {
    authors: 'Sanagar Darbani, E., Sharifi, E. & Soebarto, V.',
    year: 2025,
    title: 'Exploring the impact of emissivity and orientation of fully glazed facades on urban microclimates',
    venue: 'Developments in the Built Environment 24, 100758',
    doi: '10.1016/j.dibe.2025.100758',
  },
  wallenberg2026: {
    authors: 'Wallenberg, N., Holmer, B., Lindberg, F., Lönn, J., Maesel, E. & Rayner, D.',
    year: 2026,
    title: 'A simple step heating approach for wall surface temperature estimation in the SOlar and LongWave Environmental Irradiance Geometry (SOLWEIG) model',
    venue: 'Geoscientific Model Development 19(3), 1321–1336',
    doi: '10.5194/gmd-19-1321-2026',
  },
  xie2016: {
    authors: 'Xie, M., Liao, J., Wang, T. et al.',
    year: 2016,
    title: 'Modeling of the anthropogenic heat flux and its effect on regional meteorology and air quality over the Yangtze River Delta region, China',
    venue: 'Atmospheric Chemistry and Physics 16(10), 6071–6089',
    doi: '10.5194/acp-16-6071-2016',
  },
  sailor2011: {
    authors: 'Sailor, D. J.',
    year: 2011,
    title: 'A review of methods for estimating anthropogenic heat and moisture emissions in the urban environment',
    venue: 'International Journal of Climatology 31(2), 189–199 (Tokyo figure: Ichinose 1999 via Sailor et al. 2015)',
    doi: '10.1002/joc.2106',
  },

  // ---- block 4 ----
  brief4: {
    authors: 'This project', year: 2026, title: 'Research brief: waterfront and wind corridors (block 4)',
    venue: 'docs/research/waterfront-brief.md', link: 'docs/research/waterfront-brief.md',
  },
  volker2013: {
    authors: 'Völker, S., Baumeister, H., Claßen, T., Hornberg, C. & Kistemann, T.',
    year: 2013,
    title: 'Evidence for the temperature-mitigating capacity of urban blue space – a health geographic perspective',
    venue: 'Erdkunde 67(4), 355–371 (review of 27 studies)',
    doi: '10.3112/erdkunde.2013.04.05',
  },
  hathway2012: {
    authors: 'Hathway, E. A. & Sharples, S.',
    year: 2012,
    title: 'The interaction of rivers and urban form in mitigating the Urban Heat Island effect: A UK case study',
    venue: 'Building and Environment 58, 14–22',
    doi: '10.1016/j.buildenv.2012.06.013',
  },
  steeneveld2014: {
    authors: 'Steeneveld, G. J., Koopmans, S., Heusinkveld, B. G. & Theeuwes, N. E.',
    year: 2014,
    title: 'Refreshing the role of open water surfaces on mitigating the maximum urban heat island effect',
    venue: 'Landscape and Urban Planning 121, 92–96',
    doi: '10.1016/j.landurbplan.2013.09.001',
  },
  theeuwes2013: {
    authors: 'Theeuwes, N. E., Solcerová, A. & Steeneveld, G. J.',
    year: 2013,
    title: 'Modeling the influence of open water surfaces on the summertime temperature and thermal comfort in the city',
    venue: 'Journal of Geophysical Research: Atmospheres 118(16), 8881–8896',
    doi: '10.1002/jgrd.50704',
  },
  jacobs2020: {
    authors: 'Jacobs, C., Klok, L., Bruse, M., Cortesão, J., Lenzholzer, S. & Kluck, J.',
    year: 2020,
    title: 'Are urban water bodies really cooling?',
    venue: 'Urban Climate 32, 100607 (ENVI-met, small Dutch water bodies)',
    doi: '10.1016/j.uclim.2020.100607',
  },
  cheonggyecheon: {
    authors: 'Tokyo Metropolitan University repository; AMS conference abstract', year: null,
    title: 'Cheonggyecheon stream restoration, Seoul: air-temperature effect', venue: 'Repository item and abstract',
  },
  ota: {
    authors: 'Murakawa, S., Sekine, T., Narita, K., Nishina, D. & Senda, K.',
    year: 1990,
    title: 'Study on the effect of river on thermal environment in urban area: Part 2',
    venue: 'Journal of Architecture, Planning and Environmental Engineering (Transactions of AIJ) 415, 9–19 (the 150–500 m inland figure was not found in the abstract)',
    doi: '10.3130/aijax.415.0_9',
  },
  corridor: {
    authors: 'Chinese planning criteria; Givoni; Ren et al. (2018, CUHK, not identified); Shen, X., Liu, H., Yang, X., Zhou, X., An, J. & Yan, D.',
    year: 2024,
    title: 'A Data-Mining-Based Novel Approach to Analyze the Impact of the Characteristics of Urban Ventilation Corridors on Cooling Effect (the citing paper)',
    venue: 'Buildings 14(2), 348 (corridor orientation criteria quoted there and via Ren et al. 2018)',
    doi: '10.3390/buildings14020348',
  },
  oke1988: {
    authors: 'Oke, T. R.',
    year: 1988,
    title: 'Street design and urban canopy layer climate',
    venue: 'Energy and Buildings 11(1–3), 103–113',
    doi: '10.1016/0378-7788(88)90026-6',
  },
  wake: {
    authors: 'Chen, K., Mo, Z. & Hang, J.',
    year: 2024,
    title: 'The recirculation flow after different cross-section shaped high-rise buildings with applications to ventilation assessment and drag parameterization',
    venue: 'Building Simulation 17(4), 509–524',
    doi: '10.1007/s12273-024-1103-z',
  },
  solcerova2019: {
    authors: 'Solcerova, A., van de Ven, F. & van de Giesen, N.',
    year: 2019,
    title: 'Nighttime Cooling of an Urban Pond',
    venue: 'Frontiers in Earth Science 7, 156',
    doi: '10.3389/feart.2019.00156',
  },
  webb2008: {
    authors: 'Webb, B. W., Hannah, D. M., Moore, R. D., Brown, L. E. & Nobilis, F.',
    year: 2008,
    title: 'Recent advances in stream and river temperature research',
    venue: 'Hydrological Processes 22(7), 902–918',
    doi: '10.1002/hyp.6994',
  },
  steadman1994: {
    authors: 'Steadman, R. G.',
    year: 1994,
    title: 'Norms of apparent temperature in Australia',
    venue: 'Australian Meteorological Magazine 43(1), 1–16',
    doi: '10.1071/ES94001',
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
  },  // ---- block 6 ----
  brief6: {
    authors: 'This project', year: 2026, title: 'Research brief: open-air parking lot / industrial brownfield (block 6)',
    venue: 'docs/research/parking-brief.md', link: 'docs/research/parking-brief.md',
  },
  golden2007: {
    authors: 'Golden, J. S. et al.', year: 2007,
    title: 'A comparative study of the thermal and radiative impacts of photovoltaic canopies on pavement surface temperatures',
    venue: 'Solar Energy 81, 872 (Phoenix, 17 June 2004)',
    doi: '10.1016/j.solener.2006.11.007',
  },
  stempihar2012: {
    authors: 'Stempihar, J. J. et al.', year: 2012,
    title: 'Porous asphalt pavement temperature effects for urban heat island analysis',
    venue: 'Transportation Research Record 2293',
    doi: '10.3141/2293-15',
  },
  takebayashi2009: {
    authors: 'Takebayashi, H. & Moriyama, M.', year: 2009,
    title: 'Study on the urban heat island mitigation effect achieved by converting to grass-covered parking',
    venue: 'Solar Energy 83, 1211',
    doi: '10.1016/j.solener.2009.01.019',
  },
  asaeda1996: {
    authors: 'Asaeda, T., Ca, V. T. & Wake, A.', year: 1996,
    title: 'Heat storage of pavement and its effect on the lower atmosphere',
    venue: 'Atmospheric Environment 30(3), 413–427',
  },
  zhu2022: {
    authors: 'Zhu et al.', year: 2022, title: null,
    venue: 'Frontiers in Environmental Science 9 (ECOSTRESS surface temperatures in Phoenix)',
    doi: '10.3389/fenvs.2021.795474',
  },
  hoehne2020: {
    authors: 'Hoehne, C. G. et al.', year: '2020 / 2022', title: null,
    venue: 'Sustainable and Resilient Infrastructure (pavement and vehicle heat in Phoenix; snippet only)',
    doi: '10.1080/23789689.2020.1773013',
  },
  matias2025: {
    authors: 'Matias et al.', year: 2025, title: null,
    venue: 'Parked cars and street heat in Lisbon (abstract and press; via the block-6 brief)',
  },
  levinson2011: {
    authors: 'Levinson, R. et al.', year: 2011,
    title: 'Potential benefits of solar reflective car shells: cooler cabins, fuel savings and emission reductions',
    venue: 'Applied Energy 88',
    doi: '10.1016/j.apenergy.2011.05.006',
  },
  vanos2018: {
    authors: 'Vanos, J. K. et al.', year: 2018,
    title: 'Evaluating the impact of solar radiation on pediatric heat balance within enclosed, hot vehicles',
    venue: 'Temperature 5 (Tempe, Arizona)',
    doi: '10.1080/23328940.2018.1468205',
  },
  mclaren2005: {
    authors: 'McLaren, C., Null, J. & Quinn, J.', year: 2005,
    title: 'Heat stress from enclosed vehicles: moderate ambient temperatures cause significant temperature rise in enclosed vehicles',
    venue: 'Pediatrics 116 (PMID 15995010)',
  },
  nsc: {
    authors: 'US National Safety Council', year: null, title: null,
    venue: 'Child hot-car death statistics (web; via the block-6 brief)',
  },
  scott1999: {
    authors: 'Scott, K. I., Simpson, J. R. & McPherson, E. G.', year: 1999,
    title: 'Effects of tree cover on parking lot microclimate and vehicle emissions',
    venue: 'Journal of Arboriculture 25, 129',
  },
  onishi2010: {
    authors: 'Onishi, A. et al.', year: 2010,
    title: 'Evaluating the potential for urban heat-island mitigation by greening parking lots',
    venue: 'Urban Forestry & Urban Greening 9',
    doi: '10.1016/j.ufug.2010.06.002',
  },
  optris: {
    authors: 'Optris; Fluke', year: null, title: null,
    venue: 'Emissivity tables for infrared thermometers (web; via the block-6 brief)',
  },
  // ---- block 7 ----
  brief7: {
    authors: 'This project', year: 2026, title: 'Research brief: older high-rise residential estate (block 7)',
    venue: 'docs/research/estate-brief.md', link: 'docs/research/estate-brief.md',
  },
  gb50180: {
    authors: 'Ministry of Housing and Urban-Rural Development of China', year: 2018,
    title: '城市居住区规划设计标准 (Standard for urban residential area planning and design), GB 50180-2018',
    venue: 'National standard, issued 2018-07-10, in force 2018-12-01; clause 4.0.9 / Table 4.0.9 (via codeofchina, via the block-7 brief)',
    flags: ['title from memory'],
  },
  db33: {
    authors: 'Zhejiang Province', year: null,
    title: '城市建筑工程日照分析技术规程 (Technical specification for sunlight analysis of urban building projects), DB33/1050, draft revision',
    venue: 'Zhejiang provincial standard (draft; via the block-7 brief)',
    flags: ['title from memory'],
  },
  gb55038: {
    authors: 'Ministry of Housing and Urban-Rural Development of China', year: 2025, title: null,
    venue: 'GB 55038-2025, mandatory national code in force 2025-05-01 (via the block-7 brief)',
  },
  mu2025: {
    authors: 'Mu et al.', year: 2025, title: null,
    venue: 'Atmosphere 16(1), 100 (Changsha)',
    doi: '10.3390/atmos16010100',
  },
  chow1999: {
    authors: 'Chow, T. T. & Lin, Z.', year: 1999,
    title: 'Prediction of on-coil temperature of condensers installed at tall building re-entrant',
    venue: 'Applied Thermal Engineering 19(2), 117–132',
    flags: ['title from memory'],
  },
  bojic2001: {
    authors: 'Bojic, M., Lee, M. & Yik, F.', year: 2001,
    title: 'Flow and temperature outside a high-rise residential building due to heat rejection by its air-conditioners',
    venue: 'Energy and Buildings 33(7), 737–751',
    flags: ['title from memory'],
  },
  bruelisauer2014: {
    authors: 'Bruelisauer, M., Meggers, F., Saber, E., Li, C. & Leibundgut, H.', year: 2014,
    title: 'Stuck in a stack: temperature measurements of the microclimate around split type condensing units in a high rise building in Singapore',
    venue: 'Energy and Buildings 71, 28–37',
    flags: ['title from memory'],
  },
  demunck2013: {
    authors: 'de Munck, C. et al.', year: 2013,
    title: 'How much can air conditioning increase air temperatures for a city like Paris, France?',
    venue: 'International Journal of Climatology 33(1), 210–227',
    flags: ['title from memory'],
  },
  berlin2020: {
    authors: null, year: 2020, title: null,
    venue: 'International Journal of Environmental Research and Public Health 17(13), 4645 (Berlin)',
    doi: '10.3390/ijerph17134645',
  },
  lai2017: {
    authors: 'Lai, A., Maing, M. & Ng, E.', year: 2017,
    title: 'Observational studies of mean radiant temperature across different outdoor spaces under shaded conditions in densely built environment',
    venue: 'Building and Environment 114, 397–409',
    doi: '10.1016/j.buildenv.2016.12.034',
  },
  plea2016: {
    authors: 'Lai, A., Maing, M. & Ng, E.', year: 2016,
    title: 'Feasibility study on using sunlit view factor to model outdoor thermal comfort: a case study in Sha Tin, Hong Kong',
    venue: 'PLEA 2016 Los Angeles: Cities, Buildings, People: Towards Regenerative Environments, 11–13 July 2016',
  },
  li2023: {
    authors: 'Li et al.', year: 2023, title: null,
    venue: 'Building and Environment (Hong Kong)',
    doi: '10.1016/j.buildenv.2023.110225',
  },
  yang2010: {
    authors: 'Yang, F., Lau, S. S. Y. & Qian, F.', year: 2010,
    title: 'Summertime heat island intensities in three high-rise housing quarters in inner-city Shanghai China: building layout, density and greenery',
    venue: 'Building and Environment 45(1), 115–134',
    flags: ['title from memory'],
  },
  cai2017: {
    authors: 'Cai, A. & Hu, D.', year: 2017,
    title: 'Study on the correlations between surface temperature and near-surface air temperature on different underlying surfaces in city of Wuhan, China',
    venue: 'International Journal of Environmental Science and Development 8(5), 378–384',
    doi: '10.18178/ijesd.2017.8.5.981',
  },
  brief8: {
    authors: 'This project', year: 2026, title: 'Research brief: school campus playground (block 8)',
    venue: 'docs/research/campus-brief.md', link: 'docs/research/campus-brief.md',
  },
  jim2016: {
    authors: 'Jim, C. Y.', year: 2016,
    title: 'Solar–terrestrial radiant-energy regimes and temperature anomalies of natural and artificial turfs',
    venue: 'Applied Energy 173, 520–534',
    flags: ['title from memory'],
  },
  jim2017: {
    authors: 'Jim, C. Y.', year: 2017, title: null,
    venue: 'Landscape and Urban Planning 157, 561 (artificial turf, Hong Kong)',
  },
  singh2024: {
    authors: 'Singh et al.', year: 2024, title: null,
    venue: 'International Journal of Biometeorology (systematic review, 23 studies)',
    doi: '10.1007/s00484-024-02679-5',
  },
  nydoh: {
    authors: 'New York State Department of Health', year: null,
    title: 'Crumb-rubber infilled synthetic turf athletic fields',
    venue: 'Fact sheet (quotes Brigham Young University 2002 and Penn State measurements)',
    flags: ['title from memory'],
  },
  mcnitt2008: {
    authors: 'McNitt, A. S., Petrunak, D. M. & Serensits, T. J.', year: 2008,
    title: 'Temperature amelioration of synthetic turf surfaces through irrigation',
    venue: 'Acta Horticulturae 783, 573–582',
    flags: ['title from memory'],
  },
  pfautsch2020: {
    authors: 'Pfautsch, S. et al.', year: 2020, title: null,
    venue: 'Western Sydney University, school microclimate report for New South Wales',
  },
  vanos2016: {
    authors: 'Vanos, J. K., Middel, A., McKercher, G. R., Kuras, E. R. & Ruddell, B. L.', year: 2016,
    title: 'Hot playgrounds and children\'s health: a multiscale analysis of surface temperatures in Arizona, USA',
    venue: 'Landscape and Urban Planning 146, 29–42',
    doi: '10.1016/j.landurbplan.2015.10.007',
    flags: ['title from memory'],
  },
  vanos2017: {
    authors: 'Vanos, J. K., Herdt, A. J. & Lochbaum, M. R.', year: 2017,
    title: 'Effects of physical activity and shade on the heat balance and thermal perceptions of children in a playground microclimate',
    venue: 'Building and Environment 126, 119–131',
    flags: ['title from memory'],
  },
  vanos2015: {
    authors: 'Vanos, J. K.', year: 2015,
    title: 'Children\'s health and vulnerability in outdoor microclimates: a comprehensive review',
    venue: 'Environment International 76, 1–15',
    flags: ['title from memory'],
  },
  paolini: {
    authors: 'Paolini et al.', year: null, title: null,
    venue: 'ICUC12 (12th International Conference on Urban Climate), extended abstract 249',
  },
  kinmen: {
    authors: null, year: null, title: null,
    venue: 'School GLOBE report, Kinmen (running-track surface temperatures)',
  },
  aoki2004: {
    authors: 'Aoki', year: 2004, title: null,
    venue: 'Running track and artificial turf surface temperatures (via the block-8 brief)',
  },
  courtVendor: {
    authors: 'CoolTop; Laykold', year: null, title: null,
    venue: 'Acrylic court coating product information (vendor claims)',
  },
  iso13732: {
    authors: 'ISO', year: 2006,
    title: 'ISO 13732-1: Ergonomics of the thermal environment — Methods for the assessment of human responses to contact with surfaces — Part 1: Hot surfaces',
    venue: 'International standard; values via CENELEC Guide 29 (Temperatures of hot surfaces likely to be touched), Table A.1',
    flags: ['title from memory'],
  },
  vanosPress: {
    authors: null, year: null, title: null,
    venue: 'Press coverage of Vanos\'s playground studies (skin-burn times; standard not named)',
  },
};
