export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 34;

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
} as const;

export const createOverworldMap = (): number[][] => {
  const data = Array.from({ length: MAP_HEIGHT }, () => Array(MAP_WIDTH).fill(TILE_IDS.grass));

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      if (x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1) {
        data[y][x] = TILE_IDS.wall;
      }
    }
  }

  for (let x = 2; x < 18; x += 1) {
    data[5][x] = TILE_IDS.path;
    data[6][x] = TILE_IDS.path;
  }

  for (let y = 5; y < 24; y += 1) {
    data[y][8] = TILE_IDS.path;
    data[y][9] = TILE_IDS.path;
  }

  for (let x = 8; x < 48; x += 1) {
    data[22][x] = TILE_IDS.path;
    data[23][x] = TILE_IDS.path;
  }

  for (let x = 20; x < 52; x += 1) {
    data[10][x] = TILE_IDS.water;
    data[11][x] = TILE_IDS.water;
    data[12][x] = TILE_IDS.water;
  }

  for (let y = 10; y < 20; y += 1) {
    data[y][38] = TILE_IDS.water;
  }

  data[6][14] = TILE_IDS.shrine;
  data[18][8] = TILE_IDS.shrine;
  data[22][20] = TILE_IDS.shrine;
  data[22][40] = TILE_IDS.shrine;

  data[13][29] = TILE_IDS.console;
  data[12][29] = TILE_IDS.bridge;

  data[16][45] = TILE_IDS.crate;
  data[16][46] = TILE_IDS.crate;
  data[17][45] = TILE_IDS.crate;

  for (const x of [13, 18, 24, 30, 36, 43]) {
    data[22][x] = TILE_IDS.marker;
  }

  return data;
};

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
