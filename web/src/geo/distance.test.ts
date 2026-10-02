import { distanceKm } from './distance';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 40, lng: -73 }, { lat: 40, lng: -73 })).toBe(0);
  });

  it('matches a known distance (Prospect Park to Central Park is about 13.6 km)', () => {
    const km = distanceKm({ lat: 40.6602, lng: -73.969 }, { lat: 40.7829, lng: -73.9654 });
    expect(km).toBeGreaterThan(13);
    expect(km).toBeLessThan(14.5);
  });

  it('is symmetric', () => {
    const a = { lat: 10, lng: 20 };
    const b = { lat: -30, lng: 50 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 9);
  });

  it('one degree of latitude is about 111 km', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.19, 1);
  });
});
