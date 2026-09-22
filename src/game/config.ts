/** Osprey / F-35 Flight v4 — tunables. */

export const GRAVITY = 9.81

/** —— Osprey —— */
export const OSP_MASS = 14000
/** Slight convert margin over hover (v4). */
export const OSP_MAX_THRUST = OSP_MASS * GRAVITY * 1.55
export const HOVER_TCL = 0.70
export const GE_HEIGHT = 10
export const GE_BONUS = 0.16
/** Pitch rates — CONV keeps a floor so stick never feels dead (v4). */
export const PITCH_RATE = 0.85
export const ROLL_RATE = 0.95
export const YAW_RATE = 0.9
export const APL_PITCH_RATE = 0.72
export const APL_ROLL_RATE = 1.15
export const APL_YAW_RATE = 0.45
export const CONV_PITCH_FLOOR = 0.78
/** v4: was 0.42 — excessive convert speed bleed. */
export const DRAG_H = 0.16
export const DRAG_V = 1.6
export const SETTLE = 0.18
export const WING_AREA = 48
export const AIR_DENSITY = 1.2
/** Built-in wing incidence so level CONV/APL makes lift (v4). */
export const CL0 = 0.42
export const CL_ALPHA = 4.6
export const CD0 = 0.032
export const CD_INDUCED = 0.06
export const FLAP_CL = 0.55
export const FLAP_CD = 0.10
export const GEAR_H = 2.2
export const LAND_SPRING = 42000
export const LAND_DAMP = 9000
export const FRICTION = 6
export const NACELLE_SLEW = 12
export const NACELLE_HEL_MIN = 75
export const NACELLE_APL_MAX = 15
export const CONV_MIN_SPEED = 28
export const CONV_MAX_SPEED = 150
export const CONV_MIN_ALT = 8
/** Airspeed (m/s) where wing is trusted to carry full weight in convert bridge. */
export const CONV_WING_SPEED = 48
/** Peak extra vertical (× weight × tcl) mid-convert when wing not ready. */
export const CONV_BRIDGE = 0.72
/** Direct cyclic → thrust tip (heli-like), fades in APL. */
export const CYCLIC_THRUST_TIP = 0.42

/** —— F-35 — v4: lift bridge VL→STOVL→CTOL + less convert bleed —— */
export const F35_MASS = 13000
export const F35_MAX_THRUST = F35_MASS * GRAVITY * 1.62
export const F35_LIFT_FAN = F35_MASS * GRAVITY * 1.28
export const F35_GEAR_H = 1.8
export const F35_WING = 44
export const F35_CL0 = 0.38
export const F35_CL = 4.4
export const F35_CD0 = 0.022
export const F35_VECTOR_SLEW = 0.55
/** vectorPos thresholds: VL ≥0.75, STOVL ≥0.35, else CTOL */
export const F35_VL_MIN = 0.75
export const F35_STOVL_MIN = 0.35
export const F35_HOVER_THR = 0.64
export const F35_PITCH_RATE = 1.05
export const F35_ROLL_RATE = 1.35
export const F35_YAW_RATE = 0.7
export const F35_CONV_WING_SPEED = 52
export const F35_CONV_BRIDGE = 0.68
export const F35_DRAG_H = 0.14

export const PAD_X = 0
export const PAD_Z = 0
export const PAD_R = 22

/** Legacy alias used by Osprey physics. */
export const MASS = OSP_MASS
export const MAX_THRUST = OSP_MAX_THRUST

export const QUALITY = {
  low: { trees: 22, buildings: 6, particles: 0, shadows: false, groundDetail: 10 },
  med: { trees: 48, buildings: 12, particles: 22, shadows: true, groundDetail: 16 },
  high: { trees: 72, buildings: 20, particles: 44, shadows: true, groundDetail: 24 },
} as const

export type QualityKey = keyof typeof QUALITY
