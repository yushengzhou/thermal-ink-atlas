# Research brief: older high-rise residential estate (老城区高层住宅小区), 35°N (2026-11-27)

Bottom line: the winter sunlight rule (大寒日 ≥2 h at the ground-floor sill) spaces E–W slab rows ≈1.47 × effective height at 35°N, but the July noon north shadow is only 0.26 H deep, so most of a rule-compliant courtyard is in full sun 10:00–16:00: "spacing made for winter sun leaves summer courtyards open". Each AC condenser rejects ≈4.5 kW with exhaust ≈5–7 K above ambient; with fixed air, show condenser heat as an overlay plus at most a small wall term (< ≈1 K Tmrt at ground). Confidence high for geometry, medium for condensers, low for estate summer Tmrt.

## Rules
- GB 50180-2018 (issued 2018-07-10, effective 2018-12-01), clause 4.0.9 / Table 4.0.9 (codeofchina). Table values from memory, unverified: zones I/II/III/VII, cities ≥500k: 大寒 ≥2 h (smaller ≥3 h); 35°N cities (Zhengzhou, Xi'an, Xuzhou) zone II. Elderly housing ≥2 h on 冬至; old-area renovation new housing ≥1 h 大寒.
- Zhejiang DB33/1050 draft: 大寒 08:00–16:00, 冬至 09:00–15:00 true solar time; cumulative; ≥10 min segments; step ≤5 min; test point 0.9 m above floor; spacing coefficient method "no longer appropriate" for high-rises.
- GB 55038-2025 mandatory from 2025-05-01 (restatement unverified). Old estates approved under GB 50180-93 (similar, unverified). Beijing coefficient 1.7 unverified (calc 1.78 at 39.9°N).

## Geometry (calculated)
| | noon altitude | noon N-shadow | spacing 1/2/3 h |
|---|---|---|---|
| 20 Jul | 75.6° | 0.257 H | — |
| 大寒 20 Jan | 34.8° | 1.44 H | 1.45/1.47/1.52 H |
| 冬至 | 31.6° | 1.63 H | 1.64/1.68/1.74 H |
July shadow lengths 07–12 h: 2.29/1.39/0.90/0.58/0.35/0.26 H; sun crosses E–W line 08:10 and 15:50 solar time. 18F ≈54 m → 14 m July band vs 78 m 大寒; 30F ≈87 m → 22 vs 125 m. Courtyard at G = 1.47 H, 20 July: beyond 0.37 H from the southern slab no shade 10:00–16:00.

## Measured (thin)
Lai, Maing & Ng 2017 HK (doi 10.1016/j.buildenv.2016.12.034): Tmrt +1.6 K per +10 W m⁻², −0.1 SVF ≈ +1.6 K (November). Wo Che Estate podium SVF 0.32–0.35 (PLEA 2016). Li et al. 2023 HK (doi 10.1016/j.buildenv.2023.110225): SVF threshold ≈0.4. Yang, Lau & Qian 2010 Shanghai (Build. Environ. 45(1):115): vegetation matters more at night; night UHI unexplained by site → anthropogenic heat. Wuhan Aug 2015 (IJESD vol 8): sunlit hard paving 9.87 K hotter than grass.

## Condensers
Mu et al. 2025 Changsha (doi 10.3390/atmos16010100): exhaust +5.2 K day, +6.5 K night, RH −14.2 % (snippet). Calc: 3.5 kW cooling, EER 3.3 → Q_rej ≈4.5 kW; fan 0.5–0.7 m³ s⁻¹ (unverified) → +5.5–7.5 K. Stacks/recesses: Chow & Lin 1999 HK > 7 K at top floors; Bojic +4–9 K at 30th storey; Bruelisauer et al. 2014 Singapore (Energy Build. 71:28) void +10–13 K, ≈50 °C inlets from floor 10, efficiency −32 %. Lab: spacing < 650 mm raises return air sharply. Paris (de Munck 2013) +0.5–2 K street air; Berlin +0.5/+0.6 K (doi 10.3390/ijerph17134645); Tokyo 1–2 K. Estate estimate (assumption): 16 ha, ≈2,400 flats × 3.3 kW → ≈50 W m⁻², peak evening/night.

## Landscape (unverified)
Green ratio ≥30 % new / ≥25 % renovation (GB 50180-93), eroded by parking; concrete roads 4–7 m; worn lawns; plane, 国槐, privet, ginkgo, cedar; tiled/painted façades α 0.3–0.5; condensers stacked per floor 2.8–3.0 m apart, 2–3 per flat.

## Parameters / equations
H_eff = roof − (ground floor + 0.9 m); k(2 h) 1.47; floor 2.9 m; Q_rej 4.5 kW (3–6); ΔT_exh 5–7 K; plume-zone ΔT_wall ≤2 K (assumption).
β_noon = 90° − φ + δ; d_N = H_eff·cosA/tanβ; Q_rej = Q_cool(1 + 1/EER); ΔT_exh = Q_rej/(ρ c_p V̇); ΔL_ground ≈ 4εσT³·ΔT_wall·F_ac (≈1.2 W m⁻² → ≈0.2 K Tmrt).

## Acceptance bands
1. Noon altitude 75.6° (20 Jul), 34.8° (20 Jan) ±0.3°; E–W crossing 08:10/15:50 ±5 min. 2. Slab shadow 0.257 H / 1.44 H ±1 cell. 3. Every north-row ground sill ≥2 h on 大寒 08–16; G ≥ 1.47 H_eff. 4. July courtyard: no shade 10–16 beyond 0.37 H; noon shaded fraction ≈0.26 H/G ±1 cell. 5. Soft: Tmrt +1.6 K per −0.1 SVF within ×2. 6. ΔT_exh 5–8 K; site rejection 20–70 W m⁻²; condensers on → ground Ts unchanged, Tmrt change < 1 K. 7. Soft: sunlit paving − lawn ≈10 K.

## Disclose
Air fixed (no condenser air heating, stack, night UHI); one wind; national rule only; invented estate; unit counts and plume term assumptions; rule counted at sill not ground.
