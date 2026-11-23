import Phaser from 'phaser';
import { ensureSpriteAnims, preloadSprites } from '../assets/sprites.js';
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#050706');
    preloadSprites(this);
    this.load.image('logo', 'assets/logo.png');
  }

  create() {
    ensureSpriteAnims(this);

    this.warmFrames = 0;
    this.minFrames = 30;
    this.openedAt = this.time.now;
  }

  update() {
    this.warmFrames += 1;

    const waited = this.time.now - this.openedAt >= 450;
    if (waited && this.warmFrames >= this.minFrames) {
      document.getElementById('boot')?.classList.add('hide');
      this.scene.start('MenuScene');
    }
  }
}
