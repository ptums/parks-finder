import { useEffect, useMemo, useRef } from 'react';
import { amenityLabel } from '../../../../shared/amenities';
import type { Park } from '../../../../shared/parks';
import { useAnnounce } from '../../a11y/useAnnounce';
import { PARKS } from '../../data/parks';
import { useAppState, useDispatch, useVisibleParks } from '../../state/AppState';
import { initialState } from '../../state/reducer';
import type { AppState, SortKey } from '../../state/types';
import './SearchBar.css';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'rating', label: 'Rating high-low' },
  { value: 'acreage', label: 'Size large-small' },
];

const NO_MATCH = 'No parks match. Try removing a filter.';

function settingsKey({ query, amenities, sort }: Pick<AppState, 'query' | 'amenities' | 'sort'>) {
  return JSON.stringify([query, amenities, sort]);
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

export function SearchBar({ parks = PARKS }: { parks?: Park[] }) {
  const { query, amenities, sort } = useAppState();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const visible = useVisibleParks(parks);
  const options = useMemo(() => amenityOptions(parks), [parks]);

  // Announce the count 500 ms after the last change. Reset announces on its own,
  // so it records the settings it announced and the effect skips them.
  const settings = settingsKey({ query, amenities, sort });
  const announced = useRef(settings);
  const count = visible.length;
  useEffect(() => {
    if (settings === announced.current) return;
    const timer = setTimeout(() => {
      announced.current = settings;
      announce(countText(count));
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, count, announce]);

  function reset() {
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
          onChange={(e) => dispatch({ type: 'setQuery', query: e.target.value })}
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
                onChange={() => dispatch({ type: 'toggleAmenity', slug })}
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
          onChange={(e) => dispatch({ type: 'setSort', sort: e.target.value as SortKey })}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="search-reset" onClick={reset}>
        Reset
      </button>

      {count === 0 && <p className="search-empty">{NO_MATCH}</p>}
    </form>
  );
}
