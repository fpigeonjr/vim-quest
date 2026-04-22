import Phaser from 'phaser';
import { audioManager } from '../game/audio';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../game/config';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#4f6eda');
    this.buildBackdrop();
    this.buildTitlePlaza();
    this.buildText();

    // Focus the game canvas to ensure keyboard input works
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.style.outline = 'none';
      canvas.focus();
    }

    // Ensure keyboard input is enabled
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
        if (!event.metaKey && !event.ctrlKey && !event.altKey) {
          event.preventDefault();
        }
        if (event.key === 'Enter' || event.key === ' ' || event.code === 'Enter' || event.code === 'Space') {
          this.startGame();
        }
      });
    }

    // Also add pointer/touch input as fallback
    this.input.once('pointerdown', () => this.startGame());
  }

  private startGame() {
    void audioManager.resume(this);
    this.scene.start('world');
    this.scene.launch('ui');
  }

  private buildBackdrop() {
    const cols = Math.ceil(GAME_WIDTH / TILE_SIZE);
    const rows = Math.ceil(GAME_HEIGHT / TILE_SIZE);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'tile-water');
      }
    }

    for (let y = 4; y < rows - 4; y += 1) {
      for (let x = 4; x < cols - 4; x += 1) {
        const texture = y < 8 || y > rows - 9 || x < 7 || x > cols - 8 ? 'tile-grass' : 'tile-path';
        this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, texture);
      }
    }

    for (let y = 6; y < 16; y += 1) {
      for (let x = 10; x < 30; x += 1) {
        this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 'tile-wall');
      }
    }
  }

  private buildTitlePlaza() {
    const decorations = [
      { x: 8, y: 7, key: 'tile-shrine' },
      { x: 31, y: 7, key: 'tile-dungeon' },
      { x: 9, y: 14, key: 'tile-npc' },
      { x: 30, y: 14, key: 'player-cursor' },
      { x: 12, y: 17, key: 'tile-marker' },
      { x: 27, y: 17, key: 'tile-flag' },
    ];

    decorations.forEach(({ x, y, key }) => {
      this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, key).setDepth(2);
    });

    this.add.rectangle(GAME_WIDTH / 2, 150, 520, 92, 0x5d79d8, 0.95)
      .setStrokeStyle(5, 0xe8eefc, 0.9)
      .setDepth(3);

    this.add.rectangle(GAME_WIDTH / 2, 458, 760, 132, 0xf4efe2, 0.94)
      .setStrokeStyle(5, 0xd2c8b1, 1)
      .setDepth(3);
  }

  private buildText() {
    this.add
      .text(GAME_WIDTH / 2, 149, 'VIM QUEST', {
        fontFamily: 'Palatino Linotype',
        fontSize: '50px',
        color: '#fff7df',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.add
      .text(GAME_WIDTH / 2, 260, 'A tiny overworld where Vim commands become movement powers.', {
        fontFamily: 'Palatino Linotype',
        fontSize: '26px',
        color: '#f7f0dc',
        stroke: '#5c6cad',
        strokeThickness: 4,
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.add
      .text(
        GAME_WIDTH / 2,
        430,
        'Move with h j k l\nUnlock shrines for w b, 0 $, x, and i\nPress Enter, Space, or click to begin',
        {
          fontFamily: 'Courier New',
          fontSize: '18px',
          color: '#554535',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)
      .setDepth(4);
  }
}
