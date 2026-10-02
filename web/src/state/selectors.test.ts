import type { Park } from '../../../shared/parks';
import { initialState } from './reducer';
import { selectedPark, visibleParks } from './selectors';

const park = (id: string, name: string): Park => ({ id, name, amenities: [], images: [] });
const parks = [park('b', 'Beta'), park('a', 'Alpha')];

describe('selectors', () => {
  it('visibleParks returns parks sorted by name', () => {
    expect(visibleParks(parks, initialState()).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('selectedPark finds the selected park, or undefined', () => {
    expect(selectedPark(parks, { ...initialState(), selectedParkId: 'b' })?.name).toBe('Beta');
    expect(selectedPark(parks, initialState())).toBeUndefined();
  });
});
