import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
  COOKIE_CONSENT_KEY, DEFAULT_PREFERENCES, parseStoredConsent,
  acceptAllCookies, rejectNonEssentialCookies, saveCookieConsent,
  getCookieConsentSnapshot, subscribeToCookieConsent, filterAnalyticsEvent,
} from "./cookie-consent.ts";
import { getStoredTheme, setAppTheme, THEME_STORAGE_KEY } from "./theme.ts";
import { THEME_BOOTSTRAP_SCRIPT } from "./theme-bootstrap.ts";

const record = (functional, analytics) => JSON.stringify({
  version: 1, timestamp: "2026-11-06T00:00:00.000Z",
  preferences: { necessary: true, functional, analytics },
});

function browser() {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const classes = new Set();
  const meta = { content: "light" };
  return { values, localStorage, meta, classes,
    document: {
      documentElement: { classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v) } },
      querySelector: () => meta,
    },
  };
}

test("optional storage defaults off and malformed values cannot grant consent", () => {
  assert.deepEqual(DEFAULT_PREFERENCES, { necessary: true, functional: false, analytics: false });
  for (const value of ["false", "true", 1, null, [], {}]) {
    assert.equal(parseStoredConsent(record(false, value)), null);
    assert.equal(parseStoredConsent(record(value, false)), null);
  }
});

test("pre-hydration theme restoration requires valid functional consent", () => {
  for (const consent of [null, record(false, false), record("true", true), record(true, "false"), "invalid"]) {
    const mock = browser();
    mock.values.set(THEME_STORAGE_KEY, "dark");
    if (consent) mock.values.set(COOKIE_CONSENT_KEY, consent);
    vm.runInNewContext(THEME_BOOTSTRAP_SCRIPT, mock);
    assert.equal(mock.classes.has("dark"), false);
    assert.equal(mock.values.has(THEME_STORAGE_KEY), false);
  }
  const mock = browser();
  mock.values.set(COOKIE_CONSENT_KEY, record(true, false));
  mock.values.set(THEME_STORAGE_KEY, "dark");
  vm.runInNewContext(THEME_BOOTSTRAP_SCRIPT, mock);
  assert.equal(mock.classes.has("dark"), true);
  assert.equal(mock.meta.content, "dark");
});

test("consent lifecycle gates retained analytics callbacks and functional storage", () => {
  const original = { window: globalThis.window, localStorage: globalThis.localStorage, document: globalThis.document };
  const mock = browser();
  const window = new EventTarget();
  globalThis.window = window;
  globalThis.localStorage = mock.localStorage;
  globalThis.document = mock.document;
  let notifications = 0;
  const unsubscribe = subscribeToCookieConsent(() => notifications++);
  const event = { type: "pageview", url: "https://example.test/" };
  // Keep the same callback throughout, as an already injected analytics script does.
  const retainedCallback = filterAnalyticsEvent;
  function storageChange(key, newValue, storageArea = mock.localStorage) {
    const e = new Event("storage");
    Object.assign(e, { key, newValue, storageArea });
    window.dispatchEvent(e);
  }
  try {
    assert.equal(retainedCallback(event), null);
    mock.values.set(THEME_STORAGE_KEY, "dark");
    assert.equal(getStoredTheme(), "light");
    assert.equal(mock.values.has(THEME_STORAGE_KEY), false);
    setAppTheme("dark");
    assert.equal(mock.classes.has("dark"), true);
    assert.equal(mock.values.has(THEME_STORAGE_KEY), false, "session appearance must not persist without consent");

    acceptAllCookies();
    assert.equal(retainedCallback(event), event);
    assert.equal(mock.values.get(THEME_STORAGE_KEY), "dark");
    rejectNonEssentialCookies();
    assert.equal(retainedCallback(event), null, "revocation must gate a callback retained before rejection");
    assert.equal(mock.values.has(THEME_STORAGE_KEY), false);
    setAppTheme("light");
    assert.equal(mock.values.has(THEME_STORAGE_KEY), false);

    saveCookieConsent({ functional: true, analytics: false });
    assert.equal(retainedCallback(event), null);
    assert.equal(mock.values.get(THEME_STORAGE_KEY), "light");
    const grant = record(true, true);
    mock.values.set(COOKIE_CONSENT_KEY, grant);
    storageChange(COOKIE_CONSENT_KEY, grant);
    assert.equal(retainedCallback(event), event);
    storageChange(COOKIE_CONSENT_KEY, null, {});
    assert.equal(retainedCallback(event), event, "sessionStorage events must not override local consent");
    mock.values.clear();
    storageChange(null, null);
    assert.equal(getCookieConsentSnapshot(), null, "another tab clearing storage must reset consent");
    assert.equal(retainedCallback(event), null);
    storageChange(COOKIE_CONSENT_KEY, record(false, "false"));
    assert.equal(getCookieConsentSnapshot(), null);
    assert.equal(retainedCallback(event), null);

    mock.localStorage.setItem = () => { throw new Error("Storage blocked"); };
    acceptAllCookies();
    assert.equal(getCookieConsentSnapshot()?.preferences.analytics, true, "blocked persistence still permits an in-memory decision");
    rejectNonEssentialCookies();
    assert.equal(retainedCallback(event), null);
    assert.ok(notifications >= 8);
  } finally {
    unsubscribe();
    Object.assign(globalThis, original);
  }
});


test("a decision before the first subscription survives unavailable browser storage", async () => {
  const original = { window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem() { throw new Error("Storage blocked"); },
    setItem() { throw new Error("Storage blocked"); },
  };
  const fresh = await import("./cookie-consent.ts?initial-storage-blocked");
  try {
    let eventCount = 0;
    window.addEventListener(fresh.COOKIE_CONSENT_EVENT, () => eventCount++);
    fresh.acceptAllCookies();
    const unsubscribe = fresh.subscribeToCookieConsent(() => {});
    assert.equal(fresh.getCookieConsentSnapshot()?.preferences.analytics, true);
    fresh.rejectNonEssentialCookies();
    assert.equal(fresh.filterAnalyticsEvent({ type: "pageview" }), null);
    assert.equal(eventCount, 2);
    unsubscribe();
  } finally {
    Object.assign(globalThis, original);
  }
});
