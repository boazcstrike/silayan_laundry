import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    // Generated coverage output — never lint it.
    ignores: ["coverage/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Allow intentional throwaway bindings prefixed with `_` project-wide
    // (e.g. destructure-to-omit, unused catch params).
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Vendored shadcn/ui primitives (ported from Base UI). Relax the strictest
    // lint rules here only — recharts/Base UI internals need loose typing.
    files: ["components/ui/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Test files: mocks, spies and fixtures legitimately use `any` and
    // throwaway bindings.
    files: ["__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Node CommonJS setup files use require() by design.
    files: ["jest.setup*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
