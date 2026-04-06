import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST as confirmResetPOST } from "@/app/api/auth/reset-password/confirm/route";
import { POST as requestResetPOST } from "@/app/api/auth/reset-password/request/route";

const {
  requestPasswordResetMock,
  confirmPasswordResetMock,
  createPrismaAuthRepositoryMock,
} = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
  confirmPasswordResetMock: vi.fn(),
  createPrismaAuthRepositoryMock: vi.fn(),
}));

vi.mock("@/lib/auth/service", () => ({
  requestPasswordReset: requestPasswordResetMock,
  confirmPasswordReset: confirmPasswordResetMock,
}));

vi.mock("@/lib/auth/repository", () => ({
  createPrismaAuthRepository: createPrismaAuthRepositoryMock,
}));

describe("reset-password routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createPrismaAuthRepositoryMock.mockReturnValue({ fake: true });
  });

  test("request route returns 400 for invalid email payload", async () => {
    const response = await requestResetPOST(
      new Request("http://localhost/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "AUTH_INVALID_IDENTIFIER",
    });
  });

  test("request route returns generic success payload", async () => {
    requestPasswordResetMock.mockResolvedValueOnce({
      ok: true,
      message: "If that email exists, we sent a reset code with the next steps.",
    });

    const response = await requestResetPOST(
      new Request("http://localhost/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "If that email exists, we sent a reset code with the next steps.",
    });
  });

  test("confirm route returns 500 when pepper is missing", async () => {
    const previousPepper = process.env.AUTH_PASSWORD_PEPPER;
    process.env.AUTH_PASSWORD_PEPPER = "";

    const response = await confirmResetPOST(
      new Request("http://localhost/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          token: "ABC123",
          password: "secure-password",
        }),
      }),
    );

    if (previousPepper === undefined) {
      delete process.env.AUTH_PASSWORD_PEPPER;
    } else {
      process.env.AUTH_PASSWORD_PEPPER = previousPepper;
    }

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errorCode: "AUTH_CONFIGURATION_ERROR",
    });
  });

  test("confirm route returns 400 with stable error code", async () => {
    const previousPepper = process.env.AUTH_PASSWORD_PEPPER;
    process.env.AUTH_PASSWORD_PEPPER = "pepper";

    confirmPasswordResetMock.mockResolvedValueOnce({
      ok: false,
      errorCode: "AUTH_RESET_TOKEN_INVALID",
    });

    const response = await confirmResetPOST(
      new Request("http://localhost/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          token: "ABC123",
          password: "secure-password",
        }),
      }),
    );

    if (previousPepper === undefined) {
      delete process.env.AUTH_PASSWORD_PEPPER;
    } else {
      process.env.AUTH_PASSWORD_PEPPER = previousPepper;
    }

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errorCode: "AUTH_RESET_TOKEN_INVALID",
    });
  });

  test("confirm route returns success payload", async () => {
    const previousPepper = process.env.AUTH_PASSWORD_PEPPER;
    process.env.AUTH_PASSWORD_PEPPER = "pepper";

    confirmPasswordResetMock.mockResolvedValueOnce({
      ok: true,
      message: "Your password has been updated. You can sign in now.",
    });

    const response = await confirmResetPOST(
      new Request("http://localhost/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          token: "ABC123",
          password: "secure-password",
        }),
      }),
    );

    if (previousPepper === undefined) {
      delete process.env.AUTH_PASSWORD_PEPPER;
    } else {
      process.env.AUTH_PASSWORD_PEPPER = previousPepper;
    }

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: "Your password has been updated. You can sign in now.",
    });
  });
});
