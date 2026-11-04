

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

  for (let pass = 0; pass < 3; pass += 1) {
    for (const obs of obstacles) {
      const overlapX = Math.min(entity.x + half, obs.right) - Math.max(entity.x - half, obs.left);
      const overlapY = Math.min(entity.y + half, obs.bottom) - Math.max(entity.y - half, obs.top);
      if (overlapX <= 0 || overlapY <= 0) continue;

      const centerX = (obs.left + obs.right) / 2;
      const centerY = (obs.top + obs.bottom) / 2;

      if (overlapX < overlapY) {
        const dir = entity.x < centerX ? -1 : 1;
        entity.x += dir * overlapX;
        if (dir < 0 && entity.vx > 0) entity.vx = 0;
        if (dir > 0 && entity.vx < 0) entity.vx = 0;
      } else {
        const dir = entity.y < centerY ? -1 : 1;
        entity.y += dir * overlapY;
        if (dir < 0 && entity.vy > 0) entity.vy = 0;
        if (dir > 0 && entity.vy < 0) entity.vy = 0;
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

    if (dist < 0.001) continue;
    if (dist >= margin) continue;

    const strength = (margin - dist) / margin;
    x += (dx / dist) * strength;
    y += (dy / dist) * strength;
  }

  return { x, y };
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
