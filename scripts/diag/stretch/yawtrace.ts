/** One slot's body yaw through a lab case: facing, yaw rate, the facing his
 * intent asks for, his velocity heading, engagement partner and support
 * state, each tick (observation only). Flags come from the environment.
 * node --import tsx scripts/diag/stretch/yawtrace.ts CASE_ID SLOT [FROM] [TO] */
import { makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const [id, slot, from = '0', to = '3'] = process.argv.slice(2);
const [concept, dir, formation, look, roster, seed] = id.split('/');
const sim = makeSim({ concept, dir: dir as 'strong' | 'weak', look, roster, seed: Number(seed), formation } as LabCase, rosters());
const a = sim.agents.find(x => x.slot === slot && x.team === 'O') ?? sim.agents.find(x => x.slot === slot)!;
const deg = (r: number) => ((r * 180 / Math.PI + 540) % 360 - 180).toFixed(0).padStart(5);
let prev = a.body.facing, turned = 0;
while (sim.phase === 'live' && sim.t < Number(to)) {
  sim.tick();
  const f = a.body.facing, rate = (f - prev) / sim.dt; turned += f - prev; prev = f;
  if (sim.t < Number(from)) continue;
  const it = (sim as any).intents[a.idx], e = a.engagement as any;
  const partner = e ? (e.blocker === a ? e.defender : e.blocker) : null;
  console.log(`t ${sim.t.toFixed(2)} facing ${deg(f)} rate ${(rate * 180 / Math.PI).toFixed(0).padStart(5)} deg/s turned ${(turned * 180 / Math.PI).toFixed(0).padStart(5)} | wants ${it.facing === undefined ? '  (travel)' : deg(it.facing)} | vel ${Math.hypot(a.vel.x, a.vel.y).toFixed(2)}@${deg(Math.atan2(a.vel.y, a.vel.x))} | spin ${((a.body.spin ?? 0) * 180 / Math.PI).toFixed(0).padStart(5)} | ${partner ? `ENG ${e.blocker === a ? 'vs' : 'by'} ${partner.slot}${e.helpers?.length ? ' +' + e.helpers.map((h: any) => h.slot).join(',') : ''} at ${deg(Math.atan2(partner.pos.y - a.pos.y, partner.pos.x - a.pos.x))}` : 'free'} ${a.body.support?.state !== 'up' ? '[' + a.body.support?.state + ']' : ''}`);
}
