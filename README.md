# Osprey Flight v11

Phone/tablet flight sim — **Osprey** + **F-35**. Flight / controls / physics.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check.

Do **not** overwrite `osprey-best.zip` — Dude flips best.

---

## What Kyle hit (v9) → what v10 changed

| You said | This build |
|----------|------------|
| Full throttle stuck around **52 kt** — couldn’t rotate | Roll push is stronger. Full throttle gets you **past rotate** (~74 kt and beyond) |
| Casual stick-up fought the rotate | Stick-up = **nose up** and helps you rotate |
| Still felt **airborne** on the deck | Wings stay pinned. Pitch only when you’re fast and you ask for it |
| Audio still **staticy** | Modulation grit cut. Osprey slaps, F-35 roars |
| Camera **shakes** after ~200 ft | Chase dampened. No altitude wobble |
| Gear could come **up on the ground** | Gear stays **DOWN** until you’re airborne |
| Start a real emergency panel | **EMER** on the deck: gear down, flaps full, throttle cut, mode to airplane |
| FL chip looked like a fault | It’s **flight level** (altitude in hundreds of feet). Shows when you’re high. Not a bug |

v3–v9 still locked: Settings pauses until Resume · Hangar only in Settings · cold start · runway · far scenery · tilt · yaw bar left.

---


## Live fix after v10 (Kyle, no new zip)

| You said | This patch |
|----------|------------|
| Both birds **creep / yaw on the ramp with power at 0** | Parking brake holds. Stopped + no throttle = sit still. Nosewheel only steers once you're rolling |
| **Roll right, drift left** | Bank now slides toward the low wing. Stick right on the ground turns the nose right |

v10 rotate, gear lock, EMER, and deck rules are unchanged.


## Live fix — Osprey climb / cockpit

| You said | This patch |
|----------|------------|
| After ~2000 ft the Osprey **stops climbing and sinks** | The wing was pulling **down** when the nose was up. Nose-up now makes lift. It keeps climbing. |
| Speed number **doesn't drop** when it feels like it should | **SPD** is airspeed now (up/down counts). A climb bleeds it. A dive raises it. |
| Acceleration is a bit **hot** | Airplane drag is a little higher. F-35 still gets past rotate, just not as violent. |
| Craft looks thin. Want **in the seat** | Solid fuselage/wings. **Cam** once → **COCKPIT** (glare shield, nose, wings). Drag to look around. |

Ramp plant and bank-matches-drift stay.


## Live fix — open world, tilt, runway

| You said | This patch |
|----------|------------|
| Both birds still wrong **on the runway** | Wings stay level at zero power. They don't bank or skate in place. |
| **Tilt** is funny on both | Tilt follows the **screen**. In landscape, tip the top of the phone up = nose up. Tip right = bank right. Hit **Cal** once after turning Tilt on. |
| Can't get above ~1500 ft. Altitude falls, speed doesn't | Nose-up now lifts **both** birds (the jet was pointing thrust down). |
| Feels like a **landscape ceiling**. Want open world | Hills stay a fixed height. Clouds sit at fixed heights. The ground does not rise with you. Fly as far as you want — countryside keeps going. |

## Run

```bash
npm install
npm run dev
```

## v11 — tilt and control reliability

- Screen-relative gravity mapping supports portrait and both landscape directions,
  avoids Euler wrap spikes, and does not use compass heading to steer.
- Cal waits for a stable pose for 600 ms. Calibration is session-only; tap Tilt
  each flight session while holding the phone in your comfortable flying position.
- Screen rotation pauses and recalibrates. Tap Resume when ready.
- Tilt is smoothed; stale steering fades between 250 ms and 1 second. Touch cyclic
  returns on delayed/lost motion. Fresh samples recover with the same neutral pose.
- Pitch mode no longer reverses roll. Invert roll remains an explicit option.
- Relative and absolute sensor feeds no longer fight each other; invalid readings
  are ignored. Unsupported/insecure sensor contexts fall back to touch.
- Switching apps pauses and clears held controls; returning requires Resume.
- Multiple fingers cannot steal an already held control.

Validation: `npm test` covers orientation mapping, wrapping, independent yaw/tilt,
control inversion, stale samples, unsupported sensors, and duplicate sensor feeds.
`npm run build` type-checks and builds the app. Real-device feel still needs testing.
