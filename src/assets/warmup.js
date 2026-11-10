import { GAME_HEIGHT, GAME_WIDTH } from '../config.js';
import { ensureSpriteAnims, SPRITES, spriteScale } from './sprites.js';

const WARM_KEYS = [
  'logo',
  'dog-face',
  'bone',
  'dog',
  'sheep',
  'wolf',
  'sheepwolf',
];

const WARM_ANIMS = [
  'dog-walk',
  'dog-idle',
  'sheep-walk',
  'sheep-idle',
  'wolf-walk',
  'wolf-idle',
  'sheepwolf-walk',
  'sheepwolf-idle',
];

/**
 * Dibuja todas las texturas/anims EN CÁMARA (bajo un cover)
 * para forzar decode + upload a GPU. Fuera de pantalla Phaser las cullea
 * y el primer uso en GameScene sigue pegando el hitch.
 */
export function warmGameAssets(scene) {
  ensureSpriteAnims(scene);

  const root = scene.add.container(0, 0).setDepth(50);

  let x = 40;
  for (const key of WARM_KEYS) {
    if (!scene.textures.exists(key)) continue;
    const tex = scene.textures.get(key);
    const frames = Math.max(1, tex.frameTotal);
    for (let i = 0; i < Math.min(frames, 4); i += 1) {
      root.add(
        scene.add.image(x, GAME_HEIGHT - 36, key, i)
          .setAlpha(0.04)
          .setScale(0.12),
      );
      x += 18;
    }
  }

  x = 40;
  for (const anim of WARM_ANIMS) {
    if (!scene.anims.exists(anim)) continue;
    const sheet = anim.split('-')[0];
    if (!scene.textures.exists(sheet)) continue;
    const sprite = scene.add.sprite(x, GAME_HEIGHT - 70, sheet, 0)
      .setAlpha(0.05)
      .setScale(0.15);
    sprite.play(anim);
    root.add(sprite);
    x += 28;
  }

  for (const sheet of Object.values(SPRITES)) {
    if (!scene.textures.exists(sheet.key)) continue;
    root.add(
      scene.add.image(GAME_WIDTH - 48, 48, sheet.key, 0)
        .setScale(spriteScale(sheet))
        .setAlpha(0.05),
    );
  }

  const font = '"Press Start 2P", "Courier New", monospace';
  for (const size of ['8px', '10px', '11px', '12px', '14px', '16px', '18px', '22px', '28px']) {
    root.add(scene.add.text(24, 24, '0123456789 SCORE BEST', {
      fontFamily: font,
      fontSize: size,
      color: '#39ff6a',
      resolution: 2,
    }).setAlpha(0.05));
  }

  const g = scene.add.graphics().setAlpha(0.08);
  g.lineStyle(1, 0x39ff6a, 1);
  for (let i = 0; i < 24; i += 1) {
    g.strokeCircle(120 + i * 12, 160, 16);
    g.strokeTriangle(200, 200, 230, 250, 170, 250);
  }
  root.add(g);

  // Cover opaco: el usuario solo ve LOADING, pero la GPU sí rasteriza debajo
  root.add(
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050706, 1)
      .setDepth(60),
  );

  return root;
}
