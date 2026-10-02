import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const UNAVAILABLE = 'Location unavailable. Parks are still listed by name.';

// The directory starts collapsed on phones, so open it when needed.
async function openDirectory(page: Page) {
  const toggle = page.getByRole('button', { name: 'Show park list' });
  if (await toggle.isVisible()) await toggle.click();
}

test.describe('use my location', () => {
  test('sorts the list so the nearest park (Prospect Park) is first', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 40.66, longitude: -73.97 });
    await page.goto('/');
    await openDirectory(page);
    await page.getByRole('button', { name: 'Use my location' }).click();

    await expect(page.getByLabel('Sort by')).toHaveValue('distance');
    await expect(page.locator('.park-list-item').first()).toHaveAttribute(
      'id',
      'park-list-item-prospect-park',
    );
    await expect(page.locator('.park-list-item')).toHaveCount(12);
    await expect(page.getByRole('status')).toHaveText('Sorted by distance from your location.');

    await page.getByRole('button', { name: 'Stop using my location' }).click();
    await expect(page.getByLabel('Sort by')).toHaveValue('name');
  });

  test('shows a message when permission is not granted, and nothing is asked on load', async ({
    page,
    context,
  }) => {
    await context.clearPermissions();
    await page.goto('/');
    await openDirectory(page);
    await expect(page.locator('.search-location-error')).toHaveCount(0);
    await expect(page.locator('.park-list-item')).toHaveCount(12);

    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.locator('.search-location-error')).toHaveText(UNAVAILABLE);
    await expect(page.getByRole('status')).toHaveText(UNAVAILABLE);
    await expect(page.locator('.park-list-item')).toHaveCount(12);
    await expect(page.getByLabel('Sort by')).toHaveValue('name');
  });
});
