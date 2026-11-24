/** routes.ts timingPoint: the point an on-time throw on a route without a planted break is due at (the QB lane's
 * seen-depth gate), in route coordinates. The flat, the back's flat and the swing declare their own (NFL flats released at a
 * median 6.4 / 6.9 yd outward): a point on a leg, not a path vertex. The rest take the first point at or past the
 * route's declared depth. Data only. */
import { describe, expect, it } from 'vitest';
import { getRoute, timingPoint } from '../src/playbook/routes.js';

describe('timingPoint', () => {
  it('declared points (flat, back flat, swing) lie on a leg of the path, short of its far end', () => {
    for (const id of ['flat', 'back_flat', 'swing']) {
      const r = getRoute(id), t = timingPoint(r), P = r.points;
      const on = P.slice(1).some((b, k) => { const a = P[k], f = (t.l - a.l) / (b.l - a.l);
        return f >= 0 && f <= 1 && Math.abs(t.d - (a.d + f * (b.d - a.d))) < 1e-6; });
      expect(on, id).toBe(true);
      expect(t.l, id).toBeLessThan(P[P.length - 1].l);
    }
    expect(getRoute('flat').points).toHaveLength(2);
  });
  it('undeclared routes: the first point at or past the declared depth', () => {
    for (const id of ['angle', 'checkdown', 'slant', 'arrow']) {
      const r = getRoute(id), t = timingPoint(r);
      const i = r.points.findIndex((p) => p.d === t.d && p.l === t.l);
      expect(i, id).toBeGreaterThanOrEqual(0);
      expect(t.d >= r.depth - 0.25 || i === r.points.length - 1, id).toBe(true);
      for (let k = 0; k < i; k++) expect(r.points[k].d, id).toBeLessThan(r.depth - 0.25);
    }
  });
});
