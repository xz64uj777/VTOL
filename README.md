# Osprey Flight v8

Phone/tablet flight sim — **Osprey** + **F-35**. Flight / controls / physics.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check.

Do **not** overwrite `osprey-best.zip` — Dude flips best.

---

## What Kyle hit (v7) → what v8 changed

| You said | This build |
|----------|------------|
| F-35 **floats** on the runway instead of taxiing | CTOL on wheels: throttle **rolls**. Pitch up to rotate. VL still hovers if you raise VEC |
| Runway **disappeared** | Strip stays drawn from chase / wing / tower / down the field |
| Starts mid-hover | **Cold:** throttle 0, flaps 0, nacelles/VEC airplane. Raise NAC or VEC for hover |
| More terrain | Fields, hills, road, extra taxiways. Runway is still the landmark |

v3–v7 still locked: Settings pauses until Resume · mute · Cal frozen · 5s tilt · LEVEL · yaw bar left · deck gear/flaps · convert tether / no black HUD · F-35 roar / Osprey slap.

---

## Run

```bash
npm install
npm run dev
```
