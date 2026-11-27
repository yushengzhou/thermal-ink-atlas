# Research brief: retrofit parameters (block 2), 2026-11-27

Unverified items are marked. Air temperature is a fixed forcing in this engine; never claim model air cooling.

## Cooling magnitudes (sanity checks)
| Measure | ΔTs | ΔTa | ΔTmrt | Source |
|---|---|---|---|---|
| Cool roof vs conventional | −28 to −33 K at summer peak (white 0.80 vs grey 0.20 ≈ −28 K) | city −0.1 to −0.33 K per +0.1 albedo | — | EPA Cool Roofs compendium; ENERGY STAR/LBNL; Santamouris 2014 doi 10.1016/j.solener.2012.07.003 |
| Green roof vs black | up to −18.4 K (Javits, NYC); EPA up to −31 K | city sims −0.3 to −3 K | — | NOAA repository noaa_57843; EPA green roofs |
| Reflective pavement (LA) | −4 to −6 K | −0.5 K afternoon | +4 K midday (+118 W m⁻² reflected SW, +168 at noon) | Middel et al. 2020 ERL doi 10.1088/1748-9326/ab87d4 |
| Same, neighbourhood | max −5 K pm, −0.9 K am | max −0.2 K | — | Ko et al. 2022 ERL 17 044027 |
| Permeable pavement, wetted | −15 to −35 K early pm; −2 to −7 K 25 h later; dry porous asphalt ~+5 K vs dense | small | — | Li, Harvey et al. 2013 ERL 8 015023 (corrigendum not checked) |
| Street trees | canopy model | block cooling strongest above ~40% canopy | −7 K Tmrt modelled (Phoenix) | Ziter 2019 PNAS (press release only); Middel 2021 BAMS doi 10.1175/BAMS-D-20-0193.1 |
| Sponge city | no robust measured block-scale number — do not quote one | | | |

Ageing: cool pavement albedo 0.26 → 0.18 in 1 yr (Ko 2022), ~1 K less cooling. Chicago code: roof initial ≥0.72 or 3-yr aged ≥0.50. In-service roofs often below CRRC aged rating (LBNL-6714E).

## Parameters (After)
| Material | α | ε | μ / thinC | EF | Status |
|---|---|---|---|---|---|
| Cool roof new | 0.80 | 0.88 | μ 450 | 0 | LBNL |
| Cool roof aged (default) | 0.60 (0.50–0.70) | 0.88 | μ 450 | 0 | 0.60–0.70 unverified |
| Extensive green roof | 0.20 (0.15–0.25) | 0.95 | μ 600 dry → 1200 wet | wet 0.5, dry 0.25 | α, μ unverified; EF from Heusinger & Weber 2017 doi 10.1016/j.scitotenv.2016.10.168 (Bowen ≈ <1–2) |
| Permeable pavers | 0.26 | 0.92 | μ ~870 dry (assumed) | wet 0.5, dry 0.02 | α verified Li 2013 |
| Porous asphalt | 0.08 | 0.95 | μ ~800 dry (assumed) | as pavers | α verified |
| Cool pavement coating | 0.25 new, 0.18 after 1 yr | 0.92 | μ 1200 | 0 | Middel 2020, Ko 2022 |
| Rain garden | 0.20 | 0.95 | μ 1400 | wet 0.8, dry 0.35 | engine assumption |
| Young street trees | canopy 0.18 | 0.97 | — | 0.7 | LAI 1–2 → transmission 0.37–0.61 (mature LAI 3.5 → 0.17), unverified |

## Decay with days since rain d
EF(d) = EF_dry + (EF_wet − EF_dry)·exp(−d/τ); μ(d) likewise (optional). τ: pavers 1 d (calibrated to Li 2013), rain garden/soil 3 d (McColl et al. 2017 GRL doi 10.1002/2017GL072819, median unverified), green roof 4 d (unverified). Irrigated lawn: no decay. d = 0 = clear day after overnight rain; default d = 3.
Water budget: mm/day = Σ EF·max(Q*,0)·Δt / 2.45e6 (≈3 mm/day at EF 0.5); must not exceed storage (pavers a few mm, 100 mm substrate 20–40 mm — unverified).

## Reflective pavement trade-off
Model's tmrt() already includes ground-reflected SW; α 0.12→0.30 gives ≈ +4–5 K Tmrt, matching Middel's +4 K (acceptance test). Walls reflect no SW in the model (under-estimate; Middel saw +20–30 W m⁻² on sidewalks in the evening). Card: cools the road, not the person; pair with shade.

## Sponge city card
State Council General Office guideline, Oct 2015 (国办发〔2015〕75号): manage rain where it falls (渗、滞、蓄、净、用、排) with green roofs, permeable paving, rain gardens, wetlands; 70% of rainfall absorbed and used on site; 20% of built-up area by 2020, 80% by 2030; applied as 年径流总量控制率. Flooding/water supply first; cooling a co-benefit. Sources: english.www.gov.cn notice 2015-10-16; reprint waizi.org.cn/law/6860.html; MOHURD interpretation cs.com.cn (primary Chinese text not located — unverified).
