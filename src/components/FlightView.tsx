import { useCallback, useEffect, useRef, useState } from 'react'
import type { QualityKey } from '../game/config'
import { FlightAudio } from '../game/audio'
import {
  bindGyro,
  bindKeyboard,
  createInput,
  gyroIsSustained,
  requestGyroPermission,
  resetGyroTracking,
  sampleControls,
  type GyroBind,
} from '../game/input'
import {
  defaultPrefs,
  GYRO_HOLDOVER_MS,
  GYRO_LIVE_MS,
  loadPrefs,
  savePrefs,
  TILT_NO_SIGNAL_HINT,
  type FlightPrefs,
  type PitchMode,
  type SensKey,
  type TiltHeartbeat,
} from '../game/prefs'
import { Renderer } from '../game/render'
import {
  createSim,
  cycleCamera,
  hudFrom,
  resetToHangar,
  startFlight,
  stepSim,
} from '../game/sim'
import type { BirdKind, Experience, SystemsPanel } from '../game/types'
import { HUD, type LevelReading } from './HUD'
import { SystemsMenu } from './SystemsMenu'
import { VirtualControls } from './VirtualControls'

type Props = {
  quality: QualityKey
  experience: Experience
  bird: BirdKind
  onHangar: () => void
}

function tiltLabel(hb: TiltHeartbeat, on: boolean): string {
  if (!on) return 'Tilt · OFF'
  if (hb === 'live') return 'Tilt · live'
  if (hb === 'no-signal') return 'Tilt · no signal'
  return 'Tilt · …'
}

function bootPrefs(experience: Experience): FlightPrefs {
  return { ...defaultPrefs(), ...loadPrefs(), experience }
}

export function FlightView({ quality, experience, bird, onHangar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef(createSim(quality, experience, bird))
  const inputRef = useRef(createInput())
  const prefsRef = useRef<FlightPrefs>(bootPrefs(experience))
  const rendererRef = useRef(new Renderer())
  const audioRef = useRef(new FlightAudio())
  const gyroRef = useRef<GyroBind | null>(null)
  const pendingCalRef = useRef(false)
  const fallbackTriedRef = useRef(false)
  const tiltOnAtRef = useRef(0)
  const noSignalStickyRef = useRef(false)
  const gyroEverLiveRef = useRef(false)
  const reconnectNeedsSlewRef = useRef(false)

  const [hud, setHud] = useState(() => hudFrom(simRef.current))
  const [message, setMessage] = useState('')
  const [paused, setPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState<FlightPrefs>(() => bootPrefs(experience))
  const [calStatus, setCalStatus] = useState<string | null>(null)
  const [tiltHb, setTiltHb] = useState<TiltHeartbeat>('off')
  const [tiltSticky, setTiltSticky] = useState<string | null>(null)
  const [levelReading, setLevelReading] = useState<LevelReading>({
    pitchDeg: 0,
    bankDeg: 0,
    level: true,
    source: 'craft',
  })
  /** Once Cal succeeds, zeros stay frozen until explicit Recalibrate. */
  const calFrozenRef = useRef(false)
  const pausedRef = useRef(false)
  const menuOpenRef = useRef(false)
  const showSettingsRef = useRef(false)
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  const patchPrefs = useCallback((partial: Partial<FlightPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...partial }
      prefsRef.current = next
      savePrefs(next)
      return next
    })
  }, [])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])
  useEffect(() => {
    menuOpenRef.current = menuOpen
  }, [menuOpen])
  useEffect(() => {
    showSettingsRef.current = showSettings
  }, [showSettings])
  useEffect(() => {
    // Settings and Systems stay mounted over flight, so silence a dedicated master bus immediately.
    audioRef.current.mute(paused || menuOpen || showSettings)
  }, [paused, menuOpen, showSettings])
  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  useEffect(() => {
    prefsRef.current.experience = experience
    simRef.current.experience = experience
    simRef.current.quality = quality
  }, [experience, quality])

  useEffect(() => {
    const sim = simRef.current
    sim.bird = bird
    sim.experience = experience
    sim.quality = quality
    startFlight(sim)
    inputRef.current.touchTcl = null
    inputRef.current.touchNacelle = null
    inputRef.current.touchVector = null
    const base = { ...defaultPrefs(), experience, tipSeen: false }
    // Keep tilt/sens across sortie restart if already set
    prefsRef.current = {
      ...base,
      sens: prefsRef.current.sens,
      pitchMode: prefsRef.current.pitchMode,
      invertPitch: prefsRef.current.invertPitch,
      invertRoll: prefsRef.current.invertRoll,
      tiltCyclic: prefsRef.current.tiltCyclic,
      gyroZeroBeta: prefsRef.current.gyroZeroBeta,
      gyroZeroGamma: prefsRef.current.gyroZeroGamma,
      gyroReady: prefsRef.current.gyroReady,
    }
    setPrefs(prefsRef.current)
    if (prefsRef.current.tiltCyclic && prefsRef.current.gyroReady) {
      calFrozenRef.current = true
    }

    const unbind = bindKeyboard(inputRef.current)
    const gyro = bindGyro(inputRef.current)
    gyroRef.current = gyro
    audioRef.current.start()


    let raf = 0
    let last = performance.now()
    let hudAcc = 0

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const sim = simRef.current
      sim.paused = pausedRef.current
      const controls = sampleControls(
        inputRef.current,
        sim.controls,
        sim.paused ? 0 : dt,
        prefsRef.current,
        sim.bird,
      )
      stepSim(sim, controls, dt)
      audioRef.current.update(
        sim.craft.rotorRpm,
        sim.controls.tcl,
        sim.bird === 'f35' ? sim.craft.vectorPos : sim.craft.nacelleDeg,
        sim.bird,
      )

      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const w = canvas.clientWidth
          const h = canvas.clientHeight
          if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
            canvas.width = Math.floor(w * dpr)
            canvas.height = Math.floor(h * dpr)
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          rendererRef.current.draw(ctx, sim, w, h, dt)
        }
      }

      hudAcc += dt
      if (hudAcc > 0.1) {
        hudAcc = 0
        setHud(hudFrom(sim))
        setMessage(sim.message)
        const p = prefsRef.current
        const inp = inputRef.current
        const gyroLevel = p.tiltCyclic && p.gyroReady && inp.gyroActive
        const pitchDeg = gyroLevel
          ? inp.gyroBeta - p.gyroZeroBeta
          : (sim.craft.pitch * 180) / Math.PI
        const bankDeg = gyroLevel
          ? inp.gyroGamma - p.gyroZeroGamma
          : (sim.craft.roll * 180) / Math.PI
        setLevelReading({
          pitchDeg,
          bankDeg,
          level: Math.abs(pitchDeg) < 3.5 && Math.abs(bankDeg) < 3.5,
          source: gyroLevel ? 'tilt' : 'craft',
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') cycleCamera(simRef.current)
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (e.code === 'Escape' && (menuOpenRef.current || showSettingsRef.current)) {
          // Close sheets only — stay paused until explicit Resume
          setMenuOpen(false)
          setShowSettings(false)
          simRef.current.systemsPanel = 'none'
          return
        }
        setPaused((p) => !p)
      }
      if (e.code === 'KeyH') {
        setMenuOpen((m) => {
          const next = !m
          if (next) setPaused(true)
          return next
        })
      }
      if (e.code === 'Comma' && e.shiftKey) {
        setShowSettings((s) => {
          const next = !s
          if (next) setPaused(true)
          return next
        })
      }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      unbind()
      gyro.stop()
      gyroRef.current = null
      window.removeEventListener('keydown', onKey)
      audioRef.current.stop()
    }
    // Restart only when bird/experience/quality change (new sortie)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience, bird, quality])

  // Sticky tilt heartbeat: keep the last good sample through short Android event gaps.
  useEffect(() => {
    if (!prefs.tiltCyclic) {
      setTiltHb('off')
      pendingCalRef.current = false
      fallbackTriedRef.current = false
      noSignalStickyRef.current = false
      gyroEverLiveRef.current = false
      reconnectNeedsSlewRef.current = false
      setTiltSticky(null)
      return
    }

    const tick = () => {
      const input = inputRef.current
      const now = performance.now()
      const sustained = gyroIsSustained(input, now)
      const prefsNow = prefsRef.current
      const age = input.gyroLastMs > 0 ? now - input.gyroLastMs : Number.POSITIVE_INFINITY
      const waited = now - tiltOnAtRef.current

      if (sustained) {
        gyroEverLiveRef.current = true
        noSignalStickyRef.current = false
        setTiltSticky(null)
        setTiltHb('live')
        if (pendingCalRef.current) {
          // Explicit Cal / first arm only: write the zero once, then freeze it.
          pendingCalRef.current = false
          calFrozenRef.current = true
          reconnectNeedsSlewRef.current = false
          input.gyroBlend = 1
          patchPrefs({
            gyroReady: true,
            gyroZeroBeta: input.gyroBeta,
            gyroZeroGamma: input.gyroGamma,
          })
          setCalStatus('Calibrated')
          window.setTimeout(() => setCalStatus(null), 1400)
        } else if (calFrozenRef.current && !prefsNow.gyroReady) {
          // Real timeout recovered: retain frozen zeros and ease current pose in over 320 ms.
          input.gyroBlend = reconnectNeedsSlewRef.current ? 0 : 1
          reconnectNeedsSlewRef.current = false
          patchPrefs({ gyroReady: true })
        }
        return
      }

      const lockedBefore = gyroEverLiveRef.current || calFrozenRef.current
      const inHoldover = lockedBefore && !reconnectNeedsSlewRef.current && age < GYRO_HOLDOVER_MS
      if (inHoldover) {
        // Stay live: keep applying last good β/γ and keep gyroReady through holdover.
        // Do NOT clear gyroReady on brief gaps (convert load often throttles orientation).
        setTiltHb('live')
        setTiltSticky(null)
        if (calFrozenRef.current && !prefsNow.gyroReady) {
          patchPrefs({ gyroReady: true })
        }
        // Re-arm absolute+relative listeners if silence >1s (phone may have dropped stream).
        if (age >= GYRO_LIVE_MS) {
          gyroRef.current?.tryAbsoluteFallback()
        }
        return
      }

      // Only a true ~5 s silence can remove authority after calibration.
      const trueSilence = lockedBefore
        ? age >= GYRO_HOLDOVER_MS
        : waited >= GYRO_HOLDOVER_MS && age >= GYRO_HOLDOVER_MS
      if (trueSilence || reconnectNeedsSlewRef.current) {
        if (prefsNow.gyroReady) {
          reconnectNeedsSlewRef.current = true
          patchPrefs({ gyroReady: false })
        }
        noSignalStickyRef.current = true
        setTiltHb('no-signal')
        setTiltSticky(TILT_NO_SIGNAL_HINT)
        setCalStatus(null)
        // Keep trying to re-arm so convert-load recovery can resume without toggling Tilt.
        gyroRef.current?.tryAbsoluteFallback()
      } else {
        setTiltHb('pending')
      }

      // Initial arm path: try re-bind once after first live wait.
      if (!fallbackTriedRef.current && waited >= GYRO_LIVE_MS) {
        fallbackTriedRef.current = true
        gyroRef.current?.tryAbsoluteFallback()
      }
    }

    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [prefs.tiltCyclic, patchPrefs])

  const goHangar = () => {
    audioRef.current.mute(true)
    resetToHangar(simRef.current)
    onHangar()
  }

  const onPanel = (p: SystemsPanel) => {
    simRef.current.systemsPanel = p
    bump()
  }

  const cycleSens = () => {
    const order: SensKey[] = ['low', 'med', 'high']
    const i = order.indexOf(prefs.sens)
    patchPrefs({ sens: order[(i + 1) % order.length]! })
  }

  const togglePitchMode = () => {
    const next: PitchMode = prefs.pitchMode === 'realistic' ? 'casual' : 'realistic'
    patchPrefs({ pitchMode: next })
  }

  const toggleTilt = async () => {
    if (prefs.tiltCyclic) {
      pendingCalRef.current = false
      fallbackTriedRef.current = false
      noSignalStickyRef.current = false
      gyroEverLiveRef.current = false
      reconnectNeedsSlewRef.current = false
      calFrozenRef.current = false
      patchPrefs({ tiltCyclic: false, gyroReady: false })
      setTiltHb('off')
      setCalStatus(null)
      setTiltSticky(null)
      return
    }
    resetGyroTracking(inputRef.current)
    fallbackTriedRef.current = false
    pendingCalRef.current = true
    noSignalStickyRef.current = false
    gyroEverLiveRef.current = false
    reconnectNeedsSlewRef.current = false
    tiltOnAtRef.current = performance.now()
    patchPrefs({ tiltCyclic: true, gyroReady: false })
    setTiltHb('pending')
    setTiltSticky(null)
    setCalStatus('Hold still…')
    const perm = await requestGyroPermission()
    if (perm === 'denied' || perm === 'unsupported') {
      noSignalStickyRef.current = true
      setTiltHb('no-signal')
      setTiltSticky(TILT_NO_SIGNAL_HINT)
      setCalStatus(perm === 'denied' ? 'Tilt permission denied' : 'Tilt unsupported here')
    }
  }

  const recalibrate = () => {
    if (!prefs.tiltCyclic) return
    const input = inputRef.current
    if (!gyroIsSustained(input)) {
      noSignalStickyRef.current = true
      setTiltHb('no-signal')
      setTiltSticky(TILT_NO_SIGNAL_HINT)
      return
    }
    pendingCalRef.current = true
    setCalStatus('Hold still…')
    window.setTimeout(() => {
      if (!pendingCalRef.current) return
      if (!gyroIsSustained(inputRef.current)) {
        pendingCalRef.current = false
        noSignalStickyRef.current = true
        setTiltHb('no-signal')
        setTiltSticky(TILT_NO_SIGNAL_HINT)
        return
      }
      const inp = inputRef.current
      pendingCalRef.current = false
      calFrozenRef.current = true
      inp.gyroBlend = 1
      reconnectNeedsSlewRef.current = false
      patchPrefs({
        gyroReady: true,
        gyroZeroBeta: inp.gyroBeta,
        gyroZeroGamma: inp.gyroGamma,
      })
      setCalStatus('Calibrated')
      window.setTimeout(() => setCalStatus(null), 1400)
    }, 400)
  }

  const initialMode = bird === 'f35' ? 0.85 : 1
  const bannerMsg = calStatus || tiltSticky || message

  return (
    <div className="flight">
      <canvas ref={canvasRef} className="flight-canvas" />
      <HUD hud={hud} message={bannerMsg} paused={paused} level={levelReading} />

      <div className="flight-top">
        <button
          type="button"
          className="deck-btn"
          onClick={() => {
            setMenuOpen(true)
            setPaused(true)
          }}
        >
          Menu
        </button>
        <button
          type="button"
          className={`deck-btn ${showSettings ? 'active' : ''}`}
          onClick={() => {
            setShowSettings((s) => {
              const next = !s
              if (next) setPaused(true) // opening pauses; closing does not resume
              return next
            })
          }}
        >
          Settings
        </button>
        <button
          type="button"
          className={`deck-btn ${prefs.tiltCyclic ? 'active' : ''}`}
          onClick={toggleTilt}
          title="Phone tilt → cyclic"
        >
          {tiltLabel(tiltHb, prefs.tiltCyclic)}
        </button>
        {prefs.tiltCyclic && (
          <button
            type="button"
            className="deck-btn"
            disabled={tiltHb !== 'live'}
            onClick={recalibrate}
          >
            Cal
          </button>
        )}
        <button type="button" className="deck-btn" onClick={() => cycleCamera(simRef.current)}>
          Cam
        </button>
        <button type="button" className="deck-btn" onClick={() => setPaused((p) => !p)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="deck-btn" onClick={goHangar}>
          Hangar
        </button>
      </div>

      {showSettings && (
        <div className="settings-sheet" onClick={(e) => e.stopPropagation()}>
          <h3>Settings</h3>
          <div className="settings-row">
            <span>Sensitivity</span>
            <button type="button" onClick={cycleSens}>
              Sens · {prefs.sens}
            </button>
          </div>
          <div className="settings-row">
            <span>Pitch</span>
            <button type="button" onClick={togglePitchMode}>
              {prefs.pitchMode === 'realistic' ? 'Realistic' : 'Casual'}
            </button>
          </div>
          <p className="settings-hint">
            Casual (default): stick-up / W → nose UP. Realistic: heli nose-down.
          </p>
          <div className="settings-row">
            <span>Invert pitch</span>
            <button
              type="button"
              className={prefs.invertPitch ? 'active' : ''}
              onClick={() => patchPrefs({ invertPitch: !prefs.invertPitch })}
            >
              {prefs.invertPitch ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-row">
            <span>Invert roll</span>
            <button
              type="button"
              className={prefs.invertRoll ? 'active' : ''}
              onClick={() => patchPrefs({ invertRoll: !prefs.invertRoll })}
            >
              {prefs.invertRoll ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-row">
            <span>Tilt cyclic</span>
            <button
              type="button"
              className={prefs.tiltCyclic ? 'active' : ''}
              onClick={toggleTilt}
            >
              {tiltLabel(tiltHb, prefs.tiltCyclic)}
            </button>
          </div>
          {prefs.tiltCyclic && (
            <div className="settings-row">
              <span>Gyro zero</span>
              <button type="button" disabled={tiltHb !== 'live'} onClick={recalibrate}>
                Recalibrate
              </button>
            </div>
          )}
          <p className="settings-hint">
            Recalibrate only when <strong>Tilt · live</strong> and phone is wings-level (see Level cue).
            Zero freezes after Cal — no mid-flight auto-recal. Closing Settings does not resume —
            tap Resume. Tilt ON hides left CYC stick. Laptops have no gyro — use a phone for Tilt.
          </p>
          {tiltSticky && <p className="settings-hint tilt-sticky-hint">{tiltSticky}</p>}
          <button type="button" className="settings-close" onClick={() => setShowSettings(false)}>
            Close
          </button>
        </div>
      )}

      {simRef.current.crashed && (
        <div className="crash-banner">
          <p>{simRef.current.message || 'Hard landing'}</p>
          <button
            type="button"
            onClick={() => {
              startFlight(simRef.current)
              bump()
            }}
          >
            Reset
          </button>
          <button type="button" onClick={goHangar}>
            Hangar
          </button>
        </div>
      )}

      <VirtualControls
        input={inputRef.current}
        bird={bird}
        tiltCyclic={prefs.tiltCyclic}
        initialTcl={bird === 'f35' ? 0.45 : 0.42}
        initialMode={initialMode}
      />

      <SystemsMenu
        sim={simRef.current}
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false)
          simRef.current.systemsPanel = 'none'
        }}
        onPanel={onPanel}
        bump={bump}
        prefs={prefs}
        tiltHb={tiltHb}
        onTilt={toggleTilt}
        onRecalibrate={recalibrate}
        onSens={cycleSens}
        onPitchMode={togglePitchMode}
        onInvertPitch={() => patchPrefs({ invertPitch: !prefs.invertPitch })}
        onInvertRoll={() => patchPrefs({ invertRoll: !prefs.invertRoll })}
      />
      <span className="sr-only">{tick}</span>
    </div>
  )
}
