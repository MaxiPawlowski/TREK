import { useCallback, useMemo, useState } from 'react';
import { useTripStore } from '../../store/tripStore';
import type { RouteSegment } from '../../types';
import { legFocusPoints, nameAt, sliceLeg, type LatLngTuple } from './routeLegs';

/** One leg of the day as the stepper shows it. */
export interface DayLeg {
  fromName: string | null;
  toName: string | null;
  mode?: string;
  durationText?: string;
  distanceText: string;
  hotelBookend?: 'morning' | 'evening';
}

export interface RouteLegFocus {
  legs: DayLeg[];
  /** The leg on show, or null while the whole day is drawn. */
  index: number | null;
  open: () => void;
  close: () => void;
  prev: () => void;
  next: () => void;
  /** What the map draws and frames for the leg on show. */
  overlay: { coords: LatLngTuple[]; focusPoints: LatLngTuple[] } | null;
}

interface Args {
  route: LatLngTuple[][] | null | undefined;
  segments: RouteSegment[] | null | undefined;
  /** The day on screen: another day starts from the whole route again. */
  dayId: number | null | undefined;
  /** False hides the stepper altogether (the overview, the road trip stage). */
  enabled: boolean;
}

/**
 * "Leg by leg" over the day's route, shared by the desktop plan map and the phone map.
 *
 * A busy day draws as one tangle of line on the map. Stepping through it one leg at a
 * time lights that leg, frames the camera on it and names its two ends, so the order
 * the day is walked in can be read off the map. Kept per day: picking another day goes
 * back to the whole route, since leg 3 of Wednesday says nothing about Thursday.
 */
export function useRouteLegFocus({ route, segments, dayId, enabled }: Args): RouteLegFocus {
  const places = useTripStore((s) => s.places);
  const [state, setState] = useState<{ dayId: number | null | undefined; index: number | null }>({
    dayId,
    index: null,
  });
  // A new day, or the stepper switched off from outside, drops back to the whole day.
  const current = state.dayId === dayId && enabled ? state.index : null;

  const legs: DayLeg[] = useMemo(
    () =>
      (segments ?? []).map((seg) => ({
        fromName: nameAt(seg.from, places),
        toName: nameAt(seg.to, places),
        mode: seg.mode,
        durationText: seg.durationText ?? (seg.mode === 'walking' ? seg.walkingText : seg.drivingText),
        distanceText: seg.distanceText,
        hotelBookend: seg.hotelBookend,
      })),
    [segments, places]
  );

  const index = current != null && current < legs.length ? current : null;

  const overlay = useMemo(() => {
    if (index == null || !segments?.[index]) return null;
    const coords = sliceLeg(route, segments[index]);
    return { coords, focusPoints: legFocusPoints(coords) };
  }, [index, route, segments]);

  const go = useCallback((i: number | null) => setState({ dayId, index: i }), [dayId]);
  const count = legs.length;
  return {
    legs: enabled ? legs : [],
    index,
    open: useCallback(() => {
      if (count) go(0);
    }, [count, go]),
    close: useCallback(() => go(null), [go]),
    prev: useCallback(() => go(index == null ? 0 : Math.max(0, index - 1)), [go, index]),
    next: useCallback(() => go(index == null ? 0 : Math.min(count - 1, index + 1)), [go, index, count]),
    overlay,
  };
}
