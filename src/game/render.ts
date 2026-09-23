import {
  GEAR_H,
  PAD_R,
  PAD_X,
  PAD_Z,
  QUALITY,
  RWY_HALF_W,
  RWY_X,
  RWY_Z0,
  RWY_Z1,
} from './config'
import { clamp } from './physics'
import type { Cam, Craft, Sim } from './types'

type Pt = { x: number; y: number; z: number }
type Vec2 = { x: number; y: number; d: number }

function project(p: Pt, cam: Cam, w: number, h: number): Vec2 | null {
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)

  const dx = p.x - cam.x
  const dy = p.y - cam.y
  const dz = p.z - cam.z

  const rx = dx * cy - dz * sy
  const rz = dx * sy + dz * cy
  const ry = dy

  const fx = rx
  const fy = ry * cp - rz * sp
  const fz = ry * sp + rz * cp

  if (fz < 0.6) return null
  const fov = 1.12
  const sx = w / 2 + (fx / fz) * (h * 0.5 * fov)
  const screenY = h / 2 - (fy / fz) * (h * 0.5 * fov)
  return { x: sx, y: screenY, d: fz }
}

/** Near-plane clamp for long ground strips — keeps runway visible when one end is behind cam. */
function projectNear(p: Pt, cam: Cam, w: number, h: number): Vec2 | null {
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)

  const dx = p.x - cam.x
  const dy = p.y - cam.y
  const dz = p.z - cam.z

  const rx = dx * cy - dz * sy
  const rz = dx * sy + dz * cy
  const ry = dy

  const fx = rx
  const fy = ry * cp - rz * sp
  let fz = ry * sp + rz * cp

  // Far behind camera — skip; otherwise clamp to near plane so strip persists
  if (fz < -40) return null
  if (fz < 0.85) fz = 0.85
  const fov = 1.12
  const sx = w / 2 + (fx / fz) * (h * 0.5 * fov)
  const screenY = h / 2 - (fy / fz) * (h * 0.5 * fov)
  return { x: sx, y: screenY, d: fz }
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

export class Renderer {
  private rotorPhase = 0
  private dust: { x: number; z: number; life: number; vx: number; vz: number }[] = []

  draw(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, dt: number) {
    const q = QUALITY[sim.quality]
    this.rotorPhase += dt * (7 + sim.craft.rotorRpm * 38)
    this.sky(ctx, w, h, sim.craft.y)
    this.ground(ctx, sim, w, h, q.groundDetail)
    this.distantTerrain(ctx, sim.cam, w, h)
    this.fields(ctx, sim.cam, w, h)
    // Airport before foggy props so strip stays the landmark
    this.airport(ctx, sim.cam, w, h)
    this.pad(ctx, sim.cam, w, h)
    this.buildings(ctx, sim, w, h, q.buildings)
    this.trees(ctx, sim, w, h, q.trees)
    if (q.particles > 0) this.particles(ctx, sim, w, h, dt, q.particles)
    if (sim.craft.kind === 'f35') this.f35(ctx, sim.craft, sim.cam, w, h, q.shadows)
    else this.osprey(ctx, sim.craft, sim.cam, w, h, q.shadows)
    this.vignette(ctx, w, h)
  }

  private sky(ctx: CanvasRenderingContext2D, w: number, h: number, alt: number) {
    const t = clamp(alt / 140, 0, 1)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, mix('#5eb8f0', '#1a3558', t * 0.5))
    g.addColorStop(0.42, mix('#9ecfe8', '#3a5a78', t * 0.3))
    g.addColorStop(1, mix('#c4b090', '#5a5848', t * 0.2))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  private ground(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, detail: number) {
    const cam = sim.cam
    const horizon = project(
      { x: cam.x + Math.sin(cam.yaw) * 800, y: 0, z: cam.z + Math.cos(cam.yaw) * 800 },
      cam,
      w,
      h,
    )
    const hy = horizon ? clamp(horizon.y, h * 0.25, h * 0.75) : h * 0.55
    const g = ctx.createLinearGradient(0, hy, 0, h)
    g.addColorStop(0, '#4e6e42')
    g.addColorStop(1, '#324828')
    ctx.fillStyle = g
    ctx.fillRect(0, hy, w, h - hy)

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, hy, w, h - hy)
    ctx.clip()
    const step = Math.max(6, 36 - detail)
    for (let i = -detail; i <= detail; i++) {
      const z0 = cam.z + Math.cos(cam.yaw) * (16 + i * step)
      const x0 = cam.x + Math.sin(cam.yaw) * (16 + i * step)
      const a = project({ x: x0 - 110, y: 0, z: z0 - 110 }, cam, w, h)
      const b = project({ x: x0 + 110, y: 0, z: z0 + 110 }, cam, w, h)
      if (!a || !b) continue
      ctx.strokeStyle = `rgba(35,55,28,${0.14 + 0.12 * (1 - Math.abs(i) / detail)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    // Cross-hatch for height/motion readability
    for (let i = -detail; i <= detail; i += 2) {
      const lat = (i * step) * 0.85
      const fx = -Math.sin(cam.yaw)
      const fz = Math.cos(cam.yaw)
      const rx = Math.cos(cam.yaw)
      const rz = Math.sin(cam.yaw)
      const cx = cam.x + fx * 40 + rx * lat
      const cz = cam.z + fz * 40 + rz * lat
      const a = project({ x: cx - fx * 100, y: 0, z: cz - fz * 100 }, cam, w, h)
      const b = project({ x: cx + fx * 100, y: 0, z: cz + fz * 100 }, cam, w, h)
      if (!a || !b) continue
      ctx.strokeStyle = `rgba(30,50,25,${0.08 + 0.08 * (1 - Math.abs(i) / detail)})`
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.restore()
  }


  /** Airport: segmented runway (always draws when near), taxiways, hangars, tower, windsock. */
  private airport(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number) {
    const half = RWY_HALF_W
    const x0 = RWY_X - half
    const x1 = RWY_X + half
    const z0 = RWY_Z0
    const z1 = RWY_Z1

    const fillPoly = (pts: (Vec2 | null)[], fill: string, stroke?: string, lw = 1) => {
      const ok = pts.filter((p): p is Vec2 => !!p)
      if (ok.length < 3) return
      ctx.beginPath()
      ctx.moveTo(ok[0]!.x, ok[0]!.y)
      for (let i = 1; i < ok.length; i++) ctx.lineTo(ok[i]!.x, ok[i]!.y)
      ctx.closePath()
      ctx.fillStyle = fill
      ctx.fill()
      if (stroke) {
        ctx.strokeStyle = stroke
        ctx.lineWidth = lw
        ctx.stroke()
      }
    }

    // Segmented asphalt — each slab draws independently so frustum / behind-cam
    // corners no longer cull the entire strip.
    const seg = 18
    for (let z = z0; z < z1; z += seg) {
      const ze = Math.min(z + seg, z1)
      const corners = [
        projectNear({ x: x0, y: 0.02, z }, cam, w, h),
        projectNear({ x: x1, y: 0.02, z }, cam, w, h),
        projectNear({ x: x1, y: 0.02, z: ze }, cam, w, h),
        projectNear({ x: x0, y: 0.02, z: ze }, cam, w, h),
      ]
      // Need ≥3 corners; skip only if all far behind
      if (corners.filter(Boolean).length < 3) continue
      fillPoly(corners, 'rgba(52,56,62,0.94)', 'rgba(90,95,100,0.45)', 1.2)
    }

    // Shoulder / overrun extensions (visual cue, longer draw)
    for (const [za, zb] of [
      [z0 - 18, z0],
      [z1, z1 + 18],
    ] as const) {
      const corners = [
        projectNear({ x: x0 + 1, y: 0.015, z: za }, cam, w, h),
        projectNear({ x: x1 - 1, y: 0.015, z: za }, cam, w, h),
        projectNear({ x: x1 - 1, y: 0.015, z: zb }, cam, w, h),
        projectNear({ x: x0 + 1, y: 0.015, z: zb }, cam, w, h),
      ]
      fillPoly(corners, 'rgba(48,52,58,0.75)')
    }

    // Centerline dashes
    const dashLen = 10
    const gap = 8
    for (let z = z0 + 8; z < z1 - 8; z += dashLen + gap) {
      const a = projectNear({ x: RWY_X, y: 0.05, z }, cam, w, h)
      const b = projectNear({ x: RWY_X, y: 0.05, z: Math.min(z + dashLen, z1 - 6) }, cam, w, h)
      if (!a || !b) continue
      ctx.strokeStyle = 'rgba(240,240,220,0.88)'
      ctx.lineWidth = Math.max(1.5, 55 / ((a.d + b.d) / 2))
      ctx.lineCap = 'butt'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    // Edge lines (segmented so long edges survive)
    for (const ex of [x0 + 0.8, x1 - 0.8]) {
      for (let z = z0 + 4; z < z1 - 4; z += 40) {
        const ze = Math.min(z + 40, z1 - 4)
        const a = projectNear({ x: ex, y: 0.05, z }, cam, w, h)
        const b = projectNear({ x: ex, y: 0.05, z: ze }, cam, w, h)
        if (!a || !b) continue
        ctx.strokeStyle = 'rgba(230,230,210,0.72)'
        ctx.lineWidth = Math.max(1, 40 / ((a.d + b.d) / 2))
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }

    // Threshold bars (both ends)
    for (const zBase of [z0 + 6, z1 - 14]) {
      for (let i = 0; i < 6; i++) {
        const sx = RWY_X - half + 2.2 + i * 3.5
        const a = projectNear({ x: sx, y: 0.06, z: zBase }, cam, w, h)
        const b = projectNear({ x: sx, y: 0.06, z: zBase + 8 }, cam, w, h)
        if (!a || !b) continue
        ctx.strokeStyle = 'rgba(245,245,230,0.92)'
        ctx.lineWidth = Math.max(2, 48 / ((a.d + b.d) / 2))
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }

    // Taxiway pad ↔ runway
    fillPoly(
      [
        projectNear({ x: PAD_X + 8, y: 0.015, z: PAD_Z - 6 }, cam, w, h),
        projectNear({ x: PAD_X + 8, y: 0.015, z: PAD_Z + 6 }, cam, w, h),
        projectNear({ x: RWY_X - half - 1, y: 0.015, z: 12 }, cam, w, h),
        projectNear({ x: RWY_X - half - 1, y: 0.015, z: 0 }, cam, w, h),
      ],
      'rgba(58,62,68,0.88)',
      'rgba(180,160,80,0.35)',
      1,
    )

    // Extra parallel taxi / ramp east of runway
    fillPoly(
      [
        projectNear({ x: half + 4, y: 0.012, z: -50 }, cam, w, h),
        projectNear({ x: half + 14, y: 0.012, z: -50 }, cam, w, h),
        projectNear({ x: half + 14, y: 0.012, z: 80 }, cam, w, h),
        projectNear({ x: half + 4, y: 0.012, z: 80 }, cam, w, h),
      ],
      'rgba(55,60,66,0.82)',
    )
    // Cross connectors
    for (const zc of [-40, 10, 55]) {
      fillPoly(
        [
          projectNear({ x: half, y: 0.013, z: zc - 4 }, cam, w, h),
          projectNear({ x: half + 14, y: 0.013, z: zc - 4 }, cam, w, h),
          projectNear({ x: half + 14, y: 0.013, z: zc + 4 }, cam, w, h),
          projectNear({ x: half, y: 0.013, z: zc + 4 }, cam, w, h),
        ],
        'rgba(58,62,68,0.8)',
      )
    }

    // Hangars / terminal
    const hangars: { x: number; z: number; bw: number; bd: number; bh: number; color: string }[] = [
      { x: -48, z: -40, bw: 10, bd: 8, bh: 7, color: 'rgb(72,78,88)' },
      { x: -52, z: -18, bw: 8, bd: 12, bh: 6, color: 'rgb(68,74,82)' },
      { x: 38, z: 40, bw: 9, bd: 7, bh: 5.5, color: 'rgb(70,76,84)' },
      { x: 42, z: -30, bw: 7, bd: 9, bh: 5, color: 'rgb(66,72,80)' },
    ]
    for (const hng of hangars) {
      const { x: bx, z: bz, bw, bd, bh, color } = hng
      const corners = [
        { x: bx - bw, y: 0, z: bz - bd },
        { x: bx + bw, y: 0, z: bz - bd },
        { x: bx + bw, y: 0, z: bz + bd },
        { x: bx - bw, y: 0, z: bz + bd },
        { x: bx - bw, y: bh, z: bz - bd },
        { x: bx + bw, y: bh, z: bz - bd },
        { x: bx + bw, y: bh, z: bz + bd },
        { x: bx - bw, y: bh, z: bz + bd },
      ]
      const proj = corners.map((p) => project(p, cam, w, h))
      if (proj.filter(Boolean).length < 6) continue
      if (proj.some((p) => !p)) continue
      const roof = [4, 5, 6, 7].map((i) => proj[i]!)
      ctx.beginPath()
      ctx.moveTo(roof[0]!.x, roof[0]!.y)
      for (const p of roof) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      for (const idx of [
        [0, 1, 5, 4],
        [1, 2, 6, 5],
      ] as const) {
        const pts = idx.map((j) => proj[j]!)
        ctx.beginPath()
        ctx.moveTo(pts[0]!.x, pts[0]!.y)
        for (const p of pts) ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.fillStyle = 'rgba(40,48,56,0.65)'
        ctx.fill()
      }
    }

    // Control tower
    const twx = -55
    const twz = 70
    const towerPts = [
      { x: twx - 2.5, y: 0, z: twz - 2.5 },
      { x: twx + 2.5, y: 0, z: twz - 2.5 },
      { x: twx + 2.5, y: 0, z: twz + 2.5 },
      { x: twx - 2.5, y: 0, z: twz + 2.5 },
      { x: twx - 2.5, y: 22, z: twz - 2.5 },
      { x: twx + 2.5, y: 22, z: twz - 2.5 },
      { x: twx + 2.5, y: 22, z: twz + 2.5 },
      { x: twx - 2.5, y: 22, z: twz + 2.5 },
    ]
    const tproj = towerPts.map((p) => project(p, cam, w, h))
    if (!tproj.some((p) => !p)) {
      const roof = [4, 5, 6, 7].map((i) => tproj[i]!)
      ctx.beginPath()
      ctx.moveTo(roof[0]!.x, roof[0]!.y)
      for (const p of roof) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = 'rgb(90,98,110)'
      ctx.fill()
      const cab = project({ x: twx, y: 26, z: twz }, cam, w, h)
      if (cab) {
        const s = clamp(90 / cab.d, 3, 14)
        ctx.fillStyle = 'rgba(140,180,210,0.75)'
        ctx.fillRect(cab.x - s, cab.y - s * 0.7, s * 2, s * 1.1)
        ctx.strokeStyle = '#d4a84a'
        ctx.lineWidth = 1.5
        ctx.strokeRect(cab.x - s, cab.y - s * 0.7, s * 2, s * 1.1)
      }
    }

    // Windsock near pad
    const wsx = PAD_X + PAD_R + 6
    const wsz = PAD_Z - 8
    const base = project({ x: wsx, y: 0, z: wsz }, cam, w, h)
    const top = project({ x: wsx, y: 7, z: wsz }, cam, w, h)
    const sock = project({ x: wsx + 4, y: 6.2, z: wsz + 1.5 }, cam, w, h)
    if (base && top) {
      ctx.strokeStyle = '#8890a0'
      ctx.lineWidth = Math.max(1.5, 35 / base.d)
      ctx.beginPath()
      ctx.moveTo(base.x, base.y)
      ctx.lineTo(top.x, top.y)
      ctx.stroke()
      if (sock) {
        ctx.fillStyle = 'rgba(220,90,50,0.85)'
        ctx.beginPath()
        ctx.moveTo(top.x, top.y)
        ctx.lineTo(sock.x, sock.y - 3)
        ctx.lineTo(sock.x, sock.y + 3)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  private pad(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number) {
    const ring: Vec2[] = []
    for (let i = 0; i <= 36; i++) {
      const a = (i / 36) * Math.PI * 2
      const p = project(
        { x: PAD_X + Math.cos(a) * PAD_R, y: 0.05, z: PAD_Z + Math.sin(a) * PAD_R },
        cam,
        w,
        h,
      )
      if (p) ring.push(p)
    }
    if (ring.length > 4) {
      ctx.beginPath()
      ctx.moveTo(ring[0]!.x, ring[0]!.y)
      for (const p of ring) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = 'rgba(45,50,58,0.88)'
      ctx.fill()
      ctx.strokeStyle = '#d4a84a'
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    const c = project({ x: PAD_X, y: 0.08, z: PAD_Z }, cam, w, h)
    if (c) {
      const s = clamp(200 / c.d, 5, 32)
      ctx.strokeStyle = '#d4a84a'
      ctx.lineWidth = Math.max(2, s * 0.14)
      // VTOL pad mark (circle + cross)
      ctx.beginPath()
      ctx.arc(c.x, c.y, s * 0.9, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(c.x - s * 0.7, c.y)
      ctx.lineTo(c.x + s * 0.7, c.y)
      ctx.moveTo(c.x, c.y - s * 0.7)
      ctx.lineTo(c.x, c.y + s * 0.7)
      ctx.stroke()
    }
  }

  /** Distant ridges / coastline silhouette — phone-cheap depth cue. */
  private distantTerrain(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number) {
    const ridges: { dist: number; hgt: number; amp: number; color: string }[] = [
      { dist: 420, hgt: 38, amp: 22, color: 'rgba(55,72,48,0.55)' },
      { dist: 520, hgt: 55, amp: 30, color: 'rgba(48,62,42,0.45)' },
      { dist: 640, hgt: 28, amp: 16, color: 'rgba(42,58,70,0.4)' }, // coast-ish
    ]
    for (const ridge of ridges) {
      const pts: Vec2[] = []
      for (let i = -14; i <= 14; i++) {
        const lat = i * 38
        const ang = cam.yaw
        const fx = Math.sin(ang)
        const fz = Math.cos(ang)
        const rx = Math.cos(ang)
        const rz = Math.sin(ang)
        const wx = cam.x + fx * ridge.dist + rx * lat
        const wz = cam.z + fz * ridge.dist + rz * lat
        const elev =
          ridge.hgt +
          Math.sin(i * 0.55 + ridge.dist * 0.01) * ridge.amp +
          Math.sin(i * 1.3) * ridge.amp * 0.35
        const p = projectNear({ x: wx, y: Math.max(0, elev), z: wz }, cam, w, h)
        if (p) pts.push(p)
      }
      if (pts.length < 4) continue
      ctx.beginPath()
      ctx.moveTo(pts[0]!.x, h)
      for (const p of pts) ctx.lineTo(p.x, p.y)
      ctx.lineTo(pts[pts.length - 1]!.x, h)
      ctx.closePath()
      ctx.fillStyle = ridge.color
      ctx.fill()
    }

    // Simple road arc south of field
    for (let i = -8; i < 8; i++) {
      const t0 = i / 8
      const t1 = (i + 1) / 8
      const x0 = -180 + t0 * 360
      const x1 = -180 + t1 * 360
      const z0 = -160 + Math.sin(t0 * Math.PI) * 25
      const z1 = -160 + Math.sin(t1 * Math.PI) * 25
      const a = projectNear({ x: x0, y: 0.04, z: z0 }, cam, w, h)
      const b = projectNear({ x: x1, y: 0.04, z: z1 }, cam, w, h)
      if (!a || !b) continue
      ctx.strokeStyle = 'rgba(70,70,75,0.55)'
      ctx.lineWidth = Math.max(1.5, 28 / ((a.d + b.d) / 2))
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
  }

  /** Farm / meadow patches around airport (keep clear of runway). */
  private fields(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number) {
    const patches: { x: number; z: number; sx: number; sz: number; color: string }[] = [
      { x: -90, z: 40, sx: 35, sz: 28, color: 'rgba(92,110,48,0.45)' },
      { x: -100, z: -70, sx: 40, sz: 32, color: 'rgba(110,100,55,0.4)' },
      { x: 95, z: -20, sx: 38, sz: 30, color: 'rgba(85,105,50,0.42)' },
      { x: 110, z: 90, sx: 42, sz: 26, color: 'rgba(100,95,50,0.38)' },
      { x: -70, z: 130, sx: 30, sz: 22, color: 'rgba(70,95,60,0.4)' },
      { x: 60, z: -110, sx: 36, sz: 24, color: 'rgba(88,108,52,0.4)' },
    ]
    for (const f of patches) {
      const corners = [
        projectNear({ x: f.x - f.sx, y: 0.01, z: f.z - f.sz }, cam, w, h),
        projectNear({ x: f.x + f.sx, y: 0.01, z: f.z - f.sz }, cam, w, h),
        projectNear({ x: f.x + f.sx, y: 0.01, z: f.z + f.sz }, cam, w, h),
        projectNear({ x: f.x - f.sx, y: 0.01, z: f.z + f.sz }, cam, w, h),
      ]
      const ok = corners.filter((p): p is Vec2 => !!p)
      if (ok.length < 3) continue
      ctx.beginPath()
      ctx.moveTo(ok[0]!.x, ok[0]!.y)
      for (let i = 1; i < ok.length; i++) ctx.lineTo(ok[i]!.x, ok[i]!.y)
      ctx.closePath()
      ctx.fillStyle = f.color
      ctx.fill()
    }
  }

  private buildings(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, n: number) {
    for (let i = 0; i < n; i++) {
      const ang = hash(i + 1.1) * Math.PI * 2
      const dist = 70 + hash(i + 2.2) * 150
      const bx = Math.cos(ang) * dist
      const bz = Math.sin(ang) * dist
      if (Math.hypot(bx - PAD_X, bz - PAD_Z) < PAD_R + 18) continue
      if (Math.abs(bx - RWY_X) < RWY_HALF_W + 22 && bz > RWY_Z0 - 20 && bz < RWY_Z1 + 20) continue
      const bw = 5 + hash(i + 3) * 9
      const bh = 7 + hash(i + 4) * 20
      const corners = [
        { x: bx - bw, y: 0, z: bz - bw },
        { x: bx + bw, y: 0, z: bz - bw },
        { x: bx + bw, y: 0, z: bz + bw },
        { x: bx - bw, y: 0, z: bz + bw },
        { x: bx - bw, y: bh, z: bz - bw },
        { x: bx + bw, y: bh, z: bz - bw },
        { x: bx + bw, y: bh, z: bz + bw },
        { x: bx - bw, y: bh, z: bz + bw },
      ]
      const proj = corners.map((p) => project(p, sim.cam, w, h))
      if (proj.some((p) => !p)) continue
      const face = [4, 5, 6, 7].map((i) => proj[i]!)
      ctx.beginPath()
      ctx.moveTo(face[0]!.x, face[0]!.y)
      for (const p of face) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = `rgb(${65 + hash(i) * 35 | 0},${75 + hash(i + 5) * 28 | 0},${85 + hash(i + 6) * 35 | 0})`
      ctx.fill()
      for (const idx of [
        [0, 1, 5, 4],
        [1, 2, 6, 5],
      ] as const) {
        const pts = idx.map((j) => proj[j]!)
        ctx.beginPath()
        ctx.moveTo(pts[0]!.x, pts[0]!.y)
        for (const p of pts) ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.fillStyle = `rgba(35,45,55,${0.5 + hash(i + idx[0]) * 0.2})`
        ctx.fill()
      }
    }
  }

  private trees(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, n: number) {
    // Extra bushes / low scrub for height/motion readability (phone-safe props)
    const scrub = Math.min(n, Math.floor(n * 0.45) + 8)
    for (let i = 0; i < scrub; i++) {
      const ang = hash(i + 90.1) * Math.PI * 2
      const dist = 18 + hash(i + 91) * 140
      const tx = Math.cos(ang) * dist
      const tz = Math.sin(ang) * dist
      if (Math.hypot(tx - PAD_X, tz - PAD_Z) < PAD_R + 6) continue
      if (Math.abs(tx - RWY_X) < RWY_HALF_W + 10 && tz > RWY_Z0 - 8 && tz < RWY_Z1 + 8) continue
      const base = project({ x: tx, y: 0, z: tz }, sim.cam, w, h)
      if (!base || base.d > 320) continue
      const s = clamp(28 / base.d, 1.5, 9)
      ctx.fillStyle = `rgba(${40 + (hash(i) * 40) | 0},${70 + (hash(i + 2) * 50) | 0},32,0.75)`
      ctx.beginPath()
      ctx.ellipse(base.x, base.y - s * 0.2, s * 1.4, s * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    for (let i = 0; i < n; i++) {
      const ang = hash(i + 20.1) * Math.PI * 2
      const dist = 28 + hash(i + 21) * 220
      const tx = Math.cos(ang) * dist
      const tz = Math.sin(ang) * dist
      if (Math.hypot(tx - PAD_X, tz - PAD_Z) < PAD_R + 8) continue
      if (Math.abs(tx - RWY_X) < RWY_HALF_W + 14 && tz > RWY_Z0 - 10 && tz < RWY_Z1 + 10) continue
      const kind = hash(i + 7) // 0..1 — mix round canopy / conifer
      const ht = 6 + hash(i) * 10
      const base = project({ x: tx, y: 0, z: tz }, sim.cam, w, h)
      const top = project({ x: tx, y: ht, z: tz }, sim.cam, w, h)
      if (!base || !top) continue
      const s = clamp(55 / base.d, 3, 22)
      ctx.strokeStyle = '#3a2818'
      ctx.lineWidth = Math.max(1.5, s * 0.35)
      ctx.beginPath()
      ctx.moveTo(base.x, base.y)
      ctx.lineTo(top.x, top.y)
      ctx.stroke()
      const g = (28 + hash(i) * 35) | 0
      const gr = (85 + hash(i + 1) * 45) | 0
      if (kind > 0.45) {
        // Conifer triangle stack
        ctx.fillStyle = `rgba(${g},${gr},38,0.88)`
        for (let tier = 0; tier < 3; tier++) {
          const ty = top.y + (base.y - top.y) * (0.15 + tier * 0.22)
          const tw = s * (0.7 + tier * 0.35)
          ctx.beginPath()
          ctx.moveTo(top.x, top.y + (base.y - top.y) * (tier * 0.18))
          ctx.lineTo(top.x - tw, ty)
          ctx.lineTo(top.x + tw, ty)
          ctx.closePath()
          ctx.fill()
        }
      } else {
        ctx.fillStyle = `rgba(${g},${gr},38,0.85)`
        ctx.beginPath()
        ctx.arc(top.x, top.y, s, 0, Math.PI * 2)
        ctx.fill()
        // secondary lobe
        ctx.beginPath()
        ctx.arc(top.x + s * 0.35, top.y + s * 0.2, s * 0.65, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  private particles(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, dt: number, max: number) {
    const craft = sim.craft
    const hel = Math.sin((craft.nacelleDeg * Math.PI) / 180)
    if (craft.y < 12 && craft.rotorRpm > 0.4 && !craft.onGround && hel > 0.4) {
      if (this.dust.length < max && Math.random() < 0.55) {
        const a = Math.random() * Math.PI * 2
        this.dust.push({
          x: craft.x + Math.cos(a) * 4,
          z: craft.z + Math.sin(a) * 4,
          life: 0.55 + Math.random() * 0.5,
          vx: Math.cos(a) * (2 + Math.random() * 5),
          vz: Math.sin(a) * (2 + Math.random() * 5),
        })
      }
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const d = this.dust[i]!
      d.life -= dt
      d.x += d.vx * dt
      d.z += d.vz * dt
      if (d.life <= 0) {
        this.dust.splice(i, 1)
        continue
      }
      const p = project({ x: d.x, y: 0.2, z: d.z }, sim.cam, w, h)
      if (!p) continue
      ctx.fillStyle = `rgba(175,165,135,${d.life * 0.35})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, clamp(32 / p.d, 2, 11), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private osprey(ctx: CanvasRenderingContext2D, craft: Craft, cam: Cam, w: number, h: number, shadows: boolean) {
    const cy = Math.cos(craft.yaw)
    const sy = Math.sin(craft.yaw)
    const cp = Math.cos(craft.pitch)
    const sp = Math.sin(craft.pitch)
    const cr = Math.cos(craft.roll)
    const sr = Math.sin(craft.roll)

    const xf = (lx: number, ly: number, lz: number): Pt => {
      let x = lx * cr - ly * sr
      let y = lx * sr + ly * cr
      let z = lz
      const y2 = y * cp - z * sp
      const z2 = y * sp + z * cp
      y = y2
      z = z2
      const x3 = x * cy + z * sy
      const z3 = -x * sy + z * cy
      return { x: craft.x + x3, y: craft.y + y, z: craft.z + z3 }
    }

    if (shadows && craft.y < 50) {
      const sh = project({ x: craft.x, y: 0.05, z: craft.z }, cam, w, h)
      if (sh) {
        const s = clamp(110 / sh.d, 5, 36) * (1 - clamp(craft.y / 50, 0, 0.85))
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.beginPath()
        ctx.ellipse(sh.x, sh.y, s * 1.5, s * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const parts: { a: Pt; b: Pt; color: string; width: number }[] = []

    // Landing gear
    if (craft.gearDown) {
      parts.push({ a: xf(-1.4, -2.0, 1.5), b: xf(-1.4, -0.3, 1.2), color: '#444', width: 2 })
      parts.push({ a: xf(1.4, -2.0, 1.5), b: xf(1.4, -0.3, 1.2), color: '#444', width: 2 })
      parts.push({ a: xf(0, -2.0, -2.2), b: xf(0, -0.2, -1.8), color: '#444', width: 2 })
      parts.push({ a: xf(-1.6, -2.05, 1.5), b: xf(-1.2, -2.05, 1.5), color: '#222', width: 3 })
      parts.push({ a: xf(1.2, -2.05, 1.5), b: xf(1.6, -2.05, 1.5), color: '#222', width: 3 })
    }

    // Fuselage
    parts.push({ a: xf(0, 0.1, -4.5), b: xf(0, 0.3, 4.2), color: '#8a9088', width: 7 })
    parts.push({ a: xf(-1.1, 0.4, 1.5), b: xf(1.1, 0.4, 1.5), color: '#2a5080', width: 5 })
    parts.push({ a: xf(-1.1, 0.4, 3.2), b: xf(1.1, 0.4, 3.2), color: '#2a5080', width: 5 })
    // Tail
    parts.push({ a: xf(0, 0.4, -3.5), b: xf(0, 2.2, -5.2), color: '#7a8078', width: 3 })
    parts.push({ a: xf(-1.8, 2.0, -5.0), b: xf(1.8, 2.0, -5.0), color: '#6a7068', width: 2.5 })

    // Wing spar
    const wingY = 0.9
    parts.push({ a: xf(-7.5, wingY, 0.2), b: xf(7.5, wingY, 0.2), color: '#757b73', width: 4 })
    // Flaperons hint
    const flapDrop = craft.flaps * 0.6
    parts.push({ a: xf(-5.5, wingY - flapDrop, 0.8), b: xf(-2.5, wingY - flapDrop, 0.8), color: '#5a6058', width: 2 })
    parts.push({ a: xf(2.5, wingY - flapDrop, 0.8), b: xf(5.5, wingY - flapDrop, 0.8), color: '#5a6058', width: 2 })

    const drawn = parts
      .map((p) => {
        const pa = project(p.a, cam, w, h)
        const pb = project(p.b, cam, w, h)
        return pa && pb ? { pa, pb, color: p.color, width: p.width, d: (pa.d + pb.d) / 2 } : null
      })
      .filter(Boolean) as { pa: Vec2; pb: Vec2; color: string; width: number; d: number }[]
    drawn.sort((a, b) => b.d - a.d)
    for (const p of drawn) {
      ctx.strokeStyle = p.color
      ctx.lineWidth = Math.max(1, p.width * clamp(45 / p.d, 0.4, 2.2))
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.pa.x, p.pa.y)
      ctx.lineTo(p.pb.x, p.pb.y)
      ctx.stroke()
    }

    // Twin nacelles + proprotors
    const nacRad = (craft.nacelleDeg * Math.PI) / 180
    // Local nacelle: hub offset; blades spin in plane perpendicular to nacelle axis
    // Nacelle axis in body: at 90° points +Y (up), at 0° points +Z (forward)
    const drawNacelle = (side: number) => {
      const wx = side * 7.2
      const wy = wingY
      const wz = 0.2
      // Nacelle body along thrust axis
      const ax = Math.sin(nacRad) // up component
      const az = Math.cos(nacRad) // forward component
      const tipLen = 1.4
      const hub = xf(wx, wy, wz)
      const tip = xf(wx + 0, wy + ax * tipLen, wz + az * tipLen)
      const ph = project(hub, cam, w, h)
      const pt = project(tip, cam, w, h)
      if (ph && pt) {
        ctx.strokeStyle = '#4a4e48'
        ctx.lineWidth = Math.max(2, 5 * clamp(45 / ph.d, 0.4, 2))
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(ph.x, ph.y)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
      }

      // Blade disc: rotate blades in plane ⊥ to nacelle
      // Basis for blade plane: lateral + cross(thrust, lateral)
      const bladeR = 4.2
      for (let i = 0; i < 3; i++) {
        const a = this.rotorPhase + (i * Math.PI * 2) / 3
        // Blade direction in body: mix of lateral and "edge" depending on nacelle
        const bx = Math.cos(a) * bladeR
        const by = -Math.sin(a) * bladeR * Math.cos(nacRad)
        const bz = Math.sin(a) * bladeR * Math.sin(nacRad)
        const tip1 = xf(wx + bx, wy + ax * 0.3 + by, wz + az * 0.3 + bz)
        const tip2 = xf(wx - bx, wy + ax * 0.3 - by, wz + az * 0.3 - bz)
        const p1 = project(tip1, cam, w, h)
        const p2 = project(tip2, cam, w, h)
        if (p1 && p2) {
          ctx.strokeStyle = `rgba(25,25,30,${0.3 + craft.rotorRpm * 0.4})`
          ctx.lineWidth = Math.max(1, 2.2 * clamp(45 / (p1.d || 20), 0.4, 2))
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      }

      // Disc wash
      const disc: Vec2[] = []
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2
        const bx = Math.cos(a) * bladeR * 0.95
        const by = -Math.sin(a) * bladeR * 0.95 * Math.cos(nacRad)
        const bz = Math.sin(a) * bladeR * 0.95 * Math.sin(nacRad)
        const p = project(xf(wx + bx, wy + ax * 0.25 + by, wz + az * 0.25 + bz), cam, w, h)
        if (p) disc.push(p)
      }
      if (disc.length > 6) {
        ctx.beginPath()
        ctx.moveTo(disc[0]!.x, disc[0]!.y)
        for (const p of disc) ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.fillStyle = `rgba(190,200,210,${0.05 + craft.rotorRpm * 0.07})`
        ctx.fill()
      }
    }

    drawNacelle(-1)
    drawNacelle(1)
    void GEAR_H
  }


  private f35(ctx: CanvasRenderingContext2D, craft: Craft, cam: Cam, w: number, h: number, shadows: boolean) {
    const cy = Math.cos(craft.yaw)
    const sy = Math.sin(craft.yaw)
    const cp = Math.cos(craft.pitch)
    const sp = Math.sin(craft.pitch)
    const cr = Math.cos(craft.roll)
    const sr = Math.sin(craft.roll)

    const xf = (lx: number, ly: number, lz: number): Pt => {
      let x = lx * cr - ly * sr
      let y = lx * sr + ly * cr
      let z = lz
      const y2 = y * cp - z * sp
      const z2 = y * sp + z * cp
      y = y2
      z = z2
      const x3 = x * cy + z * sy
      const z3 = -x * sy + z * cy
      return { x: craft.x + x3, y: craft.y + y, z: craft.z + z3 }
    }

    if (shadows && craft.y < 50) {
      const sh = project({ x: craft.x, y: 0.05, z: craft.z }, cam, w, h)
      if (sh) {
        const s = clamp(95 / sh.d, 4, 30) * (1 - clamp(craft.y / 50, 0, 0.85))
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.beginPath()
        ctx.ellipse(sh.x, sh.y, s * 1.3, s * 0.38, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const parts: { a: Pt; b: Pt; color: string; width: number }[] = []

    if (craft.gearDown) {
      parts.push({ a: xf(-1.2, -1.7, 1.2), b: xf(-1.2, -0.2, 1.0), color: '#555', width: 2 })
      parts.push({ a: xf(1.2, -1.7, 1.2), b: xf(1.2, -0.2, 1.0), color: '#555', width: 2 })
      parts.push({ a: xf(0, -1.7, -2.0), b: xf(0, -0.1, -1.6), color: '#555', width: 2 })
    }

    // Fuselage — gray fighter
    parts.push({ a: xf(0, 0.15, -4.0), b: xf(0, 0.25, 4.5), color: '#9aa3a8', width: 6 })
    parts.push({ a: xf(-0.7, 0.35, 2.8), b: xf(0.7, 0.35, 2.8), color: '#3a6088', width: 4 })
    // Nose
    parts.push({ a: xf(0, 0.2, 4.5), b: xf(0, 0.1, 5.8), color: '#8a9298', width: 3 })
    // Twin tails
    parts.push({ a: xf(-0.9, 0.3, -2.8), b: xf(-1.4, 2.0, -3.6), color: '#7a8288', width: 2.5 })
    parts.push({ a: xf(0.9, 0.3, -2.8), b: xf(1.4, 2.0, -3.6), color: '#7a8288', width: 2.5 })
    // Wings
    parts.push({ a: xf(-5.5, 0.35, 0.5), b: xf(5.5, 0.35, 0.5), color: '#8a9298', width: 3.5 })
    parts.push({ a: xf(-5.2, 0.3, 0.5), b: xf(-2.5, 0.3, 2.2), color: '#7a8288', width: 2 })
    parts.push({ a: xf(5.2, 0.3, 0.5), b: xf(2.5, 0.3, 2.2), color: '#7a8288', width: 2 })
    // Flaps cue
    const fd = craft.flaps * 0.45
    parts.push({ a: xf(-4.2, 0.3 - fd, 1.2), b: xf(-2.0, 0.3 - fd, 1.2), color: '#5a6268', width: 2 })
    parts.push({ a: xf(2.0, 0.3 - fd, 1.2), b: xf(4.2, 0.3 - fd, 1.2), color: '#5a6268', width: 2 })

    // Lift-fan cue disc on top when VL/STOVL
    const vl = craft.vectorPos
    if (vl > 0.25) {
      const disc: Vec2[] = []
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI * 2
        const p = project(xf(Math.cos(a) * 1.1, 0.85, 1.2 + Math.sin(a) * 1.1), cam, w, h)
        if (p) disc.push(p)
      }
      if (disc.length > 5) {
        ctx.beginPath()
        ctx.moveTo(disc[0]!.x, disc[0]!.y)
        for (const p of disc) ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.fillStyle = `rgba(180,200,220,${0.08 + craft.rotorRpm * 0.12 * vl})`
        ctx.fill()
        ctx.strokeStyle = `rgba(100,140,180,${0.3 + vl * 0.4})`
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      // Fan blades
      for (let i = 0; i < 4; i++) {
        const a = this.rotorPhase * 1.8 + (i * Math.PI) / 2
        const t1 = xf(Math.cos(a) * 1.0, 0.9, 1.2 + Math.sin(a) * 1.0)
        const t2 = xf(-Math.cos(a) * 1.0, 0.9, 1.2 - Math.sin(a) * 1.0)
        const p1 = project(t1, cam, w, h)
        const p2 = project(t2, cam, w, h)
        if (p1 && p2) {
          ctx.strokeStyle = `rgba(40,50,60,${0.25 + craft.rotorRpm * 0.35})`
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      }
    }

    // Rear nozzle — tilts with vector
    const nd = (craft.vectorPos * Math.PI) / 2 // 0 aft, 90 down
    const nz = -Math.cos(nd) * 1.6
    const ny = -Math.sin(nd) * 1.6
    parts.push({ a: xf(0, 0.1, -3.8), b: xf(0, 0.1 + ny, -3.8 + nz), color: '#c07040', width: 4 })

    const drawn = parts
      .map((p) => {
        const pa = project(p.a, cam, w, h)
        const pb = project(p.b, cam, w, h)
        return pa && pb ? { pa, pb, color: p.color, width: p.width, d: (pa.d + pb.d) / 2 } : null
      })
      .filter(Boolean) as { pa: Vec2; pb: Vec2; color: string; width: number; d: number }[]
    drawn.sort((a, b) => b.d - a.d)
    for (const p of drawn) {
      ctx.strokeStyle = p.color
      ctx.lineWidth = Math.max(1, p.width * clamp(45 / p.d, 0.4, 2.2))
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.pa.x, p.pa.y)
      ctx.lineTo(p.pb.x, p.pb.y)
      ctx.stroke()
    }
  }

  private vignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.78)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.38)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const r = (pa[0]! + (pb[0]! - pa[0]!) * t) | 0
  const g = (pa[1]! + (pb[1]! - pa[1]!) * t) | 0
  const bl = (pa[2]! + (pb[2]! - pa[2]!) * t) | 0
  return `rgb(${r},${g},${bl})`
}

function hex(h: string): [number, number, number] {
  const s = h.replace('#', '')
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]
}
