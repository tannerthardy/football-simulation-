import { Rng } from '../../src/core/rng.js';
import { CENTER_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const [cid = 'iz_strong', form = 'ace_11', skip = '0', front = 'over'] = process.argv.slice(2);
const rng = new Rng(11);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
for (let k = 0; k < Number(skip); k++) rng.nextU32();
const formation = FORMATION_BY_ID[form];
const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'base43'), offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[cid], label: cid }, defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32() }) as any;
for (const [a, plan] of (sim.offense as any[]).filter((o) => o.behavior?.plan).map((o: any) => [o, o.behavior.plan])) console.log('plan', a.slot, plan.kind, plan.target?.slot ?? '-', plan.climbTo?.slot ?? '');
sim.event('snap', sim.qb);
while (sim.phase === 'live' && sim.t < 4) {
  sim.tick();
  if (Math.round(sim.t * 20) % 4 === 0) {
    const c = sim.carrier;
    const eng = sim.engagements.map((e: any) => `${e.blocker.slot}x${e.defender.slot}[c${e.control.toFixed(1)} phi${e.phi.toFixed(2)} bB${e.baseB.toFixed(2)}${e.helpers.length ? '+' + e.helpers.map((h: any) => h.slot).join('') : ''}]`).join(' ');
    const lbs = sim.defense.filter((d: any) => d.slot.startsWith('LB')).map((d: any) => `${d.slot}(${(d.pos.x - 40).toFixed(1)},${(d.pos.y - CENTER_Y).toFixed(1)})`).join(' ');
    console.log(`t=${sim.t.toFixed(2)} carrier ${c?.slot}(${((c?.pos.x ?? 0) - 40).toFixed(1)},${((c?.pos.y ?? 0) - CENTER_Y).toFixed(1)}) | ${eng} | ${lbs}`);
  }
}
for (const e of sim.events) console.log(e.t.toFixed(2), e.type, e.a !== undefined ? sim.agents[e.a].slot : '', e.b !== undefined ? sim.agents[e.b].slot : '', e.note ?? '');
