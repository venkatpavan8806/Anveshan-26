import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These two rules come from the React Compiler lint set and flag the
      // standard "fetch on mount" pattern (`useEffect(() => { load() }, [load])`)
      // used throughout this app's client components. We don't run the
      // React Compiler, and the pattern is safe/idiomatic Next.js today, so
      // these are downgraded rather than restructuring every data-fetching
      // component around them.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
