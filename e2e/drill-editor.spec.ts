// e2e/drill-editor.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Drill Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill');
  });

  test('should load the drill editor page', async ({ page }) => {
    await expect(page).toHaveTitle(/Drill Design/);
  });

  test('should display field canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should allow adding a member', async ({ page }) => {
    // This test would need to be adapted based on your actual UI
    // Example: clicking an "Add Member" button
    const addMemberButton = page.getByRole('button', { name: /add member/i });
    if (await addMemberButton.isVisible()) {
      await addMemberButton.click();
      // Verify member was added
    }
  });

  test('should allow creating a set', async ({ page }) => {
    // This test would need to be adapted based on your actual UI
    const addSetButton = page.getByRole('button', { name: /add set/i });
    if (await addSetButton.isVisible()) {
      await addSetButton.click();
      // Verify set was created
    }
  });
});

import { test, expect } from '@playwright/test';

test.describe('Drill Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/drill');
  });

  test('should load the drill editor page', async ({ page }) => {
    await expect(page).toHaveTitle(/Drill Design/);
  });

  test('should display field canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should allow adding a member', async ({ page }) => {
    // This test would need to be adapted based on your actual UI
    // Example: clicking an "Add Member" button
    const addMemberButton = page.getByRole('button', { name: /add member/i });
    if (await addMemberButton.isVisible()) {
      await addMemberButton.click();
      // Verify member was added
    }
  });

  test('should allow creating a set', async ({ page }) => {
    // This test would need to be adapted based on your actual UI
    const addSetButton = page.getByRole('button', { name: /add set/i });
    if (await addSetButton.isVisible()) {
      await addSetButton.click();
      // Verify set was created
    }
  });
});

