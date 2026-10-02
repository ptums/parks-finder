import type { SearchResult } from '../../../shared/api';
import type { AiAnswer } from '../ai/types';

export type SortKey = 'name' | 'rating' | 'acreage' | 'distance' | 'relevance';
export type SelectSource = 'list' | 'map' | 'ai_citation';
export type SearchMode = 'filters' | 'ai' | 'both';
export type AiStatus = 'idle' | 'loading' | 'done' | 'error';

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
  /** True only after the service answered {ai:true}. Without it the app is Filters-only. */
  aiAvailable: boolean;
  mode: SearchMode;
  aiQuery: string;
  aiStatus: AiStatus;
  /** null = no AI search has run (or it failed); [] = the AI found nothing. */
  aiResults: SearchResult[] | null;
  aiAnswer: AiAnswer | null;
  /** The message shown for the last AI failure. */
  aiError: string | null;
}

export type Action =
  | { type: 'selectPark'; id: string; source: SelectSource; returnFocusId: string }
  | { type: 'closeDetails' }
  | { type: 'setQuery'; query: string }
  | { type: 'toggleAmenity'; slug: string }
  | { type: 'setSort'; sort: SortKey }
  | { type: 'setOrigin'; origin: { lat: number; lng: number } | null }
  | { type: 'setDirectoryOpen'; open: boolean }
  | { type: 'aiAvailable' }
  | { type: 'setMode'; mode: SearchMode }
  | { type: 'setAiQuery'; query: string }
  | { type: 'aiSearchStarted' }
  | {
      type: 'aiSearchFinished';
      results: SearchResult[] | null;
      answer: AiAnswer | null;
      error: string | null;
    }
  | { type: 'aiCleared' }
  | { type: 'reset' };
