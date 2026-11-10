import { Circle } from 'react-leaflet';
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
