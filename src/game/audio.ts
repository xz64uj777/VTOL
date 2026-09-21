/** Soft rotor / prop loop via WebAudio. */

export class FlightAudio {
  private ctx: AudioContext | null = null
  private osc: OscillatorNode | null = null
  private gain: GainNode | null = null
  private started = false

  ensure() {
    if (this.ctx) return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    this.ctx = new AC()
    this.gain = this.ctx.createGain()
    this.gain.gain.value = 0
    this.gain.connect(this.ctx.destination)
    this.osc = this.ctx.createOscillator()
    this.osc.type = 'sawtooth'
    this.osc.frequency.value = 55
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 280
    this.osc.connect(filter)
    filter.connect(this.gain)
  }

  start() {
    this.ensure()
    if (!this.ctx || !this.osc || this.started) return
    try {
      void this.ctx.resume()
      this.osc.start()
      this.started = true
    } catch {
      /* already started */
    }
  }

  update(rpm: number, tcl: number, nacelleDeg: number) {
    if (!this.ctx || !this.osc || !this.gain || !this.started) return
    const hel = Math.sin((nacelleDeg * Math.PI) / 180)
    const f = 48 + rpm * 70 + (1 - hel) * 25
    this.osc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08)
    const vol = Math.min(0.09, 0.015 + rpm * 0.06 + tcl * 0.02)
    this.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1)
  }

  stop() {
    if (!this.gain || !this.ctx) return
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
  }
}
