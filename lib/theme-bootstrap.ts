// Runs before hydration so only an explicitly permitted theme is restored.
export const THEME_BOOTSTRAP_SCRIPT = `
  try {
    var c = null;
    try { c = JSON.parse(localStorage.getItem("alumnikonneqt-cookie-consent") || "null"); } catch (_) {}
    var allowed = c && c.version === 1 && c.preferences &&
      c.preferences.functional === true && typeof c.preferences.analytics === "boolean";
    var t = allowed ? localStorage.getItem("alumnikonneqt-theme") : "light";
    if (!allowed) localStorage.removeItem("alumnikonneqt-theme");
    var dark = t === "dark";
    document.documentElement.classList.add(dark ? "dark" : "light");
    document.documentElement.classList.remove(dark ? "light" : "dark");
    var m = document.querySelector('meta[name="color-scheme"]');
    if (m) m.content = dark ? "dark" : "light";
  } catch (_) {}
`;
