import {
  AIR_DENSITY,
  APL_PITCH_RATE,
  APL_ROLL_RATE,
  APL_YAW_RATE,
  CD0,
  CD_INDUCED,
  CL_ALPHA,
  CONV_MAX_SPEED,
  CONV_MIN_ALT,
  CONV_MIN_SPEED,
  DRAG_H,
  DRAG_V,
  F35_CD0,
  F35_CL,
  F35_GEAR_H,
  F35_HOVER_THR,
  F35_LIFT_FAN,
  F35_MASS,
  F35_MAX_THRUST,
  F35_PITCH_RATE,
  F35_ROLL_RATE,
  F35_STOVL_MIN,
  F35_VECTOR_SLEW,
  F35_VL_MIN,
  F35_WING,
  F35_YAW_RATE,
  FLAP_CD,
  FLAP_CL,
  FRICTION,
  GE_BONUS,
  GE_HEIGHT,
  GEAR_H,
  GRAVITY,
  LAND_DAMP,
  LAND_SPRING,
  MASS,
  MAX_THRUST,
  NACELLE_APL_MAX,
  NACELLE_HEL_MIN,
  NACELLE_SLEW,
  PITCH_RATE,
  ROLL_RATE,
  SETTLE,
  WING_AREA,
  YAW_RATE,
} from './config'
import type { BirdKind, Controls, Craft, Experience, F35Mode, FlightMode, OspreyMode } from './types'

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function wrapAngle(a: number): number {
  const tau = Math.PI * 2
  let x = ((a + Math.PI) % tau)
  if (x < 0) x += tau
  return x - Math.PI
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function nacelleCmdToDeg(cmd: number): number {
  return clamp(cmd, 0, 1) * 90
}

export function modeFromNacelle(deg: number): OspreyMode {
  if (deg >= NACELLE_HEL_MIN) return 'HEL'
  if (deg <= NACELLE_APL_MAX) return 'APL'
  return 'CONV'
}

export function modeFromVector(v: number): F35Mode {
  if (v >= F35_VL_MIN) return 'VL'
  if (v >= F35_STOVL_MIN) return 'STOVL'
  return 'CTOL'
}

export function modeFromCraft(c: Craft): FlightMode {
  return c.kind === 'f35' ? modeFromVector(c.vectorPos) : modeFromNacelle(c.nacelleDeg)
}

export function createCraft(kind: BirdKind = 'osprey'): Craft {
  const gearH = kind === 'f35' ? F35_GEAR_H : GEAR_H
  return {
    kind,
    x: 0,
    y: gearH,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    onGround: true,
    rotorRpm: 0.12,
    nacelleDeg: kind === 'osprey' ? 90 : 0,
    vectorPos: kind === 'f35' ? 0.85 : 0, // F-35 starts ready for VL/STOVL demo
    aoa: 0,
    gearDown: true,
    flaps: kind === 'f35' ? 0.25 : 0.4,
    fuel: 1,
    engineL: 1,
    engineR: 1,
    apuOn: false,
    electricsOn: true,
    failAsymmetric: false,
    failHyd: false,
  }
}

function plantGear(c: Craft, contactH: number, ctrl: Controls, plantThr: number, dt: number): void {
  if (c.y <= contactH) {
    const pen = contactH - c.y
    const spring = LAND_SPRING * pen
    const damp = LAND_DAMP * Math.min(0, c.vy)
    const mass = c.kind === 'f35' ? F35_MASS : MASS
    c.vy += ((spring - damp) / mass) * dt
    c.y = contactH
    const grip = clamp(1 - Math.abs(c.vy) * 0.4, 0.15, 1)
    c.vx *= Math.exp(-FRICTION * grip * dt)
    c.vz *= Math.exp(-FRICTION * grip * dt)

    if (ctrl.tcl < plantThr) {
      c.vy *= Math.exp(-6 * dt)
      if (Math.abs(c.vy) < 1.2) {
        c.vy = 0
        c.onGround = true
        c.pitch *= Math.exp(-4 * dt)
        c.roll *= Math.exp(-4 * dt)
      } else {
        c.onGround = false
      }
    } else if (Math.abs(c.vy) < 0.3) {
      c.vy = 0
      c.onGround = true
    } else {
      c.onGround = Math.abs(c.vy) < 1.0
    }
  } else {
    c.onGround = false
  }
}

/** Osprey tiltrotor: HEL / CONV / APL via nacelle. */
function stepOsprey(c: Craft, ctrl: Controls, dt: number, experience: Experience): string {
  let envelopeWarn = ''
  const wantDeg = nacelleCmdToDeg(ctrl.nacelle)
  const slew = NACELLE_SLEW * (c.failHyd ? 0.35 : 1)
  const dN = wantDeg - c.nacelleDeg
  const maxStep = slew * dt
  if (Math.abs(dN) <= maxStep) c.nacelleDeg = wantDeg
  else c.nacelleDeg += Math.sign(dN) * maxStep

  c.flaps = lerp(c.flaps, clamp(ctrl.flaps, 0, 1), 1 - Math.exp(-3 * dt))

  const mode = modeFromNacelle(c.nacelleDeg)
  const nacRad = (c.nacelleDeg * Math.PI) / 180
  const helFrac = Math.sin(nacRad)
  const aplFrac = Math.cos(nacRad)

  const engAvg = ((c.engineL + c.engineR) / 2) * (c.electricsOn ? 1 : 0.15)
  const asym = c.failAsymmetric ? 0.55 : 1
  const powerAvail = clamp(engAvg * asym * (0.4 + 0.6 * c.fuel), 0, 1)

  const wantRpm = 0.15 + ctrl.tcl * 0.85 * powerAvail
  c.rotorRpm += (wantRpm - c.rotorRpm) * (1 - Math.exp(-3.2 * dt))

  if (ctrl.tcl > 0.05 && c.fuel > 0) {
    c.fuel = Math.max(0, c.fuel - dt * (0.0008 + ctrl.tcl * 0.0012))
  }

  const speedHoriz = Math.hypot(c.vx, c.vz)
  const speedKt = speedHoriz * 1.94384
  const agl = Math.max(0, c.y - GEAR_H)

  if (mode === 'CONV' || (mode === 'HEL' && c.nacelleDeg < 85) || (mode === 'APL' && c.nacelleDeg > 5)) {
    if (speedKt < CONV_MIN_SPEED && c.nacelleDeg < 70) {
      envelopeWarn = 'SLOW — accelerate before converting down'
      if (experience === 'advanced' && c.nacelleDeg < 50) c.vy -= 2.5 * dt
    } else if (speedKt > CONV_MAX_SPEED && c.nacelleDeg > 40) {
      envelopeWarn = 'FAST — slow before converting up'
    } else if (agl < CONV_MIN_ALT && mode === 'CONV' && !c.onGround) {
      envelopeWarn = 'LOW — convert higher'
    } else if (mode === 'CONV') {
      envelopeWarn = 'CONV — keep speed in band'
    }
  }

  const pitchRate = lerp(APL_PITCH_RATE, PITCH_RATE, helFrac)
  const rollRate = lerp(APL_ROLL_RATE, ROLL_RATE, helFrac)
  const yawRate = lerp(APL_YAW_RATE, YAW_RATE, helFrac)

  let pitchCmd = ctrl.cyclicPitch * pitchRate
  let rollCmd = ctrl.cyclicRoll * rollRate
  let yawCmd = ctrl.yaw * yawRate
  if (helFrac > 0.4) yawCmd += ctrl.tcl * 0.06 * ctrl.cyclicRoll * helFrac
  else yawCmd *= clamp(speedHoriz / 40, 0.15, 1)
  if (c.failAsymmetric) rollCmd += 0.25

  c.pitch += pitchCmd * dt
  c.roll += rollCmd * dt
  c.yaw = wrapAngle(c.yaw + yawCmd * dt)

  const pitchLim = lerp(0.4, 0.55, helFrac)
  const rollLim = lerp(0.85, 0.65, helFrac)
  c.pitch = clamp(c.pitch, -pitchLim, pitchLim)
  c.roll = clamp(c.roll, -rollLim, rollLim)
  if (Math.abs(ctrl.cyclicPitch) < 0.05) c.pitch *= Math.exp(-0.3 * dt)
  if (Math.abs(ctrl.cyclicRoll) < 0.05) c.roll *= Math.exp(-0.35 * dt)

  const cy = Math.cos(c.yaw)
  const sy = Math.sin(c.yaw)
  const cp = Math.cos(c.pitch)
  const sp = Math.sin(c.pitch)
  const cr = Math.cos(c.roll)
  const sr = Math.sin(c.roll)

  const fxB = sy * cp
  const fyB = -sp
  const fzB = cy * cp
  const ux = sy * sp * cr + cy * sr
  const uy = cp * cr
  const uz = cy * sp * cr - sy * sr

  const tx = Math.sin(nacRad) * ux + Math.cos(nacRad) * fxB
  const ty = Math.sin(nacRad) * uy + Math.cos(nacRad) * fyB
  const tz = Math.sin(nacRad) * uz + Math.cos(nacRad) * fzB

  const ge = GE_BONUS * Math.exp(-agl / GE_HEIGHT) * helFrac * (c.onGround ? 0.35 : 1)
  const thrustMag = MAX_THRUST * ctrl.tcl * (0.7 + 0.3 * c.rotorRpm) * powerAvail * (1 + ge)

  let fx = tx * thrustMag
  let fy = ty * thrustMag - MASS * GRAVITY
  let fz = tz * thrustMag

  const airspeed = Math.hypot(c.vx, c.vy, c.vz)
  const qDyn = 0.5 * AIR_DENSITY * airspeed * airspeed
  const wingOn = clamp(aplFrac * 1.15, 0, 1) * clamp(airspeed / 25, 0, 1)

  if (wingOn > 0.02 && airspeed > 2) {
    const vPitch = Math.atan2(-c.vy, Math.max(1, speedHoriz))
    const aoa = c.pitch - vPitch
    c.aoa = aoa
    const cl = clamp(CL_ALPHA * aoa + FLAP_CL * c.flaps, -1.2, 1.6)
    const cd = CD0 + CD_INDUCED * cl * cl + FLAP_CD * c.flaps
    const lift = qDyn * WING_AREA * cl * wingOn
    const drag = qDyn * WING_AREA * cd * wingOn
    fx += ux * lift
    fy += uy * lift
    fz += uz * lift
    if (airspeed > 0.1) {
      fx -= (c.vx / airspeed) * drag
      fy -= (c.vy / airspeed) * drag
      fz -= (c.vz / airspeed) * drag
    }
  } else {
    c.aoa = c.pitch
  }

  fx -= c.vx * DRAG_H * MASS * (0.35 + helFrac * 0.35) * (0.4 + airspeed * 0.015)
  fz -= c.vz * DRAG_H * MASS * (0.35 + helFrac * 0.35) * (0.4 + airspeed * 0.015)
  fy -= c.vy * DRAG_V * MASS * 0.12 * (0.5 + helFrac * 0.5)

  if (c.vy < 0 && ctrl.tcl > 0.3 && helFrac > 0.5) {
    fy -= SETTLE * MASS * (-c.vy) * ctrl.tcl * helFrac
  }
  if (c.gearDown && aplFrac > 0.5) {
    fx -= c.vx * 0.15 * MASS
    fz -= c.vz * 0.15 * MASS
  }

  c.vx += (fx / MASS) * dt
  c.vy += (fy / MASS) * dt
  c.vz += (fz / MASS) * dt
  c.x += c.vx * dt
  c.y += c.vy * dt
  c.z += c.vz * dt

  const contactH = c.gearDown ? GEAR_H : GEAR_H * 0.55
  const plantThr = mode === 'HEL' ? 0.55 : 0.25
  plantGear(c, contactH, ctrl, plantThr, dt)
  return envelopeWarn
}

/**
 * F-35 phone-simple: CTOL / STOVL / VL via thrust vector + lift-fan cue.
 * vector 0 = CTOL (aft thrust), mid = STOVL blend, 1 = VL (lift fan + nozzle down).
 */
function stepF35(c: Craft, ctrl: Controls, dt: number, experience: Experience): string {
  let envelopeWarn = ''
  const want = clamp(ctrl.vector, 0, 1)
  const slew = F35_VECTOR_SLEW * (c.failHyd ? 0.4 : 1)
  const dV = want - c.vectorPos
  const maxStep = slew * dt
  if (Math.abs(dV) <= maxStep) c.vectorPos = want
  else c.vectorPos += Math.sign(dV) * maxStep

  c.flaps = lerp(c.flaps, clamp(ctrl.flaps, 0, 1), 1 - Math.exp(-3 * dt))

  const mode = modeFromVector(c.vectorPos)
  // vlFrac: 0 CTOL → 1 VL (nozzle/fan vertical)
  const vlFrac = clamp(c.vectorPos, 0, 1)
  const stovlBlend = mode === 'STOVL' ? 1 : mode === 'VL' ? 1 : 0

  const eng = c.engineL * (c.electricsOn ? 1 : 0.2) * (0.45 + 0.55 * c.fuel)
  const powerAvail = clamp(eng * (c.failAsymmetric ? 0.7 : 1), 0, 1)

  // Fan/rpm cue scales with VL demand
  const wantRpm = 0.1 + ctrl.tcl * (0.5 + vlFrac * 0.45) * powerAvail
  c.rotorRpm += (wantRpm - c.rotorRpm) * (1 - Math.exp(-4 * dt))

  if (ctrl.tcl > 0.05 && c.fuel > 0) {
    c.fuel = Math.max(0, c.fuel - dt * (0.001 + ctrl.tcl * 0.0015))
  }

  const speedHoriz = Math.hypot(c.vx, c.vz)
  const speedKt = speedHoriz * 1.94384
  const agl = Math.max(0, c.y - F35_GEAR_H)

  if (mode === 'STOVL') {
    if (speedKt > 180) envelopeWarn = 'FAST for STOVL — slow or go CTOL'
    else if (speedKt < 40 && agl < 6 && !c.onGround) envelopeWarn = 'STOVL — watch sink'
    else envelopeWarn = 'STOVL — thrust vector blend'
  } else if (mode === 'VL') {
    if (speedKt > 50) envelopeWarn = 'VL — reduce forward speed'
    else if (experience !== 'casual') envelopeWarn = 'VL — lift fan + nozzle'
  } else if (mode === 'CTOL' && speedKt < 80 && agl > 5 && ctrl.tcl < 0.5) {
    envelopeWarn = 'CTOL — keep speed / AoA'
  }

  const pitchCmd = ctrl.cyclicPitch * F35_PITCH_RATE
  let rollCmd = ctrl.cyclicRoll * F35_ROLL_RATE
  let yawCmd = ctrl.yaw * F35_YAW_RATE * (mode === 'CTOL' ? clamp(speedHoriz / 50, 0.2, 1) : 1)
  if (c.failAsymmetric) rollCmd += 0.2
  // VL: stick more like heli cyclic for translation
  if (mode === 'VL') {
    yawCmd += ctrl.tcl * 0.04 * ctrl.cyclicRoll
  }

  c.pitch += pitchCmd * dt
  c.roll += rollCmd * dt
  c.yaw = wrapAngle(c.yaw + yawCmd * dt)

  const pitchLim = mode === 'VL' ? 0.45 : 0.55
  c.pitch = clamp(c.pitch, -pitchLim, pitchLim)
  c.roll = clamp(c.roll, -0.9, 0.9)
  if (Math.abs(ctrl.cyclicPitch) < 0.05) c.pitch *= Math.exp(-0.28 * dt)
  if (Math.abs(ctrl.cyclicRoll) < 0.05) c.roll *= Math.exp(-0.32 * dt)

  const cy = Math.cos(c.yaw)
  const sy = Math.sin(c.yaw)
  const cp = Math.cos(c.pitch)
  const sp = Math.sin(c.pitch)
  const cr = Math.cos(c.roll)
  const sr = Math.sin(c.roll)

  const fxB = sy * cp
  const fyB = -sp
  const fzB = cy * cp
  const ux = sy * sp * cr + cy * sr
  const uy = cp * cr
  const uz = cy * sp * cr - sy * sr

  // Main nozzle: tilts from aft (CTOL) toward down (VL)
  const nozzleDown = vlFrac // 0 aft, 1 down
  const nx = (1 - nozzleDown) * fxB + nozzleDown * ux
  const ny = (1 - nozzleDown) * fyB + nozzleDown * uy
  const nz = (1 - nozzleDown) * fzB + nozzleDown * uz

  const mainThrust = F35_MAX_THRUST * ctrl.tcl * powerAvail * (0.75 + 0.25 * c.rotorRpm)

  // Lift fan (cue) — strong in VL/STOVL, along body-up
  const fanFrac = clamp((vlFrac - 0.2) / 0.8, 0, 1)
  const fanThrust = F35_LIFT_FAN * ctrl.tcl * fanFrac * powerAvail * (0.6 + 0.4 * c.rotorRpm)
  const ge = 0.14 * Math.exp(-agl / 8) * fanFrac * (c.onGround ? 0.3 : 1)

  let fx = nx * mainThrust + ux * fanThrust * (1 + ge)
  let fy = ny * mainThrust + uy * fanThrust * (1 + ge) - F35_MASS * GRAVITY
  let fz = nz * mainThrust + uz * fanThrust * (1 + ge)

  // In VL, stick tilt translates via body-up component (heli-like)
  if (mode === 'VL' || (mode === 'STOVL' && speedKt < 60)) {
    fx += ux * ctrl.tcl * F35_MASS * 2.5 * stovlBlend * 0.15
    // already in thrust vector
  }

  const airspeed = Math.hypot(c.vx, c.vy, c.vz)
  const qDyn = 0.5 * AIR_DENSITY * airspeed * airspeed
  const wingOn = clamp(1 - vlFrac * 0.85, 0.15, 1) * clamp(airspeed / 28, 0, 1)

  if (wingOn > 0.02 && airspeed > 3) {
    const vPitch = Math.atan2(-c.vy, Math.max(1, speedHoriz))
    const aoa = c.pitch - vPitch
    c.aoa = aoa
    const cl = clamp(F35_CL * aoa + FLAP_CL * c.flaps * 0.8, -1.1, 1.5)
    const cd = F35_CD0 + 0.07 * cl * cl + FLAP_CD * c.flaps * 0.7
    const lift = qDyn * F35_WING * cl * wingOn
    const drag = qDyn * F35_WING * cd * wingOn
    fx += ux * lift
    fy += uy * lift
    fz += uz * lift
    if (airspeed > 0.1) {
      fx -= (c.vx / airspeed) * drag
      fy -= (c.vy / airspeed) * drag
      fz -= (c.vz / airspeed) * drag
    }
  } else {
    c.aoa = c.pitch
  }

  // Parasite drag
  fx -= c.vx * 0.35 * F35_MASS * (0.3 + airspeed * 0.012)
  fz -= c.vz * 0.35 * F35_MASS * (0.3 + airspeed * 0.012)
  fy -= c.vy * 1.6 * F35_MASS * 0.1

  if (c.gearDown && mode === 'CTOL') {
    fx -= c.vx * 0.12 * F35_MASS
    fz -= c.vz * 0.12 * F35_MASS
  }

  c.vx += (fx / F35_MASS) * dt
  c.vy += (fy / F35_MASS) * dt
  c.vz += (fz / F35_MASS) * dt
  c.x += c.vx * dt
  c.y += c.vy * dt
  c.z += c.vz * dt

  const contactH = c.gearDown ? F35_GEAR_H : F35_GEAR_H * 0.5
  const plantThr = mode === 'VL' ? 0.58 : mode === 'STOVL' ? 0.4 : 0.22
  plantGear(c, contactH, ctrl, plantThr, dt)

  // Soft sink cue if VL throttle too low
  if (mode === 'VL' && !c.onGround && ctrl.tcl < F35_HOVER_THR - 0.15 && experience === 'advanced') {
    c.vy -= 1.2 * dt
  }

  return envelopeWarn
}

export function stepCraft(
  c: Craft,
  ctrl: Controls,
  dt: number,
  experience: Experience,
): string {
  const dtClamped = clamp(dt, 0, 0.05)
  if (c.kind === 'f35') return stepF35(c, ctrl, dtClamped, experience)
  return stepOsprey(c, ctrl, dtClamped, experience)
}

export function hardLanding(c: Craft): boolean {
  const contactH = c.kind === 'f35'
    ? c.gearDown
      ? F35_GEAR_H
      : F35_GEAR_H * 0.5
    : c.gearDown
      ? GEAR_H
      : GEAR_H * 0.55
  return c.y <= contactH + 0.08 && (c.vy < -8 || Math.hypot(c.vx, c.vz) > 22)
}

export function headingDeg(yaw: number): number {
  let d = ((yaw * 180) / Math.PI) % 360
  if (d < 0) d += 360
  return d
}

export function contactHeight(c: Craft): number {
  if (c.kind === 'f35') return c.gearDown ? F35_GEAR_H : F35_GEAR_H * 0.5
  return c.gearDown ? GEAR_H : GEAR_H * 0.55
}
