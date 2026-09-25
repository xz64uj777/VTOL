import type { Controls, Craft, Experience } from './types'
import { F35_GEAR_H, GEAR_H } from './config'
import { clamp, wrapAngle } from './physics_shared'
import { stepOsprey } from './physics_osprey'
import { stepF35 } from './physics_f35'

export {
  clamp, wrapAngle, lerp, nacelleCmdToDeg, modeFromNacelle, modeFromVector, modeFromCraft, createCraft,
} from './physics_shared'
export { stepOsprey } from './physics_osprey'
export { stepF35 } from './physics_f35'

export function stepCraft(
  c: Craft,
  ctrl: Controls,
  dt: number,
  experience: Experience,
): string {
  const dtClamped = clamp(dt, 0, 0.05)
  const warn =
    c.kind === 'f35' ? stepF35(c, ctrl, dtClamped, experience) : stepOsprey(c, ctrl, dtClamped, experience)
  // v10: never allow gear UP while weight-on-wheels
  if (c.onGround) c.gearDown = true
  return warn
}


/** Refuse gear UP while weight-on-wheels / firmly on deck. Extend always OK. */
export function trySetGearDown(c: Craft, wantDown: boolean): boolean {
  if (wantDown) {
    c.gearDown = true
    return true
  }
  const gearH = c.kind === 'f35' ? F35_GEAR_H : GEAR_H
  const agl = Math.max(0, c.y - gearH)
  if (c.onGround || agl < 1.2) {
    c.gearDown = true
    return false
  }
  c.gearDown = false
  return true
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


/** Freeze craft if any kinematic field is non-finite. Returns true if a fault was caught. */
export function sanitizeCraft(c: Craft): boolean {
  const fields = [c.x, c.y, c.z, c.vx, c.vy, c.vz, c.pitch, c.roll, c.yaw, c.aoa, c.nacelleDeg, c.vectorPos, c.rotorRpm]
  if (fields.every((v) => Number.isFinite(v))) {
    // Soft clamp attitudes even when finite
    c.pitch = clamp(c.pitch, -1.2, 1.2)
    c.roll = clamp(c.roll, -1.4, 1.4)
    c.yaw = wrapAngle(c.yaw)
    c.nacelleDeg = clamp(c.nacelleDeg, 0, 90)
    c.vectorPos = clamp(c.vectorPos, 0, 1)
    c.rotorRpm = clamp(c.rotorRpm, 0, 1.5)
    c.aoa = clamp(c.aoa, -1.5, 1.5)
    const gearH = c.kind === 'f35' ? F35_GEAR_H : GEAR_H
    if (c.y < gearH * 0.4) c.y = gearH * 0.4
    if (c.y > 8000) c.y = 8000
    return false
  }
  const gearH = c.kind === 'f35' ? F35_GEAR_H : GEAR_H
  c.vx = 0
  c.vy = 0
  c.vz = 0
  c.x = Number.isFinite(c.x) ? c.x : 0
  c.y = Number.isFinite(c.y) ? clamp(c.y, gearH, 500) : gearH
  c.z = Number.isFinite(c.z) ? c.z : 0
  c.pitch = Number.isFinite(c.pitch) ? clamp(c.pitch, -0.5, 0.5) : 0
  c.roll = Number.isFinite(c.roll) ? clamp(c.roll, -0.5, 0.5) : 0
  c.yaw = Number.isFinite(c.yaw) ? wrapAngle(c.yaw) : 0
  c.aoa = 0
  c.rotorRpm = clamp(Number.isFinite(c.rotorRpm) ? c.rotorRpm : 0.2, 0, 1)
  c.nacelleDeg = clamp(Number.isFinite(c.nacelleDeg) ? c.nacelleDeg : 0, 0, 90)
  c.vectorPos = clamp(Number.isFinite(c.vectorPos) ? c.vectorPos : 0, 0, 1)
  c.onGround = c.y <= gearH + 0.2
  return true
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
