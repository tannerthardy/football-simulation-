import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { PlaySim } from '../src/sim/playsim.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';
import type { CommandTraceSelection } from '../src/sim/command-trace.js';

const input = { coverage: 'cover3_buzz', concept: 'curl_flat', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false };
const selection: CommandTraceSelection = { actor: { team: 'D', slot: 'CB_W' }, from: 2, to: 3.65 };

describe('selected command attribution in normal execution', () => {
  it('preserves the complete native play, reads, decisions, steps and RNG while attributing the catch command to coverage', () => {
    const execute = (record: boolean) => {
      const draws = vi.spyOn(Rng.prototype, 'nextU32');
      const sim = new PlaySim({ ...nativeTraceSetup(input), record: true, recordLevel: 'full' });
      const trace = record ? sim.recordCommands(selection) : undefined;
      const physics = vi.spyOn(sim.world, 'step'), reads = vi.spyOn(sim.perception, 'perceive');
      // Track the actual installed update entries, including the selected coverage wrapper.
      const decisions = sim.agents.map(a => vi.spyOn(a.behavior, 'update'));
      const steps: unknown[] = [];
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        steps.push(structuredClone({ t: sim.t, phase: sim.phase, bodies: sim.agents.map(a => a.body),
          intents: sim.intents, minds: sim.agents.map(a => a.mind), rng: sim.rng }));
      };
      const result = sim.run();
      const counts = { physics: physics.mock.calls.length, reads: reads.mock.calls.length,
        decisions: decisions.map(s => s.mock.calls.length), draws: draws.mock.calls.length };
      vi.restoreAllMocks();
      return { result, steps, counts, sim, trace };
    };
    const off = execute(false), on = execute(true);
    expect(on.result).toEqual(off.result); // Includes all events, stats, frames and full replay telemetry.
    expect(on.steps).toEqual(off.steps); // All tick commands/bodies, held aims and RNG streams, not only the ending.
    expect(on.counts).toEqual(off.counts);
    expect(off.trace).toBeUndefined();
    expect(on.result.stats.completed).toBe(true);
    const trace = on.trace!, catcher = on.result.events.find(e => e.type === 'catch')!;
    const catchStep = trace.steps.find(s => s.stepStart === catcher.t)!;
    expect(catchStep.decision!.evaluated).toBe(true);
    expect(catchStep.decision!.owner.controller).toBe('CoverageDefender');
    expect(catchStep.decision!.owner.kind).toBe('man');
    expect(catchStep.decision!.ownerAfterUpdate.target?.slot).toBe('X');
    expect(catchStep.endpoint!.behavior.controller).toBe('Pursuit');
    expect(catchStep.endpoint!.behavior.kind).toBe('pursuit');
    expect(catchStep.endpointTime).toBeCloseTo(catchStep.stepStart + on.sim.dt, 10);
    expect(trace.steps.find(s => s.stepStart === catchStep.endpointTime)!.decision!.owner.kind).toBe('pursuit');
    expect(trace.steps.every(s => s.stepStart >= selection.from && s.stepStart < selection.to && s.actor.playerId === trace.actor.playerId)).toBe(true);
    expect(trace.steps[0].actor).toEqual({ playerId: on.sim.slot('CB_W')!.player.id, team: 'D', slot: 'CB_W', index: on.sim.slot('CB_W')!.idx });
    const free = trace.steps.find(s => s.stepStart === 2)!;
    expect(free.start.engagement).toBeNull();
    expect(free.rewrites).toEqual([]);
    expect(free.final).toEqual(free.decision!.raw);
    const observations = trace.steps.flatMap(s => s.observations);
    expect(observations.some(o => o.phase === 'decision' && o.target.slot === 'X')).toBe(true);
    for (const observation of observations) {
      if (observation.age !== null) expect(observation.sampledAt).toBeCloseTo(observation.requestedAt - observation.age, 12);
      else expect(observation.sampledAt).toBeNull();
    }
    const saved = JSON.stringify(trace.steps);
    on.sim.slot('CB_W')!.body.pos.x += 100;
    expect(JSON.stringify(trace.steps)).toBe(saved);
  });

  it('attributes a runnerward facing rewrite to actual engagement technique, with the velocity retained where appropriate', () => {
    // Staged contact island, not a restorable NFL/native-game checkpoint.
    const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1, seed: 11 });
    f.defender.behavior = { kind: 'pursuit', update: () => ({ vel: { x: -5, y: 2 }, facing: 1.1 }) };
    const trace = f.sim.recordCommands({ actor: { playerId: f.defender.player.id }, from: 1, to: 1.05 });
    f.sim.tick();
    const step = trace.steps[0], raw = step.decision!.raw;
    const engagement = step.rewrites.find(r => r.stage === 'engagement')!;
    expect(step.start.engagement).not.toBeNull();
    expect(raw.facing).toBe(1.1);
    expect(engagement).toBeDefined();
    expect(engagement.command.facing).not.toBe(raw.facing);
    expect(engagement.command.push).toBeDefined();
    expect(step.decision!.owner.kind).toBe('pursuit');
    expect(step.final).toBeDefined();
    expect(step.endpoint!.body.velocity).toEqual(f.defender.vel);
  });

  it('shows the snap guard superseding contact technique without evaluating the waiting controller', () => {
    const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1, seed: 11 });
    f.defender.snapReadyAt = 2;
    const update = vi.fn(() => ({ vel: { x: 9, y: 0 } }));
    f.defender.behavior = { kind: 'waiting-test', update };
    const trace = f.sim.recordCommands({ actor: { team: 'D', slot: f.defender.slot }, from: 1, to: 1.05 });
    f.sim.tick();
    const step = trace.steps[0];
    expect(update).not.toHaveBeenCalled();
    expect(step.decision!.evaluated).toBe(false);
    expect(step.rewrites.some(r => r.stage === 'engagement')).toBe(true);
    expect(step.rewrites.at(-1)!.stage).toBe('snap-guard');
    expect(step.final!.vel).toEqual({ x: 0, y: 0 });
  });

  it('rejects an unavailable actor and invalid windows without falling back to all-player recording', () => {
    const sim = new PlaySim(nativeTraceSetup(input));
    expect(() => sim.recordCommands({ ...selection, actor: { playerId: 'absent' } })).toThrow('exactly one actor');
    for (const [from, to] of [[-1, 1], [1, 1], [1, Infinity], [NaN, 2]])
      expect(() => sim.recordCommands({ ...selection, from, to })).toThrow('finite seconds');
    const trace = sim.recordCommands({ ...selection, from: 10, to: 11 });
    sim.tick();
    expect(trace.steps).toEqual([]);
  });
});
