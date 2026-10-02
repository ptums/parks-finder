/** Two projects: web (jsdom) and node (shared, server, scripts). */
const transform = {
  '^.+\\.(t|j)sx?$': [
    '@swc/jest',
    {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: { react: { runtime: 'automatic' } },
      },
    },
  ],
};
// roots keep Jest inside web, shared, server and scripts, so .worktrees is never scanned.
const ignore = ['/node_modules/', '/dist/'];

module.exports = {
  projects: [
    {
      displayName: 'web',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/web'],
      testMatch: ['**/*.test.ts?(x)'],
      transform,
      testPathIgnorePatterns: ignore,
      // react-leaflet ships ESM only; let @swc/jest compile it.
      transformIgnorePatterns: ['/node_modules/(?!(react-leaflet|@react-leaflet)/)'],
      setupFilesAfterEnv: ['<rootDir>/web/test/setup.ts'],
      moduleNameMapper: {
        '\\.css$': '<rootDir>/web/test/fileStub.cjs',
        '\\.(png|svg)$': '<rootDir>/web/test/fileStub.cjs',
        '^.+/env$': '<rootDir>/web/test/envStub.ts',
      },
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      roots: ['<rootDir>/shared', '<rootDir>/server', '<rootDir>/scripts'],
      testMatch: ['**/*.test.ts'],
      transform,
      testPathIgnorePatterns: ignore,
    },
  ],
  collectCoverageFrom: [
    'web/src/**/*.{ts,tsx}',
    'shared/**/*.ts',
    'server/src/**/*.ts',
    '!**/*.test.{ts,tsx}',
    '!**/*.d.ts',
    '!web/src/main.tsx',
    '!web/src/env.ts',
    '!server/src/index.ts',
    '!**/index.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
  coverageThreshold: { global: { statements: 80, lines: 80, functions: 75, branches: 70 } },
};
