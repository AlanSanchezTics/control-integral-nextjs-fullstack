"use client";

import type { ReactNode } from "react";
import type { i18n as I18nInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { useEffect, useState } from "react";

import { buildI18nInstance } from "@/lib/i18n/config";
import { readPreferredLanguage } from "@/lib/i18n/language";

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [i18nInstance, setI18nInstance] = useState<I18nInstance | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const instance = await buildI18nInstance(readPreferredLanguage());
      if (isMounted) {
        setI18nInstance(instance);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!i18nInstance) {
    return null;
  }

  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
