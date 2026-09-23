# Osprey Flight v9

Phone/tablet flight sim — **Osprey** + **F-35**. Flight / controls / physics.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check.

Do **not** overwrite `osprey-best.zip` — Dude flips best.

---

## What Kyle hit (v8) → what v9 changed

| You said | This build |
|----------|------------|
| Past ~1000 ft the world **empties** | Fields, trees, ridges, clouds follow you up. Horizon scales with altitude |
| Sound goes **static** up high | Audio levels clamped so it doesn’t clip into noise. Osprey still slaps, F-35 still roars |
| Camera from **under/behind** looks wrong | Chase stays **above and behind**. No belly view |
| F-35 **jumps** on the runway | Jet ground pin. No Osprey bounce spring. Rolls, then rotate to lift |
| **Hangar** next to Pause — easy mis-tap | Hangar off the flight bar. It’s in **Settings** (asks first). Crash screen still has Hangar |

v3–v8 still locked: Settings pauses until Resume · mute · Cal frozen · 5s tilt · LEVEL · yaw bar left · deck · cold start · runway stays painted · convert tether.

---

## Run

```bash
npm install
npm run dev
```
