# Osprey Flight v10

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

## Run

```bash
npm install
npm run dev
```
