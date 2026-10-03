import type { Park } from '../../../shared/parks';
import { AMENITY_LABELS, amenityLabel } from '../../../shared/amenities';
import { PARKS } from '../data/parks';
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

describe('whole-word text search', () => {
  const keywords = [
    'Waterfront',
    'Fishing',
    'Kayak launch',
    'Picnic areas',
    'Parking',
    'Event lawn',
    'Wi-Fi',
    'Restrooms',
    'Food vendors',
    'Accessible paths',
    'Playground',
    'Dog run',
    'Trails',
    'Bike path',
    'Lake',
    'Skate park',
    'Lighting',
    'Water fountain',
    'Wildlife viewing',
  ];
  const slugFor = (keyword: string) =>
    Object.keys(AMENITY_LABELS).find((slug) => amenityLabel(slug) === keyword) as string;

  it.each(keywords)('"%s" returns exactly the parks that list that amenity', (keyword) => {
    const expected = PARKS.filter((p) => p.amenities.includes(slugFor(keyword))).map((p) => p.id);
    expect(expected.length).toBeGreaterThan(0);
    expect(ids(filterParks(PARKS, withState({ query: keyword })))).toEqual(expected);
  });

  it('"Lake" excludes Lakeshore Point', () => {
    const names = filterParks(PARKS, withState({ query: 'Lake' })).map((p) => p.name);
    expect(names).not.toContain('Lakeshore Point');
  });

  it('tolerates a plural: "trail" matches "Trails"', () => {
    expect(filterParks(PARKS, withState({ query: 'trail' }))).toEqual(
      filterParks(PARKS, withState({ query: 'Trails' })),
    );
    expect(filterParks(PARKS, withState({ query: 'trail' })).length).toBeGreaterThan(0);
  });

  it('treats "WiFi" and "wifi" like "Wi-Fi"', () => {
    const wifi = filterParks(PARKS, withState({ query: 'Wi-Fi' }));
    expect(wifi.length).toBeGreaterThan(0);
    expect(filterParks(PARKS, withState({ query: 'WiFi' }))).toEqual(wifi);
    expect(filterParks(PARKS, withState({ query: 'wifi' }))).toEqual(wifi);
  });

  it('no longer matches partial words', () => {
    expect(filterParks(parks, withState({ query: 'rest' }))).toEqual([]);
  });

  it('needs every word of a multi-word query', () => {
    expect(ids(filterParks(parks, withState({ query: 'quiet restrooms' })))).toEqual(['a']);
    expect(filterParks(parks, withState({ query: 'quiet wifi' }))).toEqual([]);
  });

  it('returns everything for an empty query', () => {
    expect(filterParks(PARKS, withState({ query: '' }))).toBe(PARKS);
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

  it('falls back to name for distance when there is no origin', () => {
    expect(ids(sortParks(rated, withState({ sort: 'distance' })))).toEqual([
      'h',
      'l',
      'm',
      'n',
      't',
    ]);
  });

  describe('by distance', () => {
    const origin = { lat: 40, lng: -73 };
    const placed = [
      park('far', 'Far', { coords: { lat: 41, lng: -73 } }),
      park('none', 'No Coords'),
      park('near', 'Near', { coords: { lat: 40.1, lng: -73 } }),
      park('tie-b', 'Bravo', { coords: { lat: 40.5, lng: -73 } }),
      park('tie-a', 'Alpha', { coords: { lat: 40.5, lng: -73 } }),
    ];

    it('sorts nearest first, ties by name, parks without coordinates last', () => {
      const sorted = sortParks(placed, withState({ sort: 'distance', origin }));
      expect(ids(sorted)).toEqual(['near', 'tie-a', 'tie-b', 'far', 'none']);
    });
  });
});
