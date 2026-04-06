import { describe, expect, test } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  confirmPasswordReset,
  createPasswordResetTokenRecord,
  requestPasswordReset,
} from "@/lib/auth/service";
import type { AuthRepository, PasswordResetTokenRecord } from "@/lib/auth/types";

function createRepositoryForResetFlow() {
  const records: PasswordResetTokenRecord[] = [];
  const users = new Map([
    [
      "user@example.com",
      {
        id: BigInt(1),
        email: "user@example.com",
        phone: null,
        passwordHash: hashPassword("old-password", "pepper"),
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: null,
        name: "User One",
        image: null,
      },
    ],
  ]);

  const repository: AuthRepository = {
    async findUserByIdentifier(identifier) {
      return users.get(identifier.toLowerCase()) ?? null;
    },
    async updateUserAuthState() {
      return;
    },
    async updateUserPasswordHash(userId, passwordHash) {
      for (const [key, user] of users.entries()) {
        if (user.id === userId) {
          users.set(key, { ...user, passwordHash });
        }
      }
    },
    async recordLoginAttempt() {
      return;
    },
    async createPasswordResetToken(input) {
      records.push({
        id: BigInt(records.length + 1),
        userId: input.userId,
        identifier: input.identifier,
        token: input.token,
        expires: input.expires,
        usedAt: input.usedAt ?? null,
        createdAt: input.createdAt,
      });
    },
    async findPasswordResetTokenByHash(tokenHash) {
      return records.find((record) => record.token === tokenHash) ?? null;
    },
    async consumePasswordResetToken(tokenId, consumedAt) {
      const match = records.find((record) => record.id === tokenId);
      if (match) {
        match.usedAt = consumedAt;
      }
    },
  };

  return { repository, records, users };
}

describe("password reset service", () => {
  test("requestPasswordReset stores hashed token for existing email", async () => {
    const { repository, records } = createRepositoryForResetFlow();

    await requestPasswordReset({ email: "user@example.com" }, repository);

    expect(records).toHaveLength(1);
    expect(records[0]?.identifier).toBe("user@example.com");
    expect(records[0]?.token).toHaveLength(64);
  });

  test("confirmPasswordReset updates user password and consumes token", async () => {
    const { repository, records, users } = createRepositoryForResetFlow();
    const now = new Date("2026-04-06T00:00:00.000Z");
    const snapshot = createPasswordResetTokenRecord(now);

    await repository.createPasswordResetToken({
      identifier: "user@example.com",
      userId: BigInt(1),
      token: snapshot.tokenHash,
      expires: snapshot.expiresAt,
      usedAt: null,
      createdAt: snapshot.createdAt,
    });

    const result = await confirmPasswordReset(
      {
        email: "user@example.com",
        token: snapshot.token,
        password: "new-password-123",
      },
      repository,
      { passwordPepper: "pepper", now },
    );

    expect(result.ok).toBe(true);
    expect(records[0]?.usedAt?.toISOString()).toBe(now.toISOString());

    const updatedUser = users.get("user@example.com");
    expect(updatedUser?.passwordHash).toBeTruthy();
    expect(
      verifyPassword("new-password-123", updatedUser?.passwordHash ?? "", "pepper"),
    ).toBe(true);
  });
});
