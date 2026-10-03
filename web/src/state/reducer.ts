import type { Action, AppState } from './types';

export function initialState(directoryOpen = true): AppState {
  return {
    selectedParkId: null,
    selectSource: null,
    returnFocusId: null,
    query: '',
    amenities: [],
    sort: 'name',
    origin: null,
    directoryOpen,
    aiAvailable: false,
    mode: 'both',
    aiQuery: '',
    aiStatus: 'idle',
    aiResults: null,
    aiAnswer: null,
    aiError: null,
  };
}

function fallbackSort(state: AppState): AppState['sort'] {
  return state.sort === 'relevance' ? 'name' : state.sort;
}

function clearedAi(state: AppState): AppState {
  const { aiQuery, aiStatus, aiResults, aiAnswer, aiError } = initialState();
  return { ...state, aiQuery, aiStatus, aiResults, aiAnswer, aiError };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'selectPark':
      return {
        ...state,
        selectedParkId: action.id,
        selectSource: action.source,
        returnFocusId: action.returnFocusId,
      };
    case 'closeDetails':
      // returnFocusId stays so the details component can read it after closing.
      return { ...state, selectedParkId: null, selectSource: null };
    case 'setQuery':
      return { ...state, query: action.query };
    case 'toggleAmenity':
      return {
        ...state,
        amenities: state.amenities.includes(action.slug)
          ? state.amenities.filter((slug) => slug !== action.slug)
          : [...state.amenities, action.slug],
      };
    case 'setSort':
      return { ...state, sort: action.sort };
    case 'setOrigin':
      return {
        ...state,
        origin: action.origin,
        sort: action.origin === null && state.sort === 'distance' ? 'name' : state.sort,
      };
    case 'setDirectoryOpen':
      return { ...state, directoryOpen: action.open };
    case 'aiAvailable':
      return { ...state, aiAvailable: true };
    case 'setMode':
      // "Best match" only makes sense with AI results, so Filters mode drops it.
      return {
        ...state,
        mode: action.mode,
        sort: action.mode === 'filters' && state.sort === 'relevance' ? 'name' : state.sort,
      };
    case 'setAiQuery':
      return { ...state, aiQuery: action.query };
    case 'aiSearchStarted':
      return { ...state, aiStatus: 'loading', aiError: null, aiAnswer: null };
    case 'aiSearchFinished':
      return {
        ...state,
        aiStatus: action.error ? 'error' : 'done',
        aiResults: action.results,
        aiAnswer: action.answer,
        aiError: action.error,
        sort: action.results ? 'relevance' : fallbackSort(state),
      };
    case 'aiCleared':
      return { ...clearedAi(state), sort: fallbackSort(state) };
    case 'reset':
      // Keeps directoryOpen (layout) and the AI mode choice: those are not search settings.
      return {
        ...initialState(state.directoryOpen),
        aiAvailable: state.aiAvailable,
        mode: state.mode,
      };
  }
}
