// Theme management for AlumniKonneQt.
// Supports System default, Light mode, and Dark mode (Black, Red, White).
// Follows modern-web-guidance: color-scheme meta synchronization, FOUC prevention,
// prefers-color-scheme change listeners, and cross-tab storage sync.

import { useEffect, useSyncExternalStore } from "react";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "alumnikonneqt-theme";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function parseTheme(value: unknown): Theme {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export function applyTheme(theme: Theme): ResolvedTheme {
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
    meta.content = theme === "system" ? "light dark" : theme;
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

let activeTheme: Theme = "system";
let activeResolvedTheme: ResolvedTheme = "light";
let isInitialized = false;

function ensureInitialized() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;
  activeTheme = getStoredTheme();
  activeResolvedTheme = applyTheme(activeTheme);

  // Listen to OS prefers-color-scheme changes
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const mediaHandler = () => {
    if (activeTheme === "system") {
      activeResolvedTheme = applyTheme("system");
      notify();
    }
  };
  media.addEventListener("change", mediaHandler);

  // Listen to cross-tab storage changes
  const storageHandler = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      activeTheme = parseTheme(e.newValue);
      activeResolvedTheme = applyTheme(activeTheme);
      notify();
    }
  };
  window.addEventListener("storage", storageHandler);
}

export function setAppTheme(newTheme: Theme): void {
  activeTheme = newTheme;
  try {
    if (newTheme === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  } catch {
    // localStorage might be unavailable in restricted contexts
  }
  activeResolvedTheme = applyTheme(newTheme);
  notify();
}

/**
 * Hook to access and update the active theme.
 */
export function useTheme(): {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
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
    () => ("system" as Theme)
  );

  const resolvedTheme = typeof window !== "undefined" ? activeResolvedTheme : "light";
  const systemTheme = getSystemTheme();

  return {
    theme,
    resolvedTheme,
    setTheme: setAppTheme,
    systemTheme,
  };
}
