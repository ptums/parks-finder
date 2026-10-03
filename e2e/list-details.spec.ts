import type { Page } from '@playwright/test';
import { expect, failPhotos, test } from './fixtures';

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
    await failPhotos(page);
    await page.goto('/');
    await openDirectory(page);
    await page.locator('#park-list-item-highland-dog-park').focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Image unavailable')).toBeVisible();
    await expect(
      page.getByRole('img', { name: 'Photo of Highland Dog Park unavailable' }),
    ).toBeVisible();
  });

  test('every photo of a park gets its own placeholder', async ({ page }) => {
    await failPhotos(page);
    await page.goto('/');
    await openDirectory(page);
    await page.locator('#park-list-item-prospect-park').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Photos' }).getByRole('listitem')).toHaveCount(2);
    await expect(page.getByText('Image unavailable')).toHaveCount(2);
    await expect(
      page.getByRole('img', { name: 'Photo 2 of 2 of Prospect Park unavailable' }),
    ).toBeVisible();
  });

  test('Prospect Park photos load, with the alt text from the image map', async ({ page }) => {
    await page.goto('/');
    await openDirectory(page);
    await page.locator('#park-list-item-prospect-park').click();
    const photos = page.getByRole('list', { name: 'Photos' }).getByRole('img');
    await expect(photos).toHaveCount(2);
    await expect(photos.first()).toHaveAttribute('alt', /^Prospect Park: /);
    for (const photo of await photos.all()) {
      await expect
        .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
    }
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

  test('blank space inside the sheet keeps it open; the backdrop closes it', async ({
    page,
  }, testInfo) => {
    await page.goto('/');
    await openDirectory(page);
    const first = page.locator('.park-list-item').first();
    await first.click();
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    if (!box) throw new Error('dialog has no box');

    // Near the bottom of the dialog, below the content.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 5);
    await expect(dialog).toBeVisible();

    // The phone sheet is full screen, so only desktop has a backdrop to click.
    if (testInfo.project.name === 'phone') return;
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
  });
});
