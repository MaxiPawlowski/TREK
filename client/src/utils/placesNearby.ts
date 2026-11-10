import { haversineKm } from './geo';

/**
 * "Near this place": the anchor the places list and the plan map measure from.
 *
 * `placeId` is the place it was opened from; it is kept so the anchor follows the
 * place if its pin moves, and so the list can leave the anchor itself out. The
 * coordinates are copied in as well, which keeps the radius working for a place
 * that is filtered out of the pool (an assigned stay, a tour stop).
 */
export interface PlacesNearbyAnchor {
  placeId: number | null;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
}

/** The radii the picker offers, in metres. 1 km is roughly a fifteen-minute walk. */
export const NEARBY_RADII_M = [500, 1000, 2000, 5000] as const;
export const DEFAULT_NEARBY_RADIUS_M = 1000;

/**
 * Walking takes a detour over the straight line; 1.25 is the usual factor for a city grid,
 * and 5 km/h an unhurried pace. An estimate, which is why the label says "approx.".
 */
const DETOUR_FACTOR = 1.25;
const WALK_KMH = 5;

interface Located {
  lat?: number | null;
  lng?: number | null;
}

export function hasCoords(p: Located): p is { lat: number; lng: number } {
  return typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng);
}

/** Straight-line distance from the anchor, in metres; null for a place without coordinates. */
export function distanceFromAnchorM(place: Located, anchor: Pick<PlacesNearbyAnchor, 'lat' | 'lng'>): number | null {
  if (!hasCoords(place)) return null;
  return haversineKm(anchor, place) * 1000;
}

export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.round((((distanceM / 1000) * DETOUR_FACTOR) / WALK_KMH) * 60));
}

/**
 * The places inside the radius, nearest first, each with its distance. The anchor's own
 * place is left out: it is the centre, shown on its own above the list.
 */
export function placesWithinRadius<P extends Located & { id: number }>(
  places: P[],
  anchor: PlacesNearbyAnchor
): Array<{ place: P; distanceM: number }> {
  const out: Array<{ place: P; distanceM: number }> = [];
  for (const place of places) {
    if (place.id === anchor.placeId) continue;
    const d = distanceFromAnchorM(place, anchor);
    if (d !== null && d <= anchor.radiusM) out.push({ place, distanceM: d });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * The circle's bounding box as two corner points, `[lat, lng]`, for the map's fit-to-points
 * camera. Latitude degrees are ~111.32 km everywhere; longitude degrees shrink with cos(lat).
 */
export function radiusFocusPoints(anchor: Pick<PlacesNearbyAnchor, 'lat' | 'lng' | 'radiusM'>): [number, number][] {
  const dLat = anchor.radiusM / 111_320;
  const dLng = anchor.radiusM / (111_320 * Math.max(0.01, Math.cos((anchor.lat * Math.PI) / 180)));
  return [
    [anchor.lat - dLat, anchor.lng - dLng],
    [anchor.lat + dLat, anchor.lng + dLng],
  ];
}
