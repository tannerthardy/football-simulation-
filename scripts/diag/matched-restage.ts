/** Matched restage: every scrimmage snap of one seeded game, saved as its
 * constructor setup, replayed in a separate process per arm. Compares arms on
 * identical snaps instead of diverging whole games.
 *   capture: node --import tsx scripts/diag/matched-restage.ts capture <seed>
 *   replay:  <ARM ENV> node --import tsx scripts/diag/matched-restage.ts replay <seed> <armName>
 * Engine settings are read once at load, so each arm runs in its own process. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

const [mode, seedArg, arm = 'x'] = process.argv.slice(2);
const seed = Number(seedArg), dir = 'out/matched-restage';
mkdirSync(dir, { recursive: true });
const file = `${dir}/seed${seed}.json`;
const run = (s: PlaySetup) => {
  const r = new PlaySim(s).run();
  // Yards and outcome, plus a digest of the event sequence so equal yards by a different path still count as changed.
  const events = createHash('sha256').update(JSON.stringify(r.events)).digest('hex').slice(0, 16);
  return { y: +r.yards.toFixed(2), o: r.outcome, events };
};
if (mode === 'capture') {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: Array<{ pass: boolean; call: string; setup: string }> = [];
  let setup: PlaySetup | null = null;
  simulateGame(home, away, { seed, hooks: { playSetup: s => { setup = s as PlaySetup; }, playResult: (sim, kind) => {
    if (kind !== 'scrimmage' || !setup) return undefined;
    plays.push({ pass: !!sim.isPass, call: sim.offCall.label, setup: captureSetup(setup).toString('base64') });
    return undefined;
  } } });
  writeFileSync(file, JSON.stringify(plays));
  console.log('captured', plays.length);
} else if (mode === 'replay') {
  const plays = JSON.parse(readFileSync(file, 'utf8')) as Array<{ pass: boolean; call: string; setup: string }>;
  const rows = plays.map(p => ({ pass: p.pass, call: p.call, ...run(restoreSetup(Buffer.from(p.setup, 'base64'))) }));
  writeFileSync(`${dir}/seed${seed}-${arm}.json`, JSON.stringify(rows));
  console.log('replayed', rows.length);
} else throw new Error('usage: matched-restage.ts capture <seed> | replay <seed> <arm>');
