const KEY = 'sheep-shifters-settings';

const DEFAULTS = {
  language: 'es',
  music: true,
  sound: true,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      language: parsed.language === 'en' ? 'en' : 'es',
      music: parsed.music !== false,
      sound: parsed.sound !== false,
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
