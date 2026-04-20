import Phaser from 'phaser';
import { TILE_SIZE } from '../game/config';

// Tile IDs (0-indexed in the tileset)
export const TILE_IDS = {
  grass: 0,
  path: 1,
  wall: 2,
  water: 3,
  shrine: 4,
  marker: 5,
  console: 6,
  bridge: 7,
  crate: 8,
  flag: 9,
  dungeon: 10, // dungeon entrance portal
  npc: 11,     // NPC mentor tile (visual only — not blocked)
} as const;

export type TileId = (typeof TILE_IDS)[keyof typeof TILE_IDS];

// Map tile IDs to texture keys for dynamically generated textures
export const tileTextureMap: Record<number, string> = {
  [TILE_IDS.grass]: 'tile-grass',
  [TILE_IDS.path]: 'tile-path',
  [TILE_IDS.wall]: 'tile-wall',
  [TILE_IDS.water]: 'tile-water',
  [TILE_IDS.shrine]: 'tile-shrine',
  [TILE_IDS.marker]: 'tile-marker',
  [TILE_IDS.console]: 'tile-console',
  [TILE_IDS.bridge]: 'tile-bridge',
  [TILE_IDS.crate]: 'tile-crate',
  [TILE_IDS.flag]: 'tile-flag',
  [TILE_IDS.dungeon]: 'tile-dungeon',
  [TILE_IDS.npc]: 'tile-npc',
};

// Tiles that block player movement
export const BLOCKED_TILES = new Set<number>([
  TILE_IDS.wall,
  TILE_IDS.water,
  TILE_IDS.crate,
]);

// Shrine locations from the original overworld.ts
export const SHRINES = [
  {
    x: 14,
    y: 6,
    unlock: ['w', 'b'],
    title: 'Word Shrine',
    hint: 'Unlocked w and b. Use them on the marker road in the south corridor.',
  },
  {
    x: 8,
    y: 18,
    unlock: ['0', '$'],
    title: 'Line Shrine',
    hint: 'Unlocked 0 and $. Snap to the start or end of the marker road.',
  },
  {
    x: 20,
    y: 22,
    unlock: ['x'],
    title: 'Operator Shrine',
    hint: 'Unlocked x. Break nearby crates to open paths.',
  },
  {
    x: 40,
    y: 22,
    unlock: [],
    title: 'Wave 1 Gate',
    hint: 'You reached the Wave 1 goal. Next up: dungeon flow and scripted lessons.',
  },
] as const;

export const MARKER_ROW_Y = 22;
export const MARKER_POINTS = [13, 18, 24, 30, 36, 43];
export const CONSOLE_POSITION = { x: 29, y: 13 };

// Dungeon entrance — placed on the northern path near the spawn
export const DUNGEON_ENTRANCE_POSITION = { x: 4, y: 4 };

// NPC Mentor — stands near spawn on the path, 1 tile east of player start
export const NPC_MENTOR_POSITION = { x: 6, y: 6 };

// The gate shrine tile and the full vertical wall that physically blocks
// passage east of x=41 until all crates are destroyed.
// The wall runs the full height of the playable area (rows 13–32) at col 41
// so the player cannot walk around it through the open grass.
export const GATE_SHRINE = { x: 40, y: 22 };
export const GATE_WALL_COL = 41;
export const GATE_WALL_ROW_START = 13;
export const GATE_WALL_ROW_END   = 32; // exclusive — rows 13..31
export const GATE_WALL_TILES = Array.from(
  { length: GATE_WALL_ROW_END - GATE_WALL_ROW_START },
  (_, i) => ({ x: GATE_WALL_COL, y: GATE_WALL_ROW_START + i }),
);

// Level 1 completion flag — placed north of the river, above the bridge.
// Accessible only after the bridge is built (cols 28-30, river rows 10-12).
// A wall enclosure forces the player to approach from the south via the bridge.
export const FLAG_POSITION = { x: 29, y: 6 };

// Enclosure walls surrounding the flag: a 5-wide x 5-tall box (cols 27-31,
// rows 4-8) with a 3-tile entrance at the bottom (cols 28-30, row 8) matching
// the bridge width so the player can walk straight in from the bridge.
export const FLAG_ENCLOSURE_WALLS = [
  // Top row: cols 27-31, row 4
  { x: 27, y: 4 }, { x: 28, y: 4 }, { x: 29, y: 4 }, { x: 30, y: 4 }, { x: 31, y: 4 },
  // Left col: col 27, rows 5-8
  { x: 27, y: 5 }, { x: 27, y: 6 }, { x: 27, y: 7 }, { x: 27, y: 8 },
  // Right col: col 31, rows 5-8
  { x: 31, y: 5 }, { x: 31, y: 6 }, { x: 31, y: 7 }, { x: 31, y: 8 },
  // Bottom row corners only — cols 28-30 left open (3-tile entrance matches bridge)
];

export interface TilemapData {
  width: number;
  height: number;
  mapData: number[][];
  blockedTiles: Array<{ x: number; y: number; tileId: number }>;
  tileImages: Map<string, Phaser.GameObjects.Image>;
  colliders: Map<string, Phaser.GameObjects.Rectangle>;
  physicsColliders: Map<string, Phaser.Physics.Arcade.Collider>;
  scene: Phaser.Scene;
  player: Phaser.Physics.Arcade.Sprite | null;
}

/**
 * Creates the overworld map using individual tile images
 * This is simpler than using Phaser's tilemap system and works better with generated textures
 */
export function createOverworldTilemap(scene: Phaser.Scene): TilemapData {
  // Map dimensions
  const width = 60;
  const height = 34;

  // Build the map data
  const mapData = generateOverworldData(width, height);

  // Track blocked tiles for collision setup later
  const blockedTiles: Array<{ x: number; y: number; tileId: number }> = [];

  // Track tile images for later modification
  const tileImages = new Map<string, Phaser.GameObjects.Image>();

  // Track collision bodies
  const colliders = new Map<string, Phaser.GameObjects.Rectangle>();

  // Populate tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileId = mapData[y][x];

      // Create an image for this tile
      const textureKey = tileTextureMap[tileId];
      if (textureKey) {
        const image = scene.add.image(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          textureKey
        );
        image.setDepth(0);
        tileImages.set(`${x},${y}`, image);

        // Track blocked tiles
        if (BLOCKED_TILES.has(tileId)) {
          blockedTiles.push({ x, y, tileId });
        }
      }
    }
  }

  return { width, height, mapData, blockedTiles, tileImages, colliders, physicsColliders: new Map(), scene, player: null };
}

/**
 * Create collision objects for blocked tiles
 * Call this from the scene's create method after physics is ready
 */
export function createTileCollisions(
  scene: Phaser.Scene,
  tilemapData: TilemapData,
  player: Phaser.Physics.Arcade.Sprite,
): void {
  const { blockedTiles, colliders, physicsColliders } = tilemapData;

  // Store player reference for later collision updates
  tilemapData.player = player;

  // Create static physics bodies for each blocked tile
  blockedTiles.forEach(({ x, y }) => {
    const collider = scene.add.rectangle(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE
    );
    scene.physics.add.existing(collider, true);
    const physicsCollider = scene.physics.add.collider(player, collider);
    colliders.set(`${x},${y}`, collider);
    physicsColliders.set(`${x},${y}`, physicsCollider);
  });
}

/**
 * Generate overworld map data (ported from original overworld.ts)
 */
function generateOverworldData(width: number, height: number): number[][] {
  const data = Array.from({ length: height }, () => Array(width).fill(TILE_IDS.grass));

  // Outer walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        data[y][x] = TILE_IDS.wall;
      }
    }
  }

  // Northern path area
  for (let x = 2; x < 18; x++) {
    data[5][x] = TILE_IDS.path;
    data[6][x] = TILE_IDS.path;
  }

  // Vertical path
  for (let y = 5; y < 24; y++) {
    data[y][8] = TILE_IDS.path;
    data[y][9] = TILE_IDS.path;
  }

  // Southern corridor
  for (let x = 8; x < 48; x++) {
    data[22][x] = TILE_IDS.path;
    data[23][x] = TILE_IDS.path;
  }

  // River/water
  for (let x = 20; x < 52; x++) {
    data[10][x] = TILE_IDS.water;
    data[11][x] = TILE_IDS.water;
    data[12][x] = TILE_IDS.water;
  }

  // River extension
  for (let y = 10; y < 20; y++) {
    data[y][38] = TILE_IDS.water;
  }

  // Shrines
  data[6][14] = TILE_IDS.shrine;
  data[18][8] = TILE_IDS.shrine;
  data[22][20] = TILE_IDS.shrine;
  data[22][40] = TILE_IDS.shrine;

  // Console (bridge tiles are added dynamically when activated)
  data[13][29] = TILE_IDS.console;

  // Crates
  data[16][45] = TILE_IDS.crate;
  data[16][46] = TILE_IDS.crate;
  data[17][45] = TILE_IDS.crate;

  // Markers on the southern road
  for (const x of MARKER_POINTS) {
    data[22][x] = TILE_IDS.marker;
  }

  // Gate walls — full vertical wall at col 41 from below the river to just
  // above the outer wall, so the player cannot walk around it through grass.
  // Removed dynamically by WorldScene when gateUnlocked becomes true.
  for (let y = GATE_WALL_ROW_START; y < GATE_WALL_ROW_END; y++) {
    data[y][GATE_WALL_COL] = TILE_IDS.wall;
  }

  // Level 1 flag — north of the river, above the bridge entrance.
  // Only reachable after the bridge (cols 28-30) is built with i.
  data[FLAG_POSITION.y][FLAG_POSITION.x] = TILE_IDS.flag;

  // Wall enclosure around the flag — forces bridge approach from the south.
  for (const { x, y } of FLAG_ENCLOSURE_WALLS) {
    data[y][x] = TILE_IDS.wall;
  }

  // Dungeon entrance portal — on the open grass north of spawn
  data[DUNGEON_ENTRANCE_POSITION.y][DUNGEON_ENTRANCE_POSITION.x] = TILE_IDS.dungeon;

  return data;
}

/**
 * Get tile ID at world coordinates
 */
export function getTileAt(
  tilemapData: TilemapData,
  worldX: number,
  worldY: number,
): { x: number; y: number; id: number } {
  const x = Phaser.Math.Clamp(Math.floor(worldX / TILE_SIZE), 0, tilemapData.width - 1);
  const y = Phaser.Math.Clamp(Math.floor(worldY / TILE_SIZE), 0, tilemapData.height - 1);

  const id = tilemapData.mapData[y]?.[x] ?? TILE_IDS.grass;

  return { x, y, id };
}

/**
 * Change a tile at specific coordinates
 * This updates both the visual representation and removes collision if needed
 */
export function setTileAt(
  tilemapData: TilemapData,
  x: number,
  y: number,
  tileId: number,
): void {
  const { mapData, tileImages, colliders, physicsColliders, scene, player } = tilemapData;

  // Update the map data
  if (y >= 0 && y < mapData.length && x >= 0 && x < mapData[0].length) {
    mapData[y][x] = tileId;
  }

  // Update the visual image
  const image = tileImages.get(`${x},${y}`);
  if (image) {
    const newTexture = tileTextureMap[tileId];
    if (newTexture) {
      image.setTexture(newTexture);
    }
  }

  // If the new tile is NOT a blocked tile but there was a collider, remove both
  // the physics body rectangle AND the Phaser collider handle
  const colliderKey = `${x},${y}`;
  const existingCollider = colliders.get(colliderKey);
  if (existingCollider && !BLOCKED_TILES.has(tileId)) {
    // Destroy the Phaser collider (stops collision detection)
    const physicsCollider = physicsColliders.get(colliderKey);
    if (physicsCollider) {
      physicsCollider.destroy();
      physicsColliders.delete(colliderKey);
    }
    // Destroy the physics body rectangle
    existingCollider.destroy();
    colliders.delete(colliderKey);
  }
}
