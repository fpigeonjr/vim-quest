/**
 * DungeonScene — Cursor Shrine Dungeon
 *
 * A 3-room dungeon that tests mastery of h j k l movement.
 *
 * Layout (per room):
 *  Room 1 (Entry): simple corridor with intro text, NPC Guardian
 *  Room 2 (Puzzle): navigate a maze using only h j k l past wall obstacles
 *  Room 3 (Mastery): reach the altar tile, claim the Movement Mastery relic
 *
 * Entry point: walk onto the dungeon entrance tile in WorldScene
 * Exit:        press Esc on the altar or step on the exit tile after relic collected
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '../game/config';
import { GameState, REGISTRY_KEYS, VimMode, saveState } from '../game/state';

// Dungeon tile IDs (local — reuses same texture keys as overworld)
const D = {
  wall:   'tile-wall',
  floor:  'tile-path',
  water:  'tile-water',
  shrine: 'tile-shrine',
  marker: 'tile-marker',
  exit:   'tile-console', // re-used as exit glyph
} as const;

const COLS = 25;
const ROWS = 20;

// Each room is COLS × ROWS in tile coordinates.
// Room offset = roomIndex * COLS (side-by-side layout, camera pans)

type Room = 0 | 1 | 2;

/** Puzzle room maze layout — 0 = floor, 1 = wall, 2 = shrine/altar, 3 = marker checkpoint */
const ROOM_MAPS: number[][][] = [
  // Room 0: Entry corridor
  (() => {
    const r: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    // Central corridor (cols 5–19, rows 2–17)
    for (let y = 2; y < 18; y++) for (let x = 5; x < 20; x++) r[y][x] = 0;
    // Altar niche at top
    r[2][12] = 2; // shrine tile
    // Exit at bottom
    r[17][12] = 3;
    return r;
  })(),

  // Room 1: h j k l maze
  (() => {
    const r: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    // Open floor
    for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) r[y][x] = 0;
    // Horizontal wall obstacles
    for (let x = 1; x < 18; x++) r[5][x] = 1;   // barrier row 5
    for (let x = 6; x < COLS - 1; x++) r[10][x] = 1; // barrier row 10
    for (let x = 1; x < 18; x++) r[15][x] = 1;  // barrier row 15
    // Gaps in barriers (force specific navigation)
    r[5][19]  = 0; // gap right end
    r[10][1]  = 0; // gap left end
    r[15][19] = 0; // gap right end
    // Marker checkpoints
    r[3][12] = 3;
    r[8][12]  = 3;
    r[13][12] = 3;
    // Altar at bottom
    r[17][12] = 2;
    return r;
  })(),

  // Room 2: Mastery altar room
  (() => {
    const r: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    // Grand chamber
    for (let y = 2; y < ROWS - 2; y++) for (let x = 3; x < COLS - 3; x++) r[y][x] = 0;
    // Altar at centre top
    r[3][12] = 2;
    // Four pillar walls
    for (let d = 0; d < 2; d++) {
      r[6][5 + d]  = 1; r[6][18 - d] = 1;
      r[11][5 + d] = 1; r[11][18 - d] = 1;
    }
    // Exit portal at bottom
    r[16][12] = 3;
    return r;
  })(),
];

/** Starting player tile per room */
const ROOM_STARTS: { x: number; y: number }[] = [
  { x: 12, y: 16 }, // Room 0: enter from bottom
  { x: 12, y: 18 }, // Room 1: enter from bottom
  { x: 12, y: 16 }, // Room 2: enter from bottom
];

export class DungeonScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: { [key: string]: Phaser.Input.Keyboard.Key };
  private currentRoom: Room = 0;
  private tileImages: Map<string, Phaser.GameObjects.Image> = new Map();
  private colliderGroup!: Phaser.Physics.Arcade.StaticGroup;
  private dialogueBox?: Phaser.GameObjects.Container;
  private dialogueActive = false;
  private relicCollected = false;
  private roomLabel!: Phaser.GameObjects.Text;
  private toastGroup: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('dungeon');
  }

  create() {
    this.cameras.main.setBackgroundColor('#050d0c');
    // Fade in from black when dungeon launches
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.currentRoom = 0;

    const state = this.getState();
    this.relicCollected = state.masteryRelicFound;

    this.buildRoom(this.currentRoom);
    this.spawnPlayer(this.currentRoom);
    this.createInput();

    this.roomLabel = this.add
      .text(GAME_WIDTH / 2, 18, this.roomTitle(this.currentRoom), {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#f1fa8c',
        backgroundColor: '#050d0c',
        padding: { x: 12, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(30);

    // HUD: show dungeon context in UI scene
    this.syncState({
      areaName: 'Cursor Shrine',
      hint: 'Navigate the shrine using h j k l. Reach the altar.',
    });

    // Entrance dialogue on first visit
    if (!state.dungeonVisited) {
      this.time.delayedCall(400, () => {
        this.showDialogue(
          'Guardian',
          [
            'You have entered the Cursor Shrine.',
            'Only the four directional keys may open the path:',
            '  h ← left     l → right',
            '  j ↓ down      k ↑ up',
            'Navigate to the altar and claim the Movement Relic.',
            '',
            '[Press Space or Enter to continue]',
          ],
        );
      });
      this.syncState({ dungeonVisited: true });
    }
  }

  update() {
    if (this.dialogueActive) return;
    this.handleMovement();
    this.checkTileEvents();
  }

  // ─── Room building ────────────────────────────────────────────────────────

  private buildRoom(room: Room) {
    // Clear previous room tiles
    this.tileImages.forEach((img) => img.destroy());
    this.tileImages.clear();

    if (this.colliderGroup) this.colliderGroup.clear(true, true);
    this.colliderGroup = this.physics.add.staticGroup();

    const map = ROOM_MAPS[room];
    const offsetX = (GAME_WIDTH - COLS * TILE_SIZE) / 2;
    const offsetY = (GAME_HEIGHT - ROWS * TILE_SIZE) / 2 + 20;

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = map[y][x];
        const texture = this.cellTexture(cell);
        const wx = offsetX + x * TILE_SIZE + TILE_SIZE / 2;
        const wy = offsetY + y * TILE_SIZE + TILE_SIZE / 2;

        const img = this.add.image(wx, wy, texture).setDepth(0);
        this.tileImages.set(`${x},${y}`, img);

        if (cell === 1) {
          const body = this.colliderGroup.create(wx, wy, texture) as Phaser.Physics.Arcade.Sprite;
          body.setVisible(false);
          body.setActive(true);
          body.refreshBody();
        }
      }
    }
  }

  private cellTexture(cell: number): string {
    switch (cell) {
      case 0: return D.floor;
      case 1: return D.wall;
      case 2: return D.shrine;
      case 3: return D.marker;
      default: return D.floor;
    }
  }

  private roomTitle(room: Room): string {
    return [
      'Cursor Shrine — Room I: The Entry',
      'Cursor Shrine — Room II: The Maze',
      'Cursor Shrine — Room III: The Altar',
    ][room];
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  private spawnPlayer(room: Room) {
    const offsetX = (GAME_WIDTH - COLS * TILE_SIZE) / 2;
    const offsetY = (GAME_HEIGHT - ROWS * TILE_SIZE) / 2 + 20;
    const start = ROOM_STARTS[room];
    const wx = offsetX + start.x * TILE_SIZE + TILE_SIZE / 2;
    const wy = offsetY + start.y * TILE_SIZE + TILE_SIZE / 2;

    if (this.player) {
      this.player.setPosition(wx, wy);
      this.player.setVelocity(0, 0);
    } else {
      this.player = this.physics.add.sprite(wx, wy, 'player-cursor');
      this.player.setCollideWorldBounds(true);
      this.player.setDepth(10);
      this.player.setDrag(1400, 1400);
      this.player.setMaxVelocity(180, 180);
    }

    this.physics.add.collider(this.player, this.colliderGroup);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private createInput() {
    this.cursors = this.input.keyboard!.addKeys({
      h:   Phaser.Input.Keyboard.KeyCodes.H,
      j:   Phaser.Input.Keyboard.KeyCodes.J,
      k:   Phaser.Input.Keyboard.KeyCodes.K,
      l:   Phaser.Input.Keyboard.KeyCodes.L,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.dialogueActive) {
        this.closeDialogue();
      } else {
        this.exitDungeon();
      }
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.dialogueActive) this.closeDialogue();
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.dialogueActive) this.closeDialogue();
    });

    // R = reset + return to world
    this.input.keyboard?.on('keydown-R', () => {
      this.exitDungeon();
    });
  }

  private handleMovement() {
    const speed = 160;
    let vx = 0;
    let vy = 0;

    if (this.cursors.h?.isDown) vx = -speed;
    else if (this.cursors.l?.isDown) vx = speed;

    if (this.cursors.k?.isDown) vy = -speed;
    else if (this.cursors.j?.isDown) vy = speed;

    this.player.setVelocity(vx, vy);
  }

  // ─── Tile events ──────────────────────────────────────────────────────────

  private checkTileEvents() {
    const offsetX = (GAME_WIDTH - COLS * TILE_SIZE) / 2;
    const offsetY = (GAME_HEIGHT - ROWS * TILE_SIZE) / 2 + 20;

    const tx = Math.floor((this.player.x - offsetX) / TILE_SIZE);
    const ty = Math.floor((this.player.y - offsetY) / TILE_SIZE);

    const map = ROOM_MAPS[this.currentRoom];
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return;
    const cell = map[ty][tx];

    if (cell === 2) {
      // Shrine/altar tile
      this.handleAltarContact();
    } else if (cell === 3) {
      // Marker / door / exit
      this.handleMarkerContact(tx, ty);
    }
  }

  private _altarTriggered = false;
  private handleAltarContact() {
    if (this._altarTriggered) return;
    this._altarTriggered = true;

    if (this.currentRoom === 2 || this.currentRoom === 0) {
      if (!this.relicCollected) {
        this.collectRelic();
      } else {
        this.showToast('You have already claimed the Movement Relic.');
      }
    } else if (this.currentRoom === 1) {
      // Mid-maze shrine — encouragement
      this.showToast('Keep going — the altar is ahead!');
      this.time.delayedCall(300, () => { this._altarTriggered = false; });
    }
  }

  private _markerTriggered = false;
  private handleMarkerContact(tx: number, ty: number) {
    if (this._markerTriggered) return;
    this._markerTriggered = true;

    if (this.currentRoom === 0) {
      // Bottom of room 0 — advance to room 1
      this.time.delayedCall(100, () => {
        this.advanceRoom(1);
      });
    } else if (this.currentRoom === 1) {
      // Checkpoints in maze — flash feedback, not an exit
      this.showToast('Checkpoint — keep navigating!');
      this.time.delayedCall(600, () => { this._markerTriggered = false; });
    } else if (this.currentRoom === 2) {
      // Exit portal at bottom of altar room — return to overworld
      if (this.relicCollected) {
        this.time.delayedCall(200, () => this.exitDungeon());
      } else {
        this.showToast('Touch the altar first to claim the relic!');
        this.time.delayedCall(600, () => { this._markerTriggered = false; });
      }
    }
  }

  private advanceRoom(room: Room) {
    this._altarTriggered = false;
    this._markerTriggered = false;
    this.currentRoom = room;

    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.buildRoom(room);
      this.spawnPlayer(room);
      this.cameras.main.fadeIn(250, 0, 0, 0);
      this.roomLabel.setText(this.roomTitle(room));
      this.syncState({ hint: this.roomHint(room) });

      if (room === 2) {
        this.time.delayedCall(400, () => {
          this.showDialogue('Guardian', [
            'You have reached the Altar of Motion.',
            'Countless Vim travellers have stood here before you.',
            'Touch the shrine to claim the Movement Mastery Relic.',
            '',
            '[Press Space or Enter to continue]',
          ]);
        });
      }
    });
  }

  private roomHint(room: Room): string {
    return [
      'Navigate the entry with h j k l. Reach the lower marker.',
      'Navigate the maze — find the gaps in each barrier.',
      'You have reached the altar! Touch the shrine.',
    ][room] ?? '';
  }

  // ─── Relic collection ─────────────────────────────────────────────────────

  private collectRelic() {
    this.relicCollected = true;

    // Flash effect
    this.cameras.main.flash(500, 255, 215, 0);

    const state = this.getState();
    // Grant all tier-2 commands if not already unlocked
    const unlocked = new Set(state.unlockedCommands);
    const granted: string[] = [];
    for (const cmd of ['w', 'b', '0', '$']) {
      if (!unlocked.has(cmd)) { unlocked.add(cmd); granted.push(cmd); }
    }

    this.syncState({
      masteryRelicFound: true,
      unlockedCommands: Array.from(unlocked),
      hint: 'Movement Mastery Relic claimed! New commands unlocked. Step on the exit portal to leave.',
    });

    const grantText = granted.length > 0
      ? `New commands unlocked: ${granted.join(' ')}`
      : 'Your mastery is confirmed.';

    this.time.delayedCall(200, () => {
      this.showDialogue('Altar of Motion', [
        '★ MOVEMENT MASTERY RELIC ★',
        '',
        'You have proven your mastery of the cursor keys.',
        grantText,
        '',
        'The ancient power of h j k l flows through you.',
        'New paths in the Cursor Meadow will open.',
        '',
        '[Press Space or Enter to return to the meadow]',
      ], () => {
        // On dialogue close, auto-advance to exit prompt
        this.advanceRoom(2);
      });
    });
  }

  // ─── Dialogue box ─────────────────────────────────────────────────────────

  private _onDialogueClose?: () => void;

  private showDialogue(speaker: string, lines: string[], onClose?: () => void) {
    this.dialogueActive = true;
    this._onDialogueClose = onClose;

    if (this.dialogueBox) this.dialogueBox.destroy();

    const boxW = GAME_WIDTH - 80;
    const boxH = 220;
    const boxX = 40;
    const boxY = GAME_HEIGHT - boxH - 20;

    const container = this.add.container(0, 0).setDepth(50).setScrollFactor(0);

    const bg = this.add.rectangle(
      boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0x050d0c, 0.95,
    ).setStrokeStyle(2, 0xf1c40f, 1);
    container.add(bg);

    const speakerText = this.add.text(boxX + 16, boxY + 12, `[ ${speaker} ]`, {
      fontFamily: 'Courier New', fontSize: '14px', color: '#f1c40f', fontStyle: 'bold',
    });
    container.add(speakerText);

    const body = lines.join('\n');
    const bodyText = this.add.text(boxX + 16, boxY + 38, body, {
      fontFamily: 'Courier New', fontSize: '14px', color: '#e9f5db',
      lineSpacing: 4, wordWrap: { width: boxW - 32 },
    });
    container.add(bodyText);

    this.dialogueBox = container;

    // Pulse border
    this.tweens.add({
      targets: bg, strokeAlpha: 0.4, duration: 800, yoyo: true, repeat: -1,
    });
  }

  private closeDialogue() {
    this.dialogueActive = false;
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueBox = undefined;
    }
    const cb = this._onDialogueClose;
    this._onDialogueClose = undefined;
    if (cb) cb();
  }

  // ─── Exit ─────────────────────────────────────────────────────────────────

  private exitDungeon() {
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.syncState({
        areaName: 'Cursor Meadow',
        hint: this.relicCollected
          ? 'You returned from the Cursor Shrine. New commands are now available!'
          : 'Return to the Cursor Shrine to claim the Movement Relic.',
        mode: 'normal',
      });
      this.scene.stop('dungeon');
      this.scene.wake('world');
    });
  }

  // ─── Toast ────────────────────────────────────────────────────────────────

  private showToast(text: string) {
    const toast = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, text, {
        fontFamily: 'Courier New', fontSize: '14px',
        color: '#f1fa8c', backgroundColor: '#10211e',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScrollFactor(0);

    this.tweens.add({
      targets: toast, y: toast.y - 30, alpha: 0,
      duration: 1600, ease: 'Sine.easeOut',
      onComplete: () => toast.destroy(),
    });
  }

  // ─── State helpers ────────────────────────────────────────────────────────

  private getState(): GameState {
    return this.registry.get(REGISTRY_KEYS.state) as GameState;
  }

  private syncState(patch: Partial<GameState>) {
    const next = { ...this.getState(), ...patch };
    this.registry.set(REGISTRY_KEYS.state, next);
    saveState(next);
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  shutdown() {
    this.tileImages.forEach((img) => img.destroy());
    this.tileImages.clear();
    this.toastGroup.forEach((t) => t.destroy());
    this.toastGroup = [];
  }
}
