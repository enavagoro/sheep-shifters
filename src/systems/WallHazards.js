import { BOUNDS, COLORS, CORRAL, TUNING } from '../config.js';

export class WallHazards {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];
    this.timer = TUNING.wallFirstDelay;
    this.phase = 'idle';
    this.phaseTimer = 0;
  }

  update(dt, { paused = false, locked = false, level = 1 } = {}) {
    if (paused) return { changed: false };

    if (level < TUNING.wallStartLevel) {
      if (this.walls.length) {
        this.clear();
        this.phase = 'idle';
        this.timer = TUNING.wallFirstDelay;
        return { changed: true };
      }
      this.timer = TUNING.wallFirstDelay;
      return { changed: false };
    }

    let changed = false;

    if (this.phase === 'warn' || this.phase === 'live') {
      this.phaseTimer -= dt;
      for (const wall of this.walls) {
        wall.pulse = (wall.pulse || 0) + dt * 8;
        if (wall.phase === 'warn' && wall.block) {
          wall.block.setAlpha(0.18 + Math.sin(wall.pulse) * 0.12);
        }
      }
      if (this.phaseTimer <= 0) {
        if (this.phase === 'warn') {
          this.makeSolid();
          this.phase = 'live';
          this.phaseTimer = TUNING.wallDuration;
          changed = true;
        } else {
          this.clear();
          this.phase = 'idle';
          this.timer = TUNING.wallInterval;
          changed = true;
        }
      }
    } else if (!locked) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.beginWave();
        this.phase = 'warn';
        this.phaseTimer = TUNING.wallWarn;
        changed = true;
      }
    }

    return { changed };
  }

  beginWave() {
    this.clear();
    const specs = pickWallLayout();
    for (const spec of specs) {
      const built = buildSimpleWall(this.scene, spec.x, spec.y, spec.w, spec.h);
      built.display.setAlpha(0.3);
      this.walls.push({
        phase: 'warn',
        pulse: Math.random() * 10,
        block: built.display,
        collider: built.collider,
      });
    }
  }

  makeSolid() {
    for (const wall of this.walls) {
      wall.phase = 'live';
      wall.block?.setAlpha(1);
    }
  }

  clear() {
    for (const wall of this.walls) wall.block?.destroy?.(true);
    this.walls = [];
  }

  solidColliders() {
    return this.walls
      .filter((wall) => wall.phase === 'live')
      .map((wall) => wall.collider);
  }

  destroy() {
    this.clear();
  }
}

/** Misma hitbox de antes; visual = rectángulo simple con borde (sin tiles). */
function buildSimpleWall(scene, x, y, w, h) {
  const block = scene.add.rectangle(
    x + w / 2,
    y + h / 2,
    w,
    h,
    COLORS.obstacle,
    0.55,
  );
  block.setStrokeStyle(2, COLORS.obstacleEdge, 1);
  block.setDepth(1);

  return {
    display: block,
    collider: {
      x,
      y,
      w,
      h,
      left: x,
      top: y,
      right: x + w,
      bottom: y + h,
      kind: 'temp',
    },
  };
}

function pickWallLayout() {
  const playRight = CORRAL.x - 64;
  const left = BOUNDS.left + 130;
  const top = BOUNDS.top + 110;
  const bottom = BOUNDS.bottom - 110;
  const midY = (top + bottom) * 0.5;
  const midX = (left + playRight) * 0.5;
  const fieldH = bottom - top;

  const short = Math.min(150, fieldH * 0.38);
  const med = Math.min(190, fieldH * 0.45);

  const layouts = [
    [
      { x: midX - 150, y: top + 20, w: 44, h: short },
      { x: midX + 30, y: bottom - short - 20, w: 44, h: short },
    ],
    [
      { x: left + 40, y: midY - 130, w: Math.min(280, playRight - left - 180), h: 40 },
      { x: midX - 40, y: midY + 90, w: Math.min(260, playRight - midX - 40), h: 40 },
    ],
    [
      { x: left + 50, y: top + 40, w: 100, h: 40 },
      { x: midX - 22, y: midY - med * 0.5, w: 44, h: med },
      { x: playRight - 160, y: bottom - 100, w: 110, h: 40 },
    ],
    [
      { x: midX - 80, y: top + 30, w: 44, h: short },
      { x: midX - 80, y: bottom - short - 30, w: 44, h: short },
      { x: midX + 70, y: midY - 70, w: 44, h: 140 },
    ],
  ];

  const pick = layouts[Math.floor(Math.random() * layouts.length)];
  return pick
    .map(clampWall)
    .filter((spec) => spec.w >= 32 && spec.h >= 32 && !overlapsCorral(spec));
}

function clampWall(spec) {
  const x = Math.max(BOUNDS.left + 120, spec.x);
  const y = Math.max(BOUNDS.top + 100, spec.y);
  const right = Math.min(CORRAL.x - 56, spec.x + spec.w);
  const bottom = Math.min(BOUNDS.bottom - 100, spec.y + spec.h);
  return {
    x,
    y,
    w: Math.max(0, right - x),
    h: Math.max(0, bottom - y),
  };
}

function overlapsCorral(spec) {
  return !(
    spec.x + spec.w < CORRAL.x - 24
    || spec.x > CORRAL.x + CORRAL.w + 24
    || spec.y + spec.h < CORRAL.y - 24
    || spec.y > CORRAL.y + CORRAL.h + 24
  );
}
