# Kyle fly feedback → Osprey Flight v3

Short list for anyone uploading to https://github.com/xz64uj777/VTOL

**Note:** as of check, github.com/xz64uj777/VTOL had a v2-ish tree (docs + src) but was still thin vs a full handoff — **v3 zip is the handoff for big-Grok**.

## Asked for (must-fix) — v3

1. **Settings pauses** — opening Settings (or Systems menu) must **pause** the sim; closing resumes only if he unpauses / explicit Resume. Don’t keep flying under the sheet.
2. **Tilt phantom recal ~400 ft / nacelle rotation** — tilt/gyro must NOT auto-recalibrate mid-flight. Freeze the calibration zero after Cal; ignore slow bias during climb/convert. Add a **Level / horizon instructor** cue (wings-level or “Level · hold”) so he can see when phone isn’t level vs when gyro zero drifted.
3. If gyro loses sustained live, show sticky no-signal — don’t silently rewrite the zero.
4. **F-35 more thrust / STOVL** — increase available thrust (esp. VL/STOVL / lift-fan + vector) so conversion/rotation needs **less forward speed** to stay flying; VL hover should feel stronger. Don’t break CTOL completely.

## Still good from v2 (don’t regress)

1. Calibration during flight — Settings / Cal on deck + Systems → Flight
2. Hide cyclic stick when Tilt ON
3. Yaw = bar L/R; layout yaw LEFT; TCL/THR + NAC/VEC RIGHT
4. Casual pitch — stick-up = nose UP
5. ALT / FL on HUD; denser landscape

## Softs still parked (not v3 blockers)

- F-35 **AOA** HUD wild in VL / low-speed with sink
- F-35 **audio** still keyed off nacelleDeg (stays 0)
- VL “stick translate” mostly attitude→thrust tilt
- Osprey plantThr snap at HEL mode label boundary
- Envelope warnings can overwrite hover tips

## How to verify v3

- Open Settings mid-hover → sim **PAUSED**; Close → still paused until Resume
- Open Systems (Menu) → paused; Esc/close → still paused until Resume
- Tilt ON → Cal on deck (wings-level) → climb / start Osprey NAC rotation ~400 ft — zero must **not** rewrite; Level cue shows phone vs frozen zero; brief signal drop → sticky no-signal, then resume with **same** zero
- F-35 VL hover feels stronger; STOVL/convert stays flying at lower forward speed than v2; CTOL still accelerates / flies
