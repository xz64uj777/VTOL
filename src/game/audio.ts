/** Distinct Osprey proprotor slap vs F-35 jet roar via WebAudio. */

import type { BirdKind } from './types'

export class FlightAudio {
  private ctx: AudioContext | null = null
  private oscA: OscillatorNode | null = null
  private oscB: OscillatorNode | null = null
  private oscC: OscillatorNode | null = null
  private oscD: OscillatorNode | null = null
  private gain: GainNode | null = null
  private thumpGain: GainNode | null = null
  private roarGain: GainNode | null = null
  private screamGain: GainNode | null = null
  private masterGain: GainNode | null = null
  private filter: BiquadFilterNode | null = null
  private roarFilter: BiquadFilterNode | null = null
  private screamFilter: BiquadFilterNode | null = null
  private lfo: OscillatorNode | null = null
  private lfoGain: GainNode | null = null
  private noise: AudioBufferSourceNode | null = null
  private noiseGain: GainNode | null = null
  private noiseFilter: BiquadFilterNode | null = null
  private started = false
  private muted = false
  private bird: BirdKind = 'osprey'
  private routedF35 = false

  ensure() {
    if (this.ctx) return
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()

    this.gain = this.ctx.createGain()
    this.gain.gain.value = 0
    this.masterGain = this.ctx.createGain()
    this.masterGain.gain.value = this.muted ? 0 : 1
    this.gain.connect(this.masterGain)
    this.masterGain.connect(this.ctx.destination)

    this.filter = this.ctx.createBiquadFilter()
    this.filter.connect(this.gain)

    this.oscA = this.ctx.createOscillator()
    this.oscB = this.ctx.createOscillator()
    this.oscC = this.ctx.createOscillator()
    this.oscD = this.ctx.createOscillator()
    this.thumpGain = this.ctx.createGain()
    this.roarGain = this.ctx.createGain()
    this.screamGain = this.ctx.createGain()
    this.roarFilter = this.ctx.createBiquadFilter()
    this.screamFilter = this.ctx.createBiquadFilter()

    // Default Osprey routing: A/B -> filter, C -> thump -> filter
    this.oscA.connect(this.filter)
    this.oscB.connect(this.filter)
    this.oscC.connect(this.thumpGain)
    this.thumpGain.connect(this.filter)

    // F-35 deep roar path (always connected; gain zeroed for Osprey)
    this.oscD.connect(this.roarGain)
    this.roarGain.connect(this.roarFilter)
    this.roarFilter.connect(this.gain)
    this.roarGain.gain.value = 0

    // Scream bus (F-35 mid jet); zeroed for Osprey
    this.screamFilter.connect(this.screamGain)
    this.screamGain.connect(this.gain)
    this.screamGain.gain.value = 0

    // Brown-ish noise for jet grit / afterburner rumble
    const len = Math.floor(this.ctx.sampleRate * 1.5)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    this.noise = this.ctx.createBufferSource()
    this.noise.buffer = buf
    this.noise.loop = true
    this.noiseGain = this.ctx.createGain()
    this.noiseGain.gain.value = 0
    this.noiseFilter = this.ctx.createBiquadFilter()
    this.noiseFilter.type = 'lowpass'
    this.noiseFilter.frequency.value = 180
    this.noiseFilter.Q.value = 0.7
    this.noise.connect(this.noiseFilter)
    this.noiseFilter.connect(this.noiseGain)
    this.noiseGain.connect(this.gain)

    this.lfo = this.ctx.createOscillator()
    this.lfo.type = 'square'
    this.lfo.frequency.value = 5.2
    this.lfoGain = this.ctx.createGain()
    this.lfoGain.gain.value = 0
    this.lfo.connect(this.lfoGain)
    this.lfoGain.connect(this.gain.gain)

    this.applyBirdTimbre('osprey')
  }

  private routeOsprey() {
    if (!this.oscA || !this.oscB || !this.filter) return
    try {
      this.oscA.disconnect()
      this.oscB.disconnect()
    } catch {
      /* ok */
    }
    this.oscA.connect(this.filter)
    this.oscB.connect(this.filter)
    this.routedF35 = false
  }

  private routeF35() {
    if (!this.oscA || !this.oscB || !this.filter || !this.screamFilter) return
    try {
      this.oscA.disconnect()
      this.oscB.disconnect()
    } catch {
      /* ok */
    }
    // Mid scream through bandpass + some through main filter
    this.oscA.connect(this.screamFilter)
    this.oscB.connect(this.filter)
    this.oscB.connect(this.screamFilter)
    this.routedF35 = true
  }

  private applyBirdTimbre(bird: BirdKind) {
    if (
      !this.oscA ||
      !this.oscB ||
      !this.oscC ||
      !this.oscD ||
      !this.thumpGain ||
      !this.roarGain ||
      !this.screamGain ||
      !this.filter ||
      !this.roarFilter ||
      !this.screamFilter ||
      !this.lfo ||
      !this.lfoGain ||
      !this.noiseGain
    )
      return
    this.bird = bird
    if (bird === 'osprey') {
      if (this.routedF35) this.routeOsprey()
      this.oscA.type = 'sawtooth'
      this.oscB.type = 'square'
      this.oscC.type = 'sine'
      this.oscD.type = 'sine'
      this.oscA.frequency.value = 42
      this.oscB.frequency.value = 62
      this.oscC.frequency.value = 24
      this.oscD.frequency.value = 30
      this.thumpGain.gain.value = 0.58
      this.roarGain.gain.value = 0
      this.screamGain.gain.value = 0
      this.noiseGain.gain.value = 0
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 260
      this.filter.Q.value = 0.85
      this.roarFilter.type = 'lowpass'
      this.roarFilter.frequency.value = 200
      this.screamFilter.type = 'bandpass'
      this.screamFilter.frequency.value = 800
      this.lfo.type = 'square'
      this.lfo.frequency.value = 5.2
      this.lfoGain.gain.value = 0.022
    } else {
      if (!this.routedF35) this.routeF35()
      // Fighter jet: deep roar ~80–180 Hz, mid scream, AB rumble at high THR / CTOL
      this.oscA.type = 'sawtooth'
      this.oscB.type = 'sawtooth'
      this.oscC.type = 'triangle'
      this.oscD.type = 'sawtooth'
      this.oscA.frequency.value = 320
      this.oscB.frequency.value = 540
      this.oscC.frequency.value = 95
      this.oscD.frequency.value = 95
      this.thumpGain.gain.value = 0
      this.roarGain.gain.value = 0.5
      this.screamGain.gain.value = 0.2
      this.noiseGain.gain.value = 0.08
      this.filter.type = 'lowpass'
      this.filter.frequency.value = 1400
      this.filter.Q.value = 0.6
      this.roarFilter.type = 'lowpass'
      this.roarFilter.frequency.value = 160
      this.roarFilter.Q.value = 0.9
      this.screamFilter.type = 'bandpass'
      this.screamFilter.frequency.value = 1100
      this.screamFilter.Q.value = 1.1
      this.lfo.type = 'sine'
      this.lfo.frequency.value = 0.55
      this.lfoGain.gain.value = 0.004
    }
  }

  start() {
    this.ensure()
    if (
      !this.ctx ||
      !this.oscA ||
      !this.oscB ||
      !this.oscC ||
      !this.oscD ||
      !this.lfo ||
      !this.noise ||
      this.started
    )
      return
    try {
      void this.ctx.resume()
      this.oscA.start()
      this.oscB.start()
      this.oscC.start()
      this.oscD.start()
      this.lfo.start()
      this.noise.start()
      this.started = true
    } catch {
      /* already started */
    }
  }

  /** Immediately silence/resume the output bus (no setTarget fade or menu leak). */
  mute(on: boolean) {
    this.muted = on
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(t)
    this.masterGain.gain.setValueAtTime(on ? 0 : 1, t)
  }

  /**
   * @param rpm rotor/fan cue 0..1
   * @param tcl power
   * @param modeBlend Osprey: nacelleDeg 0..90; F-35: vectorPos 0..1 (VL=1)
   * @param bird osprey | f35
   */
  update(rpm: number, tcl: number, modeBlend: number, bird: BirdKind = 'osprey') {
    if (
      !this.ctx ||
      !this.oscA ||
      !this.oscB ||
      !this.oscC ||
      !this.oscD ||
      !this.gain ||
      !this.thumpGain ||
      !this.roarGain ||
      !this.screamGain ||
      !this.filter ||
      !this.roarFilter ||
      !this.screamFilter ||
      !this.noiseGain ||
      !this.noiseFilter ||
      !this.started
    )
      return
    if (bird !== this.bird) this.applyBirdTimbre(bird)

    const t = this.ctx.currentTime
    if (bird === 'osprey') {
      const hel = Math.sin((modeBlend * Math.PI) / 180)
      const base = 36 + rpm * 56
      const aplLift = (1 - hel) * 22
      this.oscA.frequency.setTargetAtTime(base + aplLift, t, 0.08)
      this.oscB.frequency.setTargetAtTime(base * 1.48 + aplLift * 0.65, t, 0.08)
      this.oscC.frequency.setTargetAtTime(base * 0.52, t, 0.1)
      this.thumpGain.gain.setTargetAtTime(0.48 + rpm * 0.18, t, 0.12)
      this.roarGain.gain.setTargetAtTime(0, t, 0.1)
      this.screamGain.gain.setTargetAtTime(0, t, 0.1)
      this.noiseGain.gain.setTargetAtTime(0, t, 0.1)
      this.filter.frequency.setTargetAtTime(190 + rpm * 105 + (1 - hel) * 48, t, 0.1)
      const vol = Math.min(0.105, 0.022 + rpm * 0.055 + tcl * 0.024)
      this.gain.gain.setTargetAtTime(vol, t, 0.08)
      if (this.lfoGain) {
        this.lfoGain.gain.setTargetAtTime(0.014 + rpm * 0.014 + tcl * 0.004, t, 0.1)
      }
    } else {
      // vectorPos: 1 = VL fan, 0 = CTOL jet
      const vl = clamp01(modeBlend)
      const ctol = 1 - vl
      const stovl = vl > 0.15 && vl < 0.85 ? 1 : 0

      // Deep roar 80–180 Hz — fighter belly, not mosquito
      const roarHz = 82 + rpm * 55 + ctol * 40 + tcl * 28
      this.oscD.frequency.setTargetAtTime(clamp(roarHz, 75, 190), t, 0.07)
      this.roarFilter.frequency.setTargetAtTime(120 + ctol * 70 + rpm * 40, t, 0.1)
      this.roarGain.gain.setTargetAtTime(0.28 + ctol * 0.35 + tcl * 0.18 + stovl * 0.08, t, 0.1)

      // Mid jet scream
      const scream = 240 + rpm * 220 + ctol * 180 + tcl * 90
      this.oscA.frequency.setTargetAtTime(scream, t, 0.06)
      this.oscB.frequency.setTargetAtTime(scream * 1.72, t, 0.06)
      this.screamFilter.frequency.setTargetAtTime(900 + ctol * 500 + rpm * 250, t, 0.08)
      this.screamFilter.Q.setTargetAtTime(0.9 + ctol * 0.5, t, 0.1)
      this.screamGain.gain.setTargetAtTime(0.12 + ctol * 0.2 + tcl * 0.12, t, 0.1)

      // VL/fan residual (higher, thinner)
      this.oscC.frequency.setTargetAtTime(70 + rpm * 80 + vl * 40, t, 0.08)
      this.thumpGain.gain.setTargetAtTime(vl * (0.12 + rpm * 0.1), t, 0.12)

      // Afterburner rumble: high THR + vector low (CTOL)
      const ab = clamp01((tcl - 0.55) / 0.45) * clamp01((0.35 - vl) / 0.35)
      this.noiseFilter.frequency.setTargetAtTime(140 + ctol * 80 + ab * 120, t, 0.1)
      this.noiseGain.gain.setTargetAtTime(0.04 + ctol * 0.07 + ab * 0.1 + tcl * 0.03, t, 0.1)

      this.filter.frequency.setTargetAtTime(700 + rpm * 400 + ctol * 500, t, 0.08)
      this.filter.Q.setTargetAtTime(0.5 + ctol * 0.4, t, 0.1)

      const vol = Math.min(0.12, 0.028 + rpm * 0.04 + tcl * 0.04 + ctol * 0.018)
      this.gain.gain.setTargetAtTime(vol, t, 0.09)
      if (this.lfoGain) this.lfoGain.gain.setTargetAtTime(0.002 + ab * 0.006, t, 0.15)
    }
  }

  stop() {
    this.mute(true)
    if (!this.gain || !this.ctx) return
    const t = this.ctx.currentTime
    this.gain.gain.cancelScheduledValues(t)
    this.gain.gain.setValueAtTime(0, t)
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
