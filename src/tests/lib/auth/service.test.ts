import { describe, expect, test } from "vitest";

import { hashPassword } from "@/lib/auth/password";
import {
  AUTH_ERROR_CODES,
  AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { authenticateCredentials } from "@/lib/auth/service";
import type {
  AuthRepository,
  AuthUserRecord,
  LoginAttemptRecordInput,
} from "@/lib/auth/types";

function createFakeRepository(user: AuthUserRecord | null): {
  repository: AuthRepository;
  attempts: LoginAttemptRecordInput[];
  updatedStates: Array<{
    userId: string;
    data: Partial<{
      failedLoginAttempts: number;
      lockedUntil: Date | null;
      lastLoginAt: Date | null;
    }>;
  }>;
} {
  const attempts: LoginAttemptRecordInput[] = [];
  const updatedStates: Array<{
    userId: string;
    data: Partial<{
      failedLoginAttempts: number;
      lockedUntil: Date | null;
      lastLoginAt: Date | null;
    }>;
  }> = [];

  return {
    attempts,
    updatedStates,
    repository: {
      async findUserByIdentifier() {
        return user;
      },
      async updateUserAuthState(userId, data) {
        updatedStates.push({ userId, data });
      },
      async updateUserPasswordHash() {
        return;
      },
      async recordLoginAttempt(input) {
        attempts.push(input);
      },
      async createPasswordResetToken() {
        return;
      },
      async findPasswordResetTokenByHash() {
        return null;
      },
      async consumePasswordResetToken() {
        return;
      },
    },
  };
}

describe("authenticateCredentials", () => {
  test("authenticates a valid user and resets lockout state", async () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const passwordPepper = "pepper";
    const passwordHash = hashPassword("correct-horse", passwordPepper);
    const { repository, attempts, updatedStates } = createFakeRepository({
      id: "user-1",
      email: "user@example.com",
      phone: "+15551112222",
      passwordHash,
      failedLoginAttempts: 2,
      lockedUntil: null,
      lastLoginAt: null,
      name: "User One",
      image: null,
    });

    const result = await authenticateCredentials(
      {
        identifier: "user@example.com",
        password: "correct-horse",
        rememberMe: true,
      },
      repository,
      {
        passwordPepper,
        now,
      },
    );

    expect(result).toEqual({
      ok: true,
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "User One",
        image: null,
      },
      rememberMe: true,
      sessionMaxAgeSeconds: AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
    });
    expect(updatedStates).toEqual([
      {
        userId: "user-1",
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: now,
        },
      },
    ]);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.status).toBe("success");
  });

  test("locks the account on the fifth failed attempt", async () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const passwordPepper = "pepper";
    const passwordHash = hashPassword("correct-horse", passwordPepper);
    const { repository, attempts, updatedStates } = createFakeRepository({
      id: "user-1",
      email: "user@example.com",
      phone: "+15551112222",
      passwordHash,
      failedLoginAttempts: 4,
      lockedUntil: null,
      lastLoginAt: null,
      name: "User One",
      image: null,
    });

    const result = await authenticateCredentials(
      {
        identifier: "+1 (555) 111-2222",
        password: "wrong-password",
      },
      repository,
      {
        passwordPepper,
        now,
      },
    );

    expect(result).toEqual({
      ok: false,
      errorCode: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
    });
    expect(updatedStates[0]?.data.failedLoginAttempts).toBe(5);
    expect(updatedStates[0]?.data.lockedUntil?.toISOString()).toBe(
      "2026-04-06T12:15:00.000Z",
    );
    expect(attempts[0]?.status).toBe("blocked");
  });

  test("returns a stable error for invalid identifiers", async () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const { repository, attempts } = createFakeRepository(null);

    const result = await authenticateCredentials(
      {
        identifier: "bad value",
        password: "any-password",
      },
      repository,
      {
        passwordPepper: "pepper",
        now,
      },
    );

    expect(result).toEqual({
      ok: false,
      errorCode: AUTH_ERROR_CODES.INVALID_IDENTIFIER,
    });
    expect(attempts[0]?.reason).toBe(AUTH_ERROR_CODES.INVALID_IDENTIFIER);
  });
});
