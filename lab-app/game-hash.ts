/**
 * The scorecard's games-identical hash (scripts/weird-identity.ts: play log,
 * score and box score) over an ordinary game. Never imports the lab engine,
 * so a fresh process gives the no-lab answer.
 *   node --import tsx lab-app/game-hash.ts [seed] [plays]   (plays 0 = whole game)
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Rng } from '../src/core/rng.js';
import { Game, simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';

export function gameHash(seed: number, plays = 0): string {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let res;
  if (plays > 0) {
    const game = new Game(home, away, { seed, record: false });
    game.kickoffToStart(); for (let n = 0; n < plays; n++) game.step();
    res = game.result();
  } else res = simulateGame(home, away, { seed, record: false });
  return createHash('sha256').update(JSON.stringify({ log: res.log, score: res.score, box: res.box })).digest('hex');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(gameHash(Number(process.argv[2] ?? 7), Number(process.argv[3] ?? 0)));
}
