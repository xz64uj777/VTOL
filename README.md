# Osprey Flight v6

Phone/tablet flight sim — **Osprey** + **F-35**. Flight / controls / physics only.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check.

This drop is the **convert camera / black HUD / tilt-stays-lost / F-35 jet** fix.

---

## What Kyle disliked (v5) → what v6 changed

| Disliked / asked | This build |
|------------------|------------|
| Start rotate/convert → cam keeps going, bird disappears, screen **black**, HUD numbers explode | Cam **tethered** to the bird. Convert/sink kills the “look ahead.” If physics blows up: freeze, **SIM FAULT — Reset**, HUD shows `---` never 1e308 |
| Tilt dies mid-convert and **stays** dead | Hold **Tilt · live** through gaps up to **5 seconds**. Re-arm listeners. Same frozen Cal. Slew back in. |
| F-35 still a thin whine | Deep **roar + scream** (afterburner rumble when THR high / CTOL). Osprey stays slap/thump. |

v3–v5 still locked: Settings pauses until Resume · mute in menu · Cal frozen · LEVEL gauge · yaw bar left · tilt hides stick · Casual nose-up · convert lift bridge.

---

## Run

```bash
npm install
npm run dev
```
