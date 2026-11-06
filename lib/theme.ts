// Theme management for AlumniKonneQt.
// Supports Light mode (default) and Dark mode (Black, Red, White).
// Persists explicit user choice in localStorage with cross-tab synchronization.

import { useEffect, useSyncExternalStore } from "react";
import { getCookieConsentSnapshot, subscribeToCookieConsent } from "./cookie-consent.ts";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "alumnikonneqt-theme";

export function parseTheme(value: unknown): Theme {
  if (value === "dark") {
    return "dark";
  }
  return "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    if (!getCookieConsentSnapshot()?.preferences.functional) {
      localStorage.removeItem(THEME_STORAGE_KEY);
      return "light";
    }
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "light";
  }
}

export function resolveTheme(theme: Theme): Theme {
  return theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme): Theme {
  if (typeof document === "undefined") return "light";

  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  if (resolved === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }

  // Update meta[name="color-scheme"] presentational hint
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = resolved;
  }

  return resolved;
}

// Global subscribers for reactive theme changes across components and tabs
type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

let activeTheme: Theme = "light";
let isInitialized = false;

function ensureInitialized() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;
  activeTheme = getStoredTheme();
  applyTheme(activeTheme);

  subscribeToCookieConsent(persistThemePreference);

  // Listen to cross-tab storage changes
  const storageHandler = (e: StorageEvent) => {
    if (e.storageArea && e.storageArea !== localStorage) return;
    if (e.key === THEME_STORAGE_KEY || e.key === null) {
      activeTheme = getStoredTheme();
      applyTheme(activeTheme);
      notify();
    }
  };
  window.addEventListener("storage", storageHandler);
}

function persistThemePreference(): void {
  if (typeof window === "undefined") return;
  try {
    if (getCookieConsentSnapshot()?.preferences.functional) {
      localStorage.setItem(THEME_STORAGE_KEY, activeTheme);
    } else {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    // Appearance still works for this session when storage is unavailable.
  }
}

export function setAppTheme(newTheme: Theme): void {
  ensureInitialized();
  activeTheme = parseTheme(newTheme);
  persistThemePreference();
  applyTheme(activeTheme);
  notify();
}

export function toggleAppTheme(): void {
  setAppTheme(activeTheme === "dark" ? "light" : "dark");
}

/**
 * Hook to access and update the active theme.
 */
export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} {
  useEffect(() => {
    ensureInitialized();
  }, []);

  const theme = useSyncExternalStore(
    (onStoreChange) => {
      ensureInitialized();
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => {
      ensureInitialized();
      return activeTheme;
    },
    () => ("light" as Theme)
  );

  return {
    theme,
    setTheme: setAppTheme,
    toggleTheme: toggleAppTheme,
  };
}
