/**
 * FlowForge Screenshot Generator
 * Run: node scripts/take-screenshots.js
 * Requires: backend on :3000, frontend on :3001
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3001';
const API  = 'http://localhost:3000/api';
const OUT  = path.join(__dirname, '..', 'docs', 'screenshots');
const EMAIL    = 'admin@flowforge.dev';
const PASSWORD = 'Admin@1234';

const PAGES = [
  { name: '02-dashboard',  url: '/dashboard'                 },
  { name: '03-tasks',      url: '/dashboard/tasks'           },
  { name: '04-requests',   url: '/dashboard/requests'        },
  { name: '05-workflows',  url: '/dashboard/admin/workflows' },
  { name: '06-users',      url: '/dashboard/admin/users'     },
  { name: '07-reports',    url: '/dashboard/reports'         },
  { name: '08-audit-logs', url: '/dashboard/audit-logs'      },
];

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  // ── 1. Get tokens from the API directly (Node fetch) ──────────────────────
  console.log('Authenticating via API...');
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const loginBody = await loginRes.json();
  if (!loginBody.success || !loginBody.data) {
    console.error('Login failed:', JSON.stringify(loginBody));
    process.exit(1);
  }
  const { accessToken, refreshToken } = loginBody.data;
  console.log('  ✓ Got tokens');

  // ── 2. Launch browser ──────────────────────────────────────────────────────
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // ── 3. Capture login page (no auth needed) ─────────────────────────────────
  console.log('Capturing 01-login...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await delay(800);
  await page.screenshot({ path: path.join(OUT, '01-login.png') });
  console.log('  ✓ 01-login.png');

  // ── 4. Seed localStorage with real tokens, then capture each page ──────────
  // Navigate to the origin first so localStorage is writable for this domain
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((at, rt) => {
    localStorage.setItem('access_token', at);
    localStorage.setItem('refresh_token', rt);
  }, accessToken, refreshToken);

  for (const pg of PAGES) {
    console.log(`Capturing ${pg.name}...`);
    await page.goto(`${BASE}${pg.url}`, { waitUntil: 'networkidle2' });
    await delay(1500);  // let React hydrate + data load

    // If we ended up back at login (token rejected), bail early
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.warn(`  ⚠ Redirected to login — token may be invalid`);
    }

    await page.screenshot({ path: path.join(OUT, `${pg.name}.png`) });
    console.log(`  ✓ ${pg.name}.png`);
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to docs/screenshots/`);
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
