// Issue #75 browser acceptance. Uses isolated browser storage and no account data.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const base = new URL(process.env.COOKIE_APP_URL ?? "http://localhost:3105");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let analyticsRequests = 0;
// Exercise SDK injection and its real beforeSend registration without sending telemetry.
await context.route(/\/(_vercel\/insights|vitals\.vercel-insights\.com)\//, async route => {
  analyticsRequests++;
  await route.fulfill({ contentType: "application/javascript", body: "/* analytics network stub */" });
});
const banner = page.getByRole("region", { name: "Cookie and local storage consent" });
const dialog = page.getByRole("dialog");
const consent = () => page.evaluate(() => JSON.parse(localStorage.getItem("alumnikonneqt-cookie-consent")));
const settings = () => page.getByRole("button", { name: "Cookie settings", exact: true }).first();
async function closed() { await dialog.waitFor({ state: "hidden" }); }
async function open() { await settings().click(); await dialog.waitFor({ state: "visible" }); }
async function theme(name) {
  await page.getByRole("button", { name: /Current theme:/ }).first().click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
    .map(animation => animation.finished.catch(() => {}))));
}
let passed = 0;
function pass(label) { console.log(`PASS ${++passed}: ${label}`); }
try {
  await page.goto(base.href);
  await banner.waitFor();
  assert.equal(await page.locator('script[src*="insights"]').count(), 0);
  assert.equal(analyticsRequests, 0);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await dialog.waitFor();
  assert.equal(await dialog.getAttribute("closedby"), "any");
  assert.equal(await page.getByLabel("Allow preferences and functional storage", { exact: true }).isChecked(), false);
  assert.equal(await page.getByLabel("Allow analytics and performance telemetry", { exact: true }).isChecked(), false);
  assert.equal(await dialog.getByRole("checkbox").count(), 2, "necessary storage must have no editable switch");
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    assert.ok(await dialog.evaluate(node => node.contains(document.activeElement) || document.activeElement === document.body), "Tab must not focus background page controls");
  }
  await page.keyboard.press("Escape");
  await closed();
  assert.ok(await page.getByRole("button", { name: "Customize", exact: true }).evaluate(node => node === document.activeElement));
  assert.equal(await consent(), null, "dismissal must not grant consent");
  pass("initial defaults, native semantics, focus trap, Escape and focus restoration");

  await page.getByRole("button", { name: "Reject Non-Essential", exact: true }).click();
  await banner.waitFor({ state: "hidden" });
  assert.deepEqual((await consent()).preferences, { necessary: true, functional: false, analytics: false });
  await theme("Dark");
  assert.ok(await page.locator("html").evaluate(node => node.classList.contains("dark")));
  assert.equal(await page.evaluate(() => localStorage.getItem("alumnikonneqt-theme")), null);
  await page.reload();
  await banner.waitFor({ state: "hidden" });
  assert.equal(await page.locator("html").evaluate(node => node.classList.contains("dark")), false);
  pass("reject persists, dismisses banner, and keeps theme session-only across reload");

  await open();
  await page.getByLabel("Allow preferences and functional storage", { exact: true }).check();
  await dialog.getByRole("button", { name: "Save Preferences" }).click();
  await closed();
  await theme("Dark");
  await page.reload();
  assert.ok(await page.locator("html").evaluate(node => node.classList.contains("dark")));
  assert.equal(await page.locator('script[src*="insights"]').count(), 0);
  pass("custom functional-only consent restores theme without injecting analytics");

  await open();
  await dialog.getByRole("button", { name: "Accept All", exact: true }).click();
  await closed();
  await page.waitForFunction(() => window.vaq?.some(([name]) => name === "beforeSend"));
  const allowed = await page.evaluate(() => {
    window.retainedConsentFilter = window.vaq.find(([name]) => name === "beforeSend")[1];
    return window.retainedConsentFilter({ type: "pageview", url: location.href }) !== null;
  });
  assert.ok(allowed);
  await open();
  await dialog.getByRole("button", { name: "Reject Non-Essential" }).click();
  await closed();
  assert.equal(await page.evaluate(() => window.retainedConsentFilter({ type: "pageview", url: location.href })), null);
  assert.equal(await page.evaluate(() => localStorage.getItem("alumnikonneqt-theme")), null);
  pass("Accept All injects SDK, then revocation blocks its retained callback and removes saved theme");

  await open();
  await page.getByLabel("Allow analytics and performance telemetry", { exact: true }).check();
  await page.mouse.click(2, 2);
  await closed();
  await open();
  assert.equal(await page.getByLabel("Allow analytics and performance telemetry", { exact: true }).isChecked(), false, "light dismissal discards drafts");
  const axe = await new AxeBuilder({ page }).include("dialog").analyze();
  assert.deepEqual(axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary })) })), []);
  for (const [width, height] of [[320, 480], [375, 667], [844, 390], [1366, 768]]) {
    await page.setViewportSize({ width, height });
    const box = await dialog.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `dialog fits ${width}x${height}`);
    assert.ok(await dialog.getByRole("button", { name: "Save Preferences" }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (width === 320) await page.screenshot({ path: "/private/tmp/issue75-dialog-mobile.png" });
  }
  await page.keyboard.press("Escape");
  await closed();
  pass("light dismiss resets drafts, axe reports no dialog violations, and short/mobile viewports fit");

  await page.setViewportSize({ width: 1366, height: 768 });
  for (const route of ["/", "/login", "/signup", "/privacy", "/about-developer"]) {
    await page.goto(new URL(route, base).href);
    await settings().waitFor();
    assert.ok(await page.locator('a[href="/privacy"]').count());
    if (route !== "/about-developer") assert.ok(await page.locator('a[href="/about-developer"]').count(), route);
    await open();
    await page.keyboard.press("Escape");
    await closed();
  }
  assert.ok(await page.locator('a[href="https://omarsiddique.com"]').count() >= 1);
  await page.goto(new URL("/about", base).href);
  assert.equal(new URL(page.url()).pathname, "/about-developer");
  pass("marketing and auth footer links reopen settings, privacy and developer pages render, legacy about redirects");

  await theme("Dark");
  const other = await context.newPage();
  await other.goto(base.href);
  await other.evaluate(() => localStorage.clear());
  await banner.waitFor({ state: "visible" });
  await other.close();
  for (const name of ["Dark", "Light"]) {
    await theme(name);
    const result = await new AxeBuilder({ page }).include('aside[aria-label="Cookie and local storage consent"]').analyze();
    assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) })), []);
  }
  pass("cross-tab storage clear restores the consent banner");
  assert.deepEqual(errors, [], "no browser JavaScript or hydration errors");
  console.log(`Issue #75 browser acceptance passed (${passed} groups).`);
} finally {
  await browser.close();
}
