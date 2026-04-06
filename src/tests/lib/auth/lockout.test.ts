import { describe, expect, test } from "vitest";

import {
  applyFailedLoginAttempt,
  applySuccessfulLoginAttempt,
  isActiveLockout,
  resolveLockoutUntil,
} from "@/lib/auth/lockout";

describe("lockout policy", () => {
  test("locks an account after the fifth failed attempt", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");

    const nextState = applyFailedLoginAttempt(
      {
        failedLoginAttempts: 4,
        lockedUntil: null,
      },
      now,
    );

    expect(nextState.failedLoginAttempts).toBe(5);
    expect(nextState.isLocked).toBe(true);
    expect(nextState.remainingAttemptsBeforeLock).toBe(0);
    expect(nextState.lockedUntil?.toISOString()).toBe("2026-04-06T12:15:00.000Z");
  });

  test("keeps the account unlocked before the threshold", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");

    const nextState = applyFailedLoginAttempt(
      {
        failedLoginAttempts: 1,
        lockedUntil: null,
      },
      now,
    );

    expect(nextState.failedLoginAttempts).toBe(2);
    expect(nextState.isLocked).toBe(false);
    expect(nextState.remainingAttemptsBeforeLock).toBe(3);
    expect(nextState.lockedUntil).toBeNull();
  });

  test("reports active lockouts using the expiration timestamp", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const lockedUntil = resolveLockoutUntil(now);

    expect(isActiveLockout(lockedUntil, now)).toBe(true);
    expect(
      isActiveLockout(new Date("2026-04-06T11:59:59.000Z"), now),
    ).toBe(false);
  });

  test("resets lockout state after a successful login", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");

    expect(applySuccessfulLoginAttempt(now)).toEqual({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
    });
  });
});

