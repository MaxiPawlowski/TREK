import { useMemo } from 'react';
import { radiusFocusPoints } from '../../utils/placesNearby';
import type { NearbyCircle } from '../Map/mapViewContract';
import { usePlacesNearby } from './usePlacesNearby';

/**
 * What the plan map draws for "near this place": the circle, and the two corners the
 * camera frames so the whole radius is on screen. Both keep their identity while the
 * centre and the radius stay put, so a re-render does not move the camera.
 */
export function useNearbyMapOverlay(): { circle: NearbyCircle; focusPoints: [number, number][] } | null {
  const { nearby } = usePlacesNearby();
  const lat = nearby?.lat;
  const lng = nearby?.lng;
  const radiusM = nearby?.radiusM;
  return useMemo(() => {
    if (lat == null || lng == null || radiusM == null) return null;
    return { circle: { lat, lng, radiusM }, focusPoints: radiusFocusPoints({ lat, lng, radiusM }) };
  }, [lat, lng, radiusM]);
}
