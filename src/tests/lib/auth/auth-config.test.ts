import { describe, expect, test } from "vitest";

import { authConfig, getAuthSessionOptions } from "../../../lib/auth/config";
import {
  AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
  AUTH_STANDARD_SESSION_MAX_AGE_SECONDS,
} from "../../../lib/auth/constants";

describe("auth config", () => {
  test("uses credentials provider", () => {
    expect(authConfig.providers.length).toBeGreaterThan(0);
    expect(authConfig.session?.strategy).toBe("database");
    expect(authConfig.pages?.signIn).toBe("/login");
    expect(authConfig.session?.maxAge).toBe(AUTH_STANDARD_SESSION_MAX_AGE_SECONDS);
    expect(getAuthSessionOptions(true).maxAge).toBe(
      AUTH_REMEMBER_SESSION_MAX_AGE_SECONDS,
    );
  });
});
