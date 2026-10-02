export type SortKey = 'name' | 'rating' | 'acreage' | 'distance';
export type SelectSource = 'list' | 'map';

export interface AppState {
  selectedParkId: string | null;
  selectSource: SelectSource | null;
  /** DOM id of the element that opened the details; focus returns there on close. */
  returnFocusId: string | null;
  query: string;
  /** Selected amenity slugs. A park must have all of them (AND). */
  amenities: string[];
  sort: SortKey;
  origin: { lat: number; lng: number } | null;
  directoryOpen: boolean;
}

export type Action =
  | { type: 'selectPark'; id: string; source: SelectSource; returnFocusId: string }
  | { type: 'closeDetails' }
  | { type: 'setQuery'; query: string }
  | { type: 'toggleAmenity'; slug: string }
  | { type: 'setSort'; sort: SortKey }
  | { type: 'setOrigin'; origin: { lat: number; lng: number } | null }
  | { type: 'setDirectoryOpen'; open: boolean }
  | { type: 'reset' };
