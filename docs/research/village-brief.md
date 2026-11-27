# Research brief: urban village and informal settlement — heat vulnerability (2026-11-27)

Bottom line: roofs, lane SVF and Tmrt can be modelled with fair confidence; measured indoor excess under tin roofs is ≈+0.6 to +4 K above outdoor air (not 5–8 K), and measured cool-roof indoor cooling ≈−1 to −2.4 K (not −2 to −5 K). Recommend an indoor radiant proxy under the roof plus an information overlay, not simulated indoor air. Engine issues first: 1–3 m lanes can't be resolved on 5 m cells; very thin sheets (tarpaulin) make the explicit 60 s step unstable. Confidence medium on roofs and lanes, low on Chinese urban-village Tmrt (no measured Tmrt for 1–3 m lanes found).

## Evidence
- Shenzhen Pingshan urban village traverses 2011–12: UHI largest 20:00–24:00, mean 1.71 K 18–24 h, peak 3.95 K; THI worse than green reference esp. at night (Guo, Zou, Li, Qiu; journal not confirmed).
- Shenzhen satellite SUHI: high-density urban village 3.53 K, multi-storey 2.62, high-rise 1.60 (Wu et al. 2015/2017, J. HIT).
- Yi et al. 2022 Sci. Total Environ.: Shenzhen urban villages worst summer THI; density worsens, NDVI mitigates.
- Deng et al. 2023 Build. Environ., Guangzhou old blocks: pedestrian Tmrt peak 43.7 °C, air 41.3 at 14:00; SVF and coverage main predictors.
- Scott et al. 2017 PLoS ONE (doi 10.1371/journal.pone.0187300), Nairobi settlements: +3.1 K daily max, +1.83 K daily min vs station; Mukuru +4.8 max; vegetation sites 0.7 K cooler.
- Tasgaonkar et al. 2022 Sci. Data (doi 10.1038/s41597-022-01314-5), 206 loggers: Delhi April tin 33.4 indoor vs 32.8 outdoor; Yavatmal tin 3–4 K above outdoor May–June; indoor above outdoor at night.
- Wilby et al. 2021 ERL 16 024033 (Ghana, 47 rooms): metal-roof concrete rooms 4.5 K warmer by day than mud/thatch, 1.5 K cooler at night.
- Bangkok Khlong Toey at 37 °C air: roof 68.1, ceiling 49.2, wall 45.7, floor 41.1 °C (SEI snippet, unverified).
- Ahmedabad MHT/IIPH (PMC7227734), 16 homes Oct 2017: indoor tin 34.6–35.8, asbestos 32.5–36.8, concrete 31.6–33.8; white paint on tin −1.1 K, Modroof −2.0, thermocol under asbestos −2.4 (from reported means); "4.5 K at peak" in Discussion only. "5–6 °C" press figure unverified.
- Nutkiewicz et al. 2022 RSER (doi 10.1016/j.rser.2022.112183): cool roofs cut up to 91 % annual heat-stress exposure (sim, 17 cities). Burkina Faso cool-roof RCT protocol doi 10.1186/s13063-023-07804-0 (results press-only).
- Emissivity tables: galvanised 0.23–0.28 new, 0.88 old; oxidised GI 0.85; rusted 0.69–0.96 (Engineering Toolbox, Optris). Bare metal SR 0.78 → 0.58 after 3 yr (ENERGY STAR list). No measured albedo for rusty iron, asbestos cement or tarpaulin.
- Vulnerability: Ma et al. 2015 Environ. Int. 75:103, China 66 communities heat waves +5.0 % deaths (2.9–7.2), larger for older people, women, out-of-hospital, dense communities; Nature Medicine 2024 (65+ HR 1.78–1.98; functional decline predicts risk); Ahmedabad 2010 1,344 excess deaths (+43.1 %), HAP ≈1,190 deaths avoided/yr (PMC6236972); India AC ownership 4.9 % (2020–21), ≈8 % 2024 (Carbon Brief); China ≈100 million outdoor workers (Dialogue Earth). No mortality estimate by settlement type or for migrant workers in urban villages found.
- Lanes: SVF = cos(atan(2H/W)) → 0.04–0.16 for H 18–25, W 1–3; evening heat trapping consistent with Pingshan and Tasgaonkar; wind shadows (Baishizhou CFD, MDPI Buildings 15(13):2166).

## Parameters (unverified unless sourced)
| Material | α | ε | thin C (kJ m⁻² K⁻¹) | Basis |
|---|---|---|---|---|
| Rusty corrugated iron | 0.20–0.30 | 0.75–0.90 | 2–4 | ε tables; α assumed |
| New galvanised | 0.55–0.65 | 0.25 | 2–4 | ENERGY STAR, tables |
| Asbestos cement aged | 0.25–0.35 | 0.90 | ≈8 | assumed |
| Tarpaulin | 0.3 | 0.9 | floor 2 | assumed |
| White-painted tin | 0.65 new / 0.50 aged | 0.88 | 2–4 | earlier briefs |
| Concrete roof slab | 0.25 | 0.90 | μ 1785 | Oke |
Stability: τ ≈ C/(4εσT³ + h_c) ≈ C/17; C 2 kJ → 110 s OK; tarpaulin 0.4 kJ → 20 s, explicit 60 s diverges → floor C ≥ 2 kJ or substep.

## Indoor proxies
Radiant (recommended): T_ceiling ≈ T_roof; T_mrt,in⁴ = F_r·T_roof⁴ + (1−F_r)·T_w⁴, T_w = Ta + 1–3 K, F_r 0.3–0.5 (assumption).
Air (illustrative only): T_in − Ta = h_ci·A_r·(T_roof − Ta)/(h_ci·A_r + ρc_p·n·V/3600), h_ci 1–1.5; calibrate n to +2–4 K peak under bare tin.

## Acceptance bands (Ta 35, clear)
Rusty tin 60–75 °C at 15:00; white tin 15–25 K below; asbestos 50–62; lane SVF 0.03–0.16; lane Tmrt noon ≤ Ta + 8, open ≥ Ta + 25; lane − open Tmrt at 22:00 +2 to +6 K; indoor air proxy bare tin +2 to +4 K, cool roof −1 to −2.5 K; never display beyond ±5 K.

## Disclosures and language
Invented place; air fixed (no night canyon air heat, wind, crowding, body heat); indoor values are proxies. Use "urban village (城中村)", "informal settlement", "residents"; "slum" only in source titles; avoid "squalid", "tangled", "chaotic"; drop "tangled wires". Show residents' own measures (community/women-led cool roofs, rooftop shade); vulnerability = exposure + lack of resources, not a trait of people. One neutral line that asbestos cement is a health hazard, no retrofit advice.
