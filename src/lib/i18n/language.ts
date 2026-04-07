import {
  APP_LANG_COOKIE,
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/lib/i18n/config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function parseCookieValue(cookieHeader: string, key: string): string | null {
  const cookieEntry = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${key}=`));

  if (!cookieEntry) {
    return null;
  }

  return cookieEntry.slice(key.length + 1) || null;
}

export function readLanguageFromCookie(
  cookieHeader?: string | null,
): SupportedLanguage | null {
  if (!cookieHeader) {
    return null;
  }

  const cookieValue = parseCookieValue(cookieHeader, APP_LANG_COOKIE);
  if (!cookieValue) {
    return null;
  }

  return normalizeLanguage(cookieValue);
}

export function readLanguageFromStorage(): SupportedLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(APP_LANG_COOKIE);
  if (!stored) {
    return null;
  }

  return normalizeLanguage(stored);
}

export function readPreferredLanguage(): SupportedLanguage {
  const fromStorage = readLanguageFromStorage();
  if (fromStorage) {
    return fromStorage;
  }

  if (typeof document !== "undefined") {
    const fromCookie = readLanguageFromCookie(document.cookie);
    if (fromCookie) {
      return fromCookie;
    }
  }

  return DEFAULT_LANGUAGE;
}

export function persistLanguage(language: string): SupportedLanguage {
  const normalized = normalizeLanguage(language);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_LANG_COOKIE, normalized);
  }

  if (typeof document !== "undefined") {
    document.cookie = `${APP_LANG_COOKIE}=${normalized}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  }

  return normalized;
}
