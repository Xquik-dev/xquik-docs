import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  { linterOptions: { noInlineConfig: true } },
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Program", message: "Write this file in TypeScript." },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-check": false, "ts-expect-error": true, "ts-ignore": true, "ts-nocheck": true },
      ],
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/method-signature-style": ["error", "property"],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-declaration-merging": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSDeclareFunction",
          message: "Write 1 checked signature instead of overloads.",
        },
        {
          selector: "TSEmptyBodyFunctionExpression",
          message: "Write 1 checked signature instead of overloads.",
        },
        {
          selector: "[definite=true]",
          message: "Initialize the value instead of asserting that it is set.",
        },
        {
          selector: "[declare=true]",
          message: "Give this value a checked source instead of declaring its type.",
        },
        {
          selector:
            ":matches(Identifier[name=/^(JSON|Reflect)$/], MemberExpression > Literal.property[value=/^(JSON|Reflect)$/]):not(CallExpression > MemberExpression.callee > .object)",
          message: "Call JSON and Reflect functions directly and type their results as unknown.",
        },
        {
          selector: "Identifier[name=/^(eval|createRequire)$/]",
          message: "Import the module or parse the value instead of evaluating code.",
        },
        {
          selector:
            "MemberExpression[object.name='Object'][property.name=/^(assign|create)$/]:not(CallExpression > .callee)",
          message: "Call Object.assign and Object.create directly and type their results.",
        },
        {
          selector:
            "Identifier[name='runInNewContext']:not(CallExpression > .callee, ImportSpecifier > Identifier)",
          message: "Call runInNewContext directly and type its result as unknown.",
        },
        {
          selector: "TSTypeReference[typeName.left.name='z'][typeName.right.name='ZodType']",
          message:
            "Infer the type from the zod schema instead of annotating the schema with a separate type.",
        },
        {
          selector: "Identifier[name='require']:not(CallExpression > .callee)",
          message: "Import the module instead of passing require as a value.",
        },
      ],
      "no-warning-comments": [
        "error",
        {
          terms: ["type-coverage:ignore", "oxlint-disable", "oxlint-enable"],
          location: "anywhere",
        },
      ],
    },
  },
  {
    files: ["**/*.d.ts", "**/*.d.mts", "**/*.d.cts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message: "Write the value in TypeScript instead of declaring its type.",
        },
      ],
    },
  },
);
