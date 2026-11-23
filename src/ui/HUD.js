import { BOUNDS, COLORS, DOGS, GAME_HEIGHT, GAME_WIDTH, UI_BAR, UI_BOTTOM } from '../config.js';
import { t } from '../i18n/strings.js';
import { loadSettings, volumePercent } from '../systems/Settings.js';

const SCORE_FONT = '"Press Start 2P", "Courier New", monospace';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.menuIndex = 0;

    scene.add.rectangle(GAME_WIDTH / 2, UI_BAR / 2, GAME_WIDTH, UI_BAR, COLORS.void)
      .setDepth(1000);

    scene.add.rectangle(GAME_WIDTH / 2, UI_BAR - 1, GAME_WIDTH, 2, COLORS.frame, 0.35)
      .setDepth(1000)
      .setVisible(false);

    const hudY = UI_BAR / 2 + 4;

    this.scoreLine = scene.add.text(22, hudY - 8, 'SCORE 0', {
      fontFamily: SCORE_FONT,
      fontSize: '18px',
      color: '#39ff6a',
      resolution: 2,
    });
    this.scoreLine.setOrigin(0, 0.5);
    this.scoreLine.setDepth(1001);

    this.bestLine = scene.add.text(22, hudY + 12, 'BEST 0', {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#ffe14a',
      resolution: 2,
    });
    this.bestLine.setOrigin(0, 0.5);
    this.bestLine.setDepth(1001);
    this.bestLine.setAlpha(0.9);

    this.timeLine = scene.add.text(GAME_WIDTH / 2, hudY - 8, '0.00', {
      fontFamily: SCORE_FONT,
      fontSize: '22px',
      color: '#c8c8e8',
      resolution: 2,
    });
    this.timeLine.setOrigin(0.5);
    this.timeLine.setDepth(1001);

    this.bestTimeLine = scene.add.text(GAME_WIDTH / 2, hudY + 12, 'BEST 0.00', {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#ffe14a',
      resolution: 2,
    });
    this.bestTimeLine.setOrigin(0.5);
    this.bestTimeLine.setDepth(1001);
    this.bestTimeLine.setAlpha(0.9);

    const faceScale = 22 / 64;
    this.chips = [0, 1, 2].map((index) => {
      const dog = DOGS[index];
      const x = GAME_WIDTH - 112 + index * 34;
      const y = hudY;
      const chip = scene.add.rectangle(x, y, 28, 28, 0x0a1210)
        .setStrokeStyle(1, 0x1a2a20)
        .setDepth(1001)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0);
      const face = scene.add.image(x, y, 'dog-face')
        .setOrigin(0.5)
        .setScale(faceScale)
        .setTint(dog.color)
        .setDepth(1002)
        .setScrollFactor(0);

      chip.on('pointerdown', () => {
        const before = scene.dogController?.index;
        scene.dogController?.select?.(index);
        if (scene.dogController && scene.dogController.index !== before) {
          scene.onDogSwitched?.();
        }
      });

      return { chip, face, baseScale: faceScale, color: dog.color };
    });

    const lang = loadSettings().language === 'en' ? 'en' : 'es';
    this.shiftHint = scene.add.text(GAME_WIDTH - 130, hudY, t(lang, 'shiftChange'), {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(1, 0.5).setDepth(1001).setAlpha(0.85);

    this.pauseShade = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050706, 0.62)
      .setDepth(1190)
      .setVisible(false);

    this.pausePanel = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 340, COLORS.void, 0.96)
      .setDepth(1195)
      .setStrokeStyle(2, COLORS.frame)
      .setVisible(false);

    this.pauseText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 128, t(lang, 'pause'), {
      fontFamily: SCORE_FONT,
      fontSize: '28px',
      color: '#39ff6a',
      resolution: 2,
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setDepth(1200);
    this.pauseText.setVisible(false);

    this.menuMusic = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 68, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false);

    this.menuSfx = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 32, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false);

    this.menuVolume = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 4, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false);

    this.menuRestart = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.menuToMenu = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 76, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false)
      .setInteractive({ useHandCursor: true });
    this.menuRestart.on('pointerdown', () => {
      if (!scene.state?.paused || scene.state?.over) return;
      scene.scene.restart();
    });
    this.menuToMenu.on('pointerdown', () => {
      if (!scene.state?.paused || scene.state?.over) return;
      scene.scene.start('MenuScene');
    });
    this.menuMusic.setInteractive({ useHandCursor: true });
    this.menuSfx.setInteractive({ useHandCursor: true });
    this.menuVolume.setInteractive({ useHandCursor: true });
    this.menuMusic.on('pointerdown', () => {
      if (!scene.state?.paused || scene.state?.over) return;
      scene.hud.menuIndex = 0;
      scene.music.toggleMusicMuted();
      scene.sfx.play('ui');
    });
    this.menuSfx.on('pointerdown', () => {
      if (!scene.state?.paused || scene.state?.over) return;
      scene.hud.menuIndex = 1;
      scene.sfx.toggleMuted();
      scene.sfx.play('ui');
    });
    this.menuVolume.on('pointerdown', () => {
      if (!scene.state?.paused || scene.state?.over) return;
      scene.hud.menuIndex = 2;
      scene.adjustVolume?.(1);
    });

    this.pauseHint = scene.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 132,
      t(lang, 'pauseHint'),
      {
        fontFamily: SCORE_FONT,
        fontSize: '8px',
        color: '#ffe14a',
        resolution: 2,
      },
    );
    this.pauseHint.setOrigin(0.5);
    this.pauseHint.setDepth(1200);
    this.pauseHint.setVisible(false);

    const bottomY = GAME_HEIGHT - UI_BOTTOM / 2;
    const barTop = GAME_HEIGHT - UI_BOTTOM;
    scene.add.rectangle(GAME_WIDTH / 2, bottomY, GAME_WIDTH, UI_BOTTOM, COLORS.void)
      .setDepth(1000)
      .setScrollFactor(0);
    scene.add.rectangle(GAME_WIDTH / 2, barTop + 1, GAME_WIDTH, 2, COLORS.frame, 0.35)
      .setDepth(1000)
      .setScrollFactor(0)
      .setVisible(false);

    const panelW = 168;
    const panelH = 52;
    const panelX = 18 + panelW / 2;
    const slotTop = BOUNDS.bottom + 16;
    const slotBot = barTop - 4;
    const panelY = (slotTop + slotBot) / 2;
    const iconX = panelX - panelW / 2 + 28;
    const textX = iconX + 28;

    this.powerPanel = scene.add.rectangle(panelX, panelY, panelW, panelH, 0x0a1210, 0.96)
      .setStrokeStyle(2, 0x24352c)
      .setDepth(1001)
      .setScrollFactor(0);
    this.powerSlot = scene.add.circle(iconX, panelY, 12, 0x121a16, 1)
      .setStrokeStyle(1, 0x2a3a30)
      .setDepth(1002)
      .setScrollFactor(0);
    this.powerIcon = scene.add.circle(iconX, panelY, 8, COLORS.frame, 0.9)
      .setStrokeStyle(0)
      .setDepth(1003)
      .setVisible(false)
      .setScrollFactor(0);
    this.powerLabel = scene.add.text(textX, panelY - 9, 'POWER', {
      fontFamily: SCORE_FONT,
      fontSize: '11px',
      color: '#6a7a70',
      resolution: 2,
    }).setOrigin(0, 0.5).setDepth(1003).setScrollFactor(0);
    this.powerHint = scene.add.text(textX, panelY + 10, '—', {
      fontFamily: SCORE_FONT,
      fontSize: '10px',
      color: '#5a6a60',
      resolution: 2,
    }).setOrigin(0, 0.5).setDepth(1003).setScrollFactor(0);

    this.powerUseHint = scene.add.text(panelX + panelW / 2 + 14, panelY, t(lang, 'powerUse'), {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(0, 0.5).setDepth(1001).setScrollFactor(0).setAlpha(0.85).setVisible(false);

    this.warning = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'WARNING  WARNING  WARNING', {
      fontFamily: SCORE_FONT,
      fontSize: '18px',
      color: '#ff3355',
      resolution: 2,
      align: 'center',
    });
    this.warning.setOrigin(0.5);
    this.warning.setDepth(1250);
    this.warning.setVisible(false);

    this.gameOver = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 8).setDepth(1300).setVisible(false);
    const card = scene.add.rectangle(0, 0, 540, 340, COLORS.void, 0.96);
    card.setStrokeStyle(2, COLORS.wolfEdge);

    this.overHeading = scene.add.text(0, -132, t(lang, 'gameOver'), {
      fontFamily: SCORE_FONT,
      fontSize: '26px',
      color: '#ff3355',
      resolution: 2,
    }).setOrigin(0.5);
    this.overReason = scene.add.text(0, -96, t(lang, 'wolfGotSheep'), {
      fontFamily: SCORE_FONT,
      fontSize: '9px',
      color: '#9aa89e',
      resolution: 2,
    }).setOrigin(0.5);
    this.overNewBest = scene.add.text(0, -72, t(lang, 'newHighScore'), {
      fontFamily: SCORE_FONT,
      fontSize: '10px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);

    this.overRunTitle = scene.add.text(-120, -40, t(lang, 'thisRun'), {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#5a6a60',
      resolution: 2,
    }).setOrigin(0.5);
    this.overScore = scene.add.text(-120, -14, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5);
    this.overTime = scene.add.text(-120, 12, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#c8c8e8',
      resolution: 2,
    }).setOrigin(0.5);

    this.overRecordsTitle = scene.add.text(120, -40, t(lang, 'records'), {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#5a6a60',
      resolution: 2,
    }).setOrigin(0.5);
    this.overBest = scene.add.text(120, -14, '', {
      fontFamily: SCORE_FONT,
      fontSize: '11px',
      color: '#c8d6cc',
      resolution: 2,
    }).setOrigin(0.5);
    this.overBestTime = scene.add.text(120, 12, '', {
      fontFamily: SCORE_FONT,
      fontSize: '11px',
      color: '#c8d6cc',
      resolution: 2,
    }).setOrigin(0.5);

    this.overRestartBtn = scene.add.rectangle(0, 62, 200, 36, 0x1a2a20, 1)
      .setStrokeStyle(2, COLORS.frame)
      .setInteractive({ useHandCursor: true });
    this.overRestartLabel = scene.add.text(0, 62, '', {
      fontFamily: SCORE_FONT,
      fontSize: '11px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(0.5);

    this.overRestartBtn.on('pointerover', () => {
      this.overRestartBtn.setFillStyle(0x24352c, 1);
      this.overRestartBtn.setStrokeStyle(2, 0xffe14a);
      this.overRestartLabel.setColor('#fff0a0');
    });
    this.overRestartBtn.on('pointerout', () => {
      this.overRestartBtn.setFillStyle(0x1a2a20, 1);
      this.overRestartBtn.setStrokeStyle(2, COLORS.frame);
      this.overRestartLabel.setColor('#ffe14a');
    });
    this.overRestartBtn.on('pointerdown', () => {
      scene.scene.restart();
    });

    this.overThanks = scene.add.text(0, 108, t(lang, 'jamThanks'), {
      fontFamily: SCORE_FONT,
      fontSize: '7px',
      color: '#5a6a60',
      resolution: 2,
      align: 'center',
    }).setOrigin(0.5);
    this.overBy = scene.add.text(0, 126, t(lang, 'gameBy'), {
      fontFamily: SCORE_FONT,
      fontSize: '9px',
      color: '#9dffc0',
      resolution: 2,
    }).setOrigin(0.5);
    this.overEscHint = scene.add.text(250, 152, t(lang, 'pressEscMenu'), {
      fontFamily: SCORE_FONT,
      fontSize: '7px',
      color: '#4a5a50',
      resolution: 2,
    }).setOrigin(1, 1);

    this.gameOver.add([
      card,
      this.overHeading,
      this.overReason,
      this.overNewBest,
      this.overRunTitle,
      this.overScore,
      this.overTime,
      this.overRecordsTitle,
      this.overBest,
      this.overBestTime,
      this.overRestartBtn,
      this.overRestartLabel,
      this.overThanks,
      this.overBy,
      this.overEscHint,
    ]);
  }

  setPower(power) {
    const lang = loadSettings().language === 'en' ? 'en' : 'es';
    this.powerUseHint?.setText(t(lang, 'powerUse'));
    if (!power) {
      this.powerIcon.setVisible(false);
      this.powerIcon.setFillStyle(COLORS.frame, 0);
      this.powerSlot.setFillStyle(0x121a16, 1);
      this.powerSlot.setStrokeStyle(1, 0x2a3a30);
      this.powerPanel.setStrokeStyle(2, 0x24352c);
      this.powerLabel.setText(t(lang, 'powerEmpty'));
      this.powerLabel.setColor('#6a7a70');
      this.powerHint.setText('—');
      this.powerHint.setColor('#5a6a60');
      this.powerUseHint?.setVisible(false);
      this.drawnPower = `${lang}:null`;
      return;
    }
    const charged = !power.empty;
    const raw = power.hint || '';
    const activeTimer = charged && /^\d+s$/.test(raw);
    this.drawnPower = `${lang}:${power.id}:${charged ? 'on' : 'off'}:${raw}`;
    this.powerIcon.setVisible(charged);
    this.powerIcon.setStrokeStyle(0);
    this.powerIcon.setFillStyle(power.color, charged ? 0.95 : 0);
    this.powerSlot.setFillStyle(0x121a16, 1);
    this.powerSlot.setStrokeStyle(1, charged ? power.color : 0x2a3a30, charged ? 0.7 : 1);
    this.powerPanel.setStrokeStyle(2, charged ? 0x2a4a3a : 0x24352c);
    const powerName = powerLabelFor(lang, power.id) || power.label;
    this.powerLabel.setText(charged ? powerName : t(lang, 'powerEmpty'));
    this.powerLabel.setColor(charged ? '#e8fff0' : '#6a7a70');
    let hint = '—';
    if (charged) hint = activeTimer ? raw : t(lang, 'powerHint');
    this.powerHint.setText(hint);
    this.powerHint.setColor(charged ? '#ffe14a' : '#5a6a60');
    this.powerUseHint?.setVisible(charged && !activeTimer);
  }

  refresh(state, controller, warningOn = false, audio = null, power = null) {
    const lang = loadSettings().language === 'en' ? 'en' : 'es';
    const powerKey = power
      ? `${lang}:${power.id}:${power.empty ? 'off' : 'on'}:${power.hint || ''}`
      : `${lang}:null`;
    if (powerKey !== this.drawnPower) {
      this.setPower(power);
    }
    const scoreLabel = `${t(lang, 'score')} ${state.score}`;
    const timeLabel = formatTime(state.elapsed);
    const bestValue = Math.max(state.best, state.score);
    const bestTimeValue = Math.max(state.bestTime || 0, state.elapsed || 0);
    const beatScore = state.newBest || state.score > state.best;
    const beatTime = state.newBestTime || (state.bestTime > 0 && state.elapsed > state.bestTime);
    const blinkOn = Math.floor(this.scene.time.now / 420) % 2 === 0;

    const bestLabel = beatScore && blinkOn
      ? t(lang, 'newRecord')
      : `${t(lang, 'best')} ${beatScore ? bestValue : state.best}`;
    const bestTimeLabel = beatTime && blinkOn
      ? t(lang, 'newRecord')
      : state.bestTime > 0 || beatTime
        ? `${t(lang, 'best')} ${formatTime(beatTime ? bestTimeValue : state.bestTime)}`
        : `${t(lang, 'best')} —`;

    if (scoreLabel !== this.drawnScore) {
      this.drawnScore = scoreLabel;
      this.scoreLine.setText(scoreLabel);
    }
    this.scoreLine.setColor(beatScore ? '#ffe14a' : '#39ff6a');

    if (bestLabel !== this.drawnBest) {
      this.drawnBest = bestLabel;
      this.bestLine.setText(bestLabel);
    }
    this.bestLine.setAlpha(beatScore ? (blinkOn ? 1 : 0.35) : 0.9);

    if (timeLabel !== this.drawnTime) {
      this.drawnTime = timeLabel;
      this.timeLine.setText(timeLabel);
    }
    this.timeLine.setColor(beatTime ? '#ffe14a' : '#c8c8e8');

    if (bestTimeLabel !== this.drawnBestTime) {
      this.drawnBestTime = bestTimeLabel;
      this.bestTimeLine.setText(bestTimeLabel);
    }
    this.bestTimeLine.setAlpha(beatTime ? (blinkOn ? 1 : 0.35) : 0.9);

    if (state.over) {
      this.overHeading?.setText(t(lang, 'gameOver'));
      const reasonKey = state.endReason === 'spike' ? 'spikeGotSheep' : 'wolfGotSheep';
      this.overReason?.setText(t(lang, reasonKey));
      this.overRunTitle?.setText(t(lang, 'thisRun'));
      this.overRecordsTitle?.setText(t(lang, 'records'));
      this.overRestartLabel?.setText(`R  ${t(lang, 'restart')}`);
      this.overThanks?.setText(t(lang, 'jamThanks'));
      this.overBy?.setText(t(lang, 'gameBy'));
      this.overEscHint?.setText(t(lang, 'pressEscMenu'));

      this.overScore.setText(`${t(lang, 'score')}  ${state.score}`);
      this.overTime.setText(`${t(lang, 'time')}  ${timeLabel}`);
      this.overBest.setText(`${t(lang, 'best')}  ${state.best}`);
      this.overBestTime.setText(
        state.bestTime > 0
          ? `${t(lang, 'bestTime')}  ${formatTime(state.bestTime)}`
          : `${t(lang, 'bestTime')}  —`,
      );

      const banner = state.newBest
        ? t(lang, 'newHighScore')
        : (state.newBestTime ? t(lang, 'newBestTime') : '');
      this.overNewBest.setVisible(!!banner);
      if (banner) {
        this.overNewBest.setText(banner);
        this.overNewBest.setAlpha(0.55 + Math.abs(Math.sin(this.scene.time.now / 160)) * 0.45);
      }
      this.overScore.setColor(state.newBest ? '#ffe14a' : '#39ff6a');
      this.overBestTime.setColor(state.newBestTime ? '#ffe14a' : '#c8d6cc');
    }

    if (this.drawnDogIndex !== controller.index) {
      this.drawnDogIndex = controller.index;
      controller.dogs.forEach((entry, index) => {
        const { chip, face, baseScale, color } = this.chips[index];
        const on = entry.active;
        chip.setFillStyle(0x0a1210, on ? 1 : 0.55);
        chip.setStrokeStyle(on ? 3 : 1, on ? COLORS.outline : 0x1a2a20);
        chip.setScale(on ? 1.08 : 1);
        face.setTint(color);
        face.setAlpha(on ? 1 : 0.4);
        face.setScale(baseScale * (on ? 1.1 : 1));
      });
    }

    const paused = state.paused && !state.over;
    this.pauseShade.setVisible(paused);
    this.pausePanel.setVisible(paused);
    this.pauseText.setVisible(paused);
    this.pauseHint.setVisible(paused);
    this.menuMusic.setVisible(paused);
    this.menuSfx.setVisible(paused);
    this.menuVolume.setVisible(paused);
    this.menuRestart.setVisible(paused);
    this.menuToMenu.setVisible(paused);
    this.gameOver.setVisible(state.over);

    if (paused && audio) {
      const musicOn = !audio.musicMuted;
      const sfxOn = !audio.sfxMuted;
      const on = t(lang, 'on');
      const off = t(lang, 'off');
      const vol = volumePercent(loadSettings().volume);
      const musicLine = `${this.menuIndex === 0 ? '>' : ' '} ${t(lang, 'music')}  ${musicOn ? on : off}`;
      const sfxLine = `${this.menuIndex === 1 ? '>' : ' '} ${t(lang, 'sound')}  ${sfxOn ? on : off}`;
      const volumeLine = `${this.menuIndex === 2 ? '>' : ' '} ${t(lang, 'volume')}  ${vol}%`;
      const restartLine = `${this.menuIndex === 3 ? '>' : ' '} ${t(lang, 'restart')}`;
      const toMenuLine = `${this.menuIndex === 4 ? '>' : ' '} ${t(lang, 'toMenu')}`;
      this.pauseText.setText(t(lang, 'pause'));
      this.pauseHint.setText(t(lang, 'pauseHint'));
      this.shiftHint.setText(t(lang, 'shiftChange'));
      this.powerUseHint?.setText(t(lang, 'powerUse'));
      this.menuMusic.setText(musicLine);
      this.menuSfx.setText(sfxLine);
      this.menuVolume.setText(volumeLine);
      this.menuRestart.setText(restartLine);
      this.menuToMenu.setText(toMenuLine);
      this.menuMusic.setColor(this.menuIndex === 0 ? '#ffe14a' : '#39ff6a');
      this.menuSfx.setColor(this.menuIndex === 1 ? '#ffe14a' : '#39ff6a');
      this.menuVolume.setColor(this.menuIndex === 2 ? '#ffe14a' : '#39ff6a');
      this.menuRestart.setColor(this.menuIndex === 3 ? '#ffe14a' : '#39ff6a');
      this.menuToMenu.setColor(this.menuIndex === 4 ? '#ffe14a' : '#39ff6a');
    }

    this.warning.setVisible(warningOn && !state.over);
    if (warningOn) {
      this.warning.setAlpha(0.45 + Math.abs(Math.sin(this.scene.time.now / 140)) * 0.55);
    }
  }
}

function formatTime(seconds) {
  return Math.max(0, seconds).toFixed(2);
}

function powerLabelFor(lang, id) {
  if (id === 'blast') return t(lang, 'powerBlast');
  if (id === 'magnet') return t(lang, 'powerMagnet');
  if (id === 'wide') return t(lang, 'powerWide');
  return null;
}

