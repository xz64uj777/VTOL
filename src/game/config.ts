/** Osprey / F-35 Flight v2 — tunables. */

export const GRAVITY = 9.81

/** —— Osprey —— */
export const OSP_MASS = 14000
export const OSP_MAX_THRUST = OSP_MASS * GRAVITY * 1.45
export const HOVER_TCL = 0.72
export const GE_HEIGHT = 10
export const GE_BONUS = 0.16
export const PITCH_RATE = 0.72
export const ROLL_RATE = 0.95
export const YAW_RATE = 0.9
export const APL_PITCH_RATE = 0.55
export const APL_ROLL_RATE = 1.15
export const APL_YAW_RATE = 0.45
export const DRAG_H = 0.42
export const DRAG_V = 2.1
export const SETTLE = 0.28
export const WING_AREA = 45
export const AIR_DENSITY = 1.2
export const CL_ALPHA = 4.8
export const CD0 = 0.045
export const CD_INDUCED = 0.08
export const FLAP_CL = 0.55
export const FLAP_CD = 0.12
export const GEAR_H = 2.2
export const LAND_SPRING = 42000
export const LAND_DAMP = 9000
export const FRICTION = 6
export const NACELLE_SLEW = 12
export const NACELLE_HEL_MIN = 75
export const NACELLE_APL_MAX = 15
export const CONV_MIN_SPEED = 35
export const CONV_MAX_SPEED = 140
export const CONV_MIN_ALT = 8

/** —— F-35 (phone-simple) —— */
export const F35_MASS = 13000
export const F35_MAX_THRUST = F35_MASS * GRAVITY * 1.35
export const F35_LIFT_FAN = F35_MASS * GRAVITY * 0.95
export const F35_GEAR_H = 1.8
export const F35_WING = 42
export const F35_CL = 4.2
export const F35_CD0 = 0.028
export const F35_VECTOR_SLEW = 0.55
/** vectorPos thresholds: VL ≥0.75, STOVL ≥0.35, else CTOL */
export const F35_VL_MIN = 0.75
export const F35_STOVL_MIN = 0.35
export const F35_HOVER_THR = 0.78
export const F35_PITCH_RATE = 0.95
export const F35_ROLL_RATE = 1.35
export const F35_YAW_RATE = 0.7

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
