import { loadBestScore, loadBestTime, submitScore, submitTime } from './HighScore.js';

export class GameState {
  constructor() {
    this.score = 0;
    this.best = loadBestScore();
    this.bestTime = loadBestTime();
    this.newBest = false;
    this.newBestTime = false;
    this.recorded = false;
    this.paused = false;
    this.over = false;
    this.endReason = null;
    this.elapsed = 0;
    this.level = 1;
  }

  add(points) {
    this.score += points;
  }

  advance(dt, levelSeconds) {
    if (this.paused || this.over) return;
    this.elapsed += dt;
    this.level = 1 + Math.floor(this.elapsed / levelSeconds);
  }

  endRun(reason = 'wolf') {
    if (this.recorded) return;
    this.over = true;
    this.endReason = reason;
    this.recorded = true;
    this.newBest = submitScore(this.score);
    if (this.newBest) this.best = this.score;
    else this.best = Math.max(this.best, loadBestScore());

    this.newBestTime = submitTime(this.elapsed);
    if (this.newBestTime) this.bestTime = this.elapsed;
    else this.bestTime = Math.max(this.bestTime, loadBestTime());
  }
}
