import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, type RunBlockKind } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Intent } from '../src/physics/world.js';

const formation = FORMATION_BY_ID.ace_11;
function setup(kind: RunBlockKind = 'drive', targetPresent = true) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'Offense', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'Defense', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Inside zone' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const blocker = sim.slot('C')!, defender = sim.slot('DT_S')!;
  // An actual approach with no early collision; do not change physical traits.
  for (const agent of sim.agents) {
    agent.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: agent.facing }) };
    if (agent !== blocker && agent !== defender) agent.body.pos = { x: 65 + agent.idx * 2, y: 3 };
  }
  blocker.body.pos = { x: 40, y: CENTER_Y };
  defender.body.pos = { x: 44, y: CENTER_Y };
  blocker.behavior = new RunBlocker({ kind, target: targetPresent ? defender : null, drive: { x: 1, y: 0 } });
  sim.t = .5;
  for (let i = 0; i < 16; i++) sim.perception.record(sim.agents);
  return { sim, blocker, defender };
}

describe('run-block approach uses the existing physical base', () => {
  it('keeps the base during the first foot movement after the snap cue', () => {
    const { sim, blocker } = setup('reach');
    sim.t = blocker.mind.snapDelay + .05;
    const command = blocker.behavior.update(blocker, sim) as Intent;
    expect(command.posture).toBe(.7);
    sim.tick();
    expect(blocker.body.support!.posture).toBeGreaterThan(.65);
    expect(blocker.engagement).toBeNull();
  });

  it.each(['drive', 'reach', 'down', 'combo', 'cutoff'] as RunBlockKind[])(
    'keeps the snap stance while an unengaged OL executes %s', kind => {
      const { sim, blocker } = setup(kind);
      const initial = blocker.body.support!.posture;
      expect(initial).toBe(.7);
      for (let k = 0; k < 6; k++) sim.tick();
      expect(blocker.engagement).toBeNull();
      expect(blocker.body.support!.posture).toBeGreaterThan(.65);
      expect(blocker.body.support!.state).toBe('up');
      expect(blocker.pos.x).toBeGreaterThan(40);
      expect(Math.abs(sim.lastStep!.work.residual)).toBeLessThan(1e-8);
      expect(sim.lastStep!.groundImpulse[blocker.idx]).not.toEqual({ x: 0, y: 0 });
    });

  it('lowers toward the requested base over time rather than resetting the body', () => {
    const { sim, blocker } = setup();
    blocker.body.support!.posture = .2;
    const command = blocker.behavior.update(blocker, sim) as Intent;
    expect(blocker.body.support!.posture).toBe(.2);
    sim.tick();
    expect(blocker.body.support!.posture).toBeGreaterThan(.2);
    expect(blocker.body.support!.posture).toBeLessThan(.7);
    expect(command.posture).toBe(.7);
    for (let k = 0; k < 4; k++) sim.tick();
    expect(blocker.body.support!.posture).toBeGreaterThan(.65);
  });

  it('retains the snap reaction gate before applying any new movement request', () => {
    const { sim, blocker } = setup();
    sim.t = 0;
    blocker.snapReadyAt = .2;
    const start = { ...blocker.pos }, posture = blocker.body.support!.posture;
    sim.tick();
    expect(blocker.pos).toEqual(start);
    expect(blocker.body.support!.posture).toBeCloseTo(posture, 8);
    expect(sim.intents[blocker.idx].posture).toBe(posture);
  });

  it.each(['pull', 'climb', 'lead', 'stalk', 'draw'] as RunBlockKind[])(
    'preserves the existing unengaged %s command', kind => {
      const { sim, blocker } = setup(kind);
      const command = blocker.behavior.update(blocker, sim) as Intent;
      expect(command.posture).toBeUndefined();
      sim.tick();
      expect(blocker.body.support!.posture).toBeLessThan(.7);
    });

  it('does not make a lineman with no target run downfield in a low base', () => {
    const { sim, blocker } = setup('drive', false);
    for (const defender of sim.defense) defender.body.pos = { x: 80 + defender.idx * 2, y: 3 };
    for (let k = 0; k < 16; k++) sim.perception.record(sim.agents);
    const command = blocker.behavior.update(blocker, sim) as Intent;
    expect(command.posture).toBeUndefined();
    sim.tick();
    expect(blocker.body.support!.posture).toBeLessThan(.7);
  });

  it('keeps receiver stalk approaches under their existing control', () => {
    const { sim, defender } = setup();
    const receiver = sim.slot('X')!;
    receiver.body.pos = { x: 40, y: CENTER_Y + 5 };
    receiver.behavior = new RunBlocker({ kind: 'drive', target: defender, drive: { x: 1, y: 0 } });
    for (let k = 0; k < 16; k++) sim.perception.record(sim.agents);
    expect((receiver.behavior.update(receiver, sim) as Intent).posture).toBeUndefined();
  });
});
