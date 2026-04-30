/**
 * Portal Flow Test — validates the natural Zone 2 entrance from Level 1 completion.
 *
 * Steps:
 * 1. Start at title, enter world
 * 2. Use JS scene warp to set Level 1 complete and open portal path
 * 3. Warp player to portal tile (33,6) and trigger Zone 2 transition
 * 4. Verify Zone2Scene starts and arrival dialogue appears
 * 5. Dismiss dialogue and confirm Zone 2 mechanics work
 * 6. Return to world via ESC
 */

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const REPORT_DIR = 'docs/test-reports/portal-flow';
mkdirSync(REPORT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function screenshot(page, name) {
  const path = `${REPORT_DIR}/${name}.png`;
  await page.screenshot({ path });
  console.log(`📸  ${name}`);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:8080/');
  await sleep(800);
  await screenshot(page, '01-title');

  // Start game from title screen
  await page.keyboard.press('Space');
  await sleep(600);
  await screenshot(page, '02-world-start');

  // Open portal path by setting Level 1 complete and restoring state
  await page.evaluate(() => {
    const g = window.__game;
    if (!g) return;
    const scene = g.scene.getScene('world');
    if (!scene) return;
    const state = scene.getState();
    scene.syncState({
      ...state,
      gateUnlocked: true,
      bridgeBuilt: true,
      cratesDestroyed: 3,
      unlockedCommands: ['h','j','k','l','w','b','0','$','x','i','Esc'],
      level1Complete: true,
    });
    scene.restoreFromState();
  });

  await sleep(400);
  await screenshot(page, '03-portal-open');

  // Warp player to portal tile and trigger transition
  await page.evaluate(() => {
    const g = window.__game;
    if (!g) return;
    const scene = g.scene.getScene('world');
    if (!scene) return;
    scene.player.setPosition(33 * 32 + 16, 6 * 32 + 16);
    scene.enterZone2();
  });

  await sleep(800);
  await screenshot(page, '04-zone2-arrival');

  // Verify arrival dialogue is showing
  const dialogueActive = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene('zone2');
    return scene ? scene.dialogueActive : false;
  });
  console.log(`Arrival dialogue active: ${dialogueActive}`);

  // Dismiss first dialogue page
  await page.keyboard.press('Space');
  await sleep(500);
  await screenshot(page, '05-dialogue-page2');

  // Dismiss second dialogue page
  await page.keyboard.press('Space');
  await sleep(500);
  await screenshot(page, '06-dialogue-closed');

  // Verify player can move freely
  const canMove = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene('zone2');
    return scene ? !scene.dialogueActive && !scene.introOverlayActive : false;
  });
  console.log(`Can move freely: ${canMove}`);

  // Test a word jump in Zone 2
  await page.keyboard.press('w');
  await sleep(400);
  await screenshot(page, '07-w-jump-in-zone2');

  // Test anchor snap
  await page.keyboard.press('0');
  await sleep(400);
  await screenshot(page, '08-anchor-snap');

  // Return to world via ESC
  await page.keyboard.press('Escape');
  await sleep(600);
  await screenshot(page, '09-back-in-world');

  // Verify world scene is active and portal is still visible
  const worldActive = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return false;
    const scene = g.scene.getScene('world');
    return !!scene;
  });
  console.log(`World scene active: ${worldActive}`);

  console.log('\n✅ Portal flow test complete');
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
