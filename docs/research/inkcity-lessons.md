inkcity design lessons (reference only; engine is written from scratch, no code copied)
- determinism: no Math.random/Date; seeded RNG; seek(n,cam) -> pure draw; per-tile bake caches keyed by look
- pen recorder: draw calls -> display lists replayed at any zoom; wobble + boil phases
- night = single colour hook cl(d,c) + per-fill marks; for thermal tag fills with material, and draw low-res heat field per tile composited as wash (clean regions for checks)
- no sun shadows / no steering in inkcity: new work. Agents deterministic: shade/sun route variants chosen by hour, dwell points.
- baked fixed light conflicts with moving sun -> tone as function of hour (quantised)
- guide overlay React bundle ~1.5MB breaks single-file; use small vanilla overlay. Fonts: subset or system.
- checks: Playwright seek hash determinism, perf mean/p95, region pixel-mean ordering, shade-density count
- don't touch AGPL film/ dirs; OSM geometry needs ODbL attribution
- researcher guess MVP 8-12 days with vendoring; rewrite more.
