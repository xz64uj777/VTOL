# Osprey Flight — IMPROVEMENTS

## v9 (2026-09-22 evening)

### Far scenery · audio static · cam above-behind · F-35 hop · Hangar chrome

- **Far scenery (HARD):** altitude-scaled horizon + following ground grid; craft-following field tiles + trees; far LOD land massing / ridges / clouds so 1000–5000+ ft AGL still shows structure; med trims near trees, denser far patches.
- **Audio:** clamp oscillator Hz + filter params to audible ranges; LFO depth capped so master never clips into static; soften/freeze when rpm/tcl extreme; never NaN into AudioParam; Osprey slap vs F-35 jet kept distinct.
- **Camera:** chase clamp `y ≥ craft + min` and look pitch so view never from under belly; altitude damps pitch/roll coupling; v6/v7 craft-in-view tether; less jitter; touch offsets + double-tap reset kept.
- **F-35 CTOL ground (jet-specific):** hard pin + critical vertical damp; no Osprey `plantGear` spring fight on CTOL; leave-ground only on clear rotate (speed+pitch+thrust) with air hysteresis; smooth low-speed taxi.
- **Hangar chrome:** removed from far-right flight deck (was next to Resume); Settings Hangar… with confirm; crash banner Hangar kept.

## v8 (2026-09-22)

### CTOL taxi · runway cull · cold start · terrain

- **F-35 CTOL ground (HARD):** gear+WOW+VEC near CTOL pins `y` to gear height; kills lift-fan / GE / convert-bridge vertical; throttle→forward roll; nosewheel steer + rudder with speed; pitch-up rotate to lift off. VL/STOVL can still hover-taxi.
- **Runway visible:** segmented asphalt + `projectNear` near-plane clamp — strip no longer vanishes when a corner is behind the camera.
- **Cold start:** Fly / Reset / bird switch → THR 0, flaps 0, NAC APL / VEC CTOL, gear DOWN; VirtualControls `syncKey` forces knobs.
- **Terrain:** fields, distant ridges/coast cue, road arc, extra taxi/ramp, denser trees/scrub; runway stays landmark.

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
