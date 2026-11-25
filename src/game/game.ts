/**
 * Game simulation: drives, downs, clock, scoring, special teams, fatigue and
 * substitutions, penalties, coaching decisions, box score and play-by-play.
 *
 * Coordinates: `yardline` is yards from the possessing team's own goal line
 * (0–100). Each scrimmage play is simulated in the play frame (offense
 * attacking +x, LOS at x = 10 + yardline).
 */
import { Rng } from '../core/rng.js';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y, OWN_GOAL_X, describeYardline } from '../core/field.js';
import { clamp } from '../core/vec.js';
import { r01, type Player } from '../players/types.js';
import { alignStyle, decayWorkload, pickDefense, pickOffense, specialist, SUBSTITUTION_COST, type Availability, type Team } from '../league/team.js';
import { PlaySim, type PlaySetup } from '../sim/playsim.js';
import { CoverageScouting, SCOUT_SEEN } from '../sim/qbmind.js';
import { ScoutingReport } from '../sim/recognition.js';
import type { Frame, PenaltyCall, PlayResult } from '../sim/types.js';
import { BoxScore } from './stats.js';
import { DefensiveCoordinator, OffensiveCoordinator, chooseFourthDown, chooseTry, type Situation } from './playcaller.js';
import { fieldGoalRange, kickFieldGoal, kickFairCatch, kickoff, punt, generatedMissedFieldGoalEvent } from './specialteams.js';
import { assessScrimmageKick, type FreeKickFacts, type ScrimmageKickFacts, type KickRuling } from './kick-rules.js';
import { resolveLivePenalties, resolveTryPenalties, type LivePenaltyOption } from './penalty-enforcement.js';
import { resolveFoulClock } from './clock-rules.js';
import { deriveOfficialPossessionStats } from './possession-stats.js';
import { deriveOfficialPlayStats, type OfficialPlayCredit, type OfficialStatsTreatment } from './official-play-stats.js';
import type { OffSlot, OffensivePlayCall, DefensivePlayCall } from '../playbook/types.js';
import { routeOfAgent } from '../sim/behaviors/receiver.js';
import { BELIEVED_BODY, BeliefStore } from '../sim/believed-body.js';

export type Side = 'home' | 'away';
const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');

export interface PlayLog {
  index: number;
  quarter: number;
  clock: number;
  offense: string;
  down: number;
  distance: number;
  yardline: number;
  call: string;
  defense: string;
  text: string;
  yards: number;
  score: { home: number; away: number };
  kind: 'run' | 'pass' | 'punt' | 'fg' | 'xp' | 'kickoff' | 'kneel' | 'penalty' | 'two';
  /** Raw play stats for scrimmage plays (analysis/calibration). */
  stats?: PlayResult['stats'];
  /** Explicit official credit; raw stats/nullified continue to describe film.
   * Absent in historical logs, whose consumers use their legacy fallback. */
  officialCredit?: OfficialPlayCredit;
  /** Actual possession history; optional for older recordings. */
  segments?: PlayResult['segments'];
  /**
   * An accepted foul wiped the play out. `stats` then describe what physically
   * happened; official calibration excludes the raw result. Ordinarily none
   * of its stats enter the box score. `officialCredit` identifies retained
   * loss-of-down/spot prefixes and pre-change-of-possession statistics.
   */
  nullified?: boolean;
  /** Foul during the play and its resolution. */
  foul?: { kind: string; team: string; yards: number; accepted: boolean };
  fouls?: Array<{ kind: string; team: string; yards: number; accepted: boolean; offset: boolean; rule?: string }>;
  foulRecords?: PlayResult['foulRecords'];
  ruleLimitations?: string[];
  official?: { treatment: 'enforce' | 'offset'; possession: Side; spotX: number;
    down: number; distance: number; stats: OfficialStatsTreatment };
  /** The calls on a scrimmage snap, for tendency analysis (same fields as the NFL extractor). */
  plan?: PlayPlan;
  /** Recorded games only: each player's first installed route (family:id), in replay player order. */
  routes?: Array<string | null>;
  outcome?: PlayResult['outcome'];
  /** Live time from the snap to the whistle (scrimmage plays). */
  duration?: number;
  /** Points scored by the offense on this play (6 for a TD), negative for defensive scores. */
  firstDown?: boolean;
  fgGood?: boolean;
  fgDistance?: number;
  /** Read-only measurement of the already resolved kick. No consumer of game
   * logic reads this field. Supplied events may lack distance/return credit. */
  readonly kick?: Readonly<{
    kind: 'punt' | 'kickoff' | 'onside' | 'safety';
    retry: boolean;
    touchback: boolean;
    returned?: boolean;
    returnYards?: number;
    /** Field-position gain, excluding kicks with penalty enforcement. */
    netYards?: number;
  }>;
  /** Recorded frames (only when requested) + roster for the replay viewer. */
  replay?: {
    frames: Frame[];
    players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; pos: string; weightLb?: number }>;
    los: number;
    firstDownX: number;
    flip: boolean;
    events: PlayResult['events'];
    telemetry?: PlayResult['telemetry'];
    profiles?: Array<{ position: string; heightIn: number; weightLb: number; ratings: Record<string, number> }>;
  };
}

export interface PlayPlan {
  personnel: string;
  formation: string;
  qb: 'under' | 'gun' | 'pistol';
  /** Run scheme or pass concept id. */
  concept: string;
  playAction: boolean;
  /** The QB changed the play at the line. */
  audible: boolean;
  defPersonnel: string;
  /** Called front, distinct from an inferred tracking presentation. */
  front: string;
  stemFrom?: string;
  creepSlot?: string;
  /** Coverage played (after the secondary's formation check). */
  coverage: string;
  /** Coverage called in the huddle (before any check). */
  called?: string;
  /** PFF-style family of the coverage played. */
  family?: string;
  shell: string;
  pressure: boolean;
  /** Defenders rushing at the snap (linemen plus blitzers). */
  rushers?: number;
  /** Coverage shown before the snap, if disguised. */
  shown?: string;
  /** Structure the secondary checked against (e.g. `trips`, `bunch_strong`), if it made a check. */
  checkedOn?: string;
}

export interface GameResult {
  home: Team;
  away: Team;
  score: { home: number; away: number };
  box: BoxScore;
  log: PlayLog[];
  quarterScores: Array<{ home: number; away: number }>;
  disqualifiedPlayers?: string[];
}

/** Share of each play's fast-pool spend that also comes out of the slow
 * game reserve: a few percent over a full game for a starting lineman. */
export const RESERVE_SHARE = 0.01;

/** Share of the slow reserve's loss that halftime gives back. */
export const HALFTIME_RESERVE_REFILL = 0.5;

/** Fast-pool refill rate per second of rest; conditioning (stamina) speeds it. */
export function fastRefillRate(p: Player): number {
  return 0.006 + 0.010 * r01(p.ratings.stamina);
}

export interface GameOptions {
  seed?: number;
  /** Explicit contact-law experiment; omitted uses production center hands. */
  handContact?: 'center' | 'patch';
  /** Record replay frames for every scrimmage play. */
  record?: boolean;
  /** Opt-in replay inspection detail; has no effect when record is false. */
  recordLevel?: import('../sim/types.js').ReplayLevel;
  rules?: Partial<GameRules>;
  /** Evaluation harness: every offensive scrimmage call is a designed run (kicks,
   * fourth-down and try decisions unchanged). Leave unset for normal games. */
  runOnly?: boolean;
  /** Scenario-test seams; leave unset for normal games. */
  hooks?: GameHooks;
}

/**
 * League rules that vary by game type. Overtime follows the NFL rules adopted
 * for 2025: both teams are guaranteed a possession; then sudden death.
 */
export interface GameRules {
  edition?: 'NFL-2026';
  /** Postseason: 15-minute overtime periods until there is a winner. Otherwise one 10-minute period and ties stand. */
  postseason: boolean;
}

export interface GameHooks {
  /** Diagnostic notification at the constructor input, before any native initialization.
   * Read only: observers must copy retained data and must not alter the setup/state. */
  playSetup?: (setup: Readonly<PlaySetup>, context: PlaySetupContext) => void;
  /** Scripted result for a snap instead of simulating it (`undefined` simulates). */
  playResult?: (sim: PlaySim, kind: 'scrimmage' | 'two-point') => PlayResult | undefined;
  /** Force a pre-snap foul, or `null` for none, instead of rolling for one. */
  preSnapFoul?: () => 'false_start' | 'offside' | null | undefined;
  /** Force the try after a touchdown. */
  tryChoice?: (scorer: Side) => 'kick' | 'two' | undefined;
  freeKickEvent?: (kicking: Side, kickSpot: number) => FreeKickFacts | undefined;
  scrimmageKickEvent?: (kicking: Side) => ScrimmageKickFacts | undefined;
}

export interface PlaySetupContext {
  readonly index: number;
  readonly kind: 'scrimmage' | 'two-point';
  readonly offense: string;
  readonly state: Readonly<GameState>;
}

export interface GameState {
  quarter: number;
  clock: number;
  possession: Side;
  yardline: number;
  down: number;
  distance: number;
  ballY: number;
  score: { home: number; away: number };
  timeouts: { home: number; away: number };
  twoMinWarned: boolean;
  openingReceiver: Side;
  driveStartYard: number;
  inRedZone: boolean;
  /** Overtime: possessions begun so far, and the team that received the overtime kickoff. */
  otPossessions: number;
  otFirst: Side;
  over: boolean;
}

export function simulateGame(home: Team, away: Team, opts: GameOptions = {}): GameResult {
  return new Game(home, away, opts).play();
}

export class Game {
  private readonly rng: Rng;
  /** Independent named streams so one subsystem's draws never shift another's. */
  private readonly coin: Rng;
  private readonly snaps: Rng;
  private readonly kicks: Rng;
  private readonly tempo: Rng;
  private readonly calls: Rng;
  /** Accepted defensive/live double-foul extension, not extra game-clock time. */
  private untimedDown = false;
  private readonly rules: GameRules;
  private readonly teams: Record<Side, Team>;
  private readonly oc: Record<Side, OffensiveCoordinator>;
  private readonly dc: Record<Side, DefensiveCoordinator>;
  private readonly box = new BoxScore();
  private readonly log: PlayLog[] = [];
  /** Fast energy pool at the next snap, by player id. */
  private readonly energy = new Map<string, number>();
  /** BELIEVED_BODY: every player's beliefs about the opponents' capacities over this game (null with the flag off). */
  private readonly beliefs: BeliefStore | null;
  /** Slow game reserve by player id: the ceiling the fast pool refills to. */
  private readonly reserve = new Map<string, number>();
  /** Who was on the field for the last snap and how long it lasted: the
   * play itself is work for them, not rest. */
  private justPlayed: { ids: Set<string>; seconds: number } | null = null;
  /** The staff's count of each player's recent snaps (rotation). */
  private readonly workload = new Map<string, number>();
  /** Both units on the last scrimmage snap, while the series goes on. */
  private lastUnits: { offense: string; off: Set<string>; def: Set<string> } | null = null;

  /** What each staff knows when it sends a unit out: its players' recent
   * work and, inside a series, who was just on the field. A defense facing
   * a hurry-up offense rarely gets to match a substitution. */
  private availability(side: 'O' | 'D'): Availability {
    const last = this.lastUnits?.offense === this.off.abbr ? this.lastUnits : null;
    const hurried = side === 'D' && this.hurry();
    return { workload: this.workload, lastSnap: last ? (side === 'O' ? last.off : last.def) : undefined,
      substitutionCost: SUBSTITUTION_COST * (hurried ? 2 : 1) };
  }
  private readonly disqualified = new Set<string>();
  private readonly qualifyingConduct = new Map<string, number>();
  private readonly pendingCarryover: Array<{ target: 'try' | 'kickoff'; against: Side; yards: number;
    foul?: NonNullable<PlayLog['fouls']>[number] }> = [];
  private fairCatchEntitlement?: { side: Side; quarter: number; index: number; yardline: number };
  private pendingKickoff?: { kicking: Side; safety: boolean };
  /**
   * What each side has learned about its opponent this game: the defense's
   * read of the offense's run/pass tendencies, and the offense's read of the
   * defense's coverage mix and disguise.
   */
  private readonly scouting: Record<Side, ScoutingReport> = { home: new ScoutingReport(), away: new ScoutingReport() };
  private readonly coverageScouting: Record<Side, CoverageScouting> = { home: new CoverageScouting(), away: new CoverageScouting() };
  private readonly quarterScores: Array<{ home: number; away: number }> = [];
  private s: GameState;
  private playIndex = 0;

  constructor(
    home: Team,
    away: Team,
    private readonly opts: GameOptions,
  ) {
    this.rng = new Rng(opts.seed ?? 1);
    this.beliefs = BELIEVED_BODY ? new BeliefStore(`game|${opts.seed ?? 1}`) : null;
    this.rules = { edition: 'NFL-2026', postseason: false, ...opts.rules };
    this.coin = this.rng.fork('coin');
    this.snaps = this.rng.fork('snaps');
    this.kicks = this.rng.fork('kicks');
    this.tempo = this.rng.fork('tempo');
    this.calls = this.rng.fork('calls');
    this.teams = { home, away };
    this.oc = { home: new OffensiveCoordinator(home, this.rng.fork('oc-h'), opts.runOnly), away: new OffensiveCoordinator(away, this.rng.fork('oc-a'), opts.runOnly) };
    this.dc = { home: new DefensiveCoordinator(home, this.rng.fork('dc-h')), away: new DefensiveCoordinator(away, this.rng.fork('dc-a')) };
    const receiver: Side = this.coin.chance(0.5) ? 'home' : 'away';
    this.s = {
      quarter: 1, clock: 900, possession: receiver, yardline: 25, down: 1, distance: 10, ballY: CENTER_Y,
      score: { home: 0, away: 0 }, timeouts: { home: 3, away: 3 }, twoMinWarned: false, openingReceiver: receiver,
      driveStartYard: 25, inRedZone: false, otPossessions: 0, otFirst: receiver, over: false,
    };
    for (const t of [home, away]) for (const p of t.roster) { this.energy.set(p.id, 1); this.reserve.set(p.id, 1); }
  }

  private get off(): Team {
    return this.eligibleTeam(this.s.possession);
  }
  private get def(): Team {
    return this.eligibleTeam(other(this.s.possession));
  }

  private eligibleTeam(side: Side): Team {
    const team = this.teams[side];
    return this.disqualified.size ? { ...team, roster: team.roster.filter(p => !this.disqualified.has(p.id)) } : team;
  }

  /** Removal is not declined with the yardage. Only the specified repeated
   * conduct categories trigger the two-foul rule, not every personal foul. */
  private applyPlayerSanctions(calls: readonly PenaltyCall[]): void {
    for (const call of calls) {
      const qualifying = call.kind === 'taunting' || (call.kind === 'unsportsmanlike_conduct'
        && /^12-3-1\((a|b|c)\)/.test(call.rule ?? ''));
      if (qualifying) this.qualifyingConduct.set(call.playerId, (this.qualifyingConduct.get(call.playerId) ?? 0) + 1);
      if (call.disqualify || call.kind === 'disqualification'
        || (this.qualifyingConduct.get(call.playerId) ?? 0) >= 2) this.disqualified.add(call.playerId);
    }
  }

  play(): GameResult {
    this.kickoffToStart();
    while (!this.s.over) this.step();
    return this.result();
  }

  /** Opening kickoff. */
  kickoffToStart(): void {
    this.doKickoff(other(this.s.openingReceiver));
  }

  /** One snap (scrimmage play, kick or kneel) and any period transition after it. */
  step(): void {
    if (this.s.over) return;
    this.scrimmageOrSpecial();
    this.checkPeriodEnd();
  }

  result(): GameResult {
    return { home: this.teams.home, away: this.teams.away, score: this.s.score, box: this.box, log: this.log, quarterScores: this.quarterScores,
      ...(this.disqualified.size ? { disqualifiedPlayers: [...this.disqualified] } : {}) };
  }

  /** Current state (scenario tests and tools). */
  get state(): Readonly<GameState> {
    return this.s;
  }

  get fairCatchKickAvailable(): boolean {
    const e = this.fairCatchEntitlement;
    return !!e && e.side === this.s.possession && e.quarter === this.s.quarter && e.index === this.playIndex;
  }

  /** Captain election after a made/awarded fair catch; no rushed snap or tee. */
  fairCatchKick(): void {
    this.doFairCatchKick(); this.checkPeriodEnd();
  }

  /** Overwrite parts of the state to set up a scenario. */
  setState(patch: Partial<GameState>): void {
    Object.assign(this.s, patch);
  }

  // ---------------------------------------------------------------- flow

  private checkPeriodEnd(): void {
    const s = this.s;
    if (s.over || s.clock > 0 || this.untimedDown) return;
    this.quarterScores.push({ ...s.score });
    if (s.quarter === 2) {
      // Halftime: the team that kicked first receives.
      s.quarter = 3;
      s.clock = 900;
      s.timeouts = { home: 3, away: 3 };
      s.twoMinWarned = false;
      this.recoverAll(600, HALFTIME_RESERVE_REFILL);
      this.doKickoff(s.openingReceiver);
      return;
    }
    if (s.quarter < 4) {
      s.quarter++;
      s.clock = 900;
      // The break between quarters (about two minutes on a broadcast).
      this.recoverAll(120);
      s.twoMinWarned = false;
      if (this.pendingKickoff !== undefined) {
        const pending = this.pendingKickoff; this.pendingKickoff = undefined;
        this.doFreeKick(pending.kicking, pending.safety);
      }
      return;
    }
    if (s.quarter === 4 && s.score.home === s.score.away) {
      // Overtime: both teams are guaranteed a possession.
      s.quarter = 5;
      s.clock = this.rules.postseason ? 900 : 600;
      s.timeouts = this.rules.postseason ? { home: 3, away: 3 } : { home: 2, away: 2 };
      s.twoMinWarned = false;
      s.otPossessions = 0;
      const recv: Side = this.coin.chance(0.5) ? 'home' : 'away';
      s.otFirst = recv;
      this.recoverAll(180, HALFTIME_RESERVE_REFILL / 3);
      this.doKickoff(other(recv));
      return;
    }
    if (s.quarter >= 5 && this.rules.postseason) {
      // Postseason: play on into another period; possession carries over.
      s.quarter++;
      s.clock = 900;
      s.twoMinWarned = false;
      if ((s.quarter - 5) % 2 === 0) s.timeouts = { home: 3, away: 3 };
      return;
    }
    s.over = true;
  }

  private changePossession(yardline: number, ballY = CENTER_Y): void {
    const s = this.s;
    s.possession = other(s.possession);
    s.yardline = clamp(yardline, 1, 99);
    s.down = 1;
    s.distance = Math.min(10, 100 - s.yardline);
    s.ballY = ballY;
    s.driveStartYard = s.yardline;
    s.inRedZone = false;
    if (s.quarter >= 5) this.otCheckPossession();
  }

  /** Overtime: once both teams have had the ball, a change of possession with the score not tied ends it. */
  private otCheckPossession(): void {
    const s = this.s;
    s.otPossessions++;
    if (s.otPossessions > 2 && s.score.home !== s.score.away) s.over = true;
  }

  private addScore(side: Side, pts: number): void {
    this.s.score[side] += pts;
  }

  /**
   * Overtime: after `scorer` scores, is the game over? Called when a
   * touchdown is scored (`beforeTry`: a winning touchdown needs no try) and
   * again once the scoring sequence, including any try, is complete.
   */
  private otDecided(scorer: Side, beforeTry = false): boolean {
    const s = this.s;
    if (s.quarter < 5 || s.over) return s.over;
    const lead = s.score[scorer] - s.score[other(scorer)];
    const n = s.otPossessions;
    // n = 1: the first team has the ball; a score by the kicking team ends it.
    // n = 2: the second team's guaranteed possession must answer.
    // n > 2: sudden death.
    if (n >= 3) s.over = lead !== 0;
    else if (n === 2) s.over = beforeTry ? lead > 0 : lead !== 0;
    else s.over = scorer !== s.otFirst;
    return s.over;
  }

  // ---------------------------------------------------------------- clock

  /**
   * Run `seconds` off the game clock. A live play keeps all of its elapsed
   * time and the two-minute warning stops the clock after it; between-play
   * runoff stops at the warning. Returns true when the warning was taken.
   */
  private runClock(seconds: number, live = false): boolean {
    const s = this.s;
    const before = s.clock;
    s.clock = Math.max(0, s.clock - seconds);
    let warned = false;
    if (this.warningPeriod() && !s.twoMinWarned && before > 120 && s.clock <= 120) {
      if (!live) s.clock = 120;
      s.twoMinWarned = true;
      warned = true;
    }
    this.box.team(this.off.abbr).timeOfPossession += before - s.clock;
    return warned;
  }

  /** Periods that end with a two-minute warning. */
  private warningPeriod(): boolean {
    const q = this.s.quarter;
    if (q === 2 || q === 4) return true;
    if (q >= 5) return this.rules.postseason ? (q - 5) % 2 === 1 : true;
    return false;
  }

  private lateHalf(): boolean {
    const s = this.s;
    return (s.quarter === 2 && s.clock <= 120) || (s.quarter >= 4 && s.clock <= 300);
  }

  private hurry(): boolean {
    const s = this.s;
    const diff = s.score[s.possession] - s.score[other(s.possession)];
    if (s.quarter === 2 && s.clock <= 120) return true;
    if (s.quarter >= 4 && s.clock <= 240 && diff < 0) return true;
    if (s.quarter >= 4 && s.clock <= 600 && diff <= -12) return true;
    return false;
  }

  private milking(): boolean {
    const s = this.s;
    const diff = s.score[s.possession] - s.score[other(s.possession)];
    return s.quarter >= 4 && diff > 0 && s.clock <= 420;
  }

  /**
   * Game clock from the whistle to the next snap when the clock keeps running.
   * NFL 2022 (`scripts/data/bdb2025_clock.py`, less the live time measured in
   * tracking): about 34 s after a play that ends in the field, 30 s after a
   * runner goes out of bounds (the clock waits for the ready signal) and 38 s
   * after a sack (the offense regroups further back).
   */
  private betweenPlays(clockRunning: boolean, outOfBounds: boolean, sack: boolean): number {
    if (!clockRunning) return 0;
    const tempo = this.hurry() ? this.tempo.normal(16, 3) : this.milking() ? this.tempo.normal(39, 1.5) : this.tempo.normal(34, 3);
    // This is the coach's planned legal snap interval, not an executed delay
    // of game. A sampled tempo cannot silently schedule a snap after the
    // ordinary forty-second play clock. Actual clock-expiry incidents are
    // assessed separately by the pre-snap rules.
    return clamp(tempo + (outOfBounds ? -4 : sack ? 3 : 0), 0, 39.9);
  }

  /**
   * Whether the game clock was running when the current snap was due: set
   * after a scrimmage play, valid only until the next log entry or quarter.
   */
  private clockAfter: { index: number; quarter: number; running: boolean } | null = null;

  private clockRunningNow(): boolean {
    const c = this.clockAfter;
    return !!c && c.running && c.index === this.playIndex && c.quarter === this.s.quarter;
  }

  // ---------------------------------------------------------------- fatigue

  /**
   * Rest. The fast pool refills toward the slow reserve, exponentially with
   * time off (phosphocreatine-like: most of it within a minute or two). The
   * reserve itself comes back only at long breaks, and only partly
   * (`reserveRefill`, a share of what it has lost). The last snap's players
   * get no rest credit for the play they worked.
   */
  private recoverAll(seconds: number, reserveRefill = 0): void {
    const played = this.justPlayed;
    this.justPlayed = null;
    for (const t of [this.teams.home, this.teams.away]) {
      for (const p of t.roster) {
        const res = this.reserve.get(p.id) ?? 1;
        const reserve = res + (1 - res) * reserveRefill;
        this.reserve.set(p.id, reserve);
        const e = Math.min(this.energy.get(p.id) ?? 1, reserve);
        const rest = Math.max(0, seconds - (played?.ids.has(p.id) ? played.seconds : 0));
        this.energy.set(p.id, e + (reserve - e) * (1 - Math.exp(-rest * fastRefillRate(p))));
        const load = this.workload.get(p.id);
        if (load) this.workload.set(p.id, decayWorkload(load, rest));
      }
    }
  }

  /** Write back both pools of everyone who played the snap: the body's
   * fast pool, and the reserve less its share of what the play spent. */
  private writeBackEnergy(sim: PlaySim, seconds: number): void {
    for (const a of sim.agents) {
      const id = a.player.id, spent = Math.max(0, (this.energy.get(id) ?? 1) - a.body.energy);
      this.energy.set(id, a.body.energy);
      this.reserve.set(id, Math.max(0, (this.reserve.get(id) ?? 1) - RESERVE_SHARE * spent));
      this.workload.set(id, (this.workload.get(id) ?? 0) + 1);
    }
    this.justPlayed = { ids: new Set(sim.agents.map((a) => a.player.id)), seconds };
  }

  // ---------------------------------------------------------------- plays

  private situation(): Situation {
    const s = this.s;
    return {
      down: s.down,
      distance: s.distance,
      yardline: s.yardline,
      quarter: s.quarter,
      clock: s.clock,
      scoreDiff: s.score[s.possession] - s.score[other(s.possession)],
      ballY: s.ballY,
      hurry: this.hurry(),
    };
  }

  private scrimmageOrSpecial(): void {
    const s = this.s;
    if (s.clock === 0 && this.fairCatchKickAvailable) { this.doFairCatchKick(); return; }
    // A red-zone trip is a possession with a snap inside the opponent's 20.
    if (s.yardline >= 80 && !s.inRedZone) {
      s.inRedZone = true;
      this.box.team(this.off.abbr).redZoneTrips++;
    }
    const sit = this.situation();
    // End-of-game kneel: leading, clock can expire.
    const diff = sit.scoreDiff;
    const oppTO = s.timeouts[other(s.possession)];
    if (s.quarter >= 4 && diff > 0 && s.clock <= 40 * (4 - s.down + 1) - oppTO * 38 && s.clock > 0) return this.kneel();
    if (s.quarter === 2 && s.clock <= 25 && s.yardline < 60 && diff >= 0) return this.kneel();
    if (s.down === 4) {
      const decision = this.fourthDown(sit);
      if (decision === 'punt') return this.doPunt();
      if (decision === 'fg') return this.doFieldGoal();
    }
    // Last-second field goal at the end of a half.
    if ((s.quarter === 2 || s.quarter >= 4) && s.clock <= 6 && 100 - s.yardline + 17 <= fieldGoalRange(specialist(this.off, 'K')) + 2 && (s.quarter === 2 || (diff >= -3 && diff <= 0))) {
      return this.doFieldGoal();
    }
    this.scrimmage(sit);
  }

  private fourthDown(sit: Situation): 'go' | 'punt' | 'fg' {
    return chooseFourthDown(sit, { fieldGoalRange: fieldGoalRange(specialist(this.off, 'K')), aggression: this.off.coach.aggression });
  }

  private kneel(): void {
    this.fairCatchEntitlement = undefined;
    this.untimedDown = false;
    const s = this.s;
    this.log.push(this.entry('kneel', 'QB kneels', -1, 'Victory', ''));
    this.countDown(this.off, s.down, false);
    const warned = this.runClock(2, true);
    if (!warned) this.runClock(Math.min(s.clock, 38));
    this.moveChains(-1);
  }

  private entry(kind: PlayLog['kind'], text: string, yards: number, call = '', defense = ''): PlayLog {
    const s = this.s;
    return {
      index: this.playIndex++,
      quarter: s.quarter,
      clock: Math.round(s.clock),
      offense: this.off.abbr,
      down: s.down,
      distance: s.distance,
      yardline: s.yardline,
      call,
      defense,
      text,
      yards,
      score: { ...s.score },
      kind,
    };
  }

  private scrimmage(sit: Situation): void {
    const s = this.s;
    const offSide = s.possession;
    const defSide = other(offSide);
    const offTeam = this.off;
    const defTeam = this.def;
    const offCall = this.oc[offSide].call(sit, defTeam);
    const offPlayers = pickOffense(offTeam, offCall.formation.personnel, this.availability('O'));
    const { call: defCall, prefs } = this.dc[defSide].call(sit, offCall.formation.personnel, offTeam, offPlayers, offCall.formation);
    const defPlayers = pickDefense(defTeam, defCall.personnel, this.availability('D'));

    // Explicit historical scenario seams precede the native snap inspection.
    const foul = this.preSnapFoul();
    if (foul) {
      this.enforceDeadBall(foul, offCall.label);
      this.refreshFairCatchEntitlement();
      return;
    }
    const los = 10 + s.yardline;
    const afterWarningAtSnap = this.warningPeriod() && (s.twoMinWarned || s.clock <= 120);
    const firstDownX = Math.min(110, los + s.distance);
    const setup: PlaySetup = {
      offense: offPlayers,
      defense: defPlayers,
      offCall,
      defCall,
      los,
      ballY: s.ballY,
      firstDownX,
      seed: this.snaps.nextU32(),
      handContact: this.opts.handContact,
      record: this.opts.record,
      recordLevel: this.opts.recordLevel,
      energy: this.energy,
      beliefs: this.beliefs ?? undefined,
      manPrefs: prefs,
      hurry: sit.hurry,
      down: s.down,
      offStyle: alignStyle(this.off),
      defStyle: alignStyle(this.def),
      afterTwoMinuteWarning: afterWarningAtSnap,
      audibles: true,
      scouting: this.scouting[defSide],
      coverageScouting: this.coverageScouting[offSide],
    };
    this.opts.hooks?.playSetup?.(setup, { index: this.playIndex, kind: 'scrimmage', offense: offTeam.abbr, state: s });
    const sim = new PlaySim(setup);
    if (!sim.snapAssessment.snapPermitted) {
      this.applyNativePresnap(sim, offCall.label);
      this.refreshFairCatchEntitlement();
      return;
    }
    this.fairCatchEntitlement = undefined;
    this.untimedDown = false;
    // The QB may have checked out of the call at the line.
    const ranCall = sim.offCall;
    const r = this.opts.hooks?.playResult?.(sim, 'scrimmage') ?? sim.run();
    // Fatigue: write back both pools of players who were on the field.
    this.writeBackEnergy(sim, r.duration);
    // BELIEVED_BODY: the huddle before the next snap; each unit on the field tells its own men what it saw.
    if (this.beliefs) this.beliefs.huddle((['O', 'D'] as const).map((side) => sim.agents.filter((a) => a.team === side)
      .map((a) => ({ id: a.player.id, awareness01: a.r('awareness') }))));
    this.lastUnits = { offense: offTeam.abbr, off: new Set(sim.agents.filter((a) => a.team === 'O').map((a) => a.player.id)),
      def: new Set(sim.agents.filter((a) => a.team === 'D').map((a) => a.player.id)) };
    for (const a of sim.agents) this.box.line(a.player, a.team === 'O' ? offTeam.abbr : defTeam.abbr).snaps++;
    // Both sides learn from the snap they just saw.
    this.scouting[defSide].observe(sim.snapContext, ranCall.kind === 'pass');
    // SCOUT_SEEN: the offense learns the coverage its passer came to believe, weighted by how settled it was (off: the call).
    if (ranCall.kind === 'pass') {
      if (SCOUT_SEEN) this.coverageScouting[offSide].observeSeen(sim.qbMind.belief, sim.qbMind.report.pre);
      else this.coverageScouting[offSide].observe(defCall);
    }

    const startDown = s.down;
    const startDist = s.distance;
    const offTD = r.score?.kind === 'TD' && r.score.team === 'O';
    const converted = offTD || (!r.turnover && !r.score && r.outcome !== 'incomplete' && Math.round(r.yards * 10) / 10 >= startDist - 1e-6);
    const text = describe(sim, r, offTeam, defTeam);
    const logEntry = this.entry(r.kind, text, r.turnover ? r.offenseYards : r.yards, ranCall.label, defCall.label);
    logEntry.stats = r.stats;
    logEntry.segments = r.segments;
    logEntry.outcome = r.outcome;
    logEntry.duration = r.duration;
    logEntry.firstDown = converted;
    logEntry.plan = {
      personnel: ranCall.formation.personnel,
      formation: ranCall.formation.id,
      qb: ranCall.formation.qb,
      concept: ranCall.kind === 'run' ? ranCall.run!.scheme : ranCall.pass!.id,
      playAction: ranCall.kind === 'pass' && ranCall.pass!.family === 'playaction',
      audible: ranCall !== offCall,
      defPersonnel: defCall.personnel,
      front: defCall.front.id,
      stemFrom: defCall.frontStem?.from.id,
      creepSlot: defCall.creep?.slot,
      coverage: sim.defCall.coverage.id,
      called: defCall.coverage.id,
      family: sim.defCall.coverage.family ?? sim.defCall.coverage.id,
      shell: sim.defCall.coverage.shell,
      pressure: !!defCall.pressure,
      rushers: sim.defAlign.rushers.length,
      shown: defCall.shown?.id,
      checkedOn: sim.defCall.check?.when,
    };
    // Each player's first installed route (family:id; replay order), a diagnostic label no behavior reads.
    if (this.opts.record && r.frames) logEntry.routes = sim.agents.map((a) => routeOfAgent.get(a) ?? null);
    if (this.opts.record && r.frames) {
      logEntry.replay = {
        frames: r.frames,
        players: sim.agents.map((a) => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
        los,
        firstDownX,
        flip: offSide === 'away',
        events: r.events,
        telemetry: r.telemetry,
        profiles: r.telemetry ? sim.agents.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
          weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) : undefined,
      };
    }

    // Called acts are retained before a legal enforcement option is selected.
    // Legacy hooks/replays that contain only `penalty` remain supported.
    const calls = calledFouls(r);
    this.applyPlayerSanctions(calls);
    logEntry.foulRecords = r.foulRecords;
    logEntry.ruleLimitations = r.ruleLimitations;
    const resolution = resolveLivePenalties({ calls, los, startDown, startDistance: startDist, result: r,
      endOfHalf: s.clock <= r.duration && (s.quarter === 2 || s.quarter >= 4) });
    if (resolution.status === 'unsupported') {
      // A called act cannot silently become a legal official gain. This
      // explicit boundary is preferable to an invented offset/spot decision.
      throw new Error(`Unsupported NFL foul enforcement: ${resolution.reason}`);
    }
    if (resolution.status === 'resolved') {
      const selected = resolution.options.find(o => o.id === resolution.recommendedId)!;
      logEntry.fouls = calls.map((p, i) => ({ kind: p.kind,
        team: p.against === 'O' ? offTeam.abbr : defTeam.abbr,
        yards: this.enforcedYards(selected, i),
        accepted: selected.kind === 'enforce' && selected.callIndices.includes(i),
        offset: selected.kind === 'offset', rule: p.rule }));
      const first = logEntry.fouls.find(f => f.accepted) ?? logEntry.fouls[0];
      logEntry.foul = { kind: first.kind, team: first.team, yards: first.yards, accepted: first.accepted };
      if (selected.kind === 'decline') {
        logEntry.text += ` (${calls.map(p => `${p.kind} declined`).join(', ')})`;
      } else {
        const statistical = deriveOfficialPlayStats({ result: r, calls, selected,
          los, startDistance: startDist });
        logEntry.officialCredit = statistical.credit;
        if (statistical.credit.limitations?.length)
          logEntry.ruleLimitations = [...(logEntry.ruleLimitations ?? []), ...statistical.credit.limitations];
        logEntry.nullified = selected.nullifiesPlay;
        logEntry.firstDown = selected.possession === 'O' && selected.nextDown === 1
          && (selected.autoFirst || selected.spotX >= firstDownX - 1e-6);
        logEntry.yards = selected.preservesPlay ? r.yards : selected.kind === 'offset' ? 0 : selected.spotX - los;
        logEntry.official = { treatment: selected.kind,
          possession: selected.possession === 'O' ? offSide : defSide, spotX: selected.spotX,
          down: selected.nextDown, distance: selected.nextDistance,
          stats: statistical.credit.treatment };
        logEntry.text += selected.kind === 'offset' ? ' — PENALTIES OFFSET'
          : ` — PENALTY: ${first.kind} (accepted)`;
        this.recordPenaltyNumbers(calls, selected, offTeam, defTeam);
        for (const id of selected.disqualifiedPlayerIds ?? []) this.disqualified.add(id);
        this.queueCarryovers(selected, offSide, logEntry);
        if (statistical.result) this.recordStats(sim, statistical.result, offTeam, defTeam);
        if (statistical.credit.downAttempt)
          this.countDown(offTeam, startDown, statistical.credit.converted);
        this.log.push(logEntry);
        const warned = this.runClock(r.duration, true);
        const clock = resolveFoulClock({ quarter: s.quarter, clock: s.clock,
          afterTwoMinuteWarning: afterWarningAtSnap, wasRunning: true,
          wouldRunAfterPlay: !r.clockStops || (r.outcome === 'oob' && !this.lateHalf()),
          postseason: this.rules.postseason, startDown, startDistance: startDist,
          yardageDeclined: selected.acceptedWithoutDistance,
          calls, acceptedIndices: selected.kind === 'enforce' ? selected.callIndices : [],
          offset: selected.kind === 'offset', replayDown: selected.replayDown, result: r,
          offenseTimeouts: s.timeouts[offSide],
          useTimeout: s.timeouts[offSide] > 0 && (s.clock <= 10 || s.score[offSide] < s.score[defSide]) });
        if (clock.timeoutCharged) s.timeouts[offSide]--;
        if (clock.runoff) this.runClock(clock.runoff);
        this.untimedDown = clock.untimedDown;
        this.observe(offSide, ranCall, defCall, 0, sim.defCall);
        if (selected.preservesPlay && r.score?.kind === 'TD') {
          const scoring = r.score.team === 'O' ? offSide : defSide;
          this.addScore(scoring, 6); this.afterTouchdown(scoring, s.inRedZone);
          this.recoverAll(r.duration + 60); return;
        }
        if (selected.safety || (selected.preservesPlay && r.score?.kind === 'safety')) {
          const frameTeam = selected.safety ? selected.safetyTeam ?? 'D' : r.score!.team;
          const scoring = frameTeam === 'O' ? offSide : defSide;
          this.addScore(scoring, 2); logEntry.text += ' — SAFETY';
          this.recoverAll(r.duration + 60);
          if (!this.otDecided(scoring)) {
            s.possession = other(scoring);
            this.safetyKick(this.eligibleTeam(other(scoring)), this.eligibleTeam(scoring), selected.safety);
          }
          return;
        }
        if (selected.possession === 'D') {
          this.changePossession(110 - selected.spotX, clamp(r.endY, HASH_LEFT_Y, HASH_RIGHT_Y));
          s.yardline = 110 - selected.spotX;
        } else {
          s.yardline = selected.spotX - OWN_GOAL_X;
          if (logEntry.firstDown) this.box.team(offTeam.abbr).firstDowns++;
        }
        s.down = selected.nextDown; s.distance = selected.nextDistance;
        s.ballY = clamp(r.endY, HASH_LEFT_Y, HASH_RIGHT_Y);
        const running = !this.untimedDown && !warned && clock.restart === 'ready' && s.clock > 0;
        const warnedAfter = this.runClock(running ? clamp(this.tempo.normal(19, 3), 0, clock.playClock - .1) : 0);
        this.clockAfter = { index: this.playIndex, quarter: s.quarter, running: running && !warnedAfter };
        this.recoverAll(r.duration + 30); return;
      }
    }

    const statistical = deriveOfficialPlayStats({ result: r, calls, los, startDistance: startDist });
    logEntry.officialCredit = statistical.credit;
    this.log.push(logEntry);
    this.recordStats(sim, statistical.result!, offTeam, defTeam);
    this.countDown(offTeam, startDown, statistical.credit.converted);
    if (converted) this.box.team(offTeam.abbr).firstDowns++;
    const warned = this.runClock(r.duration, true);

    // Success measure for coordinators (standard success rate definition).
    const need = startDown === 1 ? 0.4 * startDist : startDown === 2 ? 0.6 * startDist : startDist;
    const success = r.turnover ? 0 : offTD ? 1 : clamp(r.yards / Math.max(1, need), 0, 1.2) >= 1 ? 1 : clamp(r.yards / Math.max(1, need), 0, 1) * 0.5;
    this.observe(offSide, ranCall, defCall, success, sim.defCall);

    // Ball position for the next snap: inside the hashes.
    s.ballY = clamp(r.endY, HASH_LEFT_Y, HASH_RIGHT_Y);

    if (r.score?.kind === 'TD') {
      if (offTD) {
        this.addScore(offSide, 6);
        this.afterTouchdown(offSide, s.inRedZone);
      } else {
        this.addScore(defSide, 6);
        this.afterTouchdown(defSide, false);
      }
      this.recoverAll(r.duration + 60);
      return;
    }
    if (r.score?.kind === 'safety') {
      const scoringSide = r.score.team === 'O' ? offSide : defSide;
      this.addScore(scoringSide, 2);
      logEntry.text += ' — SAFETY';
      this.recoverAll(60);
      if (!this.otDecided(scoringSide)) {
        s.possession = other(scoringSide);
        this.safetyKick(this.teams[other(scoringSide)], this.teams[scoringSide]);
      }
      return;
    }
    if (r.outcome === 'touchback') {
      if (r.possession === 'D') this.changePossession(20, s.ballY);
      else this.newSeriesAfterRegain(r, 20, s.ballY);
      this.recoverAll(r.duration + 40);
      return;
    }
    if (r.turnover) {
      this.changePossession(110 - r.endX, s.ballY);
      this.recoverAll(r.duration + 40);
      return;
    }
    if (r.segments.some(g => g.team === 'D')) this.newSeriesAfterRegain(r, r.endX - OWN_GOAL_X, s.ballY);
    else this.moveChains(r.outcome === 'incomplete' ? 0 : r.yards);
    const clockRunning = !warned && (!r.clockStops || (r.outcome === 'oob' && !this.lateHalf()));
    const between = this.betweenPlays(clockRunning, r.outcome === 'oob', r.stats.sacked);
    this.maybeTimeout(clockRunning);
    const warnedBetween = this.runClock(this.lastTimeoutUsed ? 0 : between);
    this.clockAfter = { index: this.playIndex, quarter: s.quarter, running: clockRunning && !this.lastTimeoutUsed && !warnedBetween };
    this.lastTimeoutUsed = false;
    // Rest is the time between snaps whether or not the game clock runs: an
    // offense huddles after an incompletion too (NFL median snap to snap
    // inside a drive about 42 s, BDB 2025).
    this.recoverAll(r.duration + Math.max(between, this.hurry() ? 15 : 30));
  }

  private enforcedYards(option: LivePenaltyOption, index: number): number {
    if (option.kind !== 'enforce' || !option.callIndices.includes(index) || option.carryover?.length) return 0;
    const spots = option.enforcementSpots?.filter(s => s.callIndex === index);
    return spots?.length ? spots.reduce((sum, s) => sum + Math.abs(s.toX - s.fromX), 0)
      : option.callIndices.length === 1 ? option.yards : 0;
  }

  private recordPenaltyNumbers(calls: readonly PenaltyCall[], option: LivePenaltyOption, off: Team, def: Team): void {
    if (option.kind !== 'enforce') return;
    for (const i of option.callIndices) {
      const p = calls[i]; if (!p) continue;
      const team = p.against === 'O' ? off : def;
      this.box.team(team.abbr).penalties++;
      this.box.team(team.abbr).penaltyYds += this.enforcedYards(option, i);
      const player = this.box.players.get(p.playerId); if (player) player.penalties++;
    }
  }

  private queueCarryovers(option: LivePenaltyOption, originalOffense: Side, log: PlayLog): void {
    for (const pending of option.carryover ?? []) this.pendingCarryover.push({
      target: pending.target, against: pending.against === 'O' ? originalOffense : other(originalOffense),
      yards: pending.yards, foul: log.fouls?.[pending.callIndices[0]] });
  }

  /** Carryover is enforced at the succeeding Try/kick spot, including its own
   * half-distance limit. It is never subtracted from a completed touchdown. */
  private consumeCarryovers(target: 'try' | 'kickoff', scoringOrKicking: Side, yardline: number): number {
    for (let i = 0; i < this.pendingCarryover.length;) {
      const p = this.pendingCarryover[i]; if (p.target !== target) { i++; continue; }
      const sign = p.against === scoringOrKicking ? -1 : 1;
      const distance = Math.min(p.yards, (sign > 0 ? 100 - yardline : yardline) / 2);
      yardline += sign * distance;
      this.box.team(this.teams[p.against].abbr).penaltyYds += distance;
      if (p.foul) p.foul.yards += distance;
      this.pendingCarryover.splice(i, 1);
    }
    return yardline;
  }

  private applyNativePresnap(sim: PlaySim, callLabel: string): void {
    const s = this.s, offense = s.possession, off = this.off, def = this.def;
    const wasRunning = this.clockRunningNow(), result = sim.buildResult(), calls = calledFouls(result);
    const resolution = resolveLivePenalties({ calls, los: sim.los, startDown: s.down, startDistance: s.distance, result });
    if (resolution.status !== 'resolved') throw new Error(`NFL blocked snap has no legal enforcement: ${resolution.reason}`);
    const selected = resolution.options.find(o => o.id === resolution.recommendedId && o.kind !== 'decline')
      ?? resolution.options.find(o => o.kind !== 'decline');
    if (!selected) throw new Error('NFL blocked snap cannot become a charged down');
    if (selected.safety) throw new Error('NFL blocked snap cannot score a safety: the ball is dead at the previous spot');
    const entry = this.entry('penalty', 'Pre-snap violation; ball remains dead', 0, callLabel);
    entry.foulRecords = result.foulRecords;
    entry.fouls = calls.map((p, i) => ({ kind: p.kind, team: p.against === 'O' ? off.abbr : def.abbr,
      yards: this.enforcedYards(selected, i), accepted: selected.kind === 'enforce' && selected.callIndices.includes(i),
      offset: selected.kind === 'offset', rule: p.rule }));
    entry.foul = entry.fouls[0];
    this.applyPlayerSanctions(calls); this.recordPenaltyNumbers(calls, selected, off, def);
    this.log.push(entry);
    s.yardline = selected.spotX - OWN_GOAL_X; s.down = selected.nextDown; s.distance = selected.nextDistance;
    const clock = resolveFoulClock({ quarter: s.quarter, clock: s.clock,
      afterTwoMinuteWarning: this.warningPeriod() && (s.twoMinWarned || s.clock <= 120),
      wasRunning, calls, acceptedIndices: selected.callIndices, offset: selected.kind === 'offset',
      postseason: this.rules.postseason, startDown: s.down, startDistance: s.distance,
      yardageDeclined: selected.acceptedWithoutDistance,
      replayDown: selected.replayDown, result, offenseTimeouts: s.timeouts[offense],
      useTimeout: s.timeouts[offense] > 0 && s.clock <= 10 });
    if (clock.timeoutCharged) s.timeouts[offense]--;
    if (clock.runoff) this.runClock(clock.runoff);
    const warned = this.runClock(clock.restart === 'ready' && s.clock > 0
      ? clamp(this.tempo.normal(17, 3), 0, clock.playClock - .1) : 0);
    this.clockAfter = { index: this.playIndex, quarter: s.quarter, running: clock.restart === 'ready' && !warned };
  }

  /** Losing and regaining possession creates a new series, even short of the
   * old line to gain. This is independent of whether any foul was called. */
  private newSeriesAfterRegain(result: PlayResult, yardline: number, ballY: number): void {
    const s = this.s;
    s.yardline = yardline;
    s.down = 1;
    s.distance = Math.min(10, 100 - yardline);
    s.ballY = ballY;
    s.driveStartYard = yardline;
    s.inRedZone = false;
    if (s.quarter >= 5) {
      let team = 'O';
      for (const segment of result.segments) if (segment.team !== team) {
        team = segment.team;
        this.otCheckPossession();
      }
    }
  }

  private preSnapFoul(): 'false_start' | 'offside' | null {
    const forced = this.opts.hooks?.preSnapFoul?.();
    if (forced !== undefined) return forced;
    // A random flag cannot establish an abrupt start or neutral-zone act.
    // Installed set procedures are deterministic until those acts are modeled.
    return null;
  }

  /**
   * Dead-ball fouls: no play happens, so no down is used and the line to gain
   * stays put. Five yards, or half the distance to the goal.
   */
  private enforceDeadBall(kind: 'false_start' | 'offside', call: string): void {
    const s = this.s;
    // A running clock stops for the enforcement and restarts on the ready signal (25-second play
    // clock); one already stopped, or late in a half, starts on the snap.
    const running = this.clockRunningNow() && !this.lateHalf();
    const lineToGain = s.yardline + s.distance;
    const fouler = kind === 'false_start' ? this.off : this.def;
    const yds = kind === 'false_start' ? Math.min(5, s.yardline / 2) : Math.min(5, (100 - s.yardline) / 2);
    const name = kind === 'false_start' ? 'False start' : 'Offside';
    const entry = this.entry('penalty', `${name}, ${fouler.abbr}, ${fmtYds(yds)}`, kind === 'false_start' ? -yds : yds, call);
    entry.foul = { kind, team: fouler.abbr, yards: yds, accepted: true };
    this.log.push(entry);
    this.box.team(fouler.abbr).penalties++;
    this.box.team(fouler.abbr).penaltyYds += yds;
    s.yardline += kind === 'false_start' ? -yds : yds;
    if (s.yardline >= lineToGain - 1e-6) {
      // Enough for a first down by penalty.
      s.down = 1;
      s.distance = Math.min(10, 100 - s.yardline);
      this.box.team(this.off.abbr).firstDowns++;
    } else {
      s.distance = lineToGain - s.yardline;
    }
    s.distance = Math.max(1, Math.round(s.distance));
    // NFL offenses snap with about 8 s left on the play clock.
    const warned = this.runClock(running ? this.tempo.normal(17, 3) : 0);
    this.clockAfter = { index: this.playIndex, quarter: s.quarter, running: running && !warned };
  }

  /** Free kick after a safety. */
  private safetyKick(offTeam: Team, defTeam: Team, penaltySafety = false): void {
    const kicking = offTeam.abbr === this.teams.home.abbr ? 'home' : 'away';
    //4-8-2(g): only a penalty-caused safety entitles the receivers to request
    //a safety kick after a half has expired. Ordinary safety kicks wait for
    //the next quarter or disappear at halftime/end of game.
    if (penaltySafety && this.s.clock === 0 && (this.s.quarter === 2 || this.s.quarter === 4))
      this.doFreeKick(kicking, true);
    else this.kickoffAfterScore(kicking, true);
  }

  /** Third- and fourth-down attempts and conversions for an official play. */
  private countDown(team: Team, down: number, converted: boolean): void {
    const t = this.box.team(team.abbr);
    if (down === 3) {
      t.thirdAtt++;
      if (converted) t.thirdConv++;
    }
    if (down === 4) {
      t.fourthAtt++;
      if (converted) t.fourthConv++;
    }
  }

  private lastTimeoutUsed = false;

  /** Trailing teams late in halves burn timeouts to stop a running clock. */
  private maybeTimeout(clockRunning: boolean): void {
    const s = this.s;
    if (!clockRunning || s.over) return;
    const offSide = s.possession;
    const defSide = other(offSide);
    const diff = s.score[offSide] - s.score[defSide];
    if (this.hurry() && s.timeouts[offSide] > 0 && s.clock < 120) {
      s.timeouts[offSide]--;
      this.lastTimeoutUsed = true;
      return;
    }
    if (s.quarter >= 4 && diff > 0 && s.clock < 150 && s.timeouts[defSide] > 0) {
      s.timeouts[defSide]--;
      this.lastTimeoutUsed = true;
    }
  }

  private observe(offSide: Side, offCall: OffensivePlayCall, defCall: DefensivePlayCall, success: number, installed: DefensivePlayCall): void {
    this.oc[offSide].observe(offCall, success);
    this.dc[other(offSide)].observe(defCall, success, installed);
  }

  /**
   * Spot the ball `gain` yards from the line and set the next down (turnover
   * on downs after a failed fourth). Statistics are the caller's business.
   */
  private moveChains(gain: number): boolean {
    const s = this.s;
    const g = Math.round(gain * 10) / 10;
    s.yardline = clamp(s.yardline + g, 0.5, 99.5);
    const firstDown = g >= s.distance - 1e-6;
    if (firstDown) {
      s.down = 1;
      s.distance = Math.min(10, 100 - s.yardline);
    } else {
      s.down++;
      s.distance = Math.max(0.5, s.distance - g);
      if (s.down > 4) this.changePossession(100 - s.yardline, s.ballY);
    }
    s.distance = Math.max(1, Math.round(s.distance));
    return firstDown;
  }

  /** Try and kickoff after a touchdown (`redZone`: an offensive TD on a drive that reached the red zone). */
  private afterTouchdown(scorer: Side, redZone: boolean): void {
    const s = this.s;
    if (redZone) this.box.team(this.teams[scorer].abbr).redZoneTDs++;
    s.possession = scorer;
    // An overtime touchdown that wins the game needs no try.
    if (this.otDecided(scorer, true)) return;
    // Two-point decision from a simple chart and coach aggression.
    const diffAfter = s.score[scorer] - s.score[other(scorer)];
    // 4-8-2(c): the scoring team need not attempt a Try when its
    // successful Try cannot change the outcome. An existing one/two-point
    // lead is already a win; a defensive return is not a reason to require
    // an otherwise unnecessary Try after the final down.
    if (s.quarter === 4 && s.clock === 0 && (diffAfter > 0 || diffAfter < -2)) return;
    const choice = this.opts.hooks?.tryChoice?.(scorer);
    const goForTwo = choice ? choice === 'two'
      : chooseTry({ quarter: s.quarter, clock: s.clock, scoreDiff: diffAfter }, this.teams[scorer].coach.aggression, this.calls) === 'two';
    if (goForTwo) {
      const success = this.twoPointTry(scorer);
      if (success) this.addScore(scorer, 2);
    } else {
      const k = specialist(this.eligibleTeam(scorer), 'K');
      const trySpot = this.consumeCarryovers('try', scorer, 85);
      const res = kickFieldGoal(this.kicks, k, 100 - trySpot + 18);
      const line = this.box.line(k, this.teams[scorer].abbr);
      line.xpa++;
      if (res.good) {
        line.xpm++;
        this.addScore(scorer, 1);
      }
      this.log.push(this.entry('xp', `extra point by ${k.firstName[0]}.${k.lastName} is ${res.good ? 'GOOD' : res.blocked ? 'BLOCKED' : 'NO GOOD'}`, 0));
    }
    if (this.otDecided(scorer)) return;
    this.kickoffAfterScore(scorer);
  }

  private kickoffAfterScore(scoring: Side, safety = false): void {
    if (this.s.clock > 0) { this.doFreeKick(scoring, safety); return; }
    if (this.s.quarter === 1 || this.s.quarter === 3) this.pendingKickoff = { kicking: scoring, safety };
  }

  private twoPointTry(scorer: Side): boolean {
    const s = this.s;
    s.possession = scorer;
    s.yardline = this.consumeCarryovers('try', scorer, 98);
    s.down = 1;
    s.distance = 100 - s.yardline;
    s.ballY = CENTER_Y;
    // Rule 11-3: a foul on a successful Try can require a re-Try, not an
    // ordinary replayed scrimmage series. The game clock never runs here.
    for (;;) {
      const sit = this.situation();
      const offCall = this.oc[scorer].call({ ...sit, down: 3, distance: s.distance }, this.def);
      const offPlayers = pickOffense(this.off, offCall.formation.personnel, this.availability('O'));
      const { call: defCall, prefs } = this.dc[other(scorer)].call(sit, offCall.formation.personnel, this.off, offPlayers, offCall.formation);
      const defPlayers = pickDefense(this.def, defCall.personnel, this.availability('D'));
      const los = OWN_GOAL_X + s.yardline;
      const setup: PlaySetup = { offense: offPlayers, defense: defPlayers, offCall, defCall,
        los, ballY: CENTER_Y, firstDownX: 110, seed: this.snaps.nextU32(),
        energy: this.energy, manPrefs: prefs, handContact: this.opts.handContact, down: 1, isTry: true,
        offStyle: alignStyle(this.off), defStyle: alignStyle(this.def),
        afterTwoMinuteWarning: this.warningPeriod() && (s.twoMinWarned || s.clock <= 120) };
      this.opts.hooks?.playSetup?.(setup, { index: this.playIndex, kind: 'two-point', offense: this.off.abbr, state: s });
      const sim = new PlaySim(setup);
      const r = this.opts.hooks?.playResult?.(sim, 'two-point') ?? sim.run();
      this.writeBackEnergy(sim, r.duration);
      const good = r.score?.kind === 'TD' && r.score.team === 'O';
      const entry = this.entry('two', `two-point try (${offCall.label}): ${good ? 'GOOD' : 'FAILED'}`, 0, offCall.label, defCall.label);
      entry.foulRecords = r.foulRecords; entry.ruleLimitations = r.ruleLimitations;
      const calls = calledFouls(r);
      this.applyPlayerSanctions(calls);
      if (calls.length) {
        const resolution = resolveTryPenalties({ calls, los, startDown: 1,
          startDistance: 110 - los, result: r, isTry: true });
        if (resolution.status !== 'resolved') throw new Error(`NFL Try requires a legal ruling: ${resolution.reason}`);
        const selected = resolution.options.find(o => o.id === resolution.recommendedId)!;
        entry.fouls = calls.map((p, i) => ({ kind: p.kind,
          team: this.teams[p.against === 'O' ? scorer : other(scorer)].abbr,
          yards: this.enforcedYards(selected, i),
          accepted: selected.kind === 'enforce' && selected.callIndices.includes(i),
          offset: selected.kind === 'offset', rule: p.rule }));
        entry.foul = entry.fouls.find(f => f.accepted) ?? entry.fouls[0];
        entry.nullified = selected.nullifiesPlay;
        this.recordPenaltyNumbers(calls, selected, this.teams[scorer], this.teams[other(scorer)]);
        for (const id of selected.disqualifiedPlayerIds ?? []) this.disqualified.add(id);
        this.queueCarryovers(selected, scorer, entry);
        if (selected.tryDisposition === 'retry') {
          entry.text += ' — penalty ruling requires re-Try'; this.log.push(entry);
          s.yardline = selected.spotX - OWN_GOAL_X; s.distance = 110 - selected.spotX;
          continue;
        }
        entry.text += selected.kind === 'decline' ? ' — penalty declined' : ' — Try penalty enforced';
        const score = selected.tryScore;
        if (score && !(score.team === 'O' && score.points === 2))
          this.addScore(score.team === 'O' ? scorer : other(scorer), score.points);
        this.log.push(entry);
        return score?.team === 'O' && score.points === 2;
      }
      if (r.score?.kind === 'TD' && r.score.team === 'D') {
        this.addScore(other(scorer), 2); entry.text += ' — defensive two points';
      } else if (r.score?.kind === 'safety') {
        this.addScore(r.score.team === 'O' ? scorer : other(scorer), 1);
        entry.text += ' — one-point safety';
      }
      this.log.push(entry);
      return good;
    }
  }

  private doKickoff(kicking: Side): void { this.doFreeKick(kicking, false); }

  private doFreeKick(kicking: Side, safety: boolean): void {
    const s = this.s, kTeam = this.eligibleTeam(kicking), rTeam = this.eligibleTeam(other(kicking));
    const diff = s.score[kicking] - s.score[other(kicking)];
    const onside = s.quarter >= 4 && s.clock < 150 && diff < 0 && diff >= -16;
    let kickSpot = this.consumeCarryovers('kickoff', kicking, safety ? 20 : 35), first = true;
    for (;;) {
      const event = first ? this.opts.hooks?.freeKickEvent?.(kicking, kickSpot) : undefined;
      const ko = kickoff(this.kicks, kTeam, rTeam, { onside, safetyKick: safety, kickSpot, event });
      first = false; s.possession = kicking;
      const entry: PlayLog = { ...this.entry('kickoff', `${kTeam.abbr} ${safety ? 'safety free kick: ' : ''}${ko.text}`, 0),
        kick: { kind: ko.onside ? 'onside' : safety ? 'safety' : 'kickoff',
          retry: ko.rules.retryKickFrom !== undefined, touchback: ko.touchback,
          returned: event ? undefined : !!ko.returner && !ko.touchback,
          returnYards: event ? undefined : ko.returnYards } };
      this.recordKickFouls(ko.rules, kicking, entry); this.log.push(entry);
      this.runClock(ko.touchback || ko.rules.deadOnRecovery ? 0 : 6, true);
      if (ko.rules.retryKickFrom !== undefined) { kickSpot = ko.rules.retryKickFrom; continue; }
      //16-1-5(c): the receiving team has its opportunity on a kickoff even
      //when the kickers legally recover. Count that opportunity before K's
      //new series; a re-kick above has not completed one. Do not replace the
      //opening receivers with the recovery owner as the first OT team.
      if (s.quarter >= 5 && ko.rules.possession === 'kicking') {
        if (s.otPossessions === 0) s.otFirst = other(kicking);
        this.otCheckPossession();
      }
      this.applyKickRuling(ko.rules, kicking); return;
    }
  }

  private recordKickFouls(ruling: KickRuling, kicking: Side, entry: PlayLog): void {
    if (ruling.unresolved.length) entry.ruleLimitations = [...ruling.unresolved];
    if (!ruling.fouls.length) return;
    entry.fouls = ruling.fouls.map((p, index) => {
      const disposition = ruling.foulDispositions?.find(d => d.index === index);
      const side = p.against === 'kicking' ? kicking : other(kicking);
      const carried = ruling.carryover?.some(c => c.index === index);
      const foul = { kind: p.kind, team: this.teams[side].abbr, yards: carried ? 0 : disposition?.yards ?? 0,
        accepted: disposition?.accepted ?? false, offset: disposition?.offset ?? false, rule: p.rule };
      if (foul.accepted && !foul.offset) { this.box.team(foul.team).penalties++; this.box.team(foul.team).penaltyYds += foul.yards; }
      return foul;
    });
    entry.foul = entry.fouls.find(f => f.accepted) ?? entry.fouls[0];
    for (const carry of ruling.carryover ?? []) this.pendingCarryover.push({
      target: carry.on === 'try' ? 'try' : 'kickoff',
      against: carry.against === 'kicking' ? kicking : other(kicking),
      yards: carry.yards, foul: entry.fouls[carry.index] });
  }

  private applyKickRuling(ruling: KickRuling, kicking: Side): void {
    const s = this.s;
    if (ruling.fieldGoal) {
      const scoring = ruling.fieldGoal === 'kicking' ? kicking : other(kicking);
      s.possession = scoring; this.addScore(scoring, 3);
      if (!this.otDecided(scoring)) this.kickoffAfterScore(scoring);
      return;
    }
    if (ruling.safety) {
      const scoring = ruling.safety === 'kicking' ? kicking : other(kicking);
      this.addScore(scoring, 2);
      if (!this.otDecided(scoring)) { s.possession = other(scoring); this.kickoffAfterScore(other(scoring), true); }
      return;
    }
    if (ruling.touchdown) {
      const scoring = ruling.touchdown === 'kicking' ? kicking : other(kicking);
      if (scoring !== kicking) {
        s.possession = kicking;
        if (s.quarter >= 5 && s.otPossessions === 0) s.otFirst = scoring;
        this.changePossession(99);
      } else s.possession = scoring;
      this.addScore(scoring, 6); this.afterTouchdown(scoring, false); return;
    }
    const owner = ruling.possession === 'kicking' ? kicking : other(kicking);
    if (owner === kicking && !ruling.newSeries) {
      s.possession = kicking; this.moveChains(ruling.yardline - s.yardline);
    } else {
      s.possession = other(owner);
      if (s.quarter >= 5 && s.otPossessions === 0) s.otFirst = owner;
      this.changePossession(ruling.yardline);
    }
    if (ruling.fairCatchKickAvailable) {
      this.fairCatchEntitlement = { side: s.possession, quarter: s.quarter, index: this.playIndex, yardline: s.yardline };
      if (s.clock === 0) this.untimedDown = true;
    }
    //4-8-2(b)(1),(5),(d): R can elect a scrimmage extension after a
    //selected first-touch violation or an accepted live K foul before the
    //kick ended. A clean-hands double offset does not extend the period.
    if (s.clock === 0 && (ruling.reason === 'receiving team elects first-touch spot'
      || ruling.fouls.some((f, i) => f.against === 'kicking' && f.enforcement !== 'dead_ball'
        && ruling.foulDispositions?.some(d => d.index === i && d.accepted && !d.offset))))
      this.untimedDown = true;
  }

  private refreshFairCatchEntitlement(): void {
    const e = this.fairCatchEntitlement;
    if (e && e.side === this.s.possession && e.quarter === this.s.quarter) {
      e.index = this.playIndex; e.yardline = this.s.yardline;
    }
  }

  private doFairCatchKick(): void {
    if (!this.fairCatchKickAvailable) throw new Error('No current fair-catch kick election');
    const s = this.s, kicking = s.possession, yardline = this.fairCatchEntitlement!.yardline;
    this.fairCatchEntitlement = undefined; this.untimedDown = false;
    const kicker = specialist(this.off, 'K');
    const result = kickFairCatch(this.kicks, kicker, yardline,
      { fairCatchMadeOrAwarded: true, periodExpired: s.clock === 0 });
    const line = this.box.line(kicker, this.off.abbr); line.fga++;
    const entry = this.entry('fg', `Fair-catch kick, ${Math.round(result.distance)} yards: ${result.good ? 'GOOD' : 'NO GOOD'}`, 0);
    entry.fgGood = result.good; entry.fgDistance = result.distance; this.log.push(entry);
    this.runClock(5, true);
    if (result.good) { line.fgm++; line.fgLong = Math.max(line.fgLong, result.distance); this.addScore(kicking, 3);
      if (!this.otDecided(kicking)) this.kickoffAfterScore(kicking);
    } else this.changePossession(Math.max(20, 100 - yardline));
  }

  private doPunt(): void {
    this.fairCatchEntitlement = undefined;
    this.untimedDown = false;
    const s = this.s;
    const kTeam = this.off;
    const rTeam = this.def;
    const p = specialist(kTeam, 'P');
    const lineToGain = s.yardline + s.distance;
    let first = true;
    for (;;) {
      const event = first ? this.opts.hooks?.scrimmageKickEvent?.(s.possession) : undefined;
      first = false;
      const res = punt(this.kicks, kTeam, rTeam, s.yardline, { event });
      const entry: PlayLog = { ...this.entry('punt', `${p.firstName[0]}.${p.lastName} ${res.text}`, 0),
        kick: { kind: 'punt', retry: res.rules.retryKickFrom !== undefined, touchback: res.touchback,
          returned: event ? undefined : !res.touchback && !res.fairCatch && !res.blocked
            && !res.muffLost && res.rules.advancePermitted,
          returnYards: event ? undefined : res.returnYards,
          netYards: res.rules.fouls.length || res.rules.unresolved.length ? undefined
            : (res.rules.possession === 'receiving' ? 100 - res.rules.yardline : res.rules.yardline) - s.yardline } };
      this.log.push(entry);
      this.runClock(res.touchback || res.fairCatch ? 5 : 9, true);
      this.recoverAll(50);
      this.recordKickFouls(res.rules, s.possession, entry);
      if (res.rules.retryKickFrom !== undefined) {
        entry.nullified = true; s.yardline = res.rules.retryKickFrom;
        if (res.rules.automaticFirstDown || s.yardline >= lineToGain - 1e-6) {
          s.down = 1; s.distance = Math.min(10, 100 - s.yardline);
          this.box.team(kTeam.abbr).firstDowns++;
          return;
        }
        s.distance = lineToGain - s.yardline;
        continue;
      }
      const line = this.box.line(p, kTeam.abbr); line.punts++; line.puntYds += res.gross;
      this.applyKickRuling(res.rules, s.possession); return;
    }
  }

  private doFieldGoal(): void {
    this.fairCatchEntitlement = undefined;
    this.untimedDown = false;
    const s = this.s;
    const kicking = s.possession, k = specialist(this.off, 'K'), lineToGain = s.yardline + s.distance;
    let first = true;
    for (;;) {
      const event = first ? this.opts.hooks?.scrimmageKickEvent?.(kicking) : undefined;
      first = false;
      const kickSpot = event?.missedFieldGoalSpot ?? s.yardline - 7;
      const dist = Math.round(110 - kickSpot);
      const late = s.quarter >= 4 && s.clock < 120;
      //A supplied terminal is an actual kick event; a generated
      //miss selects the documented reduced terminal instead of inferring a
      //recovery from the sampled blocked flag.
      const res = event ? { good: !!event.fieldGoalGood, blocked: !!event.kickBlocked, distance: dist, miss: undefined }
        : kickFieldGoal(this.kicks, k, dist, { x: 0, y: 0 }, late ? 1 : 0);
      const entry = this.entry('fg', `${dist}-yard field goal by ${k.firstName[0]}.${k.lastName} is ${res.good ? 'GOOD' : res.blocked ? 'BLOCKED' : `NO GOOD (${res.miss ?? 'represented kick'})`}`, 0);
      entry.fgGood = res.good; entry.fgDistance = dist;
      this.log.push(entry); this.runClock(5, true); this.recoverAll(50);
      const line = this.box.line(k, this.teams[kicking].abbr);
      const facts = event ? { ...event, scrimmageSpot: s.yardline, missedFieldGoalSpot: kickSpot }
        : { ...generatedMissedFieldGoalEvent(s.yardline, kickSpot), fieldGoalGood: res.good };
      const ruling = assessScrimmageKick(facts);
      if (!event && res.blocked) entry.ruleLimitations = [
        'Generated blocked FG uses a deflected kick crossing LOS, no qualifying receiver touch, then dead in receiving end zone; behind-line block variety requires represented event.',
      ];
      this.recordKickFouls(ruling, kicking, entry);
      if (ruling.retryKickFrom !== undefined) {
        entry.nullified = true; s.yardline = ruling.retryKickFrom;
        if (ruling.automaticFirstDown || s.yardline >= lineToGain - 1e-6) {
          s.down = 1; s.distance = Math.min(10, 100 - s.yardline);
          this.box.team(this.teams[kicking].abbr).firstDowns++; return;
        }
        s.distance = lineToGain - s.yardline; continue;
      }
      line.fga++;
      if (ruling.fieldGoal === 'kicking') { line.fgm++; line.fgLong = Math.max(line.fgLong, dist); }
      this.applyKickRuling(ruling, kicking); return;
    }
  }

  // ---------------------------------------------------------------- stats

  /** Box-score credit for the derived official action, including a credited
   * prefix of a nullified raw ending. */
  private recordStats(sim: PlaySim, r: PlayResult, offTeam: Team, defTeam: Team): void {
    const st = r.stats;
    const box = this.box;
    const agentOf = (id?: string) => (id ? sim.agents.find((a) => a.player.id === id) : undefined);
    const find = (id?: string) => agentOf(id)?.player;
    const abbrOf = (id: string) => (agentOf(id)?.team === 'O' ? offTeam.abbr : defTeam.abbr);
    const t = box.team(offTeam.abbr);
    t.plays++;
    // Official takeaway credit also applies when a defensive score ends the
    // play before the ordinary change-of-possession branch. The caller has
    // already removed any uncredited raw post-foul action.
    const possessionStats = deriveOfficialPossessionStats(r);
    t.turnovers += possessionStats.teamTurnovers.O;
    box.team(defTeam.abbr).turnovers += possessionStats.teamTurnovers.D;
    // Rush and reception credit runs to the fumble spot when the ball was lost.
    const yds = r.offenseYards;
    const offTD = r.score?.kind === 'TD' && r.score.team === 'O';
    if (r.kind === 'pass' && !st.scramble) {
      const qb = find(st.passer) ?? sim.qb.player;
      const ql = box.line(qb, offTeam.abbr);
      if (st.sacked) {
        ql.sacked++;
        ql.sackYds += -r.yards;
        t.sacksAllowed++;
        t.passYds += r.yards;
        t.totalYds += r.yards;
        const n = st.sackedBy?.length ?? 0;
        for (const id of st.sackedBy ?? []) {
          const p = find(id);
          if (p) {
            box.line(p, defTeam.abbr).sacks += 1 / n;
            box.line(p, defTeam.abbr).tackles += 1 / n;
          }
        }
      } else if (st.attempted && !st.throwaway) {
        ql.att++;
        const tgt = find(st.target);
        if (tgt) box.line(tgt, offTeam.abbr).targets++;
        // A completion stands even if the receiver fumbles it away afterwards.
        if (st.completed) {
          ql.cmp++;
          const rec = find(st.receiver);
          ql.passYds += yds;
          t.passYds += yds;
          t.totalYds += yds;
          if (rec) {
            const rl = box.line(rec, offTeam.abbr);
            rl.rec++;
            rl.recYds += yds;
            rl.recLong = Math.max(rl.recLong, Math.round(yds));
            rl.yac += st.yac ?? 0;
            if (offTD) {
              rl.recTD++;
              ql.passTD++;
            }
          }
          if (yds >= 20) t.explosivePlays++;
        }
        if (st.interceptedBy) {
          ql.int++;
          const d = find(st.interceptedBy);
          if (d) box.line(d, defTeam.abbr).defInt++;
        }
        if (st.dropped && tgt) box.line(tgt, offTeam.abbr).drops++;
      } else if (st.throwaway) {
        ql.att++;
      }
    } else {
      const rusher = find(st.rusher) ?? (st.scramble ? sim.qb.player : undefined);
      if (rusher) {
        const rl = box.line(rusher, offTeam.abbr);
        rl.rushAtt++;
        rl.rushYds += yds;
        rl.rushLong = Math.max(rl.rushLong, Math.round(yds));
        t.rushYds += yds;
        t.totalYds += yds;
        if (offTD) rl.rushTD++;
        if (yds >= 10) t.explosivePlays++;
      }
    }
    // Preserve the already-emitted pressure actor even when the QB later
    // becomes a rusher. This credits the cue; it does not infer new pressure.
    if (st.hurriedBy) {
      const p = find(st.hurriedBy);
      if (p) box.line(p, defTeam.abbr).pressures++;
    }
    // Tackles go to whoever made them: offensive players tackle returners.
    for (const id of st.tacklers) {
      const p = find(id);
      if (p && !st.sacked) {
        const l = box.line(p, abbrOf(id));
        l.tackles += 1 / st.tacklers.length;
        if (!r.turnover && r.yards < 0) l.tfl += 1 / st.tacklers.length;
      }
    }
    if (st.passDefendedBy) {
      const p = find(st.passDefendedBy);
      if (p) box.line(p, defTeam.abbr).pd++;
    }
    for (const fumble of possessionStats.fumbleCredits) {
      const p = find(fumble.playerId); if (!p) continue;
      const line = box.line(p, fumble.team === 'O' ? offTeam.abbr : defTeam.abbr);
      line.fumbles++; if (fumble.lost) line.fumblesLost++;
    }
    for (const recovery of possessionStats.recoveryCredits) {
      const p = find(recovery.playerId); if (p) box.line(p, recovery.team === 'O' ? offTeam.abbr : defTeam.abbr).fr++;
    }
    for (const a of sim.agents) {
      const misses = st.missedTacklesBy ? st.missedTacklesBy[a.player.id] ?? 0 : a.missedTackles;
      if (misses) box.line(a.player, a.team === 'O' ? offTeam.abbr : defTeam.abbr).missedTackles += misses;
    }
  }
}

// ------------------------------------------------------------------ text

/** A replay may contain both the plural ledger and a copied legacy alias. */
function calledFouls(result: PlayResult): PenaltyCall[] {
  const all = [...(result.penalties ?? []), ...(result.penalty ? [result.penalty] : [])];
  const seen = new Set<string>();
  return all.filter(p => {
    const key = p.id ?? [p.kind, p.against, p.playerId, p.t, p.spotX, p.rule, p.reason].join(':');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function nameOf(team: Team, id: string): string {
  const p = team.roster.find((x) => x.id === id);
  return p ? `${p.firstName[0]}.${p.lastName}` : 'unknown';
}

function fmtYds(y: number): string {
  const v = Math.round(y * 10) / 10;
  return `${v} yard${v === 1 ? '' : 's'}`;
}

function describe(sim: PlaySim, r: PlayResult, off: Team, def: Team): string {
  const st = r.stats;
  const name = (id?: string) => {
    if (!id) return '?';
    const a = sim.agents.find((x) => x.player.id === id);
    return a ? `${a.player.firstName[0]}.${a.player.lastName}` : '?';
  };
  const tk = st.tacklers.length ? ` (${st.tacklers.map(name).join(', ')})` : '';
  const yds = (y: number) => `${Math.round(y)} yd${Math.abs(Math.round(y)) === 1 ? '' : 's'}`;
  let t: string;
  if (r.kind === 'pass' && st.sacked) t = `${name(st.passer ?? sim.qb.player.id)} SACKED for ${yds(-r.yards)} by ${(st.sackedBy ?? []).map(name).join(' & ')}`;
  else if (st.scramble) t = `${name(sim.qb.player.id)} scrambles for ${yds(r.yards)}${tk}`;
  else if (r.kind === 'pass') {
    const qb = name(st.passer ?? sim.qb.player.id);
    if (st.throwaway) t = `${qb} throws it away`;
    else if (st.interceptedBy) t = `${qb} pass INTERCEPTED by ${name(st.interceptedBy)}${st.returnYards ? `, returned ${yds(st.returnYards)}` : ''}`;
    else if (st.completed) {
      const air = st.completedAirYards;
      const depth = air === undefined ? `${Math.round(st.airYards ?? 0)} intended air` : `${Math.round(air)} air`;
      t = `${qb} pass complete to ${name(st.receiver)} for ${yds(r.yards)} (${depth}, ${Math.round(st.yac ?? 0)} YAC)${tk}`;
    }
    else if (st.dropped) t = `${qb} pass to ${name(st.target)} DROPPED`;
    else if (st.passDefendedBy) t = `${qb} pass to ${name(st.target)} broken up by ${name(st.passDefendedBy)}`;
    else if (!st.attempted) t = `${qb} pass play — ${r.outcome}`;
    else t = `${qb} pass to ${name(st.target)} incomplete`;
  } else {
    t = `${name(st.rusher)} runs for ${yds(r.yards)}${tk}`;
    if (st.retainedSnap) t += ' (snap retained; no exchange)';
    if (st.brokenTackles) t += `, breaks ${st.brokenTackles} tackle${st.brokenTackles > 1 ? 's' : ''}`;
  }
  if (st.fumbledBy) t += `, FUMBLE by ${name(st.fumbledBy)}${st.fumbleLost ? ` recovered by ${def.abbr}` : ', recovered by offense'}`;
  if (r.score?.kind === 'TD') t += r.score.team === 'O' ? ' — TOUCHDOWN' : ` — TOUCHDOWN ${def.abbr}`;
  if (r.outcome === 'oob' && !r.score) t += ', out of bounds';
  void off;
  return t;
}

export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function situationText(log: PlayLog): string {
  const d = ['', '1st', '2nd', '3rd', '4th'][log.down] ?? `${log.down}th`;
  const toGoal = 100 - log.yardline;
  return `${d} & ${toGoal <= log.distance ? 'Goal' : log.distance} at ${describeYardline(log.yardline)}`;
}

export type { OffSlot };
