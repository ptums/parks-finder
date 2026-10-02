import { expect, test } from './fixtures';

// T2's details dialog is not on this branch, so selection is asserted on the marker itself.
const marker = (page: import('@playwright/test').Page) =>
  page.locator('.leaflet-marker-icon').first();

test.describe('map markers', () => {
  test('markers are buttons reachable by Tab, and the map does not trap focus', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('group', { name: 'Map of parks. Use arrow keys to pan.' }),
    ).toBeVisible();
    const first = marker(page);
    await expect(first).toHaveAttribute('role', 'button');
    await expect(first).toHaveAttribute('id', /^park-marker-/);

    // Tab forward from the "Skip map" link: map container, then markers.
    await page.getByRole('link', { name: 'Skip map' }).focus();
    let reachedMarker = false;
    for (let i = 0; i < 6 && !reachedMarker; i++) {
      await page.keyboard.press('Tab');
      reachedMarker = await page.evaluate(
        () => document.activeElement?.classList.contains('leaflet-marker-icon') ?? false,
      );
    }
    expect(reachedMarker).toBe(true);

    // Keep tabbing: focus must leave the map (zoom, attribution, then the footer).
    let leftMap = false;
    for (let i = 0; i < 40 && !leftMap; i++) {
      await page.keyboard.press('Tab');
      leftMap = await page.evaluate(
        () => document.activeElement?.closest('.leaflet-container') === null,
      );
    }
    expect(leftMap).toBe(true);
  });

  for (const [name, key] of [
    ['Enter', 'Enter'],
    ['Space', 'Space'],
  ] as const) {
    test(`${name} on a focused marker selects the park without scrolling`, async ({ page }) => {
      await page.goto('/');
      const first = marker(page);
      await first.focus();
      const scrollBefore = await page.evaluate(() => window.scrollY);
      await page.keyboard.press(key);
      await expect(first).toHaveClass(/park-marker--selected/);
      await expect(first).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    });
  }

  test('clicking a marker selects it', async ({ page }) => {
    await page.goto('/');
    const first = marker(page);
    await first.click();
    await expect(first).toHaveClass(/park-marker--selected/);
  });

  test('the page stays usable when map tiles fail to load', async ({ page }) => {
    await page.route('**/*.tile.openstreetmap.org/**', (route) => route.abort());
    await page.goto('/');
    await expect(marker(page)).toBeVisible();
    await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
    await marker(page).focus();
    await page.keyboard.press('Enter');
    await expect(marker(page)).toHaveClass(/park-marker--selected/);
  });
});
