import Phaser from 'phaser';
import { TILE_SIZE } from '../game/config';

type TilePainter = (graphics: Phaser.GameObjects.Graphics) => void;

const repeat = (count: number, fn: (index: number) => void) => {
  for (let index = 0; index < count; index += 1) {
    fn(index);
  }
};

const addTileTexture = (scene: Phaser.Scene, key: string, painter: TilePainter) => {
  const graphics = scene.add.graphics();
  painter(graphics);
  graphics.generateTexture(key, TILE_SIZE, TILE_SIZE);
  graphics.destroy();
};

const fillTile = (graphics: Phaser.GameObjects.Graphics, color: number) => {
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
};

const drawStoneWallTile = (graphics: Phaser.GameObjects.Graphics) => {
  fillTile(graphics, 0xece8dc);

  graphics.fillStyle(0xcac4b7, 1);
  graphics.fillRect(0, TILE_SIZE - 5, TILE_SIZE, 5);

  const rowHeights = [0, 8, 16, 24];
  rowHeights.forEach((top, rowIndex) => {
    const offset = rowIndex % 2 === 0 ? 0 : 6;
    repeat(4, (column) => {
      const left = offset + column * 8 - (rowIndex % 2 === 0 ? 0 : 2);
      const width = rowIndex % 2 === 0 ? 8 : 10;
      const blockLeft = Math.max(0, left);
      const blockWidth = Math.min(width, TILE_SIZE - blockLeft);
      if (blockWidth <= 0) return;

      graphics.fillStyle(0xf8f5ed, 1);
      graphics.fillRoundedRect(blockLeft + 1, top + 1, blockWidth - 2, 6, 2);
      graphics.lineStyle(1, 0xd1cbbe, 0.95);
      graphics.strokeRoundedRect(blockLeft + 1, top + 1, blockWidth - 2, 6, 2);
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillRect(blockLeft + 2, top + 2, Math.max(1, blockWidth - 5), 1);
    });
  });

  repeat(18, (index) => {
    const x = (index * 7) % TILE_SIZE;
    const y = (index * 11) % TILE_SIZE;
    graphics.fillStyle(0xd8d1c5, 0.35);
    graphics.fillCircle(x + 1, y + 1, 1);
  });
};

const drawGrassTile = (graphics: Phaser.GameObjects.Graphics) => {
  fillTile(graphics, 0x79d65c);
  graphics.fillStyle(0x8ee36e, 1);
  graphics.fillRect(0, 0, TILE_SIZE, 7);
  graphics.fillStyle(0x58a743, 0.85);
  graphics.fillRect(0, TILE_SIZE - 5, TILE_SIZE, 5);

  repeat(26, (index) => {
    const x = (index * 5) % (TILE_SIZE - 2);
    const y = (index * 9) % (TILE_SIZE - 2);
    const color = index % 3 === 0 ? 0x6cc453 : index % 3 === 1 ? 0x95ea72 : 0x4f983b;
    graphics.fillStyle(color, 0.8);
    graphics.fillCircle(x + 1, y + 1, 1);
  });

  repeat(12, (index) => {
    const x = (index * 9 + 3) % (TILE_SIZE - 4);
    const y = (index * 7 + 2) % (TILE_SIZE - 4);
    graphics.lineStyle(1, 0x4f983b, 0.6);
    graphics.lineBetween(x, y + 2, x + 1, y);
  });
};

const drawPathTile = (graphics: Phaser.GameObjects.Graphics) => {
  fillTile(graphics, 0xc69452);
  graphics.fillStyle(0xd9aa65, 1);
  graphics.fillRect(0, 0, TILE_SIZE, 6);
  graphics.fillStyle(0x9c723c, 1);
  graphics.fillRect(0, TILE_SIZE - 5, TILE_SIZE, 5);

  repeat(24, (index) => {
    const x = (index * 11 + 3) % (TILE_SIZE - 4);
    const y = (index * 7 + 5) % (TILE_SIZE - 4);
    const color = index % 2 === 0 ? 0xe1bb80 : 0x8c6738;
    graphics.fillStyle(color, 0.9);
    graphics.fillCircle(x + 2, y + 2, index % 3 === 0 ? 2 : 1);
  });
};

const drawWaterTile = (graphics: Phaser.GameObjects.Graphics) => {
  fillTile(graphics, 0x5b73dd);
  graphics.fillStyle(0x7a8ff0, 1);
  graphics.fillRect(0, 0, TILE_SIZE, 5);
  graphics.fillStyle(0x445cc8, 1);
  graphics.fillRect(0, TILE_SIZE - 4, TILE_SIZE, 4);

  [6, 14, 22, 28].forEach((y, index) => {
    graphics.lineStyle(2, index % 2 === 0 ? 0x8fa2ff : 0x6a82eb, 0.75);
    graphics.beginPath();
    graphics.moveTo(0, y);
    graphics.lineTo(5, y - 1);
    graphics.lineTo(11, y + 1);
    graphics.lineTo(17, y - 1);
    graphics.lineTo(23, y + 1);
    graphics.lineTo(28, y);
    graphics.lineTo(32, y + 1);
    graphics.strokePath();
  });

  repeat(10, (index) => {
    const x = (index * 13 + 4) % (TILE_SIZE - 3);
    const y = (index * 9 + 3) % (TILE_SIZE - 3);
    graphics.fillStyle(0xc7d2ff, 0.35);
    graphics.fillCircle(x + 1, y + 1, 1);
  });
};

const drawShrineTile = (graphics: Phaser.GameObjects.Graphics) => {
  drawStoneWallTile(graphics);
  graphics.fillStyle(0xe2c36d, 1);
  graphics.fillRoundedRect(8, 6, 16, 20, 4);
  graphics.fillStyle(0xb18439, 1);
  graphics.fillRect(8, 22, 16, 4);
  graphics.lineStyle(2, 0x7b5b27, 1);
  graphics.strokeRoundedRect(8, 6, 16, 20, 4);
  graphics.lineStyle(2, 0xfff0b6, 0.95);
  graphics.lineBetween(16, 10, 16, 22);
  graphics.lineBetween(10, 16, 22, 16);
};

const drawMarkerTile = (graphics: Phaser.GameObjects.Graphics) => {
  drawGrassTile(graphics);
  graphics.fillStyle(0xf5ecb3, 0.95);
  graphics.fillRoundedRect(6, 6, 20, 20, 4);
  graphics.lineStyle(1, 0x9a8b47, 1);
  graphics.strokeRoundedRect(6, 6, 20, 20, 4);
  graphics.fillStyle(0x403321, 1);
  graphics.fillCircle(16, 16, 3);
};

const drawConsoleTile = (graphics: Phaser.GameObjects.Graphics) => {
  drawStoneWallTile(graphics);
  graphics.fillStyle(0x8f6b3e, 1);
  graphics.fillRoundedRect(7, 8, 18, 14, 3);
  graphics.fillStyle(0x5d4121, 1);
  graphics.fillRect(9, 20, 14, 4);
  graphics.lineStyle(2, 0xd7b26b, 1);
  graphics.strokeRoundedRect(7, 8, 18, 14, 3);
  graphics.fillStyle(0xf6dc8f, 1);
  graphics.fillRect(11, 11, 10, 5);
  graphics.lineStyle(1, 0x7f5d2c, 1);
  graphics.lineBetween(13, 13, 19, 13);
};

const drawBridgeTile = (graphics: Phaser.GameObjects.Graphics) => {
  fillTile(graphics, 0xc69452);
  [2, 10, 18, 26].forEach((left, index) => {
    graphics.fillStyle(index % 2 === 0 ? 0x8f6232 : 0x7a5228, 1);
    graphics.fillRect(left, 0, 6, TILE_SIZE);
    graphics.lineStyle(1, 0xbf915e, 0.9);
    graphics.lineBetween(left + 1, 3, left + 1, TILE_SIZE - 3);
  });
  graphics.fillStyle(0x5d3d1e, 1);
  graphics.fillCircle(5, 6, 1);
  graphics.fillCircle(13, 22, 1);
  graphics.fillCircle(21, 10, 1);
  graphics.fillCircle(29, 26, 1);
};

const drawCrateTile = (graphics: Phaser.GameObjects.Graphics) => {
  fillTile(graphics, 0x8b6437);
  graphics.fillStyle(0xa97c45, 1);
  graphics.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
  graphics.lineStyle(2, 0x5b3f21, 1);
  graphics.strokeRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
  graphics.lineBetween(2, 2, TILE_SIZE - 2, TILE_SIZE - 2);
  graphics.lineBetween(TILE_SIZE - 2, 2, 2, TILE_SIZE - 2);
  graphics.lineBetween(16, 2, 16, TILE_SIZE - 2);
  graphics.lineBetween(2, 16, TILE_SIZE - 2, 16);
};

const drawFlagTile = (graphics: Phaser.GameObjects.Graphics) => {
  drawGrassTile(graphics);
  graphics.fillStyle(0xd6b04d, 1);
  graphics.fillRoundedRect(12, 23, 8, 5, 2);
  graphics.lineStyle(2, 0x704f24, 1);
  graphics.lineBetween(16, 6, 16, 24);
  graphics.fillStyle(0xd85d48, 1);
  graphics.fillTriangle(17, 7, 27, 11, 17, 15);
  graphics.fillStyle(0xf5e9b0, 1);
  graphics.fillRect(20, 10, 3, 2);
};

const drawDungeonTile = (graphics: Phaser.GameObjects.Graphics) => {
  drawStoneWallTile(graphics);
  graphics.fillStyle(0x6e6bd2, 0.28);
  graphics.fillRoundedRect(7, 5, 18, 22, 5);
  graphics.fillStyle(0x4a468f, 1);
  graphics.fillRoundedRect(9, 7, 14, 18, 4);
  graphics.lineStyle(2, 0xc8c9ff, 0.95);
  graphics.strokeRoundedRect(9, 7, 14, 18, 4);
  graphics.lineStyle(2, 0xf0e8ff, 0.7);
  graphics.beginPath();
  graphics.moveTo(16, 9);
  graphics.lineTo(16, 21);
  graphics.moveTo(12, 13);
  graphics.lineTo(20, 13);
  graphics.moveTo(12, 17);
  graphics.lineTo(20, 17);
  graphics.strokePath();
};

const drawNpcTile = (graphics: Phaser.GameObjects.Graphics) => {
  graphics.fillStyle(0x5f8fb4, 0.22);
  graphics.fillEllipse(16, 24, 18, 8);
  graphics.fillStyle(0x8d452d, 1);
  graphics.fillCircle(16, 14, 8);
  graphics.fillStyle(0xf0c59d, 1);
  graphics.fillCircle(16, 13, 6);
  graphics.fillStyle(0x5f2316, 1);
  graphics.fillRect(10, 8, 12, 3);
  graphics.fillStyle(0xb64239, 1);
  graphics.fillRoundedRect(10, 18, 12, 9, 4);
  graphics.fillStyle(0xf2e6bc, 1);
  graphics.fillCircle(13, 13, 1);
  graphics.fillCircle(19, 13, 1);
};

const drawPlayerTexture = (graphics: Phaser.GameObjects.Graphics) => {
  graphics.fillStyle(0x587bce, 0.25);
  graphics.fillEllipse(16, 24, 18, 8);
  graphics.fillStyle(0x2f2b2a, 1);
  graphics.fillCircle(16, 12, 8);
  graphics.fillStyle(0xf3d2aa, 1);
  graphics.fillCircle(16, 13, 6);
  graphics.fillStyle(0x1f1b1a, 1);
  graphics.fillRect(10, 7, 12, 4);
  graphics.fillStyle(0x2d6f9c, 1);
  graphics.fillRoundedRect(10, 18, 12, 9, 4);
  graphics.fillStyle(0xfaf4dc, 1);
  graphics.fillCircle(13, 13, 1);
  graphics.fillCircle(19, 13, 1);
  graphics.lineStyle(1, 0x1d435f, 1);
  graphics.strokeRoundedRect(10, 18, 12, 9, 4);
};

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    addTileTexture(this, 'tile-grass', drawGrassTile);
    addTileTexture(this, 'tile-path', drawPathTile);
    addTileTexture(this, 'tile-wall', drawStoneWallTile);
    addTileTexture(this, 'tile-water', drawWaterTile);
    addTileTexture(this, 'tile-shrine', drawShrineTile);
    addTileTexture(this, 'tile-marker', drawMarkerTile);
    addTileTexture(this, 'tile-console', drawConsoleTile);
    addTileTexture(this, 'tile-bridge', drawBridgeTile);
    addTileTexture(this, 'tile-crate', drawCrateTile);
    addTileTexture(this, 'tile-flag', drawFlagTile);
    addTileTexture(this, 'tile-dungeon', drawDungeonTile);
    addTileTexture(this, 'tile-npc', drawNpcTile);
    addTileTexture(this, 'player-cursor', drawPlayerTexture);
  }

  create() {
    this.scene.start('title');
  }
}
