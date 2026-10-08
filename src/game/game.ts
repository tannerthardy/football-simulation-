/**
 * Game simulation: drives, downs, clock, scoring, special teams, fatigue and
 * substitutions, penalties, coaching decisions, box score and play-by-play.
 *
 * Coordinates: `yardline` is yards from the possessing team's own goal line
 * (0–100). Each scrimmage play is simulated in the play frame (offense
 * attacking +x, LOS at x = 10 + yardline).
 */
import { Rng } from '../core/rng.js';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y, describeYardline } from '../core/field.js';
import { clamp } from '../core/vec.js';
import { r01, type Player } from '../players/types.js';
import { pickDefense, pickOffense, specialist, type Team } from '../league/team.js';
import { PlaySim } from '../sim/playsim.js';
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
  outcome?: PlayResult['outcome'];
  /** Points scored by the offense on this play (6 for a TD), negative for defensive scores. */
  firstDown?: boolean;
  fgGood?: boolean;
  fgDistance?: number;
  /** Recorded frames (only when requested) + roster for the replay viewer. */
  replay?: { frames: Frame[]; players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; pos: string }>; los: number; firstDownX: number; flip: boolean };
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
  /** Record replay frames for every scrimmage play. */
  record?: boolean;
}

interface State {
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
  otPossessions: number;
  over: boolean;
}

export function simulateGame(home: Team, away: Team, opts: GameOptions = {}): GameResult {
  return new Game(home, away, opts).play();
}

class Game {
  private readonly rng: Rng;
  private readonly teams: Record<Side, Team>;
  private readonly oc: Record<Side, OffensiveCoordinator>;
  private readonly dc: Record<Side, DefensiveCoordinator>;
  private readonly box = new BoxScore();
  private readonly log: PlayLog[] = [];
  private readonly energy = new Map<string, number>();
  private readonly quarterScores: Array<{ home: number; away: number }> = [];
  private s: State;
  private playIndex = 0;

  constructor(
    home: Team,
    away: Team,
    private readonly opts: GameOptions,
  ) {
    this.rng = new Rng(opts.seed ?? 1);
    this.teams = { home, away };
    this.oc = { home: new OffensiveCoordinator(home, this.rng.fork('oc-h')), away: new OffensiveCoordinator(away, this.rng.fork('oc-a')) };
    this.dc = { home: new DefensiveCoordinator(home, this.rng.fork('dc-h')), away: new DefensiveCoordinator(away, this.rng.fork('dc-a')) };
    const receiver: Side = this.rng.chance(0.5) ? 'home' : 'away';
    this.s = {
      quarter: 1, clock: 900, possession: receiver, yardline: 25, down: 1, distance: 10, ballY: CENTER_Y,
      score: { home: 0, away: 0 }, timeouts: { home: 3, away: 3 }, twoMinWarned: false, openingReceiver: receiver,
      driveStartYard: 25, inRedZone: false, otPossessions: 0, over: false,
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
    this.doKickoff(other(this.s.openingReceiver));
    while (!this.s.over) {
      this.scrimmageOrSpecial();
      this.checkPeriodEnd();
    }
    return { home: this.teams.home, away: this.teams.away, score: this.s.score, box: this.box, log: this.log, quarterScores: this.quarterScores };
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
    if (s.quarter < 4 || (s.quarter === 4 && s.score.home === s.score.away)) {
      if (s.quarter === 4) {
        // Overtime: 10 minutes, both teams get a possession.
        s.quarter = 5;
        s.clock = 600;
        s.timeouts = { home: 2, away: 2 };
        s.twoMinWarned = false;
        s.otPossessions = 0;
        const recv: Side = this.rng.chance(0.5) ? 'home' : 'away';
        this.doKickoff(other(recv));
        return;
      }
      s.quarter++;
      s.clock = 900;
      s.twoMinWarned = false;
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
    if (s.quarter === 5) this.otCheckPossession();
  }

  /** Overtime: game ends once both teams have possessed and the score isn't tied (or on a score after that). */
  private otCheckPossession(): void {
    const s = this.s;
    s.otPossessions++;
    if (s.otPossessions > 2 && s.score.home !== s.score.away) s.over = true;
  }

  private addScore(side: Side, pts: number): void {
    this.s.score[side] += pts;
    if (this.s.quarter === 5 && this.s.otPossessions >= 2 && this.s.score.home !== this.s.score.away) this.s.over = true;
  }

  // ---------------------------------------------------------------- clock

  private runClock(seconds: number): void {
    const s = this.s;
    const before = s.clock;
    s.clock = Math.max(0, s.clock - seconds);
    // Two-minute warning.
    if ((s.quarter === 2 || s.quarter === 4) && !s.twoMinWarned && before > 120 && s.clock <= 120) {
      s.clock = 120;
      s.twoMinWarned = true;
    }
    this.box.team(this.off.abbr).timeOfPossession += before - s.clock;
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

  /** Time that runs between plays when the clock keeps running. */
  private betweenPlays(clockRunning: boolean, outOfBounds: boolean): number {
    if (!clockRunning) return 0;
    if (outOfBounds) return this.lateHalf() ? 0 : 7;
    if (this.hurry()) return this.rng.normal(16, 3);
    if (this.milking()) return this.rng.normal(39, 1.5);
    return this.rng.normal(34, 3);
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
    if ((s.quarter === 2 || s.quarter === 4) && s.clock <= 6 && 100 - s.yardline + 17 <= fieldGoalRange(specialist(this.off, 'K')) + 2 && (s.quarter === 2 || (diff >= -3 && diff <= 0))) {
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
    s.yardline = Math.max(1, s.yardline - 1);
    s.down++;
    s.distance += 1;
    this.runClock(Math.min(s.clock, 40));
    if (s.down > 4) this.changePossession(100 - s.yardline);
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
    const rng = this.rng;
    const offSide = s.possession;
    const defSide = other(offSide);
    const offTeam = this.off;
    const defTeam = this.def;
    const offCall = this.oc[offSide].call(sit, defTeam);
    const offPlayers = pickOffense(offTeam, offCall.formation.personnel, { energy: this.energy });
    const { call: defCall, prefs } = this.dc[defSide].call(sit, offCall.formation.personnel, offTeam, offPlayers);
    const defPlayers = pickDefense(defTeam, defCall.personnel, { energy: this.energy });

    // Pre-snap penalties: false start (crowd, discipline), offside.
    const offDisc = avgRating(Object.values(offPlayers), 'discipline');
    const defDisc = avgRating(Object.values(defPlayers) as Player[], 'discipline');
    if (rng.chance(0.012 * (1.4 - offDisc)) && s.yardline > 1) {
      const yds = Math.min(5, Math.floor(s.yardline / 2));
      this.log.push(this.entry('penalty', `False start, ${offTeam.abbr}, ${yds} yards`, -yds, offCall.label));
      this.box.team(offTeam.abbr).penalties++;
      this.box.team(offTeam.abbr).penaltyYds += yds;
      s.yardline -= yds;
      s.distance += yds;
      return;
    }
    if (rng.chance(0.009 * (1.4 - defDisc))) {
      const yds = Math.min(5, Math.floor((100 - s.yardline) / 2));
      this.log.push(this.entry('penalty', `Offside, ${defTeam.abbr}, ${yds} yards`, yds, offCall.label));
      this.box.team(defTeam.abbr).penalties++;
      this.box.team(defTeam.abbr).penaltyYds += yds;
      this.advance(yds, false);
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
      seed: rng.nextU32(),
      record: this.opts.record,
      energy: this.energy,
      manPrefs: prefs,
      hurry: sit.hurry,
    });
    const r = sim.run();
    // Fatigue: write back energy of players who were on the field.
    for (const a of sim.agents) this.energy.set(a.player.id, a.body.energy);
    for (const a of sim.agents) this.box.line(a.player, a.team === 'O' ? offTeam.abbr : defTeam.abbr).snaps++;

    const startYard = s.yardline;
    const startDown = s.down;
    const startDist = s.distance;
    const text = describe(sim, r, offTeam, defTeam);
    const logEntry = this.entry(r.kind, text, r.yards, offCall.label, defCall.label);
    logEntry.stats = r.stats;
    logEntry.outcome = r.outcome;
    logEntry.firstDown = !r.turnover && r.outcome !== 'incomplete' && r.endX - los >= startDist - 1e-6;
    if (this.opts.record && r.frames) {
      logEntry.replay = {
        frames: r.frames,
        players: sim.agents.map((a) => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position })),
        los,
        firstDownX,
        flip: offSide === 'away',
      };
    }

    this.recordStats(sim, r, offTeam, defTeam, startDown, startDist);

    // Penalty (holding) on the play: accepted unless the play was worse.
    if (r.penalty && r.penalty.kind === 'holding' && !r.turnover && !r.score) {
      if (r.yards > -8) {
        const yds = Math.min(10, Math.floor(s.yardline / 2));
        logEntry.text += ` — PENALTY: holding on ${nameOf(offTeam, r.penalty.playerId)}, ${yds} yards (accepted)`;
        this.box.team(offTeam.abbr).penalties++;
        this.box.team(offTeam.abbr).penaltyYds += yds;
        const line = this.box.players.get(r.penalty.playerId);
        if (line) line.penalties++;
        this.undoPlayStats(sim, r, offTeam, defTeam);
        s.yardline = Math.max(1, s.yardline - yds);
        s.distance += yds;
        logEntry.yards = -yds;
        this.log.push(logEntry);
        this.runClock(r.duration);
        this.recoverAll(r.duration + 30);
        this.observe(offSide, offCall, defCall, 0);
        return;
      }
    }

    this.log.push(logEntry);
    this.runClock(r.duration);

    // Success measure for coordinators (standard success rate definition).
    const need = startDown === 1 ? 0.4 * startDist : startDown === 2 ? 0.6 * startDist : startDist;
    const success = r.turnover ? 0 : r.score?.kind === 'TD' && r.score.team === 'O' ? 1 : clamp(r.yards / Math.max(1, need), 0, 1.2) >= 1 ? 1 : clamp(r.yards / Math.max(1, need), 0, 1) * 0.5;
    this.observe(offSide, offCall, defCall, success);

    // Ball position for the next snap: inside the hashes.
    s.ballY = clamp(r.endY, HASH_LEFT_Y, HASH_RIGHT_Y);

    if (r.score?.kind === 'TD') {
      if (r.score.team === 'O') {
        this.addScore(offSide, 6);
        this.afterTouchdown(offSide);
      } else {
        this.addScore(defSide, 6);
        // Return TD: defense scores; switch so the scoring team "has" the ball for the try.
        s.possession = defSide;
        this.afterTouchdown(defSide);
      }
      this.recoverAll(r.duration + 60);
      return;
    }
    if (r.score?.kind === 'safety') {
      this.addScore(defSide, 2);
      this.log[this.log.length - 1].text += ' — SAFETY';
      // Free kick from the 20.
      this.recoverAll(60);
      const ko = kickoff(this.rng, offTeam, defTeam);
      this.changePossession(Math.min(60, ko.yardline + 15));
      return;
    }
    if (r.turnover) {
      const yl = r.outcome === 'touchback' ? 20 : 110 - r.endX;
      this.box.team(offTeam.abbr).turnovers++;
      this.changePossession(yl, s.ballY);
      this.runClock(0);
      this.recoverAll(r.duration + 40);
      return;
    }
    if (r.outcome === 'incomplete') {
      this.advance(0, false);
    } else {
      this.advance(r.endX - los, true, r.outcome === 'oob');
    }
    const clockRunning = !r.clockStops || (r.outcome === 'oob' && !this.lateHalf());
    const between = this.betweenPlays(clockRunning, r.outcome === 'oob');
    this.maybeTimeout(clockRunning);
    this.runClock(this.lastTimeoutUsed ? 0 : between);
    this.lastTimeoutUsed = false;
    this.recoverAll(r.duration + Math.max(between, 25));
    void startYard;
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

  /** Move the chains after a gain of `gain` yards. */
  private advance(gain: number, fromPlay: boolean, oob = false): void {
    const s = this.s;
    void fromPlay;
    void oob;
    const g = Math.round(gain * 10) / 10;
    s.yardline = clamp(s.yardline + g, 1, 99);
    const firstDown = g >= s.distance - 1e-6;
    const team = this.box.team(this.off.abbr);
    if (s.down === 3) {
      team.thirdAtt++;
      if (firstDown) team.thirdConv++;
    }
    if (s.down === 4) {
      team.fourthAtt++;
      if (firstDown) team.fourthConv++;
    }
    if (s.yardline >= 80 && !s.inRedZone) {
      s.inRedZone = true;
      team.redZoneTrips++;
    }
    if (firstDown) {
      if (fromPlay) team.firstDowns++;
      s.down = 1;
      s.distance = Math.min(10, 100 - s.yardline);
    } else {
      s.down++;
      s.distance = Math.max(0.5, s.distance - g);
      if (s.down > 4) {
        // Turnover on downs.
        this.changePossession(100 - s.yardline, s.ballY);
      }
    }
    s.distance = Math.round(s.distance);
    if (s.distance < 1) s.distance = 1;
  }

  private afterTouchdown(scorer: Side): void {
    const s = this.s;
    if (s.inRedZone || s.yardline >= 80) this.box.team(this.teams[scorer].abbr).redZoneTDs++;
    // Two-point decision from a simple chart and coach aggression.
    const diffAfter = s.score[scorer] - s.score[other(scorer)];
    const late = s.quarter >= 4;
    const goForTwo = (late && [-2, -5, -9, -10, -12, 1, 5].includes(diffAfter)) || this.rng.chance(0.06 + 0.1 * this.teams[scorer].coach.aggression);
    s.possession = scorer;
    if (goForTwo) {
      const success = this.twoPointTry(scorer);
      if (success) this.addScore(scorer, 2);
    } else {
      const k = specialist(this.teams[scorer], 'K');
      const res = kickFieldGoal(this.rng, k, 33);
      const line = this.box.line(k, this.teams[scorer].abbr);
      line.xpa++;
      if (res.good) {
        line.xpm++;
        this.addScore(scorer, 1);
      }
      this.log.push(this.entry('xp', `extra point by ${k.firstName[0]}.${k.lastName} is ${res.good ? 'GOOD' : res.blocked ? 'BLOCKED' : 'NO GOOD'}`, 0));
    }
    if (!s.over) this.doKickoff(scorer);
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
    const sim = new PlaySim({ offense: offPlayers, defense: defPlayers, offCall, defCall, los: 108, ballY: CENTER_Y, firstDownX: 110, seed: this.rng.nextU32(), energy: this.energy, manPrefs: prefs });
    const r = sim.run();
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
    const ko = kickoff(this.rng, kTeam, rTeam, { onside });
    s.possession = kicking;
    this.log.push(this.entry('kickoff', `${kTeam.abbr} ${ko.text}`, 0));
    if (ko.returner) {
      const l = this.box.line(ko.returner, rTeam.abbr);
      void l;
    }
    this.runClock(ko.touchback ? 0 : 6);
    if (ko.recoveredByKicking) {
      s.possession = other(kicking);
      this.changePossession(100 - ko.yardline);
      return;
    }
    if (ko.td) {
      this.changePossession(99);
      this.addScore(other(kicking), 6);
      this.afterTouchdown(other(kicking));
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
    const res = punt(this.rng, kTeam, rTeam, s.yardline);
    const line = this.box.line(p, kTeam.abbr);
    line.punts++;
    line.puntYds += res.gross;
    this.log.push(this.entry('punt', `${p.firstName[0]}.${p.lastName} ${res.text}`, 0));
    this.runClock(res.touchback || res.fairCatch ? 5 : 9);
    this.recoverAll(50);
    if (res.td) {
      this.changePossession(99);
      this.addScore(s.possession, 6);
      this.afterTouchdown(s.possession);
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
    const res = kickFieldGoal(this.rng, k, dist, { x: 0, y: 0 }, late ? 1 : 0);
    const line = this.box.line(k, this.off.abbr);
    line.fga++;
    const fgEntry = this.entry('fg', `${dist}-yard field goal by ${k.firstName[0]}.${k.lastName} is ${res.good ? 'GOOD' : res.blocked ? 'BLOCKED' : `NO GOOD (${res.miss})`}`, 0);
    fgEntry.fgGood = res.good;
    fgEntry.fgDistance = dist;
    this.log.push(fgEntry);
    this.runClock(5);
    this.recoverAll(50);
    if (res.good) {
      line.fgm++;
      line.fgLong = Math.max(line.fgLong, dist);
      this.addScore(s.possession, 3);
      if (!s.over) this.doKickoff(s.possession);
      return;
    }
    // Missed: opponent takes over at the spot of the kick (or the 20).
    const spot = s.yardline - 7;
    this.changePossession(Math.max(20, 100 - spot));
  }

  // ---------------------------------------------------------------- stats

  private recordStats(sim: PlaySim, r: PlayResult, offTeam: Team, defTeam: Team, down: number, dist: number): void {
    const st = r.stats;
    const box = this.box;
    const find = (id?: string) => (id ? sim.agents.find((a) => a.player.id === id)?.player : undefined);
    const t = box.team(offTeam.abbr);
    t.plays++;
    void down;
    void dist;
    const passer = find(st.passer);
    if (r.kind === 'pass' && !st.scramble) {
      const qb = passer ?? sim.qb.player;
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
        if (st.completed && !r.turnover) {
          ql.cmp++;
          const rec = find(st.receiver);
          const yds = r.yards;
          ql.passYds += yds;
          t.passYds += yds;
          t.totalYds += yds;
          if (rec) {
            const rl = box.line(rec, offTeam.abbr);
            rl.rec++;
            rl.recYds += yds;
            rl.recLong = Math.max(rl.recLong, Math.round(yds));
            rl.yac += st.yac ?? 0;
            if (r.score?.kind === 'TD' && r.score.team === 'O') {
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
        const yds = r.turnover ? Math.max(-20, (st.fumbledBy ? 0 : r.yards)) : r.yards;
        rl.rushYds += yds;
        rl.rushLong = Math.max(rl.rushLong, Math.round(yds));
        t.rushYds += yds;
        t.totalYds += yds;
        if (r.score?.kind === 'TD' && r.score.team === 'O') rl.rushTD++;
        if (yds >= 10) t.explosivePlays++;
      }
    }
    for (const id of st.tacklers) {
      const p = find(id);
      if (p && !st.sacked) {
        const l = box.line(p, defTeam.abbr);
        l.tackles += 1 / st.tacklers.length;
        if (r.yards < 0) l.tfl += 1 / st.tacklers.length;
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
    for (const a of sim.agents) if (a.missedTackles) box.line(a.player, defTeam.abbr).missedTackles += a.missedTackles;
  }

  /** Remove the yardage credited for a play wiped out by a penalty. */
  private undoPlayStats(sim: PlaySim, r: PlayResult, offTeam: Team, defTeam: Team): void {
    const st = r.stats;
    const t = this.box.team(offTeam.abbr);
    const find = (id?: string) => (id ? sim.agents.find((a) => a.player.id === id)?.player : undefined);
    if (r.kind === 'pass' && !st.scramble && st.completed) {
      const qb = find(st.passer) ?? sim.qb.player;
      const ql = this.box.line(qb, offTeam.abbr);
      ql.cmp--;
      ql.att--;
      ql.passYds -= r.yards;
      t.passYds -= r.yards;
      t.totalYds -= r.yards;
      const rec = find(st.receiver);
      if (rec) {
        const rl = this.box.line(rec, offTeam.abbr);
        rl.rec--;
        rl.recYds -= r.yards;
        rl.targets--;
      }
    } else if (r.kind === 'pass' && !st.scramble && st.attempted && !st.sacked) {
      const qb = find(st.passer) ?? sim.qb.player;
      this.box.line(qb, offTeam.abbr).att--;
    } else if (r.kind === 'run' || st.scramble) {
      const rusher = find(st.rusher) ?? sim.qb.player;
      const rl = this.box.line(rusher, offTeam.abbr);
      rl.rushAtt--;
      rl.rushYds -= r.yards;
      t.rushYds -= r.yards;
      t.totalYds -= r.yards;
    }
    void defTeam;
  }
}

// ------------------------------------------------------------------ text

function nameOf(team: Team, id: string): string {
  const p = team.roster.find((x) => x.id === id);
  return p ? `${p.firstName[0]}.${p.lastName}` : 'unknown';
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
