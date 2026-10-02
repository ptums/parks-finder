import type { Point } from './distance';

/**
 * Asks the browser for the current position. Resolves to null when location is
 * unsupported, denied, unavailable or too slow. Coordinates are returned to the caller
 * only: never stored, sent or logged.
 */
export function getPosition(): Promise<Point | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => resolve(null),
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}
