import { clamp, lerp, modeFromCraft, wrapAngle } from './physics'
import type { Cam, CamMode, Craft } from './types'

export function createCam(): Cam {
  return { x: 0, y: 10, z: -28, yaw: 0, pitch: -0.26, dist: 34 }
}

type CamX = Cam & { orbitAng?: number }

/** Max chase tether as a multiple of wantDist — cam never drifts farther than this from craft. */
const CHASE_TETHER = 1.15

/**
 * Chase → Pad → Orbit.
 * v6: craft-in-view snap + kill velocity lead on convert/decel + hard tether so bird
 * cannot exit the rear of the frame while cam sits "on target."
 */
export function updateCamera(cam: Cam, craft: Craft, mode: CamMode, dt: number): void {
  // Guard against NaN craft — leave cam alone until sanitize recovers.
  if (
    !Number.isFinite(craft.x) ||
    !Number.isFinite(craft.y) ||
    !Number.isFinite(craft.z) ||
    !Number.isFinite(craft.yaw)
  ) {
    return
  }

  const speed = Math.hypot(craft.vx, craft.vz)
  let tx = craft.x
  let ty = craft.y + 2.8
  let tz = craft.z
  let wantYaw = cam.yaw
  let wantPitch = cam.pitch
  let wantDist = cam.dist
  const cx = cam as CamX

  if (mode === 'chase') {
    const back = 20 + clamp(speed * 0.4, 0, 16)
    const height = 6.5 + clamp(speed * 0.09, 0, 5)
    // Always look AT the craft — never at empty sky ahead of a decelerating bird.
    const lookX = craft.x
    const lookY = craft.y + 1.6
    const lookZ = craft.z
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

  // Velocity lead: cut hard when decelerating, sinking, or mid convert / STOVL.
  // Residual forward v while the craft slows is exactly what walks the cam ahead of the bird.
  if (mode === 'chase' || mode === 'orbit') {
    const flightMode = modeFromCraft(craft)
    const midConvert =
      flightMode === 'CONV' ||
      flightMode === 'STOVL' ||
      (craft.kind === 'osprey' && craft.nacelleDeg > 8 && craft.nacelleDeg < 82) ||
      (craft.kind === 'f35' && craft.vectorPos > 0.12 && craft.vectorPos < 0.88)
    const decelerating = speed > 2 && craft.vx * Math.sin(craft.yaw) + craft.vz * Math.cos(craft.yaw) < -0.5
    const sinking = craft.vy < -1.5
    if (midConvert || decelerating || sinking) {
      // No velocity lead — stay locked to craft pose.
    } else if (mode === 'orbit') {
      const leadT = clamp(speed * 0.04, 0.02, 0.2)
      tx += craft.vx * leadT
      tz += craft.vz * leadT
      ty += craft.vy * leadT * 0.25
    } else {
      // Chase: tiny lead only when accelerating cleanly in HEL/APL/VL/CTOL.
      const leadT = clamp(speed * 0.03, 0.02, 0.12)
      tx += craft.vx * leadT
      tz += craft.vz * leadT
    }
  }

  // —— Craft-in-view metrics (not just cam-vs-target) ——
  const toCraftX = craft.x - cam.x
  const toCraftY = craft.y + 1.6 - cam.y
  const toCraftZ = craft.z - cam.z
  const craftDist = Math.hypot(toCraftX, toCraftY, toCraftZ)
  const lookHx = Math.sin(cam.yaw)
  const lookHz = Math.cos(cam.yaw)
  const horizToCraft = Math.hypot(toCraftX, toCraftZ) || 1e-6
  const forwardDot =
    (toCraftX * lookHx + toCraftZ * lookHz) / horizToCraft // cos of yaw error to craft
  const craftBehind = forwardDot < 0.15 // ~81° off or behind look
  const craftTooFar = craftDist > wantDist * 1.35
  const craftTooClose = craftDist < wantDist * 0.35 && mode === 'chase'

  const err = Math.hypot(tx - cam.x, ty - cam.y, tz - cam.z)
  const frameW = Math.max(wantDist, 14)
  const errFrames = err / frameW
  const targetMiss = errFrames >= 0.85 || err > frameW * 1.2
  const snap = targetMiss || craftBehind || craftTooFar || craftTooClose

  if (snap) {
    cam.x = tx
    cam.y = ty
    cam.z = tz
    cam.yaw = wantYaw
    cam.pitch = wantPitch
    cam.dist = wantDist
    return
  }

  let k = mode === 'pad' ? 7 : mode === 'chase' ? 18 : 9
  k *= 1 + clamp(errFrames * 1.2, 0, 4)
  const a = 1 - Math.exp(-k * dt)
  cam.x = lerp(cam.x, tx, a)
  cam.y = lerp(cam.y, ty, a)
  cam.z = lerp(cam.z, tz, a)

  // Chase / orbit / pad: always point at the craft (not residual look lead).
  const lookAtX = craft.x - cam.x
  const lookAtY = craft.y + 1.6 - cam.y
  const lookAtZ = craft.z - cam.z
  const lookHoriz = Math.hypot(lookAtX, lookAtZ) || 1
  const craftYaw = Math.atan2(lookAtX, lookAtZ)
  const craftPitch = Math.atan2(lookAtY, lookHoriz)
  const ka = mode === 'pad' ? 1 : 1 - Math.exp(-(mode === 'orbit' ? 8 : 16) * dt)
  cam.yaw += wrapAngle(craftYaw - cam.yaw) * ka
  cam.pitch = lerp(cam.pitch, craftPitch, ka)
  cam.dist = lerp(cam.dist, wantDist, ka)

  // Hard tether: clamp cam to stay within ~1.0–1.2× wantDist of craft every frame.
  if (mode === 'chase' || mode === 'orbit') {
    const dx = cam.x - craft.x
    const dy = cam.y - (craft.y + 2.8)
    const dz = cam.z - craft.z
    const d = Math.hypot(dx, dy, dz)
    const maxD = wantDist * CHASE_TETHER
    const minD = wantDist * 0.55
    if (d > maxD && d > 1e-3) {
      const s = maxD / d
      cam.x = craft.x + dx * s
      cam.y = craft.y + 2.8 + dy * s
      cam.z = craft.z + dz * s
    } else if (d < minD && d > 1e-3 && mode === 'chase') {
      const s = minD / d
      cam.x = craft.x + dx * s
      cam.y = craft.y + 2.8 + dy * s
      cam.z = craft.z + dz * s
    }
  }
}

export const CAM_ORDER: CamMode[] = ['chase', 'pad', 'orbit']

export function nextCam(mode: CamMode): CamMode {
  const i = CAM_ORDER.indexOf(mode)
  return CAM_ORDER[(i + 1) % CAM_ORDER.length]!
}
