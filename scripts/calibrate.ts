/**
 * Calibration harness: simulate many games and compare league output with
 * NFL baselines.
 *   npx tsx scripts/calibrate.ts [games] [seed]
 */
import { Rng } from '../src/core/rng.js';
import { generateTeam, type Team } from '../src/league/team.js';
import { simulateGame } from '../src/game/game.js';

const [gamesStr = '20', seedStr = '7'] = process.argv.slice(2);
const games = Number(gamesStr);
const rng = new Rng(Number(seedStr));
const teams: Team[] = [];
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
for (let i = 0; i < names.length; i++) teams.push(generateTeam(rng, names[i], names[i].slice(0, 3).toUpperCase(), { strength: rng.range(0.35, 0.75) }));

const acc = {
  teamGames: 0, points: 0, plays: 0, passAtt: 0, comp: 0, passYds: 0, sacks: 0, dropbacks: 0, ints: 0, passTD: 0,
  rushAtt: 0, rushYds: 0, stuffs: 0, run10: 0, comp20: 0, air: 0, airN: 0, yac: 0, yacN: 0, ttt: 0, tttN: 0,
  pressured: 0, third: 0, thirdConv: 0, fga: 0, fgm: 0, xpa: 0, xpm: 0, fumLost: 0, penalties: 0, punts: 0, scrambles: 0, drives: 0, td: 0,
  firstDowns: 0, ybc: 0, ybcN: 0, missed: 0, broken: 0, ties: 0, totalYds: 0,
};
const t0 = performance.now();
for (let g = 0; g < games; g++) {
  const i = rng.int(0, teams.length - 1);
  let j = rng.int(0, teams.length - 2);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
  acc.teamGames += 2;
  acc.points += res.score.home + res.score.away;
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
    const st = p.stats!;
    acc.plays++;
    acc.missed += st.missedTackles;
    acc.broken += st.brokenTackles;
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
  ['Pressure rate', (100 * acc.pressured) / acc.dropbacks, 28, 36, '%'],
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
  ['Missed tackles / play', acc.missed / acc.plays, 0.1, 0.2, ''],
];
console.log(`\n${games} games, ${acc.plays} scrimmage plays in ${(ms / 1000).toFixed(1)} s (${(ms / games).toFixed(0)} ms/game), ties ${acc.ties}`);
console.log('metric'.padEnd(42) + 'sim'.padStart(9) + '   target');
for (const [name, v, lo, hi, unit] of rows) {
  const ok = v >= lo && v <= hi ? 'OK ' : v < lo ? 'LOW' : 'HIGH';
  console.log(`${name.padEnd(42)}${v.toFixed(2).padStart(9)}${unit.padEnd(2)} ${lo}–${hi}  ${ok}`);
}
