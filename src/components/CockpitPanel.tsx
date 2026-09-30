import { useEffect, useRef } from 'react'
import {
  F35_FLAP_DETENTS,
  F35_VEC_DETENTS,
  OSP_FLAP_DETENTS,
  OSP_NAC_DETENTS,
  flapLabel,
  hardSnap,
  paintCockpit,
  softSnap,
  type CockpitPage,
} from '../game/cockpit'
import type { InputState } from '../game/input'
import { trySetGearDown } from '../game/physics'
import type { Sim } from '../game/types'

type Props = {
  sim: Sim
  input: InputState
  page: CockpitPage
  onPage: (page: CockpitPage) => void
  syncKey: number
}

const PAGES: { id: CockpitPage; label: string }[] = [
  { id: 'flight', label: 'FLIGHT' },
  { id: 'engine', label: 'ENGINE' },
  { id: 'gear', label: 'GEAR' },
  { id: 'hud', label: 'HUD' },
]

export function CockpitPanel({ sim, input, page, onPage, syncKey }: Props) {
  const pfdRef = useRef<HTMLCanvasElement>(null)
  const engRef = useRef<HTMLCanvasElement>(null)
  const ndRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let raf = 0
    const draw = () => {
      const paint = (el: HTMLCanvasElement | null, which: 'pfd' | 'eng' | 'nd') => {
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.width < 8 || r.height < 8) return
        const dpr = Math.min(2, window.devicePixelRatio || 1)
        const w = Math.floor(r.width * dpr)
        const h = Math.floor(r.height * dpr)
        if (el.width !== w || el.height !== h) {
          el.width = w
          el.height = h
        }
        const ctx = el.getContext('2d')
        if (!ctx) return
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        paintCockpit(ctx, sim, r.width, r.height, which)
      }
      paint(pfdRef.current, 'pfd')
      paint(engRef.current, 'eng')
      paint(ndRef.current, 'nd')
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [sim, page])

  if (page === 'hud') return null

  const bird = sim.bird
  const c = sim.craft
  const power = input.touchTcl ?? sim.controls.tcl
  const mode = bird === 'osprey' ? (input.touchNacelle ?? sim.controls.nacelle) : (input.touchVector ?? sim.controls.vector)

  return (
    <div className={`cp cp-${bird} cp-page-${page}`}>
      <div className="cp-tabs">
        {PAGES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`cp-tab ${page === p.id ? 'active' : ''}`}
            onClick={() => onPage(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {page === 'flight' && (
        <div className="cp-row">
          <Lever
            title={bird === 'f35' ? 'THROTTLE' : 'TCL'}
            value={power}
            readout={`${Math.round(power * 100)}`}
            marks={bird === 'f35' ? thrMarks : tclMarks}
            onChange={(v) => {
              input.touchTcl = v
            }}
            syncKey={syncKey}
          />
          <Lever
            title={bird === 'f35' ? 'VECTOR' : 'NACELLE'}
            value={mode}
            readout={bird === 'f35' ? `${Math.round(mode * 100)}%` : `${Math.round(mode * 90)}°`}
            marks={bird === 'f35' ? vecMarks : nacMarks}
            soft={bird === 'f35' ? F35_VEC_DETENTS : OSP_NAC_DETENTS}
            onChange={(v) => {
              if (bird === 'osprey') input.touchNacelle = v
              else input.touchVector = v
            }}
            syncKey={syncKey}
          />
          <div className="cp-sub cp-pfd">
            <div className="cp-title">PFD</div>
            <canvas ref={pfdRef} className="cp-canvas" />
          </div>
          <div className="cp-sub cp-nd">
            <div className="cp-title">ND</div>
            <canvas ref={ndRef} className="cp-canvas" />
          </div>
          <div className="cp-sub cp-switches">
            <FlapLever sim={sim} />
            <GearHandle sim={sim} />
            <Toggle
              label="PARK"
              on={c.parkingBrake}
              onClick={() => {
                c.parkingBrake = !c.parkingBrake
              }}
            />
            <Toggle
              label="LIGHTS"
              on={c.lightsOn}
              onClick={() => {
                c.lightsOn = !c.lightsOn
              }}
            />
          </div>
        </div>
      )}
      {page === 'engine' && (
        <div className="cp-row">
          <Lever
            title={bird === 'f35' ? 'THROTTLE' : 'TCL'}
            value={power}
            readout={`${Math.round(power * 100)}`}
            marks={bird === 'f35' ? thrMarks : tclMarks}
            onChange={(v) => {
              input.touchTcl = v
            }}
            syncKey={syncKey}
          />
          <Lever
            title={bird === 'f35' ? 'VECTOR' : 'NACELLE'}
            value={mode}
            readout={bird === 'f35' ? `${Math.round(mode * 100)}%` : `${Math.round(mode * 90)}°`}
            marks={bird === 'f35' ? vecMarks : nacMarks}
            soft={bird === 'f35' ? F35_VEC_DETENTS : OSP_NAC_DETENTS}
            onChange={(v) => {
              if (bird === 'osprey') input.touchNacelle = v
              else input.touchVector = v
            }}
            syncKey={syncKey}
          />
          <div className="cp-sub cp-gauge">
            <div className="cp-title">{bird === 'f35' ? 'ENGINE' : 'ROTOR'}</div>
            <canvas ref={engRef} className="cp-canvas" />
          </div>
        </div>
      )}
      {page === 'gear' && (
        <div className="cp-row">
          <div className="cp-sub cp-gear">
            <div className="cp-title">
              GEAR <b className={c.gearDown ? 'g' : ''}>{c.gearDown ? '3 GREEN' : 'UP'}</b>
            </div>
            <GearHandle sim={sim} />
            {c.gearDown && (
              <div className="cp-gear-lights">
                <span className="lamp on" />
                <span className="lamp on" />
                <span className="lamp on" />
              </div>
            )}
          </div>
          <Rudder input={input} />
          <div className="cp-sub cp-pfd">
            <div className="cp-title">PFD</div>
            <canvas ref={pfdRef} className="cp-canvas" />
          </div>
          <div className="cp-sub cp-switches">
            <FlapLever sim={sim} />
            <Toggle
              label="PARK"
              on={c.parkingBrake}
              onClick={() => {
                c.parkingBrake = !c.parkingBrake
              }}
            />
            <Toggle
              label="LIGHTS"
              on={c.lightsOn}
              onClick={() => {
                c.lightsOn = !c.lightsOn
              }}
            />
            <Lever
              title={bird === 'f35' ? 'THROTTLE' : 'TCL'}
              value={power}
              readout={`${Math.round(power * 100)}`}
              marks={bird === 'f35' ? thrMarks : tclMarks}
              onChange={(v) => {
                input.touchTcl = v
              }}
              syncKey={syncKey}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const tclMarks = [
  { at: 1, label: '100' },
  { at: 0.75, label: '75' },
  { at: 0.5, label: '50' },
  { at: 0.25, label: '25' },
  { at: 0, label: '0' },
]
const thrMarks = [
  { at: 1, label: 'MAX' },
  { at: 0.75, label: '75' },
  { at: 0.5, label: '50' },
  { at: 0.25, label: '25' },
  { at: 0, label: 'IDLE' },
]
const nacMarks = [
  { at: 1, label: 'HEL 90' },
  { at: 75 / 90, label: '75' },
  { at: 0.5, label: 'CONV' },
  { at: 15 / 90, label: '15' },
  { at: 0, label: 'APL 0' },
]
const vecMarks = [
  { at: 1, label: 'VL' },
  { at: 0.75, label: '75' },
  { at: 0.35, label: 'STOVL' },
  { at: 0, label: 'CTOL' },
]

function Lever({
  title,
  value,
  readout,
  marks,
  soft,
  hard,
  onChange,
  syncKey,
}: {
  title: string
  value: number
  readout: string
  marks: { at: number; label: string }[]
  soft?: number[]
  hard?: number[]
  onChange: (v: number) => void
  syncKey: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef<number | null>(null)
  void syncKey

  const setFromY = (clientY: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let v = 1 - (clientY - r.top) / r.height
    v = Math.max(0, Math.min(1, v))
    if (hard) v = hardSnap(v, hard)
    else if (soft) v = softSnap(v, soft)
    onChange(v)
    const knob = el.querySelector('.cp-knob') as HTMLDivElement | null
    if (knob) knob.style.top = `${(1 - v) * 100}%`
  }

  return (
    <div className="cp-sub cp-lever-sub">
      <div className="cp-title">
        {title} <b>{readout}</b>
      </div>
      <div
        ref={ref}
        className="cp-lever"
        onPointerDown={(e) => {
          e.preventDefault()
          id.current = e.pointerId
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          setFromY(e.clientY)
        }}
        onPointerMove={(e) => {
          if (id.current !== e.pointerId) return
          setFromY(e.clientY)
        }}
        onPointerUp={() => {
          id.current = null
        }}
        onPointerCancel={() => {
          id.current = null
        }}
      >
        <div className="cp-slot" />
        {marks.map((m) => (
          <div key={m.label} className="cp-mark" style={{ top: `${(1 - m.at) * 100}%` }}>
            <span className="cp-mark-l">{m.label}</span>
          </div>
        ))}
        <div className={`cp-knob cp-knob-${title.toLowerCase()}`} style={{ top: `${(1 - value) * 100}%` }} />
      </div>
    </div>
  )
}

function FlapLever({ sim }: { sim: Sim }) {
  const detents = sim.bird === 'f35' ? F35_FLAP_DETENTS : OSP_FLAP_DETENTS
  const marks =
    sim.bird === 'f35'
      ? [
          { at: 1, label: 'FULL' },
          { at: 0.5, label: 'HALF' },
          { at: 0, label: 'UP' },
        ]
      : [
          { at: 1, label: 'FULL' },
          { at: 0.75, label: '75' },
          { at: 0.5, label: '50' },
          { at: 0.25, label: '25' },
          { at: 0, label: 'UP' },
        ]
  return (
    <Lever
      title="FLAPS"
      value={sim.controls.flaps}
      readout={flapLabel(sim.bird, sim.controls.flaps)}
      marks={marks}
      hard={detents}
      onChange={(v) => {
        sim.controls.flaps = v
      }}
      syncKey={0}
    />
  )
}

function GearHandle({ sim }: { sim: Sim }) {
  const down = sim.craft.gearDown
  return (
    <button
      type="button"
      className="cp-gear-btn"
      title="Gear lever — tap to move"
      onClick={() => {
        if (!trySetGearDown(sim.craft, !sim.craft.gearDown)) sim.message = 'Gear locked — get airborne to retract'
      }}
    >
      <span className={`gear-handle ${down ? 'dn' : 'up'}`}>
        <span className="gear-wheel" />
      </span>
      <span className="gear-txt">{down ? 'DOWN' : 'UP'}</span>
    </button>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`cp-toggle ${on ? 'cp-on' : ''}`} onClick={onClick}>
      <span className="cp-toggle-lab">{label}</span>
      <span className="cp-toggle-base">
        <span className="cp-toggle-bat" />
      </span>
      <span className="cp-toggle-state">{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

function Rudder({ input }: { input: InputState }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useRef<number | null>(null)
  const set = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (clientX - r.left) / r.width
    input.yawStick = Math.max(-1, Math.min(1, x * 2 - 1))
    const knob = el.querySelector('.cp-rud-knob') as HTMLDivElement | null
    if (knob) knob.style.left = `${Math.max(0, Math.min(1, x)) * 100}%`
  }
  const end = () => {
    id.current = null
    input.yawStick = 0
  }
  const x = (input.yawStick + 1) / 2
  return (
    <div className="cp-sub cp-rudder-sub">
      <div className="cp-title">
        RUDDER <b>YAW</b>
      </div>
      <div
        ref={ref}
        className="cp-rudder"
        onPointerDown={(e) => {
          e.preventDefault()
          id.current = e.pointerId
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
          set(e.clientX)
        }}
        onPointerMove={(e) => {
          if (id.current !== e.pointerId) return
          set(e.clientX)
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <div className="cp-rud-slot" />
        <div className="cp-rud-knob" style={{ left: `${x * 100}%` }} />
        <span className="cp-rud-lab l">L</span>
        <span className="cp-rud-lab c">CTR</span>
        <span className="cp-rud-lab r">R</span>
      </div>
    </div>
  )
}
