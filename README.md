# thermal-ink-atlas

Hand-inked isometric city blocks that show urban heat through one heat-wave day:

- Block 1, `asphalt-park`: an old asphalt street next to a shady pocket park.
- Block 2, `sponge-retrofit`: one block Before and After a sponge-city and
  cool-roof retrofit, with a draggable divider and a days-since-rain slider.
- Block 3, `glass-cbd`: glass towers and street canyons. Deep streets shade
  by day and cool slowly at night; glass façades throw reflected sun onto the
  street. Switch the glass between clear, low-e and mirror.
- Block 4, `waterfront`: a river bank with wind corridors. Streets along the
  river wind stay breezier (cooler pavement), streets across it are sheltered;
  the river cools the air only a short way and the still pond is warm at night.
  Wind lines show the assumed wind, not computed flow.
- Block 5, `hutong`: single-storey courtyard houses between narrow lanes. The
  low lanes stay in the sun at noon; trees, vine pergolas and the summer mat
  awning (天棚) give the shade, and a splash of water at 19:00 cools the paving
  for a few hours (a bilingual card tells the custom).
- Block 6, `parking`: a big open-air car park (open rows, rows with trees,
  rows under solar canopies), a concrete yard, rusty steel sheds, rail sidings
  and a dry brownfield. Thick asphalt and concrete store the day's heat and
  give it back all night (press `G` for the night-release strokes); the sheds
  and the bare soil cool much sooner. A hot-car card quotes measured cabin
  temperatures (information only, not modelled).
- Block 7, `estate`: an older high-rise housing estate. The 18-floor slab rows
  stand far enough apart for two hours of sun at every ground-floor window on
  the Great Cold day (大寒), yet in July their shadows cover only a sixth of
  the courtyards at noon (press `S` for the 大寒 shadows and the sill tallies);
  the AC condensers stacked on the façades put about 43 W/m² over the site
  into the air on a summer evening, shown as plumes (`C`), not felt by the
  model's fixed air.
- Block 8, `campus`: a school campus on a summer day-camp day. The
  artificial-turf pitch reaches about 75 °C, some 30 K above the grass field
  next to it, and cools to the grass's temperature by dawn; the rubber of
  the playground is 22 K cooler under the shade sails. Watering the pitch at
  14:00 (`I`) helps for minutes, and only a little in this model; `U`
  hatches every surface above its 1-min contact-burn limit (ISO 13732-1).
  Children come out at play times and look for shade.
- Block 9, `busstop`: an avenue crossed by a street, with five bus stops
  (an opaque metal roof, clear and opal polycarbonate, trees and no
  shelter, a glass box) and two steel footbridges, one covered. People
  waiting are computed at their own places, below the 5 m grid: the opaque
  roof takes about 34 K of Tmrt off them at 15:00, translucent roofs much
  less, and from 15 to 17 h the low western sun gets in from the side,
  where a west screen helps more than a bigger roof. Buses come on a
  headway schedule; `K` shows which waiting places have the sun on the
  head, `U` flags benches, handrails and decks above their contact-burn
  limit. The open steel deck is about 30 K hotter in Tmrt than the
  covered one.
- Block 10, `village`: an urban village (城中村) of six- to eight-storey
  "handshake buildings" (握手楼) with lanes 1.5–3 m wide, an old village
  centre, and a low-rise edge of rooms under iron, asbestos-cement and
  tarpaulin roofs. The lanes are narrower than the model grid, so their sky
  view (about 0.05) and sun come from each lane's own width and walls; a
  person in a lane stays about 5 K warmer in Tmrt than one on the open square
  at 22:00. Bare rusty iron reaches about 71 °C at 15:00; `R` paints the
  residents' white roofs (about 21 K cooler), `O` shows a proxy of the room
  under each sheet roof (not a simulation). Cards on who is most at risk
  quote the studies, not the model.

Live: https://yushengzhou.github.io/thermal-ink-atlas/

All blocks are simulated and invented (no real addresses). Temperatures are
modelled with a simple surface energy-balance model, not measured.

![Thermal view of block 1 at 15:00](docs/media/thermal-1500.jpg)

## Open it

- Double-click `cities/asphalt-park/index.html`,
  `cities/sponge-retrofit/index.html`, `cities/glass-cbd/index.html`,
  `cities/waterfront/index.html`, `cities/hutong/index.html`,
  `cities/parking/index.html`, `cities/estate/index.html`,
  `cities/campus/index.html`, `cities/busstop/index.html` or
  `cities/village/index.html`.
  Each is one offline file.
- Or serve the folder and open <http://localhost:8000/>:

  ```sh
  python3 -m http.server
  ```

## Controls

| Input | Does |
|---|---|
| `T` | thermal view on/off |
| `H` / `Shift+H` | one hour later / earlier |
| slider | pick the hour |
| drag / wheel | pan / zoom |
| click a parcel | heat card (material, temperatures, source) |
| `terms` button | glossary of terms |
| `B` (block 2) | swap Before / After |
| `G` / `Shift+G` (block 3) | next / previous glass type |
| `W` / `A` (block 4) | wind lines / water's air overlay on or off |
| `P` (block 5) | evening splash at 19:00 on or off |
| `G` (block 6) | night-release strokes (ground heat flux) on or off |
| `S` / `C` (block 7) | 大寒 (20 January) shadows and sill tallies / condenser plumes on or off |
| `I` / `U` (block 8) | water the pitch at 14:00 / contact-burn hatching on or off |
| `K` / `U` (block 9) | waiting places (head in sun or shade) / contact-burn flags on or off |
| `R` / `O` (block 10) | the residents' white roofs / the room under the roof (proxy) on or off |

## Build and test

```sh
npm ci
npm run build   # rebuilds the single-file HTML, docs/sources.md and references.html
npm test        # unit tests and Playwright checks
```

## References

Temperatures come from a simple model fed with parameters from the literature,
not from measurements. The full list, grouped by block with DOIs and reading
status, is [`references.html`](references.html) (generated by `npm run build`).
The model, every parameter and its citation are in
[`docs/sources.md`](docs/sources.md); values not yet checked against a primary
source are flagged *unverified* there and on the heat cards.

Key sources per block:

- All blocks (model): Deardorff 1978 (force-restore); NOAA solar equations;
  Brutsaert 1975 (sky emissivity); Oke 1987/2017 (surface properties);
  Lindberg et al. 2008 (SOLWEIG, Tmrt).
- Block 1, `asphalt-park`: Pomerantz et al. 2000 (LBNL-43442); US EPA 2008 / 2012
  heat-island compendium; Melnikov et al. 2022 (shade-seeking walkers).
- Block 2, `sponge-retrofit`: Santamouris 2014; Li, Harvey et al. 2013
  (permeable pavements); Middel et al. 2020 (reflective pavement); Ko et al.
  2022; State Council 2015 sponge-city guideline.
- Block 3, `glass-cbd`: Oke 1981 (canyon geometry); Johansson 2006 (Fez);
  EnergyPlus window angular properties; Du et al. 2025 (Chengdu reflection
  zones); Speroni et al. 2022 (abstract only).
- Block 4, `waterfront`: Völker et al. 2013; Hathway & Sharples 2012
  (secondary); Jacobs et al. 2020; Solcerova et al. 2019 (night pond);
  BoM apparent temperature (Steadman 1994).
- Block 5, `hutong`: Hendel et al. 2015 and 2016 (pavement watering, Paris);
  Takebayashi et al. 2023 (Kobe); Lin et al. 2019 (Harbin courtyards);
  Johansson 2006 (Fez); Deng Yunxiang, 天棚遮阴 (the mat awning).
- Block 6, `parking`: Golden et al. 2007 (PV canopy, Phoenix); Stempihar et
  al. 2012 (pavement thickness); Takebayashi & Moriyama 2009 (grass parking);
  Scott, Simpson & McPherson 1999 (lot trees); Vanos et al. 2018 and McLaren,
  Null & Quinn 2005 (hot cars).
- Block 7, `estate`: GB 50180-2018 (the 大寒 sunlight rule; table values
  unverified); Lai, Maing & Ng 2017 (Tmrt and sky view in shade, Hong Kong);
  Cai & Hu 2017 (paving vs grass, Wuhan); Mu et al. 2025 (condenser exhaust,
  Changsha); Bruelisauer et al. 2014 (condenser stacks, Singapore).
- Block 8, `campus`: Jim 2016 and 2017 (turf vs grass, Hong Kong); Singh
  et al. 2024 (review of 23 turf studies); Vanos et al. 2016 and 2017
  (playgrounds, shade sails); Pfautsch et al. 2020 (school shade, New South
  Wales); McNitt et al. 2008 (watering turf); ISO 13732-1 via CENELEC Guide
  29 (contact-burn limits; unverified).
- Block 9, `busstop`: Dzyuban et al. 2022 (Phoenix bus stops); Middel et
  al. 2021 (shade and Tmrt, Tempe); Lanza et al. 2025 (Houston stops, glass
  shelters); Chen et al. 2024 (covered walkway, Hong Kong); Hong Kong
  Highways Department BS/GN/047 (shelter guidance); a polycarbonate
  datasheet (transmission); ISO 13732-1 via CENELEC Guide 29. Most were read
  through the research brief and are flagged unverified.
- Block 10, `village`: Guo et al. (Pingshan traverses, Shenzhen); Wu et al.
  2015/2017 and Yi et al. 2022 (Shenzhen urban villages); Deng et al. 2023
  (Guangzhou old blocks); Scott et al. 2017 (Nairobi); Tasgaonkar et al. 2022,
  Vellingiri et al. 2020 and Wilby et al. 2021 (rooms under metal roofs, cool
  roofs); Nutkiewicz et al. 2022; Ma et al. 2015 and Hess et al. 2018 (heat
  and mortality). Most were read through the research brief and are flagged
  unverified.

## Licence

MIT, see [`LICENSE`](LICENSE).
