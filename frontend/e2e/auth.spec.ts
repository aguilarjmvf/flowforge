import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('[type="email"]')).toBeVisible();
    await expect(page.locator('[type="password"]')).toBeVisible();
    await expect(page.locator('[type="submit"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[type="email"]', 'bad@example.com');
    await page.fill('[type="password"]', 'wrong-password');
    await page.click('[type="submit"]');

    // Expect an error message to appear (not a redirect)
    await expect(page.locator('text=/invalid|incorrect|credentials/i')).toBeVisible({
      timeout: 5_000,
    });
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated users from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    const email    = process.env.E2E_USER_EMAIL    ?? 'admin@flowforge.app';
    const password = process.env.E2E_USER_PASSWORD ?? 'Admin1234!';

    await page.goto('/login');
    await page.fill('[type="email"]', email);
    await page.fill('[type="password"]', password);
    await page.click('[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10_000 });
    await expect(page.locator('text=FlowForge')).toBeVisible();
  });
});
