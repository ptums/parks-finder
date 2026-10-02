import { expect, test } from './fixtures';

test('the app loads with landmarks, one h1 and skip links', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Find a Park: NYC-area parks');
  await expect(page.getByRole('heading', { level: 1, name: 'Find a Park' })).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to results' })).toBeAttached();
  await expect(page.getByRole('link', { name: 'Skip map' })).toBeAttached();
});
