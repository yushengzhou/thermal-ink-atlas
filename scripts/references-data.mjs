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
    authors: 'Hendel, M., Colombert, M., Diab, Y. & Royon, L.', year: 2015,
    title: 'Measurement of the cooling efficiency of pavement-watering as an urban heat island mitigation technique',
    venue: 'Journal of Sustainable Development of Energy, Water and Environment Systems 3(1), 1–11 (watering the Rue du Louvre, Paris)',
    doi: '10.13044/j.sdewes.2015.03.0001',
  },
  hendel2016: {
    authors: 'Hendel, M., Gutierrez, P., Colombert, M., Diab, Y. & Royon, L.', year: 2016,
    title: 'Measuring the effects of urban heat island mitigation techniques in the field: Application to the case of pavement-watering in Paris',
    venue: 'Urban Climate 16, 43–58',
    doi: '10.1016/j.uclim.2016.02.003',
  },
  takebayashi2023: {
    authors: 'Takebayashi, H., Mori, H. & Tozawa, U.', year: 2023,
    title: 'Study on an effective roadway watering scheme for mitigating pedestrian thermal comfort according to the street configuration',
    venue: 'Atmosphere 14(6), 1014 (road watering in Kobe)',
    doi: '10.3390/atmos14061014',
  },
  kato2008: {
    authors: 'Kato, S. et al.', year: 2008,
    title: null,
    venue: 'Watered road surface temperatures (via the block-5 brief; a possible match, not confirmed: Kato, Tebakari, Tsuchiya & Yamada (2008) Mitigation effects of thermal environment by watering, Proc. Hydraulic Engineering (JSCE) 52, 277–282, doi 10.2208/prohe.52.277)',
  },
  nippon: {
    authors: 'nippon.com', year: null, title: null,
    venue: 'Feature on uchimizu, sprinkling water in summer (web; via the block-5 brief)',
  },
  lin2019: {
    authors: 'Lin, Y., Jin, Y. & Jin, H.', year: 2019,
    title: 'Field study on the microclimate of public spaces in traditional residential areas in a severe cold region of China',
    venue: 'International Journal of Environmental Research and Public Health 16(16), 2986 (traditional block in Harbin)',
    doi: '10.3390/ijerph16162986',
  },
  spainCourtyard: {
    authors: 'Several authors', year: null, title: null,
    venue: 'MDPI Proceedings 2(22) 1390 and 1381; 38(1) 17 (courtyards in Córdoba and Seville; abstracts only)',
  },
  yang2024: {
    authors: 'Yang Wenmin & Wang Meixian (杨文敏, 王美仙)', year: 2024,
    title: '北京7种行道树夏季对行人热舒适的影响研究 (Influence of 7 street tree species on thermal comfort of pedestrians in summer in Beijing)',
    venue: 'Journal of Beijing Forestry University (volume and pages not shown on the journal page)',
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
    authors: 'Takahashi, K.', year: 1985,
    title: 'Optimum leaf area index in \'Delaware\' grape vines',
    venue: 'Journal of the Japanese Society for Horticultural Science 54(3), 293–300 (on the LAI best for grape yield and quality, not for shade)',
    doi: '10.2503/jjshs.54.293',
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
    authors: 'Golden, J. S., Carlson, J., Kaloush, K. E. & Phelan, P.', year: 2007,
    title: 'A comparative study of the thermal and radiative impacts of photovoltaic canopies on pavement surface temperatures',
    venue: 'Solar Energy 81(7), 872–883 (Phoenix, 17 June 2004)',
    doi: '10.1016/j.solener.2006.11.007',
  },
  stempihar2012: {
    authors: 'Stempihar, J. J., Pourshams-Manzouri, T., Kaloush, K. E. & Rodezno, M. C.', year: 2012,
    title: 'Porous asphalt pavement temperature effects for urban heat island analysis',
    venue: 'Transportation Research Record 2293, 123–130',
    doi: '10.3141/2293-15',
  },
  takebayashi2009: {
    authors: 'Takebayashi, H. & Moriyama, M.', year: 2009,
    title: 'Study on the urban heat island mitigation effect achieved by converting to grass-covered parking',
    venue: 'Solar Energy 83(8), 1211–1223',
    doi: '10.1016/j.solener.2009.01.019',
  },
  asaeda1996: {
    authors: 'Asaeda, T., Ca, V. T. & Wake, A.', year: 1996,
    title: 'Heat storage of pavement and its effect on the lower atmosphere',
    venue: 'Atmospheric Environment 30(3), 413–427',
    doi: '10.1016/1352-2310(94)00140-5',
  },
  zhu2022: {
    authors: 'Zhu, Y., Myint, S. W., Schaffer-Smith, D., Muenich, R. L., Tong, D. & Li, Y.', year: 2022,
    title: 'Formulating operational mitigation options and examining intra-urban social inequality using evidence-based urban warming effects',
    venue: 'Frontiers in Environmental Science 9, 795474 (ECOSTRESS surface temperatures in Phoenix)',
    doi: '10.3389/fenvs.2021.795474',
  },
  hoehne2020: {
    authors: 'Hoehne, C. G., Chester, M. V., Sailor, D. J. & King, D. A.', year: '2022 (online 2020)',
    title: 'Urban heat implications from parking, roads, and cars: a case study of metro Phoenix',
    venue: 'Sustainable and Resilient Infrastructure 7(4), 272–290',
    doi: '10.1080/23789689.2020.1773013',
  },
  matias2025: {
    authors: 'Matias, M., Mills, G., Silva, T., Girotti, C. & Lopes, A.', year: 2025,
    title: 'The underestimated impact of parked cars in urban warming',
    venue: 'City and Environment Interactions 28, 100232 (Lisbon; the 71 °C black-roof figure is from a later paper by the same group, listed as matias2026)',
    doi: '10.1016/j.cacint.2025.100232',
  },
  matias2026: {
    authors: 'Matias, M., Silva, T., Mills, G. & Lopes, A.', year: 2026,
    title: 'Recognising vehicles as thermally active surfaces…',
    venue: 'Discover Environment 4, 93 (title shortened as in the reference check; the paper not read)',
    doi: '10.1007/s44274-026-00593-8',
  },
  levinson2011: {
    authors: 'Levinson, R., Pan, H., Ban-Weiss, G., Rosado, P., Paolini, R. & Akbari, H.', year: 2011,
    title: 'Potential benefits of solar reflective car shells: cooler cabins, fuel savings and emission reductions',
    venue: 'Applied Energy 88(12), 4343–4357',
    doi: '10.1016/j.apenergy.2011.05.006',
  },
  vanos2018: {
    authors: 'Vanos, J. K., Middel, A., Poletti, M. N. & Selover, N. J.', year: 2018,
    title: 'Evaluating the impact of solar radiation on pediatric heat balance within enclosed, hot vehicles',
    venue: 'Temperature 5(3), 276–292 (Tempe, Arizona)',
    doi: '10.1080/23328940.2018.1468205',
  },
  mclaren2005: {
    authors: 'McLaren, C., Null, J. & Quinn, J.', year: 2005,
    title: 'Heat stress from enclosed vehicles: moderate ambient temperatures cause significant temperature rise in enclosed vehicles',
    venue: 'Pediatrics 116(1), e109–e112 (PMID 15995010)',
    doi: '10.1542/peds.2004-2368',
  },
  nsc: {
    authors: 'US National Safety Council', year: null, title: null,
    venue: 'Child hot-car death statistics (web; via the block-6 brief)',
  },
  scott1999: {
    authors: 'Scott, K. I., Simpson, J. R. & McPherson, E. G.', year: 1999,
    title: 'Effects of tree cover on parking lot microclimate and vehicle emissions',
    venue: 'Journal of Arboriculture 25(3), 129–142',
    doi: '10.48044/jauf.1999.019',
  },
  onishi2010: {
    authors: 'Onishi, A., Cao, X., Ito, T., Shi, F. & Imura, H.', year: 2010,
    title: 'Evaluating the potential for urban heat-island mitigation by greening parking lots',
    venue: 'Urban Forestry & Urban Greening 9(4), 323–332',
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
    authors: 'Ministry of Housing and Urban-Rural Development of China; State Administration for Market Regulation', year: 2018,
    title: '城市居住区规划设计标准 (Standard for urban residential area planning and design), GB 50180-2018',
    venue: 'National standard, issued 2018-07-10, in force 2018-12-01, replaces GB 50180-93; clause 4.0.9 / Table 4.0.9 (via codeofchina, via the block-7 brief)',
  },
  db33: {
    authors: 'Zhejiang Province', year: 2016,
    title: '浙江省工程建设标准 城市建筑工程日照分析技术规程 (Technical specification for sunlight analysis of urban building projects), DB33/1050-2016',
    venue: 'Zhejiang provincial standard, in force 2016-06-01 (date per gongbiaoku). The parameters used here were read in its pre-2016 draft (DB33/1050—20xx, revising DB33/1050-2008, via the block-7 brief) and not checked in the 2016 text',
    flags: ['unverified'],
  },
  gb55038: {
    authors: 'Ministry of Housing and Urban-Rural Development of China', year: 2025,
    title: '住宅项目规范 (Project code for residential buildings), GB 55038-2025',
    venue: 'Mandatory national code, in force 2025-05-01, replaces GB 50368-2005 (via the block-7 brief)',
  },
  mu2025: {
    authors: 'Mu, K., Suo, Q., Ding, F., Jiang, C., Zhang, X. & Ye, J.', year: 2025,
    title: 'Field measurements of building air-conditioning heat rejection and the thermal environment in urban areas',
    venue: 'Atmosphere 16(1), 100 (Changsha)',
    doi: '10.3390/atmos16010100',
  },
  chow1999: {
    authors: 'Chow, T. T. & Lin, Z.', year: 1999,
    title: 'Prediction of on-coil temperature of condensers installed at tall building re-entrant',
    venue: 'Applied Thermal Engineering 19(2), 117–132',
    doi: '10.1016/S1359-4311(98)00042-8',
  },
  bojic2001: {
    authors: 'Bojic, M., Lee, M. & Yik, F.', year: 2001,
    title: 'Flow and temperatures outside a high-rise residential building due to heat rejection by its air-conditioners',
    venue: 'Energy and Buildings 33(7), 737–751 (window-type units in recessed spaces, Hong Kong public housing)',
    doi: '10.1016/S0378-7788(01)00061-5',
  },
  bruelisauer2014: {
    authors: 'Bruelisauer, M., Meggers, F., Saber, E., Li, C. & Leibundgut, H.', year: 2014,
    title: 'Stuck in a stack—Temperature measurements of the microclimate around split type condensing units in a high rise building in Singapore',
    venue: 'Energy and Buildings 71, 28–37',
    doi: '10.1016/j.enbuild.2013.11.056',
  },
  demunck2013: {
    authors: 'de Munck, C., Pigeon, G., Masson, V., Meunier, F., Bousquet, P., Tréméac, B., Merchat, M., Poeuf, P. & Marchadier, C.', year: '2013 (online 2012)',
    title: 'How much can air conditioning increase air temperatures for a city like Paris, France?',
    venue: 'International Journal of Climatology 33(1), 210–227',
    doi: '10.1002/joc.3415',
  },
  berlin2020: {
    authors: 'Jin, L., Schubert, S., Hefny Salim, M. & Schneider, C.', year: 2020,
    title: 'Impact of air conditioning systems on the outdoor thermal environment during summer in Berlin, Germany',
    venue: 'International Journal of Environmental Research and Public Health 17(13), 4645',
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
    venue: 'PLEA 2016 Los Angeles: Cities, Buildings, People: Towards Regenerative Environments, 11–13 July 2016 (pp. 1325–1330 per the HKU record, unverified)',
  },
  li2023: {
    authors: 'Li, Y., Ouyang, W., Yin, S., Tan, Z. & Ren, C.', year: 2023,
    title: 'Microclimate and its influencing factors in residential public spaces during heat waves: an empirical study in Hong Kong',
    venue: 'Building and Environment 236, 110225',
    doi: '10.1016/j.buildenv.2023.110225',
  },
  yang2010: {
    authors: 'Yang, F., Lau, S. S. Y. & Qian, F.', year: 2010,
    title: 'Summertime heat island intensities in three high-rise housing quarters in inner-city Shanghai China: building layout, density and greenery',
    venue: 'Building and Environment 45(1), 115–134',
    doi: '10.1016/j.buildenv.2009.05.010',
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
    doi: '10.1016/j.apenergy.2016.04.072',
  },
  jim2017: {
    authors: 'Jim, C. Y.', year: 2017,
    title: 'Intense summer heat fluxes in artificial turf harm people and environment',
    venue: 'Landscape and Urban Planning 157, 561–576 (artificial turf, Hong Kong)',
    doi: '10.1016/j.landurbplan.2016.09.012',
  },
  singh2024: {
    authors: 'Singh, G., Peterson, B., Jay, O. & Stevens, C. J.', year: 2024,
    title: 'The effect of synthetic grass sports surfaces on the thermal environment: a systematic review',
    venue: 'International Journal of Biometeorology 68(7), 1235–1252 (systematic review, 23 studies)',
    doi: '10.1007/s00484-024-02679-5',
  },
  nydoh: {
    authors: 'New York State Department of Health', year: 2018,
    title: 'Information About Crumb-Rubber Infilled Synthetic Turf Athletic Fields',
    venue: 'Fact sheet, revised October 2018 (quotes Brigham Young University 2002 and Penn State measurements)',
  },
  mcnitt2008: {
    authors: 'McNitt, A. S., Petrunak, D. M. & Serensits, T. J.', year: 2008,
    title: 'Temperature amelioration of synthetic turf surfaces through irrigation',
    venue: 'Acta Horticulturae 783, 573–582',
    doi: '10.17660/ActaHortic.2008.783.59',
  },
  pfautsch2020: {
    authors: 'Pfautsch, S., Rouillard, S., Wujeska-Klause, A., Bae, A., Vu, L., Manea, A., Tabassum, S., Staas, L., Ossola, A., Holmes, K. & Leishman, M.', year: 2020,
    title: 'School Microclimates',
    venue: 'Western Sydney University, 56 pp. (report for New South Wales schools)',
    doi: '10.26183/np86-t866',
  },
  vanos2016: {
    authors: 'Vanos, J. K., Middel, A., McKercher, G. R., Kuras, E. R. & Ruddell, B. L.', year: 2016,
    title: 'Hot playgrounds and children\'s health: a multiscale analysis of surface temperatures in Arizona, USA',
    venue: 'Landscape and Urban Planning 146, 29–42',
    doi: '10.1016/j.landurbplan.2015.10.007',
  },
  vanos2017: {
    authors: 'Vanos, J. K., Herdt, A. J. & Lochbaum, M. R.', year: 2017,
    title: 'Effects of physical activity and shade on the heat balance and thermal perceptions of children in a playground microclimate',
    venue: 'Building and Environment 126, 119–131',
    doi: '10.1016/j.buildenv.2017.09.026',
  },
  vanos2015: {
    authors: 'Vanos, J. K.', year: 2015,
    title: 'Children\'s health and vulnerability in outdoor microclimates: a comprehensive review',
    venue: 'Environment International 76, 1–15',
    doi: '10.1016/j.envint.2014.11.016',
  },
  paolini: {
    authors: 'Paolini, R., Parchami, Nazarian, N. & Hart, M.', year: 2025,
    title: 'MaRTy for kids: adapting biomet equipment to capture the heat exposure of children',
    venue: 'ICUC12 (12th International Conference on Urban Climate), abstract ICUC12-249',
    url: 'meetingorganizer.copernicus.org/ICUC12/ICUC12-249.html',
  },
  kinmen: {
    authors: 'National Kinmen Senior High School', year: null,
    title: 'Observation of surface temperature at Kinmen Senior High School',
    venue: 'GLOBE student research report (globe.gov)',
  },
  aoki2009: {
    authors: 'Aoki, T.', year: 2009,
    title: 'Effect of solar illuminance and albedo on surface temperature of outdoor sport surfaces',
    venue: '自然と環境 (Nature and its Environment) 11, 40–48 (Biwako Seikei Sport College repository, record 2776; measured 11 August 2004). Related: Aoki (2005) Bulletin of Biwako Seikei Sport College 4, 105–111',
  },
  courtVendor: {
    authors: 'CoolTop; Laykold', year: null, title: null,
    venue: 'Acrylic court coating product information (vendor claims)',
  },
  iso13732: {
    authors: 'ISO', year: 2006,
    title: 'ISO 13732-1:2006 Ergonomics of the thermal environment — Methods for the assessment of human responses to contact with surfaces — Part 1: Hot surfaces',
    venue: 'International standard (ed. 1, 2006-09; confirmed 2022); values via CENELEC Guide 29 (ed. 1, April 2007), Temperatures of hot surfaces likely to be touched, Table A.1',
  },
  vanosPress: {
    authors: null, year: null, title: null,
    venue: 'Press coverage of Vanos\'s playground studies (skin-burn times; standard not named)',
  },
  // ---- block 9: bus stops and footbridges ----
  brief9: {
    authors: 'This project', year: 2026, title: 'Research brief: arterial with bus stops and footbridge — shade for people waiting (block 9)',
    venue: 'docs/research/busstop-brief.md', link: 'docs/research/busstop-brief.md',
  },
  dzyuban2022: {
    authors: 'Dzyuban, Y., Hondula, D. M., Coseo, P. J. & Redman, C. L.', year: '2022 (online 2021)',
    title: 'Public transit infrastructure and heat perceptions in hot and dry climates',
    venue: 'International Journal of Biometeorology 66(2), 345–356',
    doi: '10.1007/s00484-021-02074-4',
  },
  lanza2025: {
    authors: 'Lanza, K., Ernst, S., Watkins, K. & Chen, B.', year: 2025,
    title: 'Heat stress mitigation by trees and shelters at bus stops',
    venue: 'Transportation Research Part D: Transport and Environment 140, 104653 (Houston bus stops)',
    doi: '10.1016/j.trd.2025.104653',
  },
  chenWalk2024: {
    authors: 'Chen, L., Mak, C. M., Hang, J. & Dai, Y.', year: 2024,
    title: 'Influence of elevated walkways on outdoor thermal comfort in hot-humid climates based on on-site measurement and CFD modeling',
    venue: 'Sustainable Cities and Society 100, 105048 (an elevated walkway in Hong Kong)',
    doi: '10.1016/j.scs.2023.105048',
  },
  hyd047: {
    authors: 'Highways Department, Hong Kong SAR Government', year: 2018,
    title: 'Guidance Notes on Design of Covers for Walkways and Passenger Shelters',
    venue: 'BS/GN/047, Bridges & Structures Division, November 2018',
  },
  brettMartin: {
    authors: 'Brett Martin', year: null, title: null,
    venue: 'Polycarbonate sheet datasheet, 10 mm twinwall (via the block-9 brief)',
  },
  asuFilm: {
    authors: 'Arizona State University', year: null, title: null,
    venue: 'Radiative-cooling film on a bus shelter roof (not peer reviewed; via the block-9 brief)',
  },
  sgWalkway: {
    authors: null, year: null, title: null,
    venue: 'Singapore covered walkways, heat stress (secondary; via the block-9 brief)',
  },
  ucla: {
    authors: 'UCLA', year: null, title: null,
    venue: 'Study of shelters at Los Angeles Metro bus stops (via the block-9 brief)',
  },
  fan2002: {
    authors: 'Salek, M.-D. & Machemehl, R. B.', year: 1999,
    title: 'Characterizing Bus Transit Passenger Wait Times',
    venue: 'Report SWUTC/99/167211-1, Southwest Region University Transportation Center, Center for Transportation Research, University of Texas at Austin (rosap.ntl.bts.gov/view/dot/40714). The block-9 brief cited "Fan & Machemehl (2002)" with this title; no such SWUTC report was found, so the report that carries the title is cited instead; the 2002 paper (reportedly a conference paper) was not checked',
    url: 'rosap.ntl.bts.gov/view/dot/40714',
  },
  fraser2017: {
    authors: 'Fraser, A. M. & Chester, M. V.', year: 2017,
    title: 'Transit system design and vulnerability of riders to heat',
    venue: 'Journal of Transport & Health 4, 216–225',
    doi: '10.1016/j.jth.2016.07.005',
  },
  liu2025: {
    authors: 'Liu, L., Li, X., Pereira, R. H. M. & Yan, X.', year: 2025,
    title: 'Measuring exposure to extreme heat in public transit systems',
    venue: 'Journal of Transport Geography 128, 104383',
    doi: '10.1016/j.jtrangeo.2025.104383',
  },
  cpsc: {
    authors: 'US Consumer Product Safety Commission', year: null, title: null,
    venue: 'Safety guidance on hot metal surfaces (via the block-9 brief)',
  },
  deckSteel: {
    authors: 'Mao, R., Gu, X., Jiang, J., Zhang, Z. & Lei, K.', year: 2025,
    title: 'Thermal field and high-temperature performance of epoxy resin system steel bridge deck pavement',
    venue: 'Materials 18(13), 3109 (a finite-element model of extreme conditions with laboratory tests at 70 °C)',
    doi: '10.3390/ma18133109',
  },
  lasVegas: {
    authors: null, year: null, title: null,
    venue: 'Las Vegas surface temperature measurements (via the block-9 brief)',
  },

  // ---- block 10 ----
  brief10: {
    authors: 'This project', year: 2026, title: 'Research brief: urban village and informal settlement — heat vulnerability (block 10)',
    venue: 'docs/research/village-brief.md', link: 'docs/research/village-brief.md',
  },
  pingshan: {
    authors: 'Guo Qiuping, Zou Zhendong, Li Hongyong & Qiu Guoyu', year: null,
    title: 'Analysis on the thermal environment of urban village in Shenzhen',
    venue: 'Journal and year not found (fieldwork November 2011 to October 2012, Pingshan, Shenzhen; via the block-10 brief)',
  },
  wu2015: {
    authors: 'Wu Changguang, Xia Lili, Lin Yaoyu, Wang Yaowu, Gong Yongxi & Zhang Wenmin (吴昌广 等)', year: 2015,
    title: '深圳市典型住区热环境特征及其影响因子分析 (Analysis on characteristics of thermal environments in typical residential districts and its influencing factors in Shenzhen)',
    venue: 'Journal of Harbin Institute of Technology 47(6), 59–62',
    doi: '10.11918/j.issn.0367-6234.2015.06.011',
  },
  yi2022: {
    authors: 'Yi, Wang, Liu, Li et al.', year: 2022,
    title: 'Thermal comfort differences between urban villages and formal settlements in Chinese developing cities: A case study in Shenzhen',
    venue: 'Science of The Total Environment 853, 158283',
    doi: '10.1016/j.scitotenv.2022.158283',
  },
  deng2023: {
    authors: 'Deng, Nie, Li, Wu et al.', year: 2023,
    title: 'Influence of built environment on outdoor thermal comfort: A comparative study of new and old urban blocks in Guangzhou',
    venue: 'Building and Environment 234, 110133',
    doi: '10.1016/j.buildenv.2023.110133',
  },
  scott2017: {
    authors: 'Scott, Misiani, Okoth, Jordan et al.', year: 2017,
    title: 'Temperature and heat in informal settlements in Nairobi',
    venue: 'PLOS ONE 12(11), e0187300',
    doi: '10.1371/journal.pone.0187300',
  },
  tasgaonkar2022: {
    authors: 'Tasgaonkar, Zade, Ehsan, Gorti et al.', year: 2022,
    title: 'Indoor heat measurement data from low-income households in rural and urban South Asia',
    venue: 'Scientific Data 9, 285',
    doi: '10.1038/s41597-022-01314-5',
  },
  wilby2021: {
    authors: 'Wilby, Kasei, Gough, Amankwaa et al.', year: 2021,
    title: 'Monitoring and moderating extreme indoor temperatures in low-income urban communities',
    venue: 'Environmental Research Letters 16, 024033',
    doi: '10.1088/1748-9326/abdbf2',
  },
  khlongToey: {
    authors: 'Stockholm Environment Institute', year: 2024,
    title: null,
    venue: 'Perspective on heat in low-income communities in Klongtoey, Bangkok (the page returns 403 to automated readers; via the block-10 brief)',
    url: 'sei.org/perspectives/heat-low-income-communities-klongtoey/',
  },
  vellingiri2020: {
    authors: 'Vellingiri, Dutta, Singh, Sathish et al.', year: 2020,
    title: 'Combating climate change-induced heat stress: assessing cool roofs and its impact on the indoor ambient temperature of the households in the urban slums of Ahmedabad',
    venue: 'Indian Journal of Occupational and Environmental Medicine 24(1) (PMC7227734)',
    doi: '10.4103/ijoem.IJOEM_120_19',
  },
  nutkiewicz2022: {
    authors: 'Nutkiewicz, Mastrucci, Rao, Jain', year: 2022,
    title: 'Cool roofs can mitigate cooling energy demand for informal settlement dwellers',
    venue: 'Renewable and Sustainable Energy Reviews 159, 112183',
    doi: '10.1016/j.rser.2022.112183',
  },
  bunker2024: {
    authors: 'Bunker, Compoaré, Sewe, Laurent et al.', year: 2024,
    title: 'The effects of cool roofs on health, environmental, and economic outcomes in rural Africa: study protocol for a community-based cluster randomized controlled trial',
    venue: 'Trials 25, 59',
    doi: '10.1186/s13063-023-07804-0',
  },
  emissTables: {
    authors: 'The Engineering ToolBox; Optris', year: null, title: null,
    venue: 'Emissivity tables for metals (via the block-10 brief)',
  },
  energyStarRoof: {
    authors: 'US EPA ENERGY STAR', year: null,
    title: null,
    venue: 'Roof products list: initial and 3-year solar reflectance (via the block-10 brief). EPA retired the ENERGY STAR roof specification on 1 June 2022; the list is no longer kept up to date, and the Cool Roof Rating Council (CRRC) Rated Products Directory replaces it',
  },
  ma2015: {
    authors: 'Ma, Zeng, Zhou, Wang et al.', year: 2015,
    title: 'The short-term effect of heat waves on mortality and its modifiers in China: An analysis from 66 communities',
    venue: 'Environment International 75, 103–109',
    doi: '10.1016/j.envint.2014.11.004',
  },
  natMed2024: {
    authors: 'Xi, D., Liu, L., Zhang, M., Huang, C., Burkart, K. G., Ebi, K., Zeng, Y. & Ji, J. S.', year: 2024,
    title: 'Risk factors associated with heatwave mortality in Chinese adults over 65 years',
    venue: 'Nature Medicine 30(5), 1489–1498 (CLHLS cohort, 2008–2018)',
    doi: '10.1038/s41591-024-02880-4',
  },
  hess2018: {
    authors: 'Hess, Lm, Knowlton, Saha et al.', year: 2018,
    title: 'Building resilience to climate change: pilot evaluation of the impact of India\'s first heat action plan on all-cause mortality',
    venue: 'Journal of Environmental and Public Health 2018, 7973519 (PMC6236972)',
    doi: '10.1155/2018/7973519',
  },
  carbonBriefAc: {
    authors: 'Carbon Brief', year: null, title: null,
    venue: 'Analysis of air-conditioner ownership in India (via the block-10 brief)',
  },
  dialogueEarth: {
    authors: 'Dialogue Earth', year: null, title: null,
    venue: 'Article on outdoor workers and heat in China (via the block-10 brief)',
  },
  ren2025: {
    authors: 'Ren, Xu & Jiang', year: 2025,
    title: 'Optimizing public space quality in high-density old districts of Asian megacities: thermal environment analysis of Shenzhen\'s urban fringe',
    venue: 'Buildings 15(13), 2166',
    doi: '10.3390/buildings15132166',
  },
  // ---- block 11 (desert) ---- titles checked against Crossref where a DOI exists (2026-11-27); the rest are not recorded or from memory, as flagged
  brief11: {
    authors: 'This project', year: 2026, title: 'Research brief: desert courtyard block (Phoenix-like, 33.4°N) (block 11)',
    venue: 'docs/research/desert-brief.md', link: 'docs/research/desert-brief.md',
  },
  ncei: {
    authors: 'NOAA National Centers for Environmental Information', year: 2021,
    title: 'U.S. Climate Normals 1991–2020',
    venue: 'Station USW00023183, Phoenix Sky Harbor (monthly and hourly normals; via the block-11 brief)',
  },
  azmet: {
    authors: 'University of Arizona', year: null,
    title: 'Arizona Meteorological Network (AZMet)',
    venue: 'Station Phoenix Encanto (az15), daily data 2023–25 (via the block-11 brief); the station sits on an irrigated urban golf course',
  },
  climateGov2023: {
    authors: 'NOAA Climate.gov; NWS Phoenix', year: 2023,
    title: 'U.S. climate summary for July 2023; NWS Phoenix July 2023 climate summary',
    venue: 'Climate summaries (via the block-11 brief)',
  },
  nwsPsr: {
    authors: 'National Weather Service, Phoenix (PSR)', year: 2024,
    title: '2024 Year in Review; July 2024 Climate Summary',
    venue: 'NWS Phoenix climate summaries (via the block-11 brief)',
  },
  middelKrayenhoff2019: {
    authors: 'Middel, A. & Krayenhoff, E. S.', year: 2019,
    title: 'Micrometeorological determinants of pedestrian thermal exposure during record-breaking heat in Tempe, Arizona: Introducing the MaRTy observational platform',
    venue: 'Science of The Total Environment 687, 137–151',
    doi: '10.1016/j.scitotenv.2019.06.085',
  },
  colter2019: {
    authors: 'Colter, K. R., Middel, A. & Martin, C. A.', year: 2019,
    title: 'Effects of natural and artificial shade on human thermal comfort in residential neighborhood parks of Phoenix, Arizona, USA',
    venue: 'Urban Forestry & Urban Greening 44, 126429',
    doi: '10.1016/j.ufug.2019.126429',
  },
  az1195: {
    authors: 'Brown, P. & Kopec, D.', year: 2014,
    title: 'Converting Reference Evapotranspiration into Turf Water Use',
    venue: 'Turf Irrigation Management Series II, AZ1195, University of Arizona Cooperative Extension (revised February 2014)',
  },
  amwua: {
    authors: 'Arizona Municipal Water Users Association', year: null,
    title: 'Landscaping with Style: Watering Schedules',
    venue: 'AMWUA web guidance (amwua.org; the schedule is an image; via the block-11 brief)',
  },
  templeton2018: {
    authors: 'Templeton, N. P., Vivoni, E. R., Wang, Z.-H. & Schreiner-McGraw, A. P.', year: 2018,
    title: 'Quantifying Water and Energy Fluxes Over Different Urban Land Covers in Phoenix, Arizona',
    venue: 'Journal of Geophysical Research: Atmospheres 123(4), 2111–2128',
    doi: '10.1002/2017JD027845',
  },
  gober2009: {
    authors: 'Gober, P., Brazel, A., Quay, R., Myint, S. et al.', year: 2010,
    title: 'Using Watered Landscapes to Manipulate Urban Heat Island Effects: How Much Water Will It Take to Cool Phoenix?',
    venue: 'Journal of the American Planning Association 76(1), 109–121 (online 2009)',
    doi: '10.1080/01944360903433113',
  },
  middel2014: {
    authors: 'Middel, A., Häb, K., Brazel, A. J., Martin, C. A. et al.', year: 2014,
    title: 'Impact of urban form and design on mid-afternoon microclimate in Phoenix Local Climate Zones',
    venue: 'Landscape and Urban Planning 122, 16–28',
    doi: '10.1016/j.landurbplan.2013.11.004',
  },
  middel2015: {
    authors: 'Middel, A., Chhetri, N. & Quay, R.', year: 2015,
    title: 'Urban forestry and cool roofs: Assessment of heat mitigation strategies in Phoenix residential neighborhoods',
    venue: 'Urban Forestry & Urban Greening 14, 178–186',
    doi: '10.1016/j.ufug.2014.09.010',
  },
  vanos2022: {
    authors: 'Vanos, J. K., Wright, M. K., Kaiser, A. et al.', year: 2022,
    title: 'Evaporative misters for urban cooling and comfort: effectiveness and motivations for use',
    venue: 'International Journal of Biometeorology 66, 357–369',
    doi: '10.1007/s00484-020-02056-y',
  },
  huang2025: {
    authors: 'Huang, Bou-Zeid, Vanos, Middel et al.', year: 2025,
    title: 'Urban heat mitigation through misting, and its role in broader blue infrastructure portfolios',
    venue: 'Landscape and Urban Planning 256, 105290',
    doi: '10.1016/j.landurbplan.2024.105290',
  },
  coolPave2024: {
    authors: 'Middel, A., Vanos, J., Kaloush, K., Medina, J., Sailor, D., Campbell, B. et al. (Arizona State University)', year: 2024,
    title: 'City of Phoenix Cool Pavement Pilot Program, Phase II – 2022',
    venue: 'Report and executive summary, October 2024',
  },
  erell2014: {
    authors: 'Erell, E., Pearlmutter, D., Boneh, D. & Kutiel, P. B.', year: 2014,
    title: 'Effect of high-albedo materials on pedestrian heat stress in urban street canyons',
    venue: 'Urban Climate 10, 367–386',
    doi: '10.1016/j.uclim.2013.10.005',
  },
  mcdph2025: {
    authors: 'Maricopa County Department of Public Health', year: 2026,
    title: '2025 Heat-Related Deaths Report',
    venue: 'Annual report (via the block-11 brief)',
  },
  stull2011: {
    authors: 'Stull, R.', year: 2011,
    title: 'Wet-Bulb Temperature from Relative Humidity and Air Temperature',
    venue: 'Journal of Applied Meteorology and Climatology 50(11), 2267–2269',
    doi: '10.1175/JAMC-D-11-0143.1',
  },
  // ---- block 12: night market street (titles with a DOI checked against Crossref) ----
  brief12: {
    authors: 'This project', year: 2026, title: 'Research brief: night market / pedestrian shopping street (block 12)',
    venue: 'docs/research/nightmarket-brief.md', link: 'docs/research/nightmarket-brief.md',
  },
  cwaTaipei: {
    authors: 'Central Weather Administration (Taiwan)', year: null, title: 'Climate normals 1991–2020, Taipei station',
    venue: 'monthly normals, July (not in the brief)',
    flags: ['title from memory'],
  },
  yang2016: {
    authors: 'Yang, J. & Zhao, L.', year: 2016,
    title: 'Diurnal Thermal Behavior of Pavements, Vegetation, and Water Pond in a Hot-Humid City',
    venue: 'Buildings 6(1), 2 (online December 2015)',
    doi: '10.3390/buildings6010002',
  },
  doulos2004: {
    authors: 'Doulos, L., Santamouris, M. & Livada, I.', year: 2004,
    title: 'Passive cooling of outdoor urban spaces. The role of materials',
    venue: 'Solar Energy 77(2), 231–249',
    doi: '10.1016/j.solener.2004.04.005',
  },
  coolPaveNight: {
    authors: 'City of Phoenix & Arizona State University', year: null, title: null,
    venue: 'Cool pavement pilot program, night results (phoenix.gov; via the block-12 brief)',
  },
  ashrae55: {
    authors: 'ASHRAE; ISO', year: null,
    title: 'ANSI/ASHRAE Standard 55, Thermal Environmental Conditions for Human Occupancy; ISO 8996, Ergonomics of the thermal environment: Determination of metabolic rate',
    venue: 'metabolic rate tables (via the block-12 brief)',
    flags: ['title from memory'],
  },
  ashraeRetail: {
    authors: 'ASHRAE', year: null, title: null,
    venue: 'Heat gain from occupants, retail (secondary copies; via the block-12 brief)',
  },
  sailorAms: {
    authors: 'Sailor, D. J.', year: null, title: null,
    venue: 'American Meteorological Society conference abstract on anthropogenic heat (via the block-12 brief)',
  },
  crowdLimits: {
    authors: 'Still, G. K.; NSW Government', year: null, title: null,
    venue: 'Crowd safety notes (gkstill) and an NSW event factsheet (via the block-12 brief)',
  },
  wokVendor: {
    authors: 'Equipment vendors', year: null, title: null,
    venue: 'Jet wok burner specifications (via the block-12 brief)',
  },
  charcoalVendor: {
    authors: 'ArchiExpo listing', year: null, title: null,
    venue: 'Charcoal roaster specification (via the block-12 brief)',
  },
  taiwanNewsPm: {
    authors: 'Taiwan News', year: null, title: null,
    venue: 'News report on night markets and fine particles (via the block-12 brief)',
  },
  nccuXimen: {
    authors: 'National Chengchi University', year: null, title: null,
    venue: 'Thesis on thermal comfort in Ximending, Taipei (via the block-12 brief)',
  },
  ntuEnvimet: {
    authors: 'National Taiwan University', year: null, title: null,
    venue: 'ENVI-met study of a Taipei street (via the block-12 brief)',
  },
  ftvFans: {
    authors: 'Formosa TV (FTV) News', year: null, title: null,
    venue: 'News report on night-market vendors in the heat (via the block-12 brief)',
  },
  travelTaipei: {
    authors: 'Taipei City Government, Department of Information and Tourism', year: null, title: 'Shilin Night Market',
    venue: 'Taipei Travel (travel.taipei; via the block-12 brief)',
    flags: ['title from memory'],
  },
  shilinWiki: {
    authors: 'Wikipedia contributors', year: null, title: 'Shilin Night Market',
    venue: 'Wikipedia, and travel guides (via the block-12 brief)',
    flags: ['title from memory'],
  },
};
