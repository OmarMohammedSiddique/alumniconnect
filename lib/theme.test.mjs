import assert from "node:assert/strict";
import test from "node:test";
import { parseTheme, resolveTheme, THEME_STORAGE_KEY } from "./theme.ts";

test("parseTheme validates supported theme options with system default", () => {
  assert.equal(parseTheme("light"), "light");
  assert.equal(parseTheme("dark"), "dark");
  assert.equal(parseTheme("system"), "system");
  assert.equal(parseTheme("unknown"), "system");
  assert.equal(parseTheme(null), "system");
  assert.equal(parseTheme(undefined), "system");
  assert.equal(parseTheme(123), "system");
});

test("resolveTheme resolves explicit themes directly", () => {
  assert.equal(resolveTheme("light"), "light");
  assert.equal(resolveTheme("dark"), "dark");
});

test("THEME_STORAGE_KEY matches expected domain convention", () => {
  assert.equal(THEME_STORAGE_KEY, "alumnikonneqt-theme");
});
