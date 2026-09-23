# Kyle fly feedback → Osprey Flight v8

Short list for anyone uploading to https://github.com/xz64uj777/VTOL

**Note:** **v8 zip is the CTOL / cold-start / runway / terrain slice.** Do **not** overwrite `osprey-best.zip` — Dude flips best.

## Asked for (2026-09-22) — after v7 fly

1. **F-35 doesn’t taxi** — CTOL / rotation normal floats on runway instead of rolling like a jet
2. **Runway disappeared** (rendering / cull bug)
3. **Cold start defaults** — 0° / 0 throttle / rotation normal (not mid-hover demo)
4. **Add more terrain**

## What v8 shipped

| Area | Change |
|------|--------|
| F-35 CTOL ground | WOW + VEC near CTOL: pin wheels, kill fan/GE/bridge lift, throttle→roll, nosewheel steer, rotate to lift |
| Runway | Segmented strip + `projectNear` near-plane clamp — strip stays visible from chase/wing/tower/pad / down-field |
| Cold start | Hangar→Fly / Reset / bird switch: THR=0, flaps=0, VEC=CTOL / NAC=APL, gear DOWN; VirtualControls sync |
| Terrain | Fields, distant ridges/coast cue, road, extra taxi/ramp, more trees/scrub (med still phone-friendly) |

## Still good from v3–v7 (don’t regress)

1. Settings / Systems pause; close does not auto-resume; mute in menu
2. Gyro zero freezes after Cal; sticky tilt 5s holdover; hide cyclic when Tilt ON
3. Casual stick-up = nose UP; yaw bar L; TCL/NAC right; big ALT; FL when high; LEVEL gauge
4. Convert lift bridge; chase tether / sanitize / NaN guards
5. Distinct Osprey slap vs F-35 roar; touch cam double-tap; deck gear/flaps; airport base

## Softs still parked

- F-35 AOA HUD still a bit noisy in VL sink
- Envelope warnings can overwrite hover tips
- Synth WebAudio (not recorded samples)
- Parking brake / lights are UI stubs (brake now bites on CTOL deck until THR breaks it)
- Scenery still canvas props (not a full scenery pack)

## How to verify v8

- F-35: VEC down, THR up → taxi on pavement (no float); accelerate; pitch up to rotate / lift off
- Cam chase/wing/tower/pad + taxi down strip → runway stays drawn with markings
- Hangar→Fly / Reset: knobs at 0 / CTOL·APL; deck flaps 0; gear DOWN
- See fields, hills, taxiways around airport; runway still the landmark
