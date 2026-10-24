/**
 * Scorecard worker: simulates the listed games and prints one GameRec JSON
 * line per game. Engine flags come from this process's environment, so the
 * orchestrator runs one worker set per arm.
 *   node --import tsx scripts/scorecard/worker.ts '<json: {seed, games, leagues, only, probes}>'
 */
import { simulateGame } from '../../src/game/game.js';
import { gameRecord, gameSpecs, makeLeague } from './records.js';
import { PROBES } from './probes.js';
import { inputIdentity } from './provenance.js';
import { composeHooks } from './hooks.js';
import { captureTackleOpportunities } from './tackles.js';

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
  const record = probes.some((p) => p.needsReplay);
  const inputSha256 = inputIdentity(spec, teams[spec.home], teams[spec.away], record);
  const tackles = captureTackleOpportunities();
  const watchers = probes.flatMap((p) => (p.observe ? [{ p, w: p.observe({ idPrefix: `sc${args.seed}/`, game: g + 1 }) }] : []));
  const t0 = performance.now();
  const res = simulateGame(teams[spec.home], teams[spec.away], {
    seed: spec.seed,
    record,
    hooks: composeHooks(tackles.hooks, ...watchers.map((x) => x.w.hooks)),
  });
  const rec = gameRecord(spec, res, performance.now() - t0, tackles.count);
  rec.inputSha256 = inputSha256;
  for (const p of probes) for (const [k, v] of Object.entries(p.collect(res))) rec.probe[`${p.id}.${k}`] = v;
  for (const { p, w } of watchers) for (const [k, v] of Object.entries(w.finish(res, rec))) rec.probe[`${p.id}.${k}`] = v;
  process.stdout.write(`${JSON.stringify(rec)}\n`);
}
