# Osprey Flight v2

Phone/tablet flight sim — **Osprey** (tilt-rotor) + **F-35** (STOVL).  
Flight / controls / physics only. No missions, scoring, or career.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: start with [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check.

---

## What Kyle disliked (v1) → what this build changed

| Disliked / asked | This build |
|------------------|------------|
| Calibrate only in hangar | **Settings** + **Cal** on the flight deck; also Menu → Flight |
| Joystick still there when tilt is on | Tilt ON **hides** the left cyclic stick — gyro is cyclic |
| Yaw was a round stick | Yaw is a **left L/R bar** |
| Layout felt wrong | **Left:** cyclic (if tilt off) + yaw bar · **Right:** TCL/THR + NAC/VEC |
| Pitch felt inverted on phone | **Casual default:** stick-up / W = **nose UP**. Settings: Invert pitch / Invert roll |
| Hard to read height | **ALT** is the big chip; **FL** only when you’re high (~1000 ft) |
| Ground looked empty | More trees + scrub so motion and height read |

Locked deck rules (do not “improve” these away): thin HUD, FL only when it matters, yaw bar left, throttle + mode right, hide stick on tilt, Cal/Settings always in flight, Casual = nose-up.

---

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default port 8091). Phone: same Wi-Fi, that URL, landscape.

---

## How to fly (feel, not jargon)

**Osprey** — starts helicopter (nacelles up). Raise **TCL** to lift. Hover around ~72%. Climb, then slide **NAC** down toward airplane. To land: nacelles back up, ease TCL onto the pad.

**F-35** — starts vertical. Raise **THR**. **VEC** down = jet / runway. VEC up = hover land.

**Tilt** (phone): tap **Tilt**, allow motion, hold still for **Cal**. Then tilt the tablet instead of the cyclic stick.

---

## Files

- `KYLE-FEEDBACK.md` — punch list + parked softs
- `FLY-SHEET.md` — pass/fail by feel
- `IMPROVEMENTS.md` — changelog, no new feature work until flight feels honest
