import { describe, expect, test } from "vitest";

describe("prisma client", () => {
  test("exports PrismaClient singleton", async () => {
    process.env.DATABASE_URL = "mysql://app:app@localhost:3306/app";
    const { prisma } = await import("../../../lib/db/prisma");
    expect(prisma).toBeDefined();
  });
});
