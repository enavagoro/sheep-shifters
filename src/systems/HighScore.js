const SCORE_KEY = 'sheep-shifters-best-score';
const TIME_KEY = 'sheep-shifters-best-time';

export function loadBestScore() {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  const next = Math.max(0, Math.floor(score));
  try {
    localStorage.setItem(SCORE_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function submitScore(score) {
  const best = loadBestScore();
  if (score > best) {
    saveBestScore(score);
    return true;
  }
  return false;
}

/** Mejor tiempo = supervivencia más larga (segundos). */
export function loadBestTime() {
  try {
    const raw = localStorage.getItem(TIME_KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBestTime(seconds) {
  const next = Math.max(0, Number(seconds) || 0);
  try {
    localStorage.setItem(TIME_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function submitTime(seconds) {
  const best = loadBestTime();
  if (seconds > best) {
    saveBestTime(seconds);
    return true;
  }
  return false;
}
