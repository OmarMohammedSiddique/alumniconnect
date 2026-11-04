export interface ProfileDraftFields {
  full_name: string;
  headline: string;
  bio: string;
  skills: string;
  industry: string;
  graduation_year: string;
}

export interface StoredProfileDraft {
  userId: string;
  fields: ProfileDraftFields;
  updatedAt: number;
}

export const DRAFT_STORAGE_PREFIX = "alumniconnect_profile_draft_";
export const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function getDraftStorageKey(userId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${userId}`;
}

export function hasDraftDifferences(
  draft: ProfileDraftFields,
  persisted: ProfileDraftFields,
): boolean {
  return (
    draft.full_name !== persisted.full_name ||
    draft.headline !== persisted.headline ||
    draft.bio !== persisted.bio ||
    draft.skills !== persisted.skills ||
    draft.industry !== persisted.industry ||
    draft.graduation_year !== persisted.graduation_year
  );
}

export function saveProfileDraft(
  storage: Storage | null | undefined,
  userId: string,
  fields: ProfileDraftFields,
  now: number = Date.now(),
): void {
  if (!storage || !userId) return;
  try {
    const payload: StoredProfileDraft = {
      userId,
      fields,
      updatedAt: now,
    };
    storage.setItem(getDraftStorageKey(userId), JSON.stringify(payload));
  } catch {
    // Storage access may be blocked or quota exceeded in strict privacy modes
  }
}

export function loadProfileDraft(
  storage: Storage | null | undefined,
  userId: string,
  now: number = Date.now(),
): StoredProfileDraft | null {
  if (!storage || !userId) return null;
  try {
    const raw = storage.getItem(getDraftStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredProfileDraft>;
    if (parsed.userId !== userId || !parsed.fields || typeof parsed.updatedAt !== "number") {
      storage.removeItem(getDraftStorageKey(userId));
      return null;
    }
    // Check expiry
    if (now - parsed.updatedAt > DRAFT_EXPIRY_MS) {
      storage.removeItem(getDraftStorageKey(userId));
      return null;
    }
    return parsed as StoredProfileDraft;
  } catch {
    return null;
  }
}

export function clearProfileDraft(
  storage: Storage | null | undefined,
  userId: string,
): void {
  if (!storage || !userId) return;
  try {
    storage.removeItem(getDraftStorageKey(userId));
  } catch {
    // Ignore storage errors on cleanup
  }
}
