import { AUTH_LOCKOUT_DURATION_MS, AUTH_LOCKOUT_THRESHOLD } from "./constants";
import type { AuthUserRecord } from "./types";

export interface LoginLockoutState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  isLocked: boolean;
  remainingAttemptsBeforeLock: number;
}

export function isActiveLockout(lockedUntil: Date | null, now = new Date()): boolean {
  return Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());
}

export function resolveLockoutUntil(now = new Date(), durationMs = AUTH_LOCKOUT_DURATION_MS): Date {
  return new Date(now.getTime() + durationMs);
}

function getFailureBaseline(user: Pick<AuthUserRecord, "failedLoginAttempts" | "lockedUntil">, now: Date): number {
  if (user.lockedUntil && user.lockedUntil.getTime() <= now.getTime()) {
    return 0;
  }

  if (!isActiveLockout(user.lockedUntil, now)) {
    return user.failedLoginAttempts ?? 0;
  }

  return user.failedLoginAttempts ?? 0;
}

export function applyFailedLoginAttempt(
  user: Pick<AuthUserRecord, "failedLoginAttempts" | "lockedUntil">,
  now = new Date(),
): LoginLockoutState {
  const baseline = getFailureBaseline(user, now);
  const nextFailedLoginAttempts = baseline + 1;
  const lockedUntil =
    nextFailedLoginAttempts >= AUTH_LOCKOUT_THRESHOLD
      ? resolveLockoutUntil(now)
      : isActiveLockout(user.lockedUntil, now)
        ? user.lockedUntil
        : null;

  return {
    failedLoginAttempts: nextFailedLoginAttempts,
    lockedUntil,
    isLocked: Boolean(lockedUntil && lockedUntil.getTime() > now.getTime()),
    remainingAttemptsBeforeLock: Math.max(AUTH_LOCKOUT_THRESHOLD - nextFailedLoginAttempts, 0),
  };
}

export function applySuccessfulLoginAttempt(now = new Date()) {
  return {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: now,
  };
}
