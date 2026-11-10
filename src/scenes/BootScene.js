import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config.js';
import { ensureSpriteAnims, preloadSprites } from '../assets/sprites.js';
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.cameras.main.setBackgroundColor('#050706');
    preloadSprites(this);
    this.load.image('logo', 'assets/logo.png');

    this.loading = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 28, 'LOADING', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '14px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 36, 'SHEEP\nSHIFTERS', {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: '28px',
      color: '#ffe14a',
      resolution: 2,
      align: 'center',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      const dots = 1 + Math.floor(value * 3);
      this.loading.setText(`LOADING${'.'.repeat(dots)}`);
    });
  }

  create() {
    ensureSpriteAnims(this);

    this.pulse = 0;
    this.warmFrames = 0;
    this.minFrames = 30;
    this.openedAt = this.time.now;

    const splash = document.getElementById('boot');
    if (splash) splash.classList.add('hide');
  }

  update(_time, delta) {
    this.warmFrames += 1;
    this.pulse += delta;

    const dots = 1 + (Math.floor(this.pulse / 320) % 3);
    this.loading.setText(`LOADING${'.'.repeat(dots)}`);

    const waited = this.time.now - this.openedAt >= 450;
    if (waited && this.warmFrames >= this.minFrames) {
      this.scene.start('MenuScene');
    }
  }
}
