import { describe, expect, test, vi } from "vitest";

import { createNextAuthBigIntAdapter } from "@/lib/auth/next-auth-bigint-adapter";

describe("next-auth bigint adapter", () => {
  test("converts string user id into bigint for getUser queries", async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: BigInt(12),
      email: "user@example.com",
      emailVerified: null,
      name: "User",
      image: null,
    });

    const adapter = createNextAuthBigIntAdapter({
      user: {
        findUnique,
        update: vi.fn(),
        delete: vi.fn(),
      },
      account: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        delete: vi.fn(),
      },
    } as never);

    const user = await adapter.getUser?.("12");

    expect(findUnique).toHaveBeenCalledWith({ where: { id: BigInt(12) } });
    expect(user?.id).toBe("12");
  });

  test("converts account userId from string to bigint on linkAccount", async () => {
    const create = vi.fn().mockResolvedValue({
      id: BigInt(99),
      userId: BigInt(12),
      type: "oauth",
      provider: "github",
      providerAccountId: "abc",
      refresh_token: null,
      access_token: null,
      expires_at: null,
      token_type: null,
      scope: null,
      id_token: null,
      session_state: null,
    });

    const adapter = createNextAuthBigIntAdapter({
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      account: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create,
        delete: vi.fn(),
      },
      verificationToken: {
        create: vi.fn(),
        delete: vi.fn(),
      },
    } as never);

    await adapter.linkAccount?.({
      userId: "12",
      type: "oauth",
      provider: "github",
      providerAccountId: "abc",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: BigInt(12),
        }),
      }),
    );
  });
});
