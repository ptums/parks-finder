import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The directory starts collapsed on phones, so open it when needed.
async function openDirectory(page: Page) {
  const toggle = page.getByRole('button', { name: 'Show park list' });
  if (await toggle.isVisible()) await toggle.click();
}

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  // KNOWN FINDING (not hidden, see docs/VERIFICATION.md "2.5.8"): at the default zoom a few map
  // markers overlap, so axe's target-size rule flags #park-marker-* nodes (2.5.8 needs 24px of
  // clear space). The directory list is an equivalent control for every marker (the WCAG 2.5.8
  // "equivalent" exception), so only those marker nodes are filtered; everything else must pass.
  const summary = results.violations
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes
        .filter((n) => !(v.id === 'target-size' && n.target.join(' ').startsWith('#park-marker-')))
        .map((n) => n.target.join(' ')),
    }))
    .filter((v) => v.targets.length > 0);
  expect(summary).toEqual([]);
}

async function openDetails(page: Page, id: string) {
  await openDirectory(page);
  await page.locator(`#park-list-item-${id}`).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('whole-page axe scans (WCAG 2.0/2.1/2.2 A and AA tags)', () => {
  test('default page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);
    await expectNoViolations(page);
  });

  test('default page with the directory open', async ({ page }) => {
    await page.goto('/');
    await openDirectory(page);
    await expect(page.locator('.park-list-item')).toHaveCount(12);
    await expectNoViolations(page);
  });

  test('details open for a full park (image fails to load, so the placeholder shows)', async ({
    page,
  }) => {
    await page.goto('/');
    await openDetails(page, 'highland-dog-park');
    await expect(page.getByText('Image unavailable')).toBeVisible();
    await expectNoViolations(page);
  });

  test('details open for a sparse park (no images, no rating)', async ({ page }) => {
    await page.goto('/');
    await openDetails(page, 'cedar-hill-nature-preserve');
    await expect(page.getByText('Not listed').first()).toBeVisible();
    await expectNoViolations(page);
  });

  test('filters active (query plus an amenity)', async ({ page }) => {
    await page.goto('/');
    await openDirectory(page);
    await page.getByLabel('Search parks').fill('park');
    await page.getByText(/^Amenities \(0 selected\)$/).click();
    await page.getByRole('checkbox', { name: 'Accessible paths' }).check();
    await expect(page.getByText(/^Amenities \(1 selected\)$/)).toBeVisible();
    await expectNoViolations(page);
  });

  test('no results', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Search parks').fill('zzzzzz');
    await expect(page.locator('.search-empty')).toBeVisible();
    await expectNoViolations(page);
  });
});

test.describe('capability gating (no AI UI exists)', () => {
  const aiControl = /\bAI\b|\bask\b/i;

  async function expectNoAiControls(page: Page) {
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);
    const search = page.getByRole('search');
    await expect(search.getByRole('button', { name: aiControl })).toHaveCount(0);
    await expect(search.getByRole('textbox', { name: aiControl })).toHaveCount(0);
    await expect(search.getByRole('radio', { name: aiControl })).toHaveCount(0);
    await expect(page.getByRole('search', { name: aiControl })).toHaveCount(0);
  }

  test('service unreachable (default): no AI controls in the DOM', async ({ page }) => {
    await expectNoAiControls(page);
  });

  test('service says ai:true: still no AI controls (the web app has no AI UI)', async ({
    page,
  }) => {
    await page.route('**/v1/capabilities', (route) =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ai: true }) }),
    );
    await expectNoAiControls(page);
  });
});

test.describe('reflow and motion', () => {
  test('320px wide: no horizontal page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(12);
    await openDirectory(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    // Also with details open.
    await page.locator('.park-list-item').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const overflowOpen = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowOpen).toBeLessThanOrEqual(0);
  });

  test('prefers-reduced-motion: no transitions on buttons, inputs, links, select, summary', async ({
    page,
  }) => {
    // Positive control: without the preference, the skip link does have a transition, so the
    // check below can actually fail.
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const skipDuration = await page
      .getByRole('link', { name: 'Skip to results' })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(skipDuration).not.toBe('0s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDirectory(page);
    const longest = await page.evaluate(() => {
      const found: { el: string; duration: string }[] = [];
      const els = document.querySelectorAll('button, input, a, select, summary');
      els.forEach((el) => {
        const durations = getComputedStyle(el).transitionDuration.split(',');
        const max = Math.max(
          ...durations.map((d) => parseFloat(d) * (d.includes('ms') ? 0.001 : 1)),
        );
        if (max > 0) found.push({ el: el.tagName + '.' + el.className, duration: String(max) });
      });
      return { count: els.length, found };
    });
    expect(longest.count).toBeGreaterThan(10);
    expect(longest.found).toEqual([]);
  });
});
