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
  ]),
  {
    // The React Compiler rules in the latest eslint-plugin-react-hooks ship as
    // errors. This codebase predates the compiler and is heavy on
    // react-three-fiber + async IndexedDB load-on-mount, so it legitimately
    // uses patterns these rules flag: mutating imperative three.js objects
    // (OrbitControls.enabled), reading refs in the R3F render loop, and calling
    // setState inside mount/sync effects. Treat those as advisory warnings
    // rather than build-blocking errors. Genuine hook-ordering violations
    // (react-hooks/rules-of-hooks) remain errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
