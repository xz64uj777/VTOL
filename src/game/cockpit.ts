import { PAD_X, PAD_Z } from './config'
import type { Sim } from './types'

export type CockpitPage = 'flight' | 'engine' | 'gear' | 'hud'

export const COCKPIT_PAGES: CockpitPage[] = ['flight', 'engine', 'gear', 'hud']

export function cockpitKey(bird: string): string {
  return `osprey-flight-cockpit-v15-${bird}`
}

export function loadCockpitPage(bird: string): CockpitPage {
  try {
    const raw = localStorage.getItem(cockpitKey(bird))
    if (raw === 'flight' || raw === 'engine' || raw === 'gear' || raw === 'hud') return raw
    const old = localStorage.getItem(`osprey-flight-panel-v13-${bird}`)
    if (old === 'min') return 'hud'
    if (old === 'pfd' || old === 'nav') return 'flight'
    if (old === 'eng') return 'engine'
  } catch {
    /* private mode */
  }
  return 'flight'
}

export function saveCockpitPage(bird: string, page: CockpitPage) {
  try {
    localStorage.setItem(cockpitKey(bird), page)
  } catch {
    /* ignore */
  }
}

export function nextCockpitPage(page: CockpitPage): CockpitPage {
  const i = COCKPIT_PAGES.indexOf(page)
  return COCKPIT_PAGES[(i + 1) % COCKPIT_PAGES.length]!
}

export function softSnap(v: number, detents: number[], pull = 0.04): number {
  let best = v
  let bestD = pull
  for (const t of detents) {
    const d = Math.abs(v - t)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

export function hardSnap(v: number, detents: number[]): number {
  let best = detents[0] ?? 0
  let bestD = 99
  for (const t of detents) {
    const d = Math.abs(v - t)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

export const OSP_NAC_DETENTS = [0, 15 / 90, 75 / 90, 1]
export const F35_VEC_DETENTS = [0, 0.35, 0.75, 1]
export const OSP_FLAP_DETENTS = [0, 0.25, 0.5, 0.75, 1]
export const F35_FLAP_DETENTS = [0, 0.5, 1]

export function flapLabel(bird: string, v: number): string {
  if (bird === 'f35') {
    if (v < 0.25) return 'UP'
    if (v < 0.75) return 'HALF'
    return 'FULL'
  }
  if (v < 0.125) return 'UP'
  if (v < 0.375) return '25'
  if (v < 0.625) return '50'
  if (v < 0.875) return '75'
  return 'FULL'
}

function wrapDeg(d: number): number {
  let x = d % 360
  if (x < 0) x += 360
  return x
}

/** Live instruments. Reads the sim directly so React does not re-render the gauges. */
export function paintCockpit(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, which: 'pfd' | 'eng' | 'nd') {
  const c = sim.craft
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#070b10'
  ctx.fillRect(0, 0, w, h)
  if (which === 'eng') paintEng(ctx, sim, w, h)
  else if (which === 'nd') paintNd(ctx, sim, w, h)
  else paintPfd(ctx, c.pitch, c.roll, c.yaw, c.vy, Math.max(0, c.y - (c.kind === 'f35' ? 1.8 : 2.2)), Math.hypot(c.vx, c.vy, c.vz), w, h)
}

function paintPfd(
  ctx: CanvasRenderingContext2D,
  pitch: number,
  roll: number,
  yaw: number,
  vy: number,
  agl: number,
  tas: number,
  w: number,
  h: number,
) {
  const pitchUp = (-pitch * 180) / Math.PI
  const bank = (roll * 180) / Math.PI
  const cx = w * 0.46
  const cy = h * 0.52
  const px = Math.min(w, h) * 0.012

  ctx.save()
  ctx.beginPath()
  ctx.rect(4, 4, w - 8, h - 8)
  ctx.clip()
  ctx.translate(cx, cy)
  ctx.rotate(-roll)
  const hy = pitchUp * px
  ctx.fillStyle = '#1a4a86'
  ctx.fillRect(-w, -h * 2 + hy, w * 3, h * 2)
  ctx.fillStyle = '#6a4a28'
  ctx.fillRect(-w, hy, w * 3, h * 2)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-w, hy)
  ctx.lineTo(w * 2, hy)
  ctx.stroke()
  ctx.strokeStyle = '#d8e8ff'
  ctx.lineWidth = 1
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'right'
  for (let deg = -60; deg <= 60; deg += 10) {
    if (deg === 0) continue
    const y = hy - deg * px
    const wide = deg % 20 === 0
    ctx.beginPath()
    ctx.moveTo(wide ? -28 : -14, y)
    ctx.lineTo(wide ? 28 : 14, y)
    ctx.stroke()
    if (wide) ctx.fillText(String(Math.abs(deg)), -32, y + 4)
  }
  ctx.restore()

  ctx.strokeStyle = '#f0c040'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 36, cy)
  ctx.lineTo(cx - 12, cy)
  ctx.lineTo(cx - 6, cy + 6)
  ctx.moveTo(cx + 36, cy)
  ctx.lineTo(cx + 12, cy)
  ctx.lineTo(cx + 6, cy + 6)
  ctx.stroke()

  const kts = tas * 1.94384
  const altFt = agl * 3.28084
  const vs = vy * 196.85
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#7fe3ff'
  ctx.fillText(`${Math.round(kts)} kt`, 8, 16)
  ctx.textAlign = 'right'
  ctx.fillText(`${Math.round(altFt)} ft`, w - 8, 16)
  ctx.fillStyle = vs >= 0 ? '#5dff7a' : '#ff6b6b'
  ctx.fillText(`${vs >= 0 ? '+' : ''}${Math.round(vs)}`, w - 8, 32)
  const nose = pitchUp >= 0 ? `▲ ${Math.abs(pitchUp).toFixed(0)}°` : `▼ ${Math.abs(pitchUp).toFixed(0)}°`
  const bankTxt = Math.abs(bank) < 1 ? '— 0°' : bank > 0 ? `R ${Math.abs(bank).toFixed(0)}°` : `L ${Math.abs(bank).toFixed(0)}°`
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText(nose, 8, h - 8)
  ctx.textAlign = 'right'
  ctx.fillText(bankTxt, w - 8, h - 8)
  void yaw
}

function paintNd(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const c = sim.craft
  const dx = PAD_X - c.x
  const dz = PAD_Z - c.z
  const dist = Math.hypot(dx, dz)
  const brg = wrapDeg((Math.atan2(dx, dz) * 180) / Math.PI)
  const rel = ((brg - (c.yaw * 180) / Math.PI) * Math.PI) / 180
  const cx = w * 0.5
  const cy = h * 0.62
  const r = Math.min(w, h) * 0.38
  ctx.strokeStyle = '#7fe3ff'
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, 0)
  ctx.stroke()
  ctx.fillStyle = '#ff4ad8'
  const px = cx + Math.sin(rel) * r * 0.72
  const py = cy - Math.cos(rel) * r * 0.72
  ctx.beginPath()
  ctx.arc(px, py, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`H ${Math.round(wrapDeg((c.yaw * 180) / Math.PI)).toString().padStart(3, '0')}`, cx, 16)
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#dfe6ee'
  const gs = Math.hypot(c.vx, c.vz) * 1.94384
  const ra = Math.max(0, c.y - (c.kind === 'f35' ? 1.8 : 2.2)) * 3.28084
  ctx.textAlign = 'left'
  ctx.fillText(`GS ${Math.round(gs)}`, 6, h - 18)
  ctx.fillText(`RA ${Math.round(ra)}`, 6, h - 6)
  ctx.textAlign = 'right'
  ctx.fillText(`PAD ${Math.round(brg).toString().padStart(3, '0')}°`, w - 6, h - 18)
  ctx.fillText(`${dist < 1000 ? dist.toFixed(0) + ' m' : (dist / 1000).toFixed(1) + ' km'}`, w - 6, h - 6)
}

function tape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, value: number, unit: string) {
  const v = Math.max(0, Math.min(1, value))
  ctx.fillStyle = '#10161e'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = '#3c4a5c'
  ctx.strokeRect(x, y, w, h)
  ctx.fillStyle = '#3ecf8e'
  ctx.fillRect(x + 2, y + h - 2 - (h - 4) * v, w - 4, (h - 4) * v)
  ctx.fillStyle = '#dfe6ee'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, x + w / 2, y - 4)
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText(`${unit}`, x + w / 2, y + h + 12)
}

function paintEng(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const c = sim.craft
  const n = c.kind === 'osprey' ? 4 : 4
  const gap = 8
  const tw = Math.min(54, (w - gap * (n + 1)) / n)
  const th = h - 36
  const y = 18
  if (c.kind === 'osprey') {
    tape(ctx, gap, y, tw, th, 'RPM', c.rotorRpm, `${Math.round(c.rotorRpm * 100)}%`)
    tape(ctx, gap + (tw + gap), y, tw, th, 'PWR', sim.controls.tcl, `${Math.round(sim.controls.tcl * 100)}%`)
    tape(ctx, gap + (tw + gap) * 2, y, tw, th, 'NAC', c.nacelleDeg / 90, `${Math.round(c.nacelleDeg)}°`)
    tape(ctx, gap + (tw + gap) * 3, y, tw, th, 'FUEL', c.fuel, `${Math.round(c.fuel * 100)}%`)
  } else {
    tape(ctx, gap, y, tw, th, 'THR', sim.controls.tcl, `${Math.round(sim.controls.tcl * 100)}%`)
    tape(ctx, gap + (tw + gap), y, tw, th, 'SPOOL', c.rotorRpm, `${Math.round(c.rotorRpm * 100)}%`)
    tape(ctx, gap + (tw + gap) * 2, y, tw, th, 'VEC', c.vectorPos, `${Math.round(c.vectorPos * 100)}%`)
    tape(ctx, gap + (tw + gap) * 3, y, tw, th, 'FUEL', c.fuel, `${Math.round(c.fuel * 100)}%`)
  }
}
