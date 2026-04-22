import type Phaser from 'phaser';

import { GameState, REGISTRY_KEYS, saveState } from '../game/state';

type SlashRoute = 'world' | 'dungeon' | 'zone2' | 'help' | 'unknown';

export type SlashCommandDefinition = {
  command: string;
  aliases: string[];
  description: string;
  route: Exclude<SlashRoute, 'unknown'>;
};

type SlashModalRow = {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
};

type SlashModalView = {
  container: Phaser.GameObjects.Container;
  inputText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  rows: SlashModalRow[];
};

type SlashModalState = {
  isOpen: boolean;
  inputValue: string;
  selectedIndex: number;
  statusMessage: string;
  view: SlashModalView | null;
};

const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    command: '/level-2',
    aliases: ['/level2', '/zone-2', '/zone2', '/word-woods'],
    description: 'Warp to Word Woods (Zone 2)',
    route: 'zone2',
  },
  {
    command: '/level-1',
    aliases: ['/level1', '/zone-1', '/zone1'],
    description: 'Warp to Cursor Meadow (Zone 1)',
    route: 'world',
  },
  {
    command: '/dungeon',
    aliases: ['/cursor-shrine'],
    description: 'Warp to Cursor Shrine dungeon',
    route: 'dungeon',
  },
  {
    command: '/help',
    aliases: ['/?'],
    description: 'Show slash command help',
    route: 'help',
  },
];

const MODAL_MAX_ROWS = 5;
const modalByScene = new WeakMap<Phaser.Scene, SlashModalState>();
const registeredScenes = new WeakSet<Phaser.Scene>();

const getAliases = (command: SlashCommandDefinition): string[] => [command.command, ...command.aliases];

const normalizeCommand = (raw: string): string => {
  const value = raw.trim().toLowerCase();
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
};

export const routeSlashCommand = (raw: string): SlashRoute => {
  const command = normalizeCommand(raw);
  if (!command) return 'unknown';

  for (const definition of SLASH_COMMANDS) {
    if (getAliases(definition).includes(command)) {
      return definition.route;
    }
  }

  return 'unknown';
};

export const getSlashSuggestions = (raw: string): SlashCommandDefinition[] => {
  const command = normalizeCommand(raw);
  if (!command) return [...SLASH_COMMANDS];

  return SLASH_COMMANDS.filter((definition) =>
    getAliases(definition).some((alias) => alias.startsWith(command)),
  );
};

const getState = (scene: Phaser.Scene): GameState | null => {
  const state = scene.registry.get(REGISTRY_KEYS.state) as GameState | undefined;
  return state ?? null;
};

const syncState = (scene: Phaser.Scene, patch: Partial<GameState>) => {
  const state = getState(scene);
  if (!state) return;
  const nextState = { ...state, ...patch };
  scene.registry.set(REGISTRY_KEYS.state, nextState);
  saveState(nextState);
};

const stopOtherPlayableScenes = (scene: Phaser.Scene, target: 'world' | 'dungeon' | 'zone2') => {
  const candidates: Array<'title' | 'world' | 'dungeon' | 'zone2'> = ['title', 'world', 'dungeon', 'zone2'];
  for (const key of candidates) {
    if (key === target) continue;
    if (scene.scene.isActive(key) || scene.scene.isSleeping(key)) {
      scene.scene.stop(key);
    }
  }
};

const startPlayableScene = (scene: Phaser.Scene, target: 'world' | 'dungeon' | 'zone2') => {
  stopOtherPlayableScenes(scene, target);

  if (!scene.scene.isActive('ui')) {
    scene.scene.launch('ui');
  }

  scene.scene.start(target);
};

const ensureZone2CommandSet = (scene: Phaser.Scene) => {
  const state = getState(scene);
  if (!state) return;

  const unlocked = new Set(state.unlockedCommands);
  for (const command of ['w', 'b', 'e', '0', '$']) {
    unlocked.add(command);
  }

  syncState(scene, {
    mode: 'normal',
    unlockedCommands: Array.from(unlocked),
    areaName: 'Word Woods',
    hint: 'Warped to Zone 2 via slash command. Press / then /level-1 to return.',
  });
};

const showHelp = (scene: Phaser.Scene) => {
  const help =
    'Slash commands: /level-2 (or /zone-2), /level-1 (or /zone-1), /dungeon, /help. Press / to open command palette.';
  syncState(scene, { hint: help });
};

export const executeSlashCommand = (scene: Phaser.Scene, raw: string): boolean => {
  const route = routeSlashCommand(raw);

  if (route === 'help') {
    showHelp(scene);
    return true;
  }

  if (route === 'world') {
    syncState(scene, {
      mode: 'normal',
      areaName: 'Cursor Meadow',
      hint: 'Warped to Cursor Meadow via slash command.',
    });
    startPlayableScene(scene, 'world');
    return true;
  }

  if (route === 'dungeon') {
    syncState(scene, {
      mode: 'normal',
      areaName: 'Cursor Shrine',
      hint: 'Warped to Cursor Shrine via slash command.',
    });
    startPlayableScene(scene, 'dungeon');
    return true;
  }

  if (route === 'zone2') {
    ensureZone2CommandSet(scene);
    startPlayableScene(scene, 'zone2');
    return true;
  }

  syncState(scene, {
    hint: 'Unknown slash command. Try /help or /level-2.',
  });
  return false;
};

const ensureModalState = (scene: Phaser.Scene): SlashModalState => {
  const existing = modalByScene.get(scene);
  if (existing) return existing;

  const next: SlashModalState = {
    isOpen: false,
    inputValue: '',
    selectedIndex: 0,
    statusMessage: '',
    view: null,
  };

  modalByScene.set(scene, next);
  return next;
};

const destroyModal = (state: SlashModalState) => {
  if (!state.view) return;
  state.view.container.destroy(true);
  state.view = null;
};

const renderModal = (scene: Phaser.Scene, state: SlashModalState) => {
  if (!state.view) return;

  const suggestions = getSlashSuggestions(state.inputValue);
  if (suggestions.length === 0) {
    state.selectedIndex = 0;
  } else if (state.selectedIndex >= suggestions.length) {
    state.selectedIndex = suggestions.length - 1;
  } else if (state.selectedIndex < 0) {
    state.selectedIndex = 0;
  }

  state.view.inputText.setText(`> ${state.inputValue || '/'}`);

  for (let index = 0; index < state.view.rows.length; index += 1) {
    const row = state.view.rows[index];
    const suggestion = suggestions[index];
    if (!suggestion) {
      row.bg.setVisible(false);
      row.text.setVisible(false);
      continue;
    }

    const selected = index === state.selectedIndex;
    row.bg.setVisible(true);
    row.bg.setFillStyle(selected ? 0xdcc889 : 0xefe7d3, selected ? 1 : 0.9);
    row.text.setVisible(true);
    row.text.setColor(selected ? '#473421' : '#5e5243');
    row.text.setText(`${suggestion.command}  ${suggestion.description}`);
  }

  if (state.statusMessage) {
    state.view.statusText.setText(state.statusMessage);
  } else if (suggestions.length > 0) {
    const selected = suggestions[state.selectedIndex];
    state.view.statusText.setText(
      `Enter run${selected ? `s ${selected.command}` : 's command'}  |  Tab autocomplete  |  ↑↓ select  |  Esc close`,
    );
  } else {
    state.view.statusText.setText('No suggestions. Press Enter to run what you typed, or Esc to close.');
  }
};

const createModalView = (scene: Phaser.Scene): SlashModalView => {
  const depth = 120;
  const panelWidth = Math.min(760, scene.cameras.main.width - 80);
  const panelHeight = 332;
  const panelX = scene.cameras.main.width / 2;
  const panelY = scene.cameras.main.height / 2;

  const container = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);

  const backdrop = scene.add.rectangle(0, 0, scene.cameras.main.width, scene.cameras.main.height, 0x0f1425, 0.58);
  backdrop.setOrigin(0, 0);
  container.add(backdrop);

  const panel = scene.add
    .rectangle(panelX, panelY, panelWidth, panelHeight, 0xf4efe2, 0.98)
    .setStrokeStyle(4, 0xd2c8b1, 1);
  container.add(panel);

  const title = scene.add.text(panelX - panelWidth / 2 + 20, panelY - panelHeight / 2 + 16, 'Slash Command Palette', {
    fontFamily: 'Palatino Linotype',
    fontSize: '24px',
    color: '#624f38',
    fontStyle: 'bold',
  });
  container.add(title);

  const inputBox = scene.add
    .rectangle(panelX, panelY - panelHeight / 2 + 68, panelWidth - 40, 38, 0xe8dfc8, 1)
    .setStrokeStyle(2, 0xc0b291, 1);
  container.add(inputBox);

  const inputText = scene.add.text(panelX - panelWidth / 2 + 28, panelY - panelHeight / 2 + 56, '> /', {
    fontFamily: 'Courier New',
    fontSize: '22px',
    color: '#44372c',
    fontStyle: 'bold',
  });
  container.add(inputText);

  const rows: SlashModalRow[] = [];
  const rowStartY = panelY - panelHeight / 2 + 104;
  for (let index = 0; index < MODAL_MAX_ROWS; index += 1) {
    const rowY = rowStartY + index * 38;
    const rowBg = scene
      .add.rectangle(panelX, rowY, panelWidth - 40, 32, 0xefe7d3, 1)
      .setStrokeStyle(1, 0xd8cdb3, 1);
    const rowText = scene.add.text(panelX - panelWidth / 2 + 28, rowY - 11, '', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#5e5243',
    });
    container.add(rowBg);
    container.add(rowText);
    rows.push({ bg: rowBg, text: rowText });
  }

  const statusText = scene.add.text(
    panelX - panelWidth / 2 + 20,
    panelY + panelHeight / 2 - 34,
    '',
    {
      fontFamily: 'Courier New',
      fontSize: '13px',
      color: '#5f5a4c',
    },
  );
  container.add(statusText);

  return { container, inputText, statusText, rows };
};

export const isSlashModalOpen = (scene: Phaser.Scene): boolean => ensureModalState(scene).isOpen;

export const closeSlashModal = (scene: Phaser.Scene) => {
  const state = ensureModalState(scene);
  state.isOpen = false;
  state.inputValue = '';
  state.selectedIndex = 0;
  state.statusMessage = '';
  destroyModal(state);
};

const openSlashModal = (scene: Phaser.Scene) => {
  const state = ensureModalState(scene);
  if (state.isOpen) return;

  state.isOpen = true;
  state.inputValue = '/';
  state.selectedIndex = 0;
  state.statusMessage = '';
  state.view = createModalView(scene);
  renderModal(scene, state);
};

const isSlashKey = (event: KeyboardEvent): boolean =>
  event.code === 'Slash' || event.key === '/' || event.key === '?' || event.key === '÷' || event.key === '／';

const isPrintableKey = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;

const moveSelection = (state: SlashModalState, delta: 1 | -1) => {
  const suggestions = getSlashSuggestions(state.inputValue);
  if (suggestions.length === 0) {
    state.selectedIndex = 0;
    return;
  }
  const next = state.selectedIndex + delta;
  if (next < 0) {
    state.selectedIndex = suggestions.length - 1;
  } else if (next >= suggestions.length) {
    state.selectedIndex = 0;
  } else {
    state.selectedIndex = next;
  }
};

const runModalCommand = (scene: Phaser.Scene, state: SlashModalState) => {
  const suggestions = getSlashSuggestions(state.inputValue);
  const typed = normalizeCommand(state.inputValue);
  const selected = suggestions[state.selectedIndex];
  const command = selected?.command ?? typed;

  if (!command) {
    state.statusMessage = 'Type a slash command first.';
    renderModal(scene, state);
    return;
  }

  const ok = executeSlashCommand(scene, command);
  if (ok) {
    closeSlashModal(scene);
    return;
  }

  state.statusMessage = 'Unknown command. Try /help, /level-2, /level-1, or /dungeon.';
  renderModal(scene, state);
};

const isMoveUpKey = (event: KeyboardEvent): boolean =>
  event.key === 'ArrowUp' ||
  event.key === 'Up' ||
  event.code === 'ArrowUp' ||
  (event as KeyboardEvent & { keyCode?: number }).keyCode === 38;

const isMoveDownKey = (event: KeyboardEvent): boolean =>
  event.key === 'ArrowDown' ||
  event.key === 'Down' ||
  event.code === 'ArrowDown' ||
  (event as KeyboardEvent & { keyCode?: number }).keyCode === 40;

const handleModalKey = (scene: Phaser.Scene, state: SlashModalState, event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closeSlashModal(scene);
    return;
  }

  if (isMoveUpKey(event)) {
    moveSelection(state, -1);
    state.statusMessage = '';
    renderModal(scene, state);
    return;
  }

  if (isMoveDownKey(event)) {
    moveSelection(state, 1);
    state.statusMessage = '';
    renderModal(scene, state);
    return;
  }

  if (event.key === 'Tab') {
    const selected = getSlashSuggestions(state.inputValue)[state.selectedIndex];
    if (!selected) return;
    state.inputValue = selected.command;
    state.statusMessage = '';
    renderModal(scene, state);
    return;
  }

  if (event.key === 'Enter') {
    runModalCommand(scene, state);
    return;
  }

  if (event.key === 'Backspace') {
    state.inputValue = state.inputValue.slice(0, -1);
    state.selectedIndex = 0;
    state.statusMessage = '';
    renderModal(scene, state);
    return;
  }

  if (!isPrintableKey(event)) return;
  state.inputValue += event.key.toLowerCase();
  state.selectedIndex = 0;
  state.statusMessage = '';
  renderModal(scene, state);
};

export const registerGlobalSlashPrompt = (scene: Phaser.Scene) => {
  if (registeredScenes.has(scene)) return;

  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  const state = ensureModalState(scene);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (state.isOpen) {
      event.preventDefault();
      handleModalKey(scene, state, event);
      return;
    }

    if (!isSlashKey(event)) return;
    event.preventDefault();
    openSlashModal(scene);
  };

  keyboard.on('keydown', onKeyDown);
  registeredScenes.add(scene);

  scene.events.once('shutdown', () => {
    closeSlashModal(scene);
    keyboard.off('keydown', onKeyDown);
    registeredScenes.delete(scene);
  });
};
