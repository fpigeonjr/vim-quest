import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../game/config';
import { GameState, REGISTRY_KEYS, saveState } from '../game/state';
import { ZONE2_WORD_WOODS_LAYOUT } from '../content/zone2WordWoods';
import { isSlashModalOpen, registerGlobalSlashPrompt } from '../systems/slashCommands';
import { TILE_IDS, tileTextureMap } from '../systems/tilemap';

type Zone2Tile = (typeof TILE_IDS)[keyof typeof TILE_IDS];

const MAP_BG = '#3e5f3f';

export class Zone2Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: { [key: string]: Phaser.Input.Keyboard.Key };
  private colliderGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('zone2');
  }

  create() {
    this.cameras.main.setBackgroundColor(MAP_BG);
    this.buildZone2Map();
    this.createPlayer();
    this.createInput();
    this.addRegionLabels();
    this.addHudBanner();

    this.syncState({
      mode: 'normal',
      areaName: 'Word Woods',
      hint: 'Zone 2 preview active. Move with h j k l. Press / and run /level-1 to return.',
    });
  }

  update() {
    if (isSlashModalOpen(this)) {
      this.player.setVelocity(0, 0);
      return;
    }
    this.handleMovement();
  }

  private buildZone2Map() {
    const {
      mapSize: { width, height },
      regions,
      collisionFeatures,
      arrivalCheckpoint,
      arrivalHintObelisk,
    } = ZONE2_WORD_WOODS_LAYOUT;

    const mapData: Zone2Tile[][] = Array.from({ length: height }, () => Array(width).fill(TILE_IDS.grass));

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          mapData[y][x] = TILE_IDS.wall;
        }
      }
    }

    for (const region of regions) {
      const { xMin, xMax, yMin, yMax } = region.bounds;
      for (let y = yMin; y <= yMax; y += 1) {
        for (let x = xMin; x <= xMax; x += 1) {
          mapData[y][x] = TILE_IDS.path;
        }
      }
    }

    for (const feature of collisionFeatures) {
      for (const tile of feature.tiles) {
        if (feature.kind === 'resetRail') {
          mapData[tile.y][tile.x] = TILE_IDS.bridge;
        } else {
          mapData[tile.y][tile.x] = TILE_IDS.marker;
        }
      }
    }

    mapData[arrivalCheckpoint.tile.y][arrivalCheckpoint.tile.x] = TILE_IDS.marker;
    mapData[arrivalHintObelisk.tile.y][arrivalHintObelisk.tile.x] = TILE_IDS.shrine;

    this.colliderGroup = this.physics.add.staticGroup();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const id = mapData[y][x];
        const texture = tileTextureMap[id] ?? tileTextureMap[TILE_IDS.grass];
        const wx = x * TILE_SIZE + TILE_SIZE / 2;
        const wy = y * TILE_SIZE + TILE_SIZE / 2;

        this.add.image(wx, wy, texture).setDepth(0);

        if (id === TILE_IDS.wall) {
          const body = this.colliderGroup.create(wx, wy, texture) as Phaser.Physics.Arcade.Sprite;
          body.setVisible(false);
          body.setActive(true);
          body.refreshBody();
        }
      }
    }

    this.physics.world.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
  }

  private createPlayer() {
    const { entryTile } = ZONE2_WORD_WOODS_LAYOUT;
    const x = entryTile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = entryTile.y * TILE_SIZE + TILE_SIZE / 2;

    this.player = this.physics.add.sprite(x, y, 'player-cursor');
    this.player.setDepth(10);
    this.player.setDrag(1200, 1200);
    this.player.setMaxVelocity(220, 220);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.colliderGroup);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.2);
  }

  private createInput() {
    this.cursors = this.input.keyboard!.addKeys({
      h: Phaser.Input.Keyboard.KeyCodes.H,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
      }
      if (isSlashModalOpen(this)) return;
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      if (isSlashModalOpen(this)) return;
      this.syncState({
        mode: 'normal',
        areaName: 'Cursor Meadow',
        hint: 'Exited Zone 2 preview. Back in Cursor Meadow.',
      });
      this.scene.start('world');
    });

    registerGlobalSlashPrompt(this);
  }

  private handleMovement() {
    const speed = 180;
    let vx = 0;
    let vy = 0;

    if (this.cursors.h?.isDown) vx = -speed;
    else if (this.cursors.l?.isDown) vx = speed;

    if (this.cursors.k?.isDown) vy = -speed;
    else if (this.cursors.j?.isDown) vy = speed;

    this.player.setVelocity(vx, vy);
  }

  private addRegionLabels() {
    for (const region of ZONE2_WORD_WOODS_LAYOUT.regions) {
      const centerX = ((region.bounds.xMin + region.bounds.xMax + 1) / 2) * TILE_SIZE;
      const centerY = ((region.bounds.yMin + region.bounds.yMax + 1) / 2) * TILE_SIZE;

      this.add
        .text(centerX, centerY, `${region.id}: ${region.name}`, {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f6f4de',
          backgroundColor: '#2e3f31',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(20);
    }
  }

  private addHudBanner() {
    this.add
      .rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH - 20, 36, 0x243826, 0.92)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(40)
      .setStrokeStyle(2, 0x648061, 1);

    this.add
      .text(
        GAME_WIDTH / 2,
        8,
        'Word Woods (Zone 2) Preview  ·  Move: h j k l  ·  Slash commands: /level-1, /level-2, /dungeon',
        {
          fontFamily: 'Courier New',
          fontSize: '13px',
          color: '#f0ead2',
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(41);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 20,
        `Arrival checkpoint @ (${ZONE2_WORD_WOODS_LAYOUT.arrivalCheckpoint.tile.x}, ${ZONE2_WORD_WOODS_LAYOUT.arrivalCheckpoint.tile.y})`,
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#d5dfc1',
          backgroundColor: '#243826',
          padding: { x: 5, y: 2 },
        },
      )
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(41);
  }

  private getState(): GameState {
    return this.registry.get(REGISTRY_KEYS.state) as GameState;
  }

  private syncState(patch: Partial<GameState>) {
    const nextState = { ...this.getState(), ...patch };
    this.registry.set(REGISTRY_KEYS.state, nextState);
    saveState(nextState);
  }
}
