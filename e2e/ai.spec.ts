import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// Runs against the second build (VITE_RAG_URL set); the service is faked with page.route.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

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

async function fakeService(page: Page, capabilities: unknown = { ai: true }, delayMs = 0) {
  await page.route('http://127.0.0.1:4999/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const url = request.url();
    if (delayMs && url.endsWith('/v1/capabilities'))
      await new Promise((r) => setTimeout(r, delayMs));
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

  // Same filter as a11y.spec.ts: the directory list is the equivalent of overlapping markers.
  const scan = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const violations = scan.violations
    .map((v) => ({
      id: v.id,
      targets: v.nodes
        .filter((n) => !(v.id === 'target-size' && n.target.join(' ').startsWith('#park-marker-')))
        .map((n) => n.target.join(' ')),
    }))
    .filter((v) => v.targets.length > 0);
  expect(violations).toEqual([]);

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

test('service unreachable: no AI controls and standard search works', async ({ page }) => {
  await page.route('http://127.0.0.1:4999/**', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search parks' }).fill('prospect');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'AI' })).toHaveCount(0);
  await expect(page.getByRole('search', { name: 'AI search' })).toHaveCount(0);
});

test('slow capabilities: AI appears later and focus stays where it was', async ({ page }) => {
  await fakeService(page, { ai: true }, 1500);
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Search parks' });
  await search.focus();
  await expect(page.getByRole('search', { name: 'AI search' })).toHaveCount(0);
  await expect(page.getByRole('search', { name: 'AI search' })).toBeVisible({ timeout: 5000 });
  await expect(search).toBeFocused();
});

test('a slow capabilities reply does not overwrite the location message', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 40.66, longitude: -73.97 });
  await fakeService(page, { ai: true }, 1000);
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Show park list' });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('button', { name: 'Use my location' }).click();

  const status = page.getByRole('status');
  // Neither message is lost: each is shown at some point, in this order.
  await expect(status).toHaveText('Sorted by distance from your location.');
  await expect(status).toHaveText('AI search is available.', { timeout: 10000 });
});
