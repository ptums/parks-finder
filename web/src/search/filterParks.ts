import { amenityLabel } from '../../../shared/amenities';
import type { Park } from '../../../shared/parks';
import type { AppState } from '../state/types';

/** Every word in the query must appear in the park's name, description, address or amenity labels. */
function matchesText(park: Park, words: string[]): boolean {
  const text = [park.name, park.description, park.address, ...park.amenities.map(amenityLabel)]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word));
}

/** A park must have every selected amenity (AND). */
function hasAllAmenities(park: Park, slugs: string[]): boolean {
  return slugs.every((slug) => park.amenities.includes(slug));
}

export function filterParks(parks: Park[], state: AppState): Park[] {
  const words = state.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0 && state.amenities.length === 0) return parks;
  return parks.filter((park) => matchesText(park, words) && hasAllAmenities(park, state.amenities));
}
