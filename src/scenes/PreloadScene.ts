import Phaser from 'phaser';
import { TILE_SIZE } from '../game/config';

const makeTileTexture = (
  scene: Phaser.Scene,
  key: string,
  color: number,
  border = 0x000000,
) => {
  const graphics = scene.add.graphics();
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  graphics.lineStyle(2, border, 0.25);
  graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
  graphics.generateTexture(key, TILE_SIZE, TILE_SIZE);
  graphics.destroy();
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    makeTileTexture(this, 'tile-grass', 0x6b8f4e, 0x26451f);
    makeTileTexture(this, 'tile-path', 0xb59b67, 0x6f5733);
    makeTileTexture(this, 'tile-wall', 0x3d4854, 0x1b242d);
    makeTileTexture(this, 'tile-water', 0x2d7dd2, 0x113f71);
    makeTileTexture(this, 'tile-shrine', 0xd4a373, 0x6e4f2f);
    makeTileTexture(this, 'tile-marker', 0xffcc00, 0x7f5800);
    makeTileTexture(this, 'tile-console', 0xc77dff, 0x5a189a);
    makeTileTexture(this, 'tile-bridge', 0x8d6e63, 0x5d4037);
    makeTileTexture(this, 'tile-crate', 0xe76f51, 0x78290f);

    const player = this.add.graphics();
    player.fillStyle(0xf1fa8c, 1);
    player.fillRoundedRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8, 8);
    player.lineStyle(2, 0x264653, 1);
    player.strokeRoundedRect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8, 8);
    player.generateTexture('player-cursor', TILE_SIZE, TILE_SIZE);
    player.destroy();
  }

  create() {
    this.scene.start('title');
  }
}
