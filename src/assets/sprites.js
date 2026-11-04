
export const SPRITES = {
  dog: { key: 'dog', path: 'assets/dog.png', frameWidth: 256, frameHeight: 147, displayHeight: 40 },
  sheep: { key: 'sheep', path: 'assets/sheep.png', frameWidth: 256, frameHeight: 135, displayHeight: 30 },
  wolf: { key: 'wolf', path: 'assets/wolf.png', frameWidth: 256, frameHeight: 152, displayHeight: 36 },
  sheepwolf: { key: 'sheepwolf', path: 'assets/sheepwolf.png', frameWidth: 256, frameHeight: 152, displayHeight: 34 },
};

export function preloadSprites(scene) {
  for (const sheet of Object.values(SPRITES)) {
    scene.load.spritesheet(sheet.key, sheet.path, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    });
  }
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
