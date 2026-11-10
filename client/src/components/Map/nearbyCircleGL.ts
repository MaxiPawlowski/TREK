import type { NearbyCircle } from './mapViewContract';

/**
 * The "near this place" radius on the GL renderers (Mapbox GL and MapLibre GL).
 *
 * GL has no metric circle primitive, so the circle is a 64-point polygon on a GeoJSON
 * source, a soft fill under a dashed outline. Kept out of MapViewGL, which is past its
 * size budget; the renderer only calls `syncNearbyCircle` when the circle changes.
 */
const SOURCE = 'trek-nearby-circle';
const FILL = 'trek-nearby-circle-fill';
const LINE = 'trek-nearby-circle-line';
const STEPS = 64;

/** The smallest slice of the GL map API this needs, shared by mapbox-gl and maplibre-gl. */
export interface GLMapLike {
  getSource(id: string): unknown;
  addSource(id: string, source: unknown): unknown;
  getLayer(id: string): unknown;
  addLayer(layer: unknown, beforeId?: string): unknown;
  isStyleLoaded(): boolean | void;
  on(type: string, listener: () => void): unknown;
}

const latest = new WeakMap<GLMapLike, NearbyCircle | null>();
const listening = new WeakSet<GLMapLike>();

function ring(c: NearbyCircle): [number, number][] {
  const out: [number, number][] = [];
  const dLat = c.radiusM / 111_320;
  const dLng = c.radiusM / (111_320 * Math.max(0.01, Math.cos((c.lat * Math.PI) / 180)));
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * Math.PI * 2;
    out.push([c.lng + dLng * Math.cos(a), c.lat + dLat * Math.sin(a)]);
  }
  return out;
}

function data(c: NearbyCircle | null) {
  return {
    type: 'FeatureCollection',
    features: c ? [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring(c)] } }] : [],
  };
}

/** The theme's accent as a literal colour: GL paint properties cannot read CSS variables. */
function accent(): string {
  if (typeof document === 'undefined') return '#2563eb';
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2563eb';
}

function apply(map: GLMapLike) {
  const circle = latest.get(map) ?? null;
  const src = map.getSource(SOURCE) as { setData?: (d: unknown) => void } | undefined;
  if (src?.setData) {
    src.setData(data(circle));
    return;
  }
  if (!circle) return;
  const color = accent();
  map.addSource(SOURCE, { type: 'geojson', data: data(circle) });
  if (!map.getLayer(FILL))
    map.addLayer({ id: FILL, type: 'fill', source: SOURCE, paint: { 'fill-color': color, 'fill-opacity': 0.08 } });
  if (!map.getLayer(LINE)) {
    map.addLayer({
      id: LINE,
      type: 'line',
      source: SOURCE,
      paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.75, 'line-dasharray': [2, 2] },
    });
  }
}

/**
 * Draws, moves or clears the radius. Safe to call before the style is ready: the circle
 * is remembered and drawn on the next style load, which also brings it back after a
 * basemap switch wipes the custom layers.
 */
export function syncNearbyCircle(map: GLMapLike, circle: NearbyCircle | null | undefined) {
  latest.set(map, circle ?? null);
  if (!listening.has(map)) {
    listening.add(map);
    map.on('style.load', () => {
      try {
        apply(map);
      } catch {
        /* the next sync draws it */
      }
    });
  }
  if (!map.isStyleLoaded()) return;
  try {
    apply(map);
  } catch {
    /* the style is mid-swap; style.load redraws it */
  }
}
