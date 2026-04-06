import { describe, expect, test } from "vitest";

import {
  consumePasswordResetToken,
  createPasswordResetToken,
  hashPasswordResetToken,
  validatePasswordResetToken,
} from "@/lib/auth/reset-token";

describe("password reset token lifecycle", () => {
  test("creates a random token and validates it before expiry", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const snapshot = createPasswordResetToken(now, 30 * 60 * 1000);

    expect(snapshot.token).toHaveLength(43);
    expect(snapshot.tokenHash).toBe(hashPasswordResetToken(snapshot.token));

    const validation = validatePasswordResetToken(
      {
        id: BigInt(1),
        userId: BigInt(1),
        identifier: "user@example.com",
        token: snapshot.tokenHash,
        expires: snapshot.expiresAt,
        usedAt: null,
        createdAt: snapshot.createdAt,
      },
      snapshot.token,
      now,
    );

    expect(validation).toEqual({ ok: true });
  });

  test("rejects expired tokens", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const validation = validatePasswordResetToken(
      {
        id: BigInt(1),
        userId: BigInt(1),
        identifier: "user@example.com",
        token: hashPasswordResetToken("candidate"),
        expires: new Date("2026-04-06T11:59:59.000Z"),
        usedAt: null,
        createdAt: now,
      },
      "candidate",
      now,
    );

    expect(validation).toEqual({
      ok: false,
      errorCode: "AUTH_RESET_TOKEN_EXPIRED",
    });
  });

  test("prevents token reuse after consumption", () => {
    const now = new Date("2026-04-06T12:00:00.000Z");
    const token = createPasswordResetToken(now, 30 * 60 * 1000);
    const record = {
      id: BigInt(1),
      userId: BigInt(1),
      identifier: "user@example.com",
      token: token.tokenHash,
      expires: token.expiresAt,
      usedAt: null,
      createdAt: token.createdAt,
    };

    const consumed = consumePasswordResetToken(record, token.token, now);

    expect(consumed?.usedAt).toEqual(now);

    const reused = consumed
      ? consumePasswordResetToken(consumed, token.token, now)
      : null;

    expect(reused).toBeNull();
  });
});
