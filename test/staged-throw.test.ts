/** PlaySetup.stagedThrow (test staging; never set in games): defensive tests fix when, to whom and where the ball is
 * thrown, so a change in the quarterback does not move their scene. The passer's own motion and release run; only the
 * choice (and, with an aim, his accuracy draw) is staged. */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim, type StagedThrow } from '../src/sim/playsim.js';

function play(stagedThrow?: StagedThrow) {
  const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.stick, label: 'stick' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'c3' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1, stagedThrow } as never);
  const throws: { windup: number; release: number; slot: string; aim: { x: number; y: number; z: number } | null; T: number | null }[] = [];
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, ...r: any[]) => {
    const rec = sim.qb.behavior.releaseRec;
    throws.push({ windup: sim.windupAt, release: sim.t, slot: target?.slot, aim: rec?.aim ?? null, T: rec?.T ?? null });
    return tb(qb, target, ...r);
  };
  while (sim.phase !== 'dead' && sim.t < 6) sim.tick();
  return throws;
}

describe('stagedThrow: a test-staged throw', () => {
  it('starts at the staged time to the staged receiver, and his own earlier throw is held', () => {
    const natural = play();
    expect(natural.length).toBe(1);
    // A later start to another receiver than the one he picked.
    const other = natural[0].slot === 'X' ? 'Y' : 'X';
    const at = Math.round((natural[0].windup + 0.5) / 0.05) * 0.05;
    const staged = play({ at, slot: other });
    expect(staged.length).toBe(1);
    expect(staged[0].slot).toBe(other);
    expect(staged[0].windup).toBeGreaterThanOrEqual(at - 1e-9);
    expect(staged[0].windup).toBeLessThan(at + 0.3);
  });

  it('reproduces the natural throw when staged with its own time, receiver, aim and flight time', () => {
    const [n] = play();
    const [s] = play({ at: n.windup, slot: n.slot, aim: n.aim!, T: n.T! });
    expect(s).toEqual(n);
  });

  it('with an aim, the ball goes to that point in that flight time', () => {
    const [n] = play();
    const aim = { x: n.aim!.x + 2, y: n.aim!.y - 1, z: n.aim!.z };
    const [s] = play({ at: n.windup, slot: n.slot, aim, T: n.T! + 0.1 });
    expect(s.aim).toEqual(aim);
    expect(s.T).toBeCloseTo(n.T! + 0.1, 12);
  });
});
