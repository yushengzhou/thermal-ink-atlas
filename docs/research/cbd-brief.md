# Research brief: block 3, glass curtain-wall CBD (2026-11-27)

Confidence: high for geometry and Fresnel optics; medium for effect sizes; low for glass surface temperature and AC waste heat. Unverified items marked.

## Canyon physics
- SVF at the centre of an infinite canyon = cos(arctan(2H/W)) = 1/√(1+(2H/W)²): H/W 1/2/3/5 → 0.447/0.243/0.164/0.100. The engine's horizon scan (mean cos² of horizon elevation) reproduces this in the limit.
- Oke 1981 max nocturnal urban–rural air UHI ΔT = 7.45 + 3.97 ln(H/W) (calm clear nights; city-vs-rural air, not within-block). Coefficients from a secondary source, unverified (doi 10.1002/joc.3370010304; secondary redalyc 283230157011). Theeuwes et al. 2014 (doi 10.1002/qj.2289): breaks down at high H/W.
- Day: shading lowers floor Ts and Tmrt. Night: walls replace cold sky, (1−SVF)·σT_w⁴; in this engine T_w at night is fixed air + 2 K, so night-lag size is an engine assumption.
- Fez, H/W ≈ 10: deep canyon ~6 K cooler daytime air, up to 10 K (Johansson 2006, doi 10.1016/j.buildenv.2005.05.022). Göteborg courtyard Tmrt 17 shade vs 27 °C sun (secondary).

## Glass optics
- Uncoated float glass, Fresnel n = 1.52, two surfaces: ρ = 0.082 (0°), 0.10 (45°), 0.17 (60°), 0.30 (70°), 0.41 (75°), 0.56 (80°); hemispherical 0.16. LBNL (Furler; Rubin et al.): ASHRAE-style fit within 1.5 % for clear; coated up to ~8 % off at 60°.
- Vertical façade: cos θ = cos β · cos(Δaz).
- ρ₀ (unverified, no datasheet checked; use LBNL IGDB): clear 0.07–0.08; solar-control low-e 0.15–0.35; reflective/mirror 0.25–0.45. Singapore BCA Approved Document Section P: glass ≤ 20 % daylight reflectance. Glass outer ε ≈ 0.84 (EN 673, unverified).
- Concave extreme cases (out of scope): 20 Fenchurch St simulated peak 3,384 W m⁻² (worst 4,176) (Zhu, Jahn & Rein 2018, doi 10.1080/19401493.2018.1538389); Vdara 2010 hot zone, anecdotal (NBC; Architectural Record).
- Flat mirrors do not concentrate: extra horizontal irradiance ≤ ρ(θ)·I·sinβ per façade.
- Scale models: diffuse façades ≤ +30 % at pedestrian level; flat mirror > +100 %; concave > +300 % (Speroni et al. 2022, doi 10.3390/su14105781, abstract only).
- Field, Chengdu Chunxi Road (Aug 2023): reflection zones Tmrt +4 to +13 °C, air +1–2 °C, UTCI +2–5 °C, peak Tmrt 73.9 °C (Du et al. 2025, J. Harbin Inst. Tech. 57(9), doi 10.11918/202406062).
- Chen et al. 2024 (doi 10.1016/j.enbuild.2024.114926): reflective façades lower cooling energy but raise canyon UTCI. Sanagar Darbani et al. 2025 (doi 10.1016/j.dibe.2025.100758): low-ε glass cuts Tmrt up to 5 K (sim).
- SOLWEIG wall albedo with reflected SW (Lindberg 2008, doi 10.1007/s00484-008-0162-7; Wallenberg et al. 2026, doi 10.5194/gmd-19-1321-2026, wall albedo 0.5, highest Tmrt in front of sunlit façades).

## Equations
Specular (glass): s′ = s − 2(s·n̂)n̂ (same altitude, mirrored azimuth). Ray from ground cell p along s′; if first hit is a sunlit glass point, R_p = 1 (2×2 subsamples). Ground K += ρ(θ)·R_p·I·sinβ; Tmrt S += a_k·f_p(β)·ρ(θ)·R_p·I. Landing distance from façade = z/tanβ. Second bounce ignored (ρ²).
Diffuse (opaque walls): K_wall ≈ f_lit·I·cosβ/π + 0.5·D + 0.5·α_g·G (f_lit 0.5 assumption); K_wr = α_w·(1−SVF)·K_wall → ground K and Tmrt lateral (Klat += 0.5·K_wr). SOLWEIG form α_w·G·(1−ψ) from memory, unverified.
Glass temperature: T_g ≈ Ta + a_g·I_f/(h_o + h_i,eff), I_f = I·cosθ + 0.5·D, a_g 0.1–0.45, h_o 15–25 W m⁻² K⁻¹ → Ta + 3–15 K in sun, ≈ Ta at night (assumption, no measurement found).

## Parameters
| Parameter | Value | Status |
|---|---|---|
| ρ₀ clear | 0.08 | Fresnel calc |
| ρ₀ low-e | 0.20 (0.15–0.35) | unverified |
| ρ₀ mirror | 0.35 (0.25–0.45) | unverified |
| ρ(θ) shape | Fresnel n 1.52 | LBNL; coated ±8 % |
| glass ε | 0.84 | unverified |
| a_g | 0.1 clear, 0.3–0.45 coated | assumption |
| α_w opaque | 0.3 (0.2–0.5) | Oke range unverified; 0.5 Wallenberg |
| f_lit | 0.5 | assumption |
| H/W | 2–5 | — |

## AC waste heat
Rejected = Q_cool·(1 + 1/COP). Dense urban 20–70 W m⁻² ground area, occasionally > 100 (Xie et al. 2016, doi 10.5194/acp-16-6071-2016); central Tokyo > 400 W m⁻² daytime (Ichinose 1999 via Sailor et al. 2015). Sailor 2011 review doi 10.1002/joc.2106. No CBD office W m⁻² floor-area figure found. Air is fixed in this engine → do not add to Ts/Tmrt; information overlay only.

## Disclose
One site wind speed in h_c; no channelling, vortex, downdraught or sheltering; air temperature fixed (no canyon air UHI, no waste heat); second bounce ignored; concave façades out of scope.
