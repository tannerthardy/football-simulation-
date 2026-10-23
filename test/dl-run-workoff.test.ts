import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { contactCommands, contactFixture } from '../scripts/diag/run-contact-technique.js';
import type { Perceived } from '../src/sim/perception.js';

/** Reduced acquired-information/contact island, not a restored NFL snap. */
function scene(side: number, sealed = false) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, seed: 11, side });
  const { sim, blocker: b, defender: d, engagement: e } = f;
  sim.t = sim.world.time = 1.5;
  d.recog!.read = 'run';
  d.runFit = { gap: 'B', side, kind: 'interior', edge: 'box', technique: 'attack', pace: 'stack' };
  e.nextMoveAt = 0; e.surfaceAxis = { x: -1, y: 0 }; e.drive = { x: 1, y: 0 };
  d.body.pos = { x: 40.82, y: CENTER_Y }; d.body.vel = { x: 0, y: 0 };
  b.body.pos = { x: sealed ? 41.65 : 40, y: CENTER_Y };
  b.body.facing = sealed ? Math.PI : 0;
  e.hands!.normalForce = 60; e.hands!.tangentForce = 0;
  const back = sim.slot('RB')!;
  sim.ball = { kind: 'held', carrier: back };
  const cue = (pos: { x: number; y: number }, carrying: boolean): Perceived =>
    ({ pos, vel: { x: 3, y: 0 }, carrying, facing: 0, pose: 'up', stance: null, age: .2 });
  const runner = cue({ x: 42, y: CENTER_Y + side * 2 }, true);
  const qb = cue({ x: 35, y: CENTER_Y }, false);
  const blockerCue = cue({ ...b.pos }, false);
  const see = sim.see.bind(sim);
  vi.spyOn(sim, 'see').mockImplementation((observer, target, ...rest) => observer === d
    ? structuredClone(target === back ? runner : target === sim.qb ? qb : target === b ? blockerCue : see(observer, target, ...rest))
    : see(observer, target, ...rest));
  return { ...f, back, runner, qb, blockerCue,
    command: () => contactCommands(f)[d.idx] };
}

afterEach(() => vi.restoreAllMocks());

describe('first-level work-off follows a legitimately acquired runner', () => {
  it.each([-1, 1])('requests separation when the felt blocker is behind the runner approach, side=%s', side => {
    const f = scene(side), before = structuredClone(f.sim.agents.map(a => a.body));
    const hands = f.engagement.hands, command = f.command();
    expect(command.vel.x).toBeGreaterThan(0);
    expect(command.vel.y * side).toBeGreaterThan(0);
    expect(command.facing).toBeCloseTo(Math.atan2(f.runner.pos.y - f.defender.pos.y,
      f.runner.pos.x - f.defender.pos.x), 12);
    expect(f.defender.engagement).toBe(f.engagement);
    expect(f.engagement.hands).toBe(hands);
    expect(f.sim.events.some(e => e.type === 'shed')).toBe(false);
    expect(f.sim.agents.map(a => a.body)).toEqual(before);
  });

  it('preserves across-face work against a blocker still ahead of the exit', () => {
    const f = scene(1, true), command = f.command();
    expect(command.vel.x).toBeLessThan(0);
    expect(command.facing).toBeCloseTo(0, 12);
    expect(f.defender.engagement).toBe(f.engagement);
    expect(f.sim.events.some(e => e.type === 'shed')).toBe(false);
  });

  it('cannot change its exit from hidden holder, runner motion or private give/keep flags', () => {
    const a = scene(1), b = scene(1);
    b.sim.ball = { kind: 'held', carrier: b.sim.qb };
    b.sim.handoffAt = -1; b.sim.scrambled = true; b.sim.isPass = true;
    b.back.body.pos = { x: 85, y: 2 }; b.back.body.vel = { x: -8, y: -8 };
    expect(b.command()).toEqual(a.command());
    expect(JSON.stringify(b.sim.rng)).toBe(JSON.stringify(a.sim.rng));
  });

  it('does not infer a new exit from unknown, contradictory or expired possession', () => {
    for (const change of [
      (f: ReturnType<typeof scene>) => { f.runner.carrying = undefined; },
      (f: ReturnType<typeof scene>) => { f.qb.carrying = true; },
      (f: ReturnType<typeof scene>) => { f.runner.age = 2; },
      (f: ReturnType<typeof scene>) => { f.qb.age = undefined; },
    ]) {
      const f = scene(1); change(f);
      expect(f.command().vel.x).toBeLessThanOrEqual(0);
      expect(f.defender.engagement).toBe(f.engagement);
    }
  });

  it('retains an edge shoulder and an unadvanced mesh before surrendering that duty', () => {
    const f = scene(1);
    f.defender.runFit!.kind = 'edge';
    f.runner.pos = { x: 39, y: CENTER_Y + 6 };
    expect(f.command().vel.x).toBeLessThanOrEqual(0);
    expect(f.defender.tags.has('shed-attempt')).toBe(false);
  });

  it('executes the requested turn through the existing hand and support budgets', () => {
    const f = scene(1), commands = contactCommands(f);
    const report = f.sim.world.step(commands, f.sim.dt);
    // Requesting a turn is not an instantaneous body rotation or a release.
    expect(Math.abs(f.defender.facing - commands[f.defender.idx].facing!)).toBeGreaterThan(.1);
    expect(f.defender.engagement).toBe(f.engagement);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of [f.blocker, f.defender]) {
      expect(report.armImpulse[a.idx] - report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
      expect(report.armWork[a.idx] - report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
      expect(report.supportMotorWork[a.idx] - report.supportMotorWorkLimit[a.idx]).toBeLessThan(1e-8);
    }
  });
});
