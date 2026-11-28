# Research brief: night market / pedestrian shopping street (2026-11-27)

Bottom line: at 19–23 h a stone street hot from the day sheds ≈40–140 W m⁻² net (longwave + convection); a dense crowd gives off similar total metabolic heat (130–210 W m⁻² at 1 p m⁻²); gas/charcoal stalls are kW-scale point sources (≈1–5 kW m⁻² over their own footprint); lighting negligible. With fixed air, show crowd/stall/light heat as a labelled "heat into the air" overlay; the one radiative effect for Tmrt is near-field grill radiation within ≈2 m (illustrative). Confidence high for physics/arithmetic, low for site data. No measured 19–23 h surface temperatures found for Chunxi Road, Wangfujing, Nanjing Road, Taipei night markets or European squares.

## Evidence / arithmetic
- Guangzhou 24 h study (Buildings 2016 6(1):2): granite/concrete warmed the air all day (full text blocked, night numbers unverified). Phoenix cool-pavement pilot: treated surface 2.4 °F cooler at sunrise, 1.8 m air 0.5 °F cooler at night (phoenix.gov; ASU). Stone 23:00 target 30–35 °C for Ta 25–35 (existing brief, unverified). Check Doulos et al. 2004 (doi 10.1016/j.solener.2004.04.005).
- Release (ε 0.92, Brutsaert e_a 30 hPa, walls Ta+2, h_c 9.5 at 1 m/s): emission 441–489 W m⁻² for Ts 30–38; net at Ts−Ta +2/+4/+6 K = 77/110/141 (SVF 1), 42/74/105 (SVF 0.4). Show net, not gross.
- People: 1 met = 58.2 W m⁻², ×1.8 m² ≈105 W; standing ≈1.2 met (≈125 W), walking 0.9 m/s ≈2.0 met (≈210 W) (ASHRAE 55 / ISO 8996 from memory, unverified); ASHRAE retail 73 sensible + 59 latent W at 25.6 °C (secondary copies disagree). Metabolism ≈2–3 % of urban anthropogenic heat (Sailor, AMS).
- Density: no night-market measurement; critical 2–3 p m⁻², event limits ≈2 (gkstill; NSW factsheet); market aisle 0.5–1.5 estimate.
- Stalls: jet wok burners 28–37 kW (vendor); LPG stall 5–15 kW unverified; charcoal roaster ≈1.2 kg h⁻¹, 6 kW output (archiexpo); ≈29 MJ kg⁻¹ → 1 kg h⁻¹ ≈8 kW fuel (unverified). Night markets raise PM (Taiwan News); no stall heat/air measurement exists. 60 stalls × 8 kW × 0.5 over 400 × 10 m ≈60 W m⁻² average, 1–5 kW m⁻² per stall footprint. LED strings 0.2–1 W m⁻², incandescent 2–8 (unverified).
- Night Tmrt (engine form, Ta 30, walls Ta+2): open SVF 1 → 25.7/27.8/28.9 °C for Ts−Ta 0/4/6 (below air); street SVF 0.3 → 30.1–31.2. Charcoal bed 0.2 m² at 600 °C: ≈+490 W m⁻² mean body flux at 1 m (Tmrt ≈88 °C), ≈120 at 2 m (≈48 °C) — upper bound.
- Comfort: no night-market study; Ximen uncomfortable before 16:00 (NCCU thesis); Taipei evening PET depends on pavement moisture (NTU ENVI-met); stalls use floor fans (FTV). Discomfort at night driven by air temperature and humidity (not varied in engine).
- Timing: Shilin 16:00–00:00 (travel.taipei); peak 20–23 h (Wikipedia) / 19–22 h (guides).

## Equations
Q_pave_net = ε(σTs⁴ − L↓) + h_c(Ts − Ta), L↓ = SVF·ε_sky·σTa⁴ + (1−SVF)·σT_w⁴; Q_crowd = ρ_p·M·A_Du·f_s; Q_stall = Σ P_fuel·duty/A_cell (air, overlay only); ΔS_grill = ε_c σ(T_c⁴ − T_b⁴)·A_c/(4πd²), d ≥ 0.5 m.

## Parameters
Stone Ts−Ta 21 h open +4 K (+1 to +6, unverified); walking/standing 210/125 W (unverified); sensible fraction at 30 °C 0.4 (0.3–0.55, assumption); peak density 1.0 (0.3–2.0, cap 2, assumption); wok 28–37 kW (vendor); stall burner 8 (5–15) kW duty 0.5 (unverified); charcoal 8–16 kW (partly vendor); coal bed 0.2 m² 600 °C (assumption); string lights 0.2–8 W m⁻² (unverified).

## Acceptance bands
Stone 21 h Ts−Ta [+1, +6]; net release [30, 150] W m⁻², lower at low SVF; gross emission [430, 500] for Ts 28–38; night Tmrt without grill [Ta−6, Ta+2], higher at low SVF; grill term ∝ 1/d², < 5 K at d ≥ 3 m, zero when closed; crowd overlay = ρ_p × M; density ≤ 2, zero before 16:00 and after 24:00; overlays leave Ts/Ta/Tmrt bit-identical (except grill term); overlay total = sum ± 1e-6.

## Disclose
Air fixed (crowd/stall/light heat to air not modelled); open-sky night Tmrt below air, ≈ air under awnings/narrow streets; grill radiation illustrative within ≈2 m; crowd density/timing invented; no measured night pavement data for named streets; awnings and crowd not in SVF (≈+0.5–1 K Tmrt under-estimate).
