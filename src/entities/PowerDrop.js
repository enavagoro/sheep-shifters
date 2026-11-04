import { BOUNDS, TUNING } from '../config.js';
import { SPRITES, spriteScale } from '../assets/sprites.js';

export class PowerDrop {
  constructor(scene, x, y, kind = 'blast') {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.radius = 22;
    this.alive = true;
    this.vy = TUNING.powerFallSpeed;
    this.t = Math.random() * Math.PI * 2;

    const info = POWER_INFO[kind] || POWER_INFO.blast;
    const color = info.color;

    this.glow = scene.add.circle(x, y, 28, color, 0.2).setDepth(6);
    this.body = scene.add.image(x, y, 'bone').setDepth(7);
    this.body.setScale(spriteScale(SPRITES.bone));
    this.body.setTint(color);
  }

  update(dt) {
    if (!this.alive) return;
    this.y += this.vy * dt;
    this.t += dt * 5;
    const pulse = 1 + Math.sin(this.t) * 0.1;
    this.glow.setPosition(this.x, this.y).setScale(pulse);
    this.body.setPosition(this.x, this.y).setScale(spriteScale(SPRITES.bone) * pulse);
    this.glow.setAlpha(0.14 + Math.sin(this.t * 1.4) * 0.08);

    if (this.y > BOUNDS.bottom + 36) this.take();
  }

  take() {
    if (!this.alive) return null;
    this.alive = false;
    this.glow.destroy();
    this.body.destroy();
    return this.kind;
  }
}

export const POWER_KINDS = ['blast', 'magnet', 'wide'];

export const POWER_INFO = {
  blast: {
    id: 'blast',
    label: 'BLAST',
    hint: 'SPACE',
    color: 0xff3355,
  },
  magnet: {
    id: 'magnet',
    label: 'MAGNET',
    hint: 'SPACE',
    color: 0x3dfff2,
  },
  wide: {
    id: 'wide',
    label: 'WIDE',
    hint: 'SPACE',
    color: 0xffe14a,
  },
};

export function randomPowerKind() {
  return POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)];
}
