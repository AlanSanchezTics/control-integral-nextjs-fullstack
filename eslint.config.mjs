import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: [
      "src/app/**/*.tsx",
      "/src/components/**/*.tsx",
      "/src/context/**/*.tsx",
      "/src/hooks/**/*.tsx",
      "/src/layout/**/*.tsx",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXText[value=/[A-Za-zÀ-ÿ]/]",
          message:
            "Admin UI text must come from react-i18next translation keys (no inline literal text).",
        },
        {
          selector:
            "JSXAttribute[name.name=/^(label|placeholder|title|aria-label|alt)$/] > Literal[value=/[A-Za-zÀ-ÿ]/]",
          message:
            "Admin UI attribute text must use translation keys (allowlist only for technical attributes).",
        },
      ],
    },
  }
]);

export default eslintConfig;
