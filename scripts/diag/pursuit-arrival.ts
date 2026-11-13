/** Bounded TKL-2 experiment. Native constructor replay -> frozen bodies/cues ->
 * isolated production-World responses. Never feeds recorded future motion to a player. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { deserialize, serialize } from 'node:v8';
import { pathToFileURL } from 'node:url';
import { angleDiff, clamp, type Vec2 } from '../../src/core/vec.js';
import type { Body } from '../../src/physics/kinematics.js';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
import { newSupport, supportParams } from '../../src/physics/support.js';
import { interceptPoint } from '../../src/physics/reach.js';
import { World, type Intent } from '../../src/physics/world.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { CommandTraceStep } from '../../src/sim/command-trace.js';
import type { PursuitPredictionRecord } from '../../src/sim/pursuit-prediction.js';
import { captureOrdinaryPlay } from './capture-game-play.js';
import { bytesHash, compareExecution, copySaved, executionIdentity, firstDifference, initialState,
  readSavedPlay, replayState, restoreSetup, type SavedPlay } from '../../scripts/diag/saved-play.js';

type Intercept = Extract<PursuitPredictionRecord, { kind: 'intercept' }>;
type Model = Pick<World, 'handContact' | 'supportModel' | 'handIntegration' | 'constraintWork' |
  'impactTiming' | 'supportIntegration' | 'boundedAttachment'>;
type Identity = CommandTraceStep['actor'];
type State = { pos: Vec2; vel: Vec2; facing: number; energy: number; spin?: number;
  support: Body['support']; sprintLoad?: number; squeeze?: number; squeezeHeading?: number };
const state = (b: Body): State => copySaved({ pos: b.pos, vel: b.vel, facing: b.facing, energy: b.energy,
  spin: b.spin, support: b.support, sprintLoad: b.sprintLoad, squeeze: b.squeeze, squeezeHeading: b.squeezeHeading });
const identity = (a: PlaySim['agents'][number]): Identity => ({ playerId: a.player.id, team: a.team, slot: a.slot, index: a.idx });
const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
const heading = (v: Vec2) => Math.hypot(v.x, v.y) > 1e-9 ? Math.atan2(v.y, v.x) : null;

export interface NativeRow {
  start: number; end: number; before: State; after: State; targetBefore: State; targetAfter: State;
  command: Intent; contactCount: number; jointCount: number; afterBodyV8?: string;
}
export interface ArrivalCase {
  id: string; actor: Identity; target: Identity; clock: number; dt: number;
  /** V8 keeps absent vs undefined and complete nested support/motor history. */
  bodyV8: string; bodySha256: string; model: Model;
  candidateHorizons?: number[];
  intercept: Intercept | null; trace: CommandTraceStep; native: NativeRow[];
  source: { kind: 'native' | 'synthetic'; capture: SavedPlay['identity']; execution: ReturnType<typeof executionIdentity>;
    operatorSha256: string; worldSourceSha256: string;
    setupSha256: string; playId: string; originalOutcome: string; originalYards: number };
}
export interface ArrivalBundle { schema: 'pursuit-arrival-v1'; cases: ArrivalCase[] }
const operatorSha256 = () => bytesHash(readFileSync(new URL(import.meta.url)));
export function worldSourceSha256(): string {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
    ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
  const hash = createHash('sha256');
  for (const file of ['src/physics', 'src/core', 'src/players'].flatMap(files))
    hash.update(file).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
}

/** Preserve nonfinite support clocks and explicit undefined in portable JSON.
 * The authoritative full Body is also V8 encoded, with its own checksum. */
export function arrivalJson(value: unknown): string {
  return JSON.stringify(value, (_, v) => v === undefined ? { $arrivalValue: 'undefined' }
    : typeof v === 'number' && !Number.isFinite(v) ? { $arrivalValue: String(v) }
      : Object.is(v, -0) ? { $arrivalValue: '-0' } : v) + '\n';
}
export function parseArrivalJson(text: string): any {
  function restore(v: any): any {
    if (v && typeof v === 'object') {
      if (Object.keys(v).length === 1 && typeof v.$arrivalValue === 'string') {
        if (v.$arrivalValue === 'undefined') return undefined;
        if (['Infinity', '-Infinity', 'NaN'].includes(v.$arrivalValue)) return Number(v.$arrivalValue);
        if (v.$arrivalValue === '-0') return -0;
        throw new Error('Unknown arrival value tag');
      }
      for (const k of Object.keys(v)) v[k] = restore(v[k]);
    }
    return v;
  }
  return restore(JSON.parse(text));
}

/** Offline acquisition of full states during an exact constructor replay.
 * Wraps this instance's existing World step once, without extra brain/physics calls. */
export function freezeNative(saved: SavedPlay, actorSlot: string, targetSlot: string, clocks: number[]): ArrivalCase[] {
  return freezeNativeAll(saved, actorSlot, targetSlot, clocks).map(c => { if (c instanceof Error) throw c; return c; });
}

/** freezeNative in one replay for many clocks: each clock's case, or the
 * error that clock would raise. The play itself must still reproduce. */
export function freezeNativeAll(saved: SavedPlay, actorSlot: string, targetSlot: string, clocks: number[]): Array<ArrivalCase | Error> {
  const sim = new PlaySim(restoreSetup(saved.setup));
  const initial = initialState(sim);
  const a = sim.defense.find(a => a.slot === actorSlot)!;
  const target = sim.offense.find(a => a.slot === targetSlot)!;
  if (!a || !target) throw new Error('Missing nominated native actor/target');
  const trace = sim.recordCommands({ actor: { playerId: a.player.id }, from: Math.min(...clocks) - 1e-6,
    to: Math.max(...clocks) + 3.05 });
  const rows: NativeRow[] = [], bodies = new Map<number, Buffer>(), decisionBodies = new Map<number, Body>();
  const pursuit = trace.pursuit.bind(trace);
  trace.pursuit = (target, record) => {
    const selected = clocks.find(t => Math.abs(t - sim.t) < 1e-7);
    if (selected !== undefined && !decisionBodies.has(selected)) decisionBodies.set(selected, copySaved(a.body));
    pursuit(target, record);
  };
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (commands, dt) => {
    const start = sim.t, before = state(a.body), targetBefore = state(target.body);
    const selected = clocks.find(t => Math.abs(t - start) < 1e-7);
    if (selected !== undefined) bodies.set(selected, serialize(a.body));
    const command = copySaved(commands[a.idx]!);
    const joints = sim.world.joints.filter(j => (j.a === a.body || j.b === a.body) && (j.kind !== 'grasp' || !j.broken));
    const report = step(commands, dt);
    if (start >= Math.min(...clocks) - 1e-6) rows.push({ start, end: start + dt, before, after: state(a.body),
      targetBefore, targetAfter: state(target.body), command, jointCount: joints.length,
      contactCount: report.contacts.filter(c => c.i === a.idx || c.j === a.idx).length,
      afterBodyV8: selected === undefined ? undefined : serialize(a.body).toString('base64') });
    return report;
  };
  const result = sim.run();
  const difference = compareExecution(saved.original, { initial, result, replay: replayState(sim, result, saved.context) });
  if (difference) throw new Error(`Native capture does not reproduce on this source: ${JSON.stringify(difference)}`);
  const w = sim.world;
  const model: Model = { handContact: w.handContact, supportModel: w.supportModel, handIntegration: w.handIntegration,
    constraintWork: w.constraintWork, impactTiming: w.impactTiming, supportIntegration: w.supportIntegration,
    boundedAttachment: w.boundedAttachment };
  const execution = executionIdentity(), operator = operatorSha256(), worldSource = worldSourceSha256();
  return clocks.map((clock): ArrivalCase | Error => {
    const bytes = bodies.get(clock), row = trace.steps.find(s => Math.abs(s.stepStart - clock) < 1e-7);
    if (!bytes || !row) return new Error(`No exact native decision at ${clock}`);
    const changedBody = firstDifference(decisionBodies.get(clock), deserialize(bytes));
    if (changedBody) return new Error(`Body changed between consumed helper and execution boundary: ${JSON.stringify(changedBody)}`);
    const intercept = row.pursuit?.find(r => r.data.kind === 'intercept')?.data as Intercept | undefined;
    if (intercept && distance(intercept.pursuer.position, deserialize(bytes).pos) !== 0)
      return new Error('Body changed between helper and execution boundary');
    return { id: `${saved.game.playId}-${actorSlot}-${clock.toFixed(2)}`, actor: identity(a), target: identity(target),
      clock: row.stepStart, dt: sim.dt, bodyV8: bytes.toString('base64'), bodySha256: bytesHash(bytes), model,
      intercept: intercept ?? null, trace: row, native: rows.filter(r => r.start >= row.stepStart - 1e-7 && r.start < row.stepStart + 3.01),
      source: { kind: 'native', capture: saved.identity, execution, setupSha256: saved.setupSha256,
        operatorSha256: operator, worldSourceSha256: worldSource,
        playId: saved.game.playId, originalOutcome: result.outcome, originalYards: result.yards } };
  });
}

/**
 * Choose a native pursuit case from a saved completed pass instead of pinning
 * one actor and clock: the catcher is the target, and the first defender (in
 * defensive order, then by clock) whose exact intercept decisions on two
 * consecutive ticks freeze cleanly and replay exactly as a lone body, with
 * each recorded intercept (plus `follow` seconds) inside the play and his
 * request below full effort, is returned. A changed engine can move the play; this
 * keeps the experiment on a real pursuit of the actual ball carrier.
 */
export function findNativePursuit(saved: SavedPlay, follow = .1, settle = 1, moving = 1): { actorSlot: string; targetSlot: string; clocks: number[] } {
  const probe = new PlaySim(restoreSetup(saved.setup)), result = saved.original.result, dt = probe.dt;
  const receiver = probe.offense.find(a => a.player.id === result.stats.receiver);
  const caught = result.events.find(e => e.type === 'catch')?.t;
  if (!result.stats.completed || !receiver || caught === undefined) throw new Error('Pursuit case needs a completed pass');
  for (const d of probe.defense) {
    // A plain traced replay finds his candidate decisions: a real chase of the
    // receiver, already moving (at least `moving` yd/s), below full effort (so the estimator-full-effort arm is a real
    // comparison), with the recorded point ahead of him (a positive sampled
    // horizon) and inside the play, after `settle` s free of contact and
    // joints (world state a lone body does not carry, such as smoothed
    // contact lift, must have died away).
    const sim = new PlaySim(restoreSetup(saved.setup));
    const trace = sim.recordCommands({ actor: { playerId: d.player.id }, from: caught - 1e-6, to: result.duration });
    const actor = sim.defense.find(a => a.player.id === d.player.id)!;
    let touched = -Infinity;
    const step = sim.world.step.bind(sim.world);
    sim.world.step = (commands, h) => {
      const start = sim.t, report = step(commands, h);
      if (report.contacts.some(c => c.i === actor.idx || c.j === actor.idx)
        || sim.world.joints.some(j => j.a === actor.body || j.b === actor.body)) touched = start;
      return report;
    };
    const lastTouch = new Map<number, number>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { lastTouch.set(Math.round(sim.t / dt), touched); tick(); };
    sim.run();
    const chase = (s: CommandTraceStep) => s.pursuit?.some(r => {
      if (r.phase !== 'decision' || r.data.kind !== 'intercept' || r.target.playerId !== receiver.player.id) return false;
      const p = r.data.prediction;
      return p.t >= 2 * dt && !!p.samples?.some(q => q.t > 0) && s.stepStart + p.t + follow <= result.duration + 1e-7;
    }) && (s.final?.effort ?? 1) < 1 && s.stepStart - (lastTouch.get(Math.round(s.stepStart / dt)) ?? -Infinity) >= settle - 1e-7
      && Math.hypot(s.start.body.velocity.x, s.start.body.velocity.y) >= moving;
    const pairs: number[][] = [];
    for (const [k, s] of trace.steps.entries()) {
      const next = trace.steps[k + 1];
      if (next && Math.abs(next.stepStart - s.stepStart - dt) < 1e-7 && chase(s) && chase(next)) pairs.push([s.stepStart, next.stepStart]);
    }
    if (!pairs.length) continue;
    // One exact freeze of his candidates. The offline experiment steps his
    // body alone, so its first step and held-command preview must reproduce
    // the native ones.
    const frozen = freezeNativeAll(saved, d.slot, receiver.slot, pairs.flat());
    const exact = (x: ArrivalCase | Error) => !(x instanceof Error) && !!x.intercept
      && x.native[0]?.contactCount === 0 && x.native[0]?.jointCount === 0
      && x.clock + x.intercept.prediction.t + follow <= x.native.at(-1)!.end + 1e-7
      && (({ firstNativeStepDifference: a, heldCommandPreviewDifference: b }) => a === null && b === null)(
        response(x, objectives(x)[0], 'held-original'));
    for (let k = 0; k < pairs.length; k++)
      if (exact(frozen[2 * k]) && exact(frozen[2 * k + 1])) return { actorSlot: d.slot, targetSlot: receiver.slot, clocks: pairs[k] };
  }
  throw new Error('No native pursuit of the receiver freezes on this play');
}

/** The first completed pass of an ordinary game (seeded as capture-game-play)
 * that has a native pursuit case, within `catches` completed passes of one
 * game run. A pass whose receiver is tackled before any chaser's recorded
 * intercept has none. */
export function captureNativePursuit(seed: number, catches = 6): { saved: SavedPlay; pick: ReturnType<typeof findNativePursuit> } {
  let pick: ReturnType<typeof findNativePursuit> | undefined, tried = 0;
  const { saved } = captureOrdinaryPlay({ seed, play: 'first-catch', minPlay: 1, maxSteps: 80, accept: s => {
    if (++tried > catches) throw new Error(`No native pursuit case in the first ${catches} completed passes of seed ${seed}`);
    try { pick = findNativePursuit(s); return true; } catch { return false; }
  } });
  return { saved, pick: pick! };
}

export function restoreBody(c: Pick<ArrivalCase, 'bodyV8' | 'bodySha256'>): Body {
  const bytes = Buffer.from(c.bodyV8, 'base64');
  if (bytesHash(bytes) !== c.bodySha256) throw new Error('Frozen body checksum mismatch');
  return deserialize(bytes) as Body;
}

/** Exactly #259's consumed forecast, without perception or target truth. */
export function forecast(p: Intercept, t: number): Vec2 {
  const f = p.forecast;
  const d = f.relaxedSpeed * t - (f.relaxedSpeed - f.initialSpeed) * f.relaxationTime * (1 - Math.exp(-t / f.relaxationTime));
  return { x: p.observed.pos.x + f.heading.x * d,
    y: clamp(p.observed.pos.y + f.heading.y * d, ...f.lateralBoundary) };
}

/** Necessary only: a free body's net ground acceleration cannot exceed full
 * traction/mass. A deliberately loose semi-implicit dt allowance also covers
 * the native trapezoidal position update. Passing proves no reachability. */
export function necessaryBound(body: Body, point: Vec2, t: number, radius: number, dt = .05) {
  const acceleration = supportParams(body.profile).traction / body.profile.massKg;
  const coast = { x: body.pos.x + body.vel.x * t, y: body.pos.y + body.vel.y * t };
  const required = Math.max(0, distance(point, coast) - radius);
  const maximum = .5 * acceleration * t * (t + dt);
  return { kind: 'necessary-full-traction-disk' as const, applicable: 'isolated-free-body-no-external-impulse',
    acceleration, required, maximum, excluded: required > maximum + 1e-8,
    passingDoesNotProveReachability: true };
}

export interface Objective { id: string; point: Vec2; horizon: number; radius: number;
  information: 'consumed-forecast' | 'observed-gather-picture' | 'other-recorded-decision-diagnostic-only';
  pointSource?: 'recorded-estimator-sample' | 'offline-evaluation-of-frozen-forecast'; steeringPoint?: Vec2;
  forecastHeading?: Vec2 }
export function objectives(c: ArrivalCase): Objective[] {
  const p = c.intercept;
  if (!p) {
    const chase = c.trace.pursuit?.find(r => r.data.kind === 'chase')?.data;
    if (!chase || chase.kind !== 'chase') return [];
    return [{ id: 'close-gather', point: chase.observed.pos, horizon: .15, radius: chase.contact,
      information: 'observed-gather-picture' }];
  }
  return (c.candidateHorizons ?? [1.8, 2.8]).map(horizon => {
    const sampled = p.prediction.samples?.find(s => Math.abs(s.t - horizon) < 1e-7);
    return { id: `candidate-${horizon.toFixed(1)}`, point: sampled?.point ?? forecast(p, horizon),
      horizon: sampled?.t ?? horizon, radius: p.prediction.estimate.radius,
      information: 'consumed-forecast',
      forecastHeading: p.forecast.heading,
      pointSource: sampled ? 'recorded-estimator-sample' : 'offline-evaluation-of-frozen-forecast',
      steeringPoint: Math.abs(horizon - p.prediction.t) < 1e-7 ? p.steeringPoint : undefined };
  });
}

/** The four #259 scalar opposing inputs, translated into the field interior.
 * Full bodies are declared synthetic, not reconstructed NFL/native checkpoints.
 * No physical capacity differs between arms of any case. */
export function frozenControls(reference: ArrivalCase): ArrivalCase[] {
  const cases = [
    { id: 'aligned-head-on', vel: { x: 4, y: 0 }, pos: { x: 12, y: 0 }, targetVel: { x: -3, y: 0 } },
    { id: 'transverse-momentum', vel: { x: 0, y: 7 }, pos: { x: 12, y: 0 }, targetVel: { x: -3, y: 0 } },
    { id: 'faster-crossing', vel: { x: 4, y: 0 }, pos: { x: 6, y: -12 }, targetVel: { x: 0, y: 10 } },
    { id: 'escaping-fallback', vel: { x: 4, y: 0 }, pos: { x: 60, y: 15 }, targetVel: { x: 10, y: 0 } },
  ];
  return cases.map(input => {
    const body = restoreBody(reference);
    Object.assign(body, { pos: { x: 40, y: 26 }, vel: input.vel, facing: Math.atan2(input.vel.y, input.vel.x),
      energy: 1, support: newSupport(), spin: 0, sprintLoad: 0, squeeze: 0, squeezeHeading: undefined,
      profile: { ...body.profile, vmax: 8, tau: 1, brake: 8, lateral: 6 } });
    const bytes = serialize(body), speed = Math.hypot(input.targetVel.x, input.targetVel.y);
    const observed = { pos: { x: 40 + input.pos.x, y: 26 + input.pos.y }, vel: input.targetVel, age: 0,
      facing: Math.atan2(input.targetVel.y, input.targetVel.x), stance: null };
    const path = (t: number) => ({ x: observed.pos.x + input.targetVel.x * t, y: observed.pos.y + input.targetVel.y * t });
    const prediction = interceptPoint({ pos: body.pos, vel: body.vel, profile: body.profile, speedScale: 1 }, path,
      { horizon: 3, step: .1, radius: .7, recordSamples: true });
    const point = prediction.point, dist = distance(body.pos, point);
    const command = { vel: { x: (point.x - body.pos.x) / dist * 8, y: (point.y - body.pos.y) / dist * 8 }, effort: 1 };
    const actor: Identity = { team: 'D', slot: 'synthetic', playerId: `synthetic:${input.id}`, index: 0 };
    const target: Identity = { team: 'O', slot: 'synthetic-target', playerId: `synthetic-target:${input.id}`, index: 1 };
    const bodyState = { position: body.pos, velocity: body.vel, facing: body.facing, energy: body.energy,
      support: null };
    const trace = { stepStart: 0, actor, start: { body: bodyState }, rewrites: [], observations: [], final: command } as unknown as CommandTraceStep;
    return { id: input.id, actor, target, clock: 0, dt: .05, bodyV8: bytes.toString('base64'), bodySha256: bytesHash(bytes),
      model: reference.model, native: [], trace,
      candidateHorizons: [prediction.estimate.status === 'estimated-feasible' ? prediction.t : 3],
      intercept: { kind: 'intercept', prediction, estimateAppliesTo: 'sampled-point-before-bias-and-leverage',
        steeringPointEstimate: 'not-evaluated', pursuer: { position: body.pos, velocity: body.vel, speedScale: 1,
          capacity: { vmax: 8, tau: 1, brake: 8, lateral: 6 } }, observed, older: observed,
        forecast: { model: 'fixed-observed-heading-relaxing-speed', heading: { x: input.targetVel.x / speed, y: input.targetVel.y / speed },
          initialSpeed: speed, acceleration: 0, speedLimit: speed, targetBrake: 8, targetSprintTau: 1,
          relaxedSpeed: speed, relaxationTime: .5, lateralBoundary: [-1e6, 1e6] },
        timeBias: 0, biasedTime: prediction.t, forecastPoint: point, leverage: 0, steeringPoint: point },
      source: { kind: 'synthetic', capture: reference.source.execution, execution: executionIdentity(),
        operatorSha256: operatorSha256(), worldSourceSha256: worldSourceSha256(),
        setupSha256: bytesHash(bytes), playId: 'declared-scalar-control', originalOutcome: 'not-a-play', originalYards: 0 } };
  });
}

export interface TrialRow { t: number; elapsed: number; body: State; command: Intent }
export function response(c: ArrivalCase, objective: Objective, policy: 'held-original' | 'held-candidate' | 'seek-candidate' | 'held-recorded',
  shifted = false, recordedRequest?: Intent, envelope: 'recorded' | 'estimator-full-effort' = 'recorded') {
  if (!(objective.horizon > 0) || !Number.isFinite(objective.horizon)
    || Math.abs(objective.horizon / c.dt - Math.round(objective.horizon / c.dt)) > 1e-7)
    throw new Error('Objective must have a positive horizon on the native decision grid');
  const body = restoreBody(c), before = copySaved(body);
  const world = new World([body], c.model);
  world.time = c.clock;
  if (firstDifference(before, body)) throw new Error('World construction discarded native body history');
  const goal = shifted ? objective.steeringPoint ?? objective.point : objective.point;
  const original = c.trace.final!;
  if (envelope !== 'recorded' && policy !== 'seek-candidate') throw new Error('Effort attribution uses the same seek rule');
  const changedEffort = envelope === 'estimator-full-effort' && (original.effort ?? 1) < 1;
  const speed = changedEffort ? body.profile.vmax : Math.hypot(original.vel.x, original.vel.y);
  const seek = (): Intent => {
    const d = distance(body.pos, goal) || 1;
    return { ...original, effort: envelope === 'estimator-full-effort' ? 1 : original.effort,
      vel: { x: (goal.x - body.pos.x) / d * speed, y: (goal.y - body.pos.y) / d * speed } };
  };
  if (policy === 'held-recorded' && !recordedRequest) throw new Error('Missing recorded request');
  const held = policy === 'held-recorded' ? copySaved(recordedRequest!) : policy === 'held-original' ? copySaved(original) : seek();
  const rows: TrialRow[] = [{ t: c.clock, elapsed: 0, body: state(body), command: held }];
  let maxGroundAcceleration = 0;
  for (let k = 0; k < Math.round(objective.horizon / c.dt); k++) {
    const command = policy === 'seek-candidate' ? seek() : held;
    const report = world.step([command], c.dt);
    maxGroundAcceleration = Math.max(maxGroundAcceleration, Math.hypot(report.groundImpulse[0].x,
      report.groundImpulse[0].y) / body.profile.massKg / c.dt);
    rows.push({ t: c.clock + (k + 1) * c.dt, elapsed: (k + 1) * c.dt, body: state(body), command: copySaved(command) });
  }
  const preview = policy === 'seek-candidate' ? null
    : previewFreeMovement(restoreBody(c), held, c.clock, Math.round(objective.horizon / c.dt), c.model.handContact);
  const previewDifference = preview && firstDifference(preview,
    rows.slice(1).map(r => ({ t: r.elapsed, pos: r.body.pos, vel: r.body.vel, support: r.body.support!.state })));
  // The existing helper selects ordinary production defaults, so compare only those models.
  if (previewDifference) throw new Error(`World/preview response differs: ${JSON.stringify(previewDifference)}`);
  const errors = rows.map(r => distance(r.body.pos, objective.point));
  const closestIndex = errors.indexOf(Math.min(...errors));
  const firstEntry = rows.find((_, i) => errors[i] <= objective.radius);
  const end = rows.at(-1)!;
  const target = c.native.find(r => Math.abs(r.end - end.t) < 1e-7)?.targetAfter;
  // Cross-decision trials retain the originating forecast's point and axis,
  // rather than substituting the body's newer picture at the remaining time.
  const pred = c.intercept ? objective.point : null;
  const axis = objective.forecastHeading ?? c.intercept?.forecast.heading;
  const miss = { x: end.body.pos.x - objective.point.x, y: end.body.pos.y - objective.point.y };
  const forecastMiss = pred && target ? { x: target.pos.x - pred.x, y: target.pos.y - pred.y } : null;
  const futureDistances = rows.map(r => {
    const n = c.native.find(n => Math.abs(n.start - r.t) < 1e-7);
    const future = n?.targetBefore ?? c.native.find(n => Math.abs(n.end - r.t) < 1e-7)?.targetAfter;
    return future ? { elapsed: r.elapsed, distance: distance(r.body.pos, future.pos) } : null;
  }).filter(r => r !== null);
  const closestFuture = futureDistances.reduce<{ elapsed: number; distance: number } | null>((a, b) => !a || b.distance < a.distance ? b : a, null);
  const speeds = rows.map(r => Math.hypot(r.body.vel.x, r.body.vel.y));
  const firstNative = c.native[0];
  const firstStepDifference = policy === 'held-original' && firstNative
    ? firstDifference(deserialize(Buffer.from(firstNative.afterBodyV8!, 'base64')), (() => {
      const b = restoreBody(c), w = new World([b], c.model); w.time = c.clock; w.step([held], c.dt); return b;
    })()) : null;
  return { caseId: c.id, policy, shifted, objective, requestGoal: goal,
    requestEnvelope: { mode: envelope, changedEffort, nativeRequestedSpeed: Math.hypot(original.vel.x, original.vel.y),
      nativeEffort: original.effort ?? 1, responseRequestedSpeed: Math.hypot(held.vel.x, held.vel.y),
      responseEffort: held.effort ?? 1, estimatorEffortAssumption: 1,
      estimatorSpeedCeiling: c.intercept ? body.profile.vmax * c.intercept.pursuer.speedScale : null },
    clocks: { start: c.clock, duration: objective.horizon, deadline: end.t, basis: 'native-live-step-start-plus-relative-horizon' },
    original: c.trace, necessaryBound: necessaryBound(before, objective.point, objective.horizon, objective.radius, c.dt),
    heldCommandPreviewDifference: previewDifference, firstNativeStepDifference: firstStepDifference,
    metrics: { deadlineDistance: errors.at(-1)!, deadlineOutsideRadius: Math.max(0, errors.at(-1)! - objective.radius),
      firstSampledEntry: firstEntry?.elapsed ?? null, closestDistance: errors[closestIndex], closestAt: rows[closestIndex].elapsed,
      entrySpeed: speeds[0], endSpeed: speeds.at(-1)!, speedLost: speeds[0] - Math.min(...speeds),
      entryTravel: heading(before.vel), endTravel: heading(end.body.vel), entryFacing: before.facing, endFacing: end.body.facing,
      initialRequestHeading: heading(held.vel), initialRequestVsTravel: heading(before.vel) === null || heading(held.vel) === null
        ? null : angleDiff(heading(before.vel)!, heading(held.vel)!),
      facingTravelDifference: heading(end.body.vel) === null ? null : angleDiff(end.body.facing, heading(end.body.vel)!),
      missAlongForecast: axis ? miss.x * axis.x + miss.y * axis.y : null,
      missLeftOfForecast: axis ? axis.x * miss.y - axis.y * miss.x : null,
      runnerForecastError: pred && target ? distance(pred, target.pos) : null,
      runnerForecastErrorAlong: forecastMiss && axis ? forecastMiss.x * axis.x + forecastMiss.y * axis.y : null,
      runnerForecastErrorLeft: forecastMiss && axis ? axis.x * forecastMiss.y - axis.y * forecastMiss.x : null,
      distanceToRecordedFutureRunner: target ? distance(end.body.pos, target.pos) : null,
      closestToRecordedFutureRunner: closestFuture,
      recordedFutureIsDiagnosticOnly: true, maxGroundAcceleration }, rows };
}

export function compareBundle(bundle: ArrivalBundle) {
  if (bundle.schema !== 'pursuit-arrival-v1') throw new Error('Unsupported arrival bundle');
  const execution = executionIdentity(), worldHash = worldSourceSha256();
  for (const c of bundle.cases) {
    if (c.source.worldSourceSha256 !== worldHash || firstDifference(c.source.execution.settings, execution.settings)
      || c.source.execution.node !== execution.node)
      throw new Error(`Incompatible movement source/settings/Node for ${c.id}`);
  }
  // The nominated decisions: the first native actor's intercepts on its play.
  const nominated = bundle.cases.find(c => c.source.kind === 'native' && c.intercept);
  const pair = bundle.cases.filter(c => c.source.kind === 'native' && c.intercept && nominated
    && c.source.playId === nominated.source.playId && c.actor.playerId === nominated.actor.playerId);
  // Cross both *recorded* requests/points from the two nominated decisions.
  // A later decision's cue at the earlier body clock is diagnostic only,
  // explicitly not an available-information controller intervention.
  const recordedPairTrials = pair.flatMap(c => pair.flatMap(origin => {
    const p = origin.intercept!, horizon = origin.clock + p.prediction.t - c.clock;
    const objective: Objective = { id: `recorded-${origin.clock.toFixed(2)}`, point: p.prediction.point,
      horizon, radius: p.prediction.estimate.radius, steeringPoint: p.steeringPoint,
      forecastHeading: p.forecast.heading,
      information: origin === c ? 'consumed-forecast' : 'other-recorded-decision-diagnostic-only',
      pointSource: 'recorded-estimator-sample' };
    return (['held-recorded', 'seek-candidate'] as const).map(policy => ({ sourceDecision: origin.id,
      objectiveAbsoluteTime: origin.clock + p.prediction.t,
      cueAvailableAtBodyClock: origin.clock <= c.clock,
      trial: response(c, objective, policy, true, origin.trace.final) }));
  }));
  const effortTrials = bundle.cases.filter(c => c.intercept).flatMap(c => objectives(c).flatMap(o =>
    (o.steeringPoint && distance(o.steeringPoint, o.point) > 1e-9 ? [false, true] : [false])
      .map(shifted => response(c, o, 'seek-candidate', shifted, undefined, 'estimator-full-effort'))));
  return { schema: 'pursuit-arrival-results-v1', execution, operatorSha256: operatorSha256(), worldSourceSha256: worldHash,
    fixtureSha256: createHash('sha256').update(arrivalJson(bundle)).digest('hex'),
    recordedPairTrials, effortTrials,
    trials: bundle.cases.flatMap(c => objectives(c).flatMap(o =>
      (c.intercept ? ['held-original', 'held-candidate', 'seek-candidate'] as const : ['held-original'] as const).flatMap(policy =>
        (o.steeringPoint && distance(o.steeringPoint, o.point) > 1e-9 && policy !== 'held-original' ? [false, true] : [false])
          .map(shifted => response(c, o, policy, shifted))))) };
}

function main() {
  const { values: v } = parseArgs({ options: { capture: { type: 'string' }, actor: { type: 'string' }, target: { type: 'string' },
    clocks: { type: 'string' }, input: { type: 'string' }, combine: { type: 'string' }, controls: { type: 'boolean' },
    out: { type: 'string', default: 'out/pursuit-arrival.json' } } });
  if (v.combine) {
    const cases: ArrivalCase[] = v.combine.split(',').flatMap(path => parseArrivalJson(readFileSync(path, 'utf8')).cases);
    if (v.controls) cases.push(...frozenControls(cases[0]));
    mkdirSync(dirname(v.out!), { recursive: true });
    writeFileSync(v.out!, arrivalJson({ schema: 'pursuit-arrival-v1', cases }));
    console.log(`Frozen ${cases.length} cases -> ${v.out}`); return;
  }
  if (!v.input && (!v.capture || !v.actor || !v.target || !v.clocks))
    throw new Error('Use --capture FILE --actor SLOT --target SLOT --clocks T,T; --combine FILE,FILE [--controls]; or --input FILE');
  const output = v.input ? compareBundle(parseArrivalJson(readFileSync(v.input, 'utf8')) as ArrivalBundle)
    : { schema: 'pursuit-arrival-v1', cases: freezeNative(readSavedPlay(v.capture!), v.actor!, v.target!, v.clocks!.split(',').map(Number)) };
  mkdirSync(dirname(v.out!), { recursive: true }); writeFileSync(v.out!, arrivalJson(output));
  if ('trials' in output) for (const t of output.trials) console.log(`${t.caseId} ${t.objective.id} ${t.policy}${t.shifted ? '-shifted' : ''}`
    + ` endError=${t.metrics.deadlineDistance.toFixed(3)} entry=${t.metrics.firstSampledEntry}`
    + ` forecastError=${t.metrics.runnerForecastError?.toFixed(3) ?? '-'} boundExcluded=${t.necessaryBound.excluded}`);
  console.log(`Saved ${v.out}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
