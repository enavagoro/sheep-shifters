import { BOUNDS, COLORS, CORRAL, TUNING } from '../config.js';

export class SpikeHazards {
  constructor(scene) {
    this.scene = scene;
    this.spikes = [];
    this.timer = TUNING.spikeFirstDelay;
    this.phase = 'idle';
    this.phaseTimer = 0;
  }

  update(dt, { level = 1, paused = false, locked = false } = {}) {
    if (paused) return { changed: false, hits: [] };

    if (level < TUNING.spikeStartLevel) {
      if (this.spikes.length) {
        this.clear();
        return { changed: true, hits: [] };
      }
      return { changed: false, hits: [] };
    }

    let changed = false;
    const hits = [];

    if (this.phase === 'warn' || this.phase === 'live') {
      this.phaseTimer -= dt;
      for (const spike of this.spikes) {
        spike.pulse = (spike.pulse || 0) + dt * 10;
        if (spike.phase === 'warn' && spike.gfx) {
          spike.gfx.setAlpha(0.25 + Math.sin(spike.pulse) * 0.2);
        } else if (spike.phase === 'live' && spike.gfx) {
          spike.gfx.setAlpha(0.75 + Math.sin(spike.pulse) * 0.15);
        }
      }

      if (this.phase === 'live') {

      }

      if (this.phaseTimer <= 0) {
        if (this.phase === 'warn') {
          this.makeLive();
          this.phase = 'live';
          this.phaseTimer = TUNING.spikeDuration;
          changed = true;
        } else {
          this.clear();
          this.phase = 'idle';
          this.timer = TUNING.spikeInterval;
          changed = true;
        }
      }
    } else if (!locked) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.beginWave();
        this.phase = 'warn';
        this.phaseTimer = TUNING.spikeWarn;
        changed = true;
      }
    }

    return { changed, hits };
  }

  beginWave() {
    this.clear();
    const specs = pickEdgeSpikeLayout();
    for (const spec of specs) {
      const gfx = this.scene.add.graphics().setDepth(3);
      drawSpikes(gfx, spec);
      gfx.setAlpha(0.3);
      this.spikes.push({
        phase: 'warn',
        pulse: Math.random() * 8,
        gfx,
        hit: {
          left: spec.x,
          top: spec.y,
          right: spec.x + spec.w,
          bottom: spec.y + spec.h,
          edge: spec.edge,
        },
      });
    }
  }

  makeLive() {
    for (const spike of this.spikes) {
      spike.phase = 'live';
      spike.gfx?.setAlpha(0.9);
    }
  }

  liveHitboxes() {
    return this.spikes
      .filter((spike) => spike.phase === 'live')
      .map((spike) => spike.hit);
  }

  clear() {
    for (const spike of this.spikes) spike.gfx?.destroy?.();
    this.spikes = [];
  }

  destroy() {
    this.clear();
  }
}

const SPIKE_STEP = 16;
const SPIKE_INSET = 2;

function snap(value, step = SPIKE_STEP) {
  return Math.round(value / step) * step;
}

function snapSeg(start, length, min, max) {
  let s = snap(Math.max(min, start));
  let len = Math.max(SPIKE_STEP * 2, snap(length));
  if (s + len > max) {
    s = snap(max - len);
    if (s < min) {
      s = snap(min);
      len = Math.max(SPIKE_STEP * 2, snap(max - s));
    }
  }
  if (s + len > max) len = Math.max(SPIKE_STEP, snap(max - s));
  return { start: s, length: len };
}

function pickEdgeSpikeLayout() {
  const depth = snap(TUNING.spikeDepth);
  const pad = snap(48);
  const gatePad = 32;
  const edges = shuffle(['left', 'right', 'top', 'bottom']);

  const count = Math.random() < 0.45 ? 1 : 2;
  const chosen = edges.slice(0, count);
  const specs = [];

  for (const edge of chosen) {
    if (edge === 'left') {
      const top = BOUNDS.top + pad;
      const bot = BOUNDS.bottom - pad;
      const len = bot - top;
      const rawSeg = len * (0.35 + Math.random() * 0.35);
      const rawStart = top + Math.random() * Math.max(SPIKE_STEP, len - rawSeg);
      const { start, length } = snapSeg(rawStart, rawSeg, top, bot);
      specs.push({
        edge,
        x: BOUNDS.left + SPIKE_INSET,
        y: start,
        w: depth,
        h: length,
      });
    } else if (edge === 'right') {
      const top = BOUNDS.top + pad;
      const bot = Math.min(BOUNDS.bottom - pad, CORRAL.y - gatePad);
      if (bot - top > 80) {
        const len = bot - top;
        const rawSeg = len * (0.3 + Math.random() * 0.4);
        const rawStart = top + Math.random() * Math.max(SPIKE_STEP, len - rawSeg);
        const { start, length } = snapSeg(rawStart, rawSeg, top, bot);
        specs.push({
          edge,
          x: BOUNDS.right - depth - SPIKE_INSET,
          y: start,
          w: depth,
          h: length,
        });
      }
      const top2 = Math.max(BOUNDS.top + pad, CORRAL.y + CORRAL.h + gatePad);
      const bot2 = BOUNDS.bottom - pad;
      if (bot2 - top2 > 80) {
        const len = bot2 - top2;
        const rawSeg = len * (0.3 + Math.random() * 0.4);
        const rawStart = top2 + Math.random() * Math.max(SPIKE_STEP, len - rawSeg);
        const { start, length } = snapSeg(rawStart, rawSeg, top2, bot2);
        specs.push({
          edge,
          x: BOUNDS.right - depth - SPIKE_INSET,
          y: start,
          w: depth,
          h: length,
        });
      }
    } else if (edge === 'top') {
      const left = BOUNDS.left + pad;
      const right = Math.min(BOUNDS.right - pad, CORRAL.x - gatePad);
      const len = right - left;
      if (len > 100) {
        const rawSeg = len * (0.35 + Math.random() * 0.4);
        const rawStart = left + Math.random() * Math.max(SPIKE_STEP, len - rawSeg);
        const { start, length } = snapSeg(rawStart, rawSeg, left, right);
        specs.push({
          edge,
          x: start,
          y: BOUNDS.top + SPIKE_INSET,
          w: length,
          h: depth,
        });
      }
    } else if (edge === 'bottom') {
      const left = BOUNDS.left + pad;
      const right = BOUNDS.right - pad;
      const len = right - left;
      const rawSeg = len * (0.3 + Math.random() * 0.4);
      const rawStart = left + Math.random() * Math.max(SPIKE_STEP, len - rawSeg);
      const { start, length } = snapSeg(rawStart, rawSeg, left, right);
      specs.push({
        edge,
        x: start,
        y: BOUNDS.bottom - depth - SPIKE_INSET,
        w: length,
        h: depth,
      });
    }
  }

  return specs.filter((s) => s.w >= SPIKE_STEP * 2 && s.h >= SPIKE_STEP * 2);
}

function drawSpikes(gfx, spec) {
  const color = COLORS.wolfEdge;
  const step = SPIKE_STEP;
  const tip = 10;
  gfx.clear();
  gfx.fillStyle(color, 0.4);
  gfx.fillRect(spec.x, spec.y, spec.w, spec.h);

  if (spec.edge === 'left') {
    const teeth = Math.floor(spec.h / step);
    for (let i = 0; i < teeth; i += 1) {
      const y = spec.y + i * step;
      gfx.fillStyle(color, 0.95);
      gfx.fillTriangle(
        spec.x + spec.w,
        y + 1,
        spec.x + spec.w,
        y + step - 1,
        spec.x + spec.w + tip,
        y + step * 0.5,
      );
    }
  } else if (spec.edge === 'right') {
    const teeth = Math.floor(spec.h / step);
    for (let i = 0; i < teeth; i += 1) {
      const y = spec.y + i * step;
      gfx.fillStyle(color, 0.95);
      gfx.fillTriangle(
        spec.x,
        y + 1,
        spec.x,
        y + step - 1,
        spec.x - tip,
        y + step * 0.5,
      );
    }
  } else if (spec.edge === 'top') {
    const teeth = Math.floor(spec.w / step);
    for (let i = 0; i < teeth; i += 1) {
      const x = spec.x + i * step;
      gfx.fillStyle(color, 0.95);
      gfx.fillTriangle(
        x + 1,
        spec.y + spec.h,
        x + step - 1,
        spec.y + spec.h,
        x + step * 0.5,
        spec.y + spec.h + tip,
      );
    }
  } else {
    const teeth = Math.floor(spec.w / step);
    for (let i = 0; i < teeth; i += 1) {
      const x = spec.x + i * step;
      gfx.fillStyle(color, 0.95);
      gfx.fillTriangle(
        x + 1,
        spec.y,
        x + step - 1,
        spec.y,
        x + step * 0.5,
        spec.y - tip,
      );
    }
  }
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
