import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      // Advisory du React Compiler (Next 16) : signale une mémoïsation manuelle
      // non préservée, pas un bug de correction -> warning, pas erreur bloquante.
      "react-hooks/preserve-manual-memoization": "warn"
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "*.js",
    "**/*.js",
    "scripts/**",
    "public/**",
    "**/sw.js"
  ]),
]);

export default eslintConfig;
