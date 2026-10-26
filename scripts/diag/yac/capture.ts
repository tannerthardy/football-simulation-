// Capture every scrimmage pass-call PlaySetup from ordinary games (constructor input only).
// node --import tsx scripts/diag/yac/capture.ts SEED GAMES OUT (all scrimmage pass setups of GAMES ordinary games)
import { writeFileSync } from 'node:fs';
import { serialize } from 'node:v8';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
const [seed0, games, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
const saved: Array<{ game: number; index: number; setup: Buffer }> = [];
const rng = new Rng(seed0);
for (let g = 0; g < games; g++) {
  const home = generateTeam(rng.fork(`h${g}`), 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng.fork(`a${g}`), 'Away', 'AWY', { strength: 0.55 });
  simulateGame(home, away, { seed: rng.nextU32(), hooks: {
    playSetup(setup, ctx) {
      if (ctx.kind === 'scrimmage' && setup.offCall.kind === 'pass') saved.push({ game: g, index: ctx.index, setup: serialize(setup) });
    } } });
  process.stderr.write(`game ${g + 1}: ${saved.length} pass setups\n`);
}
writeFileSync(out, serialize(saved));
