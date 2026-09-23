# Kyle fly feedback → Osprey Flight v9

Short list for anyone uploading to https://github.com/xz64uj777/VTOL

**Note:** **v9 zip is the scenery / audio / cam / F-35 hop / Hangar-chrome slice.** Do **not** overwrite `osprey-best.zip` — Dude flips best.

## Asked for (2026-09-22 evening) — after v8 fly

1. **Past ~1000 ft** scenery runs out — world gets weird / empty
2. **Sound goes static-ish** at that altitude
3. **Camera from below/behind** gets wonky (“copy”)
4. **F-35 jumps on the runway** — needs jet-specific ground work (not Osprey plant)
5. **Hangar on far-right deck** next to Pause/Resume — easy mis-tap ends the sortie

## What v9 shipped

| Area | Change |
|------|--------|
| Far scenery | Altitude-scaled horizon/grid; craft-following fields + trees; far LOD massing + ridges/clouds past 1k–5k ft |
| Audio | Clamp all Hz / filter / gain; LFO depth capped under master (no clip-static); soften extremes; no NaN AudioParams; Osprey slap vs F-35 roar kept |
| Camera | Chase stays **above+behind** — `cam.y ≥ craft.y + min`; pitch clamp; altitude damps attitude coupling; v6/v7 tether kept, less jitter |
| F-35 CTOL ground | Jet-specific hard pin + critical damp; **no** Osprey `plantGear` spring on CTOL; rotate hysteresis; stable low-speed taxi |
| Hangar chrome | Hangar **removed** from flight deck bar (was beside Resume); lives in Settings with confirm; crash banner still has Hangar |

## Still good from v3–v8 (don’t regress)

1. Settings / Systems pause; close does not auto-resume; mute in menu
2. Gyro zero freezes after Cal; sticky tilt 5s holdover; hide cyclic when Tilt ON
3. Casual stick-up = nose UP; yaw bar L; TCL/NAC right; big ALT; FL when high; LEVEL gauge
4. Convert lift bridge; chase tether / sanitize / NaN guards
5. Distinct Osprey slap vs F-35 roar; touch cam double-tap; deck gear/flaps; airport; CTOL taxi intent; cold start; runway segments

## Softs still parked

- F-35 AOA HUD still a bit noisy in VL sink
- Envelope warnings can overwrite hover tips
- Synth WebAudio (not recorded samples)
- Parking brake / lights are UI stubs (brake bites on CTOL deck until THR breaks it)
- Scenery still canvas props (not a full scenery pack) — v9 far LOD helps altitude void but isn’t photoreal

## How to verify v9

- Climb past 1000–3000 ft: countryside / ridges / haze still visible (not a void)
- Audio stays clean at altitude (no static wash)
- Chase cam stays above and behind; no belly-looking flip
- F-35: VEC CTOL, taxi/roll — no runway hop / bounce
- Pause/Resume alone on far-right deck; Hangar only via Settings (confirm) or crash banner
