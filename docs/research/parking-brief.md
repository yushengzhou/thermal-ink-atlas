# Research brief: open-air parking lot / industrial brownfield (2026-11-27)

Bottom line: physics well constrained, few measured lot numbers and almost none at night. Anchors: Golden et al. 2007 (Phoenix PV canopy vs open asphalt), Scott et al. 1999 (trees, cabins), Stempihar et al. 2012 (thickness), Takebayashi & Moriyama 2009 (night sensible flux), Vanos 2018 / McLaren 2005 (cabins). Force-restore is right for slabs thicker than ≈1.5 damping depths (≈0.2 m); thin paving and ballast need a lower effective μ. Confidence high on equations and PV/tree/cabin numbers, medium on night bands, low on brownfield parameters.

## Evidence
- Golden et al. 2007 Solar Energy 81:872 (doi 10.1016/j.solener.2006.11.007), Phoenix 17 Jun 2004 (Ta max 41.0, wind 0.86): exposed asphalt (SVF 0.90) max 63.5 / min 28.5 / mean 43.6 °C; under PV canopy (SVF 0.11) 37.0 / 27.7 / 32.1; range −70 %. Paper has internal inconsistencies. Mesquite: 2 m air up to 3.5 K cooler at peak, ≈1 K warmer after sunset until ≈08:30.
- Stempihar et al. 2012 TRR 2293 (doi 10.3141/2293-15): modelled Phoenix max 53–69, min 29–35 °C; HMA min 34.0, PCC 33.5; porous asphalt hottest day / coolest night (67.9 / 30.9); asymptotic above ≈203 mm thickness. Inputs HMA k 1.2 ρ 2238 c 921; PCC k 1.5 ρ 2350 c 1000; ε 0.91.
- Takebayashi & Moriyama 2009 Solar Energy 83:1211 (doi 10.1016/j.solener.2009.01.019): grass parking vs asphalt sensible heat ≈100–150 W m⁻² lower by day, ≈50 W m⁻² lower at night.
- Asaeda, Ca & Wake 1996: asphalt ≈150 W m⁻² more IR than bare soil at max (extra sensible heat 50 vs 200 W m⁻² across abstracts, unverified).
- Zhu et al. 2022 Front. Env. Sci. (doi 10.3389/fenvs.2021.795474), ECOSTRESS Phoenix: roads the only class warming at night; 100 % road vs grass at night ≈4.5 K (interpretation, unverified).
- Hoehne et al. 2020/2022 (doi 10.1080/23789689.2020.1773013): Phoenix pavement+vehicle sensible heat 67 % roads, 29 % parking, 3.9 % vehicles (snippet, unverified).
- Cars: Matias et al. 2025 Lisbon black roofs ≈71 °C vs white ≈45 °C, air +2.5–3.8 K near black cars (abstract/press); Levinson et al. 2011 (doi 10.1016/j.apenergy.2011.05.006) black vs silver roof up to 25 K, cabin soak 5–6 K; Vanos et al. 2018 (doi 10.1080/23328940.2018.1468205) Tempe 1 h: cabin 46 °C sun / 38 shade, dashboard 69 / 48; McLaren, Null & Quinn 2005 Pediatrics (PMID 15995010): +1.8 K per 5 min, 80 % in first 30 min, 47 °C at 22 °C ambient, cracked windows ineffective; NSC: 1,010 US child hot-car deaths 1998–2024, 39 in 2024.
- Shade: Golden PV −26.5 K at peak, dawn −0.8 K; Scott, Simpson & McPherson 1999 J. Arboric. 25:129 trees: asphalt −20 K, air at 0.5 m −1.3 K, cabins −26 K; Onishi et al. 2010 (doi 10.1016/j.ufug.2010.06.002) up to −7.26 K LST.

## Storage theory
Damping depth d = √(κτ/π): HMA 0.126 m, PCC 0.133 m, dry clay ≈0.07 m. Surface flux G = μ√ω·A·cos(ωt + π/4) (leads Ts by 3 h); μ 1200, A 15 K → G amplitude 154 W m⁻², 4.2 MJ m⁻² d⁻¹. Force-restore exact for sinusoidal homogeneous semi-infinite; thick (≥0.2 m) = existing materials.

## Parameters
| Material | α | ε | μ / C | EF | Basis |
|---|---|---|---|---|---|
| Thick aged asphalt | 0.12 | 0.95 | μ 1200 (sens. 1570) | 0 | LBNL/Oke; Stempihar |
| Concrete slab | 0.30 (0.15–0.35) | 0.90 | μ 1785 (1880) | 0 | Oke; Stempihar |
| Gravel/ballast | 0.20 (0.10–0.30) | 0.92 | μ 700 (600–900) | 0 | assumption |
| Compacted dry soil | 0.25 (0.20–0.35) | 0.93 | μ 800 | 0.05 | Oke 600 + assumption |
| Scrubby dry vegetation | 0.22 | 0.95 | μ 800 | 0.2 | assumption |
| Rusty corrugated shed | 0.20 | 0.75 (0.69–0.88) | C 3 kJ (2–5) | 0 | Optris/Fluke tables; calc |
| Car body black / light | 0.05 / 0.57–0.75 | 0.90 | C 5–10 kJ | 0 | Levinson; Matias; assumption |
| Ground under PV | asphalt | | | | SVF 0.11 (Golden) |
Lot car coverage ≈30–35 % (rule of thumb, unverified) → sub-grid shade fraction.

## Acceptance bands (Ta 25–35)
1. Thick asphalt at 23:00: +2 to +6 K above dry brownfield soil/vegetation; +3 to +8 K above irrigated lawn.
2. Asphalt G −60 to −160 W m⁻² at 20:00, < −30 at 04:00; asphalt − grass night sensible gap 30–80 W m⁻².
3. Concrete vs asphalt: 5–12 K cooler at 15:00, ±2 K at 23:00.
4. Metal shed steepest cooling after sunset; at 23:00 Ts ≤ Ta + 0.5 K.
5. Bare soil within ±8 K of asphalt at 15:00, ≥2 K below at 23:00.
6. PV canopy ground 20–30 K below open asphalt at 15:00, within 1.5 K at dawn, range −60–75 %.
7. Cabin card (info only): shade vs sun ≥8 K (Vanos), up to 26 K (Scott).
8. Thin layer (lower μ) lowers Ts_min and raises Ts_max.

## Disclose
No measured night W m⁻² for a lot found; brownfield values mostly assumptions; Golden inconsistencies; several numbers abstract-only; air fixed — lot/car air warming is info only.
