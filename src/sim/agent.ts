/**
 * A player on the field during a play: body (kinematics) + brain (behavior)
 * + per-play state.
 */
import type { Vec2 } from '../core/vec.js';
import { enduranceFactor, fatigueFactor, type Body, type MoveCommand } from '../physics/kinematics.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Player, RatingKey } from '../players/types.js';
import { r01 } from '../players/types.js';
import type { PlaySim } from './playsim.js';

export type TeamSide = 'O' | 'D';

export interface Behavior {
  readonly kind: string;
  update(a: Agent, sim: PlaySim): MoveCommand;
}

export type RushMove = 'bull' | 'longarm' | 'speed' | 'dip' | 'rip' | 'swim' | 'club' | 'spin' | 'snatch' | 'shed';

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
  /** Base / balance of each player, 0 (on the ground) – 1 (set). */
  baseB: number;
  baseD: number;
  /** Remaining speed-to-power impulse from the collision, yd/s. */
  impulse: number;
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
}

export class Agent {
  engagement: Engagement | null = null;
  /** On the ground until this time (missed tackle, cut, pancake). */
  downUntil = -1;
  /** Movement penalty window (lost a jam, stumbled). */
  slowUntil = -1;
  slowFactor = 1;
  /** Earliest time this agent may attempt another tackle. */
  nextTackleAt = 0;
  /** Cannot touch the ball again until (after a drop / deflection). */
  noCatchUntil = 0;
  /** Blocker cannot re-engage this defender until a time (after being shed). */
  shedBy = new Map<Agent, number>();
  /** Time this defender recognized run/pass. */
  readAt = 0;
  /** Was fooled by play action until this time. */
  fooledUntil = 0;
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
  ) {}

  get pos(): Vec2 {
    return this.body.pos;
  }
  get vel(): Vec2 {
    return this.body.vel;
  }
  get name(): string {
    return `${this.player.firstName[0]}.${this.player.lastName}`;
  }
  /** Rating normalized to 0–1. */
  r(key: RatingKey): number {
    return r01(this.player.ratings[key]);
  }
  isDown(t: number): boolean {
    return t < this.downUntil;
  }
  get speed(): number {
    return Math.hypot(this.body.vel.x, this.body.vel.y);
  }
  /** Top-speed multiplier from fatigue and recent sprinting, for reach estimates. */
  get speedScale(): number {
    return fatigueFactor(this.body.energy) * enduranceFactor(this.body);
  }
}
