# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions: [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Canvas 2D engine written from scratch: wobbly pen strokes, isometric kit, deterministic `seek` (#2).
- First block, `asphalt-park`: an invented asphalt street next to a pocket park, as one offline HTML file (#2).
- Thermal view (`T`): watercolour heat wash over the line work (#2).
- Heat-wave day with a time slider and `H` / `Shift+H` hour steps (#2).
- Force-restore surface energy-balance model with sky view factor and evaporation (#2).
- Sun position and cast shadows for any hour (#2).
- Walkers that pick shaded routes at hot hours (#2).
- Sweat cue on people in very hot sun (#2).
- Heat cards: click a parcel for material, temperatures and sources (#2).
- Glossary footnotes and a `terms` panel (#2).
- "Simulated" labels; unverified inputs flagged on cards and in `docs/sources.md` (#2).
- Checks: unit tests, Playwright tests, size and offline budget, CI (#2).
- Second block, `sponge-retrofit`: one invented block shown Before and After a sponge-city and cool-roof retrofit (aged cool roofs, green roofs, permeable pavers, porous asphalt, a cool-pavement coating, rain gardens, young street trees), as one offline HTML file (#5).
- Before / After split view with a draggable divider, `B` to swap, and `?state=before|after|split&split=&d=&materials=new` query modes (#5).
- Days-since-rain slider (0–7, default 3): wet-surface cooling fades as EF(d) and μ(d) decay with each material's drying time (#5).
- Aged / new materials toggle (default aged) to show how reflective coatings lose albedo (#5).
- Measure cards with surface ΔTs and pedestrian ΔTmrt at 12:00 and 15:00, a reflective-pavement trade-off card ("cools the road, not the person") and a sponge-city guide card (#5).
- Glossary terms: green roof, permeable paving, rain garden, days since rain, Bowen ratio / evaporative fraction, sponge city, ageing (#5).
- `docs/sources.md`: retrofit parameters, model-vs-literature table for block 2 with the rows outside their bands disclosed, water budget, sensitivity, sponge city and trade-offs sections; research brief in `docs/research/retrofit-brief.md` (#5).
- Gallery card for block 2 (#5).
- Third block, `glass-cbd`: an invented CBD block with glass curtain-wall towers, street canyons (H/W about 2.3–2.6) and a small plaza, as one offline HTML file (#8).
- Specular reflection of the sun off glass façades: a single bounce with Fresnel reflectance (n = 1.52) scaled to each glass type, landing as reflection spots on the street; flat façades never focus (#8).
- Glass types clear (ρ₀ 0.08), solar-control low-e (0.20, the default) and mirror (0.35), with buttons, `G` / `Shift+G` and `?glass=clear|lowe|mirror` (#8).
- Glass wall temperature (Ta + a_g I_f / (h_o + h_i), I_f = I cos θ + 0.5 D, as in the brief) and glass emissivity in the longwave the street sees (#8).
- Reflection spots in the day view (a pale glint wash with a fine ink hatch) and in the thermal view (#8).
- Walkers weigh reflection spots by their Tmrt, so they avoid glare even in shade; the sweat cue follows Tmrt in spots too (#8).
- Cards: street canyon (sky view, day shade, night lag), each glass type (ρ₀, spot ΔTmrt), the reflection spot ("out of the sun, still hot"), AC rejected heat (an overlay, not felt in the model) and the concave-façade extreme case (#8).
- Glossary terms: wall reflection, glass curtain wall, specular reflection, Fresnel reflection, reflection spot, street canyon (H/W), low-e glass, AC waste heat (#8).
- `docs/sources.md`: block 3 sections (glass parameters, canyons, glass optics, specular reflection, spots, walkers, wall reflection, glass temperature, AC heat, acceptance bands, disclosures); research brief in `docs/research/cbd-brief.md` (#8).
- Gallery card for block 3 (#8).
- Fourth block, `waterfront`: an invented river-bank block with a tree-lined promenade, two ventilation corridors along the river wind, two sheltered streets across it and a garden with a still pond, as one offline HTML file (#9).
- Per-cell wind factor f_w = clamp(shelter × channelling, 0.3, 1.2) feeding the convective coefficient h_c = 5.7 + 3.8 u f_w and the walkers' comfort; blocks without a wind direction keep f_w = 1 and are unchanged pixel for pixel (#9).
- Calm (1 m/s) and breezy (3 m/s, default) wind presets with buttons and `?u=1|3` (#9).
- Pen-drawn wind lines with dashes that move at the local wind speed, labelled "assumed direction × shelter factor, not computed flow"; `W` and `?wind=0|1` (#9).
- Prescribed river (small daily range, below the air) and still-pond (warm at night) surface curves (#9).
- The water's effect on the air as an overlay along the wind lines, labelled "illustrative, from literature, not simulated"; `A` and `?air=1` (#9).
- Walkers weigh shade and the local wind through apparent temperature (#9).
- Cards: the river, the pond at night, the ventilation corridor, the sheltered street, riverside shade; heat cards show f_w, local wind and h_c (#9).
- Glossary terms: wind factor, ventilation corridor, fetch, sheltering, apparent temperature (#9).
- `docs/sources.md`: block 4 sections (wind factor, streets, parameters, water, air overlay, wind lines, comfort and walkers, acceptance bands with the rows outside disclosed, disclosures); research brief in `docs/research/waterfront-brief.md` (#9).
- Check that blocks 1–3 render the same pixels as before block 4 (`tests/e2e/regression.test.mjs`) (#9).
- Gallery card for block 4 (#9).
- References page `references.html`: every source key, grouped by block plus "Model and methods", with authors, year, title, venue, DOI or URL (as text, offline) and reading-status flags; generated by `scripts/references.mjs` in `npm run build`, linked from the gallery and named in each block's terms panel, and a References section in the README (#9).
- Fifth block, `hutong`: an invented Beijing-like block of single-storey courtyard houses (siheyuan) with grey brick walls and grey tile roofs between 5 m lanes, a 10 m main lane and a north–south lane, with jujube, pomegranate and pagoda trees, vine pergolas and summer mat awnings (天棚), as one offline HTML file (#10).
- Evening splash at 19:00 (`P`, panel button, `?splash=0|1`, default on): two lanes and about two in five courtyards get 1 mm of water that evaporates through a new surface water store W (bulk evaporation LE = L β(W) (h_c/c_p) (q_sat(Ts) − q_a)); the splashed lanes cool by about 6 K within the hour and 5 K at 23:00 (#10).
- Species trees and flat screens: each tree species and the pergola and awning let through their own share of the sun (exp(−0.5 LAI)); screens shade like crowns and count as cover for the sky view (#10).
- Cards: low lanes (H/W, noon sunlit share), courtyards (shade from above; measured courtyard air quoted, not simulated), the summer mat awning 天棚 in Chinese and English, the splash (with β_wet sensitivity and the old evaporation term alone), trees and vines; heat cards show the water on a splashed cell and a tree's species and crown transmission (#10).
- Glossary terms: siheyuan, tianpeng (天棚), surface water store, wet-bulb temperature; the street-canyon term also appears in block 5 (#10).
- `docs/sources.md`: block 5 section (materials, lanes, the water store with its splash curve and sensitivity, roofs, shaded lanes, courtyards, trees, walkers, acceptance bands with the rows outside disclosed, disclosures); research brief in `docs/research/hutong-brief.md` (#10).
- Every block page's terms panel now links to `references.html` (a relative link inside the repository) (#10).
- Check that block 4 renders the same pixels as before block 5 (`tests/e2e/regression.test.mjs`, fixture from the block 4 branch) (#10).
- Gallery card for block 5 (#10).
- Sixth block, `parking`: an invented car park and industrial brownfield (848 parked cars in an open section, a section with trees on the footpaths between the bays and a section under solar canopies; a concrete loading yard, rusty corrugated steel sheds, rail sidings on ballast, an irrigated lawn, bare compacted soil and scrubby dry vegetation), as one offline HTML file (#11).
- Ground heat flux G kept by the model (opt-in `stepFlux`, the same arithmetic as the plain step; blocks 1–5 unchanged pixel for pixel) and a night-release overlay that draws it as rising strokes where the ground gives heat back and down-ticks where it takes heat in (`G`, panel button, `?flux=0|1`, default off) (#11).
- Parked cars as a sub-grid shade (the share of a cell under car footprints loses its direct sun by day and its sky view at night) and the ground under the PV canopy with the measured sky view 0.11 (Golden et al. 2007) (#11).
- Cards: thick pavement storage and the night release (Ts and G through the day, damping depth), the solar canopy (with Golden et al.'s numbers and the band miss), lot trees, the rusty shed, the brownfield ground, and a hot-car card that quotes measured cabin temperatures (information only, not modelled); heat cards show G now and at 23:00 and the share of a cell under cars (#11).
- Glossary terms: heat storage, damping depth, ground heat flux, thermal inertia (#11).
- `docs/sources.md`: block 6 section (materials, cars and the PV canopy in the model, the 23:00 picture with G, the PV comparison, lot trees, shed cooling, thin layer and sensitivity, walkers, acceptance bands with the rows outside disclosed, disclosures); research brief in `docs/research/parking-brief.md` (#11).
- Check that block 5 renders the same pixels as before block 6 (`tests/e2e/regression.test.mjs`, fixture from the block 5 branch) (#11).
- Gallery card for block 6 (#11).
- Seventh block, `estate`: an invented older high-rise housing estate at 35° N (four rows of 18-floor east-west slabs 80 m apart, two 30-floor point towers, two-storey shops, worn lawns, surface parking, plane and pagoda trees, AC condensers stacked on the façades), as one offline HTML file (#13).
- The 大寒 (Great Cold, 20 January) sunlight rule checked at every ground-floor sill: rays to the sun every 5 min of true solar time from 08:00 to 16:00, 0.9 m above the floor, stretches of 10 min or more; every sill gets at least 3.5 h (rule ≥ 2 h) (#13).
- A 大寒 view, geometry only (`S`, panel buttons, `?date=jul|dajhan`): the buildings' 20 January shadows at the same clock hour, cut where a building stands in front, and a tally per flat on each slab's roof edge with its hours of 大寒 sun (#13).
- A condenser overlay (`C`, panel button, `?ac=1`): plumes rising from the visible condenser stacks (more when more flats run their AC), the heat of each south face in kW, and the site's W/m² (peak about 43 W/m² at 20:00); the air stays fixed (#13).
- A plume wall term, on by default in this block only (`?acwall=0` for checks): the walls in the condensers' plume zones are taken up to 2 K warmer, which only the Tmrt of a person on the ground feels (at most 0.18 K); surface temperatures do not change (#13).
- Cards: spacing for winter sun (with a section drawing of the July and 大寒 noon sun), the July courtyard, point towers, condensers (rejected heat, exhaust rise, the site's W/m² by hour, measured stacks) and lawns and paving; heat cards show a slab's flats, condensers and 大寒 sill hours, and the share of condenser walls a ground cell sees (#13).
- Glossary terms: 大寒日 sunlight rule, effective height, spacing coefficient, condenser heat rejection, EER (#13).
- `docs/sources.md`: block 7 section (parameters, sun and shadow geometry, the sill rule and a check on long slabs, the July courtyard, condensers and the plume term, sensitivity, walkers, acceptance bands with the soft miss disclosed, disclosures); research brief in `docs/research/estate-brief.md` (#13).
- Gallery card for block 7 (#13).
- Check that every block page (1–7) reads cleanly: every block-panel card, a grid of heat cards and every terms-panel footnote, failing on "undefined", "NaN", a source key without its text, an empty source line or a page error (`tests/e2e/cards.test.mjs`) (#13).
- `docs/sources.md`, block 7: the engine's sun (`sun.js`, NOAA's fractional-year declination) is about 0.2° off the full NOAA algorithm on the design days; the brief's noon altitudes agree with the full algorithm, and with it two long slabs at the brief's 1.47 H_eff give exactly 2 h (1.5 h with the engine's sun). Documented, not changed (it would move every block's pixels) (#13).

### Changed
- Engine: faster shadow masks (same results), per-tree crown transmission, a model run over a subset of cells, and a renderer that can draw into one band of a shared canvas. Block 1 renders the same pixels and loads faster (#5).
- Engine: sunlight reflected diffusely by opaque walls is now part of the model in every block, K_wr = α_w (1 − SVF) K_wall with wall albedo 0.3 (unverified, cited range 0.2–0.5) and half of each wall taken as sunlit (an engine assumption). It warms pavements and people next to walls a little, so block 1 and 2 numbers changed (#8):
  - Block 1 at 15:00 / 23:00 (probe cells): aged asphalt 64.0 / 31.7 → 64.4 / 31.8 °C, concrete 55.4 / 32.6 → 56.4 / 32.8 °C, shaded paving 41.6 / 31.2 → 42.3 / 31.4 °C; lawn, roofs and the pond unchanged to 0.1 K. The same seven rows stay outside the brief's ranges; two moved further out: sunlit asphalt at 15:00 (region mean 63.7 → 64.1 °C, range 55–62) and shaded paving at 15:00 (40.6 → 41.6 °C, range 34–40).
  - Block 2: the new cool-pavement coating's pedestrian ΔTmrt at noon rose from +2.6 to +2.9 K, toward Middel's +3 to +5 K but still 0.1 K short; its road ΔTs went from −4.9 to −4.8 K (still inside). The other disclosed misses barely moved: permeable pavers −14.6 K at d = 0 and −7.5 K at d = 1 (unchanged), the one-year coating −2.1 → −2.0 K (ΔTs) and +1.0 → +1.1 K (ΔTmrt). The trade-off card now describes the wall reflection instead of calling it missing.
- Engine: the model's per-minute step is a separate function (same arithmetic); block 3 starts each run with six coarse 10-min days before the 1-min days (the convergence test is unchanged) and uses a 32-direction horizon scan. Each block loads in under 1.5 s locally (#8).
- Engine: routes may carry a per-pixel weight field (block 4 only), `tmrt` takes an optional sunlit share for a 2 m pixel, and the model accepts a per-cell wind factor and the river / still-pond water kinds. Blocks 1–3 do not use any of these; their pages render the same pixels as before (#9).
- Build: each page now carries only the engine core and its own block's modules (other blocks' modules become small stubs); pages are 288–331 KB instead of about 372 KB, and blocks 1–3 render the same pixels (#9).
- Engine: a per-cell surface water store (empty unless a block splashes), flat screens with their own transmission, per-species crown transmission, an optional 4 × 4 shade sampling with a ray-marched building mask and a scanline rasteriser, an optional exact grid sky-view scan, multi-shape and multi-stroke pen items, and renderer options to skip edge pooling and off-tile shadow polygons. Only block 5 uses them; blocks 1–4 render the same pixels as before (#10).
- Build: the external-reference check now allows relative links inside the repository (such as `../../references.html`) and still rejects any link with a scheme, a host or a root path, and any `src`, `@import` or `url()` that is not `data:` or `#` (#10).
- Pages are 339–382 KB (block 5: 368 KB), up from 288–331 KB, because the shared engine carries the new code paths (#10).
- Engine: the model can keep the ground heat flux G (`opts.flux`), the depth sort takes an opt-in `front` flag for overhead screens over overlapping objects, three ground materials are appended (ballast, dry soil, scrub), and the renderer draws lot cars and PV canopies and the night-release overlay. Only block 6 uses them; blocks 1–5 render the same pixels as before (#11).
- Build: a smaller shared core on every page. Each page now carries only the source keys it can show, no parameter notes (they are for `docs/sources.md`) and only its own block's glossary terms; block-only drawing and controls moved into block modules (block 5 and 6 drawing in `htkit.js` / `pkkit.js`, the AC, wind / air and night-release overlays in their block UI modules, blocks 5 and 6 page parts as plugins, `reflect.js` on the glass page only, one CSS rule set for the block panels). The shared core is 279–283 KB, budgeted at 290,000 B by a test; pages are 282–335 KB (block 6: 330 KB), down from 369–412 KB, and blocks 1–6 render the same pixels as before (#11).
- `window.atlas.parking` is set on the car park page only (it was the loaded block plugin's API on blocks 5 and 7) (#13).
- Engine: blocks 1–6 carry 723 B more shared core each (the block-7 hooks in `app.js`, its stubs and panel CSS); block 7's drawing, overlays and page parts are in its own modules (`eskit.js`, `estate.js`, `esui.js`). The shared core is 280–286 KB (block 7: 285.7 KB); blocks 1–6 render the same pixels as before. Block 7's page is 348 KB (#13).

### Fixed
- The glossary entry "Reflection spot" in `docs/sources.md` no longer reads "In this model: undefined"; block-3-only terms are quoted with block 3's numbers (#8).
- Dragging the hour slider no longer stutters: frames stay at 60 fps while new hours are baked a few tiles per frame and pre-baked in idle time; the exact frame is restored on release (#3).
