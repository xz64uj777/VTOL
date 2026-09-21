# Osprey Flight v3

Phone/tablet flight sim — **Osprey** (tilt-rotor) + **F-35** (STOVL).  
Flight / controls / physics only.

Repo: https://github.com/xz64uj777/VTOL

**Kyle: start with [FLY-SHEET.md](FLY-SHEET.md)** — five-minute feel check.

---

## What Kyle disliked (v2) → what v3 changed

| Disliked / asked | This build |
|------------------|------------|
| Settings while flying | **Settings** / **Menu** **pauses**. Close does **not** auto-resume — tap **Resume** |
| Tilt phantom-recal ~400 ft / nacelle rotate | Cal **freezes** the zero. No silent rewrite mid-flight |
| Can’t tell phone level vs drifted gyro | HUD **Level · hold** (or nose/bank hints) vs frozen zero |
| Gyro drop rewrote zero | Sticky **no signal**; same frozen zero when live returns |
| F-35 weak / needs too much speed to convert | Stronger VL / lift-fan / STOVL; convert needs less forward speed |

v2 deck locked (do not regress): yaw bar left, tilt hides stick, Cal in flight, Casual stick-up = nose up, ALT + FL when high, denser trees.

---

## Run

```bash
npm install
npm run dev
```

---

## How to fly (feel)

**Osprey** — starts helicopter. Raise **TCL**. Hover. Slide **NAC** down toward airplane. Land: nacelles up, ease TCL.

**F-35** — starts vertical. Raise **THR**. Hover should feel stronger than v2. **VEC** down = jet. VEC up = hover land.

**Tilt** — tap Tilt, allow motion, hold still for **Cal**. **Level · hold** means you’re on that Cal. Don’t recals unless you mean to.
