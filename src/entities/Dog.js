import { COLORS, TUNING } from '../config.js';
import { SPRITES, spriteScale } from '../assets/sprites.js';

const LABEL_STYLE = {
  fontFamily: '"Press Start 2P", "Courier New", monospace',
  fontSize: '8px',
  color: '#e8fff0',
  resolution: 2,
};

export class Dog {
  constructor(scene, config) {
    this.scene = scene;
    this.name = config.name;
    this.number = config.number;
    this.speed = config.speed;
    this.color = config.color;
    this.size = TUNING.dogSize;
    this.x = config.x;
    this.y = config.y;
    this.active = false;
    this.facingX = 1;
    this.facingY = 0;
    this.pulseT = Math.random() * 10;
    this.moving = false;

    this.outline = scene.add.graphics();
    this.body = scene.add.sprite(this.x, this.y, 'dog', 0);
    this.body.setScale(spriteScale(SPRITES.dog));
    this.body.setTint(this.color);
    this.body.play('dog-idle');

    this.label = scene.add.text(this.x, this.y - this.size / 2 - 8, this.name.toUpperCase(), LABEL_STYLE);
    this.label.setOrigin(0.5, 1);

    this.sync(0);
  }

  setActive(active) {
    this.active = active;
    this.body.setAlpha(active ? 1 : 0.45);
    this.label.setAlpha(active ? 1 : 0.45);
    this.sync(this.pulseT);
  }

  sync(dt = 0) {
    this.pulseT += dt;
    this.body.setPosition(this.x, this.y);
    this.label.setPosition(this.x, this.y - this.size / 2 - 8);

    if (this.facingX < -0.05) this.body.setFlipX(true);
    else if (this.facingX > 0.05) this.body.setFlipX(false);

    const want = this.moving ? 'dog-walk' : 'dog-idle';
    if (this.body.anims.currentAnim?.key !== want) this.body.play(want, true);

    const depth = this.y | 0;
    if (depth !== this.drawnDepth) {
      this.drawnDepth = depth;
      this.body.setDepth(depth);
      this.label.setDepth(depth + 3);
      this.outline.setDepth(depth - 1);
    }

    const pulse = this.active ? 1 + Math.sin(this.pulseT * 8) * 0.05 : 1;
    this.body.setScale(spriteScale(SPRITES.dog) * pulse);

    this.outline.clear();
    if (!this.active) return;

    const glow = 0.55 + Math.sin(this.pulseT * 10) * 0.35;
    const pad = 8 + Math.sin(this.pulseT * 10) * 1.5;
    const w = this.size + pad * 2;
    const h = this.size + pad * 2;
    this.outline.lineStyle(2, COLORS.outline, glow);
    this.outline.strokeRect(this.x - w / 2, this.y - h / 2, w, h);
    this.outline.lineStyle(1, this.color, 0.85);
    this.outline.strokeRect(this.x - this.size / 2 - 2, this.y - this.size / 2 - 2, this.size + 4, this.size + 4);
  }
}
