import Phaser from 'phaser';
import { audioManager } from '../game/audio';
import { TILE_SIZE } from '../game/config';
import {
  CONSOLE_POSITION,
  createOverworldTilemap,
  createTileCollisions,
  DUNGEON_ENTRANCE_POSITION,
  FLAG_POSITION,
  GATE_WALL_TILES,
  getTileAt,
  MARKER_POINTS,
  MARKER_ROW_Y,
  NPC_MENTOR_POSITION,
  setTileAt,
  SHRINES,
  TILE_IDS,
  TilemapData,
} from '../systems/tilemap';
import { GameState, REGISTRY_KEYS, VimMode, saveState, clearSavedState } from '../game/state';

// ─── NPC Mentor dialogue lines ────────────────────────────────────────────────

const MENTOR_DIALOGUES: string[][] = [
  // First meeting
  [
    'Welcome, Traveller. I am the Vim Mentor.',
    'This land is shaped by the ancient keys of movement.',
    '',
    'You begin with the four cardinal commands:',
    '  h ← left     l → right',
    '  j ↓ down      k ↑ up',
    '',
    'North of here lies the Cursor Shrine — enter and',
    'prove your mastery to unlock new abilities.',
    '',
    '[Press Space or Enter to continue]',
  ],
  // Second visit
  [
    'The shrines scattered across the meadow teach',
    'new commands when you walk upon them.',
    '',
    'The Word Shrine grants  w  and  b  — jump by word.',
    'The Line Shrine grants  0  and  $  — snap to line ends.',
    'The Operator Shrine grants  x  — delete / break.',
    '',
    'Find them, use them, master them.',
    '',
    '[Press Space or Enter to close]',
  ],
  // Third visit (relic already found)
  [
    'You have found the Movement Mastery Relic.',
    'The cursor flows through you now.',
    '',
    'Cross the river with  i  at the console.',
    'Break the crates. Reach the flag. Your journey',
    'through Cursor Meadow nears its end.',
    '',
    '[Press Space or Enter to close]',
  ],
];

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: { [key: string]: Phaser.Input.Keyboard.Key };
  private tilemapData!: TilemapData;
  private shrineVisits = new Set<string>();
  private bridgeBuilt = false;

  // NPC state
  private npcSprite!: Phaser.GameObjects.Image;
  private npcLabel!: Phaser.GameObjects.Text;
  private npcPrompt!: Phaser.GameObjects.Text;
  private mentorVisitCount = 0;
  private dialogueBox?: Phaser.GameObjects.Container;
  private dialogueActive = false;
  private introOverlayActive = false;
  private consoleGlow!: Phaser.GameObjects.Rectangle;
  private consolePrompt!: Phaser.GameObjects.Text;

  // Dungeon entrance glow + transition guard
  private dungeonGlow!: Phaser.GameObjects.Rectangle;
  private enteringDungeon = false;
  private dungeonEntranceLockedUntilExitTile = false;

  constructor() {
    super('world');
  }

  create() {
    this.dialogueActive = false;
    this.dialogueBox = undefined;
    this.enteringDungeon = false;
    this.dungeonEntranceLockedUntilExitTile = false;

    // When this scene wakes after dungeon exit, reset transition guard
    this.events.on('wake', () => {
      this.enteringDungeon = false;
      this.dungeonEntranceLockedUntilExitTile = true;
      // Fade back in
      this.cameras.main.fadeIn(350, 0, 0, 0);
    });

    this.buildWorld();
    this.createPlayer();
    this.createCollisions();
    this.createNPC();
    this.createConsoleBeacon();
    this.createDungeonEntrance();
    this.createInput();

    const state = this.getState();
    audioManager.setMuted(state.audioMuted);
    void audioManager.resume(this).then(() => {
      audioManager.startOverworldLoop(this);
    });
    this.syncState({
      areaName: 'Cursor Meadow',
      hint: state.mentorMet
        ? 'Return to the Cursor Shrine or explore the shrines in the meadow.'
        : 'Speak to the Mentor near spawn. Walk close and press Space or Enter.',
    });
    this.restoreFromState();

    if (!state.introSeen) {
      this.showIntroOverlay();
    }
  }

  update() {
    if (this.dialogueActive) {
      this.player.setVelocity(0, 0);
      return;
    }
    this.handleMovement();
    this.checkDungeonEntrance();
    this.checkNPCProximity();
    this.checkConsoleProximity();
  }

  // ─── World building ───────────────────────────────────────────────────────

  private buildWorld() {
    this.tilemapData = createOverworldTilemap(this);

    this.add.text(5 * TILE_SIZE, 4 * TILE_SIZE, 'Cursor Meadow', {
      fontFamily: 'Palatino Linotype',
      fontSize: '24px',
      color: '#fff7df',
      stroke: '#5a6fc3',
      strokeThickness: 5,
    });

    const signStyle = (color = '#4f4538') => ({
      fontFamily: 'Courier New',
      fontSize: '13px',
      color,
      backgroundColor: '#f4efe2',
      stroke: '#ffffff',
      strokeThickness: 1,
      padding: { x: 6, y: 3 },
    });

    // Near spawn
    this.add.text(5 * TILE_SIZE, 7 * TILE_SIZE, '► Word Shrine: w b  →', signStyle('#6d5c34'));
    // Dungeon entrance label
    this.add.text(
      DUNGEON_ENTRANCE_POSITION.x * TILE_SIZE - 10,
      (DUNGEON_ENTRANCE_POSITION.y - 1) * TILE_SIZE,
      '▼ Cursor Shrine',
      signStyle('#5c5ea3'),
    );
    // Path south
    this.add.text(10 * TILE_SIZE, 12 * TILE_SIZE, '▼ Line Shrine: 0 $', signStyle('#52627c'));
    this.add.text(10 * TILE_SIZE, 21 * TILE_SIZE, '► Operator Shrine: x  →', signStyle('#7f4f43'));
    this.add.text(42 * TILE_SIZE, 15 * TILE_SIZE, '► Break crates with x\n  (3 to unlock the gate)', signStyle('#544637'));
    this.add.text(21 * TILE_SIZE, 8 * TILE_SIZE, '▼ River Console\n  Press i to build bridge', signStyle('#46616c'));
    this.add.text(27 * TILE_SIZE, 3 * TILE_SIZE, '★ Level 1 Flag ★', {
      fontFamily: 'Palatino Linotype',
      fontSize: '18px',
      color: '#fff1b2',
      stroke: '#6f5933',
      strokeThickness: 4,
    });

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
    createTileCollisions(this, this.tilemapData, this.player);
  }

  // ─── NPC Mentor ───────────────────────────────────────────────────────────

  private createNPC() {
    const nx = NPC_MENTOR_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
    const ny = NPC_MENTOR_POSITION.y * TILE_SIZE + TILE_SIZE / 2;

    this.npcSprite = this.add.image(nx, ny, 'tile-npc').setDepth(5);

    this.npcLabel = this.add
      .text(nx, ny - TILE_SIZE, 'MENTOR', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#634734',
        backgroundColor: '#f5ecdb',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(6);

    // Interaction prompt — shown when nearby
    this.npcPrompt = this.add
      .text(nx, ny - TILE_SIZE * 1.6, '[Space] Talk', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#5f513c',
        backgroundColor: '#f5ecdb',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setVisible(false);

    // Bob animation
    this.tweens.add({
      targets: [this.npcSprite, this.npcLabel],
      y: '-=4',
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private checkNPCProximity() {
    const nx = NPC_MENTOR_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
    const ny = NPC_MENTOR_POSITION.y * TILE_SIZE + TILE_SIZE / 2;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nx, ny);
    const near = dist < TILE_SIZE * 2;
    this.npcPrompt.setVisible(near);
  }

  private createConsoleBeacon() {
    const cx = CONSOLE_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = CONSOLE_POSITION.y * TILE_SIZE + TILE_SIZE / 2;

    this.consoleGlow = this.add
      .rectangle(cx, cy, TILE_SIZE + 12, TILE_SIZE + 12, 0x8ad7e8, 0.2)
      .setDepth(2);

    this.consolePrompt = this.add
      .text(cx, cy - TILE_SIZE * 1.2, '[i] Build bridge', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#31515a',
        backgroundColor: '#e7f7fb',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setVisible(false);

    this.tweens.add({
      targets: this.consoleGlow,
      alpha: 0.55,
      scaleX: 1.18,
      scaleY: 1.18,
      duration: 850,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.refreshConsoleBeacon();
  }

  private checkConsoleProximity() {
    const cx = CONSOLE_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = CONSOLE_POSITION.y * TILE_SIZE + TILE_SIZE / 2;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cx, cy);
    const near = dist < TILE_SIZE * 2.2;
    this.consolePrompt.setVisible(near);
  }

  private refreshConsoleBeacon() {
    const state = this.getState();
    const hasInsert = state.unlockedCommands.includes('i');

    if (state.bridgeBuilt) {
      this.consoleGlow.setFillStyle(0x88ccff, 0.14);
      this.consolePrompt.setText('Bridge active');
      return;
    }

    if (hasInsert) {
      this.consoleGlow.setFillStyle(0x8ad7e8, 0.2);
      this.consolePrompt.setText('[i] Build bridge');
      return;
    }

    this.consoleGlow.setFillStyle(0xa4edf0, 0.16);
    this.consolePrompt.setText('River Console');
  }

  private talkToMentor() {
    const state = this.getState();
    const visitIndex = Math.min(
      this.mentorVisitCount,
      state.masteryRelicFound ? 2 : 1,
    );
    const lines = MENTOR_DIALOGUES[visitIndex] ?? MENTOR_DIALOGUES[0];

    this.mentorVisitCount++;
    if (!state.mentorMet) {
      this.syncState({ mentorMet: true });
    }

    this.showDialogue('Vim Mentor', lines);
  }

  // ─── Dungeon entrance ─────────────────────────────────────────────────────

  private createDungeonEntrance() {
    const dx = DUNGEON_ENTRANCE_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
    const dy = DUNGEON_ENTRANCE_POSITION.y * TILE_SIZE + TILE_SIZE / 2;

    // Pulsing glow rectangle behind the entrance tile
    this.dungeonGlow = this.add
      .rectangle(dx, dy, TILE_SIZE + 10, TILE_SIZE + 10, 0xc3cbff, 0.45)
      .setDepth(1);

    this.tweens.add({
      targets: this.dungeonGlow,
      alpha: 0.7,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private checkDungeonEntrance() {
    if (this.enteringDungeon) return;
    const tile = getTileAt(this.tilemapData, this.player.x, this.player.y);
    const onEntranceTile =
      tile.x === DUNGEON_ENTRANCE_POSITION.x &&
      tile.y === DUNGEON_ENTRANCE_POSITION.y;

    if (this.dungeonEntranceLockedUntilExitTile) {
      if (!onEntranceTile) {
        this.dungeonEntranceLockedUntilExitTile = false;
      }
      return;
    }

    if (
      onEntranceTile
    ) {
      this.enterDungeon();
    }
  }

  private enterDungeon() {
    this.enteringDungeon = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.sleep('world');
      this.scene.launch('dungeon');
    });
  }

  // ─── Dialogue box ─────────────────────────────────────────────────────────

  private showDialogue(speaker: string, lines: string[]) {
    this.dialogueActive = true;
    this.introOverlayActive = false;
    audioManager.playSfx(this, 'dialogueOpen');
    if (this.dialogueBox) this.dialogueBox.destroy();

    const boxW = 700;
    const boxH = 210;

    // Position relative to camera
    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    const zoom = this.cameras.main.zoom;
    const viewW = this.cameras.main.width / zoom;
    const viewH = this.cameras.main.height / zoom;

    const boxX = camX + (viewW - boxW) / 2;
    const boxY = camY + viewH - boxH - 20;

    const container = this.add.container(0, 0).setDepth(50);

    const bg = this.add.rectangle(
      boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0xf4efe2, 0.97,
    ).setStrokeStyle(3, 0xd2c8b1, 1);
    container.add(bg);

    const speakerText = this.add.text(boxX + 16, boxY + 12, `[ ${speaker} ]`, {
      fontFamily: 'Palatino Linotype', fontSize: '15px', color: '#6b5338', fontStyle: 'bold',
    });
    container.add(speakerText);

    const bodyText = this.add.text(boxX + 16, boxY + 36, lines.join('\n'), {
      fontFamily: 'Courier New', fontSize: '13px', color: '#4b4238',
      lineSpacing: 3, wordWrap: { width: boxW - 32 },
    });
    container.add(bodyText);

    this.dialogueBox = container;

    this.tweens.add({
      targets: bg, strokeAlpha: 0.3, duration: 800, yoyo: true, repeat: -1,
    });
  }

  private closeDialogue() {
    this.dialogueActive = false;
    this.introOverlayActive = false;
    audioManager.playSfx(this, 'dialogueClose');
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueBox = undefined;
    }
  }

  private showIntroOverlay() {
    this.syncState({
      introSeen: true,
      hint: 'Move with h j k l, then speak to the Mentor near spawn.',
    });

    this.introOverlayActive = true;
    this.showDialogue('Cursor Primer', [
      'You are the cursor.',
      '',
      'Move with the four cardinal keys:',
      '  h ← left     l → right',
      '  j ↓ down      k ↑ up',
      '',
      'Walk the meadow. Then speak to the Mentor nearby.',
      '',
      '[Press any key to begin]',
    ]);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

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
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (this.introOverlayActive) {
        event.preventDefault();
        this.closeDialogue();
        return;
      }
      if (event.key === 'i' || event.key === 'I') {
        this.handleInsertAction();
      }
      if (event.key === '$') {
        this.handleLineSnap('end');
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.introOverlayActive) {
        this.closeDialogue();
        return;
      }
      if (this.dialogueActive) {
        this.closeDialogue();
      } else {
        this.setMode('normal');
      }
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.introOverlayActive) {
        this.closeDialogue();
        return;
      }
      if (this.dialogueActive) {
        this.closeDialogue();
        return;
      }
      // Check NPC proximity
      const nx = NPC_MENTOR_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
      const ny = NPC_MENTOR_POSITION.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nx, ny);
      if (dist < TILE_SIZE * 2) {
        this.talkToMentor();
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.introOverlayActive) {
        this.closeDialogue();
        return;
      }
      if (this.dialogueActive) {
        this.closeDialogue();
        return;
      }
      // Also allow Enter to talk to NPC
      const nx = NPC_MENTOR_POSITION.x * TILE_SIZE + TILE_SIZE / 2;
      const ny = NPC_MENTOR_POSITION.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, nx, ny);
      if (dist < TILE_SIZE * 2) {
        this.talkToMentor();
      }
    });
    this.input.keyboard?.on('keydown-R', () => {
      clearSavedState();
      this.scene.restart();
      this.registry.set('gameState', null);
    });
  }

  // ─── Restore state ────────────────────────────────────────────────────────

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

    const unlocked = new Set(state.unlockedCommands);
    for (const shrine of SHRINES) {
      if (shrine.unlock.length > 0 && shrine.unlock.every((c) => unlocked.has(c))) {
        this.shrineVisits.add(shrine.title);
      }
    }

    this.refreshConsoleBeacon();
  }

  // ─── Movement & tile checks ───────────────────────────────────────────────

  private handleMovement() {
    const state = this.getState();
    const speed = state.mode === 'insert' ? 120 : 180;
    let vx = 0;
    let vy = 0;

    if (this.cursors.h.isDown) { vx = -speed; }
    else if (this.cursors.l.isDown) { vx = speed; }

    if (this.cursors.k.isDown) { vy = -speed; }
    else if (this.cursors.j.isDown) { vy = speed; }

    this.player.setVelocity(vx, vy);
    this.checkShrines();
    this.checkFlag();
  }

  private checkShrines() {
    const { x, y } = getTileAt(this.tilemapData, this.player.x, this.player.y);
    const shrine = SHRINES.find((entry) => entry.x === x && entry.y === y);
    if (!shrine || this.shrineVisits.has(shrine.title)) return;

    if (shrine.title === 'Wave 1 Gate') {
      const state = this.getState();
      if (!state.gateUnlocked) {
        this.syncState({ hint: 'The gate wall blocks your path! Destroy all 3 crates with x to open it.' });
        this.showToast('Gate wall locked — break the crates with x first!');
        return;
      }
    }

    this.shrineVisits.add(shrine.title);
    const state = this.getState();
    const unlocked = new Set(state.unlockedCommands);
    for (const command of shrine.unlock) { unlocked.add(command); }

    this.syncState({ unlockedCommands: Array.from(unlocked), hint: shrine.hint });
    this.refreshConsoleBeacon();
    audioManager.playSfx(this, 'unlock');

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
    audioManager.playSfx(this, 'win');

    this.player.setVelocity(0, 0);
    this.player.setActive(false);

    for (let i = 0; i < 60; i++) { this.spawnConfetti(); }

    const cx = this.cameras.main.scrollX + this.cameras.main.width / 2 / this.cameras.main.zoom;
    const cy = this.cameras.main.scrollY + this.cameras.main.height / 2 / this.cameras.main.zoom;

    const overlay = this.add.rectangle(cx, cy, 520, 260, 0xf4efe2, 0.94)
      .setDepth(50)
      .setStrokeStyle(4, 0xd4b66d, 1);

    this.add.text(cx, cy - 80, '🏆 LEVEL 1 COMPLETE! 🏆', {
      fontFamily: 'Palatino Linotype', fontSize: '28px', color: '#705628', align: 'center', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(cx, cy - 30, 'You mastered all cursor commands:', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#5d4f40', align: 'center',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(cx, cy + 10, 'h  j  k  l  w  b  0  $  x  i', {
      fontFamily: 'Courier New', fontSize: '20px', color: '#7e5b2d', align: 'center',
    }).setOrigin(0.5).setDepth(51);

    this.add.text(cx, cy + 55, 'Press R to play again', {
      fontFamily: 'Courier New', fontSize: '15px', color: '#8a7e6d', align: 'center',
    }).setOrigin(0.5).setDepth(51);

    this.tweens.add({
      targets: overlay, scaleX: 1.02, scaleY: 1.02,
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private spawnConfetti() {
    const colors = [0xe0bf6a, 0x79d65c, 0xd06b4d, 0x6f89ea, 0xb55d52, 0xc89243, 0xb8bfef];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const px = this.player.x + Phaser.Math.Between(-80, 80);
    const py = this.player.y + Phaser.Math.Between(-60, 20);

    const piece = this.add.rectangle(px, py,
      Phaser.Math.Between(5, 12), Phaser.Math.Between(5, 12), color,
    ).setDepth(45).setAngle(Phaser.Math.Between(0, 360));

    this.tweens.add({
      targets: piece,
      x: px + Phaser.Math.Between(-120, 120),
      y: py + Phaser.Math.Between(60, 200),
      angle: piece.angle + Phaser.Math.Between(-180, 180),
      alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: Phaser.Math.Between(900, 1800),
      ease: 'Quad.easeOut',
      onComplete: () => piece.destroy(),
    });
  }

  // ─── Command actions ──────────────────────────────────────────────────────

  private handleWordJump(direction: 1 | -1) {
    if (!this.hasCommand(direction === 1 ? 'w' : 'b')) return;

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
    if (!this.hasCommand(command)) return;

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
    if (!this.hasCommand('x')) return;

    const neighbors = [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: 0, y: 1 }, { x: 0, y: -1 },
    ];
    const current = getTileAt(this.tilemapData, this.player.x, this.player.y);

    for (const offset of neighbors) {
      const x = current.x + offset.x;
      const y = current.y + offset.y;
      const tile = getTileAt(this.tilemapData, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);

      if (tile.id === TILE_IDS.crate) {
        const crateImage = this.tilemapData.tileImages.get(`${x},${y}`);
        if (crateImage) {
          this.cameras.main.shake(120, 0.006);
          this.tweens.add({
            targets: crateImage,
            scaleX: 0, scaleY: 0, angle: 45, alpha: 0,
            duration: 220, ease: 'Back.easeIn',
            onComplete: () => {
              crateImage.setScale(1).setAlpha(1).setAngle(0);
              setTileAt(this.tilemapData, x, y, TILE_IDS.path);
            },
          });
        } else {
          setTileAt(this.tilemapData, x, y, TILE_IDS.path);
        }

        const state = this.getState();
        const newCount = state.cratesDestroyed + 1;

        if (newCount >= 3) {
          this.syncState({
            cratesDestroyed: newCount, gateUnlocked: true,
            hint: 'All crates destroyed! The gate to Wave 1 is now open. You found the i command!',
          });
          audioManager.playSfx(this, 'unlock');
          this.showToast('All crates broken! Gate unlocked! Found i command!');
          this.openGate();

          const unlocked = new Set(state.unlockedCommands);
          unlocked.add('i');
          this.syncState({ unlockedCommands: Array.from(unlocked) });
          this.refreshConsoleBeacon();
        } else {
          this.syncState({
            cratesDestroyed: newCount,
            hint: `Crate destroyed (${newCount}/3). Destroy all crates to unlock the gate.`,
          });
          audioManager.playSfx(this, 'crate');
          this.showToast('Crate removed with x');
        }
        return;
      }
    }

    this.syncState({ hint: 'Nothing breakable is next to you.' });
  }

  private openGate() {
    for (const { x, y } of GATE_WALL_TILES) {
      setTileAt(this.tilemapData, x, y, TILE_IDS.path);
    }
  }

  private handleInsertAction() {
    if (!this.hasCommand('i')) return;

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
    for (const col of [28, 29, 30]) {
      setTileAt(this.tilemapData, col, 10, TILE_IDS.path);
      setTileAt(this.tilemapData, col, 11, TILE_IDS.path);
      setTileAt(this.tilemapData, col, 12, TILE_IDS.path);
    }
    this.syncState({ bridgeBuilt: true, hint: 'Bridge activated. Cross the river to reach the Wave 1 gate.' });
    this.refreshConsoleBeacon();
    audioManager.playSfx(this, 'bridge');
    this.showToast('Insert console activated the bridge');
  }

  private setMode(mode: VimMode) {
    this.syncState({ mode });
    audioManager.playSfx(this, 'mode');
    if (mode === 'insert') { this.player.setTint(0x88ccff); }
    else { this.player.clearTint(); }
  }

  private hasCommand(command: string): boolean {
    const state = this.getState();
    if (state.unlockedCommands.includes(command)) return true;
    this.syncState({ hint: `Command locked: ${command} — find the shrine that teaches it.` });
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
        fontFamily: 'Courier New', fontSize: '14px',
        color: '#f1fa8c', backgroundColor: '#10211e',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: toast, y: toast.y - 24, alpha: 0,
      duration: 1400, ease: 'Sine.easeOut',
      onComplete: () => toast.destroy(),
    });
  }
}
