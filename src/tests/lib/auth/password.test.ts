import { describe, expect, test } from "vitest";

import { hashPassword, verifyPassword } from "../../../lib/auth/password";

describe("password hashing with salt + pepper", () => {
  test("validates correct password with matching pepper", () => {
    const pepper = "app_pepper";
    const hash = hashPassword("secure-password", pepper);

    expect(verifyPassword("secure-password", hash, pepper)).toBe(true);
  });

  test("rejects password when pepper does not match", () => {
    const hash = hashPassword("secure-password", "pepper_a");

    expect(verifyPassword("secure-password", hash, "pepper_b")).toBe(false);
  });
});
