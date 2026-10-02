import { AMENITY_LABELS, amenityLabel } from './amenities';
import sample from '../db/parks.sample.json';

describe('amenityLabel', () => {
  it('uses the explicit label for known slugs', () => {
    expect(amenityLabel('dog-run')).toBe('Dog run');
    expect(amenityLabel('wifi')).toBe('Wi-Fi');
  });

  it('falls back to title case for unknown slugs and never drops them', () => {
    expect(amenityLabel('rock-climbing-wall')).toBe('Rock climbing wall');
    expect(amenityLabel('')).toBe('');
  });

  it('has a label for every slug used in the data', () => {
    const slugs = new Set(sample.flatMap((p) => p.amenities));
    for (const slug of slugs) expect(AMENITY_LABELS[slug]).toBeDefined();
  });
});
