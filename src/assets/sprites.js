
export const SPRITES = {
  dog: { key: 'dog', path: 'assets/dog.png', frameWidth: 256, frameHeight: 147, displayHeight: 40 },
  sheep: { key: 'sheep', path: 'assets/sheep-pixel.png', frameWidth: 256, frameHeight: 164, displayHeight: 32 },
  wolf: { key: 'wolf', path: 'assets/wolf-pixel.png', frameWidth: 256, frameHeight: 152, displayHeight: 40 },
  sheepwolf: { key: 'sheepwolf', path: 'assets/sheepwolf-pixel.png', frameWidth: 256, frameHeight: 146, displayHeight: 30 },
  bone: { key: 'bone', path: 'assets/bone.png', frameWidth: 140, frameHeight: 82, displayHeight: 34 },
};

export function preloadSprites(scene) {
  for (const sheet of Object.values(SPRITES)) {
    if (sheet.key === 'bone') {
      scene.load.image(sheet.key, sheet.path);
      continue;
    }
    scene.load.spritesheet(sheet.key, sheet.path, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    });
  }
  scene.load.image('dog-face', 'assets/dog-face.png');
}

export function ensureSpriteAnims(scene) {
  const make = (key, sheet, rate, idle = false) => {
    if (scene.anims.exists(key)) return;
    if (idle) {
      scene.anims.create({ key, frames: [{ key: sheet, frame: 0 }], frameRate: 1 });
      return;
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet, { start: 0, end: 3 }),
      frameRate: rate,
      repeat: -1,
    });
  };

  make('dog-walk', 'dog', 11);
  make('dog-idle', 'dog', 1, true);
  make('sheep-walk', 'sheep', 8);
  make('sheep-idle', 'sheep', 1, true);
  make('wolf-walk', 'wolf', 10);
  make('wolf-idle', 'wolf', 1, true);
  make('sheepwolf-walk', 'sheepwolf', 8);
  make('sheepwolf-idle', 'sheepwolf', 1, true);
}

export function spriteScale(sheet) {
  return sheet.displayHeight / sheet.frameHeight;
}
