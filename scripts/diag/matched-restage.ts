// capture: node --import tsx scripts/diag/matched-restage.ts capture <seed>
// replay:  <ARM ENV> node --import tsx scripts/diag/matched-restage.ts replay <seed> <armName>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';
const [mode, seedArg, arm = 'x'] = process.argv.slice(2);
const seed = Number(seedArg), dir = 'out/matched-restage'; mkdirSync(dir, { recursive: true });
const file = `${dir}/seed${seed}.json`;
const run = (s: PlaySetup) => { const r: any = new PlaySim(s).run(); return { y: +r.yards.toFixed(2), o: r.outcome }; };
if (mode === 'capture') {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays: any[] = []; let setup: PlaySetup | null = null;
  simulateGame(home, away, { seed, hooks: { playSetup: s => { setup = s; }, playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !setup) return undefined;
    plays.push({ pass: !!sim.isPass, call: sim.offCall.label, setup: captureSetup(setup).toString('base64') }); return undefined; } } });
  writeFileSync(file, JSON.stringify(plays)); console.log('captured', plays.length);
} else {
  const plays = JSON.parse(readFileSync(file, 'utf8'));
  const rows = plays.map((p: any) => ({ pass: p.pass, call: p.call, ...run(restoreSetup(Buffer.from(p.setup, 'base64'))) }));
  writeFileSync(`${dir}/seed${seed}-${arm}.json`, JSON.stringify(rows)); console.log('replayed', rows.length);
}
