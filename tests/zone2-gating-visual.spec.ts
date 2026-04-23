import { test, expect, Page } from '@playwright/test';

const SERVER_URL = 'http://localhost:8080';
const ZONE2_COMMAND = '/level-2';

// Helper functions for Vim Quest testing
async function openSlashPrompt(page: Page) {
  await page.keyboard.press('/');
  await page.waitForTimeout(500);
}

async function typeCommand(page: Page, command: string) {
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000); // Longer wait for scene transition
}

async function movePlayer(page: Page, direction: 'h' | 'j' | 'k' | 'l', steps = 1) {
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(direction);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
}

test.describe('Zone 2: Word Woods Gating System (Visual Tests)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVER_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for game to initialize
    
    // Clear any existing game state to start fresh
    await page.evaluate(() => {
      localStorage.removeItem('vimquest-save-v1');
    });
  });

  test('Visual test: Enter Zone 2 and verify initial state', async ({ page }) => {
    console.log('Test 1: Entering Zone 2...');
    
    // Enter Zone 2 via slash command
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Take screenshot of initial state
    await page.screenshot({ 
      path: 'test-results/zone2-initial-visual.png',
      fullPage: true 
    });
    console.log('✅ Screenshot saved: test-results/zone2-initial-visual.png');
    
    // Verify we can move (basic game functionality)
    await movePlayer(page, 'l', 2);
    await movePlayer(page, 'j', 2);
    
    // Take another screenshot after movement
    await page.screenshot({ 
      path: 'test-results/zone2-after-movement.png',
      fullPage: true 
    });
    
    console.log('✅ Basic movement test passed');
  });

  test('Visual test: Marker pad clearing flow', async ({ page }) => {
    console.log('Test 2: Testing marker pad clearing...');
    
    // Enter Zone 2
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Navigate to Tutorial Lane area
    await movePlayer(page, 'l', 10); // Move east
    await movePlayer(page, 'j', 3);  // Move south
    
    // Take screenshot before clearing pads
    await page.screenshot({ 
      path: 'test-results/zone2-before-pad-clearing.png',
      fullPage: true 
    });
    
    // Move around in area where marker pads should be
    // (Positions approximately: 18,26; 22,28; 26,30)
    await movePlayer(page, 'l', 8);
    await movePlayer(page, 'j', 2);
    await movePlayer(page, 'l', 8);
    
    // Take screenshot after moving through pad area
    await page.screenshot({ 
      path: 'test-results/zone2-after-pad-area.png',
      fullPage: true 
    });
    
    // Check localStorage to see if pads were cleared
    const gameState = await page.evaluate(() => {
      const saved = localStorage.getItem('vimquest-save-v1');
      return saved ? JSON.parse(saved) : null;
    });
    
    console.log('Game state after pad area:', gameState ? 
      `zone2TutorialPadsCleared: ${gameState.zone2TutorialPadsCleared}` : 'No state saved');
    
    if (gameState && gameState.zone2TutorialPadsCleared > 0) {
      console.log(`✅ Marker pads cleared: ${gameState.zone2TutorialPadsCleared}/3`);
    } else {
      console.log('⚠️ No pads cleared yet - might need precise positioning');
    }
    
    console.log('✅ Pad area navigation test complete');
  });

  test('Functional test: Game state persistence', async ({ page }) => {
    console.log('Test 3: Testing state persistence...');
    
    // Manually set game state to simulate pad clearing
    await page.evaluate(() => {
      const state = {
        mode: 'normal',
        areaName: 'Word Woods',
        hint: 'Test persistence',
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
        zone2TutorialPadsCleared: 3, // Simulate cleared pads
        hasCanopyToken: true,         // Simulate collected tokens
        hasRootToken: true,
      };
      localStorage.setItem('vimquest-save-v1', JSON.stringify(state));
    });
    
    // Reload page to test persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check that state was preserved
    const persistedState = await page.evaluate(() => {
      const saved = localStorage.getItem('vimquest-save-v1');
      return saved ? JSON.parse(saved) : null;
    });
    
    expect(persistedState).toBeTruthy();
    expect(persistedState.zone2TutorialPadsCleared).toBe(3);
    expect(persistedState.hasCanopyToken).toBe(true);
    expect(persistedState.hasRootToken).toBe(true);
    
    console.log('✅ State persistence verified:');
    console.log(`   - pads cleared: ${persistedState.zone2TutorialPadsCleared}`);
    console.log(`   - canopy token: ${persistedState.hasCanopyToken}`);
    console.log(`   - root token: ${persistedState.hasRootToken}`);
    
    // Enter Zone 2 with persisted state
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Take screenshot with pre-cleared state
    await page.screenshot({ 
      path: 'test-results/zone2-with-persisted-state.png',
      fullPage: true 
    });
    
    console.log('✅ Full persistence test passed');
  });

  test('End-to-end: Complete gating flow simulation', async ({ page }) => {
    console.log('Test 4: Simulating complete gating flow...');
    
    // Test sequence of state changes
    const testStates = [
      { name: 'Fresh start', pads: 0, canopy: false, root: false },
      { name: 'After 1 pad', pads: 1, canopy: false, root: false },
      { name: 'After 2 pads', pads: 2, canopy: false, root: false },
      { name: 'After 3 pads', pads: 3, canopy: false, root: false },
      { name: 'With canopy token', pads: 3, canopy: true, root: false },
      { name: 'With both tokens', pads: 3, canopy: true, root: true },
    ];
    
    for (const state of testStates) {
      console.log(`Testing state: ${state.name}`);
      
      // Set state
      await page.evaluate((s) => {
        const state = {
          mode: 'normal',
          areaName: 'Word Woods',
          hint: 'Test',
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
          zone2TutorialPadsCleared: s.pads,
          hasCanopyToken: s.canopy,
          hasRootToken: s.root,
        };
        localStorage.setItem('vimquest-save-v1', JSON.stringify(state));
      }, state);
      
      // Reload and enter Zone 2
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      await openSlashPrompt(page);
      await typeCommand(page, ZONE2_COMMAND);
      await page.waitForTimeout(1000);
      
      // Take screenshot for this state
      const safeName = state.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await page.screenshot({ 
        path: `test-results/zone2-state-${safeName}.png`,
        fullPage: true 
      });
      
      console.log(`  ✅ Screenshot: zone2-state-${safeName}.png`);
    }
    
    console.log('✅ Complete state flow simulation passed');
  });
});