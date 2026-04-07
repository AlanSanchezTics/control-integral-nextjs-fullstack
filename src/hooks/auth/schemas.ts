import { z } from "zod";

function normalizePhoneCandidate(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  if (/[^0-9+\s().-]/.test(trimmed)) {
    return null;
  }

  if (trimmed.includes("+") && !trimmed.startsWith("+")) {
    return null;
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return hasLeadingPlus ? `+${digits}` : digits;
}

export function isValidAuthIdentifier(raw: string): boolean {
  const trimmed = raw.trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.includes("@")) {
    return z.string().trim().min(3).email().safeParse(trimmed).success;
  }

  return normalizePhoneCandidate(trimmed) !== null;
}

export const signInSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "signin.validation.identifierRequired")
    .refine(isValidAuthIdentifier, {
      message: "signin.validation.identifierInvalid",
    }),
  password: z
    .string()
    .min(8, "signin.validation.passwordMin"),
  rememberMe: z.boolean(),
});

export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "resetPassword.validation.emailRequired")
    .email("resetPassword.validation.emailInvalid"),
});

export const resetPasswordConfirmSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "resetPassword.validation.emailRequired")
      .email("resetPassword.validation.emailInvalid"),
    token: z
      .string()
      .trim()
      .min(1, "resetPassword.validation.tokenRequired")
      .max(255, "resetPassword.validation.tokenMax"),
    password: z
      .string()
      .min(8, "resetPassword.validation.passwordMin"),
    confirmPassword: z
      .string()
      .min(1, "resetPassword.validation.confirmRequired"),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "resetPassword.validation.confirmMismatch",
      });
    }
  });
