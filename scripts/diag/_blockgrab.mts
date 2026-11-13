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
    if (first && first.s25 === undefined && sim.t >= first.t + 0.25 - 1e-9) {
      const c = first.carrier, d = first.d, iv = sim.intents[c.idx]?.vel ?? { x: 0, y: 0 };
      const touching = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) < c.profile.radius + d.profile.radius + 0.05;
      first.s25 = { req: Math.hypot(iv.x, iv.y), v: Math.hypot(c.vel.x, c.vel.y), touching, dEng: !!d.engagement,
        into: (() => { const cs = Math.hypot(c.vel.x, c.vel.y); const tx = c.pos.x - d.pos.x, ty = c.pos.y - d.pos.y, l = Math.hypot(tx, ty) || 1; return cs > .5 ? (c.vel.x * -tx + c.vel.y * -ty) / (cs * l) : 1; })(),
        beh: c.behavior?.constructor?.name };
    }
    if (first && first.armsAt === undefined && sim.bond && first.d && !sim.bond.oneArm?.has(first.d) && sim.bond.tacklers.includes(first.d)) first.armsAt = sim.t;
    for (const j of sim.world.joints) if (j.kind === 'grasp' && !seen.has(j)) { seen.add(j);
      const d = sim.agents.find((a: any) => a.body === j.a), c = sim.agents.find((a: any) => a.body === j.b);
      if (!first && c === sim.carrier && c !== sim.qb) first = { origin: j.origin, slot: d.slot, t: sim.t, x: c.pos.x, v: Math.hypot(c.vel.x, c.vel.y), joint: j, cap: j.capacity, carrier: c, d }; } };
  const res = sim.run();
  if (!first || !String(first.origin).startsWith('block')) continue;
  const endX = first.carrier.pos.x;
  rows.push({ id: `s${seed}-${i}`, slot: first.slot, after: +(endX - first.x).toFixed(2), dur: +(sim.t - first.t).toFixed(2), broke: !!first.joint.broken,
    s25: first.s25, cap: Math.round(first.cap), armsAfter: first.armsAt !== undefined ? +(first.armsAt - first.t).toFixed(2) : null, v: +first.v.toFixed(1), yards: +res.yards.toFixed(1), outcome: res.outcome });
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const held = rows.filter(r => !r.broke);
const S = rows.filter(r => r.s25);
console.log(`at +0.25 s after the grab: carrier request p50 ${q(S.map(r => r.s25.req)).toFixed(1)} achieved ${q(S.map(r => r.s25.v)).toFixed(1)} (in at grab ${q(S.map(r => r.v)).toFixed(1)}) | bodies touching ${S.filter(r => r.s25.touching).length}/${S.length} | carrier running into the grabber (into>0.3) ${S.filter(r => r.s25.into > 0.3).length}/${S.length} | grabber still engaged ${S.filter(r => r.s25.dEng).length}`);
console.log(`held (not broken) n ${held.length}: second arm around ${held.filter(r => r.armsAfter !== null).length}, after p50 ${q(held.filter(r => r.armsAfter !== null).map(r => r.armsAfter)).toFixed(2)} s`);
console.log(`first contact = grab from a block: n ${rows.length} | yards after p25/50/75/90 ${[.25, .5, .75, .9].map(f => q(rows.map(r => r.after), f).toFixed(1)).join('/')} | play time after p50 ${q(rows.map(r => r.dur)).toFixed(2)} s | that hold broke ${(100 * rows.filter(r => r.broke).length / Math.max(1, rows.length)).toFixed(0)}% | initial capacity p50 ${q(rows.map(r => r.cap))} | run yards p50 ${q(rows.map(r => r.yards)).toFixed(1)}`);
import('node:fs').then(fs => fs.writeFileSync('out/blockgrab.json', JSON.stringify(rows)));
