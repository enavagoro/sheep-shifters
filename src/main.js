import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

async function boot() {
  if (document.fonts?.load) {
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('20px "Press Start 2P"'),
          document.fonts.load('36px "Press Start 2P"'),
        ]).then(() => document.fonts.ready),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
    } catch {
      // Fonts are optional — never block boot.
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#050706',
    title: 'Sheep Shifters',
    banner: false,
    antialias: false,
    pixelArt: true,
    roundPixels: true,
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      game.destroy(true);
    });
  }
}

boot();
