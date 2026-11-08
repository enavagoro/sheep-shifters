import { BOUNDS, CORRAL, TUNING } from '../config.js';
import { SPRITES, spriteScale } from '../assets/sprites.js';

export class Wolf {
  constructor(scene, config) {
    this.name = 'Wolf';
    this.size = TUNING.wolfSize;
    this.speed = TUNING.wolfSpeed;
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx ?? 0;
    this.vy = config.vy ?? 0;
    this.active = true;
    this.removed = false;
    this.entering = config.entering ?? false;
    this.dodgeTime = 0;
    this.persistTime = 0;
    this.fleeX = 1;
    this.fleeY = 0;

    this.body = scene.add.sprite(this.x, this.y, 'wolf', 0);
    this.body.setScale(spriteScale(SPRITES.wolf));
    this.body.play('wolf-walk');
  }

  hide() {
    if (this.removed) return;
    this.active = false;
    this.removed = true;
    this.body.destroy();
  }

  sync() {
    if (!this.active || this.removed) return;

    this.body.setPosition(this.x, this.y);

    if (this.vx < -4) this.body.setFlipX(true);
    else if (this.vx > 4) this.body.setFlipX(false);

    const speed = Math.hypot(this.vx, this.vy);
    const want = speed > 20 ? 'wolf-walk' : 'wolf-idle';
    if (this.body.anims.currentAnim?.key !== want) this.body.play(want, true);

    this.body.setDepth(this.y | 0);
  }
}

export function spawnWolfFromEdge() {
  const sides = ['left', 'top', 'bottom'];
  return spawnWolfFromSide(sides[Math.floor(Math.random() * sides.length)]);
}

export function spawnWolfFromSide(side, slot = 0.5, options = {}) {
  const gap = TUNING.wolfSize + 18;
  const t = Math.max(0.12, Math.min(0.88, slot));
  const fullRim = !!options.fullRim;

  const playRight = fullRim ? BOUNDS.right : (CORRAL.x - 36);

  if (side === 'right') {
    if (!fullRim) {
      return spawnWolfFromSide(Math.random() < 0.5 ? 'top' : 'bottom', 0.78 + Math.random() * 0.08);
    }
    return {
      x: BOUNDS.right + gap,
      y: BOUNDS.top + (BOUNDS.bottom - BOUNDS.top) * t,
      vx: -1,
      vy: 0,
      entering: true,
    };
  }

  if (side === 'left') {
    return {
      x: BOUNDS.left - gap,
      y: BOUNDS.top + (BOUNDS.bottom - BOUNDS.top) * t,
      vx: 1,
      vy: 0,
      entering: true,
    };
  }

  if (side === 'top') {
    return {
      x: BOUNDS.left + (playRight - BOUNDS.left) * t,
      y: BOUNDS.top - gap,
      vx: 0,
      vy: 1,
      entering: true,
    };
  }

  return {
    x: BOUNDS.left + (playRight - BOUNDS.left) * t,
    y: BOUNDS.bottom + gap,
    vx: 0,
    vy: -1,
    entering: true,
  };
}
