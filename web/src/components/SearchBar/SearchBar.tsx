import { useEffect, useMemo, useRef, useState } from 'react';
import { amenityLabel } from '../../../../shared/amenities';
import type { Park } from '../../../../shared/parks';
import { track } from '../../analytics';
import { useAnnounce } from '../../a11y/useAnnounce';
import { getPosition } from '../../geo/geolocation';
import { PARKS } from '../../data/parks';
import { useAppState, useDispatch, useVisibleParks } from '../../state/AppState';
import { initialState } from '../../state/reducer';
import { effectiveMode } from '../../state/selectors';
import type { AppState, SortKey } from '../../state/types';
import './SearchBar.css';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'rating', label: 'Rating high-low' },
  { value: 'acreage', label: 'Size large-small' },
];

const DISTANCE_OPTION = { value: 'distance' as SortKey, label: 'Distance' };
const SORT_WORDS: Record<SortKey, string> = {
  name: 'name',
  rating: 'rating',
  acreage: 'size',
  distance: 'name', // distance cannot stay once the location is gone
  relevance: 'best match',
};

function unavailableText(sort: SortKey): string {
  return `Location unavailable. Parks are still listed by ${SORT_WORDS[sort]}.`;
}

const NO_MATCH = 'No parks match. Try removing a filter.';

function settingsKey({ query, amenities, sort }: Pick<AppState, 'query' | 'amenities' | 'sort'>) {
  // "Best match" is switched on and off by the AI, which announces for itself, so it counts as name.
  return JSON.stringify([query, amenities, sort === 'relevance' ? 'name' : sort]);
}

function countText(count: number): string {
  if (count === 0) return NO_MATCH;
  return `${count} ${count === 1 ? 'park' : 'parks'} shown`;
}

/** Amenities that appear in the data, in alphabetical order of their labels. */
function amenityOptions(parks: Park[]): Array<{ slug: string; label: string }> {
  const slugs = new Set(parks.flatMap((park) => park.amenities));
  return [...slugs]
    .map((slug) => ({ slug, label: amenityLabel(slug) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** In AI-only mode the standard controls are absent from the DOM, not hidden. */
export function SearchBar({ parks = PARKS }: { parks?: Park[] }) {
  const state = useAppState();
  return effectiveMode(state) === 'ai' ? null : <StandardSearch parks={parks} />;
}

const BEST_MATCH_OPTION = { value: 'relevance' as SortKey, label: 'Best match' };

function StandardSearch({ parks }: { parks: Park[] }) {
  const state = useAppState();
  const { query, amenities, sort, origin } = state;
  const hasAiResults = effectiveMode(state) !== 'filters' && state.aiResults !== null;
  const [locationError, setLocationError] = useState(false);
  const [pending, setPending] = useState(false);
  const requestId = useRef(0); // lets Reset and Stop cancel a location request in flight
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const visible = useVisibleParks(parks);
  const options = useMemo(() => amenityOptions(parks), [parks]);

  // Announce the count 500 ms after the last change. Reset announces on its own,
  // so it records the settings it announced and the effect skips them.
  const settings = settingsKey({ query, amenities, sort });
  const announced = useRef(settings);
  const latest = useRef({ query, amenities, sort });
  latest.current = { query, amenities, sort };
  const count = visible.length;
  useEffect(() => {
    if (settings === announced.current) return;
    const timer = setTimeout(() => {
      announced.current = settings;
      announce(countText(count));
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, count, announce]);

  async function useMyLocation() {
    if (pending) return;
    const myRequest = ++requestId.current;
    setPending(true);
    setLocationError(false);
    const position = await getPosition();
    if (myRequest !== requestId.current) return; // Reset happened while waiting.
    setPending(false);
    track({ name: 'location_requested', props: { granted: position !== null } });
    const now = latest.current;
    if (!position) {
      setLocationError(true);
      announce(unavailableText(now.sort));
      return;
    }
    // The location message replaces the count announcement the sort change would trigger.
    announced.current = settingsKey({ ...now, sort: 'distance' });
    dispatch({ type: 'setOrigin', origin: position });
    dispatch({ type: 'setSort', sort: 'distance' });
    announce('Sorted by distance from your location.');
  }

  function stopUsingLocation() {
    requestId.current++;
    const now = latest.current;
    const newSort = now.sort === 'distance' ? 'name' : now.sort;
    announced.current = settingsKey({ ...now, sort: newSort });
    dispatch({ type: 'setOrigin', origin: null });
    announce(`Stopped using your location. Parks are listed by ${SORT_WORDS[newSort]}.`);
  }

  function reset() {
    track({ name: 'reset_clicked', props: {} });
    requestId.current++;
    setPending(false);
    setLocationError(false);
    announced.current = settingsKey(initialState());
    dispatch({ type: 'reset' });
    announce(`Search and filters cleared. ${parks.length} parks shown.`);
  }

  return (
    <form role="search" aria-label="Search and filter parks" onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="park-search" className="search-field">
        Search parks
        <input
          id="park-search"
          aria-label="Search parks" // same as the visible label; jsx-a11y needs it
          type="search"
          value={query}
          onChange={(e) => {
            if (!query)
              track({ name: 'filter_applied', props: { filter: 'text', value: 'changed' } });
            dispatch({ type: 'setQuery', query: e.target.value });
          }}
        />
      </label>

      <details className="search-amenities">
        <summary>Amenities ({amenities.length} selected)</summary>
        <fieldset>
          <legend>Show parks that have all of these</legend>
          {options.map(({ slug, label }) => (
            <label key={slug} htmlFor={`amenity-${slug}`} className="search-checkbox">
              <input
                id={`amenity-${slug}`}
                aria-label={label}
                type="checkbox"
                checked={amenities.includes(slug)}
                onChange={() => {
                  track({ name: 'filter_applied', props: { filter: 'amenity', value: slug } });
                  dispatch({ type: 'toggleAmenity', slug });
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
      </details>

      <label htmlFor="park-sort" className="search-field">
        Sort by
        <select
          id="park-sort"
          value={sort}
          onChange={(e) => {
            track({ name: 'filter_applied', props: { filter: 'sort', value: e.target.value } });
            dispatch({ type: 'setSort', sort: e.target.value as SortKey });
          }}
        >
          {[
            ...(hasAiResults ? [BEST_MATCH_OPTION] : []),
            ...SORT_OPTIONS,
            ...(origin ? [DISTANCE_OPTION] : []),
          ].map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {origin ? (
        <button type="button" className="search-button" onClick={stopUsingLocation}>
          Stop using my location
        </button>
      ) : (
        <button type="button" className="search-button" aria-busy={pending} onClick={useMyLocation}>
          Use my location
        </button>
      )}
      {pending && <p>Finding your location…</p>}
      {locationError && !origin && <p className="search-location-error">{unavailableText(sort)}</p>}

      <button type="button" className="search-reset" onClick={reset}>
        Reset
      </button>

      {count === 0 && <p className="search-empty">{NO_MATCH}</p>}
    </form>
  );
}
