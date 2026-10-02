import type { SelectSource } from './state/types';
import { env } from './env';

// Privacy rules: no free text, no coordinates, no raw query text. Only ids, slugs, counts and booleans.
export type SearchMode = 'filters' | 'ai' | 'both';

export type AnalyticsEvent =
  | { name: 'park_selected'; props: { park_id: string; source: SelectSource } }
  | { name: 'details_closed'; props: { park_id: string; method: 'button' | 'escape' | 'backdrop' } }
  | { name: 'directory_toggled'; props: { open: boolean } }
  | { name: 'filter_applied'; props: { filter: 'amenity' | 'sort' | 'text'; value: string } } // slug, sort key, or 'changed'
  | { name: 'reset_clicked'; props: Record<string, never> }
  | { name: 'location_requested'; props: { granted: boolean } }
  // AI events: typed for the AI ticket, not sent by any component yet.
  | { name: 'search_mode_changed'; props: { mode: SearchMode } }
  | { name: 'ai_answer_shown'; props: { abstained: boolean; citation_count: number } }
  | { name: 'ai_unavailable'; props: { reason: string } };

export const ANALYTICS_DISCLOSURE =
  'Anonymous usage counts (no cookies, no personal data) help improve this site.';

type Capture = (name: string, props: Record<string, unknown>) => void;
let capture: Capture | null = null;

// Option names checked against node_modules/@posthog/types/dist/posthog-config.d.ts (posthog-js 1.435).
export function privacyOptions(host: string) {
  return {
    api_host: host,
    persistence: 'memory' as const, // no cookies, no localStorage
    person_profiles: 'identified_only' as const, // we never call identify
    respect_dnt: true,
    disable_session_recording: true,
    capture_pageview: true,
    capture_pageleave: false,
    ip: false,
    autocapture: {
      dom_event_allowlist: ['click' as const],
      element_allowlist: ['button' as const, 'a' as const],
    },
  };
}

/** No-op without a key. Never throws: a blocked script or failed import just leaves analytics off. */
export async function initAnalytics(): Promise<void> {
  if (!env.posthogKey) return;
  try {
    const { default: posthog } = await import('posthog-js');
    posthog.init(env.posthogKey, privacyOptions(env.posthogHost));
    capture = (name, props) => posthog.capture(name, props);
  } catch {
    capture = null;
  }
}

/** No-op until init succeeded. Never throws. */
export function track(event: AnalyticsEvent): void {
  if (!capture) return;
  try {
    capture(event.name, event.props);
  } catch {
    // Analytics must never break the app.
  }
}
