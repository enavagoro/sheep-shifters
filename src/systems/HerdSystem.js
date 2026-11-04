
export function secureSheepInside(sheep, corral) {
  let secured = 0;

  for (const animal of sheep) {
    if (animal.secured || animal.lost) {
      if (animal.secured && !animal.lost) secured += 1;
      continue;
    }

    if (!corral.contains(animal.x, animal.y)) continue;

    animal.secured = true;
    animal.vx = 0;
    animal.vy = 0;
    parkInPen(animal, sheep, corral.inner);
    secured += 1;
  }

  return secured;
}

function parkInPen(animal, sheep, inner) {
  const half = animal.size / 2;
  const minX = inner.left + 62;
  const maxX = inner.right - half;
  const minY = inner.top + half;
  const maxY = inner.bottom - half;

  let x = Math.min(maxX, Math.max(animal.x, minX));
  let y = clamp(animal.y, minY, maxY);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    let moved = false;
    for (const other of sheep) {
      if (other === animal || !other.secured) continue;
      const dx = x - other.x;
      const dy = y - other.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const gap = 26;
      if (dist >= gap) continue;
      x += (dx / dist) * (gap - dist + 0.4);
      y += (dy / dist) * (gap - dist + 0.4);
      moved = true;
    }
    x = clamp(x, minX, maxX);
    y = clamp(y, minY, maxY);
    if (!moved) break;
  }

  animal.x = x;
  animal.y = y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
