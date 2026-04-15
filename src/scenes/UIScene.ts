import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { GameState, REGISTRY_KEYS } from '../game/state';

export class UIScene extends Phaser.Scene {
  private modeText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private commandsText!: Phaser.GameObjects.Text;
  private commandBox!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('ui');
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    // Top info panel
    this.add.rectangle(12, 12, GAME_WIDTH - 24, 140, 0x06100f, 0.85)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a5a40, 1);

    // Mode and area
    this.modeText = this.add.text(28, 24, '', this.textStyle('#f1fa8c', 20, 'bold'));
    this.areaText = this.add.text(240, 24, '', this.textStyle('#8ecae6', 18));

    // Commands section with background
    this.commandBox = this.add.rectangle(24, 58, GAME_WIDTH - 48, 36, 0x1a2f23, 0.8)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x5a8a5a, 0.6);

    this.add.text(32, 64, 'COMMANDS', this.textStyle('#7cb48a', 12));
    this.commandsText = this.add.text(120, 64, '', this.textStyle('#e9f5db', 16, 'bold'));

    // Hint section
    this.add.text(32, 104, 'HINT', this.textStyle('#7cb48a', 12));
    this.hintText = this.add.text(80, 100, '', this.textStyle('#c8f7dc', 15))
      .setWordWrapWidth(GAME_WIDTH - 120);

    this.registry.events.on('changedata', this.refresh, this);
    this.refresh();
  }

  shutdown() {
    this.registry.events.off('changedata', this.refresh, this);
  }

  private refresh() {
    const state = this.registry.get(REGISTRY_KEYS.state) as GameState;
    if (!state) {
      return;
    }

    this.modeText.setText(`[${state.mode.toUpperCase()}]`);
    this.areaText.setText(`${state.areaName}`);

    // Format commands nicely
    const commands = state.unlockedCommands.join('  ');
    this.commandsText.setText(commands);

    this.hintText.setText(state.hint);
  }

  private textStyle(
    color: string,
    fontSize: number,
    fontStyle: string = 'normal'
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Courier New, monospace',
      fontSize: `${fontSize}px`,
      color,
      fontStyle: fontStyle as 'normal' | 'bold' | 'italic',
    };
  }
}
