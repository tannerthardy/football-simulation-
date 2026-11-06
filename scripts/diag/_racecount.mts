import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const C: Record<string, number> = {}; let n = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const first = new Map<any, any>();
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); for (const d of sim.defense) for (const t of ['zone-run', 'reached', 'ball-past']) if (d.tags.has(t) && !first.has(d.idx + t)) first.set(d.idx + t, sim.t); };
  sim.run(); n++;
  for (const [k, t] of first) { const tag = k.replace(/^\d+/, ''); C[tag] = (C[tag] ?? 0) + 1; (C[tag + ' t'] as any) = ((C[tag + ' t'] ?? 0) + t); }
}
for (const t of ['zone-run', 'reached', 'ball-past']) console.log(`${t}: ${C[t] ?? 0} DL over ${n} plays, mean first at ${((C[t + ' t'] ?? 0) / (C[t] || 1)).toFixed(2)} s`);
