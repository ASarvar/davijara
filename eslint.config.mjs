import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Alternate build output used for clean bundle measurement
    // (NEXT_DIST_DIR=.next-prod). Generated code, not ours to lint.
    ".next-prod/**",
    // The original static site, kept verbatim as a migration reference.
    "legacy/**",
  ]),
]);

export default eslintConfig;
