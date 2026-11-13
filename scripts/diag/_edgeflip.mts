/** Released DL in the edge fit: print consecutive-tick edge pictures around each > 60 deg request flip. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
let shown = 0; const summary: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const was = new Map<any, boolean>(), prev = new Map<any, any>(), until = new Map<any, number>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const c = sim.carrier;
    for (const d of sim.defense) {
      if (!/^(DE|DT|NT)/.test(d.slot)) { (d as any).dbgEdge = undefined; continue; }
      const eng = !!d.engagement;
      if (c && c !== sim.qb && was.get(d) && !eng && !until.has(d)) until.set(d, sim.t + 0.5);
      const e = (d as any).dbgEdge; (d as any).dbgEdge = undefined;
      if (until.has(d) && sim.t <= until.get(d)! && e && prev.get(d)) {
        const q = prev.get(d), a1 = Math.atan2(q.req[1], q.req[0]), a2 = Math.atan2(e.req[1], e.req[0]);
        let da = Math.abs(a2 - a1) % (2 * Math.PI); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > Math.PI / 3 && Math.hypot(...e.req as [number, number]) > .3 && Math.hypot(...q.req as [number, number]) > .3) {
          const key = `${e.kind} carrying=${e.carrying} premesh=${e.premesh} aimD<0.5=${e.aimD < .5} kickChange=${q.kick !== e.kick} trailChange=${q.trail !== e.trail} replChange=${q.replace !== e.replace}`;
          summary[key] = (summary[key] ?? 0) + 1;
          if (shown++ < 6) console.log(seed, p.call.slice(0, 40), d.slot, sim.t.toFixed(2), '\n   prev', JSON.stringify(q), '\n   now ', JSON.stringify(e));
        }
      }
      prev.set(d, e); was.set(d, eng);
    }
  };
  sim.run();
}
console.log(Object.entries(summary).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v}  ${k}`).join('\n'));
