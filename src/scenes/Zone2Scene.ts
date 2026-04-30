import Phaser from 'phaser';

import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../game/config';
import { GameState, REGISTRY_KEYS, saveState } from '../game/state';
import { WordLaneSegment, ZONE2_WORD_WOODS_LAYOUT } from '../content/zone2WordWoods';
import { isSlashModalOpen, registerGlobalSlashPrompt } from '../systems/slashCommands';
import { TILE_IDS, tileTextureMap } from '../systems/tilemap';

type Zone2Tile = (typeof TILE_IDS)[keyof typeof TILE_IDS];

const MAP_BG = '#3e5f3f';

const ARRIVAL_DIALOGUE: string[][] = [
  [
    'Welcome to the Word Woods, traveller.',
    '',
    'Here, the ground itself is made of words.',
    'Walk the word-lanes and leap from stone to stone.',
    '',
    'Use  w  to jump forward to the next word.',
    'Use  b  to step back to the previous one.',
    '',
    'Clear the marker pads ahead to open the branching paths.',
    '',
    '[Press Space or Enter to continue]',
  ],
  [
    'The Word Woods have three trials for you:',
    '',
    '  1. Tutorial Lane — practise w and b on marker pads.',
    '  2. North Canopy & Root Backtrack — collect both branch tokens.',
    '  3. Echo Arbor — unlock the e command and reach the shrine.',
    '',
    'When you are ready, step onto the first word-lane.',
    '',
    '[Press Space or Enter to close]',
  ],
];

export class Zone2Scene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: { [key: string]: Phaser.Input.Keyboard.Key };
  private colliderGroup!: Phaser.Physics.Arcade.StaticGroup;
  private markerPads: Phaser.GameObjects.Sprite[] = [];
  private branchTokens: Phaser.GameObjects.Sprite[] = [];
  private zoneGates: Phaser.Physics.Arcade.Sprite[] = [];
  private lockFeedbackText?: Phaser.GameObjects.Text;
  private wordLaneMarkers: Phaser.GameObjects.Sprite[] = [];
  private currentLaneId?: string;
  private currentWaypointIndex = -1;
  private isJumping = false;
  private eShrineActivated = false;

  // Dialogue state
  private dialogueBox?: Phaser.GameObjects.Container;
  private dialogueActive = false;
  private introOverlayActive = false;
  private arrivalDialogueIndex = 0;

  constructor() {
    super('zone2');
  }

  create() {
    this.dialogueActive = false;
    this.dialogueBox = undefined;
    this.introOverlayActive = false;
    this.arrivalDialogueIndex = 0;

    this.cameras.main.setBackgroundColor(MAP_BG);
    this.buildZone2Map();
    this.createPlayer();
    this.createInput();
    this.addRegionLabels();
    this.addHudBanner();
    this.renderInteractiveElements();
    this.renderWordLaneMarkers();

    const state = this.getState();
    this.syncState({
      mode: 'normal',
      areaName: 'Word Woods',
      hint: 'Use w and b to leap along the word-lanes. Clear marker pads to open paths.',
    });

    if (!state.zone2Entered) {
      this.syncState({ zone2Entered: true });
      this.showArrivalDialogue();
    }
  }

  update() {
    if (this.dialogueActive || this.introOverlayActive) {
      this.player.setVelocity(0, 0);
      return;
    }
    if (this.isJumping) {
      this.player.setVelocity(0, 0);
      return;
    }
    if (isSlashModalOpen(this)) {
      this.player.setVelocity(0, 0);
      return;
    }
    this.handleMovement();
    this.checkMarkerPadOverlap();
    this.checkBranchTokenOverlap();
    this.checkZoneGateCollisions();
  }

  private buildZone2Map() {
    const {
      mapSize: { width, height },
      regions,
      collisionFeatures,
      arrivalCheckpoint,
      arrivalHintObelisk,
    } = ZONE2_WORD_WOODS_LAYOUT;

    const mapData: Zone2Tile[][] = Array.from({ length: height }, () => Array(width).fill(TILE_IDS.grass));

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          mapData[y][x] = TILE_IDS.wall;
        }
      }
    }

    for (const region of regions) {
      const { xMin, xMax, yMin, yMax } = region.bounds;
      for (let y = yMin; y <= yMax; y += 1) {
        for (let x = xMin; x <= xMax; x += 1) {
          mapData[y][x] = TILE_IDS.path;
        }
      }
    }

    for (const feature of collisionFeatures) {
      for (const tile of feature.tiles) {
        if (feature.kind === 'resetRail') {
          mapData[tile.y][tile.x] = TILE_IDS.bridge;
        } else {
          mapData[tile.y][tile.x] = TILE_IDS.marker;
        }
      }
    }

    mapData[arrivalCheckpoint.tile.y][arrivalCheckpoint.tile.x] = TILE_IDS.marker;
    mapData[arrivalHintObelisk.tile.y][arrivalHintObelisk.tile.x] = TILE_IDS.shrine;

    this.colliderGroup = this.physics.add.staticGroup();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const id = mapData[y][x];
        const texture = tileTextureMap[id] ?? tileTextureMap[TILE_IDS.grass];
        const wx = x * TILE_SIZE + TILE_SIZE / 2;
        const wy = y * TILE_SIZE + TILE_SIZE / 2;

        this.add.image(wx, wy, texture).setDepth(0);

        if (id === TILE_IDS.wall) {
          const body = this.colliderGroup.create(wx, wy, texture) as Phaser.Physics.Arcade.Sprite;
          body.setVisible(false);
          body.setActive(true);
          body.refreshBody();
        }
      }
    }

    this.physics.world.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
  }

  private createPlayer() {
    const { entryTile } = ZONE2_WORD_WOODS_LAYOUT;
    const x = entryTile.x * TILE_SIZE + TILE_SIZE / 2;
    const y = entryTile.y * TILE_SIZE + TILE_SIZE / 2;

    this.player = this.physics.add.sprite(x, y, 'player-cursor');
    this.player.setDepth(10);
    this.player.setDrag(1200, 1200);
    this.player.setMaxVelocity(220, 220);
    this.player.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.colliderGroup);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.2);
  }

  private createInput() {
    this.cursors = this.input.keyboard!.addKeys({
      h: Phaser.Input.Keyboard.KeyCodes.H,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      k: Phaser.Input.Keyboard.KeyCodes.K,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      b: Phaser.Input.Keyboard.KeyCodes.B,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      zero: Phaser.Input.Keyboard.KeyCodes.ZERO,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
    }) as { [key: string]: Phaser.Input.Keyboard.Key };

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
      }
      if (isSlashModalOpen(this)) return;
    });

    this.input.keyboard?.on('keydown-W', () => {
      if (isSlashModalOpen(this)) return;
      this.handleWordJump('w');
    });
    this.input.keyboard?.on('keydown-B', () => {
      if (isSlashModalOpen(this)) return;
      this.handleWordJump('b');
    });
    this.input.keyboard?.on('keydown-E', () => {
      if (isSlashModalOpen(this)) return;
      this.handleWordJump('e');
    });
    this.input.keyboard?.on('keydown-ZERO', () => {
      if (isSlashModalOpen(this)) return;
      this.handleAnchorSnap('start');
    });
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (isSlashModalOpen(this)) return;
      if (event.key === '$') {
        event.preventDefault();
        this.handleAnchorSnap('end');
      }
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      if (isSlashModalOpen(this)) return;
      if (this.introOverlayActive || this.dialogueActive) {
        this.closeDialogue();
        return;
      }
      this.syncState({
        mode: 'normal',
        areaName: 'Cursor Meadow',
        hint: 'Returned to Cursor Meadow from the Word Woods.',
      });
      this.scene.start('world');
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (isSlashModalOpen(this)) return;
      if (this.introOverlayActive || this.dialogueActive) {
        this.advanceArrivalDialogue();
        return;
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (isSlashModalOpen(this)) return;
      if (this.introOverlayActive || this.dialogueActive) {
        this.advanceArrivalDialogue();
        return;
      }
    });

    registerGlobalSlashPrompt(this);
  }

  private handleMovement() {
    if (this.isJumping) return;
    const speed = 180;
    let vx = 0;
    let vy = 0;

    if (this.cursors.h?.isDown) vx = -speed;
    else if (this.cursors.l?.isDown) vx = speed;

    if (this.cursors.k?.isDown) vy = -speed;
    else if (this.cursors.j?.isDown) vy = speed;

    this.player.setVelocity(vx, vy);
  }

  private addRegionLabels() {
    for (const region of ZONE2_WORD_WOODS_LAYOUT.regions) {
      const centerX = ((region.bounds.xMin + region.bounds.xMax + 1) / 2) * TILE_SIZE;
      const centerY = ((region.bounds.yMin + region.bounds.yMax + 1) / 2) * TILE_SIZE;

      this.add
        .text(centerX, centerY, `${region.id}: ${region.name}`, {
          fontFamily: 'Courier New',
          fontSize: '14px',
          color: '#f6f4de',
          backgroundColor: '#2e3f31',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setDepth(20);
    }
  }

  private addHudBanner() {
    this.add
      .rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH - 20, 36, 0x243826, 0.92)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(40)
      .setStrokeStyle(2, 0x648061, 1);

    this.add
      .text(
        GAME_WIDTH / 2,
        8,
        'Word Woods (Zone 2)  ·  Move: h j k l  ·  Word jumps: w b e  ·  Anchor: 0 $  ·  Slash: /help',
        {
          fontFamily: 'Courier New',
          fontSize: '13px',
          color: '#f0ead2',
        },
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(41);

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 20,
        `Arrival checkpoint @ (${ZONE2_WORD_WOODS_LAYOUT.arrivalCheckpoint.tile.x}, ${ZONE2_WORD_WOODS_LAYOUT.arrivalCheckpoint.tile.y})`,
        {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#d5dfc1',
          backgroundColor: '#243826',
          padding: { x: 5, y: 2 },
        },
      )
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(41);
  }

  private getState(): GameState {
    return this.registry.get(REGISTRY_KEYS.state) as GameState;
  }

  private syncState(patch: Partial<GameState>) {
    const nextState = { ...this.getState(), ...patch };
    this.registry.set(REGISTRY_KEYS.state, nextState);
    saveState(nextState);
  }

  private hasCommand(command: string): boolean {
    const state = this.getState();
    if (state.unlockedCommands.includes(command)) return true;
    this.showFeedback(`Command locked: ${command} — find the shrine that teaches it.`, true);
    return false;
  }

  // ─── Word Jump Mechanics ────────────────────────────────────────────────────

  private handleWordJump(command: 'w' | 'b' | 'e') {
    if (!this.hasCommand(command)) return;
    if (this.isJumping) return;

    const playerTile = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    };

    // Find all lanes/waypoints near the player
    const matches = this.findAllLaneMatches(playerTile);
    if (matches.length === 0) {
      this.syncState({ hint: 'Word jumps only work on the word lanes. Look for the faint blue markers.' });
      return;
    }

    let target: { x: number; y: number } | null = null;

    if (command === 'w') {
      target = this.findForwardTarget(matches);
      if (!target) {
        this.syncState({ hint: 'End of the word lane. No more words forward.' });
        return;
      }
    } else if (command === 'b') {
      target = this.findBackwardTarget(matches);
      if (!target) {
        this.syncState({ hint: 'Start of the word lane. No more words backward.' });
        return;
      }
    } else if (command === 'e') {
      target = this.findEndTarget(matches);
      if (!target) {
        this.syncState({ hint: 'End of the word lane. No word end ahead.' });
        return;
      }
    }

    if (target) {
      this.performJump(target, command);
    }
  }

  private findAllLaneMatches(playerTile: { x: number; y: number }): Array<{ lane: WordLaneSegment; index: number; dist: number }> {
    const matches: Array<{ lane: WordLaneSegment; index: number; dist: number }> = [];
    for (const lane of ZONE2_WORD_WOODS_LAYOUT.wordLanes) {
      for (let i = 0; i < lane.waypoints.length; i++) {
        const wp = lane.waypoints[i];
        const dist = Math.abs(wp.x - playerTile.x) + Math.abs(wp.y - playerTile.y);
        if (dist <= 2) {
          matches.push({ lane, index: i, dist });
        }
      }
    }
    matches.sort((a, b) => a.dist - b.dist);
    return matches;
  }

  private findForwardTarget(matches: Array<{ lane: WordLaneSegment; index: number }>): { x: number; y: number } | null {
    // Prefer a lane where we can move forward within the same lane
    for (const match of matches) {
      if (match.index < match.lane.waypoints.length - 1) {
        return match.lane.waypoints[match.index + 1];
      }
    }
    // If at end of all matching lanes, try exit lanes
    for (const match of matches) {
      if (match.lane.exitsTo && match.lane.exitsTo.length > 0) {
        for (const exitId of match.lane.exitsTo) {
          const exitLane = ZONE2_WORD_WOODS_LAYOUT.wordLanes.find((l) => l.id === exitId);
          if (exitLane && exitLane.waypoints.length > 1) {
            // Skip the shared waypoint (first one) and go to the next
            return exitLane.waypoints[1];
          }
        }
      }
    }
    return null;
  }

  private findBackwardTarget(matches: Array<{ lane: WordLaneSegment; index: number }>): { x: number; y: number } | null {
    // Prefer a lane where we can move backward within the same lane
    for (const match of matches) {
      if (match.index > 0) {
        return match.lane.waypoints[match.index - 1];
      }
    }
    // If at start of all matching lanes, try entry lanes
    for (const match of matches) {
      if (match.lane.entryFrom) {
        const entryLane = ZONE2_WORD_WOODS_LAYOUT.wordLanes.find((l) => l.id === match.lane.entryFrom);
        if (entryLane && entryLane.waypoints.length > 1) {
          return entryLane.waypoints[entryLane.waypoints.length - 2];
        }
      }
    }
    return null;
  }

  private findEndTarget(matches: Array<{ lane: WordLaneSegment; index: number }>): { x: number; y: number } | null {
    // e jumps to midpoint between current and next waypoint
    for (const match of matches) {
      if (match.index < match.lane.waypoints.length - 1) {
        const current = match.lane.waypoints[match.index];
        const next = match.lane.waypoints[match.index + 1];
        return {
          x: Math.round((current.x + next.x) / 2),
          y: Math.round((current.y + next.y) / 2),
        };
      }
    }
    // Try exit lanes
    for (const match of matches) {
      if (match.lane.exitsTo && match.lane.exitsTo.length > 0) {
        for (const exitId of match.lane.exitsTo) {
          const exitLane = ZONE2_WORD_WOODS_LAYOUT.wordLanes.find((l) => l.id === exitId);
          if (exitLane && exitLane.waypoints.length > 1) {
            const current = exitLane.waypoints[0];
            const next = exitLane.waypoints[1];
            return {
              x: Math.round((current.x + next.x) / 2),
              y: Math.round((current.y + next.y) / 2),
            };
          }
        }
      }
    }
    return null;
  }

  private handleAnchorSnap(side: 'start' | 'end') {
    const command = side === 'start' ? '0' : '$';
    if (!this.hasCommand(command)) return;
    if (this.isJumping) return;

    const playerTile = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    };

    const laneMatch = this.findNearestLaneAndWaypoint(playerTile);
    if (!laneMatch) {
      this.syncState({ hint: 'Anchor snaps only work on word lanes.' });
      return;
    }

    const { lane } = laneMatch;
    const waypoints = lane.waypoints;
    const target = side === 'start' ? waypoints[0] : waypoints[waypoints.length - 1];

    this.performJump(target, command);
  }

  private findNearestLaneAndWaypoint(playerTile: { x: number; y: number }): { lane: WordLaneSegment; index: number } | null {
    const matches = this.findAllLaneMatches(playerTile);
    if (matches.length === 0) return null;
    return { lane: matches[0].lane, index: matches[0].index };
  }

  private performJump(targetTile: { x: number; y: number }, command: string) {
    // Check if target is behind a closed gate
    const gateBlock = this.getGateBlockAt(targetTile.x, targetTile.y);
    if (gateBlock) {
      this.showFeedback(gateBlock, true);
      this.isJumping = false;
      return;
    }

    this.isJumping = true;
    const targetX = targetTile.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = targetTile.y * TILE_SIZE + TILE_SIZE / 2;

    // Check for hazards at target
    const hazard = this.getHazardAt(targetTile.x, targetTile.y);
    if (hazard) {
      this.handleHazard(hazard, targetX, targetY);
      return;
    }

    // Check for e-shrine activation in Region D
    if (command === 'e' || command === 'w' || command === 'b') {
      this.checkEShrine(targetTile.x, targetTile.y);
    }

    // Tween the jump
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 180,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.isJumping = false;
        this.player.setVelocity(0, 0);
        this.checkMarkerPadAtTile(targetTile.x, targetTile.y);
        this.checkBranchTokenAtTile(targetTile.x, targetTile.y);
        this.syncState({ hint: this.jumpHint(command) });
      },
    });
  }

  private getGateBlockAt(x: number, y: number): string | null {
    const state = this.getState();
    // B→C1 gate at (34, 20)
    if (x === 34 && y === 20) {
      if (state.zone2TutorialPadsCleared < ZONE2_WORD_WOODS_LAYOUT.markerPads.length) {
        return 'Clear all 3 marker pads in Tutorial Lane first!';
      }
    }
    // B→C2 gate at (34, 36)
    if (x === 34 && y === 36) {
      if (state.zone2TutorialPadsCleared < ZONE2_WORD_WOODS_LAYOUT.markerPads.length) {
        return 'Clear all 3 marker pads in Tutorial Lane first!';
      }
    }
    // D gate at (62, 28)
    if (x === 62 && y === 28) {
      if (!state.hasCanopyToken || !state.hasRootToken) {
        const missing: string[] = [];
        if (!state.hasCanopyToken) missing.push('canopy token');
        if (!state.hasRootToken) missing.push('root token');
        return `Need ${missing.join(' and ')} to enter Echo Arbor!`;
      }
    }
    return null;
  }

  private jumpHint(command: string): string {
    const hints: Record<string, string> = {
      w: 'Word forward! w jumps to the next word start.',
      b: 'Word back! b jumps to the previous word start.',
      e: 'Word end! e jumps to the end of the current word.',
      '0': 'Line start! 0 snaps to the start of the lane.',
      $: 'Line end! $ snaps to the end of the lane.',
    };
    return hints[command] ?? 'Word jump complete.';
  }

  private getHazardAt(x: number, y: number): { kind: string; message: string } | null {
    for (const feature of ZONE2_WORD_WOODS_LAYOUT.collisionFeatures) {
      for (const tile of feature.tiles) {
        if (tile.x === x && tile.y === y) {
          if (feature.kind === 'deadBranch') {
            return { kind: 'deadBranch', message: 'Dead branch! You overshot into a punishing lane.' };
          }
          if (feature.kind === 'overshootLoop') {
            return { kind: 'overshootLoop', message: 'Overshoot loop! Use b to recover back to the main path.' };
          }
          if (feature.kind === 'resetRail') {
            return { kind: 'resetRail', message: 'Reset rail! You were sent back to the last checkpoint.' };
          }
        }
      }
    }
    return null;
  }

  private handleHazard(hazard: { kind: string; message: string }, targetX: number, targetY: number) {
    const state = this.getState();
    const checkpoint = ZONE2_WORD_WOODS_LAYOUT.arrivalCheckpoint;
    const respawnX = checkpoint.respawnTile.x * TILE_SIZE + TILE_SIZE / 2;
    const respawnY = checkpoint.respawnTile.y * TILE_SIZE + TILE_SIZE / 2;

    this.showFeedback(hazard.message, true);

    // Flash red
    this.cameras.main.flash(300, 200, 50, 50);

    // Tween to hazard position, then respawn
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 150,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(400, () => {
          this.player.setPosition(respawnX, respawnY);
          this.player.setVelocity(0, 0);
          this.isJumping = false;
          this.syncState({ hint: `Hazard! ${hazard.message} Respawned at checkpoint.` });
        });
      },
    });
  }

  private checkEShrine(x: number, y: number) {
    if (this.eShrineActivated) return;

    // The Echo Arbor shrine is in Region D, near the convergence point
    const shrineTile = { x: 68, y: 28 };
    if (x === shrineTile.x && y === shrineTile.y) {
      const state = this.getState();
      if (!state.unlockedCommands.includes('e')) {
        const unlocked = new Set(state.unlockedCommands);
        unlocked.add('e');
        this.syncState({
          unlockedCommands: Array.from(unlocked),
          hint: 'Echo Arbor shrine complete! Unlocked e — jump to word ends.',
        });
        this.showFeedback('★ Unlocked e — Word End! ★');
        this.eShrineActivated = true;
      }
    }
  }

  // ─── Interactive Elements ───────────────────────────────────────────────────

  private renderWordLaneMarkers() {
    for (const lane of ZONE2_WORD_WOODS_LAYOUT.wordLanes) {
      for (const wp of lane.waypoints) {
        const wx = wp.x * TILE_SIZE + TILE_SIZE / 2;
        const wy = wp.y * TILE_SIZE + TILE_SIZE / 2;
        const marker = this.add.sprite(wx, wy, 'tile-marker');
        marker.setTint(0xaaddff);
        marker.setAlpha(0.5);
        marker.setScale(0.5);
        marker.setDepth(3);
        this.wordLaneMarkers.push(marker);
      }
    }
  }

  private renderInteractiveElements() {
    this.renderMarkerPads();
    this.renderBranchTokens();
    this.createZoneGates();
    this.createLockFeedback();
  }

  private renderMarkerPads() {
    const state = this.getState();
    
    for (const pad of ZONE2_WORD_WOODS_LAYOUT.markerPads) {
      const wx = pad.tile.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = pad.tile.y * TILE_SIZE + TILE_SIZE / 2;
      
      // Check if this pad should already be cleared based on state
      const isCleared = state.zone2TutorialPadsCleared >= this.getPadIndex(pad.id) + 1;
      
      // Create sprite - using marker tile for now, could be custom texture
      const sprite = this.add.sprite(wx, wy, 'tile-marker');
      sprite.setDepth(5);
      
      // Add glow effect if cleared
      if (isCleared) {
        sprite.setTint(0x88ff88);
      } else {
        sprite.setTint(0xffffff);
      }
      
      this.markerPads.push(sprite);
    }
  }

  private renderBranchTokens() {
    const state = this.getState();
    
    for (const token of ZONE2_WORD_WOODS_LAYOUT.branchTokens) {
      // Skip if already collected
      if ((token.kind === 'canopy' && state.hasCanopyToken) ||
          (token.kind === 'root' && state.hasRootToken)) {
        continue;
      }
      
      const wx = token.tile.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = token.tile.y * TILE_SIZE + TILE_SIZE / 2;
      
      // Create token sprite
      const sprite = this.add.sprite(wx, wy, token.kind === 'canopy' ? 'tile-shrine' : 'tile-bridge');
      sprite.setTint(token.kind === 'canopy' ? 0x88aaff : 0xffaa88);
      sprite.setDepth(10);
      
      // Make it interactive
      sprite.setInteractive();
      this.physics.add.existing(sprite, false);
      
      this.branchTokens.push(sprite);
    }
  }

  private createZoneGates() {
    // Gate between B and C1 (north branch)
    const gateBtoC1 = this.createGateSprite(34, 20, 'B→C1 Gate');
    
    // Gate between B and C2 (south branch)  
    const gateBtoC2 = this.createGateSprite(34, 36, 'B→C2 Gate');
    
    // Gate to D (requires both tokens)
    const gateToD = this.createGateSprite(62, 28, 'D Gate');
    
    this.zoneGates.push(gateBtoC1, gateBtoC2, gateToD);
  }

  private createGateSprite(xTile: number, yTile: number, label: string): Phaser.Physics.Arcade.Sprite {
    const wx = xTile * TILE_SIZE + TILE_SIZE / 2;
    const wy = yTile * TILE_SIZE + TILE_SIZE / 2;
    
    const sprite = this.physics.add.sprite(wx, wy, 'tile-wall');
    sprite.setTint(0xff5555);
    sprite.setAlpha(0.7);
    sprite.setDepth(15);
    sprite.setImmovable(true);
    
    // Add label
    this.add.text(wx, wy - 20, label, {
      fontFamily: 'Courier New',
      fontSize: '10px',
      color: '#ffaaaa',
      backgroundColor: '#552222',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(16);
    
    return sprite;
  }

  private createLockFeedback() {
    this.lockFeedbackText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, '', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#ffaaaa',
      backgroundColor: '#552222',
      padding: { x: 10, y: 6 },
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(50)
    .setAlpha(0);
  }

  private getPadIndex(padId: string): number {
    const pads = ZONE2_WORD_WOODS_LAYOUT.markerPads;
    return pads.findIndex(p => p.id === padId);
  }

  private checkMarkerPadOverlap() {
    const tile = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    };
    this.checkMarkerPadAtTile(tile.x, tile.y);
  }

  private checkMarkerPadAtTile(tx: number, ty: number) {
    const state = this.getState();
    const padsCleared = state.zone2TutorialPadsCleared;

    for (let i = 0; i < this.markerPads.length; i++) {
      const sprite = this.markerPads[i];
      const pad = ZONE2_WORD_WOODS_LAYOUT.markerPads[i];

      // Skip if already cleared beyond this pad
      if (padsCleared > i) continue;

      // Check tile match
      if (tx === pad.tile.x && ty === pad.tile.y) {
        this.syncState({ zone2TutorialPadsCleared: padsCleared + 1 });
        sprite.setTint(0x88ff88);
        this.createClearedEffect(sprite.x, sprite.y);

        if (padsCleared + 1 === ZONE2_WORD_WOODS_LAYOUT.markerPads.length) {
          this.showFeedback('Tutorial Lane cleared! Branches are now open.');
          this.updateGates();
        } else {
          this.showFeedback(`Marker pad ${padsCleared + 1}/3 cleared`);
        }

        break;
      }
    }
  }

  private checkBranchTokenOverlap() {
    const tile = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    };
    this.checkBranchTokenAtTile(tile.x, tile.y);
  }

  private checkBranchTokenAtTile(tx: number, ty: number) {
    const state = this.getState();

    for (let i = this.branchTokens.length - 1; i >= 0; i--) {
      const sprite = this.branchTokens[i];
      const token = ZONE2_WORD_WOODS_LAYOUT.branchTokens[i];

      if (tx === token.tile.x && ty === token.tile.y) {
        const update: Partial<GameState> = {};
        if (token.kind === 'canopy') {
          update.hasCanopyToken = true;
          this.showFeedback('Canopy token collected!');
        } else {
          update.hasRootToken = true;
          this.showFeedback('Root token collected!');
        }
        this.syncState(update);

        this.createTokenCollectionEffect(sprite.x, sprite.y, token.kind);
        sprite.destroy();
        this.branchTokens.splice(i, 1);

        if (state.hasCanopyToken && state.hasRootToken) {
          this.showFeedback('Both branch tokens collected! Echo Arbor is now accessible.');
          this.updateGates();
        }

        break;
      }
    }
  }

  private checkZoneGateCollisions() {
    const state = this.getState();
    
    for (const gate of this.zoneGates) {
      if (this.physics.collide(this.player, gate)) {
        // Determine which gate we're colliding with
        const gateIndex = this.zoneGates.indexOf(gate);
        
        if (gateIndex === 0 || gateIndex === 1) {
          // B→C1 or B→C2 gate
          if (state.zone2TutorialPadsCleared < ZONE2_WORD_WOODS_LAYOUT.markerPads.length) {
            this.showFeedback('Clear all 3 marker pads in Tutorial Lane first!', true);
            this.bouncePlayerFromGate(gate);
          }
        } else if (gateIndex === 2) {
          // D gate
          if (!state.hasCanopyToken || !state.hasRootToken) {
            const missing = [];
            if (!state.hasCanopyToken) missing.push('canopy token');
            if (!state.hasRootToken) missing.push('root token');
            this.showFeedback(`Need ${missing.join(' and ')} to enter Echo Arbor!`, true);
            this.bouncePlayerFromGate(gate);
          }
        }
      }
    }
  }

  private updateGates() {
    const state = this.getState();
    
    // Update B→C1 and B→C2 gates
    if (state.zone2TutorialPadsCleared >= ZONE2_WORD_WOODS_LAYOUT.markerPads.length) {
      // Open branch gates
      for (let i = 0; i < 2; i++) {
        if (this.zoneGates[i]?.body) {
          this.zoneGates[i]!.setAlpha(0.3);
          this.zoneGates[i]!.setTint(0x55ff55);
          this.zoneGates[i]!.body!.enable = false;
        }
      }
    }
    
    // Update D gate
    if (state.hasCanopyToken && state.hasRootToken) {
      if (this.zoneGates[2]?.body) {
        this.zoneGates[2]!.setAlpha(0.3);
        this.zoneGates[2]!.setTint(0x55ff55);
        this.zoneGates[2]!.body!.enable = false;
      }
    }
  }

  private bouncePlayerFromGate(gate: Phaser.Physics.Arcade.Sprite) {
    // Simple bounce effect
    const dx = this.player.x - gate.x;
    const dy = this.player.y - gate.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      const force = 200;
      this.player.setVelocity(
        (dx / distance) * force,
        (dy / distance) * force
      );
    }
  }

  private showFeedback(message: string, isWarning = false) {
    if (!this.lockFeedbackText) return;
    
    this.lockFeedbackText.setText(message);
    this.lockFeedbackText.setStyle({
      color: isWarning ? '#ffaaaa' : '#aaffaa',
      backgroundColor: isWarning ? '#552222' : '#225522',
    });
    
    // Fade in/out animation
    this.tweens.add({
      targets: this.lockFeedbackText,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 2000,
      onComplete: () => {
        this.lockFeedbackText?.setAlpha(0);
      }
    });
  }

  private createClearedEffect(x: number, y: number) {
    // Simple particle effect for pad clearing
    const particles = this.add.particles(x, y, 'tile-marker', {
      quantity: 5,
      lifespan: 1000,
      speed: { min: 30, max: 60 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1, end: 0 },
      tint: 0x88ff88,
      gravityY: -100,
    });
    
    particles.explode();
  }

  private createTokenCollectionEffect(x: number, y: number, kind: 'canopy' | 'root') {
    const tint = kind === 'canopy' ? 0x88aaff : 0xffaa88;
    const textureKey = kind === 'canopy' ? 'tile-shrine' : 'tile-bridge';
    const particles = this.add.particles(x, y, textureKey, {
      quantity: 10,
      lifespan: 1500,
      speed: { min: 40, max: 80 },
      scale: { start: 1.0, end: 0.1 },
      alpha: { start: 1, end: 0 },
      tint: tint,
      gravityY: -50,
    });
    
    particles.explode();
  }

  // ─── Arrival dialogue ─────────────────────────────────────────────────────

  private showArrivalDialogue() {
    this.dialogueActive = true;
    this.introOverlayActive = true;
    const lines = ARRIVAL_DIALOGUE[this.arrivalDialogueIndex] ?? ARRIVAL_DIALOGUE[0];
    this.showDialogue('Word Woods Guide', lines);
  }

  private advanceArrivalDialogue() {
    this.arrivalDialogueIndex++;
    if (this.arrivalDialogueIndex >= ARRIVAL_DIALOGUE.length) {
      this.closeDialogue();
      return;
    }
    this.closeDialogue();
    this.showArrivalDialogue();
  }

  private showDialogue(speaker: string, lines: string[]) {
    this.dialogueActive = true;
    this.introOverlayActive = true;

    const boxW = 700;
    const boxH = 240;

    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    const zoom = this.cameras.main.zoom;
    const viewW = this.cameras.main.width / zoom;
    const viewH = this.cameras.main.height / zoom;

    const boxX = camX + (viewW - boxW) / 2;
    const boxY = camY + viewH - boxH - 20;

    const container = this.add.container(0, 0).setDepth(50);

    const bg = this.add
      .rectangle(boxX + boxW / 2, boxY + boxH / 2, boxW, boxH, 0xf4efe2, 0.97)
      .setStrokeStyle(3, 0xd2c8b1, 1);
    container.add(bg);

    const speakerText = this.add.text(boxX + 16, boxY + 12, `[ ${speaker} ]`, {
      fontFamily: 'Palatino Linotype',
      fontSize: '15px',
      color: '#6b5338',
      fontStyle: 'bold',
    });
    container.add(speakerText);

    const bodyText = this.add.text(boxX + 16, boxY + 36, lines.join('\n'), {
      fontFamily: 'Courier New',
      fontSize: '13px',
      color: '#4b4238',
      lineSpacing: 3,
      wordWrap: { width: boxW - 32 },
    });
    container.add(bodyText);

    this.dialogueBox = container;

    this.tweens.add({
      targets: bg,
      strokeAlpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  private closeDialogue() {
    this.dialogueActive = false;
    this.introOverlayActive = false;
    if (this.dialogueBox) {
      this.dialogueBox.destroy();
      this.dialogueBox = undefined;
    }
  }
}
