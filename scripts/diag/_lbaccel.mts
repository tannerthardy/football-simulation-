/** OZ/WZ box backers tagged fit-line-flow with no lateral request reversal: lateral request vs achieved, facing offset
 * from travel, speed, support state, over 0.5-1.0 s; and the achieved lateral acceleration. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const R: any[] = []; const W: Record<string, number> = {}; let tot = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const LB = sim.defense.filter((d: any) => d.slot.startsWith('LB') && (d.pos.x - sim.los) * d2 >= 2.5 && (d.pos.x - sim.los) * d2 <= 7);
  const log = new Map<any, any[]>(LB.map((l: any) => [l, []])); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (sim.t < .45 || sim.t > 1.05) return;
    for (const l of LB) log.get(l)!.push({ t: sim.t, req: { ...(sim.intents[l.idx]?.vel ?? { x: 0, y: 0 }) }, v: { ...l.vel }, face: l.body.facing, st: l.body.support?.state, flow: l.tags.has('fit-line-flow'), near: Math.min(...sim.agents.filter((o: any) => o !== l).map((o: any) => Math.hypot(o.pos.x - l.pos.x, o.pos.y - l.pos.y))) }); };
  sim.run();
  for (const [l, L] of log) { tot++;
    const s0 = Math.sign(L.find((x: any) => Math.abs(x.req.y) > 1)?.req.y ?? 0);
    const why = !L.some((x: any) => x.flow) ? `no guard flow: behavior ${l.behavior?.kind}, job ${l.runFit?.kind}${l.runFit?.technique === 'lag' ? '/lag' : ''}, flow tag from back ${l.tags.has('fit-flow-read')}` : s0 && L.some((x: any) => x.req.y * s0 < -1) ? 'guard flow, then reversed' : 'clean flow';
    W[why] = (W[why] ?? 0) + 1; if (why === 'guard flow, then reversed' && ((globalThis as any).shown = ((globalThis as any).shown ?? 0) + 1) <= 4) console.log('REV', seed, p.call, l.slot, 'reverse at', L.find((x: any) => x.req.y * s0 < -1)?.t?.toFixed(2));
    if (!L.some((x: any) => x.flow)) continue;
    const s = Math.sign(L.find((x: any) => Math.abs(x.req.y) > 1)?.req.y ?? 0); if (!s) continue;
    if (L.some((x: any) => x.req.y * s < -1)) continue;   // reversal: skip
    const a = L.find((x: any) => Math.abs(x.t - .6) < .01), b = L.find((x: any) => Math.abs(x.t - .9) < .01); if (!a || !b) continue;
    const trav = Math.atan2(b.v.y, b.v.x); let off = Math.abs(((b.face - trav + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI;
    R.push({ rq: b.req.y * s, rqx: -b.req.x * d2, vy6: a.v.y * s, vy9: b.v.y * s, vx9: -b.v.x * d2, acc: (b.v.y - a.v.y) * s / .3, off, st: b.st, near: Math.min(...L.filter((x: any) => x.t >= .6 && x.t <= .9).map((x: any) => x.near)) }); }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`clean flowing backers n ${R.length} | at 0.9 s lateral req ${q(R.map(r => r.rq))} (downhill req ${q(R.map(r => r.rqx))}) | lateral 0.6 -> 0.9 ${q(R.map(r => r.vy6))} -> ${q(R.map(r => r.vy9))} (downhill ${q(R.map(r => r.vx9))}) | lateral accel ${q(R.map(r => r.acc))} yd/s^2 | facing off travel ${q(R.map(r => r.off))} deg | nearest body 0.6-0.9 p50 ${q(R.map(r => r.near))} yd (<1.2: ${(100 * R.filter(r => r.near < 1.2).length / Math.max(1, R.length)).toFixed(0)}%) | support ${JSON.stringify(R.reduce((m: any, r) => (m[r.st] = (m[r.st] ?? 0) + 1, m), {}))}`);
console.log(`box backers ${tot}`); for (const [k, v] of Object.entries(W).sort((a, b) => b[1] - a[1])) console.log(`  ${(100 * v / tot).toFixed(0).padStart(3)}%  ${k}`);
