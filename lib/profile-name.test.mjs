import assert from "node:assert/strict";
import test from "node:test";
import { formatFullName } from "./profile-name.ts";

test("capitalizes lowercase name parts and normalizes spacing", () => {
  assert.equal(formatFullName("  jane\t  doe \n"), "Jane Doe");
  assert.equal(formatFullName("amina"), "Amina");
});

test("handles compound names and Unicode initials", () => {
  assert.equal(formatFullName("anne-marie o'neill"), "Anne-Marie O'Neill");
  assert.equal(formatFullName("éloïse d’angelo"), "Éloïse D’Angelo");
});

test("preserves intentional capitalization and non-cased names", () => {
  assert.equal(formatFullName("Jane McDonald"), "Jane McDonald");
  assert.equal(formatFullName("李 明"), "李 明");
});

test("keeps blank names empty for existing required-field validation", () => {
  assert.equal(formatFullName(" \t\n"), "");
});
