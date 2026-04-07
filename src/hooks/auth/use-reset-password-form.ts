"use client";

import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

import {
  resetPasswordConfirmSchema,
  resetPasswordRequestSchema,
} from "./schemas";

type ResetFieldKey = "email" | "token" | "password" | "confirmPassword";
type ResetFieldErrors = Record<ResetFieldKey, string>;

type ResetFlowStage = "request" | "confirm" | "done";

const emptyFieldErrors: ResetFieldErrors = {
  email: "",
  token: "",
  password: "",
  confirmPassword: "",
};

export function resolveResetErrorKey(errorCode: string | null | undefined): string {
  switch (errorCode) {
    case "AUTH_INVALID_IDENTIFIER":
    case "AUTH_RESET_TOKEN_INVALID":
      return "resetPassword.errors.invalidCode";
    case "AUTH_RESET_TOKEN_EXPIRED":
      return "resetPassword.errors.expiredCode";
    case "AUTH_RESET_TOKEN_CONSUMED":
      return "resetPassword.errors.consumedCode";
    default:
      return "resetPassword.errors.generic";
  }
}

function toFieldErrors(
  issues: Array<{ path: PropertyKey[]; message: string }>,
  translate: (key: string) => string,
): ResetFieldErrors {
  const nextErrors: ResetFieldErrors = { ...emptyFieldErrors };

  for (const issue of issues) {
    const field = issue.path[0];
    if (
      field === "email" ||
      field === "token" ||
      field === "password" ||
      field === "confirmPassword"
    ) {
      nextErrors[field] = translate(issue.message);
    }
  }

  return nextErrors;
}

async function readJsonResponse(response: Response): Promise<{
  errorCode?: string;
  message?: string;
}> {
  try {
    return (await response.json()) as {
      errorCode?: string;
      message?: string;
    };
  } catch {
    return {};
  }
}

export function useResetPasswordForm() {
  const { t } = useTranslation("auth");
  const [stage, setStage] = useState<ResetFlowStage>("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>(
    emptyFieldErrors,
  );

  const canRequest = useMemo(
    () => !isRequestSubmitting,
    [isRequestSubmitting],
  );

  const canConfirm = useMemo(
    () => !isConfirmSubmitting,
    [isConfirmSubmitting],
  );

  const clearFieldError = useCallback((field: ResetFieldKey) => {
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

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    clearFieldError("email");
    setRequestError("");
    setConfirmError("");
    setRequestMessage("");
    if (stage !== "request") {
      setStage("request");
      setToken("");
      setPassword("");
      setConfirmPassword("");
      setConfirmMessage("");
      setShowPassword(false);
    }
  }, [clearFieldError, stage]);

  const handleTokenChange = useCallback((value: string) => {
    setToken(value);
    clearFieldError("token");
    setConfirmError("");
  }, [clearFieldError]);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    clearFieldError("password");
    setConfirmError("");
  }, [clearFieldError]);

  const handleConfirmPasswordChange = useCallback((value: string) => {
    setConfirmPassword(value);
    clearFieldError("confirmPassword");
    setConfirmError("");
  }, [clearFieldError]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((current) => !current);
  }, []);

  const handleRequestSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isRequestSubmitting) {
        return;
      }

      setRequestError("");
      setRequestMessage("");
      setFieldErrors((current) => ({
        ...current,
        email: "",
      }));

      const result = resetPasswordRequestSchema.safeParse({ email });
      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues, t));
        return;
      }

      setIsRequestSubmitting(true);

      try {
        const response = await fetch("/api/auth/reset-password/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: result.data.email }),
        });

        const payload = await readJsonResponse(response);

        if (!response.ok) {
          setRequestError(t(resolveResetErrorKey(payload.errorCode)));
          return;
        }

        setStage("confirm");
        setRequestMessage(
          payload.message ?? t("resetPassword.messages.requestSuccessDefault"),
        );
        setRequestError("");
      } catch {
        setRequestError(t(resolveResetErrorKey(null)));
      } finally {
        setIsRequestSubmitting(false);
      }
    },
    [email, isRequestSubmitting, t],
  );

  const handleConfirmSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isConfirmSubmitting) {
        return;
      }

      setConfirmError("");
      setConfirmMessage("");
      setFieldErrors((current) => ({
        ...current,
        token: "",
        password: "",
        confirmPassword: "",
      }));

      const result = resetPasswordConfirmSchema.safeParse({
        email,
        token,
        password,
        confirmPassword,
      });

      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues, t));
        return;
      }

      setIsConfirmSubmitting(true);

      try {
        const response = await fetch("/api/auth/reset-password/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: result.data.email,
            token: result.data.token,
            password: result.data.password,
          }),
        });

        const payload = await readJsonResponse(response);

        if (!response.ok) {
          setConfirmError(t(resolveResetErrorKey(payload.errorCode)));
          return;
        }

        setStage("done");
        setConfirmMessage(
          payload.message ?? t("resetPassword.messages.confirmSuccessDefault"),
        );
        setConfirmError("");
        setToken("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
      } catch {
        setConfirmError(t(resolveResetErrorKey(null)));
      } finally {
        setIsConfirmSubmitting(false);
      }
    },
    [confirmPassword, email, isConfirmSubmitting, password, t, token],
  );

  const restartFlow = useCallback(() => {
    setStage("request");
    setEmail("");
    setToken("");
    setPassword("");
    setConfirmPassword("");
    setRequestError("");
    setRequestMessage("");
    setConfirmError("");
    setConfirmMessage("");
    setFieldErrors(emptyFieldErrors);
    setShowPassword(false);
  }, []);

  return {
    canConfirm,
    canRequest,
    confirmError,
    confirmMessage,
    confirmPassword,
    email,
    fieldErrors,
    handleConfirmPasswordChange,
    handleConfirmSubmit,
    handleEmailChange,
    handlePasswordChange,
    handleRequestSubmit,
    handleTokenChange,
    isConfirmSubmitting,
    isRequestSubmitting,
    password,
    requestError,
    requestMessage,
    restartFlow,
    showPassword,
    stage,
    token,
    togglePasswordVisibility,
  };
}
