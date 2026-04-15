import Phaser from 'phaser';
import { TILE_SIZE } from '../game/config';
import {
  CONSOLE_POSITION,
  createOverworldTilemap,
  createTileCollisions,
  getTileAt,
  MARKER_POINTS,
  MARKER_ROW_Y,
  setTileAt,
  SHRINES,
  TILE_IDS,
  TilemapData,
} from '../systems/tilemap';
import { GameState, REGISTRY_KEYS, VimMode } from '../game/state';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: { [key: string]: Phaser.Input.Keyboard.Key };
  private tilemapData!: TilemapData;
  private shrineVisits = new Set<string>();

  constructor() {
    super('world');
  }

  create() {
    this.buildWorld();
    this.createPlayer();
    this.createCollisions();
    this.createInput();
    this.syncState({
      areaName: 'Cursor Meadow',
      hint: 'Visit shrines to unlock commands and test them in the meadow.',
    });
  }

  update() {
    this.handleMovement();
  }

  private buildWorld() {
    // Create tilemap using the new system
    this.tilemapData = createOverworldTilemap(this);

    // Add labels
    this.add.text(5 * TILE_SIZE, 4 * TILE_SIZE, 'Cursor Meadow', {
      fontFamily: 'Courier New',
      fontSize: '24px',
      color: '#f1fa8c',
    });

    this.add.text(21 * TILE_SIZE, 8 * TILE_SIZE, 'River Console', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#f8f9fa',
    });

    this.add.text(42 * TILE_SIZE, 15 * TILE_SIZE, 'Break crates with x', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#f8f9fa',
    });

    // Set world bounds
    const { width, height } = this.tilemapData;
    this.physics.world.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(4 * TILE_SIZE, 6 * TILE_SIZE, 'player-cursor');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setDrag(1200, 1200);
    this.player.setMaxVelocity(220, 220);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.25);
  }

  private createCollisions() {
    // Create collisions for blocked tiles
    createTileCollisions(this, this.tilemapData, this.player);
  }

  private createInput() {
    this.cursors = this.input.keyboard!.addKeys({
      h: Phaser.Input.Keyboard.KeyCodes.H,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      b: Phaser.Input.Keyboard.KeyCodes.B,
      x: Phaser.Input.Keyboard.KeyCodes.X,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    this.input.keyboard?.on('keydown-W', () => this.handleWordJump(1));
    this.input.keyboard?.on('keydown-B', () => this.handleWordJump(-1));
    this.input.keyboard?.on('keydown-ZERO', () => this.handleLineSnap('start'));
    this.input.keyboard?.on('keydown-X', () => this.handleBreakCrate());
    this.input.keyboard?.on('keydown-I', () => this.handleInsertAction());
    // Also listen for lowercase i
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'i' || event.key === 'I') {
        this.handleInsertAction();
      }
      if (event.key === '$') {
        this.handleLineSnap('end');
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => this.setMode('normal'));
  }

  private handleMovement() {
    const state = this.getState();
    const speed = state.mode === 'insert' ? 120 : 180;
    let vx = 0;
    let vy = 0;

    if (this.cursors.h.isDown) {
      vx = -speed;
    } else if (this.cursors.l.isDown) {
      vx = speed;
    }

    if (this.cursors.k.isDown) {
      vy = -speed;
    } else if (this.cursors.j.isDown) {
      vy = speed;
    }

    this.player.setVelocity(vx, vy);
    this.checkShrines();
  }

  private checkShrines() {
    const { x, y } = getTileAt(this.tilemapData, this.player.x, this.player.y);
    const shrine = SHRINES.find((entry) => entry.x === x && entry.y === y);
    if (!shrine || this.shrineVisits.has(shrine.title)) {
      return;
    }

    // Check if this is the Wave 1 Gate and if crates are not destroyed yet
    if (shrine.title === 'Wave 1 Gate') {
      const state = this.getState();
      if (!state.gateUnlocked) {
        this.syncState({ 
          hint: 'The gate is blocked! You must break all 3 crates before you can proceed.' 
        });
        this.showToast('Gate locked - destroy the crates first!');
        return;
      }
    }

    this.shrineVisits.add(shrine.title);
    const state = this.getState();
    const unlocked = new Set(state.unlockedCommands);
    for (const command of shrine.unlock) {
      unlocked.add(command);
    }

    this.syncState({
      unlockedCommands: Array.from(unlocked),
      hint: shrine.hint,
    });

    if (shrine.unlock.length > 0) {
      this.showToast(`${shrine.title}: unlocked ${shrine.unlock.join(' ')}`);
    } else {
      this.showToast(shrine.hint);
    }
  }

  private handleWordJump(direction: 1 | -1) {
    if (!this.hasCommand(direction === 1 ? 'w' : 'b')) {
      return;
    }

    const tile = getTileAt(this.tilemapData, this.player.x, this.player.y);
    if (tile.y !== MARKER_ROW_Y) {
      this.syncState({ hint: 'Use w and b on the southern marker road.' });
      return;
    }

    const markers = MARKER_POINTS;
    const current = tile.x;
    const target = direction === 1
      ? markers.find((value) => value > current)
      : markers.slice().reverse().find((value) => value < current);
    if (!target) {
      this.syncState({ hint: 'No more markers in that direction.' });
      return;
    }

    this.player.setPosition(target * TILE_SIZE + TILE_SIZE / 2, tile.y * TILE_SIZE + TILE_SIZE / 2);
    this.syncState({ hint: 'Word jump complete. Keep following the marker road.' });
  }

  private handleLineSnap(side: 'start' | 'end') {
    const command = side === 'start' ? '0' : '$';
    if (!this.hasCommand(command)) {
      return;
    }

    const tile = getTileAt(this.tilemapData, this.player.x, this.player.y);
    if (tile.y !== MARKER_ROW_Y) {
      this.syncState({ hint: 'Use 0 and $ on the southern marker road.' });
      return;
    }

    const targetX = side === 'start' ? 13 : 43;
    this.player.setPosition(targetX * TILE_SIZE + TILE_SIZE / 2, MARKER_ROW_Y * TILE_SIZE + TILE_SIZE / 2);
    this.syncState({ hint: `Snapped to the ${side} of the line.` });
  }

  private handleBreakCrate() {
    if (!this.hasCommand('x')) {
      return;
    }

    const neighbors = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const current = getTileAt(this.tilemapData, this.player.x, this.player.y);

    for (const offset of neighbors) {
      const x = current.x + offset.x;
      const y = current.y + offset.y;
      const tile = getTileAt(this.tilemapData, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);

      if (tile.id === TILE_IDS.crate) {
        // Change crate to path
        setTileAt(this.tilemapData, x, y, TILE_IDS.path);
        
        // Increment crate destruction counter
        const state = this.getState();
        const newCount = state.cratesDestroyed + 1;
        
        // Check if all 3 crates are destroyed
        if (newCount >= 3) {
          this.syncState({ 
            cratesDestroyed: newCount,
            gateUnlocked: true,
            hint: 'All crates destroyed! The gate to Wave 1 is now open.' 
          });
          this.showToast('All crates broken! Gate unlocked!');
        } else {
          this.syncState({ 
            cratesDestroyed: newCount,
            hint: `Crate destroyed (${newCount}/3). Destroy all crates to unlock the gate.` 
          });
          this.showToast('Crate removed with x');
        }
        return;
      }
    }

    this.syncState({ hint: 'Nothing breakable is next to you.' });
  }

  private handleInsertAction() {
    if (!this.hasCommand('i')) {
      return;
    }

    const current = getTileAt(this.tilemapData, this.player.x, this.player.y);
    const onConsole = current.x === CONSOLE_POSITION.x && current.y === CONSOLE_POSITION.y;

    if (!onConsole) {
      this.setMode('insert');
      this.syncState({ hint: 'Insert mode is active, but this action needs the river console.' });
      return;
    }

    this.setMode('insert');
    // Activate bridge - create a path across the full river (rows 10-12) at column 29
    setTileAt(this.tilemapData, 29, 10, TILE_IDS.path);
    setTileAt(this.tilemapData, 29, 11, TILE_IDS.path);
    setTileAt(this.tilemapData, 29, 12, TILE_IDS.path);
    this.syncState({ hint: 'Bridge activated. Cross the river to reach the Wave 1 gate.' });
    this.showToast('Insert console activated the bridge');
  }

  private setMode(mode: VimMode) {
    this.syncState({ mode });
  }

  private hasCommand(command: string): boolean {
    const state = this.getState();
    if (state.unlockedCommands.includes(command)) {
      return true;
    }

    this.syncState({ hint: `That command is still locked: ${command}` });
    return false;
  }

  private getState(): GameState {
    return this.registry.get(REGISTRY_KEYS.state) as GameState;
  }

  private syncState(patch: Partial<GameState>) {
    const nextState = { ...this.getState(), ...patch };
    this.registry.set(REGISTRY_KEYS.state, nextState);
  }

  private showToast(text: string) {
    const toast = this.add
      .text(this.player.x, this.player.y - 42, text, {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#f1fa8c',
        backgroundColor: '#10211e',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: toast,
      y: toast.y - 24,
      alpha: 0,
      duration: 1400,
      ease: 'Sine.easeOut',
      onComplete: () => toast.destroy(),
    });
  }
}
