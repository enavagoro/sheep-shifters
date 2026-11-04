import { BOUNDS, COLORS, OBSTACLES } from '../config.js';
import { PulseField } from './PulseField.js';

export function createArena(scene) {
  const field = new PulseField(scene);

  const frame = scene.add.graphics();
  frame.setDepth(2);
  field.frame = frame;
  field.paintFrame(COLORS.frame);

  const obstacles = OBSTACLES.map((obstacle) => {
    const block = scene.add.rectangle(
      obstacle.x + obstacle.w / 2,
      obstacle.y + obstacle.h / 2,
      obstacle.w,
      obstacle.h,
      COLORS.obstacle,
    );
    block.setStrokeStyle(2, COLORS.obstacleEdge);
    block.setDepth(1);

    return {
      x: obstacle.x,
      y: obstacle.y,
      w: obstacle.w,
      h: obstacle.h,
      left: obstacle.x,
      top: obstacle.y,
      right: obstacle.x + obstacle.w,
      bottom: obstacle.y + obstacle.h,
      kind: 'field',
    };
  });

  return { field, obstacles, frame };
}
