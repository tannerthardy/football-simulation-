/** One held carrier, tick by tick from the first hold (observation only):
 * his support state, capture-point offset, felt load, lean, velocity and
 * request; each holder's grip, joint capacity, separation and request.
 * node --import tsx scripts/diag/stretch/holdtrace.ts iz strong over3 pair11 77 [formation] */
import { makeSim, rosters } from '../zone-lab/lab.js';
const [concept, dir, look, roster, seedS] = process.argv.slice(2);
const sim = makeSim({ concept, dir: dir as any, look, roster, seed: +seedS, formation: process.argv[7] ?? 'ace_12' }, rosters());
const up = sim.attackDir('O');
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const G = 9.8 * 1.0936;
let started = -1;
while (sim.phase === 'live' && sim.t < 20) {
  sim.tick();
  const c = sim.carrier, b = sim.bond;
  if (!c || c.team !== 'O' || !b) { if (started >= 0 && sim.phase !== 'live') break; continue; }
  if (started < 0) started = sim.t;
  const s = c.body.support!;
  const req = sim.intents[c.idx]?.vel ?? { x: 0, y: 0 };
  const holders = b.tacklers.map(d => {
    const j = b.holds?.get(d) as any, dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    const di = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
    return `${d.slot} grip ${(b.grip?.get(d) ?? 0).toFixed(2)} cap/bw ${((j?.capacity ?? 0) / (c.profile.massKg * G)).toFixed(2)} sep ${dd.toFixed(2)} rel(${f((d.pos.x - c.pos.x) * up)},${f(d.pos.y - c.pos.y)}) v(${f(d.vel.x * up)},${f(d.vel.y)}) req(${f(di.x * up)},${f(di.y)}) sup ${d.body.support?.state}`;
  });
  console.log(`${(sim.t - started).toFixed(2)} C ${s.state} xi(${f(s.xi.x * up)},${f(s.xi.y)}) felt/bw(${f(s.felt.x * up / (c.profile.massKg * G))},${f(s.felt.y / (c.profile.massKg * G))}) lean/bw ${(Math.hypot(s.lean.x, s.lean.y) / (c.profile.massKg * G)).toFixed(2)} v(${f(c.vel.x * up)},${f(c.vel.y)}) req(${f(req.x * up)},${f(req.y)}) depth ${f((c.pos.x - sim.los) * up)} | ${holders.join(' | ')}`);
}
console.log('gain', sim.buildResult().offenseYards.toFixed(2), sim.buildResult().outcome);
