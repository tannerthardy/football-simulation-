/** Flex's engaged-chase population: zone runs, carrier 1-6 yd from an engaged DL/LB (run rep). Per tick: toward-carrier
 * request (final intent) and achieved speed, whether the blocker is between him and the carrier, and whether the request
 * aims into the blocker's body (cos > 0.7). Also paired yards. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const [dir, ...seeds] = process.argv.slice(2); const R: Record<string, number[][]> = {}; const Y: number[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st);
  const tick = sim.tick.bind(sim); sim.tick = () => { tick(); const c = sim.carrier; if (!c || c === sim.qb) return;
    for (const d of sim.defense) { const e = d.engagement; if (!e || e.type !== 'run') continue; const grp = /^(DE|DT|NT)/.test(d.slot) ? 'DL' : /LB/.test(d.slot) ? 'LB' : ''; if (!grp) continue;
      const ux = c.pos.x - d.pos.x, uy = c.pos.y - d.pos.y, n = Math.hypot(ux, uy); if (n < 1 || n > 6) continue;
      const b = e.blocker, bx = b.pos.x - d.pos.x, by = b.pos.y - d.pos.y, bn = Math.hypot(bx, by) || 1;
      const between = (bx * ux + by * uy) / n > 0 && Math.abs(bx * uy - by * ux) / n < 1.0;
      const req = sim.intents[sim.agents.indexOf(d)]?.vel ?? { x: 0, y: 0 }, rn = Math.hypot(req.x, req.y) || 1e-9;
      const into = (req.x * bx + req.y * by) / (rn * bn) > 0.7 ? 1 : 0;
      (R[`${grp} ${between ? 'blocker between' : 'not between'}`] ??= []).push([(req.x * ux + req.y * uy) / n, (d.vel.x * ux + d.vel.y * uy) / n, into, d.tags.has('shed-attempt') ? 1 : 0]); } };
  Y.push(sim.run().yards);
}
for (const [k, v] of Object.entries(R).sort()) { const m = (i: number) => v.reduce((a, r) => a + r[i], 0) / v.length;
  console.log(`${k.padEnd(20)} ticks ${String(v.length).padStart(6)}  req ${m(0).toFixed(2)} -> ach ${m(1).toFixed(2)}  into body ${(100 * m(2)).toFixed(0)}%`); }
console.log('YARDS ' + JSON.stringify(Y));
