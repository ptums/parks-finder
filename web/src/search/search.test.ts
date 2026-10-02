import type { Park } from '../../../shared/parks';
import { initialState } from '../state/reducer';
import type { AppState } from '../state/types';
import { filterParks } from './filterParks';
import { sortParks } from './sortParks';

const park = (id: string, name: string, extra: Partial<Park> = {}): Park => ({
  id,
  name,
  amenities: [],
  images: [],
  ...extra,
});

const parks: Park[] = [
  park('a', 'Alpha Park', {
    description: 'A quiet Lake view',
    address: '1 Main Street',
    amenities: ['dog-run', 'restrooms'],
  }),
  park('b', 'Beta Green', { amenities: ['dog-run'] }),
  park('c', 'Gamma Field', { address: '9 Elm Road', amenities: ['wifi'] }),
];

const withState = (changes: Partial<AppState>): AppState => ({ ...initialState(), ...changes });
const ids = (list: Park[]) => list.map((p) => p.id);

describe('filterParks', () => {
  it('returns the same list for an empty query and no amenities', () => {
    expect(filterParks(parks, initialState())).toBe(parks);
    expect(filterParks(parks, withState({ query: '   ' }))).toBe(parks);
  });

  it('matches name, description, address and amenity labels, ignoring case', () => {
    expect(ids(filterParks(parks, withState({ query: 'BETA' })))).toEqual(['b']);
    expect(ids(filterParks(parks, withState({ query: 'lake' })))).toEqual(['a']);
    expect(ids(filterParks(parks, withState({ query: 'elm road' })))).toEqual(['c']);
    expect(ids(filterParks(parks, withState({ query: 'wi-fi' })))).toEqual(['c']);
    expect(ids(filterParks(parks, withState({ query: 'dog run' })))).toEqual(['a', 'b']);
  });

  it('requires every word to match', () => {
    expect(ids(filterParks(parks, withState({ query: 'dog restrooms' })))).toEqual(['a']);
    expect(filterParks(parks, withState({ query: 'dog wifi' }))).toEqual([]);
  });

  it('does not crash on parks missing description and address', () => {
    expect(filterParks([park('x', 'Bare')], withState({ query: 'zzz' }))).toEqual([]);
  });

  it('uses AND for amenities', () => {
    expect(ids(filterParks(parks, withState({ amenities: ['dog-run'] })))).toEqual(['a', 'b']);
    expect(ids(filterParks(parks, withState({ amenities: ['dog-run', 'restrooms'] })))).toEqual([
      'a',
    ]);
  });

  it('combines text and amenities', () => {
    expect(filterParks(parks, withState({ query: 'beta', amenities: ['restrooms'] }))).toEqual([]);
  });
});

describe('sortParks', () => {
  const rated = [
    park('n', 'No Rating'),
    park('l', 'Low', { rating: 3, acreage: 10 }),
    park('h', 'High', { rating: 5, acreage: 1 }),
    park('t', 'Tie', { rating: 5, acreage: 1 }),
    park('m', 'Missing Size', { rating: 4 }),
  ];

  it('sorts by name by default without mutating the input', () => {
    const copy = [...rated];
    expect(ids(sortParks(rated, initialState()))).toEqual(['h', 'l', 'm', 'n', 't']);
    expect(rated).toEqual(copy);
  });

  it('sorts by rating high to low, missing last, ties by name', () => {
    expect(ids(sortParks(rated, withState({ sort: 'rating' })))).toEqual(['h', 't', 'm', 'l', 'n']);
  });

  it('sorts by size large to small, missing last, ties by name', () => {
    expect(ids(sortParks(rated, withState({ sort: 'acreage' })))).toEqual([
      'l',
      'h',
      't',
      'm',
      'n',
    ]);
  });

  it('falls back to name for distance, which is not offered', () => {
    expect(ids(sortParks(rated, withState({ sort: 'distance' })))).toEqual([
      'h',
      'l',
      'm',
      'n',
      't',
    ]);
  });
});
