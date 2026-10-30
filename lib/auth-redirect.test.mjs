import assert from "node:assert/strict";
import test from "node:test";
import { getSafeSignInRedirect } from "./auth-redirect.ts";

test("preserves internal destinations, query strings and fragments", () => {
  for (const path of [
    "/",
    "/profile",
    "/requests?status=pending#incoming",
    "/discover?industry=aviation&search=flight%20operations",
    "/discover?search=https://example.org",
  ]) {
    assert.equal(getSafeSignInRedirect(path), path);
  }
});

test("falls back for empty, relative, absolute and protocol-relative destinations", () => {
  for (const path of [
    "",
    "profile",
    "https://example.org",
    "//example.org",
    "///example.org",
    "javascript:alert(1)",
    " https://example.org",
  ]) {
    assert.equal(getSafeSignInRedirect(path), "/discover", JSON.stringify(path));
  }
});

test("blocks browser-normalized backslash and control-character redirect bypasses", () => {
  for (const path of [
    "/\\example.org",
    "/\\\\example.org",
    "/\t/example.org",
    "/\n/example.org",
    "/\r/example.org",
    "/\r\n\\example.org",
    "/\\user:password@example.org",
    "/\\[invalid-host",
  ]) {
    assert.equal(getSafeSignInRedirect(path), "/discover", JSON.stringify(path));
  }
});

test("blocks double slashes exposed by dot-segment normalization", () => {
  for (const path of [
    "/one/..//example.org",
    "/one/%2e%2e//example.org",
    "/.//example.org",
  ]) {
    assert.equal(getSafeSignInRedirect(path), "/discover", path);
  }
});

test("returns normalized internal paths that resolve safely on any deployment", () => {
  for (const path of [
    "/one/../profile?tab=skills#edit",
    "/profile\\edit",
    "/%2f%2fexample.org",
    "/discover?search=\\example.org",
  ]) {
    const safe = getSafeSignInRedirect(path);
    for (const origin of ["https://alumni.example", "http://localhost:3000"]) {
      assert.equal(new URL(safe, origin).origin, origin);
    }
    assert.equal(getSafeSignInRedirect(safe), safe);
  }
  assert.equal(
    getSafeSignInRedirect("/one/../profile?tab=skills#edit"),
    "/profile?tab=skills#edit",
  );
});
