import type { Hud } from '../game/types'

type Props = {
  hud: Hud
  message: string
  paused: boolean
}

/** Show FL chip when AGL ≈ ≥1000 ft (~305 m). */
const FL_SHOW_M = 305

export function HUD({ hud, message, paused }: Props) {
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
          <span className="v">{hud.alt.toFixed(0)}</span>
          <span className="u">m</span>
        </div>
        {showFl && (
          <div className="hud-chip hud-fl">
            <span className="k">FL</span>
            <span className="v">{hud.fl.toFixed(0).padStart(3, '0')}</span>
          </div>
        )}
        <div className="hud-chip">
          <span className="k">SPD</span>
          <span className="v">{hud.speed.toFixed(0)}</span>
          <span className="u">kt</span>
        </div>
        <div className="hud-chip">
          <span className="k">HDG</span>
          <span className="v">{hud.hdg.toFixed(0).padStart(3, '0')}</span>
          <span className="u">°</span>
        </div>
        {hud.bird === 'osprey' ? (
          <div className="hud-chip">
            <span className="k">NAC</span>
            <span className="v">{hud.nacelleDeg.toFixed(0)}</span>
            <span className="u">°</span>
          </div>
        ) : (
          <div className="hud-chip">
            <span className="k">AOA</span>
            <span className="v">{hud.aoaDeg.toFixed(0)}</span>
            <span className="u">°</span>
          </div>
        )}
        <div className={`hud-chip mode-chip ${modeClass}`}>
          <span className="v">{hud.mode}</span>
        </div>
      </div>
      {(message || paused) && <div className="hud-msg">{paused ? 'PAUSED' : message}</div>}
      <div className="hud-cam">
        {hud.bird === 'f35' ? 'F-35' : 'OSPREY'} · {hud.cam.toUpperCase()}
      </div>
    </div>
  )
}
