/** Trace one solo tackle tick by tick (development aid). node --import tsx scripts/diag/tackle-trace.ts [angle] [speed] [seed] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { availability, supportParams } from '../../src/physics/support.js';
const angleDeg = Number(process.argv[2] ?? 90), speed = Number(process.argv[3] ?? 6), seed = Number(process.argv[4] ?? 1);
const rosterSeed = 7;
const sim = new PlaySim({
  offense: pickOffense(generateTeam(new Rng(rosterSeed), 'O', 'OFF'), '11'),
  defense: pickDefense(generateTeam(new Rng(rosterSeed + 1), 'D', 'DEF'), 'base43'),
  offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'lab' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
});
const c = sim.slot('RB')!;
const d = sim.defense.find((a) => a.slot === 'MLB' || a.slot.startsWith('LB'))!;
for (const a of sim.agents) {
  a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
  a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
}
c.downUntil = d.downUntil = -1;
sim.t = 2; sim.ball = { kind: 'held', carrier: c } as never;
const th = (angleDeg * Math.PI) / 180;
c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 };
d.body.pos = { x: 50 + 3 * Math.cos(th) + speed * 0.4, y: CENTER_Y + 3 * Math.sin(th) };
const toward = () => { const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; return { x: (dx / l) * 6.5, y: (dy / l) * 6.5 }; };
d.body.vel = toward();
c.behavior = { kind: 'idle', update: () => ({ vel: { x: 7, y: 0 } }) } as never;
d.behavior = { kind: 'idle', update: () => ({ vel: toward() }) } as never;
for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
const tick = sim as unknown as { tick(): void };
console.log(`c ${c.profile.massKg.toFixed(0)}kg d ${d.profile.massKg.toFixed(0)}kg armForce d ${supportParams(d.profile).armForce.toFixed(0)}`);
while (sim.phase === 'live' && sim.t < 4) {
  const n = sim.events.length;
  tick.tick();
  const j = sim.bond?.holds?.get(d);
  const cs = c.body.support!, ds = d.body.support!;
  console.log(`${sim.t.toFixed(2)} c(${c.pos.x.toFixed(2)},${c.pos.y.toFixed(2)} v${c.vel.x.toFixed(1)},${c.vel.y.toFixed(1)} xi${Math.hypot(cs.xi.x,cs.xi.y).toFixed(2)} a${availability(cs, supportParams(c.profile), 1).toFixed(2)} ${cs.state}) d(${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)} v${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)} ${ds.state} lean${Math.hypot(ds.lean.x,ds.lean.y).toFixed(0)}) dist ${Math.hypot(c.pos.x-d.pos.x,c.pos.y-d.pos.y).toFixed(2)} hold ${j ? `cap${j.capacity.toFixed(0)} f${(j.force??0).toFixed(0)} h${j.hold?.toFixed(2)} r${j.reach.toFixed(2)} legs${j.legs.toFixed(2)} ${j.slipping ? 'SLIP' : ''}` : '-'} grip ${sim.bond?.grip?.get(d)?.toFixed(2) ?? '-'} ${sim.events.slice(n).map((e) => e.type + (e.note ? `(${e.note})` : '')).join(' ')}`);
}
console.log('end', sim.outcome, sim.endSpot);
