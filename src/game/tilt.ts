/** Gravity-based tilt ignores compass yaw and avoids beta/gamma wrap jumps. */
type Vec = [number, number, number]
const dot = (a: Vec, b: Vec) => a.reduce((sum, v, i) => sum + v * b[i]!, 0)
const unit = (v: Vec): Vec => { const n = Math.hypot(...v); return v.map(x => x / n) as Vec }
function gravity(beta: number, gamma: number, screen: number): Vec {
  const b = beta * Math.PI / 180, g = gamma * Math.PI / 180, s = screen * Math.PI / 180
  const x = -Math.cos(b) * Math.sin(g), y = Math.sin(b), z = Math.cos(b) * Math.cos(g)
  return [x * Math.cos(s) + y * Math.sin(s), y * Math.cos(s) - x * Math.sin(s), z]
}
export function tiltAngles(beta: number, gamma: number, zeroBeta: number, zeroGamma: number, screen: number) {
  const zero = gravity(zeroBeta, zeroGamma, screen), current = gravity(beta, gamma, screen)
  // Screen-right projected onto the neutral gravity plane; supports reclined holding poses.
  const right: Vec = [1 - zero[0] ** 2, -zero[0] * zero[1], -zero[0] * zero[2]]
  if (Math.hypot(...right) < 0.05) return { pitch: 0, roll: 0 }
  const r = unit(right)
  const up: Vec = [zero[1] * r[2] - zero[2] * r[1], zero[2] * r[0] - zero[0] * r[2], zero[0] * r[1] - zero[1] * r[0]]
  const denominator = dot(current, zero)
  return { pitch: Math.atan2(dot(current, up), denominator) * 180 / Math.PI,
    roll: -Math.atan2(dot(current, r), denominator) * 180 / Math.PI }
}
