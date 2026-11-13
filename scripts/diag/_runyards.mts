/** Yards and DL-first-hitter on matched restage runs, one arm per process (module-level flags). usage: <capDir> <out.jsonl> <seed>... */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, out, ...seeds] = process.argv.slice(2);
const rows: string[] = [];
for (const seed of seeds) (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).forEach((p, i) => {
  if (p.pass) return;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const r = sim.run(); const ev = (r.events ?? sim.events) as any[];
  const hit = ev.find((e: any) => e.type === 'carrier_contact' || e.type === 'tackle_wrap');
  const who = hit ? sim.agents[hit.a ?? hit.actor ?? -1]?.slot ?? hit.by ?? '' : '';
  rows.push(JSON.stringify({ id: `${seed}|${i}`, call: p.call, y: r.yards, hit: String(who), hitX: hit ? ((sim.carrier ?? sim.qb).pos.x - sim.los) : null }));
});
writeFileSync(out, rows.join('\n'));
