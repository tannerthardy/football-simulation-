import type { Vec2, Vec3 } from '../core/vec.js';
import type { BallFlight } from '../physics/ball.js';
import type { Agent, TeamSide } from './agent.js';
import type { QBReadReport } from './qbmind.js';

export type BallState =
  | { kind: 'held'; carrier: Agent }
  | {
      kind: 'air';
      flight: BallFlight;
      thrower: Agent;
      target: Agent | null;
      releaseT: number;
      releaseX: number;
      intended: Vec3;
      /** Predicted time of arrival at the intended point. */
      arrivalT: number;
      deflected: boolean;
      throwaway: boolean;
    }
  | { kind: 'loose'; flight: BallFlight; since: number; lastTeam: TeamSide; fumbledBy: Agent }
  | { kind: 'dead' };

export type PlayEventType =
  | 'read'
  | 'block_climb'
  | 'block_contact'
  | 'block_exchange'
  | 'block_collect'
  | 'block_log'
  | 'squeeze'
  | 'snap'
  | 'handoff'
  | 'throw'
  | 'throwaway'
  | 'catch'
  | 'drop'
  | 'pbu'
  | 'deflection'
  | 'interception'
  | 'incomplete'
  | 'shed'
  | 'pressure'
  | 'hit'
  | 'sack'
  | 'tackle'
  | 'missed_tackle'
  | 'broken_tackle'
  | 'fumble'
  | 'recovery'
  | 'touchdown'
  | 'safety'
  | 'out_of_bounds'
  | 'scramble'
  | 'jam'
  | 'holding'
  | 'dpi'
  | 'touchback'
  | 'slide';

export interface PlayEvent {
  t: number;
  type: PlayEventType;
  /** Primary agent index. */
  a?: number;
  /** Secondary agent index. */
  b?: number;
  pos?: Vec2;
  note?: string;
}

export type PlayOutcome = 'tackle' | 'oob' | 'touchdown' | 'incomplete' | 'safety' | 'touchback' | 'timeout' | 'slide';

export interface FrameAgent {
  x: number;
  y: number;
  f: number;
}

export interface Frame {
  t: number;
  agents: number[]; // flattened [x, y, facing] * 22
  ball: [number, number, number];
  carrier: number;
  /** Optional for old replays: current carrier's shoulder turn and its axis. */
  carrierPosture?: [number, number];
}

export interface PlayResult {
  outcome: PlayOutcome;
  /** Team in possession at the end of the play. */
  possession: TeamSide;
  turnover: boolean;
  /** Spot where the ball is dead (play frame x, y). */
  endX: number;
  endY: number;
  /** Net yards for the offense from the LOS (meaningless if turnover). */
  yards: number;
  /**
   * Yards credited to the offense's rush or reception: to the dead-ball spot,
   * or to the fumble spot when the offense lost the ball (0 on interceptions).
   */
  offenseYards: number;
  /** Who held the ball, from where to where, in order. */
  segments: CarrierSegment[];
  score: { team: TeamSide; kind: 'TD' | 'safety' } | null;
  duration: number;
  /** Clock stops after the play (incomplete, out of bounds, score, turnover). */
  clockStops: boolean;
  kind: 'run' | 'pass';
  /** Stat attribution (player ids). */
  stats: PlayStats;
  events: PlayEvent[];
  frames?: Frame[];
  penalty?: PenaltyCall;
}

export interface PenaltyCall {
  kind: 'holding' | 'dpi' | 'false_start' | 'offside';
  against: TeamSide;
  playerId: string;
  yards: number;
  /** Automatic first down for the offense. */
  autoFirst: boolean;
  /** Where the foul happened (play frame x): holding enforcement, DPI spot. */
  spotX?: number;
}

/** One continuous possession of the ball by one player within a play. */
export interface CarrierSegment {
  team: TeamSide;
  /** Player id. */
  carrier: string;
  /** How this player came to have the ball. */
  how: 'snap' | 'handoff' | 'catch' | 'interception' | 'recovery';
  startX: number;
  /** Where the possession ended: dead-ball spot, fumble spot, or release of a pass or handoff. */
  endX: number;
  end: 'live' | 'dead' | 'fumble' | 'pass' | 'handoff';
}

export interface PlayStats {
  passer?: string;
  target?: string;
  receiver?: string;
  rusher?: string;
  interceptedBy?: string;
  sackedBy?: string[];
  tacklers: string[];
  fumbledBy?: string;
  fumbleRecoveredBy?: string;
  fumbleLost?: boolean;
  completed: boolean;
  attempted: boolean;
  sacked: boolean;
  scramble: boolean;
  throwaway: boolean;
  airYards?: number;
  yac?: number;
  timeToThrow?: number;
  pressured: boolean;
  hurriedBy?: string;
  separation?: number;
  brokenTackles: number;
  missedTackles: number;
  yardsBeforeContact?: number;
  passDefendedBy?: string;
  dropped: boolean;
  /** Interception/fumble return yards for the defense. */
  returnYards?: number;
  /** What the QB believed the coverage was, and any check at the line. */
  qbRead?: QBReadReport;
}
