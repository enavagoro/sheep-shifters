import { BOUNDS, COLORS, CORRAL, TUNING } from '../config.js';

export function createCorralGeometry(spec = CORRAL) {
  const right = spec.x + spec.w;
  const bottom = spec.y + spec.h;
  const thickness = spec.thickness;
  const geometry = {
    outer: { left: spec.x, top: spec.y, right, bottom },
    inner: {
      left: spec.x + thickness,
      top: spec.y + thickness,
      right: right - thickness,
      bottom: bottom - thickness,
    },
    fences: fenceRects(spec),
  };

  return {
    ...geometry,
    contains(x, y) {
      return x > geometry.inner.left
        && x < geometry.inner.right
        && y > geometry.inner.top
        && y < geometry.inner.bottom;
    },
    covers(x, y) {
      return x >= geometry.outer.left
        && x <= geometry.outer.right
        && y >= geometry.outer.top
        && y <= geometry.outer.bottom;
    },
  };
}

export class Corral {
  constructor(scene, spec = CORRAL) {
    this.scene = scene;
    this.x = spec.x;
    this.y = spec.y;
    this.w = spec.w;
    this.h = spec.h;
    this.thickness = spec.thickness;
    this.baseGateStartRel = spec.gateStart - spec.y;
    this.baseGateEndRel = spec.gateEnd - spec.y;
    this.gateStartRel = this.baseGateStartRel;
    this.gateEndRel = this.baseGateEndRel;
    this.gateWiden = 0;
    this.fences = [];
    this.gatePulse = 0;
    this.moveT = 0;
    this.homeX = spec.x;
    this.homeY = spec.y;
    this.rebuildGeometry();
    this.draw(scene);
  }

  update(dt, level = 1) {
    const prevX = this.x;
    const prevY = this.y;
    const motion = corralMotionForLevel(level);

    if (motion.mode === 'still') {
      this.x = this.homeX;
      this.y = this.homeY;
    } else if (motion.mode === 'bob') {
      this.moveT += dt * motion.speed;
      const minY = BOUNDS.top + 18;
      const maxY = BOUNDS.bottom - this.h - 18;
      const mid = Math.max(minY, Math.min(maxY, this.homeY));
      const amp = Math.min(motion.amp, Math.min(mid - minY, maxY - mid));
      this.x = this.homeX;
      this.y = mid + Math.sin(this.moveT) * amp;
    } else {
      this.moveT += dt * motion.speed;
      const cx = (BOUNDS.left + BOUNDS.right) / 2;
      const cy = (BOUNDS.top + BOUNDS.bottom) / 2;
      const pad = 18;
      const maxRx = Math.max(40, Math.min(
        cx - (BOUNDS.left + pad + this.w / 2),
        (BOUNDS.right - pad - this.w / 2) - cx,
      ));
      const maxRy = Math.max(40, Math.min(
        cy - (BOUNDS.top + pad + this.h / 2),
        (BOUNDS.bottom - pad - this.h / 2) - cy,
      ));
      const rx = Math.min(motion.rx, maxRx);
      const ry = Math.min(motion.ry, maxRy);
      this.x = cx + Math.cos(this.moveT) * rx - this.w / 2;
      this.y = cy + Math.sin(this.moveT) * ry - this.h / 2;
    }

    const dx = this.x - prevX;
    const dy = this.y - prevY;
    this.rebuildGeometry();
    this.syncVisuals();
    return { dx, dy, fences: this.fences };
  }

  syncVisuals(forceRedraw = false) {
    this.floor.setPosition(this.x + this.w / 2, this.y + this.h / 2);
    this.label.setPosition(this.x + this.w / 2, this.y + this.thickness + 14);
    this.glow.setPosition(this.x, this.y);
    this.neon.setPosition(this.x, this.y);
    const pulse = this.gatePulse || (this.gateWiden > 0 ? 0.45 : 0);
    if (forceRedraw || pulse !== this.drawnPulse || this.gateWiden !== this.drawnWiden) {
      this.redraw(pulse);
    }
  }

  rebuildGeometry() {
    Object.assign(this, createCorralGeometry({
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      thickness: this.thickness,
      gateStart: this.y + this.gateStartRel,
      gateEnd: this.y + this.gateEndRel,
    }));
  }

  maxGateWiden() {
    return Math.max(this.baseGateStartRel, this.h - this.baseGateEndRel);
  }

  isLeftOpen() {
    return this.gateStartRel <= 0.5 && this.gateEndRel >= this.h - 0.5;
  }

  setGateWiden(extra) {
    const maxExtra = this.maxGateWiden();
    this.gateWiden = Math.max(0, Math.min(extra, maxExtra));
    this.gateStartRel = Math.max(0, this.baseGateStartRel - this.gateWiden);
    this.gateEndRel = Math.min(this.h, this.baseGateEndRel + this.gateWiden);
    this.rebuildGeometry();
    this.redraw(this.gatePulse || (this.gateWiden > 0 ? 0.45 : 0));
    return this.fences;
  }

  draw(scene) {
    this.floor = scene.add.rectangle(
      this.x + this.w / 2,
      this.y + this.h / 2,
      this.w - 4,
      this.h - 4,
      COLORS.corralFloor,
    );
    this.floor.setAlpha(0.35);
    this.floor.setDepth(0);

    this.glow = scene.add.graphics().setDepth(0);
    this.neon = scene.add.graphics().setDepth(1);
    this.glow.setPosition(this.x, this.y);
    this.neon.setPosition(this.x, this.y);

    this.label = scene.add.text(
      this.x + this.w / 2,
      this.y + this.thickness + 14,
      'CORRAL',
      {
        fontFamily: '"Press Start 2P", "Courier New", monospace',
        fontSize: '10px',
        color: '#39ff6a',
        resolution: 2,
      },
    );
    this.label.setOrigin(0.5, 0);
    this.label.setAlpha(0.7);
    this.label.setDepth(2);

    this.drawnPulse = null;
    this.drawnWiden = null;
    this.redraw(0);
  }

  redraw(pulse = 0) {
    const glowA = 0.18 + pulse * 0.35;
    const lineA = 0.85 + pulse * 0.15;
    const inset = 1;

    this.drawnPulse = pulse;
    this.drawnWiden = this.gateWiden;

    this.glow.clear();
    this.glow.lineStyle(6, COLORS.corralNeon, glowA);
    this.strokeCorral(this.glow, inset);

    this.neon.clear();
    this.neon.lineStyle(2, COLORS.corralNeon, lineA);
    this.strokeCorral(this.neon, 0);

    if (!this.isLeftOpen()) {
      const gateTop = this.gateStartRel;
      const gateBot = this.gateEndRel;
      this.neon.lineStyle(2, COLORS.corralNeon, 0.35 + pulse * 0.5);
      this.neon.lineBetween(4, gateTop, 4, gateBot);
      this.neon.lineBetween(10, gateTop, 10, gateBot);
    }
  }

  strokeCorral(g, pad) {
    const L = -pad;
    const T = -pad;
    const R = this.w + pad;
    const B = this.h + pad;
    const gateTop = this.gateStartRel;
    const gateBot = this.gateEndRel;

    g.beginPath();
    if (this.isLeftOpen()) {
      g.moveTo(L, T);
      g.lineTo(R, T);
      g.lineTo(R, B);
      g.lineTo(L, B);
    } else {
      g.moveTo(L, gateTop);
      g.lineTo(L, T);
      g.lineTo(R, T);
      g.lineTo(R, B);
      g.lineTo(L, B);
      g.lineTo(L, gateBot);
    }
    g.strokePath();
  }

  
  pulseEntrance() {
    this.gatePulse = 1;
    this.scene.tweens.add({
      targets: this,
      gatePulse: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.redraw(this.gatePulse),
    });
  }
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** Level 1 still → L2+ vertical bob (grows) → L8+ orbit (grows). */
export function corralMotionForLevel(level) {
  if (level < TUNING.corralBobStartLevel) {
    return { mode: 'still' };
  }

  if (level < TUNING.corralOrbitStartLevel) {
    const start = TUNING.corralBobStartLevel;
    const end = TUNING.corralOrbitStartLevel - 1;
    let t = (level - start) / Math.max(1, end - start);
    // From level 5 the bob becomes clearly aggressive.
    if (level >= 5) t = Math.min(1, 0.55 + (level - 5) / Math.max(1, end - 5) * 0.45);
    return {
      mode: 'bob',
      amp: lerp(TUNING.corralBobAmpMin, TUNING.corralBobAmpMax, t),
      speed: lerp(TUNING.corralBobSpeedMin, TUNING.corralBobSpeedMax, t),
    };
  }

  const t = (level - TUNING.corralOrbitStartLevel) / 6;
  return {
    mode: 'orbit',
    rx: lerp(TUNING.corralOrbitRxMin, TUNING.corralOrbitRxMax, t),
    ry: lerp(TUNING.corralOrbitRyMin, TUNING.corralOrbitRyMax, t),
    speed: lerp(TUNING.corralOrbitSpeedMin, TUNING.corralOrbitSpeedMax, t),
  };
}

function fenceRects(spec) {
  const right = spec.x + spec.w;
  const bottom = spec.y + spec.h;
  const thickness = spec.thickness;
  const leftTopH = spec.gateStart - spec.y;
  const leftBotH = bottom - spec.gateEnd;
  const fences = [
    rect(spec.x, spec.y, spec.w, thickness),
    rect(spec.x, bottom - thickness, spec.w, thickness),
    rect(right - thickness, spec.y, thickness, spec.h),
  ];
  if (leftTopH > 1) fences.push(rect(spec.x, spec.y, thickness, leftTopH));
  if (leftBotH > 1) fences.push(rect(spec.x, spec.gateEnd, thickness, leftBotH));
  return fences;
}

function rect(x, y, w, h) {
  return { x, y, w, h, left: x, top: y, right: x + w, bottom: y + h, kind: 'fence' };
}
