import { COLORS, SHEEP_COUNT, SHEEP_ORIGIN, TUNING } from '../config.js';
import { SPRITES, spriteScale } from '../assets/sprites.js';

export class Sheep {
  constructor(scene, config) {
    this.scene = scene;
    this.name = 'Sheep';
    this.size = TUNING.sheepSize;
    this.x = config.x;
    this.y = config.y;
    this.vx = 0;
    this.vy = 0;
    this.secured = false;
    this.lost = false;
    this.collected = false;
    this.removed = false;
    this.wanderAngle = config.wanderAngle;
    this.wanderTurn = config.wanderTurn;
    this.wanderSpeed = config.wanderSpeed;
    this.fleeSpeed = config.fleeSpeed;
    this.cohesionRadius = TUNING.cohesionRadius;
    this.separationRadius = TUNING.separationRadius;

    this.body = scene.add.sprite(this.x, this.y, 'sheep', 0);
    this.body.setScale(spriteScale(SPRITES.sheep));
    this.body.play('sheep-idle');
    this.sync(0);
  }

  remove() {
    if (this.removed) return;
    this.removed = true;
    this.body.destroy();
  }

  sync(dt = 0) {
    if (this.removed) return;
    const visible = !this.lost && !this.collected;
    this.body.setVisible(visible);
    if (!visible) return;

    this.body.setPosition(this.x, this.y);

    if (this.vx < -8) this.body.setFlipX(true);
    else if (this.vx > 8) this.body.setFlipX(false);

    const speed = Math.hypot(this.vx, this.vy);
    const want = speed > 28 ? 'sheep-walk' : 'sheep-idle';
    if (this.body.anims.currentAnim?.key !== want) this.body.play(want, true);

    const depth = this.y | 0;
    if (depth !== this.drawnDepth) {
      this.drawnDepth = depth;
      this.body.setDepth(depth);
    }

    if (this.secured === this.drawnSecured) return;
    this.drawnSecured = this.secured;
    if (this.secured) {
      this.body.setTint(COLORS.sheepSecured);
      this.body.setAlpha(0.7);
    } else {
      this.body.clearTint();
      this.body.setAlpha(1);
    }
  }
}

export function createFlock(scene) {
  return createHerd(scene, SHEEP_ORIGIN, SHEEP_COUNT);
}

export function createHerd(scene, origin, count) {
  const herd = [];

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + (index % 3) * 0.4;
    const radius = count > 8 ? 34 + (index % 4) * 22 : 18 + (index % 3) * 16;
    herd.push(new Sheep(scene, {
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
      wanderAngle: angle,
      wanderTurn: ((index % 5) - 2) * 0.2,
      wanderSpeed: 118 + (index % 5) * 8,
      fleeSpeed: 420 + (index % 5) * 10,
    }));
  }

  return herd;
}
