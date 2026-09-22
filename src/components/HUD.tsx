import type { CSSProperties } from 'react'
import type { Hud } from '../game/types'

export type LevelReading = {
  pitchDeg: number
  bankDeg: number
  level: boolean
  source: 'tilt' | 'craft'
}

type Props = {
  hud: Hud
  message: string
  paused: boolean
  level: LevelReading
}

/** Show FL chip when AGL is about 1000 ft (305 m) or higher. */
const FL_SHOW_M = 305

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}


function fmtNum(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return '---'
  const n = Math.abs(v) > 1e6 ? 0 : v
  if (!Number.isFinite(n)) return '---'
  return n.toFixed(digits)
}

function LevelGauge({ reading }: { reading: LevelReading }) {
  const pitchPx = clamp(reading.pitchDeg, -20, 20) * 0.85
  const bank = clamp(reading.bankDeg, -45, 45)
  const bubbleX = clamp(reading.bankDeg * 0.62, -17, 17)
  const bubbleY = clamp(reading.pitchDeg * 0.62, -17, 17)
  const horizonStyle = {
    '--level-pitch': `${pitchPx}px`,
    '--level-bank': `${bank}deg`,
  } as CSSProperties
  const bubbleStyle = {
    '--bubble-x': `${bubbleX}px`,
    '--bubble-y': `${bubbleY}px`,
  } as CSSProperties

  return (
    <div
      className={`level-gauge ${reading.level ? 'level-gauge-ok' : ''}`}
      title={`${reading.source === 'tilt' ? 'Phone vs frozen Cal' : 'Aircraft attitude'} · pitch ${reading.pitchDeg.toFixed(1)}° · bank ${reading.bankDeg.toFixed(1)}°`}
    >
      <span className="level-label">LEVEL</span>
      <div className="level-dial">
        <div className="level-horizon" style={horizonStyle}>
          <span className="level-horizon-line" />
        </div>
        <span className="level-tick level-tick-l" />
        <span className="level-tick level-tick-r" />
        <span className="level-center" />
        <span className="level-bubble" style={bubbleStyle} />
      </div>
      <span className="level-source">{reading.source === 'tilt' ? 'CAL' : 'ATT'}</span>
    </div>
  )
}

export function HUD({ hud, message, paused, level }: Props) {
  const modeClass =
    hud.mode === 'HEL' || hud.mode === 'VL'
      ? 'mode-hel'
      : hud.mode === 'CONV' || hud.mode === 'STOVL'
        ? 'mode-conv'
        : 'mode-apl'

  const showFl = hud.alt >= FL_SHOW_M

  return (
    <div className="hud">
      <div className="hud-row">
        <div className="hud-chip hud-alt">
          <span className="k">ALT</span>
          <span className="v">{fmtNum(hud.alt)}</span>
          <span className="u">m</span>
        </div>
        {showFl && (
          <div className="hud-chip hud-fl">
            <span className="k">FL</span>
            <span className="v">{Number.isFinite(hud.fl) ? hud.fl.toFixed(0).padStart(3, '0') : '---'}</span>
          </div>
        )}
        <div className="hud-chip">
          <span className="k">SPD</span>
          <span className="v">{fmtNum(hud.speed)}</span>
          <span className="u">kt</span>
        </div>
        <div className="hud-chip">
          <span className="k">HDG</span>
          <span className="v">{Number.isFinite(hud.hdg) ? hud.hdg.toFixed(0).padStart(3, '0') : '---'}</span>
          <span className="u">°</span>
        </div>
        {hud.bird === 'osprey' ? (
          <div className="hud-chip">
            <span className="k">NAC</span>
            <span className="v">{fmtNum(hud.nacelleDeg)}</span>
            <span className="u">°</span>
          </div>
        ) : (
          <div className="hud-chip">
            <span className="k">AOA</span>
            <span className="v">{fmtNum(hud.aoaDeg)}</span>
            <span className="u">°</span>
          </div>
        )}
        <div className={`hud-chip mode-chip ${modeClass}`}>
          <span className="v">{hud.mode}</span>
        </div>
      </div>
      {(message || paused) && <div className="hud-msg">{paused ? 'PAUSED' : message}</div>}
      <div className="hud-instruments">
        <LevelGauge reading={level} />
        <div className="hud-cam">
          {hud.bird === 'f35' ? 'F-35' : 'OSPREY'} · {hud.cam.toUpperCase()}
        </div>
      </div>
    </div>
  )
}
