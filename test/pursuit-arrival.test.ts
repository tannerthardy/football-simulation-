import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.BALL_EST = '0'; }); // engine-72: the native pursuit case is found on the direct ball read; the delayed ball estimate (default 6145) leaves no such case in the first six completions; Defense re-finds it with BALL_EST on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { createHash } from 'node:crypto';
import { arrivalJson, captureNativePursuit, compareBundle, forecast, freezeNative, frozenControls, necessaryBound, objectives,
  parseArrivalJson, response, restoreBody, type ArrivalCase } from '../scripts/diag/pursuit-arrival.js';
import { movementPanel } from '../scripts/diag/pursuit-arrival-export.js';

let native: ArrivalCase[];
let chosen: ReturnType<typeof captureNativePursuit>;
beforeAll(() => {
  // The first completed pass of an ordinary game that has a native pursuit
  // case: the first defender who makes exact native intercept decisions on
  // that receiver as a lone, settled body. Choosing the case from the play,
  // rather than pinning a play, actor and clock, keeps these contracts from
  // depending on incidental outcomes (a catch that a changed dice phase or
  // body turns incomplete). Full constructor replay equality is checked
  // inside the capture. Each tried pass replays the game from the kickoff.
  // Seed 8 since #355 + #356 (develop 12d12d5): seed 7's first 6 completions
  // no longer hold a native pursuit case. All 6 contracts pass on seed 8.
  // Seed 8: when backs carried their exchange tempo through the mesh, seed 7's
  // game changed and its first 12 catches had no exact freeze (seed 8 finds
  // FS on Y; the contracts below pass on both sources).
  // Seed 4 on the combined start law + mesh departure with #347: seed 8's first
  // case is now DE_W on Y after a support change (since 7.50, not -Infinity), so
  // it no longer exercises a nonfinite starting history; seed 4 (DE_W on RB) does.
  // With the along-route crease read (#366) as well, seed 4 still captures DE_W
  // on RB (5.80/5.85, since -Infinity); all 6 contracts pass.
  // Seed 6 with the containment bound holding an engaged edge's read flow (RUN-18): seed 4's first 6 completions no
  // longer hold a native pursuit case. Seed 6 passes all 6 contracts on develop 510f7a6a, with the bound, and on the
  // squeeze read (#365) with and without it.
  // Seed 1 with situational safety/corner depth (SITU_DEPTH): seed 6's first 6 completions no longer hold a
  // native pursuit case; seed 1 passes all 6 contracts.
  // Seed 4 with the carrier judging defenders from what he sees (2026-11-17 carrier-honest): seed 1 still holds a
  // case (CB_S on RB) but its search now takes past the hook's minute; seed 4 (CB_S on H) is found in about 18 s.
  // Seed 6 (Defense, 2026-11-25, develop 91cbcfa6): seed 4's search (DT_S on X) now takes past the hook's minute (81.8 s
  // under load; the file had been red since before 67f7cec1); seeds 1-9 all still hold a case, seed 6 (DE_W on Z) is
  // found in about 18 s.
  chosen = captureNativePursuit(6);
}, 60_000);
beforeAll(() => {
  // These clocks nominate pursuit decisions, not an expected football ending.
  const { saved, pick } = chosen;
  native = freezeNative(saved, pick.actorSlot, pick.targetSlot, pick.clocks);
}, 30_000);

describe('frozen native pursuit arrival experiment', () => {
  it('preserves complete starting body/motor history and JSON nonfinite/absent values', () => {
    const restored = parseArrivalJson(arrivalJson(native)) as ArrivalCase[];
    expect(restored).toStrictEqual(native);
    expect(restoreBody(restored[0])).toStrictEqual(restoreBody(native[0]));
    const body = restoreBody(native[0]);
    expect(body.support).toHaveProperty('accel');
    expect(body.support!.since).toBe(-Infinity);
    expect(body).toHaveProperty('spin');
    expect(body).toHaveProperty('sprintLoad');
    expect(() => restoreBody({ ...native[0], bodySha256: 'bad' })).toThrow('checksum');
    expect(parseArrivalJson(arrivalJson({ empty: undefined, clock: Infinity, n: NaN })))
      .toStrictEqual({ empty: undefined, clock: Infinity, n: NaN });
  });

  it('uses recorded candidates verbatim and keeps frozen forecast independent of diagnostic future truth', () => {
    const source = native[1];
    // This is a provenance/independence contract, not a required intercept at
    // 1.8 or 2.8 s. The native estimator exits at its first feasible sample,
    // which can move with incidental RNG phase. Always exercise both sources:
    // one actually sampled point and one point just beyond the sampled range.
    const withBothSources = (c: ArrivalCase): ArrivalCase => {
      const samples = c.intercept!.prediction.samples!;
      const positive = samples.find(s => s.t > 0);
      if (!positive) throw new Error('Arrival fixture needs a positive recorded horizon');
      return { ...c, candidateHorizons: [positive.t, samples.at(-1)!.t + .1] };
    };
    const c = withBothSources(source), before = arrivalJson(c);
    const goals = objectives(c);
    expect(goals).toHaveLength(2);
    // The estimator records samples only up to its first feasible intercept;
    // a candidate beyond it is evaluated offline from the frozen forecast.
    // Which candidates fall inside depends on the recorded play, so each is
    // checked by its own source, and at least one must be a recorded sample.
    const samples = c.intercept!.prediction.samples!;
    expect(goals.some(o => o.pointSource === 'recorded-estimator-sample')).toBe(true);
    for (const o of goals) {
      const sample = samples.find(s => Math.abs(s.t - o.horizon) < 1e-7);
      if (sample) {
        expect(o.point).toStrictEqual(sample.point);
        expect(o.horizon).toBe(sample.t);
        expect(o.pointSource).toBe('recorded-estimator-sample');
      } else {
        expect(o.horizon).toBeGreaterThan(samples.at(-1)!.t);
        expect(o.point).toStrictEqual(forecast(c.intercept!, o.horizon));
        expect(o.pointSource).toBe('offline-evaluation-of-frozen-forecast');
      }
    }
    expect(goals.map(o => o.pointSource)).toEqual([
      'recorded-estimator-sample', 'offline-evaluation-of-frozen-forecast',
    ]);
    // Opposing early/late exits (1.3/2.1 s) must exercise the same exact-source
    // contract. Fixed 1.8/2.8 s goals miss every sample in the early control.
    for (const control of frozenControls(source).slice(0, 2)) {
      const input = withBothSources(control), samples = input.intercept!.prediction.samples!;
      const [recorded, offline] = objectives(input);
      const positive = samples.find(s => s.t > 0)!;
      expect(recorded.point).toStrictEqual(positive.point);
      expect(recorded.horizon).toBe(positive.t);
      expect(recorded.pointSource).toBe('recorded-estimator-sample');
      expect(offline.horizon).toBeGreaterThan(samples.at(-1)!.t);
      expect(offline.point).toStrictEqual(forecast(input.intercept!, offline.horizon));
      expect(offline.pointSource).toBe('offline-evaluation-of-frozen-forecast');
    }
    const changed = parseArrivalJson(before) as ArrivalCase;
    for (const r of changed.native) r.targetAfter.pos = { x: -1e4, y: 1e4 };
    expect(objectives(changed)).toStrictEqual(goals);
    expect(forecast(changed.intercept!, 2.8)).toStrictEqual(forecast(c.intercept!, 2.8));
    // Truth independence needs recorded truth at the goal: the latest goal the play still covers.
    const goal = goals.filter(o => c.clock + o.horizon <= c.native.at(-1)!.end + 1e-7).at(-1)!;
    const baseline = response(c, goal, 'seek-candidate');
    const truthChanged = response(changed, goal, 'seek-candidate');
    expect(truthChanged.rows).toStrictEqual(baseline.rows);
    expect(truthChanged.metrics.runnerForecastError).not.toBe(baseline.metrics.runnerForecastError);
    expect(arrivalJson(c)).toBe(before);
    const pairs = compareBundle({ schema: 'pursuit-arrival-v1', cases: native }).recordedPairTrials;
    expect(pairs).toHaveLength(8);
    for (const p of pairs) {
      const origin = native.find(c => c.id === p.sourceDecision)!;
      expect(p.objectiveAbsoluteTime).toBe(origin.clock + origin.intercept!.prediction.t);
      expect(p.trial.objective.point).toStrictEqual(origin.intercept!.prediction.point);
      expect(p.trial.objective.forecastHeading).toStrictEqual(origin.intercept!.forecast.heading);
      if (p.trial.policy === 'held-recorded') expect(p.trial.rows[1].command).toStrictEqual(origin.trace.final);
      const bodyCase = native.find(c => c.id === p.trial.caseId)!;
      const future = bodyCase.native.find(r => Math.abs(r.end - p.objectiveAbsoluteTime) < 1e-7)!.targetAfter.pos;
      expect(p.trial.metrics.runnerForecastError).toBe(Math.hypot(future.x - p.trial.objective.point.x,
        future.y - p.trial.objective.point.y));
    }
    expect(pairs.some(p => !p.cueAvailableAtBodyClock)).toBe(true);
  });

  it('matches the first native full-body step and existing held-command preview exactly', () => {
    for (const c of native) {
      const body = restoreBody(c), before = arrivalJson(c);
      const t = response(c, objectives(c)[0], 'held-original');
      expect(t.firstNativeStepDifference).toBeNull();
      expect(t.heldCommandPreviewDifference).toBeNull();
      expect(t.rows[0].body.vel).toStrictEqual(body.vel);
      expect(t.rows[0].body.support).toStrictEqual(body.support);
      expect(t.metrics.entryFacing).toBe(body.facing);
      expect(t.metrics.entryTravel).toBe(Math.atan2(body.vel.y, body.vel.x));
      expect(arrivalJson(c)).toBe(before);
    }
  });

  it('keeps the same full body/capacities in each response and reproduces a trial exactly', () => {
    const c = native[1], goal = objectives(c)[0];
    const a = response(c, goal, 'seek-candidate'), b = response(c, goal, 'seek-candidate');
    expect(b).toStrictEqual(a);
    expect(a.rows[0].body).toStrictEqual(response(c, goal, 'held-original').rows[0].body);
    expect(a.clocks.start).toBe(c.clock);
    expect(a.clocks.deadline).toBeCloseTo(c.clock + goal.horizon, 12);
    expect(a.necessaryBound.passingDoesNotProveReachability).toBe(true);
    expect(a.metrics.maxGroundAcceleration).toBeLessThanOrEqual(a.necessaryBound.acceleration + 1e-8);
    const full = response(c, goal, 'seek-candidate', false, undefined, 'estimator-full-effort');
    expect(full.rows[0].body).toStrictEqual(a.rows[0].body);
    expect(full.requestEnvelope.responseEffort).toBe(1);
    expect(full.requestEnvelope.responseRequestedSpeed).toBeCloseTo(restoreBody(c).profile.vmax, 12);
    expect(c.trace.final!.effort).toBe(a.requestEnvelope.nativeEffort);
  });

  it('retains aligned, transverse, faster crossing and no-feasible-candidate opposing inputs', () => {
    const controls = frozenControls(native[0]);
    expect(controls.map(c => c.id)).toEqual(['aligned-head-on', 'transverse-momentum', 'faster-crossing', 'escaping-fallback']);
    const times = [1.3, 2.1, 1.1];
    for (const [k, c] of controls.entries()) {
      const before = arrivalJson(c), p = c.intercept!.prediction;
      expect(c.source.kind).toBe('synthetic');
      if (k < 3) { expect(p.estimate.status).toBe('estimated-feasible'); expect(p.t).toBeCloseTo(times[k], 12); }
      else expect(p.estimate.status).toBe('fallback-no-estimated-feasible-candidate');
      const o = objectives(c)[0];
      for (const policy of ['held-original', 'held-candidate', 'seek-candidate'] as const) {
        const t = response(c, o, policy);
        expect(t.rows[0].body.vel).toStrictEqual(restoreBody(c).vel);
        expect(t.metrics.maxGroundAcceleration).toBeLessThanOrEqual(t.necessaryBound.acceleration + 1e-8);
      }
      const full = response(c, o, 'seek-candidate', false, undefined, 'estimator-full-effort');
      expect(full.rows).toStrictEqual(response(c, o, 'seek-candidate').rows); // already-full-effort opposing cases are inactive
      expect(arrivalJson(c)).toBe(before);
    }
    const b = restoreBody(controls[0]);
    expect(necessaryBound(b, { x: 100, y: 100 }, .1, .7).excluded).toBe(true);
    expect(necessaryBound(b, b.pos, .1, .7).excluded).toBe(false);
  });

  it('exports fixed objective clocks and distinct offline owners; preserves inactive gather arms', () => {
    const gather = parseArrivalJson(arrivalJson(native[0])) as ArrivalCase;
    gather.id = 'declared-close-gather'; gather.intercept = null;
    gather.trace.pursuit = [{ phase: 'decision', target: gather.target, data: { kind: 'chase', planner: 'bypassed-close-gather',
      requestedHorizon: 3, observed: native[0].intercept!.observed, distance: 1, contact: 1.3,
      offset: 0, gather: 1, requests: [{ stage: 'close-gather', command: gather.trace.final! }] } }];
    const bundle = { schema: 'pursuit-arrival-v1' as const, cases: [native[0], gather] };
    const result = compareBundle(bundle), exportData = movementPanel(bundle, result);
    const incompatible = parseArrivalJson(arrivalJson(bundle));
    incompatible.cases[0].source.worldSourceSha256 = 'different movement implementation';
    expect(() => compareBundle(incompatible)).toThrow('Incompatible movement');
    expect(result.trials.filter(t => t.caseId === gather.id).map(t => t.policy)).toEqual(['held-original']);
    expect(exportData.trials.inputSha256).toBe(createHash('sha256').update(exportData.selection).digest('hex'));
    const cases = JSON.parse(exportData.selection).cases;
    expect(cases.find((c: any) => c.id.startsWith(gather.id)).inactiveArms)
      .toEqual(['held-candidate', 'seek-candidate', 'seek-estimator-effort']);
    for (const t of exportData.trials.trials) {
      expect(t.trace.verification).not.toHaveProperty('originalVsPlain'); // no false full-play counterfactual claim
      expect(t.trace.steps[0].decision.owner.controller).toBe('OfflineArrivalExperiment');
      expect(t.trace.steps[0].decision.evaluated).toBe(false);
      expect(t.trace.steps[1].prediction.status).toBe('not-reevaluated-held-experiment');
      const c = cases.find((c: any) => c.id === t.caseId);
      expect(t.trace.steps.at(-1).endpointTime).toBeCloseTo(c.objective.at, 12);
      expect(t.trace.steps[0].actor.playerId).toBe(native[0].actor.playerId);
    }
  });
});
