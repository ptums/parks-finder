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
  };
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
    case 'reset':
      // Keeps directoryOpen: that is a layout choice, not a search setting.
      return { ...initialState(state.directoryOpen) };
  }
}
