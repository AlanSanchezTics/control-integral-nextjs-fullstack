"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import AuthField from "./AuthField";
import { useSignInForm } from "@/hooks/auth/use-sign-in-form";

interface SignInFormProps {
  callbackUrl?: string;
}

export default function SignInForm({ callbackUrl = "/" }: SignInFormProps) {
  const { t } = useTranslation("auth");
  const form = useSignInForm(callbackUrl);

  return (
    <div className="flex w-full flex-col lg:w-1/2">

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
            {t("signin.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("signin.subtitle")}
          </p>
        </div>

        <form onSubmit={form.handleSubmit}>
          <div className="space-y-6">
            <AuthField
              id="identifier"
              name="identifier"
              label={t("signin.identifierLabel")}
              value={form.identifier}
              onChange={(event) => form.handleIdentifierChange(event.target.value)}
              placeholder={t("signin.identifierPlaceholder")}
              autoComplete="username"
              inputMode="text"
              error={form.fieldErrors.identifier}
              hint={t("signin.identifierHint")}
            />

            <AuthField
              id="password"
              name="password"
              label={t("signin.passwordLabel")}
              type={form.showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => form.handlePasswordChange(event.target.value)}
              placeholder={t("signin.passwordPlaceholder")}
              autoComplete="current-password"
              error={form.fieldErrors.password}
              trailingElement={
                <button
                  type="button"
                  onClick={form.togglePasswordVisibility}
                  className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label={
                    form.showPassword
                      ? t("signin.hidePassword")
                      : t("signin.showPassword")
                  }
                >
                  {form.showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              }
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Checkbox
                checked={form.rememberMe}
                onChange={form.handleRememberMeChange}
                label={t("signin.rememberMe")}
              />

              <Link
                href="/reset-password"
                className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                {t("signin.forgotPassword")}
              </Link>
            </div>

            {form.formError ? (
              <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                {form.formError}
              </p>
            ) : null}

            <Button className="w-full" size="sm" disabled={!form.canSubmit}>
              {form.isSubmitting ? t("signin.submitting") : t("signin.submit")}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
