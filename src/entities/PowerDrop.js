import { BOUNDS, TUNING } from '../config.js';
import { SPRITES } from '../assets/sprites.js';

export class PowerDrop {
  constructor(scene, x, y, kind = 'blast', options = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.radius = 22;
    this.alive = true;
    this.grounded = !!options.grounded;
    this.vy = this.grounded ? 0 : TUNING.powerFallSpeed;
    this.t = Math.random() * Math.PI * 2;

    const info = POWER_INFO[kind] || POWER_INFO.blast;
    const color = info.color;
    this.ringR = 22;
    this.boneScale = (this.ringR * 1.4) / SPRITES.bone.frameWidth;

    this.glow = scene.add.circle(x, y, this.ringR + 3, color, 0.28).setDepth(6);
    this.ring = scene.add.circle(x, y, this.ringR, color, 0.12)
      .setStrokeStyle(2, color, 0.9)
      .setDepth(6);
    this.body = scene.add.image(x, y, 'bone').setDepth(7);
    this.body.setScale(this.boneScale);
    this.body.setTint(color);
  }

  update(dt) {
    if (!this.alive) return;
    if (!this.grounded) this.y += this.vy * dt;
    this.t += dt * 5;
    const pulse = 1 + Math.sin(this.t) * 0.08;
    this.glow.setPosition(this.x, this.y).setScale(pulse);
    this.ring.setPosition(this.x, this.y).setScale(pulse);
    this.body.setPosition(this.x, this.y).setScale(this.boneScale * pulse);
    this.glow.setAlpha(0.22 + Math.sin(this.t * 1.4) * 0.1);
    this.ring.setAlpha(0.7 + Math.sin(this.t * 1.4) * 0.2);

    if (!this.grounded && this.y > BOUNDS.bottom + 36) this.take();
  }

  take() {
    if (!this.alive) return null;
    this.alive = false;
    this.glow.destroy();
    this.ring?.destroy();
    this.body.destroy();
    return this.kind;
  }
}

export const POWER_KINDS = ['blast', 'magnet', 'wide'];

export const POWER_INFO = {
  blast: {
    id: 'blast',
    label: 'BLAST',
    color: 0xff3355,
  },
  magnet: {
    id: 'magnet',
    label: 'MAGNET',
    color: 0x3dfff2,
  },
  wide: {
    id: 'wide',
    label: 'NOWALLS',
    color: 0xffe14a,
  },
};

export function randomPowerKind() {
  return POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)];
}
