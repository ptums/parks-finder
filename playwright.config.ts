import { defineConfig, devices } from '@playwright/test';

const AI_URL = 'http://127.0.0.1:4174';

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    {
      name: 'desktop',
      testIgnore: /ai\.spec/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'phone', testIgnore: /ai\.spec/, use: { ...devices['Pixel 7'] } },
    // AI-on specs run against a second build that has VITE_RAG_URL set (the service is faked with page.route).
    {
      name: 'ai-desktop',
      testMatch: /ai\.spec/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        baseURL: AI_URL,
      },
    },
    { name: 'ai-phone', testMatch: /ai\.spec/, use: { ...devices['Pixel 7'], baseURL: AI_URL } },
  ],
  // Builds the web app and serves it; no AI service is configured, so this is the no-key case.
  webServer: [
    {
      command:
        'npm run build:web && npx vite preview --config web/vite.config.ts --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command:
        'VITE_RAG_URL=http://127.0.0.1:4999 npx vite build --config web/vite.config.ts --outDir ai-build/dist && npx vite preview --config web/vite.config.ts --outDir ai-build/dist --host 127.0.0.1 --port 4174',
      url: AI_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
