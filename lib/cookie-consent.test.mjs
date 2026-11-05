import assert from "node:assert/strict";
import test from "node:test";
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
  COOKIE_SETTINGS_MODAL_EVENT,
  DEFAULT_PREFERENCES,
  parseStoredConsent,
  saveCookieConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  getStoredConsent,
  openCookieSettings,
  closeCookieSettings,
  subscribeToCookieSettingsModal,
} from "./cookie-consent.ts";

test("COOKIE_CONSENT_KEY and events match domain naming", () => {
  assert.equal(COOKIE_CONSENT_KEY, "alumnikonneqt-cookie-consent");
  assert.equal(COOKIE_CONSENT_EVENT, "alumnikonneqt:cookie-consent-updated");
  assert.equal(COOKIE_SETTINGS_MODAL_EVENT, "alumnikonneqt:open-cookie-settings");
});

test("DEFAULT_PREFERENCES enforces necessary cookies and denies analytics by default", () => {
  assert.equal(DEFAULT_PREFERENCES.necessary, true);
  assert.equal(DEFAULT_PREFERENCES.functional, true);
  assert.equal(DEFAULT_PREFERENCES.analytics, false);
});

test("parseStoredConsent handles invalid JSON, null, and malformed structures safely", () => {
  assert.equal(parseStoredConsent(null), null);
  assert.equal(parseStoredConsent(undefined), null);
  assert.equal(parseStoredConsent(""), null);
  assert.equal(parseStoredConsent("not json"), null);
  assert.equal(parseStoredConsent("[]"), null);
  assert.equal(parseStoredConsent(JSON.stringify({ version: 2 })), null);
  assert.equal(parseStoredConsent(JSON.stringify({ version: 1 })), null);
});

test("parseStoredConsent parses valid v1 consent and locks necessary to true", () => {
  const raw = JSON.stringify({
    version: 1,
    timestamp: "2026-11-05T20:00:00.000Z",
    preferences: {
      necessary: false, // Attempt to tamper necessary
      functional: true,
      analytics: false,
    },
  });

  const parsed = parseStoredConsent(raw);
  assert.ok(parsed);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.timestamp, "2026-11-05T20:00:00.000Z");
  assert.equal(parsed.preferences.necessary, true, "Necessary must always remain true");
  assert.equal(parsed.preferences.functional, true);
  assert.equal(parsed.preferences.analytics, false);
});

test("acceptAllCookies and rejectNonEssentialCookies build expected payloads", () => {
  // Test in headless/node context
  const mockStorage = new Map();
  const mockEvents = [];

  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;

  globalThis.localStorage = {
    getItem: (key) => mockStorage.get(key) ?? null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
  };

  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: (evt) => {
      mockEvents.push(evt);
      return true;
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  };

  try {
    const accepted = acceptAllCookies();
    assert.equal(accepted.preferences.necessary, true);
    assert.equal(accepted.preferences.functional, true);
    assert.equal(accepted.preferences.analytics, true);

    const storedRaw = mockStorage.get(COOKIE_CONSENT_KEY);
    assert.ok(storedRaw);
    const parsedStored = JSON.parse(storedRaw);
    assert.equal(parsedStored.preferences.analytics, true);

    const storedFromFn = getStoredConsent();
    assert.deepEqual(storedFromFn?.preferences, accepted.preferences);

    const rejected = rejectNonEssentialCookies();
    assert.equal(rejected.preferences.necessary, true);
    assert.equal(rejected.preferences.functional, false);
    assert.equal(rejected.preferences.analytics, false);

    // Test custom preferences
    const custom = saveCookieConsent({ functional: true, analytics: false });
    assert.equal(custom.preferences.functional, true);
    assert.equal(custom.preferences.analytics, false);
    assert.equal(custom.preferences.necessary, true);

    // Modal subscription
    let modalState = false;
    const unsub = subscribeToCookieSettingsModal((open) => {
      modalState = open;
    });

    openCookieSettings();
    assert.equal(modalState, true);

    closeCookieSettings();
    assert.equal(modalState, false);

    unsub();
  } finally {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
  }
});
