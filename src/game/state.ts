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
  dungeonVisited: boolean;
  masteryRelicFound: boolean;
  mentorMet: boolean;
  introSeen: boolean;
  audioMuted: boolean;
  // Zone 2 tracking
  zone2Entered: boolean;
  zone2TutorialPadsCleared: number;
  hasCanopyToken: boolean;
  hasRootToken: boolean;
};

export const defaultGameState = (): GameState => ({
  mode: 'normal',
  areaName: 'Cursor Meadow',
  hint: 'Speak to the Mentor near the entrance to learn the ways of Vim.',
  // Only h j k l Esc are available at start — others unlock via shrines/dungeon
  unlockedCommands: ['h', 'j', 'k', 'l', 'Esc'],
  cratesDestroyed: 0,
  gateUnlocked: false,
  bridgeBuilt: false,
  level1Complete: false,
  dungeonVisited: false,
  masteryRelicFound: false,
  mentorMet: false,
  introSeen: false,
  audioMuted: false,
  // Zone 2 defaults
  zone2Entered: false,
  zone2TutorialPadsCleared: 0,
  hasCanopyToken: false,
  hasRootToken: false,
});

// Full command registry — defines every command's display label and unlock tier
export type CommandDef = {
  key: string;
  label: string;
  description: string;
  tier: number;
};

export const COMMAND_REGISTRY: CommandDef[] = [
  { key: 'h', label: 'h', description: 'Move left', tier: 1 },
  { key: 'j', label: 'j', description: 'Move down', tier: 1 },
  { key: 'k', label: 'k', description: 'Move up', tier: 1 },
  { key: 'l', label: 'l', description: 'Move right', tier: 1 },
  { key: 'Esc', label: 'Esc', description: 'Normal mode', tier: 1 },
  { key: 'w', label: 'w', description: 'Word forward', tier: 2 },
  { key: 'b', label: 'b', description: 'Word back', tier: 2 },
  { key: 'e', label: 'e', description: 'Word end', tier: 2 },
  { key: '0', label: '0', description: 'Line start', tier: 3 },
  { key: '$', label: '$', description: 'Line end', tier: 3 },
  { key: 'x', label: 'x', description: 'Delete character', tier: 3 },
  { key: 'i', label: 'i', description: 'Insert mode', tier: 4 },
  { key: 'a', label: 'a', description: 'Append', tier: 4 },
  { key: 'dd', label: 'dd', description: 'Delete line', tier: 4 },
  { key: 'yy', label: 'yy', description: 'Yank line', tier: 4 },
  { key: 'p', label: 'p', description: 'Paste', tier: 4 },
  { key: 'u', label: 'u', description: 'Undo', tier: 4 },
];

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
