import type { Experience } from './types'

export type SensKey = 'low' | 'med' | 'high'
export type PitchMode = 'realistic' | 'casual'
export type TiltHeartbeat = 'off' | 'pending' | 'live' | 'no-signal'

export const SENS_SCALE: Record<SensKey, number> = {
  low: 0.55,
  med: 1,
  high: 1.45,
}

export const STICK_DEADZONE = 0.08

/** Max age (ms) for a deviceorientation event to count as live. */
export const GYRO_LIVE_MS = 1000

/** Sticky copy when Tilt is on but motion never sustains. */
export const TILT_NO_SIGNAL_HINT =
  "Phone isn't sending motion — Chrome + HTTPS + screen unlocked."

const PREFS_KEY = 'osprey-flight-prefs-v2'

export type FlightPrefs = {
  sens: SensKey
  /**
   * Casual (default): stick-up / W → nose UP (phone game-feel).
   * Realistic: heli stick-up → nose DOWN.
   */
  pitchMode: PitchMode
  /** Extra invert on top of pitchMode (phone toggle). */
  invertPitch: boolean
  invertRoll: boolean
  /** Phone tilt/gyro drives cyclic when true (hides on-screen cyclic stick). */
  tiltCyclic: boolean
  gyroZeroBeta: number
  gyroZeroGamma: number
  /** True only after sustained live (≥3 orientation events / 500ms) + calibrate. */
  gyroReady: boolean
  showHelp: boolean
  tipSeen: boolean
  experience: Experience
}

export function defaultPrefs(): FlightPrefs {
  return {
    sens: 'med',
    pitchMode: 'casual',
    invertPitch: false,
    invertRoll: false,
    tiltCyclic: false,
    gyroZeroBeta: 0,
    gyroZeroGamma: 0,
    gyroReady: false,
    showHelp: false,
    tipSeen: false,
    experience: 'intermediate',
  }
}

export function loadPrefs(): FlightPrefs {
  const base = defaultPrefs()
  if (typeof window === 'undefined') return base
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<FlightPrefs>
    return {
      ...base,
      sens: p.sens === 'low' || p.sens === 'high' ? p.sens : base.sens,
      pitchMode: p.pitchMode === 'realistic' ? 'realistic' : 'casual',
      invertPitch: !!p.invertPitch,
      invertRoll: !!p.invertRoll,
      tiltCyclic: !!p.tiltCyclic,
      gyroZeroBeta: typeof p.gyroZeroBeta === 'number' ? p.gyroZeroBeta : 0,
      gyroZeroGamma: typeof p.gyroZeroGamma === 'number' ? p.gyroZeroGamma : 0,
      gyroReady: !!p.gyroReady,
    }
  } catch {
    return base
  }
}

export function savePrefs(prefs: FlightPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        sens: prefs.sens,
        pitchMode: prefs.pitchMode,
        invertPitch: prefs.invertPitch,
        invertRoll: prefs.invertRoll,
        tiltCyclic: prefs.tiltCyclic,
        gyroZeroBeta: prefs.gyroZeroBeta,
        gyroZeroGamma: prefs.gyroZeroGamma,
        gyroReady: prefs.gyroReady,
      }),
    )
  } catch {
    /* quota / private mode */
  }
}

export function applyDeadzone(v: number, dz = STICK_DEADZONE): number {
  const a = Math.abs(v)
  if (a < dz) return 0
  const sign = v < 0 ? -1 : 1
  return sign * Math.min(1, (a - dz) / (1 - dz))
}
