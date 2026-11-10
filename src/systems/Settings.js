const KEY = 'sheep-shifters-settings';

const DEFAULTS = {
  language: 'es',
  music: true,
  sound: true,
  volume: 1,
};

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.volume;
  return Math.max(0, Math.min(1, Math.round(n * 10) / 10));
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      language: parsed.language === 'en' ? 'en' : 'es',
      music: parsed.music !== false,
      sound: parsed.sound !== false,
      volume: clampVolume(parsed.volume ?? DEFAULTS.volume),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(next) {
  const settings = {
    language: next.language === 'en' ? 'en' : 'es',
    music: next.music !== false,
    sound: next.sound !== false,
    volume: clampVolume(next.volume ?? DEFAULTS.volume),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {

  }
  return settings;
}

export function updateSettings(patch) {
  return saveSettings({ ...loadSettings(), ...patch });
}

export function volumePercent(volume = loadSettings().volume) {
  return Math.round(clampVolume(volume) * 100);
}
