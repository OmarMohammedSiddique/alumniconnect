import assert from "node:assert/strict";
import test from "node:test";
import {
  saveProfileDraft,
  loadProfileDraft,
  clearProfileDraft,
  clearAllProfileDrafts,
  hasDraftDifferences,
  reconcileDraftAfterSave,
  getDraftStorageKey,
  DRAFT_EXPIRY_MS,
} from "./profile-draft.ts";

function createMockStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
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

test("reconcileDraftAfterSave preserves in-flight edits made while a save is pending", () => {
  const submitted = { ...sampleFields, full_name: "  Jane   Doe  " };
  // Case 1: no edits occurred while saving
  const unchanged = reconcileDraftAfterSave(submitted, submitted, "Jane Doe");
  assert.equal(unchanged.nextDraft.full_name, "Jane Doe");
  assert.equal(unchanged.nextSavedDraft.full_name, "Jane Doe");
  assert.equal(unchanged.hasRemainingUnsavedChanges, false);

  // Case 2: user edited bio while the save request was in-flight
  const editedDuringSave = { ...submitted, bio: "Edited while saving in-flight" };
  const reconciled = reconcileDraftAfterSave(editedDuringSave, submitted, "Jane Doe");
  assert.equal(reconciled.nextDraft.full_name, "Jane Doe");
  assert.equal(reconciled.nextDraft.bio, "Edited while saving in-flight");
  assert.equal(reconciled.nextSavedDraft.bio, sampleFields.bio);
  assert.equal(reconciled.hasRemainingUnsavedChanges, true);
});

test("clearAllProfileDrafts removes all profile draft keys on sign-out while preserving unrelated keys", () => {
  const storage = createMockStorage();
  saveProfileDraft(storage, "user-1", sampleFields);
  saveProfileDraft(storage, "user-2", sampleFields);
  storage.setItem("other_session_key", "keep-me");

  clearAllProfileDrafts(storage);

  assert.equal(loadProfileDraft(storage, "user-1"), null);
  assert.equal(loadProfileDraft(storage, "user-2"), null);
  assert.equal(storage.getItem("other_session_key"), "keep-me");
});
