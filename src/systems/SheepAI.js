import { TUNING } from '../config.js';
import { boundsRepulsion, clampToBounds, obstacleRepulsion, resolveObstacles } from './collision.js';

export function updateFlock(sheep, dt, dogs, fieldObstacles, colliders, bounds, corral, wolves = [], lures = [], magnet = null) {
  const free = [];
  for (const animal of sheep) {
    if (!animal.secured && !animal.lost) free.push(animal);
  }

  for (const animal of free) {
    const magnetizing = magnet && canMagnetPull(animal, magnet);
    steer(animal, dt, free, dogs, wolves, lures, fieldObstacles, bounds, corral, magnet);

    animal.x += animal.vx * dt;
    animal.y += animal.vy * dt;

    resolveObstacles(animal, colliders);
    if (magnetizing) slideMagnetThroughGate(animal, corral);
    clampToBounds(animal, bounds);
  }
}

function steer(animal, dt, free, dogs, wolves, lures, fieldObstacles, bounds, corral, magnet = null) {
  if (animal.seekCorral) {
    steerTowardCorral(animal, dt, corral, fieldObstacles, bounds);
    return;
  }

  if (magnet && canMagnetPull(animal, magnet)) {
    steerTowardMagnet(animal, dt, magnet, fieldObstacles, bounds, corral);
    return;
  }

  animal.wanderTurn += (Math.random() - 0.5) * 4.2 * dt;
  animal.wanderTurn = clamp(animal.wanderTurn, -1.15, 1.15);
  animal.wanderAngle += animal.wanderTurn * dt;

  let dx = Math.cos(animal.wanderAngle) * 0.42;
  let dy = Math.sin(animal.wanderAngle) * 0.42;

  let centerX = 0;
  let centerY = 0;
  let neighbors = 0;

  for (const other of free) {
    if (other === animal) continue;
    const ox = other.x - animal.x;
    const oy = other.y - animal.y;
    const dist = Math.hypot(ox, oy) || 0.0001;

    if (dist < animal.separationRadius) {
      const push = 1.55 * (1 - dist / animal.separationRadius);
      dx -= (ox / dist) * push;
      dy -= (oy / dist) * push;
    } else if (dist < animal.cohesionRadius) {
      centerX += other.x;
      centerY += other.y;
      neighbors += 1;
    }
  }

  if (neighbors > 0) {
    const tx = centerX / neighbors - animal.x;
    const ty = centerY / neighbors - animal.y;
    const dist = Math.hypot(tx, ty) || 1;
    const pull = dist < 72 ? 0.5 : Math.min(2.4, 0.6 + dist / 130);
    dx += (tx / dist) * pull;
    dy += (ty / dist) * pull;
  }

  let fleeing = false;
  if (!animal.ignoreDogs) {
    for (const dog of dogs) {

      if (animal.ownerNumber && animal.ownerNumber !== dog.number) continue;

      const fx = animal.x - dog.x;
      const fy = animal.y - dog.y;
      const dist = Math.hypot(fx, fy);
      if (dist >= TUNING.fleeRadius) continue;

      fleeing = true;
      const safe = Math.max(dist, 10);
      const closeness = 1 - dist / TUNING.fleeRadius;
      const weight = 1.45 + closeness * closeness * 3.6;
      dx += (fx / safe) * weight;
      dy += (fy / safe) * weight;
    }
  }

  for (const wolf of wolves) {
    if (!wolf.active) continue;
    const fx = animal.x - wolf.x;
    const fy = animal.y - wolf.y;
    const dist = Math.hypot(fx, fy);
    if (dist >= TUNING.wolfFleeRadius) continue;

    const closeness = 1 - dist / TUNING.wolfFleeRadius;
    const weight = 0.18 + closeness * 0.28;
    dx += (fx / Math.max(dist, 10)) * weight;
    dy += (fy / Math.max(dist, 10)) * weight;
  }

  let lured = false;
  for (const lure of lures) {
    if (!lure.active || !lure.calling) continue;
    const lx = lure.x - animal.x;
    const ly = lure.y - animal.y;
    const dist = Math.hypot(lx, ly) || 1;
    lured = true;
    const weight = 3.2 + Math.min(3.0, 560 / dist);
    dx += (lx / dist) * weight;
    dy += (ly / dist) * weight;
  }

  const avoid = obstacleRepulsion(animal, fieldObstacles, TUNING.boundsMargin);
  dx += avoid.x * 1.8;
  dy += avoid.y * 1.8;

  if (!corral.covers(animal.x, animal.y)) {
    const edge = boundsRepulsion(animal, bounds, TUNING.boundsMargin);
    dx += edge.x * 2.1;
    dy += edge.y * 2.1;
  }

  const magnitude = Math.hypot(dx, dy);
  const speed = fleeing
    ? animal.fleeSpeed
    : lured
      ? animal.wanderSpeed * 1.55
      : animal.wanderSpeed;
  const targetX = magnitude > 0.001 ? (dx / magnitude) * speed : 0;
  const targetY = magnitude > 0.001 ? (dy / magnitude) * speed : 0;
  const response = fleeing ? 12 : lured ? 6.5 : 3.2;
  const blend = 1 - Math.exp(-response * dt);

  animal.vx += (targetX - animal.vx) * blend;
  animal.vy += (targetY - animal.vy) * blend;
}

function steerTowardMagnet(animal, dt, magnet, fieldObstacles, bounds, corral) {

  const gate = corral.gateCenter?.() || magnet || {
    x: corral.outer.left + 10,
    y: corral.y + (corral.gateStartRel + corral.gateEndRel) * 0.5,
  };
  const targetX = corral.inner.left + 52;
  const targetY = gate.y;
  let dx = targetX - animal.x;
  let dy = targetY - animal.y;

  if (animal.x > corral.outer.left - 220) {
    dy *= 2.4;
  }

  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist;
  dy /= dist;

  const avoid = obstacleRepulsion(animal, fieldObstacles, TUNING.boundsMargin);
  dx += avoid.x * 0.7;
  dy += avoid.y * 0.7;
  if (!corral.covers(animal.x, animal.y)) {
    const edge = boundsRepulsion(animal, bounds, TUNING.boundsMargin);
    dx += edge.x * 1.0;
    dy += edge.y * 1.0;
  }

  const magnitude = Math.hypot(dx, dy) || 1;
  const pull = dist > TUNING.powerMagnetRadius
    ? animal.wanderSpeed * 1.35
    : animal.fleeSpeed * 1.05;
  const blend = 1 - Math.exp(-9 * dt);
  animal.vx += ((dx / magnitude) * pull - animal.vx) * blend;
  animal.vy += ((dy / magnitude) * pull - animal.vy) * blend;
}

function slideMagnetThroughGate(animal, corral) {
  const half = animal.size / 2;
  const gateTop = corral.y + corral.gateStartRel;
  const gateBot = corral.y + corral.gateEndRel;
  const gateMid = (gateTop + gateBot) * 0.5;
  const gateLeft = corral.outer.left;

  if (animal.x > gateLeft - 180 && animal.x < corral.inner.left + 90) {
    animal.y += (gateMid - animal.y) * 0.35;
  }

  const inLane = animal.y >= gateTop + half + 1 && animal.y <= gateBot - half - 1;
  const atDoor = animal.x >= gateLeft - 36 && animal.x <= corral.inner.left + 70;
  if (!atDoor) return;

  if (!inLane) {
    animal.y = clamp(animal.y, gateTop + half + 2, gateBot - half - 2);
  }
  if (animal.x < corral.inner.left + 36) {
    animal.x += 8;
    animal.vx = Math.max(animal.vx, 200);
    animal.vy *= 0.4;
  }
}

function steerTowardCorral(animal, dt, corral, fieldObstacles, bounds) {
  const gate = corral.gateCenter?.() || {
    x: corral.outer.left + 10,
    y: corral.y + (corral.gateStartRel + corral.gateEndRel) * 0.5,
  };

  const targetX = animal.raidSheep ? gate.x + 36 : gate.x;
  const targetY = gate.y;
  let dx = targetX - animal.x;
  let dy = targetY - animal.y;
  const dist = Math.hypot(dx, dy) || 1;
  dx /= dist;
  dy /= dist;

  animal.wanderTurn = (animal.wanderTurn || 0) + (Math.random() - 0.5) * 0.6 * dt;
  animal.wanderTurn = clamp(animal.wanderTurn, -0.2, 0.2);
  dx += Math.cos(animal.wanderAngle || 0) * 0.03;
  dy += Math.sin(animal.wanderAngle || 0) * 0.03 + animal.wanderTurn * 0.08;

  const avoid = obstacleRepulsion(animal, fieldObstacles, TUNING.boundsMargin);
  dx += avoid.x * 0.9;
  dy += avoid.y * 0.9;
  if (!corral.covers(animal.x, animal.y)) {
    const edge = boundsRepulsion(animal, bounds, TUNING.boundsMargin);
    dx += edge.x * 1.1;
    dy += edge.y * 1.1;
  }

  const magnitude = Math.hypot(dx, dy) || 1;
  const speed = animal.wanderSpeed;
  const blend = 1 - Math.exp(-(animal.raidSheep ? 3.6 : 2.4) * dt);
  animal.vx += ((dx / magnitude) * speed - animal.vx) * blend;
  animal.vy += ((dy / magnitude) * speed - animal.vy) * blend;
}

function canMagnetPull(animal, _magnet) {

  return Boolean(animal) && !animal.ignoreDogs;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
