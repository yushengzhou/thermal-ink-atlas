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
- Glass wall temperature (Ta + a_g I_f / (h_o + h_i)) and glass emissivity in the longwave the street sees (#8).
- Reflection spots in the day view (a pale glint wash with a fine ink hatch) and in the thermal view (#8).
- Walkers weigh reflection spots by their Tmrt, so they avoid glare even in shade; the sweat cue follows Tmrt in spots too (#8).
- Cards: street canyon (sky view, day shade, night lag), each glass type (ρ₀, spot ΔTmrt), the reflection spot ("out of the sun, still hot"), AC rejected heat (an overlay, not felt in the model) and the concave-façade extreme case (#8).
- Glossary terms: wall reflection, glass curtain wall, specular reflection, Fresnel reflection, reflection spot, street canyon (H/W), low-e glass, AC waste heat (#8).
- `docs/sources.md`: block 3 sections (glass parameters, canyons, glass optics, specular reflection, spots, walkers, wall reflection, glass temperature, AC heat, acceptance bands, disclosures); research brief in `docs/research/cbd-brief.md` (#8).
- Gallery card for block 3 (#8).

### Changed
- Engine: faster shadow masks (same results), per-tree crown transmission, a model run over a subset of cells, and a renderer that can draw into one band of a shared canvas. Block 1 renders the same pixels and loads faster (#5).
- Engine: sunlight reflected diffusely by opaque walls is now part of the model in every block, K_wr = α_w (1 − SVF) K_wall with wall albedo 0.3 (unverified, cited range 0.2–0.5) and half of each wall taken as sunlit (an engine assumption). It warms pavements and people next to walls a little, so block 1 and 2 numbers changed (#8):
  - Block 1 at 15:00 / 23:00 (probe cells): aged asphalt 64.0 / 31.7 → 64.4 / 31.8 °C, concrete 55.4 / 32.6 → 56.4 / 32.8 °C, shaded paving 41.6 / 31.2 → 42.3 / 31.4 °C; lawn, roofs and the pond unchanged to 0.1 K. The same seven rows stay outside the brief's ranges; two moved further out: sunlit asphalt at 15:00 (region mean 63.7 → 64.1 °C, range 55–62) and shaded paving at 15:00 (40.6 → 41.6 °C, range 34–40).
  - Block 2: the new cool-pavement coating's pedestrian ΔTmrt at noon rose from +2.6 to +2.9 K, toward Middel's +3 to +5 K but still 0.1 K short; its road ΔTs went from −4.9 to −4.8 K (still inside). The other disclosed misses barely moved: permeable pavers −14.6 K at d = 0 and −7.5 K at d = 1 (unchanged), the one-year coating −2.1 → −2.0 K (ΔTs) and +1.0 → +1.1 K (ΔTmrt). The trade-off card now describes the wall reflection instead of calling it missing.
- Engine: the model's per-minute step is a separate function (same arithmetic); block 3 starts each run with six coarse 10-min days before the 1-min days (the convergence test is unchanged) and uses a 32-direction horizon scan. Each block loads in under 1.5 s locally (#8).

### Fixed
- Dragging the hour slider no longer stutters: frames stay at 60 fps while new hours are baked a few tiles per frame and pre-baked in idle time; the exact frame is restored on release (#3).
