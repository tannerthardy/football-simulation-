/** Retrospective first natural lower-bound release in the first measured
 * seed-9 guard game. All preceding plays stay linear in every run; only the
 * selected play opts into the bounded experiment. No reconstructed state.
 * node --import tsx scripts/diag/natural-lower-attachment.ts [output.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { Body } from '../../src/physics/kinematics.js';
import { supportParams } from '../../src/physics/support.js';
import { World, type GraspJoint, type StepReport } from '../../src/physics/world.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { ReplayTrace } from '../../src/sim/telemetry.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/bounded-attachment-review/natural-witness.json';
if (process.argv.length > 3 || process.execArgv.some(s => s.includes('enable-bounded-attachment')))
  throw new Error('Use natural-lower-attachment.ts [output.json] without the global experiment preload');
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const hash = (value: unknown) => sha(JSON.stringify(value));
const sourceBefore = sourceVersion(), scriptBefore = sha(readFileSync(import.meta.filename));
const rootSeed = 9, rosterRng = new Rng(rootSeed).fork('held-recovery-rosters');
const teams = [generateTeam(rosterRng.fork('home'), 'Guard Home', 'HOM', { strength: .55 }),
  generateTeam(rosterRng.fork('away'), 'Guard Away', 'AWY', { strength: .55 })];
const gameRng = new Rng(rootSeed).fork('held-recovery-games');
const excludedWarmSeed = gameRng.nextU32(), gameSeed = gameRng.nextU32();
const rosterSha256 = hash(teams);

/** Stable reachable-state graph including Maps, typed arrays, RNG state,
 * controllers and perception. Recording-only fields are excluded. Functions
 * are source-pinned; WeakMap entries are unavailable. The initial PlaySim has
 * no acquired tackle attachments. This is a replay-equivalence check, not a
 * portable snapshot or a new way to restart a live simulation. */
function canonicalGraph(root: unknown): unknown {
  const seen = new Map<object, number>();
  const visit = (value: unknown): unknown => {
    if (typeof value === 'number' && !Number.isFinite(value)) return { number: String(value) };
    if (typeof value === 'function') return { functionSha256: sha(value.toString()) };
    if (value === undefined) return { undefined: true };
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return { ref: seen.get(value) };
    const id = seen.size; seen.set(value, id);
    if (value instanceof WeakMap || value instanceof WeakSet) return { id, type: value.constructor.name, opaque: true };
    if (value instanceof Map) return { id, type: 'Map', entries: Array.from(value, ([k, v]) => [visit(k), visit(v)]) };
    if (value instanceof Set) return { id, type: 'Set', entries: Array.from(value, visit) };
    if (ArrayBuffer.isView(value)) return { id, type: value.constructor.name,
      values: Array.from(value as unknown as Iterable<number>, visit) };
    if (Array.isArray(value)) return { id, type: 'Array', values: value.map(visit) };
    const omitted = value instanceof PlaySim ? new Set(['trace', 'frames', 'record', 'recordEvery', 'tickCount']) : new Set<string>();
    return { id, type: value.constructor.name, fields: Object.fromEntries(Object.keys(value).sort()
      .filter(k => !omitted.has(k)).map(k => [k, visit((value as Record<string, unknown>)[k])])) };
  };
  return visit(root);
}
function physicalSignature(sim: PlaySim, result: PlayResult): string {
  const { frames: _frames, telemetry: _telemetry, ...physicalResult } = result;
  return hash(canonicalGraph({ sim, result: physicalResult }));
}
function states(world: World) {
  return world.bodies.map((b, idx) => ({ idx, pos: structuredClone(b.pos), vel: structuredClone(b.vel),
    facing: b.facing, energy: b.energy, spin: b.spin, squeeze: b.squeeze, sprintLoad: b.sprintLoad,
    support: structuredClone(b.support) }));
}
function grasps(world: World) {
  const internals = world as any;
  return world.joints.filter((j): j is GraspJoint => j.kind === 'grasp').map(j => {
    const point = internals.graspPoint(j), attachment = internals.attachments.get(j);
    return { a: world.indexOf(j.a), b: world.indexOf(j.b), broken: !!j.broken, slipping: !!j.slipping,
      origin: j.origin, legs: j.legs, hold: j.hold, reach: j.reach, capacity: j.capacity,
      effectiveCapacityAtObservation: internals.gripCapacity(j), jointForceField: j.force ?? null,
      point: structuredClone(point), holderDistance: Math.hypot(point.x - j.a.pos.x, point.y - j.a.pos.y),
      bodyDistance: Math.hypot(point.x - j.b.pos.x, point.y - j.b.pos.y), bodyBound: supportParams(j.b.profile).comHeight,
      pointRelativeVelocity: structuredClone(internals.graspVelocity(j)), jacobian: internals.graspJacobian(j),
      attachment: attachment ? { bounded: attachment.bounded, share: attachment.share,
        reference: structuredClone(attachment.reference) } : null };
  });
}
const momentum = (bodies: Body[]) => bodies.reduce((p, b) =>
  ({ x: p.x + b.profile.massKg * b.vel.x, y: p.y + b.profile.massKg * b.vel.y }), { x: 0, y: 0 });

interface Selection { ordinal: number; kind: 'scrimmage' | 'two-point'; tickStart: number; tickEnd: number;
  preStateSha256: string; playSeed: number; lowerHoldReleases: number; beforeGrasps: unknown }
interface Active { sim: PlaySim; mode: 'scan' | 'control' | 'linear' | 'bounded'; ordinal: number; kind: Selection['kind']; initial: unknown; preStateSha256: string;
  selected: boolean; ticks: any[]; transitions: any[]; report?: StepReport; syncCount: number;
  accounting: { ticks: number; lowerHoldReleases: number; maxMomentumResidual: number;
    maxWorkResidual: number; maxMotorWorkExcess: number; maxPassivePositiveWork: number } }
let active: Active | null = null, selection: Selection | null = null;
function selectedInput(): Selection {
  if (!selection) throw new Error('First natural release has not been selected');
  return selection;
}
const originalStep = World.prototype.step;
const prototype = World.prototype as unknown as { syncHeldSupport(): void };
const originalSync = prototype.syncHeldSupport;
prototype.syncHeldSupport = function() {
  const current = active;
  const world = this as unknown as World;
  if (!current?.selected || world !== current.sim.world) return originalSync.call(this);
  const count = current.syncCount++;
  const before = grasps(world), excursion = world.bodies.map(b => b.support?.foot?.offset && Math.hypot(
    b.support.foot.offset.x, b.support.foot.offset.y));
  originalSync.call(this);
  const after = grasps(world);
  const newlyBroken = before.some(j => !j.broken && after.find(a => a.a === j.a && a.b === j.b)?.broken);
  const rebased = excursion.some((x, i) => x && x > .5 && world.bodies[i].support?.foot
    && Math.hypot(world.bodies[i].support!.foot!.offset.x, world.bodies[i].support!.foot!.offset.y) < .1);
  if (newlyBroken || rebased) current.transitions.push({ t: world.time, method: 'syncHeldSupport',
    jointForceFieldPhase: count === 0 ? 'previous-completed-tick-mean-force' : 'in-flight-accumulated-impulse',
    before, after, bodies: states(world) });
};
World.prototype.step = function(intents, dt) {
  const current = active;
  if (!current || current.mode === 'control' || this !== current.sim.world) return originalStep.call(this, intents, dt);
  current.syncCount = 0;
  const p0 = momentum(this.bodies), tickStart = this.time;
  const beforeGrasps = grasps(this), before = current.selected ? states(this) : null;
  const report = originalStep.call(this, intents, dt); current.report = report;
  const p1 = momentum(this.bodies), ground = report.groundImpulse.reduce((p, v) => ({ x: p.x + v.x, y: p.y + v.y }), { x: 0, y: 0 });
  const accounting = current.accounting;
  accounting.ticks++; accounting.lowerHoldReleases += report.lowerHoldReleases;
  accounting.maxMomentumResidual = Math.max(accounting.maxMomentumResidual, Math.hypot(p1.x - p0.x - ground.x, p1.y - p0.y - ground.y));
  accounting.maxWorkResidual = Math.max(accounting.maxWorkResidual, Math.abs(report.work.residual));
  accounting.maxMotorWorkExcess = Math.max(accounting.maxMotorWorkExcess,
    ...report.supportMotorWork.map((w, i) => w - report.supportMotorWorkLimit[i]));
  accounting.maxPassivePositiveWork = Math.max(accounting.maxPassivePositiveWork, report.passiveGraspWork);
  if (!selection && report.lowerHoldReleases > 0) selection = { ordinal: current.ordinal, kind: current.kind,
    tickStart, tickEnd: this.time, preStateSha256: current.preStateSha256, playSeed: current.sim.rng.key,
    lowerHoldReleases: report.lowerHoldReleases, beforeGrasps };
  if (current.selected) current.ticks.push({ tickStart, tickEnd: this.time,
    before, after: states(this), beforeGrasps, afterGrasps: grasps(this), intents: structuredClone(intents),
    report: structuredClone(report), jointForceFieldPhase: 'completed-tick-mean-force' });
  return report;
};

function trial(mode: 'scan' | 'control' | 'linear' | 'bounded') {
  const stop = {}, history: Array<{ ordinal: number; kind: Selection['kind']; initialSha256: string; physicalSha256: string }> = [];
  let ordinal = 0, selected: any = null;
  try {
    simulateGame(structuredClone(teams[0]), structuredClone(teams[1]), { seed: gameSeed, hooks: {
      playResult(sim, kind) {
        ordinal++;
        // Preserve the diagnosed linear prefix after production promotion.
        // The selected candidate switches before its first World step.
        Object.defineProperty(sim.world, 'boundedAttachment', { value: false });
        const initial = canonicalGraph(sim), preStateSha256 = hash(initial);
        const isSelected = mode !== 'scan' && ordinal === selection!.ordinal;
        if (isSelected && (kind !== selection!.kind || preStateSha256 !== selection!.preStateSha256 || sim.rng.key !== selection!.playSeed))
          throw new Error('Selected pre-play state/RNG/setup failed to reproduce exactly');
        active = { sim, mode, ordinal, kind, initial, preStateSha256, selected: isSelected && mode !== 'control', ticks: [], transitions: [], syncCount: 0,
          accounting: { ticks: 0, lowerHoldReleases: 0, maxMomentumResidual: 0, maxWorkResidual: 0,
            maxMotorWorkExcess: 0, maxPassivePositiveWork: 0 } };
        if (isSelected && mode !== 'control') {
          // Recording starts at the already constructed snap state. No
          // pre-snap motion is reconstructed and no behavior/RNG is rerun.
          const recorder = sim as any;
          recorder.record = true; recorder.recordEvery = 1; recorder.tickCount = 0;
          recorder.trace = new ReplayTrace('full', 1, true); sim.frames.length = 0; recorder.recordFrame();
          if (mode === 'bounded') Object.defineProperty(sim.world, 'boundedAttachment', { value: true });
        }
        const result = sim.run(), physicalSha256 = physicalSignature(sim, result);
        history.push({ ordinal, kind, initialSha256: preStateSha256, physicalSha256 });
        if ((mode === 'scan' && selection?.ordinal === ordinal) || isSelected) {
          selected = { mode, ordinal, kind, initialSha256: preStateSha256, initial,
            playSeed: sim.rng.key, los: sim.los, ballY: sim.ballY, firstDownX: sim.firstDownX,
            offCall: sim.offCall, defCall: sim.defCall,
            players: sim.agents.map(a => ({ idx: a.idx, slot: a.slot, side: a.team, player: a.player, profile: a.profile })),
            result: structuredClone(result), physicalSha256, final: canonicalGraph(sim),
            ticks: active!.ticks, transitions: active!.transitions, accounting: active!.accounting };
          active = null; throw stop;
        }
        active = null; return result;
      },
    } });
  } catch (error) { if (error !== stop) throw error; }
  finally { active = null; }
  if (!selected) throw new Error('No naturally occurring lower-bound release in the fixed first guard game');
  return { mode, history, selected };
}

let scanned: ReturnType<typeof trial>, control: ReturnType<typeof trial>, linear: ReturnType<typeof trial>, bounded: ReturnType<typeof trial>;
try {
  scanned = trial('scan');
  console.log('Selected first natural release: ' + JSON.stringify(selection));
  control = trial('control'); linear = trial('linear'); bounded = trial('bounded');
} finally { World.prototype.step = originalStep; prototype.syncHeldSupport = originalSync; }
const selected = selectedInput(), selectedOrdinal = selected.ordinal;
const beforeSelected = (t: ReturnType<typeof trial>) => t.history.filter(p => p.ordinal < selectedOrdinal);
if (hash(beforeSelected(scanned)) !== hash(beforeSelected(control)) || hash(beforeSelected(scanned)) !== hash(beforeSelected(linear))
  || hash(beforeSelected(scanned)) !== hash(beforeSelected(bounded)))
  throw new Error('Earlier linear game history changed');
if (scanned.selected.physicalSha256 !== linear.selected.physicalSha256 || control.selected.physicalSha256 !== linear.selected.physicalSha256)
  throw new Error('Detailed observer/selected-play recording changed baseline physics or decisions');
const sourceAfter = sourceVersion(), scriptAfter = sha(readFileSync(import.meta.filename));
if (sourceBefore !== sourceAfter || scriptBefore !== scriptAfter) throw new Error('Source or script changed during diagnostic');
const report = { schema: 'natural-lower-attachment-v1', sourceBefore, sourceAfter, scriptBefore, scriptAfter,
  node: process.version, executable: process.execPath, command: [process.execPath, '--import', 'tsx', 'scripts/diag/natural-lower-attachment.ts', output],
  rosterSeed: rootSeed, gameSeed, excludedWarmSeed, rosterSha256, selection: selected,
  modeSelection: 'Only the selected play opts in; every preceding play uses the linear production model. No global preload.',
  checks: { identicalEarlierGameHistory: true, selectedInitialStateSha256: selected.preStateSha256,
    unobservedBaselinePhysicalSha256: control.selected.physicalSha256, observedBaselinePhysicalSha256: linear.selected.physicalSha256,
    observerAndRecordingUnchanged: true },
  limits: ['One retrospective natural interaction selected by the first diagnosed release, not its yardage or candidate outcome.',
    'Game history is replayed normally to identical complete selected pre-state; no live snapshot restoration or missing support filters.',
    'Each run stops after the selected play naturally finishes; this is not a full-game aggregate or a window-censored play.',
    'Full film recording begins at snap state after normal constructor/pre-snap staging; pre-snap frames are not reconstructed.',
    'State graph hashes include actual mutable controllers, perception and RNG but cannot inspect WeakMaps/functions; source is pinned and there are no initial tackle attachments.',
    'World onset hooks are observational; detailed baseline and unrecorded baseline match through every prior play and the selected physical endpoint.',
    'A persistent hold is not automatically a good result. Inspect mapped-point extension, transmitted force, achieved correction, approach and natural finish.',
    'Non-finite lifecycle times in trace state serialize as explicit strings; physical position, velocity and force remain numeric.',
    'Effective capacity at a pre-step observation uses the latest existing World arm allocation; it is not a new computed force limit.'],
  baseline: linear.selected, candidate: bounded.selected, precedingHistory: beforeSelected(scanned),
  unobservedControl: { physicalSha256: control.selected.physicalSha256, initialSha256: control.selected.initialSha256 },
  scanSelection: { accounting: scanned.selected.accounting, physicalSha256: scanned.selected.physicalSha256 } };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, (_key, value) => typeof value === 'number' && !Number.isFinite(value) ? String(value) : value) + '\n');
console.log(JSON.stringify({ output, sourceBefore, selection: selected, baseline: { outcome: linear.selected.result.outcome,
  gain: linear.selected.result.offenseYards, duration: linear.selected.result.duration, accounting: linear.selected.accounting },
candidate: { outcome: bounded.selected.result.outcome, gain: bounded.selected.result.offenseYards,
  duration: bounded.selected.result.duration, accounting: bounded.selected.accounting } }));
