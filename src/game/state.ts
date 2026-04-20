export type VimMode = 'normal' | 'insert';

export type GameState = {
  mode: VimMode;
  areaName: string;
  hint: string;
  unlockedCommands: string[];
  cratesDestroyed: number;
  gateUnlocked: boolean;
  bridgeBuilt: boolean;
  level1Complete: boolean;
};

export const defaultGameState = (): GameState => ({
  mode: 'normal',
  areaName: 'Cursor Meadow',
  hint: 'Find the movement shrine and explore the meadow.',
  unlockedCommands: ['h', 'j', 'k', 'l', 'Esc'],
  cratesDestroyed: 0,
  gateUnlocked: false,
  bridgeBuilt: false,
  level1Complete: false,
});

export const REGISTRY_KEYS = {
  state: 'gameState',
} as const;

const SAVE_KEY = 'vimquest-save-v1';

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — silent fail
  }
}

export function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    // Merge with defaults so any new fields added later are always present
    return { ...defaultGameState(), ...parsed };
  } catch {
    return null;
  }
}

export function clearSavedState(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
