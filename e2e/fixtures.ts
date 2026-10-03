import { test as base, expect, type Page } from '@playwright/test';

// Tiny transparent PNG so map tiles never hit the real OpenStreetMap server.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('**/tile.openstreetmap.org/**', (route) =>
      route.fulfill({ contentType: 'image/png', body: PIXEL }),
    );
    await use(page);
  },
});

/** Makes every park photo fail to load, so tests can check the placeholder path. */
export async function failPhotos(page: Page) {
  await page.route('**/*.{jpg,webp}', (route) => route.abort());
}

export { expect };
