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

### Fixed
- Dragging the hour slider no longer stutters: frames stay at 60 fps while new hours are baked a few tiles per frame and pre-baked in idle time; the exact frame is restored on release (#3).
