// QB_V2 module D (QB lane, 2026-11-24): the judgment's role models on synthetic pictures. What a coach would say about
// each picture should hold: a bailing corner gives the stop; a squatting one takes it; a hook dropper facing the passer
// is on the ball sooner than one turned away; a receiver between two droppers has no coverer; a rough look is a wider
// belief; a man under the ball's path is a lane man.
import { describe, expect, it } from 'vitest';
import { findCoverer, judge, type SeenDefender, type ThrowQuestion } from '../src/sim/qbv2/judge.js';

const def = (id: number, x: number, y: number, vx = 0, vy = 0, over: Partial<SeenDefender> = {}): SeenDefender => ({
  id, pos: { x, y }, vel: { x: vx, y: vy }, facing: Math.PI, spread: 0.3, facesPasser: true, vmax: 9, accel: 8, reach: 1, leap: 3.2, ballSkills: 0.5, ...over,
});
/** A stop route: the receiver runs upfield (+x) at 8 yd/s from x=5 and plants at x=12 (0.875 s), then sits. Release at
 * 0.6 s (on the break, as taught), flight 0.5 s. The passer is at x=-5. */
function stop(res = 1): ThrowQuestion {
  const at = (t: number) => ({ x: Math.min(5 + 8 * t, 12), y: 20 });
  return {
    windup: 0.6, flight: 0.5, catchAt: { x: 11.8, y: 20 }, receiverAt: at, breakIn: 0.875,
    ballHeightAt: () => 3.5, path: [{ x: -5, y: 20 }, { x: 3, y: 20 }, { x: 11.5, y: 20 }], los: 0, catchClean: 0.9, res, receiverSpread: 0.3,
  };
}

describe('QB_V2 judgment (module D)', () => {
  it('a corner bailing with his hips turned leaves the stop open; one squatting over it takes it away', () => {
    const bail = judge(stop(), [def(1, 10, 20, 8, 0, { facing: 0 })]); // 5 yd cushion, running deep with him
    const squat = judge(stop(), [def(1, 7, 20, 3, 0, { facing: Math.PI })]); // 2 yd cushion, square, coming downhill
    expect(bail.roles[0].role).toBe('coverer');
    expect(bail.P).toBeGreaterThan(squat.P);
    expect(bail.roles[0].margin).toBeLessThan(squat.roles[0].margin); // margin = ball time - his arrival: the bail arrives late
  });

  it('a hook dropper facing the passer is on the ball sooner than the same man turned away', () => {
    const q = { ...stop(), breakIn: null, receiverAt: () => ({ x: 12, y: 20 }) };
    const facing = judge(q, [def(2, 11, 15.5, 0, 0, { facesPasser: true })]);
    const away = judge(q, [def(2, 11, 15.5, 0, 0, { facesPasser: false, facing: 0 })]);
    expect(facing.roles[0].role).toBe('driver');
    expect(facing.roles[0].margin).toBeGreaterThan(away.roles[0].margin);
  });

  it('a receiver settling between two droppers has no coverer: both are drivers', () => {
    const q = { ...stop(), breakIn: null, receiverAt: () => ({ x: 10, y: 20 }), catchAt: { x: 10, y: 20 } };
    const defs = [def(3, 10, 15, 0, 0), def(4, 10, 25, 0, 0)];
    expect(findCoverer({ ...q, receiverAt: (t: number) => ({ x: 10 + 6 * t, y: 20 }) }, defs)).toBeNull();
    expect(judge({ ...q, receiverAt: (t: number) => ({ x: 10 + 6 * t, y: 20 }) }, defs).roles.map((r) => r.role)).toEqual(['driver', 'driver']);
  });

  it('a press man tight on the receiver is the coverer before he has matched his speed', () => {
    const q = { ...stop(), receiverAt: (t: number) => ({ x: 6 + 4.5 * t, y: 20 }) };
    expect(findCoverer(q, [def(1, 7, 19, 1.8, 1.1)])?.id).toBe(1);
  });

  it('a defender inside, sinking with another man, is not this receiver\'s coverer', () => {
    const q = { ...stop(), receiverAt: (t: number) => ({ x: 6 + 7 * t, y: 20 }) };
    expect(findCoverer(q, [def(1, 7, 25, 3, 0)])).toBeNull(); // 5 yd inside at 3 yd/s against the receiver's 7
    expect(findCoverer(q, [def(2, 9, 23.5, 6.5, 0)])?.id).toBe(2); // 4.6 yd off, running with him
  });

  it('a rough look is a wider belief on the same picture', () => {
    const d = [def(1, 9, 20, 6, 0, { facing: 0 })];
    expect(judge(stop(0.1), d).roles[0].sigma).toBeGreaterThan(judge(stop(1), d).roles[0].sigma);
  });

  it('a dropper under the low part of the ball\'s path is a lane man and can pick it; a rusher at the line only bats it now and then', () => {
    const q = { ...stop(), receiverAt: () => ({ x: 12, y: 20 }), breakIn: null, ballHeightAt: (p: { x: number }) => (p.x < 4 ? 2.4 : 3.5) };
    const dropper = judge(q, [def(5, 3, 20.5, 0, 0, { ballSkills: 0.8 })]);
    expect(dropper.roles[0].role).toBe('lane');
    expect(dropper.risk).toBeGreaterThan(0.02); // he gets there and plays it by our batting rule, a share of it caught
    expect(dropper.risk).toBeLessThan(0.1);
    const rusher = judge({ ...q, path: [{ x: -5, y: 20 }, { x: -1, y: 20 }, { x: 0.5, y: 20 }, { x: 11.5, y: 20 }], ballHeightAt: (p: { x: number }) => (p.x < 1 ? 2.6 : 3.5) }, [def(6, 0.5, 20.3, 0, 0)]);
    expect(rusher.roles[0].role).toBe('lane');
    expect(rusher.risk).toBeLessThan(0.03);
  });

  it('picture age acts one way: identical at age 0, the throw never rises with age whatever the margin (card spec §1)', () => {
    for (const [x, y] of [[11.5, 19.5], [8, 15], [6, 12]]) {
      const q = { ...stop(), breakIn: null, receiverAt: () => ({ x: 12, y: 20 }) };
      let prev = judge(q, [def(2, x, y, 0, 0, { age: 0 })]).P;
      for (const age of [0.2, 0.5, 0.8, 1.2, 2.0]) { const job = Math.min(1, Math.max(0, (age - 0.2) / 1.0)); const P = judge(q, [def(2, x, y, 0, 0, { age, job })]).P; expect(P).toBeLessThanOrEqual(prev + 1e-9); prev = P; }
    }
  });
  it('an aged picture of a man arriving early never raises the throw (audit §3 #2)', () => {
    const q = { ...stop(), breakIn: null, receiverAt: () => ({ x: 12, y: 20 }) };
    const fresh = judge(q, [def(2, 11.5, 19.5, 0, 0, { age: 0 })]), old = judge(q, [def(2, 11.5, 19.5, 0, 0, { age: 0.8 })]);
    expect(fresh.roles[0].margin).toBeGreaterThan(0);
    expect(old.P).toBeLessThanOrEqual(fresh.P + 1e-9);
  });
});
