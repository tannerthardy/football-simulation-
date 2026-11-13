import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import * as Reach from '../src/physics/reach.js';
import { chase } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { captureOrdinaryPlay } from '../scripts/diag/capture-game-play.js';
import { compareExecution, initialState, replayState, restoreSetup } from '../scripts/diag/saved-play.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

/** Four fixed capacities used only by this scalar estimator; not a World-body fixture.
 * Point/time/path-call references recorded on accepted 2f7ac93c, before this interface change. */
const profile = { vmax: 8, tau: 1, brake: 8, lateral: 6 } as PhysicalProfile;
const cases = [
  { name: 'aligned/head-on', vel: { x: 4, y: 0 }, path: (t: number) => ({ x: 12 - 3 * t, y: 0 }),
    t: 1.3, point: { x: 8.1, y: 0 }, calls: 15, arrival: 1.2869432475313136, feasible: true },
  { name: 'transverse momentum', vel: { x: 0, y: 7 }, path: (t: number) => ({ x: 12 - 3 * t, y: 0 }),
    t: 2.1000000000000005, point: { x: 5.699999999999998, y: 0 }, calls: 23, arrival: 1.9545303662024693, feasible: true },
  { name: 'faster crossing with an intercepting position', vel: { x: 4, y: 0 }, path: (t: number) => ({ x: 6, y: -12 + 10 * t }),
    t: 1.0999999999999999, point: { x: 6, y: -1.0000000000000018 }, calls: 13, arrival: 1.046440578616129, feasible: true },
  { name: 'escaping target / no estimated feasible candidate', vel: { x: 4, y: 0 }, path: (t: number) => ({ x: 60 + 10 * t, y: 15 }),
    t: 0, point: { x: 60, y: 15 }, calls: 32, arrival: 8.238949528233872, feasible: false },
];

describe('approximate interception prediction contract', () => {
  it.each(cases)('preserves the frozen $name selection and prediction count, with an honest status', c => {
    const mover = { pos: { x: 0, y: 0 }, vel: c.vel, profile };
    const path = vi.fn(c.path);
    const plain = Reach.interceptPoint(mover, path, { horizon: 3, step: .1, radius: .7 });
    expect(plain.t).toBe(c.t); expect(plain.point).toEqual(c.point);
    expect(path).toHaveBeenCalledTimes(c.calls);
    expect(plain.estimate).toMatchObject({ status: c.feasible ? 'estimated-feasible' : 'fallback-no-estimated-feasible-candidate',
      horizon: 3, step: .1, radius: .7, arrivalTime: c.arrival, slack: c.t - c.arrival, physicalGuarantee: false });
    expect(plain.estimate.assumptions.omitted).toContain('body facing/yaw');
    expect(plain.samples).toBeUndefined();
    path.mockClear();
    const recorded = Reach.interceptPoint(mover, path, { horizon: 3, step: .1, radius: .7, recordSamples: true });
    expect(recorded.t).toBe(c.t); expect(recorded.point).toEqual(c.point);
    expect(recorded.estimate).toEqual(plain.estimate);
    expect(path).toHaveBeenCalledTimes(c.calls); // Recording never adds a path sample or estimator step.
    expect(recorded.samples).toHaveLength(c.calls - 1); // Existing horizon path initialization is not an evaluated candidate.
    expect(recorded.samples!.filter(s => s.estimatedFeasible)).toHaveLength(c.feasible ? 1 : 0);
    if (c.feasible) expect(recorded.samples!.at(-1)!.t).toBe(c.t);
    else expect(recorded.samples!.every(s => s.slack < 0)).toBe(true);
  });

  it('records close gathering as a planner bypass without calling the intercept planner', () => {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed: 19, roster: 7, formation: 'gun_doubles_11', flip: false }));
    const defender = sim.slot('FS')!, runner = sim.slot('Z')!;
    defender.body.pos = { x: 51, y: 31.5 }; defender.body.vel = { x: 0, y: -3 };
    const see = vi.spyOn(sim, 'see').mockReturnValue({ pos: { x: 50, y: 30 }, vel: { x: 6, y: 0 },
      facing: 0, stance: null, carrying: true, age: .2 });
    const planner = vi.spyOn(Reach, 'interceptPoint');
    try {
      const before = chase(sim, defender, runner);
      const reads = see.mock.calls.length;
      const trace = sim.recordCommands({ actor: { team: 'D', slot: 'FS' }, from: 0, to: .05 });
      trace.begin(sim); // Pure helper contract, not a native-game checkpoint or extra World step.
      const after = chase(sim, defender, runner); trace.finish(sim);
      expect(after).toEqual(before);
      expect(planner).not.toHaveBeenCalled();
      expect(see.mock.calls.length).toBe(reads * 2);
      expect(trace.steps[0].pursuit).toHaveLength(1);
      const record = trace.steps[0].pursuit![0].data;
      expect(record.kind).toBe('chase');
      if (record.kind === 'chase') {
        expect(record.planner).toBe('bypassed-close-gather'); expect(record.gather).toBe(1);
        expect(record.requests.map(r => r.stage)).toEqual(['close-gather']);
      }
    } finally { vi.restoreAllMocks(); }
  });

  it('preserves a whole ordinary play and its prediction/read/draw/physics counts with selected diagnostics enabled', () => {
    // The game's first caught ball, so the safety pursues a carrier whatever the earlier snaps did.
    // Seed 8: when an overtaken zone member began climbing, seed 7's earlier run snaps changed and its
    // first catch became one where SS makes no pursuit prediction. Seed 8's first catch is the same
    // capture with and without that change (58 SS predictions, 29 intercept). Same reasoning as
    // pursuit-arrival's move to seed 8.
    const saved = captureOrdinaryPlay({ seed: 8, play: 'first-catch', minPlay: 1, maxSteps: 20 }).saved;
    const original = Reach.interceptPoint;
    const execute = (record: boolean) => {
      let pathCalls = 0;
      const planner = vi.spyOn(Reach, 'interceptPoint').mockImplementation((m, path, opts) => original(m,
        t => { pathCalls++; return path(t); }, opts));
      const draws = vi.spyOn(Rng.prototype, 'nextU32');
      const sim = new PlaySim(restoreSetup(saved.setup)), initial = initialState(sim);
      const reads = vi.spyOn(sim.perception, 'perceive'), steps = vi.spyOn(sim.world, 'step');
      // The safety who pursues this catch: on the engaged-flow law (#347) the game's first catch is a different
      // play, and its pursuing safety is FS (the SS never chases it).
      const trace = record ? sim.recordCommands({ actor: { team: 'D', slot: 'FS' }, from: 0, to: 30 }) : undefined;
      const result = sim.run();
      const execution = { initial, result, replay: replayState(sim, result, saved.context) };
      const counts = { planner: planner.mock.calls.length, paths: pathCalls, reads: reads.mock.calls.length,
        draws: draws.mock.calls.length, steps: steps.mock.calls.length };
      const state = structuredClone({ bodies: sim.agents.map(a => a.body), minds: sim.agents.map(a => a.mind), rng: sim.rng });
      vi.restoreAllMocks(); return { execution, counts, state, trace };
    };
    const off = execute(false), on = execute(true);
    expect(off.counts.planner).toBeGreaterThan(0); expect(off.counts.paths).toBeGreaterThan(off.counts.planner);
    expect(on.counts).toEqual(off.counts);
    expect(on.state).toEqual(off.state);
    expect(compareExecution(saved.original, off.execution)).toBeNull();
    expect(on.execution).toStrictEqual(off.execution);
    const predictions = on.trace!.steps.flatMap(s => s.pursuit ?? []).map(p => p.data);
    expect(predictions.some(p => p.kind === 'intercept')).toBe(true);
    for (const p of predictions) if (p.kind === 'intercept') {
      expect(p.prediction.estimate.physicalGuarantee).toBe(false);
      expect(p.estimateAppliesTo).toBe('sampled-point-before-bias-and-leverage');
      expect(p.steeringPointEstimate).toBe('not-evaluated');
      expect(p.prediction.samples!.length).toBeGreaterThan(0);
    }
  });
});
