import Phaser from 'phaser';

const SUBTLE = { curve: 0.0735, fit: 0.5, rounded: 0 };
const ROUNDED = { curve: 0.24, fit: 0.25, rounded: 1 };
const ROLL_DURATION = 3.2;
const ROLL_GAP_MIN = 6;
const ROLL_GAP_MAX = 12;

const fragShader = `
#define SHADER_NAME CURVED_SCREEN_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uCurve;
uniform float uFit;
uniform float uRounded;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRoll;
varying vec2 outTexCoord;

// Same as the page background (#050706) so the curved edge blends into the letterbox.
const vec3 BEZEL = vec3(5.0, 7.0, 6.0) / 255.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec4 sampleSmooth(vec2 uv) {
  vec2 p = uv * uResolution - 0.5;
  vec2 f = fract(p);
  vec2 base = (floor(p) + 0.5) / uResolution;
  vec2 texel = 1.0 / uResolution;
  vec4 a = texture2D(uMainSampler, base);
  vec4 b = texture2D(uMainSampler, base + vec2(texel.x, 0.0));
  vec4 c = texture2D(uMainSampler, base + vec2(0.0, texel.y));
  vec4 d = texture2D(uMainSampler, base + texel);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 d = outTexCoord - 0.5;
  float scale = (1.0 + uCurve * dot(d, d)) / (1.0 + uCurve * uFit);
  vec2 uv = 0.5 + d * scale;

  float mask = 1.0;
  if (uRounded > 0.5) {
    vec2 edge = min(uv, 1.0 - uv) * uResolution;
    mask = smoothstep(0.0, 2.5, min(edge.x, edge.y));
    if (mask <= 0.0) {
      gl_FragColor = vec4(BEZEL, 1.0);
      return;
    }
  }

  float band = 0.0;
  float line = floor(uv.y * uResolution.y / 2.0);
  float frame = floor(uTime * 24.0);
  if (uRoll > -1.0) {
    float dy = uv.y - uRoll;
    band = exp(-dy * dy / 0.0025);
    float jitter = hash(vec2(line, frame)) - 0.5;
    uv.x += jitter * 0.005 * band;
  }

  vec4 color = sampleSmooth(uv);

  if (band > 0.001) {
    float streak = step(0.82, hash(vec2(line * 1.7, frame + 3.0)));
    float grain = hash(vec2(uv.x * uResolution.x, line + frame));
    color.rgb += band * (0.025 + streak * 0.09 * grain);
    color.rgb = mix(color.rgb, color.gbr, band * 0.05);
  }

  gl_FragColor = vec4(mix(BEZEL, color.rgb, mask), 1.0);
}
`;

const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let nextRollAt = null;

function rollPosition(now) {
  if (reducedMotion) return -2;
  if (nextRollAt === null) nextRollAt = now + 1.5;
  const elapsed = now - nextRollAt;
  if (elapsed < 0) return -2;
  if (elapsed > ROLL_DURATION) {
    nextRollAt = now + ROLL_GAP_MIN + Math.random() * (ROLL_GAP_MAX - ROLL_GAP_MIN);
    return -2;
  }
  return 1.15 - (elapsed / ROLL_DURATION) * 1.3;
}

export class CurvedScreen extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'CurvedScreen', fragShader });
    this.look = SUBTLE;
  }

  onPreRender() {
    const now = performance.now() / 1000;
    this.set1f('uCurve', this.look.curve);
    this.set1f('uFit', this.look.fit);
    this.set1f('uRounded', this.look.rounded);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uTime', now);
    this.set1f('uRoll', rollPosition(now));
  }
}

export function applyCurvedScreen(scene, { rounded = false } = {}) {
  if (scene.renderer.type !== Phaser.WEBGL) return;
  const camera = scene.cameras.main;
  camera.setPostPipeline(CurvedScreen);
  const pipeline = camera.getPostPipeline(CurvedScreen);
  const instances = Array.isArray(pipeline) ? pipeline : [pipeline];
  for (const instance of instances) {
    if (instance) instance.look = rounded ? ROUNDED : SUBTLE;
  }
}
