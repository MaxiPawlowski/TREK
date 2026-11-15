import { haversineKm } from '../../utils/geo';

/** A point as the route lines carry it: `[lat, lng]`. */
export type LatLngTuple = [number, number];

/** What a leg of the day needs from its segment: where it starts and where it ends. */
export interface LegEnds {
  from: LatLngTuple;
  to: LatLngTuple;
}

/** A place a leg end can be named after. */
export interface NamedPoint {
  name: string;
  lat?: number | null;
  lng?: number | null;
}

const distM = (a: LatLngTuple, b: LatLngTuple) =>
  haversineKm({ lat: a[0], lng: a[1] }, { lat: b[0], lng: b[1] }) * 1000;

/** Index of the vertex of `line` closest to `p`, searching from `start` on, and how far it is. */
function nearestVertex(line: LatLngTuple[], p: LatLngTuple, start = 0): { i: number; d: number } {
  let best = { i: -1, d: Infinity };
  for (let i = start; i < line.length; i++) {
    const d = distM(line[i], p);
    if (d < best.d) best = { i, d };
  }
  return best;
}

/**
 * The stretch of the drawn route one leg covers.
 *
 * The router hands the day back as a few merged lines (one per run, split where walking
 * and riding meet), so a leg has no geometry of its own. It is cut out of whichever line
 * passes closest to both of its ends, start before end. A leg no line follows (not routed
 * yet, or routed by a mode that draws nothing) falls back to the straight line between
 * its ends, so the map still shows which two stops it joins.
 */
export function sliceLeg(route: readonly LatLngTuple[][] | null | undefined, leg: LegEnds): LatLngTuple[] {
  let best: { line: LatLngTuple[]; a: number; b: number; score: number } | null = null;
  for (const line of route ?? []) {
    if (line.length < 2) continue;
    const a = nearestVertex(line, leg.from);
    if (a.i < 0) continue;
    const b = nearestVertex(line, leg.to, a.i);
    if (b.i < 0) continue;
    const score = a.d + b.d;
    if (!best || score < best.score) best = { line, a: a.i, b: b.i, score };
  }
  // Both ends within a few hundred metres of the line: the snapped stops of a real route.
  if (best && best.score < 600 && best.b > best.a) return best.line.slice(best.a, best.b + 1);
  return [leg.from, leg.to];
}

/**
 * The two corners of the box a leg fits in, `[lat, lng]`, for the camera's fit-to-points.
 * A leg shorter than a street gets a little air so the camera does not dive to the
 * deepest zoom over two pins on one corner.
 */
export function legFocusPoints(coords: readonly LatLngTuple[]): LatLngTuple[] {
  let s = Infinity,
    w = Infinity,
    n = -Infinity,
    e = -Infinity;
  for (const [lat, lng] of coords) {
    s = Math.min(s, lat);
    n = Math.max(n, lat);
    w = Math.min(w, lng);
    e = Math.max(e, lng);
  }
  if (!Number.isFinite(s)) return [];
  const pad = 0.0015;
  if (n - s < pad) {
    s -= pad / 2;
    n += pad / 2;
  }
  if (e - w < pad) {
    w -= pad / 2;
    e += pad / 2;
  }
  return [
    [s, w],
    [n, e],
  ];
}

/**
 * The name of the place a leg end stands on: the closest one within `maxM` metres.
 * Null when nothing is that close, which the caller turns into a neutral label.
 */
export function nameAt(point: LatLngTuple, places: readonly NamedPoint[], maxM = 150): string | null {
  let best: { name: string; d: number } | null = null;
  for (const p of places) {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
    const d = distM(point, [p.lat, p.lng]);
    if (d <= maxM && (!best || d < best.d)) best = { name: p.name, d };
  }
  return best?.name ?? null;
}
