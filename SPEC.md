# Spec v1: Thermal-Ink Atlas, first block ("Asphalt street vs pocket park")

Status: approved 2026-11-26.

## Goal
One hand-inked 2.5D isometric block (400 m × 400 m, invented, not a real address) where an old asphalt street sits one street away from a shady pocket park. A visitor watches it draw itself, then sees the heat: press `T` for a watercolour thermal view, use `H` or a time slider to move through a heat-wave day (15:00 sun vs 23:00 night heat), and watch pedestrians move into shade at the hot hours. Click any parcel for a heat card. Everything runs from one offline HTML file, on a new engine written from scratch, with temperatures driven by a simple, cited physical model.

## Non-goals (v1)
- The other 5 blocks (CBD glass, waterfront, hutong, sponge city / cool roof before-after, parking lot).
- The `skill/thermal-ink/` Claude Code skill package and the promo film. (v1 keeps the build/verify scripts they will reuse.)
- Real remote-sensing data, CFD / ENVI-met, wind fields, real city geometry.
- Full UTCI polynomial (v1 shows surface temperature and Tmrt; UTCI later).
- Bilingual README (v1: short English README; Chinese copy later).
- Any code copied from inkcity-atlas (ideas only).

## Inputs / outputs
- Inputs: a scene file (`cities/asphalt-park/scene.js`) listing parcels with footprint, height and material; a parameter table (`engine/materials.js`) with α, ε, μ (or thin-layer heat capacity), evaporative fraction, each with a source and a `verified` flag; site settings with defaults **lat 35° N, 20 July, Ta 25–35 °C, light wind 1.5 m/s** (assumed, easy to change).
- Outputs: `cities/asphalt-park/index.html` (single file), `index.html` gallery page with one card, `docs/sources.md` (parameters and citations).

## Approach
1. **Engine (vanilla JS, Canvas 2D, zero dependencies), in modules:** core (isometric projection, seeded hash RNG, colour) → pen (display-list recorder, wobbly strokes) → kit (boxes, roofs, trees, people) → world (parcels, depth sort by footprint) → sun → thermal → life (agents) → render (per-tile bakes per zoom, layer compositing) → app (clock, keys, `seek`, overlay). A ~20-line build script inlines modules into one HTML file and fails if it is over 500 KB or references anything external.
2. **Determinism contract:** no `Math.random`/`Date` in drawing; frame = pure function of (frame number, camera, look). Public `seek(frame, camera)`; query modes `?f=N&cam=z,cx,cy`, `?thermal`, `?hour=15`.
3. **Sun:** NOAA solar position equations → altitude/azimuth for any hour; cast shadows by projecting box footprints along the sun direction onto the ground, drawn as a translucent layer. Wall shading tones re-baked per hour step (hourly quantised).
4. **Thermal model:** force-restore surface energy balance (Deardorff 1978) on a 5 m grid, with shade from the shadow map, SVF from a horizon scan, evaporation for grass/trees, water held near mean air temperature. Computed once at page load (1-min steps, 3-day spin-up), stored as hourly curves; `seek` only looks values up. Pedestrian Tmrt from a SOLWEIG-style formula.
5. **Thermal view:** low-res heat field composited as a soft watercolour wash over the cached line work, low-saturation mineral palette (cinnabar / amber for hot, Prussian blue / blue-green for cool), edge bleed; no rainbow/jet. Cross-fade ~1 s on `T`.
6. **Agents:** walkers on authored route networks; at each hour each walker picks the route with lowest cost = sun distance + 0.84 × building-shade distance (tree shade counts half), per Melnikov et al. 2022; dwell points in the park. Pure function of (seed, t, hour).
7. **Overlay (vanilla, small):** at most 5 handwritten margin notes; click a parcel → heat card with material, albedo, SVF, surface temperature now vs 15:00 vs 23:00, Tmrt, a plain-language note, and the source.

## Acceptance criteria
- [ ] `cities/asphalt-park/index.html` opens by double-click with no network; built file < 500 KB; zero external requests (checked in Playwright).
- [ ] Draws itself in order: pen scaffold → colour wash → life.
- [ ] `T` toggles the thermal view; `H` and a slider move the hour; `?thermal&hour=15` opens directly there.
- [ ] Physics order at 15:00 (model values and region pixel means): tree shade / water < grass / cool roof < shaded paving < sunlit asphalt / dark roof.
- [ ] Night lag at 23:00: asphalt and concrete warmer than the park lawn; lawn below air temperature.
- [ ] Shadows: direction = sun azimuth + 180°, length = H / tan(altitude), within 2° / 5% at 9:00, 12:00, 15:00, 18:00.
- [ ] At 15:00 the density of pedestrians in shade (people per m²) is at least 2× the density in sun.
- [ ] Determinism: same frame hash for each seeked frame regardless of seek order (≥ 20 frames).
- [ ] Performance: mean ≥ 60 fps and p95 frame time ≤ 33 ms in headless Chrome on the maintainer's Mac.
- [ ] Every parameter shown in a card has a source in `docs/sources.md`; unverified values are labelled as such.
- [ ] CI green (Node + Playwright).

## Test plan
- Unit tests (`node --test`): sun position vs NOAA worked examples (and `suncalc` as dev-only oracle); force-restore ordering and night lag; canyon SVF vs analytic cos(arctan(2H/W)); route cost picks shade.
- Playwright scripts: `verify` (determinism hashes, build order), `thermal` (region pixel-mean ordering at 15:00 and 23:00), `shade` (agent density), `perf` (frame pacing), `size` (budget, no external requests), screenshots for review.

## Docs needed
- Short README (what it is, how to open it, keys, licence).
- `docs/sources.md`: parameter table with citations and the model equations.
- CHANGELOG.

## Repo and infra
- Public repo `yushengzhou/thermal-ink-atlas`, MIT, holder "thermal-ink-atlas contributors"; no names or emails in content.
- CI: Node 20 + Playwright. GitHub Pages deploy only after the maintainer approves.

## Risks
- Several material values come from Oke's tables cited from memory; a researcher pass should confirm them (or we flag them `unverified` on the cards).
- 60 fps with heat wash + shadow layers is unproven; fall back to hourly quantised bakes.
- Hand-drawn quality from scratch takes iteration; expect a couple of review rounds on look alone.
- Rough size of work (guess): 2–3 weeks of engineer time for this one block.
