"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import GridShape from "@/components/common/GridShape";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation("auth");

  return (
    <div className="relative min-h-screen overflow-hidden bg-white p-6 dark:bg-gray-900 sm:p-0">
      <div className="relative flex min-h-screen flex-col justify-center lg:flex-row">
        <div className="flex w-full flex-1 items-center justify-center px-4 py-10 lg:w-1/2 lg:px-12">
          {children}
        </div>

        <div className="relative hidden w-full items-center justify-center overflow-hidden bg-brand-950 dark:bg-white/5 lg:flex lg:w-1/2">
          <GridShape />
          <div className="relative z-10 flex max-w-sm flex-col items-center gap-4 px-6">
            <Link href="/" className="block">
              <Image
                width={231}
                height={48}
                src="/images/logo/auth-logo.svg"
                alt={t("layout.logoAlt")}
                priority
              />
            </Link>
            <p className="text-center text-sm leading-6 text-gray-300 dark:text-white/60">
              {t("layout.tagline")}
            </p>
          </div>
        </div>

        <div className="fixed right-6 top-6 z-50 hidden sm:block">
          <LanguageSwitcher />
        </div>

        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          <div className="sm:hidden">
            <LanguageSwitcher />
          </div>
          <div className="hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </div>
    </div>
  );
}
