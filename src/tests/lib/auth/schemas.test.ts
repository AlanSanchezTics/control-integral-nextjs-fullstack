import { describe, expect, test } from "vitest";

import {
  resetPasswordConfirmSchema,
  resetPasswordRequestSchema,
  signInSchema,
} from "@/hooks/auth/schemas";

describe("auth form schemas", () => {
  test("accepts valid sign-in with email", () => {
    const result = signInSchema.safeParse({
      identifier: "user@example.com",
      password: "secure-pass-123",
      rememberMe: true,
    });

    expect(result.success).toBe(true);
  });

  test("accepts valid sign-in with phone", () => {
    const result = signInSchema.safeParse({
      identifier: "+1 (555) 111-2222",
      password: "secure-pass-123",
      rememberMe: false,
    });

    expect(result.success).toBe(true);
  });

  test("rejects invalid sign-in identifier", () => {
    const result = signInSchema.safeParse({
      identifier: "bad value",
      password: "secure-pass-123",
      rememberMe: false,
    });

    expect(result.success).toBe(false);
  });

  test("validates reset request email", () => {
    const valid = resetPasswordRequestSchema.safeParse({
      email: "user@example.com",
    });
    const invalid = resetPasswordRequestSchema.safeParse({
      email: "not-an-email",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  test("requires reset confirmation passwords to match", () => {
    const result = resetPasswordConfirmSchema.safeParse({
      email: "user@example.com",
      token: "ABC123",
      password: "secure-pass-123",
      confirmPassword: "different-pass-123",
    });

    expect(result.success).toBe(false);
  });
});
