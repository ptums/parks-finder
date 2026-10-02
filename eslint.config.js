import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '.worktrees/**',
      '**/dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'db/**',
      'transcripts/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['web/**/*.{ts,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y, 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      ...Object.fromEntries(
        Object.keys(jsxA11y.flatConfigs.recommended.rules).map((name) => [name, 'error']),
      ),
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['server/**/*.ts', 'scripts/**/*.ts', 'shared/**/*.ts', '*.js', '**/*.cjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
