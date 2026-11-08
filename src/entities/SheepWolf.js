import { TUNING } from '../config.js';
import { SPRITES, spriteScale } from '../assets/sprites.js';
import { spawnWolfFromSide } from './Wolf.js';

const BLEATS = ['BAA', 'BAAA', 'BEE', 'BAAA'];

export class SheepWolf {
  constructor(scene, config) {
    this.scene = scene;
    this.name = 'Sheep Wolf';
    this.size = TUNING.sheepWolfSize;
    this.speed = TUNING.sheepWolfSpeed;
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx ?? 0;
    this.vy = config.vy ?? 0;
    this.active = true;
    this.removed = false;
    this.entering = config.entering ?? false;
    this.lure = true;
    this.calling = false;
    this.edge = config.edge ?? 'left';
    this.patrolT = Math.random() * Math.PI * 2;
    this.life = TUNING.sheepWolfLife;
    this.phase = 'walk';
    this.phaseTimer = randRange(TUNING.sheepWolfWalkMin, TUNING.sheepWolfWalkMax);
    this.bleatPulse = 0;

    this.body = scene.add.sprite(this.x, this.y, 'sheepwolf', 0);
    this.body.setScale(spriteScale(SPRITES.sheepwolf));
    this.body.play('sheepwolf-walk');
  }

  hide() {
    if (this.removed) return;
    this.active = false;
    this.removed = true;
    this.calling = false;
    this.body.destroy();
  }

  startBleat(vfx) {
    this.phase = 'bleat';
    this.calling = true;
    this.phaseTimer = randRange(TUNING.sheepWolfBleatMin, TUNING.sheepWolfBleatMax);
    this.bleatPulse = 0;
    this.vx = 0;
    this.vy = 0;
    const word = BLEATS[Math.floor(Math.random() * BLEATS.length)];
    vfx?.floatText?.(this.x, this.y - 28, word, '#f4fff8', 11);
  }

  startWalk() {
    this.phase = 'walk';
    this.calling = false;
    this.phaseTimer = randRange(TUNING.sheepWolfWalkMin, TUNING.sheepWolfWalkMax);
  }

  sync() {
    if (!this.active || this.removed) return;
    this.body.setPosition(this.x, this.y);
    if (this.vx < -4) this.body.setFlipX(true);
    else if (this.vx > 4) this.body.setFlipX(false);
    const speed = Math.hypot(this.vx, this.vy);
    const want = speed > 16 ? 'sheepwolf-walk' : 'sheepwolf-idle';
    if (this.body.anims.currentAnim?.key !== want) this.body.play(want, true);
    this.body.setDepth(this.y | 0);
  }
}

export function spawnSheepWolfFromEdge() {

  const slot = 0.42 + Math.random() * 0.38;
  const point = spawnWolfFromSide('left', slot);
  return { ...point, edge: 'left' };
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}
