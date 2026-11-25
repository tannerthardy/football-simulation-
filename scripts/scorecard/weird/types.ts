/**
 * Film weirdness detectors: shared types.
 *
 * A detector is a cheap rule over one tick of a play. It never touches the
 * simulation: the observer (observe.ts) copies the few numbers a rule needs
 * into a WFrame, so a rule is a pure function and a unit test can stage a scene
 * with an object literal. See docs/VALIDATION.md for how to add one.
 */

export type DetectorId = 'presnap' | 'turned' | 'stuck' | 'backpedal' | 'slide'
  | 'frozen' | 'downalone' | 'blindball' | 'phantomlane' | 'pulldeep';

/** One body on one tick. Angles are radians, 0 = +x (the offense attacks +x); speeds are yd/s. */
export interface WAgent {
  idx: number;
  team: 'O' | 'D';
  slot: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Achieved body facing. */
  facing: number;
  /** Requested velocity this tick (what the controller asked for). */
  rvx: number;
  rvy: number;
  /** Requested facing; null when none was requested (the body then turns toward travel). */
  rfacing: number | null;
  engaged: boolean;
  down: boolean;
  /** In a tackle bond as carrier or tackler. */
  inBond: boolean;
  /** Defender this blocker is engaged with or planning against; -1 for none. */
  blocks: number;
  /** Behavior kind or run-block job, for the event text. */
  job: string;
  /** Installed man assignment, copied without asking the defender to observe. */
  manTarget?: number | null;
  /** Installed pull role of an offensive blocker's run-block plan (kick-out, lead or trap), else null. */
  pullRole?: 'kick' | 'lead' | 'trap' | null;
  /** True on the one tick this body is first engaged in the play (the observer remembers earlier ticks). */
  firstEngaged?: boolean;
  /** Observer bookkeeping for `firstEngaged`; no rule reads it. */
  everEngaged?: boolean;
}

/** Recorded ball state. Positions/velocity exist only for an actual flight. */
export interface WBall {
  kind: 'held' | 'pitch' | 'air' | 'loose' | 'dead';
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  target?: number;
  releaseT?: number;
  throwaway?: boolean;
  deflected?: boolean;
}

/** A pre-snap body contact from the physics world's contact log. */
export interface WContact {
  i: number;
  j: number;
  impulse: number;
  closing: number;
}

export interface WFrame {
  /** Seconds from the snap; negative before it. */
  t: number;
  phase: 'pre' | 'live';
  isPass: boolean;
  /** The offense still has possession; false after a turnover, when "downfield" flips. */
  offense: boolean;
  /** Offensive ball carrier the turned-away and stuck-blocker rules apply to, else -1. */
  runner: number;
  /** Whoever holds the ball, the QB before the handoff included; -1 when no one does. */
  holder?: number;
  agents: WAgent[];
  /** Pre-snap frames carry the contacts of that physics step. */
  contacts?: WContact[];
  /** The pre-snap motion being played, if any. */
  motion?: { kind: string; slot: string } | null;
  qb?: number;
  scrambled?: boolean;
  ended?: boolean;
  ball?: WBall;
  /** Static installed aim, NOT a newly evaluated live-gap or achievable path. */
  runAim?: { x: number; y: number };
  /** Copied prior ticks (0.55 s); snapshots have no nested history. */
  recent?: readonly WFrame[];
  /** Copied ticks of this flight, including the current airborne tick. */
  flight?: readonly WFrame[];
}

/** One tick's worth of a rule firing. The tracker merges consecutive ticks into an event. */
export interface Hit {
  /** Identity for merging, e.g. the player or the pair. */
  key: string;
  players: number[];
  /** How bad this tick is; the worst tick of an event is kept and described. */
  sev: number;
  /** Start of the behavior when it began before this tick (windows), seconds from the snap. */
  at?: number;
  data: Record<string, number | string>;
  intent?: Record<string, number | string>;
  achieved?: Record<string, number | string>;
}

export interface History {
  /** Samples pushed so far (10 Hz while live). */
  readonly n: number;
  /** Time of the sample `back` steps before the newest (0 = newest), or NaN. */
  tAt(back: number): number;
  px(idx: number, back: number): number;
  py(idx: number, back: number): number;
  rx(idx: number, back: number): number;
  ry(idx: number, back: number): number;
  /** True when the body was free (not engaged, down or in a bond) at that sample. */
  free(idx: number, back: number): boolean;
  /** True when this frame added a sample. */
  readonly sampled: boolean;
}

export interface Detector {
  id: DetectorId;
  label: string;
  /** Shown as "candidate": the rule or its threshold is not sourced from tracking. */
  candidate?: boolean;
  /**
   * Judge an episode by its lowest-`sev` tick instead of its highest (a turn is as
   * good as its worst window), and let `accept` decide whether the episode is an
   * event. Every episode that lasts `minHold` is counted in `<id>.episodes`.
   */
  episodeMin?: boolean;
  accept?(rep: Hit): boolean;
  /** Seconds a hit must persist before it becomes an event (0 = every hit is one). */
  minHold: number;
  hit(f: WFrame, h: History): Hit[];
  /** One line, without the play id or time: "LB_M facing 150° from the runner at 3.1 yd for 0.4 s". */
  describe(peak: Hit, dur: number, slots: string[]): string;
  /** Rank for "watch these first" (higher = look first). Default: duration. */
  score?(peak: Hit, dur: number): number;
}

export interface WeirdEvent {
  detector: DetectorId;
  candidate?: true;
  /** Film-room style `G2-P014`, or `sc7/G2-P014` in a scorecard run. */
  id: string;
  /** The play's game-wide index (1-based), as in the film room. */
  play: number;
  /** Seconds from the snap. */
  t0: number;
  t1: number;
  /** Observer tick that produced the preserved representative hit. Windowed
   * rules may summarize earlier samples; this is not an inferred decision
   * time. Missing on legacy records, whose representative tick is unknown. */
  representativeT?: number;
  players: string[];
  text: string;
  severity: number;
  intent?: Record<string, number | string>;
  achieved?: Record<string, number | string>;
  nullified?: true;
}

/** What the observer keeps per play before the play's index is known. */
export interface PlayWeird {
  events: Array<Omit<WeirdEvent, 'id' | 'play'>>;
  counts: Record<string, number>;
}
