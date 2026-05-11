const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');

// VI: Cau hinh lint cho NestJS/TypeScript de bat loi nen tang tu Sprint 0.
module.exports = tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
