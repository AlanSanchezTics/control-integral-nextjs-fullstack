import { createInstance, type Resource, type i18n } from "i18next";
import { initReactI18next } from "react-i18next";

import authEn from "@/lib/i18n/locales/en/auth.json";
import authEs from "@/lib/i18n/locales/es/auth.json";

export const SUPPORTED_LANGUAGES = ["es", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "es";
export const APP_LANG_COOKIE = "app_lang";
export const I18N_DEFAULT_NAMESPACE = "auth";

const resources: Resource = {
  es: { auth: authEs },
  en: { auth: authEn },
};

export function normalizeLanguage(
  language: string | null | undefined,
): SupportedLanguage {
  if (!language) {
    return DEFAULT_LANGUAGE;
  }

  const normalized = language.toLowerCase();
  const matched = SUPPORTED_LANGUAGES.find(
    (candidate) => candidate === normalized || normalized.startsWith(`${candidate}-`),
  );

  return matched ?? DEFAULT_LANGUAGE;
}

export async function buildI18nInstance(initialLanguage?: string): Promise<i18n> {
  const instance = createInstance();

  await instance.use(initReactI18next).init({
    lng: normalizeLanguage(initialLanguage),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: [I18N_DEFAULT_NAMESPACE],
    defaultNS: I18N_DEFAULT_NAMESPACE,
    resources,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

  return instance;
}
