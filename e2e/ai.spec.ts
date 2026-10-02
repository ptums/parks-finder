import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// Runs against the second build (VITE_RAG_URL set); the service is faked with page.route.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

const SEARCH = {
  mode: 'hybrid',
  results: [
    { parkId: 'prospect-park', score: 1, field: 'amenities', matchedText: 'lake and trails' },
  ],
  abstained: false,
  latencyMs: 5,
};
const ASK = {
  answer: 'Prospect Park has a lake.',
  citations: [{ parkId: 'prospect-park', chunkId: 'prospect-park#amenities', quote: 'lake' }],
  abstained: false,
  mode: 'hybrid',
  latencyMs: 9,
};

async function fakeService(page: Page, capabilities: unknown = { ai: true }) {
  await page.route('http://127.0.0.1:4999/**', (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = request.url();
    const body = url.endsWith('/v1/capabilities')
      ? capabilities
      : url.endsWith('/v1/search')
        ? SEARCH
        : ASK;
    return route.fulfill({
      contentType: 'application/json',
      headers: CORS,
      body: JSON.stringify(body),
    });
  });
}

test('keyboard-only: switch modes, ask, open a citation', async ({ page }) => {
  await fakeService(page);
  await page.goto('/');
  const both = page.getByRole('radio', { name: 'Both' });
  await expect(both).toBeChecked();

  // Arrow keys move through the radio group; AI-only removes the standard search.
  await both.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('radio', { name: 'AI' })).toBeChecked();
  await expect(page.getByRole('searchbox', { name: 'Search parks' })).toHaveCount(0);

  await page.getByRole('textbox', { name: 'Ask about the parks' }).focus();
  await page.keyboard.type('lake');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'AI answer' })).toBeVisible();
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);

  const citation = page.locator('#ai-citation-0');
  await citation.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(citation).toBeFocused();
});

test('ai:false: no AI controls', async ({ page }) => {
  await fakeService(page, { ai: false });
  await page.goto('/');
  await expect(page.getByRole('searchbox', { name: 'Search parks' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'AI' })).toHaveCount(0);
  await expect(page.getByRole('search', { name: 'AI search' })).toHaveCount(0);
});
