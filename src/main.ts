import Phaser from 'phaser';
import './styles.css';
import { gameConfig, TILE_SIZE } from './game/config';

const game = new Phaser.Game(gameConfig);

// Expose for dev tooling and automated tests only
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__game = game;
  (window as unknown as Record<string, unknown>).__vqDebug = {
    moveToTile(sceneKey: string, x: number, y: number) {
      const scene = game.scene.getScene(sceneKey) as Phaser.Scene | undefined;
      const player = (scene as unknown as { player?: Phaser.Physics.Arcade.Sprite })?.player;
      if (!scene || !player) return false;

      if (sceneKey === 'dungeon') {
        const width = 1280;
        const height = 720;
        const cols = 25;
        const rows = 20;
        const offsetX = (width - cols * TILE_SIZE) / 2;
        const offsetY = (height - rows * TILE_SIZE) / 2 + 20;
        player.setPosition(offsetX + x * TILE_SIZE + TILE_SIZE / 2, offsetY + y * TILE_SIZE + TILE_SIZE / 2);
      } else {
        player.setPosition(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
      }

      player.setVelocity(0, 0);
      return true;
    },
  };
}
