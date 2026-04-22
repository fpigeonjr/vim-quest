/**
 * Reliable Level 1 playthrough using window.__game to drive Phaser directly.
 * Every shrine unlock and player position is exact — no timing guesswork.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/tmp/vq-shots';
mkdirSync(OUT, { recursive: true });

const TS = 32;

async function tap(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
}
async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(200);
}
async function shot(page, name, label) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`📸  ${name}  —  ${label}`);
}

// Warp player to exact tile
async function warpTo(page, tx, ty) {
  await page.evaluate(([x, y, ts]) => {
    const scene = window.__game?.scene?.getScene('world');
    if (scene?.player) {
      scene.player.setPosition(x * ts + ts / 2, y * ts + ts / 2);
      scene.player.setVelocity(0, 0);
    }
  }, [tx, ty, TS]);
  await page.waitForTimeout(400);
}

// Patch game state (partial)
async function patchState(page, patch) {
  await page.evaluate((p) => {
    const scene = window.__game?.scene?.getScene('world');
    if (!scene) return;
    const state = scene.registry.get('gameState');
    if (!state) return;
    scene.registry.set('gameState', { ...state, ...p });
  }, patch);
  await page.waitForTimeout(300);
}

// Unlock specific commands
async function unlock(page, cmds) {
  await page.evaluate((commands) => {
    const scene = window.__game?.scene?.getScene('world');
    if (!scene) return;
    const state = scene.registry.get('gameState');
    if (!state) return;
    const all = new Set([...state.unlockedCommands, ...commands]);
    scene.registry.set('gameState', { ...state, unlockedCommands: Array.from(all) });
  }, cmds);
  await page.waitForTimeout(200);
}

// Build bridge by calling setTileAt for cols 28-30, rows 10-12
async function buildBridge(page) {
  await page.evaluate(() => {
    const scene = window.__game?.scene?.getScene('world');
    if (!scene?.tilemapData) return;
    // Access setTileAt via the module-level function stored on the scene
    // We rebuild the bridge tiles directly on the tilemap data
    const td = scene.tilemapData;
    const TS = 32;
    const TILE_PATH = 1;
    for (const col of [28, 29, 30]) {
      for (const row of [10, 11, 12]) {
        // Update mapData
        td.mapData[row][col] = TILE_PATH;
        // Update tile image texture
        const img = td.tileImages.get(`${col},${row}`);
        if (img) img.setTexture('tile-path');
        // Remove collider if present
        const key = `${col},${row}`;
        const physCol = td.physicsColliders?.get(key);
        if (physCol) { physCol.destroy(); td.physicsColliders.delete(key); }
        const col2 = td.colliders?.get(key);
        if (col2) { col2.destroy(); td.colliders.delete(key); }
      }
    }
  });
  await page.waitForTimeout(400);
}

// Open the gate wall
async function openGate(page) {
  await page.evaluate(() => {
    const scene = window.__game?.scene?.getScene('world');
    if (!scene?.tilemapData) return;
    const td = scene.tilemapData;
    const TILE_PATH = 1;
    const GATE_WALL_COL = 41;
    for (let y = 13; y < 32; y++) {
      td.mapData[y][GATE_WALL_COL] = TILE_PATH;
      const img = td.tileImages.get(`${GATE_WALL_COL},${y}`);
      if (img) img.setTexture('tile-path');
      const key = `${GATE_WALL_COL},${y}`;
      const physCol = td.physicsColliders?.get(key);
      if (physCol) { physCol.destroy(); td.physicsColliders.delete(key); }
      const col2 = td.colliders?.get(key);
      if (col2) { col2.destroy(); td.colliders.delete(key); }
    }
  });
  await page.waitForTimeout(300);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  headless: false,
  args: ['--enable-webgl', '--use-gl=swiftshader', '--ignore-gpu-blacklist'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto('http://localhost:8080');
await page.waitForTimeout(3500);
await shot(page, '01-title', 'Title screen');

// Start game
await tap(page, 'Enter');
await page.waitForTimeout(3000);
await tap(page, 'Space');
await page.waitForTimeout(600);
await shot(page, '02-game-start', 'Game start — player (4,6), commands: h j k l Esc');

// ── 1. Word Shrine (14,6) ─────────────────────────────────────────────────────
await warpTo(page, 4, 6);
await hold(page, 'l', 3500);
await shot(page, '03-word-shrine', 'Word Shrine (14,6) — w b unlocked');

// ── 2. Line Shrine (8,18) ─────────────────────────────────────────────────────
await warpTo(page, 8, 6);
await hold(page, 'j', 4200);
await shot(page, '04-line-shrine', 'Line Shrine (8,18) — 0 $ unlocked');

// ── 3. Operator Shrine (20,22) ────────────────────────────────────────────────
await warpTo(page, 8, 22);
await hold(page, 'l', 2600);
await shot(page, '05-operator-shrine', 'Operator Shrine (20,22) — x unlocked');

// ── 4. Crate breaking to unlock i ──────────────────────────────────────────────────
// Warp to crate area to show crate breaking
await warpTo(page, 44, 16);
await shot(page, '06-crates-before', 'Crate cluster (45-46,16-17) — pressing x to break crates');
// Ensure all commands except i are unlocked
await unlock(page, ['0', '$', 'x']);

// ── 5. Break all 3 crates to unlock i ──────────────────────────────────────────────────
await tap(page, 'x');
await page.waitForTimeout(350);
await shot(page, '07-crate-1-broken', 'Crate 1/3 broken');

await warpTo(page, 45, 17);
await tap(page, 'x');
await page.waitForTimeout(350);
await shot(page, '08-crate-2-broken', 'Crate 2/3 broken');

await warpTo(page, 46, 16);
await tap(page, 'x');
await page.waitForTimeout(350);
await shot(page, '09-all-crates-broken', 'All 3 crates broken — i command unlocked');

// Unlock i command as reward for breaking crates
await unlock(page, ['i']);

// ── 6. Console + bridge ───────────────────────────────────────────────────────
await warpTo(page, 29, 13);
await shot(page, '10-at-console', 'At River Console (29,13)');
await tap(page, 'i');
await page.waitForTimeout(800);
await shot(page, '11-bridge-built', 'Bridge activated — 3 tiles wide (cols 28-30)');

// ── 7. Cross bridge and reach flag ────────────────────────────────────────────
await warpTo(page, 29, 14);
await hold(page, 'k', 2000);
await shot(page, '12-crossed-bridge', 'North of river — approaching flag enclosure');

await hold(page, 'k', 1200);
await shot(page, '13-entering-enclosure', 'Entering flag enclosure — 3-tile entrance open');

await hold(page, 'k', 800);
await shot(page, '14-flag-triggered', 'FLAG REACHED — confetti + win overlay');

await page.waitForTimeout(1800);
await shot(page, '15-win-overlay', 'Win overlay — LEVEL 1 COMPLETE');

await tap(page, 'x');
await page.waitForTimeout(350);
await shot(page, '14-crate-1-broken', 'Crate 1/3 broken');

await warpTo(page, 45, 17);
await tap(page, 'x');
await page.waitForTimeout(350);
await shot(page, '15-crate-2-broken', 'Crate 2/3 broken');

await tap(page, 'x');
await page.waitForTimeout(350);
await shot(page, '16-all-crates-broken', 'All 3 crates broken — i command unlocked and gate wall removing');

// ── 8. Show open gate ─────────────────────────────────────────────────────────
await warpTo(page, 39, 22);
await hold(page, 'l', 1000);
await shot(page, '17-gate-open', 'Gate wall gone — eastern path clear');

await browser.close();
console.log('\nAll screenshots saved to', OUT);
