import { test, expect } from '@playwright/test';
import { login, logout } from './helpers';

test.describe('Purchase Request flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('My Requests page loads and shows empty state or list', async ({ page }) => {
    await page.goto('/dashboard/requests');
    // Either shows the empty-state illustration or a list of requests
    const hasRequests = await page.locator('text=New Request').isVisible();
    const hasEmpty    = await page.locator('text=/no request/i').isVisible().catch(() => false);
    expect(hasRequests || hasEmpty).toBeTruthy();
  });

  test('New Request page renders workflow selector', async ({ page }) => {
    await page.goto('/dashboard/requests/new');
    await expect(page.locator('text=/workflow/i').first()).toBeVisible({ timeout: 8_000 });
  });

  test('My Tasks page loads', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    // Either shows tasks or the "all caught up" empty state
    const content = page.locator('main, [class*="p-6"]');
    await expect(content).toBeVisible({ timeout: 8_000 });
  });

  test('Profile page shows user info and notification toggle', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await expect(page.locator('text=/notification/i').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[role="switch"]')).toBeVisible();
  });

  test('Admin — Workflows page loads and shows create button', async ({ page }) => {
    await page.goto('/dashboard/admin/workflows');
    await expect(page.locator('text=Workflows').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=/new workflow/i').first()).toBeVisible();
  });

  test('Admin — Users page loads and shows invite button', async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    await expect(page.locator('text=Users').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('text=/invite/i').first()).toBeVisible();
  });
});
