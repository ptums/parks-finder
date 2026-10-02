import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// The directory starts collapsed on phones, so open it when needed.
async function openDirectory(page: Page) {
  const toggle = page.getByRole('button', { name: 'Show park list' });
  if (await toggle.isVisible()) await toggle.click();
}

test.describe('list and details', () => {
  test.use({ permissions: [] }); // geolocation is never granted; the app must not need it

  test('Enter opens details, Esc closes and focus returns to the item', async ({ page }) => {
    await page.goto('/');
    await openDirectory(page);
    const first = page.locator('.park-list-item').first();
    const name = (await first.locator('.park-list-name').innerText()).trim();
    await first.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('Space opens details and the image placeholder shows', async ({ page }) => {
    await page.goto('/');
    await openDirectory(page);
    // Highland Dog Park has an image URL (which fails in the sample data).
    await page.getByRole('button', { name: 'Highland Dog Park' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Image unavailable')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Photo of Highland Dog Park unavailable' }),
    ).toBeVisible();
  });

  test('there is no keyboard trap inside details', async ({ page }) => {
    await page.goto('/');
    await openDirectory(page);
    await page.locator('.park-list-item').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 5; i++) await page.keyboard.press('Tab');
    // Focus stays inside the modal while it is open, and Esc always gets out.
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
