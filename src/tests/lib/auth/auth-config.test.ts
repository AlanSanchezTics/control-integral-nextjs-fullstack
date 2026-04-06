import { describe, expect, test } from "vitest";

import { authConfig, getAuthSessionOptions } from "../../../lib/auth/config";
import {
  AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
  AUTH_STANDARD_SESSION_MAX_AGE_SECONDS,
} from "../../../lib/auth/constants";

describe("auth config", () => {
  test("uses credentials provider", () => {
    expect(authConfig.providers.length).toBeGreaterThan(0);
    expect(authConfig.session?.strategy).toBe("jwt");
    expect(authConfig.pages?.signIn).toBe("/login");
    expect(authConfig.session?.maxAge).toBe(AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS);
    expect(authConfig.jwt?.maxAge).toBe(AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS);
    expect(authConfig.callbacks?.jwt).toBeDefined();
    expect(authConfig.callbacks?.session).toBeDefined();
  });

  test("session options keep standard/remember max-age contract", () => {
    expect(getAuthSessionOptions(false).maxAge).toBe(
      AUTH_STANDARD_SESSION_MAX_AGE_SECONDS,
    );
    expect(getAuthSessionOptions(true).maxAge).toBe(
      AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
    );
  });

  test("jwt callback stores remember-me claims", async () => {
    const jwtCallback = authConfig.callbacks?.jwt;
    if (!jwtCallback) {
      throw new Error("Missing jwt callback");
    }

    const now = Date.now();
    const originalNow = Date.now;
    Date.now = () => now;

    const token = await jwtCallback({
      token: {},
      user: {
        id: "user-1",
        email: "user@example.com",
        rememberMe: true,
        sessionMaxAgeSeconds: 3600,
      },
      account: null,
      profile: undefined,
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    } as never);

    Date.now = originalNow;

    expect(token.rememberMe).toBe(true);
    expect(token.sessionExpiresAt).toBe(now + 3600 * 1000);
  });

  test("session callback exposes remember-me claims", async () => {
    const sessionCallback = authConfig.callbacks?.session;
    if (!sessionCallback) {
      throw new Error("Missing session callback");
    }

    const session = (await sessionCallback({
      session: {
        user: {
          name: "Jane",
          email: "jane@example.com",
          image: null,
        },
        expires: new Date().toISOString(),
      },
      token: {
        sub: "user-1",
        rememberMe: false,
        sessionExpiresAt: 123456,
      },
      trigger: "update",
      newSession: undefined,
    } as never)) as {
      user?: { id?: string };
      rememberMe?: boolean;
      sessionExpiresAt?: number;
    };

    expect(session.user?.id).toBe("user-1");
    expect(session.rememberMe).toBe(false);
    expect(session.sessionExpiresAt).toBe(123456);
  });
});
