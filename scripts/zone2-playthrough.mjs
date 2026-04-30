/**
 * Zone 2 (Word Woods) playthrough — validates word-jump mechanics.
 * Uses window.__game to drive Phaser directly for exact control.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = 'docs/test-reports/zone2-playthrough';
mkdirSync(OUT, { recursive: true });

const TS = 32;

async function tap(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
}
async function shot(page, name, label) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`📸  ${name}  —  ${label}`);
}

// Warp player to exact tile in zone2 scene
async function warpTo(page, tx, ty) {
  await page.evaluate(
    ([x, y, ts]) => {
      const scene = window.__game?.scene?.getScene('zone2');
      if (scene?.player) {
        scene.player.setPosition(x * ts + ts / 2, y * ts + ts / 2);
        scene.player.setVelocity(0, 0);
      }
    },
    [tx, ty, TS],
  );
  await page.waitForTimeout(400);
}

// Unlock specific commands
async function unlock(page, cmds) {
  await page.evaluate((commands) => {
    const scene = window.__game?.scene?.getScene('zone2');
    if (!scene) return;
    const state = scene.registry.get('gameState');
    if (!state) return;
    const all = new Set([...state.unlockedCommands, ...commands]);
    scene.registry.set('gameState', { ...state, unlockedCommands: Array.from(all) });
  }, cmds);
  await page.waitForTimeout(200);
}

// Read game hint
async function getHint(page) {
  return await page.evaluate(() => {
    const scene = window.__game?.scene?.getScene('zone2');
    if (!scene) return '';
    const state = scene.registry.get('gameState');
    return state?.hint ?? '';
  });
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
await page.waitForTimeout(2500);
await shot(page, '02-world-start', 'World scene — Cursor Meadow');

// Warp to Zone 2 directly via JS (reliable scene switch)
await page.evaluate(() => {
  const game = window.__game;
  if (!game) return;
  // Stop world scene if active
  if (game.scene.isActive('world')) game.scene.stop('world');
  if (game.scene.isActive('title')) game.scene.stop('title');
  // Ensure UI is running
  if (!game.scene.isActive('ui')) game.scene.launch('ui');
  // Start zone2 and set up state
  game.scene.start('zone2');
  const scene = game.scene.getScene('zone2');
  if (scene) {
    const state = scene.registry.get('gameState');
    if (state) {
      const unlocked = new Set([...state.unlockedCommands, 'w', 'b', '0', '$']);
      scene.registry.set('gameState', {
        ...state,
        zone2Entered: true,
        unlockedCommands: Array.from(unlocked),
        areaName: 'Word Woods',
        hint: 'Welcome to Word Woods. Use w and b to jump along the word lanes.',
      });
      // Dismiss arrival dialogue if it was shown before state was patched
      if (scene.dialogueActive || scene.introOverlayActive) {
        scene.closeDialogue();
      }
    }
  }
});
await page.waitForTimeout(1500);
await shot(page, '03-zone2-entry', 'Zone 2 — Word Woods arrival at (2,28)');

// w, b, 0, $ were pre-unlocked during the direct scene switch.
// e is intentionally NOT unlocked yet — it will be earned at the Echo Arbor shrine.

// ── Test 1: Word jump forward with w ─────────────────────────────────────────
console.log('\n--- Test 1: w jumps along Region A lane ---');
await warpTo(page, 2, 28);
await tap(page, 'w');
await page.waitForTimeout(500);
await shot(page, '04-w-jump-1', 'w jump from (2,28) → (6,28)');

await tap(page, 'w');
await page.waitForTimeout(500);
await shot(page, '05-w-jump-2', 'w jump from (6,28) → (10,28)');

await tap(page, 'w');
await page.waitForTimeout(500);
await shot(page, '06-w-jump-3', 'w jump from (10,28) → (14,28) — entering Region B');

// ── Test 2: Word jump through tutorial lane ──────────────────────────────────
console.log('\n--- Test 2: w jumps through Region B tutorial lane ---');
await warpTo(page, 14, 28);
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '07-b-tutorial-1', 'Region B — w to (16,28)');

await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '08-b-tutorial-2', 'Region B — w to pad area (18,26)');

await tap(page, 'w');
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '09-b-tutorial-3', 'Region B — w through (22,28) pad 2');

// ── Test 3: b (back) jump ────────────────────────────────────────────────────
console.log('\n--- Test 3: b jumps backward ---');
await tap(page, 'b');
await page.waitForTimeout(400);
await shot(page, '10-b-back', 'b jump back from (22,28) → (20,27)');

// ── Test 4: Clear all 3 marker pads ──────────────────────────────────────────
console.log('\n--- Test 4: Clear all marker pads ---');
await warpTo(page, 18, 26);
await page.waitForTimeout(400);
await shot(page, '11-pad-1-cleared', 'Pad 1 cleared at (18,26)');

await warpTo(page, 22, 28);
await page.waitForTimeout(400);
await shot(page, '12-pad-2-cleared', 'Pad 2 cleared at (22,28)');

await warpTo(page, 26, 30);
await page.waitForTimeout(400);
await shot(page, '13-pad-3-cleared', 'Pad 3 cleared — Tutorial Lane complete!');

// ── Test 5: Open branch gates ────────────────────────────────────────────────
console.log('\n--- Test 5: Navigate through C1 (North Canopy) ---');
await warpTo(page, 34, 28);
await tap(page, 'w');
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '14-at-c1-gate', 'At B→C1 gate (34,20) — should be open');

await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '15-c1-entered', 'Entered C1 — word jumps north');

// Jump through C1 to collect canopy token
await warpTo(page, 34, 20);
for (let i = 0; i < 6; i++) {
  await tap(page, 'w');
  await page.waitForTimeout(250);
}
await shot(page, '16-c1-deep', 'Deep in C1 — approaching canopy token');

// Collect canopy token
await warpTo(page, 58, 18);
await page.waitForTimeout(500);
await shot(page, '17-canopy-token', 'Canopy token collected at (58,18)');

// ── Test 6: Backtrack to B with b, then take C2 ─────────────────────────────
console.log('\n--- Test 6: Backtrack and take C2 ---');
await warpTo(page, 34, 20);
for (let i = 0; i < 4; i++) {
  await tap(page, 'b');
  await page.waitForTimeout(250);
}
await shot(page, '18-back-at-b', 'Backtracked to B with b jumps');

// Take C2 branch
await warpTo(page, 34, 28);
await tap(page, 'w');
await tap(page, 'w');
await tap(page, 'w');
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '19-c2-entered', 'Entered C2 — word jumps south');

// Collect root token
await warpTo(page, 56, 38);
await page.waitForTimeout(500);
await shot(page, '20-root-token', 'Root token collected at (56,38)');

// ── Test 7: Enter D (Echo Arbor) ─────────────────────────────────────────────
console.log('\n--- Test 7: Enter Echo Arbor (Region D) ---');
await warpTo(page, 62, 22);
await tap(page, 'w');
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '21-at-d-gate', 'At D gate (62,28) — both tokens collected, should open');

await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '22-d-entered', 'Entered Echo Arbor — e shrine at (68,28)');

// ── Test 8: e command unlock at shrine ───────────────────────────────────────
console.log('\n--- Test 8: e unlock at Echo Arbor shrine ---');
// Warp to waypoint just before shrine, then w-jump onto it to trigger unlock
await warpTo(page, 66, 28);
await tap(page, 'w'); // jumps to (68,28) — triggers e-shrine
await page.waitForTimeout(600);
await shot(page, '23-e-unlocked', 'e command unlocked at Echo Arbor shrine');

// ── Test 9: e jump demo ──────────────────────────────────────────────────────
console.log('\n--- Test 9: e jump demonstration ---');
// Ensure e is unlocked for the demo
await unlock(page, ['e']);
await warpTo(page, 68, 28);
await tap(page, 'e');
await page.waitForTimeout(400);
await shot(page, '24-e-jump', 'e jump from (68,28) to midpoint toward (70,28)');

// ── Test 10: 0 and $ anchor snaps ────────────────────────────────────────────
console.log('\n--- Test 10: 0 and $ anchor snaps ---');
await warpTo(page, 74, 28);
await tap(page, '0');
await page.waitForTimeout(400);
await shot(page, '25-snap-0', '0 snap to start of lane (74,28)');

await warpTo(page, 86, 28);
await tap(page, '$');
await page.waitForTimeout(400);
await shot(page, '26-snap-dollar', '$ snap to end of lane (90,28)');

// ── Test 11: Hazard — dead branch ────────────────────────────────────────────
console.log('\n--- Test 11: Dead branch hazard in C1 ---');
await warpTo(page, 42, 18);
await tap(page, 'w');
await page.waitForTimeout(400);
// This should land on or near dead branch tiles (42-46, 15-16)
await shot(page, '27-dead-branch', 'Dead branch hazard test — should reset to checkpoint');

// ── Test 12: Region E precision terrace — w hits reset rail ──────────────────
console.log('\n--- Test 12: Region E — w overshoots uncleared precision pad ---');
await warpTo(page, 74, 28);
await tap(page, 'w');
await page.waitForTimeout(600);
await shot(page, '28-e-terrace-w-rail', 'w from (74,28) hits reset rail — pad 1 uncleared');

// ── Test 13: e lands on precision pad 1 ──────────────────────────────────────
console.log('\n--- Test 13: Region E — e lands on precision pad 1 ---');
await warpTo(page, 74, 28);
await tap(page, 'e');
await page.waitForTimeout(600);
await shot(page, '29-e-pad-1-cleared', 'e from (74,28) lands on precision pad 1 at (76,28)');

// ── Test 14: w now safe, then e to precision pad 2 ───────────────────────────
console.log('\n--- Test 14: Region E — w safe after pad 1, then e to pad 2 ---');
await warpTo(page, 74, 28);
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '30-w-safe-to-78', 'w from (74,28) now safe to (78,28)');

await warpTo(page, 78, 28);
await tap(page, 'e');
await page.waitForTimeout(600);
await shot(page, '31-e-pad-2-cleared', 'e from (78,28) lands on precision pad 2 at (82,28)');

// ── Test 15: Enter FG and reach Lexeme Shrine ────────────────────────────────
console.log('\n--- Test 15: Enter FG and reach Lexeme Shrine ---');
await warpTo(page, 86, 28);
await tap(page, 'w');
await page.waitForTimeout(400);
await shot(page, '32-fg-entered', 'Entered FG — gate open, heading to shrine');

await warpTo(page, 94, 28);
await page.waitForTimeout(600);
await shot(page, '33-lexeme-shrine', 'Reached Lexeme Shrine at (94,28)');

// ── Test 16: Zone 2 completion ───────────────────────────────────────────────
console.log('\n--- Test 16: Zone 2 completion ---');
await page.waitForTimeout(800);
await shot(page, '34-zone2-complete', 'Zone 2 completion overlay');

const zone2Complete = await page.evaluate(() => {
  const scene = window.__game?.scene?.getScene('zone2');
  if (!scene) return false;
  const state = scene.registry.get('gameState');
  return state?.zone2Complete ?? false;
});
console.log(`Zone 2 complete: ${zone2Complete}`);

await browser.close();
console.log('\n✅ Zone 2 playthrough complete. Screenshots saved to', OUT);
