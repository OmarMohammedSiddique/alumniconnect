import assert from "node:assert/strict";
import test from "node:test";
import { getIdentityCollectionError, IDENTITY_FIELDS } from "./registration-privacy.ts";

test("permits account registration without identity collection", () => {
  const data = new FormData();
  data.set("first_name", "Test");
  data.set("email", "test@example.test");
  assert.equal(getIdentityCollectionError(data), null);
});

test("rejects direct identity submissions even when disabled form fields are bypassed", () => {
  for (const field of IDENTITY_FIELDS) {
    const data = new FormData();
    data.set(field, "fictional-test-value");
    assert.ok(getIdentityCollectionError(data), field);
  }
});

test("does not allow an empty first value to hide an identifier", () => {
  const data = new FormData();
  data.append("staff_id", "");
  data.append("staff_id", "fictional-test-value");
  assert.ok(getIdentityCollectionError(data));
});
