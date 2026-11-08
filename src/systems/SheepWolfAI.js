import { TUNING } from '../config.js';
import {
  clampToBounds,
  ejectFromObstacles,
  obstacleRepulsion,
  resolveObstacles,
  unstickNearEdge,
} from './collision.js';

export function updateSheepWolves(lures, dt, sheep, dogs, fieldObstacles, colliders, bounds, vfx = null, activeDog = null) {
  const killed = [];
  let caught = false;
  const hunter = activeDog || null;

  for (const lure of lures) {
    if (!lure.active) continue;

    lure.life -= dt;
    if (lure.life <= 0) {
      lure.hide?.();
      continue;
    }

    if (hunter && hitByDog(lure, [hunter])) {
      killed.push({ x: lure.x, y: lure.y });
      lure.hide?.();
      continue;
    }

    if (dt > 0) {
      if (lure.entering) {
        lure.calling = false;
        enterMap(lure, dt, fieldObstacles, colliders, bounds, vfx);
      } else {
        actLikeSheep(lure, dt, fieldObstacles, colliders, bounds, vfx);
      }
    }

    if (hunter && hitByDog(lure, [hunter])) {
      killed.push({ x: lure.x, y: lure.y });
      lure.hide?.();
      continue;
    }

    const victim = nearestSheep(lure, sheep, TUNING.sheepWolfCatchRadius);
    if (!victim) continue;
    victim.lost = true;
    victim.vx = 0;
    victim.vy = 0;
    caught = true;
    break;
  }

  return { killed, caught };
}

export function ramSheepWolves(lures, activeDog) {
  const killed = [];
  if (!activeDog) return killed;
  for (const lure of lures) {
    if (!lure.active) continue;
    if (!hitByDog(lure, [activeDog])) continue;
    killed.push({ x: lure.x, y: lure.y });
    lure.hide?.();
  }
  return killed;
}

function actLikeSheep(lure, dt, fieldObstacles, colliders, bounds, vfx) {
  lure.phaseTimer -= dt;

  if (lure.phase === 'bleat') {
    lure.vx = 0;
    lure.vy = 0;
    lure.calling = true;
    lure.bleatPulse = (lure.bleatPulse || 0) + dt;

    if (lure.bleatPulse > 0.55 && !lure.bleatEcho) {
      lure.bleatEcho = true;
      const echo = Math.random() < 0.5 ? 'BAA' : 'BEE';
      vfx?.floatText?.(lure.x + 8, lure.y - 34, echo, '#f4fff8', 10);
    }
    if (lure.phaseTimer <= 0) {
      lure.bleatEcho = false;
      lure.startWalk();
    }
    return;
  }

  lure.calling = false;
  patrolField(lure, dt, fieldObstacles, colliders, bounds);
  if (lure.phaseTimer <= 0) {
    lure.startBleat(vfx);
  }
}

function hitByDog(lure, dogs) {
  const reach = TUNING.sheepWolfHitRadius;
  for (const dog of dogs) {

    if (Math.hypot(lure.x - dog.x, lure.y - dog.y) <= reach) return true;

    if (dog.prevX != null && dog.prevY != null) {
      if (pointSegmentDist(lure.x, lure.y, dog.prevX, dog.prevY, dog.x, dog.y) <= reach) {
        return true;
      }
    }
  }
  return false;
}

function pointSegmentDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 0.0001) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function nearestSheep(lure, sheep, radius) {
  let best = null;
  let bestDist = radius;
  for (const animal of sheep) {
    if (animal.lost || animal.secured || animal.removed) continue;
    const dist = Math.hypot(lure.x - animal.x, lure.y - animal.y);
    if (dist >= bestDist) continue;
    best = animal;
    bestDist = dist;
  }
  return best;
}

function enterMap(lure, dt, fieldObstacles, colliders, bounds, vfx = null) {
  const margin = TUNING.sheepWolfEdgeMargin;
  let tx = lure.x;
  let ty = lure.y;
  if (lure.edge === 'left') tx = bounds.left + margin;
  else if (lure.edge === 'top') ty = bounds.top + margin;
  else if (lure.edge === 'bottom') ty = bounds.bottom - margin;
  else tx = bounds.right - margin;

  let dx = tx - lure.x;
  let dy = ty - lure.y;
  const len = Math.hypot(dx, dy) || 1;
  move(lure, dx / len, dy / len, lure.speed, dt, fieldObstacles, colliders, bounds);

  if (Math.hypot(lure.x - tx, lure.y - ty) < 18) {
    lure.entering = false;

    lure.startBleat(vfx);
  }
}

function patrolField(lure, dt, fieldObstacles, colliders, bounds) {
  if (lure.roamAngle == null) {
    lure.roamAngle = Math.atan2(lure.vy || 0, lure.vx || 1);
  }
  lure.patrolT = (lure.patrolT || 0) + dt;
  lure.roamAngle += Math.sin(lure.patrolT * 0.7) * 0.55 * dt
    + (Math.random() - 0.5) * 1.6 * dt;

  const avoid = obstacleRepulsion(lure, fieldObstacles, 64);
  let dirX = Math.cos(lure.roamAngle) + avoid.x * 2.8;
  let dirY = Math.sin(lure.roamAngle) + avoid.y * 2.8;
  const len = Math.hypot(dirX, dirY) || 1;
  dirX /= len;
  dirY /= len;
  lure.roamAngle = Math.atan2(dirY, dirX);

  move(lure, dirX, dirY, lure.speed * 0.8, dt, fieldObstacles, colliders, bounds);
  clampToBounds(lure, bounds);
  ejectFromObstacles(lure, colliders);
}

function move(lure, dirX, dirY, speed, dt, fieldObstacles, colliders, bounds = null) {
  const avoid = obstacleRepulsion(lure, fieldObstacles, 70);
  let vx = dirX * speed + avoid.x * 280;
  let vy = dirY * speed + avoid.y * 280;
  const magnitude = Math.hypot(vx, vy) || 1;
  lure.vx = (vx / magnitude) * speed;
  lure.vy = (vy / magnitude) * speed;
  const prevX = lure.x;
  const prevY = lure.y;
  lure.x += lure.vx * dt;
  lure.y += lure.vy * dt;
  resolveObstacles(lure, colliders);

  const moved = Math.hypot(lure.x - prevX, lure.y - prevY);
  const want = speed * dt;
  if (want > 0.5 && moved < want * 0.2) {
    lure.x = prevX;
    lure.y = prevY + Math.sign(dirY || 1) * want;
    resolveObstacles(lure, colliders);
    if (Math.hypot(lure.x - prevX, lure.y - prevY) < want * 0.2) {
      lure.x = prevX + Math.sign(dirX || 1) * want;
      lure.y = prevY;
      resolveObstacles(lure, colliders);
    }
  }

  ejectFromObstacles(lure, colliders);
  if (bounds) unstickNearEdge(lure, colliders, bounds);
}
