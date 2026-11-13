// Capture every scrimmage PlaySetup (constructor input only).
//   node --import tsx scripts/diag/aim-jump/capture.ts SEED GAMES OUT   ordinary league games (scorecard teams)
//   node --import tsx scripts/diag/aim-jump/capture.ts SEED audit OUT   the audit game of capture-game-play.ts
//     (Ironmen v Comets); `index + 1` is its G1-Pnnn play id, so captureOrdinaryPlay restores the same setup.
import { writeFileSync } from 'node:fs';
import { serialize } from 'node:v8';
import { Rng } from '../../../src/core/rng.js';
import { Game, simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { captureSetup } from '../saved-play.js';
const [seed0, games, out] = [Number(process.argv[2]), process.argv[3], process.argv[4]];
const saved: Array<{ seed: number; game: number; index: number; setup: Buffer }> = [];
if (games === 'audit') {
  const rng = new Rng(seed0);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const game = new Game(home, away, { seed: seed0, record: true, recordLevel: 'full', hooks: {
    playSetup(setup, ctx) { if (ctx.kind === 'scrimmage') saved.push({ seed: seed0, game: -1, index: ctx.index, setup: captureSetup(setup) }); } } });
  game.kickoffToStart();
  while (!game.state.over) game.step();
  process.stderr.write(`audit game: ${saved.length} setups\n`);
} else {
  const rng = new Rng(seed0);
  for (let g = 0; g < Number(games); g++) {
    const home = generateTeam(rng.fork(`h${g}`), 'Home', 'HOM', { strength: 0.55 });
    const away = generateTeam(rng.fork(`a${g}`), 'Away', 'AWY', { strength: 0.55 });
    simulateGame(home, away, { seed: rng.nextU32(), hooks: {
      playSetup(setup, ctx) { if (ctx.kind === 'scrimmage') saved.push({ seed: seed0, game: g, index: ctx.index, setup: captureSetup(setup) }); } } });
    process.stderr.write(`game ${g + 1}: ${saved.length} setups\n`);
  }
}
writeFileSync(out, serialize(saved));
