import Phaser from 'phaser';
import { getMusic } from '../audio/Music.js';
import { getSfx } from '../audio/Sfx.js';
import { BOUNDS, COLORS, DOGS, GAME_HEIGHT, GAME_WIDTH, TUNING, paceForLevel } from '../config.js';
import { createArena } from '../entities/Arena.js';
import { Corral } from '../entities/Corral.js';
import { Dog } from '../entities/Dog.js';
import { brandSparseOwners, createFlock, createHerd, Sheep } from '../entities/Sheep.js';
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
import { SpikeHazards } from '../systems/SpikeHazards.js';
import { WallHazards } from '../systems/WallHazards.js';
import { ejectFromObstacles, ejectFromSpike } from '../systems/collision.js';
import { loadSettings, updateSettings } from '../systems/Settings.js';
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
    this.baseObstacles = arena.obstacles;
    this.fieldObstacles = [...this.baseObstacles];
    this.arenaFrame = arena.frame;
    this.corral = new Corral(this);
    this.spikeHazards = new SpikeHazards(this);
    this.wallHazards = new WallHazards(this);
    this.colliders = [...this.fieldObstacles, ...this.corral.fences];

    this.dogs = DOGS.map((config) => new Dog(this, config));
    this.sheep = createFlock(this);
    this.wolves = [];
    this.sheepWolves = [];
    this.wolfTimer = TUNING.wolfFirstDelay;
    this.sheepWolfTimer = TUNING.sheepWolfFirstDelay;
    this.herdTimer = TUNING.herdFirstDelay;
    this.lastHerdZone = -1;
    this.dogController = new DogController(this.dogs);
    this.state = new GameState();
    this.lastLevel = 1;
    this.raid = null;
    this.spawnsLocked = false;
    this.powerDrops = [];
    this.activeEffects = [];
    this.powerTimer = TUNING.powerFirstDelay;
    this.vfx = new Vfx(this);
    this.hud = new HUD(this);
    this.music = getMusic();
    this.sfx = getSfx();
    const settings = loadSettings();
    this.music.setMode('game');
    this.music.setVolume(settings.volume ?? 1);
    this.sfx.setVolume(settings.volume ?? 1);
    this.music.setMusicMuted(!settings.music);
    this.sfx.setMuted(!settings.sound);

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
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
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
      const nowallsOn = this.activeEffects.some((fx) => fx.id === 'wide');
      const hazardLock = this.spawnsLocked || !!this.raid || nowallsOn;
      this.spikeHazards.update(realDt, {
        level: this.state.level,
        locked: hazardLock,
      });
      const walls = this.wallHazards.update(realDt, {
        level: this.state.level,
        locked: hazardLock,
        paused: false,
      });
      if (walls.changed) {
        this.syncFieldObstacles();
        if (this.wallHazards.phase === 'live') this.ejectUnitsFromWalls();
      }
      this.applySpikeHits();
      const corralLevel = this.raid ? 0 : this.state.level;
      const corralMove = this.corral.update(realDt, corralLevel);

      if (corralMove.dx || corralMove.dy) {
        this.refreshColliders();
        for (const animal of this.sheep) {
          if (animal.removed || animal.lost) continue;
          if (animal.secured || animal.collected) {
            animal.x += corralMove.dx;
            animal.y += corralMove.dy;
          }
        }
      }
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
      const magnetFx = this.activeEffects.find((fx) => fx.id === 'magnet') || null;
      const raidWarning = this.raid?.phase === 'warning';
      if (!raidWarning) {
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
          magnetFx,
        );
      } else {
        for (const animal of this.sheep) {
          animal.vx = 0;
          animal.vy = 0;
          if (animal.raidAnchor) {
            animal.x = animal.raidAnchor.x;
            animal.y = animal.raidAnchor.y;
          }
        }
      }
      const raidHit = this.raid && this.raid.phase === 'wave';
      const result = raidWarning
        ? { killed: [], spots: [] }
        : updateWolves(
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
        this.state.endRun('wolf');
        this.music.setMode('menu');
        this.vfx.shake(0.01, 220);
        this.vfx.flashColor(0xff3355, 180);
        this.sfx.play('hurt');
        if (this.state.newBest || this.state.newBestTime) this.sfx.play('score');
      }
      this.wolves = this.wolves.filter((wolf) => wolf.active);
      this.sheepWolves = this.sheepWolves.filter((lure) => lure.active);
      if (!this.state.over) {
        secureSheepInside(this.sheep, this.corral);

        if (this.raid && this.sheep.some((animal) => animal.raidSheep && animal.secured)) {
          this.endRaid({ reward: true });
        }
        this.collectSheep();
      }

      const active = this.dogController.active;
      if (active.moving) this.vfx.trail(active.x, active.y, active.color, realDt);
    }

    this.music.tick(this.state.paused);
    const energy = this.music.energy();
    this.beatFlash.setAlpha(energy * 0.08);
    if (!this.state.paused) {
      this.pulseField.update(realDt, energy, this.state.elapsed);
      this.corral.applyTheme?.(this.pulseField.theme);
    }

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
      if (this.raid.warningTimer <= 0) {
        this.raid.phase = 'wave';
        for (const animal of this.sheep) {
          if (!animal.raidSheep) continue;
          animal.raidAnchor = null;
          animal.seekCorral = true;
          animal.ignoreDogs = true;
          animal.wanderSpeed = TUNING.raidSheepSpeed;
          animal.fleeSpeed = TUNING.raidSheepSpeed;
        }
      }
      return;
    }

    const escort = this.sheep.find((animal) => (
      animal.raidSheep && !animal.removed && !animal.lost && !animal.secured
    ));
    if (!escort) return;

    const alive = this.wolves.filter((wolf) => wolf.active).length;
    this.raid.spawnTimer -= dt;
    if (this.raid.spawnTimer <= 0 && alive < TUNING.raidWolfMax) {
      this.spawnNextRaidWolf();
      this.raid.spawnTimer = TUNING.raidSpawnGap;
    }
  }

  beginRaid() {
    this.spawnsLocked = true;
    this.spikeHazards.clear();
    this.wallHazards.clear();
    this.syncFieldObstacles();

    this.corral.x = this.corral.homeX;
    this.corral.y = this.corral.homeY;
    this.corral.moveT = 0;
    this.corral.rebuildGeometry();
    this.corral.syncVisuals?.(false);
    this.refreshColliders();

    this.raid = {
      phase: 'warning',
      warningTimer: TUNING.raidWarningSeconds,
      spawnTimer: 0.35,
    };

    for (const wolf of this.wolves) wolf.hide?.();
    this.wolves = [];
    for (const lure of this.sheepWolves) lure.hide?.();
    this.sheepWolves = [];

    for (const drop of this.powerDrops) drop.take?.();
    this.powerDrops = [];
    this.clearAllEffects();

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
      wanderSpeed: TUNING.raidSheepSpeed,
      fleeSpeed: TUNING.raidSheepSpeed,
    });
    bait.ignoreDogs = true;
    bait.seekCorral = false;
    bait.raidSheep = true;
    bait.raidAnchor = { x: midX, y: midY };
    this.sheep.push(bait);

    const radius = TUNING.raidDogRadius;
    const posts = [
      { x: midX - radius, y: midY },
      { x: midX, y: midY - radius },
      { x: midX, y: midY + radius },
    ];

    for (let i = 0; i < this.dogs.length; i += 1) {
      const dog = this.dogs[i];
      const post = posts[i] || posts[0];
      dog.x = post.x;
      dog.y = post.y;
      dog.moving = false;
      dog.sync?.(0);
    }

    this.vfx.shake(0.006, 160);
    this.vfx.flashColor(0xff3355, 140);
    this.sfx.play('sheepwolf');
  }

  spawnNextRaidWolf() {
    if (!this.raid) return;
    const pace = paceForLevel(this.state.level);
    const sides = ['left', 'right', 'top', 'bottom'];
    let point = null;
    for (let attempt = 0; attempt < 24 && !point; attempt += 1) {
      const side = sides[Math.floor(Math.random() * sides.length)];
      point = this.pickRaidWolfPoint(side, 0.12 + Math.random() * 0.76);
    }
    if (!point) return;
    const wolf = new Wolf(this, point);
    wolf.speed = pace.wolfSpeed;
    wolf.spawnGrace = TUNING.wolfSpawnGrace * 0.45;
    this.wolves.push(wolf);
    this.vfx.shake(0.003, 50);
  }

  pickRaidWolfPoint(side, slot = 0.5) {
    const point = spawnWolfFromSide(side, slot, { fullRim: true });
    const entryX = Math.min(BOUNDS.right - 40, Math.max(BOUNDS.left + 40, point.x));
    const entryY = Math.min(BOUNDS.bottom - 40, Math.max(BOUNDS.top + 40, point.y));
    if (this.entryBlockedBySpikes(entryX, entryY, side)) return null;

    const escort = this.sheep.find((animal) => (
      animal.raidSheep && !animal.removed && !animal.lost && !animal.secured
    ));
    if (!escort) return point;
    if (Math.hypot(escort.x - entryX, escort.y - entryY) < 160) return null;
    return point;
  }

  entryBlockedBySpikes(x, y, side = null) {
    const hits = this.spikeHazards?.liveHitboxes?.() || [];
    if (!hits.length) return false;
    const margin = 36;
    for (const hit of hits) {
      if (side && hit.edge && hit.edge !== side) continue;
      if (x < hit.left - margin || x > hit.right + margin) continue;
      if (y < hit.top - margin || y > hit.bottom + margin) continue;
      return true;
    }
    return false;
  }

  endRaid({ reward = true } = {}) {
    if (!this.raid) return;

    for (const wolf of this.wolves) wolf.hide?.();
    this.wolves = [];

    this.raid = null;
    this.spawnsLocked = false;
    this.herdTimer = Math.max(this.herdTimer, 3);
    this.wolfTimer = Math.max(this.wolfTimer, 4);

    for (const animal of this.sheep) {
      animal.raidAnchor = null;
      animal.raidSheep = false;
      animal.ignoreDogs = false;
      animal.seekCorral = false;
    }

    if (!reward) return;

    const inner = this.corral.inner;
    const dropX = (inner.left + inner.right) * 0.5;
    const dropY = (inner.top + inner.bottom) * 0.5;
    const kind = randomPowerKind();
    const drop = new PowerDrop(this, dropX, dropY, kind, { grounded: true });
    drop.glow?.setDepth(920);
    drop.body?.setDepth(921);
    this.powerDrops.push(drop);
    this.vfx.ring(dropX, dropY, POWER_INFO[kind].color, 18, 70, 320);
    this.vfx.burst(dropX, dropY, POWER_INFO[kind].color, 12);
    this.sfx.play('score');
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

      if (drop.kind !== dog.power) continue;
      const kind = drop.take();
      if (!kind) continue;
      dog.heldPower = kind;
      const color = POWER_INFO[kind]?.color ?? dog.color;
      this.vfx.burst(drop.x, drop.y, color, 10);
      this.sfx.play('score');
      this.vfx.shake(0.003, 50);
    }
    this.powerDrops = this.powerDrops.filter((drop) => drop.alive);
  }

  hudPowerInfo() {
    const dog = this.dogController.active;
    if (dog?.heldPower) {
      return {
        ...POWER_INFO[dog.heldPower],
        color: dog.color,
        owner: dog.name,
      };
    }
    const effect = this.activeEffects.find((fx) => fx.id === dog?.power)
      || this.activeEffects[0];
    if (effect && POWER_INFO[effect.id]) {
      return {
        ...POWER_INFO[effect.id],
        hint: `${Math.ceil(effect.timer)}s`,
        color: effect.dog?.color ?? POWER_INFO[effect.id].color,
      };
    }
    if (dog?.power && POWER_INFO[dog.power]) {
      return {
        ...POWER_INFO[dog.power],
        hint: '—',
        color: dog.color,
        empty: true,
      };
    }
    return null;
  }

  activatePower() {
    const dog = this.dogController.active;
    if (!dog?.heldPower || this.state.paused || this.state.over) return;
    const kind = dog.heldPower;
    dog.heldPower = null;
    this.sfx.play('bark');

    if (kind === 'blast') this.activateBlast();
    else if (kind === 'magnet') this.activateMagnet();
    else if (kind === 'wide') this.activateWide();
  }

  activateMagnet() {
    const dog = this.dogController.active;
    const gate = this.corral.gateCenter?.() || {
      x: this.corral.outer.left + 10,
      y: this.corral.y + (this.corral.gateStartRel + this.corral.gateEndRel) * 0.5,
    };
    this.clearEffectsById('magnet');
    this.activeEffects.push({
      id: 'magnet',
      dog,
      timer: TUNING.powerMagnetDuration,
      pulse: 0,
      aura: this.add.circle(gate.x, gate.y, Math.min(90, TUNING.powerMagnetRadius * 0.12), POWER_INFO.magnet.color, 0.16)
        .setStrokeStyle(2, POWER_INFO.magnet.color, 0.85)
        .setDepth(8),
    });
    this.vfx.ring(gate.x, gate.y, POWER_INFO.magnet.color, 28, 140, 420);
    this.vfx.flashColor(POWER_INFO.magnet.color, 90);
    this.sfx.play('switch');
  }

  activateWide() {
    const alreadyWide = this.activeEffects.some((fx) => fx.id === 'wide');
    this.clearEffectsById('wide', { keepGateOpen: true });
    this.activeEffects.push({
      id: 'wide',
      timer: TUNING.powerWideDuration,
      pulse: 0,
      widen: 0,
      expanding: true,
    });
    this.sfx.play('expand');
    this.vfx.flashColor(POWER_INFO.wide.color, 90);

    this.spikeHazards.clear();
    this.wallHazards.clear();
    this.syncFieldObstacles();

    if (!alreadyWide) {
      this.corral.pulseEntrance();
      this.animateGateWiden(this.corral.maxGateWiden(), 420, true);
    }
    const midX = (this.corral.outer.left + this.corral.outer.right) / 2;
    const midY = (this.corral.outer.top + this.corral.outer.bottom) / 2;
    this.vfx.ring(midX, midY, POWER_INFO.wide.color, 30, 200, 420);
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

  syncFieldObstacles() {
    this.fieldObstacles = [
      ...this.baseObstacles,
      ...this.wallHazards.solidColliders(),
    ];
    this.refreshColliders();
  }

  ejectUnitsFromWalls() {
    const solids = this.fieldObstacles;
    if (!solids.length) return;
    for (const dog of this.dogs) ejectFromObstacles(dog, solids);
    for (const animal of this.sheep) {
      if (animal.removed || animal.lost) continue;
      ejectFromObstacles(animal, solids);
    }
    for (const wolf of this.wolves) {
      if (wolf.active) ejectFromObstacles(wolf, solids);
    }
    for (const lure of this.sheepWolves) {
      if (lure.active) ejectFromObstacles(lure, solids);
    }
  }

  applySpikeHits() {
    const hits = this.spikeHazards.liveHitboxes();
    if (!hits.length || this.state.over) return;

    let caught = false;
    for (const animal of this.sheep) {
      if (animal.removed || animal.lost || animal.secured) continue;
      for (const hit of hits) {
        if (animal.x < hit.left || animal.x > hit.right) continue;
        if (animal.y < hit.top || animal.y > hit.bottom) continue;
        animal.lost = true;
        animal.vx = 0;
        animal.vy = 0;
        this.vfx.burst(animal.x, animal.y, COLORS.wolfEdge, 8);
        caught = true;
        break;
      }
    }

    for (const dog of this.dogs) {
      for (const hit of hits) {
        if (dog.x < hit.left || dog.x > hit.right) continue;
        if (dog.y < hit.top || dog.y > hit.bottom) continue;
        ejectFromSpike(dog, hit);
      }
    }
    for (const wolf of this.wolves) {
      if (!wolf.active) continue;
      for (const hit of hits) {
        if (wolf.x < hit.left || wolf.x > hit.right) continue;
        if (wolf.y < hit.top || wolf.y > hit.bottom) continue;
        ejectFromSpike(wolf, hit);
      }
    }

    if (caught) {
      this.state.endRun('spike');
      this.music.setMode('menu');
      this.vfx.shake(0.01, 220);
      this.vfx.flashColor(COLORS.wolfEdge, 180);
      this.sfx.play('hurt');
      if (this.state.newBest || this.state.newBestTime) this.sfx.play('score');
    }
  }

  refreshColliders() {
    this.colliders = [...this.fieldObstacles, ...this.corral.fences];
  }

  updateActiveEffect(dt) {
    if (!this.activeEffects.length) return;
    const expired = [];
    for (const effect of this.activeEffects) {
      effect.timer -= dt;
      effect.pulse = (effect.pulse || 0) + dt * 6;

      if (effect.id === 'magnet' && effect.aura) {
        const gate = this.corral.gateCenter?.() || {
          x: this.corral.outer.left + 10,
          y: this.corral.y + (this.corral.gateStartRel + this.corral.gateEndRel) * 0.5,
        };
        const pulse = 1 + Math.sin(effect.pulse) * 0.12;
        effect.aura.setPosition(gate.x, gate.y);
        effect.aura.setScale(pulse);
        effect.aura.setAlpha(0.14 + Math.sin(effect.pulse * 1.3) * 0.1);
      }

      if (effect.id === 'wide' && ((effect.pulse * 10) | 0) !== (effect.drawnPulse | 0)) {
        effect.drawnPulse = (effect.pulse * 10) | 0;
        this.corral.redraw(0.35 + Math.sin(effect.pulse) * 0.2);
      }

      if (effect.timer <= 0) expired.push(effect);
    }
    for (const effect of expired) this.clearEffect(effect);
  }

  clearEffect(effect, { keepGateOpen = false } = {}) {
    if (!effect) return;
    effect.aura?.destroy?.();
    effect.veil?.destroy?.();
    this.activeEffects = this.activeEffects.filter((fx) => fx !== effect);
    if (effect.id === 'wide' && !keepGateOpen && this.corral.gateWiden > 0
      && !this.activeEffects.some((fx) => fx.id === 'wide')) {
      this.sfx.play('contract');
      this.animateGateWiden(0, 320, false);
    }
  }

  clearEffectsById(id, opts = {}) {
    for (const effect of [...this.activeEffects]) {
      if (effect.id === id) this.clearEffect(effect, opts);
    }
  }

  clearAllEffects() {
    for (const effect of [...this.activeEffects]) this.clearEffect(effect);
  }

  activateBlast() {
    const dog = this.dogController.active;
    const midX = (BOUNDS.left + BOUNDS.right) / 2;
    const midY = (BOUNDS.top + BOUNDS.bottom) / 2;
    const color = dog?.color ?? POWER_INFO.blast.color;
    this.vfx.ring(midX, midY, color, 40, 720, 520);
    this.vfx.flashColor(color, 160);
    this.vfx.shake(0.012, 180);
    this.sfx.play('kill');

    let kills = 0;
    for (const wolf of this.wolves) {
      if (!wolf.active) continue;
      this.state.add(TUNING.wolfPoints);
      this.vfx.scorePop(wolf.x, wolf.y, TUNING.wolfPoints);
      this.vfx.burst(wolf.x, wolf.y, 0xff3355, 8);
      wolf.hide?.();
      kills += 1;
    }
    for (const lure of this.sheepWolves) {
      if (!lure.active) continue;
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
      wolf.spawnGrace = TUNING.wolfSpawnGrace;
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
    if (this.state.level < TUNING.sheepWolfStartLevel) {
      this.sheepWolfTimer = TUNING.sheepWolfFirstDelay;
      return;
    }
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
    const sheepWolfLive = this.sheepWolves.some((lure) => lure.active);

    if (sheepWolfLive) {
      this.herdTimer = Math.min(this.herdTimer, pace.herdInterval);
      return;
    }

    if (alive === 0 && this.herdTimer > 1) this.herdTimer = 1;
    this.herdTimer -= dt;
    if (this.herdTimer > 0 || alive >= TUNING.herdCap) return;

    const origin = this.pickHerdOrigin();
    if (!origin) {
      this.herdTimer = 1.2;
      return;
    }

    this.herdTimer = pace.herdInterval;
    const herd = createHerd(this, origin, pace.herdSize);
    brandSparseOwners(herd, this.dogs, this.sheep, this.state.level);
    this.sheep.push(...herd);
  }

  pickHerdOrigin() {
    const zones = herdSpawnZones();
    const order = zones.map((_, i) => i).sort((a, b) => {
      const preferA = a === this.lastHerdZone ? 1 : 0;
      const preferB = b === this.lastHerdZone ? 1 : 0;
      return preferA - preferB || Math.random() - 0.5;
    });

    for (const zoneIndex of order) {
      const zone = zones[zoneIndex];
      for (let attempt = 0; attempt < 14; attempt += 1) {
        const x = zone.left + Math.random() * (zone.right - zone.left);
        const y = zone.top + Math.random() * (zone.bottom - zone.top);
        if (this.corral.covers(x, y)) continue;
        if (nearObstacle(x, y, this.fieldObstacles, 70)) continue;
        if (nearAny(x, y, this.wolves, (wolf) => wolf.active, TUNING.spawnClearance)) continue;
        if (nearAny(x, y, this.sheep, (animal) => !animal.removed && !animal.lost && !animal.secured, 180)) {
          continue;
        }
        this.lastHerdZone = zoneIndex;
        return { x, y };
      }
    }
    return null;
  }

  pickWolfOrigin() {
    const free = this.sheep.filter((animal) => !animal.removed && !animal.lost && !animal.secured);
    const flock = flockCentroid(free);
    const sides = ['left', 'top', 'bottom'].sort((a, b) => sideDistance(b, flock) - sideDistance(a, flock));

    for (const side of sides) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const slot = 0.18 + Math.random() * 0.64;
        const point = this.pickFairWolfPoint(side, slot);
        if (!point) continue;
        if (nearAny(point.x, point.y, this.wolves, (wolf) => wolf.active, 110)) continue;
        return point;
      }
    }
    return null;
  }

  pickFairWolfPoint(side, slot = 0.5) {
    const point = spawnWolfFromSide(side, slot);
    const free = this.sheep.filter((animal) => !animal.removed && !animal.lost && !animal.secured);

    const entryX = Math.min(BOUNDS.right - 40, Math.max(BOUNDS.left + 40, point.x));
    const entryY = Math.min(BOUNDS.bottom - 40, Math.max(BOUNDS.top + 40, point.y));
    if (this.entryBlockedBySpikes(entryX, entryY, side)) return null;
    if (!free.length) return point;

    const clearance = TUNING.spawnClearance;

    if (nearAny(entryX, entryY, free, () => true, clearance)) return null;
    if (nearAny(point.x, point.y, free, () => true, clearance)) return null;
    if (sheepCrowdingEdge(side, free, entryX, entryY, TUNING.wolfEdgeSheepMargin)) return null;

    let nearest = null;
    let nearestSheep = Infinity;
    for (const animal of free) {
      const d = Math.hypot(animal.x - entryX, animal.y - entryY);
      if (d >= nearestSheep) continue;
      nearestSheep = d;
      nearest = animal;
    }
    if (nearestSheep < clearance) return null;

    if (nearest) {
      let nearestDog = Infinity;
      for (const dog of this.dogs) {
        const d = Math.hypot(nearest.x - dog.x, nearest.y - dog.y);
        if (d < nearestDog) nearestDog = d;
      }
      if (nearestSheep < nearestDog + TUNING.wolfFairCushion) return null;
    }

    return point;
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
    if (escDown && !this.escHeld && this.state.over) {
      this.scene.start('MenuScene');
      this.escHeld = escDown;
      return;
    }
    if (escDown && !this.escHeld && !this.state.over) {
      this.state.paused = !this.state.paused;
      if (this.state.paused) this.hud.menuIndex = 0;
    }
    this.escHeld = escDown;
  }

  readPower() {
    const powerDown = this.keys.SPACE.isDown || this.keys.Z.isDown;
    if (powerDown && !this.spaceHeld && !this.state.paused && !this.state.over) {
      this.activatePower();
    }
    this.spaceHeld = powerDown;
  }

  adjustVolume(dir) {
    const settings = loadSettings();
    const next = Math.max(0, Math.min(1, (settings.volume ?? 1) + dir * 0.1));
    if (Math.abs(next - (settings.volume ?? 1)) < 0.001) return;
    updateSettings({ volume: next });
    this.music.setVolume(next);
    this.sfx.setVolume(next);
    this.sfx.play('ui');
  }

  readPauseMenu() {
    if (!this.state.paused || this.state.over) {
      this.upHeld = this.keys.up.isDown || this.keys.W.isDown;
      this.downHeld = this.keys.down.isDown || this.keys.S.isDown;
      this.leftHeld = this.keys.left.isDown || this.keys.A.isDown;
      this.rightHeld = this.keys.right.isDown || this.keys.D.isDown;
      this.enterHeld = this.keys.ENTER.isDown;
      return;
    }

    const upDown = this.keys.up.isDown || this.keys.W.isDown;
    const downDown = this.keys.down.isDown || this.keys.S.isDown;
    const leftDown = this.keys.left.isDown || this.keys.A.isDown;
    const rightDown = this.keys.right.isDown || this.keys.D.isDown;
    const enterDown = this.keys.ENTER.isDown;
    const menuCount = 5;

    if (upDown && !this.upHeld) {
      this.hud.menuIndex = (this.hud.menuIndex + menuCount - 1) % menuCount;
      this.sfx.play('ui');
    }
    if (downDown && !this.downHeld) {
      this.hud.menuIndex = (this.hud.menuIndex + 1) % menuCount;
      this.sfx.play('ui');
    }
    if (leftDown && !this.leftHeld) {
      if (this.hud.menuIndex === 2) this.adjustVolume(-1);
      else if (this.hud.menuIndex === 0) {
        this.music.toggleMusicMuted();
        this.sfx.play('ui');
      } else if (this.hud.menuIndex === 1) {
        this.sfx.toggleMuted();
        this.sfx.play('ui');
      }
    }
    if (rightDown && !this.rightHeld) {
      if (this.hud.menuIndex === 2) this.adjustVolume(1);
      else if (this.hud.menuIndex === 0) {
        this.music.toggleMusicMuted();
        this.sfx.play('ui');
      } else if (this.hud.menuIndex === 1) {
        this.sfx.toggleMuted();
        this.sfx.play('ui');
      }
    }
    if (enterDown && !this.enterHeld) {
      if (this.hud.menuIndex === 0) {
        this.music.toggleMusicMuted();
        this.sfx.play('ui');
      } else if (this.hud.menuIndex === 1) {
        this.sfx.toggleMuted();
        this.sfx.play('ui');
      } else if (this.hud.menuIndex === 2) {
        this.adjustVolume(1);
      } else if (this.hud.menuIndex === 3) {
        this.scene.restart();
        return;
      } else {
        this.scene.start('MenuScene');
        return;
      }
    }

    this.upHeld = upDown;
    this.downHeld = downDown;
    this.leftHeld = leftDown;
    this.rightHeld = rightDown;
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

function herdSpawnZones() {
  const midX = (BOUNDS.left + BOUNDS.right) * 0.5;
  const midY = (BOUNDS.top + BOUNDS.bottom) * 0.5;

  const rim = 150;
  const playRight = Math.min(BOUNDS.right - 160, 940);
  return [
    {
      left: BOUNDS.left + rim,
      right: midX - 50,
      top: BOUNDS.top + rim,
      bottom: midY - 40,
    },
    {
      left: BOUNDS.left + rim,
      right: midX - 50,
      top: midY + 40,
      bottom: BOUNDS.bottom - rim,
    },
    {
      left: midX + 30,
      right: playRight,
      top: BOUNDS.top + rim,
      bottom: midY - 50,
    },
    {
      left: midX + 30,
      right: playRight,
      top: midY + 50,
      bottom: BOUNDS.bottom - rim,
    },
    {
      left: BOUNDS.left + rim + 20,
      right: midX - 60,
      top: midY - 80,
      bottom: midY + 80,
    },
  ];
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

function flockCentroid(sheep) {
  if (!sheep.length) {
    return {
      x: (BOUNDS.left + BOUNDS.right) / 2,
      y: (BOUNDS.top + BOUNDS.bottom) / 2,
    };
  }
  let x = 0;
  let y = 0;
  for (const animal of sheep) {
    x += animal.x;
    y += animal.y;
  }
  return { x: x / sheep.length, y: y / sheep.length };
}

function sideDistance(side, point) {
  if (side === 'left') return point.x - BOUNDS.left;
  if (side === 'top') return point.y - BOUNDS.top;
  if (side === 'bottom') return BOUNDS.bottom - point.y;
  return BOUNDS.right - point.x;
}

function sheepCrowdingEdge(side, sheep, entryX, entryY, margin) {
  for (const animal of sheep) {
    if (side === 'left' && animal.x - BOUNDS.left < margin && Math.abs(animal.y - entryY) < margin) {
      return true;
    }
    if (side === 'top' && animal.y - BOUNDS.top < margin && Math.abs(animal.x - entryX) < margin) {
      return true;
    }
    if (side === 'bottom' && BOUNDS.bottom - animal.y < margin && Math.abs(animal.x - entryX) < margin) {
      return true;
    }
  }
  return false;
}
