import { initialState } from '../state/reducer';
import { filterParks } from './filterParks';
import { sortParks } from './sortParks';

const parks = [
  { id: 'b', name: 'Beta', amenities: [], images: [] },
  { id: 'a', name: 'Alpha', amenities: [], images: [] },
];

describe('search stubs', () => {
  it('filterParks passes everything through for now', () => {
    expect(filterParks(parks, initialState())).toBe(parks);
  });

  it('sortParks sorts by name without mutating the input', () => {
    expect(sortParks(parks, initialState()).map((p) => p.id)).toEqual(['a', 'b']);
    expect(parks[0]?.id).toBe('b');
  });
});
