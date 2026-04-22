import { describe, expect, it } from 'vitest';

import { ZONE2_WORD_WOODS_LAYOUT, getZone2Region, isTileInBounds } from './zone2WordWoods';

describe('ZONE2_WORD_WOODS_LAYOUT', () => {
  it('matches authored region bounds for A-G', () => {
    expect(getZone2Region('A').bounds).toEqual({ xMin: 2, xMax: 14, yMin: 22, yMax: 34 });
    expect(getZone2Region('B').bounds).toEqual({ xMin: 14, xMax: 34, yMin: 24, yMax: 32 });
    expect(getZone2Region('C1').bounds).toEqual({ xMin: 34, xMax: 62, yMin: 14, yMax: 24 });
    expect(getZone2Region('C2').bounds).toEqual({ xMin: 34, xMax: 62, yMin: 32, yMax: 42 });
    expect(getZone2Region('D').bounds).toEqual({ xMin: 62, xMax: 74, yMin: 22, yMax: 34 });
    expect(getZone2Region('E').bounds).toEqual({ xMin: 74, xMax: 90, yMin: 14, yMax: 42 });
    expect(getZone2Region('FG').bounds).toEqual({ xMin: 90, xMax: 96, yMin: 22, yMax: 34 });
  });

  it('contains the forward transition chain from A to HUB', () => {
    const forwardLinks = ZONE2_WORD_WOODS_LAYOUT.transitions
      .filter((link) => link.progression === 'forward')
      .map((link) => `${link.from}->${link.to}`);

    expect(forwardLinks).toContain('A->B');
    expect(forwardLinks).toContain('B->C1');
    expect(forwardLinks).toContain('B->C2');
    expect(forwardLinks).toContain('C1->D');
    expect(forwardLinks).toContain('C2->D');
    expect(forwardLinks).toContain('D->E');
    expect(forwardLinks).toContain('E->FG');
    expect(forwardLinks).toContain('FG->HUB');
  });

  it('keeps Arrival Clearing checkpoint + hint obelisk inside region A', () => {
    const arrivalBounds = getZone2Region('A').bounds;
    const { arrivalCheckpoint, arrivalHintObelisk } = ZONE2_WORD_WOODS_LAYOUT;

    expect(arrivalCheckpoint.regionId).toBe('A');
    expect(arrivalHintObelisk.regionId).toBe('A');
    expect(isTileInBounds(arrivalCheckpoint.tile, arrivalBounds)).toBe(true);
    expect(isTileInBounds(arrivalHintObelisk.tile, arrivalBounds)).toBe(true);
    expect(isTileInBounds(arrivalCheckpoint.respawnTile, arrivalBounds)).toBe(true);
  });

  it('represents C1 dead-branch and C2 overshoot/recovery collision beats', () => {
    const deadBranches = ZONE2_WORD_WOODS_LAYOUT.collisionFeatures.filter(
      (feature) => feature.regionId === 'C1' && feature.kind === 'deadBranch',
    );
    const overshootLoops = ZONE2_WORD_WOODS_LAYOUT.collisionFeatures.filter(
      (feature) => feature.regionId === 'C2' && feature.kind === 'overshootLoop',
    );

    expect(deadBranches.length).toBeGreaterThanOrEqual(2);
    expect(overshootLoops.length).toBeGreaterThanOrEqual(2);
    expect(deadBranches.every((feature) => feature.tiles.length > 0)).toBe(true);
    expect(overshootLoops.every((feature) => feature.tiles.length > 0)).toBe(true);
  });

  it('keeps all authored collision feature tiles inside the Zone 2 map size', () => {
    const {
      mapSize: { width, height },
      collisionFeatures,
    } = ZONE2_WORD_WOODS_LAYOUT;

    for (const feature of collisionFeatures) {
      for (const tile of feature.tiles) {
        expect(tile.x).toBeGreaterThanOrEqual(0);
        expect(tile.x).toBeLessThan(width);
        expect(tile.y).toBeGreaterThanOrEqual(0);
        expect(tile.y).toBeLessThan(height);
      }
    }
  });
});
