export function hsv(h, s, v) {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return (Math.round((r + m) * 255) << 16)
    | (Math.round((g + m) * 255) << 8)
    | Math.round((b + m) * 255);
}

export function toCss(color) {
  const hex = color.toString(16).padStart(6, '0');
  return `#${hex}`;
}

export function themeFromHue(hue, energy = 0) {
  const e = Math.max(0, Math.min(1, energy));
  const dark = hsv(hue, 0.42, 0.035 + e * 0.015);
  const mid = hsv(hue, 0.38, 0.07 + e * 0.02);
  const band = hsv(hue, 0.4, 0.1 + e * 0.025);
  const accent = hsv(hue, 0.7, 0.78 + e * 0.1);
  const accentDim = hsv(hue, 0.55, 0.5 + e * 0.08);
  return { hue, dark, mid, band, accent, accentDim };
}
