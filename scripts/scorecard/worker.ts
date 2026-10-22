/**
 * Scorecard worker: simulates the listed games and prints one GameRec JSON
 * line per game. Engine flags come from this process's environment, so the
 * orchestrator runs one worker set per arm.
 *   node --import tsx scripts/scorecard/worker.ts '<json: {seed, games, leagues, only, probes}>'
 */
import { simulateGame } from '../../src/game/game.js';
import { gameRecord, gameSpecs, makeLeague } from './records.js';
import { PROBES } from './probes.js';

const args = JSON.parse(process.argv[2] ?? '{}') as {
  seed: number;
  games: number;
  leagues: number;
  only: number[];
  probes?: string[];
};
const specs = gameSpecs(args.seed, args.games, args.leagues);
const probes = PROBES.filter((p) => !args.probes || args.probes.includes(p.id));
const leagues = new Map<number, ReturnType<typeof makeLeague>>();
for (const g of args.only) {
  const spec = specs[g];
  if (!leagues.has(spec.league)) leagues.set(spec.league, makeLeague(args.seed, spec.league));
  const teams = leagues.get(spec.league)!;
  const t0 = performance.now();
  const res = simulateGame(teams[spec.home], teams[spec.away], {
    seed: spec.seed,
    record: probes.some((p) => p.needsReplay),
  });
  const rec = gameRecord(spec, res, performance.now() - t0);
  for (const p of probes) for (const [k, v] of Object.entries(p.collect(res))) rec.probe[`${p.id}.${k}`] = v;
  process.stdout.write(`${JSON.stringify(rec)}\n`);
}
