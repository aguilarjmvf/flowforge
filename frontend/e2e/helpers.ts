import { Page } from '@playwright/test';

const TEST_EMAIL    = process.env.E2E_USER_EMAIL    ?? 'admin@flowforge.app';
const TEST_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Admin1234!';

export async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[type="email"]', TEST_EMAIL);
  await page.fill('[type="password"]', TEST_PASSWORD);
  await page.click('[type="submit"]');
  await page.waitForURL('**/dashboard');
}

export async function logout(page: Page) {
  // Clear tokens so next test starts fresh
  await page.evaluate(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  });
}
