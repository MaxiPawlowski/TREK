import { useEffect } from 'react';
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

// ── One leg of the day ("leg by leg") ─────────────────────────────────────────
const LEG_SOURCE = 'trek-route-focus';
const LEG_CASING = 'trek-route-focus-casing';
const LEG_LINE = 'trek-route-focus-line';
const LEG_ENDS = 'trek-route-focus-ends';
const latestLeg = new WeakMap<GLMapLike, [number, number][] | null>();
const listeningLeg = new WeakSet<GLMapLike>();

/** The theme's warning tone (amber), which stands out against the blue day route. */
function legColor(): string {
  if (typeof document === 'undefined') return '#d97706';
  return getComputedStyle(document.documentElement).getPropertyValue('--warning').trim() || '#d97706';
}

function legData(coords: [number, number][] | null) {
  if (!coords || coords.length < 2) return { type: 'FeatureCollection', features: [] };
  const line = coords.map(([lat, lng]) => [lng, lat]);
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { kind: 'line' }, geometry: { type: 'LineString', coordinates: line } },
      { type: 'Feature', properties: { kind: 'start' }, geometry: { type: 'Point', coordinates: line[0] } },
      { type: 'Feature', properties: { kind: 'end' }, geometry: { type: 'Point', coordinates: line[line.length - 1] } },
    ],
  };
}

function applyLeg(map: GLMapLike) {
  const coords = latestLeg.get(map) ?? null;
  const src = map.getSource(LEG_SOURCE) as { setData?: (d: unknown) => void } | undefined;
  if (src?.setData) {
    src.setData(legData(coords));
    return;
  }
  if (!coords) return;
  const color = legColor();
  map.addSource(LEG_SOURCE, { type: 'geojson', data: legData(coords) });
  const isLine = ['==', ['get', 'kind'], 'line'];
  if (!map.getLayer(LEG_CASING)) {
    map.addLayer({
      id: LEG_CASING,
      type: 'line',
      source: LEG_SOURCE,
      filter: isLine,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#fff', 'line-width': 11, 'line-opacity': 0.95 },
    });
  }
  if (!map.getLayer(LEG_LINE)) {
    map.addLayer({
      id: LEG_LINE,
      type: 'line',
      source: LEG_SOURCE,
      filter: isLine,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': color, 'line-width': 7 },
    });
  }
  if (!map.getLayer(LEG_ENDS)) {
    // Hollow where the leg starts, full where it ends: the direction reads without arrows.
    map.addLayer({
      id: LEG_ENDS,
      type: 'circle',
      source: LEG_SOURCE,
      filter: ['!=', ['get', 'kind'], 'line'],
      paint: {
        'circle-radius': 7,
        'circle-stroke-width': 3,
        'circle-color': ['case', ['==', ['get', 'kind'], 'start'], '#fff', color],
        'circle-stroke-color': ['case', ['==', ['get', 'kind'], 'start'], color, '#fff'],
      },
    });
  }
}

/** Draws, moves or clears the lit leg, surviving a basemap switch like the radius does. */
export function syncRouteFocus(map: GLMapLike, coords: [number, number][] | null | undefined) {
  latestLeg.set(map, coords ?? null);
  if (!listeningLeg.has(map)) {
    listeningLeg.add(map);
    map.on('style.load', () => {
      try {
        applyLeg(map);
      } catch {
        /* the next sync draws it */
      }
    });
  }
  if (!map.isStyleLoaded()) return;
  try {
    applyLeg(map);
  } catch {
    /* the style is mid-swap; style.load redraws it */
  }
}

/** The "near this place" radius and the lit leg, kept in step with their props on a GL map. */
export function useFocusOverlaysGL(
  map: GLMapLike | null,
  ready: boolean,
  circle: NearbyCircle | null | undefined,
  leg: [number, number][] | null | undefined
) {
  useEffect(() => {
    if (ready && map) syncNearbyCircle(map, circle);
  }, [map, ready, circle]);
  useEffect(() => {
    if (ready && map) syncRouteFocus(map, leg);
  }, [map, ready, leg]);
}
