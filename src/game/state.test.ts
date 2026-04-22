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
