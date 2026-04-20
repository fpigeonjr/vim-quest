export type VimMode = 'normal' | 'insert';

export type GameState = {
  mode: VimMode;
  areaName: string;
  hint: string;
  unlockedCommands: string[];
  cratesDestroyed: number;
  gateUnlocked: boolean;
  level1Complete: boolean;
};

export const defaultGameState = (): GameState => ({
  mode: 'normal',
  areaName: 'Cursor Meadow',
  hint: 'Find the movement shrine and explore the meadow.',
  unlockedCommands: ['h', 'j', 'k', 'l', 'Esc'],
  cratesDestroyed: 0,
  gateUnlocked: false,
  level1Complete: false,
});

export const REGISTRY_KEYS = {
  state: 'gameState',
} as const;
