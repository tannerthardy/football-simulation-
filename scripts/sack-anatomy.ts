/**
 * Sack anatomy, measured like the NFL tracking summary
 * (data/bdb2025-summary.json: labels.passing and tracking.pressure):
 * sack and scramble rates per dropback, time to throw and time to sack,
 * pressure as a defender within 2 yards of the QB before the throw, time to
 * that pressure, and what happens after it (throw, throwaway, scramble, sack).
 *   npx tsx scripts/sack-anatomy.ts [games] [seed] [leagues]
 */
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';

const [gamesStr = '24', seedStr = '7', leaguesStr = '3'] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Number(leaguesStr);
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
let teams: Team[] = [];

const ttt: number[] = [];
const tts: number[] = [];
const ttp: number[] = [];
const afterPressure: Record<string, number> = {};
const pressureToSack: number[] = [];
const pressureToOutcome: number[] = [];
const tttClean: number[] = [];
const tttPressured: number[] = [];
const sackers: Record<string, number> = {};
let dropbacks = 0;
let sacks = 0;
let scrambles = 0;
let pressured = 0;
let sacksUnengaged = 0;

for (let g = 0; g < games; g++) {
  if (g % per === 0) {
    const lr = rng.fork(`league-${g / per}`);
    teams = names.map((n) => {
      const tr = lr.fork(n);
      return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
    });
  }
  const i = rng.int(0, 7);
  let j = rng.int(0, 6);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const rp = p.replay;
    if (!rp || p.kind !== 'pass' || p.nullified || !p.stats) continue;
    dropbacks++;
    const st = p.stats;
    const qbI = rp.players.findIndex((x) => x.slot === 'QB');
    const throwT = rp.events.find((e) => e.type === 'throw' || e.type === 'throwaway')?.t;
    const sackT = rp.events.find((e) => e.type === 'sack')?.t;
    const end = throwT ?? sackT ?? (st.scramble ? rp.events.find((e) => e.type === 'scramble')?.t : undefined) ?? 99;
    let first = -1;
    for (const f of rp.frames) {
      if (f.t > end + 1e-6) break;
      // From 0.5 s, like the NFL extractor (skips the crowd at the snap).
      if (f.t < 0.5) continue;
      const qx = f.agents[qbI * 3];
      const qy = f.agents[qbI * 3 + 1];
      for (let k = 0; k < rp.players.length; k++) {
        if (rp.players[k].team !== 'D') continue;
        if (Math.hypot(f.agents[k * 3] - qx, f.agents[k * 3 + 1] - qy) < 2) {
          first = f.t;
          break;
        }
      }
      if (first >= 0) break;
    }
    if (st.sacked) {
      sacks++;
      if (sackT !== undefined) tts.push(sackT);
      for (const id of st.sackedBy ?? []) {
        const slot = rp.players.find((x, k) => x.team === 'D' && res.home.roster.concat(res.away.roster).find((pl) => pl.id === id) && k >= 0)?.slot;
        void slot;
      }
      if (rp.events.some((e) => e.type === 'sack' && e.note === 'unblocked')) sacksUnengaged++;
    } else if (st.scramble) scrambles++;
    else if (throwT !== undefined) ttt.push(throwT);
    if (first >= 0) {
      pressured++;
      ttp.push(first);
      const what = st.sacked ? 'sack' : st.scramble ? 'scramble' : 'throw';
      afterPressure[what] = (afterPressure[what] ?? 0) + 1;
      if (st.sacked && sackT !== undefined) pressureToSack.push(sackT - first);
      if (end < 99) pressureToOutcome.push(end - first);
      if (throwT !== undefined) tttPressured.push(throwT);
    } else if (throwT !== undefined) tttClean.push(throwT);
    for (const e of rp.events) if (e.type === 'sack' && e.a !== undefined) {
      const slot = rp.players[e.a]?.slot ?? '?';
      sackers[slot] = (sackers[slot] ?? 0) + 1;
    }
  }
}

const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN;
};
const dist = (xs: number[]) => `n ${xs.length}, mean ${(xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2)}, p10 ${q(xs, 0.1).toFixed(2)}, p50 ${q(xs, 0.5).toFixed(2)}, p90 ${q(xs, 0.9).toFixed(2)}`;
console.log(`${games} games, ${dropbacks} dropbacks`);
console.log(`sack ${((100 * sacks) / dropbacks).toFixed(2)}%   [NFL 6.24%]   scramble ${((100 * scrambles) / dropbacks).toFixed(2)}%   [NFL 4.11%]`);
console.log(`time to throw   ${dist(ttt)}   [NFL mean 2.75, p10 1.70, p50 2.59, p90 3.94]`);
console.log(`time to sack    ${dist(tts)}   [NFL mean 4.52, p10 3.11, p50 4.25, p90 6.21]`);
console.log(`pressure (defender within 2 yd before throw) ${((100 * pressured) / dropbacks).toFixed(1)}%   [NFL 32.5%]`);
console.log(`time to pressure ${dist(ttp)}   [NFL mean 2.82, p10 2.0, p50 2.7, p90 4.1]`);
console.log(`after pressure: ${Object.entries(afterPressure).map(([k, v]) => `${k} ${((100 * v) / pressured).toFixed(1)}%`).join(', ')}`);
console.log(`pressure → sack time ${dist(pressureToSack)}`);
console.log(`pressure → release/sack/scramble ${dist(pressureToOutcome)}`);
console.log(`time to throw clean     ${dist(tttClean)}`);
console.log(`time to throw pressured ${dist(tttPressured)}`);
console.log(`sacks credited by slot: ${JSON.stringify(sackers)}  unblocked-noted ${sacksUnengaged}`);
