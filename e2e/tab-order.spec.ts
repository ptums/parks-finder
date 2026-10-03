import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const MAP_NAME = 'Map of parks. Use arrow keys to pan.';

// What the focused element is called. Parks share names (list button and marker), so those use
// their id. The select's name comes from its <label>, not its option text.
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return '(none)';
    if (el.tagName === 'BODY') return '(body)';
    if (el.id.startsWith('park-list-item-') || el.id.startsWith('park-marker-')) return el.id;
    if (el instanceof HTMLSelectElement) {
      // The <label> may wrap the select, so take only its own text, not the option text.
      const label = el.labels?.[0];
      const own = [...(label?.childNodes ?? [])].filter((n) => n.nodeType === Node.TEXT_NODE);
      return (
        own
          .map((n) => n.textContent)
          .join('')
          .trim() || '(unnamed)'
      );
    }
    return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
  });
}

async function openDirectory(page: Page) {
  const toggle = page.getByRole('button', { name: 'Show park list' });
  if (await toggle.isVisible()) await toggle.click();
}

// The page's real DOM order, derived from the DOM rather than a hard-coded list of parks.
async function markerIds(page: Page): Promise<string[]> {
  return page.locator('.leaflet-marker-icon').evaluateAll((els) => els.map((el) => el.id));
}

test.describe('tab order', () => {
  test('Tab visits the controls in reading order; Shift+Tab reverses it', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);

    // The list is only tabbable when the directory is expanded (open on desktop, closed on phone).
    const listVisible = await page.locator('.park-list-item').first().isVisible();
    const toggleName = listVisible ? 'Hide park list' : 'Show park list';
    const listIds = listVisible
      ? await page.locator('.park-list-item').evaluateAll((els) => els.map((el) => el.id))
      : [];
    const markers = await markerIds(page);
    expect(markers).toHaveLength(12);

    // ARCHITECTURE section 6, adjusted to what is rendered: no AI panel and no footer links.
    const expected = [
      'Skip to results',
      'Search parks',
      'Amenities (0 selected)',
      'Sort by',
      'Use my location',
      'Reset',
      toggleName,
      ...listIds,
      'Skip map',
      MAP_NAME,
      ...markers,
      'Zoom in',
      'Zoom out',
      'Recenter map',
      'Leaflet',
      'OpenStreetMap',
    ];
    if (listVisible) expect(listIds).toHaveLength(12);

    const seen: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      await page.keyboard.press('Tab');
      seen.push(await focusedName(page));
    }
    expect(seen).toEqual(expected);

    // One more Tab leaves the page's controls: there is nothing after the attribution links.
    await page.keyboard.press('Tab');
    expect(await focusedName(page)).toBe('(body)');

    // Shift+Tab from the end walks the same list backwards (re-enter on the last stop first).
    await page.keyboard.press('Shift+Tab');
    const back: string[] = [await focusedName(page)];
    for (let i = 1; i < expected.length; i++) {
      await page.keyboard.press('Shift+Tab');
      back.push(await focusedName(page));
    }
    expect(back).toEqual([...expected].reverse());
  });

  test('markers are contiguous and in the same order as the list', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);
    await openDirectory(page);
    const listIds = await page
      .locator('.park-list-item')
      .evaluateAll((els) => els.map((el) => el.id.replace('park-list-item-', '')));
    const markers = (await markerIds(page)).map((id) => id.replace('park-marker-', ''));
    expect(markers).toEqual(listIds);
  });

  test('Skip to results moves focus to the directory heading and the link is visible on focus', async ({
    page,
  }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const link = page.getByRole('link', { name: 'Skip to results' });
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#directory-heading')).toBeFocused();
  });

  test('Skip map moves focus past the map, so the next Tab skips every marker', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Skip map' }).focus();
    await expect(page.getByRole('link', { name: 'Skip map' })).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#after-map')).toBeFocused();
    await page.keyboard.press('Tab');
    const inMap = await page.evaluate(() => !!document.activeElement?.closest('.map-canvas'));
    expect(inMap).toBe(false);
  });
});

test.describe('keyboard operation of details', () => {
  for (const key of ['Enter', 'Space']) {
    test(`${key} on a marker opens details; Esc closes and focus returns to the marker`, async ({
      page,
    }) => {
      await page.goto('/');
      const marker = page.locator('#park-marker-prospect-park');
      await marker.focus();
      await page.keyboard.press(key);
      const dialog = page.getByRole('dialog', { name: 'Prospect Park' });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('heading', { level: 2, name: 'Prospect Park' })).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(marker).toBeFocused();
    });

    test(`${key} on a list item opens details; Esc closes and focus returns to the item`, async ({
      page,
    }) => {
      await page.goto('/');
      await openDirectory(page);
      const item = page.locator('#park-list-item-prospect-park');
      await item.focus();
      await page.keyboard.press(key);
      await expect(page.getByRole('dialog', { name: 'Prospect Park' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(item).toBeFocused();
    });
  }

  test('Tab cycles through the page with no trap while details are closed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      seen.add(await focusedName(page));
    }
    // 60 presses are more than one full lap, so focus must have wrapped through the body.
    expect(seen.has('(body)')).toBe(true);
    expect(seen.has('Skip to results')).toBe(true);
  });
});
