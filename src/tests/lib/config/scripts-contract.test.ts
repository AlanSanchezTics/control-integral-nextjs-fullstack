import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("package scripts contract", () => {
  test("includes db/auth/test foundations", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    expect(pkg.scripts["test:unit"]).toBeDefined();
    expect(pkg.scripts["test:e2e"]).toBeDefined();
    expect(pkg.scripts["db:generate"]).toBeDefined();
    expect(pkg.dependencies.i18next).toBeDefined();
    expect(pkg.dependencies["react-i18next"]).toBeDefined();
  });
});
