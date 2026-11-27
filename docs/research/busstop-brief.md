# Research brief: arterial with bus stops and footbridge — shade for people waiting (2026-11-27)

Bottom line: opaque overhead shade cuts Tmrt ≈20–35 K; translucent or vegetated roofs keep only part of that; between 14 and 17 h the low western sun gets under any roof, so the shelter's west side needs a vertical screen — a bigger roof won't fix it. Confidence high for geometry and HK guidance, medium for effect sizes, low for handrail/deck temperatures. Engine risk: shelters are 1.5–3 m deep on a 5 m grid → sub-cell shade check at waiting points.

## Evidence
- Dzyuban et al. 2022 IJB 66:345 (doi 10.1007/s00484-021-02074-4), Phoenix stops Jun–Jul 2018: air 41.8/41.2, globe 52.0/44.3, PET 68.2/49.5 °C sun/shade; shade −19 °C PET mean (max PET 81.6); by type metal 20.6, ad panel 20.3, polycarbonate 18.2, sparse vine n.s.; no side panels worse; concrete 57.4/41.3, metal bench 47.7/40.4; most riders arrive < 5 min before the bus.
- Middel et al. 2021 BAMS (doi 10.1175/BAMS-D-20-0193.1), Tempe: tree shade −28.1 K Tmrt, building −28.8 K; air −1.9/−1.2 K; tunnels/arcades best; PV canopy numbers unverified.
- Lanza et al. 2025 TR-D 140:104653 (doi 10.1016/j.trd.2025.104653), Houston 17 stops: tree shade 3.2 °C WBGT cooler; enclosed shelters without overhead shade > 3 °C hotter than open sun.
- ASU radiative-cooling film: Tmrt −1–2 K, roof 10–20 °F cooler (not peer reviewed, unverified).
- Chen et al. 2024 SCS 100:105048 (doi 10.1016/j.scs.2023.105048), HK covered walkway: Tmrt 53.5–68.0 sidewalk vs 19.9–39.6 walkway (gap 19.8–34.8 K); PET 32.6–37.3 vs 45.8–51.1; air −0.4–1.5 K; bridge raised street PET up to 2.7 K (sim).
- Singapore covered walkways > 77 % time strong heat stress (secondary, unverified).
- HK Highways Dept BS/GN/047 (Nov 2018): shelters opaque, avoid translucent; walkway covers translucent ≤ 1/3 width at sides; low headroom or wider cover/fascias; flat covers beat upward-sloped; check with sun-shadow analysis.
- UCLA: 26 % of 10,526 LA Metro stops sheltered.
- Waiting: random arrival for headways ≤ 10–12 min, mean wait ≈ half headway (City Univ review; Fan & Machemehl 2002); Fraser & Chester 2017 JTH 4:216; Liu et al. 2025 JTG 128:104383 (walking adds more exposure than waiting). No standard heat dose for a few minutes.
- Burns: CENELEC Guide 29 Table A.1 (ISO 13732-1): metal 51/48/43 °C (1 min/10 min/8 h), ceramics/glass/stone 56/48/43, plastics/wood 60/48/43; 1 s bare metal ≈65–70 °C (unverified); use ≥4 s for elderly/children. CPSC: steel decks burn in seconds. Las Vegas metal max 62 °C (unverified); steel deck surfacing 60–70 °C (doi 10.3390/ma18133109).
- Polycarbonate 10 mm twinwall solar transmission: clear 0.80, opal 0.47, bronze 0.43 (Brett Martin datasheet); SHGC ≠ transmittance.

## Geometry (NOAA, 35°N, 120°E, UTC+8, 20 July)
| Clock | β | az | cot β | shadow shift per m (E, N) |
|---|---|---|---|---|
| 14 | 61.3° | 248° | 0.55 | +0.51, +0.21 |
| 15 | 49.4° | 261° | 0.86 | +0.85, +0.13 |
| 16 | 37.2° | 271° | 1.32 | +1.32, −0.02 |
| 17 | 25.0° | 279° | 2.15 | +2.12, −0.33 |
d = H·cot β; profile angle tan φ = tan β / cos(az_sun − a_n); overhang o = (H − z)/tan φ (head 1.7 standing, 1.2 seated); screen shades to (z_t − z)·cot φ; translucent direct τ·I_b·sinβ, Tmrt a_k·f_p·τ·I_b; roof underside ΔL_abs ≈ a_p·W_up·F_roof·σ(T_roof⁴ − ε_sky Ta⁴), W_up 0.06; E[W] = (h/2)(1 + cv²); dose D = Σ max(0, UTCI − 32)·Δt (engine definition). Example: roof 2.7 m, seated head, 17 h → needs 3.2 m overhang; west screen to 2.2 m shades 2.2 m. N–S arterial: west-kerb stop's back blocks afternoon sun; east-kerb stop's open front takes it. Dark metal roof at 65 °C adds only ≈1 K Tmrt standing.

## Parameters
τ opaque metal/PV/ad panel 0; polycarbonate 0.80/0.47/0.43 (datasheet); fabric 0.05–0.30 (assumption); vine 0.3–0.7 (unverified); green roof 0; PV module Ta + 20–30 K (unverified); thin metal C 5–20 kJ; shelter H 2.5–2.8, depth 1.5–2.5, length 4–10 m (assumption); footbridge deck 5.5–6.5 m (unverified); headway 5–15 min (assumption); cv 0.3–0.5 (unverified).

## Acceptance bands
1. Opaque shelter centre 15:00: Tmrt sun − shelter 20–35 K; shelter − Ta 0–15 K. 2. Clear polycarbonate ≤ 30 % of opaque benefit; opal/bronze 50–65 %. 3. Sunlit concrete ≥ 10 K above shaded; shaded 0–8 K above air. 4. Shadow shift = H·cot β ± 0.25 m at 14–17 h. 5. Simulated mean wait within ±10 % of formula. 6. Covered vs uncovered footbridge deck Tmrt 20–35 K. 7. Contact flags > 51 °C (1 min), > ≈65 °C (1 s, unverified), display only.

## Disclose
Air fixed (no enclosed-shelter heat trap, exhaust, misting, wind shelter); walls/panels reflect no shortwave and glass greenhouse not modelled; UTCI/PET steady-state, label "conditions while waiting"; sub-cell shade check; stair climb metabolism not modelled.
