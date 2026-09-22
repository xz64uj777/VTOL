# Kyle fly feedback → Osprey Flight v4

Short list for anyone uploading to https://github.com/xz64uj777/VTOL

**Note:** **v4 zip is the handoff for big-Grok** (convert / pitch hard blocker).

## Asked for (must-fix) — v4 HARD BLOCKER

**Repro (both birds):** ~1000 ft, start rotation/convert, ~80 mph pitching forward → altitude drops, **pitch forward does nothing** (even nose-dive fails), speed bleeds, falls like a rock. F-35: more power helps hover but short takeoff / convert same failure — rotate, lose forward speed, drop, can’t pitch.

1. **Pitch authority during CONV / STOVL convert** — cyclic/stick must always command pitch; never zero or fight to zero mid-convert. Check tilt overlay, mode blends, AoA clamps, rate limits.
2. **Conversion lift bridge** — as nacelle/VEC rotates, don’t dump rotor/fan lift before wing/jet lift is there. Smooth HEL→CONV→APL (and F-35 VL→STOVL→CTOL) so he can accelerate without falling. Allow short-takeoff profile: rotate with power, gain speed without rock-drop.
3. **Bleed energy** — reduce excessive drag/speed bleed during convert; pitching forward should trade altitude for speed or hold energy better.
4. **Distinct audio** — Osprey proprotor vs F-35 jet/fan must sound different (not the same loop).

## Root cause (v3 → v4)

1. Wing had **no CL0 / incidence** → level attitude produced **zero wing lift**; CONV/APL could not carry weight at ~80 mph within pitch limits.
2. Nacelle/VEC tilt **dumped rotor/fan vertical** before wing dynamic pressure was ready (lift hole mid-convert).
3. **DRAG_H ≈ 0.42** → ~8–14 m/s² parasite bleed; pitching forward could not overcome deceleration.
4. Pitch auto-center + no cyclic→thrust tip made stick feel dead while energy collapsed.
5. Audio: one sawtooth; F-35 still keyed off `nacelleDeg` (always 0).

## Still good from v3 (don’t regress)

1. Settings / Systems pause; close does not auto-resume
2. Gyro zero freezes after Cal; sticky no-signal; Level · hold cue
3. F-35 stronger VL hover thrust (kept / slightly raised)
4. Cal mid-flight; hide cyclic when Tilt ON; yaw bar L; Casual pitch; ALT/FL; landscape

## Softs still parked

- F-35 AOA HUD still a bit noisy in VL sink (improved low-spd path remains)
- VL “stick translate” still mostly attitude + thrust tip
- Envelope warnings can overwrite hover tips

## How to verify v4

- ~1000 ft AGL, ~80 mph, start Osprey NAC convert while pitching forward — **must keep pitch authority**, accelerate or hold energy, **not rock-drop**
- Short takeoff: raise TCL, rotate (pitch), convert nacelle — gain speed without falling out
- Same profile F-35: VL/STOVL → lower VEC, rotate, convert — pitch works; no speed bleed death spiral
- Eyes closed: Osprey rumble/slap ≠ F-35 jet/fan whine
- v3 checks still pass (Settings pause, tilt freeze, Level cue)
