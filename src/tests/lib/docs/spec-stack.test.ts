import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("docs specification stack", () => {
  test("mentions core stack contracts including i18n", () => {
    const spec = readFileSync("docs/specification.md", "utf-8");
    expect(spec).toMatch(/MariaDB|mariadb/);
    expect(spec).toMatch(/react-i18next/);
    expect(spec).toMatch(/app_lang/);
  });
});
