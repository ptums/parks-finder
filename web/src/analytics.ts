import type { SelectSource } from './state/types';

// Typed no-op. Analytics is cut for now; callers can still use track() safely.
export type AnalyticsEvent =
  | { name: 'park_selected'; props: { park_id: string; source: SelectSource } }
  | { name: 'details_closed'; props: { park_id: string } }
  | { name: 'filter_applied'; props: { filter: 'amenity' | 'sort' | 'text'; value: string } }
  | { name: 'reset_clicked'; props: Record<string, never> };

export function track(event: AnalyticsEvent): void {
  void event;
}
