import assert from "node:assert/strict";
import test from "node:test";
import { parseTheme, resolveTheme, THEME_STORAGE_KEY } from "./theme.ts";

test("parseTheme validates supported theme options with light default", () => {
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("system"), "light");
  assert.equal(parseTheme("unknown"), "light");
  assert.equal(parseTheme(null), "light");
  assert.equal(parseTheme(undefined), "light");
  assert.equal(parseTheme(123), "light");
});

test("resolveTheme defaults to light unless explicitly dark", () => {
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("dark"), "dark");
});

test("THEME_STORAGE_KEY matches expected domain convention", () => {
  assert.equal(THEME_STORAGE_KEY, "alumnikonneqt-theme");
});
