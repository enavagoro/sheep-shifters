export const GAME_WIDTH = 1280;
export const UI_BAR = 56;
export const UI_BOTTOM = 64;
export const GAME_HEIGHT = 720 + UI_BAR + UI_BOTTOM;

export const COLORS = {
  void: 0x050706,
  grass: 0x09291b,
  grassDark: 0x061910,
  grassLight: 0x0e3a28,
  grid: 0x0f3d2a,
  frame: 0x39ff6a,
  obstacle: 0x12181c,
  obstacleEdge: 0x39ff6a,
  fence: 0x09291b,
  fenceEdge: 0x39ff6a,
  corralFloor: 0x0a1f16,
  corralNeon: 0x39ff6a,
  sheep: 0xf4fff8,
  sheepSecured: 0x9dffc0,
  outline: 0xffe14a,
  hud: 0x050706,
  button: 0xffe14a,
  buttonHover: 0xfff0a0,
  wolf: 0x14080c,
  wolfEdge: 0xff3355,
};

export const TUNING = {
  dogSize: 28,
  sheepSize: 22,
  dogSpeed: 740,
  fleeRadius: 188,
  cohesionRadius: 340,
  separationRadius: 34,
  boundsMargin: 46,
  bpm: 176,
  wolfSpeed: 330,
  wolfDodgeRadius: 110,
  wolfDodgeTime: 0.42,
  wolfPersistTime: 1.5,
  wolfHitRadius: 28,
  wolfRaidHitRadius: 48,
  wolfFleeRadius: 64,
  wolfCatchRadius: 24,
  wolfSize: 26,
  wolfInterval: 7,
  wolfFirstDelay: 6,
  wolfMax: 2,
  herdInterval: 9,
  herdFirstDelay: 7,
  herdSize: 5,
  herdCap: 22,
  sheepPoints: 100,
  wolfPoints: 200,
  levelSeconds: 15,
  spawnClearance: 260,
  raidEveryLevels: 5,
  raidWarningSeconds: 4,
  raidWolvesPerSide: 3,
  raidSpawnGap: 1.15,
  powerInterval: 12,
  powerFirstDelay: 9,
  powerPickupRadius: 30,
  powerBlastRadius: 200,
  powerFallSpeed: 380,
  powerMagnetDuration: 3,
  powerMagnetRadius: 420,
  powerWideDuration: 7,
  corralBobStartLevel: 2,
  corralOrbitStartLevel: 8,
  corralBobAmpMin: 24,
  corralBobAmpMax: 110,
  corralBobSpeedMin: 0.32,
  corralBobSpeedMax: 0.7,
  corralOrbitRxMin: 100,
  corralOrbitRxMax: 380,
  corralOrbitRyMin: 45,
  corralOrbitRyMax: 150,
  corralOrbitSpeedMin: 0.22,
  corralOrbitSpeedMax: 0.55,
  sheepWolfInterval: 20,
  sheepWolfFirstDelay: 14,
  sheepWolfSize: 24,
  sheepWolfSpeed: 210,
  sheepWolfAttractRadius: 9999,
  sheepWolfCatchRadius: 26,
  sheepWolfHitRadius: 42,
  sheepWolfLife: 22,
  sheepWolfEdgeMargin: 96,
  sheepWolfWalkMin: 0.45,
  sheepWolfWalkMax: 0.9,
  sheepWolfBleatMin: 1.4,
  sheepWolfBleatMax: 2.1,
};

export function paceForLevel(level) {
  const step = Math.max(0, level - 1);
  return {
    wolfInterval: Math.max(3.8, 7 - step * 0.4),
    wolfMax: 1,
    wolfWave: 1,
    wolfSpeed: Math.min(620, 290 + step * 34),
    herdInterval: Math.max(5, 9 - step * 0.5),
    herdSize: Math.min(8, 4 + Math.floor(step / 2)),
  };
}

export const BOUNDS = {
  left: 18,
  top: UI_BAR + 10,
  right: 1262,
  bottom: UI_BAR + 668,
};

export const SHEEP_COUNT = 12;
export const SHEEP_ORIGIN = { x: 560, y: UI_BAR + 370 };

export const DOGS = [
  { name: 'Rex', number: 1, x: 168, y: UI_BAR + 600, color: 0xff3355, speed: TUNING.dogSpeed, power: 'blast' },
  { name: 'Luna', number: 2, x: 490, y: UI_BAR + 624, color: 0x3dfff2, speed: TUNING.dogSpeed, power: 'magnet' },
  { name: 'Kira', number: 3, x: 860, y: UI_BAR + 580, color: 0xffe14a, speed: TUNING.dogSpeed, power: 'wide' },
];

export const OBSTACLES = [];

export const CORRAL = {
  x: 1042,
  y: UI_BAR + 192,
  w: 220,
  h: 280,
  thickness: 22,
  gateStart: UI_BAR + 247,
  gateEnd: UI_BAR + 417,
};
