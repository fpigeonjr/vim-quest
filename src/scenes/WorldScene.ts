import Phaser from 'phaser';
import { TILE_SIZE } from '../game/config';
import {
  CONSOLE_POSITION,
  createOverworldTilemap,
  createTileCollisions,
  FLAG_POSITION,
  GATE_WALL_TILES,
  getTileAt,
  MARKER_POINTS,
  MARKER_ROW_Y,
  setTileAt,
  SHRINES,
  TILE_IDS,
  TilemapData,
} from '../systems/tilemap';
import { GameState, REGISTRY_KEYS, VimMode, saveState, clearSavedState } from '../game/state';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: { [key: string]: Phaser.Input.Keyboard.Key };
  private tilemapData!: TilemapData;
  private shrineVisits = new Set<string>();
  private bridgeBuilt = false;

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
    this.restoreFromState();
  }

  update() {
    this.handleMovement();
  }

  /**
   * After map + collisions are set up, apply any previously saved progress
   * (open gate, build bridge) so the world matches the loaded save state.
   */
  private restoreFromState() {
    const state = this.getState();

    if (state.gateUnlocked) {
      this.openGate();
    }

    if (state.bridgeBuilt) {
      this.bridgeBuilt = true;
      for (const col of [28, 29, 30]) {
        setTileAt(this.tilemapData, col, 10, TILE_IDS.path);
        setTileAt(this.tilemapData, col, 11, TILE_IDS.path);
        setTileAt(this.tilemapData, col, 12, TILE_IDS.path);
      }
    }

    // Shrine visits — mark any shrine whose commands are already unlocked
    const unlocked = new Set(state.unlockedCommands);
    for (const shrine of SHRINES) {
      if (shrine.unlock.length > 0 && shrine.unlock.every((c) => unlocked.has(c))) {
        this.shrineVisits.add(shrine.title);
      }
    }
  }

  private buildWorld() {
    // Create tilemap using the new system
    this.tilemapData = createOverworldTilemap(this);

    // ── Area label ────────────────────────────────────────────────────────────
    this.add.text(5 * TILE_SIZE, 4 * TILE_SIZE, 'Cursor Meadow', {
      fontFamily: 'Courier New',
      fontSize: '24px',
      color: '#f1fa8c',
    });

    // ── Signposts / directional hints ─────────────────────────────────────────
    const signStyle = (color = '#e2f0cb') => ({
      fontFamily: 'Courier New',
      fontSize: '13px',
      color,
      backgroundColor: '#0d1f0f',
      padding: { x: 6, y: 3 },
    });

    // Near spawn — point toward Word Shrine (east on row 6)
    this.add.text(5 * TILE_SIZE, 7 * TILE_SIZE, '► Word Shrine: w b  →', signStyle('#f1fa8c'));

    // Near the vertical path — point toward Line Shrine (south)
    this.add.text(10 * TILE_SIZE, 12 * TILE_SIZE, '▼ Line Shrine: 0 $', signStyle('#8ecae6'));

    // Southern corridor entry — point toward Operator Shrine (east)
    this.add.text(10 * TILE_SIZE, 21 * TILE_SIZE, '► Operator Shrine: x  →', signStyle('#ffb3c1'));

    // Crate area sign
    this.add.text(42 * TILE_SIZE, 15 * TILE_SIZE, '► Break crates with x\n  (3 to unlock the gate)', signStyle('#f8f9fa'));

    // Console area sign
    this.add.text(21 * TILE_SIZE, 8 * TILE_SIZE, '▼ River Console\n  Press i to build bridge', signStyle('#a8dadc'));

    // Flag label
    this.add.text(27 * TILE_SIZE, 3 * TILE_SIZE, '★ Level 1 Flag ★', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#f1c40f',
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
    this.checkFlag();
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
          hint: 'The gate wall blocks your path! Destroy all 3 crates with x to open it.' 
        });
        this.showToast('Gate wall locked — break the crates with x first!');
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

  private checkFlag() {
    const state = this.getState();
    if (state.level1Complete) return;

    const tile = getTileAt(this.tilemapData, this.player.x, this.player.y);
    if (tile.x === FLAG_POSITION.x && tile.y === FLAG_POSITION.y) {
      // Check if player has unlocked the gate before allowing flag capture
      if (!state.gateUnlocked) {
        this.syncState({ hint: 'The path is blocked! Destroy all 3 crates with x to proceed.' });
        this.showToast('Path blocked — break the crates with x first!');
        return;
      }
      
      this.triggerWin();
    }
  }

  private triggerWin() {
    this.syncState({
      level1Complete: true,
      hint: 'LEVEL 1 COMPLETE! You have mastered the cursor commands. Well done!',
    });

    // Stop player movement
    this.player.setVelocity(0, 0);
    this.player.setActive(false);

    // Confetti burst
    for (let i = 0; i < 60; i++) {
      this.spawnConfetti();
    }

    // Win overlay — dark backdrop
    const cx = this.cameras.main.scrollX + this.cameras.main.width / 2 / this.cameras.main.zoom;
    const cy = this.cameras.main.scrollY + this.cameras.main.height / 2 / this.cameras.main.zoom;

    const overlay = this.add.rectangle(cx, cy, 520, 260, 0x061008, 0.92)
      .setDepth(50)
      .setStrokeStyle(3, 0xf1c40f, 1);

    this.add.text(cx, cy - 80, '🏆 LEVEL 1 COMPLETE! 🏆', {
      fontFamily: 'Courier New',
      fontSize: '26px',
      color: '#f1c40f',
      align: 'center',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(cx, cy - 30, 'You mastered all cursor commands:', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#c8f7dc',
      align: 'center',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(cx, cy + 10, 'h  j  k  l  w  b  0  $  x  i', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#7aff7a',
      align: 'center',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(cx, cy + 55, 'Press R to play again', {
      fontFamily: 'Courier New',
      fontSize: '15px',
      color: '#8892a0',
      align: 'center',
    }).setOrigin(0.5).setDepth(51);

    // Pulse the overlay
    this.tweens.add({
      targets: overlay,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // R to restart
    this.input.keyboard?.once('keydown-R', () => {
      clearSavedState();
      this.scene.restart();
      this.registry.set('gameState', null);
    });
  }

  private spawnConfetti() {
    const colors = [0xf1c40f, 0x2ecc71, 0xe74c3c, 0x00d4ff, 0xff6b6b, 0xf39c12, 0xa29bfe];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const px = this.player.x + Phaser.Math.Between(-80, 80);
    const py = this.player.y + Phaser.Math.Between(-60, 20);

    const piece = this.add.rectangle(
      px, py,
      Phaser.Math.Between(5, 12),
      Phaser.Math.Between(5, 12),
      color,
    ).setDepth(45).setAngle(Phaser.Math.Between(0, 360));

    this.tweens.add({
      targets: piece,
      x: px + Phaser.Math.Between(-120, 120),
      y: py + Phaser.Math.Between(60, 200),
      angle: piece.angle + Phaser.Math.Between(-180, 180),
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: Phaser.Math.Between(900, 1800),
      ease: 'Quad.easeOut',
      onComplete: () => piece.destroy(),
    });
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
        // Animate crate destruction
        const crateImage = this.tilemapData.tileImages.get(`${x},${y}`);
        if (crateImage) {
          this.cameras.main.shake(120, 0.006);
          this.tweens.add({
            targets: crateImage,
            scaleX: 0,
            scaleY: 0,
            angle: 45,
            alpha: 0,
            duration: 220,
            ease: 'Back.easeIn',
            onComplete: () => {
              crateImage.setScale(1).setAlpha(1).setAngle(0);
              setTileAt(this.tilemapData, x, y, TILE_IDS.path);
            },
          });
        } else {
          setTileAt(this.tilemapData, x, y, TILE_IDS.path);
        }

        // Increment crate destruction counter
        const state = this.getState();
        const newCount = state.cratesDestroyed + 1;

        // Check if all 3 crates are destroyed
        if (newCount >= 3) {
          this.syncState({
            cratesDestroyed: newCount,
            gateUnlocked: true,
            hint: 'All crates destroyed! The gate to Wave 1 is now open. You found the i command!',
          });
          this.showToast('All crates broken! Gate unlocked! Found i command!');
          this.openGate();

          // Unlock the 'i' command as a reward
          const unlocked = new Set(state.unlockedCommands);
          unlocked.add('i');
          this.syncState({
            unlockedCommands: Array.from(unlocked),
          });
        } else {
          this.syncState({
            cratesDestroyed: newCount,
            hint: `Crate destroyed (${newCount}/3). Destroy all crates to unlock the gate.`,
          });
          this.showToast('Crate removed with x');
        }
        return;
      }
    }

    this.syncState({ hint: 'Nothing breakable is next to you.' });
  }

  /**
   * Remove the gate wall tiles when all crates have been destroyed,
   * opening the physical passage east of the Wave 1 Gate shrine.
   */
  private openGate() {
    for (const { x, y } of GATE_WALL_TILES) {
      setTileAt(this.tilemapData, x, y, TILE_IDS.path);
    }
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

    if (this.bridgeBuilt) {
      this.syncState({ hint: 'Bridge already built. Cross the river to reach the flag.' });
      return;
    }

    this.bridgeBuilt = true;
    // Activate bridge - 3 tiles wide (cols 28-30) across the full river (rows 10-12)
    for (const col of [28, 29, 30]) {
      setTileAt(this.tilemapData, col, 10, TILE_IDS.path);
      setTileAt(this.tilemapData, col, 11, TILE_IDS.path);
      setTileAt(this.tilemapData, col, 12, TILE_IDS.path);
    }
    this.syncState({ bridgeBuilt: true, hint: 'Bridge activated. Cross the river to reach the Wave 1 gate.' });
    this.showToast('Insert console activated the bridge');
  }

  private setMode(mode: VimMode) {
    this.syncState({ mode });
    if (mode === 'insert') {
      this.player.setTint(0x88ccff);
    } else {
      this.player.clearTint();
    }
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
    saveState(nextState);
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
