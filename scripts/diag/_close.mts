/** Pressure survival observations (Coverage's simclose rule): on dropbacks, the first time any defender is within 2 yd
 * of the QB from the snap until the throw, a sack or 6 s. Writes [time, reached] pairs for km.py (a throw censors).
 * Replays each capture k times like restage.ts. usage: <k> <seed>... > obs.json */
import { readFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
const [k, ...seeds] = process.argv.slice(2); const obs: [number, boolean][] = []; let sacks = 0, n = 0;
for (const seed of seeds) (JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8')) as any[]).forEach(p => {
  if (!p.pass) return;
  for (let j = 0; j < Number(k); j++) {
    const setup: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (j > 0) setup.seed = (typeof setup.seed === 'number' ? new Rng(setup.seed) : setup.seed).fork(`shift:${j}`);
    const sim: any = new PlaySim(setup); let hit: number | null = null, end: number | null = null;
    const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); if (end !== null || hit !== null) return;
      if (sim.throwAt >= 0 || sim.carrier !== sim.qb || sim.phase !== 'live' || sim.t >= 6) { end = sim.t; return; }
      if (sim.defense.some((d: any) => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2)) hit = sim.t; };
    const r = sim.run(); n++; if (r.outcome === 'sack') sacks++;
    obs.push(hit !== null ? [hit, true] : [end ?? sim.t, false]);
  }
});
process.stderr.write(`dropbacks ${n}, sacks ${sacks} (${(100 * sacks / n).toFixed(1)}%)\n`);
console.log(JSON.stringify(obs));
