/**
 * Run-only film trace: plays the film room's games (teams built exactly as
 * scripts/export-replay.ts builds them, so G{g}-P{n} ids match `npm run replay
 * -- <seed> --run-only`) with every offensive call a designed run, and writes a
 * compact 10 Hz trace of each run play for offline analysis. Reads only.
 *   node --import tsx scripts/diag/run-film-trace.ts [seed=7] [--games 2] [--out out/run/trace-seed7.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import { watchRunPlay, type RunTraceRec } from './run-trace-watch.js';
import type { PlayStats } from '../../src/sim/types.js';

const { values: v, positionals } = parseArgs({ allowPositionals: true, options: { games: { type: 'string', default: '2' }, out: { type: 'string' } } });
const seed = Number(positionals[0] ?? 7);
const games = Number(v.games);
const out = v.out ?? `out/run/trace-seed${seed}.json`;

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const plays: unknown[] = [];
for (let g = 0; g < games; g++) {
  const caps = new WeakMap<PlayStats, () => RunTraceRec>();
  const res = simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: {
    playResult(sim, kind) {
      if (kind !== 'scrimmage' || sim.isPass) return undefined;
      const get = watchRunPlay(sim);
      const run = sim.run.bind(sim);
      sim.run = () => { const r = run(); caps.set(r.stats, get); return r; };
      return undefined;
    },
  } });
  for (const p of res.log) {
    const get = p.stats ? caps.get(p.stats) : undefined;
    if (!get || p.kind !== 'run') continue;
    plays.push({ id: `G${g + 1}-P${String(p.index + 1).padStart(3, '0')}`, yards: p.yards, text: p.text, nullified: !!p.nullified, down: p.down, dist: p.distance, ...get() });
  }
  console.log(`game ${g + 1} seed ${seed + g}: ${plays.length} run plays so far`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(plays));
console.log(`-> ${out}`);
