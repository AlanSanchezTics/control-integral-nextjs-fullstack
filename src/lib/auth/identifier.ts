import { z } from "zod";

import { AUTH_ERROR_CODES } from "./constants";
import type { AuthIdentifierKind, ParsedAuthIdentifier } from "./types";

const emailSchema = z.string().trim().min(3).email();

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

export function classifyLoginIdentifier(raw: string): AuthIdentifierKind | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.includes("@")) {
    return emailSchema.safeParse(trimmed).success ? "email" : null;
  }

  return normalizePhoneCandidate(trimmed) ? "phone" : null;
}

export function parseLoginIdentifier(raw: string): ParsedAuthIdentifier | null {
  const trimmed = raw.trim();
  const kind = classifyLoginIdentifier(trimmed);

  if (!kind) {
    return null;
  }

  if (kind === "email") {
    return {
      kind,
      value: trimmed.toLowerCase(),
      raw: trimmed,
    };
  }

  const value = normalizePhoneCandidate(trimmed);
  if (!value) {
    return null;
  }

  return {
    kind,
    value,
    raw: trimmed,
  };
}

export function normalizeLoginIdentifierOrThrow(raw: string): ParsedAuthIdentifier {
  const parsed = parseLoginIdentifier(raw);
  if (!parsed) {
    throw new Error(AUTH_ERROR_CODES.INVALID_IDENTIFIER);
  }

  return parsed;
}
