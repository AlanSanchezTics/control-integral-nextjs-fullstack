"use client";

import { useTranslation } from "react-i18next";

import {
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  type SupportedLanguage,
} from "@/lib/i18n/config";
import { persistLanguage } from "@/lib/i18n/language";

function getLanguageLabel(language: SupportedLanguage, t: (key: string) => string) {
  return language === "es" ? t("languageSwitcher.es") : t("languageSwitcher.en");
}

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation("auth");
  const currentLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const handleLanguageChange = async (nextLanguage: SupportedLanguage) => {
    const persistedLanguage = persistLanguage(nextLanguage);
    await i18n.changeLanguage(persistedLanguage);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <span className="sr-only">{t("languageSwitcher.label")}</span>
      {SUPPORTED_LANGUAGES.map((language) => {
        const isActive = currentLanguage === language;

        return (
          <button
            key={language}
            type="button"
            onClick={() => void handleLanguageChange(language)}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-brand-500 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            }`}
          >
            {getLanguageLabel(language, t)}
          </button>
        );
      })}
    </div>
  );
}
