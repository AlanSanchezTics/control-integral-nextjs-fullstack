import { createHash, randomBytes } from "crypto";

import { AUTH_ERROR_CODES, AUTH_PASSWORD_RESET_TOKEN_TTL_MS } from "./constants";
import type {
  PasswordResetTokenRecord,
  PasswordResetTokenSnapshot,
  PasswordResetTokenValidationOutcome,
} from "./types";

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken(
  now = new Date(),
  ttlMs = AUTH_PASSWORD_RESET_TOKEN_TTL_MS,
): PasswordResetTokenSnapshot {
  const token = generatePasswordResetToken();
  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
  };
}

export function validatePasswordResetToken(
  record: PasswordResetTokenRecord,
  candidateToken: string,
  now = new Date(),
): PasswordResetTokenValidationOutcome {
  if (record.usedAt) {
    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.RESET_TOKEN_CONSUMED,
    };
  }

  if (record.expires.getTime() <= now.getTime()) {
    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.RESET_TOKEN_EXPIRED,
    };
  }

  if (record.token !== hashPasswordResetToken(candidateToken)) {
    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
    };
  }

  return { ok: true };
}

export function consumePasswordResetToken(
  record: PasswordResetTokenRecord,
  candidateToken: string,
  now = new Date(),
): PasswordResetTokenRecord | null {
  const validation = validatePasswordResetToken(record, candidateToken, now);

  if (!validation.ok) {
    return null;
  }

  return {
    ...record,
    usedAt: now,
  };
}
