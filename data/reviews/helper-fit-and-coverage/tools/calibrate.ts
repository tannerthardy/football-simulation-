/**
 * Calibration harness: simulate many games and compare league output with
 * NFL baselines.
 *   npx tsx scripts/calibrate.ts [games] [seed] [leagues]
 *
 * Games are spread over `leagues` independently generated 8-team leagues
 * (default one per 8 games): outcomes such as sack rate depend strongly on
 * the rosters, so a single league is not a reliable sample.
 */
import { Rng } from '../src/core/rng.js';
import { generateTeam, type Team } from '../src/league/team.js';
import { simulateGame } from '../src/game/game.js';

const [gamesStr = '20', seedStr = '7', leaguesStr] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Math.max(1, Math.min(games, Number(leaguesStr ?? Math.ceil(games / 8))));
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const makeLeague = (n: number): Team[] => {
  const lr = rng.fork(`league-${n}`);
  // Each team has its own stream, so changing how one team is generated
  // doesn't reshuffle the others.
  return names.map((name) => {
    const tr = lr.fork(name);
    return generateTeam(tr, name, name.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
  });
};
let teams = makeLeague(0);
/** Per-league outcome rates, to show how much rosters move them. */
const perLeague: Array<{ points: number; teamGames: number; passYds: number; passAtt: number; sacks: number; dropbacks: number; rushYds: number; rushAtt: number }> = [];
const fresh = () => ({ points: 0, teamGames: 0, passYds: 0, passAtt: 0, sacks: 0, dropbacks: 0, rushYds: 0, rushAtt: 0 });
perLeague.push(fresh());

const acc = {
  teamGames: 0, points: 0, plays: 0, passAtt: 0, comp: 0, passYds: 0, sacks: 0, dropbacks: 0, ints: 0, passTD: 0,
  rushAtt: 0, rushYds: 0, stuffs: 0, run10: 0, comp20: 0, air: 0, airN: 0, yac: 0, yacN: 0, ttt: 0, tttN: 0,
  pressured: 0, third: 0, thirdConv: 0, fga: 0, fgm: 0, xpa: 0, xpm: 0, fumLost: 0, penalties: 0, punts: 0, scrambles: 0, drives: 0, td: 0,
  firstDowns: 0, ybc: 0, ybcN: 0, missed: 0, broken: 0, ties: 0, totalYds: 0,
  sep: 0, sepN: 0, tight: 0, qbReadN: 0, qbFam: 0, audibles: 0,
};
const COVER_FAMILY: Record<string, string> = { cover0: '0 man', cover1: '1 man', cover3: '1 zone', cover2: '2 zone', tampa2: '2 zone', cover4: '2 zone', cover6: '2 zone', cover2man: '2 man' };
const t0 = performance.now();
const perLeagueGames = Math.ceil(games / leagues);
for (let g = 0; g < games; g++) {
  if (g > 0 && g % perLeagueGames === 0) {
    teams = makeLeague(perLeague.length);
    perLeague.push(fresh());
  }
  const lg = perLeague[perLeague.length - 1];
  const before = { passYds: acc.passYds, passAtt: acc.passAtt, sacks: acc.sacks, dropbacks: acc.dropbacks, rushYds: acc.rushYds, rushAtt: acc.rushAtt };
  const i = rng.int(0, teams.length - 1);
  let j = rng.int(0, teams.length - 2);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
  acc.teamGames += 2;
  acc.points += res.score.home + res.score.away;
  lg.teamGames += 2;
  lg.points += res.score.home + res.score.away;
  if (res.score.home === res.score.away) acc.ties++;
  for (const t of [res.home, res.away]) {
    const tl = res.box.team(t.abbr);
    acc.third += tl.thirdAtt;
    acc.thirdConv += tl.thirdConv;
    acc.penalties += tl.penalties;
    acc.firstDowns += tl.firstDowns;
    acc.totalYds += tl.totalYds;
    for (const l of res.box.teamPlayers(t.abbr)) {
      acc.fga += l.fga;
      acc.fgm += l.fgm;
      acc.xpa += l.xpa;
      acc.xpm += l.xpm;
      acc.fumLost += l.fumblesLost;
      acc.punts += l.punts;
    }
  }
  for (const p of res.log) {
    if (p.kind !== 'run' && p.kind !== 'pass') continue;
    // Official metrics: plays wiped out by an accepted foul don't count.
    if (p.nullified) continue;
    const st = p.stats!;
    acc.plays++;
    acc.missed += st.missedTackles;
    acc.broken += st.brokenTackles;
    if (st.qbRead?.audible) acc.audibles++;
    if (p.kind === 'pass' && st.qbRead) {
      acc.qbReadN++;
      const fam = (c: string) => (COVER_FAMILY[c] ?? c);
      if (fam(st.qbRead.post ?? st.qbRead.pre) === fam(st.qbRead.actual)) acc.qbFam++;
    }
    if (p.kind === 'pass') {
      acc.dropbacks++;
      if (st.sacked) acc.sacks++;
      else if (st.scramble) acc.scrambles++;
      else if (st.attempted) {
        acc.passAtt++;
        if (st.completed && !st.interceptedBy) {
          acc.comp++;
          acc.passYds += p.yards;
          if (p.yards >= 20) acc.comp20++;
          if (st.yac !== undefined) {
            acc.yac += st.yac;
            acc.yacN++;
          }
          if (p.text.includes('TOUCHDOWN')) acc.passTD++;
        }
        if (st.interceptedBy) acc.ints++;
        if (st.separation !== undefined && !st.throwaway) {
          acc.sep += st.separation;
          acc.sepN++;
          if (st.separation < 1) acc.tight++;
        }
        if (st.airYards !== undefined && !st.throwaway) {
          acc.air += st.airYards;
          acc.airN++;
        }
      }
      if (st.timeToThrow !== undefined) {
        acc.ttt += st.timeToThrow;
        acc.tttN++;
      }
      if (st.pressured) acc.pressured++;
    }
    if (p.kind === 'run' || st.scramble) {
      if (p.kind === 'run') {
        acc.rushAtt++;
        acc.rushYds += p.yards;
        if (p.yards <= 0) acc.stuffs++;
        if (p.yards >= 10) acc.run10++;
        if (st.yardsBeforeContact !== undefined) {
          acc.ybc += st.yardsBeforeContact;
          acc.ybcN++;
        }
      }
    }
  }
  for (const k of ['passYds', 'passAtt', 'sacks', 'dropbacks', 'rushYds', 'rushAtt'] as const) lg[k] += acc[k] - before[k];
}
const ms = performance.now() - t0;
const tg = acc.teamGames;
const rows: Array<[string, number, number, number, string]> = [
  ['Points / team-game', acc.points / tg, 21, 23.5, ''],
  ['Scrimmage plays / team-game', acc.plays / tg, 61, 65, ''],
  ['Total yards / team-game', acc.totalYds / tg, 320, 345, ''],
  ['Completion %', (100 * acc.comp) / acc.passAtt, 63, 66, '%'],
  ['Yards / attempt', acc.passYds / acc.passAtt, 6.8, 7.2, ''],
  ['Sack rate (per dropback)', (100 * acc.sacks) / acc.dropbacks, 6, 7.5, '%'],
  ['INT rate', (100 * acc.ints) / acc.passAtt, 2, 2.5, '%'],
  ['Pass TD rate', (100 * acc.passTD) / acc.passAtt, 4, 4.8, '%'],
  ['20+ yd completions / att', (100 * acc.comp20) / acc.passAtt, 7, 9, '%'],
  ['aDOT', acc.air / acc.airN, 7.5, 8.5, ''],
  ['YAC / reception', acc.yac / acc.yacN, 4.8, 5.6, ''],
  ['Time to throw', acc.ttt / acc.tttN, 2.7, 2.9, 's'],
  // This is a QB perception flag (arrival estimate plus block resistance),
  // not the NFL tracking distance proxy. Do not score it against that rate.
  ['QB sensed pressure (internal)', (100 * acc.pressured) / acc.dropbacks, NaN, NaN, '%'],
  ['Scramble rate', (100 * acc.scrambles) / acc.dropbacks, 3, 5, '%'],
  ['Rush yards / carry', acc.rushYds / acc.rushAtt, 4.1, 4.5, ''],
  ['Run stuff rate (<=0)', (100 * acc.stuffs) / acc.rushAtt, 16, 20, '%'],
  ['10+ yd runs', (100 * acc.run10) / acc.rushAtt, 10, 12, '%'],
  ['Yards before contact (runs)', acc.ybc / Math.max(1, acc.ybcN), 1.5, 2.3, ''],
  ['Pass rate (dropbacks / plays)', (100 * acc.dropbacks) / acc.plays, 56, 62, '%'],
  ['3rd-down conversion', (100 * acc.thirdConv) / acc.third, 37, 41, '%'],
  ['FG %', (100 * acc.fgm) / Math.max(1, acc.fga), 83, 87, '%'],
  ['XP %', (100 * acc.xpm) / Math.max(1, acc.xpa), 94, 97, '%'],
  ['Fumbles lost / team-game', acc.fumLost / tg, 0.4, 0.7, ''],
  ['Punts / team-game', acc.punts / tg, 3.5, 4.5, ''],
  ['Penalties / team-game (pre-snap+holding)', acc.penalties / tg, 2.5, 4, ''],
  // Next Gen Stats (2022–24 league averages for qualifying players).
  ['NGS separation at catch/incompletion', acc.sep / Math.max(1, acc.sepN), 2.8, 3.2, ''],
  ['NGS tight-window throws (<1 yd)', (100 * acc.tight) / Math.max(1, acc.sepN), 13, 17, '%'],
  ['QB coverage family read right', (100 * acc.qbFam) / Math.max(1, acc.qbReadN), 70, 90, '%'],
  ['Checks at the line / play', (100 * acc.audibles) / acc.plays, 2, 8, '%'],
  // PFF-style missed tackles: whiffs plus broken tackles.
  ['Missed + broken tackles / play', (acc.missed + acc.broken) / acc.plays, 0.11, 0.16, ''],
];
console.log(`\n${games} games, ${acc.plays} scrimmage plays in ${(ms / 1000).toFixed(1)} s (${(ms / games).toFixed(0)} ms/game), ties ${acc.ties}`);
console.log('metric'.padEnd(42) + 'sim'.padStart(9) + '   target');
for (const [name, v, lo, hi, unit] of rows) {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    console.log(`${name.padEnd(42)}${v.toFixed(2).padStart(9)}${unit.padEnd(2)} internal; no NFL target`);
    continue;
  }
  const ok = v >= lo && v <= hi ? 'OK ' : v < lo ? 'LOW' : 'HIGH';
  console.log(`${name.padEnd(42)}${v.toFixed(2).padStart(9)}${unit.padEnd(2)} ${lo}–${hi}  ${ok}`);
}
if (perLeague.length > 1) {
  const spread = (f: (l: (typeof perLeague)[number]) => number) => {
    const v = perLeague.map(f);
    return `${Math.min(...v).toFixed(2)}–${Math.max(...v).toFixed(2)}`;
  };
  console.log(`\nRange across ${perLeague.length} leagues (${perLeagueGames} games each):`);
  console.log(`  points/team-game ${spread((l) => l.points / l.teamGames)}, YPA ${spread((l) => l.passYds / l.passAtt)}, sack % ${spread((l) => (100 * l.sacks) / l.dropbacks)}, YPC ${spread((l) => l.rushYds / l.rushAtt)}`);
}
