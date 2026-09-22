# Osprey Flight — IMPROVEMENTS

## v7 (2026-09-22)

### Realism slice — cam / audio / deck / airport

- **Touch camera:** drag empty sky pans yaw/pitch offset; double-tap (sky or Cam) resets.
- **Modes:** chase · wing · tower · pad · orbit; heavier chase damp; v6 tether retained.
- **F-35 roar:** deep dual-roar + restrained scream + AB grit (no model-plane whine); Osprey slap stays.
- **Deck panel:** gear / flaps / lights / park + ASI ALT VS HDG NAC·VEC N1 (Intermediate+ default).
- **Airport:** runway markings, taxiway, hangars, tower, windsock; spawn on pad / threshold.

## v6 (2026-09-22)

### HARD — convert camera / black HUD / tilt / F-35 jet

- **Chase tether:** craft-in-view snap + kill velocity lead on convert/decel/sink + hard 1.15× wantDist tether.
- **sanitizeSim:** freeze + `SIM FAULT — Reset` on non-finite craft; recreate cam; physics caps.
- **HUD:** finite guards → `---` / 0, never Infinity.
- **Tilt holdover 5s** + keep `gyroReady` + re-arm orientation listeners on >1s silence.
- **F-35 jet audio (v6):** deep roar + mid scream + AB rumble — refined further in v7.

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
- Park/lights stubs; simple airport scenery
