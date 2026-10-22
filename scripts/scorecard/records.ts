/**
 * Compact per-game and per-play records for the scorecard. Workers turn each
 * simulated game into a GameRec; every metric and split is then computed
 * from these records, so adding a metric never needs a new simulation.
 */
import { Rng } from '../../src/core/rng.js';
import { generateTeam, type Team } from '../../src/league/team.js';
import type { GameResult } from '../../src/game/game.js';

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
  /** Sums contributed by probes (see probes.ts), keyed `<probe>.<name>`. */
  probe: Record<string, number>;
}

const TEAM_NAMES = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];

/** An 8-team league, generated exactly as calibrate.ts does. */
export function makeLeague(seed: number, n: number): Team[] {
  const lr = new Rng(seed).fork(`league-${n}`);
  return TEAM_NAMES.map((name) => {
    const tr = lr.fork(name);
    return generateTeam(tr, name, name.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
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

export function gameRecord(spec: GameSpec, res: GameResult, ms: number): GameRec {
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
    const st = p.stats;
    const pass = p.kind === 'pass';
    const att = pass && !st.sacked && !st.scramble && !!st.attempted;
    const comp = att && !!st.completed && !st.interceptedBy;
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
      yards: p.yards,
      att,
      comp,
      sack: pass && !!st.sacked,
      int: att && !!st.interceptedBy,
      td: p.text.includes('TOUCHDOWN'),
      scramble: pass && !st.sacked && !!st.scramble,
      throwaway: !!st.throwaway,
      air: att && !st.throwaway ? st.airYards : undefined,
      yac: comp ? st.yac : undefined,
      sep: att && !st.throwaway ? st.separation : undefined,
      ttt: pass ? st.timeToThrow : undefined,
      ybc: p.kind === 'run' ? st.yardsBeforeContact : undefined,
      missed: st.missedTackles,
      broken: st.brokenTackles,
      firstDown: !!p.firstDown,
    });
  }
  return rec;
}
