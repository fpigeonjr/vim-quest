import { beforeEach, describe, expect, it } from 'vitest';

import { clearSavedState, defaultGameState, loadSavedState, saveState } from './state';

// Keep in sync with src/game/state.ts
const SAVE_KEY = 'vimquest-save-v1';

describe('state persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips a saved state', () => {
    const state = defaultGameState();
    state.unlockedCommands = [...state.unlockedCommands, 'w'];

    saveState(state);

    expect(loadSavedState()).toEqual(state);
  });

  it('merges saved state with defaults (forward compatible)', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: 'insert' }));

    const loaded = loadSavedState();

    expect(loaded).not.toBeNull();
    expect(loaded?.mode).toBe('insert');
    expect(loaded?.areaName).toBe(defaultGameState().areaName);
    expect(loaded?.audioMuted).toBe(false);
  });

  it('clears saved state', () => {
    saveState(defaultGameState());
    clearSavedState();

    expect(loadSavedState()).toBeNull();
  });
});

// ── defaultGameState shape ─────────────────────────────────────────────────────
// Guards against regressions where a new field is added without a default value.

describe('defaultGameState', () => {
  it('has all required fields with correct defaults', () => {
    const s = defaultGameState();

    // Core mode + area
    expect(s.mode).toBe('normal');
    expect(s.areaName).toBe('Cursor Meadow');

    // Starter commands — only h j k l Esc at spawn
    expect(s.unlockedCommands).toEqual(['h', 'j', 'k', 'l', 'Esc']);

    // Progression flags — all false at start
    expect(s.cratesDestroyed).toBe(0);
    expect(s.gateUnlocked).toBe(false);

    // BUG-02: bridge guard must default false so first i press builds the bridge
    expect(s.bridgeBuilt).toBe(false);

    expect(s.level1Complete).toBe(false);
    expect(s.dungeonVisited).toBe(false);
    expect(s.masteryRelicFound).toBe(false);
    expect(s.mentorMet).toBe(false);

    // Intro overlay: must default false so first-load primer is shown
    expect(s.introSeen).toBe(false);

    // Audio mute: must default false so overworld loop starts unmuted
    expect(s.audioMuted).toBe(false);
  });
});

// ── BUG-02 — bridgeBuilt persistence ──────────────────────────────────────────
// Ensures the bridge-built guard survives a page reload.

describe('bridgeBuilt persistence (BUG-02)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists bridgeBuilt = true across save/load', () => {
    const state = { ...defaultGameState(), bridgeBuilt: true };
    saveState(state);

    expect(loadSavedState()?.bridgeBuilt).toBe(true);
  });

  it('defaults bridgeBuilt to false when field is absent in saved data', () => {
    // Simulate a save file written before bridgeBuilt was added
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: 'normal' }));

    expect(loadSavedState()?.bridgeBuilt).toBe(false);
  });
});

// ── Intro overlay persistence ─────────────────────────────────────────────────
// Ensures the "never show primer twice" guarantee works after reload.

describe('introSeen persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists introSeen = true across save/load', () => {
    const state = { ...defaultGameState(), introSeen: true };
    saveState(state);

    expect(loadSavedState()?.introSeen).toBe(true);
  });

  it('defaults introSeen to false when field is absent in saved data', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: 'normal' }));

    expect(loadSavedState()?.introSeen).toBe(false);
  });
});

// ── Audio mute persistence ────────────────────────────────────────────────────
// Ensures [M] toggle state survives a page reload.

describe('audioMuted persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists audioMuted = true across save/load', () => {
    const state = { ...defaultGameState(), audioMuted: true };
    saveState(state);

    expect(loadSavedState()?.audioMuted).toBe(true);
  });

  it('defaults audioMuted to false when field is absent in saved data', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ mode: 'normal' }));

    expect(loadSavedState()?.audioMuted).toBe(false);
  });
});

// ── loadSavedState with empty storage ────────────────────────────────────────

describe('loadSavedState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing has been saved', () => {
    expect(loadSavedState()).toBeNull();
  });
});
