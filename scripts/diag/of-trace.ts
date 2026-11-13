/** Trace one open-field rep: carrier, tackler, commands, support and holds (development aid).
 *   node --import tsx scripts/diag/of-trace.ts [seed] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { Agent } from '../../src/sim/agent.js';
import { BallCarrier } from '../../src/sim/behaviors/carrier.js';
import { chase } from '../../src/sim/behaviors/common.js';
import { locomotionAccel } from "../../src/physics/kinematics.js";
const rng = new Rng(Number(process.argv[2] ?? 11));
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 }), def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
  offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32() });
const c = sim.slot('Z')!, d = sim.slot('FS')!;
for (const a of sim.agents) { if (a === c || a === d) continue; a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never; }
c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: 7, y: 0 }; c.body.facing = 0;
d.body.pos = { x: 58, y: CENTER_Y + 1 }; d.body.vel = { x: -2, y: 0 }; d.body.facing = Math.PI;
sim.t = 2.5; sim.catchAt = 2.4; sim.ball = { kind: 'held', carrier: c } as never;
c.behavior = new BallCarrier({}, c);
d.behavior = { kind: 'pursuit', update: (a: Agent, s: PlaySim) => chase(s, a, c) } as never;
for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
const tick = sim as unknown as { tick(): void };
console.log(`c ${c.profile.massKg.toFixed(0)}kg d ${d.profile.massKg.toFixed(0)}kg`);
while (sim.phase === 'live' && sim.t < 5) {
  const n = sim.events.length;
  tick.tick();
  const j = sim.bond?.holds?.get(d);
  const cs = c.body.support!, dsu = d.body.support!;
  const ci = sim.intents[d.idx]; const la = ci ? locomotionAccel(d.body, ci, 0.05) : {x:0,y:0}; const cc = c.body.support!; console.log(`[c lock${cc.feetLock.toFixed(2)} causes ${cc.causes ? cc.causes.contact.toFixed(2) + "/" + cc.causes.legs.toFixed(2) : ""} xi(${cc.xi.x.toFixed(2)},${cc.xi.y.toFixed(2)})] cmd(${ci?.vel.x.toFixed(1)},${ci?.vel.y.toFixed(1)} f${ci?.facing?.toFixed(2)}) ` + `${sim.t.toFixed(2)} c(${c.pos.x.toFixed(2)},${c.pos.y.toFixed(2)} v${c.vel.x.toFixed(1)},${c.vel.y.toFixed(1)} xi${Math.hypot(cs.xi.x, cs.xi.y).toFixed(2)} ${cs.state}) d(${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)} v${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)} ${dsu.state} xi${Math.hypot(dsu.xi.x, dsu.xi.y).toFixed(2)}) dist ${Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y).toFixed(2)} ${j ? `hold cap${j.capacity.toFixed(0)} f${(j.force ?? 0).toFixed(0)} h${j.hold?.toFixed(2)} r${j.reach.toFixed(2)} legs${j.legs.toFixed(2)} ${j.origin} ${j.slipping ? 'SLIP' : ''}` : ''} ${sim.events.slice(n).filter((e) => e.type !== 'read').map((e) => e.type + (e.note ? `(${e.note})` : '')).join(' ')}`);
}
console.log('end', sim.outcome);
