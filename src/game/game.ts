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
import { pickDefense, pickOffense, specialist, type Team } from '../league/team.js';
import { PlaySim } from '../sim/playsim.js';
import { CoverageScouting } from '../sim/qbmind.js';
import { ScoutingReport } from '../sim/recognition.js';
import type { Frame, PlayResult } from '../sim/types.js';
import { BoxScore } from './stats.js';
import { DefensiveCoordinator, OffensiveCoordinator, type Situation } from './playcaller.js';
import { fieldGoalRange, kickFieldGoal, kickoff, punt } from './specialteams.js';
import type { OffSlot, OffensivePlayCall, DefensivePlayCall } from '../playbook/types.js';

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
  /**
   * An accepted foul wiped the play out. `stats` then describe what physically
   * happened; nothing from the play enters the box score, and official
   * calibration excludes it.
   */
  nullified?: boolean;
  /** Foul during the play and its resolution. */
  foul?: { kind: string; team: string; yards: number; accepted: boolean };
  /** The calls on a scrimmage snap, for tendency analysis (same fields as the NFL extractor). */
  plan?: PlayPlan;
  outcome?: PlayResult['outcome'];
  /** Live time from the snap to the whistle (scrimmage plays). */
  duration?: number;
  /** Points scored by the offense on this play (6 for a TD), negative for defensive scores. */
  firstDown?: boolean;
  fgGood?: boolean;
  fgDistance?: number;
  /** Recorded frames (only when requested) + roster for the replay viewer. */
  replay?: {
    frames: Frame[];
    players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; pos: string }>;
    los: number;
    firstDownX: number;
    flip: boolean;
    events: PlayResult['events'];
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
}

export interface GameResult {
  home: Team;
  away: Team;
  score: { home: number; away: number };
  box: BoxScore;
  log: PlayLog[];
  quarterScores: Array<{ home: number; away: number }>;
}

export interface GameOptions {
  seed?: number;
  /** Development experiment; default contact model remains coupled piles. */
  experimentalGrasps?: boolean;
  /** Record replay frames for every scrimmage play. */
  record?: boolean;
  rules?: Partial<GameRules>;
  /** Scenario-test seams; leave unset for normal games. */
  hooks?: GameHooks;
}

/**
 * League rules that vary by game type. Overtime follows the NFL rules adopted
 * for 2025: both teams are guaranteed a possession; then sudden death.
 */
export interface GameRules {
  /** Postseason: 15-minute overtime periods until there is a winner. Otherwise one 10-minute period and ties stand. */
  postseason: boolean;
}

export interface GameHooks {
  /** Scripted result for a snap instead of simulating it (`undefined` simulates). */
  playResult?: (sim: PlaySim, kind: 'scrimmage' | 'two-point') => PlayResult | undefined;
  /** Force a pre-snap foul, or `null` for none, instead of rolling for one. */
  preSnapFoul?: () => 'false_start' | 'offside' | null | undefined;
  /** Force the try after a touchdown. */
  tryChoice?: (scorer: Side) => 'kick' | 'two' | undefined;
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
  private readonly flags: Rng;
  private readonly snaps: Rng;
  private readonly kicks: Rng;
  private readonly tempo: Rng;
  private readonly calls: Rng;
  private readonly rules: GameRules;
  private readonly teams: Record<Side, Team>;
  private readonly oc: Record<Side, OffensiveCoordinator>;
  private readonly dc: Record<Side, DefensiveCoordinator>;
  private readonly box = new BoxScore();
  private readonly log: PlayLog[] = [];
  private readonly energy = new Map<string, number>();
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
    this.rules = { postseason: false, ...opts.rules };
    this.coin = this.rng.fork('coin');
    this.flags = this.rng.fork('flags');
    this.snaps = this.rng.fork('snaps');
    this.kicks = this.rng.fork('kicks');
    this.tempo = this.rng.fork('tempo');
    this.calls = this.rng.fork('calls');
    this.teams = { home, away };
    this.oc = { home: new OffensiveCoordinator(home, this.rng.fork('oc-h')), away: new OffensiveCoordinator(away, this.rng.fork('oc-a')) };
    this.dc = { home: new DefensiveCoordinator(home, this.rng.fork('dc-h')), away: new DefensiveCoordinator(away, this.rng.fork('dc-a')) };
    const receiver: Side = this.coin.chance(0.5) ? 'home' : 'away';
    this.s = {
      quarter: 1, clock: 900, possession: receiver, yardline: 25, down: 1, distance: 10, ballY: CENTER_Y,
      score: { home: 0, away: 0 }, timeouts: { home: 3, away: 3 }, twoMinWarned: false, openingReceiver: receiver,
      driveStartYard: 25, inRedZone: false, otPossessions: 0, otFirst: receiver, over: false,
    };
    for (const t of [home, away]) for (const p of t.roster) this.energy.set(p.id, 1);
  }

  private get off(): Team {
    return this.teams[this.s.possession];
  }
  private get def(): Team {
    return this.teams[other(this.s.possession)];
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
    this.scrimmageOrSpecial();
    this.checkPeriodEnd();
  }

  result(): GameResult {
    return { home: this.teams.home, away: this.teams.away, score: this.s.score, box: this.box, log: this.log, quarterScores: this.quarterScores };
  }

  /** Current state (scenario tests and tools). */
  get state(): Readonly<GameState> {
    return this.s;
  }

  /** Overwrite parts of the state to set up a scenario. */
  setState(patch: Partial<GameState>): void {
    Object.assign(this.s, patch);
  }

  // ---------------------------------------------------------------- flow

  private checkPeriodEnd(): void {
    const s = this.s;
    if (s.over || s.clock > 0) return;
    this.quarterScores.push({ ...s.score });
    if (s.quarter === 2) {
      // Halftime: the team that kicked first receives.
      s.quarter = 3;
      s.clock = 900;
      s.timeouts = { home: 3, away: 3 };
      s.twoMinWarned = false;
      this.recoverAll(600);
      this.doKickoff(s.openingReceiver);
      return;
    }
    if (s.quarter < 4) {
      s.quarter++;
      s.clock = 900;
      s.twoMinWarned = false;
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
      this.recoverAll(180);
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
    return Math.max(0, tempo + (outOfBounds ? -4 : sack ? 3 : 0));
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

  private recoverAll(seconds: number): void {
    for (const t of [this.teams.home, this.teams.away]) {
      for (const p of t.roster) {
        const e = this.energy.get(p.id) ?? 1;
        const rate = 0.012 + 0.022 * r01(p.ratings.stamina);
        this.energy.set(p.id, e + (1 - e) * (1 - Math.exp(-seconds * rate)));
      }
    }
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
    const s = this.s;
    const k = specialist(this.off, 'K');
    const toGoal = 100 - s.yardline;
    const fgDist = toGoal + 17;
    const range = fieldGoalRange(k);
    const aggr = this.off.coach.aggression;
    const diff = sit.scoreDiff;
    const late = s.quarter >= 4;
    const minutes = s.clock / 60;
    // Desperation.
    if (late && diff < 0 && (minutes < 2.5 || (diff < -8 && minutes < 5))) {
      if (diff >= -3 && fgDist <= range && minutes < 0.6) return 'fg';
      return 'go';
    }
    let goThreshold = 0;
    if (s.yardline >= 40) goThreshold = 1;
    if (s.yardline >= 55) goThreshold = 2;
    if (s.yardline >= 62 && fgDist > range) goThreshold = 4;
    if (toGoal <= 5) goThreshold = 1.5;
    goThreshold += (aggr - 0.5) * 2;
    if (s.yardline < 30) goThreshold -= 1;
    if (s.distance <= goThreshold) return 'go';
    if (fgDist <= range) return 'fg';
    return 'punt';
  }

  private kneel(): void {
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
    const offPlayers = pickOffense(offTeam, offCall.formation.personnel, { energy: this.energy });
    const { call: defCall, prefs } = this.dc[defSide].call(sit, offCall.formation.personnel, offTeam, offPlayers);
    const defPlayers = pickDefense(defTeam, defCall.personnel, { energy: this.energy });

    // Pre-snap (dead-ball) fouls: false start (crowd, discipline), offside.
    const foul = this.preSnapFoul(avgRating(Object.values(offPlayers), 'discipline'), avgRating(Object.values(defPlayers) as Player[], 'discipline'));
    if (foul) {
      this.enforceDeadBall(foul, offCall.label);
      return;
    }

    const los = 10 + s.yardline;
    const firstDownX = Math.min(110, los + s.distance);
    const sim = new PlaySim({
      offense: offPlayers,
      defense: defPlayers,
      offCall,
      defCall,
      los,
      ballY: s.ballY,
      firstDownX,
      seed: this.snaps.nextU32(),
      record: this.opts.record,
      experimentalGrasps: this.opts.experimentalGrasps,
      energy: this.energy,
      manPrefs: prefs,
      hurry: sit.hurry,
      down: s.down,
      audibles: true,
      scouting: this.scouting[defSide],
      coverageScouting: this.coverageScouting[offSide],
    });
    // The QB may have checked out of the call at the line.
    const ranCall = sim.offCall;
    const r = this.opts.hooks?.playResult?.(sim, 'scrimmage') ?? sim.run();
    // Fatigue: write back energy of players who were on the field.
    for (const a of sim.agents) this.energy.set(a.player.id, a.body.energy);
    for (const a of sim.agents) this.box.line(a.player, a.team === 'O' ? offTeam.abbr : defTeam.abbr).snaps++;
    // Both sides learn from the snap they just saw.
    this.scouting[defSide].observe(sim.snapContext, ranCall.kind === 'pass');
    if (ranCall.kind === 'pass') this.coverageScouting[offSide].observe(defCall);

    const startDown = s.down;
    const startDist = s.distance;
    const lineToGain = s.yardline + s.distance;
    const offTD = r.score?.kind === 'TD' && r.score.team === 'O';
    const converted = offTD || (!r.turnover && !r.score && r.outcome !== 'incomplete' && Math.round(r.yards * 10) / 10 >= startDist - 1e-6);
    const text = describe(sim, r, offTeam, defTeam);
    const logEntry = this.entry(r.kind, text, r.turnover ? r.offenseYards : r.yards, ranCall.label, defCall.label);
    logEntry.stats = r.stats;
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
    };
    if (this.opts.record && r.frames) {
      logEntry.replay = {
        frames: r.frames,
        players: sim.agents.map((a) => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position })),
        los,
        firstDownX,
        flip: offSide === 'away',
        events: r.events,
      };
    }

    // A foul during the play is resolved before anything becomes official.
    const hold = this.holdingDecision(r, los, startDown, startDist);
    if (hold) {
      const who = nameOf(offTeam, hold.playerId);
      logEntry.foul = { kind: 'holding', team: offTeam.abbr, yards: hold.yards, accepted: hold.accepted };
      if (!hold.accepted) {
        logEntry.text += ` (holding on ${who} declined)`;
      } else {
        logEntry.nullified = true;
        logEntry.firstDown = false;
        logEntry.yards = -hold.yards;
        logEntry.text += ` — PENALTY: holding on ${who}, ${fmtYds(hold.yards)} (accepted), play nullified`;
        this.box.team(offTeam.abbr).penalties++;
        this.box.team(offTeam.abbr).penaltyYds += hold.yards;
        const line = this.box.players.get(hold.playerId);
        if (line) line.penalties++;
        this.log.push(logEntry);
        const warned = this.runClock(r.duration, true);
        this.observe(offSide, ranCall, defCall, 0);
        if (hold.safety) {
          logEntry.text += ' in the end zone — SAFETY';
          this.addScore(defSide, 2);
          this.recoverAll(r.duration + 60);
          if (!this.otDecided(defSide)) this.safetyKick(offTeam, defTeam);
          return;
        }
        s.yardline = hold.newYard;
        if (s.yardline >= lineToGain - 1e-6) {
          s.down = 1;
          s.distance = Math.min(10, 100 - s.yardline);
        } else {
          s.distance = lineToGain - s.yardline;
        }
        s.distance = Math.max(1, Math.round(s.distance));
        // After the enforcement the clock starts on the ready signal, or on the snap late in a half
        // (NFL: about 19 s from the whistle to the next snap after an accepted foul).
        const running = !warned && !r.clockStops && !this.lateHalf();
        const warnedAfter = this.runClock(running ? this.tempo.normal(19, 3) : 0);
        this.clockAfter = { index: this.playIndex, quarter: s.quarter, running: running && !warnedAfter };
        this.recoverAll(r.duration + 30);
        return;
      }
    }

    this.log.push(logEntry);
    this.recordStats(sim, r, offTeam, defTeam);
    this.countDown(offTeam, startDown, converted);
    if (converted) this.box.team(offTeam.abbr).firstDowns++;
    const warned = this.runClock(r.duration, true);

    // Success measure for coordinators (standard success rate definition).
    const need = startDown === 1 ? 0.4 * startDist : startDown === 2 ? 0.6 * startDist : startDist;
    const success = r.turnover ? 0 : offTD ? 1 : clamp(r.yards / Math.max(1, need), 0, 1.2) >= 1 ? 1 : clamp(r.yards / Math.max(1, need), 0, 1) * 0.5;
    this.observe(offSide, ranCall, defCall, success);

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
      this.addScore(defSide, 2);
      logEntry.text += ' — SAFETY';
      this.recoverAll(60);
      if (!this.otDecided(defSide)) this.safetyKick(offTeam, defTeam);
      return;
    }
    if (r.turnover) {
      const yl = r.outcome === 'touchback' ? 20 : 110 - r.endX;
      this.box.team(offTeam.abbr).turnovers++;
      this.changePossession(yl, s.ballY);
      this.recoverAll(r.duration + 40);
      return;
    }
    this.moveChains(r.outcome === 'incomplete' ? 0 : r.yards);
    const clockRunning = !warned && (!r.clockStops || (r.outcome === 'oob' && !this.lateHalf()));
    const between = this.betweenPlays(clockRunning, r.outcome === 'oob', r.stats.sacked);
    this.maybeTimeout(clockRunning);
    const warnedBetween = this.runClock(this.lastTimeoutUsed ? 0 : between);
    this.clockAfter = { index: this.playIndex, quarter: s.quarter, running: clockRunning && !this.lastTimeoutUsed && !warnedBetween };
    this.lastTimeoutUsed = false;
    this.recoverAll(r.duration + Math.max(between, 25));
  }

  private preSnapFoul(offDiscipline: number, defDiscipline: number): 'false_start' | 'offside' | null {
    const forced = this.opts.hooks?.preSnapFoul?.();
    if (forced !== undefined) return forced;
    if (this.flags.chance(0.012 * (1.4 - offDiscipline)) && this.s.yardline > 1) return 'false_start';
    if (this.flags.chance(0.009 * (1.4 - defDiscipline))) return 'offside';
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

  /**
   * Offensive holding during a live play. The defense keeps a takeaway or a
   * score of its own, declines when the play already stopped a third or
   * fourth down short, and otherwise takes the penalty unless the play lost
   * nearly as much. Pass plays enforce from the previous spot; running plays
   * from the spot of the foul when it was behind the end of the run (beyond
   * the line, the end of the run is the basic spot). A hold in the offense's
   * own end zone is a safety.
   */
  private holdingDecision(r: PlayResult, los: number, down: number, dist: number): { playerId: string; yards: number; accepted: boolean; safety: boolean; newYard: number } | null {
    const p = r.penalty;
    if (!p || p.kind !== 'holding' || p.against !== 'O') return null;
    const s = this.s;
    const foulX = p.spotX ?? los;
    const passPlay = r.stats.attempted;
    const basicX = passPlay ? los : Math.max(los, r.endX);
    const fromX = passPlay ? los : Math.min(basicX, foulX);
    const safety = foulX <= OWN_GOAL_X;
    const yards = safety ? 0 : Math.min(10, (fromX - OWN_GOAL_X) / 2);
    const newYard = Math.max(0.5, fromX - yards - 10);
    const decision = { playerId: p.playerId, yards, safety, newYard };
    const defenseScored = r.score !== null && r.score.team === 'D';
    if (r.turnover || defenseScored) return { ...decision, accepted: false };
    if (r.score?.kind === 'TD') return { ...decision, accepted: true };
    if (safety) return { ...decision, accepted: true };
    const gain = r.outcome === 'incomplete' ? 0 : r.yards;
    if (down >= 3 && gain < dist - 1e-6) return { ...decision, accepted: false };
    return { ...decision, accepted: s.yardline + gain - newYard > 2 };
  }

  /** Free kick after a safety. */
  private safetyKick(offTeam: Team, defTeam: Team): void {
    const ko = kickoff(this.kicks, offTeam, defTeam);
    this.changePossession(Math.min(60, ko.yardline + 15));
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

  private observe(offSide: Side, offCall: OffensivePlayCall, defCall: DefensivePlayCall, success: number): void {
    this.oc[offSide].observe(offCall, success);
    this.dc[other(offSide)].observe(defCall, success);
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
    const late = s.quarter >= 4;
    const choice = this.opts.hooks?.tryChoice?.(scorer);
    const goForTwo = choice ? choice === 'two' : (late && [-2, -5, -9, -10, -12, 1, 5].includes(diffAfter)) || this.calls.chance(0.06 + 0.1 * this.teams[scorer].coach.aggression);
    if (goForTwo) {
      const success = this.twoPointTry(scorer);
      if (success) this.addScore(scorer, 2);
    } else {
      const k = specialist(this.teams[scorer], 'K');
      const res = kickFieldGoal(this.kicks, k, 33);
      const line = this.box.line(k, this.teams[scorer].abbr);
      line.xpa++;
      if (res.good) {
        line.xpm++;
        this.addScore(scorer, 1);
      }
      this.log.push(this.entry('xp', `extra point by ${k.firstName[0]}.${k.lastName} is ${res.good ? 'GOOD' : res.blocked ? 'BLOCKED' : 'NO GOOD'}`, 0));
    }
    if (this.otDecided(scorer)) return;
    this.doKickoff(scorer);
  }

  private twoPointTry(scorer: Side): boolean {
    const s = this.s;
    s.possession = scorer;
    s.yardline = 98;
    s.down = 1;
    s.distance = 2;
    s.ballY = CENTER_Y;
    const sit = this.situation();
    const offCall = this.oc[scorer].call({ ...sit, down: 3, distance: 2 }, this.def);
    const offPlayers = pickOffense(this.off, offCall.formation.personnel, { energy: this.energy });
    const { call: defCall, prefs } = this.dc[other(scorer)].call(sit, offCall.formation.personnel, this.off, offPlayers);
    const defPlayers = pickDefense(this.def, defCall.personnel, { energy: this.energy });
    const sim = new PlaySim({ offense: offPlayers, defense: defPlayers, offCall, defCall, los: 108, ballY: CENTER_Y, firstDownX: 110, seed: this.snaps.nextU32(), energy: this.energy, manPrefs: prefs, experimentalGrasps: this.opts.experimentalGrasps });
    const r = this.opts.hooks?.playResult?.(sim, 'two-point') ?? sim.run();
    const good = r.score?.kind === 'TD' && r.score.team === 'O';
    this.log.push(this.entry('two', `two-point try (${offCall.label}): ${good ? 'GOOD' : 'FAILED'}`, 0, offCall.label, defCall.label));
    return good;
  }

  private doKickoff(kicking: Side): void {
    const s = this.s;
    const kTeam = this.teams[kicking];
    const rTeam = this.teams[other(kicking)];
    const diff = s.score[kicking] - s.score[other(kicking)];
    const onside = s.quarter >= 4 && s.clock < 150 && diff < 0 && diff >= -16;
    const ko = kickoff(this.kicks, kTeam, rTeam, { onside });
    s.possession = kicking;
    this.log.push(this.entry('kickoff', `${kTeam.abbr} ${ko.text}`, 0));
    this.runClock(ko.touchback ? 0 : 6, true);
    if (ko.recoveredByKicking) {
      s.possession = other(kicking);
      this.changePossession(100 - ko.yardline);
      return;
    }
    if (ko.td) {
      this.changePossession(99);
      this.addScore(other(kicking), 6);
      this.afterTouchdown(other(kicking), false);
      return;
    }
    if (ko.fumbleLost) {
      // Kicking team recovers.
      s.possession = other(kicking);
      this.changePossession(ko.yardline);
      return;
    }
    this.changePossession(ko.yardline);
  }

  private doPunt(): void {
    const s = this.s;
    const kTeam = this.off;
    const rTeam = this.def;
    const p = specialist(kTeam, 'P');
    const res = punt(this.kicks, kTeam, rTeam, s.yardline);
    const line = this.box.line(p, kTeam.abbr);
    line.punts++;
    line.puntYds += res.gross;
    this.log.push(this.entry('punt', `${p.firstName[0]}.${p.lastName} ${res.text}`, 0));
    this.runClock(res.touchback || res.fairCatch ? 5 : 9, true);
    this.recoverAll(50);
    if (res.td) {
      this.changePossession(99);
      this.addScore(s.possession, 6);
      this.afterTouchdown(s.possession, false);
      return;
    }
    if (res.muffLost) {
      // Kicking team keeps it.
      s.down = 1;
      s.yardline = clamp(res.yardline, 1, 99);
      s.distance = Math.min(10, 100 - s.yardline);
      return;
    }
    this.changePossession(res.yardline);
  }

  private doFieldGoal(): void {
    const s = this.s;
    const k = specialist(this.off, 'K');
    const dist = Math.round(100 - s.yardline + 17);
    const late = s.quarter >= 4 && s.clock < 120;
    const res = kickFieldGoal(this.kicks, k, dist, { x: 0, y: 0 }, late ? 1 : 0);
    const line = this.box.line(k, this.off.abbr);
    line.fga++;
    const fgEntry = this.entry('fg', `${dist}-yard field goal by ${k.firstName[0]}.${k.lastName} is ${res.good ? 'GOOD' : res.blocked ? 'BLOCKED' : `NO GOOD (${res.miss})`}`, 0);
    fgEntry.fgGood = res.good;
    fgEntry.fgDistance = dist;
    this.log.push(fgEntry);
    this.runClock(5, true);
    this.recoverAll(50);
    if (res.good) {
      line.fgm++;
      line.fgLong = Math.max(line.fgLong, dist);
      this.addScore(s.possession, 3);
      if (this.otDecided(s.possession)) return;
      this.doKickoff(s.possession);
      return;
    }
    // Missed: opponent takes over at the spot of the kick (or the 20).
    const spot = s.yardline - 7;
    this.changePossession(Math.max(20, 100 - spot));
  }

  // ---------------------------------------------------------------- stats

  /** Box-score credit for an official (not nullified) scrimmage play. */
  private recordStats(sim: PlaySim, r: PlayResult, offTeam: Team, defTeam: Team): void {
    const st = r.stats;
    const box = this.box;
    const agentOf = (id?: string) => (id ? sim.agents.find((a) => a.player.id === id) : undefined);
    const find = (id?: string) => agentOf(id)?.player;
    const abbrOf = (id: string) => (agentOf(id)?.team === 'O' ? offTeam.abbr : defTeam.abbr);
    const t = box.team(offTeam.abbr);
    t.plays++;
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
      if (st.hurriedBy) {
        const p = find(st.hurriedBy);
        if (p) box.line(p, defTeam.abbr).pressures++;
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
    if (st.fumbledBy) {
      const p = find(st.fumbledBy);
      if (p) {
        const l = box.line(p, offTeam.abbr);
        l.fumbles++;
        if (st.fumbleLost) l.fumblesLost++;
      }
      if (st.fumbleRecoveredBy) {
        const rp = find(st.fumbleRecoveredBy);
        if (rp && st.fumbleLost) box.line(rp, defTeam.abbr).fr++;
      }
    }
    for (const a of sim.agents) if (a.missedTackles) box.line(a.player, a.team === 'O' ? offTeam.abbr : defTeam.abbr).missedTackles += a.missedTackles;
  }
}

// ------------------------------------------------------------------ text

function nameOf(team: Team, id: string): string {
  const p = team.roster.find((x) => x.id === id);
  return p ? `${p.firstName[0]}.${p.lastName}` : 'unknown';
}

function fmtYds(y: number): string {
  const v = Math.round(y * 10) / 10;
  return `${v} yard${v === 1 ? '' : 's'}`;
}

function avgRating(ps: Player[], key: 'discipline'): number {
  return ps.reduce((s, p) => s + r01(p.ratings[key]), 0) / Math.max(1, ps.length);
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
    else if (st.completed) t = `${qb} pass complete to ${name(st.receiver)} for ${yds(r.yards)} (${Math.round(st.airYards ?? 0)} air, ${Math.round(st.yac ?? 0)} YAC)${tk}`;
    else if (st.dropped) t = `${qb} pass to ${name(st.target)} DROPPED`;
    else if (st.passDefendedBy) t = `${qb} pass to ${name(st.target)} broken up by ${name(st.passDefendedBy)}`;
    else if (!st.attempted) t = `${qb} pass play — ${r.outcome}`;
    else t = `${qb} pass to ${name(st.target)} incomplete`;
  } else {
    t = `${name(st.rusher)} runs for ${yds(r.yards)}${tk}`;
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
