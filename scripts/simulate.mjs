import { BOUNDS, OBSTACLES, SHEEP_COUNT, SHEEP_ORIGIN, TUNING } from '../src/config.js';
import { createCorralGeometry } from '../src/entities/Corral.js';
import { DogController } from '../src/systems/DogController.js';
import { secureSheepInside } from '../src/systems/HerdSystem.js';
import { updateFlock } from '../src/systems/SheepAI.js';

function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSheep() {
  const flock = [];
  for (let index = 0; index < SHEEP_COUNT; index += 1) {
    const angle = (index / SHEEP_COUNT) * Math.PI * 2;
    const radius = 30 + (index % 3) * 24;
    flock.push({
      x: SHEEP_ORIGIN.x + Math.cos(angle) * radius,
      y: SHEEP_ORIGIN.y + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      size: TUNING.sheepSize,
      secured: false,
      wanderAngle: angle,
      wanderTurn: ((index % 5) - 2) * 0.28,
      wanderSpeed: 118 + (index % 5) * 8,
      fleeSpeed: 420 + (index % 5) * 10,
      cohesionRadius: TUNING.cohesionRadius,
      separationRadius: TUNING.separationRadius,
    });
  }
  return flock;
}

function fieldObstacles() {
  return OBSTACLES.map((obstacle) => ({
    ...obstacle,
    left: obstacle.x,
    top: obstacle.y,
    right: obstacle.x + obstacle.w,
    bottom: obstacle.y + obstacle.h,
    kind: 'field',
  }));
}

function centroid(sheep) {
  const free = sheep.filter((animal) => !animal.secured);
  const count = free.length || 1;
  const x = free.reduce((sum, animal) => sum + animal.x, 0) / count;
  const y = free.reduce((sum, animal) => sum + animal.y, 0) / count;
  return { x, y };
}

function step(sheep, dogs, obstacles, colliders, corral, frames, dt = 1 / 60) {
  for (let i = 0; i < frames; i += 1) {
    updateFlock(sheep, dt, dogs, obstacles, colliders, BOUNDS, corral);
    secureSheepInside(sheep, corral);
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  } else {
    console.log('OK:', message);
  }
}

const random = Math.random;
Math.random = mulberry32(7);

const corral = createCorralGeometry();
const obstacles = fieldObstacles();
const colliders = [...obstacles, ...corral.fences];

const milling = makeSheep();
const start = centroid(milling);
step(milling, [], obstacles, colliders, corral, 60 * 12);
const afterMill = centroid(milling);
const outside = milling.some((animal) => (
  animal.x < BOUNDS.left || animal.x > BOUNDS.right || animal.y < BOUNDS.top || animal.y > BOUNDS.bottom
));
const securedWhileMilling = milling.filter((animal) => animal.secured).length;

assert(!outside, 'el rebaño se queda dentro del campo');
assert(securedWhileMilling === 0, `sin perros no entran solas al corral (entraron ${securedWhileMilling})`);
assert(Math.hypot(afterMill.x - start.x, afterMill.y - start.y) < 320, `el rebaño pasta en el centro, no migra al corral (deriva ${Math.hypot(afterMill.x - start.x, afterMill.y - start.y).toFixed(1)} px)`);

let neighborSum = 0;
let neighborCount = 0;
for (const animal of milling) {
  let nearest = Infinity;
  for (const other of milling) {
    if (other === animal) continue;
    nearest = Math.min(nearest, Math.hypot(animal.x - other.x, animal.y - other.y));
  }
  neighborSum += nearest;
  neighborCount += 1;
}
const meanNearest = neighborSum / neighborCount;
assert(meanNearest < 80, `se mantienen en rebaño (vecino más cercano ${meanNearest.toFixed(1)} px)`);

const fleeing = makeSheep();
const before = centroid(fleeing);
const dog = { x: before.x - 150, y: before.y, size: TUNING.dogSize };
for (let i = 0; i < 90; i += 1) {
  dog.x += 70 / 60;
  updateFlock(fleeing, 1 / 60, [dog], obstacles, colliders, BOUNDS, corral);
}
const afterFlee = centroid(fleeing);
assert(afterFlee.x > before.x + 25, `huyen del perro (centro x ${before.x.toFixed(0)} -> ${afterFlee.x.toFixed(0)})`);

const flanked = makeSheep().map((animal, index) => ({
  ...animal,
  x: 400 + Math.cos(index) * 18,
  y: 400 + Math.sin(index) * 18,
  wanderAngle: index * 0.2,
  vx: 0,
  vy: 0,
}));
const nearestOnly = flanked.map((animal) => ({ ...animal }));
step(nearestOnly, [{ x: 400, y: 280 }], obstacles, colliders, corral, 50);
step(flanked, [{ x: 400, y: 280 }, { x: 525, y: 400 }], obstacles, colliders, corral, 50);
const nearestX = nearestOnly.reduce((sum, animal) => sum + animal.x, 0) / nearestOnly.length;
const flankedX = flanked.reduce((sum, animal) => sum + animal.x, 0) / flanked.length;
assert(
  flankedX < nearestX - 12,
  `el perro más lejano también desvía la huida (x ${nearestX.toFixed(0)} -> ${flankedX.toFixed(0)})`,
);

const penned = makeSheep();
penned.forEach((animal, index) => {
  animal.x = corral.inner.left + 30;
  animal.y = corral.inner.top + 30 + (index % 6) * 24;
});
const secured = secureSheepInside(penned, corral);
const parkedX = Math.min(...penned.map((animal) => animal.x));
step(penned, [{ x: corral.outer.left - 20, y: 140 }], obstacles, colliders, corral, 120);
const movedAfter = penned.some((animal) => Math.hypot(animal.vx, animal.vy) > 0.1);
assert(secured === 12, 'las 12 quedan aseguradas al entrar');
assert(parkedX > corral.inner.left + 50, 'no se quedan bloqueando la puerta');
assert(!movedAfter, 'las aseguradas dejan de moverse aunque haya un perro en la puerta');

class FakeDog {
  constructor(name, x, y) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.speed = 300;
    this.size = 28;
    this.active = false;
  }

  setActive(active) {
    this.active = active;
  }
}

const rex = new FakeDog('Rex', 100, 100);
const luna = new FakeDog('Luna', 200, 100);
const kira = new FakeDog('Kira', 300, 100);
const controller = new DogController([rex, luna, kira]);
const lunaBefore = { x: luna.x, y: luna.y };
controller.move({ x: 1, y: 0 }, 0.5, BOUNDS, []);
assert(rex.x > 100 && luna.x === lunaBefore.x && kira.x === 300, 'solo se mueve el perro activo');
controller.switchToNext();
controller.move({ x: 0, y: 1 }, 0.5, BOUNDS, []);
assert(luna.y > lunaBefore.y && rex.y === 100, 'SHIFT deja al anterior quieto y mueve al siguiente');

let held = false;
let switches = 0;
for (let i = 0; i < 30; i += 1) {
  const down = true;
  if (down && !held) switches += 1;
  held = down;
}
assert(switches === 1, 'mantener SHIFT solo cambia de perro una vez');

Math.random = random;
if (process.exitCode) {
  console.error('Simulación con fallos');
} else {
  console.log('Simulación correcta');
}
