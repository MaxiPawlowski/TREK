import { Circle, CircleMarker, Polyline } from 'react-leaflet';
import type { NearbyCircle } from './mapViewContract';

/** The theme's accent as a literal colour, for Leaflet's path options. */
function accent(): string {
  if (typeof document === 'undefined') return 'currentColor';
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || 'currentColor';
}

/**
 * The "near this place" radius on the Leaflet renderer: a soft fill under a dashed
 * outline, not clickable, so the markers inside it keep their own clicks. Its own module
 * because MapView is past its size budget.
 */
export function NearbyCircleLeaflet({ circle }: { circle: NearbyCircle | null | undefined }) {
  if (!circle) return null;
  const color = accent();
  return (
    <Circle
      center={[circle.lat, circle.lng]}
      radius={circle.radiusM}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 2, opacity: 0.75, dashArray: '6 6' }}
      interactive={false}
    />
  );
}

/** A theme token's value, for Leaflet's path options, which take no CSS variables. */
function cssToken(name: string): string {
  if (typeof document === 'undefined') return 'currentColor';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'currentColor';
}

/** The theme's warning tone (amber), which stands out against the blue day route. */
function legColor(): string {
  if (typeof document === 'undefined') return 'currentColor';
  return getComputedStyle(document.documentElement).getPropertyValue('--warning').trim() || 'currentColor';
}

/**
 * One leg of the day lit over the route ("leg by leg"): a thick amber line on a white
 * casing, a hollow dot where the leg starts and a full one where it ends, so the
 * direction reads without arrows. Not clickable: the markers under it keep their taps.
 */
export function RouteFocusLeaflet({ coords }: { coords: [number, number][] | null | undefined }) {
  if (!coords || coords.length < 2) return null;
  const color = legColor();
  const casing = cssToken('--bg-primary');
  const end = coords[coords.length - 1];
  return (
    <>
      <Polyline positions={coords} pathOptions={{ color: casing, weight: 11, opacity: 0.95 }} interactive={false} />
      <Polyline positions={coords} pathOptions={{ color, weight: 7, opacity: 1 }} interactive={false} />
      <CircleMarker
        center={coords[0]}
        radius={7}
        pathOptions={{ color, weight: 3, fillColor: casing, fillOpacity: 1 }}
        interactive={false}
      />
      <CircleMarker
        center={end}
        radius={7}
        pathOptions={{ color: casing, weight: 3, fillColor: color, fillOpacity: 1 }}
        interactive={false}
      />
    </>
  );
}
