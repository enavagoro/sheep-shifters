
export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.trailCooldown = 0;
  }

  ring(x, y, color, start = 18, end = 110, duration = 280) {
    const g = this.scene.add.graphics().setDepth(900);
    const state = { r: start, a: 1 };
    const draw = () => {
      g.clear();
      g.lineStyle(3, color, state.a);
      g.strokeCircle(x, y, state.r);
      g.lineStyle(1, color, state.a * 0.45);
      g.strokeCircle(x, y, state.r * 0.72);
      g.fillStyle(color, state.a * 0.08);
      g.fillCircle(x, y, state.r);
    };
    draw();
    this.scene.tweens.add({
      targets: state,
      r: end,
      a: 0,
      duration,
      ease: 'Cubic.easeOut',
      onUpdate: draw,
      onComplete: () => g.destroy(),
    });
  }

  burst(x, y, color = 0xffffff, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 18 + Math.random() * 28;
      const size = 3 + Math.random() * 4;
      const speck = this.scene.add.rectangle(x, y, size, size, color)
        .setDepth(950)
        .setAlpha(1);
      this.scene.tweens.add({
        targets: speck,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 280 + Math.random() * 160,
        ease: 'Quad.easeOut',
        onComplete: () => speck.destroy(),
      });
    }
  }

  trail(x, y, color, dt) {
    this.trailCooldown -= dt;
    if (this.trailCooldown > 0) return;
    this.trailCooldown = 0.028;
    const speck = this.scene.add.rectangle(x, y, 6, 6, color)
      .setDepth(5)
      .setAlpha(0.55);
    this.scene.tweens.add({
      targets: speck,
      alpha: 0,
      scale: 0.3,
      duration: 220,
      onComplete: () => speck.destroy(),
    });
  }

  scorePop(x, y, points) {
    this.floatText(x, y, `+${points}`, '#ffe14a', 12);
  }

  floatText(x, y, message, color = '#ffe14a', size = 12) {
    const label = this.scene.add.text(x, y, message, {
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      fontSize: `${size}px`,
      color,
      resolution: 2,
    }).setOrigin(0.5).setDepth(1100);
    this.scene.tweens.add({
      targets: label,
      y: y - 42,
      alpha: 0,
      duration: 720,
      onComplete: () => label.destroy(),
    });
    return label;
  }

  shake(intensity = 0.004, duration = 80) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  flashColor(color, duration = 110) {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    this.scene.cameras.main.flash(duration, r, g, b);
  }
}

