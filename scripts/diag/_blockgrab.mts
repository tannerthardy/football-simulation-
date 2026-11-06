/** Grabs made from inside a block (grasp origin 'block'): carrier yards gained after the grab, time to the play's
 * end, whether that hold broke, and who made the tackle. Runs only. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const rows: any[] = [];
for (const seed of seeds) for (const [i, p] of (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const seen = new Set<any>(); let first: any = null;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (first && first.armsAt === undefined && sim.bond && first.d && !sim.bond.oneArm?.has(first.d) && sim.bond.tacklers.includes(first.d)) first.armsAt = sim.t;
    for (const j of sim.world.joints) if (j.kind === 'grasp' && !seen.has(j)) { seen.add(j);
      const d = sim.agents.find((a: any) => a.body === j.a), c = sim.agents.find((a: any) => a.body === j.b);
      if (!first && c === sim.carrier && c !== sim.qb) first = { origin: j.origin, slot: d.slot, t: sim.t, x: c.pos.x, v: Math.hypot(c.vel.x, c.vel.y), joint: j, cap: j.capacity, carrier: c, d }; } };
  const res = sim.run();
  if (!first || !String(first.origin).startsWith('block')) continue;
  const endX = first.carrier.pos.x;
  rows.push({ id: `s${seed}-${i}`, slot: first.slot, after: +(endX - first.x).toFixed(2), dur: +(sim.t - first.t).toFixed(2), broke: !!first.joint.broken,
    cap: Math.round(first.cap), armsAfter: first.armsAt !== undefined ? +(first.armsAt - first.t).toFixed(2) : null, v: +first.v.toFixed(1), yards: +res.yards.toFixed(1), outcome: res.outcome });
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const held = rows.filter(r => !r.broke);
console.log(`held (not broken) n ${held.length}: second arm around ${held.filter(r => r.armsAfter !== null).length}, after p50 ${q(held.filter(r => r.armsAfter !== null).map(r => r.armsAfter)).toFixed(2)} s`);
console.log(`first contact = grab from a block: n ${rows.length} | yards after p25/50/75/90 ${[.25, .5, .75, .9].map(f => q(rows.map(r => r.after), f).toFixed(1)).join('/')} | play time after p50 ${q(rows.map(r => r.dur)).toFixed(2)} s | that hold broke ${(100 * rows.filter(r => r.broke).length / Math.max(1, rows.length)).toFixed(0)}% | initial capacity p50 ${q(rows.map(r => r.cap))} | run yards p50 ${q(rows.map(r => r.yards)).toFixed(1)}`);
import('node:fs').then(fs => fs.writeFileSync('out/blockgrab.json', JSON.stringify(rows)));
