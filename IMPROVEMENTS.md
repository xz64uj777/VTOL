# Osprey Flight — IMPROVEMENTS

## v1 shipping

### Birds

| Bird | Mode control | Modes |
|------|--------------|-------|
| Osprey | Nacelle slider (NAC°) | HEL · CONV · APL |
| F-35 | Vector / lift-fan (VEC) | VL · STOVL · CTOL |

### Control map

| Input | Spring? | Hold? | Notes |
|-------|---------|-------|-------|
| Cyclic | Yes | — | Casual signs = Copter v4 |
| Yaw | Yes | — | |
| TCL/THR | — | Absolute | |
| NAC (Osprey) | — | Absolute | 0..1 → 0°..90° |
| VEC (F-35) | — | Absolute | 0=CTOL … 1=VL |
| Flaps | — | Panel/keys | |

### Physics

**Osprey:** thrust = sin(nac)·up + cos(nac)·forward; wing lift in APL; CONV envelope cues.

**F-35 (phone-simple):** main nozzle tilts aft→down with VEC; lift-fan cue along body-up in STOVL/VL; wing lift stronger in CTOL; AoA on HUD.

### Camera

Chase / Pad / Orbit — speed-scaled lead + error snap (Helios/Copter).

## Backlog

- [ ] Missions / scoring / Rescue
- [ ] Auth / multiplayer
- [x] Gyro tilt cyclic (v2)
- [x] Freeze gyro zero + Level cue + Settings pause (v3)
- [x] F-35 stronger VL/STOVL thrust (v3)
- [x] Convert pitch auth + lift bridge + energy (v4)
- [x] Distinct Osprey vs F-35 audio (v4)
- [ ] Stronger CONV / VL vortex-ring cues
- [ ] three.js mesh if phone FPS OK
- [ ] F-35 afterburner / weapon stations (visual only)
- [ ] Crosswind / density altitude
- [ ] Advanced cold-start checklist
- [ ] Ultra quality still omitted

## Changelog v1

- Osprey full HEL→CONV→APL→land loop + nacelle slider
- F-35 CTOL/STOVL/VL in same hangar picker (flight only)
- Systems menu, experience tiers, port 8091, dual zips

## Changelog v2

- Mid-flight Settings + Cal / Recalibrate (deck + Systems → Flight)
- Tilt cyclic hides left CYC stick; gyro drives cyclic
- Yaw round stick → horizontal L/R bar; layout yaw LEFT, TCL+NAC/VEC RIGHT
- Casual pitch confirmed (stick-up = nose UP); Realistic toggle in Settings
- HUD ALT emphasized; FL when ≥ ~1000 ft AGL
- More trees (conifer + round), scrub bushes, denser ground detail

## Changelog v3

- Settings / Systems open → pause; close does not auto-resume (explicit Resume)
- Gyro zero freezes after Cal; no mid-flight silent rewrite; sticky no-signal on lose live
- HUD Level · hold / bank-pitch instructor vs frozen zero
- F-35: more MAX_THRUST + LIFT_FAN, earlier fan, STOVL boost, lower hover TCL; convert needs less fwd speed


## Changelog v4

- **Hard blocker:** pitch dead + rock-drop on convert (~1000 ft / ~80 mph) — both birds
- Pitch authority floor in CONV; no stick-fight auto-center; cyclic→thrust tip through convert
- Conversion lift bridge (rotor/fan → wing) + wing CL0; earlier wing-on; STO push with power
- Drag/energy: DRAG_H cut; lighter convert parasite; settle only when stick idle
- F-35: fan keep until wing ready; STOVL bridge; audio uses vectorPos
- Audio: Osprey proprotor slap ≠ F-35 jet/fan bandpass
