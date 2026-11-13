/**
 * Restage every designated run of a game on the same snap state with a run
 * mechanism's switch off and on, and report the matched yardage change.
 *
 *   GAP_MATCH=0 node --import tsx scripts/diag/flag-restage.ts capture GAP_MATCH 7 out/restage
 *   node --import tsx scripts/diag/flag-restage.ts replay GAP_MATCH 7 out/restage
 *
 * `capture` plays the ordinary game with the switch off, saving each run's
 * constructor and its off-arm result. `replay` restores the same constructors
 * in a process with the switch on. Switches are read once at load, so each
 * arm runs in its own process. Paired rows land in <dir>/<FLAG>-seed<N>-paired.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

function run(setup: PlaySetup) {
  const r = new PlaySim(setup).run();
  return { yards: +r.yards.toFixed(2), outcome: r.outcome };
}

const [mode, flag, seedArg, dir = 'out/restage'] = process.argv.slice(2);
const seed = Number(seedArg);
if ((mode !== 'capture' && mode !== 'replay') || !/^[A-Z0-9_]+$/.test(flag ?? '') || !Number.isSafeInteger(seed)) {
  console.error('usage: capture|replay <FLAG> <seed> [dir]');
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
const file = `${dir}/${flag}-seed${seed}.json`;
if (mode === 'capture') {
  if (process.env[flag] !== '0') throw new Error(`capture runs the old arm: set ${flag}=0`);
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: unknown[] = [];
  let n = 0, setup: PlaySetup | null = null;
  simulateGame(home, away, { seed, hooks: {
    playSetup: s => { setup = s; },
    playResult: (sim, kind) => {
      n++;
      if (kind !== 'scrimmage' || sim.isPass || !setup) return undefined;
      const bytes = captureSetup(setup);
      plays.push({ play: n, call: sim.offCall.label, defense: sim.defCall.label, setup: bytes.toString('base64'), off: run(restoreSetup(bytes)) });
      return undefined;
    },
  } });
  writeFileSync(file, JSON.stringify(plays));
  console.log(`captured ${plays.length} runs to ${file}`);
} else {
  if (process.env[flag] === '0') throw new Error(`replay runs the new arm: unset ${flag}`);
  const plays = JSON.parse(readFileSync(file, 'utf8')) as { play: number; call: string; defense: string; setup: string; off: ReturnType<typeof run> }[];
  const rows = plays.map(p => ({ play: p.play, call: p.call, defense: p.defense, off: p.off, on: run(restoreSetup(Buffer.from(p.setup, 'base64'))) }));
  writeFileSync(`${dir}/${flag}-seed${seed}-paired.json`, JSON.stringify(rows));
  const stat = (arm: 'off' | 'on') => ({
    mean: +(rows.reduce((s, r) => s + r[arm].yards, 0) / rows.length).toFixed(2),
    tenPlus: rows.filter(r => r[arm].yards >= 10).length,
    stuffed: rows.filter(r => r[arm].yards <= 0).length,
  });
  console.log(JSON.stringify({ flag, seed, runs: rows.length, changed: rows.filter(r => r.on.yards !== r.off.yards).length, off: stat('off'), on: stat('on') }));
}
