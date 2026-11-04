import Phaser from 'phaser';
import { getMusic } from '../audio/Music.js';
import { getSfx } from '../audio/Sfx.js';
import { BOUNDS, COLORS, DOGS, GAME_HEIGHT, GAME_WIDTH, TUNING, paceForLevel } from '../config.js';
import { createArena } from '../entities/Arena.js';
import { Corral } from '../entities/Corral.js';
import { Dog } from '../entities/Dog.js';
import { createFlock, createHerd, Sheep } from '../entities/Sheep.js';
import { spawnWolfFromEdge, spawnWolfFromSide, Wolf } from '../entities/Wolf.js';
import { SheepWolf, spawnSheepWolfFromEdge } from '../entities/SheepWolf.js';
import { DogController } from '../systems/DogController.js';
import { GameState } from '../systems/GameState.js';
import { secureSheepInside } from '../systems/HerdSystem.js';
import { updateFlock } from '../systems/SheepAI.js';
import { updateWolves } from '../systems/WolfAI.js';
import { ramSheepWolves, updateSheepWolves } from '../systems/SheepWolfAI.js';
import { HUD } from '../ui/HUD.js';
import { Vfx } from '../fx/Vfx.js';
import { ensureSpriteAnims } from '../assets/sprites.js';
import { POWER_INFO, PowerDrop, randomPowerKind } from '../entities/PowerDrop.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.cameras.main.roundPixels = true;
    this.cameras.main.setBackgroundColor('#050706');
    ensureSpriteAnims(this);

    const arena = createArena(this);
    this.pulseField = arena.field;
    this.fieldObstacles = arena.obstacles;
    this.arenaFrame = arena.frame;
    this.corral = new Corral(this);
    this.colliders = [...this.fieldObstacles, ...this.corral.fences];

    this.dogs = DOGS.map((config) => new Dog(this, config));
    this.sheep = createFlock(this);
    this.wolves = [];
    this.sheepWolves = [];
    this.wolfTimer = TUNING.wolfFirstDelay;
    this.sheepWolfTimer = TUNING.sheepWolfFirstDelay;
    this.herdTimer = TUNING.herdFirstDelay;
    this.dogController = new DogController(this.dogs);
    this.state = new GameState();
    this.lastLevel = 1;
    this.raid = null;
    this.spawnsLocked = false;
    this.powerDrops = [];
    this.heldPower = null;
    this.activeEffect = null;
    this.powerTimer = TUNING.powerFirstDelay;
    this.vfx = new Vfx(this);
    this.hud = new HUD(this);
    this.music = getMusic();
    this.sfx = getSfx();

    this.beatFlash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x39ff6a, 0.06)
      .setDepth(4)
      .setAlpha(0);

    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      R: Phaser.Input.Keyboard.KeyCodes.R,
    });

    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.ESC,
      Phaser.Input.Keyboard.KeyCodes.ENTER,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);

    this.shiftHeld = this.keys.SHIFT.isDown;
    this.escHeld = this.keys.ESC.isDown;
    this.upHeld = this.keys.up.isDown || this.keys.W.isDown;
    this.downHeld = this.keys.down.isDown || this.keys.S.isDown;
    this.enterHeld = this.keys.ENTER.isDown;
    this.spaceHeld = this.keys.SPACE.isDown;
    this.restartHeld = this.keys.R.isDown;

    const armMusic = () => this.music.start();
    this.input.once('pointerdown', armMusic);
    this.input.keyboard.once('keydown', armMusic);

    this.game.events.on('hidden', this.onHidden, this);
    this.events.once('shutdown', () => {
      this.game.events.off('hidden', this.onHidden, this);
    });

    this.hud.refresh(this.state, this.dogController);
  }

  onHidden() {
    this.input.keyboard.resetKeys();
    this.shiftHeld = false;
    this.escHeld = false;
    this.upHeld = false;
    this.downHeld = false;
    this.enterHeld = false;
    this.spaceHeld = false;
    this.restartHeld = false;
  }

  update(_time, delta) {
    if (this.readRestart()) return;

    this.readPause();
    this.readPauseMenu();
    this.readSwitch();
    this.readPower();

    
    const realDt = Math.min(delta / 1000, 0.05);
    if (!this.state.paused && !this.state.over) {
      this.state.advance(realDt, TUNING.levelSeconds);
      this.updateRaid(realDt);
      const pace = paceForLevel(this.state.level);
      if (!this.spawnsLocked) {
        this.spawnWolves(realDt, pace);
        this.spawnSheepWolves(realDt);
        this.spawnHerd(realDt, pace);
        this.spawnPowers(realDt);
      }
      this.updatePowers(realDt);
      this.updateActiveEffect(realDt);
      for (const wolf of this.wolves) {
        if (wolf.active) wolf.speed = pace.wolfSpeed;
      }
      const direction = this.readDirection();
      let moveLeft = realDt;
      const lureKilled = [];
      while (moveLeft > 0.0001) {
        const step = Math.min(moveLeft, 1 / 90);
        this.dogController.move(direction, step, BOUNDS, this.colliders);
        
        lureKilled.push(...ramSheepWolves(this.sheepWolves, this.dogController.active));
        moveLeft -= step;
      }
      const magnet = this.activeEffect?.id === 'magnet'
        ? this.dogController.active
        : null;
      updateFlock(
        this.sheep,
        realDt,
        this.dogs,
        this.fieldObstacles,
        this.colliders,
        BOUNDS,
        this.corral,
        this.wolves,
        this.sheepWolves,
        magnet,
      );
      const raidHit = this.raid && this.raid.phase !== 'done';
      const result = updateWolves(
        this.wolves,
        realDt,
        this.sheep,
        this.dogs,
        this.fieldObstacles,
        this.colliders,
        BOUNDS,
        raidHit ? TUNING.wolfRaidHitRadius : TUNING.wolfHitRadius,
      );
      const lureResult = updateSheepWolves(
        this.sheepWolves,
        realDt,
        this.sheep,
        this.dogs,
        this.fieldObstacles,
        this.colliders,
        BOUNDS,
        this.vfx,
        this.dogController.active,
      );
      lureResult.killed.push(...lureKilled);
      for (const spot of [...result.killed, ...lureResult.killed]) {
        this.state.add(TUNING.wolfPoints);
        this.vfx.scorePop(spot.x, spot.y, TUNING.wolfPoints);
        this.vfx.burst(spot.x, spot.y, 0xff3355, 10);
        this.vfx.shake(0.005, 90);
        this.sfx.play('kill');
      }
      if (result.caught || lureResult.caught) {
        this.state.endRun();
        this.vfx.shake(0.01, 220);
        this.vfx.flashColor(0xff3355, 180);
        this.sfx.play('hurt');
        if (this.state.newBest) this.sfx.play('score');
      }
      this.wolves = this.wolves.filter((wolf) => wolf.active);
      this.sheepWolves = this.sheepWolves.filter((lure) => lure.active);
      if (!this.state.over) {
        secureSheepInside(this.sheep, this.corral);
        this.collectSheep();
      }

      const active = this.dogController.active;
      if (active.moving) this.vfx.trail(active.x, active.y, active.color, realDt);
    }

    this.music.tick(this.state.paused || this.state.over);
    const energy = this.music.energy();
    this.beatFlash.setAlpha(energy * 0.08);
    if (!this.state.paused) this.pulseField.update(realDt, energy, this.state.elapsed);

    for (const dog of this.dogs) dog.sync(realDt);
    for (const animal of this.sheep) animal.sync(realDt);
    for (const wolf of this.wolves) wolf.sync();
    for (const lure of this.sheepWolves) lure.sync();
    this.hud.refresh(
      this.state,
      this.dogController,
      this.raid?.phase === 'warning',
      {
        musicMuted: this.music.musicMuted,
        sfxMuted: this.sfx.muted,
      },
      this.hudPowerInfo(),
    );
  }

  updateRaid(dt) {
    const raidLive = this.raid && this.raid.phase !== 'done';
    if (!raidLive && crossedRaidLevel(this.lastLevel, this.state.level, TUNING.raidEveryLevels)) {
      this.beginRaid();
    }
    this.lastLevel = this.state.level;

    if (!this.raid || this.raid.phase === 'done') return;

    if (this.raid.phase === 'warning') {
      this.raid.warningTimer -= dt;
      if (this.raid.warningTimer <= 0) this.raid.phase = 'wave';
    }

    if (this.raid.queue.length > 0) {
      this.raid.spawnTimer -= dt;
      if (this.raid.spawnTimer <= 0) {
        this.spawnNextRaidWolf();
        this.raid.spawnTimer = TUNING.raidSpawnGap;
      }
    }

    const spawning = this.raid.queue.length > 0;
    const alive = this.wolves.some((wolf) => wolf.active);
    if (!spawning && !alive) this.endRaid();
  }

  beginRaid() {
    this.spawnsLocked = true;

    
    const sides = ['left', 'top', 'bottom'];
    const perSide = TUNING.raidWolvesPerSide + 1;
    const queue = [];
    for (let i = 0; i < perSide; i += 1) {
      for (const side of sides) {
        queue.push({ side, slot: (i + 1) / (perSide + 1) });
      }
    }

    this.raid = {
      phase: 'warning',
      warningTimer: TUNING.raidWarningSeconds,
      spawnTimer: 0.35,
      queue,
    };

    for (const wolf of this.wolves) wolf.hide?.();
    this.wolves = [];
    for (const lure of this.sheepWolves) lure.hide?.();
    this.sheepWolves = [];

    for (const drop of this.powerDrops) drop.take?.();
    this.powerDrops = [];
    this.clearActiveEffect();

    for (const animal of this.sheep) {
      if (!animal.removed) animal.remove();
    }
    this.sheep = [];

    const midX = (BOUNDS.left + BOUNDS.right) / 2 - 80;
    const midY = (BOUNDS.top + BOUNDS.bottom) / 2;
    const bait = new Sheep(this, {
      x: midX,
      y: midY,
      wanderAngle: 0,
      wanderTurn: 0,
      wanderSpeed: 36,
      fleeSpeed: 36,
    });
    bait.ignoreDogs = true;
    bait.seekCorral = true;
    this.sheep.push(bait);

    this.vfx.shake(0.006, 160);
    this.vfx.flashColor(0xff3355, 140);
  }

  spawnNextRaidWolf() {
    const next = this.raid.queue.shift();
    if (!next) return;
    const pace = paceForLevel(this.state.level);
    const point = spawnWolfFromSide(next.side, next.slot);
    const wolf = new Wolf(this, point);
    wolf.speed = pace.wolfSpeed;
    this.wolves.push(wolf);
    this.vfx.shake(0.003, 50);
  }

  endRaid() {
    this.raid = null;
    this.spawnsLocked = false;
    this.herdTimer = Math.max(this.herdTimer, 3);
    this.wolfTimer = Math.max(this.wolfTimer, 4);
    for (const animal of this.sheep) {
      if (animal.ignoreDogs) animal.ignoreDogs = false;
      if (animal.seekCorral) animal.seekCorral = false;
    }
  }

  spawnPowers(dt) {
    const raidLevel = this.state.level > 0 && this.state.level % TUNING.raidEveryLevels === 0;
    if (raidLevel || this.raid || this.powerDrops.some((drop) => drop.alive)) {
      this.powerTimer = Math.min(this.powerTimer, TUNING.powerInterval);
      return;
    }
    this.powerTimer -= dt;
    if (this.powerTimer > 0) return;
    this.powerTimer = TUNING.powerInterval;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const x = BOUNDS.left + 90 + Math.random() * (BOUNDS.right - BOUNDS.left - 300);
      const y = BOUNDS.top - 28;
      if (this.corral.covers(x, BOUNDS.top + 40)) continue;
      this.powerDrops.push(new PowerDrop(this, x, y, randomPowerKind()));
      return;
    }
  }

  updatePowers(dt) {
    const dog = this.dogController.active;
    for (const drop of this.powerDrops) {
      if (!drop.alive) continue;
      drop.update(dt);
      const dist = Math.hypot(dog.x - drop.x, dog.y - drop.y);
      if (dist > TUNING.powerPickupRadius) continue;
      const kind = drop.take();
      if (!kind) continue;
      this.heldPower = kind;
      const color = POWER_INFO[kind]?.color ?? COLORS.frame;
      this.vfx.burst(drop.x, drop.y, color, 10);
      this.sfx.play('score');
      this.vfx.shake(0.003, 50);
    }
    this.powerDrops = this.powerDrops.filter((drop) => drop.alive);
  }

  hudPowerInfo() {
    if (this.heldPower) return POWER_INFO[this.heldPower];
    const effect = this.activeEffect;
    if (effect && POWER_INFO[effect.id]) {
      return {
        ...POWER_INFO[effect.id],
        hint: `${Math.ceil(effect.timer)}s`,
      };
    }
    return null;
  }

  activatePower() {
    if (!this.heldPower || this.state.paused || this.state.over) return;
    if (this.activeEffect) return;
    const kind = this.heldPower;
    this.heldPower = null;
    this.sfx.play('bark');

    if (kind === 'blast') this.activateBlast();
    else if (kind === 'magnet') this.activateMagnet();
    else if (kind === 'wide') this.activateWide();
  }

  activateMagnet() {
    const dog = this.dogController.active;
    this.clearActiveEffect();
    this.activeEffect = {
      id: 'magnet',
      timer: TUNING.powerMagnetDuration,
      pulse: 0,
      aura: this.add.circle(dog.x, dog.y, 34, POWER_INFO.magnet.color, 0.16)
        .setStrokeStyle(2, POWER_INFO.magnet.color, 0.85)
        .setDepth(8),
    };
    this.vfx.ring(dog.x, dog.y, POWER_INFO.magnet.color, 20, 90, 320);
    this.vfx.flashColor(POWER_INFO.magnet.color, 90);
    this.sfx.play('switch');
  }

  activateWide() {
    this.clearActiveEffect();
    this.activeEffect = {
      id: 'wide',
      timer: TUNING.powerWideDuration,
      pulse: 0,
      widen: 0,
      expanding: true,
    };
    this.sfx.play('expand');
    this.vfx.flashColor(POWER_INFO.wide.color, 90);
    this.corral.pulseEntrance();
    this.animateGateWiden(TUNING.powerWideExtra, 380, true);
  }

  animateGateWiden(target, duration, opening) {
    const state = { v: this.corral.gateWiden || 0 };
    this.tweens.add({
      targets: state,
      v: target,
      duration,
      ease: opening ? 'Cubic.easeOut' : 'Cubic.easeIn',
      onUpdate: () => {
        this.corral.setGateWiden(state.v);
        this.refreshColliders();
      },
      onComplete: () => {
        this.corral.setGateWiden(target);
        this.refreshColliders();
      },
    });
  }

  refreshColliders() {
    this.colliders = [...this.fieldObstacles, ...this.corral.fences];
  }

  updateActiveEffect(dt) {
    const effect = this.activeEffect;
    if (!effect) return;
    effect.timer -= dt;
    effect.pulse = (effect.pulse || 0) + dt * 6;

    if (effect.id === 'magnet' && effect.aura) {
      const dog = this.dogController.active;
      const pulse = 1 + Math.sin(effect.pulse) * 0.12;
      effect.aura.setPosition(dog.x, dog.y);
      effect.aura.setScale(pulse);
      effect.aura.setAlpha(0.12 + Math.sin(effect.pulse * 1.3) * 0.08);
    }

    if (effect.id === 'wide') {
      this.corral.redraw(0.35 + Math.sin(effect.pulse) * 0.2);
    }

    if (effect.timer <= 0) this.clearActiveEffect();
  }

  clearActiveEffect() {
    if (!this.activeEffect) return;
    const effect = this.activeEffect;
    effect.aura?.destroy?.();
    effect.veil?.destroy?.();
    if (effect.id === 'wide' && this.corral.gateWiden > 0) {
      this.sfx.play('contract');
      this.animateGateWiden(0, 320, false);
    }
    this.activeEffect = null;
  }

  activateBlast() {
    const dog = this.dogController.active;
    const radius = TUNING.powerBlastRadius;
    this.vfx.ring(dog.x, dog.y, 0x39ff6a, 24, radius, 420);
    this.vfx.flashColor(0x39ff6a, 120);
    this.vfx.shake(0.008, 140);
    this.sfx.play('kill');

    let kills = 0;
    for (const wolf of this.wolves) {
      if (!wolf.active) continue;
      if (Math.hypot(wolf.x - dog.x, wolf.y - dog.y) > radius) continue;
      this.state.add(TUNING.wolfPoints);
      this.vfx.scorePop(wolf.x, wolf.y, TUNING.wolfPoints);
      this.vfx.burst(wolf.x, wolf.y, 0xff3355, 8);
      wolf.hide?.();
      kills += 1;
    }
    for (const lure of this.sheepWolves) {
      if (!lure.active) continue;
      if (Math.hypot(lure.x - dog.x, lure.y - dog.y) > radius) continue;
      this.state.add(TUNING.wolfPoints);
      this.vfx.scorePop(lure.x, lure.y, TUNING.wolfPoints);
      this.vfx.burst(lure.x, lure.y, 0xff3355, 8);
      lure.hide?.();
      kills += 1;
    }
    if (kills) {
      this.wolves = this.wolves.filter((wolf) => wolf.active);
      this.sheepWolves = this.sheepWolves.filter((lure) => lure.active);
    }
  }

  onDogSwitched() {
    const dog = this.dogController.active;
    this.vfx.ring(dog.x, dog.y, dog.color);
    this.vfx.flashColor(dog.color, 90);
    this.vfx.shake(0.003, 60);
    this.sfx.play('switch');
  }

  spawnWolves(dt, pace) {
    if (this.wolfTimer > pace.wolfInterval) this.wolfTimer = pace.wolfInterval;
    this.wolfTimer -= dt;
    const alive = this.wolves.filter((wolf) => wolf.active).length;
    if (this.wolfTimer > 0 || alive >= pace.wolfMax) return;

    const want = Math.min(pace.wolfMax - alive, pace.wolfWave || 1);
    let spawned = 0;
    for (let i = 0; i < want; i += 1) {
      const point = this.pickWolfOrigin();
      if (!point) break;
      const wolf = new Wolf(this, point);
      wolf.speed = pace.wolfSpeed;
      this.wolves.push(wolf);
      spawned += 1;
    }

    if (spawned === 0) {
      this.wolfTimer = 1.2;
      return;
    }
    this.wolfTimer = pace.wolfInterval;
  }

  spawnSheepWolves(dt) {
    const raidLevel = this.state.level > 0 && this.state.level % TUNING.raidEveryLevels === 0;
    if (raidLevel || this.raid) {
      this.sheepWolfTimer = Math.min(this.sheepWolfTimer, TUNING.sheepWolfInterval);
      return;
    }
    if (this.sheepWolfTimer > TUNING.sheepWolfInterval) this.sheepWolfTimer = TUNING.sheepWolfInterval;
    this.sheepWolfTimer -= dt;
    const alive = this.sheepWolves.filter((lure) => lure.active).length;
    if (this.sheepWolfTimer > 0 || alive >= 1) return;

    const point = this.pickSheepWolfOrigin();
    if (!point) {
      this.sheepWolfTimer = 1.2;
      return;
    }
    this.sheepWolves.push(new SheepWolf(this, point));
    this.sheepWolfTimer = TUNING.sheepWolfInterval;
    this.vfx.ring(point.x, point.y, 0xff3355, 10, 40, 280);
    this.sfx.play('sheepwolf');
  }

  pickSheepWolfOrigin() {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const point = spawnSheepWolfFromEdge();
      const entryX = Math.min(BOUNDS.right - 40, Math.max(BOUNDS.left + 40, point.x));
      const entryY = Math.min(BOUNDS.bottom - 40, Math.max(BOUNDS.top + 40, point.y));
      if (nearAny(
        entryX,
        entryY,
        this.sheep,
        (animal) => !animal.removed && !animal.lost && !animal.secured,
        TUNING.spawnClearance,
      )) continue;
      return point;
    }
    return null;
  }

  spawnHerd(dt, pace) {
    if (this.herdTimer > pace.herdInterval) this.herdTimer = pace.herdInterval;
    const alive = this.sheep.filter((animal) => !animal.removed && !animal.lost && !animal.secured).length;
    
    if (alive === 0 && this.herdTimer > 1) this.herdTimer = 1;
    this.herdTimer -= dt;
    if (this.herdTimer > 0 || alive >= TUNING.herdCap) return;

    const origin = this.pickHerdOrigin();
    if (!origin) {
      this.herdTimer = 1.2;
      return;
    }

    this.herdTimer = pace.herdInterval;
    this.sheep.push(...createHerd(this, origin, pace.herdSize));
  }

  pickHerdOrigin() {
    for (let attempt = 0; attempt < 36; attempt += 1) {
      const x = BOUNDS.left + 90 + Math.random() * (BOUNDS.right - BOUNDS.left - 360);
      const y = BOUNDS.top + 90 + Math.random() * (BOUNDS.bottom - BOUNDS.top - 180);
      if (this.corral.covers(x, y)) continue;
      if (nearObstacle(x, y, this.fieldObstacles, 70)) continue;
      if (nearAny(x, y, this.wolves, (wolf) => wolf.active, TUNING.spawnClearance)) continue;
      return { x, y };
    }
    return null;
  }

  pickWolfOrigin() {
    for (let attempt = 0; attempt < 48; attempt += 1) {
      const point = spawnWolfFromEdge();
      
      const entryX = Math.min(BOUNDS.right - 40, Math.max(BOUNDS.left + 40, point.x));
      const entryY = Math.min(BOUNDS.bottom - 40, Math.max(BOUNDS.top + 40, point.y));
      if (nearAny(entryX, entryY, this.sheep, (animal) => !animal.removed && !animal.lost && !animal.secured, TUNING.spawnClearance)) {
        continue;
      }
      if (nearAny(point.x, point.y, this.wolves, (wolf) => wolf.active, 90)) continue;
      return point;
    }
    return null;
  }

  collectSheep() {
    let securedNow = false;
    for (const animal of this.sheep) {
      if (animal.removed) continue;
      if (animal.secured && !animal.collected) {
        animal.collected = true;
        this.state.add(TUNING.sheepPoints);
        this.vfx.scorePop(animal.x, animal.y, TUNING.sheepPoints);
        this.vfx.burst(animal.x, animal.y, 0xffffff, 7);
        this.sfx.play('score');
        securedNow = true;
        animal.remove();
      } else if (animal.lost) {
        animal.remove();
      }
    }
    if (securedNow) {
      this.corral.pulseEntrance();
      this.vfx.shake(0.0035, 70);
    }
    this.sheep = this.sheep.filter((animal) => !animal.removed);
  }

  readDirection() {
    if (this.state.paused) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    if (this.keys.left.isDown || this.keys.A.isDown) x -= 1;
    if (this.keys.right.isDown || this.keys.D.isDown) x += 1;
    if (this.keys.up.isDown || this.keys.W.isDown) y -= 1;
    if (this.keys.down.isDown || this.keys.S.isDown) y += 1;
    return { x, y };
  }

  readSwitch() {
    const shiftDown = this.keys.SHIFT.isDown;
    if (shiftDown && !this.shiftHeld && !this.state.paused && !this.state.over) {
      this.dogController.switchToNext();
      this.onDogSwitched();
    }
    this.shiftHeld = shiftDown;
  }

  readPause() {
    const escDown = this.keys.ESC.isDown;
    if (escDown && !this.escHeld && !this.state.over) {
      this.state.paused = !this.state.paused;
      if (this.state.paused) this.hud.menuIndex = 0;
    }
    this.escHeld = escDown;
  }

  readPower() {
    const spaceDown = this.keys.SPACE.isDown;
    if (spaceDown && !this.spaceHeld && !this.state.paused && !this.state.over) {
      this.activatePower();
    }
    this.spaceHeld = spaceDown;
  }

  readPauseMenu() {
    if (!this.state.paused || this.state.over) {
      this.upHeld = this.keys.up.isDown || this.keys.W.isDown;
      this.downHeld = this.keys.down.isDown || this.keys.S.isDown;
      this.enterHeld = this.keys.ENTER.isDown;
      return;
    }

    const upDown = this.keys.up.isDown || this.keys.W.isDown;
    const downDown = this.keys.down.isDown || this.keys.S.isDown;
    const enterDown = this.keys.ENTER.isDown
      || this.keys.left.isDown
      || this.keys.right.isDown
      || this.keys.A.isDown
      || this.keys.D.isDown;

    if (upDown && !this.upHeld) {
      this.hud.menuIndex = (this.hud.menuIndex + 2) % 3;
      this.sfx.play('ui');
    }
    if (downDown && !this.downHeld) {
      this.hud.menuIndex = (this.hud.menuIndex + 1) % 3;
      this.sfx.play('ui');
    }
    if (enterDown && !this.enterHeld) {
      if (this.hud.menuIndex === 0) {
        this.music.toggleMusicMuted();
        this.sfx.play('ui');
      } else if (this.hud.menuIndex === 1) {
        this.sfx.toggleMuted();
        this.sfx.play('ui');
      } else {
        this.scene.restart();
        return;
      }
    }

    this.upHeld = upDown;
    this.downHeld = downDown;
    this.enterHeld = enterDown;
  }

  readRestart() {
    const restartDown = this.keys.R.isDown;
    if (restartDown && !this.restartHeld) {
      this.scene.restart();
      return true;
    }
    this.restartHeld = restartDown;
    return false;
  }
}

function crossedRaidLevel(fromLevel, toLevel, every) {
  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    if (level > 0 && level % every === 0) return true;
  }
  return false;
}

function nearObstacle(x, y, obstacles, margin) {
  for (const obs of obstacles) {
    if (x >= obs.left - margin
      && x <= obs.right + margin
      && y >= obs.top - margin
      && y <= obs.bottom + margin) {
      return true;
    }
  }
  return false;
}

function nearAny(x, y, list, accept, radius) {
  const limit = radius * radius;
  for (const entry of list) {
    if (!accept(entry)) continue;
    const dx = entry.x - x;
    const dy = entry.y - y;
    if (dx * dx + dy * dy < limit) return true;
  }
  return false;
}
