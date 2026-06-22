// Minimal ESLint v9 flat config for the NestJS API.
// TypeScript type-checking is handled by tsc --noEmit in CI; this config
// satisfies ESLint v9's requirement for a flat config file.
module.exports = [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
