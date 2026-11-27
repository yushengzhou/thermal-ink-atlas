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

### Changed
- Engine: faster shadow masks (same results), per-tree crown transmission, a model run over a subset of cells, and a renderer that can draw into one band of a shared canvas. Block 1 renders the same pixels and loads faster (#5).

### Fixed
- Dragging the hour slider no longer stutters: frames stay at 60 fps while new hours are baked a few tiles per frame and pre-baked in idle time; the exact frame is restored on release (#3).
