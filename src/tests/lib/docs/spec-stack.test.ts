import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("docs specification stack", () => {
  test("mentions MariaDB as baseline DB", () => {
    const spec = readFileSync("docs/specification.md", "utf-8");
    expect(spec).toMatch(/MariaDB|mariadb/);
  });
});
