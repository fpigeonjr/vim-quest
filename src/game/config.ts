import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { TitleScene } from '../scenes/TitleScene';
import { WorldScene } from '../scenes/WorldScene';
import { UIScene } from '../scenes/UIScene';
import { DungeonScene } from '../scenes/DungeonScene';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 32;

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#4f6eda',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, UIScene, DungeonScene],
};
