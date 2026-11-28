# Research brief: desert courtyard block (Phoenix-like, 33.4°N) (2026-11-27)

Bottom line: clear mid-July design day Ta 30 → 43 °C, e_a ≈ 12 hPa (Td ≈ 10 °C, RH min ≈ 14 %), wind 1.5 m/s — between the 1991–2020 normal (29/41) and July 2023 (33/46). Site settings are already per block (`scene.site`). Engine limits here: Tmax fixed at 15:00 (Phoenix peaks 16–17 MST), lawn EF doesn't react to dry air, wall albedo global, sails need transmittance. Tempe anchors: shade sails ≈ mesquite (≈ −17 K Tmrt); light surfaces raise pedestrian Tmrt +2.5 to +3.2 K. Confidence high for climate, Tmrt and deaths; medium for water and misters.

## Design day
NCEI normals Sky Harbor USW00023183 1991–2020: July 41.4/29.2 °C (June 40.1/25.9, Aug 40.6/28.7); hourly normals Tmin 06 MST, Tmax 16–17 MST (40.4), Td 11–14 °C, 10 m wind 2.4–4.7 m/s; June Td 3.2 °C (e_a ≈ 7.7 hPa). July 2023: mean high 46.0 / low 32.7 °C, 31 days ≥ 110 °F, record warm low 97 °F (Climate.gov; NWS). 2024: 70 days ≥ 110 °F; 118 °F on 5 and 8 July (NWS PSR). AZMET Encanto hot days 2023–25: Tmin 28.7, Td 11–13, ETo 7.8–8.9 mm/d, wind 1.5–2.2, RH min 12–14 %. Clear peak GHI Tempe 919–983 W m⁻² (Middel 2021).
e_a = 6.112·exp(17.67·Td/(Td + 243.5)) → 12.3 hPa at Td 10; ε_sky (Brutsaert) 0.78 vs 0.84 at 20 hPa; wet-bulb ≈ 22 °C at 43/12 hPa (Stull 2011).
Suggested site: {lat 33.43, lon −112.0, tz −7, month 7, day 15, taMin 30, taMax 43, wind 1.5, vapourHpa 12}; no DST. MaRTy pedestrian wind < 1 m/s mean.
Engine gaps: per-site tmaxHour; Meinel noon GHI 1037 (5–10 % high; daily 29.6 MJ fine); per-block/building wall albedo; sail transmittance.

## Measured (Middel et al. 2021 BAMS; Middel & Krayenhoff 2019)
Sunlit impervious 64.5 °C at Ta 41.0; asphalt 65.8; gravel 61.2; irrigated grass never above Ta. ΔTs tree over gravel −21.2 (12:30) / −19.6 (15:30); mesquite/palo verde −8.8 daytime mean vs > −13 dense non-native; palms −5.6; lightweight shade −11 to −14; umbrellas −6.9; after sunset shaded impervious −2.7 to −4.5, gravel +0.5, grass +1.6. Peak sunlit Tmrt 76.2 °C; 76.4 in bright E–W canyon at Ta 48.5. ΔTmrt by species −16.7 (Prosopis) to −25.9 (Pinus canariensis); arcade/tunnel/overhang −22.8 to −30.9 (tunnels +3.2 at night); sails/umbrellas −17.3; trees up to −33.4 afternoon, up to +5 after sunset; irrigated grass vs asphalt/concrete > 10 K lower afternoon Tmrt (dry grass ≈ half). Tmrt −4 K per −0.1 SVF from trees; −1.0 to −1.5 K per 10 % impervious → pervious. Ta differences between shade types < 1.3 K. Colter, Middel & Martin 2019 ramadas vs trees (numbers unverified).

## Water
ETo Encanto July 7.1–7.8 mm/d mean (max 10.2). Bermudagrass Kc 0.78 July (AZ1195) → lawn ET ≈ 5–7 L m⁻² d⁻¹; AMWUA: water every 3 days, ≈ 6.4 mm/d applied. Desert tree 6.1 m canopy: ≈ 890 L every 7–21 days → ≈ 1.4–4.3 L m⁻² d⁻¹ canopy. Latent ≈ 170 W m⁻² daily mean from 6 mm/d ≥ daily net radiation (oasis advection, estimate); Templeton 2018 turf highest EF (unverified); EF 0.85–0.95 engine assumption. Gober et al. 2009: +32.8 % outdoor water → +0.41–0.82 K/h faster evening cooling. Middel 2014 LUP: xeric warmest, oasis, mesic; form > landscaping by day. Middel 2015 UFUG: −0.14 K Ta per +1 % canopy. Misters: Vanos et al. 2022 IJB 66:357 Tmrt −7.6, PET −6.5, UTCI −4.4; Huang et al. 2025 LUP 256:105290 up to −17.5 K Ta (model), 4.87 L h⁻¹ per nozzle, 0.3–0.7 nozzles m⁻² → 1.5–3.4 L m⁻² h⁻¹.

## Reflective penalty (desert)
Phoenix/ASU Cool Pavement Phase 2 (Oct 2024): coated road Ts −6.7 K noon, −5.8 afternoon; Tmrt +3.2 K noon, +2.5 K afternoon; night negligible; air −0.07 K mean, warmer 8–9 pm; reflectance 0.30–0.39 vs 0.036. Erell et al. 2014 Urban Climate 10:367: high-albedo canyons can worsen pedestrian heat stress.

## Acceptance bands (15:00)
Sunlit gravel 55–63 °C; light paving ≤ asphalt − 5 K; irrigated lawn ≤ Ta + 2 K; lawn evaporation 5–7 mm/d; sunlit open Tmrt 65–76; ΔTmrt sail/ramada −14 to −20, mesquite/palo verde −14 to −20, arcade −20 to −31; after sunset shade ΔTmrt 0 to +5; light coating pedestrian ΔTmrt +2.5 to +3.2.

## Death card (MCDPH 2025 annual report, Apr 2026)
Heat-related deaths 2021 339; 2022 425; 2023 645; 2024 608; 2025 430 (313 outdoors, 111 indoors). 2024: 49 % homeless, 57 % substances. 2026 preliminary 585 (unverified). News said 427 for 2025.

## Unverified
Sail transmittance (0.10–0.25 suggested), stucco albedo (0.5–0.7), gravel/DG albedo (0.16–0.39), mesquite LAI (calibrate to −16.7 K), Colter 2019 numbers, Templeton 2018 EF.
