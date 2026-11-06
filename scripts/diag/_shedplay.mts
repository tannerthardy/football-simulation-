/** One restage replay (seed, index, shift): shed events with reason and time, tackle events, result. usage: <seed> <i> <k> */
import { readFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
const [seed, i, k] = process.argv.slice(2).map(Number);
const p = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'))[i];
const setup: any = restoreSetup(Buffer.from(p.setup, 'base64'));
if (k > 0) setup.seed = (typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed).fork(`shift:${k}`);
const sim: any = new PlaySim(setup); const r = sim.run();
for (const e of sim.events) if (/shed|tackle|hit|wrap|handoff/.test(e.type)) {
  const a = sim.agents[e.a]?.slot ?? e.a, b = sim.agents[e.b]?.slot ?? e.b;
  console.log(`${e.t?.toFixed?.(2) ?? ''} ${e.type} ${a} ${b} ${e.note ?? ''}`);
}
console.log(`${p.call} -> ${r.yards.toFixed(1)} ${r.outcome}`);
