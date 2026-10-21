/** Game-level outcomes for N simulated games (observation only; flags from the
 * environment): points per team-game, rushing per carry and its tail, pass
 * yards per completion. Same team generation as scripts/sim-game.ts.
 * node --import tsx scripts/diag/depth/games.ts [--seed 101] [--games 8] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const pts: number[] = [], runs: number[] = [], pass: number[] = [];
let sacks = 0, dropbacks = 0;
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  const r = simulateGame(home, away, { seed });
  pts.push(r.score.home, r.score.away);
  for (const p of r.log) {
    if (p.nullified) continue;
    if (p.kind === 'run' && !/kneel/i.test(p.call)) runs.push(p.yards);
    if (p.kind === 'pass') {
      dropbacks++;
      if (/sack/i.test(p.text)) sacks++;
      else if (p.yards !== 0 || /complete/i.test(p.text)) pass.push(p.yards);
    }
  }
}
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const pct = (v: number[], f: (x: number) => boolean) => (100 * v.filter(f).length / Math.max(1, v.length)).toFixed(1);
console.log(`${games} games (seeds ${seed0}-${seed0 + games - 1}): points per team-game ${mean(pts).toFixed(1)} (${pts.join(' ')})`);
console.log(`  runs ${runs.length}: ${mean(runs).toFixed(2)} yd/carry | <0 ${pct(runs, x => x < 0)}% 10+ ${pct(runs, x => x >= 10)}% 20+ ${pct(runs, x => x >= 20)}% 40+ ${pct(runs, x => x >= 40)}%`);
console.log(`  dropbacks ${dropbacks}: sacks ${(100 * sacks / Math.max(1, dropbacks)).toFixed(1)}% | non-sack passes with yards: ${pass.length}, 20+ ${pct(pass, x => x >= 20)}% 40+ ${pct(pass, x => x >= 40)}%`);
