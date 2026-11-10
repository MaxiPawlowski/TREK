import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { Circle, CircleMarker, Marker, useMap } from 'react-leaflet';
import type { GeoPosition, TrackingMode } from '../../hooks/useGeolocation';
import { frameLng } from '../../utils/lngFrame';
import { useLngFrame } from './lngFrameContext';

// Live-location rendering inside the Leaflet map. Subscribes via the
// shared useGeolocation hook so the Leaflet and Mapbox variants behave
// identically. Heading is shown as a rotated conic SVG when available.
// Its own module so MapView stays inside its size budget.
export function LeafletLocationLayer({ position: fix, mode }: { position: GeoPosition | null; mode: TrackingMode }) {
  const map = useMap();
  const frame = useLngFrame();
  // Drawn on the trip's world copy (#2975); every field but the longitude is the fix itself.
  const position = useMemo(() => (fix && frame ? { ...fix, lng: frameLng(frame, fix.lng) } : fix), [fix, frame]);

  // When the user is in follow mode, keep the map centred on the dot.
  // setView (no animation) is what Google Maps does during navigation —
  // it feels responsive and avoids animation jitter at walking speed.
  useEffect(() => {
    if (mode !== 'follow' || !position) return;
    try {
      map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 0.35 });
    } catch {
      /* noop */
    }
  }, [position, mode, map]);

  // Once, when the user first acquires a fix in "show" mode, pan to it so
  // they don't have to scroll the map. Subsequent fixes only move the dot.
  const centeredRef = useRef(false);
  useEffect(() => {
    if (mode === 'off') {
      centeredRef.current = false;
      return;
    }
    if (!position || centeredRef.current) return;
    try {
      map.setView([position.lat, position.lng], Math.max(map.getZoom(), 15));
    } catch {
      /* noop */
    }
    centeredRef.current = true;
  }, [position, mode, map]);

  if (!position) return null;

  const headingIcon =
    position.heading === null || Number.isNaN(position.heading)
      ? null
      : L.divIcon({
          className: '',
          iconSize: [60, 60],
          iconAnchor: [30, 30],
          html: `<div style="
      width:60px;height:60px;
      transform:rotate(${position.heading}deg);transition:transform 120ms ease-out;
      background:conic-gradient(from -30deg, rgba(59,130,246,0) 0deg, rgba(59,130,246,0.35) 15deg, rgba(59,130,246,0) 60deg, rgba(59,130,246,0) 360deg);
      border-radius:50%;
      -webkit-mask:radial-gradient(circle, transparent 12px, black 13px);
      mask:radial-gradient(circle, transparent 12px, black 13px);
      pointer-events:none;
    "></div>`,
        });

  return (
    <>
      {position.accuracy < 500 && (
        <Circle
          center={[position.lat, position.lng]}
          radius={position.accuracy}
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12, weight: 1, opacity: 0.35 }}
          interactive={false}
        />
      )}
      {headingIcon && (
        <Marker position={[position.lat, position.lng]} icon={headingIcon} interactive={false} zIndexOffset={900} />
      )}
      <CircleMarker
        center={[position.lat, position.lng]}
        radius={8}
        pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
        interactive={false}
      />
    </>
  );
}
