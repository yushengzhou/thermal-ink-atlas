# Research brief: hutong / siheyuan block (2026-11-27)

Bottom line: (1) evening splashing cannot be shown with the current latent term (EF·max(Q*,0) is zero after ~17:30); add a per-cell water store W draining by bulk evaporation → −5 to −8 K surface in the evening, matching Paris −6 to −7.5 K. (2) Beijing single-storey lanes have H/W ≈ 0.5–1, so they are only partly shaded at noon; midday shade comes from trees, vine trellises and the summer mat awning (天棚). (3) Courtyard air "cool pond" (3–15 K measured) cannot be modelled with fixed air; quote it, don't simulate. Confidence medium on magnitudes, low on Beijing-specific geometry/materials; no hutong campaign measuring SVF+Ts+Tmrt together was found.

## Evidence
- Fez (Johansson, Grundström & Rosenlund 2001 PLEA; journal doi 10.1016/j.buildenv.2005.05.022): medina lane H/W ≈ 10, SVF 0.05 vs modern H/W 0.6, SVF 0.64; medina air ≈10 K cooler early pm, 2–4 K warmer pre-dawn; daily swing 6 vs 20 K; medina surfaces ≈ air; roofs > 55 °C; modern street floor ≈ 50 °C.
- Harbin traditional block (Lin et al. 2019, doi 10.3390/ijerph16162986): SVF lanes 0.09–0.27, courtyards 0.22–0.37; lower-SVF courtyards 0.3 K cooler Ta (max 0.6), 0.4 K Tg (max 1.0).
- Córdoba/Seville courtyards: 3–6 K below outdoor air on hot days, up to 11–15 K at 40–45 °C (abstracts only, unverified; MDPI Proceedings 2(22):1390, 1381; 38(1):17).
- Beijing street trees (Yang & Wang 2024, abstract): shade −1.0 to −2.1 K Ta, −481 to −789 W m⁻²; 国槐 2nd for comfort (doi 10.12171/j.1000-1522.20240012).
- Geometry: Beijing solstice noon sun 73.5°; 4 m wall shadow 1.2 m; ≈75 % of a 5 m E–W lane floor sunlit at noon.
- Roofs: northern 合瓦 on mud/lime back (泥背/灰背), not ventilated (secondary, sohu); ORNL ventilated-tile result (Miller 2007) does not apply. Clay tile SR 0.40–0.50, ε 0.80–0.90 (CARB, light terracotta; grey reduced-fired darker, unverified). Brick absorptance 0.45 light grey – 0.90 slate grey (Midland Brick).
- Vines: overhead arbours > 90 % cover (UC Davis); pergola LAI ≥ 2, ideally 3 (JJSHS 54(3):293). No measured LAI for jujube/pagoda tree.
- Watering: Hendel et al. 2016 Paris (doi 10.1016/j.uclim.2016.02.003) Ta −0.79 K max, Tmrt −1.76 K; Hendel et al. 2015 Rue du Louvre (doi 10.13044/j.sdewes.2015.03.0001) ≈1 L m⁻² per cycle, −7.5 K at 19:30, −6 K at 20:30, lasting several hours; Takebayashi et al. 2023 Kobe (doi 10.3390/atmos14061014) 0.025 mm per pass, −2–4 K at once, ≈6 K mean, < 30 min in sun, recommend evening; lE = l·β·α_w·(X_s − X_a), β 0.15 asphalt; Kato et al. 2008 road 50 → 40 °C, ≈60 min. Uchimizu: Edo-period, evening, in shade (nippon.com).
- Lanes lined by back eave walls; eave sets lane SVF; roof tilt negligible for pedestrian metrics.

## Parameters
| Item | α | ε | μ / C | EF | Status |
|---|---|---|---|---|---|
| Grey brick paving/wall 青砖 | 0.20 (0.15–0.30) | 0.92 | μ 1100 | 0.02 | unverified |
| Grey tile roof on mud/lime back | 0.18 (0.12–0.25) | 0.90 | μ 1000 | 0 | unverified |
| Jujube | canopy 0.18 | 0.97 | — | 0.6 | LAI 1.5–2.5, unverified |
| Pomegranate | | | | 0.6 | LAI 2–3, unverified |
| Pagoda tree 国槐 | | | | 0.7 | LAI 3–4, unverified |
| Vine pergola | | | | 0.6 | LAI 2–3 (JJSHS) |
| Mat awning 天棚 | — | — | — | 0 | τ 0.1–0.3, unverified |
| Splash | W0 0.5–1.0 mm evaporable of 1–2 L m⁻² thrown | | | | β_wet 0.3–1, Wc 0.2 mm, unverified |

## Water-store equations
LE = L·β(W)·(h_c/c_p)·max(0, q_sat(Ts) − q_a); β(W) = β_wet·min(1, W/Wc); dW/dt = −LE/L; W := W0 at t_splash (19:00); q_a = 0.622·e_a/(p − 0.378·e_a); G = … − EF·max(Q*,0) − LE. Fallback: LE(t) = (W0·L/τ_w)·exp(−(t−t0)/τ_w), τ_w 2–4 h, capped by potential LE.

## Acceptance bands (lane SVF 0.5, Ta 25–35, e_a 25 hPa, u 1 m/s)
ΔTs after splash (W0 1 mm): peak −3 to −8 K within 1 h; −1 to −6 K at 23:00; |ΔTs| ≤ 1.5 K next day 15:00. Evaporated ≤ W0; wet Ts ≥ wet-bulb. Existing EF path alone < 0.5 K (documents need). Tmrt −0.5 to −3.5 K evening. Lane sunlit fraction at noon solstice = 1 − (H/tanβ)/W (≈0.76 for 4 m wall, 5 m lane). Canyon SVF ±0.05 of cos(atan(2H/W)). Grey roof 50–62 °C at 15:00; shaded lane floor Ta to Ta + 8 K.

## Cultural card (draft)
老北京夏天在院里搭天棚：芦席棚顶高出屋檐，四周席子可卷起通风；李滨声以"天棚鱼缸石榴树"描绘四合院夏景（邓云乡《天棚遮阴》，澎湃 newsDetail_forward_18319465）。院中多种枣树、槐树，石榴寓意多子（Visit Beijing）。傍晚往地上泼水降温，与日本江户时代以来的"打水"同理（nippon.com）。Beijing splashing custom itself: no citable source found (unverified).

## Risks
5 m grid can't resolve lanes < 5 m (use 5 or 10 m lanes, disclose); SVF ignores trees (night under-estimate); courtyard air cooling quoted not modelled; hutong dimensions unverified; Spanish numbers abstract-only.
