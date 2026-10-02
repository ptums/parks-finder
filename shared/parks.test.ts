import { loadParks, normalizePark } from './parks';
import sample from '../db/parks.sample.json';

const full = {
  id: 'p1',
  name: ' Park One ',
  description: 'Nice',
  location: { lat: 40.1, lng: -73.9, address: 'Brooklyn' },
  amenities: ['trails', ' ', 'lake'],
  hours: '6 AM - 1 AM',
  images: ['a.jpg', ''],
  acreage: 10,
  rating: 4.5,
};

describe('normalizePark', () => {
  it('cleans a full record', () => {
    expect(normalizePark(full)).toEqual({
      id: 'p1',
      name: 'Park One',
      description: 'Nice',
      address: 'Brooklyn',
      coords: { lat: 40.1, lng: -73.9 },
      amenities: ['trails', 'lake'],
      hours: '6 AM - 1 AM',
      images: ['a.jpg'],
      acreage: 10,
      rating: 4.5,
    });
  });

  it('keeps hours verbatim', () => {
    expect(normalizePark({ ...full, hours: 'Dawn to dusk (see sign)' })?.hours).toBe(
      'Dawn to dusk (see sign)',
    );
  });

  it('returns only id, name and empty arrays when everything else is missing', () => {
    expect(normalizePark({ id: 'x', name: 'X' })).toEqual({
      id: 'x',
      name: 'X',
      description: undefined,
      address: undefined,
      coords: undefined,
      amenities: [],
      hours: undefined,
      images: [],
      acreage: undefined,
      rating: undefined,
    });
  });

  it('returns null without id or name, or for non-objects', () => {
    expect(normalizePark({ name: 'X' })).toBeNull();
    expect(normalizePark({ id: 'x' })).toBeNull();
    expect(normalizePark({ id: '  ', name: 'X' })).toBeNull();
    expect(normalizePark(null)).toBeNull();
    expect(normalizePark('nope')).toBeNull();
  });

  it('drops invalid coordinates, rating and acreage instead of defaulting', () => {
    const bad = normalizePark({
      ...full,
      location: { lat: 95, lng: -73.9, address: '' },
      rating: 7,
      acreage: -3,
    });
    expect(bad?.coords).toBeUndefined();
    expect(bad?.address).toBeUndefined();
    expect(bad?.rating).toBeUndefined();
    expect(bad?.acreage).toBeUndefined();
    expect(normalizePark({ ...full, location: { lat: 1, lng: 181 } })?.coords).toBeUndefined();
    expect(normalizePark({ ...full, location: { lat: 'x', lng: 1 } })?.coords).toBeUndefined();
    expect(normalizePark({ ...full, rating: NaN, acreage: Infinity })?.rating).toBeUndefined();
  });

  it('tolerates wrong types and a null location', () => {
    const p = normalizePark({ ...full, location: null, amenities: 'trails', images: 5, hours: 9 });
    expect(p?.coords).toBeUndefined();
    expect(p?.amenities).toEqual([]);
    expect(p?.images).toEqual([]);
    expect(p?.hours).toBeUndefined();
    expect(normalizePark({ ...full, location: 'Brooklyn' })?.coords).toBeUndefined();
  });

  it('keeps a rating of 0', () => {
    expect(normalizePark({ ...full, rating: 0 })?.rating).toBe(0);
  });
});

describe('loadParks', () => {
  it('skips bad records and reports warnings', () => {
    const result = loadParks([full, { name: 'no id' }]);
    expect(result.parks).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });

  it('throws when the data is not an array', () => {
    expect(() => loadParks({})).toThrow('array');
  });

  it('loads every record in db/parks.sample.json', () => {
    const result = loadParks(sample);
    expect(result.parks).toHaveLength(sample.length);
    expect(result.warnings).toEqual([]);
  });
});
