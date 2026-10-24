/** TKL-2 effort-only comparison. Reuses #263's frozen bodies, forecast and
 * production-World response; geometry, profiles and actual requests stay fixed. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { interceptPoint, type InterceptPrediction, type SprintRequest } from '../../src/physics/reach.js';
import type { CommandTraceStep } from '../../src/sim/command-trace.js';
import { arrivalJson, parseArrivalJson, restoreBody, forecast, response, type ArrivalBundle,
  type ArrivalCase, type Objective } from './pursuit-arrival.js';
import { bytesHash, compareExecution, executionIdentity, firstDifference, readSavedPlay, runRestoredPlay } from './saved-play.js';

function sprintRequest(c: ArrivalCase): SprintRequest {
  const chase = c.trace.pursuit?.find(r => r.data.kind === 'chase')?.data;
  const command = chase?.kind === 'chase' ? chase.requests.find(r => r.stage === 'intercept-sprint')?.command : c.trace.final;
  if (!command) throw new Error('No recorded interception sprint');
  const body = restoreBody(c);
  // Production chase chooses speed=effort; avoid recovering the fraction by
  // a norm/division that would perturb it at roundoff precision.
  const effort = command.effort ?? 1;
  if (Math.abs(Math.hypot(command.vel.x, command.vel.y) - body.profile.vmax * effort) > 1e-8)
    throw new Error('This bounded fixture does not contain the ordinary chase sprint request');
  return { speed: effort, effort };
}

export function compareFrozenEffort(bundle: ArrivalBundle) {
  return { schema: 'pursuit-effort-frozen-v1', execution: executionIdentity(),
    inputSha256: bytesHash(Buffer.from(arrivalJson(bundle))),
    cases: bundle.cases.map(c => {
      if (!c.intercept) return { id: c.id, source: c.source, active: false, reason: 'close-gather-planner-bypass',
        actor: c.actor, trace: c.trace };
      const p = c.intercept, body = restoreBody(c), request = sprintRequest(c);
      const current = interceptPoint({ pos: body.pos, vel: body.vel, profile: body.profile, speedScale: p.pursuer.speedScale },
        t => forecast(p, t), { horizon: p.prediction.estimate.horizon, step: p.prediction.estimate.step,
          radius: p.prediction.estimate.radius, request, recordSamples: true });
      const trials = ([['baseline-full-estimate', p.prediction], ['requested-budget-estimate', current]] as const)
        .map(([arm, prediction]) => {
          // t=0 fallback is not a proposed future interception. Retain it,
          // and measure its held-point response over the declared horizon.
          const horizon = prediction.t > 0 ? prediction.t : prediction.estimate.horizon;
          const objective: Objective = { id: arm, point: prediction.point, horizon,
            radius: prediction.estimate.radius, information: 'consumed-forecast',
            pointSource: 'recorded-estimator-sample', forecastHeading: p.forecast.heading };
          const r = response(c, objective, 'seek-candidate');
          if (prediction.t === 0) {
            r.metrics.runnerForecastError = null;
            r.metrics.runnerForecastErrorAlong = null; r.metrics.runnerForecastErrorLeft = null;
          }
          return { arm, prediction, response: r, deadlineMeaning: prediction.t > 0
            ? 'selected-sample-time; fallback-is-not-a-feasibility-claim' : 'diagnostic-horizon-for-t0-fallback-point' };
        });
      return { id: c.id, source: c.source, actor: c.actor, target: c.target, bodySha256: c.bodySha256,
        clock: c.clock, active: request.effort < 1, request,
        pointChanged: Math.hypot(current.point.x - p.prediction.point.x, current.point.y - p.prediction.point.y) > 1e-8,
        originalAppliedRequest: c.trace.final, trials,
        steeringPointEstimate: 'not-evaluated; sampled-point-only comparison, original bias/shade not recomputed here' };
    }) };
}

function plan(step: CommandTraceStep) {
  const p = step.pursuit?.find(p => p.data.kind === 'intercept')?.data;
  const q = step.pursuit?.find(p => p.data.kind === 'chase')?.data;
  return { at: step.stepStart, actor: step.actor, owner: step.decision?.owner,
    raw: step.decision?.raw, final: step.final, rewrites: step.rewrites,
    bodyBefore: step.start.body, bodyAfter: step.endpoint?.body,
    prediction: p?.kind === 'intercept' ? p.prediction : null,
    steeringPoint: p?.kind === 'intercept' ? p.steeringPoint : null,
    steeringPointEstimate: p?.kind === 'intercept' ? p.steeringPointEstimate : null,
    planner: q?.kind === 'chase' ? q.planner : null,
    sprint: q?.kind === 'chase' ? q.requests.find(r => r.stage === 'intercept-sprint')?.command : null,
    contact: step.endpoint?.lastStepContacts, tackleBond: step.endpoint?.tackleBond };
}

export function compareNativeEffort(capture: string, baselineTrace: string, slot: string) {
  const saved = readSavedPlay(capture), before = JSON.parse(readFileSync(baselineTrace, 'utf8'));
  const plain = runRestoredPlay(saved);
  const traced = runRestoredPlay(saved, { actor: { team: 'D', slot }, from: 0, to: 15 });
  const observer = compareExecution(plain.execution, traced.execution);
  const state = (r: typeof plain) => ({ bodies: r.sim.agents.map(a => a.body), rng: r.sim.rng,
    minds: r.sim.agents.map(a => a.mind) });
  const observerState = firstDifference(state(plain), state(traced));
  if (observer || observerState) throw new Error(`Observer changed execution: ${JSON.stringify(observer ?? observerState)}`);
  const steps = traced.trace!.steps;
  const oldSteps = before.steps as CommandTraceStep[];
  const oldPlans = oldSteps.map(plan), newPlans = steps.map(plan);
  let firstRequestChange: unknown = null;
  for (const step of steps) {
    const old = oldSteps.find(s => Math.abs(s.stepStart - step.stepStart) < 1e-7);
    if (!old) continue;
    const raw = old.decision?.raw.vel, next = step.decision?.raw.vel;
    if (raw && next && Math.hypot(raw.x - next.x, raw.y - next.y) > 1e-8) {
      firstRequestChange = { at: step.stepStart, before: plan(old), after: plan(step),
        matchedBodyBefore: firstDifference(old.start.body, step.start.body) }; break;
    }
  }
  const checks = steps.flatMap(step => {
    const p = step.pursuit?.find(r => r.data.kind === 'intercept')?.data;
    const q = step.pursuit?.find(r => r.data.kind === 'chase')?.data;
    if (p?.kind !== 'intercept' || q?.kind !== 'chase') return [];
    const sprint = q.requests.find(r => r.stage === 'intercept-sprint' || r.stage === 'held-tackle')?.command;
    const budget = p.prediction.estimate.request;
    const profile = traced.sim.agents[step.actor.index].profile;
    if (!sprint || !budget) throw new Error('No explicit native request budget');
    if (sprint.effort !== budget.effort || Math.abs(Math.hypot(sprint.vel.x, sprint.vel.y) - profile.vmax * budget.speed) > 1e-8)
      throw new Error('Native estimate/emitted sprint budget differs');
    return [{ at: step.stepStart, effort: budget.effort, speed: budget.speed, status: p.prediction.estimate.status,
      laterStages: step.rewrites.map(r => r.stage), actualFinalEffort: step.final?.effort ?? 1 }];
  });
  return { schema: 'pursuit-effort-native-v1', source: executionIdentity(), originalSource: saved.identity,
    playId: saved.game.playId, setupSha256: saved.setupSha256, gamePrefix: saved.game, selection: traced.trace!.selection,
    observerDifference: observer, observerStateDifference: observerState,
    wholePlayFirstDifference: traced.difference,
    firstSelectedRequestChange: firstRequestChange,
    result: { before: { outcome: saved.original.result.outcome, yards: saved.original.result.yards, duration: saved.original.result.duration },
      after: { outcome: traced.execution.result.outcome, yards: traced.execution.result.yards, duration: traced.execution.result.duration } },
    baselinePlans: oldPlans, candidatePlans: newPlans, requestChecks: checks,
    baselineEvents: saved.original.result.events, candidateEvents: traced.execution.result.events,
    candidateTrace: { meta: { ...executionIdentity(), selection: traced.trace!.selection },
      verification: { originalVsPlain: plain.difference, originalVsTrace: traced.difference, traceVsPlain: observer, setupSha256: saved.setupSha256 }, steps } };
}

function main() {
  const { values: v } = parseArgs({ options: { frozen: { type: 'string' }, capture: { type: 'string' },
    baseline: { type: 'string' }, actor: { type: 'string', default: 'FS' }, out: { type: 'string', default: 'out/effort/result.json' } } });
  if (!!v.frozen === !!v.capture) throw new Error('Use --frozen INPUT or --capture PLAY --baseline TRACE [--actor SLOT]');
  const result = v.frozen ? compareFrozenEffort(parseArrivalJson(readFileSync(v.frozen, 'utf8')))
    : compareNativeEffort(v.capture!, v.baseline!, v.actor!);
  mkdirSync(dirname(v.out!), { recursive: true }); writeFileSync(v.out!, arrivalJson(result));
  console.log(v.out);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
