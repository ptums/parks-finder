import type { Park } from '../../../../shared/parks';

export type ParkWithCoords = Park & { coords: { lat: number; lng: number } };

/** Only parks with valid coordinates can be drawn on the map. */
export function parksWithCoords(parks: Park[]): ParkWithCoords[] {
  return parks.filter((park): park is ParkWithCoords => park.coords !== undefined);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Leaflet animation switches: all off when the user asks for reduced motion. */
export function motionOptions(reduced: boolean) {
  return {
    zoomAnimation: !reduced,
    fadeAnimation: !reduced,
    markerZoomAnimation: !reduced,
  };
}

export const MARKER_SELECTED_CLASS = 'park-marker--selected';
export const MAP_LABEL = 'Map of parks. Use arrow keys to pan.';
