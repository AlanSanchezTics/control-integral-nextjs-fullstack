"use client";

import Link from "next/link";

import Button from "@/components/ui/button/Button";
import Checkbox from "@/components/form/input/Checkbox";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import AuthField from "./AuthField";
import { useSignInForm } from "@/hooks/auth/use-sign-in-form";

interface SignInFormProps {
  callbackUrl?: string;
}

export default function SignInForm({ callbackUrl = "/" }: SignInFormProps) {
  const form = useSignInForm(callbackUrl);

  return (
    <div className="flex w-full flex-col lg:w-1/2">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Back to dashboard
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 text-title-sm font-semibold text-gray-800 dark:text-white/90 sm:text-title-md">
            Sign In
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Use your email address or phone number to sign in.
          </p>
        </div>

        <form onSubmit={form.handleSubmit}>
          <div className="space-y-6">
            <AuthField
              id="identifier"
              name="identifier"
              label="Email or phone"
              value={form.identifier}
              onChange={(event) => form.handleIdentifierChange(event.target.value)}
              placeholder="info@gmail.com or +1 555 111 2222"
              autoComplete="username"
              inputMode="text"
              error={form.fieldErrors.identifier}
              hint="We will validate the identifier against your account."
            />

            <AuthField
              id="password"
              name="password"
              label="Password"
              type={form.showPassword ? "text" : "password"}
              value={form.password}
              onChange={(event) => form.handlePasswordChange(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={form.fieldErrors.password}
              trailingElement={
                <button
                  type="button"
                  onClick={form.togglePasswordVisibility}
                  className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label={form.showPassword ? "Hide password" : "Show password"}
                >
                  {form.showPassword ? <EyeIcon /> : <EyeCloseIcon />}
                </button>
              }
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Checkbox
                checked={form.rememberMe}
                onChange={form.handleRememberMeChange}
                label="Keep me signed in"
              />

              <Link
                href="/reset-password"
                className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Forgot password?
              </Link>
            </div>

            {form.formError ? (
              <p className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">
                {form.formError}
              </p>
            ) : null}

            <Button className="w-full" size="sm" disabled={!form.canSubmit}>
              {form.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
