import { TUNING } from '../config.js';
import { getSfx } from './Sfx.js';

const BASS = [
  55, 0, 55, 0, 55, 0, 41.2, 0,
  55, 0, 65.41, 0, 55, 0, 49, 0,
  43.65, 0, 43.65, 0, 41.2, 0, 41.2, 0,
  36.71, 0, 41.2, 0, 55, 0, 49, 0,
];

const LEAD = [
  440, 0, 0, 523.25, 0, 0, 659.25, 0,
  0, 880, 0, 783.99, 0, 0, 659.25, 0,
  698.46, 0, 0, 659.25, 0, 0, 587.33, 0,
  0, 659.25, 0, 523.25, 0, 0, 440, 0,
];

let shared = null;

export function getMusic() {
  if (!shared) shared = new Music();
  return shared;
}

class Music {
  constructor() {
    this.bpm = TUNING.bpm;
    this.ctx = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.beatAt = 0;
    this.holding = false;
    this.wasPaused = false;
    this.musicMuted = false;
    this.musicLevel = 0.32;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      getSfx().attach(this.ctx);
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;
    getSfx().attach(ctx);

    this.master = ctx.createGain();
    this.master.gain.value = this.musicMuted ? 0.0001 : this.musicLevel;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.18;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 3200;
    this.filter.Q.value = 0.7;

    this.filter.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);

    const noiseLength = Math.floor(ctx.sampleRate * 0.25);
    this.noise = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const channel = this.noise.getChannelData(0);
    for (let i = 0; i < noiseLength; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }

    this.step = 0;
    this.beats = [];
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.beatAt = ctx.currentTime;
  }

  stop() {
    if (!this.ctx) return;
    this.ctx.close();
    this.ctx = null;
  }

  setMusicMuted(muted) {
    this.musicMuted = muted;
    this.applyGain(this.wasPaused);
  }

  toggleMusicMuted() {
    this.setMusicMuted(!this.musicMuted);
    return this.musicMuted;
  }

  applyGain(paused) {
    if (!this.ctx || !this.master) return;
    const silent = paused || this.musicMuted;
    this.master.gain.setTargetAtTime(silent ? 0.0001 : this.musicLevel, this.ctx.currentTime, 0.04);
  }

  tick(paused) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    if (paused !== this.wasPaused) {
      this.applyGain(paused);
      this.wasPaused = paused;
    }

    if (paused || this.musicMuted) {
      this.holding = true;
      return;
    }

    if (this.holding) {
      this.nextNoteTime = now + 0.04;
      this.holding = false;
    }

    if (this.nextNoteTime < now) this.nextNoteTime = now + 0.02;

    const horizon = now + 0.12;
    while (this.nextNoteTime < horizon) {
      this.playStep(this.step, this.nextNoteTime);
      const stepDuration = (60 / this.bpm) / 4;
      this.nextNoteTime += stepDuration;
      this.step = (this.step + 1) % BASS.length;
    }
  }

  energy() {
    if (!this.ctx || !this.beats) return 0;
    const now = this.ctx.currentTime;
    let last = 0;
    for (const beat of this.beats) {
      if (beat <= now && beat > last) last = beat;
    }
    if (!last) return 0;
    return Math.exp(-(now - last) * 9);
  }

  playStep(step, time) {
    if (step % 4 === 0) {
      this.beats.push(time);
      if (this.beats.length > 8) this.beats.shift();
      this.playKick(time);
    }
    if (step % 8 === 4) this.playClap(time);
    this.playHat(time, step % 2 === 0);
    if (BASS[step]) this.playTone(BASS[step], time, 'square', 0.11, 0.09);
    if (LEAD[step]) this.playTone(LEAD[step], time, 'sawtooth', 0.16, 0.045);
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(168, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + 0.12);
    gain.gain.setValueAtTime(0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(gain);
    gain.connect(this.comp);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  playClap(time) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.comp);
    source.start(time);
    source.stop(time + 0.14);
  }

  playHat(time, open) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(open ? 0.045 : 0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (open ? 0.05 : 0.03));
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.filter);
    source.start(time);
    source.stop(time + 0.06);
  }

  playTone(frequency, time, type, duration, level) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.filter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shared?.stop();
    shared = null;
  });
}
