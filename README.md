# Osprey Flight v4

Phone/tablet flight sim — **Osprey** + **F-35**. Flight / controls / physics only.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check. This drop is the **convert / pitch hard blocker**.

---

## What Kyle disliked (v3) → what v4 changed

| Disliked / asked | This build |
|------------------|------------|
| ~1000 ft, convert, ~80 mph, pitch forward **does nothing**, speed bleeds, **falls like a rock** (both birds) | Pitch **always** works in CONV/STOVL. Lift **bridge** rotor/fan → wing. Drag cut so you keep energy. Short takeoff: power + rotate + convert without rock-drop |
| Osprey and F-35 sounded the same | Osprey rumble/slap ≠ F-35 jet/fan |

v3 still locked: Settings pauses until Resume · Cal frozen · Level cue · stronger VL hover · yaw bar left · tilt hides stick · Casual nose-up.

---

## Run

```bash
npm install
npm run dev
```

---

## How to fly (feel)

**Osprey** — HEL, raise TCL, climb. Slide **NAC** down while pitching forward. You should **accelerate**, not drop. Land: nacelles up, ease TCL.

**F-35** — VL hover, then **VEC** down + rotate. Pitch works. Convert without dying. VEC up to hover-land.
