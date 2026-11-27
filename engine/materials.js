// materials: surface parameters for the thermal model.
// Every value carries:
//   source   - a key into SOURCES (where the number or range comes from)
//   basis    - how the value relates to that source (see BASIS)
//   verified - false until checked against the primary source; heat cards
//              label these "unverified".
// docs/sources.md is generated from this file (scripts/sources.mjs).

export const SOURCES = {
  lbnl: 'Pomerantz, Pon, Akbari & Chang (2000) LBNL-43442, The effect of pavements\' temperatures on air temperatures in large cities (Fig. 1): asphalt albedo about 0.05 fresh, about 0.12 +- 0.03 after about 5 years; secondary: Pomerantz et al. (2003) LBNL-49283, doi 10.2172/816205, which quotes the same values',
  oke: 'Oke (1987) Boundary Layer Climates, 2nd ed. (Methuen) / Oke, Mills, Christen & Voogt (2017) Urban Climates (Cambridge University Press), surface property tables (cited from memory in the research brief)',
  epa: 'US EPA Reducing Urban Heat Islands: Compendium of Strategies (October 2008; the Cool Pavements chapter updated 2012, cited as 2012; the 2012 text was not read)',
  brief: 'Research brief docs/research/thermal-model-brief.md (ranges compiled from the sources above; not yet checked)',
  deardorff: 'Deardorff (1978) J. Geophys. Res. 83(C4) 1889-1903, force-restore method (NASA NTRS 19780019748)',
  melnikov: 'Melnikov et al. (2022) Scientific Reports 12, 2441, doi 10.1038/s41598-022-06383-5',
  engine: 'Engine assumption: no literature source',
  brief2: 'Research brief docs/research/retrofit-brief.md (block 2; values compiled from the sources below, items marked unverified there are flagged here)',
  lbnlRoof: 'US EPA Cool Roofs compendium with ENERGY STAR / LBNL roof data: new white roof albedo about 0.80',
  rupar2015: 'Rupar & Graham (2015) ASTM STP1590, 153-205, doi 10.1520/STP159020150019 (abstract only): 70 Chicago-area roofs 2008-2012, in-service reflectance generally below the listed aged values',
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
  zhu2018: 'Zhu, Jahn & Rein (2019, online 2018) J. Building Performance Simulation 12(4), 378-387, doi 10.1080/19401493.2018.1538389: 20 Fenchurch St simulated peak 3,384 W m-2 (worst 4,176)',
  vdara: 'Vdara hotel, Las Vegas, 2010 pool-deck hot zone (NBC News; Architectural Record): anecdotal',
  speroni2022: 'Speroni et al. (2022) Sustainability 14, 5781, doi 10.3390/su14105781 (abstract only): scale models, diffuse façades <= +30%, flat mirror > +100%, concave > +300% at pedestrian level',
  du2025: 'Du et al. (2025) J. Harbin Inst. Tech. 57(9), doi 10.11918/202406062: Chengdu Chunxi Road, Aug 2023, reflection zones Tmrt +4 to +13 C, air +1-2 C, UTCI +2-5 C, peak Tmrt 73.9 C',
  chen2024: 'Chen et al. (2024) Energy and Buildings, doi 10.1016/j.enbuild.2024.114926: reflective façades lower cooling energy but raise canyon UTCI',
  sanagar2025: 'Sanagar Darbani et al. (2025) Developments in the Built Environment, doi 10.1016/j.dibe.2025.100758: low-emissivity glass cuts Tmrt by up to 5 K (simulation)',
  wallenberg2026: 'Wallenberg et al. (2026) Geosci. Model Dev. 19, 1321-1336, doi 10.5194/gmd-19-1321-2026: SOLWEIG wall albedo 0.5 with reflected shortwave (abstract, sections 2.6 and 3); the authors note, as background, that Tmrt is highest in front of sunlit façades',
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
  ota: 'Murakawa et al. (1990) J. Archit. Plann. Environ. Eng. (Trans. AIJ) 415, 9-19, doi 10.3130/aijax.415.0_9, Ota River, Hiroshima: river cooling detectable 150-500 m inland along streets perpendicular to the river, more with wind, wider streets and lower density (unverified: via the block-4 brief; the abstract mentions an effect up to about 20 m height and the 150-500 m figure was not found in it)',
  corridor: 'Ventilation-corridor planning criteria: corridors within 30 deg of the prevailing wind (Chinese planning criteria and Givoni 20-30 deg, via Ren et al. 2018 (CUHK) and MDPI Buildings 14(2):348)',
  oke1988: 'Oke (1988) Energy and Buildings 11, street-canyon flow regimes, thresholds about 0.3-0.4 and 0.65-0.7 H/W (unverified)',
  wake: 'Chen, Mo & Hang (2024) Building Simulation 17(4), 509-524, doi 10.1007/s12273-024-1103-z: building wake recirculation length about 1.6-2.6 x building width',
  solcerova2019: 'Solcerova et al. (2019) Frontiers in Earth Science 7, 156, doi 10.3389/feart.2019.00156: a Delft pond is warmer than the air at night and releases about 2.7 MJ m-2 per night (43% longwave, 39% latent, 11% sensible)',
  webb2008: 'Webb et al. (2008) Hydrological Processes, river water temperature review: large deep rivers have the smallest daily range ("< 1 K" unverified)',
  steadman1994: 'Steadman (1994) Australian Meteorological Magazine 43, apparent temperature with radiation (the paper itself was not read; formula via [bom])',
  bom: 'Australian Bureau of Meteorology, Thermal stress: About the formula for the apparent temperature (bom.gov.au/info/thermal_stress/): AT = Ta + 0.348 e - 0.70 ws + 0.70 Q / (ws + 10) - 4.25, ws the 10 m wind, Q the net radiation absorbed per unit area of body surface (W m-2); coefficients checked against this page',
  brief5: 'Research brief docs/research/hutong-brief.md (block 5; values compiled from the sources below, items marked unverified there are flagged here)',
  hendel2015: 'Hendel et al. (2015) J. Sustain. Dev. Energy Water Environ. Syst., doi 10.13044/j.sdewes.2015.03.0001: watering the Rue du Louvre, Paris, about 1 L m-2 per cycle; surface -7.5 K at 19:30 and -6 K at 20:30, lasting several hours',
  hendel2016: 'Hendel et al. (2016) Urban Climate, doi 10.1016/j.uclim.2016.02.003: pavement watering in Paris, air -0.79 K at most, Tmrt -1.76 K',
  takebayashi2023: 'Takebayashi et al. (2023) Atmosphere 14, 1014, doi 10.3390/atmos14061014: road watering in Kobe, 0.025 mm per pass, -2 to -4 K at once, about 6 K on average, gone within 30 min in sun, evening watering recommended; lE = l beta alpha_w (X_s - X_a) with beta 0.15 on asphalt',
  kato2008: 'Kato et al. (2008), via the block-5 brief: a watered road 50 -> 40 C in about 60 min (unverified)',
  nippon: 'nippon.com feature on uchimizu (via the block-5 brief): sprinkling water in the evening and in shade, a custom since the Edo period',
  lin2019: 'Lin et al. (2019) Int. J. Environ. Res. Public Health 16, 2986, doi 10.3390/ijerph16162986: traditional block in Harbin, SVF lanes 0.09-0.27, courtyards 0.22-0.37; lower-SVF courtyards 0.3 K cooler air (at most 0.6 K) and 0.4 K globe (at most 1.0 K)',
  spainCourtyard: 'Cordoba and Seville courtyard studies, MDPI Proceedings 2(22) 1390 and 1381, 38(1) 17 (abstracts only, unverified): courtyards 3-6 K below the outdoor air on hot days, up to 11-15 K at 40-45 C',
  yang2024: 'Yang & Wang (2024) J. Beijing Forestry Univ., doi 10.12171/j.1000-1522.20240012 (abstract only): Beijing street-tree shade -1.0 to -2.1 K air and -481 to -789 W m-2; pagoda tree second for comfort',
  carb: 'California Air Resources Board cool-roof data, via the block-5 brief: clay tile solar reflectance 0.40-0.50, emissivity 0.80-0.90 (light terracotta; grey reduced-fired tile is darker, unverified)',
  midlandBrick: 'Midland Brick product data, via the block-5 brief: brick solar absorptance 0.45 (light grey) to 0.90 (slate grey)',
  sohuRoof: 'Web article (sohu), via the block-5 brief: northern roofs of paired tiles on a mud or lime back, not ventilated (secondary, unverified)',
  miller2007: 'Miller (2007), Oak Ridge National Laboratory, via the block-5 brief: ventilated tile roofs run cooler; does not apply to mud-backed, unventilated roofs',
  ucdavis: 'UC Davis guidance, via the block-5 brief: overhead vine arbours give more than 90% cover',
  jjshs: 'J. Japan. Soc. Hort. Sci. 54(3) 293, via the block-5 brief: pergola vines need LAI 2 or more, ideally 3',
  deng: 'Deng Yunxiang, Tianpeng zheyin (The Paper, newsDetail_forward_18319465), via the block-5 brief: summer mat awnings over Beijing courtyards; the old Beijing saying "tianpeng, fish bowl, pomegranate tree", which the cartoonist Li Binsheng drew',
  visitBeijing: 'Visit Beijing (official tourism site), via the block-5 brief: jujube and pagoda trees in courtyards; the pomegranate stands for many children',
  bolton1980: 'Bolton (1980) Monthly Weather Review 108, 1046-1053: saturation vapour pressure e_s = 6.112 exp(17.67 T / (T + 243.5)) hPa (formula from memory, not checked)',
  brief6: 'Research brief docs/research/parking-brief.md (block 6; values compiled from the sources below, items marked unverified there are flagged here; brownfield values are mostly its assumptions)',
  golden2007: 'Golden et al. (2007) Solar Energy 81, 872, doi 10.1016/j.solener.2006.11.007: Phoenix, 17 June 2004 (air max 41.0 C, wind 0.86 m/s): exposed asphalt (SVF 0.90) max 63.5 / min 28.5 / mean 43.6 C, under a PV canopy (SVF 0.11) 37.0 / 27.7 / 32.1 C; the paper has internal inconsistencies',
  stempihar2012: 'Stempihar et al. (2012) Transportation Research Record 2293, doi 10.3141/2293-15: modelled Phoenix pavements, max 53-69 C, min 29-35 C; HMA k 1.2, rho 2238, c 921; PCC k 1.5, rho 2350, c 1000; eps 0.91; surface temperatures asymptotic above about 203 mm thickness',
  takebayashi2009: 'Takebayashi & Moriyama (2009) Solar Energy 83, 1211, doi 10.1016/j.solener.2009.01.019: grass parking vs asphalt, sensible heat about 100-150 W m-2 lower by day and about 50 W m-2 lower at night',
  asaeda1996: 'Asaeda, Ca & Wake (1996) Atmospheric Environment 30, 413-427, Heat storage of pavement and its effect on the lower atmosphere; via the block-6 brief: asphalt emits about 150 W m-2 more infrared than bare soil at its maximum (extra sensible heat 50 vs 200 W m-2 across abstracts, unverified)',
  zhu2022: 'Zhu et al. (2022) Frontiers in Environmental Science, doi 10.3389/fenvs.2021.795474, ECOSTRESS Phoenix: roads the only class warming at night; a 100% road pixel about 4.5 K warmer than grass at night (interpretation, unverified)',
  hoehne2020: 'Hoehne et al. (2020/2022) Sustainable and Resilient Infrastructure, doi 10.1080/23789689.2020.1773013: Phoenix pavement and vehicle sensible heat, 67% roads, 29% parking, 3.9% vehicles (snippet only, unverified)',
  matias2025: 'Matias et al. (2025), Lisbon parked cars (abstract and press, unverified): black roofs about 71 C vs white about 45 C; air 2.5-3.8 K warmer next to black cars',
  levinson2011: 'Levinson et al. (2011) Applied Energy, doi 10.1016/j.apenergy.2011.05.006: black vs silver car roof up to 25 K hotter; cabin soak air 5-6 K',
  vanos2018: 'Vanos et al. (2018) Temperature, doi 10.1080/23328940.2018.1468205: Tempe, after 1 h: cabin air 46 C in sun vs 38 C in shade, dashboard 69 vs 48 C',
  mclaren2005: 'McLaren, Null & Quinn (2005) Pediatrics (PMID 15995010): parked-car cabin +1.8 K per 5 min, 80% of the rise in the first 30 min, 47 C at 22 C ambient; cracking the windows did not help',
  nsc: 'US National Safety Council, child hot-car deaths (via the block-6 brief): 1,010 US children 1998-2024, 39 in 2024',
  scott1999: 'Scott, Simpson & McPherson (1999) Journal of Arboriculture 25, 129: parking-lot tree shade, asphalt -20 K, air at 0.5 m -1.3 K, car cabins -26 K',
  onishi2010: 'Onishi et al. (2010) Urban Forestry & Urban Greening, doi 10.1016/j.ufug.2010.06.002: parking-lot greening, surface temperature up to -7.26 K',
  optris: 'Optris and Fluke emissivity tables, via the block-6 brief: rusty or oxidised steel about 0.69-0.88 (unverified)',
  brief7: 'Research brief docs/research/estate-brief.md (block 7; geometry calculated there, other values compiled from the sources below, items marked unverified there are flagged here; the estate counts, the AC profile and the condenser plume term are assumptions of the brief or of this block)',
  gb50180: 'GB 50180-2018 Standard for urban residential area planning and design (issued 2018-07-10, in force 2018-12-01), clause 4.0.9 / Table 4.0.9 sunlight standards, via the block-7 brief (codeofchina): zones I, II, III and VII, cities of 500,000 or more, at least 2 h on the Great Cold day (大寒); table values from memory, unverified',
  db33: 'Zhejiang DB33/1050 sunlight analysis rules (draft), via the block-7 brief: 大寒 08:00-16:00 and 冬至 09:00-15:00 true solar time, cumulative, only stretches of 10 min or more, steps of at most 5 min, test point 0.9 m above the floor (unverified)',
  gb55038: 'GB 55038-2025, mandatory from 2025-05-01, via the block-7 brief: its restatement of the sunlight rule was not checked (unverified)',
  mu2025: 'Mu et al. (2025) Atmosphere 16(1) 100, doi 10.3390/atmos16010100, Changsha: AC condenser exhaust 5.2 K above the air by day and 6.5 K at night, relative humidity -14.2% (snippet only, unverified)',
  chow1999: 'Chow & Lin (1999), via the block-7 brief: condensers in a Hong Kong building re-entrant, air at the top floors more than 7 K above ambient (unverified)',
  bojic2001: 'Bojic et al., via the block-7 brief: air at the condensers 4-9 K above ambient at the 30th storey of a high-rise (unverified)',
  bruelisauer2014: 'Bruelisauer et al. (2014) Energy and Buildings 71, 28, via the block-7 brief: condenser air in the void of a Singapore high-rise 10-13 K above ambient, inlets near 50 C from floor 10, efficiency -32% (unverified)',
  demunck2013: 'de Munck et al. (2013) International Journal of Climatology, via the block-7 brief: AC waste heat raises Paris street air by 0.5-2 K (simulated; unverified)',
  berlin2020: 'Berlin AC waste-heat study (2020) Int. J. Environ. Res. Public Health 17(13) 4645, doi 10.3390/ijerph17134645, via the block-7 brief: street air +0.5 / +0.6 K (unverified)',
  lai2017: 'Lai, Maing & Ng (2017) Building and Environment 114, 397-409, doi 10.1016/j.buildenv.2016.12.034, Hong Kong outdoor spaces under shade: Tmrt +1.6 K per +10 W m-2 of longwave, the longwave 0.1 less sky view brings (abstract checked against the paper)',
  plea2016: 'Lai, Maing & Ng (2016) PLEA 2016 Los Angeles, Wo Che Estate, Sha Tin, Hong Kong: sky view factor 0.327 next to the sitting areas (checked against the paper; the brief gives 0.32-0.35 for the podium)',
  li2023: 'Li et al. (2023) Building and Environment, doi 10.1016/j.buildenv.2023.110225, Hong Kong: a sky view factor threshold near 0.4 (via the block-7 brief, unverified)',
  yang2010: 'Yang, Lau & Qian (2010) Building and Environment 45(1) 115, Shanghai high-rise housing quarters: vegetation matters more at night; the night heat island not explained by the site, so anthropogenic heat (via the block-7 brief, unverified)',
  cai2017: 'Cai & Hu (2017) Int. J. Environ. Sci. Dev. 8(5) 378-384, doi 10.18178/ijesd.2017.8.5.981, Wuhan, August 2015: under direct sun hard paving 9.87 K and open space 3.67 K hotter than grass (checked against the paper)',
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
    alpha: v(0.12, 'lbnl', 'cited', true, 'LBNL-43442: about 0.12 +- 0.03 after about 5 years'),
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

// ---- block 5: hutong lanes and courtyards ------------------------------------
// tr: share of the sun a crown or screen lets through, exp(-0.5 LAI) as for
// MODEL.canopyTransmission (sun.js / thermal.js: per tree or per screen).
const leaf = (ef, efNote, tr, trNote, trSource = 'brief5') => ({
  alpha: v(0.18, 'oke', 'range', false, 'cited 0.15-0.20'),
  eps: v(0.97, 'oke', 'range', false, 'cited 0.97-0.99'),
  ef: v(ef, 'brief5', 'cited', false, efNote),
  tr: v(tr, trSource, 'interp', false, trNote),
  tree: true,
  prescribed: 'Not used by the grid model as a surface: leaf temperature as for the other trees; its crown shades the ground with its own transmission tr.',
});
Object.assign(MATERIALS, {
  greyBrick: {
    name: 'Grey brick paving (青砖)',
    alpha: v(0.2, 'brief5', 'range', false, 'brief 0.20 (0.15-0.30); brick absorptance 0.45 light grey to 0.90 slate grey [midlandBrick]'),
    eps: v(0.92, 'brief5', 'cited', false),
    mu: v(1100, 'brief5', 'cited', false),
    ef: v(0.02, 'brief5', 'cited', false, 'dry, porous brick'),
    note: 'Lanes and courtyards are paved with fired grey brick: darker than stone, a little porous, and it holds the day\'s heat into the evening.',
  },
  greyTile: {
    name: 'Grey tile roof on a mud and lime back',
    alpha: v(0.18, 'brief5', 'range', false, 'brief 0.18 (0.12-0.25); light terracotta clay tile 0.40-0.50 [carb], grey reduced-fired tile darker (unverified)'),
    eps: v(0.9, 'brief5', 'cited', false, 'clay tile 0.80-0.90 [carb]'),
    mu: v(1000, 'brief5', 'cited', false, 'tiles bedded on a mud and lime back, not ventilated [sohuRoof]; the ventilated-tile result [miller2007] does not apply'),
    ef: v(0, 'brief5', 'cited', false, 'dry'),
    note: 'Paired grey tiles laid on a thick mud and lime bed: dark and heavy, the roof bakes in the afternoon and gives the heat back slowly.',
  },
  jujube: { name: 'Jujube tree (枣树)', ...leaf(0.6, 'brief value', 0.37, 'exp(-0.5 x 2.0); brief LAI 1.5-2.5 (no measured LAI for jujube), i.e. 0.29-0.47'), note: 'A small courtyard tree with an open, airy crown: patchy shade.' },
  pomegranate: { name: 'Pomegranate (石榴)', ...leaf(0.6, 'brief value', 0.29, 'exp(-0.5 x 2.5); brief LAI 2-3, i.e. 0.22-0.37'), note: 'A low, dense courtyard tree; its fruit stands for many children.' },
  pagodaTree: { name: 'Pagoda tree (国槐)', ...leaf(0.7, 'brief value', 0.17, 'exp(-0.5 x 3.5); brief LAI 3-4 (no measured LAI), i.e. 0.14-0.22'), note: 'The big shade tree of the Beijing lanes: a wide, dense crown high above the roofs.' },
  pergola: { name: 'Vine pergola (葡萄架)', ...leaf(0.6, 'brief value', 0.29, 'exp(-0.5 x 2.5); pergola vines LAI 2-3 [jjshs], overhead arbours > 90% cover [ucdavis]', 'jjshs'), note: 'A grape vine trained over a trellis at head height: dappled shade over the courtyard path.' },
  awning: {
    name: 'Summer mat awning (天棚)',
    alpha: v(0.3, 'engine', 'engine', false, 'not used: only the transmission of the mat matters here'),
    eps: v(0.9, 'engine', 'engine', false, 'not used'),
    ef: v(0, 'engine', 'engine', false, 'not used'),
    tr: v(0.2, 'brief5', 'range', false, 'brief 0.1-0.3 for reed mats (unverified)'),
    prescribed: 'Not used by the grid model as a surface: a flat screen above the eaves that lets through tr of the sun; the cells under it count as fully covered for the sky view (crown factor).',
    note: 'A shed of reed mats on poles, built over the whole courtyard each summer, higher than the eaves; its side mats roll up to let the air through.',
  },
});

// ---- block 6: car park and industrial brownfield ------------------------------
// The thick asphalt of the car park and the concrete loading yard are the
// shared asphalt and concrete (Oke values, inside the brief's ranges).
Object.assign(MATERIALS, {
  ballast: {
    name: 'Rail ballast (gravel)',
    alpha: v(0.2, 'brief6', 'engine', false, 'brief assumption 0.20 (0.10-0.30)'),
    eps: v(0.92, 'brief6', 'engine', false, 'brief assumption'),
    mu: v(700, 'brief6', 'engine', false, 'effective admittance of a loose, airy layer; brief assumption 700 (600-900)'),
    ef: v(0, 'brief6', 'engine', false, 'dry, drains at once'),
    note: 'Loose crushed stone under the rails: full of air, so it heats fast in the sun and lets go of the heat soon after dark.',
  },
  drySoil: {
    name: 'Bare compacted soil',
    alpha: v(0.25, 'brief6', 'engine', false, 'brief assumption 0.25 (0.20-0.35)'),
    eps: v(0.93, 'brief6', 'engine', false, 'brief assumption'),
    mu: v(800, 'brief6', 'interp', false, 'dry soil about 600 [oke], read up to 800 for compacted ground (brief assumption)'),
    ef: v(0.05, 'brief6', 'engine', false, 'dry, a little moisture left deep down (brief assumption)'),
    note: 'Dry, compacted ground of the old works: lighter than asphalt and with less heat store, so it cools sooner after dark.',
  },
  scrub: {
    name: 'Scrubby dry vegetation',
    alpha: v(0.22, 'brief6', 'engine', false, 'brief assumption'),
    eps: v(0.95, 'brief6', 'engine', false, 'brief assumption'),
    mu: v(800, 'brief6', 'engine', false, 'the dry soil beneath (brief assumption)'),
    ef: v(0.2, 'brief6', 'engine', false, 'sparse, drought-stressed plants: little water to spend (brief assumption)'),
    note: 'Weeds and dry grass that took over the brownfield: a little evaporation, not much shade.',
  },
  rustShed: {
    name: 'Rusty corrugated steel shed roof',
    alpha: v(0.2, 'brief6', 'engine', false, 'brief assumption for rusted steel'),
    eps: v(0.75, 'optris', 'range', false, 'oxidised steel 0.69-0.88 [optris]'),
    thinC: v(3000, 'brief6', 'interp', false, 'one corrugated sheet about 0.7 mm of steel, rho c about 3.6 MJ m-3 K-1 (calculation in the brief); range 2-5 kJ m-2 K-1'),
    ef: v(0, 'brief6', 'cited', false, 'dry'),
    note: 'A single sheet of rusty steel over an open shed: almost no heat store, so it follows the sun up and drops below the air within minutes of sunset.',
  },
  pvCanopy: {
    name: 'Solar (PV) canopy over the bays',
    alpha: v(0.1, 'engine', 'engine', false, 'not used: the panels are a screen here'),
    eps: v(0.9, 'engine', 'engine', false, 'not used'),
    ef: v(0, 'engine', 'engine', false, 'not used'),
    tr: v(0, 'golden2007', 'interp', false, 'opaque panels: no direct sun through them'),
    prescribed: 'Not used by the grid model as a surface: a flat opaque screen 4.2 m up; the ground beneath sees the sky with SVF 0.11 [golden2007] and the panel undersides as warm walls (engine assumption).',
    note: 'Rows of solar panels on steel posts over the parking bays: shade for the cars by day and a lid on the night sky.',
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
  // ---- block 5 (hutong): surface water store, shade sampling, screens ----
  waterStore: v('LE = L beta(W) (h_c / c_p) max(0, q_sat(Ts) - q_a), dW/dt = -LE / L', 'brief5', 'cited', false, 'bulk evaporation from the splashed paving; beta(W) = beta_wet min(1, W / W_c); c_p 1005 J kg-1 K-1, p 1013.25 hPa, q = 0.622 e / (p - 0.378 e); adds to the EF term, which is zero after sunset'),
  satVapour: v('e_s = 6.112 exp(17.67 T / (T + 243.5)) hPa', 'bolton1980', 'cited', false, 'saturation vapour pressure over water'),
  splashW0: v(1.0, 'brief5', 'edge', false, 'W0, mm of evaporable water left on the paving by one splash; brief 0.5-1.0 mm of the 1-2 L m-2 thrown (about 1 L m-2 per cycle in Paris [hendel2015])'),
  splashBeta: v(0.5, 'brief5', 'range', false, 'beta_wet, the wetness factor of splashed brick; brief 0.3-1 (unverified); Kobe asphalt 0.15 [takebayashi2023]'),
  splashWc: v(0.2, 'brief5', 'cited', false, 'W_c, mm: below it the wet patch dries up and beta falls in proportion'),
  splashHour: v(19, 'brief5', 'cited', false, 'the evening splash, every evening of the repeated design day (evening watering recommended [takebayashi2023]; the uchimizu custom [nippon])'),
  shadeSamples: v('4 x 4 per 5 m cell', 'engine', 'engine', false, 'block 5 only: shade sampled every 1.25 m, so the 1.2 m wall shadow of a 5 m lane at noon registers (blocks 1-4: 2 x 2)'),
  screenCover: v('SVF x (1 - 0.75)', 'engine', 'engine', false, 'cells under a pergola or awning take the crown factor of a full tree crown for the sky view and wall reflection, as cells under trees do'),
  // ---- block 6 (car park and brownfield): ground heat flux, cars, PV canopy ----
  groundFlux: v('G = (1 - a) K + eps L - eps sigma Ts^4 - h_c (Ts - Ta) - EF max(Q*, 0)', 'deardorff', 'cited', false, 'the force-restore surface flux into the ground (thin layers: C dTs/dt), stored every 15 min; negative = the ground gives stored heat back'),
  dampingDepth: v('d = sqrt(kappa tau / pi)', 'brief6', 'cited', false, 'kappa = k / (rho c); HMA 0.126 m, PCC 0.133 m from the Stempihar inputs [stempihar2012]; force-restore holds for slabs thicker than about 1.5 d (about 0.2 m)'),
  pvSvf: v(0.11, 'golden2007', 'cited', false, 'sky view factor of the ground under the PV canopy, as measured by Golden et al.; set on the cells whose centre is under a panel row'),
  carShade: v('sunlit x (1 - car share)', 'engine', 'engine', false, 'parked cars as a sub-grid shade: each cell loses the share of its area under car footprints from its direct sun, all day (the lot is taken as full; shadows are not offset with the sun angle)'),
  carSky: v('SVF x (1 - car share)', 'engine', 'engine', false, 'all day: the ground under a car sees the car underside, taken as the warm-wall term (air + 2 K, more by day), instead of the sky, so it also loses diffuse sky light by day'),
  thinPaving: v(600, 'brief6', 'interp', false, 'effective admittance of thin (< 0.2 m) asphalt over a loose base, for the thin-layer check only (not in the scene); brief: thin paving needs a lower effective mu'),
};

/** Parameter keys a material uses (for cards and docs). */
export const paramKeys = (m) => ['alpha', 'eps', m.thinC ? 'thinC' : 'mu', 'muWet', 'ef', 'efWet', 'tau', 'storage', 'tr'].filter((k) => m[k]);
