import { getSfx } from './Sfx.js';

const GAME_TRACK_SECONDS = 30;

// Menú: electrónica 8-bit calmada
const MENU = {
  bpm: 92,
  bass: [
    55, 0, 0, 55, 0, 0, 41.2, 0,
    55, 0, 0, 65.41, 0, 0, 49, 0,
    43.65, 0, 0, 43.65, 0, 0, 36.71, 0,
    41.2, 0, 0, 49, 0, 0, 55, 0,
  ],
  lead: [
    0, 0, 523.25, 0, 0, 659.25, 0, 0,
    587.33, 0, 0, 523.25, 0, 0, 440, 0,
    0, 0, 493.88, 0, 0, 587.33, 0, 0,
    523.25, 0, 0, 392, 0, 0, 440, 0,
  ],
  pad: [
    220, 0, 0, 0, 0, 0, 0, 0,
    196, 0, 0, 0, 0, 0, 0, 0,
    174.61, 0, 0, 0, 0, 0, 0, 0,
    196, 0, 0, 0, 0, 0, 0, 0,
  ],
  drums: 'soft',
};

// Juego A: chase chip
const GAME_A = {
  bpm: 168,
  bass: [
    55, 0, 55, 0, 55, 0, 41.2, 0,
    55, 0, 65.41, 0, 55, 0, 49, 0,
    43.65, 0, 43.65, 0, 41.2, 0, 41.2, 0,
    36.71, 0, 41.2, 0, 55, 0, 49, 0,
  ],
  lead: [
    440, 0, 0, 523.25, 0, 0, 659.25, 0,
    0, 880, 0, 783.99, 0, 0, 659.25, 0,
    698.46, 0, 0, 659.25, 0, 0, 587.33, 0,
    0, 659.25, 0, 523.25, 0, 0, 440, 0,
  ],
  pad: null,
  drums: 'drive',
};

// Juego B: pulse nocturno (se intercala ~cada 30s)
const GAME_B = {
  bpm: 168,
  bass: [
    61.74, 0, 61.74, 0, 49, 0, 49, 0,
    55, 0, 55, 0, 73.42, 0, 61.74, 0,
    46.25, 0, 46.25, 0, 41.2, 0, 55, 0,
    61.74, 0, 73.42, 0, 82.41, 0, 61.74, 0,
  ],
  lead: [
    493.88, 0, 0, 587.33, 0, 0, 739.99, 0,
    0, 987.77, 0, 880, 0, 0, 739.99, 0,
    830.61, 0, 0, 739.99, 0, 0, 659.25, 0,
    0, 587.33, 0, 493.88, 0, 0, 554.37, 0,
  ],
  pad: null,
  drums: 'drive',
};

let shared = null;

export function getMusic() {
  if (!shared) shared = new Music();
  return shared;
}

class Music {
  constructor() {
    this.mode = 'menu';
    this.gameIndex = 0;
    this.track = MENU;
    this.bpm = MENU.bpm;
    this.ctx = null;
    this.step = 0;
    this.trackElapsed = 0;
    this.nextNoteTime = 0;
    this.beatAt = 0;
    this.holding = false;
    this.wasPaused = false;
    this.musicMuted = false;
    this.baseLevel = 0.3;
    this.volume = 1;
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
    this.master.gain.value = this.musicMuted ? 0.0001 : this.effectiveLevel();

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.knee.value = 8;
    this.comp.ratio.value = 3.2;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.18;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.mode === 'menu' ? 2400 : 3400;
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
    this.trackElapsed = 0;
    this.beats = [];
    this.nextNoteTime = ctx.currentTime + 0.06;
    this.beatAt = ctx.currentTime;
  }

  stop() {
    if (!this.ctx) return;
    this.ctx.close();
    this.ctx = null;
  }

  setMode(mode) {
    const next = mode === 'game' ? 'game' : 'menu';
    if (this.mode === next) return;
    this.mode = next;
    this.gameIndex = 0;
    this.step = 0;
    this.trackElapsed = 0;
    this.applyTrack();
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      this.filter.frequency.setTargetAtTime(
        next === 'menu' ? 2400 : 3400,
        this.ctx.currentTime,
        0.08,
      );
      this.baseLevel = next === 'menu' ? 0.26 : 0.32;
      this.applyGain(this.wasPaused);
    }
  }

  effectiveLevel() {
    return this.baseLevel * this.volume;
  }

  setVolume(volume) {
    const n = Number(volume);
    this.volume = Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
    this.applyGain(this.wasPaused);
  }

  applyTrack() {
    if (this.mode === 'menu') {
      this.track = MENU;
    } else {
      this.track = this.gameIndex === 0 ? GAME_A : GAME_B;
    }
    this.bpm = this.track.bpm;
  }

  advanceTrackIfNeeded(stepDuration) {
    if (this.mode !== 'game') return;
    this.trackElapsed += stepDuration * this.track.bass.length;
    if (this.trackElapsed < GAME_TRACK_SECONDS) return;
    this.trackElapsed = 0;
    this.gameIndex = this.gameIndex === 0 ? 1 : 0;
    this.applyTrack();
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
    const silent = paused || this.musicMuted || this.volume <= 0.001;
    this.master.gain.setTargetAtTime(silent ? 0.0001 : this.effectiveLevel(), this.ctx.currentTime, 0.04);
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
      const len = this.track.bass.length;
      const next = (this.step + 1) % len;
      if (next === 0) this.advanceTrackIfNeeded(stepDuration);
      this.step = next;
    }
  }

  energy() {
    if (!this.ctx || !this.beats) return 0;
    const now = this.ctx.currentTime;
    let last = 0;
    let strength = 1;
    for (const beat of this.beats) {
      const t = typeof beat === 'number' ? beat : beat.t;
      const s = typeof beat === 'number' ? 1 : beat.s;
      if (t <= now && t > last) {
        last = t;
        strength = s;
      }
    }
    if (!last) return 0;
    return Math.exp(-(now - last) * 7.5) * strength;
  }

  playStep(step, time) {
    const soft = this.track.drums === 'soft';
    if (step % 4 === 0) {
      const kick = soft ? (step % 8 === 0 ? 0.7 : 0.35) : 1;
      this.beats.push({ t: time, s: kick });
      if (this.beats.length > 10) this.beats.shift();
      this.playKick(time, soft);
    }
    if (!soft && step % 8 === 4) this.playClap(time);
    if (soft) {
      if (step % 4 === 2) this.playHat(time, false, 0.015);
    } else {
      this.playHat(time, step % 2 === 0);
    }

    if (this.track.bass[step]) {
      this.playTone(
        this.track.bass[step],
        time,
        soft ? 'triangle' : 'square',
        soft ? 0.22 : 0.11,
        soft ? 0.055 : 0.09,
      );
    }
    if (this.track.lead[step]) {
      this.playTone(
        this.track.lead[step],
        time,
        soft ? 'triangle' : 'sawtooth',
        soft ? 0.28 : 0.16,
        soft ? 0.028 : 0.045,
      );
    }
    if (this.track.pad && this.track.pad[step]) {
      this.playTone(this.track.pad[step], time, 'sine', 0.55, 0.035);
      this.playTone(this.track.pad[step] * 1.5, time, 'triangle', 0.5, 0.018);
    }
  }

  playKick(time, soft = false) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(soft ? 130 : 168, time);
    osc.frequency.exponentialRampToValueAtTime(soft ? 42 : 46, time + (soft ? 0.16 : 0.12));
    gain.gain.setValueAtTime(soft ? 0.55 : 0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (soft ? 0.28 : 0.2));
    osc.connect(gain);
    gain.connect(this.comp);
    osc.start(time);
    osc.stop(time + (soft ? 0.3 : 0.22));
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

  playHat(time, open, level) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    const amp = level ?? (open ? 0.045 : 0.02);
    gain.gain.setValueAtTime(amp, time);
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
