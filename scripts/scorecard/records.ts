/**
 * Compact per-game and per-play records for the scorecard. Workers turn each
 * simulated game into a GameRec; every metric and split is then computed
 * from these records, so adding a metric never needs a new simulation.
 */
import { Rng } from '../../src/core/rng.js';
import { generateTeam, withIdentity, type Team } from '../../src/league/team.js';
import type { GameResult, PlayLog } from '../../src/game/game.js';
import type { PlayStats } from '../../src/sim/types.js';
import type { WeirdEvent } from './weird/types.js';

export interface PlayRec {
  kind: 'run' | 'pass';
  down: number;
  dist: number;
  /** Yards from the offense's own goal line. */
  yl: number;
  quarter: number;
  concept: string;
  coverage: string;
  family: string;
  formation: string;
  personnel: string;
  playAction: boolean;
  yards: number;
  /** Pass attempt (not a sack or scramble). */
  att: boolean;
  comp: boolean;
  sack: boolean;
  int: boolean;
  td: boolean;
  scramble: boolean;
  throwaway: boolean;
  air?: number;
  yac?: number;
  sep?: number;
  ttt?: number;
  ybc?: number;
  missed: number;
  broken: number;
  /** Unique failed defenders in the initial offensive carry; absent on legacy records. */
  failedTackleOpportunities?: number;
  firstDown: boolean;
}

export interface GameRec {
  game: number;
  league: number;
  seed: number;
  home: string;
  away: string;
  /** Points by both teams. */
  points: number;
  totalYds: number;
  penalties: number;
  third: number;
  thirdConv: number;
  fga: number;
  fgm: number;
  xpa: number;
  xpm: number;
  fumLost: number;
  punts: number;
  tie: boolean;
  /** Elapsed milliseconds around simulateGame, excluding roster/probe/record work. Not CPU time. */
  ms: number;
  /** Actual pre-simulation teams/options/seed identity. Absent on legacy records. */
  inputSha256?: string;
  plays: PlayRec[];
  /** Additive game-layer measurements; absent on older saved cards. */
  gameLayer?: GameLayerRec;
  /** Film weirdness events (capped per detector, worst first) and the detector time; absent when the probe is off. */
  weird?: { events: WeirdEvent[]; ms: number };
  /** Sums contributed by probes (see probes.ts), keyed `<probe>.<name>`. */
  probe: Record<string, number>;
}

export interface GameLayerRec {
  fieldGoals: Array<{ distance?: number; good?: boolean }>;
  kicks: Array<Partial<NonNullable<PlayLog['kick']>> & { kind: NonNullable<PlayLog['kick']>['kind'] }>;
  puntGrossYards: number;
  fourthOpportunities: number;
  fourthGoes: number;
  fourthAttempts: number;
  fourthConversions: number;
  twoPointChoices: number;
  touchdowns: number;
  drives: number;
  drivePoints: number;
  redZoneTrips: number;
  redZoneTDs: number;
  turnovers: number;
  penaltiesByType: Record<string, number>;
}

/** Observe completed records only; never call a controller, sample RNG or
 * alter a game. Drives are offensive possessions with a logged offensive
 * action (including kneels/dead-ball fouls), separated at kicks, halftime,
 * scores and possession changes. Return scores are not offensive drive points;
 * a touchdown's Try is included. Two-point choices count a re-Try once.
 * Fourth-down go opportunities exclude kneels, replayed downs and Q4 <=150s.
 * Conversion rate separately uses all official fourth-down box credit. */
export function gameLayerRecord(res: GameResult): GameLayerRec {
  const r: GameLayerRec = { fieldGoals: [], kicks: [], puntGrossYards: 0,
    fourthOpportunities: 0, fourthGoes: 0, fourthAttempts: 0, fourthConversions: 0,
    twoPointChoices: 0, touchdowns: 0, drives: 0, drivePoints: 0,
    redZoneTrips: 0, redZoneTDs: 0, turnovers: 0, penaltiesByType: {} };
  for (const team of [res.home, res.away]) {
    // BoxScore.team() creates missing entries. Inspect the completed ledger
    // directly so even extracting an empty game cannot mutate its result.
    const box = res.box.teams?.[team.abbr], empty = res.box.teams ? 0 : NaN;
    r.fourthAttempts += box?.fourthAtt ?? empty;
    r.fourthConversions += box?.fourthConv ?? empty;
    r.redZoneTrips += box?.redZoneTrips ?? empty;
    r.redZoneTDs += box?.redZoneTDs ?? empty;
    r.turnovers += box?.turnovers ?? empty;
    for (const line of res.box.teamPlayers(team.abbr)) r.puntGrossYards += line.puntYds;
  }
  let drive: string | undefined, period = 0, inTry = false;
  for (const [i, p] of res.log.entries()) {
    // The plural ledger supersedes its copied legacy singular alias.
    for (const f of p.fouls ?? (p.foul ? [p.foul] : [])) {
      if (f.accepted && !('offset' in f && f.offset))
        r.penaltiesByType[f.kind] = (r.penaltiesByType[f.kind] ?? 0) + 1;
    }
    const scoreAfter = res.log[i + 1]?.score ?? res.score;
    const side = p.offense === res.home.abbr ? 'home' : 'away';
    const ownPoints = p.score && scoreAfter ? scoreAfter[side] - p.score[side] : NaN;
    if (p.kind !== 'xp' && p.kind !== 'two') {
      if (p.score && scoreAfter) {
        // A TD may appear with its already scored XP in the next snapshot.
        for (const s of ['home', 'away'] as const) {
          const points = scoreAfter[s] - p.score[s];
          if (points >= 6 && points <= 8) r.touchdowns++;
        }
      } else r.touchdowns = NaN;
    }
    if (p.kind === 'xp' || p.kind === 'two') {
      if (!inTry && p.kind === 'two') r.twoPointChoices++;
      inTry = true;
      if (drive === p.offense) r.drivePoints += ownPoints;
      continue;
    }
    inTry = false;
    if (p.kind === 'kickoff') {
      if (!p.kick?.retry) r.kicks.push(p.kick ?? { kind: 'kickoff' });
      drive = undefined;
      continue;
    }
    // Quarters 1->2/3->4 keep possession. Halftime and the first OT do not.
    const half = p.quarter <= 2 ? 1 : p.quarter <= 4 ? 2 : 3;
    if (half !== period) { drive = undefined; period = half; }
    if (drive !== p.offense) { r.drives++; drive = p.offense; }
    r.drivePoints += ownPoints;
    const charged = p.officialCredit?.downAttempt ?? (!p.nullified && !!p.stats);
    if (p.down === 4 && !(p.quarter === 4 && p.clock <= 150)
      && ((charged && (p.kind === 'run' || p.kind === 'pass'))
        || (!p.nullified && (p.kind === 'punt' || p.kind === 'fg')))) {
      r.fourthOpportunities++;
      if (p.kind === 'run' || p.kind === 'pass') r.fourthGoes++;
    }
    if (p.kind === 'fg' && !p.nullified)
      r.fieldGoals.push({ distance: p.fgDistance,
        good: Number.isFinite(ownPoints) ? ownPoints === 3 : p.fgGood });
    if (p.kind === 'punt' && !p.nullified) r.kicks.push(p.kick ?? { kind: 'punt' });
    const segments = p.officialCredit?.segments ?? (!p.nullified ? p.segments : undefined);
    if ((!p.nullified && (p.kind === 'punt' || p.kind === 'fg'))
      || segments?.some(s => s.team === 'D')) drive = undefined;
  }
  return r;
}

const TEAM_NAMES = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];

/** An 8-team league, generated exactly as calibrate.ts does. */
export function makeLeague(seed: number, n: number): Team[] {
  const lr = new Rng(seed).fork(`league-${n}`);
  return TEAM_NAMES.map((name) => {
    const tr = lr.fork(name);
    // Identities salted by the league seed: alignment habits sample the league
    // instead of the same eight on every seed (rosters unchanged).
    return withIdentity(generateTeam(tr, name, name.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) }), `${seed}-${n}`);
  });
}

export interface GameSpec {
  game: number;
  league: number;
  home: number;
  away: number;
  seed: number;
}

/**
 * The game list depends only on (seed, games, leagues) and each game's own
 * stream, so any subset can run in any worker and arms replay identical games.
 */
export function gameSpecs(seed: number, games: number, leagues: number): GameSpec[] {
  const per = Math.ceil(games / leagues);
  const root = new Rng(seed);
  const specs: GameSpec[] = [];
  for (let g = 0; g < games; g++) {
    const r = root.fork(`game-${g}`);
    const home = r.int(0, TEAM_NAMES.length - 1);
    let away = r.int(0, TEAM_NAMES.length - 2);
    if (away >= home) away++;
    specs.push({ game: g, league: Math.floor(g / per), home, away, seed: r.nextU32() });
  }
  return specs;
}

export function gameRecord(spec: GameSpec, res: GameResult, ms: number,
  failedTackles?: (stats: PlayStats) => number | undefined): GameRec {
  const rec: GameRec = {
    game: spec.game, league: spec.league, seed: spec.seed, home: res.home.abbr, away: res.away.abbr,
    points: res.score.home + res.score.away, totalYds: 0, penalties: 0, third: 0, thirdConv: 0,
    fga: 0, fgm: 0, xpa: 0, xpm: 0, fumLost: 0, punts: 0, tie: res.score.home === res.score.away,
    ms, plays: [], probe: {},
  };
  for (const t of [res.home, res.away]) {
    const tl = res.box.team(t.abbr);
    rec.third += tl.thirdAtt;
    rec.thirdConv += tl.thirdConv;
    rec.penalties += tl.penalties;
    rec.totalYds += tl.totalYds;
    for (const l of res.box.teamPlayers(t.abbr)) {
      rec.fga += l.fga;
      rec.fgm += l.fgm;
      rec.xpa += l.xpa;
      rec.xpm += l.xpm;
      rec.fumLost += l.fumblesLost;
      rec.punts += l.punts;
    }
  }
  for (const p of res.log) {
    if (p.kind !== 'run' && p.kind !== 'pass') continue;
    // Official plays only, as in calibrate.ts.
    if (p.nullified || !p.stats) continue;
    // Physical stats remain on the tape; statistical corrections belong to
    // the explicit official view. Older logs may not carry that view.
    const st = p.officialCredit?.stats ?? p.stats;
    const pass = p.kind === 'pass';
    const att = pass && !st.sacked && !st.scramble && !!st.attempted;
    const comp = att && !!st.completed && !st.interceptedBy;
    // NFL air yards: LOS-to-catch on completions, LOS-to-target/aim on other
    // throws, bounded at the opponent's goal line (nflverse PBP convention).
    // Intended airYards can differ from achieved completedAirYards. Missing
    // achieved depth stays unknown rather than substituting the intended one.
    const depth = comp ? st.completedAirYards : st.airYards;
    const goalDepth = Math.round((100 - p.yardline) * 100) / 100;
    rec.plays.push({
      kind: p.kind,
      down: p.down,
      dist: p.distance,
      yl: p.yardline,
      quarter: p.quarter,
      concept: p.plan?.concept ?? '?',
      coverage: p.plan?.coverage ?? '?',
      family: p.plan?.family ?? p.plan?.coverage ?? '?',
      formation: p.plan?.formation ?? '?',
      personnel: p.plan?.personnel ?? '?',
      playAction: !!p.plan?.playAction,
      yards: p.officialCredit?.yards ?? p.yards,
      att,
      comp,
      sack: pass && !!st.sacked,
      int: att && !!st.interceptedBy,
      td: p.text.includes('TOUCHDOWN'),
      scramble: pass && !st.sacked && !!st.scramble,
      throwaway: !!st.throwaway,
      air: att && !st.throwaway && depth !== undefined ? Math.min(depth, goalDepth) : undefined,
      yac: comp ? st.yac : undefined,
      sep: att && !st.throwaway ? st.separation : undefined,
      ttt: pass ? st.timeToThrow : undefined,
      ybc: p.kind === 'run' ? st.yardsBeforeContact : undefined,
      missed: st.missedTackles,
      broken: st.brokenTackles,
      // Native-event capture is keyed to the original stats object, even
      // when official statistical credit uses a corrected copy.
      failedTackleOpportunities: failedTackles?.(p.stats),
      firstDown: !!p.firstDown,
    });
  }
  rec.gameLayer = gameLayerRecord(res);
  return rec;
}
