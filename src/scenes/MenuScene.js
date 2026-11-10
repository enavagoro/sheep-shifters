import Phaser from 'phaser';
import { getMusic } from '../audio/Music.js';
import { getSfx } from '../audio/Sfx.js';
import { COLORS, DOGS, GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config.js';
import { t } from '../i18n/strings.js';
import { loadSettings, updateSettings } from '../systems/Settings.js';
import { SPRITES, spriteScale } from '../assets/sprites.js';

const FONT = '"Press Start 2P", "Courier New", monospace';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#050706');
    this.settings = loadSettings();
    this.applyAudioSettings();

    this.screen = 'main';
    this.index = 0;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.void);

    this.logo = this.add.image(GAME_WIDTH / 2, 0, 'logo')
      .setOrigin(0.5, 1)
      .setDepth(5);
    const logoMaxW = Math.min(620, GAME_WIDTH * 0.72);
    const logoMaxH = 250;
    const scale = Math.min(logoMaxW / this.logo.width, logoMaxH / this.logo.height);
    this.logo.setScale(scale);
    this.menuTopY = GAME_HEIGHT / 2 + 28;
    this.logo.setPosition(GAME_WIDTH / 2, this.menuTopY - 52);

    this.cursorSheep = this.add.sprite(0, 0, 'sheep', 0)
      .setOrigin(0.5)
      .setDepth(8)
      .setScale(spriteScale(SPRITES.sheep) * 0.9);
    this.cursorSheep.play('sheep-idle');

    this.cursor = this.add.text(0, 0, '>', {
      fontFamily: FONT,
      fontSize: '16px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(1, 0.5).setDepth(9);

    this.lines = [];
    for (let i = 0; i < 8; i += 1) {
      this.lines.push(this.add.text(GAME_WIDTH / 2, 0, '', {
        fontFamily: FONT,
        fontSize: '18px',
        color: '#e8fff0',
        resolution: 2,
      }).setOrigin(0.5));
    }

    this.controlsTitle = this.add.text(GAME_WIDTH / 2, 88, '', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setVisible(false).setDepth(6);

    this.detail = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 48, '', {
      fontFamily: FONT,
      fontSize: '11px',
      color: '#9dffc0',
      resolution: 2,
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5).setDepth(6);

    this.createControlsDemo();

    this.hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 72, '', {
      fontFamily: FONT,
      fontSize: '10px',
      color: '#6a7a70',
      resolution: 2,
      align: 'center',
    }).setOrigin(0.5);

    this.credit = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 28, '', {
      fontFamily: FONT,
      fontSize: '11px',
      color: '#4a5a50',
      resolution: 2,
      align: 'center',
    }).setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      BACKSPACE: Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
    });
    this.upHeld = false;
    this.downHeld = false;
    this.okHeld = false;
    this.backHeld = false;
    this.shiftHeld = false;

    this.music = getMusic();
    this.sfx = getSfx();
    this.music.start();
    this.music.setMode('menu');

    this.rebuild();
  }

  applyAudioSettings() {
    getMusic().setMusicMuted(!this.settings.music);
    getSfx().setMuted(!this.settings.sound);
  }

  lang() {
    return this.settings.language === 'en' ? 'en' : 'es';
  }

  itemsForScreen() {
    const lang = this.lang();
    if (this.screen === 'options') {
      return [
        { id: 'language', label: `${t(lang, 'language')}  ${lang.toUpperCase()}` },
        { id: 'music', label: `${t(lang, 'music')}  ${this.settings.music ? t(lang, 'on') : t(lang, 'off')}` },
        { id: 'sound', label: `${t(lang, 'sound')}  ${this.settings.sound ? t(lang, 'on') : t(lang, 'off')}` },
        { id: 'back', label: t(lang, 'back') },
      ];
    }
    return [
      { id: 'play', label: t(lang, 'play') },
      { id: 'controls', label: t(lang, 'controls') },
      { id: 'options', label: t(lang, 'options') },
    ];
  }

  createControlsDemo() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 36;
    const w = 460;
    const h = 240;
    const starts = [
      { x: cx - 130, y: cy + 30 },
      { x: cx - 40, y: cy + 50 },
      { x: cx - 90, y: cy - 40 },
    ];

    this.demo = {
      left: cx - w / 2,
      right: cx + w / 2,
      top: cy - h / 2,
      bottom: cy + h / 2,
      dogIndex: 0,
      dogs: DOGS.map((cfg, i) => ({
        x: starts[i].x,
        y: starts[i].y,
        vx: 0,
        vy: 0,
        speed: TUNING.dogSpeed * 0.82,
        color: cfg.color,
        number: cfg.number,
      })),
      sheep: {
        x: cx + 90,
        y: cy - 10,
        vx: 0,
        vy: 0,
        wanderAngle: 0.4,
        wanderTurn: 0.2,
        wanderSpeed: 122,
        fleeSpeed: 430,
        size: TUNING.sheepSize,
      },
    };

    this.demoFrame = this.add.rectangle(cx, cy, w, h, 0x061910, 1)
      .setStrokeStyle(2, COLORS.frame, 0.85)
      .setDepth(3)
      .setVisible(false);

    this.demoDogs = this.demo.dogs.map((dog) => {
      const sprite = this.add.sprite(dog.x, dog.y, 'dog', 0)
        .setOrigin(0.5)
        .setDepth(5)
        .setScale(spriteScale(SPRITES.dog) * 0.95)
        .setTint(dog.color)
        .setVisible(false);
      sprite.play('dog-idle');
      return sprite;
    });

    this.demoSheep = this.add.sprite(this.demo.sheep.x, this.demo.sheep.y, 'sheep', 0)
      .setOrigin(0.5)
      .setDepth(4)
      .setScale(spriteScale(SPRITES.sheep) * 1.05)
      .setVisible(false);
    this.demoSheep.play('sheep-idle');

    this.refreshDemoDogActive();
  }

  refreshDemoDogActive() {
    if (!this.demoDogs || !this.demo) return;
    this.demoDogs.forEach((sprite, i) => {
      const on = i === this.demo.dogIndex;
      sprite.setAlpha(on ? 1 : 0.45);
      sprite.setDepth(on ? 6 : 5);
    });
  }

  switchDemoDog() {
    if (!this.demo) return;
    this.demo.dogIndex = (this.demo.dogIndex + 1) % this.demo.dogs.length;
    this.refreshDemoDogActive();
    this.sfx.play('switch');
  }

  setControlsDemoVisible(on) {
    this.demoFrame?.setVisible(on);
    this.demoDogs?.forEach((sprite) => sprite.setVisible(on));
    this.demoSheep?.setVisible(on);
    this.controlsTitle?.setVisible(on);
    if (on && this.demo) {
      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2 - 36;
      const starts = [
        { x: cx - 130, y: cy + 30 },
        { x: cx - 40, y: cy + 50 },
        { x: cx - 90, y: cy - 40 },
      ];
      this.demo.dogIndex = 0;
      this.demo.dogs.forEach((dog, i) => {
        dog.x = starts[i].x;
        dog.y = starts[i].y;
        dog.vx = 0;
        dog.vy = 0;
      });
      this.demo.sheep.x = cx + 90;
      this.demo.sheep.y = cy - 10;
      this.demo.sheep.vx = 0;
      this.demo.sheep.vy = 0;
      this.demo.sheep.wanderAngle = 0.4;
      this.demo.sheep.wanderTurn = 0.2;
      this.refreshDemoDogActive();
    }
  }

  updateControlsDemo(dt) {
    if (this.screen !== 'controls' || !this.demo) return;
    const d = this.demo;
    const dog = d.dogs[d.dogIndex];
    const sheep = d.sheep;
    const halfDog = 20;
    const halfSheep = sheep.size / 2;

    let ix = 0;
    let iy = 0;
    if (this.keys.left.isDown || this.keys.A.isDown) ix -= 1;
    if (this.keys.right.isDown || this.keys.D.isDown) ix += 1;
    if (this.keys.up.isDown || this.keys.W.isDown) iy -= 1;
    if (this.keys.down.isDown || this.keys.S.isDown) iy += 1;
    const len = Math.hypot(ix, iy);
    if (len > 0) {
      dog.vx = (ix / len) * dog.speed;
      dog.vy = (iy / len) * dog.speed;
      dog.x += dog.vx * dt;
      dog.y += dog.vy * dt;
    } else {
      dog.vx = 0;
      dog.vy = 0;
    }

    // Idle dogs don't move
    d.dogs.forEach((other, i) => {
      if (i === d.dogIndex) return;
      other.vx = 0;
      other.vy = 0;
    });

    sheep.wanderTurn += (Math.random() - 0.5) * 4.2 * dt;
    sheep.wanderTurn = Phaser.Math.Clamp(sheep.wanderTurn, -1.15, 1.15);
    sheep.wanderAngle += sheep.wanderTurn * dt;

    let dx = Math.cos(sheep.wanderAngle) * 0.42;
    let dy = Math.sin(sheep.wanderAngle) * 0.42;
    let fleeing = false;

    // Huye de los 3 perros (como en partida sin owner)
    for (const hound of d.dogs) {
      const fx = sheep.x - hound.x;
      const fy = sheep.y - hound.y;
      const dist = Math.hypot(fx, fy);
      if (dist >= TUNING.fleeRadius) continue;
      fleeing = true;
      const safe = Math.max(dist, 10);
      const closeness = 1 - dist / TUNING.fleeRadius;
      const weight = 1.45 + closeness * closeness * 3.6;
      dx += (fx / safe) * weight;
      dy += (fy / safe) * weight;
    }

    const margin = 36;
    if (sheep.x < d.left + margin) dx += (d.left + margin - sheep.x) / margin * 2.1;
    if (sheep.x > d.right - margin) dx -= (sheep.x - (d.right - margin)) / margin * 2.1;
    if (sheep.y < d.top + margin) dy += (d.top + margin - sheep.y) / margin * 2.1;
    if (sheep.y > d.bottom - margin) dy -= (sheep.y - (d.bottom - margin)) / margin * 2.1;

    const magnitude = Math.hypot(dx, dy);
    const speed = fleeing ? sheep.fleeSpeed : sheep.wanderSpeed;
    const targetX = magnitude > 0.001 ? (dx / magnitude) * speed : 0;
    const targetY = magnitude > 0.001 ? (dy / magnitude) * speed : 0;
    const response = fleeing ? 12 : 3.2;
    const blend = 1 - Math.exp(-response * dt);
    sheep.vx += (targetX - sheep.vx) * blend;
    sheep.vy += (targetY - sheep.vy) * blend;
    sheep.x += sheep.vx * dt;
    sheep.y += sheep.vy * dt;

    for (const hound of d.dogs) {
      hound.x = Phaser.Math.Clamp(hound.x, d.left + halfDog, d.right - halfDog);
      hound.y = Phaser.Math.Clamp(hound.y, d.top + halfDog, d.bottom - halfDog);
    }
    sheep.x = Phaser.Math.Clamp(sheep.x, d.left + halfSheep, d.right - halfSheep);
    sheep.y = Phaser.Math.Clamp(sheep.y, d.top + halfSheep, d.bottom - halfSheep);

    d.dogs.forEach((hound, i) => {
      const sprite = this.demoDogs[i];
      sprite.setPosition(hound.x, hound.y);
      if (hound.vx < -8) sprite.setFlipX(true);
      else if (hound.vx > 8) sprite.setFlipX(false);
      const moving = Math.hypot(hound.vx, hound.vy) > 12;
      const want = moving ? 'dog-walk' : 'dog-idle';
      if (sprite.anims.currentAnim?.key !== want) sprite.play(want);
    });

    this.demoSheep.setPosition(sheep.x, sheep.y);
    if (sheep.vx < -8) this.demoSheep.setFlipX(true);
    else if (sheep.vx > 8) this.demoSheep.setFlipX(false);
    const sheepMoving = Math.hypot(sheep.vx, sheep.vy) > 28;
    if (sheepMoving && this.demoSheep.anims.currentAnim?.key !== 'sheep-walk') this.demoSheep.play('sheep-walk');
    if (!sheepMoving && this.demoSheep.anims.currentAnim?.key !== 'sheep-idle') this.demoSheep.play('sheep-idle');
  }

  rebuild() {
    const lang = this.lang();
    const items = this.itemsForScreen();
    this.index = Phaser.Math.Clamp(this.index, 0, Math.max(0, items.length - 1));
    this.logo?.setVisible(this.screen === 'main' || this.screen === 'options');

    for (let i = 0; i < this.lines.length; i += 1) {
      const item = items[i];
      const visible = !!item && this.screen !== 'controls';
      this.lines[i].setVisible(visible);
      if (!visible) continue;
      this.lines[i]
        .setText(item.label)
        .setPosition(GAME_WIDTH / 2, this.menuTopY + i * 48)
        .setColor(i === this.index ? '#39ff6a' : '#e8fff0');
    }

    const showCursor = this.screen === 'main' || this.screen === 'options';
    this.cursor.setVisible(showCursor);
    this.cursorSheep.setVisible(showCursor);

    const onControls = this.screen === 'controls';
    this.setControlsDemoVisible(onControls);
    if (onControls) {
      this.controlsTitle.setText(t(lang, 'controls'));
      this.detail
        .setVisible(true)
        .setText(t(lang, 'controlsBody').join('\n'))
        .setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 150);
    } else {
      this.detail.setVisible(false);
    }

    const hints = [];
    if (this.screen === 'main' || this.screen === 'options') hints.push(t(lang, 'pressSelect'));
    if (this.screen !== 'main') hints.push(t(lang, 'pressBack'));
    this.hint.setText(hints.join('\n'));
    this.credit.setText(t(lang, 'credit'));
    this.layoutCursor();
  }

  layoutCursor() {
    if (!this.cursor.visible) return;
    const line = this.lines[this.index];
    if (!line?.visible) return;
    const x = line.x - line.width / 2 - 18;
    const y = line.y;
    this.cursorSheep.setPosition(x - 42, y);
    this.cursor.setPosition(x, y);
  }

  update(_time, delta) {
    const onControls = this.screen === 'controls';
    const up = this.keys.up.isDown || this.keys.W.isDown;
    const down = this.keys.down.isDown || this.keys.S.isDown;
    const ok = this.keys.ENTER.isDown || this.keys.SPACE.isDown;
    const back = this.keys.ESC.isDown || this.keys.BACKSPACE.isDown;

    // En controles, WASD/flechas mueven al perro (no el menú)
    if (!onControls) {
      if (up && !this.upHeld) this.move(-1);
      if (down && !this.downHeld) this.move(1);
      if (ok && !this.okHeld) this.confirm();
    } else if (this.keys.ENTER.isDown && !this.okHeld) {
      this.goBack();
    }
    if (onControls && this.keys.SHIFT.isDown && !this.shiftHeld) {
      this.switchDemoDog();
    }
    if (back && !this.backHeld) this.goBack();

    this.upHeld = up;
    this.downHeld = down;
    this.okHeld = onControls ? this.keys.ENTER.isDown : ok;
    this.backHeld = back;
    this.shiftHeld = this.keys.SHIFT.isDown;

    this.updateControlsDemo(Math.min(delta / 1000, 0.05));
    this.music.tick(false);
  }

  move(dir) {
    if (this.screen !== 'main' && this.screen !== 'options') return;
    const items = this.itemsForScreen();
    if (!items.length) return;
    this.index = (this.index + dir + items.length) % items.length;
    this.sfx.play('switch');
    this.rebuild();
  }

  confirm() {
    if (this.screen === 'controls') {
      this.goBack();
      return;
    }

    const item = this.itemsForScreen()[this.index];
    if (!item) return;
    this.sfx.play('bark');

    if (this.screen === 'main') {
      if (item.id === 'play') {
        this.scene.start('GameScene');
        return;
      }
      if (item.id === 'controls') {
        this.screen = 'controls';
        this.index = 0;
        this.rebuild();
        return;
      }
      if (item.id === 'options') {
        this.screen = 'options';
        this.index = 0;
        this.rebuild();
      }
      return;
    }

    if (this.screen === 'options') {
      if (item.id === 'language') {
        this.settings = updateSettings({
          language: this.settings.language === 'es' ? 'en' : 'es',
        });
        this.rebuild();
        return;
      }
      if (item.id === 'music') {
        this.settings = updateSettings({ music: !this.settings.music });
        this.applyAudioSettings();
        this.rebuild();
        return;
      }
      if (item.id === 'sound') {
        this.settings = updateSettings({ sound: !this.settings.sound });
        this.applyAudioSettings();
        this.rebuild();
        return;
      }
      if (item.id === 'back') this.goBack();
    }
  }

  goBack() {
    if (this.screen === 'main') return;
    this.sfx.play('switch');
    const from = this.screen;
    this.screen = 'main';
    this.index = 0;
    this.rebuild();
    if (from === 'options') {
      const optionsIndex = this.itemsForScreen().findIndex((item) => item.id === 'options');
      this.index = optionsIndex >= 0 ? optionsIndex : 0;
      this.rebuild();
    }
  }
}
