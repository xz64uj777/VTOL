import { clamp, lerp, modeFromCraft, wrapAngle } from './physics'
import type { Cam, CamMode, Craft } from './types'

export function createCam(): Cam {
  return {
    x: 0,
    y: 10,
    z: -28,
    yaw: 0,
    pitch: -0.26,
    dist: 34,
    yawOff: 0,
    pitchOff: 0,
  }
}

type CamX = Cam & { orbitAng?: number }

/** Max chase tether as a multiple of wantDist — cam never drifts farther than this from craft. */
const CHASE_TETHER = 1.15

/** Reset touch offsets to default for current mode. */
export function resetCamOffsets(cam: Cam): void {
  cam.yawOff = 0
  cam.pitchOff = 0
}

/**
 * Chase → Wing → Tower → Pad → Orbit.
 * v7: touch yaw/pitch offsets; wing + tower modes; heavier chase damp / less micro-lead.
 * v6: craft-in-view snap + kill velocity lead on convert/decel + hard tether.
 */
export function updateCamera(cam: Cam, craft: Craft, mode: CamMode, dt: number): void {
  if (
    !Number.isFinite(craft.x) ||
    !Number.isFinite(craft.y) ||
    !Number.isFinite(craft.z) ||
    !Number.isFinite(craft.yaw)
  ) {
    return
  }
  if (!Number.isFinite(cam.yawOff)) cam.yawOff = 0
  if (!Number.isFinite(cam.pitchOff)) cam.pitchOff = 0

  const speed = Math.hypot(craft.vx, craft.vz)
  let tx = craft.x
  let ty = craft.y + 2.8
  let tz = craft.z
  let wantYaw = cam.yaw
  let wantPitch = cam.pitch
  let wantDist = cam.dist
  const cx = cam as CamX
  const yOff = cam.yawOff
  const pOff = clamp(cam.pitchOff, -0.55, 0.45)

  if (mode === 'chase') {
    const back = 20 + clamp(speed * 0.4, 0, 16)
    const height = 6.5 + clamp(speed * 0.09, 0, 5)
    const lookX = craft.x
    const lookY = craft.y + 1.6
    const lookZ = craft.z
    const yawBase = craft.yaw + yOff
    tx = craft.x - Math.sin(yawBase) * back
    tz = craft.z - Math.cos(yawBase) * back
    ty = craft.y + height + pOff * 14
    const dx = lookX - tx
    const dy = lookY - ty
    const dz = lookZ - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = back
  } else if (mode === 'wing') {
    // Side / wingtip chase — look across the craft from the right wing
    const side = 18 + clamp(speed * 0.12, 0, 8)
    const back = 6 + clamp(speed * 0.08, 0, 6)
    const yawBase = craft.yaw + Math.PI * 0.5 + yOff
    tx = craft.x - Math.sin(yawBase) * side - Math.sin(craft.yaw) * back
    tz = craft.z - Math.cos(yawBase) * side - Math.cos(craft.yaw) * back
    ty = craft.y + 4.5 + pOff * 10
    const dx = craft.x - tx
    const dy = craft.y + 1.2 - ty
    const dz = craft.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = Math.hypot(side, back)
  } else if (mode === 'tower') {
    // Elevated tower-like view near airport, looking at craft
    const towerX = -55
    const towerY = 38
    const towerZ = 70
    tx = towerX + Math.sin(yOff) * 8
    ty = towerY + pOff * 12
    tz = towerZ + Math.cos(yOff) * 8
    const dx = craft.x - tx
    const dy = craft.y + 1.8 - ty
    const dz = craft.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = Math.hypot(dx, dy, dz)
  } else if (mode === 'pad') {
    tx = -38 + Math.sin(yOff) * 6
    ty = 22 + pOff * 10
    tz = -38 + Math.cos(yOff) * 6
    const dx = craft.x - tx
    const dy = craft.y + 1.8 - ty
    const dz = craft.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = 52
  } else {
    // orbit — auto spin + touch yaw offset
    const orbitSpeed = 0.22
    const base = wrapAngle((cx.orbitAng ?? craft.yaw + 0.9) + orbitSpeed * dt)
    cx.orbitAng = base
    const ang = wrapAngle(base + yOff)
    wantDist = 28 + clamp(speed * 0.28, 0, 12)
    tx = craft.x - Math.sin(ang) * wantDist
    tz = craft.z - Math.cos(ang) * wantDist
    ty = craft.y + 11 + pOff * 12
    const dx = craft.x - tx
    const dy = craft.y + 1.4 - ty
    const dz = craft.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
  }

  // Velocity lead: cut hard when decelerating, sinking, or mid convert / STOVL.
  if (mode === 'chase' || mode === 'orbit' || mode === 'wing') {
    const flightMode = modeFromCraft(craft)
    const midConvert =
      flightMode === 'CONV' ||
      flightMode === 'STOVL' ||
      (craft.kind === 'osprey' && craft.nacelleDeg > 8 && craft.nacelleDeg < 82) ||
      (craft.kind === 'f35' && craft.vectorPos > 0.12 && craft.vectorPos < 0.88)
    const decelerating =
      speed > 2 && craft.vx * Math.sin(craft.yaw) + craft.vz * Math.cos(craft.yaw) < -0.5
    const sinking = craft.vy < -1.5
    if (midConvert || decelerating || sinking) {
      // No velocity lead
    } else if (mode === 'orbit') {
      const leadT = clamp(speed * 0.03, 0.015, 0.16)
      tx += craft.vx * leadT
      tz += craft.vz * leadT
      ty += craft.vy * leadT * 0.2
    } else if (mode === 'wing') {
      const leadT = clamp(speed * 0.02, 0.01, 0.08)
      tx += craft.vx * leadT
      tz += craft.vz * leadT
    } else {
      // Chase: tiny lead only when accelerating cleanly — v7: less micro-lead
      const leadT = clamp(speed * 0.018, 0.01, 0.07)
      tx += craft.vx * leadT
      tz += craft.vz * leadT
    }
  }

  const toCraftX = craft.x - cam.x
  const toCraftY = craft.y + 1.6 - cam.y
  const toCraftZ = craft.z - cam.z
  const craftDist = Math.hypot(toCraftX, toCraftY, toCraftZ)
  const lookHx = Math.sin(cam.yaw)
  const lookHz = Math.cos(cam.yaw)
  const horizToCraft = Math.hypot(toCraftX, toCraftZ) || 1e-6
  const forwardDot = (toCraftX * lookHx + toCraftZ * lookHz) / horizToCraft
  const craftBehind = forwardDot < 0.15
  const craftTooFar = craftDist > wantDist * 1.35
  const craftTooClose = craftDist < wantDist * 0.35 && (mode === 'chase' || mode === 'wing')

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

  // v7: heavier chase damp to soften residual jitter
  let k = mode === 'pad' || mode === 'tower' ? 6 : mode === 'chase' ? 12 : mode === 'wing' ? 11 : 8
  k *= 1 + clamp(errFrames * 1.0, 0, 3.5)
  const a = 1 - Math.exp(-k * dt)
  cam.x = lerp(cam.x, tx, a)
  cam.y = lerp(cam.y, ty, a)
  cam.z = lerp(cam.z, tz, a)

  const lookAtX = craft.x - cam.x
  const lookAtY = craft.y + 1.6 - cam.y
  const lookAtZ = craft.z - cam.z
  const lookHoriz = Math.hypot(lookAtX, lookAtZ) || 1
  const craftYaw = Math.atan2(lookAtX, lookAtZ)
  const craftPitch = Math.atan2(lookAtY, lookHoriz)
  const lookK =
    mode === 'pad' || mode === 'tower' ? 1 : mode === 'orbit' ? 7 : mode === 'wing' ? 12 : 11
  const ka = mode === 'pad' || mode === 'tower' ? 1 : 1 - Math.exp(-lookK * dt)
  cam.yaw += wrapAngle(craftYaw - cam.yaw) * ka
  cam.pitch = lerp(cam.pitch, craftPitch, ka)
  cam.dist = lerp(cam.dist, wantDist, ka)

  if (mode === 'chase' || mode === 'orbit' || mode === 'wing') {
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
    } else if (d < minD && d > 1e-3 && (mode === 'chase' || mode === 'wing')) {
      const s = minD / d
      cam.x = craft.x + dx * s
      cam.y = craft.y + 2.8 + dy * s
      cam.z = craft.z + dz * s
    }
  }
}

export const CAM_ORDER: CamMode[] = ['chase', 'wing', 'tower', 'pad', 'orbit']

export const CAM_LABEL: Record<CamMode, string> = {
  chase: 'CHASE',
  wing: 'WING',
  tower: 'TOWER',
  pad: 'PAD',
  orbit: 'ORBIT',
}

export function nextCam(mode: CamMode): CamMode {
  const i = CAM_ORDER.indexOf(mode)
  return CAM_ORDER[(i + 1) % CAM_ORDER.length]!
}
