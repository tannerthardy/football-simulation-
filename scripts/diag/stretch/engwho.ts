/** One slot's engagement partner, plan target and support state through a lab case,
 * printed on change and every 0.2 s, with his recorded events (observation only).
 * node --import tsx scripts/diag/stretch/engwho.ts CASE_ID SLOT FROM TO */
import { makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
const [id, slot, from, to] = process.argv.slice(2);
const [concept, dir, formation, look, roster, seed] = id.split('/');
const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as LabCase, rosters());
const a = sim.agents.find(x => x.slot === slot)!;
let last = '';
while (sim.phase === 'live' && sim.t < Number(to)) {
  sim.tick();
  if (sim.t < Number(from)) continue;
  const e = a.engagement as any;
  const plan = (a.behavior as any).plan;
  const st = (a.body as any).support?.state;
  const s = (st && st !== 'up' ? '[' + st + '] ' : '') + (e ? `ENG ${e.blocker === a ? 'blocker' : 'defender'} vs ${(e.blocker === a ? e.defender : e.blocker).slot}` : `free; plan ${plan?.kind} target ${plan?.target?.slot} (target engaged with ${plan?.target?.engagement ? plan.target.engagement.blocker.slot : '-'})`) + ` spd ${Math.hypot(a.vel.x, a.vel.y).toFixed(1)}`;
  const key = s.replace(/ spd [0-9.]+$/, ''); if (key !== last || Math.round(sim.t * 20) % 4 === 0) { console.log(`t ${sim.t.toFixed(2)} ${s}`); last = key; }
}
for (const ev of (sim as any).events ?? []) if ((ev.a === a.idx || ev.b === a.idx) && ev.t >= Number(from) && ev.t <= Number(to)) console.log('event', JSON.stringify(ev).slice(0, 200));
