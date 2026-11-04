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
    this.moveT = Math.random() * Math.PI * 2;
    this.rebuildGeometry();
    this.draw(scene);
  }

  update(dt) {
    this.moveT += dt * TUNING.corralMoveSpeed;
    const prevY = this.y;
    const minY = BOUNDS.top + 18;
    const maxY = BOUNDS.bottom - this.h - 18;
    const mid = (minY + maxY) / 2;
    const amp = Math.min(TUNING.corralMoveAmp, (maxY - minY) * 0.5);
    this.y = mid + Math.sin(this.moveT) * amp;
    const dy = this.y - prevY;
    this.rebuildGeometry();
    this.syncVisuals();
    return { dy, fences: this.fences };
  }

  syncVisuals() {
    this.floor.setPosition(
      (this.outer.left + this.outer.right) / 2,
      (this.outer.top + this.outer.bottom) / 2,
    );
    this.label.setPosition(
      (this.inner.left + this.inner.right) / 2,
      this.inner.top + 14,
    );
    const pulse = this.gatePulse || (this.gateWiden > 0 ? 0.45 : 0);
    this.redraw(pulse);
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
      (this.outer.left + this.outer.right) / 2,
      (this.outer.top + this.outer.bottom) / 2,
      this.w - 4,
      this.h - 4,
      COLORS.corralFloor,
    );
    this.floor.setAlpha(0.35);
    this.floor.setDepth(0);

    this.glow = scene.add.graphics().setDepth(0);
    this.neon = scene.add.graphics().setDepth(1);

    this.label = scene.add.text(
      (this.inner.left + this.inner.right) / 2,
      this.inner.top + 14,
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

    this.redraw(0);
  }

  redraw(pulse = 0) {
    const glowA = 0.18 + pulse * 0.35;
    const lineA = 0.85 + pulse * 0.15;
    const inset = 1;

    this.glow.clear();
    this.glow.lineStyle(6, COLORS.corralNeon, glowA);
    this.strokeCorral(this.glow, inset);

    this.neon.clear();
    this.neon.lineStyle(2, COLORS.corralNeon, lineA);
    this.strokeCorral(this.neon, 0);

    if (!this.isLeftOpen()) {
      const gateTop = this.y + this.gateStartRel;
      const gateBot = this.y + this.gateEndRel;
      this.neon.lineStyle(2, COLORS.corralNeon, 0.35 + pulse * 0.5);
      this.neon.lineBetween(this.x + 4, gateTop, this.x + 4, gateBot);
      this.neon.lineBetween(this.x + 10, gateTop, this.x + 10, gateBot);
    }
  }

  strokeCorral(g, pad) {
    const L = this.outer.left - pad;
    const T = this.outer.top - pad;
    const R = this.outer.right + pad;
    const B = this.outer.bottom + pad;
    const gateTop = this.y + this.gateStartRel;
    const gateBot = this.y + this.gateEndRel;

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
