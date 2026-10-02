import type { Park } from '../../../shared/parks';
import type { AppState } from '../state/types';

function byName(a: Park, b: Park): number {
  return a.name.localeCompare(b.name);
}

/** Largest first; parks without the value go last; ties by name. */
function byNumberDescending(value: (park: Park) => number | undefined) {
  return (a: Park, b: Park): number => {
    const x = value(a);
    const y = value(b);
    if (x === undefined && y === undefined) return byName(a, b);
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    return y - x || byName(a, b);
  };
}

// Distance sorting is not offered (the optional "Use my location" feature was cut),
// so 'distance' falls back to name.
export function sortParks(parks: Park[], state: AppState): Park[] {
  const compare =
    state.sort === 'rating'
      ? byNumberDescending((park) => park.rating)
      : state.sort === 'acreage'
        ? byNumberDescending((park) => park.acreage)
        : byName;
  return [...parks].sort(compare);
}
