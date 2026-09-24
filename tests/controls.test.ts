import assert from 'node:assert/strict'
import { test } from 'node:test'
import { tiltAngles } from '../src/game/tilt'
import { createInput, emptyControls, sampleControls, requestGyroPermission, bindGyro } from '../src/game/input'
import { defaultPrefs } from '../src/game/prefs'
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 0.01, `${actual} != ${expected}`)
test('portrait and both landscape orientations map independent axes', () => {
  near(tiltAngles(10, 0, 0, 0, 0).pitch, 10)
  near(tiltAngles(0, 10, 0, 0, 0).roll, 10)
  near(tiltAngles(10, 0, 0, 0, 90).roll, -10)
  near(tiltAngles(0, 10, 0, 0, 90).pitch, 10)
  near(tiltAngles(10, 0, 0, 0, 270).roll, 10)
  near(tiltAngles(0, 10, 0, 0, 270).pitch, -10)
})
test('neutral reclined poses and Euler wrapping do not spike', () => {
  for (const screen of [0, 90, 180, 270]) {
    const a = tiltAngles(65, 20, 65, 20, screen)
    near(a.pitch, 0); near(a.roll, 0)
  }
  near(tiltAngles(-179, 0, 179, 0, 0).pitch, 2)
})
test('pitch mode cannot reverse roll; inversion still works for both birds', () => {
  for (const bird of ['osprey', 'f35'] as const) {
    const i = createInput(); i.stickX = 1; i.stickY = 1; i.yawStick = 0.5
    const p = defaultPrefs()
    const casual = sampleControls(i, emptyControls(), 1/60, p, bird)
    const realistic = sampleControls(i, emptyControls(), 1/60, {...p, pitchMode: 'realistic'}, bird)
    assert.equal(casual.cyclicRoll, realistic.cyclicRoll)
    assert.equal(casual.cyclicPitch, -realistic.cyclicPitch)
    assert.equal(casual.yaw, realistic.yaw)
    assert.equal(sampleControls(i, emptyControls(), 1/60, {...p, invertRoll: true}, bird).cyclicRoll, -casual.cyclicRoll)
  }
})
test('fresh tilt and yaw coexist; stale tilt fades without losing yaw', () => {
  const i = createInput(); i.gyroActive = true; i.gyroBeta = 15; i.gyroGamma = 10; i.gyroLastMs = performance.now(); i.yawStick = 0.7
  const p = {...defaultPrefs(), tiltCyclic: true, gyroReady: true}
  const live = sampleControls(i, emptyControls(), 0.2, p, 'osprey')
  assert.ok(live.cyclicPitch < 0 && live.cyclicRoll < 0 && live.yaw > 0)
  i.gyroLastMs = performance.now() - 1200
  const stale = sampleControls(i, live, 0.1, p, 'osprey')
  near(stale.cyclicPitch, 0); near(stale.cyclicRoll, 0); near(stale.yaw, live.yaw)
})
test('unsupported sensors return a result rather than throwing', async () => {
  globalThis.window = { isSecureContext: true } as Window & typeof globalThis
  assert.equal(await requestGyroPermission(), 'unsupported')
})
test('sensor binding ignores invalid data and duplicate absolute stream', () => {
  const target = new EventTarget()
  globalThis.window = Object.assign(target, { screen: { orientation: { angle: 90 } } }) as unknown as Window & typeof globalThis
  const i = createInput(), bound = bindGyro(i)
  const emit = (type: string, beta: number | null, gamma: number | null) => target.dispatchEvent(Object.assign(new Event(type), { beta, gamma }))
  emit('deviceorientation', NaN, 1); emit('deviceorientation', null, 1)
  assert.equal(i.gyroActive, false)
  emit('deviceorientation', 10, 20); emit('deviceorientationabsolute', 80, 70)
  assert.equal(i.gyroBeta, 10); assert.equal(i.gyroScreen, 90); assert.equal(i.gyroEvents.length, 1)
  bound.stop(); emit('deviceorientation', 40, 30); assert.equal(i.gyroBeta, 10)
})
