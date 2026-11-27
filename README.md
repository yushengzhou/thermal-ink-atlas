# thermal-ink-atlas

Hand-inked isometric city blocks that show urban heat through one heat-wave day:

- Block 1, `asphalt-park`: an old asphalt street next to a shady pocket park.
- Block 2, `sponge-retrofit`: one block Before and After a sponge-city and
  cool-roof retrofit, with a draggable divider and a days-since-rain slider.

Live: https://yushengzhou.github.io/thermal-ink-atlas/

Both blocks are simulated and invented (no real addresses). Temperatures are
modelled with a simple surface energy-balance model, not measured.

![Thermal view of block 1 at 15:00](docs/media/thermal-1500.jpg)

## Open it

- Double-click `cities/asphalt-park/index.html` or
  `cities/sponge-retrofit/index.html`. Each is one offline file.
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

## Build and test

```sh
npm ci
npm run build   # rebuilds the single-file HTML and docs/sources.md
npm test        # unit tests and Playwright checks
```

## Model and sources

See [`docs/sources.md`](docs/sources.md) for the model, parameters and
citations. Values not yet checked against a primary source are flagged
*unverified* there and on the heat cards.

## Licence

MIT, see [`LICENSE`](LICENSE).
