/**
 * Proof that the film weirdness detectors only read: the same game, played
 * with and without them (and with the scorecard's tackle capture composed
 * alongside), has the same play log, score and box score.
 *   node --import tsx scripts/weird-identity.ts [seed ...]     (default: 7 8)
 * Each seed plays twice, from freshly generated teams (about 45 s a game).
 * Exits 1 on any difference. Not part of `npm test`: it plays full games.
 */
import { createHash } from 'node:crypto';
import { Rng } from '../src/core/rng.js';
import { simulateGame, type GameHooks } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { composeHooks } from './scorecard/hooks.js';
import { captureTackleOpportunities } from './scorecard/tackles.js';
import { weirdObserver } from './scorecard/weird/observe.js';

const seeds = process.argv.slice(2).map(Number);
if (!seeds.length) seeds.push(7, 8);

function play(seed: number, hooks?: GameHooks) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const t0 = performance.now();
  const res = simulateGame(home, away, { seed, record: false, hooks });
  const sha = createHash('sha256').update(JSON.stringify({ log: res.log, score: res.score, box: res.box })).digest('hex');
  return { sha, plays: res.log.length, score: `${res.score.home}-${res.score.away}`, ms: performance.now() - t0 };
}

let bad = 0;
for (const seed of seeds) {
  const off = play(seed);
  const tackles = captureTackleOpportunities();
  const obs = weirdObserver({ idPrefix: '', game: 1 });
  const on = play(seed, composeHooks(tackles.hooks, obs.hooks));
  const same = off.sha === on.sha;
  if (!same) bad++;
  console.log(`seed ${seed}: ${same ? 'IDENTICAL' : 'DIFFERENT'} · ${on.plays} log entries, score ${on.score} · sha ${on.sha.slice(0, 16)} · ${off.ms.toFixed(0)} ms off, ${on.ms.toFixed(0)} ms on`);
}
process.exit(bad ? 1 : 0);
