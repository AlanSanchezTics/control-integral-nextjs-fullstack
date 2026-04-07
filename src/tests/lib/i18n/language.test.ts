import { describe, expect, test } from "vitest";

import { normalizeLanguage } from "@/lib/i18n/config";
import { readLanguageFromCookie } from "@/lib/i18n/language";

describe("language utilities", () => {
  test("falls back to es for unsupported values", () => {
    expect(normalizeLanguage("fr")).toBe("es");
    expect(normalizeLanguage("en")).toBe("en");
  });

  test("reads persisted app_lang cookie", () => {
    expect(readLanguageFromCookie("foo=bar; app_lang=en; hello=world")).toBe("en");
  });
});
