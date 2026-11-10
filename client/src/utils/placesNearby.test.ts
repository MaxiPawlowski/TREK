import { describe, expect, it } from 'vitest';
import {
  distanceFromAnchorM,
  hasCoords,
  placesWithinRadius,
  radiusFocusPoints,
  walkMinutes,
  type PlacesNearbyAnchor,
} from './placesNearby';

// Dotonbori, Osaka, and points roughly north of it (1e-3 deg lat ≈ 111 m).
const anchor: PlacesNearbyAnchor = { placeId: 1, name: 'Dotonbori', lat: 34.6687, lng: 135.5013, radiusM: 1000 };
const at = (id: number, dLatM: number, extra: Partial<{ lat: number | null; lng: number | null }> = {}) => ({
  id,
  name: `p${id}`,
  lat: anchor.lat + dLatM / 111_320,
  lng: anchor.lng,
  ...extra,
});

describe('hasCoords', () => {
  it('accepts finite numbers only', () => {
    expect(hasCoords({ lat: 1, lng: 2 })).toBe(true);
    expect(hasCoords({ lat: null, lng: 2 })).toBe(false);
    expect(hasCoords({ lat: Number.NaN, lng: 2 })).toBe(false);
    expect(hasCoords({})).toBe(false);
  });
});

describe('distanceFromAnchorM', () => {
  it('measures metres from the anchor', () => {
    expect(distanceFromAnchorM(at(2, 500), anchor)).toBeCloseTo(500, -1);
  });
  it('is null without coordinates', () => {
    expect(distanceFromAnchorM(at(2, 0, { lat: null }), anchor)).toBeNull();
  });
});

describe('walkMinutes', () => {
  it('allows for the detour at an easy pace', () => {
    expect(walkMinutes(1000)).toBe(15);
    expect(walkMinutes(0)).toBe(1);
  });
});

describe('placesWithinRadius', () => {
  it('keeps places inside the radius, nearest first, without the anchor', () => {
    const list = [at(1, 0), at(2, 900), at(3, 200), at(4, 1500), at(5, 0, { lng: null })];
    const got = placesWithinRadius(list, anchor);
    expect(got.map((x) => x.place.id)).toEqual([3, 2]);
    expect(got[0].distanceM).toBeCloseTo(200, -1);
  });
  it('keeps a place at the same spot as the anchor when it is a different place', () => {
    expect(placesWithinRadius([at(9, 0)], anchor).map((x) => x.place.id)).toEqual([9]);
  });
});

describe('radiusFocusPoints', () => {
  it('frames a box that holds the whole circle', () => {
    const [[s, w], [n, e]] = radiusFocusPoints(anchor);
    expect(s).toBeLessThan(anchor.lat);
    expect(n).toBeGreaterThan(anchor.lat);
    expect((n - s) * 111_320).toBeCloseTo(2000, -1);
    // Longitude degrees are shorter at 34.7°N, so the box is wider in degrees than tall.
    expect(e - w).toBeGreaterThan(n - s);
  });
});
