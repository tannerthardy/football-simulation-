import { describe, expect, it } from 'vitest';
import { trafficPath, type TrafficDisc, type TrafficPath } from '../src/sim/traffic-path.js';
import type { Vec2 } from '../src/core/vec.js';

function checkPath(path: TrafficPath | null, start: Vec2, goal: Vec2, discs: TrafficDisc[]) {
  expect(path).not.toBeNull();
  const result = path!;
  expect(result.distance).toBeCloseTo(result.pieces.reduce((sum, p) => sum + p.length, 0), 8);
  expect(result.pieces[0].from.x).toBeCloseTo(start.x, 8);
  expect(result.pieces[0].from.y).toBeCloseTo(start.y, 8);
  expect(result.pieces.at(-1)!.to.x).toBeCloseTo(goal.x, 8);
  expect(result.pieces.at(-1)!.to.y).toBeCloseTo(goal.y, 8);
  expect(Math.hypot(result.firstDirection.x, result.firstDirection.y)).toBeCloseTo(1, 8);
  for (let i = 0; i < result.pieces.length; i++) {
    const piece = result.pieces[i];
    if (i) {
      expect(piece.from.x).toBeCloseTo(result.pieces[i - 1].to.x, 8);
      expect(piece.from.y).toBeCloseTo(result.pieces[i - 1].to.y, 8);
    }
    // Independently sample each returned physical-radius boundary/line,
    // including endpoints and covered overlap seams. The exact one-disc
    // length below separately rejects a merely sampled/chord detour.
    for (let k = 0; k <= 80; k++) {
      const t = k / 80;
      const p = piece.kind === 'line'
        ? { x: piece.from.x + (piece.to.x - piece.from.x) * t, y: piece.from.y + (piece.to.y - piece.from.y) * t }
        : { x: piece.center.x + piece.radius * Math.cos(piece.startAngle + piece.sweep * t),
          y: piece.center.y + piece.radius * Math.sin(piece.startAngle + piece.sweep * t) };
      for (const disc of discs) expect(Math.hypot(p.x - disc.center.x, p.y - disc.center.y))
        .toBeGreaterThanOrEqual(disc.radius - 1e-8);
    }
  }
}

describe('the same football point through represented teammate-disc geometry', () => {
  it('retains a direct clear path without changing inputs', () => {
    const start = { x: -3, y: 0 }, goal = { x: 3, y: 0 };
    const discs = [{ center: { x: 0, y: 2 }, radius: 1 }], before = structuredClone({ start, goal, discs });
    const path = trafficPath(start, goal, discs);
    checkPath(path, start, goal, discs);
    expect(path!.distance).toBe(6); expect(path!.pieces).toHaveLength(1);
    expect(path!.firstDirection).toEqual({ x: 1, y: 0 });
    expect({ start, goal, discs }).toEqual(before);
  });

  it('uses the exact tangent-plus-arc distance around one physical disc', () => {
    const start = { x: -2, y: 0 }, goal = { x: 2, y: 0 }, discs = [{ center: { x: 0, y: 0 }, radius: 1 }];
    const path = trafficPath(start, goal, discs);
    checkPath(path, start, goal, discs);
    expect(path!.distance).toBeCloseTo(2 * Math.sqrt(3) + Math.PI / 3, 8);
    expect(path!.distance).toBeGreaterThan(4);
    expect(path!.pieces.some(p => p.kind === 'arc')).toBe(true);
  });

  it.each([2, 3])('plans around %i overlapping bodies together without entering a covered seam', count => {
    const start = { x: -3, y: 0 }, goal = { x: 3, y: 0 };
    const discs = [{ center: { x: -.6, y: 0 }, radius: 1 },
      { center: { x: .6, y: 0 }, radius: 1 }, { center: { x: 0, y: -.65 }, radius: 1 }].slice(0, count);
    const path = trafficPath(start, goal, discs);
    checkPath(path, start, goal, discs);
    expect(path!.distance).toBeGreaterThan(6);
    expect(path!.pieces.some(p => p.kind === 'arc')).toBe(true);
  });

  it('mirrors a uniquely shorter side and its initial physical direction', () => {
    const start = { x: -3, y: 0 }, goal = { x: 3, y: 0 };
    const a = trafficPath(start, goal, [{ center: { x: 0, y: .35 }, radius: 1 }])!;
    const b = trafficPath(start, goal, [{ center: { x: 0, y: -.35 }, radius: 1 }])!;
    expect(a.distance).toBeCloseTo(b.distance, 8);
    expect(a.firstDirection.x).toBeCloseTo(b.firstDirection.x, 8);
    expect(a.firstDirection.y).toBeCloseTo(-b.firstDirection.y, 8);
    expect(a.firstDirection.y).toBeLessThan(0);
  });

  it('keeps contained/duplicate discs equivalent to their actual union', () => {
    const start = { x: -3, y: 0 }, goal = { x: 3, y: 0 };
    const outer = { center: { x: 0, y: 0 }, radius: 1 };
    const discs = [outer, structuredClone(outer), { center: { x: .2, y: .1 }, radius: .3 }];
    const path = trafficPath(start, goal, discs);
    checkPath(path, start, goal, discs);
    expect(path!.distance).toBeCloseTo(trafficPath(start, goal, [outer])!.distance, 8);
  });

  it('allows physical boundary touch while retaining inside-body and invalid-input blockers', () => {
    const discs = [{ center: { x: 0, y: 1 }, radius: 1 }, { center: { x: 0, y: -1 }, radius: 1 }];
    const path = trafficPath({ x: -3, y: 0 }, { x: 3, y: 0 }, discs);
    expect(path!.distance).toBe(6); expect(path!.pieces).toHaveLength(1);
    expect(trafficPath({ x: 0, y: 1 }, { x: 3, y: 0 }, discs)).toBeNull();
    expect(trafficPath({ x: -3, y: 0 }, { x: 0, y: -1 }, discs)).toBeNull();
    expect(trafficPath({ x: NaN, y: 0 }, { x: 1, y: 0 }, [])).toBeNull();
    expect(trafficPath({ x: 0, y: 0 }, { x: 1, y: 0 }, [{ center: { x: 0, y: 2 }, radius: -1 }])).toBeNull();
    expect(trafficPath({ x: 0, y: 0 }, { x: 1, y: 0 }, Array.from({ length: 11 }, () => discs[0]))).toBeNull();
    expect(trafficPath({ x: 2, y: 0 }, { x: 2, y: 0 }, [])).toEqual({
      distance: 0, pieces: [], firstPiece: null, firstDirection: { x: 0, y: 0 } });
  });

  it('can begin with a real boundary arc rather than a chord through the body', () => {
    const start = { x: 1, y: 0 }, goal = { x: -3, y: 0 }, discs = [{ center: { x: 0, y: 0 }, radius: 1 }];
    const path = trafficPath(start, goal, discs);
    checkPath(path, start, goal, discs);
    expect(path!.firstPiece!.kind).toBe('arc');
    expect(Math.abs(path!.firstDirection.y)).toBeCloseTo(1, 8);
  });

  it('chooses a represented in-field side when the shorter arc leaves existing bounds', () => {
    const start = { x: -3, y: 0 }, goal = { x: 3, y: 0 };
    const discs = [{ center: { x: 0, y: -.35 }, radius: 1 }];
    const bounds = { minX: -4, maxX: 4, minY: -2, maxY: .5 };
    const free = trafficPath(start, goal, discs)!, bounded = trafficPath(start, goal, discs, bounds)!;
    checkPath(bounded, start, goal, discs);
    expect(free.firstDirection.y).toBeGreaterThan(0);
    expect(bounded.firstDirection.y).toBeLessThan(0);
    expect(bounded.distance).toBeGreaterThan(free.distance);
    for (const piece of bounded.pieces) for (let k = 0; k <= 80; k++) {
      const t = k / 80, y = piece.kind === 'line' ? piece.from.y + (piece.to.y - piece.from.y) * t
        : piece.center.y + piece.radius * Math.sin(piece.startAngle + piece.sweep * t);
      expect(y).toBeGreaterThanOrEqual(bounds.minY - 1e-8);
      expect(y).toBeLessThanOrEqual(bounds.maxY + 1e-8);
    }
    expect(trafficPath(start, goal, discs, { ...bounds, minY: -.1, maxY: .1 })).toBeNull();
    expect(trafficPath(start, goal, discs, { ...bounds, minX: 0 })).toBeNull();
  });
});
