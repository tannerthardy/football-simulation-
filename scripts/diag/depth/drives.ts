/** Where the points come from in simulated games (observation only; flags
 * from the environment). Splits each game log into drives (consecutive
 * scrimmage snaps by one offense) and reports drives per team-game, drive
 * results, points per drive, plays and yards per drive, how touchdowns are
 * reached (a 20+ yard snap on the drive, the scoring snap's length), and
 * success by down. Same team generation as depth/games.ts.
 * node --import tsx scripts/diag/depth/drives.ts [--seed 101] [--games 8] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame, type PlayLog } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const SNAP = new Set(['run', 'pass', 'punt', 'fg', 'kneel', 'penalty']);
type Drive = { plays: PlayLog[]; result: string; points: number; start: number };
const drives: Drive[] = [];
let teamGames = 0;
const downs: Record<number, { n: number; conv: number; gain: number[] }> = {};
/** Points by the kind of play they were scored on (offense of record vs the other side). */
const byKind: Record<string, number> = {};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  const r = simulateGame(home, away, { seed });
  teamGames += 2;
  const side = (abbr: string) => abbr === home.abbr ? 'home' : 'away';
  // A log entry carries the score before its play; what the play scored
  // shows on the next entry (or the final score).
  const after = (i: number) => r.log[i + 1]?.score ?? r.score;
  let cur: PlayLog[] = [];
  const close = (score: { home: number; away: number }, next?: PlayLog) => {
    if (!cur.length) return;
    const off = side(cur[0].offense), opp = off === 'home' ? 'away' : 'home', end = cur[cur.length - 1];
    const before = cur[0].score, points = score[off] - before[off];
    const crossedHalf = next && end.quarter <= 2 && next.quarter >= 3;
    const result = points >= 6 ? 'TD' : end.kind === 'fg' ? (end.fgGood ? 'FG' : 'FG miss') : end.kind === 'punt' ? 'punt'
      : score[opp] > before[opp] ? 'def score'
      : /intercept|fumble/i.test(end.text) ? 'turnover' : !next || crossedHalf ? 'half/game end' : end.down === 4 ? 'downs' : 'turnover';
    drives.push({ plays: cur, result, points, start: cur[0].yardline });
    cur = [];
  };
  r.log.forEach((p, i) => {
    for (const s of ['home', 'away'] as const) {
      const gain = after(i)[s] - p.score[s];
      if (gain > 0) { const who = !SNAP.has(p.kind) ? p.kind : side(p.offense) === s ? `${p.kind} (offense)` : `${p.kind} (defense)`; byKind[who] = (byKind[who] ?? 0) + gain; }
    }
    if (!SNAP.has(p.kind)) {
      if (p.kind === 'kickoff') close(p.score, p);
      return;
    }
    if (cur.length && (p.offense !== cur[0].offense || (cur[cur.length - 1].quarter <= 2 && p.quarter >= 3))) close(p.score, p);
    cur.push(p);
    if ((p.kind === 'run' || p.kind === 'pass') && !p.nullified) {
      const d = downs[p.down] ??= { n: 0, conv: 0, gain: [] };
      d.n++; if (p.firstDown || p.yards >= p.distance) d.conv++; d.gain.push(p.yards);
    }
  });
  close(r.score);
}
const tally = (f: (d: Drive) => boolean) => drives.filter(f).length;
const pct = (n: number, d = drives.length) => `${(100 * n / Math.max(1, d)).toFixed(1)}%`;
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const snaps = (d: Drive) => d.plays.filter(p => (p.kind === 'run' || p.kind === 'pass') && !p.nullified);
console.log(`${games} games: ${drives.length} drives, ${(drives.length / teamGames).toFixed(1)} per team-game (NFL 2022 ~10.8)`);
console.log(`  points/drive ${mean(drives.map(d => Math.max(0, d.points))).toFixed(2)} (NFL ~1.95; offensive scores incl. extra points)`);
const results = ['TD', 'FG', 'FG miss', 'punt', 'turnover', 'downs', 'half/game end', 'def score'];
console.log('  results: ' + results.map(k => `${k} ${pct(tally(d => d.result === k))}`).join(' | '));
console.log('  NFL 2022 approx: TD 21% | FG 15% (miss 2%) | punt 38% | turnover 11% | downs 4% | half/game end 8%');
console.log(`  snaps/drive ${mean(drives.map(d => snaps(d).length)).toFixed(1)} (NFL ~5.9) | yards/drive ${mean(drives.map(d => snaps(d).reduce((a, p) => a + p.yards, 0))).toFixed(1)} (NFL ~31)`);
const td = drives.filter(d => d.result === 'TD');
console.log(`  TD drives ${td.length}: with a 20+ yd snap ${pct(td.filter(d => snaps(d).some(p => p.yards >= 20)).length, td.length)}`
  + ` | scoring snap 20+ yd ${pct(td.filter(d => (snaps(d).at(-1)?.yards ?? 0) >= 20).length, td.length)}`
  + ` | snaps p50 ${[...td.map(d => snaps(d).length)].sort((a, b) => a - b)[td.length >> 1] ?? '-'}`
  + ` | started own ${mean(td.map(d => d.start)).toFixed(0)} vs all drives ${mean(drives.map(d => d.start)).toFixed(0)}`);
const all = drives.flatMap(snaps);
console.log(`  snaps ${all.length}: 20+ yd ${pct(all.filter(p => p.yards >= 20).length, all.length)} (NFL ~3.5%) | 40+ ${pct(all.filter(p => p.yards >= 40).length, all.length)} (NFL ~0.8%)`);
for (const k of [1, 2, 3, 4]) {
  const d = downs[k]; if (!d) continue;
  console.log(`  down ${k}: ${d.n} snaps, gained the line to gain ${pct(d.conv, d.n)} | mean gain ${mean(d.gain).toFixed(2)}`);
}
console.log('  NFL 2022: 3rd-down conversion ~39%, 4th ~50%');
console.log('  points per team-game by the play they were scored on: ' + Object.entries(byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / teamGames).toFixed(1)}`).join(' | '));
