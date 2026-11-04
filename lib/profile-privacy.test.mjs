import test from "node:test";
import assert from "node:assert/strict";
import {
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  MAX_REPORT_DETAILS_LENGTH,
  isValidUuid,
  validateReportInput,
  validateBlockInput,
  executeBlockMember,
  executeUnblockMember,
  executeReportMember,
  executeUpdateVisibility,
} from "./profile-privacy.ts";

const VALID_UUID_1 = "00000000-0000-0000-0000-000000000001";
const VALID_UUID_2 = "00000000-0000-0000-0000-000000000002";

test("isValidUuid checks valid and invalid UUID formats", () => {
  assert.equal(isValidUuid(VALID_UUID_1), true);
  assert.equal(isValidUuid("not-a-uuid"), false);
  assert.equal(isValidUuid(123), false);
  assert.equal(isValidUuid(null), false);
  assert.equal(isValidUuid(""), false);
});

test("REPORT_REASONS includes all five required categories with user-friendly labels", () => {
  assert.deepEqual(REPORT_REASONS, [
    "harassment",
    "inappropriate_content",
    "impersonation",
    "spam",
    "other",
  ]);

  for (const reason of REPORT_REASONS) {
    assert.ok(REPORT_REASON_LABELS[reason], `Missing label for reason: ${reason}`);
    assert.ok(REPORT_REASON_LABELS[reason].length > 3);
  }
});

test("validateReportInput validates valid submissions correctly", () => {
  const result = validateReportInput({
    reporterId: VALID_UUID_1,
    reportedId: VALID_UUID_2,
    reason: "harassment",
    details: "Sent offensive messages",
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.reason, "harassment");
    assert.equal(result.details, "Sent offensive messages");
    assert.equal(result.reporterId, VALID_UUID_1);
    assert.equal(result.reportedId, VALID_UUID_2);
  }
});

test("validateReportInput allows empty details", () => {
  const result = validateReportInput({
    reporterId: VALID_UUID_1,
    reportedId: VALID_UUID_2,
    reason: "spam",
    details: "",
  });

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.details, "");
  }
});

test("validateReportInput rejects invalid reporter or reported UUIDs", () => {
  const res1 = validateReportInput({
    reporterId: "invalid",
    reportedId: VALID_UUID_2,
    reason: "spam",
  });
  assert.equal(res1.valid, false);

  const res2 = validateReportInput({
    reporterId: VALID_UUID_1,
    reportedId: "invalid",
    reason: "spam",
  });
  assert.equal(res2.valid, false);
});

test("validateReportInput rejects self-reporting", () => {
  const res = validateReportInput({
    reporterId: VALID_UUID_1,
    reportedId: VALID_UUID_1,
    reason: "spam",
  });
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.error, /cannot report your own account/i);
  }
});

test("validateReportInput rejects invalid category", () => {
  const res = validateReportInput({
    reporterId: VALID_UUID_1,
    reportedId: VALID_UUID_2,
    reason: "fake_category",
  });
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.error, /select a valid report category/i);
  }
});

test("validateReportInput rejects details exceeding 1000 characters", () => {
  const longDetails = "a".repeat(MAX_REPORT_DETAILS_LENGTH + 1);
  const res = validateReportInput({
    reporterId: VALID_UUID_1,
    reportedId: VALID_UUID_2,
    reason: "other",
    details: longDetails,
  });
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.error, /1000 characters or fewer/i);
  }
});

test("validateBlockInput validates valid block and rejects self-block or invalid UUIDs", () => {
  const ok = validateBlockInput({
    blockerId: VALID_UUID_1,
    blockedId: VALID_UUID_2,
  });
  assert.equal(ok.valid, true);
  if (ok.valid) {
    assert.equal(ok.blockerId, VALID_UUID_1);
    assert.equal(ok.blockedId, VALID_UUID_2);
  }

  const self = validateBlockInput({
    blockerId: VALID_UUID_1,
    blockedId: VALID_UUID_1,
  });
  assert.equal(self.valid, false);
  if (!self.valid) {
    assert.match(self.error, /cannot block yourself/i);
  }

  const badUuid = validateBlockInput({
    blockerId: "xyz",
    blockedId: VALID_UUID_2,
  });
  assert.equal(badUuid.valid, false);
});

function makeMockSupabase({
  user = { id: VALID_UUID_1 },
  insertError = null,
  deleteError = null,
  updateError = null,
  updateData = { is_visible: true, member_visible: true, staff_hidden: false },
} = {}) {
  return {
    auth: {
      getUser: async () => ({ data: { user } }),
    },
    from: () => ({
      insert: async () => ({ error: insertError }),
      delete: () => ({
        eq: () => ({
          eq: async () => ({ error: deleteError }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: updateData, error: updateError }),
          }),
        }),
      }),
    }),
    rpc: async () => ({ error: null }),
  };
}

test("executeBlockMember requires authentication", async () => {
  const sb = makeMockSupabase({ user: null });
  const res = await executeBlockMember(sb, VALID_UUID_2);
  assert.equal(res.ok, false);
  assert.match(res.error, /must be signed in/i);
});

test("executeBlockMember validates target UUID", async () => {
  const sb = makeMockSupabase();
  const res = await executeBlockMember(sb, "bad-id");
  assert.equal(res.ok, false);
  assert.match(res.error, /invalid member profile/i);
});

test("executeBlockMember prevents self-blocking", async () => {
  const sb = makeMockSupabase();
  const res = await executeBlockMember(sb, VALID_UUID_1);
  assert.equal(res.ok, false);
  assert.match(res.error, /cannot block yourself/i);
});

test("executeBlockMember succeeds on valid input", async () => {
  const sb = makeMockSupabase();
  const res = await executeBlockMember(sb, VALID_UUID_2);
  assert.equal(res.ok, true);
  assert.match(res.message, /blocked successfully/i);
});

test("executeBlockMember handles duplicate block gracefully", async () => {
  const sb = makeMockSupabase({ insertError: { code: "23505" } });
  const res = await executeBlockMember(sb, VALID_UUID_2);
  assert.equal(res.ok, true);
  assert.match(res.message, /already blocked/i);
});

test("executeUnblockMember requires authentication and valid UUID", async () => {
  const sbNoAuth = makeMockSupabase({ user: null });
  const res1 = await executeUnblockMember(sbNoAuth, VALID_UUID_2);
  assert.equal(res1.ok, false);

  const sb = makeMockSupabase();
  const res2 = await executeUnblockMember(sb, "not-a-uuid");
  assert.equal(res2.ok, false);

  const res3 = await executeUnblockMember(sb, VALID_UUID_2);
  assert.equal(res3.ok, true);
});

test("executeReportMember validates categories and handles duplicate pending report", async () => {
  const sb = makeMockSupabase();
  const badCategory = await executeReportMember(sb, {
    reportedId: VALID_UUID_2,
    reason: "unknown_category",
    details: "",
  });
  assert.equal(badCategory.ok, false);

  const ok = await executeReportMember(sb, {
    reportedId: VALID_UUID_2,
    reason: "spam",
    details: "Commercial solicitation",
  });
  assert.equal(ok.ok, true);

  const sbDup = makeMockSupabase({ insertError: { code: "23505" } });
  const dup = await executeReportMember(sbDup, {
    reportedId: VALID_UUID_2,
    reason: "spam",
    details: "",
  });
  assert.equal(dup.ok, false);
  assert.match(dup.error, /already submitted a pending report/i);
});

test("executeUpdateVisibility reflects staff_hidden restriction", async () => {
  const sbNormal = makeMockSupabase({
    updateData: { is_visible: false, member_visible: false, staff_hidden: false },
  });
  const resNormal = await executeUpdateVisibility(sbNormal, false);
  assert.equal(resNormal.ok, true);
  assert.equal(resNormal.staffHidden, false);

  const sbStaffHidden = makeMockSupabase({
    updateData: { is_visible: false, member_visible: true, staff_hidden: true },
  });
  const resRestricted = await executeUpdateVisibility(sbStaffHidden, true);
  assert.equal(resRestricted.ok, true);
  assert.equal(resRestricted.staffHidden, true);
  assert.match(resRestricted.message, /restricted by staff moderation/i);
});
