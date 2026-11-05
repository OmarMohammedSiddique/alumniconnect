import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedPhotoMimeType,
  getPasswordError,
  getPhotoError,
  hasPhotoSignature,
  MAX_PHOTO_BYTES,
  toSafeBlobUrl,
} from "./signup-validation.ts";

test("rejects missing password requirements and mismatched confirmation", () => {
  for (const password of ["", "Ab1!", "abcdefgh1!", "ABCDEFGH1!", "Abcdefgh!", "Abcdefgh1", "Abcdefg1 "]) {
    assert.ok(getPasswordError(password, password));
  }
  assert.equal(getPasswordError("ValidPass1!", "validPass1!"), "Passwords do not match.");
  assert.equal(getPasswordError("ValidPass1!", "ValidPass1!"), null);
  assert.equal(getPasswordError("ValidPass1! ", "ValidPass1!"), "Passwords do not match.");
});

test("limits uploads and excludes SVG, executable and unsupported files", () => {
  assert.ok(getPhotoError({ type: "image/png", size: 0 }));
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(getPhotoError({ type, size: MAX_PHOTO_BYTES }), null);
    assert.ok(getPhotoError({ type, size: MAX_PHOTO_BYTES + 1 }));
  }
  for (const type of ["image/svg+xml", "text/html", "application/octet-stream", ""]) {
    assert.ok(getPhotoError({ type, size: 12 }));
  }
});

test("checks actual image headers instead of trusting the declared type", () => {
  assert.equal(hasPhotoSignature(Uint8Array.from([255, 216, 255]), "image/jpeg"), true);
  assert.equal(hasPhotoSignature(Uint8Array.from([137,80,78,71,13,10,26,10]), "image/png"), true);
  assert.equal(hasPhotoSignature(new TextEncoder().encode("RIFF1234WEBP"), "image/webp"), true);
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(hasPhotoSignature(new TextEncoder().encode("<html>fake</html>"), type), false);
    assert.equal(hasPhotoSignature(new Uint8Array(), type), false);
  }
});

test("enforces allowlisted photo MIME types and blob: URL scheme for preview images", () => {
  assert.equal(getAllowedPhotoMimeType("image/png"), "image/png");
  assert.equal(getAllowedPhotoMimeType("image/svg+xml"), null);
  assert.equal(
    toSafeBlobUrl("blob:http://127.0.0.1:3110/550e8400-e29b-41d4-a716-446655440000"),
    "blob:http://127.0.0.1:3110/550e8400-e29b-41d4-a716-446655440000",
  );
  for (const unsafeUrl of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://evil.example/x.png",
    "blob:http://127.0.0.1:3110/550e8400\"onerror=\"alert(1)",
    "",
    "not a url",
  ]) {
    assert.equal(toSafeBlobUrl(unsafeUrl), "");
  }
});
