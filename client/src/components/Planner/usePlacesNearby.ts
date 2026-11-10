import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTripStore } from '../../store/tripStore';
import {
  DEFAULT_NEARBY_RADIUS_M,
  distanceFromAnchorM,
  hasCoords,
  placesWithinRadius,
  type PlacesNearbyAnchor,
} from '../../utils/placesNearby';

interface Anchorable {
  id: number;
  name: string;
  lat?: number | null;
  lng?: number | null;
}

/**
 * "Near this place", shared by the desktop places column and the phone's places browser.
 *
 * The anchor lives in the trip store so the list, the map markers and the radius circle
 * all read one value. The anchor follows its place: if the pin is moved or renamed while
 * the radius is open, the centre and the title move with it.
 */
export function usePlacesNearby() {
  const { stored, setStored, anchorPlace } = useTripStore(
    useShallow((s) => ({
      stored: s.placesNearby,
      setStored: s.setPlacesNearby,
      anchorPlace: s.placesNearby?.placeId != null ? s.places.find((p) => p.id === s.placesNearby!.placeId) : undefined,
    }))
  );

  const nearby: PlacesNearbyAnchor | null = useMemo(() => {
    if (!stored) return null;
    if (anchorPlace && hasCoords(anchorPlace))
      return { ...stored, name: anchorPlace.name, lat: anchorPlace.lat, lng: anchorPlace.lng };
    return stored;
  }, [stored, anchorPlace]);

  /** Opens the radius around a place, keeping the radius last picked. A place without coordinates has no "near". */
  const openNearby = useCallback(
    (place: Anchorable) => {
      if (!hasCoords(place)) return;
      const radiusM = useTripStore.getState().placesNearby?.radiusM ?? DEFAULT_NEARBY_RADIUS_M;
      setStored({ placeId: place.id, name: place.name, lat: place.lat, lng: place.lng, radiusM });
    },
    [setStored]
  );

  const setNearbyRadius = useCallback(
    (radiusM: number) => {
      const current = useTripStore.getState().placesNearby;
      if (current) setStored({ ...current, radiusM });
    },
    [setStored]
  );

  const closeNearby = useCallback(() => setStored(null), [setStored]);

  /** Narrows a list to the radius, nearest first; the list unchanged while "near" is off. */
  const applyNearby = useCallback(
    <P extends Anchorable>(list: P[]): P[] => (nearby ? placesWithinRadius(list, nearby).map((x) => x.place) : list),
    [nearby]
  );

  /** Metres from the centre, for the row badge; null while "near" is off or the place has no pin. */
  const distanceOf = useCallback(
    (place: Anchorable): number | null => (nearby ? distanceFromAnchorM(place, nearby) : null),
    [nearby]
  );

  return { nearby, openNearby, setNearbyRadius, closeNearby, applyNearby, distanceOf };
}

export type PlacesNearbyState = ReturnType<typeof usePlacesNearby>;
