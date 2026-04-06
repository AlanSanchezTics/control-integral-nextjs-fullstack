import { describe, expect, test } from "vitest";

import { isSessionActive } from "@/context/AuthContext";

describe("AuthContext session guards", () => {
  test("returns false when session is missing", () => {
    expect(isSessionActive(null)).toBe(false);
  });

  test("returns true when session expiration is in the future", () => {
    const now = Date.now();
    const originalNow = Date.now;
    Date.now = () => now;

    expect(
      isSessionActive({
        user: {
          email: "user@example.com",
          id: "user-1",
          image: null,
          name: "User",
        },
        expires: new Date(now + 1000).toISOString(),
        rememberMe: false,
        sessionExpiresAt: now + 1000,
      }),
    ).toBe(true);

    Date.now = originalNow;
  });

  test("returns false when session expiration has passed", () => {
    const now = Date.now();
    const originalNow = Date.now;
    Date.now = () => now;

    expect(
      isSessionActive({
        user: {
          email: "user@example.com",
          id: "user-1",
          image: null,
          name: "User",
        },
        expires: new Date(now - 1000).toISOString(),
        rememberMe: false,
        sessionExpiresAt: now - 1000,
      }),
    ).toBe(false);

    Date.now = originalNow;
  });
});
