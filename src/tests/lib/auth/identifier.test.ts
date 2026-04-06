import { describe, expect, test } from "vitest";

import {
  classifyLoginIdentifier,
  normalizeLoginIdentifierOrThrow,
  parseLoginIdentifier,
} from "@/lib/auth/identifier";

describe("login identifier parsing", () => {
  test("normalizes email identifiers to lowercase", () => {
    expect(parseLoginIdentifier("  User@Example.com ")).toEqual({
      kind: "email",
      value: "user@example.com",
      raw: "User@Example.com",
    });
  });

  test("normalizes phone identifiers to digits with optional leading plus", () => {
    expect(parseLoginIdentifier(" +1 (555) 111-2222 ")).toEqual({
      kind: "phone",
      value: "+15551112222",
      raw: "+1 (555) 111-2222",
    });
  });

  test("rejects invalid identifiers", () => {
    expect(parseLoginIdentifier("not-an-identifier")).toBeNull();
    expect(classifyLoginIdentifier("not-an-identifier")).toBeNull();
  });

  test("throws a stable error code for invalid identifiers", () => {
    expect(() => normalizeLoginIdentifierOrThrow("bad value")).toThrow(
      "AUTH_INVALID_IDENTIFIER",
    );
  });
});

