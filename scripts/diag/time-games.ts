/** Wall time per simulated game (development aid). node --import tsx scripts/diag/time-games.ts [games] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const games = Number(process.argv[2] ?? 2);
const rng = new Rng(Number(process.argv[3] ?? 9));
const t0 = Date.now();
let plays = 0;
for (let g = 0; g < games; g++) plays += simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32() }).log.length;
console.log(`${games} games, ${plays} plays, ${((Date.now() - t0) / games / 1000).toFixed(2)} s/game`);
