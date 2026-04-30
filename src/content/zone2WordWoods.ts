export type Zone2RegionId = 'A' | 'B' | 'C1' | 'C2' | 'D' | 'E' | 'FG';
export type Zone2NodeId = Zone2RegionId | 'HUB';

export interface TilePoint {
  x: number;
  y: number;
}

export interface TileBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Zone2Region {
  id: Zone2RegionId;
  name: string;
  bounds: TileBounds;
  teachingBeat: string;
  gatingRule: string;
}

export interface Zone2TransitionLink {
  id: string;
  from: Zone2NodeId;
  to: Zone2NodeId;
  progression: 'forward' | 'backtrack' | 'shortcut';
  requirement: string;
}

export interface Zone2CollisionFeature {
  id: string;
  regionId: Zone2RegionId;
  kind: 'wall' | 'deadBranch' | 'overshootLoop' | 'resetRail';
  tiles: ReadonlyArray<TilePoint>;
  note: string;
}

export interface Zone2Checkpoint {
  id: string;
  regionId: Zone2RegionId;
  tile: TilePoint;
  respawnTile: TilePoint;
}

export interface Zone2HintObelisk {
  id: string;
  regionId: Zone2RegionId;
  tile: TilePoint;
  hint: string;
}

export interface Zone2MarkerPad {
  id: string;
  regionId: Zone2RegionId;
  tile: TilePoint;
  cleared: boolean;
  requiredForAccess?: Zone2RegionId[]; // Which regions this pad gates access to
}

export interface Zone2BranchToken {
  id: string;
  regionId: Zone2RegionId;
  tile: TilePoint;
  kind: 'canopy' | 'root';
  collected: boolean;
}

export interface Zone2PrecisionPad {
  id: string;
  regionId: Zone2RegionId;
  tile: TilePoint;
  cleared: boolean;
  gatesWaypoint: TilePoint; // The waypoint that is locked until this pad is cleared
  resetRailTiles: TilePoint[]; // Hazard tiles the player is sent to if w is used before clearing
}

export interface WordLaneSegment {
  id: string;
  regionId: Zone2RegionId;
  waypoints: TilePoint[];
  entryFrom?: string;
  exitsTo?: string[];
}

export interface Zone2LayoutData {
  mapSize: { width: number; height: number };
  entryTile: TilePoint;
  regions: ReadonlyArray<Zone2Region>;
  transitions: ReadonlyArray<Zone2TransitionLink>;
  collisionFeatures: ReadonlyArray<Zone2CollisionFeature>;
  markerPads: ReadonlyArray<Zone2MarkerPad>;
  branchTokens: ReadonlyArray<Zone2BranchToken>;
  precisionPads: ReadonlyArray<Zone2PrecisionPad>;
  arrivalCheckpoint: Zone2Checkpoint;
  arrivalHintObelisk: Zone2HintObelisk;
  wordLanes: ReadonlyArray<WordLaneSegment>;
  lexemeShrineTile: TilePoint;
}

const rectTiles = (bounds: TileBounds): TilePoint[] => {
  const tiles: TilePoint[] = [];
  for (let y = bounds.yMin; y <= bounds.yMax; y += 1) {
    for (let x = bounds.xMin; x <= bounds.xMax; x += 1) {
      tiles.push({ x, y });
    }
  }
  return tiles;
};

export const ZONE2_WORD_WOODS_LAYOUT: Zone2LayoutData = {
  mapSize: { width: 96, height: 56 },
  entryTile: { x: 2, y: 28 },
  regions: [
    {
      id: 'A',
      name: 'Arrival Clearing',
      bounds: { xMin: 2, xMax: 14, yMin: 22, yMax: 34 },
      teachingBeat: 'Reorient from Zone 1 and reinforce 0/$ anchors.',
      gatingRule: 'No lock; checkpoint + hint obelisk.',
    },
    {
      id: 'B',
      name: 'Tutorial Lane',
      bounds: { xMin: 14, xMax: 34, yMin: 24, yMax: 32 },
      teachingBeat: 'Safe loops introducing w forward and b correction.',
      gatingRule: 'Clear 3 marker pads to open split branches.',
    },
    {
      id: 'C1',
      name: 'North Canopy',
      bounds: { xMin: 34, xMax: 62, yMin: 14, yMax: 24 },
      teachingBeat: 'Long forward jumps with dead-branch punish lanes.',
      gatingRule: 'Collect canopy token.',
    },
    {
      id: 'C2',
      name: 'Root Backtrack',
      bounds: { xMin: 34, xMax: 62, yMin: 32, yMax: 42 },
      teachingBeat: 'Intentional overshoot and b-based recoveries.',
      gatingRule: 'Collect root token.',
    },
    {
      id: 'D',
      name: 'Echo Arbor Shrine',
      bounds: { xMin: 62, xMax: 74, yMin: 22, yMax: 34 },
      teachingBeat: 'Unlock e and test endpoint landings.',
      gatingRule: 'Both branch tokens required.',
    },
    {
      id: 'E',
      name: 'Precision Terraces',
      bounds: { xMin: 74, xMax: 90, yMin: 14, yMax: 42 },
      teachingBeat: 'Mixed w b e lanes and occasional 0/$ reset rails.',
      gatingRule: 'Clear 4 terrace runes to open mini-shrine.',
    },
    {
      id: 'FG',
      name: 'Lexeme Shrine + Sentence Gate',
      bounds: { xMin: 90, xMax: 96, yMin: 22, yMax: 34 },
      teachingBeat: 'Final mastery route before returning to the hub.',
      gatingRule: 'Zone completion unlock + route back to hub.',
    },
  ],
  transitions: [
    {
      id: 'A-B',
      from: 'A',
      to: 'B',
      progression: 'forward',
      requirement: 'No lock.',
    },
    {
      id: 'B-C1',
      from: 'B',
      to: 'C1',
      progression: 'forward',
      requirement: 'Tutorial Lane clear (3 marker pads).',
    },
    {
      id: 'B-C2',
      from: 'B',
      to: 'C2',
      progression: 'forward',
      requirement: 'Tutorial Lane clear (3 marker pads).',
    },
    {
      id: 'C1-D',
      from: 'C1',
      to: 'D',
      progression: 'forward',
      requirement: 'Canopy token + root token.',
    },
    {
      id: 'C2-D',
      from: 'C2',
      to: 'D',
      progression: 'forward',
      requirement: 'Canopy token + root token.',
    },
    {
      id: 'D-E',
      from: 'D',
      to: 'E',
      progression: 'forward',
      requirement: 'Echo Arbor shrine complete; e unlocked.',
    },
    {
      id: 'E-FG',
      from: 'E',
      to: 'FG',
      progression: 'forward',
      requirement: '4 terrace runes cleared.',
    },
    {
      id: 'FG-HUB',
      from: 'FG',
      to: 'HUB',
      progression: 'forward',
      requirement: 'Sentence Gate clear.',
    },
    {
      id: 'C1-B',
      from: 'C1',
      to: 'B',
      progression: 'backtrack',
      requirement: 'Open once C1 is entered.',
    },
    {
      id: 'C2-B',
      from: 'C2',
      to: 'B',
      progression: 'backtrack',
      requirement: 'Open once C2 is entered.',
    },
    {
      id: 'E-A',
      from: 'E',
      to: 'A',
      progression: 'shortcut',
      requirement: 'SQ2 shortcut vine unlocked.',
    },
  ],
  collisionFeatures: [
    {
      id: 'c1-dead-branch-west',
      regionId: 'C1',
      kind: 'deadBranch',
      tiles: rectTiles({ xMin: 42, xMax: 46, yMin: 15, yMax: 16 }),
      note: 'Punish lane: reachable with extra w jumps but terminates in a reset tile.',
    },
    {
      id: 'c1-dead-branch-east',
      regionId: 'C1',
      kind: 'deadBranch',
      tiles: rectTiles({ xMin: 53, xMax: 59, yMin: 19, yMax: 20 }),
      note: 'Second dead branch to punish mashing in North Canopy.',
    },
    {
      id: 'c2-overshoot-loop-north',
      regionId: 'C2',
      kind: 'overshootLoop',
      tiles: rectTiles({ xMin: 40, xMax: 50, yMin: 34, yMax: 36 }),
      note: 'Forced overshoot lane with short b-based correction route.',
    },
    {
      id: 'c2-overshoot-loop-south',
      regionId: 'C2',
      kind: 'overshootLoop',
      tiles: rectTiles({ xMin: 50, xMax: 60, yMin: 38, yMax: 40 }),
      note: 'Second overshoot-recovery loop for repeated LO-2.2 checks.',
    },
    {
      id: 'e-reset-rail-1',
      regionId: 'E',
      kind: 'resetRail',
      tiles: [{ x: 77, y: 28 }],
      note: 'Precision terrace reset rail — w overshoots pad 1 and hits this rail.',
    },
    {
      id: 'e-reset-rail-2',
      regionId: 'E',
      kind: 'resetRail',
      tiles: [{ x: 83, y: 28 }],
      note: 'Precision terrace reset rail — w overshoots pad 2 and hits this rail.',
    },
  ],
  markerPads: [
    {
      id: 'tutorial-pad-1',
      regionId: 'B',
      tile: { x: 18, y: 26 },
      cleared: false,
      requiredForAccess: ['C1', 'C2'],
    },
    {
      id: 'tutorial-pad-2',
      regionId: 'B',
      tile: { x: 22, y: 28 },
      cleared: false,
      requiredForAccess: ['C1', 'C2'],
    },
    {
      id: 'tutorial-pad-3',
      regionId: 'B',
      tile: { x: 26, y: 30 },
      cleared: false,
      requiredForAccess: ['C1', 'C2'],
    },
  ],
  branchTokens: [
    {
      id: 'canopy-token',
      regionId: 'C1',
      tile: { x: 58, y: 18 },
      kind: 'canopy',
      collected: false,
    },
    {
      id: 'root-token',
      regionId: 'C2',
      tile: { x: 56, y: 38 },
      kind: 'root',
      collected: false,
    },
  ],
  arrivalCheckpoint: {
    id: 'zone2-arrival-checkpoint',
    regionId: 'A',
    tile: { x: 4, y: 28 },
    respawnTile: { x: 2, y: 28 },
  },
  arrivalHintObelisk: {
    id: 'zone2-arrival-hint-obelisk',
    regionId: 'A',
    tile: { x: 6, y: 28 },
    hint: 'Word Woods teaches w b e. Reinforcement rails still allow 0 and $.',
  },
  precisionPads: [
    {
      id: 'terrace-pad-1',
      regionId: 'E',
      tile: { x: 76, y: 28 },
      cleared: false,
      gatesWaypoint: { x: 78, y: 28 },
      resetRailTiles: [{ x: 77, y: 28 }],
    },
    {
      id: 'terrace-pad-2',
      regionId: 'E',
      tile: { x: 82, y: 28 },
      cleared: false,
      gatesWaypoint: { x: 86, y: 28 },
      resetRailTiles: [{ x: 83, y: 28 }],
    },
  ],
  lexemeShrineTile: { x: 94, y: 28 },
  wordLanes: [
    // Region A: gentle introduction to word jumps
    {
      id: 'lane-a-main',
      regionId: 'A',
      waypoints: [
        { x: 2, y: 28 },
        { x: 6, y: 28 },
        { x: 10, y: 28 },
        { x: 14, y: 28 },
      ],
      exitsTo: ['lane-b-main'],
    },
    // Region B: tutorial lane with staggered pads
    {
      id: 'lane-b-main',
      regionId: 'B',
      waypoints: [
        { x: 14, y: 28 },
        { x: 16, y: 28 },
        { x: 18, y: 26 },
        { x: 20, y: 27 },
        { x: 22, y: 28 },
        { x: 24, y: 29 },
        { x: 26, y: 30 },
        { x: 28, y: 29 },
        { x: 30, y: 28 },
        { x: 32, y: 28 },
        { x: 34, y: 28 },
      ],
      entryFrom: 'lane-a-main',
      exitsTo: ['lane-c1-main', 'lane-c2-main'],
    },
    // Region C1: north canopy — long forward jumps, dead-branch hazards
    {
      id: 'lane-c1-main',
      regionId: 'C1',
      waypoints: [
        { x: 34, y: 28 },
        { x: 34, y: 26 },
        { x: 34, y: 24 },
        { x: 34, y: 22 },
        { x: 34, y: 20 },
        { x: 36, y: 20 },
        { x: 38, y: 19 },
        { x: 40, y: 18 },
        { x: 42, y: 18 },
        { x: 44, y: 17 },
        { x: 46, y: 16 },
        { x: 48, y: 16 },
        { x: 50, y: 16 },
        { x: 52, y: 16 },
        { x: 54, y: 16 },
        { x: 56, y: 16 },
        { x: 58, y: 17 },
        { x: 60, y: 19 },
        { x: 62, y: 22 },
      ],
      entryFrom: 'lane-b-main',
      exitsTo: ['lane-d-north'],
    },
    // Region C2: root backtrack — overshoot loops requiring b recovery
    {
      id: 'lane-c2-main',
      regionId: 'C2',
      waypoints: [
        { x: 34, y: 28 },
        { x: 34, y: 30 },
        { x: 34, y: 32 },
        { x: 34, y: 34 },
        { x: 34, y: 36 },
        { x: 36, y: 36 },
        { x: 38, y: 37 },
        { x: 40, y: 38 },
        { x: 42, y: 38 },
        { x: 44, y: 39 },
        { x: 46, y: 40 },
        { x: 48, y: 40 },
        { x: 50, y: 40 },
        { x: 52, y: 40 },
        { x: 54, y: 40 },
        { x: 56, y: 40 },
        { x: 58, y: 39 },
        { x: 60, y: 37 },
        { x: 62, y: 34 },
      ],
      entryFrom: 'lane-b-main',
      exitsTo: ['lane-d-south'],
    },
    // Region D: echo arbor — convergence at D gate (62,28), then e shrine at (68,28)
    {
      id: 'lane-d-north',
      regionId: 'D',
      waypoints: [
        { x: 62, y: 22 },
        { x: 62, y: 24 },
        { x: 62, y: 26 },
        { x: 62, y: 28 },
      ],
      entryFrom: 'lane-c1-main',
      exitsTo: ['lane-d-center'],
    },
    {
      id: 'lane-d-south',
      regionId: 'D',
      waypoints: [
        { x: 62, y: 34 },
        { x: 62, y: 32 },
        { x: 62, y: 30 },
        { x: 62, y: 28 },
      ],
      entryFrom: 'lane-c2-main',
      exitsTo: ['lane-d-center'],
    },
    {
      id: 'lane-d-center',
      regionId: 'D',
      waypoints: [
        { x: 62, y: 28 },
        { x: 64, y: 28 },
        { x: 66, y: 28 },
        { x: 68, y: 28 },
      ],
      exitsTo: ['lane-d-east'],
    },
    {
      id: 'lane-d-east',
      regionId: 'D',
      waypoints: [
        { x: 68, y: 28 },
        { x: 70, y: 28 },
        { x: 72, y: 28 },
        { x: 74, y: 28 },
      ],
      exitsTo: ['lane-e-main'],
    },
    // Region E: precision terraces — wide waypoints with precision pads at e-midpoints
    {
      id: 'lane-e-main',
      regionId: 'E',
      waypoints: [
        { x: 74, y: 28 },
        { x: 78, y: 28 },
        { x: 86, y: 28 },
        { x: 90, y: 28 },
      ],
      entryFrom: 'lane-d-east',
      exitsTo: ['lane-fg-main'],
    },
    // Region FG: lexeme shrine + sentence gate
    {
      id: 'lane-fg-main',
      regionId: 'FG',
      waypoints: [
        { x: 90, y: 28 },
        { x: 92, y: 28 },
        { x: 94, y: 28 },
      ],
      entryFrom: 'lane-e-main',
    },
  ],
};

export function getZone2Region(regionId: Zone2RegionId): Zone2Region {
  const region = ZONE2_WORD_WOODS_LAYOUT.regions.find((item) => item.id === regionId);
  if (!region) {
    throw new Error(`Unknown Zone 2 region: ${regionId}`);
  }
  return region;
}

export function isTileInBounds(tile: TilePoint, bounds: TileBounds): boolean {
  return tile.x >= bounds.xMin && tile.x <= bounds.xMax && tile.y >= bounds.yMin && tile.y <= bounds.yMax;
}
