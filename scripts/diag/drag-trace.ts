/** Tackle from behind on a carrier who keeps running: trace (development aid). */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { tryTackles } from '../../src/sim/tackle.js';
const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'), defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'base43'),
  offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'test' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'test' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77 });
const c = sim.slot('Z')!, d = sim.slot('FS')!;
for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never; }
c.downUntil = d.downUntil = -1; sim.t = 2; sim.ball = { kind: 'held', carrier: c } as never; sim.catchAt = 0;
c.body.pos = { x: 50, y: CENTER_Y }; d.body.pos = { x: Number(process.argv[2] ?? 49.4), y: CENTER_Y }; c.body.vel = { x: 5, y: 0 }; d.body.vel = { x: 5, y: 0 };
c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 7, y: 0 } }) } as never;
sim.rng.chance = () => false;
for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
tryTackles(sim);
const t0 = sim.t;
while (sim.phase === 'live' && sim.t < t0 + 3) {
  const n = sim.events.length;
  sim.tick();
  const j = sim.bond?.holds?.get(d), cs = c.body.support!, ds = d.body.support!;
  console.log(`${(sim.t - t0).toFixed(2)} c(${c.pos.x.toFixed(2)} v${c.vel.x.toFixed(2)},${c.vel.y.toFixed(2)} ${cs.state} xi${Math.hypot(cs.xi.x, cs.xi.y).toFixed(2)} lock${cs.feetLock.toFixed(2)} causes ${cs.causes?.contact.toFixed(2)}/${cs.causes?.legs.toFixed(2)}) d(${d.pos.x.toFixed(2)} v${d.vel.x.toFixed(2)} ${ds.state} xi${Math.hypot(ds.xi.x, ds.xi.y).toFixed(2)}) ${j ? `hold cap${j.capacity.toFixed(0)} f${(j.force ?? 0).toFixed(0)} h${j.hold?.toFixed(2)} legs${j.legs.toFixed(2)} ${j.slipping ? 'SLIP' : ''}` : ''} ${sim.events.slice(n).map((e) => e.type + (e.note ? `(${e.note})` : '')).join(' ')}`);
}
console.log('end', sim.outcome, sim.endSpot?.x.toFixed(2));
