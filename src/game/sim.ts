import { F35_GEAR_H, F35_HOVER_THR, GEAR_H, HOVER_TCL, type QualityKey } from './config'
import { createCam, nextCam, updateCamera } from './camera'
import {
  createCraft,
  hardLanding,
  headingDeg,
  modeFromCraft,
  modeFromNacelle,
  modeFromVector,
  stepCraft,
} from './physics'
import type { BirdKind, Controls, Experience, Hud, Sim } from './types'
import { emptyControls } from './input'

export function createSim(
  quality: QualityKey = 'med',
  experience: Experience = 'intermediate',
  bird: BirdKind = 'osprey',
): Sim {
  return {
    phase: 'hangar',
    craft: createCraft(bird),
    cam: createCam(),
    camMode: 'chase',
    controls: emptyControls(bird),
    quality,
    experience,
    bird,
    time: 0,
    crashed: false,
    message: '',
    envelopeWarn: '',
    systemsPanel: 'none',
    paused: false,
    apHeadingHold: false,
    apAltitudeHold: false,
  }
}

export function startFlight(sim: Sim): void {
  sim.phase = 'flight'
  sim.craft = createCraft(sim.bird)
  sim.cam = createCam()
  sim.camMode = 'chase'
  sim.controls =
    sim.bird === 'f35'
      ? { ...emptyControls('f35'), tcl: 0.45, vector: 0.85 }
      : { ...emptyControls('osprey'), tcl: 0.42, nacelle: 1 }
  sim.crashed = false
  sim.message =
    sim.bird === 'f35'
      ? 'F-35 VL — raise THR, use VEC slider (VL↔STOVL↔CTOL)'
      : 'HEL — raise TCL to lift, then convert with nacelle slider'
  sim.envelopeWarn = ''
  sim.time = 0
  sim.paused = false
  sim.systemsPanel = 'none'
  sim.apHeadingHold = false
  sim.apAltitudeHold = false
}

export function resetToHangar(sim: Sim): void {
  sim.phase = 'hangar'
  sim.craft = createCraft(sim.bird)
  sim.crashed = false
  sim.message = ''
  sim.paused = false
  sim.systemsPanel = 'none'
}

export function cycleCamera(sim: Sim): void {
  sim.camMode = nextCam(sim.camMode)
}

export function setQuality(sim: Sim, q: QualityKey): void {
  sim.quality = q
}

export function stepSim(sim: Sim, controls: Controls, dt: number): void {
  if (sim.phase !== 'flight' || sim.crashed || sim.paused) return

  let ctrl = { ...controls }
  if (sim.apHeadingHold) {
    ctrl.yaw *= 0.2
    ctrl.cyclicRoll *= 0.35
  }
  if (sim.apAltitudeHold) {
    const target = sim.bird === 'f35' ? 35 : 40
    const err = target - sim.craft.y
    ctrl.tcl = Math.max(0.35, Math.min(0.9, ctrl.tcl + err * 0.004))
  }

  sim.controls = ctrl
  sim.time += dt

  const prevY = sim.craft.y
  const prevVy = sim.craft.vy
  const gearH = sim.bird === 'f35' ? F35_GEAR_H : GEAR_H
  sim.envelopeWarn = stepCraft(sim.craft, ctrl, dt, sim.experience)

  if (sim.experience === 'casual') {
    if (sim.envelopeWarn.startsWith('CONV') || sim.envelopeWarn.startsWith('STOVL — thrust')) {
      sim.envelopeWarn = ''
    }
  }

  if (hardLanding(sim.craft) || (sim.craft.y <= gearH + 0.1 && prevVy < -8)) {
    if (sim.experience === 'advanced' || prevVy < -12) {
      sim.crashed = true
      sim.message = 'Hard landing — Reset / Hangar'
      sim.craft.vx = 0
      sim.craft.vz = 0
      sim.craft.vy = 0
    } else {
      sim.message = 'Firm touch — ease power'
      sim.craft.vy *= 0.2
    }
  } else if (sim.craft.onGround && ctrl.tcl < 0.55) {
    if (sim.time > 2 && Math.hypot(sim.craft.vx, sim.craft.vz) < 0.5) {
      sim.message =
        sim.bird === 'f35'
          ? 'On pad — raise THR in VL, or CTOL roll with VEC down'
          : 'On pad — raise TCL (HEL) to take off'
    }
  } else if (sim.bird === 'osprey') {
    const mode = modeFromNacelle(sim.craft.nacelleDeg)
    if (
      !sim.craft.onGround &&
      mode === 'HEL' &&
      Math.abs(sim.craft.vy) < 0.55 &&
      Math.abs(ctrl.tcl - HOVER_TCL) < 0.08
    ) {
      sim.message = 'Hover band — fine-tune TCL'
    } else if (sim.craft.y > prevY && sim.craft.y > 4 && !sim.envelopeWarn) {
      sim.message = ''
    }
  } else {
    const mode = modeFromVector(sim.craft.vectorPos)
    if (
      !sim.craft.onGround &&
      mode === 'VL' &&
      Math.abs(sim.craft.vy) < 0.55 &&
      Math.abs(ctrl.tcl - F35_HOVER_THR) < 0.1
    ) {
      sim.message = 'VL hover — fine-tune THR'
    } else if (sim.craft.y > prevY && sim.craft.y > 4 && !sim.envelopeWarn) {
      sim.message = ''
    }
  }

  if (sim.envelopeWarn && sim.experience !== 'casual') {
    sim.message = sim.envelopeWarn
  }

  updateCamera(sim.cam, sim.craft, sim.camMode, dt)
}

export function hudFrom(sim: Sim): Hud {
  const c = sim.craft
  const gearH = c.kind === 'f35' ? F35_GEAR_H : GEAR_H
  const alt = Math.max(0, c.y - gearH)
  const altFt = alt * 3.28084
  return {
    alt,
    fl: Math.max(0, Math.round(altFt / 100)),
    speed: Math.hypot(c.vx, c.vz) * 1.94384,
    hdg: headingDeg(c.yaw),
    nacelleDeg: c.nacelleDeg,
    aoaDeg: (() => {
      const spd = Math.hypot(c.vx, c.vy, c.vz)
      if (spd < 8) return (c.pitch * 180) / Math.PI // low-speed: show pitch attitude, not noisy AoA
      return (c.aoa * 180) / Math.PI
    })(),
    mode: modeFromCraft(c),
    bird: c.kind,
    tcl: sim.controls.tcl,
    onGround: c.onGround,
    cam: sim.camMode,
    quality: sim.quality,
    envelopeWarn: sim.envelopeWarn,
  }
}
