import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/config';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    this.cameras.main.setBackgroundColor('#081312');

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'VIM QUEST', {
        fontFamily: 'Courier New',
        fontSize: '48px',
        color: '#f1fa8c',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 16, 'Wave 1: Phaser overworld prototype', {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#c8f7dc',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 72,
        'Move with h j k l\nUnlock shrines for w b, 0 $, x, and i\nPress Enter or Space to begin (or click/tap)',
        {
          fontFamily: 'Courier New',
          fontSize: '18px',
          color: '#8ecae6',
          align: 'center',
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

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
        if (event.key === 'Enter' || event.key === ' ' || event.code === 'Enter' || event.code === 'Space') {
          this.startGame();
        }
      });
    }

    // Also add pointer/touch input as fallback
    this.input.once('pointerdown', () => this.startGame());
  }

  private startGame() {
    this.scene.start('world');
    this.scene.launch('ui');
  }
}
