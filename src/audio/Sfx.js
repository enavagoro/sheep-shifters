let shared = null;

const SAMPLES = {
  bark: { url: 'assets/sfx/bark.mp3', level: 0.45, duck: 0.5 },
  sheepwolfBleat: { url: 'assets/sfx/sheep.mp3', level: 0.4, duck: 0.6, rate: 0.8, fallback: 'sheepwolf' },
};

export function getSfx() {
  if (!shared) shared = new Sfx();
  return shared;
}

class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.baseLevel = 1.2;
    this.onPlay = null;
    this.volume = 1;
  }

  attach(ctx) {
    if (!ctx || this.ctx === ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0.0001 : this.effectiveLevel();
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 4;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.1;
    this.master.connect(this.limiter);
    this.limiter.connect(ctx.destination);
    this.samples = {};
    const byUrl = {};
    for (const [kind, info] of Object.entries(SAMPLES)) {
      byUrl[info.url] ??= this.decodeSample(ctx, info.url);
      byUrl[info.url].then((buffer) => {
        if (buffer && this.ctx === ctx) this.samples[kind] = buffer;
      });
    }
  }

  async decodeSample(ctx, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await ctx.decodeAudioData(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  playSample(kind, time) {
    const buffer = this.samples?.[kind];
    if (!buffer) return false;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = SAMPLES[kind].rate ?? 1;
    const gain = this.ctx.createGain();
    gain.gain.value = SAMPLES[kind].level;
    source.connect(gain);
    gain.connect(this.master);
    source.start(time);
    return true;
  }

  effectiveLevel() {
    return this.baseLevel * this.volume;
  }

  setVolume(volume) {
    const n = Number(volume);
    this.volume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
    this.applyGain();
  }

  applyGain() {
    if (!this.master || !this.ctx) return;
    const silent = this.muted || this.volume <= 0.001;
    this.master.gain.setTargetAtTime(
      silent ? 0.0001 : this.effectiveLevel(),
      this.ctx.currentTime,
      0.03,
    );
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyGain();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(kind = 'blip') {
    if (this.muted || !this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const sample = SAMPLES[kind];
    if (sample && this.samples?.[kind]) {
      this.lastSample ??= {};
      if (sample.cooldown && now - (this.lastSample[kind] ?? -1) < sample.cooldown) return;
      this.lastSample[kind] = now;
      this.onPlay?.(sample.duck);
      this.playSample(kind, now);
      return;
    }
    if (sample?.fallback) kind = sample.fallback;
    if (kind === 'hurt') this.onPlay?.(0.25);
    if (kind === 'switch') this.tone(now, 660, 0.06, 'square', 0.08);
    else if (kind === 'score') this.tone(now, 880, 0.08, 'square', 0.07);
    else if (kind === 'kill') this.kill(now);
    else if (kind === 'hurt') {
      this.tone(now, 180, 0.16, 'sawtooth', 0.12);
      this.tone(now + 0.05, 120, 0.18, 'square', 0.1);
    }
    else if (kind === 'ui') this.tone(now, 520, 0.04, 'square', 0.05);
    else if (kind === 'expand') this.expandSweep(now, true);
    else if (kind === 'contract') this.expandSweep(now, false);
    else if (kind === 'bark' || kind === 'menuBark') this.bark(now);
    else if (kind === 'sheepwolf') this.sheepWolfAppear(now);
    else this.tone(now, 440, 0.05, 'square', 0.06);
  }

  expandSweep(now, open) {
    const notes = open
      ? [320, 400, 500, 640, 800]
      : [800, 640, 500, 400, 280];
    notes.forEach((freq, i) => {
      this.tone(now + i * 0.055, freq, 0.09, 'square', 0.055);
      this.tone(now + i * 0.055 + 0.02, freq * 1.5, 0.06, 'triangle', 0.03);
    });
  }

  kill(now) {
    this.tone(now, 1046, 0.05, 'square', 0.14);
    this.slide(now, 520, 90, 0.2, 'sawtooth', 0.22);
    this.slide(now + 0.01, 260, 60, 0.18, 'square', 0.14);
  }

  bark(now) {
    this.slide(now, 720, 380, 0.09, 'square', 0.11);
    this.slide(now + 0.1, 640, 300, 0.08, 'square', 0.09);
    this.tone(now + 0.02, 180, 0.06, 'triangle', 0.04);
  }

  sheepWolfAppear(now) {
    this.slide(now, 520, 360, 0.16, 'triangle', 0.07);
    this.slide(now + 0.08, 480, 300, 0.14, 'sine', 0.05);
    this.slide(now + 0.04, 140, 90, 0.22, 'sawtooth', 0.055);
    this.tone(now + 0.2, 220, 0.08, 'square', 0.04);
  }

  slide(time, from, to, duration, type, level) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), time + duration);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  tone(time, frequency, duration, type, level) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shared = null;
  });
}
