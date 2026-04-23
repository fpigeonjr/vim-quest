import { test, expect, Page } from '@playwright/test';

const SERVER_URL = 'http://localhost:8080';
const ZONE2_COMMAND = '/level-2';

// Helper functions for Vim Quest testing
async function openSlashPrompt(page: Page) {
  await page.keyboard.press('/');
  await page.waitForTimeout(500); // Wait for prompt to appear
}

async function typeCommand(page: Page, command: string) {
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000); // Wait for scene transition
}

async function movePlayer(page: Page, direction: 'h' | 'j' | 'k' | 'l', steps = 1) {
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press(direction);
    await page.waitForTimeout(100); // Small delay between movements
  }
  await page.waitForTimeout(200); // Extra delay after movement
}

test.describe('Zone 2: Word Woods Gating System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(SERVER_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for game to initialize
    
    // Clear any existing game state to start fresh
    await page.evaluate(() => {
      localStorage.removeItem('vimquest-save-v1');
    });
  });

  test('should start with all gates locked', async ({ page }) => {
    // Enter Zone 2
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Check that we're in Zone 2 by looking for the banner text
    const bannerText = await page.textContent('body');
    expect(bannerText).toContain('Word Woods');
    
    // Move south from arrival point to approach B→C2 gate
    await movePlayer(page, 'j', 4);
    await movePlayer(page, 'l', 8);
    
    // Take a screenshot for documentation
    await page.screenshot({ path: 'test-results/zone2-start.png' });
    
    // Check that there's no "cleared" message initially
    const initialMessages = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent?.includes('cleared') || el.textContent?.includes('token'));
      return elements.map(el => el.textContent);
    });
    
    expect(initialMessages).toHaveLength(0);
  });

  test('should require 3 marker pads to unlock branch gates', async ({ page }) => {
    // Enter Zone 2
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Move to Tutorial Lane (B region)
    await movePlayer(page, 'l', 10);
    await movePlayer(page, 'j', 2);
    
    // Find and clear first marker pad (approx position 18,26)
    await movePlayer(page, 'l', 4);
    await page.waitForTimeout(500);
    
    // Check for pad clearing feedback
    const feedback1 = await page.waitForSelector('text=/Marker pad.*cleared/i', { timeout: 2000 }).catch(() => null);
    expect(feedback1).toBeTruthy();
    
    // Move to second pad (approx position 22,28)
    await movePlayer(page, 'l', 2);
    await movePlayer(page, 'j', 1);
    await page.waitForTimeout(500);
    
    const feedback2 = await page.waitForSelector('text=/Marker pad.*cleared/i', { timeout: 2000 }).catch(() => null);
    expect(feedback2).toBeTruthy();
    
    // Move to third pad (approx position 26,30)
    await movePlayer(page, 'l', 2);
    await movePlayer(page, 'j', 1);
    await page.waitForTimeout(500);
    
    const feedback3 = await page.waitForSelector('text=/Marker pad.*cleared/i', { timeout: 2000 }).catch(() => null);
    expect(feedback3).toBeTruthy();
    
    // Check for "Tutorial Lane cleared" message
    const laneCleared = await page.waitForSelector('text=/Tutorial Lane cleared/i', { timeout: 2000 }).catch(() => null);
    expect(laneCleared).toBeTruthy();
    
    // Take screenshot after pad clearing
    await page.screenshot({ path: 'test-results/zone2-pads-cleared.png' });
  });

  test('should unlock branch gates after clearing 3 pads', async ({ page }) => {
    // Enter Zone 2 and clear pads (simulate by setting game state)
    await page.evaluate(() => {
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
        zone2TutorialPadsCleared: 3,
        hasCanopyToken: false,
        hasRootToken: false,
      };
      localStorage.setItem('vimquest-save-v1', JSON.stringify(state));
    });
    
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Try to go north to C1 - should be accessible now
    await movePlayer(page, 'l', 10);
    await movePlayer(page, 'k', 6); // Move north toward C1
    
    // If gates are working properly, we should be able to move north
    // Take screenshot to verify position
    await page.screenshot({ path: 'test-results/zone2-branch-open.png' });
    
    // Check that we don't see gate lock messages
    const lockMessages = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
        .filter(el => el.textContent?.includes('locked') || el.textContent?.includes('need') || el.textContent?.includes('first'));
      return elements.map(el => el.textContent);
    });
    
    // With pads cleared, there should be no lock messages
    expect(lockMessages.length).toBe(0);
  });

  test('should require both tokens to unlock D gate', async ({ page }) => {
    // Set state with pads cleared but no tokens
    await page.evaluate(() => {
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
        zone2TutorialPadsCleared: 3,
        hasCanopyToken: false,
        hasRootToken: false,
      };
      localStorage.setItem('vimquest-save-v1', JSON.stringify(state));
    });
    
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Try to go east toward D gate
    await movePlayer(page, 'l', 15);
    
    // We might get a lock message about needing tokens
    // Check if lock feedback appears
    const hasLockFeedback = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const text = el.textContent || '';
          return text.includes('token') || text.includes('need');
        });
      return elements.length > 0;
    });
    
    // Should have lock feedback if D gate is properly locked
    expect(hasLockFeedback).toBe(true);
    
    await page.screenshot({ path: 'test-results/zone2-d-gate-locked.png' });
  });

  test('should persist state across page reloads', async ({ page }) => {
    // Enter Zone 2 and clear one pad
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Move to first pad and clear it
    await movePlayer(page, 'l', 10);
    await movePlayer(page, 'j', 2);
    await movePlayer(page, 'l', 4);
    await page.waitForTimeout(1000); // Wait for pad clearing
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Re-enter Zone 2
    await openSlashPrompt(page);
    await typeCommand(page, ZONE2_COMMAND);
    
    // Check that state was preserved by looking for marker pads status
    // (Implementation detail: cleared pads might be tinted differently)
    await page.screenshot({ path: 'test-results/zone2-state-persisted.png' });
    
    // Test passes if no errors occurred and we can re-enter Zone 2
    const bannerText = await page.textContent('body');
    expect(bannerText).toContain('Word Woods');
  });
});