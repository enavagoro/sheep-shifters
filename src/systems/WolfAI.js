import { TUNING } from '../config.js';
import { clampToBounds, obstacleRepulsion, resolveObstacles } from './collision.js';

export function updateWolves(wolves, dt, sheep, dogs, fieldObstacles, colliders, bounds, hitRadius = TUNING.wolfHitRadius) {
  const killed = [];
  let caught = false;
  const ramRadius = hitRadius;

  for (const wolf of wolves) {
    if (!wolf.active) continue;

    const touching = nearestWithin(wolf, dogs, () => true, ramRadius);
    if (touching) {
      killed.push({ x: wolf.x, y: wolf.y });
      wolf.hide?.();
      wolf.active = false;
      continue;
    }

    const wasDodging = (wolf.dodgeTime || 0) > 0;
    wolf.dodgeTime = Math.max(0, (wolf.dodgeTime || 0) - dt);
    if (wasDodging && wolf.dodgeTime === 0) wolf.persistTime = TUNING.wolfPersistTime;
    wolf.persistTime = Math.max(0, (wolf.persistTime || 0) - dt);

    if (wolf.entering) {
      enterMap(wolf, dt, fieldObstacles, colliders, bounds);
    } else if ((wolf.dodgeTime || 0) > 0) {
      moveWolf(wolf, wolf.fleeX, wolf.fleeY, wolf.speed, dt, fieldObstacles, colliders);
      clampToBounds(wolf, bounds);
    } else if ((wolf.persistTime || 0) > 0) {
      chaseSheep(wolf, sheep, dt, fieldObstacles, colliders);
      clampToBounds(wolf, bounds);
    } else {
      const dog = nearestWithin(wolf, dogs, () => true, TUNING.wolfDodgeRadius);
      if (dog) {
        const awayX = wolf.x - dog.x;
        const awayY = wolf.y - dog.y;
        const away = Math.hypot(awayX, awayY) || 1;
        wolf.fleeX = awayX / away;
        wolf.fleeY = awayY / away;
        wolf.dodgeTime = TUNING.wolfDodgeTime;
        moveWolf(wolf, wolf.fleeX, wolf.fleeY, wolf.speed, dt, fieldObstacles, colliders);
      } else {
        chaseSheep(wolf, sheep, dt, fieldObstacles, colliders);
      }
      clampToBounds(wolf, bounds);
    }
    const ram = nearestWithin(wolf, dogs, () => true, ramRadius);
    if (ram) {
      killed.push({ x: wolf.x, y: wolf.y });
      wolf.hide?.();
      wolf.active = false;
      continue;
    }

    const victim = nearestWithin(wolf, sheep, (animal) => !animal.lost && !animal.secured, TUNING.wolfCatchRadius);
    if (!victim) continue;
    victim.lost = true;
    victim.vx = 0;
    victim.vy = 0;
    caught = true;
    break;
  }

  return { killed, caught };
}

function enterMap(wolf, dt, fieldObstacles, colliders, bounds) {
  const midX = (bounds.left + bounds.right) / 2;
  const midY = (bounds.top + bounds.bottom) / 2;
  let dirX = wolf.vx;
  let dirY = wolf.vy;
  if (Math.hypot(dirX, dirY) < 0.001) {
    dirX = midX - wolf.x;
    dirY = midY - wolf.y;
  }
  const direction = Math.hypot(dirX, dirY) || 1;
  moveWolf(wolf, dirX / direction, dirY / direction, wolf.speed, dt, fieldObstacles, colliders);

  const inside = wolf.x > bounds.left + wolf.size
    && wolf.x < bounds.right - wolf.size
    && wolf.y > bounds.top + wolf.size
    && wolf.y < bounds.bottom - wolf.size;
  if (inside) wolf.entering = false;
}

function chaseSheep(wolf, sheep, dt, fieldObstacles, colliders) {
  const target = nearestWithin(wolf, sheep, (animal) => !animal.lost && !animal.secured, Infinity);
  let dirX = wolf.vx;
  let dirY = wolf.vy;
  if (target) {
    dirX = target.x - wolf.x;
    dirY = target.y - wolf.y;
  } else {
    roam(wolf, dt);
    dirX = Math.cos(wolf.roamAngle);
    dirY = Math.sin(wolf.roamAngle);
  }
  const direction = Math.hypot(dirX, dirY) || 1;
  moveWolf(wolf, dirX / direction, dirY / direction, wolf.speed, dt, fieldObstacles, colliders);
}

function roam(wolf, dt) {
  if (wolf.roamAngle == null) {
    wolf.roamAngle = Math.atan2(wolf.vy || 0, wolf.vx || 1);
    wolf.roamTurn = (Math.random() - 0.5) * 1.4;
  }
  wolf.roamTurn += (Math.random() - 0.5) * 2.4 * dt;
  wolf.roamTurn = Math.max(-1.2, Math.min(1.2, wolf.roamTurn));
  wolf.roamAngle += wolf.roamTurn * dt;
}

function moveWolf(wolf, dirX, dirY, speed, dt, fieldObstacles, colliders) {
  const avoid = obstacleRepulsion(wolf, fieldObstacles, 34);
  let vx = dirX * speed + avoid.x * 180;
  let vy = dirY * speed + avoid.y * 180;
  const magnitude = Math.hypot(vx, vy) || 1;
  wolf.vx = (vx / magnitude) * speed;
  wolf.vy = (vy / magnitude) * speed;
  wolf.x += wolf.vx * dt;
  wolf.y += wolf.vy * dt;
  resolveObstacles(wolf, colliders);
}

function nearestWithin(origin, others, accept, radius) {
  let best = null;
  let bestDist = radius;

  for (const other of others) {
    if (!accept(other)) continue;
    const dist = Math.hypot(origin.x - other.x, origin.y - other.y);
    if (dist >= bestDist) continue;
    best = other;
    bestDist = dist;
  }

  return best;
}
