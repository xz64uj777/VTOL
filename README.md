# Osprey Flight v11


## v11

| You said | This build |
|----------|------------|
| Free pitch on runway, no power (both) | Parked/idle: pitchCmd=0 + hard damp; authority ramps with speed/power |
| Scenery hitch ~3000 / ~6000 ft | World-locked hills/clouds; soft band fades (no hard cull pops) |
| F-35 full THR ~30° up low alt → stall | Low-AGL induced-drag cut + path thrust keep; still bleeds if extreme |

BG b375f6a merged (AoA sign, ground lock, scenery world-lock, cockpit, tilt). **Player CLEAR** — `osprey-best.zip` flipped to v11.


Phone/tablet flight sim — **Osprey** (V-22-style tiltrotor) + **F-35** (STOVL / CTOL / VL).  
Vite + React + TypeScript + canvas.

**v10:** F-35 CTOL roll clears rotate · Casual stick-up helps rotate · audio grit killed · cam shake fixed · gear locked on deck · EMER panel start. v3–v9 kept.

Repo target: https://github.com/xz64uj777/VTOL

**Handoff note:** **v11 Player CLEAR.** `osprey-best.zip` matches v11. GitHub `xz64uj777/VTOL` updated with cleared source.
