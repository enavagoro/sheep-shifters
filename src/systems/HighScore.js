const KEY = 'sheep-shifters-best-score';

export function loadBestScore() {
  try {
    const raw = localStorage.getItem(KEY);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score) {
  const next = Math.max(0, Math.floor(score));
  try {
    localStorage.setItem(KEY, String(next));
  } catch {

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
