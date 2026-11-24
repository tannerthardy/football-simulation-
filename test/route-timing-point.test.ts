/** routes.ts timingPoint: the point an on-time throw on a route without a planted break is due at (the QB lane's
 * seen-depth gate). The flat's is its marked landmark (Throw Deep: "The arrow's landmark at 3 yd"); the rest take the
 * first point at or past the route's declared depth. Data only. */
import { describe, expect, it } from 'vitest';
import { getRoute, timingPoint } from '../src/playbook/routes.js';

describe('timingPoint', () => {
  it("the flat's is its marked landmark at 3.5 yd, not its first point off the snap", () => {
    const r = getRoute('flat');
    expect(r.points[timingPoint(r)]).toMatchObject({ d: 3.5, l: 12, mark: true });
  });
  it('unmarked routes: the first point at or past the declared depth', () => {
    for (const id of ['swing', 'angle', 'back_flat', 'checkdown']) {
      const r = getRoute(id), i = timingPoint(r);
      expect(r.points[i].d, id).toBeGreaterThanOrEqual(r.depth - 0.25);
      for (let k = 0; k < i; k++) expect(r.points[k].d, id).toBeLessThan(r.depth - 0.25);
    }
  });
});
