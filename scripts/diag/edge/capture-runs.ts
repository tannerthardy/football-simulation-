// Run-only captures for matched restages: every scrimmage PlaySetup of the film
// room's run-only games (teams built as run-film-trace.ts builds them, so play i of
// game g is G{g+1}-P{index+1} of `npm run replay -- <seed> --run-only`). Writes
// out/matched-restage/seed<label>.json in matched-restage.ts's format.
//   node --import tsx scripts/diag/edge/capture-runs.ts SEED [--games 1] [--label r11] [--sample-league]
// --sample-league gives the teams per-seed identities and coordinators (leagueSample) so their
// alignment habits sample the league. Off by default: the reference stack's
// fixed run set was captured with the fixed IRN/COM identities.
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import type { PlaySetup } from '../../../src/sim/playsim.js';
import { captureSetup } from '../saved-play.js';
const { values: v, positionals } = parseArgs({ allowPositionals: true, options: { games: { type: 'string', default: '1' }, label: { type: 'string' }, 'sample-league': { type: 'boolean', default: false } } });
const seed = Number(positionals[0]), label = v.label ?? `r${seed}`;
const rng = new Rng(seed);
const id = (t: ReturnType<typeof generateTeam>) => v['sample-league'] ? leagueSample(t, seed) : t;
const home = id(generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 })), away = id(generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }));
const plays: Array<{ pass: boolean; call: string; id: string; setup: string }> = [];
for (let g = 0; g < Number(v.games); g++) {
  let setup: PlaySetup | null = null, index = -1;
  simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: {
    playSetup: (s, ctx) => { setup = s; index = ctx.index; },
    playResult: (sim, kind) => { if (kind === 'scrimmage' && setup && !sim.isPass)
      plays.push({ pass: false, call: sim.offCall.label, id: `G${g + 1}-P${index + 1}`, setup: captureSetup(setup).toString('base64') }); return undefined; } } });
}
mkdirSync('out/matched-restage', { recursive: true });
writeFileSync(`out/matched-restage/seed${label}.json`, JSON.stringify(plays));
console.log('captured', plays.length, 'runs ->', `out/matched-restage/seed${label}.json`);
