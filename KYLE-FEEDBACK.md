# Kyle fly feedback → Osprey Flight v6

Short list for anyone uploading to https://github.com/xz64uj777/VTOL

**Note:** **v6 zip is the handoff for big-Grok** (convert cam tether / sim sanitize / sticky tilt 5s / F-35 jet roar).

## Asked for (must-fix) — v6 HARD

1. **HARD: After start of rotate/convert** camera keeps moving forward, aircraft falls behind and disappears (Osprey + F-35). Then screen goes black and HUD numbers explode.
2. **HARD: Tilt loses signal again and stays lost** during convert episodes.
3. **HARD: F-35 does not sound like a jet fighter** (thin bandpass whine).

## Root cause (v5 → v6)

1. Chase cam placed behind craft then added **velocity lead** up to 0.5s. Snap only when cam far from **target**. During convert the craft decelerates/sinks while residual forward v biases the target **ahead** of the craft — cam sits “on target” while the bird exits the rear of the frame.
2. No sanitize after `stepCraft`. Mid-convert extreme AoA / bad dynamic pressure → NaN kinematics → NaN camera → black screen → HUD Infinity/1e308.
3. `GYRO_HOLDOVER_MS = 2800` still dropped to no-signal and stayed there; phones throttle orientation under convert load.
4. F-35 audio was a thin triangle/saw bandpass “mosquito” whine — not a fighter roar.

## What v6 fixed

| Area | Change |
|------|--------|
| Camera tether | Chase always looks at craft. Kill/cut velocity lead on CONV/STOVL, decelerating, or sinking. Craft-in-view snap (behind look / too far / too close). Hard tether ≤1.15× wantDist every frame. |
| Sim sanitize | `sanitizeCraft` / `sanitizeSim` after every step. Non-finite → freeze vels, clamp y, `SIM FAULT — Reset`, recreate cam on craft. Physics caps lift/drag/accel and clamps state. |
| HUD guards | `hudFrom` finite clamps; HUD shows `---` never huge numbers. Recover via Reset / Hangar. |
| Sticky tilt | Holdover **5s**. While Tilt ON + Cal frozen: keep last β/γ and `gyroReady` through holdover. Re-arm absolute+relative listeners if silence >1s. Resume with slew. Laptops have no gyro — phone is the test. |
| F-35 audio | Deep roar ~80–180Hz + mid jet scream + AB rumble when THR high / CTOL. VL keeps fan cue. Osprey stays blade slap. Eyes closed: F-35 = roar/scream, Osprey = thump/slap. |

## Still good from v3–v5 (don’t regress)

1. Settings / Systems pause; close does not auto-resume; mute in menu
2. Gyro zero freezes after Cal; Cal mid-flight; hide cyclic when Tilt ON
3. Casual stick-up = nose UP; yaw bar L; TCL/NAC right; big ALT; FL when high; LEVEL gauge
4. Convert lift bridge, pitch authority, distinct birds (v4); sticky tilt / cam lock (v5)

## Softs still parked

- F-35 AOA HUD still a bit noisy in VL sink
- Envelope warnings can overwrite hover tips
- Synth WebAudio (not recorded samples)

## How to verify v6

- Rotate/convert (Osprey nacelle mid or F-35 vector mid): bird **never** disappears; cam stays tethered
- Force a physics blow (or wait): no black screen / no 1e308 HUD — `SIM FAULT — Reset` recoverable
- Tilt ON + Cal → convert hard: chip stays **Tilt · live** through gaps ≤5s; recovers with slew after true silence
- Eyes closed: F-35 jet roar/scream ≠ Osprey blade slap
