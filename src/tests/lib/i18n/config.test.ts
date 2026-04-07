import { describe, expect, test } from "vitest";

import { buildI18nInstance } from "@/lib/i18n/config";

describe("i18n config", () => {
  test("supports es and en with es fallback", async () => {
    const i18n = await buildI18nInstance("en");
    expect(i18n.options.fallbackLng).toEqual(expect.arrayContaining(["es"]));
    expect(i18n.options.supportedLngs).toEqual(
      expect.arrayContaining(["es", "en"]),
    );
  });
});
