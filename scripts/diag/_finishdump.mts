/** Sim side of scripts/mechanics/finish_reference.py, in its own frame format, so one Python operator reads NFL and sim.
 * Per run play of the captures (saved stream), 0.1 s frames from the snap of the eventual non-QB ball carrier and of
 * every defender, as [yards past the LOS, y]. usage: <capDir> <seed>... > out/finish-sim.jsonl */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
for (const seed of seeds) (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).forEach((p, i) => {
  if (p.pass) return;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const dir2 = sim.attackDir(sim.offense[0].team), P = (a: any) => [(a.pos.x - sim.los) * dir2, a.pos.y];
  const frames: any[] = []; let n = 0, runner: any = null;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (sim.carrier && sim.carrier !== sim.qb && sim.carrier.team === sim.offense[0].team) runner = sim.carrier;
    if (n++ % 2 === 1) frames.push({ o: sim.offense.map(P), d: sim.defense.map(P) }); };
  sim.run();
  if (!runner) return;
  const k = sim.offense.indexOf(runner);
  console.log(JSON.stringify({ id: `s${seed}-${i}`, car: frames.map(f => f.o[k]), def: frames.map(f => f.d) }));
});
