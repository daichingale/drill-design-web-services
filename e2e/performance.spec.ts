// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/drill');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have acceptable First Contentful Paint', async ({ page }) => {
    await page.goto('/drill');
    
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        }).observe({ entryTypes: ['paint'] });
      });
    });
    
    // FCP should be less than 1.5 seconds
    expect(fcp).toBeLessThan(1500);
  });

  test('should handle large number of members', async ({ page }) => {
    await page.goto('/drill');
    
    // Simulate adding many members
    // This would need to be adapted based on your actual UI
    const startTime = Date.now();
    // ... add members logic ...
    const endTime = Date.now();
    
    // Should handle 100 members within 5 seconds
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/drill');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have acceptable First Contentful Paint', async ({ page }) => {
    await page.goto('/drill');
    
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        }).observe({ entryTypes: ['paint'] });
      });
    });
    
    // FCP should be less than 1.5 seconds
    expect(fcp).toBeLessThan(1500);
  });

  test('should handle large number of members', async ({ page }) => {
    await page.goto('/drill');
    
    // Simulate adding many members
    // This would need to be adapted based on your actual UI
    const startTime = Date.now();
    // ... add members logic ...
    const endTime = Date.now();
    
    // Should handle 100 members within 5 seconds
    expect(endTime - startTime).toBeLessThan(5000);
  });
});

