// QB_V2 card spec §1, invariant 2 as restated by Integration (2026-11-25): holding a defender's believed position and
// motion fixed, a throw's estimate never rises with the time since he was last seen. Driven through the passer's real
// QBMind on a staged play (its seenSpread, unseenFor and jobWeight as the clock runs on with no observe() call), not
// constants; the belief (his estimate) is frozen at the start, since its own movement toward the man's job is allowed.
import { describe, expect, it } from 'vitest';
import { PlaySim } from '../src/sim/playsim.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { judge, type SeenDefender, type ThrowQuestion } from '../src/sim/qbv2/judge.js';

describe('QB_V2 picture age through the real QBMind', () => {
  it('belief frozen, P on a throw near a defender never rises with the time since he was seen (to 2.5 s)', () => {
    for (const seed of [1, 2, 3]) {
      const sim: any = new PlaySim(nativeTraceSetup({ concept: 'stick', coverage: 'cover3', seed, roster: 3, formation: 'gun_trips_11', flip: false }) as any);
      while (sim.t < 1.0 && sim.phase !== 'dead') sim.tick();
      const mind = sim.qb.behavior?.mind; expect(mind).toBeTruthy();
      // The defender his picture puts nearest a point 6 yd upfield of the passer, over the stick.
      const qb = sim.qb.pos, pt = { x: qb.x + 9, y: qb.y + 3 };
      const d = [...sim.defense].sort((a: any, b: any) => Math.hypot(mind.estimate(a).pos.x - pt.x, mind.estimate(a).pos.y - pt.y) - Math.hypot(mind.estimate(b).pos.x - pt.x, mind.estimate(b).pos.y - pt.y))[0];
      const q: ThrowQuestion = { windup: 0.3, flight: 0.5, catchAt: pt, receiverAt: () => pt, breakIn: null, ballHeightAt: () => 2,
        path: [{ x: qb.x, y: qb.y }, { x: (qb.x + pt.x) / 2, y: (qb.y + pt.y) / 2 }, pt], los: sim.los, catchClean: 0.9, res: 1, receiverSpread: 0.3 };
      const e = mind.estimate(d); // the belief, frozen
      const seen = (): SeenDefender => { return { id: d.idx, pos: e.pos, vel: e.vel, facing: e.facing, spread: mind.seenSpread(d), age: mind.unseenFor(d), job: mind.jobWeight(d), spreadDR: mind.pictureSpread(d),
        facesPasser: true, vmax: 8, accel: 8, reach: 1, leap: 3.2, ballSkills: 0.5 }; };
      const t0 = sim.t; let prev = judge(q, [seen()]).P;
      const spread0 = mind.pictureSpread(d), seen0 = mind.seenSpread(d);
      for (let k = 1; k <= 25; k++) {
        sim.t = t0 + 0.1 * k; // the clock runs on; observe() is not called: no new sighting
        const P = judge(q, [seen()]).P;
        expect(P).toBeLessThanOrEqual(prev + 1e-9);
        prev = P;
      }
      expect(mind.jobWeight(d)).toBeGreaterThan(0.9); // swept well past the horizon, into his job belief
      expect(mind.seenSpread(d)).toBeCloseTo(seen0, 9); // the look's own spread does not grow with unseen time
      expect(mind.pictureSpread(d)).toBeGreaterThanOrEqual(spread0); // the old controller's dead-reckoned spread still does
    }
  });
});
