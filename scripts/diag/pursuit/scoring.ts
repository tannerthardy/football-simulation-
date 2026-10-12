/** Where the yards come from: plays, yards, completions, YAC and explosive
 * plays per game. Usage: --seed 101 --games 4 [env flags] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4'));
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const c: Record<string, number> = {};
const add = (k: string, v = 1) => { c[k] = (c[k] ?? 0) + v; };
let pts = 0;
for (let g = 0; g < games; g++) {
  const r = simulateGame(home, away, { seed: seed + g });
  pts += r.score.home + r.score.away;
  for (const p of r.log) {
    if ((p.kind === 'run' || p.kind === 'pass') && !p.nullified) {
      add(`${p.kind} plays`); add(`${p.kind} yards`, p.yards);
      if (p.yards >= 20) add(`${p.kind} 20+`);
      if (p.kind === 'pass' && p.stats && (p.stats as { completed?: boolean }).completed) {
        add('completions'); const yac = (p.stats as { yac?: number }).yac; if (yac !== undefined) { add('yac', yac); if (yac >= 20) add('yac 20+'); }
      }
    }
  }
}
console.log(`seed ${seed} games ${games}: points per team ${(pts / games / 2).toFixed(1)}`);
for (const k of Object.keys(c).sort()) console.log(`  ${k}: ${(c[k] / games).toFixed(1)} per game`);
