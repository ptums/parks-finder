import type { Park } from '../../../shared/parks';
import type { AppState } from '../state/types';

// T4 replaces this stub. For now parks are sorted by name only.
export function sortParks(parks: Park[], state: AppState): Park[] {
  void state;
  return [...parks].sort((a, b) => a.name.localeCompare(b.name));
}
