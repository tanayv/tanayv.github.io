/**
 * Scratching sound, synthesised: band-passed noise whose loudness and pitch
 * follow the hand, with dry crackles while the coin is actually biting latex.
 * Silent until the first press, as browsers require.
 */
export class ScratchSound {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private band: BiquadFilterNode | null = null;
  private crackle: GainNode | null = null;

  private ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // pinkish noise with sparse clicks baked in
    let b = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b = 0.97 * b + 0.03 * w;
      data[i] = w * 0.55 + b * 2.2 + (Math.random() < 0.0016 ? (Math.random() - 0.5) * 3 : 0);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 700;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2600;
    band.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const crackle = ctx.createGain();
    crackle.gain.value = 0;
    src.connect(hp).connect(band).connect(gain).connect(ctx.destination);
    hp.connect(crackle).connect(ctx.destination);
    src.start();
    this.ctx = ctx;
    this.gain = gain;
    this.band = band;
    this.crackle = crackle;
    return ctx;
  }

  start() {
    const ctx = this.ensure();
    if (ctx?.state === "suspended") void ctx.resume();
  }

  /** speed in px/ms; biting = latex was removed on this move */
  feed(speed: number, biting: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.gain || !this.band || !this.crackle) return;
    const t = ctx.currentTime;
    const v = Math.min(1, speed / 2.2);
    this.gain.gain.setTargetAtTime((biting ? 0.22 : 0.07) * v, t, 0.02);
    this.band.frequency.setTargetAtTime(1800 + v * 2600 + (biting ? 0 : 1400), t, 0.03);
    if (biting && Math.random() < 0.35) {
      this.crackle.gain.cancelScheduledValues(t);
      this.crackle.gain.setValueAtTime(0.05 + Math.random() * 0.08, t);
      this.crackle.gain.exponentialRampToValueAtTime(0.0001, t + 0.012 + Math.random() * 0.02);
    }
  }

  stop() {
    if (!this.ctx || !this.gain) return;
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }

  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
