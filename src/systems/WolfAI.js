import { TUNING } from '../config.js';
import {
  boundsRepulsion,
  clampToBounds,
  obstacleRepulsion,
  resolveObstacles,
  unstickNearEdge,
} from './collision.js';

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

    wolf.spawnGrace = Math.max(0, (wolf.spawnGrace || 0) - dt);

    if (wolf.entering) {
      enterMap(wolf, dt, fieldObstacles, colliders, bounds);
    } else if ((wolf.dodgeTime || 0) > 0) {
      moveWolf(wolf, wolf.fleeX, wolf.fleeY, wolf.speed, dt, fieldObstacles, colliders, bounds);
    } else if ((wolf.persistTime || 0) > 0) {
      chaseSheep(wolf, sheep, dt, fieldObstacles, colliders, bounds);
    } else {
      const dog = nearestWithin(wolf, dogs, () => true, TUNING.wolfDodgeRadius);
      if (dog) {
        const awayX = wolf.x - dog.x;
        const awayY = wolf.y - dog.y;
        const away = Math.hypot(awayX, awayY) || 1;
        wolf.fleeX = awayX / away;
        wolf.fleeY = awayY / away;
        wolf.dodgeTime = TUNING.wolfDodgeTime;
        moveWolf(wolf, wolf.fleeX, wolf.fleeY, wolf.speed, dt, fieldObstacles, colliders, bounds);
      } else {
        chaseSheep(wolf, sheep, dt, fieldObstacles, colliders, bounds);
      }
    }
    const ram = nearestWithin(wolf, dogs, () => true, ramRadius);
    if (ram) {
      killed.push({ x: wolf.x, y: wolf.y });
      wolf.hide?.();
      wolf.active = false;
      continue;
    }

    if (wolf.entering || (wolf.spawnGrace || 0) > 0) continue;

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

  dirX += (midX - wolf.x) * 0.002;
  dirY += (midY - wolf.y) * 0.002;
  const direction = Math.hypot(dirX, dirY) || 1;
  moveWolf(wolf, dirX / direction, dirY / direction, wolf.speed, dt, fieldObstacles, colliders, bounds);

  const pad = wolf.size + 8;
  const inside = wolf.x > bounds.left + pad
    && wolf.x < bounds.right - pad
    && wolf.y > bounds.top + pad
    && wolf.y < bounds.bottom - pad;
  if (inside) wolf.entering = false;
}

function chaseSheep(wolf, sheep, dt, fieldObstacles, colliders, bounds) {
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
  moveWolf(wolf, dirX / direction, dirY / direction, wolf.speed, dt, fieldObstacles, colliders, bounds);
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

function moveWolf(wolf, dirX, dirY, speed, dt, fieldObstacles, colliders, bounds) {
  const avoid = obstacleRepulsion(wolf, fieldObstacles, 70);
  const edge = bounds ? boundsRepulsion(wolf, bounds, 64) : { x: 0, y: 0 };
  let vx = dirX * speed + avoid.x * 320 + edge.x * 240;
  let vy = dirY * speed + avoid.y * 320 + edge.y * 240;
  const magnitude = Math.hypot(vx, vy) || 1;
  wolf.vx = (vx / magnitude) * speed;
  wolf.vy = (vy / magnitude) * speed;

  const prevX = wolf.x;
  const prevY = wolf.y;
  wolf.x += wolf.vx * dt;
  wolf.y += wolf.vy * dt;
  resolveObstacles(wolf, colliders);

  const moved = Math.hypot(wolf.x - prevX, wolf.y - prevY);
  const want = speed * dt;
  if (want > 0.5 && moved < want * 0.2) {
    wolf.x = prevX;
    wolf.y = prevY + Math.sign(wolf.vy || dirY || 1) * want;
    resolveObstacles(wolf, colliders);
    const slidY = Math.hypot(wolf.x - prevX, wolf.y - prevY);
    if (slidY < want * 0.2) {
      wolf.x = prevX + Math.sign(wolf.vx || dirX || 1) * want;
      wolf.y = prevY;
      resolveObstacles(wolf, colliders);
    }
  }

  if (bounds) unstickNearEdge(wolf, colliders, bounds);

  const movedAfter = Math.hypot(wolf.x - prevX, wolf.y - prevY);
  if (want > 0.5 && movedAfter < want * 0.12) {
    wolf.stuckT = (wolf.stuckT || 0) + dt;
  } else {
    wolf.stuckT = 0;
  }
  if ((wolf.stuckT || 0) > 0.28 && bounds) {
    const cx = (bounds.left + bounds.right) * 0.5;
    const cy = (bounds.top + bounds.bottom) * 0.5;
    const dx = cx - wolf.x;
    const dy = cy - wolf.y;
    const len = Math.hypot(dx, dy) || 1;
    wolf.x += (dx / len) * 28;
    wolf.y += (dy / len) * 28;
    resolveObstacles(wolf, colliders);
    unstickNearEdge(wolf, colliders, bounds);
    wolf.stuckT = 0;
  }
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
