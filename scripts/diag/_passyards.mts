/** Restaged pass plays: id, yards, and whether any defender used a tagged technique (argv tag). JSON lines. usage: <capDir> <out.jsonl> <tag> <seed>... */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, out, tag, ...seeds] = process.argv.slice(2); const L: string[] = [];
for (const seed of seeds) (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).forEach((p, i) => {
  if (!p.pass) return; const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); let used = false; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (!used) used = sim.defense.some((d: any) => d.tags.has(tag)); };
  const r = sim.run(); L.push(JSON.stringify({ id: `${seed}|${i}`, call: p.call, y: r?.yards ?? 0, used, pa: /play.?action|PA\b|boot/i.test(p.call) }));
});
writeFileSync(out, L.join('\n') + '\n');
