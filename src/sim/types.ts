import type { Vec2, Vec3 } from '../core/vec.js';
import type { BallFlight } from '../physics/ball.js';
import type { Agent, TeamSide } from './agent.js';
import type { QBReadReport } from './qbmind.js';

/** Recording changes observability only. Light retains the original replay. */
export type ReplayLevel = 'light' | 'standard' | 'full';
export interface ReplayDecision {
  t: number;
  a: number;
  kind: string;
  chose: string;
  /** Null when the controller does not expose causal attribution. */
  cue: string | null;
  options?: string[];
  detail?: string;
}
export interface ReplayAgentState {
  kind: string;
  job?: string;
  target?: number | null;
  zone?: string;
  landmark?: [number, number];
  man?: { leverage: string; initialCushion: number; press: boolean; hipsOpen: boolean; trail: boolean; overTop: boolean; routeRead: boolean };
  intent?: { velocity: [number, number]; facing?: number; posture?: number };
  runFit?: { gap: string; side: number; kind: string; technique: string; edge: string; pace: string; partner?: string };
  passSet?: { depth: number; laneY: number; outside: number };
  runBlock?: { kind: string; target: number | null; climbTo?: number | null; drive: [number, number]; pullRole?: string; pullPath?: [number, number][] };
  body?: { velocity: [number, number]; energy: number; posture: number; balance: number; state: string; squeeze: number; lean: [number, number]; padHeight: number; supportDeviation: [number, number] };
  belief?: { read: string; passProbability: number };
}
export interface ReplayLink { kind: 'man' | 'bracket' | 'target' | 'block' | 'tackle'; a: number; b: number }
export interface ReplayTelemetryFrame {
  t: number;
  agents: ReplayAgentState[];
  links: ReplayLink[];
  blocks?: Array<{ a: number; b: number; helpers: number[]; type: string; control: number; phi: number; baseA: number; baseB: number; move: string; landed: boolean; win: number;
    hands?: { extension: number; push: number; hold: number; steer: number; height?: number; normalForce?: number; tangentForce?: number } }>;
  tackle?: { carrier: number; tacklers: Array<{ a: number; grip: number | null; legs: number; force?: number; slipping?: boolean; origin?: string }>; stall: number; progressX: number };
  /** Actual calls to PlaySim.see and QB perception, not omniscient extra reads. */
  perception?: Array<{ a: number; b: number; t: number; position: [number, number]; velocity: [number, number]; age: number | null; source: 'see' | 'qb'; pose?: 'up' | 'down' | 'rising' | null; carrying?: boolean | null }>;
  qb?: { eyes: number | null; belief: Record<string, number>; best: string; phase?: string; read?: number | null; pressure?: number;
    pending?: { target: number; point: [number, number, number]; flightTime: number; completion: number; interceptionRisk: number; value: number } | null };
  contacts?: Array<{ a: number; b: number; closing: number; impulse: number }>;
  ball?: { kind: string; height: number; target?: number; intended?: [number, number, number]; arrivalT?: number };
}
export interface ReplayTelemetry {
  version: 1;
  level: 'standard' | 'full';
  /** Simulation ticks between replay frames, not seconds. */
  sampleEvery: number;
  /** Explicit seconds per sample, optional for early version-1 recordings. */
  sampleSeconds?: number;
  unavailable: string[];
  frames: ReplayTelemetryFrame[];
  decisions: ReplayDecision[];
}

export type BallState =
  | { kind: 'held'; carrier: Agent }
  | { kind: 'pitch'; flight: BallFlight; thrower: Agent; target: Agent; releaseT: number; intended: Vec3;
      releaseX?: number; impetusTeam?: TeamSide; boundaryExit?: Vec2 }
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
      /** CATCH_SECURE: in a receiver's hands but not yet a catch (securing window). */
      securing?: { receiver: Agent; start: number; until: number; tried: Set<Agent>; triedBody?: Set<Agent> };
    }
  | { kind: 'loose'; flight: BallFlight; since: number; lastTeam: TeamSide; fumbledBy: Agent;
      /** Actual release spot and act; a missed backward pitch is not a fumble for advancement restrictions. */
      fumbleX?: number; origin?: 'fumble' | 'backward_pass'; possessionChangedBeforeFumble?: boolean;
      impetusTeam?: TeamSide; momentumExceptionExcluded?: boolean; momentumSpotX?: number;
      boundaryExit?: Vec2 }
  | { kind: 'dead' };

export type PlayEventType =
  | 'read'
  | 'block_climb'
  | 'block_contact'
  | 'block_exchange'
  | 'block_collect'
  | 'block_threat'
  | 'block_abandon'
  | 'block_log'
  | 'pull_turn_up'
  | 'squeeze'
  | 'carrier_contact'
  | 'tackle_wrap'
  | 'throw_held'
  | 'snap'
  | 'handoff'
  | 'handoff_fake'
  | 'pump'
  | 'momentum'
  | 'pitch'
  | 'pitch_catch'
  | 'throw'
  | 'throwaway'
  | 'catch'
  | 'drop'
  /** A targeted ball the receiver reached for and did not catch, but not a catchable drop (stretched, high, low or deflected). */
  | 'miss'
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
  | 'holding_attempt'
  | 'penalty'
  | PenaltyCall['kind']
  | 'opi'
  | 'illegal_forward_pass'
  | 'dpi'
  | 'touchback'
  | 'slide'
  | 'fall'
  /** CATCH_SECURE: the ball reached the receiver's hands; the securing window opens (the catch, if any, follows). */
  | 'secure';

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
  /** Rules authority for new native officiating; absent in historical tapes. */
  rulesEdition?: 'NFL-2026';
  outcome: PlayOutcome;
  /** Team in possession at the end of the play. */
  possession: TeamSide;
  turnover: boolean;
  /** Physical dead-ball spot (play frame x, y), retained inside end zones. */
  endX: number;
  endY: number;
  /** Credited net yards from LOS, bounded at the goal plane on TD/safety (meaningless if turnover). */
  yards: number;
  /**
   * Yards credited to the offense's rush, reception or sack: to the dead-ball spot
   * (goal plane on a TD/safety),
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
  telemetry?: ReplayTelemetry;
  penalty?: PenaltyCall;
  /** All called fouls, retained before enforcement. `penalty` remains a legacy first-call view. */
  penalties?: PenaltyCall[];
  /** Native legal evidence is distinct from whether a referee called the act. */
  foulRecords?: FoulRecord[];
  /** Reached rule branches whose decisive facts or enforcement remain unsupported. */
  ruleLimitations?: string[];
  /** Preserve pre-foul takeaway attribution when a returner makes an illegal pass. */
  statsBeforeIllegalPass?: PlayStats;
  segmentsBeforeIllegalPass?: CarrierSegment[];
  /** Exact achieved prefix at each possession change, before later returns
   * or giveaways. Rule14/statistics must not reconstruct this from the ending. */
  possessionSnapshots?: Array<{ changes: number; possession: TeamSide;
    stats: PlayStats; segments: CarrierSegment[] }>;
}

export interface PenaltyCall {
  kind: 'holding' | 'defensive_holding' | 'illegal_contact' | 'dpi' | 'opi'
    | 'illegal_forward_pass' | 'intentional_grounding' | 'ineligible_downfield' | 'illegal_touching' | 'illegal_handoff'
    | 'block_in_back' | 'blindside_block' | 'clipping' | 'peel_back' | 'low_block' | 'chop_block' | 'crackback'
    | 'roughing_passer' | 'unnecessary_roughness' | 'illegal_helmet' | 'facemask' | 'horse_collar' | 'hip_drop'
    | 'tripping' | 'illegal_hands' | 'false_start' | 'offside' | 'encroachment' | 'neutral_zone_infraction'
    | 'illegal_formation' | 'illegal_motion' | 'illegal_shift' | 'illegal_substitution' | 'too_many_players'
    | 'delay_of_game' | 'disconcerting_signals' | 'unsportsmanlike_conduct' | 'taunting' | 'disqualification'
    | 'roughing_kicker' | 'running_into_kicker' | 'personal_foul' | 'illegal_bat' | 'illegal_kick'
    | 'assisting_runner' | 'interlocking_interference' | 'illegal_teammate_assistance' | 'illegal_snap' | 'roughing_holder' | 'illegal_backward_pass'
    | 'illegal_free_kick' | 'free_kick_out_of_bounds' | 'free_kick_short' | 'kick_catch_interference'
    | 'fair_catch_interference' | 'invalid_fair_catch_signal' | 'illegal_block_after_signal' | 'illegal_block';
  against: TeamSide;
  playerId: string;
  yards: number;
  /** Automatic first down for the offense. */
  autoFirst: boolean;
  /** Where the foul happened (play frame x): holding enforcement, DPI spot. */
  spotX?: number;
  id?: string;
  t?: number;
  rule?: string;
  reason?: string;
  lossDown?: boolean;
  enforcement?: 'previous' | 'spot' | 'basic' | 'succeeding';
  /** Actual possession changes before the foul, not inferred from the final winner. */
  possessionChanges?: number;
  phase?: 'live' | 'dead_ball' | 'between_downs' | 'pre_snap';
  playPhase?: 'pass' | 'run' | 'loose_ball' | 'kick';
  /** Possession and basic-spot facts established when the act occurred. */
  possessionTeam?: TeamSide;
  basicSpotX?: number;
  possessionSpotX?: number;
  impetusTeam?: TeamSide;
  attemptedAdvance?: boolean;
  momentumSpotX?: number;
  personalFoul?: boolean;
  disqualify?: boolean;
  pairedWith?: string;
  foulAgainstOfficial?: boolean;
  /** Qualified penalty safety fact; grounding uses its whole-body/ball test. */
  penaltySafety?: boolean;
  causedBallOutOfBounds?: boolean;
}

export interface FoulEvidence {
  source: 'native' | 'legacy';
  rule: string;
  action: string;
  victimId?: string;
  facts: Record<string, string | number | boolean | null>;
}

export interface FoulRecord {
  id: string;
  t: number;
  kind: PenaltyCall['kind'];
  playerId: string;
  called: boolean;
  /** A legacy selected technique/call is not a newly certified NFL predicate. */
  assessment: 'violation' | 'legacy_call' | 'unresolved';
  evidence: FoulEvidence;
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
  /** Native event ledger; absence retains the historical singular reduction. */
  fumbles?: Array<{ playerId: string; team: TeamSide; lost: boolean; recoveredBy?: string; t?: number }>;
  passer?: string;
  target?: string;
  receiver?: string;
  rusher?: string;
  /** A called run ended with only its snap possession; not a fumble or proof of an intended keeper. */
  retainedSnap?: boolean;
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
  /** Intended LOS-to-aim-point depth; may differ from the actual catch depth or receiver. */
  airYards?: number;
  /** Achieved LOS-to-catch depth of the actual receiver, separate from intended airYards. */
  completedAirYards?: number;
  yac?: number;
  timeToThrow?: number;
  pressured: boolean;
  hurriedBy?: string;
  separation?: number;
  brokenTackles: number;
  /** Of brokenTackles: one-armed grabs made from inside a block that the runner pulled through (ONE_ARM_HOLD). */
  brokenEngagedGrabs?: number;
  missedTackles: number;
  /** Native per-player credit, including a frozen pre-illegal-pass snapshot. */
  missedTacklesBy?: Record<string, number>;
  yardsBeforeContact?: number;
  passDefendedBy?: string;
  dropped: boolean;
  /** Interception/fumble return yards for the defense. */
  returnYards?: number;
  /** What the QB believed the coverage was, and any check at the line. */
  qbRead?: QBReadReport;
}
