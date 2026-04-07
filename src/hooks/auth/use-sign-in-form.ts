"use client";

import { signIn } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import { signInSchema } from "./schemas";

type SignInFieldKey = "identifier" | "password";

type SignInFieldErrors = Record<SignInFieldKey, string>;

const emptyFieldErrors: SignInFieldErrors = {
  identifier: "",
  password: "",
};

export function resolveSignInErrorKey(error: string | null | undefined): string {
  switch (error) {
    case "CredentialsSignin":
      return "signin.errors.invalidCredentials";
    case "AccessDenied":
      return "signin.errors.accessDenied";
    default:
      return "signin.errors.generic";
  }
}

function toFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
  translate: (key: string) => string,
): SignInFieldErrors {
  const nextErrors: SignInFieldErrors = { ...emptyFieldErrors };

  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "identifier" || field === "password") {
      nextErrors[field] = translate(issue.message);
    }
  }

  return nextErrors;
}

export function useSignInForm(callbackUrl = "/") {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>(
    emptyFieldErrors,
  );

  const canSubmit = useMemo(
    () => !isSubmitting,
    [isSubmitting],
  );

  const clearFieldError = useCallback((field: SignInFieldKey) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      return {
        ...current,
        [field]: "",
      };
    });
  }, []);

  const handleIdentifierChange = useCallback(
    (value: string) => {
      setIdentifier(value);
      clearFieldError("identifier");
      setFormError("");
    },
    [clearFieldError],
  );

  const handlePasswordChange = useCallback(
    (value: string) => {
      setPassword(value);
      clearFieldError("password");
      setFormError("");
    },
    [clearFieldError],
  );

  const handleRememberMeChange = useCallback((checked: boolean) => {
    setRememberMe(checked);
    setFormError("");
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((current) => !current);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      setFormError("");
      setFieldErrors(emptyFieldErrors);

      const result = signInSchema.safeParse({
        identifier,
        password,
        rememberMe,
      });

      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues, t));
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await signIn("credentials", {
          redirect: false,
          callbackUrl,
          identifier: result.data.identifier,
          password: result.data.password,
          rememberMe: result.data.rememberMe ? "true" : "false",
        });

        if (response?.ok && !response.error) {
          setIdentifier("");
          setPassword("");
          setRememberMe(false);
          setShowPassword(false);
          router.replace(response.url ?? callbackUrl);
          router.refresh();
          return;
        }

        setFormError(t(resolveSignInErrorKey(response?.error ?? null)));
      } catch {
        setFormError(t(resolveSignInErrorKey(null)));
      } finally {
        setIsSubmitting(false);
      }
    },
    [callbackUrl, identifier, isSubmitting, password, rememberMe, router, t],
  );

  return {
    canSubmit,
    fieldErrors,
    formError,
    handleIdentifierChange,
    handlePasswordChange,
    handleRememberMeChange,
    handleSubmit,
    identifier,
    isSubmitting,
    password,
    rememberMe,
    setIdentifier,
    setPassword,
    showPassword,
    togglePasswordVisibility,
  };
}
