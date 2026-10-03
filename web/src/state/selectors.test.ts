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

describe('visibleParks with AI results', () => {
  const results = [
    { parkId: 'a', score: 2, field: 'overview' as const, matchedText: 'x' },
    { parkId: 'b', score: 1, field: 'overview' as const, matchedText: 'y' },
  ];
  const ai = { ...initialState(), aiAvailable: true, aiResults: results.slice().reverse() };

  it('ignores AI results while the service has not said ai:true', () => {
    expect(visibleParks(parks, { ...ai, aiAvailable: false }).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('Filters mode ignores AI results', () => {
    expect(visibleParks([...parks, park('c', 'Gamma')], { ...ai, mode: 'filters' })).toHaveLength(
      3,
    );
  });

  it('AI mode shows only AI results, ignoring standard filters, best match first', () => {
    const state = { ...ai, mode: 'ai' as const, query: 'zzz', sort: 'relevance' as const };
    expect(visibleParks(parks, state).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('Both mode intersects AI results with standard filters', () => {
    const state = { ...ai, mode: 'both' as const, query: 'alpha' };
    expect(visibleParks(parks, state).map((p) => p.id)).toEqual(['a']);
  });
});
