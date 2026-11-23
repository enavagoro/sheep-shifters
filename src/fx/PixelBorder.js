export function paintPixelFrame(g, box, opts = {}) {
  const outer = opts.dark ?? 0x050706;
  const inner = opts.light ?? 0x39ff6a;
  const outerW = opts.outerWidth ?? 2;
  const innerW = opts.innerWidth ?? 3;

  const L = box.left;
  const T = box.top;
  const R = box.right;
  const B = box.bottom;
  const w = R - L;
  const h = B - T;

  g.clear();

  g.lineStyle(outerW, outer, 1);
  g.strokeRect(L - 1, T - 1, w + 2, h + 2);

  g.lineStyle(innerW, inner, 1);
  g.strokeRect(L + 1, T + 1, w - 2, h - 2);
}

export function paintPixelBlock(g, x, y, w, h, opts = {}) {
  const outer = opts.dark ?? 0x050706;
  const inner = opts.light ?? 0x39ff6a;
  g.clear();
  g.lineStyle(2, outer, 1);
  g.strokeRect(x, y, w, h);
  g.lineStyle(2, inner, 1);
  g.strokeRect(x + 2, y + 2, w - 4, h - 4);
}
