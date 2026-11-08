

export function clampToBounds(entity, bounds) {
  const half = entity.size / 2;
  const minX = bounds.left + half;
  const maxX = bounds.right - half;
  const minY = bounds.top + half;
  const maxY = bounds.bottom - half;

  if (entity.x < minX) {
    entity.x = minX;
    if (entity.vx < 0) entity.vx = 0;
  } else if (entity.x > maxX) {
    entity.x = maxX;
    if (entity.vx > 0) entity.vx = 0;
  }

  if (entity.y < minY) {
    entity.y = minY;
    if (entity.vy < 0) entity.vy = 0;
  } else if (entity.y > maxY) {
    entity.y = maxY;
    if (entity.vy > 0) entity.vy = 0;
  }
}

export function resolveObstacles(entity, obstacles) {
  const half = entity.size / 2;

  for (let pass = 0; pass < 4; pass += 1) {
    for (const obs of obstacles) {
      const overlapX = Math.min(entity.x + half, obs.right) - Math.max(entity.x - half, obs.left);
      const overlapY = Math.min(entity.y + half, obs.bottom) - Math.max(entity.y - half, obs.top);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const centerX = (obs.left + obs.right) / 2;
      const centerY = (obs.top + obs.bottom) / 2;

      if (overlapX < overlapY - 0.5) {
        const dir = entity.x < centerX ? -1 : 1;
        entity.x += dir * (overlapX + 0.5);
        if (dir < 0 && entity.vx > 0) entity.vx = 0;
        if (dir > 0 && entity.vx < 0) entity.vx = 0;
      } else if (overlapY < overlapX - 0.5) {
        const dir = entity.y < centerY ? -1 : 1;
        entity.y += dir * (overlapY + 0.5);
        if (dir < 0 && entity.vy > 0) entity.vy = 0;
        if (dir > 0 && entity.vy < 0) entity.vy = 0;
      } else {

        const leftPen = (entity.x + half) - obs.left;
        const rightPen = obs.right - (entity.x - half);
        const topPen = (entity.y + half) - obs.top;
        const botPen = obs.bottom - (entity.y - half);
        const minPen = Math.min(leftPen, rightPen, topPen, botPen);
        if (minPen === leftPen) entity.x = obs.left - half - 0.5;
        else if (minPen === rightPen) entity.x = obs.right + half + 0.5;
        else if (minPen === topPen) entity.y = obs.top - half - 0.5;
        else entity.y = obs.bottom + half + 0.5;
        entity.vx = 0;
        entity.vy = 0;
      }
    }
  }
}

export function obstacleRepulsion(entity, obstacles, margin) {
  let x = 0;
  let y = 0;

  for (const obs of obstacles) {
    const nearestX = clamp(entity.x, obs.left, obs.right);
    const nearestY = clamp(entity.y, obs.top, obs.bottom);
    let dx = entity.x - nearestX;
    let dy = entity.y - nearestY;
    let dist = Math.hypot(dx, dy);

    if (dist < 0.001) {
      dx = entity.x - (obs.left + obs.right) * 0.5;
      dy = entity.y - (obs.top + obs.bottom) * 0.5;
      dist = Math.hypot(dx, dy) || 1;
      x += (dx / dist) * 2.4;
      y += (dy / dist) * 2.4;
      continue;
    }
    if (dist >= margin) continue;

    const strength = (margin - dist) / margin;
    x += (dx / dist) * strength;
    y += (dy / dist) * strength;
  }

  return { x, y };
}

export function ejectFromObstacles(entity, obstacles) {
  resolveObstacles(entity, obstacles);
  resolveObstacles(entity, obstacles);
}

function overlapsObstacle(entity, obs) {
  const half = entity.size / 2;
  return entity.x + half > obs.left
    && entity.x - half < obs.right
    && entity.y + half > obs.top
    && entity.y - half < obs.bottom;
}

export function unstickNearEdge(entity, obstacles, bounds) {
  if (!obstacles?.length) {
    clampToBounds(entity, bounds);
    return;
  }

  const half = entity.size / 2;
  const rim = half + 52;
  const nearRim = entity.x < bounds.left + rim
    || entity.x > bounds.right - rim
    || entity.y < bounds.top + rim
    || entity.y > bounds.bottom - rim;

  resolveObstacles(entity, obstacles);
  clampToBounds(entity, bounds);

  if (!nearRim) return;

  const cx = (bounds.left + bounds.right) * 0.5;
  const cy = (bounds.top + bounds.bottom) * 0.5;
  for (let i = 0; i < 8; i += 1) {
    let stuck = false;
    for (const obs of obstacles) {
      if (!overlapsObstacle(entity, obs)) continue;
      stuck = true;
      break;
    }
    if (!stuck) break;

    const dx = cx - entity.x;
    const dy = cy - entity.y;
    const len = Math.hypot(dx, dy) || 1;
    entity.x += (dx / len) * 10;
    entity.y += (dy / len) * 10;
    resolveObstacles(entity, obstacles);
    clampToBounds(entity, bounds);
  }
}

export function boundsRepulsion(entity, bounds, margin) {
  let x = 0;
  let y = 0;

  const leftGap = entity.x - bounds.left;
  const rightGap = bounds.right - entity.x;
  const topGap = entity.y - bounds.top;
  const bottomGap = bounds.bottom - entity.y;

  if (leftGap < margin) x += 1 - leftGap / margin;
  if (rightGap < margin) x -= 1 - rightGap / margin;
  if (topGap < margin) y += 1 - topGap / margin;
  if (bottomGap < margin) y -= 1 - bottomGap / margin;

  return { x, y };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
