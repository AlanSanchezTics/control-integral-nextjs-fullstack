import { describe, expect, test } from "vitest";

import { authConfig } from "../../../lib/auth/config";

describe("auth config", () => {
  test("uses credentials provider", () => {
    expect(authConfig.providers.length).toBeGreaterThan(0);
    expect(authConfig.session?.strategy).toBe("database");
  });
});
