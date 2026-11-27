# Research brief: block 4, waterfront / river wind corridor (2026-11-27)

Bottom line: measured urban water cools nearby air only a little and over a short distance (≈0.2–1.5 K by day, mostly within 30–80 m) and can warm the air at night; along open streets aligned with the wind, a river breeze reaches a few hundred metres. Keep air fixed; add a per-cell wind factor f_w (upwind sheltering × street alignment) feeding h_c and UTCI wind; give river and pond their own water curves; show water's air effect only as a labelled overlay.

## Evidence
- Völker et al. 2013 review (27 studies): blue space ≈2.5 K (95 % CI 1.9–3.2) cooler May–Oct, inflated by remote-sensing LST — https://www.erdkunde.uni-bonn.de/article/view/2737
- Hathway & Sharples 2012, River Don, Sheffield: river ≈1 K cooler than city reference; vegetated banks ≈2 K cooler than paved; reach ≈30 m with open banks (secondary sources, unverified) — bio4climate summary; phys.org 2011.
- Steeneveld et al. 2014, Rotterdam: water bodies raise the 95th percentile of daily max UHI (warm after sunset) — https://centaur.reading.ac.uk/73256/ (doi 10.1016/j.landurbplan.2013.09.001)
- Theeuwes et al. 2013 (WRF): water warmer than air at night worsens comfort — https://centaur.reading.ac.uk/73257/ (doi 10.1002/jgrd.50704)
- Jacobs et al. 2020 (ENVI-met, small Dutch water bodies): afternoon air −0.2 K typical, −0.6 K max; PET −0.6 typical, −1.9 max; "negligible in design"; shade gives PET −1 to −7 K — https://research.wur.nl/en/publications/are-urban-water-bodies-really-cooling/
- Cheonggyecheon, Seoul: >1 K cooler to 70–80 m (north), ≈0.5 K to 30–50 m (south); before/after −0.1 to −0.9 K — TMU repository; AMS abstract.
- Ota River, Hiroshima (Murakawa group): cooling detectable 150–500 m inland along streets perpendicular to the river; more with wind, wider streets, lower density (AIJ papers, unverified) — J-STAGE aijax 415.
- Corridor orientation ≤30° to prevailing wind (Chinese planning criteria; Givoni 20–30°) — CUHK Ren 2018; MDPI Buildings 14(2):348.
- Oke 1988 street flow regimes (thresholds ≈0.3–0.4 and 0.65–0.7 H/W, unverified). Building wake recirculation ≈1.6–2.6× building width (Springer BS, doi 10.1007/s12273-024-1103-z). "5H recovery" = assumption.
- Solcerova et al. 2019 Delft pond: warmer than air at night; releases ≈2.7 MJ m⁻² per night: 43 % longwave, 39 % latent, 11 % sensible — https://frontiersin.org/articles/10.3389/feart.2019.00156/full
- Webb et al. 2008: large deep rivers smallest diel range ("<1 K" unverified).

## Equations (assumptions unless marked)
f_w(i) = clamp(S(i)·C(i), f_min, f_max)
S(i) = min over upwind obstacles b within 5·H_b of [f_min + (1−f_min)·d_b/(5·H_b)] (1 if none)
C(i) = 1 + c_ch·max(0, cos 3Δ) if street axis within 30° of wind and H/W > 0.4, else 1
u_i = u_site·f_w; h_c = 5.7 + 3.8·u_i; UTCI va_10 = u_10·f_w (clamp 0.5–17 m/s)
River Ts = Ta_mean − 2 + 0.5·sin(2π(h−9)/24); pond Ts = Ta_mean − 0.5 + 2·sin(2π(h−10)/24)
Overlay (information only): day ΔTa = −ΔT0·exp(−x/L); night ΔTa = +ΔTn·exp(−x/L)

| Parameter | Value | Status |
|---|---|---|
| f_min | 0.3 | assumption |
| shelter reach | 5 H | assumption (wake 1.6–2.6 W cited) |
| c_ch, f_max | 0.2, 1.2 | assumption |
| alignment cut-off | 30° | cited |
| ΔT0 day | 1.0 K (0.2–1.5) | cited range |
| L | 30 m (30–80) | cited, unverified |
| aligned-street reach | ≤150 m | interpretation |
| ΔTn night | +0.3 K (0–1) | assumption; sign cited |
| A_r / A_p | 0.5 / 2 K | assumption |
| river offset | −2 K | assumption |

## Wind lines
Seeds every 20 m on the upwind edge (seeded jitter); RK2, 2.5 m steps, scaled by f_w; slide along building edges (side by cross-product sign); dash spacing ∝ u_i, phase = t·u_i; drawn through the pen recorder; label "assumed direction × shelter factor, not computed flow".

## Acceptance bands
f_w = 1 ± 0.01 open/over water; ≤0.4 at 0–1H leeward; ≥0.95 at ≥5H; aligned street mean ≥1.0 and ≥ perpendicular + 0.3; h_c within bounds; sheltered − exposed asphalt Ts at 15:00 (u = 3) 2–8 K (engine plausibility, calibrate); Tmrt change with u ≤ 2 K; river range ≤1.5 K, pond 3–5 K; water < Ta at 15:00; pond > Ta at 04:00; overlay |ΔTa| at bank 0.5–1.5 K, <0.2 K beyond 80 m (150 m in aligned streets), night ≥ 0; wind-line hash deterministic, no vertex inside buildings.

## Disclose
Air fixed (overlay only); one wind direction/speed, geometric heuristic not CFD (no vortices, downdraughts, corner jets, breezes, humidity); prescribed water curves; measured water cooling small and short-range, warms nights; shade is the biggest comfort lever near water.
