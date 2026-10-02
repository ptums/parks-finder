import type { Park } from '../../../shared/parks';
import { filterParks } from '../search/filterParks';
import { sortParks } from '../search/sortParks';
import { aiRank, narrowByAi } from '../search/aiResults';
import type { AppState, SearchMode } from './types';

/** Without a service that said ai:true, the app is always Filters-only. */
export function effectiveMode(state: AppState): SearchMode {
  return state.aiAvailable ? state.mode : 'filters';
}

export function visibleParks(parks: Park[], state: AppState): Park[] {
  const mode = effectiveMode(state);
  const aiResults = mode === 'filters' ? null : state.aiResults;
  // In AI mode the standard filters are not shown, so they must not apply.
  const filtered = mode === 'ai' ? parks : filterParks(parks, state);
  const narrowed = aiResults ? narrowByAi(filtered, aiResults) : filtered;
  if (aiResults && state.sort === 'relevance') return aiRank(narrowed, aiResults);
  return sortParks(narrowed, state);
}

export function selectedPark(parks: Park[], state: AppState): Park | undefined {
  return parks.find((park) => park.id === state.selectedParkId);
}
