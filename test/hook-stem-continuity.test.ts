import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { facingTechnique } from '../src/sim/coverage/orientation.js';
import { movementObjective } from '../src/sim/movement-objective.js';
import { PlaySim } from '../src/sim/playsim.js';

/** Synthetic sensing contract, not a saved native checkpoint. Populate the
 * ordinary delayed buffer from physical bodies; future route/possession is
 * never supplied to the controller. The unchanged integration panel covers
 * full native execution against the seam and spot-drop opposing technique. */
function stage(style: 'match' | 'spot' = 'match') {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(21), 'O', 'HOM', { strength: .6 }), '11'),
    defense: pickDefense(generateTeam(new Rng(22), 'D', 'AWY', { strength: .6 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    // dropStart 'early': these scenes stage a pass read and test the drop's technique, not when it starts.
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: style, dropStart: 'early', label: '' }, los: 35, ballY: 24, firstDownX: 45, seed: 4,
  });
  const a = sim.slot('LB_M')!, r = sim.slot('Y')!, b = a.behavior as ZoneCoverage;
  expect(b).toBeInstanceOf(ZoneCoverage);
  expect(b.zone).toMatch(/^hook/);
  const y = b.recordedLandmark().y;
  a.body.pos = { x: sim.los + 5, y };
  a.body.vel = { x: 2, y: 0 };
  a.body.facing = Math.PI;
  a.recog!.read = 'pass';
  for (const other of sim.offense) if (other !== sim.qb && other !== r) {
    other.body.pos = { x: sim.los - 3, y: 52 };
    other.body.vel = { x: 0, y: 0 };
  }
  sim.qb.body.pos = { x: sim.los - 7, y: sim.ballY };
  r.body.pos = { x: sim.los + .5, y: y - .5 };
  r.body.vel = { x: 3, y: 0 };
  r.body.facing = 0;
  const record = (n = 20) => { for (let i = 0; i < n; i++) sim.perception.record(sim.agents, sim.qb.idx); };
  record();
  sim.t = 1;
  return { sim, a, r, b, record };
}

describe('match hook reads an advancing stem before driving underneath it', () => {
  it('gathers real momentum while squeezing the lane, without following the stem deeper', () => {
    const f = stage(), command = f.b.update(f.a, f.sim);
    expect(f.b.target).toBe(f.r);
    expect(command.vel.x).toBe(0);
    expect(command.vel.y).not.toBe(0);
    const world = new World([f.a.body]), start = f.a.pos.x;
    world.step([command], .05);
    expect(f.a.vel.x).toBeGreaterThan(0); // finite braking, no instant stop
    expect(f.a.vel.x).toBeLessThan(2);
    for (let i = 0; i < 8; i++) world.step([f.b.update(f.a, f.sim)], .05);
    expect(Math.abs(f.a.vel.x)).toBeLessThan(.1);
    expect(f.a.pos.x).toBeGreaterThan(start);
    expect(f.a.body.support!.state).toBe('up');
  });

  it('returns an already over-deep hook toward his installed landmark', () => {
    const f = stage(), landmark = f.b.recordedLandmark();
    f.a.body.pos.x = landmark.x + 3;
    const command = f.b.update(f.a, f.sim);
    expect(command.vel.x).toBeLessThan(0);
    expect(movementObjective(command)!.point.x).toBeLessThanOrEqual(landmark.x);
  });

  it('does not use a hidden plant, changed live location or private route to leave the read', () => {
    const f = stage(), first = f.b.update(f.a, f.sim), rng = structuredClone(f.sim.rng);
    f.r.body.pos = { x: 75, y: 45 };
    f.r.body.vel = { x: -5, y: 0 };
    f.r.body.facing = Math.PI;
    f.r.behavior = { kind: 'hidden-different-route', update: () => { throw new Error('must not evaluate receiver'); } };
    expect(f.b.update(f.a, f.sim)).toEqual(first);
    expect(f.sim.rng).toEqual(rng);
  });

  it('waits for an acquired stop, then drives with finite physical redirection', () => {
    const f = stage();
    expect(f.b.update(f.a, f.sim).vel.x).toBe(0);
    f.r.body.pos.x = f.sim.los + 3; // an actual short route inside the hook's responsibility
    f.r.body.vel = { x: 0, y: 0 };
    f.r.body.facing = Math.PI;
    f.record(1); f.sim.t += .05; // stop is newer than the observer's delay
    expect(f.b.update(f.a, f.sim).vel.x).toBe(0);
    f.record(); f.sim.t += .2;
    const drive = f.b.update(f.a, f.sim);
    expect(f.b.target).toBe(f.r);
    expect(drive.vel.x).toBeLessThan(0);
    const before = f.a.vel.x;
    new World([f.a.body]).step([drive], .05);
    expect(f.a.vel.x).toBeLessThan(before);
    expect(f.a.vel.x).toBeGreaterThan(0);
  });

  it('can drive a visible plant before the receiver has stopped moving upfield', () => {
    const f = stage();
    f.b.update(f.a, f.sim);
    f.r.body.vel = { x: 2, y: 0 }; f.record(); f.sim.t += .2;
    const drive = f.b.update(f.a, f.sim);
    expect(f.sim.see(f.a, f.r).vel.x).toBe(2);
    expect(drive.vel.x).toBeLessThan(0);
  });

  it('keeps the existing carry when the acquired seam declares vertically', () => {
    const f = stage();
    f.r.body.pos.x = f.sim.los + 4; f.r.body.vel = { x: 6, y: 0 }; f.record();
    const command = f.b.update(f.a, f.sim);
    expect(f.b.target).toBe(f.r);
    expect(facingTechnique(command)?.label).toBe('carry-run-past');
    expect(command.vel.x).toBeGreaterThan(0);
    expect(movementObjective(command)?.kind).toBe('moving');
  });

  it('opens and carries a crossing release instead of keeping the depth-read command', () => {
    const f = stage();
    f.r.body.pos.x = f.sim.los + 4; f.r.body.vel = { x: 0, y: 4 }; f.r.body.facing = Math.PI / 2; f.record();
    const command = f.b.update(f.a, f.sim);
    expect(f.b.target).toBe(f.r);
    expect(facingTechnique(command)?.label).toBe('lane-carry');
    expect(command.facing).toBeCloseTo(Math.PI / 2);
    expect(command.vel.y).toBeGreaterThan(0);
  });

  it('preserves spot-drop depth instead of applying the match-hook read to every drop', () => {
    // The QB is still in his drop: once a dropper sees him set, ZONE_SETTLE
    // plants him where he is (that is not this contract).
    const f = stage('spot');
    f.sim.qb.body.vel = { x: -3, y: 0 }; f.record();
    const command = f.b.update(f.a, f.sim);
    expect(facingTechnique(command)?.label).toMatch(/^spot-drop/);
    expect(command.vel.x).toBeGreaterThan(0);
  });
});
