# Research brief: surface-temperature model and parameters (2026-11-26)

Values marked **unverified** must be checked before they are cited in the published atlas.

## Recommended model: force-restore per grid cell (Deardorff 1978)

```
dTs/dt = (2√π / (μ√τ)) · G − (2π/τ) · (Ts − Td)            τ = 86400 s, μ = √(kC)
G   = (1−α)·K↓ + ε·L↓ − ε·σ·Ts⁴ − h_c·(Ts − Ta) − EF·Q*
K↓  = sunlit·I_b·sinβ + SVF·D           (× e^(−0.5·LAI) under trees)
I_b ≈ 1361 · 0.7^(AM^0.678), AM ≈ 1/sinβ          (Meinel; unverified)
D   ≈ 0.12 · I_b · sinβ
L↓  = SVF·ε_sky·σ·Ta⁴ + (1−SVF)·σ·T_wall⁴,  ε_sky = 1.24·(e_a/Ta)^(1/7)   (Brutsaert 1975)
h_c = 5.7 + 3.8·u
Ta(t): sinusoid, Tmin at sunrise, Tmax at 15:00
Td: 24 h mean of Ts from the previous cycle (spin up 2–3 days)
```

- EF (evaporative fraction): 0 dry impervious; 0.6–0.8 grass/canopy; 0.3 wet permeable, decaying.
- Thin layers (metal, membrane, glass): effective heat capacity 5–20 kJ m⁻² K⁻¹ instead of μ term.
- Water: Ts ≈ daily mean Ta − 1 K, ±1 K swing.
- Cost: 6,400 cells (5 m) × 1,440 steps × 3 days ≈ 28 M ops, < 1 s at load.

## Parameters (Oke tables from memory, unverified; temps are targets for Ta 25–35 °C)

| Material | α | ε | μ (J m⁻² s⁻½ K⁻¹) | Ts 15:00 °C | Ts 23:00 °C |
|---|---|---|---|---|---|
| Fresh asphalt | 0.05 | 0.95 | ~1200 | 60–68 | 33–38 |
| Aged asphalt | 0.12–0.15 | 0.95 | ~1200 | 55–62 | 32–37 |
| Concrete paving | 0.10–0.35 | 0.71–0.90 | ~1785 | 45–60 | 31–36 |
| Stone / brick paving | 0.20–0.40 | 0.85–0.95 | 2220 / 1065 | 45–55 | 30–35 |
| Shaded paving | — | — | as above | 34–40 | sunlit −1 to −3 |
| Permeable paving | 0.15–0.30 | 0.90–0.95 | ~870 (assumed) | dry≈concrete, wet −5–10 | 27–32 |
| Dark metal roof | 0.10–0.25 | ~0.9 painted | thin | 65–80 | 22–26 |
| Dark membrane roof | 0.08–0.18 | 0.92 | ~300–500 (assumed) | 60–75 | 24–28 |
| Cool roof | ≥0.65 new, 0.5–0.6 aged | 0.85–0.90 | as dark roof | 38–45 | 22–25 |
| Glass curtain wall | 0.08–0.52 by angle | 0.84–0.92 | thin | 35–50 (unverified) | ≈ air |
| Irrigated grass | 0.16–0.26 | 0.90–0.95 | soil 600–2200 | 30–40 | 18–24 |
| Tree canopy | 0.15–0.20 | 0.97–0.99 | ~0 | air +0–3 | ≈ air |
| Ground under canopy | its material | — | — | air +0–5 | air +1–2 |
| Open water | 0.03–0.10 | 0.92–0.97 | 1545 (mixing ↑) | 26–30 | 25–28 |

Checked anchors: EPA peak pavement 48–67 °C; Mesa AZ 15:00 (Ta 40.5): asphalt 68, sunlit concrete 60, shaded concrete 34 °C; LBNL asphalt albedo 0.05 fresh / 0.12–0.15 aged; +0.2 roof reflectance ≈ −10 °C metal roof; under canopy +1–2 °C at night.

## SVF and comfort
- Canyon SVF = cos(arctan(2H/W)); grid: horizon scan 8–16 directions, SVF ≈ 1 − mean sin²(horizon angle).
- Tmrt (SOLWEIG-style, Lindberg 2008): Tmrt = [(a_k·S_abs + a_p·L_abs)/(a_p·σ)]^¼ − 273.15, a_k 0.7, a_p 0.97; f_p ≈ 0.308·cos(β(1−β²/48402)).
- UTCI: Bröde et al. 2012 polynomial (210 terms); oracle `pythermalcomfort`. Bands: 32–38 strong, 38–46 very strong, >46 extreme.

## Shade-seeking evidence
- Melnikov et al. 2022 (Sci Rep, doi 10.1038/s41598-022-06383-5): shade walking perceived ~16% shorter (factor ~0.84); tree shade ~half as effective as building shade.
- Levenson et al. 2025 (Buildings & Cities, doi 10.5334/bc.574): 5,263 pedestrians, Tel Aviv: ~60% in shade, >70% where shade and sun equally available.
- Caveat (Ruimy & Aleksandrowicz, ICUC12): pedestrian counts did not fall in heat → model rerouting, not fewer people.

## Sun position: NOAA solar equations (https://gml.noaa.gov/grad/solcalc/solareqns.PDF; coefficients to be checked; suncalc as test oracle only).

## Sources
Deardorff 1978 (NASA NTRS 19780019748); Oke 1981 doi 10.1002/joc.3370010304; Oke et al. 2017 Urban Climates (print, not checked); Doulos et al. 2004 doi 10.1016/j.solener.2004.04.005; Bröde et al. 2012 doi 10.1007/s00484-011-0454-1; Kántor & Unger 2011 (core.ac.uk/download/42945806.pdf); EPA Cool Pavements; LBNL Pomerantz (lbnl-49283); Middel et al. 2012 Climate Research; ASU Mesa readings.
