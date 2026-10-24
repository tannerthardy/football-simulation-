import { beforeAll, describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { Agent } from '../src/sim/agent.js';
import { CASES, caseInput, execute, runExperiment } from '../scripts/diag/rating-channels.js';
import { captureSetup, restoreSetup } from '../scripts/diag/saved-play.js';

describe('RAT-3 fixed-lineup diagnostic contract', () => {
  let report: ReturnType<typeof runExperiment>;
  const rngDraw = Rng.prototype.nextU32, ratingRead = Agent.prototype.r;
  beforeAll(() => { report = runExperiment(); }, 30000);

  it('separates actual roster choice from weighted suitability and fixed execution', () => {
    const s = report.selection[0];
    expect(s.arms.map(a => a.normalized)).toEqual([0, .5, 1]);
    expect(s.arms[1].roleScores.FB_LEAD - s.arms[0].roleScores.FB_LEAD).toBeCloseTo(49 * 3 / 8);
    expect(s.arms[1].roleScores.TE_H - s.arms[0].roleScores.TE_H).toBeCloseTo(49 * 2 / 6);
    expect(s.arms.map(a => a.selectedCandidateAtOriginalSlot)).toEqual([false, true, true]);
    const h = report.selection.find(s => s.slot === 'H')!;
    expect(h.arms[1].roleScores.TE_H - h.arms[0].roleScores.TE_H).toBeCloseTo(49 * 2 / 6);
    for (const a of h.arms) expect(a.selectorScore).toBe(Math.max(a.roleScores.TE_H, a.roleScores.TE_F));
    const c = report.cases[0];
    expect(c.arms[1].trace![0].start.behavior.job).toBe('lead');
    for (const d of c.comparisons) {
      expect(d.firstCommandDifference).toBeNull(); expect(d.firstMovementDifference).toBeNull();
      expect(d.firstRandomConsumptionDifference).toBeNull(); expect(d.finalStateEquals50).toBe(true);
      expect(d.constructorTraitReads + d.runtimeTraitReads).toBe(0);
    }
  });

  it('rebuilds cached recognition rather than mutating only an unused rating field', () => {
    const c = report.cases[1];
    const cached = (i: number) => c.arms[i].initial.recognition!;
    expect(cached(0).gain).toBe(1.4); expect(cached(2).gain).toBe(3.6);
    expect(cached(0).tau).toBe(.4); expect(cached(2).tau).toBe(.1);
    expect(c.arms[0].initial.decisionInterval).toBeGreaterThan(c.arms[2].initial.decisionInterval);
    expect(c.arms[0].initial.reactionTime - c.arms[2].initial.reactionTime).toBeCloseTo(.156);
    for (const a of c.arms) {
      expect(a.initial.lineup).toEqual(c.arms[1].initial.lineup);
      expect(a.initial.profilePins).toEqual(c.arms[1].initial.profilePins);
      expect(a.initial.bodies).toEqual(c.arms[1].initial.bodies);
    }
    for (const d of [c.comparisons[0], c.comparisons[2]]) {
      expect(d.constructorTraitReads).toBeGreaterThan(0); expect(d.runtimeTraitReads).toBe(0);
      expect(d.firstReadDifference).not.toBeNull(); expect(d.firstCommandDifference).not.toBeNull();
      expect(d.firstMovementDifference).not.toBeNull();
      expect(d.firstRandomConsumptionDifference).toBeNull();
    }
  });

  it('retains the opposing play-action effects instead of requiring monotonic performance', () => {
    const c = report.cases[1];
    const reads = c.arms.map(a => a.readEvents.map(e => ({ t: e.t, read: e.note?.split(';')[0] })));
    expect(reads[0].some(e => e.read === 'run')).toBe(false);
    expect(reads[2][0].read).toBe('run');
    expect(reads[2].find(e => e.read === 'pass')!.t).toBeLessThan(reads[1].find(e => e.read === 'pass')!.t);
    expect(c.comparisons[2].firstOtherBodyDifference!.time).toBeGreaterThan(c.comparisons[2].firstCommandDifference!.time);
  });

  it('allows identical commands under no new information while cached traits still differ', () => {
    const c = report.cases[2];
    expect(c.arms[0].initial.recognition).not.toEqual(c.arms[2].initial.recognition);
    for (const d of c.comparisons) {
      expect(d.evaluatedDecisionIntervals).toBe(0);
      expect(d.firstReadDifference).toBeNull(); expect(d.firstCommandDifference).toBeNull();
      expect(d.firstMovementDifference).toBeNull();
    }
  });

  it('replays authoritative constructor bytes and restores diagnostic hooks', () => {
    const c = CASES[1], bytes = caseInput(c), original = Buffer.from(bytes);
    const a = execute(c, bytes, 99), b = execute(c, bytes, 99, false);
    expect(bytes).toEqual(original); expect(a.finalStateSha256).toBe(b.finalStateSha256);
    expect(Rng.prototype.nextU32).toBe(rngDraw); expect(Agent.prototype.r).toBe(ratingRead);
    expect(() => execute(c, bytes, NaN)).toThrow();
    expect(Rng.prototype.nextU32).toBe(rngDraw); expect(Agent.prototype.r).toBe(ratingRead);
  });

  it('preserves an advanced constructor RNG including its cached normal draw', () => {
    const c = CASES[2], setup = restoreSetup(caseInput(c)), rng = new Rng(83);
    rng.normal(0, 1); setup.seed = rng;
    const bytes = captureSetup(setup), restored = restoreSetup(bytes);
    expect(restored.seed).toEqual(rng);
    const a = execute(c, bytes, 1), b = execute(c, bytes, 99);
    expect(a.initial.rng).toEqual(b.initial.rng);
    expect(a.initial.constructorRandomStates).toEqual(b.initial.constructorRandomStates);
    expect(a.initial.constructorDraws).toEqual(b.initial.constructorDraws);
    expect(restoreSetup(bytes).seed).toEqual(rng);
  });
});
