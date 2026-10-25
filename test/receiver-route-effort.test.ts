import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { RouteDef } from '../src/playbook/types.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { onBallCaught } from '../src/sim/assign.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(91), 'Route offense', 'ROF');
const away = generateTeam(new Rng(92), 'Route defense', 'RDF');
const vertical: RouteDef = { id: 'effort-vertical', family: 'deep', depth: 25,
  end: 'continue', points: [{ d: 25, l: 0 }] };
const out: RouteDef = { id: 'effort-out', family: 'intermediate', depth: 15,
  end: 'settle', points: [{ d: 11, l: 0 }, { d: 15, l: 4, s: .6 }] };

/** Actual controller with a synthetic, unreachable flight. No snap is run.
 * Every arm has the same body and perception history; only private target
 * attribution changes. These are controller contracts, not replay checkpoints. */
function fixture(target: 'self' | 'other' | 'none', route = vertical) {
  const sim = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'route continuation' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over Cover 3' }, los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const r = sim.slot('X')!;
  r.body.pos = { x: 50, y: 26 }; r.body.vel = { x: 6, y: 0 }; r.body.facing = 0;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  sim.t = 2;
  const runner = new RouteRunner(r, sim, route, 1);
  r.behavior = runner;
  sim.ball = { kind: 'air', flight: { pos: { x: 95, y: 5, z: 6 }, vel: { x: 20, y: 0, z: 0 }, drag: 0 },
    thrower: sim.qb, target: target === 'self' ? r : target === 'other' ? sim.slot('H')! : null,
    releaseT: 2, releaseX: 35, intended: { x: 100, y: 5, z: 1.2 },
    arrivalT: 2.3, deflected: false, throwaway: false };
  sim.throwAt = 2;
  sim.ballPath = [{ t: 2.1, x: 97, y: 5, z: 5.9 }, { t: 2.3, x: 100, y: 5, z: 5.5 }];
  return { sim, r, runner };
}

function intendedSpeed(cmd: ReturnType<RouteRunner['update']>) {
  return Math.hypot(cmd.vel.x, cmd.vel.y);
}

describe('installed route effort during unrelated flight', () => {
  it('preserves the numeric route request for hidden target changes with no acquired picture change', () => {
    const arms = [fixture('self'), fixture('other'), fixture('none')];
    const initial = arms.map(f => ({ rng: structuredClone(f.sim.rng), perception: structuredClone(f.sim.perception) }));
    const see = arms.map(f => vi.spyOn(f.sim, 'see'));
    for (const t of [2, 2.05, 2.25]) {
      const commands = arms.map(f => { f.sim.t = t; return f.runner.update(f.r, f.sim); });
      expect(commands[1]).toEqual(commands[0]);
      expect(commands[2]).toEqual(commands[0]);
      // The route remains an actual downfield request, not an invariant zero
      // or a deleted diagnostic field hiding an effort reduction elsewhere.
      for (const cmd of commands) {
        expect(cmd.vel.x).toBeGreaterThan(8);
        expect(cmd.vel.y).toBeCloseTo(0, 12);
        expect(intendedSpeed(cmd)).toBeLessThanOrEqual(arms[0].r.profile.vmax);
        expect(cmd.effort ?? 1).toBe(1);
      }
    }
    for (const [i, f] of arms.entries()) {
      expect(f.sim.rng).toEqual(initial[i].rng);
      expect(f.sim.perception).toEqual(initial[i].perception);
      expect(see[i]).not.toHaveBeenCalled();
    }
  });

  it('advances the real route waypoint and honors its installed break during flight', () => {
    const f = fixture('other', out);
    f.r.body.pos = { x: 51.2, y: 26 };
    const command = f.runner.update(f.r, f.sim);
    expect(f.runner.idx).toBe(1);
    expect(f.runner.settled).toBe(false);
    expect(command.vel.x).toBeGreaterThan(0);
    expect(command.vel.y).toBeGreaterThan(0);
    expect(command.vel.y / command.vel.x).toBeCloseTo(4 / 3.8, 10);
    expect(intendedSpeed(command)).toBeLessThan(f.r.profile.vmax);
    expect(command.effort ?? 1).toBe(1);
  });

  it('still gathers at a completed installed route instead of sprinting indefinitely', () => {
    const f = fixture('other', out);
    f.r.body.pos = { x: 55, y: 30 }; f.r.body.vel = { x: 0, y: 0 };
    f.runner.idx = 1;
    const command = f.runner.update(f.r, f.sim);
    expect(f.runner.idx).toBe(2);
    expect(f.runner.settled).toBe(true);
    expect(command.vel).toEqual({ x: 0, y: 0 });
  });

  it('retains the existing caught-ball transfer to carrier and blocking duties', () => {
    const f = fixture('other');
    f.sim.ball = { kind: 'held', carrier: f.r };
    const defenders = f.sim.defense.map(a => a.behavior);
    onBallCaught(f.sim, f.r);
    expect(f.r.behavior.kind).toBe('carrier');
    expect(f.sim.offense.filter(a => a !== f.r).every(a => a.behavior.kind === 'downfield-block')).toBe(true);
    // INFO-1: the physical catch no longer notifies every opponent. Their
    // installed controllers retain ownership until their own evidence acts.
    expect(f.sim.defense.map(a => a.behavior)).toEqual(defenders);
  });
});
