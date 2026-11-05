// Cookie consent and local storage preference management for AlumniKonneQt.
// Follows privacy best practices, provides transparent categories,
// and synchronizes preferences across components and tabs via useSyncExternalStore.

import { useEffect, useSyncExternalStore } from "react";

export const COOKIE_CONSENT_KEY = "alumnikonneqt-cookie-consent";
export const COOKIE_CONSENT_EVENT = "alumnikonneqt:cookie-consent-updated";
export const COOKIE_SETTINGS_MODAL_EVENT = "alumnikonneqt:open-cookie-settings";

export interface CookiePreferences {
  necessary: true; // Always active (Supabase session, security, consent storage)
  functional: boolean; // Preferences, like theme (light/dark)
  analytics: boolean; // Anonymous usage telemetry (Vercel Analytics)
}

export interface StoredCookieConsent {
  version: 1;
  timestamp: string; // ISO 8601
  preferences: CookiePreferences;
}

export const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  functional: true,
  analytics: false,
};

export function parseStoredConsent(value: unknown): StoredCookieConsent | null {
  if (!value || typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!parsed.preferences || typeof parsed.preferences !== "object") return null;

    const prefs: CookiePreferences = {
      necessary: true,
      functional: Boolean(parsed.preferences.functional),
      analytics: Boolean(parsed.preferences.analytics),
    };

    const timestamp = typeof parsed.timestamp === "string" ? parsed.timestamp : new Date().toISOString();

    return {
      version: 1,
      timestamp,
      preferences: prefs,
    };
  } catch {
    return null;
  }
}

export function getStoredConsent(): StoredCookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStoredConsent(localStorage.getItem(COOKIE_CONSENT_KEY));
  } catch {
    return null;
  }
}

export function hasUserDecidedConsent(): boolean {
  return getStoredConsent() !== null;
}

// Global subscribers for reactive consent changes across components
type ConsentListener = () => void;
const consentListeners = new Set<ConsentListener>();

// Modal control listeners
type ModalListener = (open: boolean) => void;
const modalListeners = new Set<ModalListener>();
let isModalOpen = false;

function notifyConsentListeners() {
  for (const listener of consentListeners) {
    listener();
  }
}

function notifyModalListeners(open: boolean) {
  isModalOpen = open;
  for (const listener of modalListeners) {
    listener(open);
  }
}

let activeConsent: StoredCookieConsent | null = null;
let isConsentInitialized = false;

function ensureConsentInitialized() {
  if (isConsentInitialized || typeof window === "undefined") return;
  isConsentInitialized = true;
  activeConsent = getStoredConsent();

  // Listen to cross-tab storage changes
  const storageHandler = (e: StorageEvent) => {
    if (e.key === COOKIE_CONSENT_KEY) {
      activeConsent = parseStoredConsent(e.newValue);
      notifyConsentListeners();
    }
  };
  window.addEventListener("storage", storageHandler);

  // Listen to custom DOM events for programmatic triggers
  const customEventHandler = () => {
    activeConsent = getStoredConsent();
    notifyConsentListeners();
  };
  window.addEventListener(COOKIE_CONSENT_EVENT, customEventHandler);
}

export function saveCookieConsent(preferences: Partial<CookiePreferences>): StoredCookieConsent {
  const finalPrefs: CookiePreferences = {
    necessary: true,
    functional: preferences.functional ?? true,
    analytics: preferences.analytics ?? false,
  };

  const payload: StoredCookieConsent = {
    version: 1,
    timestamp: new Date().toISOString(),
    preferences: finalPrefs,
  };

  activeConsent = payload;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: payload }));
    } catch {
      // Storage might be unavailable in restricted contexts
    }
  }

  notifyConsentListeners();
  return payload;
}

export function acceptAllCookies(): StoredCookieConsent {
  return saveCookieConsent({
    necessary: true,
    functional: true,
    analytics: true,
  });
}

export function rejectNonEssentialCookies(): StoredCookieConsent {
  return saveCookieConsent({
    necessary: true,
    functional: false,
    analytics: false,
  });
}

export function openCookieSettings(): void {
  notifyModalListeners(true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_MODAL_EVENT, { detail: { open: true } }));
  }
}

export function closeCookieSettings(): void {
  notifyModalListeners(false);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COOKIE_SETTINGS_MODAL_EVENT, { detail: { open: false } }));
  }
}

export function subscribeToCookieSettingsModal(listener: ModalListener): () => void {
  modalListeners.add(listener);
  return () => {
    modalListeners.delete(listener);
  };
}

/**
 * Hook to read and update cookie consent state with SSR safety and reactivity.
 */
export function useCookieConsent(): {
  consent: StoredCookieConsent | null;
  hasDecided: boolean;
  preferences: CookiePreferences;
  saveConsent: (prefs: Partial<CookiePreferences>) => StoredCookieConsent;
  acceptAll: () => StoredCookieConsent;
  rejectNonEssential: () => StoredCookieConsent;
  openSettings: () => void;
} {
  useEffect(() => {
    ensureConsentInitialized();
  }, []);

  const consent = useSyncExternalStore(
    (onStoreChange) => {
      ensureConsentInitialized();
      consentListeners.add(onStoreChange);
      return () => {
        consentListeners.delete(onStoreChange);
      };
    },
    () => {
      ensureConsentInitialized();
      return activeConsent;
    },
    () => null
  );

  return {
    consent,
    hasDecided: consent !== null,
    preferences: consent ? consent.preferences : DEFAULT_PREFERENCES,
    saveConsent: saveCookieConsent,
    acceptAll: acceptAllCookies,
    rejectNonEssential: rejectNonEssentialCookies,
    openSettings: openCookieSettings,
  };
}

/**
 * Hook to subscribe to cookie settings modal visibility.
 */
export function useCookieSettingsModal(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
} {
  const isOpen = useSyncExternalStore(
    (onStoreChange) => {
      const listener: ModalListener = () => onStoreChange();
      modalListeners.add(listener);
      return () => {
        modalListeners.delete(listener);
      };
    },
    () => isModalOpen,
    () => false
  );

  return {
    isOpen,
    open: openCookieSettings,
    close: closeCookieSettings,
  };
}
