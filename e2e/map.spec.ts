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
    let aborted = 0;
    await page.route('**/tile.openstreetmap.org/**', (route) => {
      aborted++;
      return route.abort();
    });
    await page.goto('/');
    await expect(marker(page)).toBeVisible();
    await expect.poll(() => aborted).toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'OpenStreetMap', exact: true })).toBeVisible();
    await marker(page).focus();
    await page.keyboard.press('Enter');
    await expect(marker(page)).toHaveClass(/park-marker--selected/);
  });

  test('marker images load, with no doubled path', async ({ page }) => {
    await page.goto('/');
    await expect(marker(page)).toBeVisible();
    const images = await page
      .locator('img.leaflet-marker-icon, img.leaflet-marker-shadow')
      .evaluateAll((els) =>
        els.map((el) => ({
          src: (el as HTMLImageElement).src,
          width: (el as HTMLImageElement).naturalWidth,
        })),
      );
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.width).toBeGreaterThan(0);
      expect(image.src).not.toMatch(/images\/+.*@fs/);
    }
  });

  test('Recenter map restores the initial zoom and does not move focus', async ({ page }) => {
    await page.goto('/');
    await expect(marker(page)).toBeVisible();
    // Marker spread on screen is proportional to the zoom scale: use it as a zoom measure.
    const spread = () =>
      page.evaluate(() => {
        const xs = [...document.querySelectorAll('.leaflet-marker-icon')].map(
          (el) => el.getBoundingClientRect().left,
        );
        return Math.max(...xs) - Math.min(...xs);
      });
    const initial = await spread();

    const recenter = page.getByRole('button', { name: /recenter/i });
    const box = await recenter.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);

    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect.poll(spread).toBeCloseTo(initial / 2, -1); // one zoom level out, animation finished
    await recenter.focus();
    await recenter.click();
    await expect.poll(spread).toBeCloseTo(initial, -1);
    await expect(recenter).toBeFocused();
  });
});
