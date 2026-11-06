// Loopback-only browser acceptance: real Next.js rendering/actions, simulated
// Supabase Auth/Data API. Database permissions are tested by the SQL suites.
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { createServerClient } from '@supabase/ssr';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const appOrigin = 'http://127.0.0.1:3133';
const apiOrigin = 'http://127.0.0.1:3134';
const user = { id: '33300000-0000-0000-0000-000000000001', email: 'fixture@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
let preferences = null, readFailure = false, writeFailure = false;
const writes = [];
const token = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.fixture`;
const api = http.createServer(async (req, res) => {
  const url = new URL(req.url, apiOrigin);
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  if (url.pathname === '/auth/v1/token') return reply(200, { access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user });
  if (url.pathname === '/auth/v1/user') return reply(200, user);
  if (url.pathname === '/rest/v1/profiles') return reply(200, { full_name: 'Fictional Reminder Mentor', role: 'mentor' });
  if (url.pathname === '/rest/v1/email_preferences') {
    if (req.method === 'GET') return readFailure ? reply(503, { message: 'Fixture read unavailable' }) : reply(200, preferences);
    if (req.method === 'POST') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const value = JSON.parse(Buffer.concat(chunks).toString());
      writes.push(value);
      if (writeFailure) return reply(503, { message: 'Fixture write unavailable' });
      preferences = value; return reply(201, value);
    }
  }
  reply(404, { message: 'Unexpected fixture endpoint' });
});
api.listen(3134, '127.0.0.1'); await once(api, 'listening');
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: apiOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public-key', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key', EMAIL_DELIVERY_MODE: 'suppress', RESEND_API_KEY: '', NOTIFICATION_WORKER_SECRET: '' };
let server, browser;
const log = [];
function run(args) {
  const proc = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  proc.stdout.on('data', chunk => log.push(chunk.toString())); proc.stderr.on('data', chunk => log.push(chunk.toString()));
  return proc;
}
try {
  const build = run(['build', '--webpack']);
  const [code] = await once(build, 'exit');
  assert.equal(code, 0, 'Fixture production build failed');
  server = run(['start', '--hostname', '127.0.0.1', '--port', '3133']);
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(appOrigin)).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const jar = [];
  const sdk = createServerClient(apiOrigin, 'fixture-public-key', { cookies: { getAll: () => [], setAll: items => jar.push(...items) } });
  assert.equal((await sdk.auth.signInWithPassword({ email: user.email, password: 'fixture-only' })).error, null);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.route('**/_vercel/insights/**', route => route.fulfill({ body: '' }));
  await context.addCookies(jar.map(({ name, value }) => ({ name, value, url: appOrigin })));
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${appOrigin}/profile/email-preferences`);
  const reminders = page.getByRole('checkbox', { name: /Pending-request reminders/ });
  await reminders.waitFor();
  await page.getByRole('button', { name: 'Reject Non-Essential', exact: true }).click();
  assert.equal(await reminders.isChecked(), false);
  assert.equal(await page.getByRole('checkbox', { name: /Mentorship requests/ }).isChecked(), true);
  await reminders.check();
  // A forged form identity must never reach the Data API.
  await page.locator('form').first().evaluate(form => {
    const input = document.createElement('input'); input.name = 'user_id'; input.value = 'wrong-user'; form.append(input);
  });
  await page.getByRole('button', { name: 'Save email preferences', exact: true }).click();
  await page.getByText('Your email preferences have been saved.').waitFor();
  assert.equal(writes.at(-1).user_id, user.id);
  assert.equal(writes.at(-1).reminders, true);
  await page.reload(); assert.equal(await reminders.isChecked(), true);
  await page.getByRole('button', { name: 'Unsubscribe from all activity email', exact: true }).click();
  await page.waitForLoadState('networkidle');
  assert.deepEqual(preferences, { user_id: user.id, requests: false, connections: false, matches: false, reminders: false });
  await page.reload();
  assert.equal(await page.getByRole('checkbox').filter({ visible: true }).count(), 4);
  for (const checkbox of await page.getByRole('checkbox').all()) assert.equal(await checkbox.isChecked(), false);
  const axe = await new AxeBuilder({ page }).include('#workspace').analyze();
  assert.deepEqual(axe.violations.map(v => ({ id: v.id, impact: v.impact })), []);
  for (const width of [320, 375, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
  }
  await page.screenshot({ path: '/tmp/issue33-preferences.png', fullPage: true });
  writeFailure = true;
  await reminders.check();
  await page.getByRole('button', { name: 'Save email preferences', exact: true }).click();
  await page.getByText('We couldn’t load or save your preferences. Please try again.').waitFor();
  assert.equal(preferences.reminders, false);
  writeFailure = false; readFailure = true;
  await page.reload();
  assert.equal(await page.getByRole('button', { name: 'Save email preferences', exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Unsubscribe from all activity email', exact: true }).isDisabled(), true);
  await context.clearCookies(); readFailure = false;
  await page.goto(`${appOrigin}/profile/email-preferences`);
  assert.equal(new URL(page.url()).pathname, '/login');
  assert.equal(new URL(page.url()).searchParams.get('next'), '/profile/email-preferences');
  assert.equal((await fetch(`${appOrigin}/api/notifications/process`, { method: 'POST' })).status, 401);
  assert.deepEqual(errors, []);
  console.log('PASS: default-off consent, authenticated persistence, forged identity ignored, unsubscribe-all, write/read failure recovery, protected links, worker authorization, accessibility and mobile widths.');
  console.log('Evidence boundary: real local production rendering/actions with a simulated loopback Auth/Data API; no live provider, hosted schema or real member data.');
} finally {
  await browser?.close(); server?.kill('SIGTERM'); api.closeAllConnections(); api.close();
  writeFileSync('/tmp/issue33-browser-build.log', log.join(''));
}
