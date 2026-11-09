/** Restaged designed runs for rgtools/dbrun.py: per play the run concept, the carrier's track and every DB's track at
 * 10 Hz, x = yards past the LOS on the defense side (+ = downfield for the offense), y lateral. JSON lines.
 * usage: <capDir> <out.jsonl> <seed>... */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const CON: Record<string, string> = { outsideZone: 'OUTSIDE ZONE', wideZone: 'OUTSIDE ZONE', insideZone: 'INSIDE ZONE', splitZone: 'INSIDE ZONE', duo: 'INSIDE ZONE', toss: 'OUTSIDE ZONE', power: 'POWER', counter: 'COUNTER', trap: 'TRAP' };
const [dir, out, ...seeds] = process.argv.slice(2); const lines: string[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const setup: any = restoreSetup(Buffer.from(p.setup, 'base64')); const con = CON[setup.offCall?.run?.scheme]; if (!con) continue;
  const sim: any = new PlaySim(setup as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const DB = sim.defense.filter((d: any) => /^(CB|FS|SS|NB|S\b|DB)/.test(d.slot)); const WR = sim.offense.filter((o: any) => /^(X|Z|H|F|SL|WR)/.test(o.slot) && !/^(RB|FB|TE|Y)/.test(o.slot));
  const X = (a: any) => [+(((a.pos.x - los) * d2).toFixed(2)), +a.pos.y.toFixed(2)];
  const car: any[] = [], dbs: any[][] = DB.map(() => []), wrs: any[][] = WR.map(() => []); let k = 0, last: any = null; const t0 = sim.tick.bind(sim);
  const rec = () => { const c = sim.carrier && sim.carrier !== sim.qb ? sim.carrier : (last ?? sim.qb); last = c; car.push(X(c)); DB.forEach((d: any, i: number) => dbs[i].push(X(d))); WR.forEach((o: any, i: number) => wrs[i].push(X(o))); k++; };
  rec(); sim.tick = () => { t0(); if (k <= 40 && sim.t >= 0.1 * k - 1e-6) rec(); };
  sim.run(); lines.push(JSON.stringify({ concept: con, car, dbs, wrs, wslots: WR.map((o: any) => o.slot) }));
}
writeFileSync(out, lines.join('\n') + '\n');
