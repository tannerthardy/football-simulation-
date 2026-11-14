/**
 * The play simulator: 22 agents on a continuous field, ticked at 20 Hz.
 *
 *   perceive → decide → technique intents (blocks, holds) → physics world
 *   (feet, contacts, joints, support) → down by contact → ball → tackle
 *   attempts → whistle → record
 */
import { recordContact } from './seen-contact.js';
import { FIELD_WIDTH, OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import { Rng } from '../core/rng.js';
import { DT } from '../core/units.js';
import { hypot2, clamp, dist, len, type Vec2, type Vec3 } from '../core/vec.js';
import { DRAG_SPIRAL, DRAG_TUMBLE, solveLaunch, stepFlight, type BallFlight } from '../physics/ball.js';
import { handoffReach } from './ball-transfer.js';
import { assessForwardPass, fumbleRecovery, fumbleOutOfBounds, looseBallBoundaryStep, momentumDeadBallSpot,
  restrictedRecoveryInOwnEndZone } from './ball-rules.js';
import { observePrethrowBlocks, assessPrethrowBlocksOnPass,
  capturePassContactStarts, observePassContacts, notePassRelease, notePassTouch, flushPassContacts } from './pass-interference.js';
import { captureHoldingStart, observeHolding, type HoldingIntervalStart } from './contact-holding.js';
import { inspectInstalledSnap, type PresnapAssessment, type SnapEligibility, type SnapIncident } from '../game/presnap-rules.js';
import { observePassLegality, capturePassLegality, finishPassLegality, assessNativePassTouch,
  assessForwardHanding } from './pass-legality.js';
import { observeContactLegality } from './contact-legality.js';
import { captureTeamContactStart, observeTeamContactRules } from './team-contact-rules.js';
import { bodyRadius } from '../physics/bodyshape.js';
import type { Body, MoveCommand } from '../physics/kinematics.js';
import { World, type Intent, type StepReport } from '../physics/world.js';
import { coverageOrientation } from './coverage/orientation.js';
import { ThrowSight, viewCone } from './throw-sight.js';
import { containCoverage } from './coverage-space.js';
import { openToBall } from './open-to-ball.js';
import { derivePhysical } from '../players/physical.js';
import type { Player } from '../players/types.js';
import { alignDefense, alignOffense, fitPressStances, formationKey, gapY, PRESS_BACKOFF, RECEIVER_DEPTH, type AlignStyle, type DefenseAlignment, type ManPreference, type OffenseAlignment } from '../playbook/alignment.js';
import { installCoverage } from '../playbook/coverages.js';
import type { DefSlot, DefensivePlayCall, OffensivePlayCall, OffSlot } from '../playbook/types.js';
import { Agent, type Behavior, type Engagement, type RunContactSurface, type TeamSide } from './agent.js';
import { CoverageScouting, QBMind } from './qbmind.js';
import { Recognition, leaguePassLogOdds, type ScoutingReport, type SnapContext } from './recognition.js';
import { assignBehaviors, onBallCaught, onHandoff, onInterception, onLooseBall, onRecovery, onThrow } from './assign.js';
import { resolveCatchOpportunities, secureStep } from './catching.js';
import { createEngagement, releaseJoints, updateEngagements } from './engagement.js';
import { PerceptionBuffer, type Perceived } from './perception.js';
import { ANTICIPATION_PRIOR } from './anticipation-prior.js';
import { IncidentalCatchReadiness } from './catch-readiness.js';
import { spaceTeammates } from './spacing.js';
import { L2_BREAKDOWN, breakdownForContact } from './breakdown.js';
import { calledVelocityAhead, predictCalledMotion } from './called-motion.js';
import { MotionRuntime, motionEnabled, planMotion } from './motion.js';
import { prepareJoinedCombinations } from './behaviors/blocking.js';
import { SnapMind } from './mind.js';
import { orderedDefense, orderedOffense } from './lineup.js';
import { BACKER_CREEP, planBackerCreeps, type CreepPlan } from './backer-creep.js';
import { SNAP_REACT, VISIBLE, planSnap, snapResponse, type SnapCount } from './snap-count.js';
import { ReplayTrace } from './telemetry.js';
import { CommandTrace, type BlockingSink, type CommandTraceSelection } from './command-trace.js';
import { ResponsibilityLedger } from './responsibility-ledger.js';
import { afterStep, releaseBond, tryTackles, updateBond, type TackleBond } from './tackle.js';
import type { BallState, CarrierSegment, Frame, PenaltyCall, FoulEvidence, FoulRecord, PlayEvent, PlayEventType, PlayOutcome, PlayResult, PlayStats, ReplayLevel } from './types.js';

/** ALIGN_HABIT (experimental, off): see alignDefense. */
const ALIGN_HABIT = process.env.ALIGN_HABIT !== '0';
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
  /** Each team's alignment habits (league/team.ts `alignStyle`); none = the scheme alone. */
  offStyle?: AlignStyle;
  defStyle?: AlignStyle;
  /** Rule 8 fumble context at the snap; the warning must already have occurred. */
  afterTwoMinuteWarning?: boolean;
  isTry?: boolean;
  /** Let the QB check out of the call at the line. */
  audibles?: boolean;
  reportedEligibility?: Record<string, 'eligible' | 'ineligible'>;
  /** Fixed physics substeps per tick (convergence studies); adaptive by default. */
  substeps?: number;
  /** Research-only support-coordinate prototype; production uses legacy. */
  supportModel?: 'legacy' | 'virtual-foot';
  constraintWork?: 'per-update' | 'per-solve';
  impactTiming?: 'speculative' | 'local-sweep';
  supportIntegration?: 'mean' | 'integrated';
  /** Experimental angular hand patch; default center keeps production law. */
  handContact?: 'center' | 'patch';
  /** Hand-placed pre-snap spots (Play Lab's coach's hand), replacing the
   * installed spot before any staging; absent in games. Fouls stay the engine's. */
  alignment?: Array<{ team: TeamSide; slot: string; pos: Vec2 }>;
}

const MAX_PLAY_TIME = 25;

/** A lineman's visible pre-snap start: his own (no defender) or a flinch at one. */
interface SnapEvent { t: number; o: Agent; d?: Agent }
/** Length of the ball: the neutral zone's depth (yd). */
const BALL_LENGTH = 0.31;

/** Experimental (GAZE=1, off): a player who names what he is watching
 * (`lookAt`) sees opponents only inside his gaze cone or in contact with him.
 * Others he knows from his last in-view sighting, projected forward for as
 * long as his read skill lets him anticipate. Stage 1: chasing defenders only
 * (docs/reviews/field-of-view-proposal.md). Model assumptions: head turn rate,
 * neck range and cone half-angle below. */
const GAZE = process.env.GAZE === '1';
/** PERCEIVE_TRACK (experimental, off; PERCEIVE_TRACK=1): the tracking channel of perception
 * (docs/reviews/2026-11-13-perception-proposal.md). A target the observer is already attending to (his man, the carrier
 * he pursues, the rusher he sets on) is seen through a short correcting loop, not the choice reaction time `see()`
 * uses: online corrections of a movement to a moved target come at about 100-150 ms (Brenner and Smeets 1997; Aivar et
 * al. 2015), and acceleration is not perceived directly over such windows (Brouwer, Brenner and Smeets 2002), so it adds
 * no acceleration term. Step 0: the entry point `track()` only; off, it is exactly `see()`. No consumer calls it yet;
 * each group moves to it in its own step with its own restage. */
export const PERCEIVE_TRACK = process.env.PERCEIVE_TRACK === '1';
/** PERCEIVE_TRACK: the tracking loop's latency (s). Chosen inside the evidence's 0.1-0.15 s; set from the restage of the
 * first group that uses it, not imported as a constant. */
const TRACK_LATENCY = 0.12;
const GAZE_HEAD_RATE = 6; // rad/s, about 340 deg/s
const GAZE_NECK = Math.PI / 2; // head within +-90 deg of body facing
const GAZE_CONE = Math.PI / 2; // seen within +-90 deg of gaze
/** Anticipation from motion alone helps to about 1.0 s on NFL tracking. */
const ANTICIPATION_HORIZON = 1.0;
const ANTICIPATION_MAX_SPEED = 10;
/** Position group, as the tracking exports name it, for the anticipation prior. */
const PRIOR_GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL',
  EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB' };
/** Default responsibilities by observer group, when his controller declares none (`assignedTo`). */
const DEFAULT_ASSIGNED: Record<string, string[]> = { DB: ['WR', 'TE', 'RB'], LB: ['RB', 'TE', 'QB'], DL: ['OL', 'RB', 'QB'],
  OL: ['DL', 'LB'], RB: ['LB', 'DL'], TE: ['LB', 'DB', 'DL'], WR: ['DB'], QB: ['DL', 'LB', 'DB'] };
const PRIOR_HORIZONS = [0.3, 0.6, 1.0, 1.5];
/** Picture age (s) where experience starts to replace motion, and where it has fully replaced it. */
const PRIOR_HANDOVER = [0.8, 1.5];
const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** Default on (RELEASE_REDECIDE=0 for comparison): a player whose block ends
 * during the engagement update decides again in the same step (PlaySim.tick). */
const RELEASE_REDECIDE = process.env.RELEASE_REDECIDE !== '0';

/** Outside the field's boundary planes (sidelines and end lines). */
const outOfField = (p: { x: number; y: number }): boolean => p.x <= 0 || p.x >= 120 || p.y <= 0 || p.y >= FIELD_WIDTH;

export class PlaySim {
  readonly dt = DT;
  readonly rng: Rng;
  private readonly streams = new Map<string, Rng>();
  t = 0;
  readonly agents: Agent[] = [];
  readonly offense: Agent[] = [];
  readonly defense: Agent[] = [];
  /** The defense's alignment habits, kept for its pre-snap stem. */
  private readonly defStyle?: AlignStyle;
  readonly bySlot = new Map<string, Agent>();
  readonly los: number;
  readonly ballY: number;
  readonly firstDownX: number;
  offCall: OffensivePlayCall;
  readonly defCall: DefensivePlayCall;
  readonly offAlign: OffenseAlignment;
  readonly defAlign: DefenseAlignment;
  /** Pre-snap offensive motion being played (MOTION=1), if any. */
  readonly motion: MotionRuntime | null;
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
  /** When each defender first had the current pass in view. */
  readonly throwSight = new ThrowSight();
  /** Per observer→opponent query (and its delay scale), the tick his latest picture sampled (run-read attention holds it). */
  private sightSamples?: Map<string, number>;
  /** GAZE: head direction and what each opted-in player is watching. */
  private gaze = new Map<Agent, { dir: number; t: number; target: Agent; set: number; since: number }>();
  /** GAZE: last in-view picture per observer>target, with when it was taken. */
  private sightMemory = new Map<string, { seen: Perceived; at: number; acc?: Vec2; snapT?: number }>();
  /** GAZE: opponents an observer's own assignment makes his responsibility this play. */
  private assigned = new Map<Agent, Set<Agent>>();
  readonly trace: ReplayTrace;
  private commandTrace?: CommandTrace;
  /** Optional passive recorder of every offensive blocker's responsibility (docs/COMMAND_TRACE.md). Off unless asked for. */
  responsibility?: ResponsibilityLedger;
  private readonly record: boolean;
  private readonly recordEvery: number;
  private tickCount = 0;
  /** Completed live action intervals since the modeled snap acquisition. */
  private snapActionIntervals = 0;
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
  private ballPreviouslyBeyondLine = false;
  private statsBeforeIllegalPass?: PlayStats;
  private segmentsBeforeIllegalPass?: CarrierSegment[];
  private possessionSnapshotRecords?: NonNullable<PlayResult['possessionSnapshots']>;
  private frozenEligibility?: Map<string, SnapEligibility>;
  get snapEligibility(): Map<string, SnapEligibility> { return this.frozenEligibility ??= new Map(); }
  readonly snapAssessment: PresnapAssessment;
  /** Performed current-interval ball presentations, not a hidden run call. */
  readonly presentedFakeRunners = new Set<Agent>();
  private readonly fakePresentationEvents = new Set<Agent>();
  private acquisition?: { team: TeamSide; spotX: number; impetusTeam: TeamSide;
    momentumRetained: boolean; acquiredInOwnEndZone: boolean; leftOwnEndZone: boolean;
    attemptedAdvance?: boolean };

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
  /** When his last throwing motion was pulled down without a throw (a pump, or the arm pinned); −1 if none. */
  windupEndAt = -1;
  /** THROW_HOLD: the largest load on the passer since his delivery started, as a share of his arm force (0..1), and
   * its direction (field frame, magnitude = throwDisturb); reset at the release. qbHold: the grasp's upper-body hold as a
   * share of his arm force whenever a grasp is on him (qb.ts throwLoad). */
  throwDisturb = 0;
  throwPull = { x: 0, y: 0 };
  qbHold = 0;
  /** When the passer's arm starts forward (front foot planted); the in-grasp
   * ruling does not cut off a pass already in its delivery. */
  deliveryAt = -1;
  /** SNAP_REACT: the count's start plans and the pre-snap acts they produced. */
  snapCount?: SnapCount;
  snapActs?: { falseStarts: Set<string>; incidents: SnapIncident[]; inZone: Set<string>; cause?: string };
  snapDead = false;
  private snapEvents: SnapEvent[] = [];
  private readonly snapSetFront = new Map<Agent, number>();
  /** Everyone's x at the snap (cue reading: who set back, who fired out). */
  snapX: number[] = [];
  /** The situation and look the defense saw before the snap. */
  snapContext!: SnapContext;
  readonly coverageScouting: CoverageScouting | undefined;
  /** Predicted remaining flight of the ball (absolute times). */
  ballPath: Array<{ t: number; x: number; y: number; z: number }> = [];

  constructor(setup: PlaySetup) {
    // Normalize once before alignment, actor indices and any ordered consumer.
    const offense = orderedOffense(setup.offense), defense = orderedDefense(setup.defense);
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

    this.offAlign = alignOffense(setup.offCall.formation, setup.offCall.flip, this.los, this.ballY,
      { kind: setup.offCall.kind, pass: setup.offCall.pass, run: setup.offCall.run, down: setup.down, distance: Math.abs(setup.firstDownX - setup.los), style: setup.offStyle });
    // The secondary checks its call to the receiver distribution it sees.
    this.defCall = installCoverage(setup.defCall, this.offAlign);
    const defSlots = defense.map(([slot]) => slot);
    // The front's end men align by build (FRONT_ALIGN); the installed spots ignore it.
    const mass = Object.fromEntries(defense.map(([slot, player]) => [slot, derivePhysical(player).massKg]));
    // ALIGN_HABIT (experimental, off): each off-ball defender's personal depth
    // habit (his own seed) and this snap's placement scatter (the play's).
    const scatter = ALIGN_HABIT ? Object.fromEntries(defense.map(([slot, player]) => {
      const snap = this.rng.fork(`align-scatter:${slot}`);
      const habit = new Rng(`align-habit:${player.id}`).normalClamped(0, .4, -.8, .8);
      return [slot, { x: habit + snap.normalClamped(0, .6, -1.2, 1.2), y: snap.normalClamped(0, .4, -.8, .8) }];
    })) : undefined;
    this.defStyle = { ...setup.defStyle, mass, scatter, situation: { down: this.down, distance: this.firstDownX - this.los, toGoal: OPP_GOAL_X - this.los, personnel: setup.offCall.formation.personnel } };
    this.defAlign = alignDefense(this.defCall, this.offAlign, defSlots, setup.manPrefs, this.defStyle);

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
    for (const [slot, player] of offense) {
      const spot = this.offAlign.spots[slot];
      if (!spot) throw new Error(`Offense lineup slot ${slot} has no alignment in ${setup.offCall.formation.id}`);
      mk('O', slot, player, spot.pos, 0);
    }
    for (const [slot, player] of defense) {
      const spot = this.defAlign.spots[slot];
      if (!spot) throw new Error(`Defense lineup slot ${slot} has no alignment in ${this.defCall.front.id}`);
      mk('D', slot, player, spot.pos, Math.PI);
    }
    fitPressStances(this.defAlign, this.defense.map(a => ({ slot: a.slot as DefSlot, pos: a.pos, radius: a.profile.radius })), this.los);
    // RECEIVER_DEPTH (experimental, off): a receiver on the line who sees a
    // press look in front of him sets deeper to have room to release.
    if (RECEIVER_DEPTH) {
      const dir = this.attackDir('O');
      for (const o of this.offense) {
        const spot = this.offAlign.spots[o.slot], f = setup.offCall.formation.slots[o.slot as keyof typeof setup.offCall.formation.slots];
        if (!spot || !f || spot.backfield || f.depth > 0.6 + 1e-9) continue;
        const pressed = this.defense.some((d) => Math.abs(d.pos.y - o.pos.y) <= 1.5 && (d.pos.x - this.los) * dir > 0 && (d.pos.x - this.los) * dir <= 2);
        if (pressed) o.body.pos = { x: o.pos.x - dir * PRESS_BACKOFF, y: o.pos.y };
      }
    }
    if (setup.alignment?.length) this.placeByHand(setup.alignment);
    this.snapX = this.agents.map((a) => a.pos.x);
    this.world = new World(this.agents.map((a) => a.body), { substeps: setup.substeps, supportModel: setup.supportModel, constraintWork: setup.constraintWork, impactTiming: setup.impactTiming, supportIntegration: setup.supportIntegration, handContact: setup.handContact ?? undefined });
    // TORSO_CAPSULE (World): the carrier's torso contact with a defender uses the capsule; every other pair keeps the disc.
    this.world.capsulePair = (a, b) => { const c = this.carrier?.body; if (!c) return false; const o = a === c ? b : b === c ? a : null;
      return !!o && this.defense.some((d) => d.body === o); };
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
    const motion = motionEnabled() && this.offCall.motion ? this.slot(this.offCall.motion.slot) : undefined;
    const plan = motion ? planMotion(this.offAlign, this.offCall.motion!, motion.profile,
      this.offense.map(a => ({ slot: a.slot, pos: a.pos, radius: a.profile.radius }))) : null;
    this.motion = plan ? new MotionRuntime(plan, setup.defCall, setup.manPrefs, this.defStyle, this.defAlign, this.rng.fork('motion-check')) : null;
    this.stageDefense(setup.manPrefs);
    if (this.motion) ({ offAlign: this.offAlign, defCall: this.defCall, defAlign: this.defAlign } = this.motion.finish(this));
    this.snapX = this.agents.map((a) => a.pos.x);
    this.qbMind = new QBMind(this, qb);
    this.offCall = this.qbMind.installedChecks(this.offCall);
    if (setup.audibles) {
      this.offCall = this.qbMind.preSnapCheck(this.offCall, { hurry: this.hurry, down: setup.down ?? 1, distance: this.firstDownX - this.los });
    }
    this.isPass = this.offCall.kind === 'pass';
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
    this.snapAssessment = inspectInstalledSnap(this, setup.reportedEligibility,
      { afterTwoMinuteWarning: this.afterTwoMinuteWarning });
    for (const entry of this.snapAssessment.eligibility) this.snapEligibility.set(entry.playerId, entry);
    for (const foul of this.snapAssessment.fouls) {
      const actor = this.agents.find(a => a.player.id === foul.playerId)
        ?? (foul.against === 'O' ? this.qb : this.defense[0]);
      if (!actor) continue;
      this.recordFoul({ kind: foul.kind, against: foul.against, playerId: actor.player.id,
        rule: foul.rule, reason: foul.reason, yards: foul.yards, autoFirst: false,
        phase: foul.deadBall ? 'pre_snap' : 'live', t: 0, spotX: this.los,
        enforcement: 'previous', possessionChanges: 0, possessionTeam: 'O' }, {
        source: 'native', rule: foul.rule, action: 'installed_snap_law',
        facts: { reason: foul.reason, deadBall: foul.deadBall } });
    }
  }

  /** The installed spot moves with the body, so jobs keyed to it start from where he stands. */
  private placeByHand(spots: NonNullable<PlaySetup['alignment']>): void {
    for (const { team, slot, pos } of spots) {
      const a = this.agents.find(x => x.team === team && x.slot === slot);
      if (!a || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) throw new Error(`Hand-placed ${team} ${slot} is not in this play`);
      a.body.pos = { x: pos.x, y: clamp(pos.y, 0.5, FIELD_WIDTH - 0.5) };
      const installed = team === 'O' ? this.offAlign.spots : this.defAlign.spots as Record<string, { pos: Vec2 }>;
      installed[slot] = { ...installed[slot], pos: { ...a.body.pos } } as never;
    }
  }

  /** Called movement with finite travel and an observable history. Late
   * arrivals keep their velocity into the snap instead of teleporting home. */
  private stageDefense(prefs?: ManPreference): void {
    const stem = this.defCall.frontStem, creep = this.defCall.creep;
    const early = SNAP_REACT ? this.planSnapCount() : 0;
    if (SNAP_REACT) for (const a of this.agents) {
      // The count, not the old fixed latency, sets every start; a man who
      // stopped himself before the snap responds to the real one.
      const p = this.snapCount!.plans.get(a)!;
      a.snapReadyAt = p.stop !== undefined ? p.restart! : Math.max(0, p.go);
    }
    // BACKER_CREEP (experimental, off): box backers who time the cadence walk
    // into the snap (backer-creep.ts). Not under a stem, which moves everyone.
    const creeps = BACKER_CREEP && !stem ? planBackerCreeps(this.defense, this.los, this.ballY,
      (a) => this.defAlign.spots[a.slot as DefSlot]?.role.kind === 'blitz', this.rng.fork('backer-creep')) : new Map<Agent, CreepPlan>();
    // Having timed the count to creep, he is moving at the snap: his start is the snap.
    for (const a of creeps.keys()) a.snapReadyAt = 0;
    if (!stem && !creep && !this.motion && !early && !creeps.size) { this.perception.record(this.agents, this.carrier?.idx ?? null); return; }
    for (const seconds of [stem?.secondsBeforeSnap,creep?.secondsBeforeSnap]) {
      if (seconds !== undefined && (!Number.isFinite(seconds) || seconds<=0 || seconds>3)) throw new Error('Pre-snap movement must start within 0–3 seconds of snap');
    }
    if (stem && !stem.from.personnel.includes(this.defCall.personnel)) throw new Error('Stem front requires compatible defensive personnel');
    const targets = new Map<Agent,Vec2>();
    if (stem) {
      const shown = alignDefense({...this.defCall,front:stem.from},this.offAlign,this.defense.map((a)=>a.slot as DefSlot),prefs,this.defStyle);
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
    for (const [d, plan] of creeps) targets.set(d, { x: d.pos.x - plan.pace * plan.start, y: d.pos.y });
    // A stem replaces the initial presentation above. Fit that starting
    // stance before its first observable history, never the moving endpoint.
    if (stem || creep || this.motion) fitPressStances(this.defAlign, this.defense.map(a => ({ slot: a.slot as DefSlot, pos: a.pos, radius: a.profile.radius })), this.los);
    // SNAP_REACT's count keeps its own rounding; the installed movements keep theirs.
    const creepAhead = Math.max(0, ...[...creeps.values()].map((p) => p.start));
    const ticks = Math.max(Math.ceil(Math.max(stem?.secondsBeforeSnap ?? 0,creep?.secondsBeforeSnap ?? 0,this.motion?.plan.seconds ?? 0,creepAhead)/this.dt),
      Math.ceil(early/this.dt - 1e-9));
    // Prime with the presentation that was actually shown, never the called
    // destination. Observers with longer latency retain the old front.
    this.perception.record(this.agents, this.carrier?.idx ?? null);
    for (let i=ticks;i>0;i--) {
      this.t = -i*this.dt;
      const intents: Intent[] = this.agents.map((a) => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
      for (const [d,target] of targets) {
        const backer = creeps.get(d);
        const active = backer ? this.t>=-backer.start-1e-8 : d === mug ? this.t>=-creep!.secondsBeforeSnap-1e-8 : !!stem && this.t>=-stem.secondsBeforeSnap-1e-8;
        const dx=target.x-d.pos.x,dy=target.y-d.pos.y,length=hypot2(dx,dy);
        // A creeping backer walks at his creep pace into the snap; he does not stop short of it.
        const speed=!active ? 0 : backer ? backer.pace : Math.min(d.profile.vmax*.45,length*3);
        intents[d.idx] = {vel:{x:length ? dx/length*speed : 0,y:length ? dy/length*speed : 0},facing:Math.PI};
      }
      this.motion?.step(this, intents);
      const moving = early ? this.snapCountIntents(intents) : undefined;
      this.world.time = this.t;
      this.world.step(intents, this.dt);
      for (const d of this.defense) if (!moving?.has(d)) d.body.pos.x=Math.max(this.los+d.profile.radius+.05,d.pos.x);
      this.perception.record(this.agents, this.carrier?.idx ?? null);
      if (this.record && i%this.recordEvery===0) this.recordFrame(intents);
      if (early && this.snapCountActs(this.t + this.dt)) break;
    }
    this.t=0;
    this.perception.record(this.agents, this.carrier?.idx ?? null);
    if (this.record) this.recordFrame();
  }

  /** SNAP_REACT: plan the count; seconds before the snap its first act needs. */
  private planSnapCount(): number {
    const rng = this.rng.fork('snap-count');
    const spotX = (a: Agent) => (a.team === 'D' ? this.defAlign.spots[a.slot as DefSlot]?.pos.x : undefined) ?? a.pos.x;
    const count = this.snapCount = planSnap(this.agents, { down: this.down, distance: this.firstDownX - this.los,
      offBall: (a) => spotX(a) - a.profile.radius - this.los, ballY: this.ballY }, rng);
    this.snapActs = { falseStarts: new Set(), incidents: [], inZone: new Set() };
    // A down lineman crowds the ball: his helmet and hands set at the line,
    // ahead of the represented torso (tracked torsos 0.9 yd off the ball).
    for (const d of this.defense) {
      const front = spotX(d) - d.profile.radius;
      if (front - this.los < 0.7) this.snapSetFront.set(d, front);
    }
    const events: SnapEvent[] = [];
    for (const o of this.offense) {
      const p = count.plans.get(o)!;
      if (p.go < -VISIBLE) events.push({ t: p.go + VISIBLE, o });
    }
    // A lineman sees the defender across from him move and may flinch.
    for (const d of this.defense) {
      const p = count.plans.get(d)!;
      if (p.go >= 0) continue;
      const dy = this.defAlign.spots[d.slot as DefSlot]?.pos.y ?? d.pos.y;
      for (const o of this.offense) {
        if (this.los - o.pos.x > 1.6 || Math.abs(o.pos.y - dy) > 1.6) continue;
        if (!rng.chance(0.1 + 0.4 * (1 - o.r('discipline')))) continue;
        const t = p.go + o.mind.snapDelay + snapResponse(o);
        if (t < 0) events.push({ t, o, d });
      }
    }
    this.snapEvents = events.sort((a, b) => a.t - b.t);
    return -Math.min(0, ...[...count.plans.values()].map((p) => p.go), ...events.map((e) => e.t));
  }

  /** Early defenders fire out of their stance, then try to get back. */
  private snapCountIntents(intents: Intent[]): Set<Agent> {
    const moving = new Set<Agent>();
    for (const d of this.defense) {
      const p = this.snapCount!.plans.get(d)!;
      if (p.go >= 0 || this.t < p.go - 1e-9) continue;
      moving.add(d);
      if (p.stop === undefined || this.t < p.stop - 1e-9) {
        intents[d.idx] = { vel: { x: -d.profile.vmax * 0.6, y: 0 }, facing: Math.PI };
      } else {
        const home = this.defAlign.spots[d.slot as DefSlot]?.pos.x ?? d.pos.x;
        intents[d.idx] = { vel: { x: clamp((home - d.pos.x) * 3, 0, 1.5), y: 0 }, facing: Math.PI };
      }
    }
    return moving;
  }

  /** Represented pre-snap acts by time `now`; true once the ball is dead. */
  private snapCountActs(now: number): boolean {
    const acts = this.snapActs!;
    const e = this.snapEvents.find((x) => x.t <= now + 1e-9);
    if (e) {
      if (e.d && this.inNeutralZone(e.d))
        acts.incidents.push({ playerId: e.d.player.id, enteredNeutralZone: true, immediateNearbyProtectiveReaction: true });
      else acts.falseStarts.add(e.o.player.id);
      acts.cause = e.d ? 'flinch' : this.snapCount!.hard ? 'hard count' : 'own timing';
      return this.snapDead = true;
    }
    for (const d of this.defense) {
      const p = this.snapCount!.plans.get(d)!;
      if (p.go >= 0 || now < p.go) continue;
      // Contact: bodies, or a crowding lineman's lead across the whole
      // neutral zone (the ball's length) into the man set across from him.
      const set = this.snapSetFront.get(d);
      const across = set !== undefined && set - (d.pos.x - d.profile.radius) > BALL_LENGTH;
      for (const o of this.offense) if (hypot2(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < o.profile.radius + d.profile.radius
        || (across && this.los - o.pos.x < 1.6 && Math.abs(o.pos.y - d.pos.y) < 0.75)) {
        acts.incidents.push({ playerId: d.player.id, enteredNeutralZone: true, contactedOpponentOrBall: true });
        acts.cause = this.snapCount!.hard ? 'hard count' : 'own timing';
        return this.snapDead = true;
      }
    }
    // Only a man who started early can be past the line; standing bodies
    // settle by hundredths of a yard.
    if (now >= -1e-9) for (const d of this.defense)
      if (this.snapCount!.plans.get(d)!.go < 0 && this.inNeutralZone(d)) acts.inZone.add(d.player.id);
    return false;
  }

  /** A defender's leading edge is past the line (crowding linemen: any step forward). */
  private inNeutralZone(d: Agent): boolean {
    const set = this.snapSetFront.get(d), front = d.pos.x - d.profile.radius;
    return set !== undefined ? set - front > 0.03 : front < this.los;
  }

  // ------------------------------------------------------------ queries

  get qb(): Agent {
    return this.bySlot.get('QB')!;
  }
  /**
   * Test seam for scenes recorded before the play's dice were split: every
   * consumer draws from the play's one stream again, so a recorded scene
   * replays with the random inputs it was recorded with. Games never set it.
   */
  static recordedSingleStream = false;

  /**
   * Independent random stream for one consumer: a purpose and the agents it
   * concerns (an engagement pair, a tackler, a receiver, the passer). Each is
   * a fork of this play's stream, so one consumer drawing more or fewer
   * numbers never shifts another's dice: a changed hand fight in the trenches
   * cannot re-roll a catch downfield. Same play, same consumer, same dice.
   */
  dice(kind: string, a?: Agent, b?: Agent): Rng {
    if (PlaySim.recordedSingleStream) return this.rng;
    const label = b ? `${kind}:${a!.team}:${a!.slot}>${b.team}:${b.slot}` : a ? `${kind}:${a.team}:${a.slot}` : kind;
    let rng = this.streams.get(label);
    if (!rng) this.streams.set(label, rng = this.rng.fork(`dice:${label}`));
    return rng;
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

  /** GAZE: `a` is watching `target` this tick (stage 1: a chaser watches his man). */
  lookAt(a: Agent, target: Agent): void {
    if (!GAZE) return;
    const g = this.gaze.get(a);
    // A lapsed watch starts over: head from body facing, no memories from before.
    if (g && g.set >= this.t - this.dt - 1e-9) { g.target = target; g.set = this.t; }
    else this.gaze.set(a, { dir: a.facing, t: this.t, target, set: this.t, since: this.t });
  }

  /** GAZE: `observer`'s assignment makes these opponents his responsibility (his man, his zone's
   * receivers, the backs and pullers his fit reads). Replaces the role default for this play. */
  assignedTo(observer: Agent, targets: Agent[]): void {
    if (!GAZE) return;
    this.assigned.set(observer, new Set(targets));
  }

  private isAssigned(observer: Agent, target: Agent): boolean {
    const set = this.assigned.get(observer);
    if (set) return set.has(target);
    const og = PRIOR_GROUP[observer.player.position], tg = PRIOR_GROUP[target.player.position];
    return !!og && !!tg && (DEFAULT_ASSIGNED[og] ?? []).includes(tg);
  }

  /** The prior's context for a remembered picture: the same observables, bins and frame as
   * scripts/diag/anticipation-bound.py (offense attacks +x, LOS at 0, mirrored to his own sideline). */
  private priorContext(target: Agent, seen: Perceived, tSeen: number) {
    const g = PRIOR_GROUP[target.player.position]; if (!g) return null;
    const up = this.attackDir('O'), vx = seen.vel.x * up, vy = seen.vel.y, sp = Math.hypot(vx, vy);
    const depth = (seen.pos.x - this.los) * up, wide = seen.pos.y - this.ballY, side = wide >= 0 ? 1 : -1;
    const hd = sp > 0.3 ? Math.atan2(vy * side, vx) : 0;
    const key = [g, Math.min(4, Math.floor(sp / 1.5)), Math.floor(((hd + Math.PI) / (2 * Math.PI)) * 8) % 8,
      depth < 0 ? 0 : depth < 5 ? 1 : depth < 12 ? 2 : 3, Math.abs(wide) < 5 ? 0 : Math.abs(wide) < 13 ? 1 : 2,
      tSeen < 1 ? 0 : tSeen < 2 ? 1 : 2].join('|');
    return { key, up, side, ux: sp > 0.3 ? vx / sp : 1, uy: sp > 0.3 ? vy / sp : 0 };
  }

  /** What `observer` believes the play is: the offense knows its own call; a defender has his own
   * run/pass read, which play action and draws can make wrong; unsure (or no read) uses no belief. */
  private believedKind(observer: Agent): 'run' | 'pass' | null {
    if (observer.team === 'O') return this.isPass ? 'pass' : 'run';
    const read = observer.recog?.read;
    return read === 'run' || read === 'pass' ? read : null;
  }

  /** Experience: the prior's displacement for a picture like this one, interpolated over horizons.
   * Conditioned on what the observer believes the play is, when he has a belief and the cell exists. */
  private priorDisplacement(target: Agent, seen: Perceived, tSeen: number, s: number, observer?: Agent): Vec2 | null {
    const c0 = this.priorContext(target, seen, tSeen); if (!c0) return null;
    const { key, up, side, ux, uy } = c0;
    const pooled = key.slice(0, key.lastIndexOf('|')) + '|*', kind = observer ? this.believedKind(observer) : null;
    const cell = (kind && (ANTICIPATION_PRIOR[`${kind}|${key}`] ?? ANTICIPATION_PRIOR[`${kind}|${pooled}`]))
      ?? ANTICIPATION_PRIOR[key] ?? ANTICIPATION_PRIOR[pooled];
    if (!cell) return null;
    const pts = PRIOR_HORIZONS.map(h => [h, cell[String(h)]] as const).filter(([, v]) => !!v) as [number, [number, number, number]][];
    if (!pts.length) return null;
    const lerp = (h: number): [number, number] => {
      if (h <= pts[0][0]) return [pts[0][1][0] * h / pts[0][0], pts[0][1][1] * h / pts[0][0]];
      for (let k = 1; k < pts.length; k++) if (h <= pts[k][0]) { const [h0, a] = pts[k - 1], [h1, b] = pts[k], w = (h - h0) / (h1 - h0);
        return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]; }
      const last = pts[pts.length - 1][1]; return [last[0], last[1]];
    };
    const [along, across] = lerp(s), c = across * side;
    return { x: (along * ux - c * uy) * up, y: along * uy + c * ux };
  }

  /** GAZE: is `target` in `observer`'s view or contact, given his delayed picture of it? */
  private inView(observer: Agent, target: Agent, picture: Perceived, delay: number): boolean {
    const g = this.gaze.get(observer)!;
    if (target === g.target) return true;
    const e = observer.engagement;
    if (e && (e.blocker === target || e.defender === target || e.helpers.includes(target))) return true;
    if (target.engagement && (target.engagement.blocker === observer || target.engagement.defender === observer)) return true;
    if (this.bond && this.bond.carrier === target && this.bond.tacklers.includes(observer)) return true;
    if (this.lastStep?.contacts.some(c => (c.i === observer.idx && c.j === target.idx) || (c.j === observer.idx && c.i === target.idx))) return true;
    if (g.t < this.t) {
      // The head turns toward the watched man's delayed picture, within the neck range.
      const w = this.perception.perceive(g.target.idx, delay);
      const want = Math.atan2(w.pos.y - observer.pos.y, w.pos.x - observer.pos.x);
      const clamped = observer.facing + clamp(angDiff(want, observer.facing), -GAZE_NECK, GAZE_NECK);
      const step = GAZE_HEAD_RATE * (this.t - g.t);
      g.dir = g.dir + clamp(angDiff(clamped, g.dir), -step, step);
      g.dir = observer.facing + clamp(angDiff(g.dir, observer.facing), -GAZE_NECK, GAZE_NECK);
      g.t = this.t;
    }
    const brg = Math.atan2(picture.pos.y - observer.pos.y, picture.pos.x - observer.pos.x);
    return Math.abs(angDiff(brg, g.dir)) <= GAZE_CONE;
  }

  /** GAZE: out of view, his last in-view picture projected for his anticipation horizon. */
  private remembered(observer: Agent, target: Agent, seen: Perceived): Perceived {
    const key = `${observer.idx}>${target.idx}`;
    let m = this.sightMemory.get(key);
    if (!m || m.at < this.gaze.get(observer)!.since) { m = { seen, at: this.t }; this.sightMemory.set(key, m); }
    const since = this.t - m.at;
    // Anticipation bounds measured on NFL tracking with the same operator
    // (scripts/diag/anticipation-bound.py): from motion alone, constant
    // acceleration is the best single predictor to about 1.0 s, beyond which
    // motion stops helping. Skill is the mean of play recognition and awareness.
    const skill = clamp(0.5 * observer.r('playRecognition') + 0.5 * observer.r('awareness'), 0, 1);
    const s = Math.min(since, ANTICIPATION_HORIZON), a = m.acc ?? { x: 0, y: 0 };
    let dx = m.seen.vel.x * s + 0.5 * a.x * s * s, dy = m.seen.vel.y * s + 0.5 * a.y * s * s;
    const vx = m.seen.vel.x + a.x * s, vy = m.seen.vel.y + a.y * s, sp = Math.hypot(vx, vy);
    if (sp > ANTICIPATION_MAX_SPEED) { dx = m.seen.vel.x * s; dy = m.seen.vel.y * s; }
    const moving = since < ANTICIPATION_HORIZON;
    // The ladder (measured on tracking): frozen picture -> motion projection -> experience prior.
    // Following motion is basic perception: it saturates at read skill 0.5 (generated players run
    // 0.3-1.0, so only a hypothetical zero-rated player is frozen). Above 0.5, his experience
    // (the tracking prior) takes over, but only for opponents his own assignment makes his.
    const wm = Math.min(1, 2 * skill), hp = PRIOR_HORIZONS[PRIOR_HORIZONS.length - 1], sp2 = Math.min(since, hp);
    const tSeen = m.at - (m.seen.age ?? 0);
    const prior = this.isAssigned(observer, target) ? this.priorDisplacement(target, m.seen, tSeen, sp2, observer) : null;
    // On NFL tracking constant acceleration is the better predictor to about 0.8 s and the context prior
    // by 1.5 s (Run Game, held out), so experience takes over as the picture ages.
    const handover = clamp((since - PRIOR_HANDOVER[0]) / (PRIOR_HANDOVER[1] - PRIOR_HANDOVER[0]), 0, 1);
    const wp = prior ? Math.max(0, 2 * skill - 1) * handover : 0;
    let pvx = 0, pvy = 0;
    if (prior && wp > 0 && since < hp) {
      const ahead = this.priorDisplacement(target, m.seen, tSeen, Math.min(hp, sp2 + 0.1), observer)!;
      pvx = (ahead.x - prior.x) / 0.1; pvy = (ahead.y - prior.y) / 0.1;
    }
    const px = (1 - wp) * wm * dx + (prior ? wp * prior.x : 0), py = (1 - wp) * wm * dy + (prior ? wp * prior.y : 0);
    const mv = moving ? 1 : 0;
    return { ...m.seen, pos: { x: m.seen.pos.x + px, y: m.seen.pos.y + py },
      vel: { x: (1 - wp) * wm * vx * mv + wp * pvx, y: (1 - wp) * wm * vy * mv + wp * pvy }, age: (m.seen.age ?? 0) + since };
  }

  /** What `observer` perceives of `target` (delayed for opponents). */
  see(observer: Agent, target: Agent, delayScale = 1): Perceived {
    if (observer.team === target.team) {
      const seen = this.perception.perceive(target.idx, 0.05);
      this.trace.observe(observer, target, seen, this.t);
      this.commandTrace?.observe(observer, target, seen, this.t);
      return seen;
    }
    let delay = observer.mind.observationDelay(observer.profile.reactionTime * delayScale);
    // Eyes on keys: everything else is peripheral.
    if (observer.eyes && !observer.eyes.keys.includes(target)) delay += observer.eyes.peripheral;
    // Attention follows the observer's belief, regardless of the hidden call:
    // reading run, his eyes go to the backfield and the blockers, so a man
    // releasing away from him is seen late. A blocker his own picture shows in
    // front of him and in range is one of the blockers he is watching,
    // whatever his position; where the blocker really is now does not decide it.
    // Looking away from a man he was watching holds the picture he has of him;
    // it ages from there and does not rewind to an older moment.
    const line = ['LT', 'LG', 'C', 'RG', 'RT'];
    // Held per query: a caller asking for an older picture on purpose
    // (pursuit compares two samples for acceleration) keeps its own history.
    const now = Math.round(this.t / this.dt), key = `${observer.idx}>${target.idx}@${delayScale}`;
    const sampled = (this.sightSamples ??= new Map<string, number>()).get(key);
    if (observer.recog?.read === 'run' && target !== this.qb && target.slot !== 'RB' && !line.includes(target.slot)
      && !inBlockingView(observer, this.perception.perceive(target.idx, delay).pos)) {
      const attended = delay;
      delay += 0.15;
      if (sampled !== undefined && sampled <= now) delay = Math.max(attended, Math.min(delay, (now - sampled) * this.dt));
    }
    let seen = this.perception.perceive(target.idx, delay);
    this.sightSamples.set(key, now - Math.round((seen.age ?? delay) / this.dt));
    const g = GAZE ? this.gaze.get(observer) : undefined;
    if (g && g.set >= this.t - this.dt - 1e-9) {
      if (this.inView(observer, target, seen, delay)) {
        // Acceleration from two in-view pictures close together, for anticipation.
        const k = `${observer.idx}>${target.idx}`, prev = this.sightMemory.get(k), dt = prev ? this.t - prev.at : 0;
        const acc = prev && dt > 1e-6 && dt <= 0.3 + 1e-9
          ? { x: (seen.vel.x - prev.seen.vel.x) / dt, y: (seen.vel.y - prev.seen.vel.y) / dt } : prev?.acc;
        this.sightMemory.set(k, { seen, at: this.t, acc });
      }
      else seen = this.remembered(observer, target, seen);
    }
    this.trace.observe(observer, target, seen, this.t);
    this.commandTrace?.observe(observer, target, seen, this.t);
    return seen;
  }

  /** What `observer` perceives of `target` he is tracking: a continuous, attended read (the man he mirrors, the carrier
   * he pursues, the rusher he sets on or feels). PERCEIVE_TRACK off: exactly `see(observer, target, delayScale)`. On: a
   * short correcting loop at TRACK_LATENCY, with no focus, stress or attention terms stacked on it (those belong to
   * recognition) and no acceleration term; teammates as in `see()`. */
  track(observer: Agent, target: Agent, delayScale = 1): Perceived {
    if (!PERCEIVE_TRACK || observer.team === target.team) return this.see(observer, target, delayScale);
    const seen = this.perception.perceive(target.idx, TRACK_LATENCY);
    this.trace.observe(observer, target, seen, this.t);
    this.commandTrace?.observe(observer, target, seen, this.t);
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
    if (a && ['pbu', 'drop', 'deflection'].includes(type) && this.ball.kind === 'air') this.touchPass(a);
    this.events.push({ t: round2(this.t), type, a: a?.idx, b: b?.idx, pos: a ? { x: round2(a.pos.x), y: round2(a.pos.y) } : undefined, note });
  }

  /** Retain every supported called act without consuming an execution draw.
   * Legacy holding calls stay explicitly qualified as a sampled abstraction. */
  recordFoul(call: PenaltyCall, evidence: FoulEvidence): void {
    const id = call.id ?? `${call.kind}:${call.playerId}:${call.t ?? this.t}`;
    if (this.penalties.some(p => p.id === id)) return;
    const recorded: PenaltyCall & { id: string; t: number } = { ...call, id, t: call.t ?? this.t,
      possessionChanges: call.possessionChanges ?? this.possessionChanges,
      possessionTeam: call.possessionTeam ?? this.possession,
      playPhase: call.playPhase ?? (this.ball.kind === 'air' || (this.isPass && this.throwAt < 0 && this.handoffAt < 0)
        ? 'pass' : this.ball.kind === 'loose' || this.ball.kind === 'pitch' ? 'loose_ball' : 'run'),
      phase: call.phase ?? (this.phase === 'dead' ? 'dead_ball' : 'live') };
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
    } else {
      const actor = this.agents.find(a => a.player.id === call.playerId);
      this.events.push({ t: recorded.t, type: 'penalty', a: actor?.idx,
        pos: { x: call.spotX ?? actor?.pos.x ?? this.los, y: actor?.pos.y ?? this.ballY },
        note: `${call.kind} (${call.rule ?? 'NFL-2026'})` });
    }
  }

  // ------------------------------------------------------------ actions

  presentHandoffFake(from: Agent, to: Agent): boolean {
    if (this.ball.kind !== 'held' || this.ball.carrier !== from || from.team !== to.team
      || from.isDown(this.t) || to.isDown(this.t) || dist(from.pos, to.pos) > handoffReach(from, to)) return false;
    this.presentedFakeRunners.add(to);
    if (!this.fakePresentationEvents.has(to)) {
      this.fakePresentationEvents.add(to); this.event('handoff_fake', from, to);
    }
    return true;
  }

  pretendCarry(a: Agent): void {
    if (a !== this.qb || this.handoffAt < 0 || this.carrier === a || a.isDown(this.t)) return;
    this.presentedFakeRunners.add(a);
  }

  /** Resolve actual first touch before changing the ball or its trajectory. */
  touchPass(a: Agent, caught = false): boolean {
    if (this.ball.kind !== 'air') return true;
    const ball = this.ball;
    const ruling = assessNativePassTouch(this, a, caught, true);
    notePassTouch(this, this.t);
    finishPassLegality(this, ball, ball.flight.pos, a);
    if (ruling?.kind === 'incomplete') {
      this.event('incomplete', a, null, ruling.reason);
      this.whistle('incomplete', { x: this.los, y: this.ballY });
      return false;
    }
    return true;
  }

  handoff(from: Agent, to: Agent): boolean {
    if (this.ball.kind !== 'held' || this.ball.carrier !== from || to.team !== from.team
      || from.isDown(this.t) || to.isDown(this.t)
      || dist(from.pos, to.pos) > handoffReach(from, to)) return false;
    const handing = assessForwardHanding({ forward: (to.pos.x - from.pos.x) * this.attackDir(from.team) > 0,
      afterPossessionChange: this.possessionChanges > 0,
      receiverBehindLine: to.pos.x + bodyRadius(to.body, 1, 0) <= this.los,
      receiverEligible: this.snapEligibility.get(to.player.id)?.eligible ?? null });
    if (handing?.kind === 'illegal_handoff') this.recordFoul({
      kind: handing.kind, against: from.team, playerId: from.player.id,
      yards: handing.yards, autoFirst: false, rule: handing.rule, reason: handing.reason,
      enforcement: handing.enforcement, lossDown: handing.lossDown, spotX: from.pos.x,
      phase: 'live', t: this.t }, { source: 'native', rule: handing.rule,
      action: 'achieved_forward_handing', victimId: to.player.id,
      facts: { fromX: from.pos.x, toX: to.pos.x, reason: handing.reason } });
    else if (handing?.kind === 'unresolved') this.ruleLimitations.add(`${handing.rule}: ${handing.missing}`);
    if (this.acquisition) {
      this.acquisition.momentumRetained = false; this.acquisition.impetusTeam = from.team;
    }
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
    const dir = this.attackDir(from.team);
    const intended = { x: dir * Math.min(dir * from.pos.x, dir * (to.pos.x + to.vel.x * T)), y: to.pos.y + to.vel.y * T, z: 1.1 };
    this.ball = { kind: 'pitch', thrower: from, target: to, releaseT: this.t, releaseX: pos.x, intended,
      impetusTeam: this.acquisition?.team === from.team ? this.acquisition.impetusTeam : from.team,
      flight: { pos, vel: solveLaunch(pos, intended, T, DRAG_TUMBLE, this.wind), drag: DRAG_TUMBLE } };
    this.endSegment(from.pos.x, 'handoff');
    this.event('pitch', from, to);
    return true;
  }

  /** Execute a clock spike through the ordinary pass flight and ruling hooks.
   * The immediate exception is established internally from snap history. */
  spikeBall(passer: Agent = this.qb): boolean {
    if (this.phase !== 'live' || this.ball.kind !== 'held' || this.ball.carrier !== passer) return false;
    this.throwBall(passer, null, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, this.t, true, { spike: true });
    return true;
  }

  throwBall(qb: Agent, target: Agent | null, v0: Vec3, intended: Vec3, arrivalT: number, throwaway = false,
    rules: { spike?: boolean } = {}): void {
    if (this.ball.kind !== 'held' || this.ball.carrier !== qb) return;
    const release: Vec3 = { x: qb.pos.x + Math.cos(qb.body.facing) * 0.3, y: qb.pos.y + Math.sin(qb.body.facing) * 0.3, z: 2.2 };
    let spike: 'immediate' | 'delayed' | undefined;
    if (rules.spike) {
      // Requesting a spike executes this native ground-directed action; the
      // caller cannot attach an exemption to an unrelated upward/deep throw.
      const snap = this.segments[0];
      const continuousSnapAction = this.t === 0 && this.snapActionIntervals === 0
        && this.segments.length === 1 && snap?.how === 'snap' && snap.end === 'live'
        && snap.carrier === qb.player.id && qb === this.qb;
      spike = continuousSnapAction ? 'immediate' : 'delayed';
      target = null; throwaway = true;
      const duration = .2;
      intended = { x: release.x + this.attackDir(qb.team) * .1, y: release.y, z: 0 };
      v0 = solveLaunch(release, intended, duration, DRAG_SPIRAL, this.wind);
      arrivalT = this.t + duration;
      if (spike === 'immediate' && this.offCall.formation.qb !== 'under')
        this.ruleLimitations.add('8-2-1 Item3: immediate non-T spike has no special exemption; ordinary grounding facts apply');
    }
    const forward = v0.x * (qb.team === 'O' ? 1 : -1) > 0;
    const illegal = forward ? assessForwardPass({ previousForwardPasses: this.forwardPasses,
      possessionChangedBeforePass: this.possessionChanges > 0,
      entireBodyBeyondLine: qb.pos.x - bodyRadius(qb.body, 1, 0) > this.los,
      ballBeyondLine: release.x > this.los, ballPreviouslyBeyondLine: this.ballPreviouslyBeyondLine,
      fromBehindLine: !(qb.pos.x - bodyRadius(qb.body, 1, 0) > this.los && release.x > this.los) }) : null;
    if (illegal && !this.statsBeforeIllegalPass) {
      this.statsBeforeIllegalPass = { ...this.stats, tacklers: [...this.stats.tacklers],
        missedTacklesBy: Object.fromEntries(this.agents.map(a => [a.player.id, a.missedTackles])),
        fumbles: this.stats.fumbles?.map(f => ({ ...f })) };
      this.segmentsBeforeIllegalPass = this.segments.map((s, i) => ({ ...s,
        ...(i === this.segments.length - 1 && s.end === 'live' ? { endX: qb.pos.x, end: 'pass' as const } : {}) }));
    }
    if (illegal) this.recordFoul({ kind: 'illegal_forward_pass', against: qb.team,
      playerId: qb.player.id, yards: 5, autoFirst: false, spotX: release.x, t: this.t,
      rule: illegal.rule, reason: illegal.reason, enforcement: illegal.enforcement,
      lossDown: illegal.lossDown,
      // 8-6 Note1: illegal-pass safety uses the spot of the pass. Grounding's
      // separate whole-body-and-ball exception must not migrate here.
      penaltySafety: qb.team === 'O' ? release.x <= OWN_GOAL_X : release.x >= OPP_GOAL_X }, { source: 'native', rule: illegal.rule,
      action: 'forward_pass', facts: { reason: illegal.reason, previousForwardPasses: this.forwardPasses,
        possessionChanges: this.possessionChanges, releaseX: release.x } });
    assessPrethrowBlocksOnPass(this, qb, release.x, this.t, v0.x);
    notePassRelease(this, qb, release.x, this.t, v0.x);
    capturePassLegality(this, qb, release, v0, { spike });
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
    this.event(throwaway ? 'throwaway' : 'throw', qb, target, spike ? `${spike} clock spike` : throwaway ? 'thrown away' : undefined);
    onThrow(this);
  }

  /** Pass caught (or intercepted) by `a` at the current ball position. */
  possess(a: Agent, how: 'catch' | 'interception' | 'recovery'): void {
    if (this.ball.kind === 'air' && !this.touchPass(a, true)) return;
    const loose = this.ball.kind === 'loose' ? this.ball : null;
    const prevTeam = loose ? loose.lastTeam : this.ball.kind === 'air' ? this.ball.thrower.team
      : this.ball.kind === 'held' ? this.ball.carrier.team : this.possession;
    if (a.team !== prevTeam) {
      this.possessionChanges++;
      const dir = this.attackDir(a.team);
      const ownZone = dir * (a.pos.x - (a.team === 'O' ? OWN_GOAL_X : OPP_GOAL_X)) <= 0;
      const originalMomentum = !ownZone && a.vel.x * dir < 0;
      this.acquisition = { team: a.team, spotX: a.pos.x,
        impetusTeam: ownZone || originalMomentum ? (loose?.impetusTeam ?? prevTeam) : a.team,
        momentumRetained: originalMomentum,
        acquiredInOwnEndZone: ownZone, leftOwnEndZone: false, attemptedAdvance: false };
    }
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
      this.stats.interceptedBy ??= a.player.id;
      this.catchX = a.pos.x;
      this.event('interception', a);
      onInterception(this, a);
    } else {
      this.possession = a.team;
      if (loose && this.stats.fumbles) {
        const fumble = [...this.stats.fumbles].reverse().find(f => f.playerId === loose.fumbledBy.player.id && !f.recoveredBy);
        if (fumble) { fumble.recoveredBy = a.player.id; fumble.lost = loose.lastTeam !== a.team; }
      }
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
            // Possession beyond the opponent's goal line is ruled a touchdown
            // before tackles (checkTouchdown), so the dead spot should be in
            // the own end zone. If it is not, the fumbler held the ball in
            // the end zone his team attacks: the nearest ruling is his score.
            const ownEndZone = a.team === 'O' ? ruling.deadBallX <= OWN_GOAL_X : ruling.deadBallX >= OPP_GOAL_X;
            if (!ownEndZone) {
              this.ruleLimitations.add(`${ruling.rule}: dead spot in the attacked end zone; ruled a touchdown`);
              this.scoreKind = 'TD';
              this.event('touchdown', a, null, `${ruling.rule}: teammate recovery dead in the attacked end zone`);
              this.whistle('touchdown', { x: ruling.deadBallX, y: a.pos.y });
              if (a.team !== prevTeam) this.capturePossessionSnapshot();
              return;
            }
            const facts = { team: a.team, fumbleX: loose.fumbleX ?? ruling.deadBallX, impetusTeam: loose.impetusTeam,
              momentumExceptionExcluded: loose.momentumExceptionExcluded, momentumSpotX: loose.momentumSpotX };
            let endZone = restrictedRecoveryInOwnEndZone(facts);
            if (endZone.kind === 'unresolved') {
              // The ball's history lacks the end-zone impetus or momentum
              // facts: rule on the recorded impetus (else the recovering
              // team's) without the momentum exception, and record the gap.
              this.ruleLimitations.add(`${ruling.rule}: end-zone recovery lacks impetus/momentum facts; ruled on recorded impetus`);
              endZone = restrictedRecoveryInOwnEndZone({ ...facts, impetusTeam: facts.impetusTeam ?? a.team,
                momentumExceptionExcluded: true, momentumSpotX: undefined });
            }
            if (endZone.kind === 'unresolved') throw new Error('unreachable: impetus and momentum supplied');
            const note = `${ruling.rule}/${endZone.rule}: teammate recovery dead in own end zone`;
            if (endZone.kind === 'safety') {
              this.scoreKind = 'safety';
              this.scoreTeam = endZone.scoringTeam;
              this.event('safety', a, null, note);
              this.whistle('safety', { x: ruling.deadBallX, y: a.pos.y });
            } else if (endZone.kind === 'touchback') {
              this.event('touchback', a, null, note);
              this.whistle('touchback', { x: ruling.deadBallX, y: a.pos.y });
            } else {
              this.event('momentum', a, null, note);
              this.whistle('tackle', { x: endZone.spotX, y: a.pos.y });
            }
          }
        }
      }
    }
    if (a.team !== prevTeam) this.capturePossessionSnapshot();
  }

  private capturePossessionSnapshot(): void {
    const stats = structuredClone(this.stats);
    stats.missedTacklesBy = Object.fromEntries(this.agents.map(a => [a.player.id, a.missedTackles]));
    (this.possessionSnapshotRecords ??= []).push({ changes: this.possessionChanges,
      possession: this.possession, stats, segments: this.segments.map(s => ({ ...s })) });
  }

  fumble(carrier: Agent, hitter: Agent | null): void {
    if (this.ball.kind !== 'held') return;
    (this.stats.fumbles ??= []).push({ playerId: carrier.player.id, team: carrier.team, lost: false, t: this.t });
    const v = carrier.body.vel;
    const loose = this.dice('loose-ball');
    const ang = loose.range(0, Math.PI * 2);
    const sp = loose.range(2, 6);
    const flight: BallFlight = {
      pos: { x: carrier.pos.x, y: carrier.pos.y, z: 1.0 },
      vel: { x: v.x * 0.5 + Math.cos(ang) * sp, y: v.y * 0.5 + Math.sin(ang) * sp, z: loose.range(0.5, 3) },
      drag: DRAG_TUMBLE,
    };
    this.ball = { kind: 'loose', flight, since: this.t, lastTeam: carrier.team, fumbledBy: carrier,
      fumbleX: carrier.pos.x, origin: 'fumble', possessionChangedBeforeFumble: this.possessionChanges > 0,
      impetusTeam: this.acquisition?.team === carrier.team ? this.acquisition.impetusTeam : carrier.team,
      momentumExceptionExcluded: !this.acquisition?.momentumRetained,
      momentumSpotX: this.acquisition?.team === carrier.team && this.acquisition.momentumRetained
        ? this.acquisition.spotX : undefined,
      // A carrier still in bounds can hold the ball beyond the boundary's plane (his support is what puts him out).
      // A fumble there is loose already beyond it: it crossed at the fumble's yard line, so that is where it is out
      // if it then touches the ground or anything out of bounds. Without this the loose ball had no crossing and
      // its out-of-bounds contact was an invariant failure (engine-50 cards, seed 23).
      boundaryExit: outOfField(flight.pos) ? { x: clamp(flight.pos.x, 0, 120), y: clamp(flight.pos.y, 0, FIELD_WIDTH) } : undefined };
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
    if (this.snapAssessment && !this.snapAssessment.snapPermitted) {
      this.whistle('timeout', { x: this.los, y: this.ballY });
      this.responsibility?.seal(this);
      return this.buildResult();
    }
    this.event('snap', this.slot('C') ?? this.qb);
    while (this.phase === 'live' && this.t < MAX_PLAY_TIME) this.tick();
    if (this.phase === 'live') {
      const c = this.carrier ?? this.qb;
      this.whistle('timeout', c.pos);
    }
    this.responsibility?.seal(this);
    return this.buildResult();
  }

  /** Responsibility recording for every offensive blocker; passive, off unless requested here. */
  recordResponsibility(): ResponsibilityLedger {
    return this.responsibility = new ResponsibilityLedger();
  }

  /** Where a blocking-responsibility hook reports: the all-blockers ledger if on (it forwards to the selected trace), else the selected trace. */
  blockingSink(a: Agent): BlockingSink | undefined {
    return this.responsibility ?? this.commandTraceFor(a);
  }

  /** Optional selected-actor recording, independent of packed replay and its cadence. */
  recordCommands(selection: CommandTraceSelection): CommandTrace {
    const actor = selection.actor;
    const matches = this.agents.filter(a => 'playerId' in actor ? a.player.id === actor.playerId
      : a.team === actor.team && a.slot === actor.slot);
    if (matches.length !== 1) throw new Error('Command trace must select exactly one actor');
    return this.commandTrace = new CommandTrace(matches[0], selection);
  }

  /** A pending selected-player window only; helpers need not allocate diagnostic data otherwise. */
  commandTraceFor(a: Agent): CommandTrace | undefined {
    return this.commandTrace?.isCollecting(a) ? this.commandTrace : undefined;
  }

  /** One player's decision for this step, through containment, coverage
   * orientation and opening to the ball, into this.cmds. */
  private decide(i: number, t: number): void {
    const a = this.agents[i];
    const commandTrace = this.commandTrace, ledger = this.responsibility;
    commandTrace?.at('decision');
    const owner = a.behavior, before = commandTrace?.decisionStart(a, this);
    // Reaction delays control, not collisions: he can still be pushed.
    const command = t < a.snapReadyAt ? { vel: { x: 0, y: 0 }, facing: a.facing } : a.behavior.update(a, this);
    commandTrace?.decisionEnd(a, owner, before, command, t >= a.snapReadyAt, this);
    ledger?.decision(a, owner, command, t >= a.snapReadyAt);
    const coverage = a.behavior.kind === 'man' || a.behavior.kind === 'zone';
    let contained = coverage ? containCoverage(a, command) : command;
    commandTrace?.command(a, 'containment', contained);
    ledger?.stage('containment', a, contained);
    if (coverage) {
      contained = coverageOrientation(a).steer(a, t, this.dt, contained);
      commandTrace?.command(a, 'coverage-orientation', contained);
      ledger?.stage('coverage-orientation', a, contained);
    }
    commandTrace?.at('open-to-ball');
    this.cmds[i] = openToBall(a, this, contained);
    if (L2_BREAKDOWN && t >= a.snapReadyAt) this.cmds[i] = breakdownForContact(a, this, this.cmds[i]);
    commandTrace?.command(a, 'open-to-ball', this.cmds[i]);
    ledger?.stage('open-to-ball', a, this.cmds[i]);
  }

  tick(): void {
    const t = this.t;
    const commandTrace = this.commandTrace;
    commandTrace?.begin(this);
    const ledger = this.responsibility;
    ledger?.begin(this);
    // QB_BODY_SEEN: his throwing motion shows on his body (recorded for everyone; read only through perception).
    if (this.qb) this.qb.arm = this.windupAt < 0 ? 'set' : this.deliveryAt >= 0 && t >= this.deliveryAt ? 'deliver' : 'load';
    recordContact(this);
    this.perception.record(this.agents, this.carrier?.idx ?? null);
    for (const a of this.agents) {
      let nearby = 0;
      for (const other of this.opponents(a)) {
        const seen = this.perception.perceive(other.idx, a.profile.reactionTime);
        if (hypot2(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) < 3) nearby++;
      }
      a.mind.update(t, this.dt, a.body.energy, a.engagement ? 0.65 : Math.min(1, nearby / 4));
    }
    this.incidentalCatchReadiness.sense(this);
    this.throwSight.sense(this);
    for (const d of this.defense) d.recog?.update(d, this);

    this.prepareJoinedRunBlocks();

    // Decide.
    this.presentedFakeRunners.clear();
    for (let i = 0; i < this.agents.length; i++) this.decide(i, t);

    // Intents: the decisions, refined by the techniques that own contact.
    for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      const dive = this.dives.get(a), lunge = this.lunges.get(a);
      this.intents[i] = dive || lunge ? { ...this.cmds[i], dive, lunge } : { ...this.cmds[i] };
    }
    this.dives.clear();
    this.lunges.clear();
    commandTrace?.stage('technique-intents', this.intents);
    ledger?.stageAll('technique-intents', this.intents);
    commandTrace?.at('engagement');
    const engagedBefore = RELEASE_REDECIDE ? this.agents.map((a) => !!a.engagement) : null;
    updateEngagements(this, this.intents);
    // A player whose block ended in this update (he shed it, or it was given
    // up) knows he is free: he decides again now, rather than carrying the
    // command he gave while engaged (usually a standstill) through the rest
    // of the step. Half of all block releases otherwise stood still for a step.
    if (engagedBefore) for (let i = 0; i < this.agents.length; i++) {
      const a = this.agents[i];
      if (!engagedBefore[i] || a.engagement || t < a.snapReadyAt) continue;
      // Technique requests this decision makes (a dive, a lunge) belong to
      // this step's intent, as an ordinary decision's do, and must not wait in
      // the maps for the next step. Requests already there came from the
      // engagement update and keep their ordinary timing.
      const priorDive = this.dives.get(a), priorLunge = this.lunges.get(a);
      this.decide(i, t);
      const dive = this.dives.get(a), lunge = this.lunges.get(a);
      const newDive = dive !== priorDive ? dive : undefined, newLunge = lunge !== priorLunge ? lunge : undefined;
      if (newDive) { if (priorDive) this.dives.set(a, priorDive); else this.dives.delete(a); }
      if (newLunge) { if (priorLunge) this.lunges.set(a, priorLunge); else this.lunges.delete(a); }
      this.intents[i] = newDive || newLunge ? { ...this.cmds[i], dive: newDive, lunge: newLunge } : { ...this.cmds[i] };
    }
    commandTrace?.stage('engagement', this.intents);
    ledger?.stageAll('engagement', this.intents);
    commandTrace?.at('tackle-bond');
    if (this.bond) updateBond(this, this.bond, this.intents);
    commandTrace?.stage('tackle-bond', this.intents);
    ledger?.stageAll('tackle-bond', this.intents);
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
    commandTrace?.at('spacing');
    spaceTeammates(this.agents, this.intents, (a,b)=>{
      const seen = this.see(a,b), called = a.team === b.team ? b.behavior.calledMotion?.() : null;
      return predictCalledMotion(seen, called, b.profile);
    },{now:t,constrained,calledAhead:(a,b,h)=>a.team===b.team
      ?calledVelocityAhead(this.see(a,b),b.behavior.calledMotion?.(),b.profile,h):null});
    commandTrace?.stage('spacing', this.intents);
    ledger?.stageAll('spacing', this.intents);
    // Contact/spacing controllers cannot wake leg drive before the snap cue.
    for (const a of this.agents) if (t < a.snapReadyAt) {
      this.intents[a.idx] = { ...this.intents[a.idx], vel: { x: 0, y: 0 }, facing: a.facing,
        push: 0, dive: undefined, lunge: undefined, posture: a.body.support!.posture };
    }
    commandTrace?.stage('snap-guard', this.intents);
    ledger?.stageAll('snap-guard', this.intents);
    commandTrace?.final(this.intents);
    commandTrace?.at('execution');

    // Physics: feet, contacts, holds and balance, in substeps.
    let catchStarts: Vec2[] | undefined;
    let holdingStart: HoldingIntervalStart | undefined;
    if (this.phase === 'live') {
      // Save actual endpoints of the same interval the ball advances below,
      // including throws initiated by this tick's controller decisions.
      if (this.ball.kind === 'air') catchStarts = this.agents.map(a => ({ ...a.pos }));
      this.world.time = t;
      holdingStart = captureHoldingStart(this);
      const teamContactStart = captureTeamContactStart(this);
      const passContactStarts = capturePassContactStarts(this);
      const blockStarts = this.possession === 'O' && this.throwAt < 0
        ? this.agents.map(a => ({ ...a.pos })) : undefined;
      const report = this.world.step(this.intents, this.dt);
      this.snapActionIntervals = (this.snapActionIntervals ?? 0) + 1;
      this.lastStep = report;
      observeTeamContactRules(this, report, teamContactStart);
      if (blockStarts) observePrethrowBlocks(this, report, t, blockStarts);
      observePassContacts(this, report, t, passContactStarts);
      observePassLegality(this, report, t, passContactStarts.map(s => s.pos));
      observeContactLegality(this, report, t);
      const carrier = this.carrier, acquisition = this.acquisition;
      if (carrier && acquisition?.team === carrier.team) {
        const dir = this.attackDir(carrier.team);
        const inOwnZone = dir * (carrier.pos.x - (carrier.team === 'O' ? OWN_GOAL_X : OPP_GOAL_X)) <= 0;
        if (acquisition.acquiredInOwnEndZone && !inOwnZone) {
          acquisition.leftOwnEndZone = true; acquisition.impetusTeam = carrier.team;
        }
        const command = this.intents[carrier.idx]?.vel;
        if (command && command.x * dir > 0 && report.groundImpulse[carrier.idx].x * dir > 0)
          acquisition.attemptedAdvance = true;
        if (command && command.x * dir < 0 && report.groundImpulse[carrier.idx].x * dir < 0) {
          acquisition.momentumRetained = false; acquisition.impetusTeam = carrier.team;
        }
      }
      if (this.ballPos().x > this.los) this.ballPreviouslyBeyondLine = true;
      this.afterPhysics(report);
    }
    this.updateBall(catchStarts);
    // Possession in the opponent's end zone is a touchdown at once (11-2-1):
    // ruled before this tick's tackles can strip the ball from the scorer.
    if (this.phase === 'live') this.checkTouchdown();
    if (this.phase === 'live') tryTackles(this);
    if (this.phase === 'live') this.checkWhistle();
    flushPassContacts(this);
    if (holdingStart && this.lastStep) observeHolding(this, this.lastStep, holdingStart);
    if (this.record && (this.tickCount++ % this.recordEvery === 0 || this.phase === 'dead')) this.recordFrame();
    this.t = round2(this.t + this.dt);
    commandTrace?.finish(this);
    ledger?.finish(this);
  }

  /** Touches, first contact, falls and the pile's external impulse from the step. */
  private afterPhysics(report: StepReport): void {
    const t = this.t;
    for (const e of this.engagements) {
      if (e.contactReported) continue;
      const j = e.hands;
      const loaded = hypot2(j?.normalForce ?? 0, j?.tangentForce ?? 0) > 1e-6
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
    if (ball.kind === 'air' && ball.securing) { secureStep(this); return; }
    const prev = { ...ball.flight.pos };
    stepFlight(ball.flight, this.dt, this.wind);
    const cur = ball.flight.pos;

    if (ball.kind === 'pitch') {
      const pitchBoundary = looseBallBoundaryStep(ball.boundaryExit, prev, cur, cur.z <= 0);
      ball.boundaryExit = pitchBoundary.exit;
      // Swept reach, so a pitch cannot pass through a receiver between ticks.
      const dx = cur.x - prev.x, dy = cur.y - prev.y, d2 = dx * dx + dy * dy;
      const candidates = this.agents.filter(a => a !== ball.thrower && !a.isDown(this.t))
        .map(a => {
          const s = clamp(((a.pos.x - prev.x) * dx + (a.pos.y - prev.y) * dy) / Math.max(1e-9, d2), 0, 1);
          const z = prev.z + (cur.z - prev.z) * s;
          return { a, s, valid: z > 0.1 && z <= a.profile.reactReach
            && hypot2(a.pos.x - prev.x - dx * s, a.pos.y - prev.y - dy * s) <= a.profile.reach };
        }).filter(c => c.valid).sort((a, b) => a.s - b.s);
      if (this.t - ball.releaseT >= 0.1 && candidates.length) {
        const { a: to, s: touchFraction } = candidates[0];
        if (to.pos.y <= 0 || to.pos.y >= FIELD_WIDTH || to.pos.x <= 0 || to.pos.x >= 120) {
          // The swept reach row establishes contact with an out-of-bounds
          // person. This precedes any legal possession or change of team.
          // Use the actual ball contact point, including a reach into the
          // field before any sideline-plane crossing (3-20-3/4).
          const touch = { x: prev.x + dx * touchFraction, y: prev.y + dy * touchFraction };
          const loose: Extract<BallState, { kind: 'loose' }> = {
            kind: 'loose', flight: ball.flight, since: ball.releaseT,
            lastTeam: ball.thrower.team, fumbledBy: ball.thrower,
            fumbleX: ball.releaseX ?? ball.thrower.pos.x, origin: 'backward_pass',
            possessionChangedBeforeFumble: this.possessionChanges > 0,
            impetusTeam: ball.impetusTeam ?? ball.thrower.team, momentumExceptionExcluded: true,
            boundaryExit: pitchBoundary.exit };
          this.ball = loose;
          (this.stats.fumbles ??= []).push({ playerId: ball.thrower.player.id,
            team: ball.thrower.team, lost: false, t: ball.releaseT });
          this.stats.fumbledBy = ball.thrower.player.id;
          this.event('fumble', ball.thrower, null, 'backward pass touched out-of-bounds player');
          onLooseBall(this);
          this.finishLooseOutOfBounds(loose, touch);
          return;
        }
        this.ball = { kind: 'held', carrier: to };
        this.beginSegment(to, to.team === ball.thrower.team ? 'handoff' : 'recovery');
        this.possession = to.team;
        if (to.team !== ball.thrower.team) {
          this.possessionChanges++;
          const dir = this.attackDir(to.team), ownZone = dir * (to.pos.x - (to.team === 'O' ? OWN_GOAL_X : OPP_GOAL_X)) <= 0;
          const momentum = !ownZone && to.vel.x * dir < 0;
          this.acquisition = { team: to.team, spotX: to.pos.x,
            impetusTeam: ownZone || momentum ? ball.impetusTeam ?? ball.thrower.team : to.team,
            momentumRetained: momentum, acquiredInOwnEndZone: ownZone, leftOwnEndZone: false, attemptedAdvance: false };
        }
        this.event('pitch_catch', to, ball.thrower, 'pitch received');
        if (to.team === ball.thrower.team) {
          this.handoffAt = this.t; this.stats.rusher = to.player.id;
          onHandoff(this, ball.thrower, to);
        } else {
          (this.stats.fumbles ??= []).push({ playerId: ball.thrower.player.id,
            team: ball.thrower.team, lost: true, recoveredBy: to.player.id, t: ball.releaseT });
          if (ball.thrower.team === 'O') this.stats.fumbledBy = ball.thrower.player.id;
          this.stats.fumbleLost = true;
          this.stats.fumbleRecoveredBy = to.player.id;
          this.event('recovery', to, ball.thrower, 'opponent pitch recovered');
          onRecovery(this, to);
          this.capturePossessionSnapshot();
        }
      } else if (cur.z <= 0.05) {
        this.ball = { kind: 'loose', flight: ball.flight, since: ball.releaseT,
          lastTeam: ball.thrower.team, fumbledBy: ball.thrower,
          fumbleX: ball.releaseX ?? ball.thrower.pos.x, origin: 'backward_pass', possessionChangedBeforeFumble: this.possessionChanges > 0,
          impetusTeam: ball.impetusTeam ?? ball.thrower.team, momentumExceptionExcluded: true,
          boundaryExit: pitchBoundary.exit };
        (this.stats.fumbles ??= []).push({ playerId: ball.thrower.player.id,
          team: ball.thrower.team, lost: false, t: ball.releaseT });
        this.stats.fumbledBy = ball.thrower.player.id;
        this.event('fumble', ball.thrower, null, 'pitch missed');
        onLooseBall(this);
        if (pitchBoundary.dead && pitchBoundary.exit) this.finishLooseOutOfBounds(this.ball as Extract<BallState, { kind: 'loose' }>, pitchBoundary.exit);
      }
      return;
    }

    if (ball.kind === 'air') {
      resolveCatchOpportunities(this, prev, cur, catchStarts);
      if (this.ball.kind !== 'air') return;
      if (cur.z <= 0.05 || cur.y < -1 || cur.y > FIELD_WIDTH + 1 || cur.x > 121) {
        finishPassLegality(this, ball, cur);
        this.stats.completed = false;
        this.event('incomplete', null, null);
        this.whistle('incomplete', { x: this.los, y: this.ballY });
      }
      return;
    }

    // Loose ball: bounce, roll, recover.
    const boundary = looseBallBoundaryStep(ball.boundaryExit, prev, cur, cur.z <= 0);
    ball.boundaryExit = boundary.exit;
    if (boundary.dead) {
      if (!boundary.exit) throw new Error('Loose-ball boundary contact lacks its actual outward crossing');
      this.finishLooseOutOfBounds(ball, boundary.exit);
      return;
    }
    if (cur.z <= 0) {
      const f = ball.flight;
      f.pos = { ...f.pos, z: 0 };
      // Prolate spheroid bounces are erratic.
      const ang = this.dice('loose-ball').range(-1.2, 1.2);
      const vx = f.vel.x * 0.55;
      const vy = f.vel.y * 0.55;
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      f.vel = { x: vx * c - vy * s, y: vx * s + vy * c, z: Math.abs(f.vel.z) * this.dice('loose-ball').range(0.15, 0.45) };
      if (hypot2(f.vel.x, f.vel.y) < 0.5 && f.vel.z < 0.4) f.vel = { x: 0, y: 0, z: 0 };
    }
    if (this.t - ball.since < 0.15) return;
    // Nearest players scramble for it; possession chance rises when on the ground.
    let best: Agent | null = null;
    let bestD = 1.0;
    for (const a of this.agents) {
      if (a.isDown(this.t)) continue;
      const d = hypot2(a.pos.x - cur.x, a.pos.y - cur.y);
      if (d < bestD && cur.z < 1.2) {
        bestD = d;
        best = a;
      }
    }
    if (best && this.dice('recover', best).chance(cur.z < 0.3 ? 0.35 : 0.12)) {
      if (best.pos.y <= 0 || best.pos.y >= FIELD_WIDTH || best.pos.x <= 0 || best.pos.x >= 120) {
        this.finishLooseOutOfBounds(ball, ball.boundaryExit ?? { x: cur.x, y: clamp(cur.y, 0, FIELD_WIDTH) });
        return;
      }
      const hadIt = ball.lastTeam;
      this.possess(best, 'recovery');
      if (best.team !== hadIt) this.stats.fumbleLost = true;
      // Eligible recoverers are upright. Securing the ball does not put a
      // body on the turf: World contact/support and the ordinary carrier
      // rules determine whether this recovery can advance or is tackled.
    }
  }

  private finishLooseOutOfBounds(ball: Extract<BallState, { kind: 'loose' }>, exit: Vec2): void {
    this.possession = ball.lastTeam;
    // 8-7-2 is objective: even a missed pitch out of bounds is an illegal
    // conserving act on a down begun after the warning and before any COP.
    // Do not require an invented intention to stop the clock.
    if (ball.origin === 'backward_pass' && this.afterTwoMinuteWarning && this.possessionChanges === 0) {
      this.recordFoul({ id: `backward-pass-oob:${ball.fumbledBy.idx}:${ball.since}`,
        kind: 'illegal_backward_pass', against: ball.lastTeam, playerId: ball.fumbledBy.player.id,
        yards: 5, autoFirst: false, lossDown: true, spotX: exit.x,
        basicSpotX: ball.fumbleX, playPhase: 'loose_ball', phase: 'live', rule: '8-7-2',
        reason: 'backward pass out of bounds after the warning before possession changes',
        causedBallOutOfBounds: true }, { source: 'native', rule: '8-7-2',
        action: 'achieved_backward_pass_out_of_bounds', facts: { releaseX: ball.fumbleX ?? ball.fumbledBy.pos.x,
          outX: exit.x, afterTwoMinuteWarning: true, possessionChanges: 0 } });
    }
    this.event('out_of_bounds', null, null, 'loose ball touched outside ground/person');
    let spotX = exit.x;
    const fumbleX = ball.fumbleX;
    const fieldEndpoints = fumbleX !== undefined && fumbleX > OWN_GOAL_X && fumbleX < OPP_GOAL_X
      && exit.x > OWN_GOAL_X && exit.x < OPP_GOAL_X;
    if (fumbleX !== undefined && (ball.origin !== 'backward_pass' || !fieldEndpoints)) {
      const fromField = fumbleX > OWN_GOAL_X && fumbleX < OPP_GOAL_X;
      const ruling = fumbleOutOfBounds({ fumbleX, outX: exit.x, lastPossessionTeam: ball.lastTeam,
        impetusTeam: fromField ? ball.lastTeam : ball.impetusTeam,
        momentumExceptionExcluded: fromField || ball.momentumExceptionExcluded === true,
        momentumSpotX: ball.momentumSpotX });
      if (ruling.kind === 'spot') spotX = ruling.spotX;
      else if (ruling.kind === 'safety') {
        this.scoreKind = 'safety'; this.scoreTeam = ruling.scoringTeam;
        this.event('safety', ball.fumbledBy, null, ruling.rule);
        this.whistle('safety', exit); return;
      } else if (ruling.kind === 'touchback') {
        this.possession = ruling.possession;
        this.stats.fumbleLost = ball.lastTeam !== ruling.possession;
        const fumble = this.stats.fumbles && [...this.stats.fumbles].reverse().find(f => f.playerId === ball.fumbledBy.player.id && !f.recoveredBy);
        if (fumble) fumble.lost = ball.lastTeam !== ruling.possession;
        this.event('touchback', ball.fumbledBy, null, ruling.rule);
        this.whistle('touchback', exit); return;
      } else throw new Error('Missing native end-zone impetus/momentum fact');
    }
    this.whistle('oob', { x: spotX, y: exit.y });
  }

  /** A carrier in possession in the end zone his team attacks has scored. */
  private checkTouchdown(): boolean {
    const c = this.carrier;
    if (!c || c.team !== this.possession) return false;
    const p = c.pos;
    // Out of bounds first, as in checkWhistle.
    if (p.y <= 0 || p.y >= FIELD_WIDTH || (c.team === 'O' ? p.x < OPP_GOAL_X : p.x > OWN_GOAL_X)) return false;
    this.scoreKind = 'TD';
    this.event('touchdown', c);
    this.whistle('touchdown', p);
    return true;
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
    if (this.checkTouchdown()) return;
    if (p.x <= 0 || p.x >= 120) {
      this.finishCarry('oob', { x: clamp(p.x, 0, 120), y: p.y });
      return;
    }
  }

  /** End the play on a carrier who is down or out of bounds. */
  finishCarry(kind: 'tackle' | 'oob' | 'slide', spot: Vec2): void {
    const c = this.carrier;
    if (!c) return;
    const ownEndZone = c.team === 'O' ? spot.x <= OWN_GOAL_X : spot.x >= OPP_GOAL_X;
    if (ownEndZone && this.acquisition?.team === c.team) {
      const origin = this.acquisition;
      if (origin.momentumRetained) {
        this.event('momentum', c, null, '11-5-1: original momentum; ball at acquisition');
        this.whistle(kind, { x: momentumDeadBallSpot(origin.spotX, c.team), y: spot.y }); return;
      }
      if (origin.impetusTeam !== c.team) {
        this.event('touchback', c); this.whistle('touchback', spot); return;
      }
    } else if (ownEndZone && c.team === 'D' && !this.acquisition) {
      // Historical restored tapes lack the new acquisition history.
      this.ruleLimitations.add('11-5/6: restored end-zone possession lacks impetus/momentum history');
      this.event('touchback', c); this.whistle('touchback', spot); return;
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
    if (ownEndZone) {
      this.scoreKind = 'safety';
      this.scoreTeam = c.team === 'O' ? 'D' : 'O';
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
    s.missedTacklesBy = Object.fromEntries(this.agents.map(a => [a.player.id, a.missedTackles]));
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
    const clockStops = this.outcome === 'incomplete' || this.outcome === 'oob' || this.outcome === 'touchdown' || this.outcome === 'safety' || this.outcome === 'touchback' || turnover || segs.some(s => s.team === 'D');
    // End-zone enforcement needs the impetus/momentum of the run containing
    // the foul. Complete only the final acquisition phase from native history;
    // never give an earlier return the later possessor's facts or invent facts
    // for historical saved states without acquisition evidence.
    const acquisition = this.acquisition;
    const penalties = this.penalties.map(p => acquisition?.team === this.possession
      && p.possessionChanges === this.possessionChanges && this.possessionChanges > 0
      ? { ...p, impetusTeam: p.impetusTeam ?? acquisition.impetusTeam,
        attemptedAdvance: p.attemptedAdvance ?? acquisition.attemptedAdvance,
        momentumSpotX: p.momentumSpotX ?? (acquisition.momentumRetained
          ? momentumDeadBallSpot(acquisition.spotX, acquisition.team) : undefined) }
      : p);
    return {
      rulesEdition: 'NFL-2026',
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
      penalty: penalties.find(p => p.id === this.penalty?.id) ?? this.penalty,
      penalties: penalties.length ? penalties : undefined,
      foulRecords: this.foulRecords.length ? [...this.foulRecords] : undefined,
      ruleLimitations: this.ruleLimitations.size ? [...this.ruleLimitations] : undefined,
      statsBeforeIllegalPass: this.statsBeforeIllegalPass,
      segmentsBeforeIllegalPass: this.segmentsBeforeIllegalPass,
      possessionSnapshots: this.possessionSnapshotRecords,
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

/** A blocker in view this close can be on him in well under a second at
 * running speed, so he is one of the threats a run-reading defender watches. */
const BLOCKING_RANGE = 5;

/** Whether a man at `at` (the observer's picture of him) is in front of
 * `observer`, inside his field of view and close enough to block him. */
function inBlockingView(observer: Agent, at: Vec2): boolean {
  const dx = at.x - observer.pos.x, dy = at.y - observer.pos.y, d = Math.hypot(dx, dy);
  if (d > BLOCKING_RANGE) return false;
  return d < 1e-6 || (Math.cos(observer.facing) * dx + Math.sin(observer.facing) * dy) / d > viewCone(observer);
}
