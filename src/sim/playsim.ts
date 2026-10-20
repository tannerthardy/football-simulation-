/**
 * The play simulator: 22 agents on a continuous field, ticked at 20 Hz.
 *
 *   perceive → decide → technique intents (blocks, holds) → physics world
 *   (feet, contacts, joints, support) → down by contact → ball → tackle
 *   attempts → whistle → record
 */
import { FIELD_WIDTH, OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import { Rng } from '../core/rng.js';
import { DT } from '../core/units.js';
import { clamp, dist, len, type Vec2, type Vec3 } from '../core/vec.js';
import { DRAG_SPIRAL, DRAG_TUMBLE, solveLaunch, stepFlight, type BallFlight } from '../physics/ball.js';
import { handoffReach } from './ball-transfer.js';
import { assessForwardPass, fumbleRecovery, fumbleOutOfBounds } from './ball-rules.js';
import { observePrethrowBlocks, assessPrethrowBlocksOnPass } from './pass-interference.js';
import { bodyRadius } from '../physics/bodyshape.js';
import type { Body, MoveCommand } from '../physics/kinematics.js';
import { World, type Intent, type StepReport } from '../physics/world.js';
import { containCoverage } from './coverage-space.js';
import { derivePhysical } from '../players/physical.js';
import type { Player } from '../players/types.js';
import { alignDefense, alignOffense, fitPressStances, formationKey, gapY, type DefenseAlignment, type ManPreference, type OffenseAlignment } from '../playbook/alignment.js';
import { applyCheck, resolveZeus } from '../playbook/coverages.js';
import type { DefSlot, DefensivePlayCall, OffensivePlayCall, OffSlot } from '../playbook/types.js';
import { Agent, type Behavior, type Engagement, type RunContactSurface, type TeamSide } from './agent.js';
import { CoverageScouting, QBMind } from './qbmind.js';
import { Recognition, leaguePassLogOdds, type ScoutingReport, type SnapContext } from './recognition.js';
import { assignBehaviors, onBallCaught, onHandoff, onInterception, onLooseBall, onRecovery, onThrow } from './assign.js';
import { resolveCatchOpportunities } from './catching.js';
import { createEngagement, releaseJoints, updateEngagements } from './engagement.js';
import { PerceptionBuffer, type Perceived } from './perception.js';
import { IncidentalCatchReadiness } from './catch-readiness.js';
import { spaceTeammates } from './spacing.js';
import { predictCalledMotion } from './called-motion.js';
import { prepareJoinedCombinations } from './behaviors/blocking.js';
import { SnapMind } from './mind.js';
import { ReplayTrace } from './telemetry.js';
import { afterStep, releaseBond, tryTackles, updateBond, type TackleBond } from './tackle.js';
import type { BallState, CarrierSegment, Frame, PenaltyCall, FoulEvidence, FoulRecord, PlayEvent, PlayEventType, PlayOutcome, PlayResult, PlayStats, ReplayLevel } from './types.js';

export interface PlaySetup {
  offense: Partial<Record<OffSlot, Player>>;
  /** The defense's scouting of this offense (run/pass tendencies so far). */
  scouting?: ScoutingReport;
  /** The offense's scouting of this defense (coverage mix, disguise). */
  coverageScouting?: CoverageScouting;
  defense: Partial<Record<DefSlot, Player>>;
  offCall: OffensivePlayCall;
  defCall: DefensivePlayCall;
  /** Line of scrimmage (play-frame x). */
  los: number;
  ballY: number;
  firstDownX: number;
  seed: number | Rng;
  record?: boolean;
  /** Extra replay state; observational and opt-in, light by default. */
  recordLevel?: ReplayLevel;
  /** Energy at the snap by player id (0–1). */
  energy?: Map<string, number>;
  manPrefs?: ManPreference;
  /** Ball carriers try to get out of bounds (2-minute drill). */
  hurry?: boolean;
  /** Wind (yd/s). */
  wind?: Vec2;
  /** Record one frame every N ticks (default 2 → 10 Hz). */
  recordEvery?: number;
  /** Down (for the QB's pre-snap checks). */
  down?: number;
  /** Rule 8 fumble context at the snap; the warning must already have occurred. */
  afterTwoMinuteWarning?: boolean;
  isTry?: boolean;
  /** Let the QB check out of the call at the line. */
  audibles?: boolean;
  /** Fixed physics substeps per tick (convergence studies); adaptive by default. */
  substeps?: number;
  /** Research-only support-coordinate prototype; production uses legacy. */
  supportModel?: 'legacy' | 'virtual-foot';
  constraintWork?: 'per-update' | 'per-solve';
  impactTiming?: 'speculative' | 'local-sweep';
  supportIntegration?: 'mean' | 'integrated';
  /** Experimental angular hand patch; default center keeps production law. */
  handContact?: 'center' | 'patch';
}

const MAX_PLAY_TIME = 25;

export class PlaySim {
  readonly dt = DT;
  readonly rng: Rng;
  t = 0;
  readonly agents: Agent[] = [];
  readonly offense: Agent[] = [];
  readonly defense: Agent[] = [];
  readonly bySlot = new Map<string, Agent>();
  readonly los: number;
  readonly ballY: number;
  readonly firstDownX: number;
  offCall: OffensivePlayCall;
  readonly defCall: DefensivePlayCall;
  readonly offAlign: OffenseAlignment;
  readonly defAlign: DefenseAlignment;
  isPass: boolean;
  /** The quarterback's read of the defense (coverage belief, vision). */
  qbMind!: QBMind;
  readonly hurry: boolean;
  readonly wind: Vec2;
  ball: BallState;
  engagements: Engagement[] = [];
  bond: TackleBond | null = null;
  /** Every body on the field and every contact between them. */
  readonly world: World;
  /** This tick's movement intents: decisions refined by block and tackle technique. */
  intents: Intent[] = [];
  /** Last time each player was touched by an opponent (body contact or a hold). */
  readonly touchedAt = new Map<Agent, number>();
  /** The last physics step's report (contacts, falls, ground impulse). */
  lastStep: StepReport | null = null;
  private readonly dives = new Map<Agent, Vec2>();
  private readonly lunges = new Map<Agent, Vec2>();
  readonly events: PlayEvent[] = [];
  readonly frames: Frame[] = [];
  readonly perception: PerceptionBuffer;
  readonly incidentalCatchReadiness = new IncidentalCatchReadiness();
  readonly trace: ReplayTrace;
  private readonly record: boolean;
  private readonly recordEvery: number;
  private tickCount = 0;
  private cmds: MoveCommand[] = [];

  phase: 'live' | 'dead' = 'live';
  outcome: PlayOutcome | null = null;
  endSpot: Vec2 | null = null;
  possession: TeamSide = 'O';
  scoreKind: 'TD' | 'safety' | null = null;
  private scoreTeam?: TeamSide;
  penalty: PenaltyCall | undefined;
  private calledFouls?: PenaltyCall[];
  private recordedFouls?: FoulRecord[];
  private unsupportedRules?: Set<string>;
  // Historical saved-state restorers can create the prototype without running
  // today's constructor. Absent new evidence then means an empty ledger.
  get penalties(): PenaltyCall[] { return this.calledFouls ??= []; }
  get foulRecords(): FoulRecord[] { return this.recordedFouls ??= []; }
  get ruleLimitations(): Set<string> { return this.unsupportedRules ??= new Set(); }
  private readonly down: number;
  private readonly afterTwoMinuteWarning: boolean;
  private readonly isTry: boolean;
  private possessionChanges = 0;
  private forwardPasses = 0;
  private statsBeforeIllegalPass?: PlayStats;

  // play-level facts used by behaviors and stats
  handoffAt = -1;
  throwAt = -1;
  catchAt = -1;
  catchX = 0;
  /** Who held the ball, in order (stat attribution across fumbles and returns). */
  segments: CarrierSegment[] = [];
  /** Has the ball crossed the LOS in an offensive player's hands. */
  crossedLOS = false;
  /** Did the offense intend to pass and the QB tucked and ran. */
  scrambled = false;
  /** QB is extending the play: receivers break off their routes and find grass. */
  scrambleDrill = false;
  stats: PlayStats = {
    tacklers: [],
    completed: false,
    attempted: false,
    sacked: false,
    scramble: false,
    throwaway: false,
    pressured: false,
    brokenTackles: 0,
    missedTackles: 0,
    dropped: false,
  };
  /** First opponent body impact or successful tackle grasp; excludes whiffs. */
  firstContactX: number | null = null;
  /** QB currently reading this receiver (zone defenders read his eyes). */
  qbEyes: Agent | null = null;
  /** When the QB started his throwing motion (−1 before). */
  windupAt = -1;
  /** Everyone's x at the snap (cue reading: who set back, who fired out). */
  snapX: number[] = [];
  /** The situation and look the defense saw before the snap. */
  snapContext!: SnapContext;
  readonly coverageScouting: CoverageScouting | undefined;
  /** Predicted remaining flight of the ball (absolute times). */
  ballPath: Array<{ t: number; x: number; y: number; z: number }> = [];

  constructor(setup: PlaySetup) {
    this.rng = typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed;
    this.coverageScouting = setup.coverageScouting;
    this.los = setup.los;
    this.ballY = setup.ballY;
    this.firstDownX = setup.firstDownX;
    this.offCall = setup.offCall;
    this.isPass = setup.offCall.kind === 'pass';
    this.hurry = setup.hurry ?? false;
    this.down = setup.down ?? 1;
    this.afterTwoMinuteWarning = setup.afterTwoMinuteWarning ?? false;
    this.isTry = setup.isTry ?? false;
    this.wind = setup.wind ?? { x: 0, y: 0 };
    this.record = setup.record ?? false;
    this.recordEvery = setup.recordEvery ?? 2;
    this.trace = new ReplayTrace(setup.recordLevel ?? 'light', this.recordEvery, this.record);

    this.offAlign = alignOffense(setup.offCall.formation, setup.offCall.flip, this.los, this.ballY);
    // The secondary checks its call to the receiver distribution it sees.
    const zeus = setup.defCall.zeus;
    const called = zeus ? resolveZeus(setup.defCall, this.offAlign.refOf[zeus], Math.min(this.offAlign.counts.S, this.offAlign.counts.W)) : setup.defCall;
    this.defCall = zeus ? called : applyCheck(called, formationKey(this.offAlign));
    const defSlots = Object.keys(setup.defense) as DefSlot[];
    this.defAlign = alignDefense(this.defCall, this.offAlign, defSlots, setup.manPrefs);

    const idle: Behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
    const mk = (team: TeamSide, slot: string, player: Player, pos: Vec2, facing: number) => {
      const profile = derivePhysical(player);
      const body: Body = { pos: { ...pos }, vel: { x: 0, y: 0 }, facing, energy: setup.energy?.get(player.id) ?? 1, profile };
      const mind = new SnapMind(player, this.rng.fork(`mind:${team}:${slot}`), body.energy);
      // Small legal defensive alignment scatter; offensive formation stays legal.
      if (team === 'D') body.pos.y = clamp(body.pos.y + mind.alignmentError, 0.5, FIELD_WIDTH - 0.5);
      const a = new Agent(this.agents.length, team, slot, player, profile, body, idle, mind);
      this.agents.push(a);
      (team === 'O' ? this.offense : this.defense).push(a);
      this.bySlot.set(slot, a);
      return a;
    };
    for (const [slot, player] of Object.entries(setup.offense) as Array<[OffSlot, Player]>) {
      const spot = this.offAlign.spots[slot];
      if (!spot) continue;
      mk('O', slot, player, spot.pos, 0);
    }
    for (const [slot, player] of Object.entries(setup.defense) as Array<[DefSlot, Player]>) {
      const spot = this.defAlign.spots[slot];
      if (!spot) continue;
      mk('D', slot, player, spot.pos, Math.PI);
    }
    fitPressStances(this.defAlign, this.defense.map(a => ({ slot: a.slot as DefSlot, pos: a.pos, radius: a.profile.radius })), this.los);
    this.snapX = this.agents.map((a) => a.pos.x);
    this.world = new World(this.agents.map((a) => a.body), { substeps: setup.substeps, supportModel: setup.supportModel, constraintWork: setup.constraintWork, impactTiming: setup.impactTiming, supportIntegration: setup.supportIntegration, handContact: setup.handContact });
    // Linemen and backs start in their stances; skill players upright.
    for (const a of this.agents) {
      const line = ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) || a.player.position === 'DT' || a.player.position === 'EDGE';
      a.body.support!.posture = line ? 0.7 : 0.3;
    }
    const qb = this.bySlot.get('QB');
    if (!qb) throw new Error('No QB in offensive personnel');
    this.ball = { kind: 'held', carrier: qb };
    this.beginSegment(qb, 'snap');
    this.perception = new PerceptionBuffer(this.agents.length, this.dt);
    this.stageDefense(setup.manPrefs);
    this.snapX = this.agents.map((a) => a.pos.x);
    this.qbMind = new QBMind(this, qb);
    if (setup.audibles) {
      this.offCall = this.qbMind.preSnapCheck(this.offCall, { hurry: this.hurry, down: setup.down ?? 1, distance: this.firstDownX - this.los });
      this.isPass = this.offCall.kind === 'pass';
    }
    this.stats.qbRead = this.qbMind.report;
    // What the defense expects, from the formation it sees and the situation.
    const f = this.offCall.formation;
    this.snapContext = {
      down: setup.down ?? 1,
      distance: this.firstDownX - this.los,
      yardline: this.los - 10,
      personnel: f.personnel,
      qb: f.qb,
      empty: !f.slots.RB,
      hurry: this.hurry,
    };
    const expected = setup.scouting ? setup.scouting.passLogOdds(this.snapContext) : leaguePassLogOdds(this.snapContext);
    for (const d of this.defense) d.recog = new Recognition(d, this, expected);
    assignBehaviors(this);
    this.cmds = this.agents.map(() => ({ vel: { x: 0, y: 0 } }));
  }

  /** Called movement with finite travel and an observable history. Late
   * arrivals keep their velocity into the snap instead of teleporting home. */
  private stageDefense(prefs?: ManPreference): void {
    const stem = this.defCall.frontStem, creep = this.defCall.creep;
    if (!stem && !creep) { this.perception.record(this.agents, this.carrier?.idx ?? null); return; }
    for (const seconds of [stem?.secondsBeforeSnap,creep?.secondsBeforeSnap]) {
      if (seconds !== undefined && (!Number.isFinite(seconds) || seconds<=0 || seconds>3)) throw new Error('Pre-snap movement must start within 0–3 seconds of snap');
    }
    if (stem && !stem.from.personnel.includes(this.defCall.personnel)) throw new Error('Stem front requires compatible defensive personnel');
    const targets = new Map<Agent,Vec2>();
    if (stem) {
      const shown = alignDefense({...this.defCall,front:stem.from},this.offAlign,this.defense.map((a)=>a.slot as DefSlot),prefs);
      for (const d of this.defense) {
        targets.set(d,{...d.pos});
        d.body.pos = {...shown.spots[d.slot as DefSlot]!.pos};
        d.body.pos.y = clamp(d.pos.y+d.mind.alignmentError,.5,FIELD_WIDTH-.5);
      }
    }
    const mug = creep ? this.slot(creep.slot) : undefined;
    if (creep) {
      if (!mug) throw new Error('Creep slot missing from personnel');
      const spot = this.defAlign.spots[creep.slot]!;
      if (spot.role.kind !== 'blitz') throw new Error('Creep requires a called blitzer');
      const side = spot.role.side === 'S' ? this.offAlign.strongSign : -this.offAlign.strongSign;
      targets.set(mug!,{x:this.los+.65,y:gapY(this.offAlign,spot.role.gap,side)});
      mug!.body.pos.x = Math.max(mug!.pos.x,this.los+4);
    }
    // A stem replaces the initial presentation above. Fit that starting
    // stance before its first observable history, never the moving endpoint.
    fitPressStances(this.defAlign, this.defense.map(a => ({ slot: a.slot as DefSlot, pos: a.pos, radius: a.profile.radius })), this.los);
    const ticks = Math.ceil(Math.max(stem?.secondsBeforeSnap ?? 0,creep?.secondsBeforeSnap ?? 0)/this.dt);
    // Prime with the presentation that was actually shown, never the called
    // destination. Observers with longer latency retain the old front.
    this.perception.record(this.agents, this.carrier?.idx ?? null);
    for (let i=ticks;i>0;i--) {
      this.t = -i*this.dt;
      const intents: Intent[] = this.agents.map((a) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      for (const [d,target] of targets) {
        const active = d === mug ? this.t>=-creep!.secondsBeforeSnap-1e-8 : !!stem && this.t>=-stem.secondsBeforeSnap-1e-8;
        const dx=target.x-d.pos.x,dy=target.y-d.pos.y,length=Math.hypot(dx,dy);
        const speed=active ? Math.min(d.profile.vmax*.45,length*3) : 0;
        intents[d.idx] = {vel:{x:length ? dx/length*speed : 0,y:length ? dy/length*speed : 0},facing:Math.PI};
      }
      this.world.time = this.t;
      this.world.step(intents, this.dt);
      for (const d of this.defense) d.body.pos.x=Math.max(this.los+d.profile.radius+.05,d.pos.x);
      this.perception.record(this.agents, this.carrier?.idx ?? null);
      if (this.record && i%this.recordEvery===0) this.recordFrame(intents);
    }
    this.t=0;
    this.perception.record(this.agents, this.carrier?.idx ?? null);
    if (this.record) this.recordFrame();
  }

  // ------------------------------------------------------------ queries

  get qb(): Agent {
    return this.bySlot.get('QB')!;
  }
  get carrier(): Agent | null {
    return this.ball.kind === 'held' ? this.ball.carrier : null;
  }
  /** x direction the team with the ball is attacking (+1 offense, −1 defense after turnover). */
  attackDir(team: TeamSide): number {
    return team === 'O' ? 1 : -1;
  }
  opponents(a: Agent): Agent[] {
    return a.team === 'O' ? this.defense : this.offense;
  }
  teammates(a: Agent): Agent[] {
    return a.team === 'O' ? this.offense : this.defense;
  }
  slot(name: string): Agent | undefined {
    return this.bySlot.get(name);
  }

  /** What `observer` perceives of `target` (delayed for opponents). */
  see(observer: Agent, target: Agent, delayScale = 1): Perceived {
    if (observer.team === target.team) {
      const seen = this.perception.perceive(target.idx, 0.05);
      this.trace.observe(observer, target, seen, this.t);
      return seen;
    }
    let delay = observer.mind.observationDelay(observer.profile.reactionTime * delayScale);
    // Attention follows the observer's belief, regardless of the hidden call.
    const line = ['LT', 'LG', 'C', 'RG', 'RT'];
    if (observer.recog?.read === 'run' && target !== this.qb && target.slot !== 'RB' && !line.includes(target.slot)) delay += 0.15;
    // Eyes on keys: everything else is peripheral.
    if (observer.eyes && !observer.eyes.keys.includes(target)) delay += observer.eyes.peripheral;
    const seen = this.perception.perceive(target.idx, delay);
    this.trace.observe(observer, target, seen, this.t);
    return seen;
  }

  ballPos(): Vec3 {
    switch (this.ball.kind) {
      case 'held':
        return { x: this.ball.carrier.pos.x, y: this.ball.carrier.pos.y, z: 1.1 };
      case 'air':
      case 'pitch':
      case 'loose':
        return this.ball.flight.pos;
      case 'dead':
        return { x: this.endSpot?.x ?? this.los, y: this.endSpot?.y ?? this.ballY, z: 0.2 };
    }
  }

  event(type: PlayEventType, a?: Agent | null, b?: Agent | null, note?: string): void {
    this.events.push({ t: round2(this.t), type, a: a?.idx, b: b?.idx, pos: a ? { x: round2(a.pos.x), y: round2(a.pos.y) } : undefined, note });
  }

  /** Retain every supported called act without consuming an execution draw.
   * Legacy holding calls stay explicitly qualified as a sampled abstraction. */
  recordFoul(call: PenaltyCall, evidence: FoulEvidence): void {
    const id = call.id ?? `${call.kind}:${call.playerId}:${call.t ?? this.t}`;
    if (this.penalties.some(p => p.id === id)) return;
    const recorded = { ...call, id, t: call.t ?? this.t,
      possessionChanges: call.possessionChanges ?? this.possessionChanges };
    this.penalties.push(recorded);
    this.penalty ??= recorded;
    const record: FoulRecord = { id, t: recorded.t, kind: recorded.kind,
      playerId: recorded.playerId, called: true,
      assessment: evidence.source === 'native' ? 'violation' : 'legacy_call', evidence };
    const old = this.foulRecords.findIndex(r => r.id === id);
    if (old >= 0) this.foulRecords[old] = record;
    else this.foulRecords.push(record);
    if (call.kind === 'opi' || call.kind === 'illegal_forward_pass') {
      const actor = this.agents.find(a => a.player.id === call.playerId);
      this.events.push({ t: recorded.t, type: call.kind, a: actor?.idx,
        pos: { x: call.spotX ?? actor?.pos.x ?? this.los, y: actor?.pos.y ?? this.ballY }, note: call.rule });
    }
  }

  // ------------------------------------------------------------ actions

  handoff(from: Agent, to: Agent): boolean {
    if (this.ball.kind !== 'held' || this.ball.carrier !== from || to.team !== from.team
      || from.isDown(this.t) || to.isDown(this.t)
      || dist(from.pos, to.pos) > handoffReach(from, to)) return false;
    this.ball = { kind: 'held', carrier: to };
    this.endSegment(from.pos.x, 'handoff');
    this.beginSegment(to, 'handoff');
    this.handoffAt = this.t;
    this.stats.rusher = to.player.id;
    this.event('handoff', from, to);
    onHandoff(this, from, to);
    return true;
  }

  /** Backward toss: possession stays in flight until a body can reach it.
   * Travel speed is an explicit 12 yd/s pitch assumption, not pass-arm power. */
  pitchBall(from: Agent, to: Agent): boolean {
    if (this.ball.kind !== 'held' || this.ball.carrier !== from || from.isDown(this.t)
      || to.isDown(this.t) || from.team !== to.team) return false;
    const pos = this.ballPos();
    const T = Math.max(0.2, dist(from.pos, to.pos) / 12);
    const intended = { x: Math.min(from.pos.x, to.pos.x + to.vel.x * T), y: to.pos.y + to.vel.y * T, z: 1.1 };
    this.ball = { kind: 'pitch', thrower: from, target: to, releaseT: this.t, intended,
      flight: { pos, vel: solveLaunch(pos, intended, T, DRAG_TUMBLE, this.wind), drag: DRAG_TUMBLE } };
    this.endSegment(from.pos.x, 'handoff');
    this.event('pitch', from, to);
    return true;
  }

  throwBall(qb: Agent, target: Agent | null, v0: Vec3, intended: Vec3, arrivalT: number, throwaway = false): void {
    if (this.ball.kind !== 'held' || this.ball.carrier !== qb) return;
    const release: Vec3 = { x: qb.pos.x + Math.cos(qb.body.facing) * 0.3, y: qb.pos.y + Math.sin(qb.body.facing) * 0.3, z: 2.2 };
    const forward = v0.x * (qb.team === 'O' ? 1 : -1) > 0;
    const illegal = forward ? assessForwardPass({ previousForwardPasses: this.forwardPasses,
      possessionChangedBeforePass: this.possessionChanges > 0,
      fromBehindLine: qb.pos.x + bodyRadius(qb.body, 1, 0) <= this.los && release.x <= this.los }) : null;
    if (illegal && !this.statsBeforeIllegalPass) {
      this.statsBeforeIllegalPass = { ...this.stats, tacklers: [...this.stats.tacklers] };
    }
    if (illegal) this.recordFoul({ kind: 'illegal_forward_pass', against: qb.team,
      playerId: qb.player.id, yards: 5, autoFirst: false, spotX: release.x, t: this.t,
      rule: illegal.rule, reason: illegal.reason, enforcement: illegal.enforcement,
      lossDown: illegal.lossDown }, { source: 'native', rule: illegal.rule,
      action: 'forward_pass', facts: { reason: illegal.reason, previousForwardPasses: this.forwardPasses,
        possessionChanges: this.possessionChanges, releaseX: release.x } });
    assessPrethrowBlocksOnPass(this, qb, release.x, this.t, v0.x);
    if (forward) this.forwardPasses++;
    this.ball = {
      kind: 'air',
      flight: { pos: release, vel: v0, drag: DRAG_SPIRAL },
      thrower: qb,
      target,
      releaseT: this.t,
      releaseX: qb.pos.x,
      intended,
      arrivalT,
      deflected: false,
      throwaway,
    };
    this.throwAt = this.t;
    this.endSegment(qb.pos.x, 'pass');
    this.computeBallPath();
    // A later illegal pass must not overwrite the actual earlier passer/INT.
    if (!illegal) {
      this.stats.attempted = true;
      this.stats.passer = qb.player.id;
      this.stats.timeToThrow = this.t;
      this.stats.throwaway = throwaway;
      if (target) {
        this.stats.target = target.player.id;
        this.stats.airYards = intended.x - this.los;
      }
    }
    this.event(throwaway ? 'throwaway' : 'throw', qb, target, throwaway ? 'thrown away' : undefined);
    onThrow(this);
  }

  /** Pass caught (or intercepted) by `a` at the current ball position. */
  possess(a: Agent, how: 'catch' | 'interception' | 'recovery'): void {
    const loose = this.ball.kind === 'loose' ? this.ball : null;
    const prevTeam = loose ? loose.lastTeam : this.ball.kind === 'air' ? this.ball.thrower.team
      : this.ball.kind === 'held' ? this.ball.carrier.team : this.possession;
    if (a.team !== prevTeam) this.possessionChanges++;
    this.ball = { kind: 'held', carrier: a };
    this.beginSegment(a, how);
    if (how === 'catch') {
      this.catchAt = this.t;
      this.catchX = a.pos.x;
      this.stats.completed = true;
      this.stats.receiver = a.player.id;
      this.event('catch', a);
      onBallCaught(this, a);
    } else if (how === 'interception') {
      this.possession = a.team;
      this.stats.interceptedBy = a.player.id;
      this.catchX = a.pos.x;
      this.event('interception', a);
      onInterception(this, a);
    } else {
      this.possession = a.team;
      if (prevTeam !== a.team) this.stats.fumbleLost = true;
      this.stats.fumbleRecoveredBy = a.player.id;
      this.event('recovery', a);
      onRecovery(this, a);
      if (loose) {
        const ruling = fumbleRecovery({ kind: loose.origin ?? 'fumble',
          fumblerId: loose.fumbledBy.player.id, fumblerTeam: loose.lastTeam,
          recovererId: a.player.id, recovererTeam: a.team,
          fumbleX: loose.fumbleX ?? loose.fumbledBy.pos.x, recoveryX: a.pos.x,
          down: this.down, afterTwoMinuteWarning: this.afterTwoMinuteWarning,
          isTry: this.isTry, possessionChangedBeforeFumble: loose.possessionChangedBeforeFumble ?? false });
        if (!ruling.mayAdvance) {
          if (ruling.deadBallX > OWN_GOAL_X && ruling.deadBallX < OPP_GOAL_X) {
            const event = [...this.events].reverse().find(e => e.type === 'recovery' && e.a === a.idx);
            if (event) event.note = `${ruling.rule}: teammate recovery cannot advance`;
            this.whistle('tackle', { x: ruling.deadBallX, y: a.pos.y });
          } else {
            const releaseX = loose.fumbleX;
            if (releaseX !== undefined && releaseX > OWN_GOAL_X && releaseX < OPP_GOAL_X) {
              // In this native branch an untouched true fumble entered the
              // fumbler's own end zone from the field. No player momentum
              // exception or intervening bat/kick is represented.
              this.scoreKind = 'safety';
              this.scoreTeam = a.team === 'O' ? 'D' : 'O';
              this.event('safety', a, null, ruling.rule);
              this.whistle('safety', { x: ruling.deadBallX, y: a.pos.y });
            } else {
              throw new Error(`Unsupported NFL ${ruling.rule}: end-zone recovery impetus/momentum`);
            }
          }
        }
      }
    }
  }

  fumble(carrier: Agent, hitter: Agent | null): void {
    if (this.ball.kind !== 'held') return;
    const v = carrier.body.vel;
    const ang = this.rng.range(0, Math.PI * 2);
    const sp = this.rng.range(2, 6);
    const flight: BallFlight = {
      pos: { x: carrier.pos.x, y: carrier.pos.y, z: 1.0 },
      vel: { x: v.x * 0.5 + Math.cos(ang) * sp, y: v.y * 0.5 + Math.sin(ang) * sp, z: this.rng.range(0.5, 3) },
      drag: DRAG_TUMBLE,
    };
    this.ball = { kind: 'loose', flight, since: this.t, lastTeam: carrier.team, fumbledBy: carrier,
      fumbleX: carrier.pos.x, origin: 'fumble', possessionChangedBeforeFumble: this.possessionChanges > 0 };
    // Statistical spot of the fumble: forward progress if he was wrapped up.
    this.endSegment(this.bond ? this.bond.progressX : carrier.pos.x, 'fumble');
    // Offensive fumbles are the box-score stat; a returner's fumble is only an event.
    if (carrier.team === 'O') this.stats.fumbledBy = carrier.player.id;
    releaseBond(this);
    this.event('fumble', carrier, hitter);
    onLooseBall(this);
  }

  /** Re-predict the ball's flight (after a throw or deflection). */
  computeBallPath(): void {
    this.ballPath = [];
    if (this.ball.kind !== 'air' && this.ball.kind !== 'loose') return;
    const f: BallFlight = { pos: { ...this.ball.flight.pos }, vel: { ...this.ball.flight.vel }, drag: this.ball.flight.drag };
    let t = this.t;
    for (let i = 0; i < 100; i++) {
      stepFlight(f, 0.05, this.wind);
      t += 0.05;
      this.ballPath.push({ t: round2(t), x: f.pos.x, y: f.pos.y, z: f.pos.z });
      if (f.pos.z <= 0) break;
    }
  }

  /** A deliberate dive (a layout tackle): he leaves his feet on the next step. */
  diveAt(a: Agent, dir: Vec2): void {
    this.dives.set(a, dir);
  }

  /** Drive a body beyond its gait next step (a strike): extra velocity, yd/s. */
  lungeAt(a: Agent, dv: Vec2): void {
    this.lunges.set(a, dv);
  }

  engage(blocker: Agent, defender: Agent, type: 'pass' | 'run', drive: Vec2 | null = null, surface?: RunContactSurface): Engagement | null {
    return createEngagement(this, blocker, defender, type, drive, surface);
  }

  disengage(e: Engagement): void {
    releaseJoints(this, e);
    e.blocker.engagement = null;
    e.defender.engagement = null;
    for (const h of e.helpers) if (h.engagement === e) h.engagement = null;
    this.engagements = this.engagements.filter((x) => x !== e);
  }

  whistle(outcome: PlayOutcome, spot: Vec2): void {
    if (this.phase === 'dead') return;
    this.phase = 'dead';
    this.outcome = outcome;
    this.endSpot = { x: spot.x, y: clamp(spot.y, 0, FIELD_WIDTH) };
    if (this.ball.kind === 'held') this.endSegment(spot.x, 'dead');
    if (this.ball.kind !== 'dead') this.ball = { kind: 'dead' };
  }

  private beginSegment(a: Agent, how: CarrierSegment['how']): void {
    this.segments.push({ team: a.team, carrier: a.player.id, how, startX: a.pos.x, endX: a.pos.x, end: 'live' });
  }

  private endSegment(x: number, end: CarrierSegment['end']): void {
    const g = this.segments[this.segments.length - 1];
    if (g && g.end === 'live') {
      g.endX = x;
      g.end = end;
    }
  }

  // ------------------------------------------------------------ loop

  /** Let both joined linemen make their own read before movement commands. */
  prepareJoinedRunBlocks(): void {
    prepareJoinedCombinations(this);
  }

  run(): PlayResult {
    this.event('snap', this.slot('C') ?? this.qb);
    while (this.phase === 'live' && this.t < MAX_PLAY_TIME) this.tick();
    if (this.phase === 'live') {
      const c = this.carrier ?? this.qb;
      this.whistle('timeout', c.pos);
    }
    return this.buildResult();
  }

  tick(): void {
    const t = this.t;
    this.perception.record(this.agents, this.carrier?.idx ?? null);
    for (const a of this.agents) {
      let nearby = 0;
      for (const other of this.opponents(a)) {
        const seen = this.perception.perceive(other.idx, a.profile.reactionTime);
        if (Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) < 3) nearby++;
      }
      a.mind.update(t, this.dt, a.body.energy, a.engagement ? 0.65 : Math.min(1, nearby / 4));
    }
    this.incidentalCatchReadiness.sense(this);
    for (const d of this.defense) d.recog?.update(d, this);

    this.prepareJoinedRunBlocks();

    // Decide.
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      // Reaction delays control, not collisions: he can still be pushed.
      const command = t < a.snapReadyAt ? { vel: { x: 0, y: 0 }, facing: a.facing } : a.behavior.update(a, this);
      this.cmds[i] = a.behavior.kind === 'man' || a.behavior.kind === 'zone' ? containCoverage(a, command) : command;
    }

    // Intents: the decisions, refined by the techniques that own contact.
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const dive = this.dives.get(a), lunge = this.lunges.get(a);
      this.intents[i] = dive || lunge ? { ...this.cmds[i], dive, lunge } : { ...this.cmds[i] };
    }
    this.dives.clear();
    this.lunges.clear();
    updateEngagements(this, this.intents);
    if (this.bond) updateBond(this, this.bond, this.intents);
    // Constraint ownership and last-step touch are felt by the actor. Free
    // movement forecasts must not pretend these loads or joints are absent.
    const constrained=new Set(this.world.joints.filter(j=>j.kind!=='grasp'||!j.broken)
      .flatMap(j=>[j.a,j.b]));
    if(this.bond){
      constrained.add(this.bond.carrier.body);
      for(const tackler of this.bond.tacklers)constrained.add(tackler.body);
    }
    for(const contact of this.lastStep?.contacts??[]){
      constrained.add(this.agents[contact.i].body);constrained.add(this.agents[contact.j].body);
    }
    // A called track is an announced target, not already achieved velocity.
    // Advance the acquired picture only by the bounded free response to it.
    spaceTeammates(this.agents, this.intents, (a,b)=>{
      const seen = this.see(a,b), called = a.team === b.team ? b.behavior.calledMotion?.() : null;
      return predictCalledMotion(seen, called, b.profile);
    },{now:t,constrained});
    // Contact/spacing controllers cannot wake leg drive before the snap cue.
    for (const a of this.agents) if (t < a.snapReadyAt) {
      this.intents[a.idx] = { ...this.intents[a.idx], vel: { x: 0, y: 0 }, facing: a.facing,
        push: 0, dive: undefined, lunge: undefined, posture: a.body.support!.posture };
    }

    // Physics: feet, contacts, holds and balance, in substeps.
    let catchStarts: Vec2[] | undefined;
    if (this.phase === 'live') {
      // Save actual endpoints of the same interval the ball advances below,
      // including throws initiated by this tick's controller decisions.
      if (this.ball.kind === 'air') catchStarts = this.agents.map(a => ({ ...a.pos }));
      this.world.time = t;
      const blockStarts = this.possession === 'O' && this.throwAt < 0
        ? this.agents.map(a => ({ ...a.pos })) : undefined;
      const report = this.world.step(this.intents, this.dt);
      this.lastStep = report;
      if (blockStarts) observePrethrowBlocks(this, report, t, blockStarts);
      this.afterPhysics(report);
    }
    this.updateBall(catchStarts);
    if (this.phase === 'live') tryTackles(this);
    if (this.phase === 'live') this.checkWhistle();
    if (this.record && (this.tickCount++ % this.recordEvery === 0 || this.phase === 'dead')) this.recordFrame();
    this.t = round2(this.t + this.dt);
  }

  /** Touches, first contact, falls and the pile's external impulse from the step. */
  private afterPhysics(report: StepReport): void {
    const t = this.t;
    for (const e of this.engagements) {
      if (e.contactReported) continue;
      const j = e.hands;
      const loaded = Math.hypot(j?.normalForce ?? 0, j?.tangentForce ?? 0) > 1e-6
        || report.contacts.some(c => (c.i === e.blocker.idx && c.j === e.defender.idx)
          || (c.j === e.blocker.idx && c.i === e.defender.idx));
      if (loaded) {
        e.contactReported = true;
        // Contact is resolved within [t,t+dt], at 20 Hz precision.
        this.events.push({ t: round2(t+this.dt), type: 'block_contact', a: e.blocker.idx,
          b: e.defender.idx, pos: { ...e.blocker.pos }, note: e.type });
      }
    }
    const carrier = this.carrier;
    for (const c of report.contacts) {
      const a = this.agents[c.i], b = this.agents[c.j];
      if (a.team === b.team) continue;
      this.touchedAt.set(a, t);
      this.touchedAt.set(b, t);
      if (carrier && t >= 0 && this.firstContactX === null && (carrier === a || carrier === b)) {
        this.firstContactX = carrier.pos.x;
        this.event('carrier_contact', carrier, carrier === a ? b : a, 'body collision');
      }
    }
    if (this.bond) {
      for (const d of this.bond.tacklers) { this.touchedAt.set(d, t); this.touchedAt.set(this.bond.carrier, t); }
      const pile = [this.bond.carrier, ...this.bond.tacklers];
      this.bond.physics = {
        externalImpulse: pile.reduce((s, a) => ({ x: s.x + report.groundImpulse[a.idx].x, y: s.y + report.groundImpulse[a.idx].y }), { x: 0, y: 0 }),
        groundWork: pile.reduce((s, a) => s + report.groundWork[a.idx], 0),
      };
    }
    for (const i of report.falls) {
      const a = this.agents[i];
      a.tags.add('fell');
      this.event('fall', a, null, a.body.support?.cause);
    }
    afterStep(this);
  }

  private updateBall(catchStarts?: readonly Readonly<Vec2>[]): void {
    const ball = this.ball;
    if (ball.kind === 'held' || ball.kind === 'dead') return;
    const prev = { ...ball.flight.pos };
    stepFlight(ball.flight, this.dt, this.wind);
    const cur = ball.flight.pos;

    if (ball.kind === 'pitch') {
      // Swept reach, so a pitch cannot pass through a receiver between ticks.
      const dx = cur.x - prev.x, dy = cur.y - prev.y, d2 = dx * dx + dy * dy;
      const candidates = this.agents.filter(a => a !== ball.thrower && !a.isDown(this.t))
        .map(a => {
          const s = clamp(((a.pos.x - prev.x) * dx + (a.pos.y - prev.y) * dy) / Math.max(1e-9, d2), 0, 1);
          const z = prev.z + (cur.z - prev.z) * s;
          return { a, s, valid: z > 0.1 && z <= a.profile.reactReach
            && Math.hypot(a.pos.x - prev.x - dx * s, a.pos.y - prev.y - dy * s) <= a.profile.reach };
        }).filter(c => c.valid).sort((a, b) => a.s - b.s);
      if (this.t - ball.releaseT >= 0.1 && candidates.length) {
        const to = candidates[0].a;
        this.ball = { kind: 'held', carrier: to };
        this.beginSegment(to, to.team === ball.thrower.team ? 'handoff' : 'recovery');
        this.possession = to.team;
        if (to.team !== ball.thrower.team) this.possessionChanges++;
        this.event('pitch_catch', to, ball.thrower, 'pitch received');
        if (to.team === ball.thrower.team) {
          this.handoffAt = this.t; this.stats.rusher = to.player.id;
          onHandoff(this, ball.thrower, to);
        } else {
          if (ball.thrower.team === 'O') this.stats.fumbledBy = ball.thrower.player.id;
          this.stats.fumbleLost = true;
          this.stats.fumbleRecoveredBy = to.player.id;
          this.event('recovery', to, ball.thrower, 'opponent pitch recovered');
          onRecovery(this, to);
        }
      } else if (cur.z <= 0.05 || cur.y <= 0 || cur.y >= FIELD_WIDTH) {
        this.ball = { kind: 'loose', flight: ball.flight, since: ball.releaseT,
          lastTeam: ball.thrower.team, fumbledBy: ball.thrower,
          fumbleX: ball.thrower.pos.x, origin: 'backward_pass', possessionChangedBeforeFumble: this.possessionChanges > 0 };
        this.stats.fumbledBy = ball.thrower.player.id;
        this.event('fumble', ball.thrower, null, 'pitch missed');
        onLooseBall(this);
      }
      return;
    }

    if (ball.kind === 'air') {
      resolveCatchOpportunities(this, prev, cur, catchStarts);
      if (this.ball.kind !== 'air') return;
      if (cur.z <= 0.05 || cur.y < -1 || cur.y > FIELD_WIDTH + 1 || cur.x > 121) {
        this.stats.completed = false;
        this.event('incomplete', null, null);
        this.whistle('incomplete', { x: this.los, y: this.ballY });
      }
      return;
    }

    // Loose ball: bounce, roll, recover.
    if (cur.z <= 0) {
      const f = ball.flight;
      f.pos = { ...f.pos, z: 0 };
      // Prolate spheroid bounces are erratic.
      const ang = this.rng.range(-1.2, 1.2);
      const vx = f.vel.x * 0.55;
      const vy = f.vel.y * 0.55;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      f.vel = { x: vx * c - vy * s, y: vx * s + vy * c, z: Math.abs(f.vel.z) * this.rng.range(0.15, 0.45) };
      if (Math.hypot(f.vel.x, f.vel.y) < 0.5 && f.vel.z < 0.4) f.vel = { x: 0, y: 0, z: 0 };
    }
    if (cur.y <= 0 || cur.y >= FIELD_WIDTH || cur.x <= 0 || cur.x >= 120) {
      // Rule 8-7-3: a true forward fumble out in the field cannot gain yards.
      // Backward passes and end-zone impetus/momentum have separate branches.
      this.possession = ball.lastTeam;
      if (ball.lastTeam === 'D') this.stats.fumbleLost = true;
      this.event('out_of_bounds', null, null, 'loose ball out of bounds');
      const exit = firstBoundaryExit(prev, cur);
      let spotX = clamp(exit.x, 1, 119);
      if (ball.origin !== 'backward_pass' && ball.fumbleX !== undefined) {
        const fromField = ball.fumbleX > OWN_GOAL_X && ball.fumbleX < OPP_GOAL_X;
        const ruling = fumbleOutOfBounds({ fumbleX: ball.fumbleX, outX: exit.x,
          lastPossessionTeam: ball.lastTeam,
          // Native loose flight has no intervening bats/kicks. A release in
          // the field excludes the caught-player-in-end-zone momentum case.
          impetusTeam: fromField ? ball.lastTeam : undefined,
          momentumExceptionExcluded: fromField });
        if (ruling.kind === 'spot') spotX = ruling.spotX;
        else if (ruling.kind === 'safety') {
          this.scoreKind = 'safety'; this.scoreTeam = ruling.scoringTeam;
          this.event('safety', ball.fumbledBy, null, ruling.rule);
          this.whistle('safety', exit); return;
        } else if (ruling.kind === 'touchback') {
          this.possession = ruling.possession;
          this.stats.fumbleLost = ball.lastTeam !== ruling.possession;
          this.event('touchback', ball.fumbledBy, null, ruling.rule);
          this.whistle('touchback', exit); return;
        } else throw new Error('Unsupported NFL 8-7-3: end-zone fumble impetus/momentum');
      }
      this.whistle('oob', { x: spotX, y: exit.y });
      return;
    }
    if (this.t - ball.since < 0.15) return;
    // Nearest players scramble for it; possession chance rises when on the ground.
    let best: Agent | null = null;
    let bestD = 1.0;
    for (const a of this.agents) {
      if (a.isDown(this.t)) continue;
      const d = Math.hypot(a.pos.x - cur.x, a.pos.y - cur.y);
      if (d < bestD && cur.z < 1.2) {
        bestD = d;
        best = a;
      }
    }
    if (best && this.rng.chance(cur.z < 0.3 ? 0.35 : 0.12)) {
      const hadIt = ball.lastTeam;
      this.possess(best, 'recovery');
      if (best.team !== hadIt) this.stats.fumbleLost = true;
      // Eligible recoverers are upright. Securing the ball does not put a
      // body on the turf: World contact/support and the ordinary carrier
      // rules determine whether this recovery can advance or is tackled.
    }
  }

  private checkWhistle(): void {
    const c = this.carrier;
    if (!c) return;
    const p = c.pos;
    // Out of bounds.
    if (p.y <= 0 || p.y >= FIELD_WIDTH) {
      this.event('out_of_bounds', c);
      this.finishCarry('oob', { x: this.bond ? this.bond.progressX : p.x, y: p.y });
      return;
    }
    // Touchdown / end-zone outcomes.
    if (c.team === 'O' && this.possession === 'O' && p.x >= OPP_GOAL_X) {
      this.scoreKind = 'TD';
      this.event('touchdown', c);
      this.whistle('touchdown', p);
      return;
    }
    if (c.team === 'D' && this.possession === 'D' && p.x <= OWN_GOAL_X) {
      this.scoreKind = 'TD';
      this.event('touchdown', c);
      this.whistle('touchdown', p);
      return;
    }
    if (p.x <= 0 || p.x >= 120) {
      this.finishCarry('oob', { x: clamp(p.x, 0, 120), y: p.y });
      return;
    }
  }

  /** End the play on a carrier who is down or out of bounds. */
  finishCarry(kind: 'tackle' | 'oob' | 'slide', spot: Vec2): void {
    const c = this.carrier;
    if (!c) return;
    if (c.team === 'D' && this.possession === 'D' && spot.x >= OPP_GOAL_X) {
      this.event('touchback', c);
      this.whistle('touchback', spot);
      return;
    }
    // Sack: QB tackled behind the LOS on a pass play before throwing.
    if (kind === 'tackle' && c === this.qb && this.isPass && this.throwAt < 0 && spot.x < this.los && !this.scrambled) {
      this.stats.passer = c.player.id;
      this.stats.sacked = true;
      this.stats.sackedBy = this.bond?.tacklers.map((t) => t.player.id) ?? [];
      this.event('sack', this.bond?.tacklers[0] ?? null, c);
    } else if (kind === 'tackle') {
      this.event('tackle', this.bond?.tacklers[0] ?? null, c);
    }
    if (this.bond) this.stats.tacklers = this.bond.tacklers.map((t) => t.player.id);
    // A safety keeps the underlying sack/tackle attribution. The physical
    // stop remains at spot; statistical yardage is bounded at the goal plane.
    if (c.team === 'O' && this.possession === 'O' && spot.x <= OWN_GOAL_X) {
      this.scoreKind = 'safety';
      this.event('safety', c);
      this.whistle('safety', spot);
      return;
    }
    this.whistle(kind, spot);
  }

  private recordFrame(recordedIntents?: ReadonlyArray<Intent>): void {
    const agents: number[] = [];
    for (const a of this.agents) agents.push(round2(a.pos.x), round2(a.pos.y), round2(a.body.facing));
    const b = this.ballPos();
    const c = this.carrier;
    // The first live tick also records t=0. Replace the staged snap frame
    // instead of exporting duplicate timestamps to the interpolating viewer.
    if (this.frames.at(-1)?.t === round2(this.t)) this.frames.pop();
    this.frames.push({ t: round2(this.t), agents, ball: [round2(b.x), round2(b.y), round2(b.z)], carrier: c?.idx ?? -1,
      carrierPosture: [round2(c?.body.squeeze ?? 0), round2(c?.body.squeezeHeading ?? c?.body.facing ?? 0)] });
    this.trace.state(this, recordedIntents);
  }

  // ------------------------------------------------------------ result

  /** Resolve the play as it stands (called by `run`; exposed for scenario tests). */
  buildResult(): PlayResult {
    const spot = this.endSpot ?? { x: this.los, y: this.ballY };
    const turnover = this.possession === 'D';
    let yards = turnover ? 0 : spot.x - this.los;
    if (this.outcome === 'incomplete') yards = 0;
    if (this.scoreKind === 'TD' && !turnover) yards = OPP_GOAL_X - this.los;
    if (this.scoreKind === 'safety' && !turnover) yards = OWN_GOAL_X - this.los;
    const s = this.stats;
    const segs = this.segments;
    const offTD = this.scoreKind === 'TD' && !turnover;
    // The offense's last possession: on a lost fumble, its rush or reception
    // is credited to the fumble spot.
    let lastO: CarrierSegment | undefined;
    for (const g of segs) if (g.team === 'O') lastO = g;
    let offenseYards = yards;
    if (turnover) offenseYards = lastO?.end === 'fumble' ? lastO.endX - this.los : 0;
    if (s.completed && this.catchAt >= 0) {
      const caught = segs.find((g) => g.how === 'catch');
      const catchX = caught?.startX ?? this.catchX;
      s.completedAirYards = catchX - this.los;
      const endX = offTD ? OPP_GOAL_X : turnover ? (caught?.endX ?? catchX) : spot.x;
      s.yac = endX - catchX;
    }
    const takeaway = turnover ? segs.find((g) => g.team === 'D') : undefined;
    if (takeaway) {
      s.returnYards = this.scoreKind === 'TD' ? takeaway.startX - OWN_GOAL_X : takeaway.startX - spot.x;
    }
    if (!this.isPass || this.scrambled) {
      // An unexchanged snap is still an actual rush by its possessor. Do not
      // infer a handoff, fumble, scramble, or a successful keeper decision.
      const snap = segs.length === 1 ? segs[0] : undefined;
      if (!s.rusher && !this.isPass && snap?.team === 'O' && snap.how === 'snap' && snap.end === 'dead') {
        s.rusher = snap.carrier;
        s.retainedSnap = true;
      }
      if (this.firstContactX !== null) s.yardsBeforeContact = this.firstContactX - this.los;
    }
    const clockStops = this.outcome === 'incomplete' || this.outcome === 'oob' || this.outcome === 'touchdown' || this.outcome === 'safety' || this.outcome === 'touchback' || turnover;
    return {
      outcome: this.outcome ?? 'timeout',
      possession: this.possession,
      turnover,
      endX: spot.x,
      endY: spot.y,
      yards: round2(yards),
      offenseYards: round2(offenseYards),
      segments: segs,
      score: this.scoreKind ? { team: this.scoreTeam ?? (this.scoreKind === 'safety' ? 'D' : this.possession), kind: this.scoreKind } : null,
      duration: this.t,
      clockStops,
      kind: this.isPass ? 'pass' : 'run',
      stats: s,
      events: this.events,
      frames: this.record ? this.frames : undefined,
      telemetry: this.trace.data,
      penalty: this.penalty,
      penalties: this.penalties.length ? [...this.penalties] : undefined,
      foulRecords: this.foulRecords.length ? [...this.foulRecords] : undefined,
      ruleLimitations: this.ruleLimitations.size ? [...this.ruleLimitations] : undefined,
      statsBeforeIllegalPass: this.statsBeforeIllegalPass,
    };
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** First exit of the recorded ball-flight segment, not its post-step point. */
function firstBoundaryExit(from: Vec3, to: Vec3): Vec2 {
  let fraction = 1;
  for (const [a, b, low, high] of [[from.x, to.x, 0, 120], [from.y, to.y, 0, FIELD_WIDTH]]) {
    if (a >= low && b <= low && b < a) fraction = Math.min(fraction, (low - a) / (b - a));
    if (a <= high && b >= high && b > a) fraction = Math.min(fraction, (high - a) / (b - a));
  }
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
}

export function distance(a: Agent, b: Agent): number {
  return dist(a.pos, b.pos);
}

export function speedOf(a: Agent): number {
  return len(a.vel);
}
