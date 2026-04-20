import Phaser from 'phaser';
import './styles.css';
import { gameConfig } from './game/config';

const game = new Phaser.Game(gameConfig);

// Expose for dev tooling and automated tests only
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = game;
}
