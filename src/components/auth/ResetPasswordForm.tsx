"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import AuthField from "./AuthField";
import { useResetPasswordForm } from "@/hooks/auth/use-reset-password-form";

export default function ResetPasswordForm() {
  const { t } = useTranslation("auth");
  const form = useResetPasswordForm();

  return (
    <div className="flex w-full flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t("resetPassword.backToSignIn")}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
            {t("resetPassword.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("resetPassword.subtitle")}
          </p>
        </div>

        <div className="space-y-6">
          <form onSubmit={form.handleRequestSubmit}>
            <div className="space-y-4">
              <AuthField
                id="reset-email"
                name="email"
                label={t("resetPassword.emailLabel")}
                value={form.email}
                onChange={(event) => form.handleEmailChange(event.target.value)}
                placeholder={t("resetPassword.emailPlaceholder")}
                autoComplete="email"
                inputMode="email"
                error={form.fieldErrors.email}
                hint={t("resetPassword.emailHint")}
              />

              {form.requestError ? (
                <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                  {form.requestError}
                </p>
              ) : form.requestMessage ? (
                <p className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
                  {form.requestMessage}
                </p>
              ) : null}

              <Button className="w-full" size="sm" disabled={!form.canRequest}>
                {form.isRequestSubmitting
                  ? t("resetPassword.requestSubmitting")
                  : form.stage === "request"
                    ? t("resetPassword.requestSubmit")
                    : t("resetPassword.resendSubmit")}
              </Button>
            </div>
          </form>

          {form.stage !== "request" ? (
            <form onSubmit={form.handleConfirmSubmit}>
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
                <div>
                  <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                    {t("resetPassword.confirmTitle")}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t("resetPassword.confirmSubtitle")}
                  </p>
                </div>

                <AuthField
                  id="reset-token"
                  name="token"
                  label={t("resetPassword.tokenLabel")}
                  value={form.token}
                  onChange={(event) => form.handleTokenChange(event.target.value)}
                  placeholder={t("resetPassword.tokenPlaceholder")}
                  autoComplete="one-time-code"
                  error={form.fieldErrors.token}
                />

                <AuthField
                  id="reset-password"
                  name="password"
                  label={t("resetPassword.passwordLabel")}
                  type={form.showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => form.handlePasswordChange(event.target.value)}
                  placeholder={t("resetPassword.passwordPlaceholder")}
                  autoComplete="new-password"
                  error={form.fieldErrors.password}
                  trailingElement={
                    <button
                      type="button"
                      onClick={form.togglePasswordVisibility}
                      className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      aria-label={
                        form.showPassword
                          ? t("resetPassword.hidePassword")
                          : t("resetPassword.showPassword")
                      }
                    >
                      {form.showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                    </button>
                  }
                />

                <AuthField
                  id="reset-confirm-password"
                  name="confirmPassword"
                  label={t("resetPassword.confirmPasswordLabel")}
                  type={form.showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) =>
                    form.handleConfirmPasswordChange(event.target.value)
                  }
                  placeholder={t("resetPassword.confirmPasswordPlaceholder")}
                  autoComplete="new-password"
                  error={form.fieldErrors.confirmPassword}
                />

                {form.confirmError ? (
                  <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                    {form.confirmError}
                  </p>
                ) : form.confirmMessage ? (
                  <p className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
                    {form.confirmMessage}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button className="w-full" size="sm" disabled={!form.canConfirm}>
                    {form.isConfirmSubmitting
                      ? t("resetPassword.confirmSubmitting")
                      : t("resetPassword.confirmSubmit")}
                  </Button>
                  <button
                    type="button"
                    onClick={form.restartFlow}
                    disabled={form.isConfirmSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  >
                    {t("resetPassword.useDifferentEmail")}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {form.stage === "done" ? (
            <div className="rounded-2xl border border-success-200 bg-success-50 p-5 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
              {form.confirmMessage}
              <div className="mt-4">
                <Link
                  href="/login"
                  className="inline-flex rounded-lg bg-success-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-success-700"
                >
                  {t("resetPassword.returnToSignIn")}
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
