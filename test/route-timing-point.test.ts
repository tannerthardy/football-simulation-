/** routes.ts timingPoint: the point an on-time throw on a route without a planted break is due at (the QB lane's
 * seen-depth gate), in route coordinates. The flat declares its own (NFL WR/TE flats are 5.2 yd outward and 0.6 yd deep
 * at 2.0 s, flat_pace.py on #876): a point on its leg, not a path vertex. The rest take the first point at or past the
 * route's declared depth. Data only. */
import { describe, expect, it } from 'vitest';
import { getRoute, timingPoint } from '../src/playbook/routes.js';

describe('timingPoint', () => {
  it("the flat's lies on its leg 5 yd outward, and its path keeps its two points", () => {
    const r = getRoute('flat'), t = timingPoint(r);
    expect(t).toEqual({ d: 1.05, l: 5 });
    expect(r.points).toHaveLength(2);
    const [a, b] = r.points, f = (t.l - a.l) / (b.l - a.l);
    expect(f).toBeGreaterThan(0); expect(f).toBeLessThan(1);
    expect(t.d).toBeCloseTo(a.d + f * (b.d - a.d), 6);
  });
  it('undeclared routes: the first point at or past the declared depth', () => {
    for (const id of ['swing', 'angle', 'back_flat', 'checkdown']) {
      const r = getRoute(id), t = timingPoint(r);
      const i = r.points.findIndex((p) => p.d === t.d && p.l === t.l);
      expect(i, id).toBeGreaterThanOrEqual(0);
      expect(t.d, id).toBeGreaterThanOrEqual(r.depth - 0.25);
      for (let k = 0; k < i; k++) expect(r.points[k].d, id).toBeLessThan(r.depth - 0.25);
    }
  });
});
