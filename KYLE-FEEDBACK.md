# Kyle fly feedback → Osprey Flight v7

Short list for anyone uploading to https://github.com/xz64uj777/VTOL

**Note:** **v7 zip is the realism slice** (touch cam, better views, deck panel, runway, F-35 roar). Do **not** overwrite `osprey-best.zip` — Dude flips best.

## Asked for (2026-09-22) — start making this realistic

1. **Touch camera movement** + **double-tap defaults** (reset view)
2. **Better camera views** (beyond chase/pad/orbit)
3. **F-35 sounds like a model airplane (whining)** — do better (jet fighter)
4. **Actual gauges and switches/toggles on screen** — dashboard/panel (Extreme Landings style), gear/flaps on deck
5. **Better terrain** — actual runway / airport

Camera mostly good (sometimes moves slightly) — soften residual chase jitter.

## What v7 shipped

| Area | Change |
|------|--------|
| Touch cam | Drag empty sky/canvas pans yaw/pitch offset. Double-tap sky or Cam chip resets offsets for current mode. |
| Cam modes | **CHASE → WING → TOWER → PAD → ORBIT**. Clear HUD labels. Heavier chase damp + less micro-lead. v6 tether kept. |
| F-35 audio | Deep dual-roar ~55–140 Hz + restrained mid scream + AB grit. No toy/model-plane whine. VL fan higher but not mosquito. Osprey slap unchanged. |
| Deck panel | Always-on Intermediate+ (toggleable): GEAR UP/DOWN, FLAPS 0/25/50/100, LIGHTS/PARK stubs; ASI/ALT/VS/HDG/NAC·VEC/N1 + compass strip. Systems menu remains for deep panels. |
| Airport | Runway (centerline, edges, threshold bars), taxiway to pad, hangars, tower, windsock. Osprey spawns on pad; F-35 on runway threshold. Trees/scrub kept off strip. |

## Still good from v3–v6 (don’t regress)

1. Settings / Systems pause; close does not auto-resume; mute in menu
2. Gyro zero freezes after Cal; sticky tilt 5s holdover; hide cyclic when Tilt ON
3. Casual stick-up = nose UP; yaw bar L; TCL/NAC right; big ALT; FL when high; LEVEL gauge
4. Convert lift bridge; chase tether / sanitize / NaN guards
5. Distinct Osprey slap vs F-35 roar

## Softs still parked

- F-35 AOA HUD still a bit noisy in VL sink
- Envelope warnings can overwrite hover tips
- Synth WebAudio (not recorded samples)
- Parking brake / lights are UI stubs (no deep systems sim)
- Airport is a simple canvas strip (not a full scenery pack)

## How to verify v7

- Drag sky → view orbits; double-tap → defaults; Cam cycles CHASE/WING/TOWER/PAD/ORBIT
- Deck: toggle GEAR/FLAPS mid-flight without opening Systems
- Eyes closed: F-35 = deep roar/scream ≠ Osprey blade slap
- See runway + pad; Osprey on pad, F-35 on threshold; TO/land on strip
