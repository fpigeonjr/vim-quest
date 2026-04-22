import Phaser from 'phaser';
import { GAME_WIDTH } from '../game/config';
import { audioManager } from '../game/audio';
import { COMMAND_REGISTRY, GameState, REGISTRY_KEYS, saveState } from '../game/state';

export class UIScene extends Phaser.Scene {
  private modeText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private commandsContainer!: Phaser.GameObjects.Container;
  private audioText!: Phaser.GameObjects.Text;
  private readonly onMuteKey = () => this.toggleMute();

  constructor() {
    super('ui');
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    this.add
      .rectangle(12, 12, GAME_WIDTH - 24, 146, 0xf4efe2, 0.92)
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xd2c8b1, 1);

    this.modeText = this.add.text(28, 24, '', this.style('#6b5338', 20, 'bold'));
    this.areaText = this.add.text(238, 24, '', this.style('#53607f', 18, 'bold', 'Palatino Linotype'));

    this.add.text(32, 58, 'COMMANDS', this.style('#8b7354', 11, 'bold'));
    this.commandsContainer = this.add.container(120, 54);

    this.add.text(32, 108, 'HINT', this.style('#8b7354', 11, 'bold'));
    this.hintText = this.add.text(78, 105, '', this.style('#56493a', 14)).setWordWrapWidth(GAME_WIDTH - 120);

    this.add.text(GAME_WIDTH - 20, 58, '■ locked  ■ unlocked', this.style('#907f68', 10)).setOrigin(1, 0);

    this.audioText = this.add.text(GAME_WIDTH - 20, 24, '', this.style('#6b7b82', 12, 'bold')).setOrigin(1, 0);

    this.input.keyboard?.on('keydown-M', this.onMuteKey);

    this.registry.events.on('changedata', this.refresh, this);
    this.refresh();
  }

  shutdown() {
    this.registry.events.off('changedata', this.refresh, this);
    this.input.keyboard?.off('keydown-M', this.onMuteKey);
  }

  private refresh() {
    const state = this.registry.get(REGISTRY_KEYS.state) as GameState;
    if (!state) return;

    this.modeText.setText(`[${state.mode.toUpperCase()}]`);
    this.areaText.setText(state.areaName);
    this.hintText.setText(state.hint);
    this.audioText.setText(state.audioMuted ? '[M] Audio Off' : '[M] Audio On');

    // Rebuild command chips
    this.commandsContainer.removeAll(true);

    const unlocked = new Set(state.unlockedCommands);
    // Show only tier 1–4 commands in the HUD (first 13)
    const toShow = COMMAND_REGISTRY.slice(0, 13);

    let offsetX = 0;
    for (const def of toShow) {
      const isUnlocked = unlocked.has(def.key);
      const bgColor = isUnlocked ? 0xddc77f : 0xd7d0c1;
      const textColor = isUnlocked ? '#5d4326' : '#9b9387';
      const borderColor = isUnlocked ? 0x9e7b3b : 0xb0a792;

      const chipW = def.key.length <= 1 ? 28 : 36;
      const chipH = 22;

      const bg = this.add
        .rectangle(offsetX + chipW / 2, chipH / 2, chipW, chipH, bgColor, 1)
        .setStrokeStyle(1, borderColor, 1);
      this.commandsContainer.add(bg);

      const label = this.add
        .text(offsetX + chipW / 2, chipH / 2, def.key, {
          fontFamily: 'Courier New',
          fontSize: '13px',
          color: textColor,
          fontStyle: isUnlocked ? 'bold' : 'normal',
        })
        .setOrigin(0.5);
      this.commandsContainer.add(label);

      offsetX += chipW + 4;
    }
  }

  private style(
    color: string,
    size: number,
    fontStyle: string = 'normal',
    fontFamily = 'Courier New',
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: `${fontFamily}, serif`,
      fontSize: `${size}px`,
      color,
      fontStyle: fontStyle as 'normal' | 'bold',
    };
  }

  private toggleMute() {
    const state = this.registry.get(REGISTRY_KEYS.state) as GameState;
    if (!state) return;

    const nextState = { ...state, audioMuted: !state.audioMuted };
    this.registry.set(REGISTRY_KEYS.state, nextState);
    saveState(nextState);
    audioManager.setMuted(nextState.audioMuted);

    if (!nextState.audioMuted) {
      void audioManager.resume(this);
      audioManager.playSfx(this, 'dialogueOpen');
      audioManager.startOverworldLoop(this);
    }
  }
}
