import { describe, expect, it } from 'vitest';
import { legFocusPoints, legVisibleRoute, nameAt, sliceLeg, type LatLngTuple } from './routeLegs';

// A line running north from Osaka Castle in ~111 m steps (1e-3 deg lat).
const base: LatLngTuple = [34.6873, 135.5262];
const step = (i: number): LatLngTuple => [base[0] + i * 0.001, base[1]];
const line = Array.from({ length: 10 }, (_, i) => step(i));

describe('sliceLeg', () => {
  it('cuts the stretch between the two ends out of the merged line', () => {
    const got = sliceLeg([line], { from: step(2), to: step(5) });
    expect(got).toEqual([step(2), step(3), step(4), step(5)]);
  });
  it('picks the line that passes both ends among several', () => {
    const other: LatLngTuple[] = line.map(([lat, lng]) => [lat, lng + 0.05]);
    const got = sliceLeg([other, line], { from: step(1), to: step(3) });
    expect(got[0]).toEqual(step(1));
    expect(got[got.length - 1]).toEqual(step(3));
  });
  it('falls back to the straight line when no route passes near the ends', () => {
    const far: LatLngTuple = [35.0, 135.7];
    expect(sliceLeg([line], { from: far, to: step(3) })).toEqual([far, step(3)]);
    expect(sliceLeg(null, { from: step(1), to: step(2) })).toEqual([step(1), step(2)]);
  });
  it('does not walk the line backwards for a leg that goes the other way', () => {
    expect(sliceLeg([line], { from: step(6), to: step(2) })).toEqual([step(6), step(2)]);
  });
});

describe('legFocusPoints', () => {
  it('frames the box around the leg', () => {
    const [[s, w], [n, e]] = legFocusPoints([step(0), step(8)]);
    expect(s).toBeLessThanOrEqual(step(0)[0]);
    expect(n).toBeGreaterThanOrEqual(step(8)[0]);
    expect(e - w).toBeGreaterThan(0);
  });
  it('is empty without points', () => {
    expect(legFocusPoints([])).toEqual([]);
  });
});

describe('nameAt', () => {
  const places = [
    { name: 'Castillo Osaka', lat: base[0], lng: base[1] },
    { name: 'Sin pin', lat: null, lng: null },
  ];
  it('names the place a leg end stands on', () => {
    expect(nameAt([base[0] + 0.0003, base[1]], places)).toBe('Castillo Osaka');
  });
  it('is null when nothing is close', () => {
    expect(nameAt(step(9), places)).toBeNull();
  });
});

describe('legVisibleRoute', () => {
  const lines = [
    [step(0), step(1)],
    [step(2), step(3)],
  ];
  const walking = [true, false];
  const segs = ['a', 'b', 'c'];
  it('keeps the whole day while no leg is on show or the rest is not hidden', () => {
    expect(legVisibleRoute({ index: null, restHidden: true }, lines, walking, segs).lines).toBe(lines);
    expect(legVisibleRoute({ index: 1, restHidden: false }, lines, walking, segs).segments).toBe(segs);
  });
  it('leaves only the leg on show, as its time pill, with the rest hidden', () => {
    expect(legVisibleRoute({ index: 1, restHidden: true }, lines, walking, segs)).toEqual({
      lines: [],
      walking: [],
      segments: ['b'],
    });
  });
});
