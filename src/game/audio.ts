/** Distinct Osprey proprotor vs F-35 jet/fan loops via WebAudio. */

import type { BirdKind } from './types'

export class FlightAudio {
  private ctx: AudioContext | null = null
  private oscA: OscillatorNode | null = null
  private oscB: OscillatorNode | null = null
  private gain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private started = false
  private bird: BirdKind = 'osprey'

  ensure() {
    if (this.ctx) return
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.gain = this.ctx.createGain()
    this.gain.gain.value = 0
    this.gain.connect(this.ctx.destination)

    this.filter = this.ctx.createBiquadFilter()
    this.filter.connect(this.gain)

    this.oscA = this.ctx.createOscillator()
    this.oscB = this.ctx.createOscillator()
    this.oscA.connect(this.filter)
    this.oscB.connect(this.filter)

    // Amplitude wobble for proprotor blade slap (Osprey); quiet for jet
    this.lfo = this.ctx.createOscillator()
    this.lfo.type = 'sine'
    this.lfo.frequency.value = 4
    this.lfoGain = this.ctx.createGain()
    this.lfoGain.gain.value = 0
    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.gain.gain)

    this.applyBirdTimbre('osprey')
  }

  private applyBirdTimbre(bird: BirdKind) {
    if (!this.oscA || !this.oscB || !this.filter || !this.lfo || !this.lfoGain) return
    this.bird = bird
    if (bird === 'osprey') {
      // Heavy proprotor: low saw + detuned square, dark lowpass, blade slap LFO
      this.oscA.type = 'sawtooth'
      this.oscB.type = 'square'
      this.oscA.frequency.value = 48
      this.oscB.frequency.value = 52
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 320
      this.filter.Q.value = 0.7
      this.lfo.frequency.value = 3.6
      this.lfoGain.gain.value = 0.012
    } else {
      // Jet / lift-fan: higher triangle + thin saw, bandpass whine, no slap
      this.oscA.type = 'triangle'
      this.oscB.type = 'sawtooth'
      this.oscA.frequency.value = 110
      this.oscB.frequency.value = 220
      this.filter.type = 'bandpass'
      this.filter.frequency.value = 900
      this.filter.Q.value = 1.8
      this.lfo.frequency.value = 0.8
      this.lfoGain.gain.value = 0.002
    }
  }

  start() {
    this.ensure()
    if (!this.ctx || !this.oscA || !this.oscB || !this.lfo || this.started) return
    try {
      void this.ctx.resume()
      this.oscA.start()
      this.oscB.start()
      this.lfo.start()
      this.started = true
    } catch {
      /* already started */
    }
  }

  /**
   * @param rpm rotor/fan cue 0..1
   * @param tcl power
   * @param modeBlend Osprey: nacelleDeg 0..90; F-35: vectorPos 0..1 (VL=1)
   * @param bird osprey | f35 — switches timbre
   */
  update(rpm: number, tcl: number, modeBlend: number, bird: BirdKind = 'osprey') {
    if (!this.ctx || !this.oscA || !this.oscB || !this.gain || !this.filter || !this.started) return
    if (bird !== this.bird) this.applyBirdTimbre(bird)

    const t = this.ctx.currentTime
    if (bird === 'osprey') {
      const hel = Math.sin((modeBlend * Math.PI) / 180)
      const base = 42 + rpm * 62
      const aplLift = (1 - hel) * 28
      this.oscA.frequency.setTargetAtTime(base + aplLift, t, 0.08)
      this.oscB.frequency.setTargetAtTime(base * 1.08 + aplLift * 0.7, t, 0.08)
      this.filter.frequency.setTargetAtTime(260 + rpm * 140 + (1 - hel) * 80, t, 0.1)
      const vol = Math.min(0.1, 0.012 + rpm * 0.055 + tcl * 0.022)
      this.gain.gain.setTargetAtTime(vol, t, 0.1)
      if (this.lfoGain) this.lfoGain.gain.setTargetAtTime(0.008 + rpm * 0.01, t, 0.15)
    } else {
      // modeBlend = vectorPos: 1 VL fan → 0 CTOL jet
      const vl = clamp01(modeBlend)
      const jet = 95 + rpm * 160 + (1 - vl) * 90
      const fan = 70 + rpm * 90
      this.oscA.frequency.setTargetAtTime(lerp(jet, fan, vl * 0.65), t, 0.06)
      this.oscB.frequency.setTargetAtTime(lerp(jet * 2.05, fan * 1.6, vl * 0.5), t, 0.06)
      this.filter.frequency.setTargetAtTime(700 + rpm * 500 + (1 - vl) * 400, t, 0.08)
      this.filter.Q.setTargetAtTime(1.2 + (1 - vl) * 1.4, t, 0.1)
      const vol = Math.min(0.085, 0.01 + rpm * 0.045 + tcl * 0.025)
      this.gain.gain.setTargetAtTime(vol, t, 0.1)
      if (this.lfoGain) this.lfoGain.gain.setTargetAtTime(0.0015, t, 0.15)
    }
  }

  stop() {
    if (!this.gain || !this.ctx) return
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
