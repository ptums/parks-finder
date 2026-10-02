import type { Park } from '../../../shared/parks';
import { filterParks } from '../search/filterParks';
import { sortParks } from '../search/sortParks';
import type { AppState } from './types';

export function visibleParks(parks: Park[], state: AppState): Park[] {
  return sortParks(filterParks(parks, state), state);
}

export function selectedPark(parks: Park[], state: AppState): Park | undefined {
  return parks.find((park) => park.id === state.selectedParkId);
}
