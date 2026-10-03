import { amenityLabel } from '../../../shared/amenities';
import type { Park } from '../../../shared/parks';
import type { AppState } from '../state/types';

/**
 * Split text into lowercase words. Hyphens are removed first so "Wi-Fi", "WiFi" and "wifi"
 * all become "wifi"; everything else that is not a letter or digit separates words.
 * A trailing "s" is dropped from words longer than 3 letters so "trail" matches "Trails".
 */
function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/-/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return words.map((word) => (word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word));
}

/**
 * Every query word must equal a whole word in the park's name, description, address or
 * amenity labels. Trade-off: partial words no longer match ("play" does not find
 * "Playground"), but "lake" no longer finds "Lakeshore Point" either.
 */
function matchesText(park: Park, words: string[]): boolean {
  const text = [park.name, park.description, park.address, ...park.amenities.map(amenityLabel)]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const tokens = new Set(tokenize(text));
  return words.every((word) => tokens.has(word));
}

/** A park must have every selected amenity (AND). */
function hasAllAmenities(park: Park, slugs: string[]): boolean {
  return slugs.every((slug) => park.amenities.includes(slug));
}

export function filterParks(parks: Park[], state: AppState): Park[] {
  const words = tokenize(state.query);
  if (words.length === 0 && state.amenities.length === 0) return parks;
  return parks.filter((park) => matchesText(park, words) && hasAllAmenities(park, state.amenities));
}
