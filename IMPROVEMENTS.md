# Osprey Flight — IMPROVEMENTS

## v6 (2026-09-22)

### HARD — convert camera / black HUD / tilt / F-35 jet

- **Chase tether:** craft-in-view snap + kill velocity lead on convert/decel/sink + hard 1.15× wantDist tether. Always look at craft.
- **sanitizeSim:** freeze + `SIM FAULT — Reset` on non-finite craft; recreate cam; physics accel/lift/AoA caps.
- **HUD:** finite guards → `---` / 0, never Infinity.
- **Tilt holdover 5s** + keep `gyroReady` + re-arm orientation listeners on >1s silence.
- **F-35 jet audio:** deep roar + mid scream + AB rumble (CTOL/high THR); VL fan retained; Osprey slap unchanged.

## v5

- Sticky tilt holdover 2.8s, dual orientation listeners, reconnect slew, frozen cal zeros
- Camera target-miss hard snap; mute master bus on pause/menu; LEVEL gauge; heavier Osprey slap

## v4

- Convert lift bridge (Osprey + F-35), pitch authority floor through CONV, lower DRAG_H
- Distinct Osprey vs F-35 WebAudio timbres

## v3

- Settings/Systems pause (close ≠ resume), Casual pitch default, yaw bar L, hide stick on Tilt
- Sticky cal zeros after Cal

## Softs parked

- F-35 AOA HUD noise in VL
- Envelope tips overwrite hover tips
- Synth not recorded samples
