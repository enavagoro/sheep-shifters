import { BOUNDS, COLORS } from '../config.js';
import { paintPixelFrame } from '../fx/PixelBorder.js';
import { themeFromHue } from '../fx/color.js';

const PATTERNS = ['square', 'triangle', 'hex', 'diamond'];
const PATTERN_SECONDS = 18;
const CROSSFADE = 0.18; // fracción del ciclo para solapar figuras

export class PulseField {
  constructor(scene) {
    this.scene = scene;
    this.left = BOUNDS.left;
    this.top = BOUNDS.top;
    this.right = BOUNDS.right;
    this.bottom = BOUNDS.bottom;
    this.width = this.right - this.left;
    this.height = this.bottom - this.top;

    this.scroll = 0;
    this.hue = 150;
    this.smoothEnergy = 0;
    this.theme = themeFromHue(this.hue, 0);
    this.lastAccent = -1;
    this.gap = 64;

    const cx = (this.left + this.right) / 2;
    const cy = (this.top + this.bottom) / 2;

    this.voidPad = scene.add.rectangle(
      cx,
      cy,
      this.width + 96,
      this.height + 96,
      COLORS.void,
    ).setDepth(-16);

    this.base = scene.add.rectangle(
      cx,
      cy,
      this.width,
      this.height,
      COLORS.grass,
    ).setDepth(-15);

    this.cx = cx;
    this.cy = cy;

    this.pattern = scene.add.tileSprite(cx, cy, this.width, this.height, 'bg-pattern')
      .setDepth(-14)
      .setAlpha(0.28);

    this.mesh = scene.add.graphics().setDepth(-13);

    // Recorta malla/patrón al interior del mapa
    this.maskGfx = scene.make.graphics({ x: 0, y: 0, add: false });
    this.maskGfx.fillStyle(0xffffff, 1);
    this.maskGfx.fillRect(this.left, this.top, this.width, this.height);
    this.fieldMask = this.maskGfx.createGeometryMask();
    this.mesh.setMask(this.fieldMask);
    this.pattern.setMask(this.fieldMask);

    this.frame = null;
  }

  update(dt, energy = 0, elapsed = 0) {
    this.smoothEnergy += (energy - this.smoothEnergy) * Math.min(1, dt * 2.5);
    this.hue = (elapsed * 14) % 360;
    this.scroll += dt * 36;

    const cycle = elapsed / PATTERN_SECONDS;
    const idx = Math.floor(cycle) % PATTERNS.length;
    const next = (idx + 1) % PATTERNS.length;
    const frac = cycle - Math.floor(cycle);

    // Crossfade: la figura actual se va y la siguiente entra encima
    let blendCurr = 1;
    let blendNext = 0;
    if (frac > 1 - CROSSFADE) {
      const t = (frac - (1 - CROSSFADE)) / CROSSFADE;
      blendCurr = 1 - t;
      blendNext = t;
    }

    this.theme = themeFromHue(this.hue, this.smoothEnergy * 0.3);
    const { dark, mid, band, accent, accentDim } = this.theme;

    this.voidPad.setFillStyle(dark, 1);
    this.base.setFillStyle(mid, 1);
    this.base.setPosition(this.cx, this.cy);
    this.base.setScale(1);

    this.pattern.setPosition(this.cx, this.cy);
    this.pattern.setScale(1);
    this.pattern.tilePositionX = this.scroll * 0.55;
    this.pattern.tilePositionY = this.scroll * 0.85;
    this.pattern.setTint(band);
    this.pattern.setAlpha(0.22 + this.smoothEnergy * 0.08);

    this.mesh.clear();
    this.drawMesh(PATTERNS[idx], accentDim, this.smoothEnergy, blendCurr);
    if (blendNext > 0.02) {
      this.drawMesh(PATTERNS[next], accentDim, this.smoothEnergy, blendNext);
    }

    if (accent !== this.lastAccent) {
      this.lastAccent = accent;
      this.paintFrame(accent);
    }
  }

  drawMesh(kind, color, energy, blend = 1) {
    const g = this.mesh;
    const alpha = (0.2 + energy * 0.1) * blend;
    if (alpha < 0.02) return;
    g.lineStyle(1, color, alpha);

    // Offset continuo con el periodo propio de cada figura (evita saltos al envolver)
    if (kind === 'square') this.drawSquares(g);
    else if (kind === 'triangle') this.drawTriangles(g);
    else if (kind === 'hex') this.drawHexes(g);
    else this.drawDiamonds(g);
  }

  wrap(value, period) {
    return ((value % period) + period) % period;
  }

  drawSquares(g) {
    const drift = this.wrap(this.scroll, this.gap);
    for (let x = this.left - this.gap + drift; x <= this.right + this.gap; x += this.gap) {
      g.lineBetween(x, this.top, x, this.bottom);
    }
    for (let y = this.top - this.gap + drift; y <= this.bottom + this.gap; y += this.gap) {
      g.lineBetween(this.left, y, this.right, y);
    }
  }

  drawTriangles(g) {
    const cell = this.gap;
    const h = cell * Math.sqrt(3) * 0.5;
    const ox = this.scroll * 0.5;
    const oy = this.scroll;
    const rowMin = Math.floor((this.top - oy) / h) - 1;
    const rowMax = Math.ceil((this.bottom - oy) / h) + 1;

    for (let row = rowMin; row <= rowMax; row += 1) {
      const y = row * h + oy;
      const odd = (row & 1) === 1;
      const xShift = odd ? cell * 0.5 : 0;
      const colMin = Math.floor((this.left - ox - xShift) / cell) - 1;
      const colMax = Math.ceil((this.right - ox - xShift) / cell) + 1;
      for (let col = colMin; col <= colMax; col += 1) {
        const x = col * cell + ox + xShift;
        // Solo lados diagonales (sin base horizontal)
        if (odd) {
          const baseY = y + h * 0.15;
          const apexY = y + h * 0.85;
          g.lineBetween(x, baseY, x + cell * 0.5, apexY);
          g.lineBetween(x + cell * 0.5, apexY, x + cell, baseY);
        } else {
          const baseY = y + h * 0.85;
          const apexY = y + h * 0.15;
          g.lineBetween(x, baseY, x + cell * 0.5, apexY);
          g.lineBetween(x + cell * 0.5, apexY, x + cell, baseY);
        }
      }
    }
  }

  drawHexes(g) {
    // Lattice absoluta: la paridad va con el índice de fila, no con el wrap del scroll
    const size = this.gap * 0.48;
    const w = size * Math.sqrt(3);
    const h = size * 1.5;
    const ox = this.scroll * 0.35;
    const oy = this.scroll;
    const rowMin = Math.floor((this.top - oy) / h) - 1;
    const rowMax = Math.ceil((this.bottom - oy) / h) + 1;

    for (let row = rowMin; row <= rowMax; row += 1) {
      const y = row * h + oy;
      const odd = (row & 1) === 1;
      const xShift = odd ? w * 0.5 : 0;
      const colMin = Math.floor((this.left - ox - xShift) / w) - 1;
      const colMax = Math.ceil((this.right - ox - xShift) / w) + 1;
      for (let col = colMin; col <= colMax; col += 1) {
        this.strokeHex(g, col * w + ox + xShift, y, size);
      }
    }
  }

  strokeHex(g, cx, cy, size) {
    let prevX = cx + Math.cos(-Math.PI / 6) * size;
    let prevY = cy + Math.sin(-Math.PI / 6) * size;
    for (let i = 1; i <= 6; i += 1) {
      const a = -Math.PI / 6 + (Math.PI / 3) * i;
      const x = cx + Math.cos(a) * size;
      const y = cy + Math.sin(a) * size;
      g.lineBetween(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
  }

  drawDiamonds(g) {
    // Zigzags continuos por fila (nunca traza horizontales)
    const s = this.gap;
    const ox = this.scroll;
    const oy = this.scroll;
    const rowMin = Math.floor((this.top - oy) / s) - 1;
    const rowMax = Math.ceil((this.bottom - oy) / s) + 1;

    for (let row = rowMin; row <= rowMax; row += 1) {
      const y = row * s + oy;
      const colMin = Math.floor((this.left - ox) / s) - 1;
      const colMax = Math.ceil((this.right - ox) / s) + 1;
      let prevUpX = colMin * s + ox;
      let prevUpY = y;
      let prevDnX = prevUpX;
      let prevDnY = y;
      for (let col = colMin; col <= colMax; col += 1) {
        const x = col * s + ox;
        const midX = x + s * 0.5;
        const peakY = y - s * 0.5;
        const troughY = y + s * 0.5;
        const nextX = x + s;
        // /\
        g.lineBetween(prevUpX, prevUpY, midX, peakY);
        g.lineBetween(midX, peakY, nextX, y);
        // \/
        g.lineBetween(prevDnX, prevDnY, midX, troughY);
        g.lineBetween(midX, troughY, nextX, y);
        prevUpX = nextX;
        prevUpY = y;
        prevDnX = nextX;
        prevDnY = y;
      }
    }
  }

  paintFrame(color) {
    if (!this.frame) return;
    paintPixelFrame(this.frame, {
      left: this.left,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
    }, {
      dark: 0x050706,
      light: color ?? COLORS.frame,
      outerWidth: 2,
      innerWidth: 3,
    });
  }
}
