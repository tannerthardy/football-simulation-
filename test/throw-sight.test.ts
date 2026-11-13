import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage, sawThrow } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

/** A trailing man corner (back to the QB) on X, with recorded pictures. */
function stage() {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(171), 'O', 'OBS'), '11'),
    defense: pickDefense(generateTeam(new Rng(172), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 19,
  });
  const r = sim.slot('X')!, d = sim.slot('CB_W')!;
  r.body.pos = { x: 59, y: 33 }; r.body.vel = { x: 8, y: 0 }; r.body.facing = 0;
  d.body.pos = { x: 59, y: 34 }; d.body.vel = { x: 8, y: 0 }; d.body.facing = 0;
  d.recog!.read = 'pass';
  d.behavior = new ManCoverage(d, sim, r, false, 'C', 1, {});
  const record = () => { for (let i = 0; i < 24; i++) sim.perception.record(sim.agents); };
  record();
  sim.t = 2; sim.throwAt = 1.2;
  // Thrown from behind both of them, still well short.
  sim.ball = { kind: 'air', flight: { pos: { x: 45, y: 30, z: 4 }, vel: { x: 20, y: 1, z: 2 }, drag: 0 },
    thrower: sim.qb, target: r, releaseT: 1.2, releaseX: 35, intended: { x: 70, y: 33, z: 1.2 },
    arrivalT: 3.2, deflected: false, throwaway: false };
  sim.ballPath = [{ t: 3.2, x: 70, y: 33, z: 1.2 }];
  return { sim, r, d, record };
}

describe('throw recognition from what the defender sees (INFO-1)', () => {
  it('a defender with his back to the release and the flight never sees it from the release time alone', () => {
    const f = stage();
    f.sim.throwSight.sense(f.sim);
    expect(f.sim.throwSight.seenAt(f.d)).toBeUndefined();
    f.sim.t = 3;
    expect(sawThrow(f.d, f.sim, f.r)).toBe(false);
  });

  it('sees the ball once it is in his view, and reacts a reaction time later', () => {
    const f = stage();
    f.sim.throwSight.sense(f.sim);
    if (f.sim.ball.kind !== 'air') throw new Error('flight');
    f.sim.ball.flight.pos = { x: 63, y: 33.5, z: 3 };
    f.sim.t = 2.05; f.sim.throwSight.sense(f.sim);
    expect(f.sim.throwSight.seenAt(f.d)).toBe(2.05);
    expect(sawThrow(f.d, f.sim, f.r)).toBe(false);
    f.sim.t = 3;
    expect(sawThrow(f.d, f.sim, f.r)).toBe(true);
  });

  it("reads his receiver's visible look back, not the receiver's private ball tracking", () => {
    const f = stage();
    f.sim.t = 3;
    // The receiver's private state changes (he is the target, tracking the
    // ball) but nothing the corner can see has moved: no reaction.
    f.r.tags.add('looking');
    f.r.body.facing = Math.PI; // Not yet recorded into any picture.
    expect(sawThrow(f.d, f.sim, f.r)).toBe(false);
    // The visible turn reaches his pictures: he reads the hands.
    f.record();
    f.sim.t = 3.05;
    expect(sawThrow(f.d, f.sim, f.r)).toBe(false);
    expect(f.sim.throwSight.handsAt(f.d)).toBe(3.05);
    f.sim.t = 3.6;
    expect(sawThrow(f.d, f.sim, f.r)).toBe(true);
  });
});
