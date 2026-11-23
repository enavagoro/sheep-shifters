import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { CurvedScreen } from './fx/CurvedScreen.js';

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
    pipeline: { CurvedScreen },
    scene: [BootScene, MenuScene, GameScene],
  });

  if (import.meta.env.DEV) {
    const fpsEl = document.createElement('div');
    fpsEl.id = 'dev-fps';
    Object.assign(fpsEl.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      zIndex: '9999',
      padding: '4px 8px',
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#39ff6a',
      background: 'rgba(5, 7, 6, 0.72)',
      pointerEvents: 'none',
      userSelect: 'none',
    });
    document.body.appendChild(fpsEl);

    let acc = 0;
    game.events.on('step', (_time, delta) => {
      acc += delta;
      if (acc < 200) return;
      acc = 0;
      fpsEl.textContent = `${Math.round(game.loop.actualFps)} FPS`;
    });
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      document.getElementById('dev-fps')?.remove();
      game.destroy(true);
    });
  }
}

boot();
