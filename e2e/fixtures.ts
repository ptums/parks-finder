import { test as base, expect } from '@playwright/test';

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

export { expect };
