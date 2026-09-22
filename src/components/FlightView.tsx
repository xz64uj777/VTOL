import { useCallback, useEffect, useRef, useState } from 'react'
import type { QualityKey } from '../game/config'
import { FlightAudio } from '../game/audio'
import {
  bindGyro,
  bindKeyboard,
  createInput,
  gyroIsLive,
  gyroIsSustained,
  requestGyroPermission,
  resetGyroTracking,
  sampleControls,
  type GyroBind,
} from '../game/input'
import {
  defaultPrefs,
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
import { HUD } from './HUD'
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
  const calFrozenRef = useRef(false)

  const [hud, setHud] = useState(() => hudFrom(simRef.current))
  const [message, setMessage] = useState('')
  const [paused, setPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState<FlightPrefs>(() => bootPrefs(experience))
  const [calStatus, setCalStatus] = useState<string | null>(null)
  const [tiltHb, setTiltHb] = useState<TiltHeartbeat>(prefs.tiltCyclic ? 'pending' : 'off')
  const [tiltSticky, setTiltSticky] = useState<string | null>(null)
  const [levelCue, setLevelCue] = useState<string | null>(null)
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
    const stored = loadPrefs()
    prefsRef.current = { ...stored, experience }
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
      const simNow = simRef.current
      simNow.paused = pausedRef.current
      const controls = sampleControls(
        inputRef.current,
        simNow.controls,
        dt,
        prefsRef.current,
        simNow.bird,
      )
      stepSim(simNow, controls, dt)
      audioRef.current.update(
        simNow.craft.rotorRpm,
        simNow.controls.tcl,
        simNow.bird === 'f35' ? simNow.craft.vectorPos : simNow.craft.nacelleDeg,
        simNow.bird,
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
          rendererRef.current.draw(ctx, simNow, w, h, dt)
        }
      }

      hudAcc += dt
      if (hudAcc > 0.1) {
        hudAcc = 0
        setHud(hudFrom(simNow))
        setMessage(simNow.message)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyC') cycleCamera(simRef.current)
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (e.code === 'Escape' && (menuOpenRef.current || showSettingsRef.current)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experience, bird, quality])

  useEffect(() => {
    if (!prefs.tiltCyclic) {
      setTiltHb('off')
      pendingCalRef.current = false
      fallbackTriedRef.current = false
      noSignalStickyRef.current = false
      setTiltSticky(null)
      setLevelCue(null)
      return
    }

    const tickHb = () => {
      const input = inputRef.current
      const now = performance.now()
      const sustained = gyroIsSustained(input, now)
      const prefsNow = prefsRef.current

      if (calFrozenRef.current || prefsNow.gyroReady) {
        const dBeta = input.gyroBeta - prefsNow.gyroZeroBeta
        const dGamma = input.gyroGamma - prefsNow.gyroZeroGamma
        const level = Math.abs(dBeta) < 3.5 && Math.abs(dGamma) < 3.5
        if (level) {
          setLevelCue('Level · hold')
        } else {
          const bits: string[] = []
          if (Math.abs(dBeta) >= 3.5) bits.push(dBeta > 0 ? 'nose↑' : 'nose↓')
          if (Math.abs(dGamma) >= 3.5) bits.push(dGamma > 0 ? 'R bank' : 'L bank')
          setLevelCue(bits.join(' · ') || 'tilt')
        }
      } else {
        setLevelCue(null)
      }

      if (sustained) {
        noSignalStickyRef.current = false
        setTiltSticky(null)
        setTiltHb('live')
        if (pendingCalRef.current) {
          pendingCalRef.current = false
          calFrozenRef.current = true
          patchPrefs({
            gyroReady: true,
            gyroZeroBeta: input.gyroBeta,
            gyroZeroGamma: input.gyroGamma,
          })
          setCalStatus('Calibrated')
          window.setTimeout(() => setCalStatus(null), 1400)
        } else if (calFrozenRef.current && !prefsNow.gyroReady) {
          patchPrefs({ gyroReady: true })
        }
        return
      }

      if (prefsNow.gyroReady) {
        patchPrefs({ gyroReady: false })
      }

      const waited = now - tiltOnAtRef.current
      const anyRecent = gyroIsLive(input, now, GYRO_LIVE_MS)
      if (
        calFrozenRef.current ||
        noSignalStickyRef.current ||
        (waited >= GYRO_LIVE_MS && !anyRecent)
      ) {
        noSignalStickyRef.current = true
        setTiltHb('no-signal')
        setTiltSticky(TILT_NO_SIGNAL_HINT)
        setCalStatus(null)
        if (!fallbackTriedRef.current) {
          fallbackTriedRef.current = true
          gyroRef.current?.tryAbsoluteFallback()
        }
      } else {
        setTiltHb('pending')
        if (!fallbackTriedRef.current && waited >= GYRO_LIVE_MS) {
          fallbackTriedRef.current = true
          gyroRef.current?.tryAbsoluteFallback()
        }
      }
    }

    tickHb()
    const id = window.setInterval(tickHb, 200)
    return () => window.clearInterval(id)
  }, [prefs.tiltCyclic, patchPrefs])

  const goHangar = () => {
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
      calFrozenRef.current = false
      patchPrefs({ tiltCyclic: false, gyroReady: false })
      setTiltHb('off')
      setCalStatus(null)
      setTiltSticky(null)
      setLevelCue(null)
      return
    }
    resetGyroTracking(inputRef.current)
    fallbackTriedRef.current = false
    pendingCalRef.current = true
    noSignalStickyRef.current = false
    calFrozenRef.current = false
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
      <HUD hud={hud} message={bannerMsg} paused={paused} levelCue={levelCue} />

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
              if (next) setPaused(true)
              return next
            })
          }}
        >
          Settings
        </button>
        <button
          type="button"
          className={`deck-btn ${prefs.tiltCyclic ? 'active' : ''}`}
          onClick={() => void toggleTilt()}
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
              onClick={() => void toggleTilt()}
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
            Recalibrate only when <strong>Tilt · live</strong> and the phone is wings-level (Level
            cue). Zero freezes after Cal — no mid-flight auto-recal. Closing Settings does not
            resume — tap Resume. Tilt ON hides the left CYC stick.
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
        onTilt={() => void toggleTilt()}
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
