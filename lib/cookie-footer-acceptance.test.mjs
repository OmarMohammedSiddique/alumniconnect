import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

test("about-developer page exists, contains Omar Siddique bio, and links to omarsiddique.com", () => {
  const filePath = path.join(ROOT, "app/(marketing)/about-developer/page.tsx");
  assert.ok(fs.existsSync(filePath), "about-developer page must exist");

  const content = fs.readFileSync(filePath, "utf-8");
  assert.match(content, /Omar Siddique/);
  assert.match(content, /https:\/\/omarsiddique\.com/);
  assert.match(content, /target="_blank"/);
  assert.match(content, /rel="noopener noreferrer"/);
  assert.match(content, /Strathmore University/);
  assert.match(content, /CookieSettingsTrigger/);
});

test("about redirect page exists and points to /about-developer", () => {
  const filePath = path.join(ROOT, "app/(marketing)/about/page.tsx");
  assert.ok(fs.existsSync(filePath), "/about page must exist");

  const content = fs.readFileSync(filePath, "utf-8");
  assert.match(content, /redirect\("\/about-developer"\)/);
});

test("marketing landing page footer includes Cookie settings, Privacy policy, and About Developer", () => {
  const filePath = path.join(ROOT, "app/(marketing)/page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(content, /href="\/about-developer"/);
  assert.match(content, /About Developer/);
  assert.match(content, /href="\/privacy"/);
  assert.match(content, /Privacy Policy/);
  assert.match(content, /<CookieSettingsTrigger/);
});

test("auth layout footer includes Cookie settings, Privacy policy, and About Developer", () => {
  const filePath = path.join(ROOT, "app/(auth)/layout.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(content, /href="\/about-developer"/);
  assert.match(content, /href="\/privacy"/);
  assert.match(content, /<CookieSettingsTrigger/);
});

test("dashboard workspace layout includes footer with About Developer, Privacy Policy, and Cookie Settings", () => {
  const filePath = path.join(ROOT, "app/(dashboard)/layout.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(content, /href="\/about-developer"/);
  assert.match(content, /href="\/privacy"/);
  assert.match(content, /<CookieSettingsTrigger/);
});

test("privacy page documents cookies and local storage and includes cookie settings trigger", () => {
  const filePath = path.join(ROOT, "app/(auth)/privacy/page.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(content, /Cookies and local storage/i);
  assert.match(content, /Strictly Necessary/i);
  assert.match(content, /alumnikonneqt-cookie-consent/);
  assert.match(content, /alumnikonneqt-theme/);
  assert.match(content, /CookieSettingsTrigger/);
  assert.match(content, /href="\/about-developer"/);
});

test("root layout mounts CookieBanner and AnalyticsWrapper globally", () => {
  const filePath = path.join(ROOT, "app/layout.tsx");
  const content = fs.readFileSync(filePath, "utf-8");

  assert.match(content, /<CookieBanner \/>/);
  assert.match(content, /<AnalyticsWrapper \/>/);
});
