import { initialState, reducer } from './reducer';

describe('reducer', () => {
  it('starts with nothing selected and defaults', () => {
    expect(initialState()).toMatchObject({
      selectedParkId: null,
      query: '',
      amenities: [],
      sort: 'name',
      directoryOpen: true,
    });
  });

  it('selects a park and remembers the trigger for focus return', () => {
    const state = reducer(initialState(), {
      type: 'selectPark',
      id: 'p1',
      source: 'map',
      returnFocusId: 'park-marker-p1',
    });
    expect(state).toMatchObject({
      selectedParkId: 'p1',
      selectSource: 'map',
      returnFocusId: 'park-marker-p1',
    });
  });

  it('closes details but keeps returnFocusId', () => {
    const open = reducer(initialState(), {
      type: 'selectPark',
      id: 'p1',
      source: 'list',
      returnFocusId: 'park-list-item-p1',
    });
    const closed = reducer(open, { type: 'closeDetails' });
    expect(closed.selectedParkId).toBeNull();
    expect(closed.selectSource).toBeNull();
    expect(closed.returnFocusId).toBe('park-list-item-p1');
  });

  it('sets the query and sort', () => {
    let state = reducer(initialState(), { type: 'setQuery', query: 'lake' });
    state = reducer(state, { type: 'setSort', sort: 'rating' });
    expect(state).toMatchObject({ query: 'lake', sort: 'rating' });
  });

  it('toggles amenities on and off', () => {
    let state = reducer(initialState(), { type: 'toggleAmenity', slug: 'trails' });
    state = reducer(state, { type: 'toggleAmenity', slug: 'lake' });
    expect(state.amenities).toEqual(['trails', 'lake']);
    state = reducer(state, { type: 'toggleAmenity', slug: 'trails' });
    expect(state.amenities).toEqual(['lake']);
  });

  it('falls back to name sort when the location is cleared while sorting by distance', () => {
    let state = reducer(initialState(), { type: 'setOrigin', origin: { lat: 1, lng: 2 } });
    state = reducer(state, { type: 'setSort', sort: 'distance' });
    expect(reducer(state, { type: 'setOrigin', origin: null }).sort).toBe('name');
    const rating = reducer(state, { type: 'setSort', sort: 'rating' });
    expect(reducer(rating, { type: 'setOrigin', origin: null }).sort).toBe('rating');
  });

  it('toggles the directory', () => {
    expect(reducer(initialState(), { type: 'setDirectoryOpen', open: false }).directoryOpen).toBe(
      false,
    );
  });

  it('reset clears search and selection but keeps directoryOpen', () => {
    let state = initialState(false);
    state = reducer(state, { type: 'setQuery', query: 'x' });
    state = reducer(state, { type: 'toggleAmenity', slug: 'trails' });
    state = reducer(state, { type: 'setSort', sort: 'rating' });
    state = reducer(state, {
      type: 'selectPark',
      id: 'p1',
      source: 'list',
      returnFocusId: 'a',
    });
    expect(reducer(state, { type: 'reset' })).toEqual(initialState(false));
  });
});

describe('reducer AI state', () => {
  const finished = {
    type: 'aiSearchFinished' as const,
    results: [{ parkId: 'a', score: 1, field: 'overview' as const, matchedText: 'm' }],
    answer: null,
    error: null,
  };

  it('starts with AI off and mode Both', () => {
    expect(initialState()).toMatchObject({ aiAvailable: false, mode: 'both', aiResults: null });
  });

  it('sorts by relevance when results arrive and drops it in Filters mode', () => {
    let state = reducer(initialState(), finished);
    expect(state.sort).toBe('relevance');
    state = reducer(state, { type: 'setMode', mode: 'filters' });
    expect(state.sort).toBe('name');
  });

  it('a failed search keeps no results', () => {
    const state = reducer(initialState(), { ...finished, results: null, error: 'bad' });
    expect(state).toMatchObject({
      aiStatus: 'error',
      aiResults: null,
      aiError: 'bad',
      sort: 'name',
    });
  });

  it('reset clears AI search but keeps availability and mode', () => {
    let state = reducer(initialState(), { type: 'aiAvailable' });
    state = reducer(state, { type: 'setMode', mode: 'ai' });
    state = reducer(state, { type: 'setAiQuery', query: 'lake' });
    state = reducer(state, finished);
    expect(reducer(state, { type: 'reset' })).toMatchObject({
      aiAvailable: true,
      mode: 'ai',
      aiQuery: '',
      aiResults: null,
    });
  });

  it('aiCleared clears only the AI search', () => {
    let state = reducer(initialState(), { type: 'setQuery', query: 'x' });
    state = reducer(state, finished);
    state = reducer(state, { type: 'aiCleared' });
    expect(state).toMatchObject({ query: 'x', aiResults: null, aiStatus: 'idle', sort: 'name' });
  });
});
