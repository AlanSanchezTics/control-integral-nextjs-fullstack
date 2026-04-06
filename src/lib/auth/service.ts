import {
  AUTH_ERROR_CODES,
  AUTH_PASSWORD_RESET_GENERIC_MESSAGE,
  AUTH_PASSWORD_RESET_SUCCESS_MESSAGE,
  AUTH_PASSWORD_RESET_TOKEN_TTL_MS,
  AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
  AUTH_STANDARD_SESSION_MAX_AGE_SECONDS,
} from "./constants";
import { applyFailedLoginAttempt, applySuccessfulLoginAttempt, isActiveLockout } from "./lockout";
import {
  consumePasswordResetToken,
  createPasswordResetToken as createPasswordResetTokenSnapshot,
  hashPasswordResetToken,
  validatePasswordResetToken,
} from "./reset-token";
import { hashPassword, verifyPassword } from "./password";
import type {
  AuthCredentialsInput,
  AuthRepository,
  AuthenticateCredentialsOutcome,
  AuthSessionUser,
  ConfirmPasswordResetInput,
  ConfirmPasswordResetResult,
  PasswordResetTokenRecord,
  RequestPasswordResetInput,
  RequestPasswordResetResult,
} from "./types";
import { parseLoginIdentifier } from "./identifier";
import { z } from "zod";

export function resolveSessionMaxAgeSeconds(rememberMe = false): number {
  return rememberMe
    ? AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS
    : AUTH_STANDARD_SESSION_MAX_AGE_SECONDS;
}

export function toSessionUser(user: {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}): AuthSessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
}

export async function authenticateCredentials(
  input: AuthCredentialsInput,
  repository: AuthRepository,
  options: {
    passwordPepper: string;
    now?: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<AuthenticateCredentialsOutcome> {
  const now = options.now ?? new Date();
  const identifier = parseLoginIdentifier(input.identifier);

  if (!identifier) {
    await repository.recordLoginAttempt({
      identifier: input.identifier.trim(),
      userId: null,
      status: "failure",
      reason: AUTH_ERROR_CODES.INVALID_IDENTIFIER,
      createdAt: now,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });

    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.INVALID_IDENTIFIER,
    };
  }

  const user = await repository.findUserByIdentifier(identifier.value);

  if (!user || !user.passwordHash) {
    await repository.recordLoginAttempt({
      identifier: identifier.value,
      userId: user?.id ?? null,
      status: "failure",
      reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      createdAt: now,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });

    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    };
  }

  if (isActiveLockout(user.lockedUntil, now)) {
    await repository.recordLoginAttempt({
      identifier: identifier.value,
      userId: user.id,
      status: "blocked",
      reason: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
      createdAt: now,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });

    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
    };
  }

  const isPasswordValid = verifyPassword(input.password, user.passwordHash, options.passwordPepper);

  if (!isPasswordValid) {
    const nextState = applyFailedLoginAttempt(user, now);

    await repository.updateUserAuthState(user.id, nextState);
    await repository.recordLoginAttempt({
      identifier: identifier.value,
      userId: user.id,
      status: nextState.isLocked ? "blocked" : "failure",
      reason: nextState.isLocked ? AUTH_ERROR_CODES.ACCOUNT_LOCKED : AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      createdAt: now,
      ipAddress: options.ipAddress ?? null,
      userAgent: options.userAgent ?? null,
    });

    return {
      ok: false,
      errorCode: nextState.isLocked ? AUTH_ERROR_CODES.ACCOUNT_LOCKED : AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    };
  }

  const successState = applySuccessfulLoginAttempt(now);

  await repository.updateUserAuthState(user.id, successState);
  await repository.recordLoginAttempt({
    identifier: identifier.value,
    userId: user.id,
    status: "success",
    reason: null,
    createdAt: now,
    ipAddress: options.ipAddress ?? null,
    userAgent: options.userAgent ?? null,
  });

  return {
    ok: true,
    user: toSessionUser(user),
    rememberMe: input.rememberMe ?? false,
    sessionMaxAgeSeconds: resolveSessionMaxAgeSeconds(input.rememberMe ?? false),
  };
}

export function validatePasswordResetTokenRecord(
  record: PasswordResetTokenRecord,
  candidateToken: string,
  now = new Date(),
) {
  return validatePasswordResetToken(record, candidateToken, now);
}

export function consumePasswordResetTokenRecord(
  record: PasswordResetTokenRecord,
  candidateToken: string,
  now = new Date(),
) {
  return consumePasswordResetToken(record, candidateToken, now);
}

export function createPasswordResetTokenRecord(
  now = new Date(),
  ttlMs = AUTH_PASSWORD_RESET_TOKEN_TTL_MS,
) {
  return createPasswordResetTokenSnapshot(now, ttlMs);
}

const requestResetSchema = z.object({
  email: z.string().trim().email(),
});

const confirmResetSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().trim().min(1),
  password: z.string().min(8),
});

export async function requestPasswordReset(
  input: RequestPasswordResetInput,
  repository: AuthRepository,
  options?: {
    now?: Date;
  },
): Promise<RequestPasswordResetResult> {
  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: true,
      message: AUTH_PASSWORD_RESET_GENERIC_MESSAGE,
    };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const user = await repository.findUserByIdentifier(normalizedEmail);

  if (user?.id) {
    const now = options?.now ?? new Date();
    const reset = createPasswordResetTokenRecord(now);

    await repository.createPasswordResetToken({
      identifier: normalizedEmail,
      userId: user.id,
      token: reset.tokenHash,
      expires: reset.expiresAt,
      usedAt: null,
      createdAt: reset.createdAt,
    });
  }

  return {
    ok: true,
    message: AUTH_PASSWORD_RESET_GENERIC_MESSAGE,
  };
}

export async function confirmPasswordReset(
  input: ConfirmPasswordResetInput,
  repository: AuthRepository,
  options: {
    passwordPepper: string;
    now?: Date;
  },
): Promise<ConfirmPasswordResetResult> {
  const parsed = confirmResetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.INVALID_IDENTIFIER,
    };
  }

  const now = options.now ?? new Date();
  const normalizedEmail = parsed.data.email.toLowerCase();
  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const storedToken = await repository.findPasswordResetTokenByHash(tokenHash);

  if (!storedToken || storedToken.identifier.toLowerCase() !== normalizedEmail) {
    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
    };
  }

  const tokenValidation = validatePasswordResetTokenRecord(
    storedToken,
    parsed.data.token,
    now,
  );

  if (!tokenValidation.ok) {
    return tokenValidation;
  }

  if (!storedToken.userId) {
    return {
      ok: false,
      errorCode: AUTH_ERROR_CODES.RESET_TOKEN_INVALID,
    };
  }

  const newHash = hashPassword(parsed.data.password, options.passwordPepper);

  await repository.updateUserPasswordHash(storedToken.userId, newHash);
  await repository.consumePasswordResetToken(storedToken.id, now);

  return {
    ok: true,
    message: AUTH_PASSWORD_RESET_SUCCESS_MESSAGE,
  };
}
