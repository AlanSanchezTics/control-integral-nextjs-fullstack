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
    .min(1, "Enter your email address or phone number.")
    .refine(isValidAuthIdentifier, {
      message: "Enter a valid email address or phone number.",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
  rememberMe: z.boolean(),
});

export const resetPasswordRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
});

export const resetPasswordConfirmSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, "Enter your email address.")
      .email("Enter a valid email address."),
    token: z
      .string()
      .trim()
      .min(1, "Enter the reset code.")
      .max(255, "Enter a shorter reset code."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long."),
    confirmPassword: z
      .string()
      .min(1, "Confirm your new password."),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });
