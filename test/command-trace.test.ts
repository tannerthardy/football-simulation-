import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { PlaySim } from '../src/sim/playsim.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';
import type { CommandTraceSelection } from '../src/sim/command-trace.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const input = { coverage: 'cover3_buzz', concept: 'curl_flat', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false };
// Re-selected under the leg force-velocity law (PHY-1): seed 1 now ends incomplete.
// Seed 8 is the same call with a caught ball against CB_W's man coverage of X.
// Start law (#336): seed 8's throw leaves at 2.9 s (2.65 before) and is caught
// at 4.2 s (3.5); the capture runs to 4.35 s to keep the catch and next step.
// Re-selected for the direction-free start (#353): the first divergence is at
// the snap tick (the C's backward set and the RB's angled start, below-cap
// requests now starting at full force), and CB_W's own pedal starts the same
// way (t 0.40: lift 14.3 -> 20.1). His pedal is about 0.1 s ahead, so on
// curl_flat X never consumes the cushion and CB_W never opens his hips (seeds
// 1-70; all twelve of seeds 1-12 opened near 1.45 s before). On four_verts,
// same seed, X runs at him: CB_W opens at 1.9 s, the throw is caught at
// 3.95 s, and the same 2-4.35 s window holds the free step, catch and next step.
// With the edge kick that stops matching the rusher's retreat once deeper than its lead, seed 8's four_verts
// ends incomplete; seed 6 (the lowest four_verts seed that completes and keeps every property here) is caught
// at 4.05 s with CB_W in man on X, inside the same window.
// The QB's throwing motion (load and delivery, ~0.4 s) moves seed 6's release and it no longer completes;
// seed 13 (the lowest four_verts seed that completes and keeps every property here) is caught at 4.25 s
// with CB_W in man on X, inside the same window.
const caught = { ...input, concept: 'four_verts', seed: 13 };
const selection: CommandTraceSelection = { actor: { team: 'D', slot: 'CB_W' }, from: 2, to: 4.35 };

describe('selected command attribution in normal execution', () => {
  it('preserves the complete native play, reads, decisions, steps and RNG while attributing the catch command to coverage', () => {
    const execute = (record: boolean) => {
      const draws = vi.spyOn(Rng.prototype, 'nextU32');
      const sim = new PlaySim({ ...nativeTraceSetup(caught), record: true, recordLevel: 'full' });
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
    // INFO-1 deliberately removes the catch's global controller broadcast.
    // Attribution still distinguishes evaluated and endpoint ownership, and
    // the existing complete observer-off/on equality remains mandatory.
    expect(catchStep.endpoint!.behavior.controller).toBe('CoverageDefender');
    expect(catchStep.endpoint!.behavior.kind).toBe('man');
    expect(catchStep.endpointTime).toBeCloseTo(catchStep.stepStart + on.sim.dt, 10);
    const nextDecision = trace.steps.find(s => s.stepStart === catchStep.endpointTime)!.decision!;
    expect(nextDecision.owner.controller).toBe('CoverageDefender');
    expect(nextDecision.owner.kind).toBe('man');
    expect(nextDecision.owner.target?.slot).toBe('X');
    expect(nextDecision.owner.targetSource).toBe('stored-target');
    expect(trace.steps.every(s => s.stepStart >= selection.from && s.stepStart < selection.to && s.actor.playerId === trace.actor.playerId)).toBe(true);
    expect(trace.steps[0].actor).toEqual({ playerId: on.sim.slot('CB_W')!.player.id, team: 'D', slot: 'CB_W', index: on.sim.slot('CB_W')!.idx });
    const free = trace.steps.find(s => s.stepStart === 2)!;
    expect(free.start.engagement).toBeNull();
    // Free coverage: only his own orientation technique sets the hips.
    expect(free.rewrites.map(r => r.stage)).toEqual(['coverage-orientation']);
    expect(free.decision!.raw.facingTechnique).toBe('man-open');
    expect(free.final).toEqual({ ...free.decision!.raw, facing: free.rewrites[0].command.facing });
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

  it('attributes a runnerward facing rewrite to actual engagement technique', () => {
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

/** Staged recorder controls, not substitutes for the saved Phase II witnesses. */
function blockingFixture(options: { stable?: boolean; combination?: boolean; noReplacement?: boolean } = {}) {
  const sim = new PlaySim(nativeTraceSetup({ ...input, concept: 'iz_strong', formation: 'ace_11' }));
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  const blocker = sim.slot('C')!, helper = sim.slot('RG')!, old = sim.slot('DT_W')!, next = sim.slot('SS')!;
  blocker.body.pos = { x: sim.los + 1, y: sim.ballY };
  old.body.pos = { x: sim.los + 3, y: sim.ballY };
  old.downUntil = options.stable ? 0 : 10;
  if (!options.noReplacement) next.body.pos = { x: sim.los + 4, y: sim.ballY };
  sim.qb.body.pos = { x: sim.los - 4, y: sim.ballY };
  const work = new RunBlocker({ kind: options.combination ? 'combo' : 'lead', target: old, drive: { x: 1, y: 0 } });
  blocker.behavior = work;
  if (options.combination) {
    const combo: Combination = { members: [blocker, helper], defender: old, backer: null,
      released: false, secureSince: -1, nextRead: 0, soloKind: 'reach' };
    work.plan.combination = combo;
    helper.behavior = new RunBlocker({ kind: 'combo', target: old, drive: { x: 1, y: 0 }, combination: combo });
  }
  sim.t = 1; sim.world.time = 1;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, blocker, helper, old, next };
}

describe('blocking responsibility in the existing command trace', () => {
  it('records a silent native find-work replacement without changing commands, reads, events, minds or RNG', () => {
    const execute = (record: boolean) => {
      const f = blockingFixture();
      const trace = record ? f.sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 1, to: 1.05 }) : undefined;
      const commands: unknown[] = [], owner = f.blocker.behavior, update = owner.update;
      owner.update = (a, sim) => {
        const command = update.call(owner, a, sim);
        commands.push(structuredClone(command));
        return command;
      };
      const reads = vi.spyOn(f.sim, 'see'), draws = vi.spyOn(Rng.prototype, 'nextU32');
      f.sim.tick();
      const counts = { reads: reads.mock.calls.length, draws: draws.mock.calls.length };
      vi.restoreAllMocks();
      return { f, trace, counts, state: structuredClone({ bodies: f.sim.agents.map(a => a.body),
        minds: f.sim.agents.map(a => a.mind), rng: f.sim.rng, commands, intents: f.sim.intents }),
        result: f.sim.buildResult() };
    };
    const off = execute(false), on = execute(true);
    expect(on.state).toEqual(off.state);
    expect(on.result).toEqual(off.result);
    expect(on.counts).toEqual(off.counts);
    expect(on.result.events.some(e => e.type === 'block_threat')).toBe(false);
    const step = on.trace!.steps[0], changes = step.blockingChanges!;
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ actor: { slot: 'C', playerId: on.f.blocker.player.id }, t: 1,
      phase: 'decision', reason: 'available-target/find-work',
      previous: { target: { slot: 'DT_W' }, workKind: 'lead' }, current: { target: { slot: 'SS' }, workKind: 'lead' } });
    expect(step.endpointTime).toBe(1.05);
    expect(step.endpoint!.behavior.target?.index).toBe(on.f.next.idx);
    const saved = JSON.stringify(step);
    (on.f.blocker.behavior as RunBlocker).plan.target = null;
    on.f.next.body.pos.x += 100;
    expect(JSON.stringify(step)).toBe(saved);
  });

  it('keeps kind-only abandonment and the subsequent target replacement as a chained history', () => {
    const f = blockingFixture({ combination: true });
    const trace = f.sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 1, to: 1.05 });
    f.sim.tick();
    const changes = trace.steps[0].blockingChanges!;
    expect(changes).toHaveLength(2);
    expect(changes[0].previous).toMatchObject({ workKind: 'combo', target: { slot: 'DT_W' } });
    expect(changes[0].current).toMatchObject({ workKind: 'reach', target: { slot: 'DT_W' } });
    expect(changes[0].reason).toBe('combination-abandoned: original target unavailable; finding work');
    expect(changes[1].previous).toEqual(changes[0].current);
    expect(changes[1].current).toMatchObject({ workKind: 'climb', target: { slot: 'SS' } });
    expect(changes[1].reason).toBe('available-target/find-work');
  });

  it('records a selected neighbor changing before his own update, rather than assigning the old duty to that update', () => {
    const f = blockingFixture({ combination: true });
    const trace = f.sim.recordCommands({ actor: { team: 'O', slot: 'RG' }, from: 1, to: 1.05 });
    f.sim.tick();
    const step = trace.steps[0], change = step.blockingChanges![0];
    expect(change.actor.index).toBe(f.helper.idx);
    expect(change.previous.workKind).toBe('combo');
    expect(change.current.workKind).toBe('reach');
    expect(change.reason).toBe('combination-abandoned: original target unavailable; finding work');
    expect(step.start.behavior.job).toBe('combo');
    expect(step.decision!.owner.job).toBe('reach');
  });

  it('keeps a real null target and does not record it again when no responsibility changes', () => {
    const f = blockingFixture({ noReplacement: true });
    const trace = f.sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 1, to: 1.1 });
    f.sim.tick(); f.sim.tick();
    expect(trace.steps[0].blockingChanges).toHaveLength(1);
    expect(trace.steps[0].blockingChanges![0].current).toEqual({ target: null, workKind: 'lead' });
    expect(trace.steps[1].blockingChanges).toBeUndefined();
    expect(trace.steps[1].endpoint!.behavior.target).toBeNull();
  });

  it('leaves a stable assignment without invented transition records', () => {
    const f = blockingFixture({ stable: true });
    const trace = f.sim.recordCommands({ actor: { team: 'O', slot: 'C' }, from: 1, to: 1.05 });
    f.sim.tick();
    expect(trace.steps[0].blockingChanges).toBeUndefined();
    expect(trace.steps[0].start.behavior.target?.index).toBe(f.old.idx);
    expect(trace.steps[0].endpoint!.behavior.target?.index).toBe(f.old.idx);
  });
});
