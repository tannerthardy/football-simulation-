/** Responsibility ledger: the all-blockers form of the command trace's `blockingChanges` (PR #300). Who each
 * offensive blocker is responsible for, every change to that and its reason, and what contact followed, tick by
 * tick. A recorder only: it reads state the engine already computed, draws no RNG, installs no command, acquires
 * no picture and grades nothing. Off unless `sim.recordResponsibility()` is called, like the command trace.
 * Anything it cannot see stays null; a null is never a failed block. docs/COMMAND_TRACE.md, "Responsibility ledger". */
import type { Vec2 } from '../core/vec.js';
import type { Intent } from '../physics/world.js';
import type { Agent, Behavior } from './agent.js';
import { RunBlocker, type Combination, type RunBlockPlan } from './behaviors/blocking.js';
import { commandSnapshot, identity, materiallyDifferent, type ActorIdentity, type BlockingResponsibility,
  type BlockingSink, type CommandSnapshot } from './command-trace.js';
import type { PlaySim } from './playsim.js';

/** The load definition kept from the Phase II census: hands force magnitude above one engine force unit
 * (kg·yd/s²) at a recorded 20 Hz endpoint. Presence of load only; never a success threshold. */
export const LOAD_PRESENT = 1;

export interface CombinationState { id: number; members: number[]; defender: number; backer: number | null; released: boolean }
/** One blocker's current responsibility, by player index. */
export interface PlanState {
  kind: string;
  target: number | null;
  climbTo: number | null;
  combination: CombinationState | null;
  departure: { defender: number; keeper: number; backer: number } | null;
}

/** What `blockingState` hands back to a hook site and `blockingChange` later compares against. */
export interface LedgerResponsibility extends BlockingResponsibility {
  plan: PlanState;
  /** The selected-actor trace's own state for the same blocker, so both recorders see the same mutation. */
  selected: BlockingResponsibility | undefined;
}

export interface PlanChange {
  /** sim.t of the tick whose update made the change. */
  t: number;
  actor: number;
  /** The mutation path, using the command trace's reason strings; 'unattributed' = a path no hook claimed. */
  reason: string;
  fields: string[];
  before: PlanState;
  after: PlanState;
}

export interface HandRow {
  defender: number;
  /** hypot(normalForce, tangentForce) of the blocker's hands joint at the step endpoint. */
  magnitude: number;
  loaded: boolean;
  /** Signed force of the blocker's hands on the defender: normal channel and steering channel. */
  normalOnDefender: Vec2 | null;
  tangentOnDefender: Vec2 | null;
}

/** What the defender asked for and what his body did, along the line from him to the ball holder, in a step
 * where this blocker was in contact with him. Not a counterfactual: other bodies, the ground and his own
 * balance are inside `achieved`. Null where there was no holder or no final command. */
export interface AccessRow {
  defender: number;
  via: Array<'hands' | 'engagement' | 'torso'>;
  requestedAlong: number | null;
  achievedAlong: number | null;
  /** (requestedAlong - achievedAlong) * dt, yd. Positive: he got less than he asked for. */
  deficit: number | null;
}

export interface CommandOwner {
  controller: string;
  /** False when the snap reaction had not elapsed, so no decision ran. */
  evaluated: boolean;
  /** Stages after the controller that materially changed the command, in order. */
  rewrittenBy: string[];
  /** 'raw' = the controller's command reached the World; 'engagement' = the engagement stage wrote last. */
  finalOwner: 'raw' | 'rewritten' | 'engagement';
}

export interface LedgerRow {
  /** Step start. Hands, torso contact and access belong to the step [t, endpoint]. */
  t: number;
  endpoint: number;
  actor: number;
  plan: PlanState | null;
  engagement: { defender: number; helpers: number[]; type: string } | null;
  hands: HandRow[];
  loadOnCurrent: HandRow | null;
  loadOnInitial: HandRow | null;
  torso: Array<{ defender: number; impulse: number; closing: number }>;
  access: AccessRow[];
  command: CommandOwner | null;
}

export interface InitialJob {
  id: number;
  kind: 'combo' | 'direct';
  members: number[];
  /** The covered down defender (combination jobs). */
  defender: number | null;
  /** The assigned second-level target the census follows. */
  backer: number;
}

export interface CarrierEvent { t: number; type: string; defender: number | null; carrier: number | null }

export interface LedgerData {
  actors: Array<{ idx: number; slot: string; team: string }>;
  /** Plans at the first recorded tick, before any decision of the play. */
  initialAt: number | null;
  initialPlans: Array<{ actor: number; plan: PlanState }>;
  initialJobs: InitialJob[];
  changes: PlanChange[];
  rows: LedgerRow[];
  play: {
    /** True ball holder at each tick endpoint (null when nobody holds it). */
    carrierByTick: Array<{ t: number; carrier: number | null }>;
    /** carrier_contact, hit, tackle_wrap and tackle events, ties kept, in engine order. */
    carrierEvents: CarrierEvent[];
    snapPermitted: boolean;
    ended: { t: number; phase: string } | null;
    /** What the window cannot say: the play was over, the snap never happened, or it is still live. */
    censored: 'play-ended' | 'snap-prevented' | 'still-live';
  };
}

const CARRIER_EVENTS = new Set(['carrier_contact', 'hit', 'tackle_wrap', 'tackle']);
const vec = (v: Vec2 | undefined): Vec2 | null => v ? { x: v.x, y: v.y } : null;

export class ResponsibilityLedger implements BlockingSink {
  private sim!: PlaySim;
  private blockers: Agent[] = [];
  private bodyIdx = new Map<object, number>();
  private comboIds = new Map<Combination, number>();
  private last = new Map<number, PlanState>();
  private initial = new Map<number, PlanState>();
  private command = new Map<number, { controller: string; evaluated: boolean; prev: CommandSnapshot; stages: string[] }>();
  private started = false;
  private tickStart = 0;
  private startPos: Vec2[] = [];
  private startCarrier: number | null = null;
  readonly data: LedgerData = {
    actors: [], initialAt: null, initialPlans: [], initialJobs: [], changes: [], rows: [],
    play: { carrierByTick: [], carrierEvents: [], snapPermitted: true, ended: null, censored: 'still-live' },
  };

  // ------------------------------------------------------------ identity

  private combo(c: Combination): CombinationState {
    let id = this.comboIds.get(c);
    if (id === undefined) { id = this.comboIds.size; this.comboIds.set(c, id); }
    return { id, members: c.members.map(m => m.idx), defender: c.defender.idx, backer: c.backer?.idx ?? null, released: c.released };
  }

  private plan(a: Agent): PlanState | null {
    if (!(a.behavior instanceof RunBlocker)) return null;
    const p: RunBlockPlan = a.behavior.plan;
    return { kind: p.kind, target: p.target?.idx ?? null, climbTo: p.climbTo?.idx ?? null,
      combination: p.combination ? this.combo(p.combination) : null,
      departure: p.departure ? { defender: p.departure.defender.idx, keeper: p.departure.keeper.idx, backer: p.departure.backer.idx } : null };
  }

  private static diff(a: PlanState, b: PlanState): string[] {
    const out: string[] = [];
    if (a.kind !== b.kind) out.push('kind');
    if (a.target !== b.target) out.push('target');
    if (a.climbTo !== b.climbTo) out.push('climbTo');
    if (a.combination?.id !== b.combination?.id) out.push('combination');
    else if (a.combination && b.combination && (a.combination.released !== b.combination.released || a.combination.backer !== b.combination.backer)) out.push('combination.released');
    if (JSON.stringify(a.departure) !== JSON.stringify(b.departure)) out.push('departure');
    return out;
  }

  // ------------------------------------------------------------ the command trace's blocking hooks, for every blocker

  /** Same contract as `CommandTrace.blockingState`: copy existing plan fields, acquire nothing. */
  blockingState(a: Agent): LedgerResponsibility | undefined {
    if (!this.started || !this.initial.has(a.idx)) return undefined;
    const plan = this.plan(a);
    if (!plan) return undefined;
    const p = (a.behavior as RunBlocker).plan;
    const target: ActorIdentity | null = p.target ? identity(p.target) : null;
    return { target, workKind: plan.kind, plan, selected: this.sim.commandTraceFor(a)?.blockingState(a) };
  }

  blockingChange(a: Agent, previous: BlockingResponsibility | undefined, reason: string, sim: PlaySim): void {
    const prev = previous as LedgerResponsibility | undefined;
    sim.commandTraceFor(a)?.blockingChange(a, prev?.selected, reason, sim);
    if (!prev?.plan) return;
    const after = this.plan(a);
    if (!after) return;
    const fields = ResponsibilityLedger.diff(prev.plan, after);
    if (!fields.length) return;
    this.data.changes.push({ t: sim.t, actor: a.idx, reason, fields, before: prev.plan, after });
    this.last.set(a.idx, after);
  }

  // ------------------------------------------------------------ tick hooks

  /** Start of a tick. The first call freezes the initial jobs. */
  begin(sim: PlaySim): void {
    this.sim = sim;
    this.tickStart = sim.t;
    if (!this.started) {
      this.started = true;
      this.data.initialAt = sim.t;
      this.data.actors = sim.agents.map(a => ({ idx: a.idx, slot: a.slot, team: a.team }));
      for (const a of sim.agents) this.bodyIdx.set(a.body, a.idx);
      this.blockers = sim.offense.filter(a => a.behavior instanceof RunBlocker);
      for (const a of this.blockers) {
        const s = this.plan(a)!;
        this.initial.set(a.idx, s);
        this.last.set(a.idx, s);
        this.data.initialPlans.push({ actor: a.idx, plan: s });
      }
      this.data.initialJobs = this.jobs();
      this.data.play.snapPermitted = sim.snapAssessment?.snapPermitted ?? true;
    }
    this.command.clear();
    this.startPos = sim.agents.map(a => ({ x: a.pos.x, y: a.pos.y }));
    this.startCarrier = sim.carrier?.idx ?? null;
  }

  /** The controller's raw command for one player this tick. */
  decision(a: Agent, owner: Behavior, command: Intent, evaluated: boolean): void {
    if (!this.initial.has(a.idx)) return;
    this.command.set(a.idx, { controller: owner.constructor.name, evaluated, prev: commandSnapshot(command), stages: [] });
  }

  /** A later stage's version of one player's command; recorded only if it materially differs. */
  stage(stage: string, a: Agent, command: Intent): void {
    const s = this.command.get(a.idx);
    if (!s) return;
    const next = commandSnapshot(command);
    if (materiallyDifferent(s.prev, next)) { s.stages.push(stage); s.prev = next; }
  }

  stageAll(stage: string, intents: readonly Intent[]): void {
    for (const idx of this.command.keys()) this.stage(stage, this.sim.agents[idx], intents[idx]);
  }

  /** End of a tick (after physics and the clock advance): sweep for unclaimed changes, then record the rows. */
  finish(sim: PlaySim): void {
    const report = sim.lastStep, dt = sim.dt;
    const holder = this.startCarrier == null ? null : this.startPos[this.startCarrier];
    for (const a of this.blockers) {
      const now = this.plan(a), before = this.last.get(a.idx)!;
      if (now) {
        const fields = ResponsibilityLedger.diff(before, now);
        if (fields.length) {
          this.data.changes.push({ t: this.tickStart, actor: a.idx, reason: 'unattributed', fields, before, after: now });
          this.last.set(a.idx, now);
        }
      }
      const hands: HandRow[] = [];
      for (const j of sim.world.joints) {
        if (j.kind !== 'hands' || (j.a !== a.body && j.b !== a.body)) continue;
        const other = this.bodyIdx.get(j.a === a.body ? j.b : j.a);
        if (other === undefined || sim.agents[other].team === a.team) continue;
        const magnitude = Math.hypot(j.normalForce ?? 0, j.tangentForce ?? 0), sign = j.a === a.body ? 1 : -1;
        const n = vec(j.normalForceOnB), tg = vec(j.tangentForceOnB);
        hands.push({ defender: other, magnitude, loaded: magnitude > LOAD_PRESENT,
          normalOnDefender: n && { x: sign * n.x, y: sign * n.y }, tangentOnDefender: tg && { x: sign * tg.x, y: sign * tg.y } });
      }
      const loadOn = (target: number | null | undefined) => target == null ? null : hands.find(h => h.defender === target) ?? null;
      const e = a.engagement, c = this.command.get(a.idx);
      const torso = (report?.contacts ?? []).filter(k => (k.i === a.idx || k.j === a.idx) && sim.agents[k.i === a.idx ? k.j : k.i].team !== a.team)
        .map(k => ({ defender: k.i === a.idx ? k.j : k.i, impulse: k.impulse, closing: k.closing }));
      // Access: for each defender in contact with this blocker this step, what he asked for and got toward the holder.
      const via = new Map<number, Set<'hands' | 'engagement' | 'torso'>>();
      const add = (d: number, how: 'hands' | 'engagement' | 'torso') => { (via.get(d) ?? via.set(d, new Set()).get(d)!).add(how); };
      for (const h of hands) if (h.loaded) add(h.defender, 'hands');
      if (e) add(e.defender.idx, 'engagement');
      for (const k of torso) add(k.defender, 'torso');
      const access: AccessRow[] = [...via].map(([d, how]) => {
        const from = this.startPos[d], req = sim.intents[d]?.vel;
        let requestedAlong: number | null = null, achievedAlong: number | null = null, deficit: number | null = null;
        if (holder && from && req) {
          const dx = holder.x - from.x, dy = holder.y - from.y, len = Math.hypot(dx, dy);
          if (len > 1e-9) {
            const ux = dx / len, uy = dy / len, end = sim.agents[d].pos;
            requestedAlong = req.x * ux + req.y * uy;
            achievedAlong = ((end.x - from.x) * ux + (end.y - from.y) * uy) / dt;
            deficit = (requestedAlong - achievedAlong) * dt;
          }
        }
        return { defender: d, via: [...how], requestedAlong, achievedAlong, deficit };
      });
      this.data.rows.push({ t: this.tickStart, endpoint: sim.t, actor: a.idx, plan: now,
        engagement: e ? { defender: e.defender.idx, helpers: e.helpers.map(h => h.idx), type: e.type } : null,
        hands, loadOnCurrent: loadOn(now?.target), loadOnInitial: loadOn(this.initial.get(a.idx)?.target), torso, access,
        command: c ? { controller: c.controller, evaluated: c.evaluated, rewrittenBy: [...c.stages],
          finalOwner: c.stages.length === 0 ? 'raw' : c.stages[c.stages.length - 1] === 'engagement' ? 'engagement' : 'rewritten' } : null });
    }
    this.data.play.carrierByTick.push({ t: sim.t, carrier: sim.carrier?.idx ?? null });
    this.seal(sim);
  }

  /** Close the play-level facts from the engine's own state. Safe to call more than once. */
  seal(sim: PlaySim): void {
    this.sim = sim;
    this.data.play.snapPermitted = sim.snapAssessment?.snapPermitted ?? true;
    this.data.play.carrierEvents = sim.events.filter(e => CARRIER_EVENTS.has(e.type)).map(e => ({
      t: e.t, type: e.type, carrier: e.type === 'carrier_contact' ? e.a ?? null : null,
      defender: (e.type === 'carrier_contact' ? e.b : e.a) ?? null }));
    const over = sim.phase !== 'live';
    this.data.play.ended = over ? { t: sim.t, phase: sim.phase } : null;
    this.data.play.censored = !this.data.play.snapPermitted ? 'snap-prevented' : over ? 'play-ended' : 'still-live';
  }

  /** Jobs as the Phase II census defined them: each combination with a backer, plus each direct climber. */
  private jobs(): InitialJob[] {
    const jobs: InitialJob[] = [], seen = new Set<Combination>();
    for (const a of this.blockers) {
      const c = (a.behavior as RunBlocker).plan.combination;
      if (c && !seen.has(c)) { seen.add(c); if (c.backer) jobs.push({ id: jobs.length, kind: 'combo', members: c.members.map(m => m.idx), defender: c.defender.idx, backer: c.backer.idx }); }
    }
    for (const a of this.blockers) {
      const p = (a.behavior as RunBlocker).plan;
      if (p.kind === 'climb' && p.target) jobs.push({ id: jobs.length, kind: 'direct', members: [a.idx], defender: null, backer: p.target.idx });
    }
    return jobs;
  }
}
