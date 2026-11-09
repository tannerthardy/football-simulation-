/** SINK_LEAD check on restaged captures: per play yards (paired by setup), front DL posture at first
 * contact, engaged front DL depth past the LOS at 1.5 s on runs; sacks/pressures on passes.
 * usage: <capDir> <seed>... (run once per flag value) */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const out: any[] = [];
for (const seed of seeds) for (const [i, p] of (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const dl = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot)); const post = new Map<any, number>(); let depth15: number[] = [];
  let hit = false;
  const tick = sim.tick.bind(sim); sim.tick = () => { tick();
    for (const d of dl) if (d.engagement && !post.has(d)) post.set(d, d.body.support.posture);
    if (!hit && sim.t >= 1.5) { hit = true; for (const d of dl) if (d.engagement) depth15.push((los - d.pos.x) * d2); } };
  const r = sim.run();
  out.push({ k: `${seed}:${i}`, pass: !!p.pass, y: r?.yards ?? NaN, post: [...post.values()], depth15, sack: r?.outcome === 'sack' });
}
console.log(JSON.stringify(out));
