import type { Park } from '../../../shared/parks';
import type { AppState } from '../state/types';

// T4 replaces this pass-through stub with real text and amenity filtering.
export function filterParks(parks: Park[], state: AppState): Park[] {
  void state;
  return parks;
}
