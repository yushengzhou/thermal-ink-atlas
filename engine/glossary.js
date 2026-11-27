// glossary: one shared set of plain-English footnotes for the technical terms
// shown on the page (heat cards, margin notes, legend, header, terms panel).
// Each entry: term (title), text (1-2 sentences), why (why it matters for heat),
// and either
//   range + src  - typical values from the literature, with a source key
//                  (materials.js SOURCES), or
//   model(stats) - values computed from this model at load (glossaryStats),
//                  shown as "In this model" so they cannot go stale.
import { cellMat, isWater } from './thermal.js';

export const GLOSSARY = {
  albedo: {
    term: 'Albedo (α)',
    text: 'The share of sunlight a surface reflects: 0 absorbs everything, 1 reflects everything.',
    range: 'Fresh asphalt about 0.05, aged asphalt about 0.12 ± 0.03 (after about 5 years), grass 0.16–0.26, new white roof 0.65 or more.',
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
    model: (S) => S.svfLine,
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
    model: (S) => S.tmrtLine ?? `At 3 pm: ${S.tmrtShade} °C in building shade, ${S.tmrtSun} °C on sunlit ground (5th–95th percentile).`,
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
    model: (S) => S.lagLine,
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
    scenes: ['asphalt-park'],
  },
  wallReflection: {
    term: 'Wall reflection',
    text: 'Sunlight that building walls bounce back onto the street and onto people. Opaque walls scatter it in all directions (diffuse); glass reflects it like a mirror (specular).',
    range: 'Opaque wall albedo about 0.2–0.5 (this model: 0.3); SOLWEIG uses 0.5.',
    src: 'brief3, wallenberg2026',
    why: 'In a street with tall walls, the walls add sunshine to the pavement even where the sky is hidden.',
  },
  // ---- block 3 (glass-cbd) ---------------------------------------------------
  curtainWall: {
    term: 'Glass curtain wall',
    text: 'A non-structural outer wall of glass panes in a metal frame, hung on the front of an office tower.',
    range: 'Normal-incidence solar reflectance: clear float glass about 0.08, solar-control low-e 0.15–0.35, reflective (mirror) glass 0.25–0.45; outer-surface emissivity about 0.84.',
    src: 'fresnel, brief3, en673',
    why: 'Flat glass reflects the sun like a mirror, so a tower can throw a patch of sunshine onto a street it does not shade.',
    scenes: ['glass-cbd'],
  },
  specular: {
    term: 'Specular reflection',
    text: 'Mirror-like reflection: light leaves at the same angle it arrived, so a flat façade sends a bright copy of the sun in one direction.',
    range: 'Scale models: flat mirror façades more than double the sunshine at pedestrian level; diffuse façades add at most about 30%; concave façades more than 300%.',
    src: 'speroni2022',
    why: 'It concentrates the extra heat into a sharp spot, instead of spreading it thinly as an opaque wall does.',
    scenes: ['glass-cbd'],
  },
  fresnel: {
    term: 'Fresnel reflection',
    text: 'Glass reflects more the more glancing the sunlight is (the Fresnel equations): clear glass reflects about 8% head-on and over half at a grazing angle.',
    range: 'Clear float glass (n = 1.52, two surfaces): 0.082 at 0°, 0.10 at 45°, 0.17 at 60°, 0.30 at 70°, 0.41 at 75°, 0.56 at 80°.',
    src: 'fresnel',
    why: 'A façade lit at a grazing angle can glare onto the street even with ordinary clear glass.',
    scenes: ['glass-cbd'],
  },
  reflectionSpot: {
    term: 'Reflection spot',
    text: 'The patch of ground where a sunlit glass façade sends its reflected sunshine. It moves through the day and can fall in the shade of other buildings.',
    model: (S) => S.spotLine,
    why: 'Someone standing in a spot is out of the sun and still feels much of its heat.',
    scenes: ['glass-cbd'],
  },
  canyon: {
    term: 'Street canyon (H/W)',
    text: 'A street lined by buildings on both sides. Its aspect ratio H/W is the building height divided by the street width.',
    range: 'Sky view factor at the centre of a long canyon: 1/√(1 + (2H/W)²), i.e. 0.45 at H/W 1, 0.24 at 2, 0.16 at 3, 0.10 at 5. Oke (1981): calm-night urban–rural air difference about 7.45 + 3.97 ln(H/W) K (secondary source).',
    src: 'brief3, oke1981',
    why: 'Deep canyons shade the street by day but see little cold sky at night, so they cool slowly after dark.',
    scenes: ['glass-cbd', 'hutong'],
  },
  lowE: {
    term: 'Low-e glass',
    text: 'Glass with a thin metal-oxide coating that keeps out much of the sun’s heat (solar control) and holds in indoor heat (low emissivity on the coated face).',
    range: 'Solar reflectance about 0.15–0.35 head-on; Singapore caps glass daylight reflectance at 20%.',
    src: 'brief3, bca',
    why: 'What keeps heat out of the offices goes somewhere: more of it is reflected onto the street.',
    scenes: ['glass-cbd'],
  },
  acHeat: {
    term: 'AC waste heat',
    text: 'Air conditioners move heat from inside to outside and add their own electricity: rejected heat = cooling × (1 + 1/COP).',
    range: 'Dense urban areas 20–70 W m⁻² of ground area, sometimes over 100; central Tokyo over 400 W m⁻² by day.',
    src: 'xie2016, sailor2011',
    why: 'It warms the street air; this model holds the air temperature fixed, so the heat is shown but not felt.',
    scenes: ['glass-cbd'],
  },
  // ---- block 4 (waterfront) -------------------------------------------------
  windFactor: {
    term: 'Wind factor (f_w)',
    text: 'How much of the open-site wind reaches a spot: 1 in the open, lower in the lee of buildings, a little above 1 in streets that point along the wind. Here it is a geometric rule (shelter × channelling), not a flow simulation.',
    model: (S) => S.windLine,
    why: 'More wind carries heat off a sunlit pavement faster and makes a hot day feel cooler; it does not change the air temperature here.',
    scenes: ['waterfront'],
  },
  ventilationCorridor: {
    term: 'Ventilation corridor',
    text: 'A wide, open street or green strip that lines up with the prevailing wind, so the breeze (here, off the river) can run into the city.',
    range: 'Planning guides ask for corridors within about 30° of the prevailing wind; along the Ota River (Hiroshima) river cooling was detected 150–500 m inland along streets perpendicular to the river (unverified).',
    src: 'corridor, ota',
    why: 'Streets across the wind are sheltered by the buildings upwind; corridors keep the wind moving.',
    scenes: ['waterfront'],
  },
  fetch: {
    term: 'Fetch',
    text: 'The distance the wind has travelled over a surface. Air that has just crossed water carries a little of its coolness for a short fetch over land, then mixes with the city air.',
    range: 'River Don, Sheffield: about 30 m with open banks; Cheonggyecheon, Seoul: 30–80 m; small water bodies: −0.2 K typical in the afternoon.',
    src: 'hathway2012, cheonggyecheon, jacobs2020',
    why: 'The cooling of the air by water fades within tens of metres, so it helps the promenade, not the streets behind.',
    scenes: ['waterfront'],
  },
  sheltering: {
    term: 'Sheltering (lee)',
    text: 'The slow, gusty zone downwind of a building, where the wind is much weaker than in the open and recovers only gradually.',
    range: 'Recirculation behind a building about 1.6–2.6 times its width; recovery to the open wind after about 5 building heights is an assumption of this model.',
    src: 'wake, brief4',
    why: 'A sheltered sunlit pavement loses less heat to the air, so it runs hotter than an exposed one.',
    scenes: ['waterfront'],
  },
  apparentTemp: {
    term: 'Apparent temperature',
    text: 'A feels-like temperature from air temperature, humidity, wind and the extra radiation a person absorbs (Steadman 1994). Used here as a simple stand-in for UTCI.',
    range: 'AT = Ta + 0.348 e − 0.70 ws + 0.70 Q/(ws + 10) − 4.25 (e in hPa, ws the 10 m wind in m/s, Q in W m⁻²; as given by the Australian Bureau of Meteorology).',
    src: 'bom, steadman1994',
    why: 'It lets the walkers weigh a breeze against shade: both make a hot afternoon feel cooler.',
    scenes: ['waterfront'],
  },
  // ---- block 5 (hutong) -----------------------------------------------------
  siheyuan: {
    term: 'Siheyuan (四合院)',
    text: 'A courtyard house: four single-storey houses (the main house, two side houses and a gate house) around a paved yard, entered from the lane through a gate in one corner.',
    model: (S) => S.courtLine,
    why: 'Walls on all four sides shade the edges of the yard; the rest needs trees, vines or an awning. Measured courtyards can hold air a few degrees cooler than the lane, which this model does not simulate.',
    scenes: ['hutong'],
  },
  tianpeng: {
    term: 'Tianpeng (天棚), the summer mat awning',
    text: 'A shed of reed mats on poles built over a Beijing courtyard each summer, higher than the eaves, with side mats that roll up to let the air through.',
    range: 'Reed mats let through about 10–30% of the sun (the brief, unverified); this model uses 20%.',
    src: 'deng, brief5',
    why: 'It shades the whole courtyard at midday, when the low walls give almost no shade.',
    scenes: ['hutong'],
  },
  waterStore: {
    term: 'Surface water store (W)',
    text: 'The water left lying on the paving after a splash, in millimetres (1 mm is 1 litre per square metre). While it lasts it evaporates, and the heat that takes comes out of the paving.',
    model: (S) => S.waterLine,
    why: 'Only water that is there can cool: when the store runs dry, the cooling stops.',
    scenes: ['hutong'],
  },
  wetBulb: {
    term: 'Wet-bulb temperature',
    text: 'The temperature a wet surface cools to when evaporation alone sets it, from the air temperature and humidity: the drier the air, the further below the air it lies.',
    model: (S) => S.wetBulbLine,
    why: 'Splashed paving cannot get colder than this by evaporating, so it bounds how much a splash can cool.',
    scenes: ['hutong'],
  },
  // ---- block 6 (car park and brownfield) -------------------------------------
  heatStorage: {
    term: 'Heat storage',
    text: 'Heat a surface soaks down into its own material by day and gives back after dark. Thick, dense paving stores a lot; a thin metal sheet almost none.',
    model: (S) => S.storageLine,
    why: 'Stored heat is why a car park stays warm long after sunset, while a tin roof is cold within the hour.',
    scenes: ['parking'],
  },
  dampingDepth: {
    term: 'Damping depth (d)',
    text: 'How deep the daily swing of the surface temperature reaches into the ground: at depth d it is down to about a third, at 3d to a twentieth. d = √(κτ/π), κ the thermal diffusivity and τ one day.',
    model: (S) => S.dampingLine,
    why: 'A slab much thicker than d holds a full day\'s heat; thin paving over loose stone holds less, so it runs hotter by day and cooler at night.',
    scenes: ['parking'],
  },
  groundFlux: {
    term: 'Ground heat flux (G)',
    text: 'The heat going into the ground through its surface (positive) or coming back out (negative), in watts per square metre. The night-release strokes (G) draw it.',
    model: (S) => S.fluxLine,
    why: 'At night G is the heat the pavement keeps feeding to its surface, so the surface cannot cool down to the air.',
    scenes: ['parking'],
  },
  thermalInertia: {
    term: 'Thermal inertia',
    text: 'How slowly a surface changes temperature when its heating changes: high for thick, dense materials (asphalt, concrete), low for loose or thin ones (soil, ballast, sheet metal). Measured here by the admittance μ.',
    model: (S) => S.inertiaLine,
    why: 'High-inertia surfaces lag behind the sun: they peak late and stay warm into the night.',
    scenes: ['parking'],
  },
  // ---- block 7 (older high-rise estate) ---------------------------------------
  sunlightRule: {
    term: '大寒日 sunlight rule',
    text: 'The Chinese planning rule that every home gets a minimum of direct sun at its ground-floor window on the Great Cold day (大寒, about 20 January), counted from 08:00 to 16:00 solar time at the sill.',
    range: 'GB 50180-2018: at least 2 h on 大寒 in zones I, II, III and VII for cities of 500,000 or more (3 h in smaller ones); flats for the elderly 2 h on the winter solstice (冬至); new homes in old-area renovation 1 h on 大寒 (table values from memory, unverified). Draft Zhejiang rules: only stretches of 10 min or more count, steps of at most 5 min, the point 0.9 m above the floor.',
    src: 'gb50180, db33',
    why: 'It sets how far apart the slab rows stand, and it is written for the winter sun: the same spacing leaves the courtyards open to the high summer sun.',
    scenes: ['estate'],
  },
  effectiveHeight: {
    term: 'Effective height (H_eff)',
    text: 'The height of the building that shades a window, measured from the window sill of the ground floor behind it: roof height minus (ground-floor level + 0.9 m).',
    range: '18 floors of 2.9 m with the ground floor at grade: 52.2 − 0.9 = 51.3 m.',
    src: 'brief7, db33',
    why: 'The rule protects the lowest window, so the spacing scales with the height above that window, not with the height above the ground.',
    scenes: ['estate'],
  },
  spacingCoefficient: {
    term: 'Spacing coefficient (G / H_eff)',
    text: 'The clear distance between two rows of east-west slabs divided by the effective height of the southern row: a quick way to meet the sunlight rule for long, parallel slabs.',
    range: 'At 35° N for long slabs: 1.45 for 1 h, 1.47 for 2 h and 1.52 for 3 h of 大寒 sun; 1.64–1.74 on the winter solstice (calculated in the brief). The coefficient method is "no longer appropriate" for high-rises in the draft Zhejiang rules.',
    src: 'brief7, db33',
    why: 'At 1.47 the July noon shadow covers only about a sixth of the courtyard.',
    scenes: ['estate'],
  },
  condenserHeat: {
    term: 'Condenser heat rejection',
    text: 'The heat an air conditioner\'s outdoor unit blows out: the heat taken from the flat plus the electricity used to move it, Q_rej = Q_cool (1 + 1/EER).',
    range: 'A 3.5 kW split unit with EER 3.3 rejects about 4.6 kW; at 0.5–0.7 m³/s of fan air that is 5.5–7.5 K above the air (calculated in the brief). Measured in Changsha: exhaust 5.2 K above the air by day, 6.5 K at night (snippet, unverified).',
    src: 'brief7, mu2025',
    why: 'Stacked on a façade, hundreds of units put tens of watts per square metre of site into the air, most of it in the evening.',
    scenes: ['estate'],
  },
  eer: {
    term: 'EER (energy efficiency ratio)',
    text: 'Cooling delivered per unit of electricity used, in W/W: an EER of 3.3 moves 3.3 kW of heat out of the flat for every 1 kW of power.',
    range: 'Split air conditioners about 3–4; the brief uses 3.3.',
    src: 'brief7',
    why: 'A lower EER means more heat out of the condenser for the same cooling, and the hotter the air at the condenser, the lower the EER.',
    scenes: ['estate'],
  },
  // ---- block 8 (campus) -------------------------------------------------------
  artificialTurf: {
    term: 'Artificial turf',
    text: 'A pitch of green plastic blades standing in a bed of loose infill, usually black crumb rubber (SBR) and sand, on a shock pad. It needs no water or mowing and can be played on all year.',
    range: 'In summer sun 65–80 °C, at times over 85 °C: 9.4–34 K hotter than natural grass at the surface, but only 0.5–1.2 K warmer in the air above (review of 23 studies); at night it cools to about the grass temperature.',
    src: 'singh2024, jim2016',
    why: 'Grass spends sunshine on evaporating water; dry plastic and rubber cannot, and they hold little heat, so they get very hot by day and cool fast at night.',
    scenes: ['campus'],
  },
  crumbRubber: {
    term: 'Crumb-rubber infill',
    text: 'Black granules ground from old tyres (styrene-butadiene rubber, SBR), spread between the turf blades to cushion and steady them; some pitches use paler TPE or cork instead.',
    range: 'Lab tests: SBR 53.5 °C against TPE 45.6 °C under the same lamp; a shock pad adds about 1.8 K, the blade colour 1–2 K.',
    src: 'singh2024',
    why: 'It is the darkest part of the pitch and it is dry: most of the heat of artificial turf sits in it.',
    scenes: ['campus'],
  },
  contactBurn: {
    term: 'Contact-burn threshold',
    text: 'The surface temperature at which touching a hot surface with bare skin starts to burn it, for a given material and contact time (ISO 13732-1). Metal conducts heat into the skin fastest, so its limit is lowest.',
    range: '1 min of contact: metal 51 °C, stone and concrete 56 °C, plastics and wood 60 °C; 10 min: 48 °C for all of them; 8 h: 43 °C. The lower end for children (unverified, via CENELEC Guide 29).',
    src: 'iso13732',
    why: 'Children sit, kneel and slide on play surfaces for longer than a minute and pull away more slowly, so a surface "only" at 60 °C can burn them.',
    scenes: ['campus'],
  },
  shadeSail: {
    term: 'Shade sail',
    text: 'A sheet of knitted plastic cloth (HDPE) stretched between posts a few metres above a play area or a seating area.',
    range: 'Lets through about 10–30% of the sun (unverified); Gilbert, Arizona at noon: rubber 46.7 °C under a sail against 87.2 °C in sun; Lubbock: 168 W m⁻² less radiation absorbed by a child.',
    src: 'brief8, vanos2016, vanos2017',
    why: 'It is the quickest shade a school can add; unlike a tree it does not cool the air by evaporation, and after sunset it holds a little warmth over the ground.',
    scenes: ['campus'],
  },
  // ---- block 9 (busstop) -------------------------------------------------------
  transmittance: {
    term: 'Solar transmittance (τ)',
    text: 'The share of direct sunlight that passes through a roof sheet, a screen or a pane: 0 for an opaque sheet, 1 for nothing in the way.',
    range: '10 mm twinwall polycarbonate: clear 0.80, opal 0.47, bronze 0.43 (a datasheet, unverified); opaque metal, PV and ad panels 0; the solar heat gain coefficient of a window is a different number.',
    src: 'brettMartin, brief9',
    why: 'A see-through roof keeps the rain off but lets most of the sun through to the people under it.',
    scenes: ['busstop'],
  },
  profileAngle: {
    term: 'Profile angle (φ)',
    text: 'The sun\'s height seen edge-on to a façade or a shelter side: tan φ = tan(sun height) / cos(sun azimuth − the side\'s facing direction).',
    range: 'At 35° N on 20 July the sun stands 61° high at 14:00 and 25° at 17:00, from the west-south-west to the west; a roof 1.45 m above a seated head must reach (that height) / tan φ past the head to shade it.',
    src: 'brief9',
    why: 'When the sun is low and to the side, a roof edge casts its shade far from where people stand; a vertical screen on that side shades right behind it.',
    scenes: ['busstop'],
  },
  headway: {
    term: 'Headway',
    text: 'The time between two buses of a route at a stop.',
    range: 'Here 10 min (an assumption of the brief, 5–15 min), with gaps spread by a coefficient of variation of 0.4 (0.3–0.5, unverified); riders who arrive at random then wait (h / 2)(1 + cv²) on average.',
    src: 'brief9, fan2002',
    why: 'The longer and the less regular the gap between buses, the longer people stand at the stop in the heat.',
    scenes: ['busstop'],
  },
  heatDose: {
    term: 'Heat dose of a wait',
    text: 'This page\'s own measure of how much heat a wait brings: the minutes waited times how far the apparent temperature (with the sun\'s radiation) is above 32 °C, summed minute by minute (K·min).',
    range: 'No standard dose exists for a few minutes of waiting; the brief defines it on UTCI, which this engine does not compute, so the apparent temperature stands in.',
    src: 'brief9, bom',
    why: 'It adds up how long and how hot: a short wait in the sun and a long wait in the shade can come out alike.',
    scenes: ['busstop'],
  },
  burnThreshold: {
    term: 'Contact-burn threshold (benches, rails, decks)',
    text: 'The surface temperature at which touching it with bare skin starts to burn, for a material and a contact time (ISO 13732-1). Metal conducts heat into the skin fastest, so its limit is lowest.',
    range: '1 min of contact: metal 51 °C, stone, concrete and glass 56 °C, plastics and wood 60 °C; 10 min: 48 °C; bare metal burns in about 1 s at 65–70 °C (unverified).',
    src: 'iso13732, brief9',
    why: 'A hand on a sunlit handrail or bare legs on a metal bench meet the hottest metal of the street; older people and children pull away more slowly.',
    scenes: ['busstop'],
  },
  // ---- block 2 (sponge-retrofit) --------------------------------------------
  permeablePaving: {
    term: 'Permeable paving',
    text: 'Pavers with open joints, or porous asphalt, that let rain soak through instead of running off.',
    range: 'Wetted permeable pavement 15–35 °C cooler than dense asphalt in the early afternoon, 2–7 °C cooler about a day later; dry porous asphalt about 5 °C warmer.',
    src: 'li2013',
    why: 'It cools only while there is water in it to evaporate; dry, it can be as hot as the asphalt it replaced, or hotter.',
    scenes: ['sponge-retrofit'],
  },
  greenRoof: {
    term: 'Green roof',
    text: 'A roof covered with a thin layer of soil-like substrate and hardy plants such as sedum (an “extensive” green roof).',
    range: 'Albedo about 0.15–0.25; up to 18 °C cooler than a black roof in a New York case; Bowen ratio about 1–2.',
    src: 'brief2, noaaGreen, heusinger',
    why: 'Plants and damp substrate turn sunshine into evaporation instead of heat, and the roof also holds back rain.',
    scenes: ['sponge-retrofit'],
  },
  rainGarden: {
    term: 'Rain garden',
    text: 'A shallow planted hollow that collects rain running off streets and roofs and lets it soak away.',
    range: 'No measured cooling figure in our sources; this block uses engine assumptions (evaporative fraction 0.8 wet, 0.35 dry, 3-day drying).',
    src: 'engine, mccoll',
    why: 'It manages rain where it falls, and its damp soil stays cooler than paving for days after rain.',
    scenes: ['sponge-retrofit'],
  },
  daysSinceRain: {
    term: 'Days since rain (d)',
    text: 'How many clear days have passed since the last soaking rain. d = 0 is the best case: a clear day after overnight rain.',
    range: 'Wet surfaces dry with a time scale τ: pavers about 1 day, soils about 3 days, green-roof substrate about 4 days.',
    src: 'brief2, mccoll',
    why: 'Wet-surface cooling fades as the stored water evaporates, so a sponge-city street is coolest just after rain.',
    scenes: ['sponge-retrofit'],
  },
  bowen: {
    term: 'Bowen ratio and evaporative fraction',
    text: 'Two ways to describe how much of a surface’s energy goes into evaporating water. In this model the evaporative fraction (EF) is the share of the positive net radiation spent on evaporation (EF × max(Q*, 0)). The Bowen ratio, used in field studies, is sensible heat ÷ latent heat; if heat stored in the ground is ignored, EF ≈ 1 ÷ (1 + Bowen ratio).',
    range: 'Green roofs: Bowen ratio below 1 to about 2 in field data; this block uses EF 0.5 for a wet and 0.25 for a dry green roof (the brief’s values); dry paving EF near 0.',
    src: 'heusinger, brief2',
    why: 'The more energy goes into evaporation, the less is left to heat the surface.',
    scenes: ['sponge-retrofit'],
  },
  spongeCity: {
    term: 'Sponge city (海绵城市)',
    text: 'China’s national programme (State Council guideline, 2015) to manage rain where it falls: let it soak in, slow it, store it, clean it, use it, and only then drain it (渗、滞、蓄、净、用、排).',
    range: 'Target: absorb and use 70% of rainfall on site; 20% of built-up area by 2020, 80% by 2030.',
    src: 'sponge2015',
    why: 'Its goals are flooding and water supply; cooler streets are a side benefit, and no robust measured block-scale cooling figure was found.',
    scenes: ['sponge-retrofit'],
  },
  albedoAgeing: {
    term: 'Ageing (aged vs new)',
    text: 'Reflective coatings get dirty and weathered, so they reflect less sun as they age.',
    range: 'Cool pavement coating 0.26 → 0.18 within a year; cool roofs must reach 0.72 new or 0.50 after 3 years (Chicago code).',
    src: 'ko2022, chicago',
    why: 'A retrofit judged by its brand-new albedo overstates the cooling people will get over its life.',
    scenes: ['sponge-retrofit'],
  },
};

/** Glossary keys shown for a scene (shared terms plus the scene's own). */
export const termsFor = (sceneId) => Object.keys(GLOSSARY).filter((k) => !GLOSSARY[k].scenes || GLOSSARY[k].scenes.includes(sceneId));

const q = (a, p) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

/** Model-derived numbers quoted in the glossary (computed at load and in docs). */
export function glossaryStats(world, thermal, extra = {}) {
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
    if (isWater(m)) continue;
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
  const out = {
    tmrtSun: `${r0(q(sun, 0.05))}–${r0(q(sun, 0.95))}`,
    tmrtShade: `${r0(q(shade, 0.05))}–${r0(q(shade, 0.95))}`,
    days: thermal.info.days,
  };
  if (lawn.length && l23.length) {
    out.svfLawn = `about ${r2(q(lawn, 0.5))}`;
    out.svfPave = `${r2(q(pave, 0.1))}–${r2(q(pave, 0.9))}`;
    out.lagAsphalt = r1(mean(a23) - mean(l23));
    out.lagConcrete = r1(mean(c23) - mean(l23));
    out.svfLine = `Open lawn ${out.svfLawn}; paved ground near buildings ${out.svfPave}.`;
    out.lagLine = `At 11 pm asphalt is ${out.lagAsphalt} °C and concrete ${out.lagConcrete} °C warmer than the open lawn.`;
  }
  // a glass block (no lawn): canyon numbers passed in by the caller
  if (extra.canyon) {
    const c = extra.canyon;
    const ground = [];
    for (let i = 0; i < N; i++) if (world.bld[i] < 0) ground.push(world.svf[i]);
    out.svfLine = `Street-level ground ${r2(q(ground, 0.1))}–${r2(q(ground, 0.9))}; Silk Lane floor ${r2(c.svf)} (an endless canyon of the same H/W: ${r2(c.svfCanyon)}).`;
    out.lagLine = `At 5 am the Silk Lane floor is ${r1(c.lag05)} °C warmer than an open stone surface (walls fixed at air + 2 K at night, an engine assumption).`;
  }
  if (extra.wind) {
    const w = extra.wind;
    out.windLine = `Over the river ${r2(w.river)}; along Quay Street ${r2(w.corridor)}; Rope Walk, behind the warehouses, ${r2(w.shelter)} (mean), ${r2(w.lee)} within one building height of the wall.`;
  }
  if (extra.hutong) Object.assign(out, extra.hutong);
  if (extra.parking) Object.assign(out, extra.parking);
  if (extra.spot) {
    const s = extra.spot;
    out.spotLine = `At 3 pm with ${s.glassName}: Tmrt ${r0(s.tmrtSpotShade)} °C in shaded spots vs ${r0(s.tmrtShade)} °C in plain shade and ${r0(s.tmrtSun)} °C in sun.`;
  }
  return out;
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
