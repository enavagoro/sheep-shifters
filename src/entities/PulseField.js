import { BOUNDS, COLORS } from '../config.js';

export class PulseField {
  constructor(scene) {
    this.left = BOUNDS.left;
    this.top = BOUNDS.top;
    this.right = BOUNDS.right;
    this.bottom = BOUNDS.bottom;
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;
    this.gap = 64;
    this.hue = 150;
    this.colorAcc = 0;
    this.lastFloor = -1;

    this.base = scene.add.rectangle(
      (this.left + this.right) / 2,
      (this.top + this.bottom) / 2,
      this.width,
      this.height,
      COLORS.grass,
    ).setDepth(-14);

    this.grid = scene.add.graphics().setDepth(-13);
    this.drawStaticGrid(COLORS.grid);
    this.frame = null;
  }

  update(dt, energy = 0, elapsed = 0) {
    this.colorAcc += dt;
    if (this.colorAcc < 0.1) return;
    this.colorAcc = 0;

    const pulse = Math.max(0, Math.min(1, energy));
    this.hue = (150 + elapsed * 9 + pulse * 8) % 360;
    const floor = hsv(this.hue, 0.7, 0.09 + pulse * 0.04);
    if (floor !== this.lastFloor) {
      this.lastFloor = floor;
      this.base.setFillStyle(floor, 1);
    }
  }

  drawStaticGrid(color) {
    const g = this.grid;
    g.clear();
    g.lineStyle(1, color, 0.18);
    for (let x = this.left; x <= this.right; x += this.gap) {
      g.lineBetween(x, this.top, x, this.bottom);
    }
    for (let y = this.top; y <= this.bottom; y += this.gap) {
      g.lineBetween(this.left, y, this.right, y);
    }
  }

  paintFrame(color) {
    if (!this.frame) return;
    this.frame.clear();
    this.frame.lineStyle(2, color, 0.3);
    this.frame.strokeRect(this.left - 2, this.top - 2, this.width + 4, this.height + 4);
    this.frame.lineStyle(2, color, 1);
    this.frame.strokeRect(this.left, this.top, this.width, this.height);
  }
}

function hsv(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return (Math.round((r + m) * 255) << 16)
    | (Math.round((g + m) * 255) << 8)
    | Math.round((b + m) * 255);
}
