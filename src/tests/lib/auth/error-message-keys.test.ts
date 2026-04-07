import { describe, expect, test } from "vitest";

import { resolveResetErrorKey } from "@/hooks/auth/use-reset-password-form";
import { resolveSignInErrorKey } from "@/hooks/auth/use-sign-in-form";

describe("auth error translation keys", () => {
  test("maps sign-in provider errors to i18n keys", () => {
    expect(resolveSignInErrorKey("CredentialsSignin")).toBe(
      "signin.errors.invalidCredentials",
    );
    expect(resolveSignInErrorKey("AccessDenied")).toBe(
      "signin.errors.accessDenied",
    );
    expect(resolveSignInErrorKey("unknown")).toBe("signin.errors.generic");
  });

  test("maps reset password API errors to i18n keys", () => {
    expect(resolveResetErrorKey("AUTH_RESET_TOKEN_INVALID")).toBe(
      "resetPassword.errors.invalidCode",
    );
    expect(resolveResetErrorKey("AUTH_RESET_TOKEN_EXPIRED")).toBe(
      "resetPassword.errors.expiredCode",
    );
    expect(resolveResetErrorKey("AUTH_RESET_TOKEN_CONSUMED")).toBe(
      "resetPassword.errors.consumedCode",
    );
    expect(resolveResetErrorKey("unknown")).toBe("resetPassword.errors.generic");
  });
});
