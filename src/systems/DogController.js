import { clampToBounds, resolveObstacles } from './collision.js';

export class DogController {
  constructor(dogs) {
    this.dogs = dogs;
    this.index = 0;
    this.dogs[0].setActive(true);
    for (let i = 1; i < dogs.length; i += 1) {
      dogs[i].setActive(false);
    }
  }

  get active() {
    return this.dogs[this.index];
  }

  switchToNext() {
    this.select((this.index + 1) % this.dogs.length);
  }

  select(index) {
    if (index === this.index || index < 0 || index >= this.dogs.length) return;
    this.active.setActive(false);
    this.index = index;
    this.active.setActive(true);
  }

  move(direction, dt, bounds, obstacles) {
    const dog = this.active;
    dog.prevX = dog.x;
    dog.prevY = dog.y;
    const length = Math.hypot(direction.x, direction.y);
    if (length > 0) {
      dog.facingX = direction.x / length;
      dog.facingY = direction.y / length;
      dog.x += dog.facingX * dog.speed * dt;
      dog.y += dog.facingY * dog.speed * dt;
      dog.moving = true;
    } else {
      dog.moving = false;
    }

    clampToBounds(dog, bounds);
    resolveObstacles(dog, obstacles);
  }
}
