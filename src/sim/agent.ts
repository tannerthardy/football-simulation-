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

export type TeamSide = 'O' | 'D';

export interface Behavior {
  readonly kind: string;
  update(a: Agent, sim: PlaySim): MoveCommand;
}

export type RushMove = 'bull' | 'longarm' | 'speed' | 'dip' | 'rip' | 'swim' | 'club' | 'spin' | 'snatch' | 'shed';

/** Protection supplies goals; contact physics supplies achievable motion. */
export interface PassSetIntent {
  depth: number;
  laneY: number;
  /** Outside direction for an edge set, zero for an interior/backup block. */
  outside: number;
}

/**
 * A block in progress (see engagement.ts for the model). Angles/positions are
 * relative to the engagement axis: from the defender toward the thing the
 * blocker protects (QB on pass pro) or against the drive direction (runs).
 */
export interface Engagement {
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
  /** Blocker's target lateral position on run blocks: 0 drive, <0 seal/reach. */
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
  /** True once the agent has made a tackle attempt that missed this play. */
  missedTackles = 0;
  /** Free-form per-play annotations used by stats / replay. */
  tags = new Set<string>();

  constructor(
    readonly idx: number,
    readonly team: TeamSide,
    readonly slot: string,
    readonly player: Player,
    readonly profile: PhysicalProfile,
    public body: Body,
    public behavior: Behavior,
    readonly mind = new SnapMind(player, new Rng(`mind:${player.id}`), body.energy),
  ) {}

  get pos(): Vec2 {
    return this.body.pos;
  }
  get vel(): Vec2 {
    return this.body.vel;
  }
  get facing(): number {
    return this.body.facing;
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
