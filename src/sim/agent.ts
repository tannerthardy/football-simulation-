/**
 * A player on the field during a play: body (kinematics) + brain (behavior)
 * + per-play state.
 */
import type { Vec2 } from '../core/vec.js';
import { enduranceFactor, fatigueFactor, type Body, type MoveCommand } from '../physics/kinematics.js';
import { fallTime, supportParams } from '../physics/support.js';
import type { HandJoint } from '../physics/world.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Player, RatingKey } from '../players/types.js';
import { r01 } from '../players/types.js';
import type { PlaySim } from './playsim.js';
import type { Recognition } from './recognition.js';
import { SnapMind } from './mind.js';
import { Rng } from '../core/rng.js';
import type { RunFitJob } from './run-fits.js';
import type { VisiblePose } from './perception.js';

/** Diagnostic scale (DEF_GETOFF, default 1; from the run-offense session's
 * claude/run-game-v3): the defense's snap reaction latency, an unfitted
 * assumption. A defender's get-off keys the ball moving, a simple reaction to
 * one cue (Bucs: "get-off on ball movement"), shorter than a choice. 2022
 * tracking has box defenders and offensive linemen first moving at the same
 * median time; 0.5 makes ours equal (scripts/diag/runblock/startup.py). */
const DEF_GETOFF = Number(process.env.DEF_GETOFF ?? 1);

export type TeamSide = 'O' | 'D';

export interface Behavior {
  readonly kind: string;
  /** Installed receiving option, including an outlet which first checks protection.
   * This is a job contract, not current openness or readiness to catch. */
  readonly passOption?: boolean;
  update(a: Agent, sim: PlaySim): MoveCommand;
  /** Motion his teammates know from the call itself (a rehearsed track on the
   * snap count), not his private live decision; null when there is none. */
  calledMotion?(): Vec2 | null;
  /** Current held contact technique's movement intention, separate from the
   * free track advertised to teammates. No achieved motion is implied. */
  contactMotion?(a: Agent, work?: 'reach' | 'runoff' | 'prepare'): Vec2 | null;
  /** ENGAGED_TECHNIQUE: the engaged run blocker's goal for this rep (engaged-technique.ts). */
  engagedGoal?(a: Agent, sim: import('./playsim.js').PlaySim, e: Engagement): import('./engaged-technique.js').EngagedGoal | null;
  reachGoal?(a: Agent, sim: import('./playsim.js').PlaySim, e: Engagement): import('./engaged-technique.js').EngagedGoal | null;
}

export type RushMove = 'bull' | 'longarm' | 'speed' | 'dip' | 'rip' | 'swim' | 'club' | 'spin' | 'snatch' | 'shed';

/** Protection supplies goals; contact physics supplies achievable motion. */
export interface PassSetIntent {
  depth: number;
  laneY: number;
  /** Outside direction for an edge set, zero for an interior/backup block. */
  outside: number;
}

/** Installed run-contact shoulder, separate from the displacement request. */
export interface RunContactSurface {
  /** Unit axis from defender toward the desired blocker shoulder. */
  axis: Vec2;
  /** Desired signed angle in this frame, in quarter turns. */
  sealTarget: number;
}

/**
 * A block in progress (see engagement.ts for the model). Angles/positions are
 * relative to the engagement axis: toward the protected QB on pass pro or
 * the intended contact surface on runs (normally against the drive).
 */
export interface Engagement {
  /** TACKLE_RESET: the blocker's base re-set (cue onset, step end, done) and his last depth request. */
  baseReset?: { cueAt?: number; until?: number; done?: boolean };
  /** RUSH_HANDS: the rusher's own hand on the blocker's chest during a long-arm (a = rusher, b = blocker), held until
   * his next move decision or until it is swiped off; and when the blocker last swiped at it. */
  rusherHand?: import('../physics/world.js').HandJoint;
  longArmUntil?: number;
  /** RUSH_HANDS: whether the rusher last felt the blocker's hand loaded on him (the keys' felt change). */
  feltLoaded?: boolean;
  /** PASS_RIDE: the blocker is riding this man (kept until the man is clearly back in front). */
  riding?: boolean;
  /** RUSH_HANDS: his last club (its end, the blocker's hands on before it, his hand speed) and when his hands are
   * back from it: no move, keyed or not, before then. */
  club?: { end: number; handsBefore: number; speed: number };
  handsBackAt?: number;
  counterAt?: number;
  lastReqX?: number;
  /** Emitted once when the physical hands/torso actually carry load. */
  contactReported?: boolean;
  blocker: Agent;
  defender: Agent;
  helpers: Agent[];
  start: number;
  type: 'pass' | 'run';
  /** Summary of how badly the blocker is losing (0 = square, ≥1 = beaten). */
  win: number;
  /** Hand control: +1 blocker has inside hands latched, −1 defender controls the blocker. */
  control: number;
  /** Defender's angular progress around the blocker in units of 90° (signed, ±1 = hip to hip). */
  phi: number;
  /** World sign (+1/−1 along the lateral axis) of the defender's preferred working side. */
  side: number;
  /** Balance each player's body can give this rep, 0 (off his feet) – 1 (set). Read from the body. */
  baseB: number;
  baseD: number;
  /** Current defender technique and its window. */
  move: RushMove;
  moveUntil: number;
  /** Whether the current move landed. */
  moveOk: boolean;
  nextMoveAt: number;
  /** Bonus push while a power move is landing. */
  pushBoost: number;
  /** Direction the blocker is driving (unit vector), for run blocks. */
  drive: Vec2 | null;
  /** Optional stable contact surface, separate from displacement intention.
   * Stretch-zone and cutoff fits can wall a shoulder while driving elsewhere. */
  surfaceAxis?: Vec2;
  /** Desired signed lateral surface angle on runs, in quarter turns. */
  sealTarget: number;
  /** Per-rep variance (positive favors the blocker). */
  repEdge: number;
  holding: boolean;
  /** The hand fight's joint in the physics world (blocker ↔ defender). */
  hands?: HandJoint;
  /** Each helper's hands on the defender. */
  helperHands?: Map<Agent, HandJoint>;
}

export class Agent {
  /** Motor response to the snap cue, separate from recognizing run/pass. */
  snapReadyAt: number;
  passSet?: PassSetIntent;
  /** Known defensive responsibility; decisions still require observed run cues. */
  runFit?: RunFitJob;
  engagement: Engagement | null = null;
  /**
   * Scenario override: out of the play until this time (test fixtures park
   * bystanders with it). Physical knockdowns live on the body's support.
   */
  downUntil = -1;
  /** Earliest time this agent may attempt another tackle. */
  nextTackleAt = 0;
  /** Cannot touch the ball again until (after a drop / deflection). */
  noCatchUntil = 0;
  /** Blocker cannot re-engage this defender until a time (after being shed). */
  shedBy = new Map<Agent, number>();
  /** Earliest time this defender reacts to a ball carrier past the line. */
  readAt = 0;
  /** Defenders: run/pass belief through the play. */
  recog: Recognition | null = null;
  /**
   * Blockers' visible pad level: up in a pass set ("high hat"), low firing
   * out on a run block. Defenders read it.
   */
  stance: 'high' | 'low' | null = null;
  /** STANCE_TELL: pre-snap weight lean a lineman shows in his stance, as a
   * lateral sign (-1, 0, +1). Visible before the snap like his alignment. */
  stanceLean = 0;
  /** KEY_REACT: the key's lateral step this lineman saw before contact, and whose. */
  keyStep: { from: Agent; side: number } | null = null;
  /** DEF_STANCE: a front defender's pre-snap stance, hand(s) down or standing up. */
  setStance: 'down' | 'up' | null = null;
  /** QB_BODY_SEEN: the passer's visible throwing motion: set, loading (shoulders turned, ball back) or delivering
   * (the arm coming through). His own throw phase, shown by his body; opponents read it only through perception. */
  arm: 'set' | 'load' | 'deliver' = 'set';
  /** QB_BODY_SEEN: the passer's visible head direction (rad, field frame): where his eyes are, shown by his head, not
   * his hips. Null: not modelled for this player (others show their body facing). */
  head: number | null = null;
  /** The carry posture a ball holder shows: the ball up in both hands, ready to throw, or tucked to run. Null: not
   * shown (not holding, or not modelled). Set by its owner's controller (the QB lane's out-of-pocket work); opponents
   * read it only through perception. */
  carryPosture: 'up' | 'tucked' | null = null;
  /** Seen contact: the opponents his body is in physical contact with this tick (a block, a hand fight, a grip or a
   * tackle hold), strongest first, at most two (a double); and whether an opponent is holding him. Written from
   * physics in `PlaySim.tick`; others read it only through perception (`src/sim/seen-contact.ts`). The two men in
   * contact feel it directly (touch); this is what everyone else sees. */
  contactWith: number[] = [];
  held = false;
  /** True once the agent has made a tackle attempt that missed this play. */
  missedTackles = 0;
  /** Free-form per-play annotations used by stats / replay. */
  tags = new Set<string>();
  /** Where his eyes are: opponents he keys are seen with his ordinary delay;
   * the rest only peripherally, `peripheral` seconds staler. Null: no keys. */
  eyes: { keys: Agent[]; peripheral: number } | null = null;

  constructor(
    readonly idx: number,
    readonly team: TeamSide,
    readonly slot: string,
    readonly player: Player,
    readonly profile: PhysicalProfile,
    public body: Body,
    public behavior: Behavior,
    readonly mind = new SnapMind(player, new Rng(`mind:${player.id}`), body.energy),
  ) {
    // Visual get-off is a shortened simple response, compared with identifying
    // a route break. This mapping is an assumption, not fitted latency.
    this.snapReadyAt = team === 'O' ? mind.snapDelay
      : mind.snapDelay + DEF_GETOFF * profile.reactionTime * (1 - 0.4 * this.r('anticipation'));
  }

  get pos(): Vec2 {
    return this.body.pos;
  }
  get vel(): Vec2 {
    return this.body.vel;
  }
  get facing(): number {
    return this.body.facing;
  }
  /** Visible off-feet/recovery cue for the snapshot, not a recovery forecast.
   * Scenario parking does not imply a physical pose. Falls and ground time
   * share the off-feet cue; another player learns it through perception.
   */
  get pose(): VisiblePose | null {
    const state = this.body.support?.state;
    return state === undefined ? null : state === 'up' ? 'up' : state === 'rising' ? 'rising' : 'down';
  }
  get name(): string {
    return `${this.player.firstName[0]}.${this.player.lastName}`;
  }
  /** Rating normalized to 0–1. */
  r(key: RatingKey): number {
    return r01(this.player.ratings[key]);
  }
  /** Off his feet: falling, on the ground or getting up (or parked by a scenario). */
  isDown(t: number): boolean {
    return t < this.downUntil || (this.body.support !== undefined && this.body.support.state !== 'up');
  }
  /** Rough seconds until he is back on his feet, as another player would judge it. */
  timeUntilUp(t: number): number {
    const sup = this.body.support;
    const parked = Math.max(0, this.downUntil - t);
    if (!sup || sup.state === 'up') return parked;
    const sp = supportParams(this.profile);
    const fall = sup.state === 'falling' ? Math.max(0, fallTime(sp, sup.posture) - (t - sup.since)) : 0;
    const rise = sup.state === 'rising' ? Math.max(0, sp.getUp - (t - sup.since)) : sp.getUp;
    return Math.max(parked, fall + (sup.state === 'down' ? 0.3 : 0) + rise);
  }
  get speed(): number {
    return Math.hypot(this.body.vel.x, this.body.vel.y);
  }
  /** Top-speed multiplier from fatigue and recent sprinting, for reach estimates. */
  get speedScale(): number {
    return fatigueFactor(this.body.energy) * enduranceFactor(this.body) * (1 - 0.08 * (this.body.squeeze ?? 0));
  }
}
