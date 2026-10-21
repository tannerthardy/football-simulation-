/** Trace one 1v1 panel rep (scripts/diag/tackle/panel.ts setup) every 0.1 s
 * from the first grip: both speeds, their gap, the hold's grip/legs/force/
 * capacity, whether it slips, the holder's request and support state.
 * Observation only; flags from the environment.
 * node --import tsx scripts/diag/depth/holdtrace.ts [--angle 135] [--speed 6] [--seed 3000] [--side 1]
 *   [--carrier RB] [--tackler LB] (slot, or a slot prefix for the tackler) */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import type { GraspJoint } from '../../../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { chase } from '../../../src/sim/behaviors/common.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const carrierSlot = arg('--carrier', 'RB'), tacklerSlot = arg('--tackler', 'LB');
const angle = Number(arg('--angle', '135')), speed = Number(arg('--speed', '6')), seed = Number(arg('--seed', '3000')), side = Number(arg('--side', '1'));
const offense = generateTeam(new Rng(61), 'Panel O', 'PO', { strength: .55 });
const defense = generateTeam(new Rng(62), 'Panel D', 'PD', { strength: .55 });
const sim = new PlaySim({
  offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'panel' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'panel' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
});
const c = sim.slot(carrierSlot)!, d = sim.defense.find((a) => a.slot === tacklerSlot || a.slot.startsWith(tacklerSlot))!;
for (const a of sim.agents) {
  a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
  a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
}
c.downUntil = d.downUntil = -1;
sim.t = sim.world.time = 2;
sim.ball = { kind: 'held', carrier: c } as never;
const th = angle * Math.PI / 180;
c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 }; c.body.facing = 0;
d.body.pos = { x: 50 + 4 * Math.cos(th) + speed * .4, y: CENTER_Y + side * 4 * Math.sin(th) };
d.body.facing = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
d.body.vel = { x: Math.cos(d.body.facing) * 4, y: Math.sin(d.body.facing) * 4 };
c.behavior = { kind: 'idle', update: () => ({ vel: { x: speed, y: 0 } }) } as never;
d.behavior = { kind: 'idle', update: () => chase(sim, d, c) } as never;
for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
console.log(`carrier ${c.slot} ${c.profile.massKg.toFixed(0)} kg, holder ${d.slot} ${d.profile.massKg.toFixed(0)} kg; angle ${angle} speed ${speed}`);
console.log('   t   cx  c.v  d.v  gap | grip legs  cap  force slip | holder req  sup   | carrier sup');
const tick = sim as unknown as { tick(): void };
let gripAt = -1, last = -1, ev = 0;
while (sim.phase === 'live' && sim.t < 7) {
  tick.tick();
  for (; ev < sim.events.length; ev++) { const e = sim.events[ev]; if (['tackle_wrap', 'missed_tackle', 'broken_tackle', 'tackle', 'carrier_contact'].includes(e.type)) console.log(`  ${e.t.toFixed(2)} event ${e.type} ${e.note ?? ''}`); }
  const j = sim.world.joints.find((x): x is GraspJoint => x.kind === 'grasp' && x.b === c.body && !x.broken);
  if (j && gripAt < 0) gripAt = sim.t;
  if (gripAt < 0 || sim.t - last < .099) continue;
  last = sim.t;
  const gap = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
  const iv = sim.intents[d.idx]?.vel, req = iv ? Math.hypot(iv.x, iv.y) : NaN;
  console.log(`${sim.t.toFixed(2).padStart(5)} ${c.pos.x.toFixed(1).padStart(5)} ${c.speed.toFixed(1).padStart(4)} ${d.speed.toFixed(1).padStart(4)} ${gap.toFixed(2)} | `
    + (j ? `${(sim.bond?.grip?.get(d) ?? 0).toFixed(2)} ${j.legs.toFixed(2)} ${j.capacity.toFixed(0).padStart(5)} ${(j.force ?? 0).toFixed(0).padStart(5)} ${j.slipping ? 'slip' : '    '}` : 'no hold                     ')
    + ` | ${req.toFixed(1).padStart(4)} ${d.body.support?.state ?? '-'} | ${c.body.support?.state ?? '-'}`);
}
console.log(`end t ${sim.t.toFixed(2)} outcome ${sim.outcome ?? sim.phase} carrier x ${c.pos.x.toFixed(1)} (grip at ${gripAt.toFixed(2)})`);
