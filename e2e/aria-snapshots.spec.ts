import { expect, test } from './fixtures';

// Inline aria snapshots. The directory differs by viewport (open list on desktop, collapsed
// toggle on phone), so that region has one snapshot per layout, chosen by what is visible.

test.describe('aria snapshots', () => {
  test('banner', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toMatchAriaSnapshot(`
      - banner:
        - heading "Find a Park" [level=1]
        - paragraph: 'NYC-area parks: browse the map or the list, then open one for details.'
        - search "Search and filter parks"
    `);
  });

  test('search region', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('search', { name: 'Search and filter parks' }))
      .toMatchAriaSnapshot(`
      - search "Search and filter parks":
        - text: Search parks
        - searchbox "Search parks"
        - group: Amenities (0 selected)
        - text: Sort by
        - combobox "Sort by":
          - option "Name A-Z" [selected]
          - option "Rating high-low"
          - option "Size large-small"
        - button "Reset"
    `);
  });

  test('directory region', async ({ page }) => {
    await page.goto('/');
    const directory = page.getByRole('region', { name: 'Park directory' });
    const listOpen = await page.locator('.park-list-item').first().isVisible();
    if (listOpen) {
      await expect(directory).toMatchAriaSnapshot(`
        - region "Park directory":
          - heading "Park directory" [level=2]
          - button "Hide park list" [expanded]
          - list:
            - listitem:
              - button "Cedar Hill Nature Preserve , No rating"
            - listitem:
              - button "Central Plaza Green , rated 4 out of 5"
            - listitem:
              - button "East Ridge Trailhead , rated 4.9 out of 5"
            - listitem:
              - button "Highland Dog Park , rated 4.8 out of 5"
            - listitem:
              - button "Hillcrest Skate Park , rated 3.9 out of 5"
            - listitem:
              - button "Lakeshore Point , rated 4.3 out of 5"
            - listitem:
              - button "Old Mill Botanical Garden , rated 4.6 out of 5"
            - listitem:
              - button "Prospect Park , rated 4.7 out of 5"
            - listitem:
              - button "Riverside Commons , rated 4.4 out of 5"
            - listitem:
              - button "Sunset Playground , rated 4.1 out of 5"
            - listitem:
              - button "Veterans Memorial Field , rated 4.2 out of 5"
            - listitem:
              - button "Willow Creek Wetlands , rated 4.5 out of 5"
      `);
    } else {
      await expect(directory).toMatchAriaSnapshot(`
        - region "Park directory":
          - heading "Park directory" [level=2]
          - button "Show park list"
      `);
    }
  });

  test('map region heading and controls', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);
    const map = page.getByRole('region', { name: 'Map of parks' });
    await expect(map.getByRole('heading', { level: 2, name: 'Map of parks' })).toBeAttached();
    await expect(map.getByRole('group', { name: 'Map of parks. Use arrow keys to pan.' }))
      .toMatchAriaSnapshot(`
      - group "Map of parks. Use arrow keys to pan.":
        - button "Cedar Hill Nature Preserve"
        - button "Willow Creek Wetlands"
        - button "Zoom in"
        - button "Zoom out"
        - link "Leaflet"
        - link "OpenStreetMap"
    `);
  });

  test('open details dialog for a sparse park', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Show park list' });
    if (await toggle.isVisible()) await toggle.click();
    await page.locator('#park-list-item-cedar-hill-nature-preserve').click();
    await expect(page.getByRole('dialog')).toMatchAriaSnapshot(`
      - dialog "Cedar Hill Nature Preserve":
        - heading "Cedar Hill Nature Preserve" [level=2]
        - button "Close"
        - paragraph: Photos not listed
        - paragraph: /Protected woodland.*/
        - heading "Amenities" [level=3]
        - list:
          - listitem: Trails
          - listitem: Wildlife viewing
          - listitem: Parking
        - heading "Address" [level=3]
        - paragraph: Cedar Hill Rd
        - heading "Hours" [level=3]
        - paragraph: Dawn to dusk
        - heading "Size and rating" [level=3]
        - paragraph: 212 acres
        - heading "Contact" [level=3]
        - paragraph: Contact information not listed
    `);
  });

  test('exactly one h1 and the heading outline', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find a Park');
    const outline = await page
      .getByRole('heading')
      .evaluateAll((els) => els.map((el) => `${el.tagName.toLowerCase()} ${el.textContent}`));
    expect(outline).toEqual(['h1 Find a Park', 'h2 Park directory', 'h2 Map of parks']);

    // With details open the dialog adds h2 + h3s; the page still has one h1.
    const toggle = page.getByRole('button', { name: 'Show park list' });
    if (await toggle.isVisible()) await toggle.click();
    await page.locator('#park-list-item-cedar-hill-nature-preserve').click();
    const dialogOutline = await page
      .getByRole('dialog')
      .getByRole('heading')
      .evaluateAll((els) => els.map((el) => `${el.tagName.toLowerCase()} ${el.textContent}`));
    expect(dialogOutline).toEqual([
      'h2 Cedar Hill Nature Preserve',
      'h3 Amenities',
      'h3 Address',
      'h3 Hours',
      'h3 Size and rating',
      'h3 Contact',
    ]);
  });

  test('landmarks: one banner, main, contentinfo and a status region', async ({ page }) => {
    await page.goto('/');
    for (const role of ['banner', 'main', 'contentinfo'] as const) {
      await expect(page.getByRole(role)).toHaveCount(1);
    }
    await expect(page.getByRole('status')).toHaveCount(1);
  });
});
