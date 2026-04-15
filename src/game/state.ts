export type VimMode = 'normal' | 'insert';

export type GameState = {
  mode: VimMode;
  areaName: string;
  hint: string;
  unlockedCommands: string[];
  cratesDestroyed: number;
  gateUnlocked: boolean;
};

export const defaultGameState = (): GameState => ({
  mode: 'normal',
  areaName: 'Cursor Meadow',
  hint: 'Find the movement shrine and explore the meadow.',
  unlockedCommands: ['h', 'j', 'k', 'l', 'Esc'],
  cratesDestroyed: 0,
  gateUnlocked: false,
});

export const REGISTRY_KEYS = {
  state: 'gameState',
} as const;
