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
    this.ownerNumber = config.ownerNumber ?? null;
    this.ownerColor = config.ownerColor ?? null;
    this.ownerName = config.ownerName ?? null;
    this.drawnOwner = null;

    this.body = scene.add.sprite(this.x, this.y, 'sheep', 0);
    this.body.setScale(spriteScale(SPRITES.sheep));
    this.body.play('sheep-idle');
    this.sync(0);
  }

  setOwner(dog) {
    if (!dog) {
      this.ownerNumber = null;
      this.ownerColor = null;
      this.ownerName = null;
    } else {
      this.ownerNumber = dog.number;
      this.ownerColor = dog.color;
      this.ownerName = dog.name;
    }
    this.drawnSecured = undefined;
    this.drawnOwner = undefined;
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

    if (this.secured === this.drawnSecured && this.ownerColor === this.drawnOwner) return;
    this.drawnSecured = this.secured;
    this.drawnOwner = this.ownerColor;

    if (this.secured) {
      this.body.setTint(this.ownerColor ? softenTint(this.ownerColor) : COLORS.sheepSecured);
      this.body.setAlpha(0.7);
    } else if (this.ownerColor) {
      this.body.setTint(this.ownerColor);
      this.body.setAlpha(1);
    } else {
      this.body.clearTint();
      this.body.setAlpha(1);
    }
  }
}

export function createFlock(scene) {

  return createHerd(scene, SHEEP_ORIGIN, SHEEP_COUNT);
}

export function createHerd(scene, origin, count, owners = []) {
  const herd = [];
  const ownerQueue = [...owners];

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + (index % 3) * 0.4;
    const radius = count > 8 ? 34 + (index % 4) * 22 : 18 + (index % 3) * 16;
    const owner = ownerQueue.shift() || null;
    herd.push(new Sheep(scene, {
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
      wanderAngle: angle,
      wanderTurn: ((index % 5) - 2) * 0.2,
      wanderSpeed: 118 + (index % 5) * 8,
      fleeSpeed: 420 + (index % 5) * 10,
      ownerNumber: owner?.number ?? null,
      ownerColor: owner?.color ?? null,
      ownerName: owner?.name ?? null,
    }));
  }

  return herd;
}

export function brandSparseOwners(newHerd, dogs, existing, level = 1) {
  if (!newHerd.length) return;
  if (level < TUNING.colorSheepStartLevel) return;

  const candidates = [];
  for (const dog of dogs) {
    const have = existing.filter((animal) => (
      !animal.removed
      && !animal.lost
      && !animal.secured
      && animal.ownerNumber === dog.number
    )).length;
    if (have <= 0) candidates.push({ dog, have });
  }
  if (!candidates.length) return;

  candidates.sort((a, b) => a.have - b.have || Math.random() - 0.5);
  const blank = newHerd.find((animal) => !animal.ownerNumber);
  if (!blank) return;
  blank.setOwner(candidates[0].dog);
}

function softenTint(color) {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const mix = (channel) => Math.min(255, Math.round(channel * 0.55 + 255 * 0.45));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}
