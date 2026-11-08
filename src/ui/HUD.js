import { COLORS, GAME_HEIGHT, GAME_WIDTH, UI_BAR, UI_BOTTOM } from '../config.js';

const SCORE_FONT = '"Press Start 2P", "Courier New", monospace';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.menuIndex = 0;

    scene.add.rectangle(GAME_WIDTH / 2, UI_BAR / 2, GAME_WIDTH, UI_BAR, COLORS.void)
      .setDepth(1000);

    scene.add.rectangle(GAME_WIDTH / 2, UI_BAR - 1, GAME_WIDTH, 2, COLORS.frame, 0.35)
      .setDepth(1000);

    this.scoreLine = scene.add.text(22, UI_BAR / 2 - 8, 'SCORE 0', {
      fontFamily: SCORE_FONT,
      fontSize: '18px',
      color: '#39ff6a',
      resolution: 2,
    });
    this.scoreLine.setOrigin(0, 0.5);
    this.scoreLine.setDepth(1001);

    this.bestLine = scene.add.text(22, UI_BAR / 2 + 12, 'BEST 0', {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#ffe14a',
      resolution: 2,
    });
    this.bestLine.setOrigin(0, 0.5);
    this.bestLine.setDepth(1001);
    this.bestLine.setAlpha(0.9);

    this.levelLine = scene.add.text(GAME_WIDTH / 2, UI_BAR / 2, 'LV 1', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    });
    this.levelLine.setOrigin(0.5);
    this.levelLine.setDepth(1001);
    this.levelLine.setAlpha(0.9);

    this.chips = [0, 1, 2].map((index) => {
      const x = GAME_WIDTH - 112 + index * 34;
      const y = UI_BAR / 2;
      const chip = scene.add.rectangle(x, y, 26, 26, 0xffffff)
        .setDepth(1001)
        .setInteractive({ useHandCursor: true });
      const caption = scene.add.text(x, y, String(index + 1), {
        fontFamily: SCORE_FONT,
        fontSize: '10px',
        color: '#050706',
        resolution: 2,
      }).setOrigin(0.5).setDepth(1002);

      chip.on('pointerdown', () => {
        const before = scene.dogController?.index;
        scene.dogController?.select?.(index);
        if (scene.dogController && scene.dogController.index !== before) {
          scene.onDogSwitched?.();
        }
      });

      return { chip, caption };
    });

    scene.add.text(GAME_WIDTH - 130, UI_BAR / 2, 'SHIFT TO CHANGE', {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(1, 0.5).setDepth(1001).setAlpha(0.85);

    this.pauseShade = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050706, 0.62)
      .setDepth(1190)
      .setVisible(false);

    this.pausePanel = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 300, COLORS.void, 0.96)
      .setDepth(1195)
      .setStrokeStyle(2, COLORS.frame)
      .setVisible(false);

    this.pauseText = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 108, 'PAUSE', {
      fontFamily: SCORE_FONT,
      fontSize: '28px',
      color: '#39ff6a',
      resolution: 2,
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setDepth(1200);
    this.pauseText.setVisible(false);

    this.menuMusic = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 36, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false);

    this.menuSfx = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1200).setVisible(false);

    this.menuRestart = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 36, '', {
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
    this.menuMusic.setInteractive({ useHandCursor: true });
    this.menuSfx.setInteractive({ useHandCursor: true });
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

    this.pauseHint = scene.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 98,
      'UP/DOWN  ENTER  ESC',
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
    scene.add.rectangle(GAME_WIDTH / 2, bottomY, GAME_WIDTH, UI_BOTTOM, COLORS.void)
      .setDepth(1000)
      .setScrollFactor(0);
    scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - UI_BOTTOM + 1, GAME_WIDTH, 2, COLORS.frame, 0.35)
      .setDepth(1000)
      .setScrollFactor(0);

    const panelW = 148;
    const panelH = 48;
    const panelX = 16 + panelW / 2;
    const panelY = bottomY;
    this.powerPanel = scene.add.rectangle(panelX, panelY, panelW, panelH, COLORS.void, 1)
      .setStrokeStyle(2, 0x1a2a20)
      .setDepth(1001)
      .setScrollFactor(0);
    this.powerSlot = scene.add.circle(panelX - 48, panelY, 16, COLORS.void, 1)
      .setStrokeStyle(2, 0x1a2a20)
      .setDepth(1002)
      .setScrollFactor(0);
    this.powerIcon = scene.add.circle(panelX - 48, panelY, 9, COLORS.frame, 0)
      .setStrokeStyle(2, COLORS.frame)
      .setDepth(1003)
      .setVisible(false)
      .setScrollFactor(0);
    this.powerLabel = scene.add.text(panelX + 12, panelY - 8, 'POWER', {
      fontFamily: SCORE_FONT,
      fontSize: '9px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);
    this.powerHint = scene.add.text(panelX + 12, panelY + 10, '—', {
      fontFamily: SCORE_FONT,
      fontSize: '8px',
      color: '#6a7a70',
      resolution: 2,
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);

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

    this.gameOver = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12).setDepth(1300).setVisible(false);
    const card = scene.add.rectangle(0, 0, 520, 280, COLORS.void, 0.96);
    card.setStrokeStyle(2, COLORS.wolfEdge);
    const heading = scene.add.text(0, -88, 'GAME OVER', {
      fontFamily: SCORE_FONT,
      fontSize: '28px',
      color: '#ff3355',
      resolution: 2,
    }).setOrigin(0.5);
    const reason = scene.add.text(0, -40, 'WOLF GOT A SHEEP', {
      fontFamily: SCORE_FONT,
      fontSize: '10px',
      color: '#c8d6cc',
      resolution: 2,
    }).setOrigin(0.5);
    this.overNewBest = scene.add.text(0, -12, 'NEW HIGH SCORE', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);
    this.overScore = scene.add.text(0, 22, '', {
      fontFamily: SCORE_FONT,
      fontSize: '14px',
      color: '#39ff6a',
      resolution: 2,
    }).setOrigin(0.5);
    this.overBest = scene.add.text(0, 48, '', {
      fontFamily: SCORE_FONT,
      fontSize: '10px',
      color: '#c8d6cc',
      resolution: 2,
    }).setOrigin(0.5);
    this.overRestartBtn = scene.add.rectangle(0, 96, 200, 40, 0x1a2a20, 1)
      .setStrokeStyle(2, COLORS.frame)
      .setInteractive({ useHandCursor: true });
    this.overRestartLabel = scene.add.text(0, 96, 'RESTART', {
      fontFamily: SCORE_FONT,
      fontSize: '12px',
      color: '#ffe14a',
      resolution: 2,
    }).setOrigin(0.5);
    this.overRestartBtn.on('pointerover', () => {
      this.overRestartBtn.setFillStyle(0x24352c, 1);
      this.overRestartBtn.setStrokeStyle(2, 0xffe14a);
    });
    this.overRestartBtn.on('pointerout', () => {
      this.overRestartBtn.setFillStyle(0x1a2a20, 1);
      this.overRestartBtn.setStrokeStyle(2, COLORS.frame);
    });
    this.overRestartBtn.on('pointerdown', () => {
      scene.scene.restart();
    });
    this.gameOver.add([
      card, heading, reason, this.overNewBest, this.overScore, this.overBest,
      this.overRestartBtn, this.overRestartLabel,
    ]);
  }

  setPower(power) {
    if (!power) {
      this.powerIcon.setVisible(false);
      this.powerIcon.setFillStyle(COLORS.frame, 0);
      this.powerSlot.setStrokeStyle(2, 0x1a2a20);
      this.powerPanel.setStrokeStyle(2, 0x1a2a20);
      this.powerLabel.setText('POWER');
      this.powerLabel.setColor('#39ff6a');
      this.powerHint.setText('—');
      this.powerHint.setColor('#6a7a70');
      this.drawnPower = null;
      return;
    }
    const charged = !power.empty;
    this.drawnPower = `${power.id}:${charged ? 'on' : 'off'}:${power.hint || ''}`;
    this.powerIcon.setVisible(charged);
    this.powerIcon.setStrokeStyle(2, power.color);
    this.powerIcon.setFillStyle(power.color, charged ? 0.45 : 0);
    this.powerSlot.setStrokeStyle(2, charged ? power.color : 0x1a2a20);
    this.powerPanel.setStrokeStyle(2, charged ? power.color : 0x1a2a20);
    this.powerLabel.setText(power.label);
    this.powerLabel.setColor(charged ? '#39ff6a' : '#6a7a70');
    this.powerHint.setText(power.hint);
    this.powerHint.setColor(charged ? '#ffe14a' : '#6a7a70');
  }

  refresh(state, controller, warningOn = false, audio = null, power = null) {
    const powerKey = power
      ? `${power.id}:${power.empty ? 'off' : 'on'}:${power.hint || ''}`
      : null;
    if (powerKey !== this.drawnPower) {
      this.setPower(power);
    }
    const scoreLabel = `SCORE ${state.score}`;
    const bestLabel = `BEST ${state.best}`;
    const levelLabel = `LV ${state.level}`;
    if (scoreLabel !== this.drawnScore) {
      this.drawnScore = scoreLabel;
      this.scoreLine.setText(scoreLabel);
    }
    if (bestLabel !== this.drawnBest) {
      this.drawnBest = bestLabel;
      this.bestLine.setText(bestLabel);
    }
    if (levelLabel !== this.drawnLevel) {
      this.drawnLevel = levelLabel;
      this.levelLine.setText(levelLabel);
    }

    if (state.over) {
      this.overScore.setText(`${scoreLabel}  ${levelLabel}`);
      this.overBest.setText(state.newBest ? `BEST ${state.score}` : `BEST ${state.best}`);
      this.overNewBest.setVisible(!!state.newBest);
      if (state.newBest) {
        this.overNewBest.setAlpha(0.55 + Math.abs(Math.sin(this.scene.time.now / 160)) * 0.45);
        this.overScore.setColor('#ffe14a');
      } else {
        this.overScore.setColor('#39ff6a');
      }
    }

    if (this.drawnDogIndex !== controller.index) {
      this.drawnDogIndex = controller.index;
      controller.dogs.forEach((entry, index) => {
        const { chip } = this.chips[index];
        const on = entry.active;
        chip.setFillStyle(entry.color, on ? 1 : 0.28);
        chip.setStrokeStyle(on ? 3 : 1, on ? COLORS.outline : 0x1a2a20);
        chip.setScale(on ? 1.08 : 1);
      });
    }

    const paused = state.paused && !state.over;
    this.pauseShade.setVisible(paused);
    this.pausePanel.setVisible(paused);
    this.pauseText.setVisible(paused);
    this.pauseHint.setVisible(paused);
    this.menuMusic.setVisible(paused);
    this.menuSfx.setVisible(paused);
    this.menuRestart.setVisible(paused);
    this.gameOver.setVisible(state.over);

    if (paused && audio) {
      const musicOn = !audio.musicMuted;
      const sfxOn = !audio.sfxMuted;
      const musicLine = `${this.menuIndex === 0 ? '>' : ' '} MUSIC  ${musicOn ? 'ON' : 'OFF'}`;
      const sfxLine = `${this.menuIndex === 1 ? '>' : ' '} SOUND  ${sfxOn ? 'ON' : 'OFF'}`;
      const restartLine = `${this.menuIndex === 2 ? '>' : ' '} RESTART`;
      this.menuMusic.setText(musicLine);
      this.menuSfx.setText(sfxLine);
      this.menuRestart.setText(restartLine);
      this.menuMusic.setColor(this.menuIndex === 0 ? '#ffe14a' : '#39ff6a');
      this.menuSfx.setColor(this.menuIndex === 1 ? '#ffe14a' : '#39ff6a');
      this.menuRestart.setColor(this.menuIndex === 2 ? '#ffe14a' : '#39ff6a');
    }

    this.warning.setVisible(warningOn && !state.over);
    if (warningOn) {
      this.warning.setAlpha(0.45 + Math.abs(Math.sin(this.scene.time.now / 140)) * 0.55);
    }
  }
}
