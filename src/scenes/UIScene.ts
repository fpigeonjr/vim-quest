import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';
import { COMMAND_REGISTRY, GameState, REGISTRY_KEYS } from '../game/state';

export class UIScene extends Phaser.Scene {
  private modeText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private commandsContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('ui');
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    // Top info panel background
    this.add
      .rectangle(12, 12, GAME_WIDTH - 24, 150, 0x06100f, 0.88)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x3a5a40, 1);

    // Mode + Area row
    this.modeText = this.add.text(28, 24, '', this.style('#f1fa8c', 20, 'bold'));
    this.areaText = this.add.text(240, 24, '', this.style('#8ecae6', 18));

    // Commands label
    this.add.text(32, 58, 'COMMANDS', this.style('#7cb48a', 11));

    // Commands row — rendered dynamically in refresh()
    this.commandsContainer = this.add.container(120, 54);

    // Hint row
    this.add.text(32, 110, 'HINT', this.style('#7cb48a', 11));
    this.hintText = this.add
      .text(80, 107, '', this.style('#c8f7dc', 14))
      .setWordWrapWidth(GAME_WIDTH - 120);

    // Legend: locked indicator
    this.add
      .text(GAME_WIDTH - 20, 58, '■ locked  ■ unlocked', this.style('#556b55', 10))
      .setOrigin(1, 0);

    this.registry.events.on('changedata', this.refresh, this);
    this.refresh();
  }

  shutdown() {
    this.registry.events.off('changedata', this.refresh, this);
  }

  private refresh() {
    const state = this.registry.get(REGISTRY_KEYS.state) as GameState;
    if (!state) return;

    this.modeText.setText(`[${state.mode.toUpperCase()}]`);
    this.areaText.setText(state.areaName);
    this.hintText.setText(state.hint);

    // Rebuild command chips
    this.commandsContainer.removeAll(true);

    const unlocked = new Set(state.unlockedCommands);
    // Show only tier 1–4 commands in the HUD (first 13)
    const toShow = COMMAND_REGISTRY.slice(0, 13);

    let offsetX = 0;
    for (const def of toShow) {
      const isUnlocked = unlocked.has(def.key);
      const bgColor = isUnlocked ? 0x1a3a1a : 0x1a1a1a;
      const textColor = isUnlocked ? '#7aff7a' : '#444444';
      const borderColor = isUnlocked ? 0x3a8a3a : 0x333333;

      const chipW = def.key.length <= 1 ? 28 : 36;
      const chipH = 22;

      const bg = this.add.rectangle(offsetX + chipW / 2, chipH / 2, chipW, chipH, bgColor, 1)
        .setStrokeStyle(1, borderColor, 1);
      this.commandsContainer.add(bg);

      const label = this.add.text(offsetX + chipW / 2, chipH / 2, def.key, {
        fontFamily: 'Courier New',
        fontSize: '13px',
        color: textColor,
        fontStyle: isUnlocked ? 'bold' : 'normal',
      }).setOrigin(0.5);
      this.commandsContainer.add(label);

      offsetX += chipW + 4;
    }
  }

  private style(
    color: string,
    size: number,
    fontStyle: string = 'normal',
  ): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Courier New, monospace',
      fontSize: `${size}px`,
      color,
      fontStyle: fontStyle as 'normal' | 'bold',
    };
  }
}
