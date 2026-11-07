// Issue #87: local production UI acceptance with a loopback Auth/Data API.
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
let rejectSession = false;
const token = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.fixture`;
const api = http.createServer(async (req, res) => {
  const url = new URL(req.url, apiOrigin);
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
  if (url.pathname === '/auth/v1/token') return reply(200, { access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user });
  if (url.pathname === '/auth/v1/user') return rejectSession ? reply(401, { message: 'Invalid session' }) : reply(200, user);
  if (url.pathname === '/rest/v1/profiles') return reply(200, { full_name: 'Fictional UI Mentor', role: 'mentor' });
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
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(appOrigin);
  await page.getByRole('button', { name: 'Reject Non-Essential', exact: true }).click();
  assert.ok(await page.getByRole('link', { name: 'Sign in', exact: true }).count());
  const toggle = () => page.getByRole('button', { name: /Switch to (light|dark) mode/ }).first();
  await toggle().click();
  assert.ok(await page.locator('html').evaluate(node => node.classList.contains('dark')));
  await toggle().press('Space');
  assert.equal(await page.locator('html').evaluate(node => node.classList.contains('dark')), false);
  assert.equal(await page.getByRole('menu').count(), 0);
  assert.equal(await page.getByRole('menuitemradio').count(), 0);
  const notices = page.getByText('Independent academic prototype inspired by Kenya Airways.', { exact: false });
  for (const notice of await notices.all()) assert.equal(await notice.evaluate(node => getComputedStyle(node).textAlign), 'center');
  assert.match(await page.locator('body').evaluate(node => getComputedStyle(node).cursor), /paper-plane/);
  assert.match(await toggle().evaluate(node => getComputedStyle(node).cursor), /hand\.svg/);
  assert.equal((await page.request.get(`${appOrigin}/cursors/paper-plane.svg`)).status(), 200);
  assert.equal((await page.request.get(`${appOrigin}/cursors/paper-plane-white.svg`)).status(), 200);
  const cursorAt = locator => locator.evaluate(node => getComputedStyle(node).cursor);
  for (const name of ['hand.svg', 'hand-white.svg']) {
    const asset = await page.request.get(`${appOrigin}/cursors/${name}`);
    assert.equal(asset.status(), 200);
    assert.match(await asset.text(), /width="34" height="34"/);
  }
  assert.match(await cursorAt(page.locator('summary').first()), /hand\.svg/);
  assert.match(await cursorAt(page.locator('[class*="communityLink"]').first()), /hand-white\.svg/);
  assert.match(await cursorAt(page.locator('[class*="primaryButton"]').first()), /hand-white\.svg/);
  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.id = 'cursor-fixture';
    fixture.innerHTML = '<span class="cursor-pointer">Clickable</span><input type="checkbox"><textarea></textarea><button disabled>Disabled</button><button aria-disabled="true">Unavailable</button><a href="#"><span>Nested link</span></a>';
    document.body.append(fixture);
  });
  assert.match(await cursorAt(page.locator('#cursor-fixture .cursor-pointer')), /hand\.svg/);
  assert.match(await cursorAt(page.locator('#cursor-fixture input')), /hand\.svg/);
  assert.match(await cursorAt(page.locator('#cursor-fixture a span')), /hand\.svg/);
  assert.equal(await cursorAt(page.locator('#cursor-fixture textarea')), 'text');
  for (const button of await page.locator('#cursor-fixture button').all()) assert.equal(await cursorAt(button), 'not-allowed');
  await page.locator('#cursor-fixture').evaluate(node => node.remove());
  assert.match(await cursorAt(page.locator('body')), /paper-plane\.svg.*3 4/);
  for (const selector of ['[class*="identityBar"]', '[class*="heroVisual"]', '[class*="community"]', '[class*="finalCta"]']) {
    assert.match(await cursorAt(page.locator(selector).first()), /paper-plane-white\.svg/);
  }
  await page.emulateMedia({ forcedColors: 'active' });
  assert.equal(await cursorAt(page.locator('body')), 'auto');
  assert.equal(await cursorAt(toggle()), 'default');
  assert.equal(await cursorAt(page.locator('summary').first()), 'pointer');
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  assert.match(await cursorAt(page.locator('body')), /paper-plane\.svg/);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const dark of [false, true]) {
    if (dark) await toggle().click();
    assert.match(await cursorAt(page.locator('body')), dark ? /paper-plane-white\.svg/ : /paper-plane\.svg/);
    assert.match(await cursorAt(toggle()), dark ? /hand-white\.svg/ : /hand\.svg/);
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
      .map(animation => animation.finished.catch(() => {}))));
    const axe = await new AxeBuilder({ page }).analyze();
    if (axe.violations.length) console.log(JSON.stringify(axe.violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))})), null, 2));
    assert.deepEqual(axe.violations.map(v => ({ id: v.id, impact: v.impact })), []);
    for (const width of [320, 375, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    }
  }
  await page.screenshot({ path: '/tmp/issue87-home-dark.png', fullPage: true });
  await context.addCookies(jar.map(({ name, value }) => ({ name, value, url: appOrigin })));
  await page.goto(appOrigin);
  assert.equal(await page.locator('a[href="/login"],a[href="/signup"]').count(), 0);
  assert.ok(await page.getByRole('link', { name: 'Open workspace', exact: true }).count());
  assert.ok(await page.getByRole('link', { name: 'Your profile', exact: true }).count());
  for (const width of [320, 375, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Member overflow at ${width}`);
  }
  await page.screenshot({ path: '/tmp/issue87-home-member.png', fullPage: true });
  await page.goto(`${appOrigin}/profile/email-preferences`);
  await toggle().click();
  assert.ok(await page.locator('html').evaluate(node => node.classList.contains('dark')));
  await toggle().press('Enter');
  assert.equal(await page.locator('html').evaluate(node => node.classList.contains('dark')), false);
  const footerNotice = page.locator('footer').getByText('Independent academic prototype', { exact: false });
  const noticeBox = await footerNotice.boundingBox();
  const footerBox = await page.locator('footer').boundingBox();
  assert.ok(Math.abs((noticeBox.x + noticeBox.width/2) - (footerBox.x + footerBox.width/2)) < 2);
  rejectSession = true;
  await page.goto(appOrigin);
  assert.ok(await page.getByRole('link', { name: 'Sign in', exact: true }).count());
  await context.clearCookies();
  await page.goto(appOrigin);
  assert.ok(await page.locator('a[href="/signup"]').count());
  const touch = await browser.newContext({ isMobile: true, hasTouch: true, viewport: { width: 375, height: 812 } });
  const mobile = await touch.newPage(); await mobile.goto(appOrigin);
  assert.equal(await mobile.locator('body').evaluate(node => getComputedStyle(node).cursor), 'auto');
  assert.deepEqual(errors, []);
  console.log('PASS: one-click/keyboard themes, centered notices, static cursor and touch fallback, light/dark accessibility, 320/375/1366 widths, anonymous/member/invalid-session homepage isolation.');
  console.log('Local production build with simulated loopback Auth/Data API. No hosted member data changed.');
} finally {
  await browser?.close(); server?.kill('SIGTERM'); api.closeAllConnections(); api.close();
  writeFileSync('/tmp/issue87-browser-build.log', log.join(''));
}
