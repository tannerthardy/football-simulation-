/** Selected-actor diagnostics. Copies normal execution; never evaluates a decision or a read. */
import type { Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { Intent } from '../physics/world.js';
import type { Agent, Behavior, TeamSide } from './agent.js';
import type { CarrierDecisionRecord } from './behaviors/carrier.js';
import { PassProtector, RunBlocker } from './behaviors/blocking.js';
import { facingTechnique } from './coverage/orientation.js';
import { movementObjective, type MovementObjective } from './movement-objective.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import type { PursuitPredictionRecord } from './pursuit-prediction.js';
import type { ClimbAccessRecord } from './climb-access.js';

export interface CommandTraceSelection {
  actor: { team: TeamSide; slot: string } | { playerId: string };
  /** Live step-start seconds, inclusive from / exclusive to. No replay sampling. */
  from: number;
  to: number;
}

const vector = (v: Vec2): Vec2 => ({ x: v.x, y: v.y });
export const identity = (a: Agent) => ({ playerId: a.player.id, team: a.team, slot: a.slot, index: a.idx });
export type ActorIdentity = ReturnType<typeof identity>;

export interface CommandSnapshot extends Intent {
  objective?: MovementObjective;
  /** The coverage technique branch that asked for this facing (COV-6). */
  facingTechnique?: string;
}

export function commandSnapshot(c: Intent): CommandSnapshot {
  const goal = movementObjective(c);
  const technique = facingTechnique(c)?.label;
  return { vel: vector(c.vel), facing: c.facing, effort: c.effort, cutSkill: c.cutSkill, squeeze: c.squeeze,
    push: c.push, posture: c.posture, dive: c.dive && vector(c.dive), lunge: c.lunge && vector(c.lunge), free: c.free,
    objective: goal && (goal.kind === 'fixed' ? { kind: 'fixed', point: vector(goal.point) }
      : { kind: 'moving', point: vector(goal.point), velocity: goal.velocity && vector(goal.velocity) }),
    ...(technique ? { facingTechnique: technique } : {}) };
}

/** These are stored controller fields, not a guessed target from true possession. */
function behaviorSnapshot(b: Behavior, a: Agent, sim: PlaySim) {
  const stored = b as Behavior & { target?: Agent | null; job?: string; plan?: { kind: string } };
  const index = b instanceof PassProtector ? b.recordedTarget(a) : stored.target?.idx;
  const target = index === undefined || index === null ? null : sim.agents[index];
  return { controller: b.constructor.name, kind: b.kind, job: stored.job ?? stored.plan?.kind ?? null,
    target: target ? identity(target) : null,
    targetSource: b instanceof PassProtector ? 'stored-protection' : stored.target !== undefined ? 'stored-target' : 'not-exposed' };
}
type BehaviorSnapshot = ReturnType<typeof behaviorSnapshot>;

export interface BlockingResponsibility {
  target: ActorIdentity | null;
  workKind: string;
}

/** The two calls every blocking-responsibility hook makes. The selected-actor trace and the all-blockers
 * ledger both implement them; a hook site holds whichever `sim.blockingSink(a)` returns. */
export interface BlockingSink {
  blockingState(a: Agent): BlockingResponsibility | undefined;
  blockingChange(a: Agent, previous: BlockingResponsibility | undefined, reason: string, sim: PlaySim): void;
}

export interface BlockingResponsibilityChange {
  actor: ActorIdentity;
  /** Native decision/event clock; the containing step retains endpointTime. */
  t: number;
  phase: TracePhase;
  previous: BlockingResponsibility;
  current: BlockingResponsibility;
  /** The actual mutation path, not an inferred block outcome. */
  reason: string;
}

function stateSnapshot(a: Agent, sim: PlaySim) {
  const body = a.body, support = body.support, e = a.engagement, bond = sim.bond;
  return { behavior: behaviorSnapshot(a.behavior, a, sim),
    body: { position: vector(body.pos), velocity: vector(body.vel), facing: body.facing, energy: body.energy,
      spin: body.spin, squeeze: body.squeeze, support: support ? { state: support.state, posture: support.posture,
        lean: vector(support.lean), deviation: vector(support.xi) } : null },
    engagement: e ? { type: e.type, blocker: identity(e.blocker), defender: identity(e.defender),
      helpers: e.helpers.map(identity), move: e.move,
      hands: e.hands ? { normalForce: e.hands.normalForce, tangentForce: e.hands.tangentForce } : null } : null,
    tackleBond: bond && (bond.carrier === a || bond.tacklers.includes(a))
      ? { carrier: identity(bond.carrier), tacklers: bond.tacklers.map(identity) } : null,
    lastStepContacts: (sim.lastStep?.contacts ?? []).filter(c => c.i === a.idx || c.j === a.idx)
      .map(c => ({ other: identity(sim.agents[c.i === a.idx ? c.j : c.i]), impulse: c.impulse, closing: c.closing })) };
}

export type CommandStage = 'technique-intents' | 'containment' | 'coverage-orientation' | 'open-to-ball' | 'engagement' | 'tackle-bond' | 'spacing' | 'snap-guard';
type TracePhase = 'pre-decision' | 'decision' | CommandStage | 'execution';

export interface CommandTraceStep {
  stepStart: number;
  endpointTime?: number;
  actor: ActorIdentity;
  start: ReturnType<typeof stateSnapshot>;
  decision?: { evaluated: boolean; owner: BehaviorSnapshot; ownerAfterUpdate: BehaviorSnapshot;
    behaviorAfterUpdate: BehaviorSnapshot; raw: CommandSnapshot };
  rewrites: Array<{ stage: CommandStage; command: CommandSnapshot }>;
  final?: CommandSnapshot;
  endpoint?: ReturnType<typeof stateSnapshot> & { phase: string; ballKind: string };
  observations: Array<{ phase: TracePhase; target: ActorIdentity; requestedAt: number; age: number | null; sampledAt: number | null }>;
  pursuit?: Array<{ phase: TracePhase; target: ActorIdentity; data: PursuitPredictionRecord }>;
  /** Departure access searches, as computed; surface keys resolved to identities. */
  climbAccess?: Array<{ phase: TracePhase; target: ActorIdentity; data: ClimbAccessRecord;
    surfaces: ActorIdentity[]; }>;
  blockingChanges?: BlockingResponsibilityChange[];
  /** The ball carrier's arrival evidence, route assessment and design-exit operands. */
  carrier?: Array<{ phase: TracePhase; data: CarrierDecisionRecord }>;
}

/** Numbers within 1e-9 are omitted from the rewrite list; raw/final retain full precision. */
export function materiallyDifferent(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) > 1e-9 || Number.isNaN(a) !== Number.isNaN(b);
  if (a === b) return false;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aa = a as Record<string, unknown>, bb = b as Record<string, unknown>;
    return [...new Set([...Object.keys(aa), ...Object.keys(bb)])].some(k => materiallyDifferent(aa[k], bb[k]));
  }
  return true;
}

export class CommandTrace {
  readonly steps: CommandTraceStep[] = [];
  readonly actor: ActorIdentity;
  private pending?: CommandTraceStep;
  private previous?: CommandSnapshot;
  private phase: TracePhase = 'pre-decision';

  constructor(private readonly selected: Agent, readonly selection: CommandTraceSelection) {
    if (!Number.isFinite(selection.from) || !Number.isFinite(selection.to) || selection.from < 0 || selection.to <= selection.from)
      throw new Error('Command trace requires 0 <= from < to, in finite seconds');
    this.selection = structuredClone(selection);
    this.actor = identity(selected);
  }

  begin(sim: PlaySim): void {
    this.previous = undefined;
    this.phase = 'pre-decision';
    this.pending = sim.t >= this.selection.from && sim.t < this.selection.to
      ? { stepStart: sim.t, actor: { ...this.actor }, start: stateSnapshot(this.selected, sim), rewrites: [], observations: [] } : undefined;
  }

  at(phase: TracePhase): void { this.phase = phase; }

  /** Copy only existing plan fields. Callers never acquire another picture. */
  blockingState(a: Agent): BlockingResponsibility | undefined {
    if (!this.pending || a !== this.selected || !(a.behavior instanceof RunBlocker)) return;
    return { target: a.behavior.plan.target ? identity(a.behavior.plan.target) : null,
      workKind: a.behavior.plan.kind };
  }

  blockingChange(a: Agent, previous: BlockingResponsibility | undefined, reason: string, sim: PlaySim): void {
    const current = this.blockingState(a);
    if (!previous || !current || (previous.target?.index === current.target?.index
      && previous.workKind === current.workKind)) return;
    (this.pending!.blockingChanges ??= []).push({ actor: { ...this.actor }, t: sim.t,
      phase: this.phase, previous, current, reason });
  }

  isCollecting(a: Agent): boolean { return !!this.pending && a === this.selected; }

  /** No prediction here: the helper supplies only values it already computed. */
  pursuit(target: Agent, data: PursuitPredictionRecord): void {
    if (!this.pending) return;
    const snapshot = structuredClone(data);
    if (data.kind === 'chase' && snapshot.kind === 'chase') snapshot.requests = data.requests
      .map(r => ({ stage: r.stage, command: commandSnapshot(r.command) }));
    (this.pending.pursuit ??= []).push({ phase: this.phase, target: identity(target), data: snapshot });
  }

  /** Values the carrier already computed for its own decision; nothing re-evaluated. */
  carrier(data: CarrierDecisionRecord): void {
    if (!this.pending) return;
    (this.pending.carrier ??= []).push({ phase: this.phase, data: structuredClone(data) });
  }

  /** The search supplied its own computed values; nothing is re-evaluated. */
  climbAccess(target: Agent, data: ClimbAccessRecord, sim: PlaySim): void {
    if (!this.pending) return;
    (this.pending.climbAccess ??= []).push({ phase: this.phase, target: identity(target), data: structuredClone(data),
      surfaces: data.surfaces.map(s => identity(sim.agents[s.key])) });
  }

  decisionStart(a: Agent, sim: PlaySim): BehaviorSnapshot | undefined {
    return this.pending && a === this.selected ? behaviorSnapshot(a.behavior, a, sim) : undefined;
  }

  decisionEnd(a: Agent, owner: Behavior, before: BehaviorSnapshot | undefined, c: MoveCommand, evaluated: boolean, sim: PlaySim): void {
    if (!this.pending || a !== this.selected || !before) return;
    const raw = commandSnapshot(c);
    this.pending.decision = { evaluated, owner: before, ownerAfterUpdate: behaviorSnapshot(owner, a, sim),
      behaviorAfterUpdate: behaviorSnapshot(a.behavior, a, sim), raw };
    this.previous = raw;
  }

  command(a: Agent, stage: CommandStage, c: Intent): void {
    if (!this.pending || a !== this.selected) return;
    const snapshot = commandSnapshot(c);
    if (materiallyDifferent(this.previous, snapshot)) this.pending.rewrites.push({ stage, command: snapshot });
    this.previous = snapshot;
  }

  stage(stage: CommandStage, intents: readonly Intent[]): void { this.command(this.selected, stage, intents[this.selected.idx]); }

  /** Only returned `see` values, including duplicates; no new sightings or inferred causal key. */
  observe(observer: Agent, target: Agent, p: Perceived, t: number): void {
    if (!this.pending || observer !== this.selected) return;
    this.pending.observations.push({ phase: this.phase, target: identity(target), requestedAt: t,
      age: p.age ?? null, sampledAt: p.age === undefined ? null : t - p.age });
  }

  final(intents: readonly Intent[]): void {
    if (this.pending) this.pending.final = commandSnapshot(intents[this.selected.idx]);
  }

  finish(sim: PlaySim): void {
    if (!this.pending) return;
    this.pending.endpointTime = sim.t;
    this.pending.endpoint = { ...stateSnapshot(this.selected, sim), phase: sim.phase, ballKind: sim.ball.kind };
    this.steps.push(this.pending);
    this.pending = undefined;
  }
}
