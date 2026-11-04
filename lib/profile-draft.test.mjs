import assert from "node:assert/strict";
import test from "node:test";
import {
  saveProfileDraft,
  loadProfileDraft,
  clearProfileDraft,
  hasDraftDifferences,
  getDraftStorageKey,
  DRAFT_EXPIRY_MS,
} from "./profile-draft.ts";

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

const sampleFields = {
  full_name: "Jane Doe",
  headline: "Software Engineer",
  bio: "Passionate about open source",
  skills: "TypeScript, React, Node.js",
  industry: "Technology",
  graduation_year: "2024",
};

test("saveProfileDraft persists user-scoped draft and loadProfileDraft retrieves it", () => {
  const storage = createMockStorage();
  const userId = "user-123";
  const now = 1_000_000;

  saveProfileDraft(storage, userId, sampleFields, now);

  const loaded = loadProfileDraft(storage, userId, now + 1000);
  assert.ok(loaded);
  assert.equal(loaded.userId, userId);
  assert.deepEqual(loaded.fields, sampleFields);
  assert.equal(loaded.updatedAt, now);
});

test("loadProfileDraft isolates drafts between different user accounts", () => {
  const storage = createMockStorage();
  const userA = "user-a";
  const userB = "user-b";

  saveProfileDraft(storage, userA, sampleFields);

  // User B cannot access User A's draft
  const loadedB = loadProfileDraft(storage, userB);
  assert.equal(loadedB, null);

  // If storage somehow has mismatched userId, it is cleared and rejected
  storage.setItem(getDraftStorageKey(userB), JSON.stringify({ userId: userA, fields: sampleFields, updatedAt: Date.now() }));
  assert.equal(loadProfileDraft(storage, userB), null);
});

test("loadProfileDraft rejects and evicts expired drafts", () => {
  const storage = createMockStorage();
  const userId = "user-exp";
  const createdTime = 1_000_000;

  saveProfileDraft(storage, userId, sampleFields, createdTime);

  // Expired after DRAFT_EXPIRY_MS
  const expiredTime = createdTime + DRAFT_EXPIRY_MS + 1000;
  const loaded = loadProfileDraft(storage, userId, expiredTime);
  assert.equal(loaded, null);

  // Key is evicted
  assert.equal(storage.getItem(getDraftStorageKey(userId)), null);
});

test("clearProfileDraft removes the stored draft for the specified user", () => {
  const storage = createMockStorage();
  const userId = "user-clear";

  saveProfileDraft(storage, userId, sampleFields);
  assert.ok(loadProfileDraft(storage, userId));

  clearProfileDraft(storage, userId);
  assert.equal(loadProfileDraft(storage, userId), null);
});

test("hasDraftDifferences detects any modified field", () => {
  const base = { ...sampleFields };
  assert.equal(hasDraftDifferences(base, sampleFields), false);

  const changed = { ...sampleFields, headline: "Updated Headline" };
  assert.equal(hasDraftDifferences(changed, sampleFields), true);
});

test("handles null or throwing storage gracefully without breaking", () => {
  const throwingStorage = {
    getItem: () => { throw new Error("SecurityError: Access Denied"); },
    setItem: () => { throw new Error("QuotaExceededError"); },
    removeItem: () => { throw new Error("SecurityError"); },
  };

  assert.doesNotThrow(() => saveProfileDraft(throwingStorage, "u1", sampleFields));
  assert.equal(loadProfileDraft(throwingStorage, "u1"), null);
  assert.doesNotThrow(() => clearProfileDraft(throwingStorage, "u1"));

  assert.doesNotThrow(() => saveProfileDraft(null, "u1", sampleFields));
  assert.equal(loadProfileDraft(null, "u1"), null);
});
