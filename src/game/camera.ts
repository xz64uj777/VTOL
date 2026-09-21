import { clamp, lerp, wrapAngle } from './physics'
import type { Cam, CamMode, Craft } from './types'

export function createCam(): Cam {
  return { x: 0, y: 10, z: -28, yaw: 0, pitch: -0.26, dist: 34 }
}

type CamX = Cam & { orbitAng?: number }

/**
 * Helios/Copter lessons: speed-scaled lead + error snap.
 * Chase → Pad → Orbit.
 */
export function updateCamera(cam: Cam, craft: Craft, mode: CamMode, dt: number): void {
  const speed = Math.hypot(craft.vx, craft.vz)
  let tx = craft.x
  let ty = craft.y + 2.8
  let tz = craft.z
  let wantYaw = cam.yaw
  let wantPitch = cam.pitch
  let wantDist = cam.dist
  const cx = cam as CamX

  if (mode === 'chase') {
    const lead = clamp(speed * 0.4, 0, 16)
    const back = 20 + clamp(speed * 0.4, 0, 16)
    const height = 6.5 + clamp(speed * 0.09, 0, 5)
    const lookX = craft.x + Math.sin(craft.yaw) * lead
    const lookY = craft.y + 1.6
    const lookZ = craft.z + Math.cos(craft.yaw) * lead
    tx = craft.x - Math.sin(craft.yaw) * back
    tz = craft.z - Math.cos(craft.yaw) * back
    ty = craft.y + height
    const dx = lookX - tx
    const dy = lookY - ty
    const dz = lookZ - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = back
  } else if (mode === 'pad') {
    tx = -38
    ty = 22
    tz = -38
    const dx = craft.x - tx
    const dy = craft.y + 1.8 - ty
    const dz = craft.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = 52
  } else {
    const orbitSpeed = 0.26
    const orbitAng = wrapAngle((cx.orbitAng ?? craft.yaw + 0.9) + orbitSpeed * dt)
    cx.orbitAng = orbitAng
    wantDist = 28 + clamp(speed * 0.28, 0, 12)
    tx = craft.x - Math.sin(orbitAng) * wantDist
    tz = craft.z - Math.cos(orbitAng) * wantDist
    ty = craft.y + 11
    const dx = craft.x - tx
    const dy = craft.y + 1.4 - ty
    const dz = craft.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
  }

  if (mode === 'chase' || mode === 'orbit') {
    const leadT = clamp(speed * 0.08, 0.04, 0.5)
    tx += craft.vx * leadT
    tz += craft.vz * leadT
    ty += craft.vy * leadT * 0.35
  }

  const err = Math.hypot(tx - cam.x, ty - cam.y, tz - cam.z)
  const frameW = Math.max(wantDist, 14)
  const errFrames = err / frameW
  let k = mode === 'pad' ? 6 : mode === 'chase' ? 10 : 7
  k *= 1 + clamp(errFrames * 0.9, 0, 4)
  if (errFrames > 2.4) k = Math.max(k, 48)
  else if (errFrames > 1.35) k = Math.max(k, 24)

  const a = 1 - Math.exp(-k * dt)
  cam.x = lerp(cam.x, tx, a)
  cam.y = lerp(cam.y, ty, a)
  cam.z = lerp(cam.z, tz, a)

  const ka = 1 - Math.exp(-(mode === 'orbit' ? 5 : 9) * dt)
  cam.yaw += wrapAngle(wantYaw - cam.yaw) * ka
  cam.pitch = lerp(cam.pitch, wantPitch, ka)
  cam.dist = lerp(cam.dist, wantDist, ka)
}

export const CAM_ORDER: CamMode[] = ['chase', 'pad', 'orbit']

export function nextCam(mode: CamMode): CamMode {
  const i = CAM_ORDER.indexOf(mode)
  return CAM_ORDER[(i + 1) % CAM_ORDER.length]!
}
