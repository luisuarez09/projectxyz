import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettier,
  {
    rules: {
      // The existing UI predates these React Compiler rules. They will be
      // enabled incrementally when each demonstrative screen is connected.
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "node_modules/**",
    "playwright-report/**",
    "src/generated/prisma/**",
    "test-results/**",
  ]),
]);
