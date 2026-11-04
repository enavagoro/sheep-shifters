import { BOUNDS, COLORS } from '../config.js';

export class PulseField {
  constructor(scene) {
    this.left = BOUNDS.left;
    this.top = BOUNDS.top;
    this.right = BOUNDS.right;
    this.bottom = BOUNDS.bottom;
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;
    this.scroll = 0;
    this.scrollY = 0;
    this.gap = 64;
    this.hue = 150;

    this.base = scene.add.rectangle(
      (this.left + this.right) / 2,
      (this.top + this.bottom) / 2,
      this.width,
      this.height,
      COLORS.grass,
    ).setDepth(-14);

    this.grid = scene.add.graphics().setDepth(-13);
    this.wash = scene.add.graphics().setDepth(-12);
    this.frame = null;
    this.drawGrid(0, COLORS.grid);
  }

  
  update(dt, energy = 0, elapsed = 0) {
    const pulse = Math.max(0, Math.min(1, energy));
    
    this.hue = (150 + elapsed * 9 + pulse * 8) % 360;
    this.scroll = (this.scroll + dt * (22 + pulse * 36)) % this.gap;
    this.scrollY = (this.scrollY + dt * (16 + pulse * 24)) % this.gap;

    const floor = hsv(this.hue, 0.7, 0.09 + pulse * 0.04);
    const grid = hsv((this.hue + 18) % 360, 0.55, 0.22 + pulse * 0.08);
    const accent = hsv((this.hue + 40) % 360, 0.75, 0.28 + pulse * 0.12);
    const neon = hsv((this.hue + 90) % 360, 0.85, 0.72 + pulse * 0.18);

    this.base.setFillStyle(floor, 1);
    this.drawGrid(pulse, grid);
    this.drawWash(accent, pulse);
    if (this.frame) this.paintFrame(neon);
  }

  drawGrid(pulse, color) {
    const g = this.grid;
    g.clear();
    const alpha = 0.16 + pulse * 0.1;
    g.lineStyle(1, color, alpha);

    for (let x = this.left - this.gap + this.scroll; x <= this.right + this.gap; x += this.gap) {
      g.lineBetween(x, this.top, x, this.bottom);
    }
    for (let y = this.top - this.gap + this.scrollY; y <= this.bottom + this.gap; y += this.gap) {
      g.lineBetween(this.left, y, this.right, y);
    }
  }

  drawWash(color, pulse) {
    const g = this.wash;
    g.clear();
    
    const period = 96;
    const offset = (this.scroll * 1.4 + this.scrollY) % period;
    g.fillStyle(color, 0.05 + pulse * 0.04);
    for (let s = -this.height; s < this.width + this.height; s += period) {
      const u0 = s + offset;
      fillDiagonalBand(g, this.left, this.top, this.right, this.bottom, u0, u0 + period * 0.35);
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

function fillDiagonalBand(g, left, top, right, bottom, start, end) {
  const corners = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
  const candidates = [];
  for (const [x, y] of corners) {
    const u = (x - left) + (y - top);
    if (u >= start && u <= end) candidates.push([x, y]);
  }
  addDiagHits(candidates, left, top, right, bottom, start);
  addDiagHits(candidates, left, top, right, bottom, end);
  if (candidates.length < 3) return;

  let cx = 0;
  let cy = 0;
  for (const p of candidates) {
    cx += p[0];
    cy += p[1];
  }
  cx /= candidates.length;
  cy /= candidates.length;
  candidates.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));

  g.beginPath();
  g.moveTo(candidates[0][0], candidates[0][1]);
  for (let i = 1; i < candidates.length; i += 1) g.lineTo(candidates[i][0], candidates[i][1]);
  g.closePath();
  g.fillPath();
}

function addDiagHits(out, left, top, right, bottom, u) {
  const xTop = left + u;
  if (xTop >= left && xTop <= right) out.push([xTop, top]);
  const xBot = left + u - (bottom - top);
  if (xBot >= left && xBot <= right) out.push([xBot, bottom]);
  const yLeft = top + u;
  if (yLeft >= top && yLeft <= bottom) out.push([left, yLeft]);
  const yRight = top + u - (right - left);
  if (yRight >= top && yRight <= bottom) out.push([right, yRight]);
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
