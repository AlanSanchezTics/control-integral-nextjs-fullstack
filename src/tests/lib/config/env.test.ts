import { describe, expect, test } from "vitest";

import { getEnv } from "../../../lib/config/env";

describe("env contract", () => {
  test("requires DATABASE_URL and AUTH_SECRET", () => {
    expect(() => getEnv({} as NodeJS.ProcessEnv)).toThrow(
      "Missing required env var: DATABASE_URL",
    );
  });

  test("returns normalized env values", () => {
    const env = getEnv({
      DATABASE_URL: "mysql://app:app@localhost:3306/app",
      AUTH_SECRET: "secret",
      AUTH_TRUST_HOST: "true",
    } as NodeJS.ProcessEnv);

    expect(env.DATABASE_URL).toBe("mysql://app:app@localhost:3306/app");
    expect(env.AUTH_SECRET).toBe("secret");
    expect(env.AUTH_TRUST_HOST).toBe(true);
  });
});
