import {describe, expect, it} from 'vitest';
import {CENTER_Y} from '../src/core/field.js';
import type {Perceived} from '../src/sim/perception.js';
import {contactCommands, contactFixture} from '../scripts/diag/run-contact-technique.js';

/** Acquired-picture controller island, not a reconstructed game. Keep real
 * hands and bodies so choosing to work off never means awarding a release. */
function scene(slot = 'H', kind: 'alley' | 'force' = 'alley') {
  const f = contactFixture({type: 'run', runBlock: 60, passBlock: 60, side: 1, seed: 11});
  const {sim, defender, engagement} = f;
  sim.t = 1.5; engagement.nextMoveAt = sim.t + .5;
  defender.recog!.read = 'pass';
  defender.runFit = {kind, gap: 'D', side: 1, edge: 'box', technique: 'attack', pace: 'stack'};
  const holder = sim.slot(slot)!;
  const cues = new Map(sim.opponents(defender).map(a => [a, {
    pos: {x: 35, y: CENTER_Y}, vel: {x: 0, y: 0}, facing: 0, stance: null,
    pose: 'up', carrying: false, age: .25,
  } as Perceived]));
  cues.set(holder, {...cues.get(holder)!, pos: {x: 43, y: CENTER_Y + 6},
    vel: {x: 3, y: 0}, carrying: true});
  const see = sim.see.bind(sim);
  sim.see = (a, b, scale = 1) => a === defender && cues.has(b)
    ? structuredClone(cues.get(b)!) : see(a, b, scale);
  return {...f, holder, cues, command: () => contactCommands(f)[defender.idx]};
}

describe('contact support recognizes an acquired receiver holder', () => {
  it.each(['H', 'X', 'Z', 'Y'])('works off toward acquired %s despite an earlier pass read', slot => {
    const f = scene(slot), before = structuredClone(f.sim.agents.map(a => a.body));
    f.command();
    expect(f.defender.tags.has('shed-attempt')).toBe(true);
    expect(f.engagement.nextMoveAt).toBeCloseTo(f.sim.t + 2 * f.defender.mind.decisionInterval, 12);
    expect(f.sim.agents.map(a => a.body)).toEqual(before);
    expect(f.defender.engagement).toBe(f.engagement);
    expect(f.sim.events.some(e => e.type === 'shed')).toBe(false);
  });

  it('uses the same work-off request for receiver and back with the same acquired geometry', () => {
    const receiver = scene(), back = scene('RB');
    expect(receiver.command()).toEqual(back.command());
  });

  it.each([false, undefined])('does not learn hidden receiver possession from carrying=%s', carrying => {
    const f = scene(); f.cues.get(f.holder)!.carrying = carrying;
    f.sim.ball = {kind: 'held', carrier: f.holder};
    const next = f.engagement.nextMoveAt; f.command();
    expect(f.defender.tags.has('shed-attempt')).toBe(false);
    expect(f.engagement.nextMoveAt).toBe(next);
  });

  it('rejects equally recent contradictory holders and a picture without a timestamp', () => {
    for (const missingTime of [false, true]) {
      const f = scene();
      if (missingTime) f.cues.get(f.holder)!.age = undefined;
      else f.cues.get(f.sim.qb)!.carrying = true;
      f.command();
      expect(f.defender.tags.has('shed-attempt')).toBe(false);
    }
  });

  it('lets newer acquired receiver possession supersede an older QB picture', () => {
    const f = scene(); Object.assign(f.cues.get(f.sim.qb)!, {carrying: true, age: .5});
    f.command(); expect(f.defender.tags.has('shed-attempt')).toBe(true);
  });

  it('does not select a receiver from hidden possession, motion or advanced snapshots', () => {
    const a = scene(), b = scene();
    b.holder.body.pos = {x: 95, y: 5}; b.holder.body.vel = {x: -8, y: 4};
    a.sim.ball = {kind: 'held', carrier: a.holder}; b.sim.ball = {kind: 'held', carrier: b.sim.qb};
    for (let i = 0; i < 3; i++) {
      a.sim.perception.record(a.sim.agents, a.holder.idx);
      b.sim.perception.record(b.sim.agents, b.sim.qb.idx);
      expect(b.command()).toEqual(a.command());
      a.sim.t += .01; b.sim.t += .01;
    }
    expect(a.engagement.nextMoveAt).toBe(b.engagement.nextMoveAt);
  });

  it('preserves force leverage until the existing advanced-runner boundary', () => {
    const f = scene('H', 'force'); f.defender.recog!.read = 'run';
    f.cues.get(f.holder)!.pos.x = 39;
    f.command(); expect(f.defender.tags.has('shed-attempt')).toBe(false);
    f.cues.get(f.holder)!.pos.x = 43;
    f.sim.t += f.defender.mind.decisionInterval + .01;
    f.command(); expect(f.defender.tags.has('shed-attempt')).toBe(true);
  });

  it('executes through the unchanged physical arm and support budgets', () => {
    const f = scene(), commands = contactCommands(f);
    expect(f.defender.tags.has('shed-attempt')).toBe(true);
    const report = f.sim.world.step(commands, f.sim.dt);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    for (const a of [f.blocker, f.defender]) {
      expect(report.armImpulse[a.idx] - report.armImpulseLimit[a.idx]).toBeLessThan(1e-8);
      expect(report.armWork[a.idx] - report.armWorkLimit[a.idx]).toBeLessThan(1e-8);
      expect(report.supportMotorWork[a.idx] - report.supportMotorWorkLimit[a.idx]).toBeLessThan(1e-8);
    }
  });
});
