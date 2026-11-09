/** How run blocks on a defender who is trying to shed end, and where the stuck ones sit. For DL/LB with tag
 * shed-attempt: engagement end reasons (runContactObservers 'end'); per engaged tick of an attempt, the leverage
 * measure `behind` (ends at >= 1.1), the gap past torso contact vs arm length (ends past it), and whether a landed
 * hand move is live. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { runContactObservers } from '../../src/sim/run-contact-observer.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const ends = new Map<string, number>(); const G: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  runContactObservers.set(sim, (e: any, kind: string, data: any) => {
    const d = e.defender; if (!/^(DE|DT|NT|LB)/.test(d.slot) || !d.tags.has('shed-attempt')) return;
    if (kind === 'end') ends.set(data.reason, (ends.get(data.reason) ?? 0) + 1);
    if (kind === 'geometry') {
      const b = e.blocker, apart = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - (b.profile.radius + d.profile.radius);
      G.push({ behind: data.behind, apart, live: sim.t < e.moveUntil && e.moveOk, control: e.control });
    }
  });
  sim.run();
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
console.log('end reasons:', [...ends].map(([k, v]) => `${k} ${v}`).join(' | '));
for (const [lab, f] of [['all', (g: any) => true], ['landed move live', (g: any) => g.live], ['no live move', (g: any) => !g.live]] as const) {
  const z = G.filter(f); if (!z.length) continue;
  console.log(`${lab.padEnd(17)} ticks ${z.length} | behind p25/50/75/90 ${[.25, .5, .75, .9].map(x => q(z.map(g => g.behind), x).toFixed(2)).join('/')} (ends at 1.1) | gap past torso p50/90 ${q(z.map(g => g.apart)).toFixed(2)}/${q(z.map(g => g.apart), .9).toFixed(2)} yd`);
}
